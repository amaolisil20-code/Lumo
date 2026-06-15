import { describe, expect, it } from "vitest";
import { buildOccupancyMap, parseTimeToMinutes } from "./occupancyMap";
import type { Attendant } from "@/types/attendant";

function attendant(
  overrides: Partial<Attendant> & Pick<Attendant, "id" | "name" | "serviceChannel">
): Attendant {
  return {
    role: "Atendente",
    workingHours: "6 horas",
    jornadaStart: "06:00",
    jornadaEnd: "12:00",
    observation: "",
    registrationDate: "2026-01-01",
    ...overrides,
  };
}

describe("occupancyMap", () => {
  it("parseTimeToMinutes converte HH:mm", () => {
    expect(parseTimeToMinutes("06:40")).toBe(400);
    expect(parseTimeToMinutes("19:00")).toBe(19 * 60);
  });

  it("conta atendentes por faixa horária no canal de ligação", () => {
    const attendants: Attendant[] = [
      attendant({
        id: 1,
        name: "Ana",
        serviceChannel: "Ligação",
        jornadaStart: "08:00",
        jornadaEnd: "14:00",
      }),
      attendant({
        id: 2,
        name: "Bruno",
        serviceChannel: "Ligação",
        jornadaStart: "10:00",
        jornadaEnd: "16:00",
      }),
      attendant({
        id: 3,
        name: "Carla",
        serviceChannel: "WhatsApp",
        jornadaStart: "08:00",
        jornadaEnd: "14:00",
      }),
    ];

    const map = buildOccupancyMap(attendants, "Ligação");

    expect(map.rows).toHaveLength(2);
    expect(map.peakCount).toBe(2);
    expect(map.scheduledAttendants).toBe(2);
  });

  it("separa mapas de WhatsApp e Ligação", () => {
    const attendants: Attendant[] = [
      attendant({ id: 1, name: "Ana", serviceChannel: "Ligação" }),
      attendant({
        id: 2,
        name: "Bia",
        serviceChannel: "WhatsApp",
        jornadaStart: "12:00",
        jornadaEnd: "18:00",
      }),
    ];

    expect(buildOccupancyMap(attendants, "Ligação").rows).toHaveLength(1);
    expect(buildOccupancyMap(attendants, "WhatsApp").rows).toHaveLength(1);
  });
});
