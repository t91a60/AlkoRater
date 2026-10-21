import { CONSTANTS } from '../app/constants.js';
import { normalizeRecords } from '../data/records.js';

const LS_KEY = CONSTANTS.STORAGE_KEYS.FAVORITES;
const MODE_KEY = 'alkorater:storage-mode';
const CHANGE_KEY = 'alkorater:change';
let db;
let initialization;
let backend = 'unavailable';

function openDB() {
    if (db) {
        return Promise.resolve(db);
    }
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(CONSTANTS.DB_NAME, CONSTANTS.DB_VERSION);
        let abandoned = false;
        const timer = setTimeout(() => {
            abandoned = true;
            reject(
                new Error(
                    'Baza jest zablokowana. Zamknij inne karty aplikacji i spróbuj ponownie.',
                ),
            );
        }, 4000);
        request.onupgradeneeded = () => {
            if (abandoned) {
                request.transaction.abort();
                return;
            }
            const connection = request.result;
            if (!connection.objectStoreNames.contains('favorites')) {
                const store = connection.createObjectStore('favorites', { keyPath: 'id' });
                store.createIndex('date', 'date');
                store.createIndex('tag', 'tag');
                store.createIndex('itemName', 'item.name');
            }
            if (!connection.objectStoreNames.contains('metadata')) {
                connection.createObjectStore('metadata', { keyPath: 'key' });
            }
        };
        request.onsuccess = () => {
            clearTimeout(timer);
            if (abandoned) {
                request.result.close();
                return;
            }
            const connection = request.result;
            db = connection;
            connection.onversionchange = () => {
                connection.close();
                if (db === connection) {
                    db = null;
                    initialization = null;
                }
            };
            resolve(db);
        };
        request.onerror = () => {
            clearTimeout(timer);
            reject(request.error);
        };
    });
}

function readLocal() {
    const raw = localStorage.getItem(LS_KEY);
    return raw === null ? [] : JSON.parse(raw);
}

async function initialize() {
    if (localStorageMode() === 'localStorage' || typeof indexedDB === 'undefined') {
        localStorage.setItem(MODE_KEY, 'localStorage');
        backend = 'localStorage';
        return;
    }
    try {
        await openDB();
    } catch (error) {
        if (!['SecurityError', 'NotSupportedError'].includes(error.name)) {
            throw error;
        }
        localStorage.setItem(MODE_KEY, 'localStorage');
        backend = 'localStorage';
        return;
    }
    backend = 'IndexedDB';
    await new Promise((resolve, reject) => {
        const tx = db.transaction(['favorites', 'metadata'], 'readwrite');
        const store = tx.objectStore('favorites');
        const metadata = tx.objectStore('metadata');
        let failure;
        tx.oncomplete = resolve;
        tx.onabort = () => reject(failure || tx.error || new Error('Migracja przerwana.'));
        const marker = metadata.get('legacy-imported');
        marker.onsuccess = () => {
            if (marker.result) {
                return;
            }
            const all = store.getAll();
            all.onsuccess = () => {
                try {
                    if (!all.result.length) {
                        let legacy = [];
                        try {
                            legacy = readLocal();
                        } catch (error) {
                            if (error.name !== 'SecurityError') {
                                throw error;
                            }
                        }
                        for (const record of normalizeRecords(legacy)) {
                            store.put(record);
                        }
                    }
                    metadata.put({ key: 'legacy-imported', value: new Date().toISOString() });
                } catch (error) {
                    failure = error;
                    tx.abort();
                }
            };
        };
    });
}

function localStorageMode() {
    try {
        return localStorage.getItem(MODE_KEY);
    } catch {
        return null;
    }
}

async function ready() {
    initialization ??= initialize().catch((error) => {
        initialization = null;
        throw error;
    });
    return initialization;
}

export function storageStatus() {
    return {
        backend,
        writable: backend === 'IndexedDB' || (backend === 'localStorage' && !!navigator.locks),
    };
}

export async function getFavorites() {
    await ready();
    if (backend === 'localStorage') {
        return normalizeRecords(readLocal());
    }
    return new Promise((resolve, reject) => {
        const tx = db.transaction('favorites', 'readonly');
        const request = tx.objectStore('favorites').getAll();
        let records;
        let failure;
        request.onsuccess = () => {
            try {
                records = normalizeRecords(request.result);
            } catch (error) {
                failure = error;
            }
        };
        tx.oncomplete = () => (failure ? reject(failure) : resolve(records));
        tx.onabort = () => reject(tx.error || new Error('Nie udało się odczytać ocen.'));
    });
}

// The mutator must be synchronous: IndexedDB may close a transaction across an await.
export async function mutateFavorites(mutate) {
    await ready();
    let result;
    if (backend === 'localStorage') {
        if (!navigator.locks) {
            throw new Error(
                'Ta przeglądarka nie obsługuje bezpiecznego zapisu awaryjnego. Wyeksportuj kopię danych.',
            );
        }
        result = await navigator.locks.request('alkorater:favorites', () => {
            const current = normalizeRecords(readLocal());
            const updated = normalizeRecords(mutate(current));
            localStorage.setItem(LS_KEY, JSON.stringify(updated));
            return updated;
        });
    } else {
        result = await new Promise((resolve, reject) => {
            const tx = db.transaction('favorites', 'readwrite');
            const store = tx.objectStore('favorites');
            const request = store.getAll();
            let updated;
            let failure;
            request.onsuccess = () => {
                try {
                    const current = normalizeRecords(request.result);
                    const currentById = new Map(current.map((record) => [record.id, record]));
                    const storedKeys = new Map(
                        request.result.map((record) => [String(record.id), record.id]),
                    );
                    updated = normalizeRecords(mutate(current));
                    const ids = new Set(updated.map((r) => r.id));
                    for (const record of current) {
                        if (!ids.has(record.id)) {
                            store.delete(storedKeys.get(record.id));
                        }
                    }
                    for (const record of updated) {
                        const previous = currentById.get(record.id);
                        if (JSON.stringify(previous) !== JSON.stringify(record)) {
                            if (previous && storedKeys.get(record.id) !== record.id) {
                                store.delete(storedKeys.get(record.id));
                            }
                            store.put(record);
                        }
                    }
                } catch (error) {
                    failure = error;
                    tx.abort();
                }
            };
            tx.oncomplete = () => resolve(updated);
            tx.onabort = () =>
                reject(failure || tx.error || new Error('Nie udało się zapisać ocen.'));
        });
    }
    try {
        localStorage.setItem(CHANGE_KEY, `${Date.now()}-${Math.random()}`);
    } catch {
        /* IndexedDB does not depend on localStorage. */
    }
    return result;
}

export function onExternalChange(callback) {
    const listener = (event) => {
        if (event.key === CHANGE_KEY || event.key === LS_KEY) {
            callback();
        }
    };
    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
}

export async function recoverySnapshot() {
    let local = null;
    try {
        local = localStorage.getItem(LS_KEY);
    } catch {
        /* Recovery can still read IndexedDB. */
    }
    let records = null;
    try {
        const connection = db || (await openDB());
        records = await new Promise((resolve, reject) => {
            const tx = connection.transaction('favorites', 'readonly');
            const request = tx.objectStore('favorites').getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch {
        /* Keep the available legacy copy even if the database is unreadable. */
    }
    return {
        app: 'AlkoRater-recovery',
        exportedAt: new Date().toISOString(),
        records,
        localStorage: local,
    };
}
