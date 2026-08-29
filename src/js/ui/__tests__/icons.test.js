import { describe, it, expect } from 'vitest';
import { createIcons } from '../icons.js';

describe('createIcons', () => {
    it('zamienia [data-lucide] na <svg> z prawidłową geometrią', () => {
        document.body.innerHTML = '<i data-lucide="star" aria-hidden="true"></i>';
        createIcons();

        const svg = document.body.querySelector('svg');
        expect(svg).not.toBeNull();
        expect(document.body.querySelector('[data-lucide]')).toBeNull();
        expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
        expect(svg.querySelector('polygon')).not.toBeNull();
    });

    it('łączy istniejącą klasę z domyślnymi klasami "lucide lucide-{name}"', () => {
        document.body.innerHTML = '<i data-lucide="heart" class="nav-icon-inner"></i>';
        createIcons();

        const svg = document.body.querySelector('svg');
        expect(svg.classList.contains('lucide')).toBe(true);
        expect(svg.classList.contains('lucide-heart')).toBe(true);
        expect(svg.classList.contains('nav-icon-inner')).toBe(true);
    });

    it('kopiuje pozostałe atrybuty (style, stroke-width, aria-hidden) na nowy <svg>', () => {
        document.body.innerHTML =
            '<i data-lucide="clock" style="width:12px;opacity:0.5" stroke-width="1.8" aria-hidden="true"></i>';
        createIcons();

        const svg = document.body.querySelector('svg');
        expect(svg.getAttribute('style')).toBe('width:12px;opacity:0.5');
        expect(svg.getAttribute('stroke-width')).toBe('1.8');
        expect(svg.getAttribute('aria-hidden')).toBe('true');
    });

    it('nie wybucha i zostawia element bez zmian, gdy nazwa ikony jest nieznana', () => {
        document.body.innerHTML = '<i data-lucide="nie-takie-cos"></i>';
        expect(() => createIcons()).not.toThrow();
        expect(document.body.querySelector('[data-lucide="nie-takie-cos"]')).not.toBeNull();
    });

    it('obsługuje wiele ikon i różne nazwy jednocześnie', () => {
        document.body.innerHTML = `
            <i data-lucide="home"></i>
            <i data-lucide="search"></i>
            <i data-lucide="beer"></i>
        `;
        createIcons();

        const svgs = document.body.querySelectorAll('svg');
        expect(svgs.length).toBe(3);
        expect(document.body.querySelectorAll('[data-lucide]').length).toBe(0);
    });
});
