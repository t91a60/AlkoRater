/** iOS-style pull-to-refresh.
 *  @param {HTMLElement} scrollContainer - the .content-area element
 *  @param {() => Promise<void>} onRefresh - async callback
 */
export function setupPullToRefresh(scrollContainer, onRefresh) {
    let startY = 0;
    let pullDistance = 0;
    let pulling = false;
    let refreshing = false;

    const ptrEl = document.createElement('div');
    ptrEl.className = 'ptr-container';
    ptrEl.innerHTML = '<div class="ptr-spinner"></div>';
    scrollContainer.prepend(ptrEl);

    scrollContainer.addEventListener('touchstart', (e) => {
        if (refreshing) {return;}
        if (scrollContainer.scrollTop <= 0) {
            startY = e.touches[0].clientY;
            pulling = true;
        }
    }, { passive: true });

    scrollContainer.addEventListener('touchmove', (e) => {
        if (refreshing) {return;}
        const delta = e.touches[0].clientY - startY;
        if (!pulling && scrollContainer.scrollTop <= 0 && delta > 0) {
            pulling = true;
        }
        if (!pulling) {return;}
        if (delta > 0) {
            pullDistance = Math.min(delta * 0.45, 100);
            ptrEl.style.height = `${pullDistance}px`;
            scrollContainer.scrollTop = 0;
            ptrEl.classList.toggle('pulling', pullDistance > 55);
        }
    }, { passive: true });

    const done = () => {
        refreshing = false;
        ptrEl.classList.remove('active', 'loading');
        ptrEl.style.height = '';
    };

    const finishPull = () => {
        if (!pulling) {return;}
        pulling = false;
        if (pullDistance > 55 && !refreshing) {
            refreshing = true;
            ptrEl.classList.remove('pulling');
            ptrEl.classList.add('active', 'loading');
            (onRefresh() || Promise.resolve()).then(done, done);
        } else {
            ptrEl.classList.remove('pulling');
            ptrEl.style.height = '';
        }
        pullDistance = 0;
    };

    scrollContainer.addEventListener('touchend', finishPull);
    scrollContainer.addEventListener('touchcancel', finishPull);
}
