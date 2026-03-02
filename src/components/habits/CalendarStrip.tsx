"use client";

import { useHabitStore } from "@/store/useHabitStore";
import {
    getShortDayName,
    formatFunctionalDate,
    getFunctionalDate,
} from "@/utils/functionalDate";
import { hapticTap } from "@/utils/haptics";
import { cn } from "@/lib/utils";
import { useRef, useMemo, useCallback, useEffect, useState } from "react";

// How many days to render in each direction from center
const BUFFER_DAYS = 30;
const DAY_WIDTH = 52; // px per day column (including gap)

function addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    d.setHours(12, 0, 0, 0);
    return d;
}

export function CalendarStrip() {
    const { selectedDate, setSelectedDate } = useHabitStore();
    const scrollRef = useRef<HTMLDivElement>(null);
    const isInitialScroll = useRef(true);
    const [centerDate, setCenterDate] = useState(() => new Date(selectedDate));

    const todayStr = formatFunctionalDate(new Date());
    const selectedStr = formatFunctionalDate(selectedDate);

    // Generate a window of days around the center date
    const days = useMemo(() => {
        const result: Date[] = [];
        for (let i = -BUFFER_DAYS; i <= BUFFER_DAYS; i++) {
            result.push(addDays(centerDate, i));
        }
        return result;
    }, [centerDate]);

    // Scroll to selected date on mount and when center changes
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        // Find the index of the selected date
        const selectedIdx = days.findIndex(
            (d) => formatFunctionalDate(d) === selectedStr
        );
        if (selectedIdx === -1) return;

        const scrollTarget = selectedIdx * DAY_WIDTH - el.clientWidth / 2 + DAY_WIDTH / 2;

        if (isInitialScroll.current) {
            el.scrollLeft = scrollTarget;
            isInitialScroll.current = false;
        } else {
            el.scrollTo({ left: scrollTarget, behavior: "smooth" });
        }
    }, [days, selectedStr]);

    // Extend the window when scrolling near edges
    const handleScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;

        const maxScroll = el.scrollWidth - el.clientWidth;
        const threshold = DAY_WIDTH * 5; // 5 days from edge

        if (el.scrollLeft < threshold) {
            // Near left edge → shift center left
            setCenterDate((prev) => addDays(prev, -BUFFER_DAYS));
            // Adjust scroll position to compensate
            el.scrollLeft += BUFFER_DAYS * DAY_WIDTH;
        } else if (el.scrollLeft > maxScroll - threshold) {
            // Near right edge → shift center right
            setCenterDate((prev) => addDays(prev, BUFFER_DAYS));
            el.scrollLeft -= BUFFER_DAYS * DAY_WIDTH;
        }
    }, []);

    const goToToday = useCallback(() => {
        hapticTap();
        const today = getFunctionalDate();
        setSelectedDate(today);
        setCenterDate(today);
        isInitialScroll.current = true;
    }, [setSelectedDate]);

    return (
        <div className="py-3">
            <div className="max-w-lg mx-auto">
                {/* "Go to today" button */}
                {selectedStr !== todayStr && (
                    <div className="flex justify-center mb-2 px-4">
                        <button
                            className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full hover:bg-primary/20 transition-all active:scale-95"
                            onClick={goToToday}
                        >
                            Ir a hoy
                        </button>
                    </div>
                )}

                {/* Infinite scrollable day strip */}
                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="overflow-x-auto scrollbar-none"
                    style={{
                        scrollbarWidth: "none",
                        msOverflowStyle: "none",
                        WebkitOverflowScrolling: "touch",
                    }}
                >
                    <div
                        className="flex"
                        style={{ width: `${days.length * DAY_WIDTH}px` }}
                    >
                        {days.map((day) => {
                            const dayStr = formatFunctionalDate(day);
                            const isSelected = dayStr === selectedStr;
                            const isToday = dayStr === todayStr;

                            return (
                                <button
                                    key={dayStr}
                                    onClick={() => {
                                        hapticTap();
                                        setSelectedDate(day);
                                    }}
                                    className={cn(
                                        "flex flex-col items-center gap-0.5 py-2.5 rounded-2xl transition-all duration-200 flex-shrink-0",
                                        "hover:bg-accent/60 active:scale-95",
                                        isSelected && "bg-primary text-primary-foreground bubble-shadow",
                                        !isSelected && isToday && "ring-2 ring-primary/30"
                                    )}
                                    style={{ width: `${DAY_WIDTH}px` }}
                                >
                                    <span
                                        className={cn(
                                            "text-[10px] font-medium uppercase tracking-wider",
                                            isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                                        )}
                                    >
                                        {getShortDayName(day)}
                                    </span>
                                    <span
                                        className={cn(
                                            "text-base font-bold leading-none",
                                            isSelected ? "text-primary-foreground" : "text-foreground"
                                        )}
                                    >
                                        {day.getDate()}
                                    </span>
                                    {isToday && !isSelected && (
                                        <div className="h-1 w-1 rounded-full bg-primary mt-0.5" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
