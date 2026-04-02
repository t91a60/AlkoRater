/**
 * @module data
 * Minimal JSON loader since normalization now happens in build via standardization scripts.
 */

import { state } from './state.js';

const SOURCE_CATEGORIES = {
    beer: 'Piwo',
    vodka: 'Wódka',
    wine: 'Wino',
};

// ─── Search Normalization ────────────────────────────────────────────────────

/**
 * Normalizes user queries for search matching.
 */
export const normalizeSearchText = (value = '') => String(value)
    .toLowerCase()
    .replace(/ł/g, 'l')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

// ─── Fetch Helper ─────────────────────────────────────────────────────────────

const fetchJSON = (url) =>
    fetch(url)
        .then((r) => (r.ok ? r.json() : []))
        .catch((err) => {
            console.error(`[Data] Error fetching ${url}:`, err);
            return [];
        });

const normalizeLoadedItem = (item = {}, source = 'beer', index = 0) => {
    const rawName = item.name ?? item.title ?? item.productName ?? '';
    const rawAlcohol = item.alcohol ?? item.abv ?? item.abvPercent ?? '';
    const alcoholDisplay = rawAlcohol === '' ? ''
        : typeof rawAlcohol === 'number' ? `${rawAlcohol}%`
        : String(rawAlcohol).includes('%') ? String(rawAlcohol)
        : `${rawAlcohol}%`;

    return {
        id: item.id ?? `${source}-${index + 1}`,
        name: rawName,
        alcohol: alcoholDisplay,
        image_url: item.image_url ?? item.image ?? item.imageUrl ?? '',
        category: SOURCE_CATEGORIES[source] ?? 'Piwo',
        normalized_name: normalizeSearchText(rawName),
        searchText: normalizeSearchText(rawName),
    };
};

// ─── Load All Data ────────────────────────────────────────────────────────────

/**
 * Fetches pre-compiled JSON files concurrently and populates appData.
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