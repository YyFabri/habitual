import { create } from "zustand";
import { getFunctionalDate } from "@/utils/functionalDate";

interface HabitUIState {
    // Selected date for the calendar strip
    selectedDate: Date;
    setSelectedDate: (date: Date) => void;

    // Modals / Dialogs
    showUpgradeModal: boolean;
    setShowUpgradeModal: (show: boolean) => void;

    showNewHabitDialog: boolean;
    setShowNewHabitDialog: (show: boolean) => void;

    showSidebar: boolean;
    setShowSidebar: (show: boolean) => void;

    // Editing
    editingHabitId: string | null;
    setEditingHabitId: (id: string | null) => void;
}

export const useHabitStore = create<HabitUIState>((set) => ({
    selectedDate: getFunctionalDate(),
    setSelectedDate: (date) => set({ selectedDate: date }),

    showUpgradeModal: false,
    setShowUpgradeModal: (show) => set({ showUpgradeModal: show }),

    showNewHabitDialog: false,
    setShowNewHabitDialog: (show) => set({ showNewHabitDialog: show }),

    showSidebar: false,
    setShowSidebar: (show) => set({ showSidebar: show }),

    editingHabitId: null,
    setEditingHabitId: (id) => set({ editingHabitId: id }),
}));
