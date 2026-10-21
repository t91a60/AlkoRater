import { readFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { search } from '../src/js/services/search.js';
import { normalizeLoadedItem, normalizeSearchText } from '../src/js/services/data-loader.js';
import { CONSTANTS } from '../src/js/app/constants.js';
import { evaluateCorpus, loadSearchProducts, searchCorpus } from './test-search.mjs';

// Run with --benchmark; --benchmark-products accepts a saved normalized catalog
// to isolate search changes from concurrent data-normalizer changes.
export function benchmarkSearch(products) {
    const queries = searchCorpus.benchmarkQueries;
    const warmupRounds = 25;
    const measuredRounds = 200;
    const batches = [];
    let checksum = 0;
    const firstStart = performance.now();
    for (const query of queries) {
        checksum += search(query, products).length;
    }
    const firstPassMs = performance.now() - firstStart;

    for (let round = 0; round < warmupRounds; round++) {
        for (const query of queries) {
            checksum += search(query, products).length;
        }
    }
    for (let batch = 0; batch < 5; batch++) {
        const samples = [];
        const start = performance.now();
        for (let round = 0; round < measuredRounds; round++) {
            for (const query of queries) {
                const queryStart = performance.now();
                checksum += search(query, products).length;
                samples.push(performance.now() - queryStart);
            }
        }
        const elapsedMs = performance.now() - start;
        samples.sort((a, b) => a - b);
        batches.push({
            elapsedMs,
            meanMs: elapsedMs / samples.length,
            p50Ms: samples[Math.floor(samples.length * 0.5)],
            p95Ms: samples[Math.floor(samples.length * 0.95)],
        });
    }
    return {
        node: process.version,
        cpu: cpus()[0]?.model,
        platform: process.platform,
        products: products.length,
        queries,
        warmupRounds,
        measuredRounds,
        batches,
        firstPassMs,
        checksum,
    };
}

function evaluateRuntime(products) {
    const results = evaluateCorpus(products).map((result) => ({
        passed: result.passed,
        description: `query ${JSON.stringify(result.query)}`,
        detail: result.failures.join('; '),
    }));
    const check = (description, passed, detail = '') => {
        results.push({ description, passed, detail });
    };

    const polishCases = [
        ['Żubrówka', 'zubrowka'],
        ['Łomża', 'lomza'],
        ['Wódka', 'wodka'],
        ['Śliwkowa', 'sliwkowa'],
        ['Żywiec', 'zywiec'],
        ['Straße', 'strasse'],
    ];
    check(
        'Polish and German normalization',
        polishCases.every(([raw, expected]) => normalizeSearchText(raw) === expected),
    );
    check(
        'empty and null queries',
        ['', '   ', null, undefined].every((query) => search(query, products).length === 0),
    );
    check(
        'all alcohol fields are strings',
        products.every((item) => typeof item.alcohol === 'string'),
    );
    check(
        'all three catalog files loaded',
        products.length >= 100 &&
            ['Piwo', 'Wódka', 'Wino'].every((category) =>
                products.some((item) => item.category === category),
            ),
        `${products.length} products`,
    );
    check(
        'category is indexed for every product',
        products.every((item) => item.searchText.includes(normalizeSearchText(item.category))),
    );

    for (const [source, category] of Object.entries(CONSTANTS.CATEGORIES)) {
        // Source, not a guessed type, determines the catalog category.
        const item = normalizeLoadedItem(
            { id: `eval-${source}`, name: 'Category Fixture', type: '' },
            source,
        );
        check(
            `${source} source stays in ${category}`,
            item.category === category && search(category, [item]).length === 1,
        );
        const categoryResults = search(category, products);
        check(
            `${category} query remains category-relevant`,
            categoryResults.length > 0 &&
                categoryResults.every((result) => result.category === category),
        );
    }

    const metadata = normalizeLoadedItem(
        {
            id: 'eval-metadata',
            name: 'Sample',
            brand: 'Żółty Producent',
            type: 'Lager',
            country: 'Polska',
        },
        'beer',
    );
    check(
        'explicit brand metadata is searchable',
        search('zolty producent', [metadata])[0] === metadata,
    );
    check(
        'type and country combine with AND',
        search('lager polska', [metadata])[0] === metadata &&
            search('lager chile', [metadata]).length === 0,
    );

    const ranked = [
        normalizeLoadedItem({ id: 'metadata', name: 'Aardvark', brand: 'Tyskie' }, 'beer'),
        normalizeLoadedItem({ id: 'prefix', name: 'Tyskie Special' }, 'beer'),
        normalizeLoadedItem({ id: 'exact', name: 'Tyskie' }, 'beer'),
    ];
    check(
        'exact name beats prefix and metadata',
        search('tyskie', ranked)
            .map((item) => item.id)
            .join(',') === 'exact,prefix,metadata',
    );
    check(
        'all results are capped at 50',
        searchCorpus.benchmarkQueries.every((query) => search(query, products).length <= 50),
    );
    const ids = (items) => items.map((item) => `${item.source}:${item.id}`).join(',');
    const reversed = [...products].reverse();
    check(
        'rankings do not depend on catalog order',
        searchCorpus.benchmarkQueries.every(
            (query) => ids(search(query, products)) === ids(search(query, reversed)),
        ),
    );
    return results;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
    const products = loadSearchProducts();
    const results = evaluateRuntime(products);
    for (const result of results) {
        console.log(
            `${result.passed ? 'PASS' : 'FAIL'} ${result.description}${result.detail ? `: ${result.detail}` : ''}`,
        );
    }
    const passed = results.filter((result) => result.passed).length;
    console.log(
        `Runtime search eval: ${passed}/${results.length} passed (${products.length} products)`,
    );
    process.exitCode = passed === results.length ? 0 : 1;

    if (process.argv.includes('--benchmark')) {
        const productsFlag = process.argv.indexOf('--benchmark-products');
        if (productsFlag >= 0 && !process.argv[productsFlag + 1]) {
            throw new Error('--benchmark-products requires a normalized JSON catalog path');
        }
        const benchmarkProducts =
            productsFlag < 0
                ? products
                : JSON.parse(readFileSync(resolve(process.argv[productsFlag + 1]), 'utf8'));
        console.log(`BENCHMARK\n${JSON.stringify(benchmarkSearch(benchmarkProducts), null, 2)}`);
    }
}
