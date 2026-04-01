/**
 * @module data
 * JSON loading and category derivation.
 * deriveCategory() fixes the piwa.json bug — categories come from item.type,
 * not from which file the item happened to be stored in.
 */

import { state } from './state.js';

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
        ...beerData.map((item) => ({ ...item, category: deriveCategory(item.type) })),
        ...vodkaData.map((item) => ({ ...item, category: deriveCategory(item.type) })),
        ...wineData.map((item) => ({ ...item, category: deriveCategory(item.type) })),
    ];

    const dbCountEl = document.getElementById('dbCount');
    if (dbCountEl) dbCountEl.textContent = state.appData.length;
};