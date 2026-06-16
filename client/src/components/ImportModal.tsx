import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useLumoData } from "@/contexts/LumoDataContext";
import {
  analyzeImportProfile,
  buildImportPlan,
  detectColumnMapping,
  getAcompanhamentoDiarioMapping,
  isMappingComplete,
  parseSpreadsheetFile,
  type ColumnMapping,
  type ImportField,
  type ImportPlan,
  type ImportProfileAnalysis,
  type ParsedSheet,
} from "@/lib/spreadsheetImport";
import { loadImportLog, type ImportLogEntry } from "@/lib/importLogStorage";
import type { AttendanceChannel } from "@/types/goals";
import { Input } from "@/components/ui/input";

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FIELD_LABELS: Record<ImportField, string> = {
  attendant: "Colaborador",
  date: "Data",
  channel: "Canal",
  count: "Quantidade de atendimentos",
  averageTime: "Tempo médio",
};

const OPTIONAL_FIELDS: ImportField[] = ["averageTime"];

const STATUS_LABELS = {
  new: { label: "Novo", variant: "default" as const },
  update: { label: "Atualizar", variant: "secondary" as const },
  skip: { label: "Ignorar", variant: "outline" as const },
};

function resetState() {
  return {
    sheet: null as ParsedSheet | null,
    mapping: {
      attendant: null,
      date: null,
      channel: null,
      count: null,
      averageTime: null,
    } as ColumnMapping,
    createAttendants: true,
    updateDuplicates: false,
    onlyNewDays: true,
    error: null as string | null,
  };
}

