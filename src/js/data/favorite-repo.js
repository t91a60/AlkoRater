import { setFavorites } from '../app/state.js';
import * as storage from '../services/storage.js';

export async function loadFavorites() {
    let favorites;

    try {
        favorites = await storage.getFavorites();
    } catch {
        favorites = [];
    }

    if (!favorites || favorites.length === 0) {
        try {
            favorites = await storage.migrateFromLocalStorage();
        } catch {
            favorites = [];
        }
    }

    setFavorites(favorites || []);
    return favorites;
}

export async function saveFavorites(favorites) {
    setFavorites(favorites);
    return await storage.saveFavorites(favorites);
}

export async function deleteFavorite(favorites, id) {
    const updated = favorites.filter((f) => String(f.id) !== String(id));
    return await saveFavorites(updated);
}

export function findFavorite(favorites, itemName) {
    return favorites.find((f) => f.item?.name === itemName) || null;
}

export function createRecord(item, ratingConfig) {
    return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        item: { ...item },
        ...ratingConfig,
        date: new Date().toISOString(),
    };
}

export async function upsertFavorite(favorites, newRecord) {
    const existingIndex = favorites.findIndex(
        (f) => f.item?.name === newRecord.item?.name,
    );

    let updated;
    if (existingIndex >= 0) {
        updated = favorites.map((f, i) => (i === existingIndex ? newRecord : f));
    } else {
        updated = [newRecord, ...favorites];
    }

    await saveFavorites(updated);
    return existingIndex >= 0 ? 'updated' : 'created';
}
