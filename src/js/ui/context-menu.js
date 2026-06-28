import { haptics } from './haptics.js';

let activeMenu = null;

function closeMenu() {
    if (activeMenu) {
        activeMenu.menu.classList.remove('visible');
        activeMenu.backdrop.remove();
        setTimeout(() => activeMenu.menu.remove(), 220);
        activeMenu = null;
    }
}

/** @param {Array<{label:string,action:string,destructive?:boolean}>} items */
function renderMenu(items, x, y, onAction) {
    closeMenu();

    const backdrop = document.createElement('div');
    backdrop.className = 'context-menu-backdrop';
    document.body.appendChild(backdrop);

    const menu = document.createElement('div');
    menu.className = 'context-menu';

    menu.innerHTML = items.map((item) => `
        <button class="context-menu-item${item.destructive ? ' destructive' : ''}" data-action="${item.action}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${item.icon}</svg>
            ${item.label}
        </button>
    `).join('');

    document.body.appendChild(menu);

    requestAnimationFrame(() => {
        menu.classList.add('visible');
    });

    const rect = menu.getBoundingClientRect();
    let left = x;
    let top = y;
    if (left + rect.width > window.innerWidth - 12) {
        left = window.innerWidth - rect.width - 12;
    }
    if (top + rect.height > window.innerHeight - 12) {
        top = window.innerHeight - rect.height - 12;
    }
    menu.style.left = `${Math.max(12, left)}px`;
    menu.style.top = `${Math.max(12, top)}px`;

    activeMenu = { menu, backdrop };

    backdrop.addEventListener('click', closeMenu);
    backdrop.addEventListener('touchstart', closeMenu);

    menu.addEventListener('click', (e) => {
        const btn = e.target.closest('.context-menu-item');
        if (!btn) {return;}
        const action = btn.dataset.action;
        onAction(action);
        closeMenu();
    });
}

const LONG_PRESS_MS = 500;

export function setupContextMenus(containerEl, callbacks = {}) {
    let timer = null;
    let triggered = false;
    let startX = 0;
    let startY = 0;

    const show = (targetEl, x, y) => {
        const items = [];
        items.push({
            label: 'Oceń',
            action: 'rate',
            icon: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
        });
        if (targetEl.closest('.favorite-card')) {
            items.push({
                label: 'Usuń',
                action: 'delete',
                destructive: true,
                icon: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
            });
        }
        haptics.light();
        renderMenu(items, x, y, (action) => {
            const itemName = targetEl.dataset.itemName;
            if (action === 'rate' && callbacks.onRate) {callbacks.onRate(itemName);}
            if (action === 'delete' && callbacks.onDelete) {callbacks.onDelete(itemName);}
        });
    };

    containerEl.addEventListener('touchstart', (e) => {
        const card = e.target.closest('.search-item, .favorite-card');
        if (!card) {return;}
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        triggered = false;
        timer = setTimeout(() => {
            triggered = true;
            show(card, touch.clientX, touch.clientY);
        }, LONG_PRESS_MS);
    }, { passive: true });

    containerEl.addEventListener('touchend', (e) => {
        clearTimeout(timer);
        if (triggered) {e.preventDefault();}
    });

    containerEl.addEventListener('touchmove', (e) => {
        if (triggered) {return;}
        const touch = e.touches[0];
        if (Math.abs(touch.clientX - startX) > 12 || Math.abs(touch.clientY - startY) > 12) {
            clearTimeout(timer);
        }
    }, { passive: true });

    containerEl.addEventListener('contextmenu', (e) => {
        const card = e.target.closest('.search-item, .favorite-card');
        if (!card) {return;}
        e.preventDefault();
        show(card, e.clientX, e.clientY);
    });
}
