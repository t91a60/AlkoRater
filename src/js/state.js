/**
 * @module state
 * Central application state — single source of truth.
 * No imports. All other modules read/write from here.
 */

export const CONSTANTS = {
    MAX_RECENT_ITEMS: 10,
    SEARCH_DEBOUNCE_MS: 300,
    ANIMATION_DELAY_MS: 300,
};

export const state = {
    appData:      [],
    favorites:    [],
    currentTab:   'start',
    currentItem:  null,
    ratingConfig: { stars: 0, tag: '', note: '' },
    el:           {},   // Populated by initEl() in main.js after DOMContentLoaded
};
