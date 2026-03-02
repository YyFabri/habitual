"use client";

import { Menu, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHabitStore } from "@/store/useHabitStore";
import { getFunctionalDayLabel, getMonthYear, getFunctionalDate } from "@/utils/functionalDate";
import { hapticTap } from "@/utils/haptics";

export function AppHeader() {
    const { selectedDate, setShowNewHabitDialog, setShowSidebar } = useHabitStore();
    const dayLabel = getFunctionalDayLabel(selectedDate);
    const monthYear = getMonthYear(getFunctionalDate(selectedDate));

    return (
        <header className="sticky top-0 z-50 glass-effect bg-bubble-bg/80 px-4 py-3">
            <div className="flex items-center justify-between max-w-lg mx-auto">
                {/* Hamburger Menu */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full h-11 w-11 hover:bg-accent/80 active:scale-95 transition-all"
                    onClick={() => {
                        hapticTap();
                        setShowSidebar(true);
                    }}
                >
                    <Menu className="h-5 w-5" />
                </Button>

                {/* Center Title */}
                <div className="text-center">
                    <h1 className="text-lg font-bold tracking-tight">{dayLabel}</h1>
                    <p className="text-xs text-muted-foreground -mt-0.5">{monthYear}</p>
                </div>

                {/* Add Button */}
                <Button
                    size="icon"
                    className="rounded-full h-11 w-11 bg-primary hover:bg-primary/90 active:scale-95 transition-all bubble-shadow"
                    onClick={() => {
                        hapticTap();
                        setShowNewHabitDialog(true);
                    }}
                >
                    <Plus className="h-5 w-5" />
                </Button>
            </div>
        </header>
    );
}
