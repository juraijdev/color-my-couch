// Simple client-side auth gate for the preview.
// NOTE: This is a lightweight gate, not real backend auth.

const STORAGE_KEY = "lush_auth_v1";

export const AUTH_CREDENTIALS = {
  username: "admin",
  password: "lush2026",
};

export function isAuthenticated(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function signIn(username: string, password: string): boolean {
  if (
    username.trim().toLowerCase() === AUTH_CREDENTIALS.username &&
    password === AUTH_CREDENTIALS.password
  ) {
    localStorage.setItem(STORAGE_KEY, "true");
    return true;
  }
  return false;
}

export function signOut(): void {
  localStorage.removeItem(STORAGE_KEY);
}
