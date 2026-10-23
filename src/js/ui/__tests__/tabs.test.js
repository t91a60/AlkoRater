import { describe, it, expect, beforeEach, vi } from 'vitest';
import { switchTab } from '../tabs.js';
import { state } from '../../app/state.js';

describe('tab focus handoff', () => {
    beforeEach(() => {
        document.body.innerHTML = `<h1 id="title"></h1><main class="content-area"><section id="start"><button id="cta">Znajdź produkt</button></section><section id="search"></section></main><button class="nav-item" data-tab="search"></button>`;
        const scroller = document.querySelector('.content-area');
        scroller.scrollTo = vi.fn();
        state.currentTab = 'start';
        state.el = {
            tabs: {
                start: document.getElementById('start'),
                search: document.getElementById('search'),
            },
            navItems: document.querySelectorAll('.nav-item'),
            headerTitle: document.getElementById('title'),
        };
    });
    it('moves CTA focus out of the panel before aria-hidden is applied', () => {
        document.getElementById('cta').focus();
        const panel = state.el.tabs.start;
        const original = panel.setAttribute.bind(panel);
        vi.spyOn(panel, 'setAttribute').mockImplementation((key, value) => {
            if (key === 'aria-hidden' && value === 'true') {
                expect(panel.contains(document.activeElement)).toBe(false);
            }
            original(key, value);
        });
        switchTab('search', { recordHistory: false });
        expect(document.activeElement.dataset.tab).toBe('search');
    });
    it('ignores unknown destinations without hiding content', () => {
        switchTab('missing');
        expect(state.currentTab).toBe('start');
        expect(state.el.tabs.start.hasAttribute('aria-hidden')).toBe(false);
    });
    it('keeps focus on a navigation control when the panel does not own focus', () => {
        const tab = document.querySelector('.nav-item');
        tab.focus();
        switchTab('search', { recordHistory: false });
        expect(document.activeElement).toBe(tab);
    });
});
