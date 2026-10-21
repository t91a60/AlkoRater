import { logger } from '../utils/logger.js';

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;
const WORKER_RESPONSE_TIMEOUT_MS = 3000;
const ACTIVATION_TIMEOUT_MS = 10000;
const WORKER_URL = new URL('../../../service-worker.js', import.meta.url);

let refreshing = false;
let readyToReload = false;
let dismissTimer;

function dismissBanner(banner) {
    banner.classList.remove('visible');
    clearTimeout(dismissTimer);
    dismissTimer = setTimeout(() => {
        banner.style.display = 'none';
    }, 350);
}

function requestWorker(worker, message) {
    return new Promise((resolve, reject) => {
        const channel = new MessageChannel();
        const finish = (error, data) => {
            clearTimeout(timer);
            channel.port1.close();
            channel.port2.close();
            if (error) {
                reject(error);
            } else {
                resolve(data);
            }
        };
        const timer = setTimeout(
            () => finish(new Error('Service worker response timed out')),
            WORKER_RESPONSE_TIMEOUT_MS,
        );
        channel.port1.onmessage = (event) => finish(null, event.data);
        try {
            worker.postMessage(message, [channel.port2]);
        } catch (error) {
            finish(error);
        }
    });
}

function waitForController(worker) {
    return new Promise((resolve, reject) => {
        const finish = (error) => {
            clearTimeout(timer);
            worker.removeEventListener('statechange', check);
            navigator.serviceWorker.removeEventListener('controllerchange', check);
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        };
        const check = () => {
            if (worker.state === 'redundant') {
                finish(new Error('Service worker update was replaced'));
            } else if (
                worker.state === 'activated' &&
                navigator.serviceWorker.controller === worker
            ) {
                finish();
            }
        };
        const timer = setTimeout(
            () => finish(new Error('Service worker activation timed out')),
            ACTIVATION_TIMEOUT_MS,
        );
        worker.addEventListener('statechange', check);
        navigator.serviceWorker.addEventListener('controllerchange', check);
        check();
    });
}

function isRatingOpen() {
    const modal = document.getElementById('modal-wrapper');
    return modal && (modal.classList.contains('active') || modal.style.display === 'block');
}

async function applyUpdate(registration) {
    if (isRatingOpen()) {
        return 'editing';
    }
    if (!readyToReload) {
        const worker = registration.waiting;
        if (!worker) {
            return 'unavailable';
        }
        const response = await requestWorker(worker, { type: 'SKIP_WAITING' });
        if (response?.type !== 'UPDATE_ACCEPTED') {
            return response?.reason || 'unavailable';
        }
        await waitForController(worker);
        readyToReload = true;
    }

    // A rating may have been opened while activation was in progress.
    if (isRatingOpen()) {
        return 'editing';
    }
    if (!refreshing) {
        refreshing = true;
        window.location.reload();
    }
    return 'applied';
}

function showUpdateBanner(registration) {
    const banner = document.getElementById('update-banner');
    const updateBtn = document.getElementById('update-btn');
    const dismissBtn = document.getElementById('update-dismiss');
    if (!banner || !updateBtn || !dismissBtn) {
        return;
    }

    clearTimeout(dismissTimer);
    banner.style.display = 'block';
    requestAnimationFrame(() => banner.classList.add('visible'));

    updateBtn.onclick = async () => {
        if (updateBtn.disabled) {
            return;
        }
        updateBtn.disabled = true;
        try {
            const result = await applyUpdate(registration);
            if (result === 'applied') {
                dismissBanner(banner);
                return;
            }
            const text = banner.querySelector('.update-text');
            if (text) {
                text.textContent =
                    result === 'editing'
                        ? 'Zapisz lub zamknij ocenę przed aktualizacją.'
                        : result === 'other-tabs'
                          ? 'Zamknij pozostałe karty AlkoRater i spróbuj ponownie.'
                          : 'Nie można teraz zaktualizować. Spróbuj ponownie.';
            }
        } catch (error) {
            logger.warn('[SW] Update postponed:', error);
            const text = banner.querySelector('.update-text');
            if (text) {
                text.textContent = 'Nie można teraz zaktualizować. Spróbuj ponownie.';
            }
        } finally {
            updateBtn.disabled = false;
        }
    };

    dismissBtn.onclick = () => dismissBanner(banner);
}

function notifyIfUpdateReady(registration) {
    if (!registration?.waiting || !navigator.serviceWorker.controller) {
        return;
    }
    showUpdateBanner(registration);
}

async function getSWVersion(registration) {
    if (!registration.active) {
        return null;
    }
    try {
        const response = await requestWorker(registration.active, { type: 'GET_VERSION' });
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
        const registration = await navigator.serviceWorker.register(WORKER_URL.href, {
            scope: new URL('./', WORKER_URL).href,
            updateViaCache: 'none',
        });

        logger.info('[SW] Registered:', registration.scope);

        if (registration.waiting) {
            notifyIfUpdateReady(registration);
        }

        const watched = new WeakSet();
        const watchInstalling = (newWorker) => {
            if (!newWorker || watched.has(newWorker)) {
                return;
            }
            watched.add(newWorker);
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    notifyIfUpdateReady(registration);
                }
            });
        };
        registration.addEventListener('updatefound', () =>
            watchInstalling(registration.installing),
        );
        watchInstalling(registration.installing);

        const version = await getSWVersion(registration);
        if (version) {
            window.__SW_VERSION__ = version;
        }

        setInterval(() => {
            registration.update().catch((error) => logger.warn('[SW] Update check failed:', error));
        }, UPDATE_CHECK_INTERVAL_MS);
    } catch (error) {
        logger.error('[SW] Registration failed:', error);
    }
}
