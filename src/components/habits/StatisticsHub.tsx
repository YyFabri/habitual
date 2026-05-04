"use client";

import { useHabits } from "@/hooks/useHabits";
import { useQuery } from "@tanstack/react-query";
import { habitRepository } from "@/repositories/FirestoreHabitRepository";
import { useUserStore } from "@/store/useUserStore";
import { formatFunctionalDate, getDayIndex } from "@/utils/functionalDate";
import { ICON_MAP } from "@/utils/habitIcons";
import { resolveColorHex, Habit } from "@/types/types";
import { useMemo, useState } from "react";
import { Flame, Target, CalendarDays, TrendingUp, Trophy, ChevronDown, Star, Zap, Award } from "lucide-react";
import { cn } from "@/lib/utils";

// Mini heatmap — last 7 weeks (7×7 grid)
function WeeklyHeatmap({ habitLogs, habit }: { habitLogs: Set<string>; habit: Habit }) {
    const hexColor = resolveColorHex(habit.color);
    const today = new Date();
    const cells: { date: string; completed: boolean; isToday: boolean }[] = [];

    // Build 7 weeks (49 days) from today backwards
    for (let i = 48; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = formatFunctionalDate(d);
        cells.push({
            date: dateStr,
            completed: habitLogs.has(dateStr),
            isToday: i === 0,
        });
    }

    return (
        <div className="grid grid-cols-7 gap-[3px]">
            {cells.map((cell) => (
                <div
                    key={cell.date}
                    title={cell.date}
                    className={cn(
                        "w-full aspect-square rounded-[3px] transition-all",
                        cell.isToday && "ring-1 ring-foreground/30"
                    )}
                    style={{
                        backgroundColor: cell.completed ? hexColor : 'var(--muted)',
                        opacity: cell.completed ? 1 : 0.3,
                    }}
                />
            ))}
        </div>
    );
}

// Circular progress ring
function ProgressRing({ percent, color, size = 56 }: { percent: number; color: string; size?: number }) {
    const strokeWidth = 5;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;

    return (
        <svg width={size} height={size} className="transform -rotate-90">
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-muted/50"
            />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
            />
        </svg>
    );
}

