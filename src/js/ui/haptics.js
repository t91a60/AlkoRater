/** Haptic feedback helpers — fallback silently if Vibration API unavailable. */
export const haptics = {
    light: () => { if (navigator.vibrate) {navigator.vibrate(10);} },
    success: () => { if (navigator.vibrate) {navigator.vibrate([10, 30, 10]);} },
    warning: () => { if (navigator.vibrate) {navigator.vibrate([50, 50, 50, 50]);} },
};
