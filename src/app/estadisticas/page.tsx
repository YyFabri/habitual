"use client";

import { useHabits } from "@/hooks/useHabits";
import { useUserStore } from "@/store/useUserStore";
import { AppHeader } from "@/components/layout/AppHeader";
import { Sidebar } from "@/components/layout/Sidebar";
import { UpgradeModal } from "@/components/premium/UpgradeModal";
import { NewHabitDialog } from "@/components/habits/NewHabitDialog";
import { StatisticsHub } from "@/components/habits/StatisticsHub";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EstadisticasPage() {
    const user = useUserStore((s) => s.user);
    const router = useRouter();

    useEffect(() => {
        if (!user) {
            router.push("/");
        }
    }, [user, router]);

    if (!user) return null;

    return (
        <div className="min-h-dvh bg-bubble-bg flex flex-col">
            <AppHeader />

            <main className="flex-1 pb-safe overflow-y-auto">
                <div className="px-4 py-4 max-w-lg mx-auto w-full">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="mb-4 -ml-2 text-muted-foreground hover:text-foreground hover:bg-black/5 rounded-xl h-9"
                        onClick={() => router.push("/")}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver
                    </Button>

                    <h1 className="text-2xl font-bold mb-6">Estadísticas</h1>

                    <StatisticsHub />
                </div>
            </main>

            {/* Modals & Overlays */}
            <Sidebar />
            <NewHabitDialog />
            <UpgradeModal />
        </div>
    );
}
