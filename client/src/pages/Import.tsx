import { useState, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Brain,
  BarChart3,
  Phone,
  MessageSquare,
  Users,
  TrendingUp,
  Clock,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ----------------------------------------------------------------
// Tipos
// ----------------------------------------------------------------
type Step = "upload" | "analyzing" | "mapping" | "dashboard";

interface SheetData {
  titleRow: string[];
  headerRow: string[];
  sampleRows: string[][];
  allRows: string[][];
  totalRows: number;
}

interface ParsedRecord {
  data: string;
  recebidas?: number;
  atendidas?: number;
  pct_atend?: number;
  taxa_perda?: number;
  tma?: number;
  nome?: string;
  pct_pausa?: number;
  atend_hora?: number;
}

interface AppData {
  voz: ParsedRecord[];
  vozProd: ParsedRecord[];
  chat: ParsedRecord[];
  chatProd: ParsedRecord[];
}

interface SheetSchemaConfig {
  tipo: string;
  titulo?: string;
  campos_detectados?: string[];
  col_data?: number | null;
  col_nome_agente?: number | null;
  col_recebidas?: number | null;
  col_atendidas?: number | null;
  col_pct_atend?: number | null;
  col_tma?: number | null;
  col_pct_pausa?: number | null;
  col_atend_hora?: number | null;
  col_taxa_perda?: number | null;
}

interface SchemaData {
  summary: string;
  sheets: Record<string, SheetSchemaConfig>;
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
function parseNum(val: string | undefined): number {
  if (!val) return 0;
  const n = parseFloat(val.replace(",", ".").replace("%", ""));
  return isNaN(n) ? 0 : n;
}

function parseTime(val: string | undefined): number {
  if (!val || val === "00:00:00" || val === "") return 0;
  const parts = val.split(":").map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0) + (parts[2] || 0) / 60;
}

function parseDate(val: string | undefined): string {
  if (!val) return "";
  const cleaned = val.trim().substring(0, 10);
  return cleaned;
}

function cellAt(row: string[], col: number | null | undefined): string | undefined {
  if (col == null || col < 0) return undefined;
  return row[col];
}

// ----------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------
export default function ImportPage() {
  const [step, setStep] = useState<Step>("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [progressLogs, setProgressLogs] = useState<string[]>([]);
  const [sheetsRaw, setSheetsRaw] = useState<Record<string, SheetData>>({});
  const [schema, setSchema] = useState<SchemaData | null>(null);
  const [appData, setAppData] = useState<AppData>({
    voz: [],
    vozProd: [],
    chat: [],
    chatProd: [],
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const detectSchema = trpc.import.detectSchema.useMutation();

  const readFile = useCallback((file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext ?? "")) {
      toast.error("Formato não suportado. Use XLSX, XLS ou CSV.");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, {
          type: "binary",
          cellDates: false,
          raw: false,
          dateNF: "dd/mm/yyyy",
        });
        const sheets: Record<string, SheetData> = {};
        wb.SheetNames.forEach((name) => {
          const ws = wb.Sheets[name];
          const json: string[][] = XLSX.utils.sheet_to_json(ws, {
            header: 1,
            defval: "",
            raw: false,
          }) as string[][];
          const cleaned = json.map((row) =>
            row.map((cell) => {
              if (typeof cell === "string" && cell.startsWith("=")) return "";
              return String(cell ?? "");
            })
          );
          sheets[name] = {
            titleRow: cleaned[0] ?? [],
            headerRow: cleaned[1] ?? [],
            sampleRows: cleaned.slice(2, 7),
            allRows: cleaned.slice(2),
            totalRows: Math.max(0, cleaned.length - 2),
          };
        });
        setSheetsRaw(sheets);
        toast.success(`Arquivo lido: ${wb.SheetNames.length} aba(s) encontrada(s)`);
      } catch {
        toast.error("Erro ao ler o arquivo. Verifique se não está corrompido.");
      }
    };
    reader.readAsBinaryString(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) readFile(file);
    },
    [readFile]
  );

  function parseWithSchema(
    sheets: Record<string, SheetData>,
    schemaData: SchemaData
  ): AppData {
    const result: AppData = { voz: [], vozProd: [], chat: [], chatProd: [] };

    for (const [sheetName, cfg] of Object.entries(schemaData.sheets ?? {})) {
      const sheet = sheets[sheetName];
      if (!sheet) continue;

      sheet.allRows.forEach((row) => {
        if (!row || row.every((c) => !c)) return;
        const dateVal = parseDate(cellAt(row, cfg.col_data ?? 0));
        if (!dateVal) return;

        if (cfg.tipo === "voz_diario") {
          result.voz.push({
            data: dateVal,
            recebidas: parseNum(cellAt(row, cfg.col_recebidas)),
            atendidas: parseNum(cellAt(row, cfg.col_atendidas)),
            pct_atend: parseNum(cellAt(row, cfg.col_pct_atend)),
            taxa_perda: parseNum(cellAt(row, cfg.col_taxa_perda)),
          });
        } else if (cfg.tipo === "voz_produtividade") {
          const nome = cellAt(row, cfg.col_nome_agente ?? 1);
          if (!nome) return;
          result.vozProd.push({
            data: dateVal,
            nome,
            recebidas: parseNum(cellAt(row, cfg.col_recebidas)),
            atendidas: parseNum(cellAt(row, cfg.col_atendidas)),
            pct_atend: parseNum(cellAt(row, cfg.col_pct_atend)),
            tma: parseTime(cellAt(row, cfg.col_tma)),
            pct_pausa: parseNum(cellAt(row, cfg.col_pct_pausa)),
          });
        } else if (cfg.tipo === "chat_diario") {
          result.chat.push({
            data: dateVal,
            recebidas: parseNum(cellAt(row, cfg.col_recebidas)),
            tma: parseTime(cellAt(row, cfg.col_tma)),
          });
        } else if (cfg.tipo === "chat_produtividade") {
          const nome = cellAt(row, cfg.col_nome_agente ?? 1);
          if (!nome) return;
          result.chatProd.push({
            data: dateVal,
            nome,
            recebidas: parseNum(cellAt(row, cfg.col_recebidas ?? 2)),
            pct_pausa: parseNum(cellAt(row, cfg.col_pct_pausa)),
            atend_hora: parseNum(cellAt(row, cfg.col_atend_hora)),
          });
        }
      });
    }
    return result;
  }

  async function startAnalysis() {
    if (Object.keys(sheetsRaw).length === 0) {
      toast.error("Carregue um arquivo primeiro.");
      return;
    }
    setStep("analyzing");
    setProgressLogs([]);

    const addLog = (msg: string) =>
      setProgressLogs((l) => [...l, msg]);

    setProgress(10);
    setProgressMsg("Preparando dados...");
    addLog("✓ Arquivo lido com sucesso");
    await delay(300);

    setProgress(35);
    setProgressMsg("Enviando para análise de IA...");
    await delay(400);

    const preview = Object.fromEntries(
      Object.entries(sheetsRaw).map(([name, data]) => [
        name,
        {
          titleRow: data.titleRow,
          headerRow: data.headerRow,
          sampleRows: data.sampleRows,
          totalRows: data.totalRows,
        },
      ])
    );

    try {
      const result = await detectSchema.mutateAsync({ fileName, sheetsPreview: preview });
      addLog("✓ Estrutura detectada");

      setProgress(70);
      setProgressMsg("Mapeando colunas...");
      await delay(300);

      setSchema(result.data);
      const parsed = parseWithSchema(sheetsRaw, result.data);
      setAppData(parsed);

      addLog(`✓ ${parsed.voz.length} registros de voz diário`);
      addLog(`✓ ${parsed.chat.length} registros de chat diário`);
      addLog(`✓ ${new Set(parsed.vozProd.map((r) => r.nome)).size} agentes em voz`);
      addLog(`✓ ${new Set(parsed.chatProd.map((r) => r.nome)).size} agentes em chat`);

      setProgress(100);
      setProgressMsg("Concluído!");
      await delay(400);
      setStep("mapping");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro na análise. Tente novamente.";
      toast.error(message.includes("Failed to fetch") ? "Servidor indisponível. Inicie o backend e tente de novo." : message);
      setStep("upload");
    }
  }

  function resetAll() {
    setStep("upload");
    setFileName("");
    setProgress(0);
    setProgressMsg("");
    setProgressLogs([]);
    setSheetsRaw({});
    setSchema(null);
    setAppData({ voz: [], vozProd: [], chat: [], chatProd: [] });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Importar Relatório</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Carregue qualquer planilha — a IA detecta e mapeia automaticamente
          </p>
        </div>
        <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
          <Brain className="w-3.5 h-3.5" />
          IA Ativa
        </Badge>
      </div>

      <StepBar current={step} />

      {step === "upload" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                Selecionar Arquivo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
                  ${isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) readFile(f);
                  }}
                />
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <FileSpreadsheet className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Arraste o arquivo ou clique para selecionar</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Qualquer formato de relatório de call center ou chat
                    </p>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline">XLSX</Badge>
                    <Badge variant="outline">XLS</Badge>
                    <Badge variant="outline">CSV</Badge>
                  </div>
                </div>
              </div>

              {fileName && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <FileSpreadsheet className="w-5 h-5 text-primary shrink-0" />
                  <span className="font-medium text-sm flex-1">{fileName}</span>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
              )}

              {Object.keys(sheetsRaw).length > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  {Object.keys(sheetsRaw).length} aba(s) detectada(s):{" "}
                  {Object.keys(sheetsRaw).join(", ")}
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={startAnalysis}
                  disabled={Object.keys(sheetsRaw).length === 0 || detectSchema.isPending}
                  className="gap-2"
                >
                  <Brain className="w-4 h-4" />
                  Analisar com IA
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-6 text-center">
                {[
                  { icon: "📤", title: "1. Carregue", desc: "Qualquer planilha do seu sistema de telefonia ou chat" },
                  { icon: "🤖", title: "2. IA Analisa", desc: "Detecta colunas, datas, agentes e métricas automaticamente" },
                  { icon: "📊", title: "3. Visualize", desc: "KPIs, rankings e gráficos prontos em segundos" },
                ].map((item) => (
                  <div key={item.title} className="space-y-2">
                    <div className="text-3xl">{item.icon}</div>
                    <p className="font-semibold text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "analyzing" && (
        <Card>
          <CardContent className="pt-12 pb-12 flex flex-col items-center gap-6">
            <div className="text-5xl">🤖</div>
            <div className="text-center">
              <h3 className="text-lg font-bold">Analisando seu arquivo...</h3>
              <p className="text-muted-foreground text-sm mt-1">{progressMsg}</p>
            </div>
            <Progress value={progress} className="w-80" />
            <div className="space-y-2 w-80">
              {progressLogs.map((log, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  {log}
                </div>
              ))}
              {progress < 100 && (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  {progressMsg}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {step === "mapping" && schema && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                Mapeamento detectado pela IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-sm">
                <span className="font-semibold text-blue-700 dark:text-blue-300">Resumo: </span>
                <span className="text-blue-600 dark:text-blue-400">{schema.summary}</span>
              </div>

              {Object.keys(schema.sheets).length > 0 && (
              <Tabs defaultValue={Object.keys(schema.sheets)[0]}>
                <TabsList className="flex-wrap h-auto gap-1">
                  {Object.keys(schema.sheets).map((name) => (
                    <TabsTrigger key={name} value={name} className="text-xs">
                      {name}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {Object.entries(schema.sheets).map(([name, cfg]) => (
                  <TabsContent key={name} value={name} className="space-y-3 mt-4">
                    <div className="flex items-center gap-3">
                      <Badge variant={cfg.tipo === "outro" ? "secondary" : "default"}>
                        {tipoLabel(cfg.tipo)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {sheetsRaw[name]?.totalRows ?? 0} registros
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {cfg.campos_detectados?.map((campo) => (
                        <Badge key={campo} variant="outline" className="text-xs gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5 text-green-500" />
                          {campo}
                        </Badge>
                      ))}
                    </div>
                    {sheetsRaw[name] && (
                      <div className="overflow-x-auto rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {sheetsRaw[name].headerRow.slice(0, 8).map((h, i) => (
                                <TableHead key={i} className="text-xs whitespace-nowrap">{h || "—"}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sheetsRaw[name].sampleRows.slice(0, 4).map((row, ri) => (
                              <TableRow key={ri}>
                                {row.slice(0, 8).map((cell, ci) => (
                                  <TableCell key={ci} className="text-xs whitespace-nowrap">{cell || "—"}</TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
              )}

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={resetAll} className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Novo arquivo
                </Button>
                <Button onClick={() => setStep("dashboard")} className="gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Ver Dashboard
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "dashboard" && (
        <div className="space-y-4">
          <Tabs defaultValue="voz">
            <TabsList>
              <TabsTrigger value="voz" className="gap-2">
                <Phone className="w-4 h-4" /> Ligações
              </TabsTrigger>
              <TabsTrigger value="chat" className="gap-2">
                <MessageSquare className="w-4 h-4" /> Chat
              </TabsTrigger>
              <TabsTrigger value="prod" className="gap-2">
                <Users className="w-4 h-4" /> Produtividade
              </TabsTrigger>
            </TabsList>

            <TabsContent value="voz" className="space-y-4 mt-4">
              <VozDashboard data={appData.voz} />
            </TabsContent>

            <TabsContent value="chat" className="space-y-4 mt-4">
              <ChatDashboard data={appData.chat} />
            </TabsContent>

            <TabsContent value="prod" className="space-y-4 mt-4">
              <ProdDashboard vozProd={appData.vozProd} chatProd={appData.chatProd} />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end">
            <Button variant="outline" onClick={resetAll} className="gap-2">
              <Upload className="w-4 h-4" />
              Importar outro arquivo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function StepBar({ current }: { current: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: "upload", label: "Upload" },
    { id: "analyzing", label: "Análise IA" },
    { id: "mapping", label: "Mapeamento" },
    { id: "dashboard", label: "Dashboard" },
  ];
  const idx = steps.findIndex((s) => s.id === current);

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 text-sm font-medium transition-colors
            ${i < idx ? "text-green-600" : i === idx ? "text-primary" : "text-muted-foreground"}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors
              ${i < idx ? "bg-green-100 text-green-600" : i === idx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {i < idx ? "✓" : i + 1}
            </div>
            {step.label}
          </div>
          {i < steps.length - 1 && (
            <div className={`h-px w-8 transition-colors ${i < idx ? "bg-green-300" : "bg-border"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function KpiCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
          {icon}
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  );
}

function VozDashboard({ data }: { data: ParsedRecord[] }) {
  if (!data.length) return <EmptyState label="Nenhum dado de voz encontrado" />;

  const total = data.reduce((a, r) => a + (r.recebidas ?? 0), 0);
  const totalAte = data.reduce((a, r) => a + (r.atendidas ?? 0), 0);
  const pct = total ? ((totalAte / total) * 100).toFixed(1) : "0";
  const mediaDia = (total / data.length).toFixed(0);

  const chartData = data.map((r) => ({
    data: r.data.slice(5),
    Recebidas: r.recebidas,
    Atendidas: r.atendidas,
  }));

  const pieData = [
    { name: "Atendidas", value: totalAte },
    { name: "Não atendidas", value: total - totalAte },
  ];

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard icon={<Phone className="w-4 h-4 text-blue-600" />} label="Total Recebidas" value={total.toLocaleString("pt-BR")} sub="no período" color="bg-blue-50 dark:bg-blue-950" />
        <KpiCard icon={<CheckCircle2 className="w-4 h-4 text-green-600" />} label="Total Atendidas" value={totalAte.toLocaleString("pt-BR")} sub="no período" color="bg-green-50 dark:bg-green-950" />
        <KpiCard icon={<TrendingUp className="w-4 h-4 text-yellow-600" />} label="% Atendimento" value={pct + "%"} sub="taxa média" color="bg-yellow-50 dark:bg-yellow-950" />
        <KpiCard icon={<BarChart3 className="w-4 h-4 text-purple-600" />} label="Média / Dia" value={mediaDia} sub="ligações/dia" color="bg-purple-50 dark:bg-purple-950" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Ligações por Dia</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="data" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Recebidas" stroke="#2563EB" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Atendidas" stroke="#10B981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Distribuição</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((_, i) => <Cell key={i} fill={i === 0 ? "#10B981" : "#EF4444"} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Detalhes por Data</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Recebidas</TableHead>
                  <TableHead className="text-right">Atendidas</TableHead>
                  <TableHead className="text-right">% Atend.</TableHead>
                  <TableHead className="text-right">Taxa Perda</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((r, i) => {
                  const p = r.pct_atend ? (r.pct_atend > 1 ? r.pct_atend : r.pct_atend * 100) : r.recebidas ? ((r.atendidas ?? 0) / r.recebidas * 100) : 0;
                  return (
                    <TableRow key={i}>
                      <TableCell>{r.data}</TableCell>
                      <TableCell className="text-right">{r.recebidas}</TableCell>
                      <TableCell className="text-right">{r.atendidas}</TableCell>
                      <TableCell className={`text-right font-semibold ${p > 80 ? "text-green-600" : p > 60 ? "text-yellow-600" : "text-red-600"}`}>
                        {p.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {r.taxa_perda ? (r.taxa_perda > 1 ? r.taxa_perda : r.taxa_perda * 100).toFixed(2) + "%" : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function ChatDashboard({ data }: { data: ParsedRecord[] }) {
  if (!data.length) return <EmptyState label="Nenhum dado de chat encontrado" />;

  const total = data.reduce((a, r) => a + (r.recebidas ?? 0), 0);
  const tmaArr = data.filter((r) => r.tma && r.tma > 0).map((r) => r.tma!);
  const tmaMedia = tmaArr.length ? (tmaArr.reduce((a, b) => a + b, 0) / tmaArr.length).toFixed(1) : "0";

  const chartData = data.map((r) => ({
    data: r.data.slice(5),
    Chats: r.recebidas,
    TMA: r.tma?.toFixed(1),
  }));

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <KpiCard icon={<MessageSquare className="w-4 h-4 text-blue-600" />} label="Total Chats" value={total.toLocaleString("pt-BR")} sub="no período" color="bg-blue-50 dark:bg-blue-950" />
        <KpiCard icon={<Clock className="w-4 h-4 text-green-600" />} label="TMA Médio" value={tmaMedia + " min"} sub="tempo médio" color="bg-green-50 dark:bg-green-950" />
        <KpiCard icon={<BarChart3 className="w-4 h-4 text-purple-600" />} label="Média / Dia" value={(total / data.length).toFixed(0)} sub="chats/dia" color="bg-purple-50 dark:bg-purple-950" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Volume por Dia</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="data" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="Chats" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">TMA por Dia (min)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="data" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="TMA" stroke="#F59E0B" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function ProdDashboard({ vozProd, chatProd }: { vozProd: ParsedRecord[]; chatProd: ParsedRecord[] }) {
  const vozAgents: Record<string, number> = {};
  vozProd.forEach((r) => {
    if (r.nome && r.atendidas) {
      vozAgents[r.nome] = (vozAgents[r.nome] ?? 0) + r.atendidas;
    }
  });
  const vozRank = Object.entries(vozAgents)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  const chatAgents: Record<string, number[]> = {};
  chatProd.forEach((r) => {
    if (r.nome && r.atend_hora && r.atend_hora > 0) {
      if (!chatAgents[r.nome]) chatAgents[r.nome] = [];
      chatAgents[r.nome].push(r.atend_hora);
    }
  });
  const chatRank = Object.entries(chatAgents)
    .map(([nome, vals]) => [nome, vals.reduce((a, b) => a + b, 0) / vals.length] as [string, number])
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  const vozChartData = vozRank.map(([nome, v]) => ({
    nome: nome.split(" ")[0],
    Atendidas: v,
  }));
  const chatChartData = chatRank.map(([nome, v]) => ({
    nome: nome.split(" ")[0],
    "Atend/h": +v.toFixed(1),
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Phone className="w-4 h-4" />Ranking — Atendidas (Voz)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {vozRank.map(([nome, val], i) => (
            <RankRow key={nome} rank={i + 1} nome={nome} value={val} max={vozRank[0]?.[1] ?? 1} suffix="" />
          ))}
          {!vozRank.length && <p className="text-sm text-muted-foreground">Sem dados</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="w-4 h-4" />Ranking — Atend./hora (Chat)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {chatRank.map(([nome, val], i) => (
            <RankRow key={nome} rank={i + 1} nome={nome} value={val} max={chatRank[0]?.[1] ?? 1} suffix="/h" />
          ))}
          {!chatRank.length && <p className="text-sm text-muted-foreground">Sem dados</p>}
        </CardContent>
      </Card>

      {vozChartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Atendidas por Agente (Voz)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={vozChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="nome" type="category" tick={{ fontSize: 11 }} width={70} />
                <Tooltip />
                <Bar dataKey="Atendidas" fill="#2563EB" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {chatChartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Atend./hora por Agente (Chat)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chatChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="nome" type="category" tick={{ fontSize: 11 }} width={70} />
                <Tooltip />
                <Bar dataKey="Atend/h" fill="#10B981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RankRow({ rank, nome, value, max, suffix }: { rank: number; nome: string; value: number; max: number; suffix: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : String(rank);
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm w-6 text-center">{medal}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{nome}</p>
        <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <span className="text-sm font-bold tabular-nums">
        {typeof value === "number" && value % 1 !== 0 ? value.toFixed(1) : Math.round(value)}{suffix}
      </span>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <Card>
      <CardContent className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
        <AlertCircle className="w-8 h-8" />
        <p className="text-sm">{label}</p>
      </CardContent>
    </Card>
  );
}

function tipoLabel(tipo: string) {
  const map: Record<string, string> = {
    voz_diario: "📞 Voz — Diário",
    voz_produtividade: "📞 Voz — Produtividade",
    chat_diario: "💬 Chat — Diário",
    chat_produtividade: "💬 Chat — Produtividade",
    outro: "❓ Não identificado",
  };
  return map[tipo] ?? tipo;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
