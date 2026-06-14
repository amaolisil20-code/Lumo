import * as XLSX from "xlsx";
import type { Attendant } from "@/types/attendant";
import type { AttendanceChannel } from "@/types/goals";
import type { DailyPerformanceRecord } from "@/types/performance";
import { parseTimeInput } from "@/lib/performanceStorage";
import { createAttendant } from "@/lib/attendantsStorage";

export type ImportField = "attendant" | "date" | "channel" | "count" | "averageTime";

export interface ColumnMapping {
  attendant: string | null;
  date: string | null;
  channel: string | null;
  count: string | null;
  averageTime: string | null;
}

export interface ParsedSheet {
  headers: string[];
  rows: Record<string, string>[];
  fileName: string;
  /** Abas de produtividade usadas na importação (Acompanhamento Diário) */
  sourceSheets?: { name: string; channel: AttendanceChannel; rowCount: number }[];
  importNotes?: string[];
}

export interface ImportRowPreview {
  rowNumber: number;
  attendantName: string;
  date: string;
  channel: AttendanceChannel;
  attendancesCount: number;
  averageTimeMinutes: number;
  status: "new" | "update" | "skip";
  note?: string;
  skipReason?: "duplicate" | "existing_day";
}

export interface ImportPlan {
  valid: ImportRowPreview[];
  errors: { rowNumber: number; message: string }[];
  stats: {
    totalRows: number;
    validCount: number;
    newRecords: number;
    updates: number;
    skippedDuplicates: number;
    skippedExistingDays: number;
    newAttendants: number;
    aggregatedRows: number;
    unknownAttendants: string[];
    newDaysInFile: string[];
    existingDaysInFile: string[];
  };
}

export interface ImportBatchOptions {
  createAttendants: boolean;
  updateDuplicates: boolean;
  /** Ignora linhas cujo dia já existe no sistema (importação recorrente) */
  onlyNewDays?: boolean;
  consolidated?: boolean;
  consolidatedAttendantName?: string;
  consolidatedChannel?: AttendanceChannel;
}

export type ImportSpreadsheetProfile = "detailed" | "rel_summary";

export interface ImportProfileAnalysis {
  profile: ImportSpreadsheetProfile;
  message: string;
  suggestedConsolidatedName: string;
  suggestedChannel: AttendanceChannel;
}

export interface ImportBatchResult {
  imported: number;
  updated: number;
  skipped: number;
  skippedExistingDays: number;
  createdAttendants: number;
  uniqueAttendants: number;
  newDays: string[];
  logMessage: string;
  errors: { rowNumber: number; message: string }[];
}

export function formatImportLogMessage(result: Pick<
  ImportBatchResult,
  "imported" | "updated" | "uniqueAttendants" | "newDays" | "skipped" | "skippedExistingDays"
>): string {
  const records = result.imported + result.updated;
  const parts: string[] = [];

  if (records > 0) {
    parts.push(
      `Importados ${records} registro${records === 1 ? "" : "s"} de ${result.uniqueAttendants} colaborador${result.uniqueAttendants === 1 ? "" : "es"}`
    );
  }

  if (result.newDays.length > 0) {
    parts.push(
      `${result.newDays.length} dia${result.newDays.length === 1 ? "" : "s"} novo${result.newDays.length === 1 ? "" : "s"}`
    );
  }

  if (result.skippedExistingDays > 0) {
    parts.push(`${result.skippedExistingDays} linha(s) de dias já importados ignoradas`);
  }

  if (result.skipped > 0 && result.skippedExistingDays === 0) {
    parts.push(`${result.skipped} duplicata(s) ignorada(s)`);
  } else if (result.skipped > result.skippedExistingDays) {
    parts.push(`${result.skipped - result.skippedExistingDays} duplicata(s) ignorada(s)`);
  }

  return parts.join(" · ") || "Nenhuma alteração aplicada";
}

