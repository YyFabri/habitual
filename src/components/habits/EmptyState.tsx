"use client";

import { Button } from "@/components/ui/button";
import { useHabitStore } from "@/store/useHabitStore";
import { hapticTap } from "@/utils/haptics";
import { Plus, Sparkles, CalendarDays } from "lucide-react";

interface EmptyStateProps {
    hasAnyHabits?: boolean;
}

export function EmptyState({ hasAnyHabits }: EmptyStateProps) {
    const setShowNewHabitDialog = useHabitStore((s) => s.setShowNewHabitDialog);

    return (
        <div className="flex flex-col items-center justify-center px-8 py-16 max-w-sm mx-auto animate-[fade-in_0.5s_ease-out]">
            {/* Decorative bubbles */}
            <div className="relative mb-8">
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-pastel-purple/30 to-pastel-blue/30 flex items-center justify-center">
                    {hasAnyHabits ? (
                        <CalendarDays className="h-10 w-10 text-pastel-purple" />
                    ) : (
                        <Sparkles className="h-10 w-10 text-pastel-purple" />
                    )}
                </div>
                {/* Floating mini bubbles */}
                <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-pastel-pink/40 animate-[pulse-soft_3s_ease-in-out_infinite]" />
                <div className="absolute -bottom-1 -left-3 h-4 w-4 rounded-full bg-pastel-green/40 animate-[pulse-soft_4s_ease-in-out_infinite_0.5s]" />
                <div className="absolute top-4 -left-5 h-3 w-3 rounded-full bg-pastel-yellow/40 animate-[pulse-soft_3.5s_ease-in-out_infinite_1s]" />
            </div>

            <h3 className="text-lg font-bold mb-2 text-center">
                {hasAnyHabits
                    ? "No hay hábitos para este día"
                    : "¡Empezá tu camino!"}
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-6 leading-relaxed">
                {hasAnyHabits
                    ? "No tenés hábitos programados para este día. Podés crear uno nuevo o seleccionar otro día."
                    : "Creá tu primer hábito y comenzá a construir la mejor versión de vos mismo."}
            </p>

            {!hasAnyHabits && (
                <Button
                    className="rounded-2xl h-12 px-8 font-semibold bubble-shadow bg-primary hover:bg-primary/90 transition-all active:scale-[0.98]"
                    onClick={() => {
                        hapticTap();
                        setShowNewHabitDialog(true);
                    }}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Crear primer hábito
                </Button>
            )}
        </div>
    );
}
