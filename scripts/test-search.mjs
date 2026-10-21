import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { search } from '../src/js/services/search.js';
import { normalizeLoadedItem, normalizeSearchText } from '../src/js/services/data-loader.js';

export const searchCorpus = JSON.parse(
    readFileSync(new URL('../tests/fixtures/search-corpus.json', import.meta.url), 'utf8'),
);

export function loadSearchProducts() {
    const sources = { beer: 'piwa.json', vodka: 'wodki.json', wine: 'wina.json' };
    return Object.entries(sources).flatMap(([source, filename]) => {
        const raw = JSON.parse(
            readFileSync(new URL(`../data/${filename}`, import.meta.url), 'utf8'),
        );
        return raw.map((item, index) => normalizeLoadedItem(item, source, index));
    });
}

export function evaluateQuery(test, products) {
    const results = search(test.query, products);
    const names = results.map((item) => item.name);
    const failures = [];
    const check = (condition, message) => {
        if (!condition) {
            failures.push(message);
        }
    };

    if (test.includes) {
        check(
            test.includes.every((name) => names.includes(name)),
            `missing ${test.includes.join(', ')}`,
        );
    }
    if (test.includesPrefix) {
        check(
            names.some((name) => name.startsWith(test.includesPrefix)),
            `missing prefix ${test.includesPrefix}`,
        );
    }
    if (test.includesSubstring) {
        check(
            names.some((name) => name.includes(test.includesSubstring)),
            `missing substring ${test.includesSubstring}`,
        );
    }
    if (test.first) {
        check(names[0] === test.first, `expected first: ${test.first}`);
    }
    if (test.firstPrefix) {
        check(
            normalizeSearchText(names[0] || '').startsWith(test.firstPrefix),
            `expected first prefix: ${test.firstPrefix}`,
        );
    }
    if (test.minResults) {
        check(results.length >= test.minResults, `expected at least ${test.minResults} results`);
    }
    if (test.category) {
        check(
            results.some((item) => item.category === test.category),
            `missing category ${test.category}`,
        );
    }
    if (test.categories) {
        check(
            test.categories.every((category) => results.some((item) => item.category === category)),
            'missing category coverage',
        );
    }
    if (test.typeSubstring) {
        check(
            results.some((item) =>
                normalizeSearchText(item.type || '').includes(test.typeSubstring),
            ),
            `missing type ${test.typeSubstring}`,
        );
    }
    if (test.empty) {
        check(results.length === 0, 'expected no results');
    }

    return { query: test.query, passed: failures.length === 0, failures, names };
}

export function evaluateCorpus(products) {
    return searchCorpus.queries.map((test) => evaluateQuery(test, products));
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
    const products = loadSearchProducts();
    const results = evaluateCorpus(products);
    console.log(`Runtime search: ${products.length} products`);
    for (const result of results) {
        console.log(
            `${result.passed ? 'PASS' : 'FAIL'} ${JSON.stringify(result.query)} (${result.names.length}): ${result.names.slice(0, 3).join(', ')}`,
        );
        for (const failure of result.failures) {
            console.error(`  ${failure}`);
        }
    }
    const passed = results.filter((result) => result.passed).length;
    console.log(`${passed}/${results.length} queries passed`);
    process.exitCode = passed === results.length ? 0 : 1;
}
