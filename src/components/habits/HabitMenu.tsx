import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Pencil, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { hapticTap } from "@/utils/haptics";
import type { Habit } from "@/types/types";

interface HabitMenuProps {
    habit: Habit;
    anchor: HTMLElement;
    onClose: () => void;
    onEdit: (habit: Habit) => void;
    onMove: (habit: Habit, direction: "up" | "down") => void;
    onDelete: (habit: Habit) => void;
}

export function HabitMenu({ habit, anchor, onClose, onEdit, onMove, onDelete }: HabitMenuProps) {
    const [position, setPosition] = useState<{ top: number; left: number; alignRight: boolean }>({ top: 0, left: 0, alignRight: false });
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Prevent body scroll? Maybe not needed for simple menu.
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        if (!anchor) return;

        const rect = anchor.getBoundingClientRect();
        const scrollY = window.scrollY;
        const scrollX = window.scrollX;

        // Default: Bottom-Left of anchor
        let top = rect.bottom + scrollY + 4;
        let left = rect.left + scrollX;
        let alignRight = true; // Align to right edge by default for "3 dots" on right side

        // If menu would go off-screen bottom, flip to top?
        // Simple check: if rect.bottom > window.innerHeight - 200, go top.
        if (rect.bottom > window.innerHeight - 200) {
            top = rect.top + scrollY - 4 - 200; // Appropriation for height
            // Actually, let's just let CSS handle flow or calculate height?
            // Better: use bottom-up positioning if needed.
            // For now, let's just position absolute.
        }

        // Horizontal: The anchor is usually on the right side.
        // So we want the menu's RIGHT to align with anchor's RIGHT.
        // left = rect.right + scrollX - menuWidth
        // We don't know menuWidth yet.
        // aligning right is safer.
        alignRight = true;

        setPosition({ top: rect.bottom + 8, left: rect.right, alignRight: true });

        // Handle resize/scroll closing
        const handleScroll = () => onClose();
        window.addEventListener("scroll", handleScroll, { capture: true });
        window.addEventListener("resize", handleScroll);

        return () => {
            window.removeEventListener("scroll", handleScroll, { capture: true });
            window.removeEventListener("resize", handleScroll);
        };
    }, [anchor, onClose]);

    if (!mounted) return null;

    return createPortal(
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-[60] bg-black/5" onClick={onClose} />

            {/* Menu */}
            <div
                className={cn(
                    "fixed z-[70] min-w-[160px] bg-popover text-popover-foreground rounded-2xl shadow-xl border p-1.5 flex flex-col animate-in fade-in zoom-in-95 duration-200",
                    "origin-top-right"
                )}
                style={{
                    top: position.top,
                    // If alignRight, set right instead of left, or calculate left.
                    // Using fixed left is easier if we calculate carefully.
                    // But 'right' property relates to viewport.
                    // rect.right is distance from left edge to right edge.
                    // viewport width - rect.right = distance from right edge.
                    right: position.alignRight ? window.innerWidth - position.left : undefined,
                    left: !position.alignRight ? position.left : undefined,
                    // Fix possible overflow at bottom (simple logic: max-height/scroll)
                    // If we want to flip, we need more complex logic. 
                    // Let's stick to simple drop-down for now, usually fine on mobile unless at very bottom.
                    // If very bottom, the list usually has padding (pb-24).
                }}
            >
                <MenuAction
                    icon={Pencil}
                    label="Editar"
                    onClick={() => { onClose(); onEdit(habit); }}
                />
                <MenuAction
                    icon={ArrowUp}
                    label="Subir"
                    onClick={() => { onClose(); onMove(habit, "up"); }}
                />
                <MenuAction
                    icon={ArrowDown}
                    label="Bajar"
                    onClick={() => { onClose(); onMove(habit, "down"); }}
                />
                <div className="h-px bg-border/50 my-1" />
                <MenuAction
                    icon={Trash2}
                    label="Eliminar"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => { onClose(); onDelete(habit); }}
                />
            </div>
        </>,
        document.body
    );
}

function MenuAction({ icon: Icon, label, onClick, className }: { icon: React.ElementType, label: string, onClick: () => void, className?: string }) {
    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onClick();
                hapticTap();
            }}
            className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl hover:bg-accent transition-colors text-left w-full",
                className
            )}
        >
            <Icon size={16} />
            {label}
        </button>
    );
}
