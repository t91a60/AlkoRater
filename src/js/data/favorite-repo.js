import { setFavorites, state } from '../app/state.js';
import * as storage from '../services/storage.js';
import { productKey } from './product.js';
import { normalizeRecord } from './records.js';

export async function loadFavorites() {
    try {
        const favorites = await storage.getFavorites();
        setFavorites(favorites);
        state.storageError = null;
        state.storageReady = true;
        return favorites;
    } catch (error) {
        state.storageError = error;
        state.storageReady = false;
        throw error;
    }
}

export function findFavorite(favorites, item) {
    const key = typeof item === 'object' ? productKey(item) : item;
    return favorites.find((f) => productKey(f.item) === key) || null;
}

export function createRecord(item, ratingConfig) {
    return normalizeRecord({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        item: { ...item },
        stars: ratingConfig.stars,
        note: ratingConfig.note,
        tag: item.category,
        date: new Date().toISOString(),
        revision: 1,
    });
}

export async function upsertFavorite(
    favorites,
    newRecord,
    expectedRevision = undefined,
    expectedId = undefined,
) {
    if (!state.storageReady) {
        throw new Error('Najpierw wczytaj zapisane oceny.');
    }
    const observed = findFavorite(favorites, newRecord.item);
    const expected = expectedRevision === undefined ? observed?.revision || 0 : expectedRevision;
    const expectedRecordId = expectedId === undefined ? observed?.id || null : expectedId;
    let action;
    const updated = await storage.mutateFavorites((current) => {
        const existing = findFavorite(current, newRecord.item);
        if ((existing?.revision || 0) !== expected || (existing?.id || null) !== expectedRecordId) {
            throw new Error(
                'Ocena zmieniła się w innej karcie. Twoja notatka pozostaje w formularzu. Skopiuj ją i otwórz ocenę ponownie.',
            );
        }
        const record = {
            ...newRecord,
            id: existing?.id || newRecord.id,
            revision: (existing?.revision || 0) + 1,
        };
        action = existing ? 'updated' : 'created';
        return [record, ...current.filter((r) => r.id !== existing?.id)];
    });
    setFavorites(updated);
    return action;
}

export async function removeFavorite(record) {
    const updated = await storage.mutateFavorites((current) => {
        const existing = current.find((r) => r.id === record.id);
        if (existing && existing.revision !== record.revision) {
            throw new Error('Wpis zmienił się w innej karcie. Odśwież kolekcję przed usunięciem.');
        }
        return current.filter((r) => r.id !== record.id);
    });
    setFavorites(updated);
}

export async function restoreFavorite(record) {
    const updated = await storage.mutateFavorites((current) => {
        if (findFavorite(current, record.item) || current.some((r) => r.id === record.id)) {
            throw new Error('Produkt ma już nowszy wpis. Nie zastąpiono go.');
        }
        return [...current, record];
    });
    setFavorites(updated);
}
