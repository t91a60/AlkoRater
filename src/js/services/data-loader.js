import { setProducts } from '../data/product-repo.js';
import { normalizeLoadedItem, productKey } from '../data/product.js';
import { state } from '../app/state.js';

export { normalizeSearchText, normalizeLoadedItem } from '../data/product.js';

const sources = { beer: 'piwa', vodka: 'wodki', wine: 'wina' };

export async function loadAllData() {
    try {
        const groups = await Promise.all(
            Object.entries(sources).map(async ([source, file]) => {
                const response = await fetch(
                    new URL(`../../../data/${file}.json`, import.meta.url),
                );
                if (!response.ok) {
                    throw new Error(`Katalog ${file}: HTTP ${response.status}`);
                }
                const raw = await response.json();
                if (!Array.isArray(raw)) {
                    throw new Error(`Nieprawidłowy katalog ${file}.`);
                }
                return raw.map((item) => normalizeLoadedItem(item, source));
            }),
        );
        const products = groups.flat();
        if (new Set(products.map(productKey)).size !== products.length) {
            throw new Error('Powtórzone ID produktów.');
        }
        setProducts(products);
        state.catalogError = null;
        return products;
    } catch (error) {
        state.catalogError = error;
        throw error;
    }
}
