import { normalizeRecords } from '../data/records.js';
import { productKey } from '../data/product.js';
import { getFavorites, mutateFavorites } from './storage.js';
import { setFavorites } from '../app/state.js';

export const LARGE_BACKUP_BYTES = 5 * 1024 * 1024;

export function parseBackup(text) {
    if (typeof text !== 'string') {
        throw new Error('Kopia musi być plikiem JSON.');
    }
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        throw new Error('To nie jest poprawny plik JSON.');
    }
    if (data?.app !== 'AlkoRater' || data?.schemaVersion !== 1) {
        throw new Error('Nieobsługiwany format kopii AlkoRater.');
    }
    return normalizeRecords(data.records);
}

export async function exportBackup() {
    return JSON.stringify(
        {
            app: 'AlkoRater',
            schemaVersion: 1,
            exportedAt: new Date().toISOString(),
            records: await getFavorites(),
        },
        null,
        2,
    );
}

export function mergeBackup(current, incoming) {
    const ids = new Set(current.map((r) => r.id));
    const products = new Set(current.map((r) => productKey(r.item)));
    const added = [];
    for (const record of incoming) {
        if (ids.has(record.id) || products.has(productKey(record.item))) {
            continue;
        }
        ids.add(record.id);
        products.add(productKey(record.item));
        added.push(record);
    }
    return {
        records: [...current, ...added],
        added: added.length,
        skipped: incoming.length - added.length,
    };
}

export async function importBackup(incoming) {
    const validated = normalizeRecords(incoming);
    let summary;
    const records = await mutateFavorites((current) => {
        summary = mergeBackup(current, validated);
        return summary.records;
    });
    setFavorites(records);
    return { added: summary.added, skipped: summary.skipped };
}
