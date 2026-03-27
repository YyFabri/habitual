"use client";

import { useHabits } from "@/hooks/useHabits";
import { useQuery } from "@tanstack/react-query";
import { habitRepository } from "@/repositories/FirestoreHabitRepository";
import { useUserStore } from "@/store/useUserStore";
import { formatFunctionalDate, getDayIndex } from "@/utils/functionalDate";
import { ICON_MAP } from "@/utils/habitIcons";
import { resolveColorHex, Habit } from "@/types/types";
import { useMemo } from "react";
import { Flame, Target, CalendarDays, TrendingUp, Trophy } from "lucide-react";

export function StatisticsHub() {
    const { data: habits, isLoading: habitsLoading } = useHabits();
    const user = useUserStore((s) => s.user);

    // Fetch all logs to calculate stats
    const { data: allLogs, isLoading: logsLoading } = useQuery({
        queryKey: ["all-logs", user?.uid],
        queryFn: async () => {
            if (!user?.uid) return [];
            // Assuming we have a way to get all logs, or we fetch the last 365 days
            // The Firestore repo has getHabitLogs by date, but maybe we need a new method to get all?
            // Since we don't have getALLHabitLogs in the hook, let's fetch past 90 days for now or we can build a new query.
            // Let's actually fetch all logs for the user ordered by date.
            return habitRepository.getAllHabitLogs(user.uid);
        },
        enabled: !!user?.uid,
        staleTime: 1000 * 60 * 30, // 30 minutes — this is an expensive query
        refetchOnWindowFocus: false,
    });

    const isLoading = habitsLoading || logsLoading;

    // Calculate stats per habit
    const stats = useMemo(() => {
        if (!habits || !allLogs) return null;

        const today = new Date();
        const todayStr = formatFunctionalDate(today);

        let totalCompletions = 0;
        let globalCurrentStreak = 0;

        const habitStats = habits.map(habit => {
            const habitLogs = allLogs.filter(l => l.habitId === habit.id && l.value >= habit.objective);
            // Sort dates descending (newest first)
            const sortedDates = habitLogs.map(l => l.date).sort().reverse();

            totalCompletions += sortedDates.length;

            // Simple streak calculation (doesn't account for frequency yet, just consecutive days it was scheduled AND completed)
            // A more accurate calculation would check if it was completed on the days it was supposed to be done.
            let currentStreak = 0;
            let maxStreak = 0;
            let tempStreak = 0;

            // To do this right, we need to generate a list of days since habit creation
            // where the habit was scheduled (frequency matches day of week).
            const createdDate = new Date(habit.createdAt);
            const scheduledDays = [];
            for (let d = new Date(createdDate); d <= today; d.setDate(d.getDate() + 1)) {
                if (habit.frequency.includes(getDayIndex(d))) {
                    scheduledDays.push(formatFunctionalDate(d));
                }
            }

            // Reverse so we check from today backwards for current streak
            scheduledDays.reverse();

            for (const schedDay of scheduledDays) {
                if (sortedDates.includes(schedDay)) {
                    tempStreak++;
                    if (tempStreak > maxStreak) maxStreak = tempStreak;
                } else if (schedDay !== todayStr) {
                    // Missed a past scheduled day, break streak
                    // We don't break if today is missed because the user still has time
                    if (currentStreak === 0) {
                        currentStreak = tempStreak;
                    }
                    tempStreak = 0;
                }
            }
            if (currentStreak === 0) {
                currentStreak = tempStreak;
            }

            const totalScheduled = scheduledDays.length || 1;
            const completionRate = Math.round((sortedDates.length / totalScheduled) * 100);

            return {
                habit,
                currentStreak,
                maxStreak,
                completionRate: Math.min(completionRate, 100),
                totalCompletions: sortedDates.length,
            };
        });

        // Sort by completion rate
        habitStats.sort((a, b) => b.completionRate - a.completionRate);

        return {
            totalCompletions,
            habitStats,
            activeHabits: habits.filter(h => !h.archived).length,
        };
    }, [habits, allLogs]);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="h-24 bg-card rounded-3xl animate-pulse"></div>
                <div className="h-32 bg-card rounded-3xl animate-pulse"></div>
                <div className="h-32 bg-card rounded-3xl animate-pulse"></div>
            </div>
        );
    }

    if (!stats || !habits || habits.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <Trophy className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                <p>No hay datos suficientes para mostrar estadísticas.</p>
                <p className="text-sm mt-1">¡Comienza a registrar tus hábitos!</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Global Stats Overview */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-card rounded-3xl p-4 bubble-shadow flex flex-col items-center justify-center text-center">
                    <div className="h-10 w-10 rounded-full bg-pastel-purple/20 flex items-center justify-center mb-2">
                        <Target className="h-5 w-5 text-purple-600" />
                    </div>
                    <span className="text-2xl font-bold">{stats.activeHabits}</span>
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Hábitos Activos</span>
                </div>
                <div className="bg-card rounded-3xl p-4 bubble-shadow flex flex-col items-center justify-center text-center">
                    <div className="h-10 w-10 rounded-full bg-pastel-green/20 flex items-center justify-center mb-2">
                        <CalendarDays className="h-5 w-5 text-emerald-600" />
                    </div>
                    <span className="text-2xl font-bold">{stats.totalCompletions}</span>
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Completados</span>
                </div>
            </div>

            {/* Individual Habit Stats */}
            <div className="space-y-4 pt-2">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Progreso por Hábito
                </h2>

                <div className="space-y-3">
                    {stats.habitStats.map((stat) => {
                        const Icon = ICON_MAP[stat.habit.icon] ?? Trophy;
                        const hexColor = resolveColorHex(stat.habit.color);

                        return (
                            <div key={stat.habit.id} className="bg-card rounded-3xl p-4 bubble-shadow">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="h-10 w-10 rounded-full flex items-center justify-center shadow-sm"
                                            style={{ backgroundColor: hexColor + '20', color: hexColor }}
                                        >
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-sm">{stat.habit.name}</h3>
                                            <p className="text-xs text-muted-foreground">
                                                {stat.totalCompletions} veces
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-bold text-lg" style={{ color: hexColor }}>
                                            {stat.completionRate}%
                                        </span>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Éxito</p>
                                    </div>
                                </div>

                                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mb-4">
                                    <div
                                        className="h-full rounded-full transition-all"
                                        style={{ width: `${stat.completionRate}%`, backgroundColor: hexColor }}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-accent/50 rounded-2xl p-2.5 flex items-center gap-2">
                                        <Flame className="h-4 w-4 text-orange-500" />
                                        <div>
                                            <p className="text-[10px] text-muted-foreground uppercase leading-tight">Racha Actual</p>
                                            <p className="font-semibold text-sm leading-tight">{stat.currentStreak} d</p>
                                        </div>
                                    </div>
                                    <div className="bg-accent/50 rounded-2xl p-2.5 flex items-center gap-2">
                                        <Trophy className="h-4 w-4 text-yellow-500" />
                                        <div>
                                            <p className="text-[10px] text-muted-foreground uppercase leading-tight">Mejor Racha</p>
                                            <p className="font-semibold text-sm leading-tight">{stat.maxStreak} d</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
