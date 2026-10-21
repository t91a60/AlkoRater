import { state } from '../app/state.js';
import { haptics } from './haptics.js';
import { renderFavorites } from './favorites.js';
import { updateDashboard } from './dashboard.js';
import { debounce } from '../utils/debounce.js';
import { prefersReducedMotion } from '../utils/dom.js';

const TAB_ORDER = ['start', 'search', 'favorites'];
const PILL_INSET = 4; // px of horizontal breathing room inside the active nav-item's footprint
const scrollPositions = new Map();
let panelAnimation = null;
let navObserver = null;

/**
 * Slides the floating glass/titanium nav-pill behind whichever .nav-item
 * matches `tabName`, using its live layout box — no hardcoded per-tab
 * positions to keep in sync if a label or icon ever changes width.
 * @param {string} tabName
 */
function positionNavPill(tabName) {
    const pill = document.querySelector('.nav-pill');
    const activeBtn = document.querySelector(`.nav-item[data-tab="${tabName}"]`);
    if (!pill || !activeBtn) {
        return;
    }

    const navRect = pill.parentElement.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();

    pill.style.width = `${btnRect.width - PILL_INSET * 2}px`;
    pill.style.height = `${btnRect.height}px`;
    pill.style.top = `${btnRect.top - navRect.top}px`;
    pill.style.transform = `translateX(${btnRect.left - navRect.left + PILL_INSET}px)`;
    pill.classList.add('positioned');
}

/**
 * Positions the pill with its transition suspended, so it's already correct
 * before it fades in — used on first load and after a resize/orientation
 * change, where an animated slide-in would just look like a glitch.
 * @param {string} [tabName]
 */
export function snapNavPill(tabName = state.currentTab) {
    const pill = document.querySelector('.nav-pill');
    if (!pill) {
        return;
    }
    const prevTransition = pill.style.transition;
    pill.style.transition = 'none';
    positionNavPill(tabName);
    pill.offsetHeight; // force reflow so "none" actually applies before we restore the real transition
    pill.style.transition = prevTransition;
    if (!navObserver && typeof ResizeObserver !== 'undefined') {
        navObserver = new ResizeObserver(() => {
            document.documentElement.style.setProperty(
                '--nav-height',
                `${pill.parentElement.offsetHeight}px`,
            );
            snapNavPill();
        });
        navObserver.observe(pill.parentElement);
    }
}

window.addEventListener(
    'resize',
    debounce(() => snapNavPill(), 150),
);

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

    positionNavPill(tabName);

    const titles = { start: 'Przegląd', search: 'Szukaj', favorites: 'Moje oceny' };
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
