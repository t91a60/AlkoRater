export const CONSTANTS = {
    MAX_RECENT_ITEMS: 10,
    SEARCH_DEBOUNCE_MS: 300,
    ANIMATION_DELAY_MS: 300,
    STAGGER_DELAY_MS: 30,

    STORAGE_KEYS: {
        FAVORITES: 'favorites',
        SCHEMA_VERSION: 'alkorater:schema_version',
        PRODUCT_CACHE: 'alkorater:product_cache',
    },

    DB_NAME: 'alkorater',
    DB_VERSION: 2,
    PRODUCT_CACHE_TTL: 24 * 60 * 60 * 1000,

    CATEGORIES: {
        beer: 'Piwo',
        vodka: 'Wódka',
        wine: 'Wino',
    },

    CATEGORY_ACCENTS: {
        Piwo: { hue: '42', sat: '58', lit: '52', hex: '#d4a054' },
        Wódka: { hue: '203', sat: '88', lit: '71', hex: '#6bc5f7' },
        Wino: { hue: '346', sat: '44', lit: '51', hex: '#b84a62' },
    },

    MAX_SEARCH_RESULTS: 50,
    TOAST_DURATION: 2200,
    TOAST_FADE: 250,
};
