import { readFileSync } from 'node:fs';
import { normalizeLoadedItem, productKey, alcoholPercent } from '../src/js/data/product.js';

const files = { beer: 'piwa.json', vodka: 'wodki.json', wine: 'wina.json' };
const seenIds = new Set();
const seenNames = new Map();
const rows = [];
const errors = [];

for (const [source, file] of Object.entries(files)) {
    try {
        const raw = JSON.parse(readFileSync(new URL(`../data/${file}`, import.meta.url), 'utf8'));
        if (!Array.isArray(raw)) throw new Error('Katalog nie jest tablicą.');
        const products = raw.map((item) => normalizeLoadedItem(item, source));
        for (const [index, product] of products.entries()) {
            const key = productKey(product);
            if (seenIds.has(key)) errors.push(`Powtórzone ID: ${key}`);
            seenIds.add(key);
            const names = seenNames.get(product.normalized_name) || [];
            seenNames.set(product.normalized_name, [...names, key]);
            const value = raw[index].alcohol;
            if (
                value !== '' &&
                value !== undefined &&
                value !== null &&
                alcoholPercent(value) === null
            )
                errors.push(`Nieprawidłowy procent: ${key}`);
            if (String(raw[index].type).replace(',', '.') === '0.0%' && alcoholPercent(value) !== 0)
                errors.push(`Sprzeczna etykieta 0.0%: ${key}`);
        }
        rows.push({
            file,
            products: products.length,
            unknownType: products.filter((p) => !p.type).length,
            unknownBrand: products.filter((p) => !p.brand).length,
            unknownCountry: products.filter((p) => !p.country).length,
            withoutPhoto: products.filter((p) => !p.image_url).length,
        });
    } catch (error) {
        errors.push(`${file}: ${error.message}`);
    }
}

console.table(rows);
for (const [name, keys] of seenNames) {
    if (keys.length > 1)
        console.log(`Wspólna nazwa „${name}”, osobne produkty: ${keys.join(', ')}`);
}
for (const error of errors) console.error(error);
console.log(
    `Stałe ID: ${seenIds.size}. Błędy kontraktu: ${errors.length}. Nie zmieniono plików ani nie pobrano danych z sieci.`,
);
process.exitCode = errors.length ? 1 : 0;
