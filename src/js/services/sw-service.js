import { logger } from '../utils/logger.js';

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

let refreshing = false;

navigator.serviceWorker?.addEventListener('controllerchange', () => {
    if (refreshing) {return;}
    refreshing = true;
    window.location.reload();
});

function dismissBanner(banner) {
    banner.classList.remove('visible');
    setTimeout(() => {
        banner.style.display = 'none';
    }, 350);
}

function applyUpdate(registration) {
    registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
}

function showUpdateBanner(registration) {
    const banner = document.getElementById('update-banner');
    const updateBtn = document.getElementById('update-btn');
    const dismissBtn = document.getElementById('update-dismiss');
    if (!banner || !updateBtn || !dismissBtn) {return;}

    banner.style.display = 'block';
    requestAnimationFrame(() => banner.classList.add('visible'));

    updateBtn.onclick = () => {
        applyUpdate(registration);
        dismissBanner(banner);
    };

    dismissBtn.onclick = () => dismissBanner(banner);
}

function notifyIfUpdateReady(registration) {
    if (!registration?.waiting) {return;}
    if (!navigator.serviceWorker.controller) {return;}

    // Only show the banner here — applying the update is the user's choice,
    // triggered from showUpdateBanner()'s "Aktualizuj" button. Skipping
    // waiting immediately (before the user has seen the banner) would force
    // an unprompted reload via the controllerchange listener above.
    showUpdateBanner(registration);
}

async function getSWVersion(registration) {
    try {
        const mc = new MessageChannel();
        const response = await Promise.race([
            new Promise((resolve) => {
                registration.active?.postMessage({ type: 'GET_VERSION' }, [mc.port2]);
                mc.port1.onmessage = (event) => resolve(event.data);
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
        ]);
        return response?.version || null;
    } catch {
        return null;
    }
}

/** Register service worker and setup update flow. */
export async function registerSW() {
    if (!('serviceWorker' in navigator)) {
        logger.info('[SW] Service Worker not supported');
        return;
    }

    try {
        const registration = await navigator.serviceWorker.register(
            './service-worker.js',
            { scope: './' },
        );

        logger.info('[SW] Registered:', registration.scope);

        if (registration.waiting) {
            notifyIfUpdateReady(registration);
        }

        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) {return;}

            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    notifyIfUpdateReady(registration);
                }
            });
        });

        const version = await getSWVersion(registration);
        if (version) {
            window.__SW_VERSION__ = version;
        }

        setInterval(() => registration.update(), UPDATE_CHECK_INTERVAL_MS);
    } catch (error) {
        logger.error('[SW] Registration failed:', error);
    }
}
