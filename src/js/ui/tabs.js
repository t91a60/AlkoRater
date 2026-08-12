import { state } from '../app/state.js';
import { haptics } from './haptics.js';
import { renderFavorites } from './favorites.js';
import { updateDashboard } from './dashboard.js';

const TAB_ORDER = ['start', 'search', 'favorites'];

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

    const titles = { start: 'Przegląd', search: 'Szukaj', favorites: 'Ulubione' };
    state.el.headerTitle.textContent = titles[tabName];

    if (currentEl && currentEl !== nextEl) {
        currentEl.style.transition = 'opacity 0.18s var(--ease-out), transform 0.18s var(--ease-out)';
        currentEl.style.transform = `translateX(${-direction * 30}px)`;
        currentEl.style.opacity = '0';
        const onExit = () => {
            if (currentEl.classList.contains('active')) { return; }
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
