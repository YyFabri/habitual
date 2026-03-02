"use client";

import { useHabits, useHabitLogs, useBatchUpdateHabits, useUpdateUserProfile, useDeleteHabit } from "@/hooks/useHabits";
import { useHabitStore } from "@/store/useHabitStore";
import { useUserStore } from "@/store/useUserStore";
import { HabitCard } from "./HabitCard";
import { EmptyState } from "./EmptyState";
import { HabitMenu } from "./HabitMenu";
import { getDayIndex, formatFunctionalDate } from "@/utils/functionalDate";
import { cn } from "@/lib/utils";
import { ChevronDown, Pencil, ChevronUp, Check, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { Habit, HabitLog } from "@/types/types";
import { Input } from "@/components/ui/input";
import { hapticTap, hapticSuccess } from "@/utils/haptics";

export function HabitList() {
    const { data: habits, isLoading: habitsLoading } = useHabits();
    const { data: logs, isLoading: logsLoading } = useHabitLogs();
    const batchUpdate = useBatchUpdateHabits();
    const updateProfile = useUpdateUserProfile();
    const deleteHabit = useDeleteHabit();

    const user = useUserStore((s) => s.user);
    const { selectedDate, setEditingHabitId, setShowNewHabitDialog } = useHabitStore();
    const [menuAnchor, setMenuAnchor] = useState<{ habit: Habit; el: HTMLElement } | null>(null);

    const dayOfWeek = getDayIndex(selectedDate);
    const selectedDateStr = formatFunctionalDate(selectedDate);

    // Filter habits by frequency for the selected day
    const todayHabits = useMemo(() => {
        if (!habits) return [];
        return habits.filter((h) => {
            // 1. Frequency Check
            if (!h.frequency.includes(dayOfWeek)) return false;

            // 2. Creation Date Check (Don't show in past before creation)
            const createdDateStr = formatFunctionalDate(new Date(h.createdAt));
            if (createdDateStr > selectedDateStr) return false;

            // 3. Archive Date Check (Show in past if active then)
            if (h.archived) {
                // If soft deleted, use archivedAt if available.
                // If migrated without archivedAt, use 'now' or hide? 
                // We added archivedAt to new deletes. Old deletes? 
                // Old deletes are hard deleted (gone).
                // Existing active habits have archived=false.
                if (!h.archivedAt) return false; // Should not happen for new archives

                const archivedDateStr = formatFunctionalDate(new Date(h.archivedAt));
                // Hide if archived ON or BEFORE selected date (viewing day of deletion or later)
                // If view date < archive date, show it.
                // e.g. View Yesterday < Archive Today -> Show.
                // View Today == Archive Today -> Hide.
                if (selectedDateStr >= archivedDateStr) return false;
            }

            return true;
        });
    }, [habits, dayOfWeek, selectedDateStr]);

    // Group habits by their groups
    const groupedHabits = useMemo(() => {
        const groupMap = new Map<string, Habit[]>();

        todayHabits.forEach((habit) => {
            const groups = habit.groups && habit.groups.length > 0 ? habit.groups : ["General"];
            groups.forEach((group) => {
                if (!groupMap.has(group)) {
                    groupMap.set(group, []);
                }
                groupMap.get(group)!.push(habit);
            });
        });

        // Determine group order
        const groupsOrder = user?.groupsOrder || [];
        const currentGroupNames = Array.from(groupMap.keys());

        const sorted = currentGroupNames.sort((a, b) => {
            const indexA = groupsOrder.indexOf(a);
            const indexB = groupsOrder.indexOf(b);

            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;

            if (a === "General") return -1;
            if (b === "General") return 1;

            return a.localeCompare(b);
        });

        return sorted.map(g => [g, groupMap.get(g)!] as [string, Habit[]]);
    }, [todayHabits, user?.groupsOrder]);

    const logsMap = useMemo(() => {
        const map = new Map<string, HabitLog>();
        logs?.forEach((log) => map.set(log.habitId, log));
        return map;
    }, [logs]);

    const isLoading = habitsLoading || logsLoading;

    // Progress stats
    const completedCount = todayHabits.filter((h) => {
        const log = logsMap.get(h.id);
        return (log?.value ?? 0) >= h.objective;
    }).length;

    const totalCount = todayHabits.length;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
    const isPerfectDay = totalCount > 0 && completedCount === totalCount;

    // handlers
    const handleMoveGroup = (groupName: string, direction: "up" | "down") => {
        hapticTap();
        const currentOrder = user?.groupsOrder ? [...user.groupsOrder] : [];
        const displayedGroups = groupedHabits.map(g => g[0]);
        let newOrder = currentOrder.length > 0 ? currentOrder : displayedGroups;

        displayedGroups.forEach(g => {
            if (!newOrder.includes(g)) newOrder.push(g);
        });

        const index = newOrder.indexOf(groupName);
        if (index === -1) return;

        if (direction === "up" && index > 0) {
            [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
        } else if (direction === "down" && index < newOrder.length - 1) {
            [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
        }

        updateProfile.mutate({ groupsOrder: newOrder });
    };

    const handleMoveHabit = (habit: Habit, direction: "up" | "down") => {
        hapticTap();
        const habitId = habit.id;
        const groupEntry = groupedHabits.find(([, habits]) => habits.some(h => h.id === habitId));
        if (!groupEntry) return;

        const groupHabitsList = groupEntry[1];
        const sorted = [...groupHabitsList].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        const currentIndex = sorted.findIndex(h => h.id === habitId);
        if (currentIndex === -1) return;

        let targetIndex = -1;
        if (direction === "up" && currentIndex > 0) targetIndex = currentIndex - 1;
        if (direction === "down" && currentIndex < sorted.length - 1) targetIndex = currentIndex + 1;

        if (targetIndex !== -1) {
            const updates = sorted.map((h, i) => ({ id: h.id, data: { order: i } }));
            [updates[currentIndex].data.order, updates[targetIndex].data.order] =
                [updates[targetIndex].data.order, updates[currentIndex].data.order];
            batchUpdate.mutate(updates);
        }
    };

    const handleRenameGroup = (oldName: string, newName: string) => {
        if (!newName.trim() || oldName === newName) return;
        hapticSuccess();

        const groupHabitsList = groupedHabits.find(g => g[0] === oldName)?.[1] || [];
        const habitUpdates = groupHabitsList.map(h => {
            const newGroups = (h.groups || []).map(g => g === oldName ? newName : g);
            return { id: h.id, data: { groups: newGroups } };
        });
        batchUpdate.mutate(habitUpdates);

        if (user?.groupsOrder?.includes(oldName)) {
            const newOrder = user.groupsOrder.map(g => g === oldName ? newName : g);
            updateProfile.mutate({ groupsOrder: newOrder });
        }
    };

    const handleDeleteHabit = (habit: Habit) => {
        if (confirm("¿Estás seguro de que querés eliminar este hábito?")) {
            hapticTap();
            deleteHabit.mutate(habit.id);
        }
    };

    const handleEditHabit = (habit: Habit) => {
        setEditingHabitId(habit.id);
        setShowNewHabitDialog(true);
    };

    const handleOpenMenu = (habit: Habit, el: HTMLElement) => {
        setMenuAnchor({ habit, el });
    };

    if (isLoading) {
        return (
            <div className="px-4 py-2 max-w-lg mx-auto space-y-3">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="h-[76px] rounded-3xl bg-card animate-pulse"
                    />
                ))}
            </div>
        );
    }

    if (!habits?.length || todayHabits.length === 0) {
        return <EmptyState hasAnyHabits={(habits?.length ?? 0) > 0} />;
    }

    const hasOnlyGeneral = groupedHabits.length === 1 && groupedHabits[0][0] === "General";

    return (
        <div className="px-4 py-2 max-w-lg mx-auto space-y-3 pb-24">
            {/* Progress summary */}
            <div className="flex items-center gap-3 px-1">
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                        className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <span className="text-xs font-medium text-muted-foreground tabular-nums min-w-fit">
                    {completedCount}/{totalCount}
                </span>
            </div>

            {/* Perfect day celebration */}
            {isPerfectDay && (
                <div className="text-center py-3 animate-[bubble-pop_0.5s_ease-out]">
                    <p className="text-lg font-bold">🎉 ¡Día Perfecto!</p>
                    <p className="text-xs text-muted-foreground">
                        Completaste todos tus hábitos de hoy
                    </p>
                </div>
            )}

            <div className="space-y-4">
                {groupedHabits.map(([groupName, groupHabits], index) => (
                    <GroupSection
                        key={groupName}
                        groupName={groupName}
                        habits={groupHabits}
                        logsMap={logsMap}
                        isFirst={index === 0}
                        isLast={index === groupedHabits.length - 1}
                        onMoveGroup={handleMoveGroup}
                        onRenameGroup={handleRenameGroup}
                        onOpenMenu={handleOpenMenu}
                        showControls={!hasOnlyGeneral || groupName !== "General"}
                    />
                ))}
            </div>

            {/* Floating Menu Portal */}
            {menuAnchor && (
                <HabitMenu
                    habit={menuAnchor.habit}
                    anchor={menuAnchor.el}
                    onClose={() => setMenuAnchor(null)}
                    onEdit={handleEditHabit}
                    onMove={handleMoveHabit}
                    onDelete={handleDeleteHabit}
                />
            )}
        </div>
    );
}

