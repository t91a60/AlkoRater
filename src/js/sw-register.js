/**
 * @module sw-register
 * Service Worker registration with explicit update flow:
 *  - uses SW message port for GET_VERSION
 *  - shows update banner only when version bump is confirmed
 */

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

const notifyClientIfUpdateReady = (registration) => {
    if (!registration?.waiting) {return;}

    const port = registration.waiting;

    if (typeof port.postMessage === 'function') {
        try {
            port.postMessage({ type: 'SKIP_WAITING' });
        } catch {}
    }

    const banner = document.getElementById('update-banner');
    const updateBtn = document.getElementById('update-btn');
    const dismissBtn = document.getElementById('update-dismiss');

    if (!banner || !updateBtn || !dismissBtn) {return;}

    banner.style.display = 'block';
    requestAnimationFrame(() => banner.classList.add('visible'));

    const dismiss = () => {
        banner.classList.remove('visible');
        setTimeout(() => {
            banner.style.display = 'none';
        }, 350);
    };

    const applyUpdate = () => {
        registration.waiting?.postMessage('SKIP_WAITING');
        dismiss();
    };

    updateBtn.onclick = applyUpdate;
    dismissBtn.onclick = dismiss;
};

if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        let refreshing = false;

        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) {return;}
            refreshing = true;
            window.location.reload();
        });

        try {
            const registration = await navigator.serviceWorker
                .register('./service-worker.js', { scope: './' });

            console.log('[SW] Registered:', registration.scope);

            const initialVersionPromise = (async () => {
                try {
                    const mc = new MessageChannel();
                    const response = await new Promise((resolve) => {
                        registration.active?.postMessage({ type: 'GET_VERSION' }, [mc.port2]);
                        mc.port1.onmessage = (event) => resolve(event.data);
                    });
                    return response?.version || null;
                } catch {
                    return null;
                }
            })();

            if (registration.waiting) {
                notifyClientIfUpdateReady(registration);
            }

            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (!newWorker) {return;}

                const reportInstalledUpdate = () => {
                    if (!navigator.serviceWorker.controller) {return;}
                    notifyClientIfUpdateReady(registration);
                };

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        reportInstalledUpdate();
                    }
                });
            });

            // Ustal bieżącą wersję SW i przy następnym okrążeniu porównaj.
            const initialVersion = await initialVersionPromise;
            if (initialVersion) {
                window.__SW_VERSION__ = initialVersion;
            }

            setInterval(() => registration.update(), UPDATE_CHECK_INTERVAL_MS);
        } catch (error) {
            console.error('[SW] Registration failed:', error);
        }
    });
}
