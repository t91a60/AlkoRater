import { describe, it, expect } from 'vitest';
import { plPlural } from '../dashboard.js';

describe('plPlural', () => {
    const forms = ['trunek', 'trunki', 'trunków'];

    it('używa liczby pojedynczej dla 1', () => {
        expect(plPlural(1, forms)).toBe('trunek');
    });

    it('używa formy "few" dla 2-4', () => {
        expect(plPlural(2, forms)).toBe('trunki');
        expect(plPlural(3, forms)).toBe('trunki');
        expect(plPlural(4, forms)).toBe('trunki');
    });

    it('używa formy "many" dla 0, 5+ i nastolatek (11-14)', () => {
        expect(plPlural(0, forms)).toBe('trunków');
        expect(plPlural(5, forms)).toBe('trunków');
        expect(plPlural(11, forms)).toBe('trunków');
        expect(plPlural(12, forms)).toBe('trunków');
        expect(plPlural(13, forms)).toBe('trunków');
        expect(plPlural(14, forms)).toBe('trunków');
    });

    it('wraca do formy "few" dla liczb typu 22, 23, 24 (ale nie 12-14)', () => {
        expect(plPlural(22, forms)).toBe('trunki');
        expect(plPlural(23, forms)).toBe('trunki');
        expect(plPlural(24, forms)).toBe('trunki');
        expect(plPlural(21, forms)).toBe('trunków');
        expect(plPlural(25, forms)).toBe('trunków');
    });
});
