import { describe, it, expect, vi } from 'vitest';
import { debounce } from '../debounce.js';

describe('debounce', () => {
    it('powinien opóźnić wykonanie funkcji', () => {
        vi.useFakeTimers();
        const func = vi.fn();
        const debouncedFunc = debounce(func, 100);

        debouncedFunc();
        expect(func).not.toBeCalled();

        vi.advanceTimersByTime(50);
        expect(func).not.toBeCalled();

        vi.advanceTimersByTime(50);
        expect(func).toBeCalledTimes(1);

        vi.useRealTimers();
    });

    it('powinien wywołać funkcję tylko raz przy wielokrotnym kliknięciu', () => {
        vi.useFakeTimers();
        const func = vi.fn();
        const debouncedFunc = debounce(func, 100);

        debouncedFunc();
        debouncedFunc();
        debouncedFunc();

        vi.advanceTimersByTime(100);
        expect(func).toBeCalledTimes(1);

        vi.useRealTimers();
    });
});
