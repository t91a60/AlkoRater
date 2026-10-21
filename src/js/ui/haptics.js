function vibrate(pattern) {
    try {
        if (localStorage.getItem('alkorater:haptics') !== 'true') {
            return;
        }
        navigator.vibrate?.(pattern);
    } catch {
        // Haptics are optional; visible feedback must work without them.
    }
}

export const haptics = {
    light: () => vibrate(10),
    success: () => vibrate([10, 30, 10]),
    warning: () => vibrate([50, 50, 50, 50]),
};
