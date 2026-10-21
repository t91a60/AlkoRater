import { productKey, localImage, alcoholPercent } from './product.js';

export const MAX_NOTE_LENGTH = 10000;

const text = (value, max, field) => {
    if (typeof value !== 'string' || value.length > max) {
        throw new Error(`Nieprawidłowe pole: ${field}.`);
    }
    return value;
};

export function normalizeRecord(raw) {
    if (
        !raw ||
        typeof raw !== 'object' ||
        Array.isArray(raw) ||
        !raw.item ||
        typeof raw.item !== 'object'
    ) {
        throw new Error('Nieprawidłowy wpis.');
    }
    if (
        !['string', 'number'].includes(typeof raw.id) ||
        (typeof raw.id === 'number' && !Number.isSafeInteger(raw.id))
    ) {
        throw new Error('Nieprawidłowy identyfikator wpisu.');
    }
    const id = String(raw.id ?? '');
    if (!id.trim() || id.length > 200) {
        throw new Error('Brak identyfikatora wpisu.');
    }
    const stars =
        typeof raw.stars === 'string' && /^[1-5]$/.test(raw.stars) ? Number(raw.stars) : raw.stars;
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
        throw new Error('Ocena musi być liczbą od 1 do 5.');
    }
    const date = text(raw.date, 50, 'date');
    if (!Number.isFinite(Date.parse(date))) {
        throw new Error('Nieprawidłowa data wpisu.');
    }
    const category = text(raw.item.category || raw.tag || 'Nieznane', 80, 'category');
    const abv = alcoholPercent(raw.item.alcohol);
    const item = {
        name: text(raw.item.name, 500, 'name'),
        category,
        brand: text(raw.item.brand || '', 200, 'brand'),
        type: text(raw.item.type || '', 200, 'type'),
        country: text(raw.item.country || '', 200, 'country'),
        alcohol: abv === null ? '' : `${abv}%`,
        image_url: localImage(raw.item.image_url),
    };
    if (!item.name.trim()) {
        throw new Error('Brak nazwy produktu.');
    }
    if (raw.item.id !== undefined && raw.item.id !== null) {
        if (
            !['string', 'number'].includes(typeof raw.item.id) ||
            (typeof raw.item.id === 'number' && !Number.isSafeInteger(raw.item.id))
        ) {
            throw new Error('Nieprawidłowe ID produktu.');
        }
        item.id = text(String(raw.item.id), 200, 'item.id');
    }
    if (raw.item.source) {
        item.source = text(raw.item.source, 30, 'source');
    }
    const revision = raw.revision ?? 1;
    if (!Number.isSafeInteger(revision) || revision < 1) {
        throw new Error('Nieprawidłowa rewizja wpisu.');
    }
    return {
        id,
        productId: productKey(item),
        item,
        stars,
        tag: category,
        note: text(raw.note ?? '', Infinity, 'note'),
        date: new Date(date).toISOString(),
        revision,
    };
}

export function normalizeRecords(records) {
    if (!Array.isArray(records) || records.length > 20000) {
        throw new Error('Nieprawidłowa kolekcja.');
    }
    const normalized = records.map(normalizeRecord);
    if (new Set(normalized.map((r) => r.id)).size !== normalized.length) {
        throw new Error('Powtórzone identyfikatory wpisów.');
    }
    return normalized.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}
