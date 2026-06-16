import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";

// ----------------------------------------------------------------
// Tipos
// ----------------------------------------------------------------
const SheetMappingSchema = z.object({
  tipo: z.enum([
    "voz_diario",
    "voz_produtividade",
    "chat_diario",
    "chat_produtividade",
    "outro",
  ]),
  titulo: z.string(),
  campos_detectados: z.array(z.string()),
  header_row: z.number(),
  data_start_row: z.number(),
  col_data: z.number().nullable(),
  col_nome_agente: z.number().nullable(),
  col_recebidas: z.number().nullable(),
  col_atendidas: z.number().nullable(),
  col_pct_atend: z.number().nullable(),
  col_tma: z.number().nullable(),
  col_login: z.number().nullable(),
  col_pausa: z.number().nullable(),
  col_pct_pausa: z.number().nullable(),
  col_atend_hora: z.number().nullable(),
  col_taxa_perda: z.number().nullable(),
});

export type SheetMapping = z.infer<typeof SheetMappingSchema>;

// ----------------------------------------------------------------
// Detecção heurística — sem IA, sem custo
// ----------------------------------------------------------------
function detectSheetType(
  sheetName: string,
  titleRow: string[],
  headerRow: string[]
): SheetMapping["tipo"] {
  const name = sheetName.toLowerCase();
  const title = (titleRow[0] ?? "").toLowerCase();
  const headers = headerRow.map((h) => h.toLowerCase()).join(" ");

  if (
    title.includes("090") ||
    name.includes("090") ||
    (name.includes("chat") && (name.includes("prod") || headers.includes("entrada")))
  ) {
    return "chat_produtividade";
  }

  if (
    title.includes("091") ||
    name.includes("091") ||
    (name.includes("chat") && !name.includes("prod") && !headers.includes("nome"))
  ) {
    return "chat_diario";
  }

  if (
    title.includes("025") ||
    name.includes("025") ||
    (name.includes("voz") && (name.includes("prod") || headers.includes("oferecidas"))) ||
    title.includes("produtividade")
  ) {
    return "voz_produtividade";
  }

  if (
    title.includes("067") ||
    name.includes("067") ||
    title.includes("liga") ||
    name.includes("voz") ||
    headers.includes("abandonadas")
  ) {
    return "voz_diario";
  }

  return "outro";
}

function findCol(headers: string[], ...terms: string[]): number | null {
  const idx = headers.findIndex((h) =>
    terms.some((t) => h.toLowerCase().includes(t.toLowerCase()))
  );
  return idx >= 0 ? idx : null;
}

function buildMapping(
  sheetName: string,
  titleRow: string[],
  headerRow: string[]
): SheetMapping {
  const tipo = detectSheetType(sheetName, titleRow, headerRow);
  const h = headerRow;

  const base = {
    tipo,
    titulo: titleRow[0] || sheetName,
    campos_detectados: h.filter(Boolean),
    header_row: 1,
    data_start_row: 2,
    col_data: findCol(h, "data"),
    col_nome_agente: findCol(h, "nome"),
    col_recebidas: null as number | null,
    col_atendidas: null as number | null,
    col_pct_atend: null as number | null,
    col_tma: findCol(h, "tma"),
    col_login: findCol(h, "login"),
    col_pausa: findCol(h, "pausa"),
    col_pct_pausa: findCol(h, "%pausa", "% pausa"),
    col_atend_hora: findCol(h, "hora", "atend./hora", "atendimentos por hora"),
    col_taxa_perda: findCol(h, "perda", "abandon"),
  };

  if (tipo === "voz_diario") {
    base.col_recebidas = findCol(h, "recebida");
    base.col_atendidas = findCol(h, "atendida");
    base.col_pct_atend = findCol(h, "% atend", "%");
  } else if (tipo === "voz_produtividade") {
    base.col_recebidas = findCol(h, "oferecida");
    base.col_atendidas = findCol(h, "atendidas", "atendida");
    base.col_pct_atend = findCol(h, "% atend", "% aten");
  } else if (tipo === "chat_diario") {
    base.col_recebidas = findCol(h, "recebida");
  } else if (tipo === "chat_produtividade") {
    base.col_recebidas = findCol(h, "entrada");
  }

  return base;
}

// ----------------------------------------------------------------
// Router
// ----------------------------------------------------------------
export const importRouter = router({
  detectSchema: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        sheetsPreview: z.record(
          z.string(),
          z.object({
            titleRow: z.array(z.string()),
            headerRow: z.array(z.string()),
            sampleRows: z.array(z.array(z.string())),
            totalRows: z.number(),
          })
        ),
      })
    )
    .mutation(({ input }) => {
      const sheets: Record<string, SheetMapping> = {};

      for (const [name, preview] of Object.entries(input.sheetsPreview)) {
        sheets[name] = buildMapping(name, preview.titleRow, preview.headerRow);
      }

      const tipos = Object.values(sheets).map((s) => s.tipo);
      const hasVoz = tipos.some((t) => t.includes("voz"));
      const hasChat = tipos.some((t) => t.includes("chat"));
      const summary = [hasVoz && "dados de voz", hasChat && "dados de chat"]
        .filter(Boolean)
        .join(" e ");

      return {
        success: true as const,
        data: {
          summary: `Relatório com ${summary || "dados detectados"} — ${input.fileName}`,
          sheets,
        },
      };
    }),
});
