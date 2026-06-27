import { escapeHTML } from '../utils/dom.js';

const TOAST_ICONS = {
    success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34c759" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    update: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#007aff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36"/></svg>',
    warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff9f0a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
};

/** @param {string} msg @param {'success'|'update'|'warning'} type */
export function showToast(msg, type) {
    const existing = document.querySelector('.toast');
    if (existing) {
        existing.classList.remove('visible');
        existing.remove();
    }

    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `${TOAST_ICONS[type] || ''}<span>${escapeHTML(msg)}</span>`;
    t.style.display = 'flex';
    t.style.alignItems = 'center';
    t.style.gap = '8px';
    document.body.appendChild(t);
    t.offsetHeight;
    t.classList.add('visible');

    setTimeout(() => {
        t.classList.remove('visible');
        t.classList.add('closing');
        setTimeout(() => t.remove(), 250);
    }, 2200);
}
