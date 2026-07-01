import { CONSTANTS } from '../app/constants.js';
import { escapeHTML } from '../utils/dom.js';


const TYPE_COLORS = {};
for (const key of Object.keys(CONSTANTS.BEER_TYPES)) {
    TYPE_COLORS[key] = CONSTANTS.BEER_TYPES[key].hex;
}

const THUMB_BG = {
    piwo:   'linear-gradient(145deg,rgba(212,160,84,.20),rgba(160,100,40,.11))',
    wódka:  'linear-gradient(145deg,rgba(107,197,247,.20),rgba(70,150,210,.11))',
    wino:   'linear-gradient(145deg,rgba(184,74,98,.22),rgba(140,50,80,.13))',
};

/** @returns {string} HTML for an alcohol percentage badge, or empty string. */
export const alcoholBadgeHTML = (alcohol) => {
    if (!alcohol) { return ''; }
    const val = alcohol.includes('%') ? alcohol : `${alcohol}%`;
    return `<span class="separator">·</span><span class="alcohol-badge">${escapeHTML(val)}</span>`;
};

/** @returns {string} HTML for a colored beer-type badge, or empty string. */
export const typeBadgeHTML = (type) => {
    if (!type) { return ''; }
    const hex = TYPE_COLORS[type.toLowerCase()] || '#636e72';
    return `<span class="type-badge" style="--type-color:${hex};--type-bg:${hex}22">${escapeHTML(type)}</span>`;
};

/**
 * Returns a styled product thumbnail with category gradient bg + emoji fallback.
 * @param {string} imageUrl
 * @param {string} category  e.g. "Piwo", "Wódka", "Wino"
 * @param {number} size      pixel size (width & height)
 * @returns {string}
 */
export const productThumbHTML = (imageUrl, category, size = 50) => {
    const cat = (category || '').toLowerCase();
    const bg = THUMB_BG[cat] || 'linear-gradient(145deg,rgba(120,110,100,.18),rgba(80,70,60,.10))';
    const src = escapeHTML(imageUrl || '');
    const fallbackSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L12 6"/><path d="M8 6C8 6 8 8 8 10C8 12 10 14 10 16L10 20C10 21.1 10.9 22 12 22C13.1 22 14 21.1 14 20L14 16C14 14 16 12 16 10C16 8 16 6 16 6L8 6Z"/></svg>';
    return (
        `<div class="product-thumb" ` +
        `style="width:${size}px;height:${size}px;min-width:${size}px;background:${bg}">` +
        `<img src="${src}" loading="lazy" alt="" ` +
        `onerror="this.onerror=null;this.style.display='none';this.parentElement.innerHTML='${fallbackSvg}';this.parentElement.classList.add('thumb-broken')">` +
        `</div>`
    );
};
