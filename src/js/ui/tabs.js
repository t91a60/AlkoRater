import { state } from '../app/state.js';
import { haptics } from './haptics.js';
import { renderFavorites } from './favorites.js';
import { updateDashboard } from './dashboard.js';

/** @param {string} tabName */
export function switchTab(tabName) {
    if (state.currentTab === tabName) {return;}
    haptics.light();

    const currentEl = state.el.tabs[state.currentTab];
    const nextEl = state.el.tabs[tabName];

    state.el.navItems.forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    const titles = { start: 'Start', search: 'Szukaj', favorites: 'Ulubione' };
    state.el.headerTitle.textContent = titles[tabName];

    if (currentEl) {
        currentEl.classList.remove('active');
        currentEl.classList.add('tab-exit');
        setTimeout(() => {
            currentEl.classList.remove('tab-exit');
            currentEl.style.display = 'none';
        }, 350);
    }

    if (nextEl) {
        nextEl.style.display = 'block';
        nextEl.offsetHeight;
        nextEl.classList.remove('tab-exit');
        nextEl.classList.add('active');
        nextEl.style.display = '';
    }

    state.currentTab = tabName;
    document.querySelector('.content-area').scrollTo({ top: 0, behavior: 'smooth' });

    if (tabName === 'favorites') {
        const activeChip = document.querySelector('.filter-chip.active');
        renderFavorites(activeChip?.dataset.filter);
    }
    if (tabName === 'start') {updateDashboard();}
}
