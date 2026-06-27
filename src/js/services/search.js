import { getProducts } from '../data/product-repo.js';
import { normalizeSearchText } from './data-loader.js';

const MAX_RESULTS = 50;

const SCORE_EXACT_PREFIX = 10;
const SCORE_EXACT_CONTAINS = 5;
const SCORE_FUZZY = 3;
const SCORE_ALL_WORDS_BONUS = 15;

function levenshtein(a, b) {
    const m = a.length;
    const n = b.length;
    if (m === 0) {return n;}
    if (n === 0) {return m;}

    let prev = new Uint8Array(n + 1);
    let curr = new Uint8Array(n + 1);

    for (let j = 0; j <= n; j++) {prev[j] = j;}

    for (let i = 1; i <= m; i++) {
        curr[0] = i;
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            curr[j] = Math.min(
                prev[j] + 1,
                curr[j - 1] + 1,
                prev[j - 1] + cost,
            );
        }
        [prev, curr] = [curr, prev];
    }

    return prev[n];
}

function fuzzyDistance(wordLen) {
    if (wordLen <= 3) {return 0;}
    if (wordLen <= 5) {return 1;}
    return 2;
}

function scoreWord(queryWord, nameWords, searchTextWords) {
    // Check against name words (higher score)
    for (const nw of nameWords) {
        if (nw.startsWith(queryWord)) {return SCORE_EXACT_PREFIX;}
        if (nw.includes(queryWord)) {return SCORE_EXACT_CONTAINS;}
    }

    // Check against searchText words (includes category, country, etc.)
    for (const sw of searchTextWords) {
        if (sw.startsWith(queryWord)) {return SCORE_EXACT_PREFIX;}
        if (sw.includes(queryWord)) {return SCORE_EXACT_CONTAINS;}
    }

    // Fuzzy match against name words
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

/** @param {string} query @returns {Array} */
export function search(query) {
    if (!query || !query.trim()) {return [];}

    const normQuery = normalizeSearchText(query);
    if (!normQuery) {return [];}

    const queryWords = normQuery.split(/\s+/).filter(Boolean);
    if (queryWords.length === 0) {return [];}

    const products = getProducts();
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
            if (wordScore === 0) {
                totalScore = 0;
                break;
            }
            totalScore += wordScore;
            matchedCount++;
        }

        if (totalScore === 0) {continue;}

        if (matchedCount === queryWords.length) {
            totalScore += SCORE_ALL_WORDS_BONUS;
        }

        scored.push({ item, score: totalScore });
    }

    scored.sort((a, b) => {
        if (b.score !== a.score) {return b.score - a.score;}
        return (a.item.name || '').localeCompare(b.item.name || '', 'pl');
    });

    return scored.slice(0, MAX_RESULTS).map((s) => s.item);
}