const HEADER_ALIASES: Record<ImportField, string[]> = {
  attendant: [
    "nome",
    "colaborador",
    "atendente",
    "name",
    "agente",
    "operador",
    "usuario",
    "funcionario",
    "analista",
    "attendant",
  ],
  date: ["data", "date", "dia", "data_atendimento", "data registro", "dt", "data_atend"],
  channel: ["canal", "channel", "tipo", "tipo_atendimento", "origem", "meio", "plataforma", "ligacao"],
  count: [
    "quantidade",
    "qtd",
    "qtde",
    "atendimentos",
    "total",
    "volume",
    "count",
    "qtd_atendimentos",
    "total_atendimentos",
    "qtd atendimentos",
    "atendida",
    "recebida",
    "entrada",
    "atendidas",
    "oferecidas",
  ],
  averageTime: [
    "tempo",
    "tempo_medio",
    "tempo medio",
    "duracao",
    "duração",
    "tme",
    "tma",
    "average_time",
    "tempo_medio_atendimento",
  ],
};

const REQUIRED_FIELDS: ImportField[] = ["attendant", "date", "channel", "count"];

const METRIC_HEADER_PATTERN =
  /^(recebida|atendida|abandon|recuper|taxa|perda|sem_atendimento|auto_recuper|unicas?|percent|atendimento_pos|coluna_\d+|pct)/;

const FIELD_MIN_SCORE: Record<ImportField, number> = {
  attendant: 80,
  date: 65,
  channel: 65,
  count: 35,
  averageTime: 35,
};

function isMetricColumn(key: string): boolean {
  if (!key) return true;
  if (METRIC_HEADER_PATTERN.test(key)) return true;
  return (
    key.includes("percent") ||
    key.includes("taxa") ||
    key.includes("abandon") ||
    key.includes("recuper")
  );
}

function inferChannelFromFileName(fileName: string): AttendanceChannel | null {
  const key = normalizeHeader(fileName.replace(/\.[^.]+$/, ""));
  if (key.includes("whatsapp") || key.includes("whats") || key.includes("zap")) {
    return "WhatsApp";
  }
  if (
    key.includes("ligacao") ||
    key.includes("rel") ||
    key.includes("voz") ||
    key.includes("telefone")
  ) {
    return "Ligação";
  }
  return null;
}

function inferConsolidatedLabel(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return base || "Total consolidado";
}

function scoreHeaderForField(field: ImportField, key: string, alias: string): number {
  if ((field === "attendant" || field === "channel") && isMetricColumn(key)) {
    return 0;
  }
  if (field === "attendant" && (key === "data" || key.startsWith("data_"))) {
    return 0;
  }
  if (field === "count") {
    if (key === "atendidas" && alias === "atendidas") return 100;
    if (key === "atendida" && alias === "atendida") return 98;
    if (key === "entrada" && alias === "entrada") return 95;
    if (key === "recebida" && alias === "recebida") return 90;
    if (key === "oferecidas" && alias === "oferecidas") return 70;
  }
  if (field === "attendant" && key === "nome" && alias === "nome") return 100;
  return scoreHeaderMatch(key, alias);
}

function scoreHeaderMatch(key: string, alias: string): number {
  if (!key || !alias) return 0;
  if (key === alias) return 100;
  if (key.startsWith(`${alias}_`) || key.endsWith(`_${alias}`)) return 80;
  if (key.startsWith(alias) || key.endsWith(alias)) return 65;
  if (alias.length >= 4 && key.includes(alias)) return 45;
  if (key.length >= 4 && alias.includes(key)) return 35;
  return 0;
}