export default function ImportModal({ open, onOpenChange }: ImportModalProps) {
  const { attendants, performanceRecords, importPerformance } = useLumoData();
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>(resetState().mapping);
  const [createAttendants, setCreateAttendants] = useState(true);
  const [updateDuplicates, setUpdateDuplicates] = useState(false);
  const [onlyNewDays, setOnlyNewDays] = useState(true);
  const [importLog, setImportLog] = useState<ImportLogEntry[]>(() => loadImportLog());
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ImportProfileAnalysis | null>(null);
  const [consolidatedImport, setConsolidatedImport] = useState(false);
  const [consolidatedName, setConsolidatedName] = useState("");
  const [consolidatedChannel, setConsolidatedChannel] =
    useState<AttendanceChannel>("Ligação");

  const importOptions = useMemo(
    () => ({
      createAttendants,
      updateDuplicates,
      onlyNewDays,
      consolidated: consolidatedImport,
      consolidatedAttendantName: consolidatedImport ? consolidatedName : undefined,
      consolidatedChannel: consolidatedImport ? consolidatedChannel : undefined,
    }),
    [
      createAttendants,
      updateDuplicates,
      onlyNewDays,
      consolidatedImport,
      consolidatedName,
      consolidatedChannel,
    ]
  );

  const mappingComplete = useMemo(
    () => isMappingComplete(mapping, importOptions),
    [mapping, importOptions]
  );

  const plan: ImportPlan | null = useMemo(() => {
    if (!sheet || !mappingComplete) return null;
    return buildImportPlan(
      sheet.rows,
      mapping,
      attendants,
      performanceRecords,
      importOptions
    );
  }, [sheet, mapping, mappingComplete, attendants, performanceRecords, importOptions]);

  const importableCount = useMemo(() => {
    if (!plan) return 0;
    return plan.valid.filter((row) => row.status !== "skip").length;
  }, [plan]);

  const hasUnknownAttendants = (plan?.stats.unknownAttendants.length ?? 0) > 0;
  const importBlockedByAttendants = hasUnknownAttendants && !createAttendants;

  const usedHeaders = useMemo(() => {
    const used = new Set<string>();
    for (const field of Object.keys(mapping) as ImportField[]) {
      const header = mapping[field];
      if (header) used.add(header);
    }
    return used;
  }, [mapping]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setSheet(null);
    setMapping(resetState().mapping);
    setCreateAttendants(true);
    setUpdateDuplicates(false);
    setOnlyNewDays(true);
    setError(null);
    setIsLoading(false);
    setIsImporting(false);
    setProfile(null);
    setConsolidatedImport(false);
    setConsolidatedName("");
    setConsolidatedChannel("Ligação");
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) {
      setSheet(null);
      setMapping(resetState().mapping);
      setCreateAttendants(true);
      setUpdateDuplicates(false);
      setOnlyNewDays(true);
      setError(null);
      setIsLoading(false);
      setIsImporting(false);
      setProfile(null);
      setConsolidatedImport(false);
      setConsolidatedName("");
      setConsolidatedChannel("Ligação");
    }
  }, [open]);

  useEffect(() => {
    if (open) setImportLog(loadImportLog());
  }, [open]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setError(null);
    setIsLoading(true);
    setSheet(null);

    try {
      const parsed = await parseSpreadsheetFile(selectedFile);
      const analysis = analyzeImportProfile(parsed);
      setSheet(parsed);
      setProfile(analysis);
      setMapping(
        parsed.sourceSheets?.length
          ? getAcompanhamentoDiarioMapping()
          : detectColumnMapping(parsed.headers, parsed.fileName)
      );
      setConsolidatedImport(
        analysis.profile === "rel_summary" && !parsed.sourceSheets?.length
      );
      setConsolidatedName(analysis.suggestedConsolidatedName);
      setConsolidatedChannel(analysis.suggestedChannel);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar arquivo");
    } finally {
      setIsLoading(false);
      event.target.value = "";
    }
  };

  const updateMapping = (field: ImportField, header: string | null) => {
    setMapping((prev) => ({ ...prev, [field]: header }));
  };

  const handleImport = () => {
    if (!plan || importableCount === 0 || importBlockedByAttendants) return;

    setIsImporting(true);
    try {
      const result = importPerformance(plan, importOptions, { fileName: sheet?.fileName });

      toast.success("Importação concluída", {
        description: result.logMessage,
      });

      if (result.createdAttendants > 0) {
        toast.info(`${result.createdAttendants} colaborador(es) criado(s) automaticamente`);
      }

      if (plan.errors.length > 0) {
        toast.warning(`${plan.errors.length} linha(s) com erro foram ignoradas`);
      }

      setImportLog(loadImportLog());
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao importar dados");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
        else onOpenChange(true);
      }}
    >
      <DialogContent className="flex h-[min(90dvh,calc(100vh-2rem))] max-h-[min(90dvh,calc(100vh-2rem))] w-[min(48rem,calc(100vw-2rem))] max-w-[min(48rem,calc(100vw-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(48rem,calc(100vw-2rem))]">
        <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
          <DialogTitle>Importar dados</DialogTitle>
          <DialogDescription>
            Importe registros diários por colaborador a partir de planilha, CSV ou PDF com
            tabelas de desempenho.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          <div className="space-y-5">
            {!sheet && (
              <div className="lumo-panel-sm rounded-lg border-2 border-dashed border-border/80 p-8 text-center transition-colors hover:border-primary/50">
                <label className="block cursor-pointer space-y-3">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls,.pdf,text/csv,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={handleFileSelect}
                    disabled={isLoading}
                    className="hidden"
                  />
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    {isLoading ? (
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    ) : (
                      <Upload className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Clique para selecionar ou arraste um arquivo
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      CSV · Excel (.xlsx, .xls) · PDF com tabela de dados
                    </p>
                  </div>
                </label>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                <div>
                  <p className="text-sm font-medium text-red-900 dark:text-red-300">Erro</p>
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              </div>
            )}

            {sheet && (
              <>
                <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/30">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-green-900 dark:text-green-300">
                      Arquivo carregado
                    </p>
                    <p className="flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400">
                      <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {sheet.fileName} — {sheet.rows.length} linha(s)
                      </span>
                    </p>
                    {sheet.importNotes && sheet.importNotes.length > 0 && (
                      <ul className="mt-2 space-y-0.5 text-xs text-green-700 dark:text-green-400">
                        {sheet.importNotes.map((note) => (
                          <li key={note}>• {note}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {profile && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30 space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-blue-950 dark:text-blue-100">
                        {profile.formatLabel}
                      </p>
                      {profile.message && (
                        <p className="mt-1 text-sm text-blue-900 dark:text-blue-200">
                          {profile.message}
                        </p>
                      )}
                    </div>

                    {profile.preview && (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
                        <AnalysisStat label="Registros" value={String(profile.preview.totalRows)} />
                        <AnalysisStat
                          label="Colaboradores"
                          value={String(profile.preview.uniqueAttendants)}
                        />
                        <AnalysisStat
                          label="Ligação"
                          value={`${profile.preview.ligacaoTotal.toLocaleString("pt-BR")} atend.`}
                          hint={`${profile.preview.ligacaoRows} registro(s)`}
                        />
                        <AnalysisStat
                          label="WhatsApp"
                          value={`${profile.preview.whatsappTotal.toLocaleString("pt-BR")} atend.`}
                          hint={`${profile.preview.whatsappRows} registro(s)`}
                        />
                      </div>
                    )}

                    {profile.summaryReference && (
                      <div className="rounded-md border border-blue-200/80 bg-white/60 p-2.5 text-xs text-blue-900 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-100">
                        <p className="font-medium">Conferência com a planilha</p>
                        <ul className="mt-1 space-y-0.5 text-blue-800 dark:text-blue-200">
                          {profile.summaryReference.ligacao && (
                            <li>
                              • Voz — {profile.summaryReference.ligacao.metric}:{" "}
                              {profile.summaryReference.ligacao.total.toLocaleString("pt-BR")} (
                              {profile.summaryReference.ligacao.days} dias)
                            </li>
                          )}
                          {profile.summaryReference.whatsapp && (
                            <li>
                              • Chat — {profile.summaryReference.whatsapp.metric}:{" "}
                              {profile.summaryReference.whatsapp.total.toLocaleString("pt-BR")} (
                              {profile.summaryReference.whatsapp.days} dias)
                            </li>
                          )}
                        </ul>
                        <p className="mt-1.5 text-blue-700/90 dark:text-blue-300/90">
                          Esses totais são importados para os gráficos do Dashboard (ex.: 1.337
                          WhatsApp em 01/06 = coluna Recebida).
                        </p>
                      </div>
                    )}

                    {profile.preview?.dateStart && profile.preview.dateEnd && (
                      <p className="text-xs text-blue-800 dark:text-blue-300">
                        Período detectado: {profile.preview.dateStart.split("-").reverse().join("/")} —{" "}
                        {profile.preview.dateEnd.split("-").reverse().join("/")} ({profile.preview.uniqueDays}{" "}
                        dia(s))
                      </p>
                    )}

                    {profile.importedSheets && profile.importedSheets.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-blue-950 dark:text-blue-100">
                          Abas importadas
                        </p>
                        <ul className="space-y-0.5 text-xs text-blue-800 dark:text-blue-300">
                          {profile.importedSheets.map((item) => (
                            <li key={item.name}>
                              • {item.name} — {item.channel}
                              {item.role === "summary"
                                ? ` (Recebida/Atendida por dia): ${item.rowCount} dia(s), ${item.attendancesTotal.toLocaleString("pt-BR")} atend.`
                                : ` (por colaborador): ${item.rowCount} registro(s), ${item.attendancesTotal.toLocaleString("pt-BR")} atend.`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {profile.ignoredSheets && profile.ignoredSheets.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-blue-950 dark:text-blue-100">
                          Abas ignoradas
                        </p>
                        <ul className="space-y-0.5 text-xs text-blue-800/90 dark:text-blue-300/90">
                          {profile.ignoredSheets.map((item) => (
                            <li key={item.name}>
                              • {item.name} — {item.reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {profile?.profile === "rel_summary" && !sheet.sourceSheets?.length && (
                <div className="rounded-lg border border-border p-3 space-y-3">
                  <label className="flex cursor-pointer items-start gap-3">
                    <Checkbox
                      checked={consolidatedImport}
                      onCheckedChange={(checked) => setConsolidatedImport(checked === true)}
                    />
                    <span className="text-sm leading-snug">
                      <span className="font-medium text-foreground">
                        Relatório consolidado (sem colaborador por linha)
                      </span>
                      <span className="block text-muted-foreground mt-0.5">
                        Use para planilhas com totais diários como Recebida/Atendida. Mapeie{" "}
                        <strong>Data</strong> e <strong>Atendida</strong> (ou Recebida).
                      </span>
                    </span>
                  </label>

                  {consolidatedImport && (
                    <div className="grid gap-3 sm:grid-cols-2 pl-7">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          Nome do registro consolidado
                        </Label>
                        <Input
                          value={consolidatedName}
                          onChange={(e) => setConsolidatedName(e.target.value)}
                          placeholder="Ex.: Ligação REL 067"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Canal</Label>
                        <Select
                          value={consolidatedChannel}
                          onValueChange={(value) =>
                            setConsolidatedChannel(value as AttendanceChannel)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Ligação">Ligação</SelectItem>
                            <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
                )}

                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">Mapeamento de colunas</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(Object.keys(FIELD_LABELS) as ImportField[]).map((field) => {
                      if (
                        consolidatedImport &&
                        (field === "attendant" || field === "channel")
                      ) {
                        return null;
                      }

                      return (
                      <div key={field} className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          {FIELD_LABELS[field]}
                          {OPTIONAL_FIELDS.includes(field) && " (opcional)"}
                        </Label>
                        <Select
                          value={mapping[field] ?? "__none__"}
                          onValueChange={(value) =>
                            updateMapping(field, value === "__none__" ? null : value)
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione a coluna" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">— Não mapear —</SelectItem>
                            {sheet.headers.map((header) => {
                              const taken =
                                usedHeaders.has(header) && mapping[field] !== header;
                              return (
                                <SelectItem
                                  key={header}
                                  value={header}
                                  disabled={taken}
                                >
                                  {header}
                                  {taken ? " (em uso)" : ""}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      );
                    })}
                  </div>

                  {!mappingComplete && (
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      {consolidatedImport
                        ? "Mapeie Data e Quantidade (ex.: Atendida) e informe o nome consolidado."
                        : "Mapeie colaborador, data, canal e quantidade para continuar."}
                    </p>
                  )}
                </div>

                {plan && (
                  <>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <StatCard label="Novos" value={plan.stats.newRecords} />
                      <StatCard label="Atualizações" value={plan.stats.updates} />
                      <StatCard
                        label="Dias ignorados"
                        value={plan.stats.skippedExistingDays}
                      />
                      <StatCard
                        label="Erros"
                        value={plan.errors.length}
                        variant={plan.errors.length > 0 ? "error" : "default"}
                      />
                    </div>

                    {(plan.stats.newDaysInFile.length > 0 ||
                      plan.stats.existingDaysInFile.length > 0) && (
                      <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm space-y-2">
                        <p className="font-medium text-foreground">Dias na planilha</p>
                        {plan.stats.newDaysInFile.length > 0 && (
                          <p className="text-muted-foreground">
                            <span className="font-medium text-green-700 dark:text-green-400">
                              {plan.stats.newDaysInFile.length} dia(s) novo(s):
                            </span>{" "}
                            {plan.stats.newDaysInFile.join(", ")}
                          </p>
                        )}
                        {onlyNewDays && plan.stats.existingDaysInFile.length > 0 && (
                          <p className="text-muted-foreground">
                            <span className="font-medium text-amber-700 dark:text-amber-400">
                              {plan.stats.existingDaysInFile.length} dia(s) já importado(s)
                            </span>{" "}
                            — serão ignorados ({plan.stats.skippedExistingDays} linha(s))
                          </p>
                        )}
                      </div>
                    )}

                    {hasUnknownAttendants && (
                      <div
                        className={`rounded-lg border p-3 space-y-2 ${
                          importBlockedByAttendants
                            ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
                            : "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30"
                        }`}
                      >
                        <p className="text-sm font-medium text-foreground">
                          Colaboradores não cadastrados ({plan.stats.unknownAttendants.length})
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {importBlockedByAttendants
                            ? "Cadastre estes colaboradores em Atendentes ou marque a opção para criá-los automaticamente."
                            : "Serão criados automaticamente ao confirmar a importação."}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {plan.stats.unknownAttendants.map((name) => (
                            <Badge key={name} variant="outline" className="text-xs">
                              {name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2.5 rounded-lg border border-border p-3">
                      <p className="text-sm font-medium text-foreground">
                        Importação inteligente
                      </p>
                      <label className="flex cursor-pointer items-start gap-3">
                        <Checkbox
                          checked={onlyNewDays}
                          onCheckedChange={(checked) => setOnlyNewDays(checked === true)}
                        />
                        <span className="text-sm leading-snug">
                          Importar só dias novos (ignorar dias que já existem no sistema)
                        </span>
                      </label>
                      <label className="flex cursor-pointer items-start gap-3">
                        <Checkbox
                          checked={createAttendants}
                          onCheckedChange={(checked) => setCreateAttendants(checked === true)}
                        />
                        <span className="text-sm leading-snug">
                          Criar colaboradores que ainda não existem no Lumo
                        </span>
                      </label>
                      <label className="flex cursor-pointer items-start gap-3">
                        <Checkbox
                          checked={updateDuplicates}
                          onCheckedChange={(checked) => setUpdateDuplicates(checked === true)}
                          disabled={onlyNewDays}
                        />
                        <span className="text-sm leading-snug">
                          Atualizar registros já existentes (mesmo colaborador, data e canal)
                          {onlyNewDays && (
                            <span className="block text-xs text-muted-foreground mt-0.5">
                              Desative &quot;só dias novos&quot; para permitir atualizações em dias
                              anteriores.
                            </span>
                          )}
                        </span>
                      </label>
                    </div>

                    {plan.errors.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-foreground">
                          Linhas com erro (não serão importadas)
                        </p>
                        <div className="max-h-28 overflow-y-auto rounded-lg border border-border divide-y divide-border text-sm">
                          {plan.errors.slice(0, 8).map((item) => (
                            <div
                              key={`${item.rowNumber}-${item.message}`}
                              className="px-3 py-2 text-muted-foreground"
                            >
                              <span className="font-medium text-foreground">
                                Linha {item.rowNumber}:
                              </span>{" "}
                              {item.message}
                            </div>
                          ))}
                          {plan.errors.length > 8 && (
                            <div className="px-3 py-2 text-xs text-muted-foreground">
                              + {plan.errors.length - 8} erro(s) adicional(is)
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {plan.valid.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-foreground">
                          Prévia ({Math.min(plan.valid.length, 5)} de {plan.valid.length})
                        </p>
                        <div className="overflow-x-auto rounded-lg border border-border">
                          <table className="w-full text-sm">
                            <thead className="border-b border-border bg-muted/30">
                              <tr>
                                <th className="px-3 py-2 text-left font-medium">Colaborador</th>
                                <th className="px-3 py-2 text-left font-medium">Data</th>
                                <th className="px-3 py-2 text-left font-medium">Canal</th>
                                <th className="px-3 py-2 text-right font-medium">Qtd</th>
                                <th className="px-3 py-2 text-left font-medium">Ação</th>
                              </tr>
                            </thead>
                            <tbody>
                              {plan.valid.slice(0, 5).map((row) => {
                                const status = STATUS_LABELS[row.status];
                                return (
                                  <tr
                                    key={`${row.rowNumber}-${row.date}-${row.channel}`}
                                    className="border-b border-border"
                                  >
                                    <td className="px-3 py-2">{row.attendantName}</td>
                                    <td className="px-3 py-2 text-muted-foreground">{row.date}</td>
                                    <td className="px-3 py-2">{row.channel}</td>
                                    <td className="px-3 py-2 text-right">
                                      {row.attendancesCount}
                                    </td>
                                    <td className="px-3 py-2">
                                      <Badge variant={status.variant}>{status.label}</Badge>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
            {importLog.length > 0 && (
              <div className="space-y-2 rounded-lg border border-border p-3">
                <p className="text-sm font-medium text-foreground">Histórico de importações</p>
                <div className="max-h-32 space-y-2 overflow-y-auto text-xs">
                  {importLog.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="rounded-md bg-muted/30 px-2.5 py-2">
                      <p className="font-medium text-foreground">{entry.message}</p>
                      <p className="text-muted-foreground mt-0.5">
                        {new Date(entry.timestamp).toLocaleString("pt-BR")}
                        {entry.fileName ? ` · ${entry.fileName}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border bg-background px-5 py-3 sm:justify-end">
          <Button variant="outline" onClick={handleClose} disabled={isImporting}>
            Cancelar
          </Button>
          {sheet && (
            <Button
              variant="outline"
              onClick={() => {
                setSheet(null);
                setMapping(resetState().mapping);
                setError(null);
              }}
              disabled={isImporting}
            >
              Trocar arquivo
            </Button>
          )}
          {plan && (
            <Button
              onClick={handleImport}
              disabled={isImporting || importableCount === 0 || importBlockedByAttendants}
              title={
                importBlockedByAttendants
                  ? "Resolva os colaboradores não cadastrados antes de importar"
                  : undefined
              }
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                `Importar ${importableCount} registro(s)`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AnalysisStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-md border border-blue-200/70 bg-white/70 px-2 py-1.5 dark:border-blue-800 dark:bg-blue-950/40">
      <p className="text-[10px] uppercase tracking-wide text-blue-700/80 dark:text-blue-300/80">
        {label}
      </p>
      <p className="text-sm font-semibold text-blue-950 dark:text-blue-100">{value}</p>
      {hint && (
        <p className="text-[10px] text-blue-700/80 dark:text-blue-300/80">{hint}</p>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: number;
  variant?: "default" | "error";
}) {
  return (
    <div
      className={`lumo-stat p-2.5 ${
        variant === "error"
          ? "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20"
          : ""
      }`}
    >
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
