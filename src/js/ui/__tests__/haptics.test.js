import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { haptics } from '../haptics.js';

describe('optional web vibration', () => {
    beforeEach(() => {
        localStorage.clear();
    });
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('does not vibrate without explicit opt-in', () => {
        const vibrate = vi.fn();
        vi.stubGlobal('navigator', { vibrate });
        haptics.light();
        expect(vibrate).not.toHaveBeenCalled();
    });

    it('uses short feedback only when enabled and supported', () => {
        const vibrate = vi.fn();
        vi.stubGlobal('navigator', { vibrate });
        localStorage.setItem('alkorater:haptics', 'true');
        haptics.light();
        expect(vibrate).toHaveBeenCalledWith(10);
    });

    it('works without a vibration API or when it refuses the request', () => {
        localStorage.setItem('alkorater:haptics', 'true');
        vi.stubGlobal('navigator', {});
        expect(() => haptics.success()).not.toThrow();
        vi.stubGlobal('navigator', {
            vibrate: () => {
                throw new Error('Unavailable');
            },
        });
        expect(() => haptics.warning()).not.toThrow();
    });
});
