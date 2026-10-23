import { state } from '../app/state.js';
import { haptics } from './haptics.js';
import { renderFavorites } from './favorites.js';
import { updateDashboard } from './dashboard.js';
import { prefersReducedMotion } from '../utils/dom.js';

const TAB_ORDER = ['start', 'search', 'favorites'];
const scrollPositions = new Map();
let panelAnimation = null;
let navObserver = null;

export function observeNavigation() {
    const nav = document.querySelector('.bottom-nav');
    if (nav && !navObserver && typeof ResizeObserver !== 'undefined') {
        navObserver = new ResizeObserver(() => {
            document.documentElement.style.setProperty('--nav-height', `${nav.offsetHeight}px`);
        });
        navObserver.observe(nav);
    }
}

/** @param {string} tabName */
export function switchTab(tabName, { recordHistory = true } = {}) {
    if (!TAB_ORDER.includes(tabName) || state.currentTab === tabName) {
        return;
    }
    const scroller = document.querySelector('.content-area');
    const direction = TAB_ORDER.indexOf(tabName) > TAB_ORDER.indexOf(state.currentTab) ? 1 : -1;
    scrollPositions.set(state.currentTab, scroller.scrollTop);
    panelAnimation?.cancel();
    haptics.light();

    state.el.navItems.forEach((btn) => {
        const active = btn.dataset.tab === tabName;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-selected', String(active));
        btn.tabIndex = active ? 0 : -1;
    });

    // Move focus before hiding the outgoing panel, including CTA and history navigation.
    const outgoing = state.el.tabs[state.currentTab];
    if (outgoing?.contains(document.activeElement)) {
        document.querySelector(`.nav-item[data-tab="${tabName}"]`)?.focus({ preventScroll: true });
    }
    const titles = { start: 'Kolekcja', search: 'Szukaj', favorites: 'Moje oceny' };
    state.el.headerTitle.textContent = titles[tabName];

    Object.entries(state.el.tabs).forEach(([name, panel]) => {
        panel.classList.toggle('active', name === tabName);
        panel.setAttribute('aria-hidden', String(name !== tabName));
    });

    state.currentTab = tabName;

    if (tabName === 'favorites') {
        const activeChip = document.querySelector('.filter-chip.active');
        renderFavorites(activeChip?.dataset.filter);
    }
    if (tabName === 'start') {
        updateDashboard();
    }
    scroller.scrollTo({ top: scrollPositions.get(tabName) || 0, behavior: 'instant' });
    if (!prefersReducedMotion() && state.el.tabs[tabName].animate) {
        panelAnimation = state.el.tabs[tabName].animate(
            [
                { opacity: 0.65, transform: `translateX(${direction * 8}px)` },
                { opacity: 1, transform: 'none' },
            ],
            { duration: 140, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
        );
        panelAnimation.onfinish = () => {
            panelAnimation = null;
        };
    }
    if (recordHistory) {
        const url = new URL(window.location.href);
        url.hash = tabName;
        window.history.pushState({ alkoraterTab: tabName }, '', url);
    }
}