// ─── Collapsible Group Section ─────────────────────────────────────

function GroupSection({
    groupName,
    habits,
    logsMap,
    isFirst,
    isLast,
    onMoveGroup,
    onRenameGroup,
    onOpenMenu,
    showControls
}: {
    groupName: string;
    habits: Habit[];
    logsMap: Map<string, HabitLog>;
    isFirst: boolean;
    isLast: boolean;
    onMoveGroup: (name: string, dir: "up" | "down") => void;
    onRenameGroup: (old: string, newName: string) => void;
    onOpenMenu: (habit: Habit, el: HTMLElement) => void;
    showControls: boolean;
}) {
    const [isOpen, setIsOpen] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [tempName, setTempName] = useState(groupName);

    const completedInGroup = habits.filter((h) => {
        const log = logsMap.get(h.id);
        return (log?.value ?? 0) >= h.objective;
    }).length;

    const handleSaveLink = (e: React.MouseEvent) => {
        e.stopPropagation();
        onRenameGroup(groupName, tempName);
        setIsEditing(false);
    };

    const handleCancelEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setTempName(groupName);
        setIsEditing(false);
    };

    return (
        <div className="rounded-3xl bg-card/50 overflow-hidden bubble-shadow">
            {/* Group Header */}
            <div
                onClick={() => !isEditing && setIsOpen(!isOpen)}
                className={cn(
                    "w-full flex items-center justify-between px-4 py-3 cursor-pointer",
                    "hover:bg-accent/30 transition-colors active:scale-[0.99]"
                )}
            >
                <div className="flex items-center gap-2 flex-1">
                    <ChevronDown
                        className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0",
                            !isOpen && "-rotate-90"
                        )}
                    />

                    {isEditing ? (
                        <div className="flex items-center gap-2 flex-1 max-w-[200px]" onClick={e => e.stopPropagation()}>
                            <Input
                                value={tempName}
                                onChange={e => setTempName(e.target.value)}
                                className="h-7 text-sm"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        onRenameGroup(groupName, tempName);
                                        setIsEditing(false);
                                    }
                                }}
                            />
                            <button onClick={handleSaveLink} className="p-1 text-green-500 hover:bg-green-500/10 rounded">
                                <Check size={14} />
                            </button>
                            <button onClick={handleCancelEdit} className="p-1 text-red-500 hover:bg-red-500/10 rounded">
                                <X size={14} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 group/title">
                            <span className="text-sm font-semibold">{groupName}</span>
                            {/* Edit Button - Always visible now */}
                            <button
                                onClick={(e) => { e.stopPropagation(); setTempName(groupName); setIsEditing(true); }}
                                className="p-1 text-muted-foreground/50 hover:text-primary transition-colors"
                            >
                                <Pencil size={12} />
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {!isEditing && (
                        <div className="flex items-center mr-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); onMoveGroup(groupName, "up"); }}
                                disabled={isFirst}
                                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                            >
                                <ChevronUp size={16} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onMoveGroup(groupName, "down"); }}
                                disabled={isLast}
                                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                            >
                                <ChevronDown size={16} />
                            </button>
                        </div>
                    )}

                    <span className="text-xs text-muted-foreground tabular-nums">
                        {completedInGroup}/{habits.length}
                    </span>
                </div>
            </div>

            {/* Group Content */}
            <div
                className={cn(
                    "transition-all duration-300 ease-in-out overflow-hidden",
                    isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
                )}
            >
                <div className="space-y-2 px-2 pb-2">
                    {habits.map((habit, i) => (
                        <div
                            key={habit.id}
                            style={{ animationDelay: `${i * 50}ms` }}
                            className="animate-[slide-up_0.3s_ease-out_both]"
                        >
                            <HabitCard
                                habit={habit}
                                log={logsMap.get(habit.id)}
                                onOpenMenu={onOpenMenu}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
