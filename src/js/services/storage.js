import { logger } from '../utils/logger.js';
import { CONSTANTS } from '../app/constants.js';

const LS_KEY = CONSTANTS.STORAGE_KEYS.FAVORITES;
const DB_NAME = CONSTANTS.DB_NAME;
const DB_VERSION = CONSTANTS.DB_VERSION;
const FAVORITES_STORE = 'favorites';
const METADATA_STORE = 'metadata';

let _db = null;

function openDB() {
    return new Promise((resolve, reject) => {
        if (_db) {return resolve(_db);}

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(FAVORITES_STORE)) {
                const store = db.createObjectStore(FAVORITES_STORE, { keyPath: 'id' });
                store.createIndex('date', 'date', { unique: false });
                store.createIndex('tag', 'tag', { unique: false });
                store.createIndex('itemName', 'item.name', { unique: false });
            }
            if (!db.objectStoreNames.contains(METADATA_STORE)) {
                db.createObjectStore(METADATA_STORE, { keyPath: 'key' });
            }
        };

        request.onsuccess = (event) => {
            _db = event.target.result;

            _db.onversionchange = () => {
                _db.close();
                _db = null;
            };

            _db.onerror = (e) => {
                logger.error('[Storage] IndexedDB error:', e.target?.error);
            };

            resolve(_db);
        };

        request.onerror = () => {
            _db = null;
            reject(new Error('IndexedDB open failed'));
        };

        request.onblocked = () => {
            logger.warn('[Storage] IndexedDB blocked (another tab open?)');
        };
    });
}

/** @returns {Promise<Array>} */
export async function getFavorites() {
    try {
        const db = await openDB();
        const tx = db.transaction(FAVORITES_STORE, 'readonly');
        const store = tx.objectStore(FAVORITES_STORE);
        const all = await new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
        return all;
    } catch (err) {
        logger.warn('[Storage] IndexedDB read failed, using localStorage:', err);
        return getFavoritesLS();
    }
}

/** @param {Array} favorites @returns {Promise<boolean>} */
export async function saveFavorites(favorites) {
    try {
        const db = await openDB();
        const tx = db.transaction(FAVORITES_STORE, 'readwrite');
        const store = tx.objectStore(FAVORITES_STORE);

        await new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            
            const clearReq = store.clear();
            clearReq.onsuccess = () => {
                if (favorites.length === 0) { return; }
                for (let i = 0; i < favorites.length; i++) {
                    store.put(favorites[i]);
                }
            };
        });

        await setMetadata('last_updated', new Date().toISOString());

        try {
            localStorage.setItem(LS_KEY, JSON.stringify(favorites));
        } catch (e) {
            logger.warn('[Storage] localStorage sync failed:', e);
        }

    return true;
    } catch (err) {
        logger.error('[Storage] IndexedDB save failed:', err);
        try {
            localStorage.setItem(LS_KEY, JSON.stringify(favorites));
            return true;
        } catch (lsErr) {
            logger.error('[Storage] localStorage fallback also failed:', lsErr);
            window.dispatchEvent(new CustomEvent('alkorater:storage-error', {
                detail: { message: 'Błąd zapisu danych. Zwolnij miejsce na urządzeniu.' },
            }));
            return false;
        }
    }
}

function getFavoritesLS() {
    try {
        const stored = localStorage.getItem(LS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

async function setMetadata(key, value) {
    try {
        const db = await openDB();
        const tx = db.transaction(METADATA_STORE, 'readwrite');
        const store = tx.objectStore(METADATA_STORE);
        store.put({ key, value });
    } catch (e) {
        logger.warn('[Storage] setMetadata failed:', e);
    }
}

async function getMetadata(key) {
    try {
        const db = await openDB();
        const tx = db.transaction(METADATA_STORE, 'readonly');
        const store = tx.objectStore(METADATA_STORE);
        return await new Promise((resolve) => {
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result?.value ?? null);
            req.onerror = () => resolve(null);
        });
    } catch {
        return null;
    }
}

/** @returns {Promise<Array>} */
export async function migrateFromLocalStorage() {
    const lsFavorites = getFavoritesLS();
    if (lsFavorites.length === 0) {return [];}

    logger.info('[Storage] Migrating', lsFavorites.length, 'favorites from localStorage to IndexedDB');
    const success = await saveFavorites(lsFavorites);
    if (success) {
        logger.info('[Storage] Migration complete');
    } else {
        logger.warn('[Storage] Migration failed, keeping localStorage as primary');
    }

    return lsFavorites;
}

/** @returns {Promise<number>} */
export async function getSchemaVersion() {
    return await getMetadata('schema_version') || 1;
}

/** @param {number} version */
export async function setSchemaVersion(version) {
    await setMetadata('schema_version', version);
}

/** @returns {Promise<boolean>} */
export async function healthCheck() {
    try {
        const db = await openDB();
        const tx = db.transaction(FAVORITES_STORE, 'readonly');
        tx.objectStore(FAVORITES_STORE).count();
        return true;
    } catch {
        try {
            localStorage.getItem(LS_KEY);
            return true;
        } catch {
            return false;
        }
    }
}
