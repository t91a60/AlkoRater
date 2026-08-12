export const state = {
    appData: [],
    favorites: [],
    currentTab: 'start',
    currentItem: null,
    ratingConfig: { stars: 0, tag: '', note: '' },
    lastSearchQuery: '',
};

/** @param {Array} favorites */
export function setFavorites(favorites) {
    state.favorites = favorites;
}

/** @param {string} tab */
export function setCurrentTab(tab) {
    state.currentTab = tab;
}

/** @param {Object} config */
export function setRatingConfig(config) {
    state.ratingConfig = { ...state.ratingConfig, ...config };
}

export function resetState() {
    state.currentItem = null;
    state.ratingConfig = { stars: 0, tag: '', note: '' };
}
