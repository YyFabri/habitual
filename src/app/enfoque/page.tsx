"use client";

import { useUserStore } from "@/store/useUserStore";
import { AppHeader } from "@/components/layout/AppHeader";
import { Sidebar } from "@/components/layout/Sidebar";
import { UpgradeModal } from "@/components/premium/UpgradeModal";
import { NewHabitDialog } from "@/components/habits/NewHabitDialog";
import { PomodoroTimer } from "@/components/habits/PomodoroTimer";
import { OfflineIndicator } from "@/components/layout/OfflineIndicator";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function EnfoquePage() {
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
            <OfflineIndicator />
            <AppHeader />

            <main className="flex-1 pb-safe overflow-y-auto">
                <div className="px-4 py-4 max-w-lg mx-auto w-full">
                    <h1 className="text-2xl font-bold mb-2">Enfoque</h1>
                    <p className="text-sm text-muted-foreground mb-4">
                        Usá el temporizador Pomodoro para concentrarte en lo que importa.
                    </p>

                    <PomodoroTimer />
                </div>
            </main>

            {/* Modals & Overlays */}
            <Sidebar />
            <NewHabitDialog />
            <UpgradeModal />
        </div>
    );
}
