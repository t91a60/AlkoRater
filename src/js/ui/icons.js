/**
 * Local, vendored subset of Lucide icons (source: lucide-static v0.344.0 —
 * the exact version this app was already pinned to — ISC license) as a
 * drop-in replacement for the runtime `https://unpkg.com/lucide` dependency.
 *
 * Why vendor instead of loading from the CDN:
 * - The app markets itself as offline-first, but the service worker's fetch
 *   handler explicitly skips cross-origin requests (`if (url.origin !==
 *   self.location.origin) return;`), so the unpkg script was never actually
 *   cached for offline use. On a cold offline load — the exact scenario this
 *   app is supposed to handle — every icon in the app (nav bar, star
 *   ratings, badges, empty states) would silently fail to render.
 * - Every call site guarded the call (`if (window.lucide)` / `?.`), so a
 *   missing CDN script didn't throw — it just meant every icon in the app
 *   (nav bar, star ratings, badges, empty states) silently never rendered
 *   for that whole session, with nothing in the UI explaining why.
 * - One less third-party origin trusted in the CSP, one less DNS lookup +
 *   connection on every cold load.
 *
 * This only includes the icon names actually used in the app today. Add a
 * new `name: '<svg inner markup>'` entry when a new icon is introduced
 * elsewhere — grab it from the matching lucide-static version's icons/
 * folder so the stroke geometry stays pixel-identical to the rest of the set.
 */

const ICONS = {
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    trophy:
        '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
    'search-x':
        '<path d="m13.5 8.5-5 5"/><path d="m8.5 8.5 5 5"/><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    'plus-circle': '<circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/>',
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    'check-circle': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>',
    bookmark: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
    'bar-chart-2':
        '<line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/>',
    beer: '<path d="M17 11h1a3 3 0 0 1 0 6h-1"/><path d="M9 12v6"/><path d="M13 12v6"/><path d="M14 7.5c-1 0-1.44.5-3 .5s-2-.5-3-.5-1.72.5-2.5.5a2.5 2.5 0 0 1 0-5c.78 0 1.57.5 2.5.5S9.44 2 11 2s2 1.5 3 1.5 1.72-.5 2.5-.5a2.5 2.5 0 0 1 0 5c-.78 0-1.5-.5-2.5-.5Z"/><path d="M5 8v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8"/>',
    'glass-water':
        '<path d="M15.2 22H8.8a2 2 0 0 1-2-1.79L5 3h14l-1.81 17.21A2 2 0 0 1 15.2 22Z"/><path d="M6 12a5 5 0 0 1 6 0 5 5 0 0 0 6 0"/>',
    wine: '<path d="M8 22h8"/><path d="M7 10h10"/><path d="M12 15v7"/><path d="M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z"/>',
    'wine-off':
        '<path d="M8 22h8"/><path d="M7 10h3m7 0h-1.343"/><path d="M12 15v7"/><path d="M7.307 7.307A12.33 12.33 0 0 0 7 10a5 5 0 0 0 7.391 4.391M8.638 2.981C8.75 2.668 8.872 2.34 9 2h6c1.5 4 2 6 2 8 0 .407-.05.809-.145 1.198"/><line x1="2" x2="22" y1="2" y2="22"/>',
    'flask-conical':
        '<path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
};

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Replaces every `[data-lucide]` element under `root` with the matching
 * inline SVG. Mirrors the subset of `window.lucide.createIcons()` behaviour
 * this app relied on: default 24x24 / stroke-2 attributes, the placeholder
 * element's own attributes copied onto the new <svg> (class merged rather
 * than overwritten, so e.g. `class="start-stat-ico"` still applies), then
 * the placeholder itself is swapped for the <svg>.
 * @param {ParentNode} [root]
 */
export function createIcons(root = document) {
    root.querySelectorAll('[data-lucide]').forEach((el) => {
        const name = el.getAttribute('data-lucide');
        const markup = ICONS[name];
        if (!markup) {
            return;
        }

        const svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('width', '24');
        svg.setAttribute('height', '24');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        svg.setAttribute('class', `lucide lucide-${name}`);

        for (const attr of el.attributes) {
            if (attr.name === 'data-lucide') {
                continue;
            }
            if (attr.name === 'class') {
                svg.setAttribute('class', `lucide lucide-${name} ${attr.value}`.trim());
                continue;
            }
            svg.setAttribute(attr.name, attr.value);
        }

        svg.innerHTML = markup;
        el.replaceWith(svg);
    });
}
