/**
 * @module state
 * Central application state — single source of truth.
 * No imports. All other modules read/write from here.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

export const CONSTANTS = {
    MAX_RECENT_ITEMS: 10,
    SEARCH_DEBOUNCE_MS: 300,
    ANIMATION_DELAY_MS: 300,
    STAGGER_DELAY_MS: 30,
};

// ─── Application State ────────────────────────────────────────────────────────

export const state = {
    appData: [],       // All products loaded from JSON
    favorites: [],     // User's rated/favorited items
    currentTab: 'start',
    currentItem: null, // Item being rated in modal
    ratingConfig: { stars: 0, tag: '', note: '' },
    el: {},            // DOM element references (populated in initEl())
};