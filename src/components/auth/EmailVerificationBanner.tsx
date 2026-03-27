"use client";

import { useState } from "react";
import { Mail, X, RefreshCw, Shield } from "lucide-react";
import { useUserStore } from "@/store/useUserStore";
import { getCurrentUser, resendVerificationEmail } from "@/services/authService";
import { hapticTap, hapticSuccess } from "@/utils/haptics";
import { cn } from "@/lib/utils";

export function EmailVerificationBanner() {
    const user = useUserStore((s) => s.user);
    const [dismissed, setDismissed] = useState(false);
    const [resending, setResending] = useState(false);
    const [resent, setResent] = useState(false);

    // Only show for email/password users that are NOT verified
    const firebaseUser = getCurrentUser();
    const isEmailUser = firebaseUser?.providerData?.some(
        (p) => p.providerId === "password"
    );

    if (!user || !isEmailUser || firebaseUser?.emailVerified || dismissed) {
        return null;
    }

    const handleResend = async () => {
        hapticTap();
        setResending(true);
        try {
            await resendVerificationEmail();
            hapticSuccess();
            setResent(true);
            setTimeout(() => setResent(false), 5000);
        } catch {
            alert("Error al reenviar el email. Intentá de nuevo más tarde.");
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="mx-4 mb-4 animate-[slide-up_0.3s_ease-out]">
            <div className="relative bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-2xl p-4 border border-amber-500/20">
                {/* Close */}
                <button
                    onClick={() => { hapticTap(); setDismissed(true); }}
                    className="absolute top-2 right-2 p-1 rounded-full text-muted-foreground hover:text-foreground transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>

                <div className="flex items-start gap-3 pr-6">
                    <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <Shield className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-foreground">Verificá tu email</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Te enviamos un email de verificación a <span className="font-medium text-foreground">{user.email}</span>.
                             Revisá tu bandeja de entrada y spam.
                        </p>
                        <div className="flex items-center gap-2 mt-2.5">
                            <button
                                onClick={handleResend}
                                disabled={resending || resent}
                                className={cn(
                                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95",
                                    resent
                                        ? "bg-emerald-500/20 text-emerald-600"
                                        : "bg-amber-500/20 text-amber-700 hover:bg-amber-500/30"
                                )}
                            >
                                {resending ? (
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                ) : resent ? (
                                    <Mail className="h-3 w-3" />
                                ) : (
                                    <RefreshCw className="h-3 w-3" />
                                )}
                                {resent ? "¡Email reenviado!" : "Reenviar email"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Security info */}
                <div className="mt-3 pt-3 border-t border-amber-500/10">
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        El email se envía desde <span className="font-medium">noreply@{user.email?.split("@")[1] ?? "habitual.app"}</span>
                        — Verificar tu email protege tu cuenta.
                    </p>
                </div>
            </div>
        </div>
    );
}
