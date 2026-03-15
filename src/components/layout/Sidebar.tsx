"use client";

import { useRouter, usePathname } from "next/navigation";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Home,
    BarChart3,
    Settings,
    Crown,
    LogOut,
    UserCircle,
    Sparkles,
} from "lucide-react";
import { useHabitStore } from "@/store/useHabitStore";
import { useUserStore } from "@/store/useUserStore";
import { signOut } from "@/services/authService";
import { hapticTap } from "@/utils/haptics";

export function Sidebar() {
    const { showSidebar, setShowSidebar } = useHabitStore();
    const user = useUserStore((s) => s.user);
    const router = useRouter();
    const pathname = usePathname();

    const handleSignOut = async () => {
        hapticTap();
        try {
            await signOut();
        } catch (error) {
            console.error("Sign out error:", error);
        }
        setShowSidebar(false);
    };

    return (
        <Sheet open={showSidebar} onOpenChange={setShowSidebar}>
            <SheetContent side="left" className="w-80 bg-bubble-bg border-r-0">
                <SheetHeader className="pb-6">
                    <div className="flex items-center gap-3 px-2">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-pastel-purple to-pastel-blue flex items-center justify-center">
                            {user?.photoURL ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={user.photoURL}
                                    alt="Avatar"
                                    className="h-12 w-12 rounded-full object-cover"
                                />
                            ) : (
                                <UserCircle className="h-7 w-7 text-white" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <SheetTitle className="text-base font-semibold truncate">
                                {user?.displayName ?? "Usuario"}
                            </SheetTitle>
                            <p className="text-xs text-muted-foreground truncate">
                                {user?.email ?? ""}
                            </p>
                        </div>
                    </div>

                    {user?.isPremium && (
                        <Badge className="self-start ml-2 bg-gradient-to-r from-amber-400 to-orange-400 text-white border-0">
                            <Crown className="h-3 w-3 mr-1" /> Premium
                        </Badge>
                    )}
                </SheetHeader>

                <nav className="space-y-1 px-2">
                    <SidebarItem
                        icon={Home}
                        label="Inicio"
                        active={pathname === "/"}
                        onClick={() => {
                            setShowSidebar(false);
                            if (pathname !== "/") router.push("/");
                        }}
                    />
                    <SidebarItem
                        icon={BarChart3}
                        label="Estadísticas"
                        active={pathname === "/estadisticas"}
                        onClick={() => {
                            setShowSidebar(false);
                            if (pathname !== "/estadisticas") router.push("/estadisticas");
                        }}
                    />
                    <SidebarItem
                        icon={Settings}
                        label="Configuración"
                        active={pathname === "/configuracion"}
                        onClick={() => {
                            setShowSidebar(false);
                            if (pathname !== "/configuracion") router.push("/configuracion");
                        }}
                    />

                    <div className="h-px bg-border my-4" />

                    {!user?.isPremium && (
                        <button
                            onClick={() => {
                                hapticTap();
                                setShowSidebar(false);
                                useHabitStore.getState().setShowUpgradeModal(true);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-pastel-purple/20 to-pastel-pink/20 hover:from-pastel-purple/30 hover:to-pastel-pink/30 transition-all group"
                        >
                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-pastel-purple to-pastel-pink flex items-center justify-center">
                                <Sparkles className="h-4 w-4 text-white" />
                            </div>
                            <div className="text-left">
                                <span className="text-sm font-semibold block">
                                    Habitual Pro
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    Hábitos ilimitados
                                </span>
                            </div>
                        </button>
                    )}

                    <div className="h-px bg-border my-4" />

                    <SidebarItem
                        icon={LogOut}
                        label="Cerrar sesión"
                        onClick={handleSignOut}
                    />
                </nav>
            </SheetContent>
        </Sheet>
    );
}

function SidebarItem({
    icon: Icon,
    label,
    active,
    badge,
    onClick,
}: {
    icon: React.ElementType;
    label: string;
    active?: boolean;
    badge?: string;
    onClick?: () => void;
}) {
    return (
        <Button
            variant="ghost"
            className={`w-full justify-start gap-3 h-11 rounded-2xl font-medium ${active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
                }`}
            onClick={() => {
                hapticTap();
                onClick?.();
            }}
        >
            <Icon className="h-5 w-5" />
            <span className="flex-1 text-left">{label}</span>
            {badge && (
                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 rounded-full">
                    {badge}
                </Badge>
            )}
        </Button>
    );
}
