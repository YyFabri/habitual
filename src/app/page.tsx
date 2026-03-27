"use client";

import { AppHeader } from "@/components/layout/AppHeader";
import { Sidebar } from "@/components/layout/Sidebar";
import { CalendarStrip } from "@/components/habits/CalendarStrip";
import { HabitList } from "@/components/habits/HabitList";
import { NewHabitDialog } from "@/components/habits/NewHabitDialog";
import { UpgradeModal } from "@/components/premium/UpgradeModal";
import { OfflineIndicator } from "@/components/layout/OfflineIndicator";
import { PomodoroTimer } from "@/components/habits/PomodoroTimer";
import { EmailVerificationBanner } from "@/components/auth/EmailVerificationBanner";

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-bubble-bg">
      <OfflineIndicator />
      <AppHeader />
      <EmailVerificationBanner />
      <CalendarStrip />

      <main className="pb-safe">
        <HabitList />
      </main>

      {/* Modals & Overlays */}
      <Sidebar />
      <NewHabitDialog />
      <UpgradeModal />
      <PomodoroTimer />
    </div>
  );
}
