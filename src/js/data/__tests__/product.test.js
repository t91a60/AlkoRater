import { describe, expect, it } from 'vitest';
import { alcoholPercent, localImage, normalizeLoadedItem, productKey } from '../product.js';

describe('product identity', () => {
    it('distinguishes duplicate Harnaś names by source and catalogue ID, not display text', () => {
        const beer = normalizeLoadedItem({ id: 3, name: 'Harnaś' }, 'beer');
        const vodka = normalizeLoadedItem({ id: 3, name: 'Harnaś' }, 'vodka');
        const otherBeer = normalizeLoadedItem({ id: 4, name: 'Harnaś' }, 'beer');

        expect(productKey(beer)).toBe('beer:3');
        expect(productKey(vodka)).toBe('vodka:3');
        expect(productKey(otherBeer)).toBe('beer:4');
        expect(productKey({ ...beer, name: 'Nowa nazwa', brand: 'Inna marka' })).toBe('beer:3');
        expect(productKey({ id: '3', category: 'Piwo', name: 'Stara migawka' })).toBe('beer:3');
    });

    it('uses category, brand and name for legacy snapshots without guessing a catalogue ID', () => {
        const snapshot = { category: 'Piwo', brand: 'Żywiec', name: 'Harnaś' };

        expect(productKey(snapshot)).toBe('legacy:piwo|zywiec|harnas');
        expect(productKey({ ...snapshot, brand: 'Inny browar' })).toBe(
            'legacy:piwo|inny browar|harnas',
        );
        expect(productKey(snapshot)).not.toBe(productKey({ ...snapshot, id: 3 }));
    });
});

describe('catalogue normalization', () => {
    it('requires a supported source, a name and a stable ID instead of assigning an array index', () => {
        for (const [item, source] of [
            [{ name: 'Harnaś' }, 'beer'],
            [{ id: '', name: 'Harnaś' }, 'beer'],
            [{ id: {}, name: 'Harnaś' }, 'beer'],
            [{ id: NaN, name: 'Harnaś' }, 'beer'],
            [{ id: 3, name: '  ' }, 'beer'],
            [{ id: 3, name: 'Harnaś' }, 'unknown'],
        ]) {
            expect(() => normalizeLoadedItem(item, source)).toThrow();
        }

        const product = normalizeLoadedItem(
            { id: 'unchanged-id', name: '  Żubrówka  ', abv: '37,5 %' },
            'vodka',
        );
        expect(product).toMatchObject({
            id: 'unchanged-id',
            source: 'vodka',
            name: 'Żubrówka',
            normalized_name: 'zubrowka',
            category: 'Wódka',
            alcohol: '37.5%',
            brand: '',
            country: '',
            image_url: '',
        });
        expect(product.searchText).toContain('wodka');
    });

    it('accepts bounded alcohol values without turning missing or malformed values into zero', () => {
        expect(alcoholPercent('0,0%')).toBe(0);
        expect(alcoholPercent(' 5,5 % ')).toBe(5.5);
        expect(alcoholPercent(100)).toBe(100);
        for (const value of ['', ' ', null, undefined, -1, 100.1, Infinity, '5% extra', 'abc']) {
            expect(alcoholPercent(value)).toBeNull();
        }
    });

    it('allows only local application images, never remote URLs, scripts or path traversal', () => {
        expect(localImage('images/beer.webp')).toBe('./images/beer.webp');
        expect(localImage('./data/photos/bottle.png')).toBe('./data/photos/bottle.png');
        for (const value of [
            'https://example.com/beer.png',
            '//example.com/beer.png',
            'https://dummyimage.com/600x600',
            'javascript:alert(1)',
            'data:image/svg+xml,<svg onload="alert(1)">',
            './images/../secret.png',
            './images/%2e%2e/secret.png',
            './images/beer.png?script=1',
            null,
        ]) {
            expect(localImage(value)).toBe('');
        }
    });
});
