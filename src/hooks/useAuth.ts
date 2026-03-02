"use client";

import { useEffect, useCallback } from "react";
import { useUserStore } from "@/store/useUserStore";
import { onAuthChange, isMergeInProgress, setOnMergeComplete } from "@/services/authService";
import { habitRepository } from "@/repositories/FirestoreHabitRepository";
import type { User } from "@/types/types";

/**
 * Subscribes to Firebase auth state and syncs to Zustand user store.
 * No auto-login — user must sign in explicitly via the LoginScreen.
 */
export function useAuth() {
    const { user, isLoading, isAuthReady, setUser, setAuthReady, setLoading } =
        useUserStore();

    const handleAuthUser = useCallback(
        async (firebaseUser: import("firebase/auth").User | null) => {
            // Skip processing during merge flow to avoid creating profiles for wrong accounts
            if (isMergeInProgress()) return;

            if (firebaseUser) {
                // Sync Firebase auth data to Firestore profile
                const updatedData: Partial<User> & { uid: string } = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                    photoURL: firebaseUser.photoURL,
                    isAnonymous: false,
                };

                let profile = await habitRepository.getUserProfile(firebaseUser.uid);

                if (!profile) {
                    // First time — create full profile
                    await habitRepository.createUserProfile({
                        ...updatedData,
                        isPremium: false,
                        createdAt: new Date().toISOString(),
                    });
                    profile = {
                        ...updatedData,
                        isPremium: false,
                        createdAt: new Date().toISOString(),
                    } as User;
                } else {
                    // Update with latest auth data
                    await habitRepository.updateUserProfile(firebaseUser.uid, {
                        email: firebaseUser.email,
                        displayName: firebaseUser.displayName,
                        photoURL: firebaseUser.photoURL,
                        isAnonymous: false,
                    });
                    profile = {
                        ...profile,
                        email: firebaseUser.email,
                        displayName: firebaseUser.displayName,
                        photoURL: firebaseUser.photoURL,
                        isAnonymous: false,
                    };
                }

                setUser(profile);
            } else {
                setUser(null);
            }
            setAuthReady(true);
        },
        [setUser, setAuthReady]
    );

    useEffect(() => {
        setLoading(true);
        // Register merge callback so linked accounts are processed immediately
        setOnMergeComplete((firebaseUser) => {
            handleAuthUser(firebaseUser);
        });
        const unsubscribe = onAuthChange(handleAuthUser);
        return () => unsubscribe();
    }, [handleAuthUser, setLoading]);

    return { user, isLoading, isAuthReady };
}
