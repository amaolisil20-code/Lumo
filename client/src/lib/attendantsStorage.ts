import type { Attendant } from "@/types/attendant";
import type { AttendantInput } from "@/types/attendant";
import { getLocalDateString } from "@/lib/performanceStorage";

const STORAGE_KEY = "lumo-attendants";

export function loadAttendants(): Attendant[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return (JSON.parse(stored) as Attendant[]).map(normalizeAttendant);
    }
  } catch {
    // ignore
  }
  return [];
}

function normalizeAttendant(raw: Attendant): Attendant {
  return {
    ...raw,
    jornadaStart: raw.jornadaStart ?? "",
    jornadaEnd: raw.jornadaEnd ?? "",
  };
}

export function saveAttendants(attendants: Attendant[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(attendants));
}

export function createAttendant(input: AttendantInput, existing: Attendant[]): Attendant {
  return {
    id: Math.max(...existing.map((a) => a.id), 0) + 1,
    ...input,
    registrationDate: getLocalDateString(),
  };
}

export type { AttendantInput };
