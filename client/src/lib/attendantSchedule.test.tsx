import { describe, expect, it } from "vitest";
import { formatJornada, isValidJornada } from "./attendantSchedule";

describe("attendantSchedule", () => {
  it("formata jornada como 12:40 - 19h", () => {
    expect(
      formatJornada({ jornadaStart: "12:40", jornadaEnd: "19:00" })
    ).toBe("12:40 - 19h");
  });

  it("valida jornada incompleta ou inválida", () => {
    expect(isValidJornada("", "")).toBe(true);
    expect(isValidJornada("12:40", "")).toBe(false);
    expect(isValidJornada("19:00", "12:40")).toBe(false);
    expect(isValidJornada("12:40", "19:00")).toBe(true);
  });
});
