/**
 * Haptic feedback helpers.
 *
 * navigator.vibrate() covers Android/other browsers that implement the
 * Vibration API. iOS Safari has never supported it and there is no public
 * Taptic Engine API for web content — but since Safari 18, WebKit fires a
 * real haptic tap when a native `<input type="checkbox" switch>` control is
 * toggled, including via a programmatic click() on its associated <label>.
 * We keep one hidden switch in the DOM and flip it alongside every vibrate()
 * call, so iOS gets a best-effort tick for free.
 *
 * This is NOT a stable API: it's a side effect of a real control, not a
 * feedback primitive Apple committed to, and Apple has already started
 * restricting programmatic triggering (tightened further in iOS 26.5). Every
 * interaction that calls this module also has its own visual spring/scale
 * feedback in CSS — treat this as a bonus layered on top of that, never as
 * the only feedback for an interaction.
 */

let iosSwitchLabel = null;

function getIOSSwitch() {
    if (iosSwitchLabel) {return iosSwitchLabel;}
    if (typeof document === 'undefined' || !document.body) {return null;}

    const label = document.createElement('label');
    label.setAttribute('aria-hidden', 'true');
    Object.assign(label.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '1px',
        height: '1px',
        padding: '0',
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0,0,0,0)',
        whiteSpace: 'nowrap',
        border: '0',
        pointerEvents: 'none',
    });

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.tabIndex = -1;

    label.appendChild(input);
    document.body.appendChild(label);
    iosSwitchLabel = label;
    return label;
}

function tickIOSHaptic() {
    try {
        getIOSSwitch()?.click();
    } catch {
        // Best-effort only — never let an unsupported/blocked trick break a tap flow.
    }
}

function vibrate(pattern) {
    try {
        navigator.vibrate?.(pattern);
    } catch {
        // Some browsers throw when called outside a user gesture; ignore.
    }
    tickIOSHaptic();
}

/** fallback silently if neither the Vibration API nor the iOS switch trick is available. */
export const haptics = {
    light: () => vibrate(10),
    success: () => vibrate([10, 30, 10]),
    warning: () => vibrate([50, 50, 50, 50]),
};
