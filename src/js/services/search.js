import { getProducts } from '../data/product-repo.js';
import { normalizeSearchText, alcoholPercent } from '../data/product.js';

const MAX_RESULTS = 50;
const MAX_QUERY_LENGTH = 160;
const MAX_QUERY_WORDS = 12;
const MAX_WORD_LENGTH = 64;

const SCORE_NAME_PREFIX = 10;
const SCORE_NAME_CONTAINS = 8;
const SCORE_METADATA_PREFIX = 5;
const SCORE_METADATA_CONTAINS = 4;
const SCORE_NAME_FUZZY = 3;
const SCORE_METADATA_FUZZY = 1;

const nameCollator = new Intl.Collator('pl');
const searchIndexes = new WeakMap();

function withinEditDistance(a, b, maxDistance) {
    const m = a.length;
    const n = b.length;
    if (Math.abs(m - n) > maxDistance) {
        return false;
    }
    if (m === 0 || n === 0) {
        return Math.max(m, n) <= maxDistance;
    }

    const limit = maxDistance + 1;
    let prev = new Uint16Array(n + 1);
    let curr = new Uint16Array(n + 1);
    for (let j = 0; j <= n; j++) {
        prev[j] = Math.min(j, limit);
    }

    for (let i = 1; i <= m; i++) {
        curr.fill(limit);
        curr[0] = Math.min(i, limit);
        let rowMin = limit;

        // Cells outside this band cannot lead to an accepted match.
        const from = Math.max(1, i - maxDistance);
        const to = Math.min(n, i + maxDistance);
        for (let j = from; j <= to; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
            rowMin = Math.min(rowMin, curr[j]);
        }
        if (rowMin > maxDistance) {
            return false;
        }
        [prev, curr] = [curr, prev];
    }

    return prev[n] <= maxDistance;
}

function fuzzyDistance(wordLen) {
    if (wordLen <= 3) {
        return 0;
    }
    if (wordLen <= 5) {
        return 1;
    }
    return 2;
}

function getSearchIndex(item) {
    const cached = searchIndexes.get(item);
    if (
        cached &&
        cached.name === item.name &&
        cached.normalizedName === item.normalized_name &&
        cached.searchText === item.searchText
    ) {
        return cached;
    }

    const normName = item.normalized_name || normalizeSearchText(item.name || '');
    const nameWords = normName.split(/\s+/).filter(Boolean);
    const nameWordSet = new Set(nameWords);
    const metadataWords = [
        ...new Set(
            (item.searchText || normName)
                .split(/\s+/)
                .filter((word) => word && !nameWordSet.has(word)),
        ),
    ];
    const index = {
        name: item.name,
        normalizedName: item.normalized_name,
        searchText: item.searchText,
        normName: nameWords.join(' '),
        nameWords,
        metadataWords,
    };
    searchIndexes.set(item, index);
    return index;
}

function scoreDirect(queryWord, words, prefixScore, containsScore) {
    let score = 0;
    for (const word of words) {
        if (word.startsWith(queryWord)) {
            return prefixScore;
        }
        if (word.includes(queryWord)) {
            score = containsScore;
        }
    }
    return score;
}

function scoreWord(queryWord, nameWords, metadataWords) {
    const nameScore = scoreDirect(queryWord, nameWords, SCORE_NAME_PREFIX, SCORE_NAME_CONTAINS);
    if (nameScore) {
        return nameScore;
    }

    const metadataScore = scoreDirect(
        queryWord,
        metadataWords,
        SCORE_METADATA_PREFIX,
        SCORE_METADATA_CONTAINS,
    );
    if (metadataScore) {
        return metadataScore;
    }

    const maxDistance = fuzzyDistance(queryWord.length);
    if (maxDistance > 0) {
        for (const word of nameWords) {
            if (withinEditDistance(word, queryWord, maxDistance)) {
                return SCORE_NAME_FUZZY;
            }
        }
        for (const word of metadataWords) {
            if (withinEditDistance(word, queryWord, maxDistance)) {
                return SCORE_METADATA_FUZZY;
            }
        }
    }
    return 0;
}

function nameMatchRank(normName, normQuery) {
    if (normName === normQuery) {
        return 3;
    }
    if (normName.startsWith(normQuery)) {
        return 2;
    }
    if (normName.includes(normQuery)) {
        return 1;
    }
    return 0;
}

/** @param {string} query @param {Array} products @returns {Array} */
export function search(query, products = getProducts()) {
    // Reject rather than truncate: every supplied token remains an AND constraint.
    if (typeof query !== 'string' || query.length > MAX_QUERY_LENGTH) {
        return [];
    }
    const normalized = normalizeSearchText(query).replace(/(\d),(\d)/g, '$1.$2');
    if (!normalized || normalized.length > MAX_QUERY_LENGTH) {
        return [];
    }

    const queryWords = normalized.split(/\s+/);
    if (
        queryWords.length > MAX_QUERY_WORDS ||
        queryWords.some((word) => word.length > MAX_WORD_LENGTH)
    ) {
        return [];
    }
    const normQuery = queryWords.join(' ');
    const scored = [];

    for (const item of products) {
        const { normName, nameWords, metadataWords } = getSearchIndex(item);
        let totalScore = 0;
        let fuzzy = false;
        for (const word of queryWords) {
            const percent = /^\d+(?:\.\d+)?%$/.test(word);
            const value = percent ? alcoholPercent(word) : null;
            const wordScore = percent
                ? value !== null && value === alcoholPercent(item.alcohol)
                    ? SCORE_METADATA_PREFIX
                    : 0
                : scoreWord(word, nameWords, metadataWords);
            if (wordScore === 0) {
                totalScore = 0;
                break;
            }
            totalScore += wordScore;
            fuzzy ||= wordScore === SCORE_NAME_FUZZY || wordScore === SCORE_METADATA_FUZZY;
        }
        if (totalScore === 0) {
            continue;
        }
        scored.push({
            item,
            score: totalScore,
            nameRank: nameMatchRank(normName, normQuery),
            fuzzy,
        });
    }

    const ranked = scored.some((result) => !result.fuzzy)
        ? scored.filter((result) => !result.fuzzy)
        : scored;
    ranked.sort((a, b) => {
        if (b.nameRank !== a.nameRank) {
            return b.nameRank - a.nameRank;
        }
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        const nameOrder = nameCollator.compare(a.item.name || '', b.item.name || '');
        if (nameOrder) {
            return nameOrder;
        }
        const aId = String(a.item.id ?? '');
        const bId = String(b.item.id ?? '');
        return aId < bId ? -1 : aId > bId ? 1 : 0;
    });

    return ranked.slice(0, MAX_RESULTS).map(({ item }) => item);
}
