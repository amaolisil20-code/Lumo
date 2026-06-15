import { describe, expect, it } from "vitest";
import {
  extractProductivitySections,
  pdfLinesToMatrix,
  splitPdfLineToCells,
} from "./pdfImport";
import {
  buildImportPlan,
  detectColumnMapping,
  executePerformanceImport,
  mergeProductivityTables,
  parseMatrixToParsedSheet,
} from "./spreadsheetImport";

describe("pdfImport", () => {
  it("splitPdfLineToCells supports semicolon and multi-space columns", () => {
    expect(splitPdfLineToCells("Ana Silva;09/06/2025;WhatsApp;12")).toEqual([
      "Ana Silva",
      "09/06/2025",
      "WhatsApp",
      "12",
    ]);
    expect(splitPdfLineToCells("Ana Silva   09/06/2025   WhatsApp   12")).toEqual([
      "Ana Silva",
      "09/06/2025",
      "WhatsApp",
      "12",
    ]);
  });

  it("builds import plan from pdf-like matrix", () => {
    const matrix = pdfLinesToMatrix([
      "Colaborador;Data;Canal;Quantidade",
      "Ana Silva;09/06/2025;WhatsApp;12",
      "Bruno Costa;09/06/2025;Ligação;8",
    ]);

    const parsed = parseMatrixToParsedSheet(matrix, "relatorio.pdf", [
      "Dados extraídos automaticamente do PDF. Confira o mapeamento antes de importar.",
    ]);
    const mapping = detectColumnMapping(parsed.headers);
    const plan = buildImportPlan(parsed.rows, mapping, [], [], {
      createAttendants: true,
      updateDuplicates: true,
    });

    expect(plan.errors).toHaveLength(0);
    expect(plan.stats.newRecords).toBe(2);

    const outcome = executePerformanceImport(plan, [], [], {
      createAttendants: true,
      updateDuplicates: true,
    });

    expect(outcome.result.imported).toBe(2);
    expect(parsed.importNotes?.[0]).toContain("PDF");
  });

  it("extracts Acompanhamento Diario productivity sections from page rows", () => {
    const pageOne: string[][] = [
      ["Ligação REL 067"],
      ["Data", "Recebida", "Atendida", "%"],
      ["01/05/2026", "131", "128", "97,71%"],
      ["Protutividade Voz REL025"],
      ["Data", "Nome", "Oferecidas", "Atendidas", "TMA"],
      ["01/05/2026", "Ingrid Ferreira", "0", "0", "00:00:00"],
      ["01/05/2026", "Marcos Antonio", "2", "2", "00:00:28"],
    ];
    const pageTwo: string[][] = [
      ["REL 090"],
      ["Data", "Nome", "Entrada", "Saída", "TMA"],
      ["01/05/2026", "Ingrid Ferreira", "29", "0", "00:09:32"],
      ["01/05/2026", "Marcos Antonio", "29", "2", "00:09:48"],
    ];

    const sections = extractProductivitySections([pageOne, pageTwo]);
    expect(sections).toHaveLength(2);
    expect(sections[0]?.channel).toBe("Ligação");
    expect(sections[1]?.channel).toBe("WhatsApp");

    const merged = mergeProductivityTables(sections, "Acompanhamento_Diario.pdf");
    expect(merged?.sourceSheets).toHaveLength(2);
    expect(merged?.rows).toHaveLength(3);

    const plan = buildImportPlan(merged!.rows, detectColumnMapping(merged!.headers), [], [], {
      createAttendants: true,
      updateDuplicates: true,
    });
    expect(plan.stats.newRecords).toBe(3);
  });
});
