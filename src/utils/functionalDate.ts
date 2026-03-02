import { FUNCTIONAL_DAY_HOUR } from "@/types/types";

/**
 * "Functional Day" rule: the day doesn't change at midnight (00:00),
 * it changes at 3:00 AM. So if it's 2:50 AM Tuesday, the functional
 * date is still Monday.
 *
 * Implementation: subtract FUNCTIONAL_DAY_HOUR hours, then take
 * start-of-day.
 */
export function getFunctionalDate(date: Date = new Date()): Date {
    const adjusted = new Date(date.getTime());
    adjusted.setHours(adjusted.getHours() - FUNCTIONAL_DAY_HOUR);
    // Reset to noon — using noon (not midnight) avoids re-subtraction
    // pushing the date back a day when this Date passes through
    // formatFunctionalDate again.
    adjusted.setHours(12, 0, 0, 0);
    return adjusted;
}

/**
 * Formats a date as YYYY-MM-DD string using functional date logic
 */
export function formatFunctionalDate(date: Date = new Date()): string {
    const fd = getFunctionalDate(date);
    const y = fd.getFullYear();
    const m = String(fd.getMonth() + 1).padStart(2, "0");
    const d = String(fd.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

/**
 * Returns a human-readable label for the given functional date:
 * "Hoy", "Ayer", or the day name in Spanish.
 */
export function getFunctionalDayLabel(date: Date = new Date()): string {
    const today = getFunctionalDate(new Date());
    const target = getFunctionalDate(date);

    const todayStr = formatDateRaw(today);
    const targetStr = formatDateRaw(target);

    if (todayStr === targetStr) return "Hoy";

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (formatDateRaw(yesterday) === targetStr) return "Ayer";

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (formatDateRaw(tomorrow) === targetStr) return "Mañana";

    return getDayName(target);
}

/**
 * Returns an array of 7 dates (Mon-Sun) for the week containing
 * the given reference date.
 */
export function getWeekDays(referenceDate: Date = new Date()): Date[] {
    const fd = getFunctionalDate(referenceDate);
    // getDay() returns 0=Sun, we want 0=Mon
    const dayOfWeek = fd.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(fd);
    monday.setDate(fd.getDate() + mondayOffset);
    monday.setHours(12, 0, 0, 0);

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
        const day = new Date(monday);
        day.setDate(monday.getDate() + i);
        days.push(day);
    }
    return days;
}

/**
 * Get the day-of-week index (0=Mon...6=Sun) from a date
 */
export function getDayIndex(date: Date): number {
    const d = date.getDay();
    return d === 0 ? 6 : d - 1; // Convert Sun=0 to Sun=6
}

/**
 * Get Spanish short day name
 */
export function getShortDayName(date: Date): string {
    const names = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
    return names[getDayIndex(date)];
}

/**
 * Get Spanish full day name
 */
export function getDayName(date: Date): string {
    const names = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    return names[getDayIndex(date)];
}

/**
 * Get current month and year in a readable format
 */
export function getMonthYear(date: Date): string {
    const months = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

// ─── Internal Helpers ────────────────────────────────────────
function formatDateRaw(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}
