import { describe, it, expect } from 'vitest';
import { productThumbHTML, THUMB_FALLBACK_SVG } from '../badges.js';

function parse(html) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    return wrapper.firstElementChild;
}

describe('productThumbHTML', () => {
    it('renderuje fallback SVG od razu, gdy nie ma image_url (bez zepsutego <img>)', () => {
        const thumb = parse(productThumbHTML('', 'Piwo', 50));

        expect(thumb.classList.contains('thumb-broken')).toBe(true);
        expect(thumb.querySelector('img')).toBeNull();
        expect(thumb.querySelector('svg')).not.toBeNull();
    });

    it('renderuje zwykły <img> bez inline onerror, gdy image_url jest podane', () => {
        const thumb = parse(productThumbHTML('https://example.com/piwo.jpg', 'Piwo', 50));
        const img = thumb.querySelector('img');

        expect(thumb.classList.contains('thumb-broken')).toBe(false);
        expect(img).not.toBeNull();
        expect(img.getAttribute('src')).toBe('https://example.com/piwo.jpg');
        expect(img.hasAttribute('onerror')).toBe(false);
    });

    it('THUMB_FALLBACK_SVG parsuje się jako czyste SVG, bez "wyciekających" atrybutów', () => {
        // To jest dokładnie scenariusz, który wcześniej się psuł: cudzysłowy
        // wewnątrz SVG-a przedwcześnie zamykały atrybut onerror="...", więc
        // przeglądarka dokładała fikcyjne atrybuty (0, 24, fill, stroke...) do
        // <img>. Tutaj SVG trafia przez .innerHTML, nie przez atrybut, więc
        // taki wyciek nie może się zdarzyć — sprawdzamy, że faktycznie się nie zdarza.
        const wrapper = document.createElement('div');
        wrapper.innerHTML = THUMB_FALLBACK_SVG;

        const svg = wrapper.querySelector('svg');
        expect(svg).not.toBeNull();
        expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
        expect(wrapper.querySelectorAll('path').length).toBe(2);
        expect(wrapper.querySelectorAll('svg').length).toBe(1);
    });
});
