/**
 * @module storage
 * localStorage wrapper with try/catch safety.
 * Reads/writes state.favorites without triggering re-renders.
 */

import { state } from './state.js';

// ─── Load ─────────────────────────────────────────────────────────────────────

export const loadFavorites = () => {
    try {
        const stored = localStorage.getItem('favorites');
        state.favorites = stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('[Storage] Failed to load favorites:', e);
        state.favorites = [];
    }
};

// ─── Save ─────────────────────────────────────────────────────────────────────

export const saveFavorites = () => {
    try {
        localStorage.setItem('favorites', JSON.stringify(state.favorites));
    } catch (e) {
        console.error('[Storage] Failed to save favorites:', e);
    }
};
