import { describe, expect, it, beforeEach } from "vitest";
import { clearAllLumoOperationalData } from "./clearAllLumoData";

describe("clearAllLumoOperationalData", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("remove chaves operacionais do Lumo", () => {
    localStorage.setItem("lumo-attendants", "[]");
    localStorage.setItem("lumo-performance-records", "[]");
    localStorage.setItem("lumo-absences", "[]");
    localStorage.setItem("lumo-structure-layout", "{}");
    localStorage.setItem("lumo-import-log", "[]");
    localStorage.setItem("lumo-alert-state-2026-06-09", "{}");
    localStorage.setItem("theme", "dark");

    const result = clearAllLumoOperationalData();

    expect(localStorage.getItem("lumo-attendants")).toBeNull();
    expect(localStorage.getItem("lumo-performance-records")).toBeNull();
    expect(localStorage.getItem("lumo-import-log")).toBeNull();
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(result.clearedAlertStateKeys).toBe(1);
  });
});
