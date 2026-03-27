import type { IHabitRepository } from "./IHabitRepository";
import type { Habit, HabitLog, HabitFormData, User } from "@/types/types";
import { MAX_FREE_HABITS, PremiumRequiredError } from "@/types/types";
import * as habitService from "@/services/habitService";
import type { HabitColor, HabitIcon } from "@/types/types";

/**
 * Firestore implementation of IHabitRepository.
 * Enforces business rules (e.g., freemium limits) before delegating
 * to the raw service layer.
 */
export class FirestoreHabitRepository implements IHabitRepository {
    // ─── User ────────────────────────────────────────────────

    async getUserProfile(userId: string): Promise<User | null> {
        return habitService.getUserProfile(userId);
    }

    async createUserProfile(user: Partial<User> & { uid: string }): Promise<void> {
        return habitService.createUserProfile(user);
    }

    async updateUserProfile(userId: string, data: Partial<User>): Promise<void> {
        return habitService.updateUserProfile(userId, data);
    }

    // ─── Habits ──────────────────────────────────────────────

    async getHabits(userId: string): Promise<Habit[]> {
        return habitService.getHabits(userId);
    }

    async createHabit(
        userId: string,
        data: HabitFormData,
        order: number
    ): Promise<Habit> {
        // ── Freemium enforcement ──
        const userProfile = await this.getUserProfile(userId);
        if (!userProfile?.isPremium) {
            const existingHabits = await this.getHabits(userId);
            if (existingHabits.length >= MAX_FREE_HABITS) {
                throw new PremiumRequiredError();
            }
        }

        return habitService.createHabit(userId, {
            name: data.name,
            icon: data.icon as HabitIcon,
            color: data.color as HabitColor,
            type: data.type,
            frequencyType: data.frequencyType ?? "weekly",
            frequency: data.frequency,
            frequencyInterval: data.frequencyInterval,
            frequencyStartDate: data.frequencyStartDate,
            frequencySpecificDates: data.frequencySpecificDates,
            objective: data.type === "simple" ? 1 : data.objective,
            groups: data.groups,
            notes: data.notes,
            subtasks: data.subtasks,
            archived: false,
            order,
        });
    }

    async updateHabit(userId: string, habitId: string, data: Partial<Habit>): Promise<void> {
        return habitService.updateHabit(userId, habitId, data);
    }

    async batchUpdateHabits(userId: string, updates: { id: string; data: Partial<Habit> }[]): Promise<void> {
        return habitService.batchUpdateHabits(userId, updates);
    }

    async deleteHabit(userId: string, habitId: string): Promise<void> {
        // Smart delete: archive only if the habit has completion history
        const hasLogs = await habitService.hasHabitLogs(userId, habitId);
        if (hasLogs) {
            return habitService.deleteHabit(userId, habitId); // soft delete (archive)
        } else {
            return habitService.hardDeleteHabit(userId, habitId); // hard delete
        }
    }

    // ─── Logs ────────────────────────────────────────────────

    async getAllHabitLogs(userId: string): Promise<HabitLog[]> {
        return habitService.getAllHabitLogs(userId);
    }

    async getHabitLogs(userId: string, date: string): Promise<HabitLog[]> {
        return habitService.getHabitLogs(userId, date);
    }

    async upsertHabitLog(
        userId: string,
        habitId: string,
        date: string,
        value: number
    ): Promise<HabitLog> {
        return habitService.upsertHabitLog(userId, habitId, date, value);
    }

    async deleteHabitLog(userId: string, logId: string): Promise<void> {
        return habitService.deleteHabitLog(userId, logId);
    }
}

// Singleton instance
export const habitRepository = new FirestoreHabitRepository();
