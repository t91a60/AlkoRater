/**
 * EVAL HARNESS: search-system
 * Validates the fixed search and data normalization logic.
 * Run: node scripts/eval-search.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// ── Inline the pure functions from data.js (no DOM needed) ────────────────────

const normalizeSearchText = (value = '') => String(value)
    .toLowerCase()
    .replace(/ł/g, 'l')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const deriveCategory = (type = '') => {
    const t = normalizeSearchText(type);
    if (
        t.includes('wino') || t.includes('szampan') || t.includes('prosecco') ||
        t.includes('musujace') || t.includes('porto') || t.includes('sherry') ||
        t.includes('bordeaux') || t.includes('rose') || t.includes('cava') ||
        t.includes('champagne')
    ) return 'Wino';
    if (
        t.includes('piwo') || t.includes('lager') || t.includes('porter') ||
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

const normalizeLoadedItem = (item = {}, source = 'source', index = 0) => {
    const rawName  = item.name ?? item.title ?? item.productName ?? '';
    const rawBrand = item.brand ?? item.brewery ?? item.manufacturer ?? rawName.split(' ')[0] ?? '';
    const rawType  = item.type ?? item.style ?? item.category ?? '';
    const rawAlcohol = item.alcohol ?? item.abv ?? item.abvPercent ?? '';
    const alcoholDisplay = rawAlcohol === '' ? ''
        : typeof rawAlcohol === 'number' ? `${rawAlcohol}%`
        : String(rawAlcohol).includes('%') ? String(rawAlcohol)
        : `${rawAlcohol}%`;

    const normalized = {
        id:        item.id ?? `${source}-${index + 1}`,
        name:      rawName,
        brand:     rawBrand,
        type:      rawType,
        alcohol:   alcoholDisplay,
        volume:    item.volume ?? item.ml ?? item.size ?? '',
        country:   item.country ?? item.origin ?? item.countryOfOrigin ?? '',
        price:     item.price ?? '',
        rating:    item.rating,
        image_url: item.image_url ?? item.image ?? item.imageUrl ?? '',
    };
    const category = deriveCategory(normalized.type);
    const withCategory = { ...normalized, category };
    return {
        ...withCategory,
        normalized_name: normalizeSearchText(rawName),
        searchText: buildSearchIndex(withCategory),
    };
};

const scoreResult = (item, normQuery) => {
    const st = item.searchText || '';
    if (!st.includes(normQuery)) return 0;
    const normName  = item.normalized_name || normalizeSearchText(item.name || '');
    const normBrand = normalizeSearchText(item.brand || '');
    if (normName.startsWith(normQuery))  return 3;
    if (normBrand.startsWith(normQuery)) return 2;
    return 1;
};

const search = (appData, raw) => {
    const normQuery = normalizeSearchText(raw);
    if (!normQuery) return [];
    const scored = [];
    for (const item of appData) {
        const score = scoreResult(item, normQuery);
        if (score > 0) scored.push({ item, score });
    }
    scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (a.item.name || '').localeCompare(b.item.name || '', 'pl');
    });
    return scored.slice(0, 50).map(s => s.item);
};

// ── Load data ─────────────────────────────────────────────────────────────────

const beer  = JSON.parse(readFileSync(path.join(root, 'data/piwa.json'), 'utf8'));
const vodka = JSON.parse(readFileSync(path.join(root, 'data/wodki.json'), 'utf8'));
const wine  = JSON.parse(readFileSync(path.join(root, 'data/wina.json'), 'utf8'));

const appData = [
    ...beer.map((item, i) => normalizeLoadedItem(item, 'beer', i)),
    ...vodka.map((item, i) => normalizeLoadedItem(item, 'vodka', i)),
    ...wine.map((item, i) => normalizeLoadedItem(item, 'wine', i)),
];

// ── Eval runner ───────────────────────────────────────────────────────────────

let passed = 0, failed = 0;
const results = [];

function eval_check(id, description, condition, detail = '') {
    const ok = Boolean(condition);
    if (ok) passed++;
    else failed++;
    results.push({ id, ok, description, detail });
}

// ── CAPABILITY EVALS ─────────────────────────────────────────────────────────

// [EVAL-1] Searching "piw" returns beers
{
    const r = search(appData, 'piw');
    const hasBeers = r.some(i => i.category === 'Piwo');
    eval_check('EVAL-1', '"piw" returns at least one beer', hasBeers,
        `got ${r.length} results, beers: ${r.filter(i=>i.category==='Piwo').map(i=>i.name).slice(0,3).join(', ')}`);
}

// [EVAL-2] Searching "piwo" returns beers (stop word must NOT suppress category)
{
    const r = search(appData, 'piwo');
    const hasBeers = r.some(i => i.category === 'Piwo');
    eval_check('EVAL-2', '"piwo" returns at least one beer', hasBeers,
        `got ${r.length} results, beers: ${r.filter(i=>i.category==='Piwo').map(i=>i.name).slice(0,3).join(', ')}`);
}

// [EVAL-3] Searching "zubr" returns Żubrówka (diacritic-insensitive)
{
    const r = search(appData, 'zubr');
    const hasZubrowka = r.some(i => i.name.toLowerCase().includes('zubr') || normalizeSearchText(i.name).includes('zubr'));
    eval_check('EVAL-3', '"zubr" returns Żubrówka (diacritic-insensitive)', hasZubrowka,
        `top 3: ${r.slice(0,3).map(i=>i.name).join(', ')}`);
}

// [EVAL-4] Searching single "t" returns results from first character
{
    const r = search(appData, 't');
    eval_check('EVAL-4', 'Single "t" returns results from first character', r.length > 0,
        `got ${r.length} results: ${r.slice(0,3).map(i=>i.name).join(', ')}`);
}

// [EVAL-5] Searching "lager" returns beers with Lager type
{
    const r = search(appData, 'lager');
    const hasLager = r.some(i => i.type.toLowerCase().includes('lager'));
    eval_check('EVAL-5', '"lager" returns Lager beer items', hasLager,
        `top 3: ${r.slice(0,3).map(i=>i.name).join(', ')}`);
}

// [EVAL-6] Searching "wino" returns wine items
{
    const r = search(appData, 'wino');
    const hasWine = r.some(i => i.category === 'Wino');
    eval_check('EVAL-6', '"wino" returns at least one wine', hasWine,
        `got ${r.length} results, wines: ${r.filter(i=>i.category==='Wino').map(i=>i.name).slice(0,3).join(', ')}`);
}

// [EVAL-7] Beers appear naturally without bias
{
    const r = search(appData, 'a');   // broad query that should hit all types
    const cats = r.reduce((acc, i) => { acc[i.category] = (acc[i.category]||0)+1; return acc; }, {});
    const hasBeer  = (cats['Piwo']  || 0) > 0;
    const hasVodka = (cats['Wódka'] || 0) > 0;
    const hasWine  = (cats['Wino']  || 0) > 0;
    eval_check('EVAL-7', 'Broad "a" query returns all alcohol types', hasBeer && hasVodka && hasWine,
        `categories: ${JSON.stringify(cats)}`);
}

// [EVAL-8] Results sorted best match first (name-prefix before contains)
{
    const r = search(appData, 'ty');
    const topName = r[0]?.name || '';
    const topStartsWith = normalizeSearchText(topName).startsWith('ty');
    eval_check('EVAL-8', 'Top result for "ty" has name starting with "ty"', topStartsWith,
        `top result: ${topName}`);
}

// [EVAL-9] All items have a non-empty brand field
{
    const noBrand = appData.filter(i => !i.brand || !i.brand.trim());
    eval_check('EVAL-9', 'All items have non-empty brand field', noBrand.length === 0,
        `${noBrand.length} items missing brand: ${noBrand.slice(0,3).map(i=>i.name).join(', ')}`);
}

// [EVAL-10] All items have category included in searchText
{
    const missingCategory = appData.filter(i => {
        const normCat = normalizeSearchText(i.category || '');
        return normCat && !i.searchText.includes(normCat);
    });
    eval_check('EVAL-10', 'All items have category included in searchText', missingCategory.length === 0,
        `${missingCategory.length} items with category not in searchText`);
}

// ── REGRESSION EVALS ─────────────────────────────────────────────────────────

// [REG-1] normalizeSearchText handles Polish characters correctly
{
    const tests = [
        ['Żubrówka', 'zubrowka'],
        ['Łomża', 'lomza'],
        ['Wódka', 'wodka'],
        ['Śliwkowa', 'sliwkowa'],
        ['Żywiec', 'zywiec'],
    ];
    const allPass = tests.every(([input, expected]) => normalizeSearchText(input) === expected);
    eval_check('REG-1', 'normalizeSearchText handles all Polish characters',
        allPass,
        tests.map(([i,e]) => `${i}→${normalizeSearchText(i)} (expected ${e})`).join(' | ')
    );
}

// [REG-2] Empty search returns no results
{
    const r = search(appData, '');
    eval_check('REG-2', 'Empty query returns empty array', r.length === 0,
        `length: ${r.length}`);
}

// [REG-3] deriveCategory correctly classifies all three types
{
    const beerTypes  = ['Lager', 'IPA', 'Stout', 'Weizen', 'Porter', 'Belgian Ale'];
    const wineTypes  = ['Wino czerwone wytrawne', 'Szampan wytrawny', 'Wino musujące'];
    const vodkaTypes = ['Czysta', 'Smakowa', 'Premium', 'Żytnia'];

    const beerOk  = beerTypes.every(t => deriveCategory(t) === 'Piwo');
    const wineOk  = wineTypes.every(t => deriveCategory(t) === 'Wino');
    const vodkaOk = vodkaTypes.every(t => deriveCategory(t) === 'Wódka');

    eval_check('REG-3', 'deriveCategory correctly classifies Piwo/Wino/Wódka',
        beerOk && wineOk && vodkaOk,
        [
            beerOk  ? 'Piwo: ✓' : `Piwo: ✗ (${beerTypes.find(t=>deriveCategory(t)!=='Piwo')})`,
            wineOk  ? 'Wino: ✓' : `Wino: ✗ (${wineTypes.find(t=>deriveCategory(t)!=='Wino')})`,
            vodkaOk ? 'Wódka: ✓' : `Wódka: ✗ (${vodkaTypes.find(t=>deriveCategory(t)!=='Wódka')})`,
        ].join(' | ')
    );
}

// [REG-4] Alcohol field always a string
{
    const numAlcohol = appData.filter(i => typeof i.alcohol === 'number');
    eval_check('REG-4', 'All alcohol fields are strings (not numbers)', numAlcohol.length === 0,
        `${numAlcohol.length} items with numeric alcohol: ${numAlcohol.slice(0,3).map(i=>i.name).join(', ')}`);
}

// [REG-5] Total dataset count
{
    eval_check('REG-5', 'Dataset loaded with all items', appData.length >= 100,
        `total: ${appData.length} (beer: ${beer.length}, vodka: ${vodka.length}, wine: ${wine.length})`);
}

// ── Report ────────────────────────────────────────────────────────────────────

console.log('\n╔══════════════════════════════════════════════════════╗');
console.log('║   EVAL REPORT: search-system                         ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

const capabilityEvals = results.filter(r => r.id.startsWith('EVAL'));
const regressionEvals = results.filter(r => r.id.startsWith('REG'));

console.log('CAPABILITY EVALS:');
for (const r of capabilityEvals) {
    const icon = r.ok ? '✅ PASS' : '❌ FAIL';
    console.log(`  [${r.id}] ${icon}  ${r.description}`);
    if (!r.ok || r.detail) console.log(`         → ${r.detail}`);
}

console.log('\nREGRESSION EVALS:');
for (const r of regressionEvals) {
    const icon = r.ok ? '✅ PASS' : '❌ FAIL';
    console.log(`  [${r.id}] ${icon}  ${r.description}`);
    if (!r.ok || r.detail) console.log(`         → ${r.detail}`);
}

const capPass = capabilityEvals.filter(r => r.ok).length;
const regPass = regressionEvals.filter(r => r.ok).length;

console.log(`\n─────────────────────────────────────────────────────────`);
console.log(`Capability:  ${capPass}/${capabilityEvals.length} passed`);
console.log(`Regression:  ${regPass}/${regressionEvals.length} passed`);
console.log(`Total:       ${passed}/${passed+failed} passed`);
console.log(`Status:      ${failed === 0 ? '🟢 ALL PASS — SHIP IT' : `🔴 ${failed} FAILING`}`);
console.log(`─────────────────────────────────────────────────────────\n`);

process.exit(failed > 0 ? 1 : 0);
