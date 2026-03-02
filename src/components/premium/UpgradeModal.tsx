"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useHabitStore } from "@/store/useHabitStore";
import { hapticTap } from "@/utils/haptics";
import { Crown, Infinity, Palette, BarChart3, Shield, Sparkles } from "lucide-react";

const FEATURES = [
    {
        icon: Infinity,
        label: "Hábitos ilimitados",
        description: "Sin límite de 5 hábitos",
    },
    {
        icon: Palette,
        label: "Temas personalizados",
        description: "Colores y temas exclusivos",
    },
    {
        icon: BarChart3,
        label: "Estadísticas avanzadas",
        description: "Gráficos y análisis profundo",
    },
    {
        icon: Shield,
        label: "Respaldo en la nube",
        description: "Tus datos siempre seguros",
    },
];

export function UpgradeModal() {
    const { showUpgradeModal, setShowUpgradeModal } = useHabitStore();

    return (
        <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
            <DialogContent className="rounded-3xl max-w-md mx-4 bg-card border-0 bubble-shadow-lg overflow-hidden p-0">
                {/* Gradient header */}
                <div className="bg-gradient-to-br from-pastel-purple via-pastel-blue to-pastel-pink p-8 text-center relative overflow-hidden">
                    {/* Floating decorative bubbles */}
                    <div className="absolute top-4 left-8 h-6 w-6 rounded-full bg-white/20 animate-[pulse-soft_3s_ease-in-out_infinite]" />
                    <div className="absolute top-12 right-6 h-4 w-4 rounded-full bg-white/15 animate-[pulse-soft_4s_ease-in-out_infinite_0.5s]" />
                    <div className="absolute bottom-6 left-12 h-3 w-3 rounded-full bg-white/10 animate-[pulse-soft_3.5s_ease-in-out_infinite_1s]" />

                    <div className="h-16 w-16 rounded-full bg-white/25 mx-auto mb-4 flex items-center justify-center backdrop-blur-sm">
                        <Crown className="h-8 w-8 text-white" />
                    </div>
                    <DialogHeader className="space-y-1">
                        <DialogTitle className="text-2xl font-bold text-white">
                            Habitual Pro
                        </DialogTitle>
                        <DialogDescription className="text-white/80 text-sm">
                            Desbloquea todo tu potencial
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {/* Features */}
                <div className="p-6 space-y-4">
                    {FEATURES.map((feature) => (
                        <div key={feature.label} className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-2xl bg-pastel-purple/10 flex items-center justify-center flex-shrink-0">
                                <feature.icon className="h-5 w-5 text-pastel-purple" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold">{feature.label}</p>
                                <p className="text-xs text-muted-foreground">
                                    {feature.description}
                                </p>
                            </div>
                        </div>
                    ))}

                    {/* CTA */}
                    <div className="pt-2 space-y-3">
                        <Button
                            className="w-full h-12 rounded-2xl font-semibold text-base bg-gradient-to-r from-pastel-purple to-pastel-blue hover:opacity-90 text-white border-0 bubble-shadow transition-all active:scale-[0.98]"
                            onClick={() => {
                                hapticTap();
                                // TODO: Implement payment flow
                                setShowUpgradeModal(false);
                            }}
                        >
                            <Sparkles className="h-4 w-4 mr-2" />
                            Obtener Pro — $2.99/mes
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full rounded-2xl text-sm text-muted-foreground"
                            onClick={() => {
                                hapticTap();
                                setShowUpgradeModal(false);
                            }}
                        >
                            Quizás más tarde
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
