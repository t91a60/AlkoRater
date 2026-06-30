import { CONSTANTS } from '../app/constants.js';
import { setProducts } from '../data/product-repo.js';
import { logger } from '../utils/logger.js';

const { CATEGORIES } = CONSTANTS;

export const normalizeSearchText = (value = '') => String(value)
    .toLowerCase()
    .replace(/ł/g, 'l')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const fetchJSON = async (url) => {
    try {
        const r = await fetch(url);
        return r.ok ? r.json() : [];
    } catch (err) {
        logger.error(`Error fetching ${url}:`, err);
        return [];
    }
};

const normalizeLoadedItem = (item = {}, source = 'beer', index = 0) => {
    const rawName = item.name ?? item.title ?? item.productName ?? '';
    const rawAlcohol = item.alcohol ?? item.abv ?? item.abvPercent ?? '';
    const alcoholDisplay = rawAlcohol === ''
        ? ''
        : typeof rawAlcohol === 'number'
            ? `${rawAlcohol}%`
            : String(rawAlcohol).includes('%')
                ? String(rawAlcohol)
                : `${rawAlcohol}%`;

    const rawBrand = normalizeSearchText([
        item.brand, item.brand_name, item.brandName,
        item.manufacturer, item.producer,
    ].filter(Boolean).join(' '));

    const rawType = normalizeSearchText([
        item.type, item.breweryType, item.style, item.subtype,
    ].filter(Boolean).join(' '));

    const rawCountry = normalizeSearchText([
        item.country, item.country_name, item.origin, item.region,
    ].filter(Boolean).join(' '));

    const beerType = item.type || null;

    const rawImage = item.image_url ?? item.image ?? item.imageUrl ?? '';
    const hasRealImage = rawImage && !rawImage.includes('dummyimage.com');

    return {
        id: item.id ?? `${source}-${index + 1}`,
        name: rawName,
        alcohol: alcoholDisplay,
        image_url: hasRealImage ? rawImage : '',
        category: CATEGORIES[source] ?? 'Piwo',
        type: beerType,
        country: rawCountry,
        normalized_name: normalizeSearchText(rawName),
        searchText: normalizeSearchText([
            rawName, rawBrand, rawType,
            CATEGORIES[source] ?? 'Piwo', rawCountry,
        ].join(' ')),
    };
};

/** Fetch all JSON data files, normalize, and set app-wide products. */
export async function loadAllData() {
    const [beerData, vodkaData, wineData] = await Promise.all([
        fetchJSON('./data/piwa.json'),
        fetchJSON('./data/wodki.json'),
        fetchJSON('./data/wina.json'),
    ]);

    const products = [
        ...beerData.map((item, index) => normalizeLoadedItem(item, 'beer', index)),
        ...vodkaData.map((item, index) => normalizeLoadedItem(item, 'vodka', index)),
        ...wineData.map((item, index) => normalizeLoadedItem(item, 'wine', index)),
    ];

    setProducts(products);

    const dbCountEl = document.getElementById('dbCount');
    if (dbCountEl) {dbCountEl.textContent = products.length;}
}
