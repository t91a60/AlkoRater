import { state } from '../app/state.js';
import { haptics } from './haptics.js';
import { renderFavorites } from './favorites.js';
import { updateDashboard } from './dashboard.js';
import { debounce } from '../utils/debounce.js';

const TAB_ORDER = ['start', 'search', 'favorites'];
const PILL_INSET = 4; // px of horizontal breathing room inside the active nav-item's footprint

/**
 * Slides the floating glass/titanium nav-pill behind whichever .nav-item
 * matches `tabName`, using its live layout box — no hardcoded per-tab
 * positions to keep in sync if a label or icon ever changes width.
 * @param {string} tabName
 */
function positionNavPill(tabName) {
    const pill = document.querySelector('.nav-pill');
    const activeBtn = document.querySelector(`.nav-item[data-tab="${tabName}"]`);
    if (!pill || !activeBtn) { return; }

    const navRect = pill.parentElement.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();

    pill.style.width = `${btnRect.width - PILL_INSET * 2}px`;
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
    if (!pill) { return; }
    const prevTransition = pill.style.transition;
    pill.style.transition = 'none';
    positionNavPill(tabName);
    pill.offsetHeight; // force reflow so "none" actually applies before we restore the real transition
    pill.style.transition = prevTransition;
}

window.addEventListener('resize', debounce(() => snapNavPill(), 150));

/** @param {string} tabName */
export function switchTab(tabName) {
    if (state.currentTab === tabName) { return; }
    haptics.light();

    const currentEl = state.el.tabs[state.currentTab];
    const nextEl = state.el.tabs[tabName];

    const fromIdx = TAB_ORDER.indexOf(state.currentTab);
    const toIdx = TAB_ORDER.indexOf(tabName);
    const direction = toIdx > fromIdx ? 1 : -1; // 1 = left→right, -1 = right→left

    state.el.navItems.forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
        if (btn.dataset.tab === tabName) {
            btn.setAttribute('aria-selected', 'true');
            btn.style.transition = 'transform 0.28s var(--ease-spring)';
            btn.style.transform = 'scale(1.08)';
            const onEnd = () => {
                btn.style.transform = '';
                btn.removeEventListener('transitionend', onEnd);
            };
            btn.addEventListener('transitionend', onEnd, { once: true });
        } else {
            btn.setAttribute('aria-selected', 'false');
        }
    });

    positionNavPill(tabName);

    const titles = { start: 'Przegląd', search: 'Szukaj', favorites: 'Ulubione' };
    state.el.headerTitle.textContent = titles[tabName];

    if (currentEl && currentEl !== nextEl) {
        currentEl.style.transition = 'opacity 0.18s var(--ease-out), transform 0.18s var(--ease-out)';
        currentEl.style.transform = `translateX(${-direction * 30}px)`;
        currentEl.style.opacity = '0';
        const onExit = () => {
            currentEl.classList.remove('active');
            currentEl.style.display = 'none';
            currentEl.style.transform = '';
            currentEl.style.opacity = '';
            currentEl.style.transition = '';
            currentEl.removeEventListener('transitionend', onExit);
        };
        currentEl.addEventListener('transitionend', onExit, { once: true });
    }

    if (nextEl) {
        nextEl.style.opacity = '0';
        nextEl.style.transform = `translateX(${direction * 30}px)`;
        nextEl.style.transition = 'none';
        nextEl.style.display = 'block';
        nextEl.offsetHeight; // force reflow
        nextEl.classList.remove('tab-exit');
        nextEl.classList.add('active');
        nextEl.style.display = '';
        nextEl.style.transition = 'opacity 0.25s var(--ease-out) 0.06s, transform 0.25s var(--ease-out) 0.06s';
        nextEl.style.opacity = '1';
        nextEl.style.transform = 'translateX(0)';

        const onEnter = () => {
            nextEl.style.transition = '';
            nextEl.style.transform = '';
            nextEl.removeEventListener('transitionend', onEnter);
        };
        nextEl.addEventListener('transitionend', onEnter, { once: true });
    }

    state.currentTab = tabName;
    document.querySelector('.content-area').scrollTo({ top: 0, behavior: 'smooth' });

    if (tabName === 'favorites') {
        const activeChip = document.querySelector('.filter-chip.active');
        renderFavorites(activeChip?.dataset.filter);
    }
    if (tabName === 'start') { updateDashboard(); }
}
