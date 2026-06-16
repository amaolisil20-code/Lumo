import { describe, expect, it } from "vitest";
import {
  buildSheetMapping,
  matrixToSheetPreview,
  parseImportDate,
  parseImportNumber,
} from "@shared/importMapping";

describe("importMapping", () => {
  const rel067Headers = [
    "Data",
    "Recebida",
    "Atendida",
    "%",
    "Abandon. Únicas",
    "Recup.",
    "Auto Recup.",
    "Sem Atend.",
    "% Atend. após Recup.",
    "Taxa de Perda",
  ];

  it("maps REL 067 voice daily columns correctly", () => {
    const mapping = buildSheetMapping("Voz", ["Ligação REL 067"], rel067Headers);

    expect(mapping.tipo).toBe("voz_diario");
    expect(mapping.col_data).toBe(0);
    expect(mapping.col_recebidas).toBe(1);
    expect(mapping.col_atendidas).toBe(2);
    expect(mapping.col_pct_atend).toBe(3);
    expect(mapping.col_taxa_perda).toBe(9);
  });

  it("parses pt-BR numbers from voice report cells", () => {
    expect(parseImportNumber("1.340")).toBe(1340);
    expect(parseImportNumber("473")).toBe(473);
    expect(parseImportNumber("35,30%")).toBe(35.3);
    expect(parseImportNumber("0,75%")).toBe(0.75);
  });

  it("detects header row after title line", () => {
    const matrix = [
      ["Ligação REL 067"],
      ["Data", "Recebida", "Atendida"],
      ["01/06/2026", "1340", "473"],
    ];
    const preview = matrixToSheetPreview(matrix);

    expect(preview.headerRow).toEqual(["Data", "Recebida", "Atendida"]);
    expect(preview.allRows).toEqual([["01/06/2026", "1340", "473"]]);
  });

  it("parses dd/mm/yyyy dates", () => {
    expect(parseImportDate("01/06/2026")).toBe("01/06/2026");
    expect(parseImportDate("2026-06-01")).toBe("01/06/2026");
  });
});
