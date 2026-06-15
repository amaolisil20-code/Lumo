const STORAGE_KEY = "lumo-analysis-note";

export function loadAnalysisNote(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveAnalysisNote(note: string): void {
  localStorage.setItem(STORAGE_KEY, note);
}
