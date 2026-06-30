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
const THUMB_EMOJI = { piwo: '🍺', wódka: '🥃', wino: '🍷' };

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
    const emoji = THUMB_EMOJI[cat] || '🍶';
    const src = escapeHTML(imageUrl || '');
    return (
        `<div class="product-thumb" data-emoji="${escapeHTML(emoji)}" ` +
        `style="width:${size}px;height:${size}px;min-width:${size}px;background:${bg}">` +
        `<img src="${src}" loading="lazy" alt="" ` +
        `onerror="this.onerror=null;this.style.display='none';this.parentElement.classList.add('thumb-broken')">` +
        `</div>`
    );
};
