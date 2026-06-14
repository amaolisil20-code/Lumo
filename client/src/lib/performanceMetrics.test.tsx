import { describe, expect, it } from "vitest";
import {
  calculatePerformanceScore,
  compareAttendantSummaries,
  buildAttendantSummaries,
  type AttendantPerformanceSummary,
} from "./performanceMetrics";
import type { Attendant } from "@/types/attendant";
import type { DailyPerformanceRecord } from "@/types/performance";

function summary(
  overrides: Partial<AttendantPerformanceSummary> & Pick<AttendantPerformanceSummary, "attendantId" | "name">
): AttendantPerformanceSummary {
  return {
    role: "Atendente",
    totalAttendances: 0,
    averageTimeMinutes: 0,
    averagePercentage: 0,
    performanceScore: 0,
    ranking: 0,
    ...overrides,
  };
}

describe("calculatePerformanceScore", () => {
  it("premia quem atende mais em menos tempo", () => {
    const volumeOnly = calculatePerformanceScore(120, 6, 100);
    const balanced = calculatePerformanceScore(80, 3, 100);

    expect(balanced).toBeGreaterThan(volumeOnly);
  });

  it("considera atingimento de meta no score", () => {
    const withMeta = calculatePerformanceScore(100, 4, 100);
    const lowMeta = calculatePerformanceScore(100, 4, 50);

    expect(withMeta).toBe(25);
    expect(lowMeta).toBe(12.5);
  });

  it("retorna zero sem atendimentos ou tempo inválido", () => {
    expect(calculatePerformanceScore(0, 4, 100)).toBe(0);
    expect(calculatePerformanceScore(10, 0, 100)).toBe(0);
  });
});

describe("compareAttendantSummaries", () => {
  it("ordena pelo score composto de volume e agilidade", () => {
    const first = summary({
      attendantId: 1,
      name: "Ana",
      totalAttendances: 80,
      averageTimeMinutes: 3,
      averagePercentage: 100,
      performanceScore: calculatePerformanceScore(80, 3, 100),
    });
    const second = summary({
      attendantId: 2,
      name: "Bruno",
      totalAttendances: 120,
      averageTimeMinutes: 6,
      averagePercentage: 100,
      performanceScore: calculatePerformanceScore(120, 6, 100),
    });

    expect(compareAttendantSummaries(first, second)).toBeLessThan(0);
  });
});

describe("buildAttendantSummaries por canal", () => {
  const attendants: Attendant[] = [
    {
      id: 1,
      name: "Ana",
      role: "Atendente",
      workingHours: "08h00",
      jornadaStart: "",
      jornadaEnd: "",
      observation: "",
      registrationDate: "2026-01-01",
    },
  ];

  const records: DailyPerformanceRecord[] = [
    {
      id: 1,
      attendantId: 1,
      attendantName: "Ana",
      date: "2026-06-01",
      channel: "Ligação",
      attendancesCount: 80,
      averageTimeMinutes: 4,
      createdAt: "",
      updatedAt: "",
    },
    {
      id: 2,
      attendantId: 1,
      attendantName: "Ana",
      date: "2026-06-01",
      channel: "WhatsApp",
      attendancesCount: 50,
      averageTimeMinutes: 3,
      createdAt: "",
      updatedAt: "",
    },
  ];

  it("filtra ranking por canal", () => {
    const range = { start: "2026-06-01", end: "2026-06-01", label: "01/06" };
    const ligacao = buildAttendantSummaries(records, attendants, [], range, "Ligação");
    const whatsapp = buildAttendantSummaries(records, attendants, [], range, "WhatsApp");

    expect(ligacao[0].totalAttendances).toBe(80);
    expect(whatsapp[0].totalAttendances).toBe(50);
  });
});
