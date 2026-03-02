/**
 * TanStack Query key factory for type-safe, consistent query keys.
 */
export const queryKeys = {
    habits: {
        all: (userId: string) => ["habits", userId] as const,
        detail: (userId: string, habitId: string) => ["habits", userId, habitId] as const,
    },
    logs: {
        byDate: (userId: string, date: string) => ["habitLogs", userId, date] as const,
    },
    user: {
        profile: (userId: string) => ["userProfile", userId] as const,
    },
} as const;
