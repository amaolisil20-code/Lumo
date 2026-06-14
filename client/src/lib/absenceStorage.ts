import type { Absence, AbsenceInput } from "@/types/absence";
import type { Attendant } from "@/types/attendant";

const STORAGE_KEY = "lumo-absences";

export function countAbsenceDays(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  return Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
}

export function loadAbsences(): Absence[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as Absence[];
    }
  } catch {
    // ignore parse errors
  }
  return [];
}

export function saveAbsences(absences: Absence[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(absences));
}

export function createAbsence(
  input: AbsenceInput,
  attendants: Attendant[],
  existing: Absence[]
): Absence {
  const attendant = attendants.find((a) => a.id === input.attendantId);
  const now = new Date().toISOString();
  const nextId = existing.length > 0 ? Math.max(...existing.map((a) => a.id)) + 1 : 1;

  return {
    id: nextId,
    attendantId: input.attendantId,
    attendantName: attendant?.name ?? "Colaborador",
    type: input.type,
    startDate: input.startDate,
    endDate: input.endDate,
    reason: input.reason?.trim() ?? "",
    status: input.status ?? "approved",
    createdAt: now,
    updatedAt: now,
  };
}
