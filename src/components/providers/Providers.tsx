"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useUserStore } from "@/store/useUserStore";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { useState, type ReactNode } from "react";

function AuthGate({ children }: { children: ReactNode }) {
    const { isAuthReady } = useAuth();
    const user = useUserStore((s) => s.user);

    // Still loading auth state
    if (!isAuthReady) {
        return (
            <div className="min-h-dvh bg-bubble-bg flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 animate-[fade-in_0.3s_ease-out]">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-pastel-purple to-pastel-blue flex items-center justify-center bubble-shadow">
                        <span className="text-white text-lg font-bold">H</span>
                    </div>
                    <div className="h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    // Not logged in → show login screen
    if (!user) {
        return <LoginScreen />;
    }

    // Logged in → show app
    return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        retry: 2,
                        refetchOnWindowFocus: false,
                        staleTime: 1000 * 60 * 2,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            <AuthGate>{children}</AuthGate>
        </QueryClientProvider>
    );
}
