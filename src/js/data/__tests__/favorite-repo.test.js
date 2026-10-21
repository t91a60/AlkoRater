import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';

const beer = {
    id: 3,
    source: 'beer',
    name: 'Harnaś',
    category: 'Piwo',
    alcohol: '5.5%',
};
const vodka = { ...beer, source: 'vodka', category: 'Wódka', alcohol: '40%' };

let repo;
let storage;
let state;
const connections = new Set();

beforeEach(async () => {
    vi.resetModules();
    localStorage.clear();
    const factory = new IDBFactory();
    vi.stubGlobal('indexedDB', factory);
    const open = factory.open.bind(factory);
    vi.spyOn(factory, 'open').mockImplementation((...args) => {
        const request = open(...args);
        request.addEventListener('success', () => connections.add(request.result));
        return request;
    });
    repo = await import('../favorite-repo.js');
    storage = await import('../../services/storage.js');
    ({ state } = await import('../../app/state.js'));
});

afterEach(() => {
    for (const connection of connections) {
        connection.close();
    }
    connections.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
});

function rating(item = beer, stars = 4, note = 'Własna notatka') {
    return repo.createRecord(item, { stars, note, tag: item.category });
}

describe('record creation and identity', () => {
    it('creates an independent normalized snapshot with its own ID and initial revision', () => {
        const created = rating(beer, 5, 'Świetne');

        expect(created).toMatchObject({
            productId: 'beer:3',
            item: { id: '3', source: 'beer', name: 'Harnaś', category: 'Piwo' },
            stars: 5,
            note: 'Świetne',
            tag: 'Piwo',
            revision: 1,
        });
        expect(created.id).toMatch(/^\d+-[a-z0-9]+$/);
        expect(Number.isFinite(Date.parse(created.date))).toBe(true);
        created.item.name = 'Zmieniona migawka';
        expect(beer.name).toBe('Harnaś');
    });

    it('finds duplicate Harnaś names only by source and ID, including after a rename', () => {
        const beerRating = rating();
        const vodkaRating = rating(vodka);
        const favorites = [beerRating, vodkaRating];

        expect(repo.findFavorite(favorites, beer)).toBe(beerRating);
        expect(repo.findFavorite(favorites, vodka)).toBe(vodkaRating);
        expect(repo.findFavorite(favorites, { ...beer, name: 'Nowa nazwa' })).toBe(beerRating);
        expect(repo.findFavorite(favorites, 'beer:3')).toBe(beerRating);
        expect(repo.findFavorite(favorites, { ...beer, id: 4 })).toBeNull();
        expect(repo.findFavorite(favorites, 'Harnaś')).toBeNull();
        expect(repo.findFavorite([], beer)).toBeNull();
    });
});

describe('loading favorites', () => {
    it('requires a successful load before saving a new record', async () => {
        expect(state.storageReady).toBe(false);
        await expect(repo.upsertFavorite([], rating())).rejects.toThrow(/Najpierw/);
        expect(state.favorites).toEqual([]);
        expect(await storage.getFavorites()).toEqual([]);
        expect(state.storageReady).toBe(false);

        expect(await repo.loadFavorites()).toEqual([]);
        expect(state.storageReady).toBe(true);
        expect(state.storageError).toBeNull();
        await expect(repo.upsertFavorite([], rating())).resolves.toBe('created');
    });

    it('preserves an orphaned product snapshot even when it is absent from the current catalogue', async () => {
        const orphan = {
            ...rating({
                id: 'retired-wine',
                source: 'wine',
                category: 'Wino',
                name: 'Produkt usunięty z katalogu',
                alcohol: '12.5%',
                image_url: './images/retired.webp',
            }),
            id: 'orphan-rating',
            revision: 3,
        };
        localStorage.setItem('favorites', JSON.stringify([orphan]));
        state.appData = [beer];

        const loaded = await repo.loadFavorites();

        expect(loaded).toEqual([orphan]);
        expect(state.favorites).toEqual([orphan]);
        expect(state.storageReady).toBe(true);
        expect(await storage.getFavorites()).toEqual([orphan]);
    });

    it('keeps visible records and blocks saving after a failed load instead of presenting an empty collection', async () => {
        const visible = [rating()];
        state.favorites = visible;
        localStorage.setItem('favorites', '{invalid');

        await expect(repo.loadFavorites()).rejects.toThrow();

        expect(state.favorites).toBe(visible);
        expect(state.storageReady).toBe(false);
        expect(state.storageError).toBeInstanceOf(Error);
        await expect(repo.upsertFavorite(visible, rating())).rejects.toThrow(/Najpierw/);
        expect(localStorage.getItem('favorites')).toBe('{invalid');
    });
});

