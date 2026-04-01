/**
 * @module data
 * Minimal JSON loader since normalization now happens in build via standardization scripts.
 */

import { state } from './state.js';

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

    // Data is merged purely natively (all structural mapping moved to build scripts)
    state.appData = [...beerData, ...vodkaData, ...wineData];

    const dbCountEl = document.getElementById('dbCount');
    if (dbCountEl) dbCountEl.textContent = state.appData.length;
};