function findHeaderRowIndex(matrix: unknown[][]): number {
  let bestIndex = 0;
  let bestScore = -1;

  const scanLimit = Math.min(matrix.length, 12);
  for (let i = 0; i < scanLimit; i++) {
    const cells = matrix[i].map((cell) => cellToString(cell)).filter((cell) => cell.length > 0);
    if (cells.length < 2) continue;

    let score = cells.length * 8;
    for (const cell of cells) {
      const key = normalizeHeader(cell);
      for (const aliases of Object.values(HEADER_ALIASES)) {
        if (aliases.some((alias) => scoreHeaderMatch(key, alias) >= 65)) {
          score += 24;
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return bestIndex;
}

function dedupeHeaders(headers: string[]): string[] {
  const counts = new Map<string, number>();

  return headers.map((header, index) => {
    const base = header.trim() || `Coluna ${index + 1}`;
    const seen = counts.get(base) ?? 0;
    counts.set(base, seen + 1);
    return seen === 0 ? base : `${base} (${seen + 1})`;
  });
}

function rowsFromMatrix(
  matrix: unknown[][],
  toCell: (value: unknown) => string
): ParsedSheet["rows"] {
  if (matrix.length === 0) throw new Error("Planilha sem dados");

  const headerIndex = findHeaderRowIndex(matrix);
  const table = matrix.slice(headerIndex);
  if (table.length === 0) throw new Error("Planilha sem dados");

  const headers = dedupeHeaders(table[0].map((cell) => toCell(cell)));
  return table.slice(1).map((cells) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = toCell(cells[index]);
    });
    return record;
  });
}

function parseExcelSerialDate(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 1 || serial > 100000) return null;

  const parsed = XLSX.SSF.parse_date_code(serial);
  if (!parsed) return null;

  const y = parsed.y;
  const m = String(parsed.m).padStart(2, "0");
  const d = String(parsed.d).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function normalizeName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ");
}

function parseCsv(content: string): ParsedSheet["rows"] {
  const text = content.replace(/^\uFEFF/, "").trim();
  if (!text) throw new Error("Arquivo vazio");

  const firstLine = text.split(/\r?\n/)[0] ?? "";
  const delimiter =
    (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";

  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      row.push(current.trim());
      current = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") i++;
      row.push(current.trim());
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current.trim());
    if (row.some((cell) => cell.length > 0)) rows.push(row);
  }

  if (rows.length === 0) throw new Error("Arquivo sem linhas de dados");

  return rowsFromMatrix(rows, (value) => String(value ?? "").trim());
}

