/**
 * Vanilla spring animation — interruptible, velocity-aware.
 * Replaces the `motion` library for a bundler-free PWA.
 *
 * @param {number} from - start value
 * @param {number} to - end value
 * @param {(value: number) => void} onUpdate - called each frame with current value
 * @param {object} opts
 * @param {number} opts.stiffness - spring stiffness (default 180)
 * @param {number} opts.damping - damping coefficient (default 12)
 * @param {number} opts.mass - mass (default 1)
 * @param {number} opts.velocity - initial velocity (default 0)
 * @param {() => void} [opts.onFinish]
 * @returns {{ stop: () => void }}
 */
export function spring(from, to, onUpdate, opts = {}) {
    const stiffness = opts.stiffness ?? 180;
    const damping = opts.damping ?? 12;
    const mass = opts.mass ?? 1;
    const onFinish = opts.onFinish;

    let pos = from;
    let vel = opts.velocity ?? 0;
    let raf = null;
    let lastTime = null;
    let running = true;

    function step(now) {
        if (!running) { return; }
        if (lastTime === null) { lastTime = now; }
        const dt = Math.min((now - lastTime) / 1000, 0.064);
        lastTime = now;

        const displacement = pos - to;
        const springForce = -stiffness * displacement;
        const dampingForce = -damping * vel;
        const acceleration = (springForce + dampingForce) / mass;

        vel += acceleration * dt;
        pos += vel * dt;

        if (Math.abs(vel) < 0.05 && Math.abs(displacement) < 0.05) {
            pos = to;
            onUpdate(to);
            running = false;
            onFinish?.();
            return;
        }

        onUpdate(pos);
        raf = requestAnimationFrame(step);
    }

    raf = requestAnimationFrame(step);

    return {
        stop() {
            running = false;
            if (raf !== null) { cancelAnimationFrame(raf); }
        },
    };
}

/**
 * Animate a modal sheet with transform + border-radius.
 * @param {HTMLElement} el
 * @param {{ y?: number, radius?: number }} target
 * @param {object} [opts]
 * @returns {{ stop: () => void }}
 */
export function springModal(el, target, opts = {}) {
    const fromY = parseTranslateY(el.style.transform || getComputedStyle(el).transform);
    const fromR = parseRadius(el.style.borderRadius || getComputedStyle(el).borderRadius);
    const toY = target.y ?? fromY;
    const toR = target.radius ?? fromR;

    const currentR = parseRadius(el.style.borderRadius || getComputedStyle(el).borderRadius);

    const ySpring = spring(fromY, toY, (v) => {
        el.style.transform = `translateY(${v}px)`;
        el.style.borderRadius = `${currentR}px ${currentR}px 0 0`;
    }, { ...opts, onFinish: () => {
        el.style.transform = `translateY(${toY}px)`;
        el.style.borderRadius = `${toR}px ${toR}px 0 0`;
        opts.onFinish?.();
    }});

    return ySpring;
}

function parseTranslateY(transform) {
    if (!transform || transform === 'none') { return 0; }
    const match = transform.match(/translateY\(([-\d.]+)px\)/);
    return match ? parseFloat(match[1]) : 0;
}

function parseRadius(radius) {
    if (!radius) { return 0; }
    const match = radius.match(/([-\d.]+)px/);
    return match ? parseFloat(match[1]) : 0;
}
