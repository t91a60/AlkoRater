import { afterEach, describe, expect, it, vi } from 'vitest';
import { spring, springModal } from '../../utils/spring.js';

afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
});

describe('interruptible sheet motion', () => {
    it.each([50, 64])(
        'settles with %i ms frames instead of oscillating indefinitely',
        (frameTime) => {
            let frame;
            let settled = false;
            const positions = [];
            vi.stubGlobal('requestAnimationFrame', (callback) => {
                frame = callback;
                return 1;
            });
            spring(500, 0, (value) => positions.push(value), {
                stiffness: 320,
                damping: 30,
                mass: 0.8,
                onFinish: () => {
                    settled = true;
                },
            });
            for (let time = 0; time <= 4000 && !settled; time += frameTime) {
                frame(time);
            }
            expect(settled).toBe(true);
            expect(positions.at(-1)).toBe(0);
            expect(Math.max(...positions.map(Math.abs))).toBeLessThanOrEqual(500);
        },
    );

    it('does not overwrite CSS corner radii for a transform-only sheet', () => {
        let frame;
        vi.stubGlobal('requestAnimationFrame', (callback) => {
            frame = callback;
            return 1;
        });
        const el = document.createElement('div');
        document.body.appendChild(el);
        springModal(el, { y: 0 });
        frame(16);
        expect(el.style.borderRadius).toBe('');
        expect(el.style.transform).toBe('translateY(0px)');
    });

    it('stopping a spring prevents a queued frame from writing later', () => {
        let frame;
        const cancel = vi.fn();
        vi.stubGlobal('requestAnimationFrame', (callback) => {
            frame = callback;
            return 1;
        });
        vi.stubGlobal('cancelAnimationFrame', cancel);
        const update = vi.fn();
        const motion = spring(100, 0, update);
        motion.stop();
        frame(16);
        expect(cancel).toHaveBeenCalledWith(1);
        expect(update).not.toHaveBeenCalled();
    });
});
