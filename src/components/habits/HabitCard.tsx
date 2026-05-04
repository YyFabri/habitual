import { Habit, HabitLog, resolveColorHex, type SubTask } from "@/types/types";
import { useToggleHabitLog, useUpdateHabit } from "@/hooks/useHabits";
import { useCallback, useRef, useState, useMemo } from "react";
import { Check, Star, MoreVertical, FileText, ChevronDown, ListChecks, Square, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { SegmentedCircle } from "./SegmentedCircle";
import { hapticTap, hapticSuccess } from "@/utils/haptics";
import { fireConfetti } from "@/utils/confetti";
import { ICON_MAP } from "@/utils/habitIcons";

interface HabitCardProps {
    habit: Habit;
    log?: HabitLog;
    onOpenMenu: (habit: Habit, anchor: HTMLElement) => void;
}

export function HabitCard({ habit, log, onOpenMenu }: HabitCardProps) {
    const toggleMutation = useToggleHabitLog();
    const updateHabit = useUpdateHabit();
    const cardRef = useRef<HTMLButtonElement>(null);
    const [expanded, setExpanded] = useState(false);
    const [expandedSubtaskNotes, setExpandedSubtaskNotes] = useState<Set<string>>(new Set());

    const currentValue = log?.value ?? 0;
    const isComplete = currentValue >= habit.objective;
    const Icon = ICON_MAP[habit.icon] ?? Star;

    // Get the hex color for the SVG
    const hexColor = resolveColorHex(habit.color);

    const hasDetails = !!habit.notes || (habit.subtasks && habit.subtasks.length > 0);
    const subtasksDone = habit.subtasks?.filter((s) => s.completed).length ?? 0;
    const subtasksTotal = habit.subtasks?.length ?? 0;

    const handleTap = useCallback(() => {
        hapticTap();

        const willBeComplete =
            habit.type === "simple"
                ? currentValue < 1
                : currentValue + 1 >= habit.objective;

        toggleMutation.mutate({
            habit,
            currentValue,
        });

        // Fire confetti when completing
        if (willBeComplete && !isComplete) {
            setTimeout(() => {
                hapticSuccess();
                fireConfetti();
            }, 150);
        }
    }, [habit, currentValue, isComplete, toggleMutation]);

    const handleToggleSubtask = useCallback((subtaskId: string) => {
        hapticTap();
        if (!habit.subtasks) return;
        const updatedSubtasks = habit.subtasks.map((st) =>
            st.id === subtaskId ? { ...st, completed: !st.completed } : st
        );
        updateHabit.mutate({
            habitId: habit.id,
            data: { subtasks: updatedSubtasks },
        });
    }, [habit.id, habit.subtasks, updateHabit]);

    const handleToggleExpand = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        hapticTap();
        setExpanded((prev) => !prev);
    }, []);

    const progressText =
        habit.type === "simple"
            ? isComplete
                ? "¡Hecho!"
                : "Toca para completar"
            : `${currentValue} / ${habit.objective}`;

    return (
        <div className="relative group">
            {/* Main card area */}
            <button
                ref={cardRef}
                onClick={handleTap}
                disabled={toggleMutation.isPending}
                className={cn(
                    "w-full flex items-center gap-4 p-4 transition-all duration-300 pr-14",
                    "bg-card bubble-shadow hover:bubble-shadow-lg",
                    "active:scale-[0.97] disabled:opacity-70",
                    isComplete && "ring-2 ring-offset-2 ring-offset-background",
                    "animate-[fade-in_0.3s_ease-out]",
                    expanded ? "rounded-t-3xl rounded-b-none" : "rounded-3xl"
                )}
                style={{
                    // @ts-expect-error -- CSS custom property
                    "--tw-ring-color": isComplete ? hexColor : "transparent",
                }}
            >
                {/* Circle progress + icon */}
                <div className="relative flex-shrink-0">
                    <SegmentedCircle
                        value={currentValue}
                        objective={habit.objective}
                        size={56}
                        strokeWidth={4}
                        color={hexColor}
                    />
                    {/* Icon centered inside circle */}
                    <div
                        className={cn(
                            "absolute inset-0 flex items-center justify-center transition-all duration-300",
                            isComplete && "scale-110"
                        )}
                    >
                        {isComplete ? (
                            <div
                                className="h-7 w-7 rounded-full flex items-center justify-center animate-[confetti-pop_0.5s_ease-out]"
                                style={{ backgroundColor: hexColor }}
                            >
                                <Check className="h-4 w-4 text-white" strokeWidth={3} />
                            </div>
                        ) : (
                            <Icon
                                className="h-5 w-5 transition-colors duration-300"
                                style={{ color: hexColor }}
                            />
                        )}
                    </div>
                </div>

                {/* Text content */}
                <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-1.5">
                        <h3
                            className={cn(
                                "font-semibold text-sm truncate transition-all duration-300",
                                isComplete && "line-through opacity-60"
                            )}
                        >
                            {habit.name}
                        </h3>
                        {habit.notes && (
                            <FileText className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />
                        )}
                        {subtasksTotal > 0 && (
                            <span className={cn(
                                "text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0",
                                subtasksDone === subtasksTotal
                                    ? "bg-emerald-500/10 text-emerald-600"
                                    : "bg-muted text-muted-foreground"
                            )}>
                                {subtasksDone}/{subtasksTotal}
                            </span>
                        )}
                    </div>
                    <p
                        className={cn(
                            "text-xs mt-0.5 transition-colors duration-300",
                            isComplete ? "text-emerald-500 font-medium" : "text-muted-foreground"
                        )}
                    >
                        {progressText}
                    </p>
                </div>
            </button>

            {/* Expand/collapse button (only if has details) */}
            {hasDetails && (
                <button
                    onClick={handleToggleExpand}
                    className={cn(
                        "absolute right-10 p-1.5 text-muted-foreground/40 hover:text-foreground hover:bg-black/5 rounded-full transition-all z-20",
                        expanded ? "top-4" : "top-1/2 -translate-y-1/2"
                    )}
                >
                    <ChevronDown
                        size={16}
                        className={cn(
                            "transition-transform duration-200",
                            expanded && "rotate-180"
                        )}
                    />
                </button>
            )}

            {/* Context Menu Trigger */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    hapticTap();
                    onOpenMenu(habit, e.currentTarget);
                }}
                className={cn(
                    "absolute right-3 p-2 text-muted-foreground/50 hover:text-foreground hover:bg-black/5 rounded-full transition-colors z-20",
                    expanded ? "top-3.5" : "top-1/2 -translate-y-1/2"
                )}
            >
                <MoreVertical size={18} />
            </button>

            {/* ─── Expanded Details Section ──────────────────────── */}
            <div
                className={cn(
                    "overflow-hidden transition-all duration-300 ease-in-out",
                    expanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                )}
            >
                <div className="bg-card rounded-b-3xl px-4 pb-4 pt-1 space-y-3 border-t border-border/30">
                    {/* Notes */}
                    {habit.notes && (
                        <div className="animate-[fade-in_0.2s_ease-out]">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notas</span>
                            </div>
                            <p className="text-sm text-foreground/80 leading-relaxed bg-muted/30 rounded-2xl px-3.5 py-2.5 whitespace-pre-wrap">
                                {habit.notes}
                            </p>
                        </div>
                    )}

                    {/* Subtasks */}
                    {habit.subtasks && habit.subtasks.length > 0 && (
                        <div className="animate-[fade-in_0.2s_ease-out]">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <ListChecks className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    Sub-tareas ({subtasksDone}/{subtasksTotal})
                                </span>
                            </div>
                            <div className="space-y-1">
                                {habit.subtasks.map((st: SubTask) => (
                                    <button
                                        key={st.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleSubtask(st.id);
                                        }}
                                        className={cn(
                                            "w-full flex items-start gap-2.5 px-3 py-2 rounded-xl transition-all",
                                            "hover:bg-accent/50 active:scale-[0.98]",
                                            st.completed && "opacity-60"
                                        )}
                                    >
                                        {st.completed ? (
                                            <CheckSquare
                                                className="h-4.5 w-4.5 mt-0.5 flex-shrink-0 transition-colors"
                                                style={{ color: hexColor }}
                                            />
                                        ) : (
                                            <Square className="h-4.5 w-4.5 mt-0.5 flex-shrink-0 text-muted-foreground/40" />
                                        )}
                                        <div className="flex-1 text-left min-w-0">
                                            <p className={cn(
                                                "text-sm transition-all",
                                                st.completed && "line-through text-muted-foreground"
                                            )}>
                                                {st.text}
                                            </p>
                                            {st.notes && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setExpandedSubtaskNotes(prev => {
                                                            const next = new Set(prev);
                                                            if (next.has(st.id)) next.delete(st.id);
                                                            else next.add(st.id);
                                                            return next;
                                                        });
                                                    }}
                                                    className="text-left w-full group/note"
                                                >
                                                    <p className={cn(
                                                        "text-[10px] text-muted-foreground mt-0.5 transition-all",
                                                        !expandedSubtaskNotes.has(st.id) && "line-clamp-2"
                                                    )}>
                                                        {st.notes}
                                                    </p>
                                                    <span className="text-[9px] text-primary/60 group-hover/note:text-primary transition-colors">
                                                        {expandedSubtaskNotes.has(st.id) ? "Ver menos" : "Ver más"}
                                                    </span>
                                                </button>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
