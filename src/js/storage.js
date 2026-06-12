/**
 * @module storage
 * Persistent favorites + cross-tab notification helper.
 */

import { state } from './state.js';

// ─── Favorites ────────────────────────────────────────────────────────────

export const loadFavorites = () => {
    try {
        const stored = localStorage.getItem('favorites');
        state.favorites = stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('[Storage] Failed to load favorites:', error);
        state.favorites = [];
    }
};

export const saveFavorites = () => {
    try {
        localStorage.setItem('favorites', JSON.stringify(state.favorites));
        notifyStorageChanged();
        return true;
    } catch (error) {
        console.error('[Storage] Failed to save favorites:', error);
        window.dispatchEvent(new CustomEvent('alkorater:storage-error', {
            detail: { message: 'Błąd zapisu danych. Zwolnij miejsce na urządzeniu.' },
        }));
        return false;
    }
};

// Optional cross-tab notifications (non-fatal if api missing)
const notifyStorageChanged = () => {
    try {
        if (typeof window === 'undefined') {return;}
        window.dispatchEvent(
            new window.CustomEvent('alkorater:storage', { detail: { favorites: state.favorites } }),
        );
    } catch (error) {
        // no-op
    }
};
