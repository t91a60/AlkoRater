import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..', 'data');

// Minimal data loader: normalizeSearchText + loadAllData analog
function normalizeSearchText(value = '') {
    return String(value)
        .toLowerCase()
        .replace(/ł/g, 'l')
        .replace(/ß/g, 'ss')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

const CATEGORIES = { beer: 'Piwo', vodka: 'Wódka', wine: 'Wino' };

function normalizeLoadedItem(item, source, index) {
    const rawName = item.name ?? item.title ?? item.productName ?? '';
    const rawAlcohol = item.alcohol ?? item.abv ?? item.abvPercent ?? '';
    const alcoholDisplay = rawAlcohol === ''
        ? ''
        : typeof rawAlcohol === 'number'
            ? `${rawAlcohol}%`
            : String(rawAlcohol).includes('%')
                ? String(rawAlcohol)
                : `${rawAlcohol}%`;

    return {
        id: item.id ?? `${source}-${index + 1}`,
        name: rawName,
        alcohol: alcoholDisplay,
        image_url: item.image_url ?? item.image ?? item.imageUrl ?? '',
        category: CATEGORIES[source] ?? 'Piwo',
        normalized_name: normalizeSearchText(rawName),
        searchText: normalizeSearchText([rawName, CATEGORIES[source] ?? 'Piwo'].join(' ')),
    };
}

function loadAllDataSync() {
    const files = {
        beer: 'piwa.json',
        vodka: 'wodki.json',
        wine: 'wina.json',
    };
    const all = [];
    for (const [source, fileName] of Object.entries(files)) {
        const raw = fs.readFileSync(path.join(DATA_DIR, fileName), 'utf-8');
        const data = JSON.parse(raw);
        data.forEach((item, i) => all.push(normalizeLoadedItem(item, source, i)));
    }
    return all;
}

// Copy of the new search.js logic
function levenshtein(a, b) {
    const m = a.length;
    const n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    let prev = new Uint8Array(n + 1);
    let curr = new Uint8Array(n + 1);
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
        curr[0] = i;
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
        }
        [prev, curr] = [curr, prev];
    }
    return prev[n];
}

const SCORE_EXACT_PREFIX = 10;
const SCORE_EXACT_CONTAINS = 5;
const SCORE_FUZZY = 3;
const SCORE_ALL_WORDS_BONUS = 15;

function fuzzyDistance(wordLen) {
    if (wordLen <= 3) return 0;
    if (wordLen <= 5) return 1;
    return 2;
}

function scoreWord(queryWord, nameWords, searchTextWords) {
    for (const nw of nameWords) {
        if (nw.startsWith(queryWord)) return SCORE_EXACT_PREFIX;
        if (nw.includes(queryWord)) return SCORE_EXACT_CONTAINS;
    }
    for (const sw of searchTextWords) {
        if (sw.startsWith(queryWord)) return SCORE_EXACT_PREFIX;
        if (sw.includes(queryWord)) return SCORE_EXACT_CONTAINS;
    }
    const maxDist = fuzzyDistance(queryWord.length);
    if (maxDist > 0) {
        for (const nw of nameWords) {
            if (Math.abs(nw.length - queryWord.length) <= maxDist && levenshtein(nw, queryWord) <= maxDist) {
                return SCORE_FUZZY;
            }
        }
        for (const sw of searchTextWords) {
            if (Math.abs(sw.length - queryWord.length) <= maxDist && levenshtein(sw, queryWord) <= maxDist) {
                return SCORE_FUZZY;
            }
        }
    }
    return 0;
}

