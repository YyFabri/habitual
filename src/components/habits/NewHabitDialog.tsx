"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useHabitStore } from "@/store/useHabitStore";
import { useCreateHabit, useHabits, useUpdateHabit } from "@/hooks/useHabits";
import { HABIT_COLORS, HABIT_ICONS, habitSchema, type HabitFormData } from "@/types/types";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { hapticTap, hapticSuccess } from "@/utils/haptics";
import { cn } from "@/lib/utils";
import { Check, Star, Minus, Plus } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { ICON_MAP } from "@/utils/habitIcons";

const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function NewHabitDialog() {
    const { showNewHabitDialog, setShowNewHabitDialog, editingHabitId, setEditingHabitId } = useHabitStore();
    const createHabit = useCreateHabit();
    const updateHabit = useUpdateHabit();
    const { data: habits } = useHabits();
    const [isCreatingNewGroup, setIsCreatingNewGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");

    const editingHabit = useMemo(() =>
        habits?.find(h => h.id === editingHabitId),
        [habits, editingHabitId]);

    // Extract unique groups from existing habits
    const existingGroups = useMemo(() => {
        if (!habits) return [];
        const groups = new Set<string>();
        habits.forEach((h) => {
            if (h.groups) {
                h.groups.forEach((g) => groups.add(g));
            }
        });
        groups.delete("General"); // We always show General
        return Array.from(groups).sort();
    }, [habits]);

    const {
        register,
        handleSubmit,
        control,
        watch,
        reset,
        setValue,
        formState: { errors },
    } = useForm<HabitFormData>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(habitSchema) as any,
        defaultValues: {
            name: "",
            icon: "star",
            color: "pastel-purple",
            type: "simple",
            frequency: [0, 1, 2, 3, 4, 5, 6],
            objective: 1,
            groups: ["General"],
        },
    });

    // Reset/Populate form when dialog opens
    useEffect(() => {
        if (showNewHabitDialog) {
            if (editingHabit) {
                reset({
                    name: editingHabit.name,
                    icon: editingHabit.icon,
                    color: editingHabit.color,
                    type: editingHabit.type,
                    frequency: editingHabit.frequency,
                    objective: editingHabit.objective,
                    groups: editingHabit.groups || ["General"],
                });
            } else {
                reset({
                    name: "",
                    icon: "star",
                    color: "pastel-purple",
                    type: "simple",
                    frequency: [0, 1, 2, 3, 4, 5, 6],
                    objective: 1,
                    groups: ["General"],
                });
            }
        }
    }, [showNewHabitDialog, editingHabit, reset]);

    const watchType = watch("type");
    const watchObjective = watch("objective");
    const watchIcon = watch("icon");
    const watchColor = watch("color");
    const watchGroups = watch("groups") ?? ["General"];

    const toggleGroup = (groupName: string) => {
        hapticTap();
        const current = watchGroups;
        if (current.includes(groupName)) {
            // Don't allow removing the last group
            if (current.length <= 1) return;
            setValue("groups", current.filter((g) => g !== groupName));
        } else {
            setValue("groups", [...current, groupName]);
        }
    };

    const onSubmit = async (data: HabitFormData) => {
        hapticTap();
        try {
            if (editingHabitId) {
                await updateHabit.mutateAsync({ habitId: editingHabitId, data: data as any });
            } else {
                await createHabit.mutateAsync(data as any);
            }
            hapticSuccess();
            handleClose(false);
        } catch {
            // PremiumRequiredError is handled by the mutation's onError
        }
    };

    const handleClose = (open: boolean) => {
        if (!open) {
            setShowNewHabitDialog(false);
            // Delay clean up to avoid UI flicker during close animation
            setTimeout(() => {
                setEditingHabitId(null);
                reset();
                setIsCreatingNewGroup(false);
                setNewGroupName("");
            }, 300);
        }
    };

    const handleAddNewGroup = () => {
        const name = newGroupName.trim();
        if (!name) return;
        // Add the new group and select it
        if (!watchGroups.includes(name)) {
            setValue("groups", [...watchGroups, name]);
        }
        setNewGroupName("");
        setIsCreatingNewGroup(false);
    };

    // All available groups = "General" + existing custom groups + any new groups from form
    const allGroups = useMemo(() => {
        const set = new Set(["General", ...existingGroups, ...watchGroups]);
        return Array.from(set);
    }, [existingGroups, watchGroups]);

    return (
        <Dialog open={showNewHabitDialog} onOpenChange={handleClose}>
            <DialogContent className="rounded-3xl max-w-md mx-4 max-h-[90vh] overflow-y-auto bg-card border-0 bubble-shadow-lg">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Nuevo Hábito</DialogTitle>
                    <DialogDescription className="text-muted-foreground text-sm">
                        Crea un nuevo hábito para rastrear tu progreso diario.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-2">
                    {/* Name */}
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium">
                            Nombre
                        </Label>
                        <Input
                            id="name"
                            placeholder="Ej: Meditar, Leer, Ejercicio..."
                            className="rounded-2xl h-12 bg-muted/50 border-0 px-4"
                            {...register("name")}
                        />
                        {errors.name && (
                            <p className="text-xs text-destructive">{errors.name.message}</p>
                        )}
                    </div>

                    {/* Icon Picker */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Icono</Label>
                        <div className="grid grid-cols-8 gap-1.5">
                            {HABIT_ICONS.map((iconName) => {
                                const IconComp = ICON_MAP[iconName] ?? Star;
                                return (
                                    <button
                                        key={iconName}
                                        type="button"
                                        onClick={() => {
                                            hapticTap();
                                            setValue("icon", iconName);
                                        }}
                                        className={cn(
                                            "h-10 w-10 rounded-xl flex items-center justify-center transition-all",
                                            "hover:bg-accent active:scale-90",
                                            watchIcon === iconName &&
                                            "bg-primary text-primary-foreground bubble-shadow"
                                        )}
                                    >
                                        <IconComp className="h-4 w-4" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Color Picker */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Color</Label>
                        <div className="flex gap-2 flex-wrap">
                            {HABIT_COLORS.map((color) => (
                                <button
                                    key={color.value}
                                    type="button"
                                    onClick={() => {
                                        hapticTap();
                                        setValue("color", color.value);
                                    }}
                                    className={cn(
                                        "h-9 w-9 rounded-full transition-all",
                                        "hover:scale-110 active:scale-90",
                                        watchColor === color.value &&
                                        "ring-2 ring-offset-2 ring-offset-background scale-110"
                                    )}
                                    style={{
                                        backgroundColor: color.hex,
                                        // @ts-expect-error -- CSS custom property
                                        "--tw-ring-color": color.hex,
                                    }}
                                    title={color.name}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Type selector */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Tipo de hábito</Label>
                        <Controller
                            control={control}
                            name="type"
                            render={({ field }) => (
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            hapticTap();
                                            field.onChange("simple");
                                            setValue("objective", 1);
                                        }}
                                        className={cn(
                                            "flex-1 py-3 px-4 rounded-2xl text-sm font-medium transition-all",
                                            field.value === "simple"
                                                ? "bg-primary text-primary-foreground bubble-shadow"
                                                : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                        )}
                                    >
                                        ✓ Simple
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            hapticTap();
                                            field.onChange("counter");
                                            setValue("objective", 3);
                                        }}
                                        className={cn(
                                            "flex-1 py-3 px-4 rounded-2xl text-sm font-medium transition-all",
                                            field.value === "counter"
                                                ? "bg-primary text-primary-foreground bubble-shadow"
                                                : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                        )}
                                    >
                                        🔢 Contador
                                    </button>
                                </div>
                            )}
                        />
                    </div>

                    {/* Objective (only for counter) */}
                    {watchType === "counter" && (
                        <div className="space-y-2 animate-[slide-up_0.3s_ease-out]">
                            <Label className="text-sm font-medium">
                                Objetivo diario
                            </Label>
                            <div className="flex items-center justify-center gap-4">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-full h-10 w-10"
                                    onClick={() => {
                                        hapticTap();
                                        setValue("objective", Math.max(2, watchObjective - 1));
                                    }}
                                >
                                    <Minus className="h-4 w-4" />
                                </Button>
                                <span className="text-3xl font-bold w-16 text-center tabular-nums">
                                    {watchObjective}
                                </span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-full h-10 w-10"
                                    onClick={() => {
                                        hapticTap();
                                        setValue("objective", Math.min(100, watchObjective + 1));
                                    }}
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground text-center">
                                veces por día
                            </p>
                        </div>
                    )}

                    {/* Frequency (day checkboxes) */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Frecuencia</Label>
                        <Controller
                            control={control}
                            name="frequency"
                            render={({ field }) => (
                                <div className="grid grid-cols-7 gap-1.5">
                                    {DAY_LABELS.map((label, index) => {
                                        const isActive = field.value.includes(index);
                                        return (
                                            <button
                                                key={index}
                                                type="button"
                                                onClick={() => {
                                                    hapticTap();
                                                    if (isActive) {
                                                        field.onChange(
                                                            field.value.filter((d: number) => d !== index)
                                                        );
                                                    } else {
                                                        field.onChange([...field.value, index].sort());
                                                    }
                                                }}
                                                className={cn(
                                                    "py-2 rounded-xl text-xs font-medium transition-all",
                                                    "active:scale-90",
                                                    isActive
                                                        ? "bg-primary text-primary-foreground"
                                                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                                )}
                                            >
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        />
                        {errors.frequency && (
                            <p className="text-xs text-destructive">{errors.frequency.message}</p>
                        )}
                    </div>

                    {/* Groups — Multi-select checkboxes */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Grupos</Label>
                        <p className="text-xs text-muted-foreground">
                            Selecciona uno o más grupos.
                        </p>
                        <div className="space-y-1.5">
                            {allGroups.map((groupName) => {
                                const isSelected = watchGroups.includes(groupName);
                                return (
                                    <button
                                        key={groupName}
                                        type="button"
                                        onClick={() => toggleGroup(groupName)}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all",
                                            "hover:bg-accent/50 active:scale-[0.98]",
                                            isSelected
                                                ? "bg-primary/10"
                                                : "bg-muted/30"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all",
                                                isSelected
                                                    ? "border-primary bg-primary"
                                                    : "border-muted-foreground/40"
                                            )}
                                        >
                                            {isSelected && (
                                                <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
                                            )}
                                        </div>
                                        <span
                                            className={cn(
                                                "text-sm font-medium",
                                                isSelected ? "text-foreground" : "text-muted-foreground"
                                            )}
                                        >
                                            {groupName}
                                        </span>
                                    </button>
                                );
                            })}

                            {/* Create new group */}
                            {isCreatingNewGroup ? (
                                <div className="flex gap-2 mt-1">
                                    <Input
                                        placeholder="Nombre del grupo..."
                                        value={newGroupName}
                                        onChange={(e) => setNewGroupName(e.target.value)}
                                        className="rounded-2xl h-10 bg-muted/50 border-0 px-4 flex-1 text-sm"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleAddNewGroup();
                                            }
                                            if (e.key === "Escape") {
                                                setIsCreatingNewGroup(false);
                                                setNewGroupName("");
                                            }
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="rounded-2xl h-10 px-3 text-sm"
                                        onClick={handleAddNewGroup}
                                        disabled={!newGroupName.trim()}
                                    >
                                        OK
                                    </Button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => {
                                        hapticTap();
                                        setIsCreatingNewGroup(true);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-primary hover:bg-primary/5 transition-all active:scale-[0.98]"
                                >
                                    <div className="h-5 w-5 rounded-full border-2 border-dashed border-primary/50 flex items-center justify-center">
                                        <Plus className="h-3 w-3 text-primary" />
                                    </div>
                                    <span className="text-sm font-medium">Crear nuevo grupo</span>
                                </button>
                            )}
                        </div>
                        {errors.groups && (
                            <p className="text-xs text-destructive">{errors.groups.message}</p>
                        )}
                    </div>

                    {/* Priority Selector */}
                    <div className="space-y-3 pt-2">
                        <Label className="text-sm font-medium">Prioridad</Label>
                        <Controller
                            control={control}
                            name="priority"
                            render={({ field }) => (
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { value: "high", label: "Alta", color: "bg-red-500/10 text-red-600 border-red-200 hover:bg-red-500/20" },
                                        { value: "medium", label: "Media", color: "bg-amber-500/10 text-amber-600 border-amber-200 hover:bg-amber-500/20" },
                                        { value: "low", label: "Baja", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200 hover:bg-emerald-500/20" },
                                    ].map((option) => {
                                        const isSelected = field.value === option.value;
                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => {
                                                    hapticTap();
                                                    field.onChange(option.value);
                                                }}
                                                className={cn(
                                                    "py-2.5 rounded-2xl text-sm font-medium border transition-all active:scale-95",
                                                    isSelected
                                                        ? cn(option.color, "ring-1 ring-offset-1 ring-offset-background", option.value === "high" ? "ring-red-500" : option.value === "medium" ? "ring-amber-500" : "ring-emerald-500")
                                                        : "bg-card border-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
                                                )}
                                            >
                                                {option.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        />
                    </div>

                    {/* Submit */}
                    <Button
                        type="submit"
                        disabled={createHabit.isPending}
                        className="w-full h-12 rounded-2xl font-semibold text-base bubble-shadow bg-primary hover:bg-primary/90 transition-all active:scale-[0.98]"
                    >
                        {createHabit.isPending ? (
                            <span className="flex items-center gap-2">
                                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Creando...
                            </span>
                        ) : (
                            "Crear Hábito"
                        )}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
