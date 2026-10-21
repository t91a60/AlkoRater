import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';

function record(id = 'rating-existing', itemId = 'existing', overrides = {}) {
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

function envelope(records, overrides = {}) {
    return {
        app: 'AlkoRater',
        schemaVersion: 1,
        exportedAt: '2026-09-01T10:00:00.000Z',
        records,
        ...overrides,
    };
}

let backup;
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
    backup = await import('../backup.js');
    storage = await import('../storage.js');
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

async function load(records) {
    await storage.mutateFavorites(() => records);
    const { loadFavorites } = await import('../../data/favorite-repo.js');
    await loadFavorites();
}

describe('backup validation', () => {
    it('keeps HTML-like content as text, recalculates product identity and drops arbitrary fields and image URLs', () => {
        const note = '  <img src=x onerror="alert(1)">\n<script>alert(2)</script>  ';
        const name = '<svg onload="alert(3)">';
        const raw = record('untrusted', 'existing', {
            productId: 'forged-product',
            tag: 'Forged category',
            note,
            owner: 'not-an-allowed-field',
            html: '<script>alert(4)</script>',
            item: {
                ...record().item,
                name,
                image_url: 'https://example.com/tracker.svg',
                onerror: 'alert(5)',
                searchText: 'untrusted-search-index',
            },
        });
        const input = envelope([raw], { script: 'alert(6)' });

        const parsed = backup.parseBackup(JSON.stringify(input));

        expect(parsed).toEqual([
            record('untrusted', 'existing', {
                note,
                item: { ...record().item, name },
            }),
        ]);
        expect(raw.productId).toBe('forged-product');
        expect(raw.item.image_url).toBe('https://example.com/tracker.svg');
    });

    it('accepts valid large backups rather than rejecting its own exports above 5 MiB', () => {
        const base = JSON.stringify(envelope([]));
        const allowed =
            base + ' '.repeat(backup.LARGE_BACKUP_BYTES - new TextEncoder().encode(base).length);
        expect(backup.parseBackup(allowed)).toEqual([]);
        expect(backup.parseBackup(`${allowed} `)).toEqual([]);

        const multibyte = JSON.stringify(
            envelope([], { ignored: 'ą'.repeat(Math.ceil(backup.LARGE_BACKUP_BYTES / 2)) }),
        );
        expect(multibyte.length).toBeLessThan(backup.LARGE_BACKUP_BYTES);
        expect(backup.parseBackup(multibyte)).toEqual([]);
    });

    it('rejects malformed JSON, another app and unsupported schema versions', () => {
        for (const input of ['{broken', null, undefined, {}]) {
            expect(() => backup.parseBackup(input)).toThrow();
        }
        for (const data of [
            null,
            [],
            envelope([], { app: 'AnotherApp' }),
            envelope([], { schemaVersion: 2 }),
            envelope([], { schemaVersion: '1' }),
            { app: 'AlkoRater', records: [] },
            envelope({ records: [] }),
        ]) {
            expect(() => backup.parseBackup(JSON.stringify(data))).toThrow();
        }
    });

    it('validates every rating and note before accepting the file', () => {
        for (const invalid of [
            { stars: 0 },
            { stars: 6 },
            { stars: 2.5 },
            { stars: '5 stars' },
            { note: { html: '<b>not text</b>' } },
            { date: 'invalid-date' },
        ]) {
            const text = JSON.stringify(envelope([record(), record('bad', 'bad', invalid)]));
            expect(() => backup.parseBackup(text)).toThrow();
        }
    });

    it('merges only missing IDs and products, skipping conflicts and duplicates without changing either input', () => {
        const original = record();
        const fresh = record('import-new-a', 'new', { note: 'Pierwszy importowany wpis' });
        const current = [original];
        const incoming = [
            record(original.id, 'different-product', { stars: 1 }),
            record('same-product', 'existing', { stars: 1, revision: 99 }),
            fresh,
            record('import-new-z', 'new', { note: 'Duplikat z tego samego pliku' }),
        ];
        const before = structuredClone({ current, incoming });

        expect(backup.mergeBackup(current, incoming)).toEqual({
            records: [original, fresh],
            added: 1,
            skipped: 3,
        });
        expect({ current, incoming }).toEqual(before);
    });
});

describe('backup persistence', () => {
    it('round-trips 300 permitted long Polish notes above the former file size limit', async () => {
        const records = Array.from({ length: 300 }, (_, index) =>
            record(`long-${index}`, `product-${index}`, { note: 'ą'.repeat(10000) }),
        );
        await load(records);
        const text = await backup.exportBackup();
        expect(new TextEncoder().encode(text).length).toBeGreaterThan(backup.LARGE_BACKUP_BYTES);
        expect(backup.parseBackup(text)).toEqual(await storage.getFavorites());
    });
    it('exports a versioned backup that round-trips notes, revisions and an orphaned product snapshot', async () => {
        const orphan = record('orphan', 'retired', {
            productId: 'wine:retired',
            item: {
                ...record().item,
                id: 'retired',
                source: 'wine',
                category: 'Wino',
                name: 'Migawka produktu spoza katalogu',
                image_url: './images/wine.webp',
            },
            tag: 'Wino',
            note: '  Prywatna notatka\nz nową linią  ',
            revision: 7,
        });
        await load([orphan]);

        const text = await backup.exportBackup();
        const exported = JSON.parse(text);

        expect(Object.keys(exported).sort()).toEqual([
            'app',
            'exportedAt',
            'records',
            'schemaVersion',
        ]);
        expect(exported).toMatchObject({ app: 'AlkoRater', schemaVersion: 1, records: [orphan] });
        expect(Number.isFinite(Date.parse(exported.exportedAt))).toBe(true);
        expect(backup.parseBackup(text)).toEqual([orphan]);
    });

    it('imports against the latest transaction snapshot, preserving concurrent additions and all existing conflicts', async () => {
        const original = record();
        await load([original]);
        const concurrent = record('rating-latest', 'latest', { note: 'Zapisane w innej karcie' });
        const fresh = record('import-new-a', 'new', { note: 'Pierwszy nowy wpis' });
        const incoming = [
            record(original.id, 'different-product', { stars: 1 }),
            record('import-existing-product', 'existing', {
                stars: 1,
                revision: 99,
                date: '2030-01-01T00:00:00.000Z',
            }),
            record('import-latest-product', 'latest', { note: 'Nie zastępuj nowej oceny' }),
            fresh,
            record('import-new-z', 'new', { note: 'Duplikat w tym samym pliku' }),
        ];

        const write = storage.mutateFavorites((current) => [...current, concurrent]);
        const imported = backup.importBackup(incoming);
        const [, summary] = await Promise.all([write, imported]);

        expect(summary).toEqual({ added: 1, skipped: 4 });
        const persisted = await storage.getFavorites();
        expect(persisted).toHaveLength(3);
        expect(persisted).toEqual(expect.arrayContaining([original, concurrent, fresh]));
        expect(state.favorites).toEqual(persisted);
    });

    it('rejects an invalid import as a whole without persisting even its valid rows or changing UI state', async () => {
        const original = record();
        await load([original]);
        const visible = state.favorites;
        const previousSignal = localStorage.getItem('alkorater:change');

        await expect(
            backup.importBackup([
                record('valid-new', 'valid-new'),
                record('invalid-new', 'invalid-new', { note: { unexpected: 'not text' } }),
            ]),
        ).rejects.toThrow(/note/);

        expect(await storage.getFavorites()).toEqual([original]);
        expect(state.favorites).toBe(visible);
        expect(localStorage.getItem('alkorater:change')).toBe(previousSignal);
    });

    it('rolls back the entire import and reports failure when a later successful write is followed by abort', async () => {
        const original = record();
        await load([original]);
        const visible = state.favorites;
        const previousSignal = localStorage.getItem('alkorater:change');
        const put = IDBObjectStore.prototype.put;
        let writes = 0;
        let secondRequestSucceeded = false;
        vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (...args) {
            const request = put.apply(this, args);
            if (++writes === 2) {
                request.addEventListener('success', () => {
                    secondRequestSucceeded = true;
                    request.transaction.abort();
                });
            }
            return request;
        });

        await expect(
            backup.importBackup([record('new-a', 'new-a'), record('new-b', 'new-b')]),
        ).rejects.toThrow();

        expect(secondRequestSucceeded).toBe(true);
        expect(await storage.getFavorites()).toEqual([original]);
        expect(state.favorites).toBe(visible);
        expect(localStorage.getItem('alkorater:change')).toBe(previousSignal);
    });

    it('rejects export of corrupt storage rather than generating a valid-looking empty backup', async () => {
        localStorage.setItem('favorites', '{corrupt');

        await expect(backup.exportBackup()).rejects.toThrow();
        expect(localStorage.getItem('favorites')).toBe('{corrupt');
    });
});