export function StatisticsHub() {
    const { data: habits, isLoading: habitsLoading } = useHabits();
    const user = useUserStore((s) => s.user);
    const [expandedHabit, setExpandedHabit] = useState<string | null>(null);

    // Fetch all logs to calculate stats
    const { data: allLogs, isLoading: logsLoading } = useQuery({
        queryKey: ["all-logs", user?.uid],
        queryFn: async () => {
            if (!user?.uid) return [];
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
        let bestOverallStreak = 0;
        let totalScheduledDays = 0;
        let totalCompletedDays = 0;

        const habitStats = habits.map(habit => {
            const habitLogs = allLogs.filter(l => l.habitId === habit.id && l.value >= habit.objective);
            // Sort dates descending (newest first)
            const sortedDates = habitLogs.map(l => l.date).sort().reverse();
            const completedDatesSet = new Set(sortedDates);

            totalCompletions += sortedDates.length;

            // Calculate streaks accounting for scheduled days
            let currentStreak = 0;
            let maxStreak = 0;
            let tempStreak = 0;

            const createdDate = new Date(habit.createdAt);
            const scheduledDays: string[] = [];
            for (let d = new Date(createdDate); d <= today; d.setDate(d.getDate() + 1)) {
                if (habit.frequency.includes(getDayIndex(d))) {
                    scheduledDays.push(formatFunctionalDate(d));
                }
            }

            totalScheduledDays += scheduledDays.length;
            totalCompletedDays += sortedDates.length;

            // Reverse so we check from today backwards for current streak
            scheduledDays.reverse();

            for (const schedDay of scheduledDays) {
                if (sortedDates.includes(schedDay)) {
                    tempStreak++;
                    if (tempStreak > maxStreak) maxStreak = tempStreak;
                } else if (schedDay !== todayStr) {
                    if (currentStreak === 0) {
                        currentStreak = tempStreak;
                    }
                    tempStreak = 0;
                }
            }
            if (currentStreak === 0) {
                currentStreak = tempStreak;
            }

            if (maxStreak > bestOverallStreak) bestOverallStreak = maxStreak;

            const totalScheduled = scheduledDays.length || 1;
            const completionRate = Math.round((sortedDates.length / totalScheduled) * 100);

            // Last 7 days completion
            const last7 = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                last7.push(formatFunctionalDate(d));
            }
            const last7Completed = last7.filter(d => completedDatesSet.has(d)).length;
            const last7Scheduled = last7.filter(d => {
                const dt = new Date(d + "T12:00:00");
                return habit.frequency.includes(getDayIndex(dt));
            }).length;
            const weeklyRate = last7Scheduled > 0 ? Math.round((last7Completed / last7Scheduled) * 100) : 0;

            return {
                habit,
                currentStreak,
                maxStreak,
                completionRate: Math.min(completionRate, 100),
                weeklyRate: Math.min(weeklyRate, 100),
                totalCompletions: sortedDates.length,
                completedDatesSet,
            };
        });

        // Sort by completion rate
        habitStats.sort((a, b) => b.completionRate - a.completionRate);

        const overallRate = totalScheduledDays > 0
            ? Math.round((totalCompletedDays / totalScheduledDays) * 100)
            : 0;

        return {
            totalCompletions,
            bestOverallStreak,
            overallRate: Math.min(overallRate, 100),
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

    // Find best habit
    const bestHabit = stats.habitStats[0];
    const bestHabitColor = bestHabit ? resolveColorHex(bestHabit.habit.color) : undefined;

    return (
        <div className="space-y-6">
            {/* ─── Global Overview ─────────────────────────── */}
            <div className="bg-card rounded-3xl bubble-shadow p-5">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Resumen General</h2>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Zap className="h-3.5 w-3.5 text-amber-500" />
                        {stats.overallRate}% éxito
                    </div>
                </div>

                {/* Progress ring + main stats */}
                <div className="flex items-center gap-5">
                    <div className="relative flex-shrink-0">
                        <ProgressRing percent={stats.overallRate} color="hsl(var(--primary))" size={80} />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-lg font-bold">{stats.overallRate}%</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 flex-1">
                        <div>
                            <p className="text-2xl font-bold">{stats.activeHabits}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Activos</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{stats.totalCompletions}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Completados</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{stats.bestOverallStreak}<span className="text-sm font-normal text-muted-foreground">d</span></p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Mejor Racha</p>
                        </div>
                        <div>
                            {bestHabit && (
                                <>
                                    <p className="text-lg font-bold truncate" style={{ color: bestHabitColor }}>{bestHabit.habit.name}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Top Hábito</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Podium: Top 3 Habits ───────────────────── */}
            {stats.habitStats.length >= 3 && (
                <div className="bg-card rounded-3xl bubble-shadow p-5">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Award className="h-4 w-4 text-amber-500" />
                        Top 3 Hábitos
                    </h2>
                    <div className="flex items-end justify-center gap-3">
                        {/* 2nd place */}
                        <PodiumItem stat={stats.habitStats[1]} place={2} />
                        {/* 1st place */}
                        <PodiumItem stat={stats.habitStats[0]} place={1} />
                        {/* 3rd place */}
                        <PodiumItem stat={stats.habitStats[2]} place={3} />
                    </div>
                </div>
            )}

            {/* ─── Individual Habit Stats ─────────────────── */}
            <div className="space-y-4 pt-2">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Detalle por Hábito
                </h2>

                <div className="space-y-3">
                    {stats.habitStats.map((stat) => {
                        const Icon = ICON_MAP[stat.habit.icon] ?? Trophy;
                        const hexColor = resolveColorHex(stat.habit.color);
                        const isExpanded = expandedHabit === stat.habit.id;

                        return (
                            <div key={stat.habit.id} className="bg-card rounded-3xl bubble-shadow overflow-hidden">
                                {/* Header row */}
                                <button
                                    onClick={() => setExpandedHabit(isExpanded ? null : stat.habit.id)}
                                    className="w-full flex items-center gap-3 p-4 transition-all hover:bg-accent/30 active:scale-[0.99]"
                                >
                                    <div
                                        className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0"
                                        style={{ backgroundColor: hexColor + '20', color: hexColor }}
                                    >
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                        <h3 className="font-semibold text-sm truncate">{stat.habit.name}</h3>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-700 ease-out"
                                                    style={{ width: `${stat.completionRate}%`, backgroundColor: hexColor }}
                                                />
                                            </div>
                                            <span className="text-xs font-semibold tabular-nums flex-shrink-0" style={{ color: hexColor }}>
                                                {stat.completionRate}%
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronDown
                                        className={cn(
                                            "h-4 w-4 text-muted-foreground/50 flex-shrink-0 transition-transform duration-200",
                                            isExpanded && "rotate-180"
                                        )}
                                    />
                                </button>

                                {/* Expanded details */}
                                <div className={cn(
                                    "overflow-hidden transition-all duration-300 ease-in-out",
                                    isExpanded ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
                                )}>
                                    <div className="px-4 pb-4 pt-1 space-y-4 border-t border-border/30">
                                        {/* Streak + stats grid */}
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="bg-accent/50 rounded-2xl p-3 text-center">
                                                <Flame className="h-4 w-4 text-orange-500 mx-auto mb-1" />
                                                <p className="font-bold text-lg leading-tight">{stat.currentStreak}</p>
                                                <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Racha</p>
                                            </div>
                                            <div className="bg-accent/50 rounded-2xl p-3 text-center">
                                                <Trophy className="h-4 w-4 text-amber-500 mx-auto mb-1" />
                                                <p className="font-bold text-lg leading-tight">{stat.maxStreak}</p>
                                                <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Mejor</p>
                                            </div>
                                            <div className="bg-accent/50 rounded-2xl p-3 text-center">
                                                <CalendarDays className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
                                                <p className="font-bold text-lg leading-tight">{stat.totalCompletions}</p>
                                                <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Total</p>
                                            </div>
                                        </div>

                                        {/* Weekly performance */}
                                        <div className="flex items-center justify-between bg-accent/30 rounded-2xl px-3 py-2.5">
                                            <span className="text-xs text-muted-foreground">Última semana</span>
                                            <div className="flex items-center gap-2">
                                                <div className="h-1.5 w-20 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all"
                                                        style={{ width: `${stat.weeklyRate}%`, backgroundColor: hexColor }}
                                                    />
                                                </div>
                                                <span className="text-xs font-semibold tabular-nums" style={{ color: hexColor }}>
                                                    {stat.weeklyRate}%
                                                </span>
                                            </div>
                                        </div>

                                        {/* Mini heatmap */}
                                        <div>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
                                                Actividad — últimas 7 semanas
                                            </p>
                                            <WeeklyHeatmap habitLogs={stat.completedDatesSet} habit={stat.habit} />
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

// Podium item sub-component
function PodiumItem({ stat, place }: { stat: { habit: Habit; completionRate: number; currentStreak: number }; place: 1 | 2 | 3 }) {
    const Icon = ICON_MAP[stat.habit.icon] ?? Star;
    const hexColor = resolveColorHex(stat.habit.color);
    const heights = { 1: "h-24", 2: "h-16", 3: "h-12" };
    const medals = { 1: "🥇", 2: "🥈", 3: "🥉" };
    const sizes = { 1: "h-12 w-12", 2: "h-10 w-10", 3: "h-10 w-10" };

    return (
        <div className="flex flex-col items-center gap-2 flex-1">
            <div
                className={cn("rounded-full flex items-center justify-center", sizes[place])}
                style={{ backgroundColor: hexColor + '20', color: hexColor }}
            >
                <Icon className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-center truncate max-w-full px-1">{stat.habit.name}</p>
            <div
                className={cn(
                    "w-full rounded-t-2xl flex flex-col items-center justify-end pb-2 transition-all",
                    heights[place]
                )}
                style={{ backgroundColor: hexColor + '15' }}
            >
                <span className="text-lg">{medals[place]}</span>
                <span className="text-xs font-bold" style={{ color: hexColor }}>{stat.completionRate}%</span>
            </div>
        </div>
    );
}
