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

export type HabitColor = (typeof HABIT_COLORS)[number]["value"];

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
}

export interface Habit {
  id: string;
  userId: string;
  name: string;
  icon: HabitIcon;
  color: HabitColor;
  type: HabitType;
  frequency: number[]; // 0=Mon, 1=Tue...6=Sun
  objective: number; // 1 for simple, N for counter
  groups: string[];
  priority?: HabitPriority;
  archived: boolean;
  archivedAt?: string; // ISO string for soft delete
  createdAt: string; // ISO string
  order: number;
}

export interface HabitLog {
  id: string;
  habitId: string;
  value: number; // 0 or 1 for simple, 0..N for counter
  date: string; // YYYY-MM-DD (functional date)
  createdAt: string; // ISO string
}

// ─── Zod Schemas ─────────────────────────────────────────────
export const habitSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(50, "Máximo 50 caracteres"),
  icon: z.string().min(1, "Seleccioná un icono"),
  color: z.string().min(1, "Seleccioná un color"),
  type: z.enum(["simple", "counter"]),
  frequency: z.array(z.number().min(0).max(6)).min(1, "Seleccioná al menos un día"),
  objective: z.number().min(1, "El objetivo debe ser al menos 1").max(100),
  groups: z.array(z.string()).min(1, "Seleccioná al menos un grupo").default(["General"]),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

export type HabitFormData = z.infer<typeof habitSchema>;

// ─── Error Types ─────────────────────────────────────────────
export class PremiumRequiredError extends Error {
  constructor() {
    super("Has alcanzado el límite de hábitos gratuitos. ¡Actualiza a Premium!");
    this.name = "PremiumRequiredError";
  }
}
