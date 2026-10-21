import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { CONSTANTS } from '../../app/constants.js';

function record(id = 'rating-a', itemId = 'beer-a', overrides = {}) {
    return {
        id,
        productId: `beer:${itemId}`,
        item: {
            id: itemId,
            source: 'beer',
            category: 'Piwo',
            name: `Piwo ${itemId}`,
            brand: '',
            type: '',
            country: '',
            alcohol: '',
            image_url: '',
        },
        stars: 4,
        tag: 'Piwo',
        note: 'Prywatna notatka',
        date: '2026-09-01T10:00:00.000Z',
        revision: 1,
        ...overrides,
    };
}

let storage;
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
    storage = await import('../storage.js');
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

async function seedDatabase(records, { version = CONSTANTS.DB_VERSION, uniqueNames = false } = {}) {
    const connection = await new Promise((resolve, reject) => {
        const request = indexedDB.open(CONSTANTS.DB_NAME, version);
        request.onupgradeneeded = () => {
            const store = request.result.createObjectStore('favorites', { keyPath: 'id' });
            if (uniqueNames) {
                store.createIndex('uniqueName', 'item.name', { unique: true });
            }
            if (version >= 2) {
                request.result.createObjectStore('metadata', { keyPath: 'key' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
    await new Promise((resolve, reject) => {
        const tx = connection.transaction('favorites', 'readwrite');
        for (const entry of records) {
            tx.objectStore('favorites').put(entry);
        }
        tx.oncomplete = resolve;
        tx.onabort = () => reject(tx.error);
    });
    connection.close();
}

describe('IndexedDB migration', () => {
    it('imports localStorage once and never resurrects a deleted rating after a fresh load', async () => {
        const legacy = JSON.stringify([record()]);
        localStorage.setItem('favorites', legacy);

        expect(await storage.getFavorites()).toEqual([record()]);
        expect(await storage.mutateFavorites(() => [])).toEqual([]);
        expect(localStorage.getItem('favorites')).toBe(legacy);

        vi.resetModules();
        const reloaded = await import('../storage.js');
        expect(await reloaded.getFavorites()).toEqual([]);
        expect(localStorage.getItem('favorites')).toBe(legacy);
    });

    it('treats a nonempty older database as authoritative and preserves the legacy copy', async () => {
        const authoritative = record('database-rating', 'database-product', { stars: 2 });
        const legacy = JSON.stringify([record('legacy-rating', 'legacy-product')]);
        await seedDatabase([authoritative], { version: 1 });
        localStorage.setItem('favorites', legacy);

        expect(await storage.getFavorites()).toEqual([authoritative]);
        await storage.mutateFavorites(() => []);
        vi.resetModules();
        const reloaded = await import('../storage.js');

        expect(await reloaded.getFavorites()).toEqual([]);
        expect(localStorage.getItem('favorites')).toBe(legacy);
    });

    it('rolls back a failed migration including its marker, allowing a complete retry', async () => {
        const entries = [record(), record('rating-b', 'beer-b')];
        const legacy = JSON.stringify(entries);
        localStorage.setItem('favorites', legacy);
        const quota = new DOMException('No space left', 'QuotaExceededError');
        const put = IDBObjectStore.prototype.put;
        let favoriteWrites = 0;
        const fault = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (
            ...args
        ) {
            if (this.name === 'favorites' && ++favoriteWrites === 2) {
                throw quota;
            }
            return put.apply(this, args);
        });

        await expect(storage.getFavorites()).rejects.toBe(quota);
        expect((await storage.recoverySnapshot()).records).toEqual([]);
        expect(localStorage.getItem('favorites')).toBe(legacy);

        fault.mockRestore();
        expect(await storage.getFavorites()).toEqual(entries);
    });

    it.each([
        ['invalid JSON', '{broken-json'],
        ['a non-array collection', '{"records":[]}'],
        ['an invalid row', JSON.stringify([record(), record('bad', 'bad', { stars: 0 })])],
    ])(
        'rejects %s in legacy storage instead of loading or writing an empty collection',
        async (_, raw) => {
            localStorage.setItem('favorites', raw);
            const mutate = vi.fn(() => []);

            await expect(storage.getFavorites()).rejects.toThrow();
            await expect(storage.mutateFavorites(mutate)).rejects.toThrow();
            expect(mutate).not.toHaveBeenCalled();
            expect(localStorage.getItem('favorites')).toBe(raw);
            expect(await storage.recoverySnapshot()).toMatchObject({
                app: 'AlkoRater-recovery',
                localStorage: raw,
                records: [],
            });
        },
    );
});

describe('transactional mutations', () => {
    it('serializes additions from independent module instances against the latest database contents', async () => {
        const firstTab = storage;
        vi.resetModules();
        const secondTab = await import('../storage.js');
        await Promise.all([firstTab.getFavorites(), secondTab.getFavorites()]);
        const a = record();
        const b = record('rating-b', 'beer-b');

        await Promise.all([
            firstTab.mutateFavorites((current) => [...current, a]),
            secondTab.mutateFavorites((current) => [...current, b]),
        ]);

        expect(await firstTab.getFavorites()).toEqual([a, b]);
        expect(await secondTab.getFavorites()).toEqual([a, b]);
    });

    it('rolls back earlier deletions when a write throws, without switching backends or notifying success', async () => {
        const original = record();
        await storage.mutateFavorites(() => [original]);
        const previousSignal = localStorage.getItem('alkorater:change');
        const quota = new DOMException('No space left', 'QuotaExceededError');
        vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementationOnce(() => {
            throw quota;
        });

        await expect(
            storage.mutateFavorites(() => [record('replacement', 'replacement')]),
        ).rejects.toBe(quota);

        expect(await storage.getFavorites()).toEqual([original]);
        expect(storage.storageStatus()).toEqual({ backend: 'IndexedDB', writable: true });
        expect(localStorage.getItem('alkorater:storage-mode')).toBeNull();
        expect(localStorage.getItem('alkorater:change')).toBe(previousSignal);
    });

    it('rejects an actual failed write request and rolls back every row in its transaction', async () => {
        const original = record();
        await seedDatabase([original], { uniqueNames: true });
        await storage.getFavorites();
        const first = record('new-a', 'new-a');
        const second = record('new-b', 'new-b', { item: { ...first.item, id: 'new-b' } });

        await expect(storage.mutateFavorites(() => [first, second])).rejects.toMatchObject({
            name: 'ConstraintError',
        });
        expect(await storage.getFavorites()).toEqual([original]);
        expect(localStorage.getItem('alkorater:change')).toBeNull();
    });

    it('does not report success when the transaction aborts after a put request succeeds', async () => {
        const original = record();
        await storage.mutateFavorites(() => [original]);
        const previousSignal = localStorage.getItem('alkorater:change');
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
            storage.mutateFavorites(() => [record('replacement', 'replacement')]),
        ).rejects.toThrow();
        expect(requestSucceeded).toBe(true);
        expect(await storage.getFavorites()).toEqual([original]);
        expect(localStorage.getItem('alkorater:change')).toBe(previousSignal);
    });

    it('rejects a read transaction that aborts after getAll succeeds instead of returning data or []', async () => {
        const original = record();
        await storage.mutateFavorites(() => [original]);
        const getAll = IDBObjectStore.prototype.getAll;
        vi.spyOn(IDBObjectStore.prototype, 'getAll').mockImplementationOnce(function (...args) {
            const request = getAll.apply(this, args);
            request.addEventListener('success', () => request.transaction.abort());
            return request;
        });

        await expect(storage.getFavorites()).rejects.toThrow(/odczytać/);
        expect(await storage.getFavorites()).toEqual([original]);
    });

    it('deletes existing numeric IndexedDB keys through their normalized string record IDs', async () => {
        await seedDatabase([record(42)]);
        expect((await storage.getFavorites())[0].id).toBe('42');

        await storage.mutateFavorites((current) => current.filter((entry) => entry.id !== '42'));

        expect(await storage.getFavorites()).toEqual([]);
        vi.resetModules();
        const reloaded = await import('../storage.js');
        expect(await reloaded.getFavorites()).toEqual([]);
    });

    it('edits numeric IndexedDB keys without leaving a second row with the same normalized ID', async () => {
        await seedDatabase([record(42)]);
        await storage.getFavorites();

        await storage.mutateFavorites((current) =>
            current.map((entry) => ({ ...entry, note: 'Zmieniona notatka', revision: 2 })),
        );

        await expect(storage.getFavorites()).resolves.toEqual([
            record('42', 'beer-a', { note: 'Zmieniona notatka', revision: 2 }),
        ]);
    });
});

describe('corrupt data and recovery', () => {
    it('blocks mutations of corrupt IndexedDB data and exports the untouched raw rows and legacy text', async () => {
        const valid = record();
        const corrupt = record('bad', 'bad', {
            stars: 0,
            privateUnknownField: 'keep for recovery',
        });
        const legacy = '{damaged-but-recoverable';
        await seedDatabase([valid, corrupt]);
        localStorage.setItem('favorites', legacy);
        const mutate = vi.fn(() => []);

        await expect(storage.getFavorites()).rejects.toThrow(/Ocena/);
        await expect(storage.mutateFavorites(mutate)).rejects.toThrow(/Ocena/);
        expect(mutate).not.toHaveBeenCalled();

        const recovery = await storage.recoverySnapshot();
        expect(recovery).toMatchObject({ app: 'AlkoRater-recovery', localStorage: legacy });
        expect(recovery.records).toHaveLength(2);
        expect(recovery.records).toEqual(expect.arrayContaining([valid, corrupt]));
        expect(Number.isFinite(Date.parse(recovery.exportedAt))).toBe(true);
        await expect(storage.getFavorites()).rejects.toThrow(/Ocena/);
    });

    it('does not allow unsafe localStorage fallback writes when Web Locks are unavailable', async () => {
        const legacy = JSON.stringify([record()]);
        localStorage.setItem('alkorater:storage-mode', 'localStorage');
        localStorage.setItem('favorites', legacy);
        vi.stubGlobal('navigator', { locks: undefined });

        expect(await storage.getFavorites()).toEqual([record()]);
        expect(storage.storageStatus()).toEqual({ backend: 'localStorage', writable: false });
        await expect(storage.mutateFavorites(() => [])).rejects.toThrow(/bezpiecznego zapisu/);
        expect(localStorage.getItem('favorites')).toBe(legacy);
    });
});