function cellToString(value: unknown): string {
  if (value == null || value === "") return "";

  if (value instanceof Date) {
    if (value.getFullYear() <= 1900) {
      const h = value.getHours();
      const m = value.getMinutes();
      const s = value.getSeconds();
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    const y = value.getFullYear();
    const mo = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${mo}-${d}`;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return String(value).trim();
}

type SheetKind = "productivity" | "summary" | "unknown";

const UNIFIED_COL = {
  colaborador: "Colaborador",
  data: "Data",
  canal: "Canal",
  quantidade: "Quantidade",
  tempo: "Tempo médio",
} as const;

function classifySheet(headers: string[]): SheetKind {
  const keys = headers.map(normalizeHeader);
  const hasNome = keys.includes("nome");
  const hasData = keys.some((key) =>
    HEADER_ALIASES.date.some((alias) => scoreHeaderForField("date", key, alias) >= 65)
  );
  const hasPersonVolume =
    keys.includes("atendidas") ||
    keys.includes("entrada") ||
    keys.includes("oferecidas");

  if (hasNome && hasData && hasPersonVolume) {
    return "productivity";
  }

  const hasSummaryVolume =
    keys.includes("recebida") ||
    (keys.includes("atendida") && !keys.includes("atendidas"));
  if (hasData && hasSummaryVolume && !hasNome) {
    return "summary";
  }

  return "unknown";
}

function inferChannelFromSheetName(sheetName: string): AttendanceChannel {
  const key = normalizeHeader(sheetName);
  if (key.includes("chat")) return "WhatsApp";
  return "Ligação";
}

function pickProductivityCountColumn(headers: string[]): string | null {
  const items = headers.map((original) => ({
    original,
    key: normalizeHeader(original),
  }));
  return (
    items.find((item) => item.key === "atendidas")?.original ??
    items.find((item) => item.key === "entrada")?.original ??
    items.find((item) => item.key === "oferecidas")?.original ??
    null
  );
}

function productivityMapping(headers: string[]): ColumnMapping {
  const auto = detectColumnMapping(headers);
  return {
    attendant: headers.find((h) => normalizeHeader(h) === "nome") ?? auto.attendant,
    date: auto.date,
    channel: null,
    count: pickProductivityCountColumn(headers) ?? auto.count,
    averageTime:
      headers.find((h) => normalizeHeader(h) === "tma") ?? auto.averageTime,
  };
}

function mergeProductivitySheets(
  workbook: XLSX.WorkBook,
  fileName: string
): ParsedSheet | null {
  const mergedRows: Record<string, string>[] = [];
  const sourceSheets: NonNullable<ParsedSheet["sourceSheets"]> = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
      raw: true,
    });
    if (matrix.length < 2) continue;

    const headerIndex = findHeaderRowIndex(matrix);
    const headers = dedupeHeaders(matrix[headerIndex].map((cell) => cellToString(cell)));
    if (classifySheet(headers) !== "productivity") continue;

    const channel = inferChannelFromSheetName(sheetName);
    const mapping = productivityMapping(headers);
    const rows = rowsFromMatrix(matrix, cellToString);
    let sheetRowCount = 0;

    for (const row of rows) {
      const name = mapping.attendant ? row[mapping.attendant]?.trim() : "";
      const dateRaw = mapping.date ? row[mapping.date] ?? "" : "";
      const countRaw = mapping.count ? row[mapping.count] ?? "" : "";
      if (!name || !dateRaw || !countRaw) continue;

      const count = parseCountValue(countRaw);
      if (count == null || count === 0) continue;

      const timeRaw = mapping.averageTime ? row[mapping.averageTime] ?? "" : "";
      sheetRowCount += 1;
      mergedRows.push({
        [UNIFIED_COL.colaborador]: name,
        [UNIFIED_COL.data]: dateRaw,
        [UNIFIED_COL.canal]: channel,
        [UNIFIED_COL.quantidade]: String(count),
        [UNIFIED_COL.tempo]: timeRaw,
      });
    }

    if (sheetRowCount > 0) {
      sourceSheets.push({ name: sheetName, channel, rowCount: sheetRowCount });
    }
  }

  if (mergedRows.length === 0) return null;

  const headers = [
    UNIFIED_COL.colaborador,
    UNIFIED_COL.data,
    UNIFIED_COL.canal,
    UNIFIED_COL.quantidade,
    UNIFIED_COL.tempo,
  ];

  return {
    headers,
    rows: mergedRows,
    fileName,
    sourceSheets,
    importNotes: sourceSheets.map(
      (sheet) =>
        `${sheet.name} (${sheet.channel}): ${sheet.rowCount} registro(s) com atendimento`
    ),
  };
}

function parseExcelBuffer(buffer: ArrayBuffer): Record<string, string>[] {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("Planilha Excel vazia");

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: true,
  });

  return rowsFromMatrix(matrix, cellToString);
}

function detectSpreadsheetKind(file: File, buffer: ArrayBuffer): "excel" | "csv" {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (extension === "xlsx" || extension === "xls") return "excel";

  const bytes = new Uint8Array(buffer.slice(0, 4));
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  const isOle = bytes[0] === 0xd0 && bytes[1] === 0xcf;
  if (isZip || isOle) return "excel";

  return "csv";
}

function parseExcel(buffer: ArrayBuffer): Record<string, string>[] {
  return parseExcelBuffer(buffer);
}

export async function parseSpreadsheetFile(file: File): Promise<ParsedSheet> {
  const buffer = await file.arrayBuffer();
  const kind = detectSpreadsheetKind(file, buffer);

  if (kind === "excel") {
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    const merged = mergeProductivitySheets(workbook, file.name);
    if (merged) return merged;
  }

  let rows: Record<string, string>[];
  if (kind === "excel") {
    rows = parseExcel(buffer);
  } else {
    rows = parseCsv(new TextDecoder("utf-8").decode(buffer));
  }

  rows = rows.filter((row) => Object.values(row).some((value) => value.trim().length > 0));
  if (rows.length === 0) throw new Error("Nenhuma linha de dados encontrada");

  const headers = Object.keys(rows[0] ?? {});
  if (headers.length === 0) throw new Error("Cabeçalhos não encontrados");

  return { headers, rows, fileName: file.name };
}

export function analyzeImportProfile(
  headersOrSheet: string[] | ParsedSheet,
  fileName?: string
): ImportProfileAnalysis {
  const parsed: ParsedSheet | null =
    Array.isArray(headersOrSheet)
      ? null
      : headersOrSheet;
  const headers = parsed?.headers ?? headersOrSheet;
  const name = parsed?.fileName ?? fileName ?? "";

  if (parsed?.sourceSheets?.length) {
    return {
      profile: "detailed",
      message: `Detectamos abas de produtividade por colaborador (${parsed.sourceSheets.map((s) => s.name).join(", ")}). Cada pessoa será criada automaticamente se ainda não existir. Dias com zero atendimentos são ignorados.`,
      suggestedConsolidatedName: inferConsolidatedLabel(name),
      suggestedChannel: inferChannelFromFileName(name) ?? "Ligação",
    };
  }

  const keys = headers.map((header) => normalizeHeader(header));
  const hasStrongAttendant = keys.some(
    (key) =>
      !isMetricColumn(key) &&
      HEADER_ALIASES.attendant.some(
        (alias) => scoreHeaderForField("attendant", key, alias) >= 80
      )
  );
  const hasDate = keys.some((key) =>
    HEADER_ALIASES.date.some((alias) => scoreHeaderForField("date", key, alias) >= 65)
  );
  const hasMetricVolume = keys.includes("atendida") || keys.includes("recebida");
  const suggestedChannel = inferChannelFromFileName(name) ?? "Ligação";
  const suggestedConsolidatedName = inferConsolidatedLabel(name);

  if (hasDate && hasMetricVolume && !hasStrongAttendant) {
    return {
      profile: "rel_summary",
      message:
        "Esta planilha parece ser um relatório consolidado por dia (Recebida, Atendida, etc.), sem colaborador em cada linha. Ative o modo consolidado para importar.",
      suggestedConsolidatedName,
      suggestedChannel,
    };
  }

  return {
    profile: "detailed",
    message: "",
    suggestedConsolidatedName,
    suggestedChannel,
  };
}

export function detectColumnMapping(headers: string[], _fileName?: string): ColumnMapping {
  const normalizedHeaders = headers.map((header) => ({
    original: header,
    key: normalizeHeader(header),
  }));

  const mapping: ColumnMapping = {
    attendant: null,
    date: null,
    channel: null,
    count: null,
    averageTime: null,
  };

  const usedHeaders = new Set<string>();
  const fields: ImportField[] = [
    "date",
    "count",
    "channel",
    "attendant",
    "averageTime",
  ];

  for (const field of fields) {
    let bestMatch: { original: string; score: number } | null = null;

    for (const header of normalizedHeaders) {
      if (usedHeaders.has(header.original) || !header.key) continue;

      let score = 0;
      for (const alias of HEADER_ALIASES[field]) {
        score = Math.max(score, scoreHeaderForField(field, header.key, alias));
      }

      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { original: header.original, score };
      }
    }

    if (bestMatch && bestMatch.score >= FIELD_MIN_SCORE[field]) {
      mapping[field] = bestMatch.original;
      usedHeaders.add(bestMatch.original);
    }
  }

  return mapping;
}

export function isMappingComplete(
  mapping: ColumnMapping,
  options?: Pick<
    ImportBatchOptions,
    "consolidated" | "consolidatedChannel" | "consolidatedAttendantName"
  >
): boolean {
  if (!mapping.date || !mapping.count) return false;

  if (options?.consolidated) {
    return Boolean(options.consolidatedChannel && options.consolidatedAttendantName?.trim());
  }

  return Boolean(mapping.attendant && mapping.channel);
}

function parseDateValue(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const asNumber = Number(value.replace(",", "."));
  if (/^\d{4,}(\.\d+)?$/.test(value) && Number.isFinite(asNumber)) {
    const fromExcel = parseExcelSerialDate(asNumber);
    if (fromExcel) return fromExcel;
  }

  const br = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (br) {
    const day = br[1].padStart(2, "0");
    const month = br[2].padStart(2, "0");
    const year = br[3].length === 2 ? `20${br[3]}` : br[3];
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  return null;
}

function parseChannelValue(raw: string): AttendanceChannel | null {
  const value = normalizeHeader(raw);
  if (!value) return null;

  if (
    value.includes("whatsapp") ||
    value.includes("whats") ||
    value === "zap" ||
    value === "wa"
  ) {
    return "WhatsApp";
  }

  if (
    value.includes("ligacao") ||
    value.includes("telefone") ||
    value.includes("call") ||
    value.includes("voz") ||
    value.includes("phone") ||
    value === "voz"
  ) {
    return "Ligação";
  }

  if (value === "ligacao" || value === "whatsapp") {
    return value === "whatsapp" ? "WhatsApp" : "Ligação";
  }

  return null;
}

function parseCountValue(raw: string): number | null {
  const normalized = raw.replace(/\./g, "").replace(",", ".").trim();
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value);
}

function parseAverageTimeValue(raw: string): number {
  if (!raw.trim()) return 3;

  const trimmed = raw.trim();
  const clock = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (clock) {
    const first = parseInt(clock[1], 10);
    const second = parseInt(clock[2], 10);
    if (clock[3]) {
      const third = parseInt(clock[3], 10);
      return first * 60 + second + third / 60;
    }
    if (first < 60) {
      return first + second / 60;
    }
    return first * 60 + second;
  }

  const fromParser = parseTimeInput(trimmed);
  if (fromParser && fromParser > 0) return fromParser;

  const asNumber = Number(trimmed.replace(",", "."));
  if (Number.isFinite(asNumber) && asNumber > 0) return asNumber;

  return 3;
}

interface NormalizedImportRow {
  rowNumber: number;
  attendantName: string;
  date: string;
  channel: AttendanceChannel;
  attendancesCount: number;
  averageTimeMinutes: number;
}

function normalizeRows(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
  options: ImportBatchOptions
): { valid: NormalizedImportRow[]; errors: { rowNumber: number; message: string }[] } {
  const valid: NormalizedImportRow[] = [];
  const errors: { rowNumber: number; message: string }[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const attendantName = mapping.attendant
      ? row[mapping.attendant]?.trim() ?? ""
      : options.consolidated
        ? options.consolidatedAttendantName?.trim() ?? ""
        : "";
    const dateRaw = row[mapping.date!] ?? "";
    const countRaw = row[mapping.count!] ?? "";
    const channelRaw = mapping.channel ? row[mapping.channel] ?? "" : "";
    const timeRaw = mapping.averageTime ? row[mapping.averageTime] ?? "" : "";

    if (!attendantName && !dateRaw && !countRaw && !channelRaw) return;

    if (!attendantName) {
      errors.push({ rowNumber, message: "Nome do colaborador vazio" });
      return;
    }

    const date = parseDateValue(dateRaw);
    if (!date) {
      errors.push({ rowNumber, message: `Data inválida: "${dateRaw}"` });
      return;
    }

    const channel = mapping.channel
      ? parseChannelValue(channelRaw)
      : options.consolidated
        ? options.consolidatedChannel ?? null
        : parseChannelValue(row[UNIFIED_COL.canal] ?? channelRaw);

    if (!channel) {
      errors.push({
        rowNumber,
        message: mapping.channel
          ? `Canal não reconhecido: "${channelRaw}" (use Ligação ou WhatsApp)`
          : "Canal não definido para importação consolidada",
      });
      return;
    }

    const attendancesCount = parseCountValue(countRaw);
    if (attendancesCount == null) {
      errors.push({ rowNumber, message: `Quantidade inválida: "${countRaw}"` });
      return;
    }

    valid.push({
      rowNumber,
      attendantName,
      date,
      channel,
      attendancesCount,
      averageTimeMinutes: parseAverageTimeValue(timeRaw),
    });
  });

  return { valid, errors };
}

function aggregateDuplicateRows(rows: NormalizedImportRow[]): {
  aggregated: NormalizedImportRow[];
  mergedCount: number;
} {
  const map = new Map<string, NormalizedImportRow>();
  let mergedCount = 0;

  for (const row of rows) {
    const key = `${normalizeName(row.attendantName)}|${row.date}|${row.channel}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...row });
      continue;
    }

    mergedCount++;
    const totalCount = existing.attendancesCount + row.attendancesCount;
    const weightedTime =
      (existing.averageTimeMinutes * existing.attendancesCount +
        row.averageTimeMinutes * row.attendancesCount) /
      totalCount;

    map.set(key, {
      ...existing,
      attendancesCount: totalCount,
      averageTimeMinutes: weightedTime,
      rowNumber: existing.rowNumber,
    });
  }

  return { aggregated: Array.from(map.values()), mergedCount };
}

