import { haptics } from './haptics.js';
import { createIcons } from './icons.js';

let activeMenu = null;

function closeMenu() {
    if (activeMenu) {
        const closing = activeMenu;
        closing.menu.classList.remove('visible');
        closing.backdrop.remove();
        closing.menu.remove();
        closing.previousFocus?.focus();
        activeMenu = null;
    }
}

/** @param {Array<{label:string,action:string,destructive?:boolean}>} items */
function renderMenu(items, x, y, onAction, trigger) {
    closeMenu();

    const backdrop = document.createElement('div');
    backdrop.className = 'context-menu-backdrop';
    document.body.appendChild(backdrop);

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', 'Opcje produktu');

    menu.innerHTML = items
        .map(
            (item) => `
        <button role="menuitem" class="context-menu-item${item.destructive ? ' destructive' : ''}" data-action="${item.action}">
            <i data-lucide="${item.icon}" aria-hidden="true"></i>
            ${item.label}
        </button>
    `,
        )
        .join('');

    document.body.appendChild(menu);
    createIcons(menu);

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

    activeMenu = { menu, backdrop, previousFocus: trigger || document.activeElement };
    menu.querySelector('button')?.focus();
    menu.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            closeMenu();
        }
        if (event.key === 'Tab') {
            closeMenu();
        }
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
            event.preventDefault();
            const controls = [...menu.querySelectorAll('button')];
            const current = controls.indexOf(document.activeElement);
            const next =
                event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? controls.length - 1
                      : (current + (event.key === 'ArrowDown' ? 1 : -1) + controls.length) %
                        controls.length;
            controls[next].focus();
        }
    });

    backdrop.addEventListener('click', closeMenu);
    backdrop.addEventListener('touchstart', closeMenu);

    menu.addEventListener('click', (e) => {
        const btn = e.target.closest('.context-menu-item');
        if (!btn) {
            return;
        }
        const action = btn.dataset.action;
        closeMenu();
        onAction(action);
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
            icon: 'star',
        });
        if (targetEl.closest('.favorite-card')) {
            items.push({
                label: 'Usuń',
                action: 'delete',
                destructive: true,
                icon: 'trash-2',
            });
        }
        haptics.light();
        renderMenu(
            items,
            x,
            y,
            (action) => {
                const itemId = targetEl.dataset.itemId;
                if (action === 'rate' && callbacks.onRate) {
                    callbacks.onRate(itemId);
                }
                if (action === 'delete' && callbacks.onDelete) {
                    callbacks.onDelete(itemId);
                }
            },
            targetEl.querySelector('.fav-main') || targetEl,
        );
    };

    containerEl.addEventListener(
        'touchstart',
        (e) => {
            const card = e.target.closest('.search-card, .favorite-card');
            if (!card) {
                return;
            }
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            triggered = false;
            timer = setTimeout(() => {
                triggered = true;
                show(card, touch.clientX, touch.clientY);
            }, LONG_PRESS_MS);
        },
        { passive: true },
    );

    containerEl.addEventListener('touchend', (e) => {
        clearTimeout(timer);
        if (triggered) {
            e.preventDefault();
        }
    });
    containerEl.addEventListener('touchcancel', () => clearTimeout(timer));

    containerEl.addEventListener(
        'touchmove',
        (e) => {
            if (triggered) {
                return;
            }
            const touch = e.touches[0];
            if (Math.abs(touch.clientX - startX) > 12 || Math.abs(touch.clientY - startY) > 12) {
                clearTimeout(timer);
            }
        },
        { passive: true },
    );

    containerEl.addEventListener('contextmenu', (e) => {
        const card = e.target.closest('.search-card, .favorite-card');
        if (!card) {
            return;
        }
        e.preventDefault();
        const rect = card.getBoundingClientRect();
        show(
            card,
            e.clientX || rect.left + rect.width / 2,
            e.clientY || rect.top + rect.height / 2,
        );
    });
}
