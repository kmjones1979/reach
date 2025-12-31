"use client";

/**
 * Robust auth storage with IndexedDB fallback for PWA persistence
 * Handles cases where localStorage may not persist (PWA force quit, etc.)
 */

const DB_NAME = "spritz_auth";
const DB_VERSION = 1;
const STORE_NAME = "credentials";

type AuthCredentials = {
    address: string;
    signature: string;
    message: string;
    timestamp: number;
    chain?: "evm" | "solana";
};

// IndexedDB wrapper
class AuthStorage {
    private db: IDBDatabase | null = null;
    private dbReady: Promise<void> | null = null;
    private initAttempted = false;

    // Initialize IndexedDB
    private async initDB(): Promise<void> {
        if (typeof window === "undefined" || typeof indexedDB === "undefined") {
            return;
        }

        if (this.dbReady) {
            return this.dbReady;
        }

        if (this.initAttempted) {
            return;
        }

        this.initAttempted = true;
        this.dbReady = new Promise((resolve) => {
            try {
                const request = indexedDB.open(DB_NAME, DB_VERSION);

                request.onerror = () => {
                    console.warn("[AuthStorage] IndexedDB not available, using localStorage only");
                    resolve();
                };

                request.onsuccess = () => {
                    this.db = request.result;
                    console.log("[AuthStorage] IndexedDB initialized");
                    resolve();
                };

                request.onupgradeneeded = (event) => {
                    const db = (event.target as IDBOpenDBRequest).result;
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        db.createObjectStore(STORE_NAME, { keyPath: "key" });
                    }
                };
            } catch {
                console.warn("[AuthStorage] IndexedDB error, using localStorage only");
                resolve();
            }
        });

        return this.dbReady;
    }

    // Save to IndexedDB
    private async saveToIDB(key: string, data: AuthCredentials): Promise<boolean> {
        await this.initDB();
        if (!this.db) return false;

        return new Promise((resolve) => {
            try {
                const transaction = this.db!.transaction(STORE_NAME, "readwrite");
                const store = transaction.objectStore(STORE_NAME);
                const request = store.put({ key, ...data });
                request.onsuccess = () => resolve(true);
                request.onerror = () => resolve(false);
            } catch {
                resolve(false);
            }
        });
    }

    // Load from IndexedDB
    private async loadFromIDB(key: string): Promise<AuthCredentials | null> {
        await this.initDB();
        if (!this.db) return null;

        return new Promise((resolve) => {
            try {
                const transaction = this.db!.transaction(STORE_NAME, "readonly");
                const store = transaction.objectStore(STORE_NAME);
                const request = store.get(key);
                request.onsuccess = () => {
                    if (request.result) {
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const { key: _, ...data } = request.result;
                        resolve(data as AuthCredentials);
                    } else {
                        resolve(null);
                    }
                };
                request.onerror = () => resolve(null);
            } catch {
                resolve(null);
            }
        });
    }

    // Remove from IndexedDB
    private async removeFromIDB(key: string): Promise<void> {
        await this.initDB();
        if (!this.db) return;

        return new Promise((resolve) => {
            try {
                const transaction = this.db!.transaction(STORE_NAME, "readwrite");
                const store = transaction.objectStore(STORE_NAME);
                const request = store.delete(key);
                request.onsuccess = () => resolve();
                request.onerror = () => resolve();
            } catch {
                resolve();
            }
        });
    }

    // Save credentials (localStorage + IndexedDB)
    async save(key: string, credentials: AuthCredentials): Promise<void> {
        // Always try localStorage first (faster)
        if (typeof window !== "undefined") {
            try {
                localStorage.setItem(key, JSON.stringify(credentials));
            } catch (e) {
                console.warn("[AuthStorage] localStorage save failed:", e);
            }
        }

        // Also save to IndexedDB as backup
        await this.saveToIDB(key, credentials);
    }

    // Load credentials (try localStorage first, then IndexedDB)
    async load(key: string): Promise<AuthCredentials | null> {
        if (typeof window === "undefined") return null;

        // Try localStorage first (faster)
        try {
            const stored = localStorage.getItem(key);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (this.isValidCredentials(parsed)) {
                    // Sync to IndexedDB if not there
                    this.saveToIDB(key, parsed).catch(() => {});
                    return parsed;
                }
            }
        } catch (e) {
            console.warn("[AuthStorage] localStorage load failed:", e);
        }

        // Fall back to IndexedDB
        const idbData = await this.loadFromIDB(key);
        if (idbData && this.isValidCredentials(idbData)) {
            // Restore to localStorage
            try {
                localStorage.setItem(key, JSON.stringify(idbData));
            } catch {}
            console.log("[AuthStorage] Restored credentials from IndexedDB");
            return idbData;
        }

        return null;
    }

    // Remove credentials from all storage
    async remove(key: string): Promise<void> {
        if (typeof window !== "undefined") {
            try {
                localStorage.removeItem(key);
            } catch {}
        }
        await this.removeFromIDB(key);
    }

    // Validate credentials structure
    private isValidCredentials(data: unknown): data is AuthCredentials {
        if (!data || typeof data !== "object") return false;
        const cred = data as Record<string, unknown>;
        return (
            typeof cred.address === "string" && cred.address.trim().length > 0 &&
            typeof cred.signature === "string" && cred.signature.trim().length > 0 &&
            typeof cred.message === "string" && cred.message.trim().length > 0 &&
            typeof cred.timestamp === "number"
        );
    }

    // Check if credentials are expired
    isExpired(credentials: AuthCredentials, ttlMs: number): boolean {
        return Date.now() - credentials.timestamp > ttlMs;
    }

    // Refresh timestamp on existing credentials
    async refreshTimestamp(key: string): Promise<void> {
        const credentials = await this.load(key);
        if (credentials) {
            credentials.timestamp = Date.now();
            await this.save(key, credentials);
        }
    }
}

// Singleton instance
export const authStorage = new AuthStorage();

// Constants
export const AUTH_CREDENTIALS_KEY = "spritz_auth_credentials";
export const SOLANA_AUTH_CREDENTIALS_KEY = "spritz_solana_auth_credentials";
export const AUTH_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

export type { AuthCredentials };

