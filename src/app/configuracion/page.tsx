"use client";

import { useState, useRef } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/useUserStore";
import { useUpdateUserProfile } from "@/hooks/useHabits";
import { AppHeader } from "@/components/layout/AppHeader";
import { Sidebar } from "@/components/layout/Sidebar";
import { UpgradeModal } from "@/components/premium/UpgradeModal";
import { NewHabitDialog } from "@/components/habits/NewHabitDialog";
import { OfflineIndicator } from "@/components/layout/OfflineIndicator";
import { hapticTap, hapticSuccess } from "@/utils/haptics";
import { cn } from "@/lib/utils";
import {
    UserCircle,
    Sun,
    Moon,
    Monitor,
    Clock,
    Bell,
    Download,
    Trash2,
    Info,
    ChevronRight,
    Camera,
    Shield,
    Sparkles,
    HelpCircle,
    Mail,
    MessageCircle,
    ChevronDown,
} from "lucide-react";
import { signOut, getCurrentUser } from "@/services/authService";
import { updateProfile as firebaseUpdateProfile } from "firebase/auth";
import { useEffect } from "react";

// ─── Setting Row Component ──────────────────────────────────
function SettingRow({
    icon: Icon,
    label,
    description,
    children,
    onClick,
    danger,
}: {
    icon: React.ElementType;
    label: string;
    description?: string;
    children?: React.ReactNode;
    onClick?: () => void;
    danger?: boolean;
}) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all",
                onClick && "cursor-pointer hover:bg-accent/50 active:scale-[0.99]",
                danger && "text-destructive"
            )}
        >
            <div
                className={cn(
                    "h-9 w-9 rounded-full flex items-center justify-center shrink-0",
                    danger ? "bg-destructive/10" : "bg-accent"
                )}
            >
                <Icon className={cn("h-4.5 w-4.5", danger ? "text-destructive" : "text-muted-foreground")} />
            </div>
            <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium", danger && "text-destructive")}>{label}</p>
                {description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                )}
            </div>
            {children}
            {onClick && !children && (
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
            )}
        </div>
    );
}

// ─── Section Component ──────────────────────────────────────
function SettingSection({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 mb-2">
                {title}
            </h2>
            <div className="bg-card rounded-3xl bubble-shadow overflow-hidden divide-y divide-border/50">
                {children}
            </div>
        </div>
    );
}

