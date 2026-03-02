import confetti from "canvas-confetti";

/**
 * Fires a celebratory confetti burst 🎉
 * Used when a habit is completed at 100%.
 */
export function fireConfetti(): void {
    const defaults = {
        spread: 80,
        ticks: 80,
        gravity: 1.2,
        decay: 0.92,
        startVelocity: 25,
        colors: [
            "#f0a0c0", // pink
            "#8cb8e0", // blue
            "#8cd4a8", // green
            "#e8d480", // yellow
            "#c09ce0", // purple
            "#e8b080", // orange
        ],
    };

    // Two bursts from left and right for a full effect
    confetti({
        ...defaults,
        particleCount: 30,
        origin: { x: 0.3, y: 0.7 },
        angle: 60,
    });

    confetti({
        ...defaults,
        particleCount: 30,
        origin: { x: 0.7, y: 0.7 },
        angle: 120,
    });
}

/**
 * Small, subtle confetti for counter progress
 */
export function fireSmallConfetti(originX: number = 0.5, originY: number = 0.5): void {
    confetti({
        particleCount: 15,
        spread: 50,
        startVelocity: 15,
        ticks: 50,
        gravity: 1.5,
        origin: { x: originX, y: originY },
        colors: ["#c09ce0", "#8cb8e0", "#8cd4a8"],
    });
}
