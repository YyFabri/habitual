"use client";

import { useState, useEffect } from "react";
import {
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    signInWithGoogleAndLinkEmail,
    signInWithGoogleForMerge,
    signInWithEmailAndLinkGoogle,
    cleanupGoogleUser,
    getSignInMethodsForEmail,
    getCredentialFromError,
    setMergeInProgress,
    notifyMergeComplete,
    sendVerificationEmail,
    handleRedirectResult,
} from "@/services/authService";
import { getUserProfileByEmail } from "@/services/habitService";
import { hapticTap, hapticSuccess } from "@/utils/haptics";
import { cn } from "@/lib/utils";
import { Mail, Lock, User, Eye, EyeOff, Sparkles, X } from "lucide-react";
import type { OAuthCredential } from "firebase/auth";

type AuthMode = "login" | "register";

// Dialog for Email→Google merge (user registered with email, now trying to add Google)
interface EmailToGoogleMerge {
    email: string;
    password: string;
    displayName: string;
}

// Dialog for Google→Email merge (user has email/password, clicked "Continue with Google")
interface GoogleToEmailMerge {
    email: string;
    googleCredential: OAuthCredential;
}

export function LoginScreen() {
    const [mode, setMode] = useState<AuthMode>("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Merge dialogs
    const [emailToGoogleMerge, setEmailToGoogleMerge] = useState<EmailToGoogleMerge | null>(null);
    const [googleToEmailMerge, setGoogleToEmailMerge] = useState<GoogleToEmailMerge | null>(null);
    const [mergePassword, setMergePassword] = useState("");

    // Handle redirect result on mount (for mobile/PWA Google sign-in)
    useEffect(() => {
        handleRedirectResult().then((user) => {
            if (user) {
                console.log("[LoginScreen] Redirect sign-in completed:", user.email);
                setMergeInProgress(false);
                notifyMergeComplete(user);
            }
        });
    }, []);

    // ─── Email/Password Form Submit ──────────────────────────
    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        hapticTap();
        setError(null);
        setIsLoading(true);

        try {
            if (mode === "register") {
                if (!displayName.trim()) {
                    setError("Ingresá tu nombre");
                    setIsLoading(false);
                    return;
                }
                const user = await registerWithEmail(email, password, displayName.trim());
                await sendVerificationEmail(user);
                alert("¡Bienvenido! Te enviamos un correo. Por favor verificalo antes de usar Google para evitar problemas.");
            } else {
                await signInWithEmail(email, password);
            }
            hapticSuccess();
        } catch (err: unknown) {
            const firebaseError = err as { code?: string; message?: string };

            if (firebaseError.code === "auth/email-already-in-use") {
                // If account exists, offer merge unless we are SURE it's password-only.
                // Works even if "Email Enumeration Protection" hides providers (returns []).
                try {
                    const providers = await getSignInMethodsForEmail(email);

                    if (!providers.includes("password")) {
                        setEmailToGoogleMerge({ email, password, displayName });
                    } else {
                        setError("El email ya está registrado con contraseña. Por favor iniciá sesión.");
                    }
                } catch (e) {
                    // Fallback: Offer merge just in case
                    setEmailToGoogleMerge({ email, password, displayName });
                }
            } else {
                setError(getErrorMessage(firebaseError.code));
            }
        } finally {
            setIsLoading(false);
        }
    };

    // ─── Google Sign-In ──────────────────────────────────────
    const handleGoogleAuth = async () => {
        hapticTap();
        setError(null);
        setIsLoading(true);

        try {
            // Use merge-aware Google sign-in to get credential + block auth listener
            const result = await signInWithGoogleForMerge();
            if (!result) return; // redirect flow

            const { user: googleUser, credential, isNewUser } = result;

            console.log("[LoginScreen] Google Sign In:", {
                uid: googleUser.uid,
                email: googleUser.email,
                isNewUser
            });

            if (isNewUser) {
                // Check if an existing email/password profile exists for this email
                const existingProfile = await getUserProfileByEmail(googleUser.email!);

                if (existingProfile && existingProfile.uid !== googleUser.uid) {
                    // Check if it's a real password account or just a ghost profile (deleted Auth user)
                    const methods = await getSignInMethodsForEmail(googleUser.email!);
                    const hasPassword = methods.includes("password");

                    if (hasPassword) {
                        // CONFLICT: Real email/password account exists → clean up phantom Google account
                        await cleanupGoogleUser(googleUser);
                        setGoogleToEmailMerge({
                            email: googleUser.email!,
                            googleCredential: credential,
                        });
                        hapticSuccess();
                        return;
                    } else {
                        console.log("[LoginScreen] Orphaned profile found (no password provider), ignoring conflict and creating new profile.");
                    }
                }
            }

            // No conflict — proceed normally
            setMergeInProgress(false);
            notifyMergeComplete(googleUser);
            hapticSuccess();
        } catch (err: unknown) {
            const firebaseError = err as { code?: string; customData?: { email?: string } };

            // Handle standard "account exists" error if Firebase throws it (e.g. if "One account per email" is strictly enforced)
            if (firebaseError.code === "auth/account-exists-with-different-credential") {
                const credential = getCredentialFromError(err);
                if (credential && firebaseError.customData?.email) {
                    setGoogleToEmailMerge({
                        email: firebaseError.customData.email,
                        googleCredential: credential,
                    });
                    return;
                }
            }

            setError(getErrorMessage(firebaseError.code));
        } finally {
            setIsLoading(false);
        }
    };

    // ─── Email→Google Merge (user has Google, adding email/password) ──
    const handleEmailToGoogleMerge = async () => {
        if (!emailToGoogleMerge) return;
        hapticTap();
        setIsLoading(true);
        setError(null);

        try {
            await signInWithGoogleAndLinkEmail(
                emailToGoogleMerge.email,
                emailToGoogleMerge.password
            );
            hapticSuccess();
            setEmailToGoogleMerge(null);
        } catch (err: unknown) {
            const firebaseError = err as { code?: string; message?: string };
            if (firebaseError.message === "redirect") return;
            setError(getErrorMessage(firebaseError.code));
        } finally {
            setIsLoading(false);
        }
    };

    // ─── Google→Email Merge (user has email/password, adding Google) ──
    const handleGoogleToEmailMerge = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!googleToEmailMerge) return;
        hapticTap();
        setIsLoading(true);
        setError(null);

        try {
            const user = await signInWithEmailAndLinkGoogle(
                googleToEmailMerge.email,
                mergePassword,
                googleToEmailMerge.googleCredential
            );
            hapticSuccess();
            setGoogleToEmailMerge(null);
            setMergePassword("");
            notifyMergeComplete(user);
        } catch (error: unknown) {
            const err = error as { code?: string; message?: string };
            setError(getErrorMessage(err.code));
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeepSeparate = (type: "emailToGoogle" | "googleToEmail") => {
        hapticTap();
        if (type === "emailToGoogle") {
            setEmailToGoogleMerge(null);
        } else {
            setGoogleToEmailMerge(null);
            setMergePassword("");
            setMergeInProgress(false);
        }
        setError("Usá otro email para crear una cuenta separada.");
    };

    const activeMerge = emailToGoogleMerge || googleToEmailMerge;

    return (
        <div className="min-h-dvh bg-bubble-bg flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
            {/* Decorative floating bubbles */}
            <div className="absolute top-16 left-8 h-20 w-20 rounded-full bg-pastel-purple/15 animate-[pulse-soft_4s_ease-in-out_infinite]" />
            <div className="absolute top-32 right-6 h-12 w-12 rounded-full bg-pastel-pink/20 animate-[pulse-soft_3s_ease-in-out_infinite_0.5s]" />
            <div className="absolute bottom-24 left-12 h-16 w-16 rounded-full bg-pastel-blue/15 animate-[pulse-soft_5s_ease-in-out_infinite_1s]" />
            <div className="absolute bottom-40 right-10 h-8 w-8 rounded-full bg-pastel-green/20 animate-[pulse-soft_3.5s_ease-in-out_infinite_0.8s]" />
            <div className="absolute top-1/2 left-4 h-6 w-6 rounded-full bg-pastel-yellow/20 animate-[pulse-soft_4.5s_ease-in-out_infinite_1.5s]" />

            {/* Logo & Title */}
            <div className="text-center mb-8 animate-[fade-in_0.5s_ease-out]">
                <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-pastel-purple to-pastel-blue flex items-center justify-center mx-auto mb-4 bubble-shadow-lg">
                    <Sparkles className="h-10 w-10 text-white" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight">Habitual</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Construí mejores hábitos, día a día
                </p>
            </div>

            {/* Auth Card */}
            <div className="w-full max-w-sm animate-[slide-up_0.4s_ease-out]">
                <div className="bg-card rounded-3xl p-6 bubble-shadow-lg space-y-5">

                    {/* Mode Tabs */}
                    <div className="flex gap-1 bg-muted/50 rounded-2xl p-1">
                        <button
                            type="button"
                            onClick={() => {
                                hapticTap();
                                setMode("login");
                                setError(null);
                            }}
                            className={cn(
                                "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                                mode === "login"
                                    ? "bg-card text-foreground bubble-shadow"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Iniciar Sesión
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                hapticTap();
                                setMode("register");
                                setError(null);
                            }}
                            className={cn(
                                "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                                mode === "register"
                                    ? "bg-card text-foreground bubble-shadow"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Registrarse
                        </button>
                    </div>

                    {/* Email/Password Form */}
                    <form onSubmit={handleEmailAuth} className="space-y-3">
                        {mode === "register" && (
                            <div className="relative animate-[slide-up_0.2s_ease-out]">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Tu nombre"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className="w-full h-12 pl-11 pr-4 rounded-2xl bg-muted/50 text-sm font-medium placeholder:text-muted-foreground/60 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                                    autoComplete="name"
                                />
                            </div>
                        )}

                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full h-12 pl-11 pr-4 rounded-2xl bg-muted/50 text-sm font-medium placeholder:text-muted-foreground/60 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                                autoComplete="email"
                                required
                            />
                        </div>

                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Contraseña"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full h-12 pl-11 pr-11 rounded-2xl bg-muted/50 text-sm font-medium placeholder:text-muted-foreground/60 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                                autoComplete={mode === "register" ? "new-password" : "current-password"}
                                required
                                minLength={6}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>

                        {error && !activeMerge && (
                            <p className="text-xs text-destructive text-center px-2 animate-[fade-in_0.2s_ease-out]">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={cn(
                                "w-full h-12 rounded-2xl font-semibold text-sm transition-all duration-200",
                                "bg-primary text-primary-foreground bubble-shadow",
                                "hover:bg-primary/90 active:scale-[0.98]",
                                "disabled:opacity-60 disabled:cursor-not-allowed"
                            )}
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                    {mode === "login" ? "Ingresando..." : "Creando cuenta..."}
                                </span>
                            ) : mode === "login" ? (
                                "Iniciar Sesión"
                            ) : (
                                "Crear Cuenta"
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-muted-foreground font-medium">o</span>
                        <div className="flex-1 h-px bg-border" />
                    </div>

                    {/* Google Sign In */}
                    <button
                        onClick={handleGoogleAuth}
                        disabled={isLoading}
                        className={cn(
                            "w-full h-12 rounded-2xl font-semibold text-sm transition-all duration-200",
                            "bg-muted/50 text-foreground",
                            "hover:bg-muted active:scale-[0.98]",
                            "flex items-center justify-center gap-3",
                            "disabled:opacity-60 disabled:cursor-not-allowed"
                        )}
                    >
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Continuar con Google
                    </button>
                </div>

                <p className="text-center text-xs text-muted-foreground mt-6 px-4 leading-relaxed">
                    Al continuar, aceptás nuestros términos de servicio y política de privacidad.
                </p>
            </div>

            {/* ═══════════════════════════════════════════════════ */}
            {/* ─── Email→Google Merge Dialog (adding email to Google account) ─── */}
            {emailToGoogleMerge && (
                <MergeDialog
                    onClose={() => setEmailToGoogleMerge(null)}
                    title="Cuenta existente"
                    description={
                        <>
                            Ya existe una cuenta con{" "}
                            <span className="font-semibold text-foreground">{emailToGoogleMerge.email}</span>
                            {" "}vinculada a Google. ¿Querés vincular ambos métodos?
                        </>
                    }
                    error={error}
                    isLoading={isLoading}
                    onMerge={handleEmailToGoogleMerge}
                    mergeLabel="Sí, vincular cuentas"
                    onKeepSeparate={() => handleKeepSeparate("emailToGoogle")}
                />
            )}

            {/* ─── Google→Email Merge Dialog (adding Google to email account) ─── */}
            {googleToEmailMerge && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-[fade-in_0.2s_ease-out]"
                        onClick={() => {
                            setGoogleToEmailMerge(null);
                            setMergePassword("");
                            setMergeInProgress(false);
                        }}
                    />
                    <div className="relative bg-card rounded-3xl p-6 w-full max-w-sm bubble-shadow-lg animate-[scale-in_0.3s_ease-out] space-y-4">
                        <button
                            onClick={() => {
                                setGoogleToEmailMerge(null);
                                setMergePassword("");
                                setMergeInProgress(false);
                            }}
                            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        {/* Icon */}
                        <div className="flex justify-center">
                            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-pastel-blue to-pastel-purple flex items-center justify-center">
                                <Mail className="h-7 w-7 text-white" />
                            </div>
                        </div>

                        {/* Text */}
                        <div className="text-center space-y-2">
                            <h3 className="text-lg font-bold">Cuenta existente</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Ya tenés una cuenta con email y contraseña usando{" "}
                                <span className="font-semibold text-foreground">{googleToEmailMerge.email}</span>.
                            </p>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Para vincular Google, ingresá tu contraseña:
                            </p>
                        </div>

                        {/* Password input */}
                        <form onSubmit={handleGoogleToEmailMerge} className="space-y-3">
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="password"
                                    placeholder="Tu contraseña"
                                    value={mergePassword}
                                    onChange={(e) => setMergePassword(e.target.value)}
                                    className="w-full h-12 pl-11 pr-4 rounded-2xl bg-muted/50 text-sm font-medium placeholder:text-muted-foreground/60 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                                    autoComplete="current-password"
                                    required
                                    minLength={6}
                                    autoFocus
                                />
                            </div>

                            {error && (
                                <p className="text-xs text-destructive text-center animate-[fade-in_0.2s_ease-out]">
                                    {error}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className={cn(
                                    "w-full h-12 rounded-2xl font-semibold text-sm transition-all duration-200",
                                    "bg-primary text-primary-foreground bubble-shadow",
                                    "hover:bg-primary/90 active:scale-[0.98]",
                                    "disabled:opacity-60 disabled:cursor-not-allowed",
                                    "flex items-center justify-center gap-2"
                                )}
                            >
                                {isLoading ? (
                                    <>
                                        <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                        Vinculando...
                                    </>
                                ) : (
                                    "Vincular con Google"
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => handleKeepSeparate("googleToEmail")}
                                disabled={isLoading}
                                className={cn(
                                    "w-full h-12 rounded-2xl font-semibold text-sm transition-all duration-200",
                                    "bg-muted/50 text-muted-foreground",
                                    "hover:bg-muted hover:text-foreground active:scale-[0.98]",
                                    "disabled:opacity-60 disabled:cursor-not-allowed"
                                )}
                            >
                                No, usar otro email
                            </button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}

// ─── Reusable Merge Dialog (for Email→Google case) ───────────

function MergeDialog({
    onClose,
    title,
    description,
    error,
    isLoading,
    onMerge,
    mergeLabel,
    onKeepSeparate,
}: {
    onClose: () => void;
    title: string;
    description: React.ReactNode;
    error: string | null;
    isLoading: boolean;
    onMerge: () => void;
    mergeLabel: string;
    onKeepSeparate: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-[fade-in_0.2s_ease-out]"
                onClick={onClose}
            />
            <div className="relative bg-card rounded-3xl p-6 w-full max-w-sm bubble-shadow-lg animate-[scale-in_0.3s_ease-out] space-y-4">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="flex justify-center">
                    <div className="h-14 w-14 rounded-full bg-gradient-to-br from-pastel-orange to-pastel-yellow flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                    </div>
                </div>

                <div className="text-center space-y-2">
                    <h3 className="text-lg font-bold">{title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                </div>

                {error && (
                    <p className="text-xs text-destructive text-center animate-[fade-in_0.2s_ease-out]">
                        {error}
                    </p>
                )}

                <div className="space-y-2.5">
                    <button
                        onClick={onMerge}
                        disabled={isLoading}
                        className={cn(
                            "w-full h-12 rounded-2xl font-semibold text-sm transition-all duration-200",
                            "bg-primary text-primary-foreground bubble-shadow",
                            "hover:bg-primary/90 active:scale-[0.98]",
                            "disabled:opacity-60 disabled:cursor-not-allowed",
                            "flex items-center justify-center gap-2"
                        )}
                    >
                        {isLoading ? (
                            <>
                                <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                Vinculando...
                            </>
                        ) : (
                            mergeLabel
                        )}
                    </button>

                    <button
                        onClick={onKeepSeparate}
                        disabled={isLoading}
                        className={cn(
                            "w-full h-12 rounded-2xl font-semibold text-sm transition-all duration-200",
                            "bg-muted/50 text-muted-foreground",
                            "hover:bg-muted hover:text-foreground active:scale-[0.98]",
                            "disabled:opacity-60 disabled:cursor-not-allowed"
                        )}
                    >
                        No, usar otro email
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Firebase Error Messages (Spanish) ──────────────────────

function getErrorMessage(code?: string): string {
    switch (code) {
        case "auth/email-already-in-use":
            return "Este email ya está registrado. Intentá iniciar sesión.";
        case "auth/invalid-email":
            return "El email no es válido.";
        case "auth/user-disabled":
            return "Esta cuenta fue deshabilitada.";
        case "auth/user-not-found":
            return "No existe una cuenta con este email.";
        case "auth/wrong-password":
            return "Contraseña incorrecta.";
        case "auth/invalid-credential":
            return "Email o contraseña incorrectos.";
        case "auth/weak-password":
            return "La contraseña debe tener al menos 6 caracteres.";
        case "auth/too-many-requests":
            return "Demasiados intentos. Esperá un momento e intentá de nuevo.";
        case "auth/popup-blocked":
            return "El popup fue bloqueado. Permití popups para esta página.";
        case "auth/popup-closed-by-user":
            return "Se cerró la ventana de inicio de sesión.";
        case "auth/network-request-failed":
            return "Error de conexión. Verificá tu internet.";
        case "auth/credential-already-in-use":
            return "Esta credencial ya está vinculada a otra cuenta.";
        case "auth/email-mismatch":
            return "Iniciaste sesión con una cuenta de Google diferente. Elegí la cuenta correcta.";
        default:
            return "Ocurrió un error. Intentá de nuevo.";
    }
}
