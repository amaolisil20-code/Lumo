import type { PDFDocumentProxy } from "pdfjs-dist";
import type { TextItem } from "pdfjs-dist/types/src/display/api";
import type { AttendanceChannel } from "@/types/goals";
import {
  mergeProductivityTables,
  parseMatrixToParsedSheet,
  type ParsedSheet,
  type ProductivityTableSection,
} from "./spreadsheetImport";

let workerConfigured = false;

function shouldUseLegacyPdfJs() {
  return typeof window === "undefined" || Boolean(import.meta.env.VITEST);
}

async function loadPdfDocument(buffer: ArrayBuffer): Promise<PDFDocumentProxy> {
  if (shouldUseLegacyPdfJs()) {
    const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/legacy/build/pdf.worker.mjs",
      import.meta.url
    ).toString();
    return getDocument({
      data: buffer,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    }).promise;
  }

  if (!workerConfigured) {
    const { GlobalWorkerOptions } = await import("pdfjs-dist");
    GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
    workerConfigured = true;
  }

  const { getDocument } = await import("pdfjs-dist");
  return getDocument({ data: buffer }).promise;
}

export function splitPdfLineToCells(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed) return [];

  if (trimmed.includes(";")) {
    return trimmed.split(";").map((cell) => cell.trim());
  }
  if (trimmed.includes("\t")) {
    return trimmed.split("\t").map((cell) => cell.trim());
  }
  if (trimmed.includes("|")) {
    return trimmed.split("|").map((cell) => cell.trim());
  }

  const spaced = trimmed.split(/\s{2,}/).map((cell) => cell.trim()).filter(Boolean);
  if (spaced.length >= 2) return spaced;

  return [trimmed];
}

export function pdfLinesToMatrix(lines: string[]): string[][] {
  return lines.map(splitPdfLineToCells).filter((row) => row.some((cell) => cell.length > 0));
}

type TextFragment = { text: string; x: number; y: number; page: number };

function isTextItem(item: unknown): item is TextItem {
  return (
    typeof item === "object" &&
    item !== null &&
    "str" in item &&
    typeof (item as TextItem).str === "string"
  );
}

function groupFragmentsIntoRows(items: TextFragment[], yTolerance = 4): TextFragment[][] {
  if (items.length === 0) return [];

  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const rowGroups: TextFragment[][] = [];

  for (const item of sorted) {
    const current = rowGroups[rowGroups.length - 1];
    if (!current) {
      rowGroups.push([item]);
      continue;
    }

    const rowY = current[0]?.y ?? item.y;
    if (Math.abs(item.y - rowY) <= yTolerance) {
      current.push(item);
    } else {
      rowGroups.push([item]);
    }
  }

  return rowGroups;
}

function rowToCells(row: TextFragment[]): string[] {
  const ordered = [...row].sort((a, b) => a.x - b.x);
  const cells: string[] = [];
  let buffer = "";
  let lastEndX = -Infinity;
  const wordMergeGap = 6;

  for (const part of ordered) {
    const text = part.text.trim();
    if (!text) continue;

    const gap = part.x - lastEndX;
    if (buffer && gap <= wordMergeGap) {
      buffer = `${buffer} ${text}`;
    } else {
      if (buffer) cells.push(buffer);
      buffer = text;
    }

    lastEndX = part.x + text.length * 3.5;
  }

  if (buffer) cells.push(buffer);
  return cells;
}

const DATE_RE = /^\d{2}\/\d{2}\/\d{4}$/;

function isProductivityHeader(row: string[]): boolean {
  const text = row.join(" ").toLowerCase();
  return (
    text.includes("nome") &&
    text.includes("data") &&
    (text.includes("atendidas") || text.includes("entrada") || text.includes("oferecidas"))
  );
}

function isDataRow(row: string[]): boolean {
  return DATE_RE.test(row[0]?.trim() ?? "");
}

function isSectionTitle(row: string[]): boolean {
  const text = row.join(" ").trim();
  if (!text) return false;
  return /rel\s*\d+/i.test(text) || /produtividade|acompanhamento|ligação|ligacao|chat/i.test(text);
}

function inferChannelFromSection(sectionTitle: string, headers: string[]): AttendanceChannel {
  const context = `${sectionTitle} ${headers.join(" ")}`.toLowerCase();
  if (
    context.includes("chat") ||
    context.includes("rel 090") ||
    context.includes("rel090") ||
    context.includes("entrada")
  ) {
    return "WhatsApp";
  }
  return "Ligação";
}