export function buildImportPlan(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
  attendants: Attendant[],
  existingRecords: DailyPerformanceRecord[],
  options: ImportBatchOptions
): ImportPlan {
  const onlyNewDays = options.onlyNewDays ?? true;
  const { valid: parsed, errors } = normalizeRows(rows, mapping, options);
  const { aggregated, mergedCount } = aggregateDuplicateRows(parsed);

  const attendantByName = new Map(
    attendants.map((attendant) => [normalizeName(attendant.name), attendant])
  );

  const existingDates = new Set(existingRecords.map((record) => record.date));
  const fileDates = new Set(aggregated.map((row) => row.date));
  const newDaysInFile = Array.from(fileDates)
    .filter((date) => !existingDates.has(date))
    .sort();
  const existingDaysInFile = Array.from(fileDates)
    .filter((date) => existingDates.has(date))
    .sort();

  const unknownAttendantNames = new Set<string>();
  for (const row of aggregated) {
    if (!attendantByName.has(normalizeName(row.attendantName))) {
      unknownAttendantNames.add(row.attendantName.trim());
    }
  }

  const existingByKey = new Map(
    existingRecords.map((record) => [
      `${record.attendantId}|${record.date}|${record.channel}`,
      record,
    ])
  );

  const newAttendantNames = new Set<string>();
  const preview: ImportRowPreview[] = [];
  let newRecords = 0;
  let updates = 0;
  let skippedDuplicates = 0;
  let skippedExistingDays = 0;

  for (const row of aggregated) {
    const normalized = normalizeName(row.attendantName);
    let attendant = attendantByName.get(normalized);

    if (onlyNewDays && existingDates.has(row.date)) {
      preview.push({
        ...row,
        status: "skip",
        note: "Dia já importado",
        skipReason: "existing_day",
      });
      skippedExistingDays++;
      continue;
    }

    if (!attendant) {
      if (!options.createAttendants) {
        errors.push({
          rowNumber: row.rowNumber,
          message: `Colaborador não cadastrado: "${row.attendantName}"`,
        });
        continue;
      }
      newAttendantNames.add(row.attendantName.trim());
      attendant = { id: -1, name: row.attendantName.trim() } as Attendant;
    }

    const existing =
      attendant.id > 0
        ? existingByKey.get(`${attendant.id}|${row.date}|${row.channel}`)
        : undefined;

    if (existing) {
      if (options.updateDuplicates) {
        preview.push({ ...row, status: "update", note: "Substituir registro existente", skipReason: undefined });
        updates++;
      } else {
        preview.push({
          ...row,
          status: "skip",
          note: "Duplicata ignorada",
          skipReason: "duplicate",
        });
        skippedDuplicates++;
      }
      continue;
    }

    preview.push({ ...row, status: "new" });
    newRecords++;
  }

  return {
    valid: preview,
    errors,
    stats: {
      totalRows: rows.length,
      validCount: preview.length,
      newRecords,
      updates,
      skippedDuplicates,
      skippedExistingDays,
      newAttendants: newAttendantNames.size,
      aggregatedRows: mergedCount,
      unknownAttendants: Array.from(unknownAttendantNames).sort((a, b) =>
        a.localeCompare(b, "pt-BR")
      ),
      newDaysInFile,
      existingDaysInFile,
    },
  };
}

