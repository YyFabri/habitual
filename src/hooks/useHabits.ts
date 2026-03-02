import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { habitRepository } from "@/repositories/FirestoreHabitRepository";
import { useUserStore } from "@/store/useUserStore";
import { useHabitStore } from "@/store/useHabitStore";
import { queryKeys } from "./queryKeys";
import { formatFunctionalDate } from "@/utils/functionalDate";
import { PremiumRequiredError } from "@/types/types";
import type { Habit, HabitLog, HabitFormData } from "@/types/types";

// ─── Queries ─────────────────────────────────────────────────

export function useHabits() {
    const user = useUserStore((s) => s.user);

    return useQuery<Habit[]>({
        queryKey: queryKeys.habits.all(user?.uid ?? ""),
        queryFn: () => habitRepository.getHabits(user!.uid),
        enabled: !!user?.uid,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

export function useHabitLogs(date?: Date) {
    const user = useUserStore((s) => s.user);
    const selectedDate = useHabitStore((s) => s.selectedDate);
    const targetDate = date ?? selectedDate;
    const dateStr = formatFunctionalDate(targetDate);

    return useQuery<HabitLog[]>({
        queryKey: queryKeys.logs.byDate(user?.uid ?? "", dateStr),
        queryFn: () => habitRepository.getHabitLogs(user!.uid, dateStr),
        enabled: !!user?.uid,
        staleTime: 1000 * 60 * 2,
    });
}

// ─── Mutations ───────────────────────────────────────────────

export function useCreateHabit() {
    const queryClient = useQueryClient();
    const user = useUserStore((s) => s.user);
    const setShowUpgradeModal = useHabitStore((s) => s.setShowUpgradeModal);

    return useMutation<Habit, Error, HabitFormData>({
        mutationFn: async (data) => {
            if (!user) throw new Error("No autenticado");

            // Get current count for order
            const existing = await habitRepository.getHabits(user.uid);
            return habitRepository.createHabit(user.uid, data, existing.length);
        },
        onSuccess: () => {
            if (user) {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.habits.all(user.uid),
                });
            }
        },
        onError: (error) => {
            if (error instanceof PremiumRequiredError) {
                setShowUpgradeModal(true);
            }
        },
    });
}

export function useUpdateHabit() {
    const queryClient = useQueryClient();
    const user = useUserStore((s) => s.user);

    return useMutation<void, Error, { habitId: string; data: Partial<Habit> }>({
        mutationFn: async ({ habitId, data }) => {
            if (!user) throw new Error("No autenticado");
            return habitRepository.updateHabit(user.uid, habitId, data);
        },
        onSuccess: () => {
            if (user) {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.habits.all(user.uid),
                });
            }
        },
    });
}

export function useDeleteHabit() {
    const queryClient = useQueryClient();
    const user = useUserStore((s) => s.user);

    return useMutation<void, Error, string>({
        mutationFn: async (habitId) => {
            if (!user) throw new Error("No autenticado");
            return habitRepository.deleteHabit(user.uid, habitId);
        },
        onSuccess: () => {
            if (user) {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.habits.all(user.uid),
                });
            }
        },
    });
}

export function useToggleHabitLog() {
    const queryClient = useQueryClient();
    const user = useUserStore((s) => s.user);
    const selectedDate = useHabitStore((s) => s.selectedDate);

    return useMutation<
        HabitLog,
        Error,
        { habit: Habit; currentValue: number; date?: Date },
        { previousLogs: HabitLog[] | undefined; key: readonly string[] } | undefined
    >({
        mutationFn: async ({ habit, currentValue, date }) => {
            if (!user) throw new Error("No autenticado");
            const targetDate = date ?? selectedDate;
            const dateStr = formatFunctionalDate(targetDate);

            let newValue: number;
            if (habit.type === "simple") {
                // Toggle between 0 and 1
                newValue = currentValue >= 1 ? 0 : 1;
            } else {
                // Counter: increment, wrap to 0 if at objective
                newValue = currentValue >= habit.objective ? 0 : currentValue + 1;
            }

            return habitRepository.upsertHabitLog(user.uid, habit.id, dateStr, newValue);
        },
        // Optimistic update for instant feedback
        onMutate: async ({ habit, currentValue, date }) => {
            if (!user) return undefined;
            const targetDate = date ?? selectedDate;
            const dateStr = formatFunctionalDate(targetDate);
            const key = queryKeys.logs.byDate(user.uid, dateStr);

            await queryClient.cancelQueries({ queryKey: key });
            const previousLogs = queryClient.getQueryData<HabitLog[]>(key);

            let newValue: number;
            if (habit.type === "simple") {
                newValue = currentValue >= 1 ? 0 : 1;
            } else {
                newValue = currentValue >= habit.objective ? 0 : currentValue + 1;
            }

            const logId = `${habit.id}_${dateStr}`;

            queryClient.setQueryData<HabitLog[]>(key, (old = []) => {
                const existing = old.find((l) => l.habitId === habit.id);
                if (existing) {
                    return old.map((l) =>
                        l.habitId === habit.id ? { ...l, value: newValue } : l
                    );
                }
                return [
                    ...old,
                    {
                        id: logId,
                        habitId: habit.id,
                        value: newValue,
                        date: dateStr,
                        createdAt: new Date().toISOString(),
                    },
                ];
            });

            return { previousLogs, key: key as unknown as readonly string[] };
        },
        onError: (_err, _vars, context) => {
            // Rollback on error
            if (context?.previousLogs && context.key) {
                queryClient.setQueryData(context.key, context.previousLogs);
            }
        },
        onSettled: () => {
            if (user) {
                const dateStr = formatFunctionalDate(selectedDate);
                queryClient.invalidateQueries({
                    queryKey: queryKeys.logs.byDate(user.uid, dateStr),
                });
            }
        },
    });
}

export function useBatchUpdateHabits() {
    const queryClient = useQueryClient();
    const user = useUserStore((s) => s.user);

    return useMutation<void, Error, { id: string; data: Partial<Habit> }[]>({
        mutationFn: async (updates) => {
            if (!user) throw new Error("No autenticado");
            return habitRepository.batchUpdateHabits(user.uid, updates);
        },
        onSuccess: () => {
            if (user) {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.habits.all(user.uid),
                });
            }
        },
    });
}

export function useUpdateUserProfile() {
    const user = useUserStore((s) => s.user);
    const setUser = useUserStore((s) => s.setUser);

    return useMutation<void, Error, Partial<import("@/types/types").User>>({
        mutationFn: async (data) => {
            if (!user) throw new Error("No autenticado");
            return habitRepository.updateUserProfile(user.uid, data);
        },
        onSuccess: (_, variables) => {
            if (user) {
                // Optimistic update of local store
                setUser({ ...user, ...variables });
            }
        },
    });
}
