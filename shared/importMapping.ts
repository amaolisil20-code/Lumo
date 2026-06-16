export type SheetTipo =
  | "voz_diario"
  | "voz_produtividade"
  | "chat_diario"
  | "chat_produtividade"
  | "outro";

export interface SheetMapping {
  tipo: SheetTipo;
  titulo: string;
  campos_detectados: string[];
  header_row: number;
  data_start_row: number;
  col_data: number | null;
  col_nome_agente: number | null;
  col_recebidas: number | null;
  col_atendidas: number | null;
  col_pct_atend: number | null;
  col_tma: number | null;
  col_login: number | null;
  col_pausa: number | null;
  col_pct_pausa: number | null;
  col_atend_hora: number | null;
  col_taxa_perda: number | null;
}

const DATE_ALIASES = ["data", "date", "dia"];
const METRIC_HINT =
  /^(recebida|atendida|atendidas|abandon|recuper|taxa|perda|sem_atend|auto_recuper|unicas?|percent|pct|entrada|saida|oferecida)/;

export function normalizeImportHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

/** Índice da linha de cabeçalho (REL 067/091: título + cabeçalhos). */
export function findImportHeaderRowIndex(matrix: string[][]): number {
  let bestIndex = 0;
  let bestScore = -1;
  const scanLimit = Math.min(matrix.length, 12);

  for (let i = 0; i < scanLimit; i++) {
    const cells = matrix[i].map((c) => c.trim()).filter(Boolean);
    if (cells.length < 2) continue;

    let score = cells.length * 8;
    for (const cell of cells) {
      const key = normalizeImportHeader(cell);
      if (DATE_ALIASES.some((alias) => key === alias || key.startsWith(`${alias}_`))) {
        score += 28;
      }
      if (key === "recebida" || key === "atendida" || key === "atendidas") score += 24;
      if (key === "nome" || key === "entrada") score += 20;
      if (METRIC_HINT.test(key)) score += 8;
    }

    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return bestIndex;
}

export function parseImportNumber(raw: string | undefined): number {
  if (!raw) return 0;
  const trimmed = raw.trim();
  if (!trimmed) return 0;

  const digits = trimmed.replace(/%/g, "").trim();

  // pt-BR: 1.340 = milhar; 35,30 = decimal
  let normalized = digits;
  if (/\d\.\d{3}(?:\.\d{3})*(?:,\d+)?$/.test(digits) || /\d{1,3}(\.\d{3})+/.test(digits)) {
    normalized = digits.replace(/\./g, "").replace(",", ".");
  } else {
    normalized = digits.replace(",", ".");
  }

  const value = parseFloat(normalized);
  if (!Number.isFinite(value)) return 0;
  return value;
}

export function parseImportDate(raw: string | undefined): string {
  if (!raw) return "";
  const text = raw.trim();
  if (!text) return "";

  const br = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) {
    const d = br[1].padStart(2, "0");
    const m = br[2].padStart(2, "0");
    return `${d}/${m}/${br[3]}`;
  }

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return `${iso[3]}/${iso[2]}/${iso[1]}`;
  }

  return text.substring(0, 10);
}

function headerNorms(headers: string[]): string[] {
  return headers.map(normalizeImportHeader);
}

function findByNorm(headers: string[], ...keys: string[]): number | null {
  const norms = headerNorms(headers);
  for (const key of keys) {
    const idx = norms.indexOf(key);
    if (idx >= 0) return idx;
  }
  return null;
}

function findIncludes(headers: string[], ...terms: string[]): number | null {
  const idx = headers.findIndex((h) => {
    const norm = normalizeImportHeader(h);
    return terms.some((t) => norm.includes(normalizeImportHeader(t)));
  });
  return idx >= 0 ? idx : null;
}

function findPctAtendColumn(headers: string[]): number | null {
  const exact = headers.findIndex((h) => h.trim() === "%");
  if (exact >= 0) return exact;
  return findIncludes(headers, "% atend");
}

function findTaxaPerdaColumn(headers: string[]): number | null {
  const norms = headerNorms(headers);
  const idx = norms.findIndex(
    (n) => n.includes("taxa") && n.includes("perda")
  );
  return idx >= 0 ? idx : null;
}

function findAtendidaColumn(headers: string[]): number | null {
  const norms = headerNorms(headers);
  const idx = norms.findIndex(
    (n) => n === "atendida" || n === "atendidas"
  );
  return idx >= 0 ? idx : null;
}