export function executePerformanceImport(
  plan: ImportPlan,
  attendants: Attendant[],
  existingRecords: DailyPerformanceRecord[],
  options: ImportBatchOptions
): {
  attendants: Attendant[];
  performanceRecords: DailyPerformanceRecord[];
  result: ImportBatchResult;
} {
  let nextAttendants = [...attendants];
  let nextRecords = [...existingRecords];
  let nextAttendantId = Math.max(...nextAttendants.map((a) => a.id), 0);
  let nextRecordId = Math.max(...nextRecords.map((r) => r.id), 0);

  const existingDates = new Set(existingRecords.map((record) => record.date));
  const attendantByName = new Map(
    nextAttendants.map((attendant) => [normalizeName(attendant.name), attendant])
  );

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let skippedExistingDays = 0;
  let createdAttendants = 0;
  const affectedAttendantIds = new Set<number>();
  const importedDates = new Set<string>();

  const now = new Date().toISOString();

  for (const row of plan.valid) {
    if (row.status === "skip") {
      skipped++;
      if (row.skipReason === "existing_day") skippedExistingDays++;
      continue;
    }

    let attendant = attendantByName.get(normalizeName(row.attendantName));
    if (!attendant && options.createAttendants) {
      const created = createAttendant(
        {
          name: row.attendantName.trim(),
          role: "Atendente",
          workingHours: "08h00",
          jornadaStart: "",
          jornadaEnd: "",
          observation: "Importado via planilha",
        },
        nextAttendants
      );
      nextAttendants.push(created);
      attendantByName.set(normalizeName(created.name), created);
      attendant = created;
      createdAttendants++;
    }

    if (!attendant) continue;

    const duplicateIndex = nextRecords.findIndex(
      (record) =>
        record.attendantId === attendant!.id &&
        record.date === row.date &&
        record.channel === row.channel
    );

    if (duplicateIndex >= 0 && row.status === "update") {
      nextRecords[duplicateIndex] = {
        ...nextRecords[duplicateIndex],
        attendancesCount: row.attendancesCount,
        averageTimeMinutes: row.averageTimeMinutes,
        attendantName: attendant.name,
        updatedAt: now,
      };
      updated++;
      affectedAttendantIds.add(attendant.id);
      importedDates.add(row.date);
      continue;
    }

    if (duplicateIndex >= 0) {
      skipped++;
      continue;
    }

    nextRecordId += 1;
    nextRecords.push({
      id: nextRecordId,
      attendantId: attendant.id,
      attendantName: attendant.name,
      date: row.date,
      channel: row.channel,
      attendancesCount: row.attendancesCount,
      averageTimeMinutes: row.averageTimeMinutes,
      createdAt: now,
      updatedAt: now,
    });
    imported++;
    affectedAttendantIds.add(attendant.id);
    importedDates.add(row.date);
  }

  const newDays = Array.from(importedDates)
    .filter((date) => !existingDates.has(date))
    .sort();

  const result: ImportBatchResult = {
    imported,
    updated,
    skipped,
    skippedExistingDays,
    createdAttendants,
    uniqueAttendants: affectedAttendantIds.size,
    newDays,
    logMessage: "",
    errors: plan.errors,
  };
  result.logMessage = formatImportLogMessage(result);

  return {
    attendants: nextAttendants,
    performanceRecords: nextRecords,
    result,
  };
}
