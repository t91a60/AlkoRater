import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const normalizeSearchText = (value = '') => String(value)
    .toLowerCase()
    .replace(/ł/g, 'l')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const deriveCategory = (type = '') => {
    const t = normalizeSearchText(type);
    if (t.includes('wino') || t.includes('szampan') || t.includes('prosecco') ||
        t.includes('musujace') || t.includes('porto') || t.includes('sherry') ||
        t.includes('bordeaux') || t.includes('rose') || t.includes('cava') ||
        t.includes('champagne')
    ) return 'Wino';
    
    if (t.includes('piwo') || t.includes('lager') || t.includes('porter') ||
        t.includes('stout') || t.includes('ipa') || t.includes('pilsner') ||
        t.includes('weizen') || t.includes('pszeniczn') ||
        t.includes('ale') || t.includes('bock') || t.includes('wheat')
    ) return 'Piwo';
    
    return 'Wódka';
};

const buildSearchIndex = (item) => normalizeSearchText([
    item?.name,
    item?.brand,
    item?.type,
    item?.category,
    item?.country,
].filter(Boolean).join(' '));

const rewriteData = (filename, sourcePrefix) => {
    const filePath = path.join(root, 'data', filename);
    const data = JSON.parse(readFileSync(filePath, 'utf8'));

    const standardizedData = data.map((item, index) => {
        const rawName = item.name ?? item.title ?? item.productName ?? '';
        const rawBrand = item.brand ?? item.brewery ?? item.manufacturer ?? rawName.split(' ')[0] ?? '';
        const rawType = item.type ?? item.style ?? item.category ?? '';
        
        const rawAlcohol = item.alcohol ?? item.abv ?? item.abvPercent ?? '';
        const alcoholDisplay = rawAlcohol === '' ? ''
            : typeof rawAlcohol === 'number' ? `${rawAlcohol}%`
            : String(rawAlcohol).includes('%') ? String(rawAlcohol)
            : `${rawAlcohol}%`;

        const normalized = {
            id: item.id ?? `${sourcePrefix}-${index + 1}`,
            name: rawName,
            brand: rawBrand,
            type: rawType,
            alcohol: alcoholDisplay,
            volume: item.volume ?? item.ml ?? item.size ?? '',
            country: item.country ?? item.origin ?? item.countryOfOrigin ?? '',
            price: item.price ?? '',
            rating: item.rating ?? null,
            image_url: item.image_url ?? item.image ?? item.imageUrl ?? '',
            normalized_name: normalizeSearchText(rawName)
        };
        
        normalized.category = deriveCategory(normalized.type);
        normalized.searchText = buildSearchIndex(normalized);
        
        return normalized;
    });

    writeFileSync(filePath, JSON.stringify(standardizedData, null, 2), 'utf8');
    console.log(`Standardized ${filename}`);
};

rewriteData('piwa.json', 'beer');
rewriteData('wodki.json', 'vodka');
rewriteData('wina.json', 'wine');
