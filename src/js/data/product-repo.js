import { state } from '../app/state.js';

let _cache = null;

export function getProducts() {
    if (_cache && _cache.length > 0) {return _cache;}
    if (state.appData && state.appData.length > 0) {
        _cache = state.appData;
    }
    return _cache || [];
}

export function setProducts(products) {
    state.appData = products;
    _cache = products;
}

export function findProductByName(name) {
    const products = getProducts();
    return products.find((p) => p.name === name) || null;
}

export function getProductCount() {
    return getProducts().length;
}

export function clearCache() {
    _cache = null;
}
