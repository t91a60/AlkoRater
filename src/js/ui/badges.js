import { CONSTANTS } from '../app/constants.js';
import { escapeHTML } from '../utils/dom.js';

/* ─── Badge Achievement System ─── */

const BADGE_CONFIG = [
    {
        id: 'hop-master',
        name: 'Mistrz Chmielu',
        icon: 'beer',
        thresholds: [5, 15, 30, 50],
        check: (fav) => (fav.tag || '').toLowerCase() === 'piwo',
    },
    {
        id: 'zero-connoisseur',
        name: 'Koneser 0.0%',
        icon: 'wine-off',
        thresholds: [2, 5, 10, 20],
        check: (fav) => fav.item && fav.item.alcohol === '0.0%',
    },
    {
        id: 'vodka-artist',
        name: 'Wodniasty Wódkarz',
        icon: 'glass-water',
        thresholds: [3, 8, 15, 30],
        check: (fav) => (fav.tag || '').toLowerCase() === 'wódka',
    },
    {
        id: 'wine-expert',
        name: 'Ekspert Winny',
        icon: 'wine',
        thresholds: [3, 8, 15, 30],
        check: (fav) => (fav.tag || '').toLowerCase() === 'wino',
    },
];

const TIER_NAMES = ['', 'Brąz', 'Srebro', 'Złoto', 'Platyna'];
const TIER_METAL = [
    '',
    'linear-gradient(145deg,#cd7f32,#a0622e)',
    'linear-gradient(145deg,#c0c0c0,#8a8a8a)',
    'linear-gradient(145deg,#ffd700,#b8860b)',
    'linear-gradient(145deg,#e8e8e8,#b0b0b0,#e0e0e0)',
];

/** Compute progress data for all badges from user's favorites. */
export function computeAllBadges(favorites) {
    return BADGE_CONFIG.map((badge) => {
        const count = favorites.filter(badge.check).length;
        const tierIndex = badge.thresholds.findIndex((t) => count < t);
        const currentTier = tierIndex === -1 ? badge.thresholds.length : tierIndex;
        const currentMax = tierIndex === -1 ? badge.thresholds[badge.thresholds.length - 1] : badge.thresholds[tierIndex];
        const prevMax = currentTier === 0 ? 0 : badge.thresholds[currentTier - 1];
        const progress = currentMax > 0 ? Math.min(100, ((count - prevMax) / (currentMax - prevMax)) * 100) : 0;
        return {
            ...badge,
            count,
            currentTier,
            currentMax,
            prevMax,
            progress,
            tierName: TIER_NAMES[currentTier],
            gradient: TIER_METAL[currentTier],
            isMaxed: tierIndex === -1,
        };
    });
}

/** Render the badges section HTML. */
export function renderBadgeSection(favorites) {
    const badges = computeAllBadges(favorites);
    return `
        <div class="badges-section">
            <h2 class="section-title badges-section-title">Osiągnięcia</h2>
            <div class="badges-grid">
                ${badges.map(renderBadgeCard).join('')}
            </div>
        </div>
    `;
}

function renderBadgeCard(badge) {
    const fillWidth = Math.round(badge.progress);
    const tierLabel = badge.isMaxed ? 'MAX' : badge.tierName;
    return `
        <div class="badge-card">
            <div class="badge-pin"${badge.gradient ? ` style="background:${badge.gradient}"` : ''}>
                <i data-lucide="${badge.icon}" class="badge-icon-svg" aria-hidden="true"></i>
            </div>
            <div class="badge-info">
                <div class="badge-name">${escapeHTML(badge.name)}</div>
                <div class="badge-progress-track">
                    <div class="badge-progress-fill" style="width:${fillWidth}%"></div>
                </div>
                <div class="badge-stats">
                    <span class="badge-count">${badge.count}${badge.isMaxed ? '' : ` / ${badge.currentMax}`}</span>
                    <span class="badge-tier">${escapeHTML(tierLabel)}</span>
                </div>
            </div>
        </div>
    `;
}

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
