import type { Habit, HabitLog, HabitFormData, User } from "@/types/types";

/**
 * Repository interface for habit operations.
 * This abstraction allows swapping the backend (Firebase, Supabase, etc.)
 * without changing any business logic or UI code.
 */
export interface IHabitRepository {
    // User
    getUserProfile(userId: string): Promise<User | null>;
    createUserProfile(user: Partial<User> & { uid: string }): Promise<void>;
    updateUserProfile(userId: string, data: Partial<User>): Promise<void>;

    // Habits
    getHabits(userId: string): Promise<Habit[]>;
    createHabit(userId: string, data: HabitFormData, order: number): Promise<Habit>;
    updateHabit(userId: string, habitId: string, data: Partial<Habit>): Promise<void>;
    batchUpdateHabits(userId: string, updates: { id: string; data: Partial<Habit> }[]): Promise<void>;
    deleteHabit(userId: string, habitId: string): Promise<void>;

    // Logs
    getHabitLogs(userId: string, date: string): Promise<HabitLog[]>;
    upsertHabitLog(userId: string, habitId: string, date: string, value: number): Promise<HabitLog>;
    deleteHabitLog(userId: string, logId: string): Promise<void>;
}
