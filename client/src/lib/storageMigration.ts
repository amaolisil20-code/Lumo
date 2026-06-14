const VERSION_KEY = "lumo-storage-version";
const CURRENT_VERSION = "3-empty-baseline";

const DATA_KEYS = [
  "lumo-attendants",
  "lumo-performance-records",
  "lumo-production-goals",
  "lumo-role-goals",
  "lumo-absences",
];

export function ensureEmptyDataBaseline(): void {
  if (localStorage.getItem(VERSION_KEY) === CURRENT_VERSION) {
    return;
  }

  for (const key of DATA_KEYS) {
    localStorage.removeItem(key);
  }

  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key?.startsWith("lumo-alert-state-")) {
      localStorage.removeItem(key);
    }
  }

  localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
}