function search(query, products) {
    if (!query || !query.trim()) return [];
    const normQuery = normalizeSearchText(query);
    if (!normQuery) return [];
    const queryWords = normQuery.split(/\s+/).filter(Boolean);
    if (queryWords.length === 0) return [];

    const scored = [];
    for (const item of products) {
        const normName = item.normalized_name || '';
        const searchText = item.searchText || normName;
        const nameWords = normName.split(/\s+/).filter(Boolean);
        const searchTextWords = searchText.split(/\s+/).filter(Boolean);
        let totalScore = 0;
        let matchedCount = 0;

        for (const qw of queryWords) {
            const wordScore = scoreWord(qw, nameWords, searchTextWords);
            if (wordScore === 0) { totalScore = 0; break; }
            totalScore += wordScore;
            matchedCount++;
        }

        if (totalScore === 0) continue;
        if (matchedCount === queryWords.length) totalScore += SCORE_ALL_WORDS_BONUS;
        scored.push({ item, score: totalScore });
    }

    scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (a.item.name || '').localeCompare(b.item.name || '', 'pl');
    });

    return scored.slice(0, 50).map((s) => s.item);
}

// ---- Tests ----
const products = loadAllDataSync();
console.log(`Loaded ${products.length} products\n`);

const tests = [
    { q: 'zubr', desc: 'zubr → Żubr, Żubrówka' },
    { q: 'zubrowka', desc: 'zubrowka → Żubrówka (biała, bison grass, czarna, złota)' },
    { q: 'gronie tyskie', desc: 'gronie tyskie → Tyskie Gronie' },
    { q: 'tys', desc: 'tys → Tyskie 0.0, Tyskie Gronie' },
    { q: 'wodka wyborowa', desc: 'wodka wyborowa → Wyborowa, Wyborowa Pszenica' },
    { q: 'zywiec', desc: 'zywiec → Żywiec Jasne Pełne, Żywiec Porter itp.' },
    { q: 'cabernet', desc: 'cabernet → Cabernet produkty' },
    { q: 'mocne', desc: 'mocne → Dębowe Mocne, Harnaś Mocne, Kasztelan Mocne ...' },
    { q: 'tyskie gron', desc: 'tyskie gron (partial word) → Tyskie Gronie' },
    { q: 'ipa', desc: 'ipa → piwa typu IPA' },
    { q: 'porter', desc: 'porter → piwa typu Porter' },
    { q: 'radler', desc: 'radler → radlery' },
];

let passed = 0;
let failed = 0;

for (const { q, desc } of tests) {
    const results = search(q, products);
    const names = results.map((r) => r.name);
    console.log(`Query: "${q}" (${desc})`);
    console.log(`  Results (${results.length}): ${names.slice(0, 6).join(', ')}${results.length > 6 ? '...' : ''}`);

    // Specific assertions
    const ok = (() => {
        switch (q) {
            case 'zubr':
                return names.some((n) => n === 'Żubr') && names.some((n) => n.startsWith('Żubrówka'));
            case 'zubrowka':
                return names.some((n) => n.startsWith('Żubrówka'));
            case 'gronie tyskie':
                return names[0] === 'Tyskie Gronie';
            case 'tys':
                return names.length >= 2 && names.includes('Tyskie Gronie') && names.includes('Tyskie 0.0');
            case 'wodka wyborowa':
                return names.some((n) => n.startsWith('Wyborowa'));
            case 'zywiec':
                return names.some((n) => n.includes('Żywiec'));
            case 'cabernet':
                return names.some((n) => n.toLowerCase().includes('cabernet'));
            case 'mocne':
                return names.length >= 2 && names.some((n) => n.toLowerCase().includes('mocne') || n.toLowerCase().includes('mocna'));
            case 'tyskie gron':
                return names[0] === 'Tyskie Gronie';
            case 'ipa':
                return names.length >= 2;
            case 'porter':
                return names.length >= 1;
            case 'radler':
                return names.length >= 2;
            default:
                return true;
        }
    })();

    if (ok) {
        console.log('  ✓ PASS');
        passed++;
    } else {
        console.log('  ✗ FAIL');
        failed++;
    }
    console.log('');
}

console.log(`\n${passed}/${passed + failed} tests passed`);
process.exit(failed > 0 ? 1 : 0);
