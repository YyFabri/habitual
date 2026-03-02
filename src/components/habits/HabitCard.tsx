import { Habit, HabitLog } from "@/types/types";
import { useToggleHabitLog } from "@/hooks/useHabits";
import { useCallback, useRef } from "react";
import { Check, Star, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { SegmentedCircle } from "./SegmentedCircle";
import { hapticTap, hapticSuccess } from "@/utils/haptics";
import { fireConfetti } from "@/utils/confetti";
import { HABIT_COLORS } from "@/types/types";
import { ICON_MAP } from "@/utils/habitIcons";

interface HabitCardProps {
    habit: Habit;
    log?: HabitLog;
    onOpenMenu: (habit: Habit, anchor: HTMLElement) => void;
}

export function HabitCard({ habit, log, onOpenMenu }: HabitCardProps) {
    const toggleMutation = useToggleHabitLog();
    const cardRef = useRef<HTMLButtonElement>(null);

    const currentValue = log?.value ?? 0;
    const isComplete = currentValue >= habit.objective;
    const Icon = ICON_MAP[habit.icon] ?? Star;

    // Get the hex color for the SVG
    const colorData = HABIT_COLORS.find((c) => c.value === habit.color);
    const hexColor = colorData?.hex ?? "#c09ce0";

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

    const progressText =
        habit.type === "simple"
            ? isComplete
                ? "¡Hecho!"
                : "Toca para completar"
            : `${currentValue} / ${habit.objective}`;

    return (
        <div className="relative group">
            <button
                ref={cardRef}
                onClick={handleTap}
                disabled={toggleMutation.isPending}
                className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-3xl transition-all duration-300 pr-14", // Added padding right
                    "bg-card bubble-shadow hover:bubble-shadow-lg",
                    "active:scale-[0.97] disabled:opacity-70",
                    isComplete && "ring-2 ring-offset-2 ring-offset-background",
                    "animate-[fade-in_0.3s_ease-out]"
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
                    <h3
                        className={cn(
                            "font-semibold text-sm truncate transition-all duration-300",
                            isComplete && "line-through opacity-60"
                        )}
                    >
                        {habit.name}
                    </h3>
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

            {/* Context Menu Trigger */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    hapticTap();
                    onOpenMenu(habit, e.currentTarget);
                }}
                className="absolute top-1/2 -translate-y-1/2 right-3 p-2 text-muted-foreground/50 hover:text-foreground hover:bg-black/5 rounded-full transition-colors z-20"
            >
                <MoreVertical size={18} />
            </button>
        </div>
    );
}
