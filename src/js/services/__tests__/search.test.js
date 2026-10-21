import { describe, it, expect, beforeEach } from 'vitest';
import { search } from '../search.js';
import { setProducts } from '../../data/product-repo.js';
import { normalizeSearchText } from '../data-loader.js';

describe('percentage queries', () => {
    const products = [
        {
            id: 'a',
            name: 'Bezalkoholowe',
            normalized_name: 'bezalkoholowe',
            searchText: 'bezalkoholowe piwo',
            alcohol: '0%',
        },
        {
            id: 'b',
            name: 'Karmi',
            normalized_name: 'karmi',
            searchText: 'karmi piwo',
            alcohol: '0.5%',
        },
        {
            id: 'c',
            name: 'Lager',
            normalized_name: 'lager',
            searchText: 'lager piwo',
            alcohol: '5.5%',
        },
        {
            id: 'd',
            name: 'Nieznane',
            normalized_name: 'nieznane',
            searchText: 'nieznane piwo',
            alcohol: '',
        },
    ];
    it('matches numeric ABV exactly, never fuzzily or from an incorrect type label', () => {
        expect(search('0.0%', products).map((p) => p.id)).toEqual(['a']);
        expect(search('0,5%', products).map((p) => p.id)).toEqual(['b']);
        expect(search('piwo 5,5%', products).map((p) => p.id)).toEqual(['c']);
        expect(search('101%', products)).toEqual([]);
    });
});

describe('fuzzy fallback relevance', () => {
    it('does not append unrelated fuzzy names when direct matches exist, but still finds transposed typos', () => {
        const items = [
            product('one', 'Harnaś'),
            product('two', 'Hardys'),
            product('three', 'Żywiec'),
        ];
        expect(search('harnas', items).map((item) => item.id)).toEqual(['one']);
        expect(search('zyweic', items).map((item) => item.id)).toEqual(['three']);
        expect(search('hardys', items).map((item) => item.id)).toEqual(['two']);
    });
});

function product(id, name, metadata = '') {
    return {
        id,
        name,
        normalized_name: normalizeSearchText(name),
        searchText: normalizeSearchText(`${name} ${metadata}`),
    };
}

function seed() {
    setProducts([
        {
            name: 'Żywiec Lager',
            normalized_name: 'zywiec lager',
            searchText: 'zywiec lager piwo polska',
            category: 'Piwo',
            country: 'polska',
        },
        {
            name: 'Tyskie Gronie',
            normalized_name: 'tyskie gronie',
            searchText: 'tyskie gronie piwo polska',
            category: 'Piwo',
            country: 'polska',
        },
        {
            name: 'Żubrówka Bison Grass',
            normalized_name: 'zubrowka bison grass',
            searchText: 'zubrowka bison grass wodka polska',
            category: 'Wódka',
            country: 'polska',
        },
        {
            name: 'Śliwowica Pasja',
            normalized_name: 'sliwowica pasja',
            searchText: 'sliwowica pasja wodka polska',
            category: 'Wódka',
            country: 'polska',
        },
        {
            name: 'Santa Rita Merlot',
            normalized_name: 'santa rita merlot',
            searchText: 'santa rita merlot wino chile',
            category: 'Wino',
            country: 'chile',
        },
    ]);
}

