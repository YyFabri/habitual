import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    writeBatch,
    type DocumentData,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Habit, HabitLog, User } from "@/types/types";

// ─── Collection Refs ─────────────────────────────────────────

function habitsCol(userId: string) {
    return collection(db, "users", userId, "habits");
}

function historyCol(userId: string) {
    return collection(db, "users", userId, "history");
}

function userDoc(userId: string) {
    return doc(db, "users", userId);
}

// ─── User Profile ────────────────────────────────────────────

export async function getUserProfile(userId: string): Promise<User | null> {
    const snap = await getDoc(userDoc(userId));
    if (!snap.exists()) return null;
    return { uid: userId, ...snap.data() } as User;
}

export async function createUserProfile(user: Partial<User> & { uid: string }): Promise<void> {
    await setDoc(userDoc(user.uid), {
        email: user.email ?? null,
        displayName: user.displayName ?? null,
        photoURL: user.photoURL ?? null,
        isPremium: user.isPremium ?? false,
        isAnonymous: user.isAnonymous ?? true,
        createdAt: user.createdAt ?? new Date().toISOString(),
    }, { merge: true });
}

export async function updateUserProfile(userId: string, data: Partial<User>): Promise<void> {
    await updateDoc(userDoc(userId), data as DocumentData);
}

export async function getUserProfileByEmail(email: string): Promise<User | null> {
    const q = query(collection(db, "users"), where("email", "==", email));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const docSnap = snap.docs[0];
    return { uid: docSnap.id, ...docSnap.data() } as User;
}

// ─── Habits ──────────────────────────────────────────────────

export async function getHabits(userId: string): Promise<Habit[]> {
    // Fetch all habits and filter/sort client-side to avoid needing a composite Firestore index
    const snap = await getDocs(habitsCol(userId));
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Habit);
    return all
        .filter((h) => !h.archived)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export async function getAllHabits(userId: string): Promise<Habit[]> {
    const q = query(habitsCol(userId), orderBy("order", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Habit);
}

export async function createHabit(
    userId: string,
    habit: Omit<Habit, "id" | "userId" | "createdAt">
): Promise<Habit> {
    const ref = doc(habitsCol(userId));
    const newHabit: Omit<Habit, "id"> = {
        ...habit,
        userId,
        createdAt: new Date().toISOString(),
    };
    await setDoc(ref, { ...newHabit, _serverTimestamp: serverTimestamp() });
    return { id: ref.id, ...newHabit };
}

export async function updateHabit(
    userId: string,
    habitId: string,
    data: Partial<Habit>
): Promise<void> {
    await updateDoc(doc(habitsCol(userId), habitId), data as DocumentData);
}

export async function batchUpdateHabits(
    userId: string,
    updates: { id: string; data: Partial<Habit> }[]
): Promise<void> {
    const batch = writeBatch(db);
    updates.forEach(({ id, data }) => {
        const ref = doc(habitsCol(userId), id);
        batch.update(ref, data as DocumentData);
    });
    await batch.commit();
}

export async function deleteHabit(userId: string, habitId: string): Promise<void> {
    await updateDoc(doc(habitsCol(userId), habitId), {
        archived: true,
        archivedAt: new Date().toISOString(),
    } as Partial<Habit>);
}

// ─── History / Logs ──────────────────────────────────────────

export async function getHabitLogs(
    userId: string,
    date: string // YYYY-MM-DD
): Promise<HabitLog[]> {
    const q = query(
        historyCol(userId),
        where("date", "==", date)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as HabitLog);
}

export async function getAllHabitLogs(userId: string): Promise<HabitLog[]> {
    const q = query(
        historyCol(userId),
        orderBy("date", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as HabitLog);
}

export async function upsertHabitLog(
    userId: string,
    habitId: string,
    date: string,
    value: number
): Promise<HabitLog> {
    // Use a deterministic ID (habitId_date) to make upsert idempotent
    const logId = `${habitId}_${date}`;
    const ref = doc(historyCol(userId), logId);

    const logData = {
        habitId,
        value,
        date,
        createdAt: new Date().toISOString(),
    };

    await setDoc(ref, logData, { merge: true });
    return { id: logId, ...logData };
}

export async function deleteHabitLog(userId: string, logId: string): Promise<void> {
    await deleteDoc(doc(historyCol(userId), logId));
}
