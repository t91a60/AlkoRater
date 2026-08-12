import { state } from '../app/state.js';

let _cache = null;

/** @returns {Array} */
export function getProducts() {
    if (_cache && _cache.length > 0) {
        return _cache;
    }
    if (state.appData && state.appData.length > 0) {
        _cache = state.appData;
    }
    return _cache || [];
}

/** @param {Array} products */
export function setProducts(products) {
    state.appData = products;
    _cache = products;
}
