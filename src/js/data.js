/**
 * @module data
 * JSON loading and category derivation.
 * deriveCategory() fixes the piwa.json bug — categories come from item.type,
 * not from which file the item happened to be stored in.
 */

import { state } from './state.js';

// ─── Search Normalization ────────────────────────────────────────────────────

/**
 * Normalizes text for case-insensitive, diacritic-insensitive search.
 * @param {string} value - Raw text value
 * @returns {string} Normalized search string
 */
export const normalizeSearchText = (value = '') => String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/ß/g, 'ss');

/**
 * Builds a compact searchable index for an item.
 * @param {Object} item - Product item
 * @returns {string} Combined normalized search text
 */
export const buildSearchIndex = (item) => normalizeSearchText([
    item?.name,
    item?.brand,
    item?.type,
    item?.country,
].filter(Boolean).join(' '));

/**
 * Normalizes a raw record from any supported alcohol source.
 * Accepts common field aliases so the search layer can stay source-agnostic.
 *
 * @param {Object} item - Raw source item
 * @param {string} source - Source name used for fallback IDs
 * @param {number} index - Zero-based item index
 * @returns {Object} Normalized item
 */
export const normalizeLoadedItem = (item = {}, source = 'source', index = 0) => {
    const normalized = {
        id: item.id ?? `${source}-${index + 1}`,
        name: item.name ?? item.title ?? item.productName ?? '',
        brand: item.brand ?? item.brewery ?? item.manufacturer ?? '',
        type: item.type ?? item.style ?? item.category ?? '',
        alcohol: item.alcohol ?? item.abv ?? item.abvPercent ?? '',
        volume: item.volume ?? item.ml ?? item.size ?? '',
        country: item.country ?? item.origin ?? item.countryOfOrigin ?? '',
        price: item.price,
        rating: item.rating,
        image_url: item.image_url ?? item.image ?? item.imageUrl ?? '',
    };

    return {
        ...item,
        ...normalized,
        category: deriveCategory(normalized.type),
        searchText: item.searchText ? normalizeSearchText(item.searchText) : buildSearchIndex(normalized),
    };
};

// ─── Category Helper ──────────────────────────────────────────────────────────

/**
 * Derives the correct alcohol category based on the product type field.
 * Determines category reliably even if the product was listed in the wrong JSON file.
 *
 * @param {string} type - The product type string (e.g. 'Wódka Czysta', 'Lager')
 * @returns {'Wino' | 'Piwo' | 'Wódka'} The normalized category
 */
export const deriveCategory = (type = '') => {
    const t = type.toLowerCase();
    if (
        t.includes('wino') || t.includes('szampan') || t.includes('prosecco') ||
        t.includes('musujące') || t.includes('porto') || t.includes('sherry') ||
        t.includes('bordeaux') || t.includes('rose') || t.includes('cava')
    ) return 'Wino';

    if (
        t.includes('piwo') || t.includes('lager') || t.includes('porter') ||
        t.includes('stout') || t.includes('ipa') || t.includes('pilsner') ||
        t.includes('weizen') ||
        t.includes('pszeniczn') || t.includes(' ale')
    ) return 'Piwo';

    return 'Wódka'; // default: vodkas, liqueurs, spirits
};

// ─── Fetch Helper ─────────────────────────────────────────────────────────────

const fetchJSON = (url) =>
    fetch(url)
        .then((r) => (r.ok ? r.json() : []))
        .catch((err) => {
            console.error(`[Data] Error fetching ${url}:`, err);
            return [];
        });

// ─── Load All Data ────────────────────────────────────────────────────────────

/**
 * Fetches JSON files concurrently and populates the global appData state.
 * Validates responses and normalizes categories using deriveCategory.
 *
 * @returns {Promise<void>} Resolves when all data is loaded into `state.appData`
 */
export const loadAllData = async () => {
    const [beerData, vodkaData, wineData] = await Promise.all([
        fetchJSON('./data/piwa.json'),
        fetchJSON('./data/wodki.json'),
        fetchJSON('./data/wina.json'),
    ]);

    state.appData = [
        ...beerData.map((item, index) => normalizeLoadedItem(item, 'beer', index)),
        ...vodkaData.map((item, index) => normalizeLoadedItem(item, 'vodka', index)),
        ...wineData.map((item, index) => normalizeLoadedItem(item, 'wine', index)),
    ];

    const dbCountEl = document.getElementById('dbCount');
    if (dbCountEl) dbCountEl.textContent = state.appData.length;
};