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
import { useUserStore } from "@/store/useUserStore";
import { useCreateHabit, useHabits, useUpdateHabit } from "@/hooks/useHabits";
import {
    HABIT_COLORS, PREMIUM_EXTRA_COLORS, HABIT_ICONS, habitSchema,
    type HabitFormData, type FrequencyType, type SubTask,
} from "@/types/types";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { hapticTap, hapticSuccess } from "@/utils/haptics";
import { cn } from "@/lib/utils";
import { Check, Star, Minus, Plus, Lock, Trash2, FileText, X } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { ICON_MAP } from "@/utils/habitIcons";

const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const FREQUENCY_OPTIONS: { value: FrequencyType; label: string; description: string }[] = [
    { value: "weekly", label: "Semanal", description: "Días específicos de la semana" },
    { value: "every_x_days", label: "Cada X días", description: "Ej: cada 3 días" },
    { value: "x_per_week", label: "X por semana", description: "Ej: 3 veces por semana" },
    { value: "specific_dates", label: "Fechas", description: "Fechas puntuales" },
];

export function NewHabitDialog() {
    const { showNewHabitDialog, setShowNewHabitDialog, editingHabitId, setEditingHabitId } = useHabitStore();
    const user = useUserStore((s) => s.user);
    const isPremium = user?.isPremium ?? false;
    const createHabit = useCreateHabit();
    const updateHabit = useUpdateHabit();
    const { data: habits } = useHabits();
    const [isCreatingNewGroup, setIsCreatingNewGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [customHex, setCustomHex] = useState("#c09ce0");
    const [showNotes, setShowNotes] = useState(false);
    const [newSpecificDate, setNewSpecificDate] = useState("");

    const editingHabit = useMemo(() =>
        habits?.find(h => h.id === editingHabitId),
        [habits, editingHabitId]);

    const existingGroups = useMemo(() => {
        if (!habits) return [];
        const groups = new Set<string>();
        habits.forEach((h) => {
            if (h.groups) h.groups.forEach((g) => groups.add(g));
        });
        groups.delete("General");
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
            frequencyType: "weekly",
            frequency: [0, 1, 2, 3, 4, 5, 6],
            frequencyInterval: 2,
            objective: 1,
            groups: ["General"],
            notes: "",
            subtasks: [],
        },
    });

    useEffect(() => {
        if (showNewHabitDialog) {
            if (editingHabit) {
                reset({
                    name: editingHabit.name,
                    icon: editingHabit.icon,
                    color: editingHabit.color,
                    type: editingHabit.type,
                    frequencyType: editingHabit.frequencyType ?? "weekly",
                    frequency: editingHabit.frequency,
                    frequencyInterval: editingHabit.frequencyInterval,
                    frequencyStartDate: editingHabit.frequencyStartDate,
                    frequencySpecificDates: editingHabit.frequencySpecificDates,
                    objective: editingHabit.objective,
                    groups: editingHabit.groups || ["General"],
                    notes: editingHabit.notes ?? "",
                    subtasks: editingHabit.subtasks ?? [],
                });
                setShowNotes(!!editingHabit.notes);
            } else {
                reset({
                    name: "",
                    icon: "star",
                    color: "pastel-purple",
                    type: "simple",
                    frequencyType: "weekly",
                    frequency: [0, 1, 2, 3, 4, 5, 6],
                    frequencyInterval: 2,
                    objective: 1,
                    groups: ["General"],
                    notes: "",
                    subtasks: [],
                });
                setShowNotes(false);
            }
        }
    }, [showNewHabitDialog, editingHabit, reset]);

    const watchType = watch("type");
    const watchObjective = watch("objective");
    const watchIcon = watch("icon");
    const watchColor = watch("color");
    const watchGroups = watch("groups") ?? ["General"];
    const watchFrequencyType = watch("frequencyType") ?? "weekly";
    const watchFrequencyInterval = watch("frequencyInterval") ?? 2;
    const watchSpecificDates = watch("frequencySpecificDates") ?? [];
    const watchSubtasks = watch("subtasks") ?? [];
    const watchNotes = watch("notes") ?? "";

    const toggleGroup = (groupName: string) => {
        hapticTap();
        const current = watchGroups;
        if (current.includes(groupName)) {
            if (current.length <= 1) return;
            setValue("groups", current.filter((g) => g !== groupName));
        } else {
            setValue("groups", [...current, groupName]);
        }
    };

    // ─── Subtask helpers ───────────────────────
    const [newSubtaskText, setNewSubtaskText] = useState("");
    const [newSubtaskNotes, setNewSubtaskNotes] = useState("");

    const addSubtask = () => {
        const text = newSubtaskText.trim();
        if (!text) return;
        const id = `st_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        setValue("subtasks", [...watchSubtasks, { id, text, notes: newSubtaskNotes, completed: false }]);
        setNewSubtaskText("");
        setNewSubtaskNotes("");
    };

    const removeSubtask = (id: string) => {
        setValue("subtasks", watchSubtasks.filter((s: SubTask) => s.id !== id));
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
            setTimeout(() => {
                setEditingHabitId(null);
                reset();
                setIsCreatingNewGroup(false);
                setNewGroupName("");
                setShowColorPicker(false);
                setShowNotes(false);
                setNewSubtaskText("");
                setNewSubtaskNotes("");
                setNewSpecificDate("");
            }, 300);
        }
    };

    const handleAddNewGroup = () => {
        const name = newGroupName.trim();
        if (!name) return;
        if (!watchGroups.includes(name)) {
            setValue("groups", [...watchGroups, name]);
        }
        setNewGroupName("");
        setIsCreatingNewGroup(false);
    };

    const allGroups = useMemo(() => {
        const set = new Set(["General", ...existingGroups, ...watchGroups]);
        return Array.from(set);
    }, [existingGroups, watchGroups]);

    // All colors including premium
    const allColors = isPremium
        ? [...HABIT_COLORS, ...PREMIUM_EXTRA_COLORS]
        : HABIT_COLORS;

    return (
        <Dialog open={showNewHabitDialog} onOpenChange={handleClose}>
            <DialogContent className="rounded-3xl max-w-[calc(100%-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto bg-card border-0 bubble-shadow-lg">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">{editingHabitId ? "Editar Hábito" : "Nuevo Hábito"}</DialogTitle>
                    <DialogDescription className="text-muted-foreground text-sm">
                        {editingHabitId ? "Modificá los datos de tu hábito." : "Crea un nuevo hábito para rastrear tu progreso diario."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-2">
                    {/* Name */}
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium">Nombre</Label>
                        <Input
                            id="name"
                            placeholder="Ej: Meditar, Leer, Ejercicio..."
                            className="rounded-2xl h-12 bg-muted/50 border-0 px-4"
                            {...register("name")}
                        />
                        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
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
                                        onClick={() => { hapticTap(); setValue("icon", iconName); }}
                                        className={cn(
                                            "h-10 w-10 rounded-xl flex items-center justify-center transition-all",
                                            "hover:bg-accent active:scale-90",
                                            watchIcon === iconName && "bg-primary text-primary-foreground bubble-shadow"
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
                            {allColors.map((color) => (
                                <button
                                    key={color.value}
                                    type="button"
                                    onClick={() => { hapticTap(); setValue("color", color.value); }}
                                    className={cn(
                                        "h-9 w-9 rounded-full transition-all",
                                        "hover:scale-110 active:scale-90",
                                        watchColor === color.value && "ring-2 ring-offset-2 ring-offset-background scale-110"
                                    )}
                                    style={{
                                        backgroundColor: color.hex,
                                        // @ts-expect-error -- CSS custom property
                                        "--tw-ring-color": color.hex,
                                    }}
                                    title={color.name}
                                />
                            ))}
                            {/* Premium custom color */}
                            {isPremium ? (
                                <button
                                    type="button"
                                    onClick={() => { hapticTap(); setShowColorPicker(!showColorPicker); }}
                                    className={cn(
                                        "h-9 w-9 rounded-full transition-all flex items-center justify-center",
                                        "hover:scale-110 active:scale-90",
                                        "bg-gradient-to-br from-red-400 via-green-400 to-blue-400",
                                        watchColor.startsWith("custom-") && "ring-2 ring-offset-2 ring-offset-background scale-110 ring-primary"
                                    )}
                                    title="Color personalizado"
                                >
                                    <span className="text-white text-xs font-bold">+</span>
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => { hapticTap(); import("@/store/useHabitStore").then(({ useHabitStore }) => useHabitStore.getState().setShowUpgradeModal(true)); }}
                                    className="h-9 w-9 rounded-full bg-muted/50 flex items-center justify-center hover:scale-110 transition-all"
                                    title="Color personalizado (Premium)"
                                >
                                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                            )}
                        </div>
                        {/* Custom HEX Picker */}
                        {showColorPicker && isPremium && (
                            <div className="flex items-center gap-3 mt-2 animate-[slide-up_0.3s_ease-out]">
                                <input
                                    type="color"
                                    value={customHex}
                                    onChange={(e) => setCustomHex(e.target.value)}
                                    className="h-10 w-10 rounded-xl border-0 cursor-pointer"
                                />
                                <Input
                                    value={customHex}
                                    onChange={(e) => setCustomHex(e.target.value)}
                                    placeholder="#c09ce0"
                                    className="rounded-2xl h-10 bg-muted/50 border-0 px-4 flex-1 text-sm font-mono"
                                    maxLength={7}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="rounded-2xl h-10 px-3 text-sm"
                                    onClick={() => {
                                        hapticTap();
                                        setValue("color", `custom-${customHex.replace("#", "")}` as any);
                                        setShowColorPicker(false);
                                    }}
                                >
                                    OK
                                </Button>
                            </div>
                        )}
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
                                        onClick={() => { hapticTap(); field.onChange("simple"); setValue("objective", 1); }}
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
                                        onClick={() => { hapticTap(); field.onChange("counter"); setValue("objective", 3); }}
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
                            <Label className="text-sm font-medium">Objetivo diario</Label>
                            <div className="flex items-center justify-center gap-4">
                                <Button type="button" variant="ghost" size="icon" className="rounded-full h-10 w-10"
                                    onClick={() => { hapticTap(); setValue("objective", Math.max(2, watchObjective - 1)); }}>
                                    <Minus className="h-4 w-4" />
                                </Button>
                                <span className="text-3xl font-bold w-16 text-center tabular-nums">{watchObjective}</span>
                                <Button type="button" variant="ghost" size="icon" className="rounded-full h-10 w-10"
                                    onClick={() => { hapticTap(); setValue("objective", Math.min(100, watchObjective + 1)); }}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground text-center">veces por día</p>
                        </div>
                    )}

                    {/* ─── Frequency Type Selector ─────────────────────── */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Tipo de Frecuencia</Label>
                        <Controller
                            control={control}
                            name="frequencyType"
                            render={({ field }) => (
                                <div className="grid grid-cols-2 gap-1.5">
                                    {FREQUENCY_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => { hapticTap(); field.onChange(opt.value); }}
                                            className={cn(
                                                "py-2.5 px-3 rounded-2xl text-xs font-medium transition-all text-left",
                                                field.value === opt.value
                                                    ? "bg-primary text-primary-foreground bubble-shadow"
                                                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                            )}
                                        >
                                            <span className="block font-semibold">{opt.label}</span>
                                            <span className="block text-[10px] opacity-75">{opt.description}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        />
                    </div>

                    {/* Frequency: Weekly days */}
                    {watchFrequencyType === "weekly" && (
                        <div className="space-y-2 animate-[slide-up_0.2s_ease-out]">
                            <Label className="text-sm font-medium">Días de la semana</Label>
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
                                                            field.onChange(field.value.filter((d: number) => d !== index));
                                                        } else {
                                                            field.onChange([...field.value, index].sort());
                                                        }
                                                    }}
                                                    className={cn(
                                                        "py-2 rounded-xl text-xs font-medium transition-all active:scale-90",
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
                            {errors.frequency && <p className="text-xs text-destructive">{errors.frequency.message}</p>}
                        </div>
                    )}

                    {/* Frequency: Every X days */}
                    {watchFrequencyType === "every_x_days" && (
                        <div className="space-y-2 animate-[slide-up_0.2s_ease-out]">
                            <Label className="text-sm font-medium">Cada cuántos días</Label>
                            <div className="flex items-center justify-center gap-4">
                                <Button type="button" variant="ghost" size="icon" className="rounded-full h-10 w-10"
                                    onClick={() => { hapticTap(); setValue("frequencyInterval", Math.max(2, watchFrequencyInterval - 1)); }}>
                                    <Minus className="h-4 w-4" />
                                </Button>
                                <span className="text-3xl font-bold w-16 text-center tabular-nums">{watchFrequencyInterval}</span>
                                <Button type="button" variant="ghost" size="icon" className="rounded-full h-10 w-10"
                                    onClick={() => { hapticTap(); setValue("frequencyInterval", Math.min(365, watchFrequencyInterval + 1)); }}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground text-center">días entre cada repetición</p>
                        </div>
                    )}

                    {/* Frequency: X times per week */}
                    {watchFrequencyType === "x_per_week" && (
                        <div className="space-y-2 animate-[slide-up_0.2s_ease-out]">
                            <Label className="text-sm font-medium">Veces por semana</Label>
                            <div className="flex items-center justify-center gap-4">
                                <Button type="button" variant="ghost" size="icon" className="rounded-full h-10 w-10"
                                    onClick={() => {
                                        hapticTap();
                                        const curr = watch("frequency")?.[0] ?? 3;
                                        setValue("frequency", [Math.max(1, curr - 1)]);
                                    }}>
                                    <Minus className="h-4 w-4" />
                                </Button>
                                <span className="text-3xl font-bold w-16 text-center tabular-nums">
                                    {watch("frequency")?.[0] ?? 3}
                                </span>
                                <Button type="button" variant="ghost" size="icon" className="rounded-full h-10 w-10"
                                    onClick={() => {
                                        hapticTap();
                                        const curr = watch("frequency")?.[0] ?? 3;
                                        setValue("frequency", [Math.min(7, curr + 1)]);
                                    }}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground text-center">veces por semana (cualquier día)</p>
                        </div>
                    )}

                    {/* Frequency: Specific dates */}
                    {watchFrequencyType === "specific_dates" && (
                        <div className="space-y-2 animate-[slide-up_0.2s_ease-out]">
                            <Label className="text-sm font-medium">Fechas específicas</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="date"
                                    value={newSpecificDate}
                                    onChange={(e) => setNewSpecificDate(e.target.value)}
                                    className="rounded-2xl h-10 bg-muted/50 border-0 px-4 flex-1 text-sm"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="rounded-2xl h-10 px-3"
                                    onClick={() => {
                                        if (newSpecificDate && !watchSpecificDates.includes(newSpecificDate)) {
                                            setValue("frequencySpecificDates", [...watchSpecificDates, newSpecificDate].sort());
                                            setNewSpecificDate("");
                                        }
                                    }}
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            {watchSpecificDates.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                    {watchSpecificDates.map((d: string) => (
                                        <span key={d} className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-1 rounded-full text-xs font-medium">
                                            {d}
                                            <button type="button" onClick={() => setValue("frequencySpecificDates", watchSpecificDates.filter((x: string) => x !== d))}>
                                                <X className="h-3 w-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Groups */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Grupos</Label>
                        <p className="text-xs text-muted-foreground">Selecciona uno o más grupos.</p>
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
                                            isSelected ? "bg-primary/10" : "bg-muted/30"
                                        )}
                                    >
                                        <div className={cn(
                                            "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all",
                                            isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"
                                        )}>
                                            {isSelected && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
                                        </div>
                                        <span className={cn("text-sm font-medium", isSelected ? "text-foreground" : "text-muted-foreground")}>
                                            {groupName}
                                        </span>
                                    </button>
                                );
                            })}

                            {isCreatingNewGroup ? (
                                <div className="flex gap-2 mt-1">
                                    <Input
                                        placeholder="Nombre del grupo..."
                                        value={newGroupName}
                                        onChange={(e) => setNewGroupName(e.target.value)}
                                        className="rounded-2xl h-10 bg-muted/50 border-0 px-4 flex-1 text-sm"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") { e.preventDefault(); handleAddNewGroup(); }
                                            if (e.key === "Escape") { setIsCreatingNewGroup(false); setNewGroupName(""); }
                                        }}
                                    />
                                    <Button type="button" variant="ghost" className="rounded-2xl h-10 px-3 text-sm" onClick={handleAddNewGroup} disabled={!newGroupName.trim()}>
                                        OK
                                    </Button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => { hapticTap(); setIsCreatingNewGroup(true); }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-primary hover:bg-primary/5 transition-all active:scale-[0.98]"
                                >
                                    <div className="h-5 w-5 rounded-full border-2 border-dashed border-primary/50 flex items-center justify-center">
                                        <Plus className="h-3 w-3 text-primary" />
                                    </div>
                                    <span className="text-sm font-medium">Crear nuevo grupo</span>
                                </button>
                            )}
                        </div>
                        {errors.groups && <p className="text-xs text-destructive">{errors.groups.message}</p>}
                    </div>

                    {/* Priority */}
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
                                    ].map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => { hapticTap(); field.onChange(option.value); }}
                                            className={cn(
                                                "py-2.5 rounded-2xl text-sm font-medium border transition-all active:scale-95",
                                                field.value === option.value
                                                    ? cn(option.color, "ring-1 ring-offset-1 ring-offset-background", option.value === "high" ? "ring-red-500" : option.value === "medium" ? "ring-amber-500" : "ring-emerald-500")
                                                    : "bg-card border-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
                                            )}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        />
                    </div>

                    {/* ─── Notes ─────────────────────────────────── */}
                    <div className="space-y-2">
                        {!showNotes ? (
                            <button
                                type="button"
                                onClick={() => { hapticTap(); setShowNotes(true); }}
                                className="flex items-center gap-2 text-sm text-primary font-medium hover:text-primary/80 transition-colors"
                            >
                                <FileText className="h-4 w-4" />
                                Agregar notas / instrucciones
                            </button>
                        ) : (
                            <div className="animate-[slide-up_0.2s_ease-out]">
                                <Label className="text-sm font-medium">Notas</Label>
                                <textarea
                                    {...register("notes")}
                                    placeholder="Ej: Hacer 3 series de 10 repeticiones, descansar 1 minuto entre series..."
                                    className="w-full mt-1.5 rounded-2xl bg-muted/50 border-0 px-4 py-3 text-sm min-h-[80px] resize-none outline-none focus:ring-2 focus:ring-primary/30"
                                    maxLength={500}
                                />
                                <p className="text-[10px] text-muted-foreground text-right mt-1">{watchNotes.length}/500</p>
                            </div>
                        )}
                    </div>

                    {/* ─── Subtasks (Premium) ────────────────────── */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium">Sub-tareas</Label>
                            {!isPremium && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                        </div>
                        {isPremium ? (
                            <div className="space-y-1.5">
                                {watchSubtasks.map((st: SubTask) => (
                                    <div key={st.id} className="flex items-start gap-2 bg-muted/30 rounded-xl px-3 py-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm">{st.text}</p>
                                            {st.notes && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{st.notes}</p>}
                                        </div>
                                        <button type="button" onClick={() => removeSubtask(st.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors mt-0.5">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                                <div className="flex flex-col gap-2 bg-muted/10 p-2 rounded-xl">
                                    <Input
                                        placeholder="Nueva sub-tarea..."
                                        value={newSubtaskText}
                                        onChange={(e) => setNewSubtaskText(e.target.value)}
                                        className="rounded-xl h-9 bg-muted/50 border-0 px-3 text-sm focus-visible:ring-1"
                                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubtask(); } }}
                                    />
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Notas (opcional)..."
                                            value={newSubtaskNotes}
                                            onChange={(e) => setNewSubtaskNotes(e.target.value)}
                                            className="rounded-xl h-8 bg-muted/50 border-0 px-3 flex-1 text-xs focus-visible:ring-1"
                                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubtask(); } }}
                                        />
                                        <Button type="button" variant="secondary" size="icon" className="rounded-xl h-8 w-8" onClick={addSubtask} disabled={!newSubtaskText.trim()}>
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground">
                                Función Premium — Agregá checklists internas a tus hábitos.
                            </p>
                        )}
                    </div>

                    {/* Submit */}
                    <Button
                        type="submit"
                        disabled={createHabit.isPending || updateHabit.isPending}
                        className="w-full h-12 rounded-2xl font-semibold text-base bubble-shadow bg-primary hover:bg-primary/90 transition-all active:scale-[0.98]"
                    >
                        {(createHabit.isPending || updateHabit.isPending) ? (
                            <span className="flex items-center gap-2">
                                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                {editingHabitId ? "Guardando..." : "Creando..."}
                            </span>
                        ) : (
                            editingHabitId ? "Guardar Cambios" : "Crear Hábito"
                        )}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
