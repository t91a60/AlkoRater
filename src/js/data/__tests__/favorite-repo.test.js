import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockItem = {
    name: 'Żywiec Lager',
    category: 'Piwo',
    alcohol: '5.5%',
};

vi.mock('../../services/storage.js', () => ({
    saveFavorites: vi.fn(async () => true),
}));

import { findFavorite, createRecord, upsertFavorite } from '../favorite-repo.js';
import * as storage from '../../services/storage.js';

describe('findFavorite', () => {
    it('znajduje ocenę po nazwie item', () => {
        const favs = [
            { id: '1', item: { name: 'Piwo A' }, stars: 4 },
            { id: '2', item: { name: 'Piwo B' }, stars: 2 },
        ];
        expect(findFavorite(favs, 'Piwo B')?.stars).toBe(2);
    });

    it('zwraca null, gdy nie ma takiej nazwy albo lista pusta', () => {
        expect(findFavorite([{ item: { name: 'A' } }], 'X')).toBeNull();
        expect(findFavorite([], 'A')).toBeNull();
    });
});

describe('createRecord', () => {
    it('zapisuje item, ratingConfig i datę ISO', () => {
        const record = createRecord(mockItem, { stars: 5, note: 'Świetne', tag: 'Piwo' });
        expect(record.item).toEqual(mockItem);
        expect(record.stars).toBe(5);
        expect(record.note).toBe('Świetne');
        expect(record.tag).toBe('Piwo');
        expect(record.id).toMatch(/^\d+-[a-z0-9]+$/);
        expect(Number.isNaN(Date.parse(record.date))).toBe(false);
    });

    it('kopiuje item zamiast referencji, by nie mutować źródła', () => {
        const record = createRecord(mockItem, { stars: 1, note: '', tag: '' });
        record.item.name = 'zmienione';
        expect(mockItem.name).toBe('Żywiec Lager');
    });
});

describe('upsertFavorite', () => {
    beforeEach(() => {
        storage.saveFavorites.mockClear();
    });

    it('dodaje nowy rekord na początek i zwraca "created"', async () => {
        const existing = [{ id: 'old', item: { name: 'Stary' }, stars: 3 }];
        const result = await upsertFavorite(
            existing,
            createRecord(mockItem, { stars: 4, note: '', tag: '' }),
        );
        expect(result).toBe('created');
        const saved = storage.saveFavorites.mock.calls[0][0];
        expect(saved[0].item.name).toBe('Żywiec Lager');
        expect(saved).toHaveLength(2);
    });

    it('aktualizuje istniejący rekord w miejscu i zwraca "updated"', async () => {
        const existing = [{ id: 'old', item: { name: 'Żywiec Lager' }, stars: 2 }];
        const updated = createRecord(mockItem, { stars: 5, note: 'Lepsze', tag: 'Piwo' });
        const result = await upsertFavorite(existing, updated);
        expect(result).toBe('updated');
        const saved = storage.saveFavorites.mock.calls[0][0];
        expect(saved).toHaveLength(1);
        expect(saved[0].stars).toBe(5);
        expect(saved[0].note).toBe('Lepsze');
    });
});
