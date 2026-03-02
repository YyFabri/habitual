/**
 * Trigger haptic feedback if available (mobile PWA).
 * Falls back silently on unsupported devices.
 */
export function triggerHaptic(pattern: number | number[] = 50): void {
    try {
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            navigator.vibrate(pattern);
        }
    } catch {
        // Vibrate API not supported — fail silently
    }
}

/** Short tap feedback */
export function hapticTap(): void {
    triggerHaptic(30);
}

/** Success feedback (two short taps) */
export function hapticSuccess(): void {
    triggerHaptic([40, 30, 40]);
}

/** Heavy feedback */
export function hapticHeavy(): void {
    triggerHaptic(80);
}
