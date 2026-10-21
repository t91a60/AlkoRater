import { CONSTANTS } from '../app/constants.js';

export const normalizeSearchText = (value = '') =>
    String(value)
        .toLowerCase()
        .replace(/ł/g, 'l')
        .replace(/ß/g, 'ss')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

export function productKey(item) {
    const source =
        item.source ||
        Object.keys(CONSTANTS.CATEGORIES).find(
            (key) => CONSTANTS.CATEGORIES[key] === item.category,
        ) ||
        'unknown';
    if (item.id !== undefined && item.id !== null && String(item.id).trim()) {
        return `${source}:${item.id}`;
    }
    return `legacy:${normalizeSearchText([item.category, item.brand || '', item.name].join('|'))}`;
}

export function alcoholPercent(value) {
    if (value === '' || value === null || value === undefined) {
        return null;
    }
    const text = String(value).trim().replace(',', '.').replace(/%$/, '').trim();
    if (!/^\d+(\.\d+)?$/.test(text)) {
        return null;
    }
    const number = Number(text);
    return Number.isFinite(number) && number >= 0 && number <= 100 ? number : null;
}

export function localImage(value) {
    if (typeof value !== 'string' || !value || value.includes('dummyimage.com')) {
        return '';
    }
    if (
        !/^\.?\/?(?:icons|data|images)\/[\w./-]+\.(?:png|jpe?g|webp|avif|svg)$/i.test(value) ||
        value.includes('..')
    ) {
        return '';
    }
    return `./${value.replace(/^\.?\//, '')}`;
}

export function normalizeLoadedItem(item = {}, source = 'beer') {
    const validId =
        (typeof item.id === 'string' && item.id.trim() && item.id.length <= 200) ||
        (typeof item.id === 'number' && Number.isSafeInteger(item.id));
    const name = String(item.name ?? item.title ?? item.productName ?? '').trim();
    if (!name || !CONSTANTS.CATEGORIES[source] || !validId) {
        throw new Error('Nieprawidłowy produkt w katalogu: wymagana nazwa i stałe ID.');
    }
    const alcohol = alcoholPercent(item.alcohol ?? item.abv ?? item.abvPercent);
    const product = {
        id: item.id,
        source,
        name,
        brand: String(
            item.brand ??
                item.brand_name ??
                item.brandName ??
                item.manufacturer ??
                item.producer ??
                '',
        ).trim(),
        type: String(item.type ?? item.style ?? item.subtype ?? '').trim(),
        category: CONSTANTS.CATEGORIES[source],
        country: String(item.country ?? item.country_name ?? item.origin ?? '').trim(),
        alcohol: alcohol === null ? '' : `${alcohol}%`,
        image_url: localImage(item.image_url ?? item.image ?? item.imageUrl),
    };
    return {
        ...product,
        normalized_name: normalizeSearchText(name),
        searchText: normalizeSearchText(
            [
                name,
                product.brand,
                product.type,
                product.category,
                product.country,
                product.alcohol,
            ].join(' '),
        ),
    };
}
