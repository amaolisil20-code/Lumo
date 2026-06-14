export interface ImportLogEntry {
  id: string;
  timestamp: string;
  fileName?: string;
  message: string;
  imported: number;
  updated: number;
  skipped: number;
  uniqueAttendants: number;
  newDays: string[];
}

const STORAGE_KEY = "lumo-import-log";
const MAX_ENTRIES = 30;

export function loadImportLog(): ImportLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ImportLogEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendImportLog(entry: Omit<ImportLogEntry, "id">): ImportLogEntry[] {
  const next: ImportLogEntry[] = [
    { ...entry, id: crypto.randomUUID() },
    ...loadImportLog(),
  ].slice(0, MAX_ENTRIES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearImportLog(): void {
  localStorage.removeItem(STORAGE_KEY);
}
