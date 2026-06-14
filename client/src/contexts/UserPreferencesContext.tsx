import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import {
  loadUserPreferences,
  saveUserPreferences,
} from "@/lib/userPreferencesStorage";
import type { UserPreferences } from "@/types/userPreferences";

interface UserPreferencesContextValue {
  preferences: UserPreferences;
  setPreferences: (
    updater: UserPreferences | ((prev: UserPreferences) => UserPreferences)
  ) => void;
  savePreferences: (prefs?: UserPreferences) => UserPreferences;
}

const UserPreferencesContext =
  createContext<UserPreferencesContextValue | null>(null);

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferencesState] = useState<UserPreferences>(() =>
    loadUserPreferences()
  );

  const setPreferences = useCallback(
    (updater: UserPreferences | ((prev: UserPreferences) => UserPreferences)) => {
      setPreferencesState((prev) =>
        typeof updater === "function" ? updater(prev) : updater
      );
    },
    []
  );

  const savePreferences = useCallback(
    (prefs?: UserPreferences) => {
      const next = prefs ?? preferences;
      saveUserPreferences(next);
      setPreferencesState(next);
      return next;
    },
    [preferences]
  );

  return (
    <UserPreferencesContext.Provider
      value={{ preferences, setPreferences, savePreferences }}
    >
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    throw new Error(
      "useUserPreferences must be used within UserPreferencesProvider"
    );
  }
  return context;
}