describe('search', () => {
    beforeEach(() => {
        seed();
    });

    it('zwraca pustą tablicę dla pustego zapytania', () => {
        expect(search('')).toEqual([]);
        expect(search('   ')).toEqual([]);
        expect(search(null)).toEqual([]);
        expect(search(undefined)).toEqual([]);
    });

    it('dopasowuje po prefiksie nazwy', () => {
        const results = search('zubr');
        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('Żubrówka Bison Grass');
    });

    it('dopasowuje przez zawieranie w środku słowa', () => {
        const results = search('lager');
        expect(results.some((r) => r.name === 'Żywiec Lager')).toBe(true);
    });

    it('dopasowuje po kategorii', () => {
        const results = search('wino');
        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('Santa Rita Merlot');
    });

    it('dopasowuje po kraju z diakrytykami znormalizowanymi', () => {
        const results = search('chile');
        expect(results[0].name).toBe('Santa Rita Merlot');
    });

    it('ł jest normalizowane do l', () => {
        // "Śliwowica" → "sliwowica"
        const results = search('sliw');
        expect(results.some((r) => r.name === 'Śliwowica Pasja')).toBe(true);
    });

    it('zapytanie wielosłowne wymaga dopasowania wszystkich słów (bonus all-words)', () => {
        const results = search('zywiec lager');
        expect(results.some((r) => r.name === 'Żywiec Lager')).toBe(true);
    });

    it('wszystkie słowa muszą pasować — produkt bez pełnego dopasowania odpada', () => {
        // "zywiec wino" — Żywiec pasuje do piwa, ale wino do innego; nie ma jednego produktu z oboma
        const results = search('zywiec wino');
        expect(results.some((r) => r.name === 'Żywiec Lager')).toBe(false);
    });

    it('toleruje literówkę (fuzzy) dla dłuższych słów', () => {
        const results = search('santa rita merlpt');
        expect(results.some((r) => r.name === 'Santa Rita Merlot')).toBe(true);
    });

    it('sortuje wyniki wg wyniku — dokładny prefiks jest wyżej niż fuzzy', () => {
        const results = search('polska');
        // Wszystkie 4 polskie produkty pasują po searchText "polska"
        expect(results.length).toBeGreaterThanOrEqual(4);
        expect(results.map((r) => r.name)).toContain('Żywiec Lager');
    });

    it('limituje wyniki do MAX_RESULTS (50)', () => {
        const many = Array.from({ length: 60 }, (_, i) => ({
            name: `Trunek Testowy ${i}`,
            normalized_name: `trunek testowy ${i}`,
            searchText: `trunek testowy ${i} piwo`,
            category: 'Piwo',
        }));
        setProducts(many);
        const results = search('trunek');
        expect(results).toHaveLength(50);
    });

    it('nie rzuca błędu, gdy lista produktów jest pusta', () => {
        setProducts([]);
        expect(() => search('cokolwiek')).not.toThrow();
        expect(search('cokolwiek')).toEqual([]);
    });

    it('ranks the exact product name above name prefixes and metadata', () => {
        const products = [
            product('metadata', 'Aardvark', 'tyskie'),
            product('prefix', 'Tyskie Special'),
            product('exact', 'Tyskie'),
        ];

        expect(search('tyskie', products).map((item) => item.id)).toEqual([
            'exact',
            'prefix',
            'metadata',
        ]);
    });

    it('rewards the full name and contiguous phrase without rejecting reordered tokens', () => {
        const products = [
            product('reordered', 'Gronie Tyskie'),
            product('contains', 'A Tyskie Gronie'),
            product('prefix', 'Tyskie Gronie 0.5L'),
            product('exact', 'Tyskie Gronie'),
        ];

        expect(search('TYSKIE   GRONIE', products).map((item) => item.id)).toEqual([
            'exact',
            'prefix',
            'contains',
            'reordered',
        ]);
        expect(search('gronie tyskie', products)).toContain(products[3]);
    });

    it('ranks name substrings above metadata-only matches', () => {
        const products = [product('metadata', 'Aardvark', 'tyskie'), product('name', 'Bratyskie')];
        expect(search('tyskie', products).map((item) => item.id)).toEqual(['name', 'metadata']);
    });

    it('uses the best matching word rather than the first containing word', () => {
        const products = [
            product('later-prefix', 'Axlager Lagerka'),
            product('prefix', 'B Lagerka'),
        ];
        expect(search('lager', products).map((item) => item.id)).toEqual([
            'later-prefix',
            'prefix',
        ]);
    });

    it('keeps fuzzy token AND matching across names and metadata', () => {
        expect(search('tyskir piwo').map((item) => item.name)).toEqual(['Tyskie Gronie']);
        expect(search('tyskir chile')).toEqual([]);
        expect(search('lager zywiec').map((item) => item.name)).toEqual(['Żywiec Lager']);
    });

    it('allows two edits for long words but no fuzzy matches for three-letter tokens', () => {
        expect(search('zubrowak').map((item) => item.name)).toEqual(['Żubrówka Bison Grass']);
        expect(search('gan', [product('gin', 'Gin')])).toEqual([]);
        expect(search('abef', [product('short', 'Abcd')])).toEqual([]);
    });

    it.each([
        ['ŻYWIEC', 'Żywiec Lager'],
        ['zywiec', 'Żywiec Lager'],
        ['ŚLIW', 'Śliwowica Pasja'],
        ['sliw', 'Śliwowica Pasja'],
    ])('normalizes Polish query %s', (query, name) => {
        expect(search(query).map((item) => item.name)).toContain(name);
    });

    it.each(['wódka', 'WODKA'])('keeps category query %s searchable', (query) => {
        expect(
            search(query)
                .map((item) => item.name)
                .sort(),
        ).toEqual(['Śliwowica Pasja', 'Żubrówka Bison Grass'].sort());
    });

    it('breaks equal-score, equal-name ties by stable ID independently of input order', () => {
        const products = [product('z', 'Same'), product('a', 'Same')];
        expect(search('same', products).map((item) => item.id)).toEqual(['a', 'z']);
        expect(search('same', [...products].reverse()).map((item) => item.id)).toEqual(['a', 'z']);
    });

    it('sorts equally relevant names using Polish collation', () => {
        const products = [product('z', 'Żubr'), product('l', 'Łomża'), product('s', 'Śliwowica')];
        products.forEach((item) => {
            item.searchText += ' polska';
        });
        expect(search('polska', products).map((item) => item.name)).toEqual([
            'Łomża',
            'Śliwowica',
            'Żubr',
        ]);
    });

    it('can search an explicit product list without changing the repository or input order', () => {
        const products = [product('z', 'Żubr'), product('a', 'Amber')];
        expect(search('amber', products)).toEqual([products[1]]);
        expect(products.map((item) => item.id)).toEqual(['z', 'a']);
        expect(search('amber')).toEqual([]);
        expect(search('lager', [])).toEqual([]);
    });

    it('uses the product name when normalized search fields are absent', () => {
        const item = { id: 'fallback', name: 'Łomża' };
        expect(search('lomza', [item])).toEqual([item]);
    });

    it('refreshes cached tokens after an indexed product changes', () => {
        const item = product('changed', 'Tyskie', 'piwo');
        expect(search('tyskie', [item])).toEqual([item]);
        Object.assign(item, product('changed', 'Santa Rita', 'wino chile'));
        expect(search('tyskie', [item])).toEqual([]);
        expect(search('chile', [item])).toEqual([item]);
    });

    it('refreshes fallback tokens when the unindexed name changes', () => {
        const item = { id: 'changed', name: 'Tyskie' };
        expect(search('tyskie', [item])).toEqual([item]);
        item.name = 'Łomża';
        expect(search('tyskie', [item])).toEqual([]);
        expect(search('lomza', [item])).toEqual([item]);
    });

    it('does not wrap edit distance for long unrelated words', () => {
        const products = [product('long', 'a'.repeat(257))];
        expect(search('b'.repeat(257), products)).toEqual([]);
    });

    it.each([
        ['wyborwa', 'Wyborowa', true],
        ['wyborowaa', 'Wyborowa', true],
        ['abxdefxh', 'Abcdefgh', true],
        ['abxdexxh', 'Abcdefgh', false],
        ['abefgh', 'Abcdefgh', true],
        ['abdef', 'Abcdef', true],
        [`b${'a'.repeat(62)}b`, 'a'.repeat(64), true],
        ['a'.repeat(64), `${'a'.repeat(32)}bb${'a'.repeat(32)}`, true],
    ])('keeps bounded edit matching correct for %s', (query, name, expected) => {
        expect(search(query, [product('distance', name)]).length > 0).toBe(expected);
    });

    it('accepts queries exactly at the length, word, and token limits', () => {
        const word = 'a'.repeat(64);
        expect(search(word, [product('word', word)])).toHaveLength(1);
        const words = Array.from({ length: 12 }, (_, i) => `word${i}`).join(' ');
        expect(search(words, [product('words', words)])).toHaveLength(1);
        const query = ['a'.repeat(60), 'b'.repeat(60), 'c'.repeat(38)].join(' ');
        expect(query).toHaveLength(160);
        expect(search(query, [product('query', query)])).toHaveLength(1);
    });

    it('rejects oversized queries and tokens instead of silently dropping AND constraints', () => {
        const longToken = 'a'.repeat(65);
        expect(search(longToken, [product('long-token', longToken)])).toEqual([]);

        const manyWords = Array.from({ length: 13 }, (_, i) => `word${i}`).join(' ');
        expect(search(manyWords, [product('many-words', manyWords)])).toEqual([]);

        const longQuery = ['a'.repeat(60), 'b'.repeat(60), 'c'.repeat(60)].join(' ');
        expect(search(longQuery, [product('long-query', longQuery)])).toEqual([]);
        expect(search(`tyskie ${' '.repeat(100000)}`)).toEqual([]);
        expect(search('ß'.repeat(81), [product('expanded', 'ss'.repeat(81))])).toEqual([]);
    });

    it.each([false, 42, {}, []])('ignores non-string query %j', (query) => {
        expect(search(query)).toEqual([]);
    });
});
