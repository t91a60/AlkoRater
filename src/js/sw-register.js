/**
 * @module sw-register
 * Service Worker registration with controlled updates:
 * new worker waits until user confirms reload.
 */

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

const showUpdateBanner = (registration) => {
    const banner = document.getElementById('update-banner');
    const updateBtn = document.getElementById('update-btn');
    const dismissBtn = document.getElementById('update-dismiss');

    if (!banner || !updateBtn || !dismissBtn) return;

    banner.style.display = 'block';
    requestAnimationFrame(() => banner.classList.add('visible'));

    const dismiss = () => {
        banner.classList.remove('visible');
        setTimeout(() => {
            banner.style.display = 'none';
        }, 350);
    };

    const applyUpdate = () => {
        if (registration.waiting) {
            registration.waiting.postMessage('SKIP_WAITING');
        }
    };

    updateBtn.onclick = applyUpdate;
    dismissBtn.onclick = dismiss;
};

if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        let refreshing = false;

        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            refreshing = true;
            window.location.reload();
        });

        try {
            const registration = await navigator.serviceWorker.register('./service-worker.js');
            console.log('[SW] Registered:', registration.scope);

            if (registration.waiting) {
                showUpdateBanner(registration);
            }

            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (!newWorker) return;

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        showUpdateBanner(registration);
                    }
                });
            });

            setInterval(() => registration.update(), UPDATE_CHECK_INTERVAL_MS);
        } catch (error) {
            console.error('[SW] Registration failed:', error);
        }
    });
}