describe('transactional favorite mutations', () => {
    it('rejects a stale editor after the product was deleted and re-created at the same revision', async () => {
        await repo.loadFavorites();
        await repo.upsertFavorite([], rating());
        const old = state.favorites[0];
        await repo.removeFavorite(old);
        await repo.upsertFavorite([], rating(beer, 2, 'Nowy wpis po usunięciu'));
        const current = state.favorites;
        await expect(
            repo.upsertFavorite(current, rating(beer, 5, 'Stary formularz'), old.revision, old.id),
        ).rejects.toThrow(/innej karcie/);
        expect(await storage.getFavorites()).toEqual(current);
    });
    it('publishes a create only after transaction completion and preserves the record ID when editing', async () => {
        await repo.loadFavorites();
        const created = rating();
        const put = IDBObjectStore.prototype.put;
        const visibleDuringWrite = [];
        vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementationOnce(function (...args) {
            const request = put.apply(this, args);
            request.addEventListener('success', () => visibleDuringWrite.push(state.favorites));
            request.transaction.addEventListener('complete', () =>
                visibleDuringWrite.push(state.favorites),
            );
            return request;
        });

        await expect(repo.upsertFavorite([], created)).resolves.toBe('created');
        expect(visibleDuringWrite).toEqual([[], []]);
        expect(state.favorites).toEqual([created]);
        expect(await storage.getFavorites()).toEqual([created]);

        const edited = {
            ...rating({ ...beer, name: 'Nowa nazwa' }, 5, 'Poprawiona notatka'),
            id: 'draft-id',
        };
        await expect(repo.upsertFavorite(state.favorites, edited, 1)).resolves.toBe('updated');
        const persisted = await storage.getFavorites();
        expect(persisted).toHaveLength(1);
        expect(persisted[0]).toMatchObject({
            id: created.id,
            productId: 'beer:3',
            item: { name: 'Nowa nazwa' },
            revision: 2,
            stars: 5,
            note: 'Poprawiona notatka',
        });
        expect(state.favorites).toEqual(persisted);
    });

    it('keeps concurrent additions made from stale empty UI snapshots, even for identical display names', async () => {
        await repo.loadFavorites();
        const first = rating(beer);
        const second = rating(vodka);

        await expect(
            Promise.all([repo.upsertFavorite([], first), repo.upsertFavorite([], second)]),
        ).resolves.toEqual(['created', 'created']);

        const persisted = await storage.getFavorites();
        expect(persisted).toHaveLength(2);
        expect(persisted).toEqual(expect.arrayContaining([first, second]));
        expect(state.favorites).toEqual(persisted);
    });

    it('rejects one of two edits at the same revision without overwriting the winner or the losing draft', async () => {
        await repo.loadFavorites();
        await repo.upsertFavorite([], rating());
        const observed = [...state.favorites];
        const firstDraft = rating(beer, 5, 'Pierwsza edycja');
        const secondDraft = rating(beer, 1, 'Niezapisana notatka z drugiej karty');
        const secondDraftBefore = structuredClone(secondDraft);

        const results = await Promise.allSettled([
            repo.upsertFavorite(observed, firstDraft, 1),
            repo.upsertFavorite(observed, secondDraft, 1),
        ]);

        expect(results[0]).toEqual({ status: 'fulfilled', value: 'updated' });
        expect(results[1].status).toBe('rejected');
        expect(results[1].reason.message).toMatch(/innej karcie/);
        expect(secondDraft).toEqual(secondDraftBefore);
        const persisted = await storage.getFavorites();
        expect(persisted).toHaveLength(1);
        expect(persisted[0]).toMatchObject({
            id: observed[0].id,
            revision: 2,
            stars: 5,
            note: 'Pierwsza edycja',
        });
        expect(state.favorites).toEqual(persisted);
    });

    it('does not publish a failed save even when the underlying put request succeeded', async () => {
        await repo.loadFavorites();
        await repo.upsertFavorite([], rating());
        const original = state.favorites;
        const put = IDBObjectStore.prototype.put;
        let requestSucceeded = false;
        vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementationOnce(function (...args) {
            const request = put.apply(this, args);
            request.addEventListener('success', () => {
                requestSucceeded = true;
                request.transaction.abort();
            });
            return request;
        });

        await expect(
            repo.upsertFavorite(original, rating(beer, 1, 'Nie wolno zapisać'), 1),
        ).rejects.toThrow();

        expect(requestSucceeded).toBe(true);
        expect(state.favorites).toBe(original);
        expect(await storage.getFavorites()).toEqual(original);
    });

    it('persists deletion immediately and restores it as a separate safe mutation', async () => {
        await repo.loadFavorites();
        await repo.upsertFavorite([], rating());
        const removed = state.favorites[0];

        await repo.removeFavorite(removed);
        expect(state.favorites).toEqual([]);
        expect(await storage.getFavorites()).toEqual([]);

        await repo.restoreFavorite(removed);
        expect(state.favorites).toEqual([removed]);
        expect(await storage.getFavorites()).toEqual([removed]);
    });

    it('refuses stale deletion and undo over a newer rating for the same product', async () => {
        await repo.loadFavorites();
        await repo.upsertFavorite([], rating());
        const stale = state.favorites[0];
        await repo.upsertFavorite([stale], rating(beer, 5, 'Nowsza edycja'), 1);
        const edited = state.favorites;

        await expect(repo.removeFavorite(stale)).rejects.toThrow(/innej karcie/);
        expect(state.favorites).toBe(edited);
        expect(await storage.getFavorites()).toEqual(edited);

        await repo.removeFavorite(edited[0]);
        await repo.upsertFavorite([], rating(beer, 2, 'Nowy wpis po usunięciu'));
        const replacement = state.favorites;
        await expect(repo.restoreFavorite(stale)).rejects.toThrow(/nowszy wpis/);
        expect(state.favorites).toBe(replacement);
        expect(await storage.getFavorites()).toEqual(replacement);
    });
});
