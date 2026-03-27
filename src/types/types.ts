import { z } from "zod";

// ─── Constants ───────────────────────────────────────────────
export const MAX_FREE_HABITS = 5;
export const FUNCTIONAL_DAY_HOUR = 3; // Day changes at 3:00 AM

// ─── Habit Colors ────────────────────────────────────────────
export const HABIT_COLORS = [
  { name: "Rosa", value: "pastel-pink", hex: "#f0a0c0" },
  { name: "Azul", value: "pastel-blue", hex: "#8cb8e0" },
  { name: "Verde", value: "pastel-green", hex: "#8cd4a8" },
  { name: "Amarillo", value: "pastel-yellow", hex: "#e8d480" },
  { name: "Púrpura", value: "pastel-purple", hex: "#c09ce0" },
  { name: "Naranja", value: "pastel-orange", hex: "#e8b080" },
  { name: "Rojo", value: "pastel-red", hex: "#d88080" },
  { name: "Teal", value: "pastel-teal", hex: "#80c8d0" },
] as const;

// Premium-only extra colors
export const PREMIUM_EXTRA_COLORS = [
  { name: "Coral", value: "premium-coral", hex: "#ff7675" },
  { name: "Lavanda", value: "premium-lavender", hex: "#a29bfe" },
  { name: "Menta", value: "premium-mint", hex: "#55efc4" },
  { name: "Durazno", value: "premium-peach", hex: "#fdcb6e" },
  { name: "Cielo", value: "premium-sky", hex: "#74b9ff" },
  { name: "Fucsia", value: "premium-fuchsia", hex: "#e84393" },
  { name: "Lima", value: "premium-lime", hex: "#00b894" },
  { name: "Índigo", value: "premium-indigo", hex: "#6c5ce7" },
] as const;

export type HabitColor = (typeof HABIT_COLORS)[number]["value"] | (typeof PREMIUM_EXTRA_COLORS)[number]["value"] | `custom-${string}`;

// Helper to resolve any color value to its hex
export function resolveColorHex(color: string): string {
  const base = HABIT_COLORS.find(c => c.value === color);
  if (base) return base.hex;
  const premium = PREMIUM_EXTRA_COLORS.find(c => c.value === color);
  if (premium) return premium.hex;
  if (color.startsWith("custom-")) return color.replace("custom-", "#");
  return "#c09ce0"; // fallback
}

// ─── Habit Icons ─────────────────────────────────────────────
export const HABIT_ICONS = [
  "heart", "star", "zap", "flame", "droplets", "dumbbell",
  "book-open", "pencil", "music", "coffee", "apple", "moon",
  "sun", "brain", "target", "trophy", "smile", "leaf",
  "bike", "footprints", "bed", "pill", "glass-water", "salad",
] as const;

export type HabitIcon = (typeof HABIT_ICONS)[number];

// ─── Habit Type ──────────────────────────────────────────────
export type HabitType = "simple" | "counter";

// ─── Habit Priority ──────────────────────────────────────────
export type HabitPriority = "low" | "medium" | "high";

// ─── Frequency Types ─────────────────────────────────────────
export type FrequencyType = "weekly" | "every_x_days" | "specific_dates" | "x_per_week";

// ─── Sub-Task (Premium) ─────────────────────────────────────
export interface SubTask {
  id: string;
  text: string;
  notes?: string;
  completed: boolean;
}

// ─── Interfaces ──────────────────────────────────────────────
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isPremium: boolean;
  isAnonymous: boolean;
  createdAt: string; // ISO string
  groupsOrder: string[]; // Order of group names for display
  dayChangeHour?: number; // Hour of day when "today" changes (default 3)
  streakShields?: number; // Premium: number of streak shields available
  themeColor?: string; // Premium: custom theme hex color
}

export interface Habit {
  id: string;
  userId: string;
  name: string;
  icon: HabitIcon;
  color: HabitColor;
  type: HabitType;
  // ─── Frequency ────────────────────────────
  frequencyType: FrequencyType; // default "weekly"
  frequency: number[]; // for "weekly": 0=Mon..6=Sun; for "x_per_week": [count]
  frequencyInterval?: number; // for "every_x_days": interval in days
  frequencyStartDate?: string; // for "every_x_days": anchor date (YYYY-MM-DD)
  frequencySpecificDates?: string[]; // for "specific_dates": array of YYYY-MM-DD
  // ─── Core ─────────────────────────────────
  objective: number; // 1 for simple, N for counter
  groups: string[];
  priority?: HabitPriority;
  notes?: string; // User notes/instructions for the habit
  archived: boolean;
  archivedAt?: string; // ISO string for soft delete
  createdAt: string; // ISO string
  order: number;
  groupOrders?: Record<string, number>;
  // ─── Premium Features ─────────────────────
  subtasks?: SubTask[]; // Premium: internal checklist
  pausedAt?: string; // Premium: when the habit was paused (ISO)
  pausedUntil?: string; // Premium: when the pause ends (ISO)
}

export interface HabitLog {
  id: string;
  habitId: string;
  value: number; // 0 or 1 for simple, 0..N for counter
  date: string; // YYYY-MM-DD (functional date)
  createdAt: string; // ISO string
  shieldUsed?: boolean; // Premium: streak shield was used on this day
}

// ─── Zod Schemas ─────────────────────────────────────────────
export const habitSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(50, "Máximo 50 caracteres"),
  icon: z.string().min(1, "Seleccioná un icono"),
  color: z.string().min(1, "Seleccioná un color"),
  type: z.enum(["simple", "counter"]),
  frequencyType: z.enum(["weekly", "every_x_days", "specific_dates", "x_per_week"]).default("weekly"),
  frequency: z.array(z.number().min(0)).default([0, 1, 2, 3, 4, 5, 6]),
  frequencyInterval: z.number().min(2).max(365).optional(),
  frequencyStartDate: z.string().optional(),
  frequencySpecificDates: z.array(z.string()).optional(),
  objective: z.number().min(1, "El objetivo debe ser al menos 1").max(100),
  groups: z.array(z.string()).min(1, "Seleccioná al menos un grupo").default(["General"]),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  notes: z.string().max(500, "Máximo 500 caracteres").optional(),
  subtasks: z.array(z.object({
    id: z.string(),
    text: z.string(),
    notes: z.string().max(250, "Máximo 250 caracteres").optional(),
    completed: z.boolean(),
  })).optional(),
});

export type HabitFormData = z.infer<typeof habitSchema>;

// ─── Error Types ─────────────────────────────────────────────
export class PremiumRequiredError extends Error {
  constructor() {
    super("Has alcanzado el límite de hábitos gratuitos. ¡Actualiza a Premium!");
    this.name = "PremiumRequiredError";
  }
}
