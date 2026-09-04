/** iOS-style pull-to-refresh.
 *
 * Pull tracks the finger 1:1, the spinner sweeps with the pull distance, and
 * a fast fling can trigger refresh below the distance threshold (momentum
 * projection) — then the release velocity hands off into the spinner's loop.
 *
 *  @param {HTMLElement} scrollContainer - the .content-area element
 *  @param {() => Promise<void>} onRefresh - async callback
 */
export function setupPullToRefresh(scrollContainer, onRefresh) {
    let startY = 0;
    let pullDistance = 0;
    let pulling = false;
    let refreshing = false;
    let history = [];
    const REVEAL_DISTANCE = 55;
    const FLING_VELOCITY = 600;

    const ptrEl = document.createElement('div');
    ptrEl.className = 'ptr-container';
    ptrEl.innerHTML = '<div class="ptr-spinner"></div>';
    const spinner = ptrEl.querySelector('.ptr-spinner');
    scrollContainer.prepend(ptrEl);

    function readVelocity() {
        if (history.length >= 2) {
            const last = history[history.length - 1];
            const prev = history[Math.max(0, history.length - 3)];
            const dt = last.t - prev.t;
            if (dt > 0) {
                return (last.y - prev.y) / (dt / 1000);
            }
        }
        return 0;
    }

    scrollContainer.addEventListener(
        'touchstart',
        (e) => {
            if (refreshing) {
                return;
            }
            if (scrollContainer.scrollTop <= 0) {
                startY = e.touches[0].clientY;
                pulling = true;
                history = [{ y: startY, t: performance.now() }];
            }
        },
        { passive: true },
    );

    scrollContainer.addEventListener(
        'touchmove',
        (e) => {
            if (refreshing) {
                return;
            }
            const touchY = e.touches[0].clientY;
            const delta = touchY - startY;
            if (!pulling && scrollContainer.scrollTop <= 0 && delta > 0) {
                pulling = true;
            }
            if (!pulling) {
                return;
            }
            if (delta > 0) {
                history.push({ y: touchY, t: performance.now() });
                if (history.length > 6) {
                    history.shift();
                }

                pullDistance = Math.min(delta * 0.45, 100);
                const translateY = -56 + pullDistance;
                ptrEl.style.transform = `translateY(${translateY}px)`;
                scrollContainer.scrollTop = 0;
                ptrEl.classList.toggle('pulling', pullDistance > REVEAL_DISTANCE);
                if (pullDistance > REVEAL_DISTANCE) {
                    // Sweep the spinner with the pull: ~360° at full travel.
                    const rotation = pullDistance * 3.6;
                    spinner.style.transform = `rotate(${rotation}deg)`;
                    spinner.style.transition = 'none';
                }
            }
        },
        { passive: true },
    );

    const done = () => {
        refreshing = false;
        ptrEl.classList.remove('active', 'loading');
        spinner.style.transform = '';
        spinner.style.transition = '';
        spinner.style.animationDelay = '';
        ptrEl.style.transform = '';
    };

    const finishPull = () => {
        if (!pulling) {
            return;
        }
        pulling = false;
        const velocity = readVelocity();
        const fling = velocity > FLING_VELOCITY && pullDistance > 15;
        if ((pullDistance > REVEAL_DISTANCE || fling) && !refreshing) {
            refreshing = true;
            ptrEl.classList.remove('pulling');
            ptrEl.classList.add('active', 'loading');
            // Resume the loop from where the finger left it — no visible
            // snap when the CSS keyframes take over the spinner.
            const rotation = pullDistance * 3.6;
            spinner.style.transform = '';
            spinner.style.animationDelay = `${-((rotation % 360) / 360) * 0.7}s`;
            (onRefresh() || Promise.resolve()).then(done, done);
        } else {
            ptrEl.classList.remove('pulling');
            spinner.style.transform = '';
            spinner.style.transition = '';
            ptrEl.style.transform = '';
        }
        pullDistance = 0;
        history = [];
    };

    scrollContainer.addEventListener('touchend', finishPull);
    scrollContainer.addEventListener('touchcancel', finishPull);
}
