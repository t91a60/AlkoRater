import { describe, it, expect, beforeEach } from 'vitest';
import { search } from '../search.js';
import { setProducts } from '../../data/product-repo.js';

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
        const results = search('santa rita merlot');
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
});