function recordsFromRowCells(headers: string[], dataRows: string[][]): Record<string, string>[] {
  return dataRows.map((cells) => {
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = cells[index]?.trim() ?? "";
    });
    return row;
  });
}

export function extractProductivitySections(pageMatrices: string[][][]): ProductivityTableSection[] {
  const sections: ProductivityTableSection[] = [];
  let currentSectionTitle = "Relatório PDF";
  let activeHeader: string[] | null = null;
  let activeDataRows: string[][] = [];

  const flushSection = () => {
    if (!activeHeader || activeDataRows.length === 0) {
      activeHeader = null;
      activeDataRows = [];
      return;
    }

    sections.push({
      name: currentSectionTitle,
      channel: inferChannelFromSection(currentSectionTitle, activeHeader),
      headers: activeHeader,
      rows: recordsFromRowCells(activeHeader, activeDataRows),
    });

    activeHeader = null;
    activeDataRows = [];
  };

  for (const matrix of pageMatrices) {
    for (const row of matrix) {
      if (row.length === 0 || row.every((cell) => !cell.trim())) continue;

      if (row.length === 1 && isSectionTitle(row)) {
        flushSection();
        currentSectionTitle = row[0]?.trim() || currentSectionTitle;
        continue;
      }

      if (isProductivityHeader(row)) {
        flushSection();
        activeHeader = row;
        activeDataRows = [];
        continue;
      }

      if (activeHeader && isDataRow(row)) {
        activeDataRows.push(row);
      }
    }
  }

  flushSection();
  return sections;
}

async function extractPageMatrices(buffer: ArrayBuffer): Promise<string[][][]> {
  const pdf = await loadPdfDocument(buffer);
  const pageMatrices: string[][][] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const fragments: TextFragment[] = [];

    for (const item of content.items) {
      if (!isTextItem(item) || !item.str.trim()) continue;
      const transform = item.transform;
      fragments.push({
        text: item.str,
        x: transform[4] ?? 0,
        y: transform[5] ?? 0,
        page: pageNumber,
      });
    }

    const rows = groupFragmentsIntoRows(fragments)
      .map(rowToCells)
      .filter((row) => row.some((cell) => cell.length > 0));

    pageMatrices.push(rows);
  }

  return pageMatrices;
}

function isUsefulGenericMatrix(matrix: string[][]): boolean {
  const tableRows = matrix.filter((row) => row.length >= 2);
  return tableRows.length >= 2;
}

function flattenPageMatrices(pageMatrices: string[][][]): string[][] {
  return pageMatrices.flat();
}

export async function extractPdfTableMatrix(buffer: ArrayBuffer): Promise<string[][]> {
  const pageMatrices = await extractPageMatrices(buffer);
  const productivitySections = extractProductivitySections(pageMatrices);

  if (productivitySections.length > 0) {
    const sample = productivitySections[0];
    return [sample.headers, ...sample.rows.map((row) => sample.headers.map((header) => row[header] ?? ""))];
  }

  const flatMatrix = flattenPageMatrices(pageMatrices);
  if (isUsefulGenericMatrix(flatMatrix)) {
    return flatMatrix.filter((row) => row.length >= 2);
  }

  const plainLines: string[] = [];
  for (const matrix of pageMatrices) {
    for (const row of matrix) {
      if (row.length === 1) plainLines.push(row[0] ?? "");
      else plainLines.push(row.join("  "));
    }
  }

  const lineMatrix = pdfLinesToMatrix(plainLines);
  if (isUsefulGenericMatrix(lineMatrix)) {
    return lineMatrix;
  }

  throw new Error(
    "Não foi possível identificar uma tabela no PDF. Exporte o relatório em CSV/Excel ou use um PDF com colunas legíveis."
  );
}

export async function parsePdfFile(file: File): Promise<ParsedSheet> {
  const buffer = await file.arrayBuffer();
  const pageMatrices = await extractPageMatrices(buffer);
  const productivitySections = extractProductivitySections(pageMatrices);

  const merged = mergeProductivityTables(productivitySections, file.name, [
    "Dados extraídos automaticamente do PDF. Confira o mapeamento antes de importar.",
  ]);

  if (merged) return merged;

  const matrix = await extractPdfTableMatrix(buffer);
  return parseMatrixToParsedSheet(matrix, file.name, [
    "Dados extraídos automaticamente do PDF. Confira o mapeamento antes de importar.",
  ]);
}
