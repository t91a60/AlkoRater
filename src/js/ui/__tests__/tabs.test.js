import { describe, it, expect, beforeEach } from 'vitest';
import { snapNavPill } from '../tabs.js';

/**
 * jsdom doesn't run real layout, so getBoundingClientRect() always returns
 * zeros unless mocked. These stand in for a nav bar spanning x=[0,300] with
 * three equal-width items, matching what a real .bottom-nav would report.
 */
function mockRect(el, { left, width }) {
    el.getBoundingClientRect = () => ({
        left,
        width,
        right: left + width,
        top: 0,
        bottom: 44,
        height: 44,
        x: left,
        y: 0,
        toJSON() {},
    });
}

function buildNav() {
    document.body.innerHTML = `
        <nav class="bottom-nav">
            <div class="nav-pill" aria-hidden="true"></div>
            <button class="nav-item" data-tab="start"></button>
            <button class="nav-item" data-tab="search"></button>
            <button class="nav-item" data-tab="favorites"></button>
        </nav>
    `;
    const nav = document.querySelector('.bottom-nav');
    const [start, search, favorites] = document.querySelectorAll('.nav-item');
    mockRect(nav, { left: 0, width: 300 });
    mockRect(start, { left: 0, width: 100 });
    mockRect(search, { left: 100, width: 100 });
    mockRect(favorites, { left: 200, width: 100 });
    return { nav, start, search, favorites };
}

describe('snapNavPill', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('ustawia szerokość i przesunięcie pigułki na podstawie realnego layoutu aktywnego taba', () => {
        buildNav();
        snapNavPill('search');

        const pill = document.querySelector('.nav-pill');
        // środkowy przycisk: left=100, width=100, inset 4px z każdej strony
        expect(pill.style.width).toBe('92px');
        expect(pill.style.transform).toBe('translateX(104px)');
        expect(pill.classList.contains('positioned')).toBe(true);
    });

    it('poprawnie liczy dla pierwszego i ostatniego taba', () => {
        buildNav();

        snapNavPill('start');
        let pill = document.querySelector('.nav-pill');
        expect(pill.style.transform).toBe('translateX(4px)');

        snapNavPill('favorites');
        pill = document.querySelector('.nav-pill');
        expect(pill.style.transform).toBe('translateX(204px)');
    });

    it('nie wybucha, gdy pigułki albo taba o danej nazwie nie ma w DOM', () => {
        document.body.innerHTML = '<nav class="bottom-nav"></nav>';
        expect(() => snapNavPill('start')).not.toThrow();

        buildNav();
        expect(() => snapNavPill('nieistniejacy-tab')).not.toThrow();
    });
});