export function detectSheetType(
  sheetName: string,
  titleRow: string[],
  headerRow: string[]
): SheetTipo {
  const name = sheetName.toLowerCase();
  const title = (titleRow[0] ?? "").toLowerCase();
  const headerText = headerRow.map((h) => h.toLowerCase()).join(" ");
  const norms = headerNorms(headerRow);

  if (
    title.includes("090") ||
    name.includes("090") ||
    (name.includes("chat") && (name.includes("prod") || norms.includes("entrada")))
  ) {
    return "chat_produtividade";
  }

  if (
    title.includes("091") ||
    name.includes("091") ||
    (name.includes("chat") && !name.includes("prod") && !norms.includes("nome"))
  ) {
    return "chat_diario";
  }

  if (
    title.includes("025") ||
    name.includes("025") ||
    (name.includes("voz") && (name.includes("prod") || norms.includes("oferecidas"))) ||
    title.includes("produtividade")
  ) {
    return "voz_produtividade";
  }

  if (
    title.includes("067") ||
    name.includes("067") ||
    title.includes("liga") ||
    name.includes("voz") ||
    headerText.includes("abandon")
  ) {
    return "voz_diario";
  }

  return "outro";
}

export function buildSheetMapping(
  sheetName: string,
  titleRow: string[],
  headerRow: string[]
): SheetMapping {
  const tipo = detectSheetType(sheetName, titleRow, headerRow);
  const headerIndex = 1;

  const base: SheetMapping = {
    tipo,
    titulo: titleRow.find((c) => c.trim()) ?? titleRow[0] ?? sheetName,
    campos_detectados: headerRow.filter(Boolean),
    header_row: headerIndex,
    data_start_row: headerIndex + 1,
    col_data: findByNorm(headerRow, "data") ?? findIncludes(headerRow, "data"),
    col_nome_agente: findByNorm(headerRow, "nome"),
    col_recebidas: null,
    col_atendidas: null,
    col_pct_atend: null,
    col_tma: findIncludes(headerRow, "tma"),
    col_login: findIncludes(headerRow, "login"),
    col_pausa: findIncludes(headerRow, "pausa"),
    col_pct_pausa: findIncludes(headerRow, "%pausa", "% pausa"),
    col_atend_hora: findIncludes(headerRow, "atend./hora", "atendimentos por hora", "atend_hora"),
    col_taxa_perda: findTaxaPerdaColumn(headerRow),
  };

  if (tipo === "voz_diario") {
    base.col_recebidas = findByNorm(headerRow, "recebida") ?? findIncludes(headerRow, "recebida");
    base.col_atendidas = findAtendidaColumn(headerRow);
    base.col_pct_atend = findPctAtendColumn(headerRow);
    base.col_taxa_perda = findTaxaPerdaColumn(headerRow);
  } else if (tipo === "voz_produtividade") {
    base.col_recebidas = findIncludes(headerRow, "oferecida");
    base.col_atendidas = findAtendidaColumn(headerRow);
    base.col_pct_atend = findIncludes(headerRow, "% atend", "% aten");
  } else if (tipo === "chat_diario") {
    base.col_recebidas = findByNorm(headerRow, "recebida") ?? findIncludes(headerRow, "recebida");
  } else if (tipo === "chat_produtividade") {
    base.col_recebidas = findByNorm(headerRow, "entrada") ?? findIncludes(headerRow, "entrada");
  }

  return base;
}

export function matrixToSheetPreview(matrix: string[][]): {
  titleRow: string[];
  headerRow: string[];
  sampleRows: string[][];
  allRows: string[][];
  totalRows: number;
  headerIndex: number;
} {
  if (matrix.length === 0) {
    return {
      titleRow: [],
      headerRow: [],
      sampleRows: [],
      allRows: [],
      totalRows: 0,
      headerIndex: 0,
    };
  }

  const headerIndex = findImportHeaderRowIndex(matrix);
  const titleRow = headerIndex > 0 ? matrix[0] ?? [] : matrix[headerIndex] ?? [];
  const headerRow = matrix[headerIndex] ?? [];
  const dataStart = headerIndex + 1;
  const allRows = matrix.slice(dataStart);
  const sampleRows = allRows.slice(0, 5);

  return {
    titleRow,
    headerRow,
    sampleRows,
    allRows,
    totalRows: allRows.length,
    headerIndex,
  };
}