// ─── Theme Selector ─────────────────────────────────────────
function ThemeSelector() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);
    if (!mounted) return null;

    const options = [
        { value: "light", label: "Claro", icon: Sun },
        { value: "dark", label: "Oscuro", icon: Moon },
        { value: "system", label: "Auto", icon: Monitor },
    ] as const;

    return (
        <div className="px-4 py-3.5">
            <div className="flex items-center gap-4 mb-3">
                <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center shrink-0">
                    <Sun className="h-4.5 w-4.5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">Tema</p>
            </div>
            <div className="grid grid-cols-3 gap-2 ml-13">
                {options.map((opt) => {
                    const isActive = theme === opt.value;
                    const IconComp = opt.icon;
                    return (
                        <button
                            key={opt.value}
                            onClick={() => {
                                hapticTap();
                                setTheme(opt.value);
                            }}
                            className={cn(
                                "flex flex-col items-center gap-1.5 py-3 rounded-2xl text-xs font-medium transition-all active:scale-95",
                                isActive
                                    ? "bg-primary text-primary-foreground bubble-shadow"
                                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                            )}
                        >
                            <IconComp className="h-5 w-5" />
                            {opt.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Day Change Hour Selector ───────────────────────────────
function DayChangeSelector() {
    const user = useUserStore((s) => s.user);
    const updateProfile = useUpdateUserProfile();
    const currentHour = user?.dayChangeHour ?? 3;

    const hours = [0, 1, 2, 3, 4, 5, 6];

    return (
        <div className="px-4 py-3.5">
            <div className="flex items-center gap-4 mb-1">
                <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center shrink-0">
                    <Clock className="h-4.5 w-4.5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                    <p className="text-sm font-medium">Cambio de día</p>
                    <p className="text-xs text-muted-foreground">
                        El día cambia a las {currentHour}:00 hs
                    </p>
                </div>
            </div>
            <div className="flex gap-1.5 ml-13 mt-2">
                {hours.map((h) => (
                    <button
                        key={h}
                        onClick={() => {
                            hapticTap();
                            updateProfile.mutate({ dayChangeHour: h } as any);
                        }}
                        className={cn(
                            "flex-1 py-2 rounded-xl text-xs font-medium transition-all active:scale-95",
                            currentHour === h
                                ? "bg-primary text-primary-foreground bubble-shadow"
                                : "bg-muted/50 text-muted-foreground hover:bg-muted"
                        )}
                    >
                        {h}:00
                    </button>
                ))}
            </div>
        </div>
    );
}

// ─── FAQ Item ───────────────────────────────────────────────
function FaqItem({ question, answer }: { question: string; answer: string }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="px-4 py-3">
            <button
                onClick={() => {
                    hapticTap();
                    setOpen(!open);
                }}
                className="w-full flex items-center justify-between text-left"
            >
                <p className="text-sm font-medium pr-4">{question}</p>
                <ChevronDown
                    className={cn(
                        "h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200",
                        open && "rotate-180"
                    )}
                />
            </button>
            {open && (
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed animate-[fade-in_0.2s_ease-out]">
                    {answer}
                </p>
            )}
        </div>
    );
}

// ─── Image Resize Utility ───────────────────────────────────
function resizeImageToBase64(file: File, maxSize: number = 128): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = maxSize;
                canvas.height = maxSize;
                const ctx = canvas.getContext("2d")!;

                // Crop to square (center)
                const min = Math.min(img.width, img.height);
                const sx = (img.width - min) / 2;
                const sy = (img.height - min) / 2;
                ctx.drawImage(img, sx, sy, min, min, 0, 0, maxSize, maxSize);

                // Compress as JPEG at 70% quality
                resolve(canvas.toDataURL("image/jpeg", 0.7));
            };
            img.onerror = reject;
            img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ─── Main Settings Page ─────────────────────────────────────
export default function ConfiguracionPage() {
    const user = useUserStore((s) => s.user);
    const setUser = useUserStore((s) => s.setUser);
    const router = useRouter();
    const updateProfile = useUpdateUserProfile();

    const [editingName, setEditingName] = useState(false);
    const [tempName, setTempName] = useState(user?.displayName ?? "");
    const nameInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!user) {
            router.push("/");
        }
    }, [user, router]);

    useEffect(() => {
        if (editingName && nameInputRef.current) {
            nameInputRef.current.focus();
        }
    }, [editingName]);

    if (!user) return null;

    const handleSaveName = async () => {
        const name = tempName.trim();
        if (name && name !== user.displayName) {
            // Update Firestore profile
            updateProfile.mutate({ displayName: name });
            // Also update Firebase Auth profile so it persists across sessions
            const firebaseUser = getCurrentUser();
            if (firebaseUser) {
                try {
                    await firebaseUpdateProfile(firebaseUser, { displayName: name });
                } catch (e) {
                    console.error("Error updating Firebase Auth displayName:", e);
                }
            }
            // Update local store immediately
            if (user) setUser({ ...user, displayName: name });
            hapticSuccess();
        }
        setEditingName(false);
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith("image/")) {
            alert("Por favor seleccioná una imagen.");
            return;
        }

        // Validate file size (max 5MB before compression)
        if (file.size > 5 * 1024 * 1024) {
            alert("La imagen es muy grande. Máximo 5MB.");
            return;
        }

        try {
            hapticTap();
            const base64 = await resizeImageToBase64(file, 200);
            // Update Firestore profile
            updateProfile.mutate({ photoURL: base64 });
            // Also update Firebase Auth profile
            const firebaseUser = getCurrentUser();
            if (firebaseUser) {
                try {
                    await firebaseUpdateProfile(firebaseUser, { photoURL: base64 });
                } catch (e) {
                    console.error("Error updating Firebase Auth photoURL:", e);
                }
            }
            // Update local store immediately
            if (user) setUser({ ...user, photoURL: base64 });
            hapticSuccess();
        } catch {
            alert("Error al procesar la imagen. Intentá con otra.");
        }

        // Reset input so the same file can be selected again
        e.target.value = "";
    };

    const handleExportData = () => {
        hapticTap();
        import("@/repositories/FirestoreHabitRepository").then(async ({ habitRepository }) => {
            const habits = await habitRepository.getHabits(user.uid);
            const logs = await habitRepository.getAllHabitLogs(user.uid);
            const data = {
                exportedAt: new Date().toISOString(),
                user: {
                    displayName: user.displayName,
                    email: user.email,
                    createdAt: user.createdAt,
                },
                habits,
                logs,
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `habitual-backup-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            hapticSuccess();
        });
    };

    const handleDeleteAccount = async () => {
        if (!confirm("⚠️ ¿Estás seguro de que querés eliminar tu cuenta? Esta acción es irreversible y se borrarán todos tus datos.")) return;
        if (!confirm("Esta es tu última oportunidad. ¿Eliminar cuenta permanentemente?")) return;
        hapticTap();
        try {
            await signOut();
        } catch (e) {
            console.error("Delete account error:", e);
        }
    };

    return (
        <div className="min-h-dvh bg-bubble-bg flex flex-col">
            <OfflineIndicator />
            <AppHeader />

            <main className="flex-1 pb-safe overflow-y-auto">
                <div className="px-4 py-4 max-w-lg mx-auto w-full space-y-6 pb-24">
                    <h1 className="text-2xl font-bold">Configuración</h1>

                    {/* ─── Profile Section ─────────────────────── */}
                    <SettingSection title="Perfil">
                        <div className="px-4 py-4 flex items-center gap-4">
                            <div className="relative">
                                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-pastel-purple to-pastel-blue flex items-center justify-center overflow-hidden">
                                    {user.photoURL ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={user.photoURL}
                                            alt="Avatar"
                                            className="h-16 w-16 rounded-full object-cover"
                                        />
                                    ) : (
                                        <UserCircle className="h-8 w-8 text-white" />
                                    )}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handlePhotoUpload}
                                />
                                <button
                                    className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center bubble-shadow"
                                    onClick={() => {
                                        hapticTap();
                                        fileInputRef.current?.click();
                                    }}
                                >
                                    <Camera className="h-3.5 w-3.5" />
                                </button>
                            </div>
                            <div className="flex-1 min-w-0">
                                {editingName ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            ref={nameInputRef}
                                            type="text"
                                            value={tempName}
                                            onChange={(e) => setTempName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") handleSaveName();
                                                if (e.key === "Escape") setEditingName(false);
                                            }}
                                            className="flex-1 h-9 px-3 rounded-xl bg-muted/50 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30"
                                        />
                                        <button
                                            onClick={handleSaveName}
                                            className="text-xs font-semibold text-primary hover:text-primary/80"
                                        >
                                            Guardar
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        <button
                                            onClick={() => {
                                                hapticTap();
                                                setTempName(user.displayName ?? "");
                                                setEditingName(true);
                                            }}
                                            className="text-left group"
                                        >
                                            <p className="font-semibold text-base group-hover:text-primary transition-colors">
                                                {user.displayName ?? "Sin nombre"}
                                            </p>
                                            <p className="text-xs text-primary/70 mt-0.5">Tocar para editar</p>
                                        </button>
                                        <p className="text-xs text-muted-foreground mt-1 truncate">
                                            {user.email ?? "Sin email"}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </SettingSection>

                    {/* ─── Appearance Section ──────────────────── */}
                    <SettingSection title="Apariencia">
                        <ThemeSelector />
                    </SettingSection>

                    {/* ─── Preferences Section ────────────────── */}
                    <SettingSection title="Preferencias">
                        <DayChangeSelector />
                        <SettingRow
                            icon={Bell}
                            label="Recordatorios"
                            description="Recibí notificaciones para tus hábitos"
                            onClick={() => {
                                hapticTap();
                                alert("Las notificaciones push estarán disponibles en una próxima actualización.");
                            }}
                        />
                    </SettingSection>

                    {/* ─── Data Section ────────────────────────── */}
                    <SettingSection title="Datos">
                        <SettingRow
                            icon={Download}
                            label="Exportar datos"
                            description="Descargá un respaldo de tus hábitos en JSON"
                            onClick={handleExportData}
                        />
                    </SettingSection>

                    {/* ─── Help & Contact Section ─────────────── */}
                    <SettingSection title="Ayuda y contacto">
                        <FaqItem
                            question="¿Cómo creo un hábito?"
                            answer="Tocá el botón '+' en la pantalla principal. Elegí un nombre, ícono, color, y los días en que querés rastrearlo."
                        />
                        <FaqItem
                            question="¿Qué pasa si borro un hábito?"
                            answer="Si el hábito tiene historial de completados se archiva (tu progreso pasado se mantiene). Si nunca lo completaste, se borra por completo."
                        />
                        <FaqItem
                            question="¿La app funciona sin internet?"
                            answer="¡Sí! Tus datos se guardan localmente y se sincronizan cuando vuelvas a tener conexión."
                        />
                        <FaqItem
                            question="¿Cómo cambio el tema oscuro/claro?"
                            answer="En Configuración → Apariencia podés elegir entre Claro, Oscuro, o Auto (sigue el tema de tu dispositivo)."
                        />
                        <FaqItem
                            question="¿Qué es el 'Cambio de día'?"
                            answer="Es la hora a la que la app considera que empieza un nuevo día. Si ponés 3:00, hasta las 2:59 AM sigue siendo 'ayer'. Útil para noctámbulos."
                        />
                        <SettingRow
                            icon={Mail}
                            label="Contacto por email"
                            description="Envianos tus dudas o sugerencias"
                            onClick={() => {
                                hapticTap();
                                window.open("mailto:soporte@habitual.app?subject=Consulta%20Habitual", "_blank");
                            }}
                        />
                        <SettingRow
                            icon={MessageCircle}
                            label="Reportar un error"
                            description="Ayudanos a mejorar la app"
                            onClick={() => {
                                hapticTap();
                                window.open("https://github.com/YyFabri/habitual/issues/new", "_blank");
                            }}
                        />
                    </SettingSection>

                    {/* ─── Account Section ─────────────────────── */}
                    <SettingSection title="Cuenta">
                        <SettingRow
                            icon={Shield}
                            label="Proveedores vinculados"
                            description={
                                user.email
                                    ? `Email: ${user.email}`
                                    : "Ningún proveedor vinculado"
                            }
                        />
                        {!user.isPremium && (
                            <SettingRow
                                icon={Sparkles}
                                label="Actualizar a Premium"
                                description="Hábitos ilimitados y más"
                                onClick={() => {
                                    hapticTap();
                                    import("@/store/useHabitStore").then(({ useHabitStore }) => {
                                        useHabitStore.getState().setShowUpgradeModal(true);
                                    });
                                }}
                            />
                        )}
                        <SettingRow
                            icon={Trash2}
                            label="Eliminar cuenta"
                            description="Esta acción es irreversible"
                            danger
                            onClick={handleDeleteAccount}
                        />
                    </SettingSection>

                    {/* ─── About Section ───────────────────────── */}
                    <SettingSection title="Acerca de">
                        <SettingRow
                            icon={Info}
                            label="Habitual"
                            description="Versión 1.0.0"
                        >
                            <span className="text-xs text-muted-foreground">
                                hecho con 💜
                            </span>
                        </SettingRow>
                        <div className="px-4 py-3 text-center">
                            <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
                                © {new Date().getFullYear()} YyFabri. Todos los derechos reservados.
                                <br />
                                Habitual es una marca registrada. Queda prohibida la reproducción
                                total o parcial sin autorización.
                            </p>
                        </div>
                    </SettingSection>
                </div>
            </main>

            {/* Modals & Overlays */}
            <Sidebar />
            <NewHabitDialog />
            <UpgradeModal />
        </div>
    );
}
