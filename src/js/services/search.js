import { getProducts } from '../data/product-repo.js';
import { normalizeSearchText } from './data-loader.js';

const SCORE_PREFIX = 3;
const SCORE_CONTAINS = 1;
const MAX_RESULTS = 50;

const scoreResult = (item, normQuery) => {
    const normName = normalizeSearchText(item.name || '');
    if (!normName.includes(normQuery)) {return 0;}
    return normName.startsWith(normQuery) ? SCORE_PREFIX : SCORE_CONTAINS;
};

export function search(query) {
    if (!query || !query.trim()) {return [];}

    const normQuery = normalizeSearchText(query);
    if (!normQuery) {return [];}

    const products = getProducts();
    const scored = [];

    for (const item of products) {
        const score = scoreResult(item, normQuery);
        if (score > 0) {scored.push({ item, score });}
    }

    scored.sort((a, b) => {
        if (b.score !== a.score) {return b.score - a.score;}
        return (a.item.name || '').localeCompare(b.item.name || '', 'pl');
    });

    return scored.slice(0, MAX_RESULTS).map((s) => s.item);
}
