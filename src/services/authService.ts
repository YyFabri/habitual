import {
    signInWithPopup,
    signInWithRedirect,
    GoogleAuthProvider,
    EmailAuthProvider,
    linkWithCredential,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
    type User as FirebaseUser,
    type Unsubscribe,
    type OAuthCredential,
    fetchSignInMethodsForEmail,
    getAdditionalUserInfo,
    sendEmailVerification,
} from "firebase/auth";
import { auth } from "./firebase";

const googleProvider = new GoogleAuthProvider();

// Flag to prevent auth listener from processing during merge flow
let _mergeInProgress = false;
export function isMergeInProgress(): boolean {
    return _mergeInProgress;
}
export function setMergeInProgress(v: boolean): void {
    _mergeInProgress = v;
}

/**
 * Check sign-in methods for an email address.
 * useful to detect if an email is already associated with Google or Password.
 */
export async function getSignInMethodsForEmail(email: string): Promise<string[]> {
    return await fetchSignInMethodsForEmail(auth, email);
}

// Callback to notify useAuth when merge completes so it can process the signed-in user
let _onMergeComplete: ((user: FirebaseUser) => void) | null = null;
export function setOnMergeComplete(cb: (user: FirebaseUser) => void): void {
    _onMergeComplete = cb;
}
export function notifyMergeComplete(user: FirebaseUser): void {
    if (_onMergeComplete) _onMergeComplete(user);
}

/**
 * Detect if we're on mobile or in a PWA (standalone mode)
 */
function shouldUseRedirect(): boolean {
    if (typeof window === "undefined") return false;
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    return isStandalone || isMobile;
}

/**
 * Sign in with Google — uses redirect on mobile/PWA, popup on desktop
 */
export async function signInWithGoogle(): Promise<FirebaseUser | null> {
    if (shouldUseRedirect()) {
        await signInWithRedirect(auth, googleProvider);
        return null;
    }
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error: unknown) {
        const firebaseError = error as { code?: string };
        if (firebaseError.code === "auth/popup-blocked") {
            await signInWithRedirect(auth, googleProvider);
            return null;
        }
        throw error;
    }
}

/**
 * Sign in with Google (merge-aware): wraps popup in _mergeInProgress flag
 * and returns user, credential, and isNewUser flag.
 */
export async function signInWithGoogleForMerge(): Promise<{
    user: FirebaseUser;
    credential: OAuthCredential;
    isNewUser: boolean;
} | null> {
    _mergeInProgress = true;
    try {
        if (shouldUseRedirect()) {
            await signInWithRedirect(auth, googleProvider);
            _mergeInProgress = false;
            return null;
        }
        const result = await signInWithPopup(auth, googleProvider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const additionalInfo = getAdditionalUserInfo(result);
        const isNewUser = additionalInfo?.isNewUser ?? false;

        if (!credential) throw new Error("No credential from Google");

        return { user: result.user, credential, isNewUser };
    } catch (error: unknown) {
        _mergeInProgress = false;
        const firebaseError = error as { code?: string };
        if (firebaseError.code === "auth/popup-blocked") {
            await signInWithRedirect(auth, googleProvider);
            return null;
        }
        throw error;
    }
}

/**
 * Clean up a phantom Google account created during a failed merge.
 * Deletes new accounts (< 10s old), signs out existing ones.
 */
export async function cleanupGoogleUser(user: FirebaseUser): Promise<void> {
    const creationTime = user.metadata.creationTime;
    const isNew = creationTime && (Date.now() - new Date(creationTime).getTime() < 10_000);
    if (isNew) {
        await user.delete();
    } else {
        await firebaseSignOut(auth);
    }
    _mergeInProgress = false;
}

/**
 * Register a new user with email and password
 */
export async function registerWithEmail(
    email: string,
    password: string,
    displayName: string
): Promise<FirebaseUser> {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName });
    return result.user;
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(
    email: string,
    password: string
): Promise<FirebaseUser> {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
    await firebaseSignOut(auth);
}

/**
 * Subscribe to auth state changes
 */
export function onAuthChange(callback: (user: FirebaseUser | null) => void): Unsubscribe {
    return onAuthStateChanged(auth, callback);
}

/**
 * Get the current user synchronously (may be null)
 */
export function getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
}

/**
 * Link email/password credential to the currently signed-in user.
 */
export async function linkEmailPasswordToCurrentUser(
    email: string,
    password: string
): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("No user signed in");
    const credential = EmailAuthProvider.credential(email, password);
    await linkWithCredential(currentUser, credential);
}

/**
 * Sign in with Google and then link email/password to that account.
 * Flow: Google popup → verify email match → link email credential → done.
 */
export async function signInWithGoogleAndLinkEmail(
    email: string,
    password: string
): Promise<FirebaseUser> {
    _mergeInProgress = true;

    try {
        const googleUser = await signInWithGoogle();
        if (!googleUser) {
            _mergeInProgress = false;
            throw new Error("redirect");
        }

        // Verify the Google account matches
        if (googleUser.email?.toLowerCase() !== email.toLowerCase()) {
            await cleanupGoogleUser(googleUser);
            throw { code: "auth/email-mismatch" };
        }

        // Link email/password
        const credential = EmailAuthProvider.credential(email, password);
        await linkWithCredential(googleUser, credential);
        _mergeInProgress = false;
        notifyMergeComplete(googleUser);
        return googleUser;
    } catch (error) {
        _mergeInProgress = false;
        throw error;
    }
}

/**
 * Sign in with email/password then link a Google credential to that account.
 * Used when: user has email/password account, wants to add Google.
 */
export async function signInWithEmailAndLinkGoogle(
    email: string,
    password: string,
    googleCredential: OAuthCredential
): Promise<FirebaseUser> {
    // Sign in with the existing email/password account
    const result = await signInWithEmailAndPassword(auth, email, password);
    // Link the Google credential
    await linkWithCredential(result.user, googleCredential);
    return result.user;
}

/**
 * Extract OAuthCredential from an auth error (e.g. account-exists-with-different-credential)
 */
export function getCredentialFromError(error: unknown): OAuthCredential | null {
    // Try to get credential using the provider's helper
    const cred = GoogleAuthProvider.credentialFromError(error as any);
    return cred;
}
/**
 * Send email verification to the user
 */
export async function sendVerificationEmail(user: FirebaseUser): Promise<void> {
    await sendEmailVerification(user);
}
