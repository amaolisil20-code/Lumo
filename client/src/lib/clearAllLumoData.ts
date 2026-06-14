const OPERATIONAL_KEYS = [
  "lumo-attendants",
  "lumo-performance-records",
  "lumo-absences",
  "lumo-production-goals",
  "lumo-role-goals",
  "lumo-period-filter",
  "lumo-import-log",
  "lumo-structure-layout",
  "lumo-structure-layout-version",
] as const;

export type ClearedLumoDataArea =
  | "attendants"
  | "performance"
  | "absences"
  | "goals"
  | "structure"
  | "periodFilter"
  | "importLog"
  | "alertState";

export interface ClearAllLumoDataResult {
  clearedKeys: string[];
  clearedAlertStateKeys: number;
}

/** Remove todos os dados operacionais do Lumo (localStorage). Mantém tema, login e preferências de UI. */
export function clearAllLumoOperationalData(): ClearAllLumoDataResult {
  const clearedKeys: string[] = [];

  for (const key of OPERATIONAL_KEYS) {
    if (localStorage.getItem(key) != null) {
      clearedKeys.push(key);
    }
    localStorage.removeItem(key);
  }

  let clearedAlertStateKeys = 0;
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key?.startsWith("lumo-alert-state-")) {
      localStorage.removeItem(key);
      clearedAlertStateKeys++;
    }
  }

  return { clearedKeys, clearedAlertStateKeys };
}

export function resetLumoAppData(): ClearAllLumoDataResult {
  const result = clearAllLumoOperationalData();
  window.location.reload();
  return result;
}
