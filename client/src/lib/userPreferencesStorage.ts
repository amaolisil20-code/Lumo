import {
  DEFAULT_USER_PREFERENCES,
  type UserPreferences,
} from "@/types/userPreferences";

const STORAGE_KEY = "lumo-user-preferences";

export function loadUserPreferences(): UserPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_USER_PREFERENCES, ...JSON.parse(stored) };
    }
  } catch {
    // ignore parse errors
  }
  return { ...DEFAULT_USER_PREFERENCES };
}

export function saveUserPreferences(preferences: UserPreferences): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}
