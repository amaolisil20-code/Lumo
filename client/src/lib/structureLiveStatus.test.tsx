import { describe, expect, it } from "vitest";
import type { Attendant } from "@/types/attendant";
import type { Absence } from "@/types/absence";
import type { ProductionGoal } from "@/types/goals";
import type { DailyPerformanceRecord } from "@/types/performance";
import type { StructureLayout } from "@/types/structure";
import {
  buildAttendantLiveInsights,
  computeStructureLiveSummary,
  getSlotVisualStatus,
} from "./structureLiveStatus";

const attendants: Attendant[] = [
  {
    id: 1,
    name: "Ana",
    role: "Atendente",
    serviceChannel: "Ligação" as const,
    workingHours: "08h00",
    jornadaStart: "",
    jornadaEnd: "",
    observation: "",
    registrationDate: "2026-01-01",
  },
  {
    id: 2,
    name: "Bruno",
    role: "Atendente",
    serviceChannel: "Ligação" as const,
    workingHours: "08h00",
    jornadaStart: "",
    jornadaEnd: "",
    observation: "",
    registrationDate: "2026-01-01",
  },
];

const productionGoals: ProductionGoal[] = [
  {
    id: 1,
    channel: "Ligação",
    dailyTarget: 50,
    status: "Ativo",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
];

describe("buildAttendantLiveInsights", () => {
  it("marca colaborador ausente no dia", () => {
    const absences: Absence[] = [
      {
        id: 1,
        attendantId: 1,
        attendantName: "Ana",
        type: "vacation",
        startDate: "2026-06-09",
        endDate: "2026-06-09",
        reason: "",
        status: "approved",
        createdAt: "2026-06-01",
        updatedAt: "2026-06-01",
      },
    ];

    const map = buildAttendantLiveInsights("2026-06-09", attendants, [], absences, productionGoals);

    expect(map.get(1)?.visualStatus).toBe("absent");
    expect(map.get(1)?.absenceLabel).toBeTruthy();
  });

  it("classifica desempenho pelo pior canal do dia", () => {
    const records: DailyPerformanceRecord[] = [
      {
        id: 1,
        attendantId: 2,
        attendantName: "Bruno",
        date: "2026-06-09",
        channel: "Ligação",
        attendancesCount: 60,
        averageTimeMinutes: 4,
        createdAt: "2026-06-09",
        updatedAt: "2026-06-09",
      },
    ];

    const map = buildAttendantLiveInsights(
      "2026-06-09",
      attendants,
      records,
      [],
      productionGoals
    );

    expect(map.get(2)?.hasRecords).toBe(true);
    expect(map.get(2)?.visualStatus).toBe("green");
  });
});

describe("getSlotVisualStatus", () => {
  it("prioriza vaga e status estrutural", () => {
    const live = buildAttendantLiveInsights("2026-06-09", attendants, [], [], productionGoals);

    expect(getSlotVisualStatus({ id: "s1", sector: "A", status: "vacant", attendantId: null }, live)).toBe(
      "vacant"
    );
    expect(
      getSlotVisualStatus({ id: "s2", sector: "A", status: "blocked", attendantId: 1 }, live)
    ).toBe("blocked");
  });
});

describe("computeStructureLiveSummary", () => {
  it("conta mesas por status visual", () => {
    const layout: StructureLayout = {
      updatedAt: "2026-06-09",
      history: [],
      elements: [
        {
          id: "desk-1",
          type: "desk-single",
          label: "Mesa 1",
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          zIndex: 1,
          sector: "Geral",
          team: "A",
          slots: [{ id: "slot-1", sector: "Geral", status: "occupied", attendantId: 1 }],
        },
        {
          id: "desk-2",
          type: "desk-single",
          label: "Mesa 2",
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          zIndex: 2,
          sector: "Geral",
          team: "A",
          slots: [{ id: "slot-2", sector: "Geral", status: "vacant", attendantId: null }],
        },
      ],
    };

    const absences: Absence[] = [
      {
        id: 1,
        attendantId: 1,
        attendantName: "Ana",
        type: "sick",
        startDate: "2026-06-09",
        endDate: "2026-06-09",
        reason: "",
        status: "approved",
        createdAt: "2026-06-01",
        updatedAt: "2026-06-01",
      },
    ];

    const live = buildAttendantLiveInsights("2026-06-09", attendants, [], absences, productionGoals);
    const summary = computeStructureLiveSummary(layout, live);

    expect(summary.absent).toBe(1);
    expect(summary.vacant).toBe(1);
    expect(summary.assigned).toBe(1);
  });
});
