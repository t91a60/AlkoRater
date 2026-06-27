import { state } from '../app/state.js';

let _cache = null;

/** @returns {Array} */
export function getProducts() {
    if (_cache && _cache.length > 0) {return _cache;}
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

/** @param {string} name @returns {Object|null} */
export function findProductByName(name) {
    const products = getProducts();
    return products.find((p) => p.name === name) || null;
}

/** @returns {number} */
export function getProductCount() {
    return getProducts().length;
}

/** Clear product cache. */
export function clearCache() {
    _cache = null;
}
