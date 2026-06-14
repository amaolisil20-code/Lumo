import React, { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  TrendingUp,
  Target,
  AlertCircle,
  Upload,
  Download,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { motion } from "framer-motion";
import { pageContainerVariants, pageItemVariants } from "@/lib/motionVariants";
import { Button } from "@/components/ui/button";
import ImportModal from "@/components/ImportModal";
import ExportModal from "@/components/ExportModal";
import ManagementReportButton from "@/components/ManagementReportButton";
import BelowGoalCard from "@/components/BelowGoalCard";
import GoalRankingCard from "@/components/GoalRankingCard";
import PerformanceIndicators from "@/components/PerformanceIndicators";
import PeriodFilterBar from "@/components/PeriodFilterBar";
import PerformanceRankings from "@/components/PerformanceRankings";
import { usePeriodFilter } from "@/contexts/PeriodFilterContext";
import {
  buildAttendantSummaries,
  buildDashboardStats,
  buildGoalRankings,
  buildOperationHighlights,
  buildProductivityTrend,
  recordsToIndicators,
} from "@/lib/performanceMetrics";
import { useLumoData } from "@/contexts/LumoDataContext";
import { formatAverageTime } from "@/lib/performanceStorage";
import {
  periodAttendancesLabel,
  periodMetaLabel,
  periodIndicatorsHeading,
  periodScopeLabel,
  periodScopePhrase,
} from "@/lib/dateRangeFilter";
import {
  buildAbsenceDistribution,
  buildAbsenceRanking,
  totalAbsenceDaysInRange,
} from "@/lib/absenceMetrics";
import { chartTooltipContentStyle } from "@/lib/alertColors";

const highlightToneStyles = {
  green: { icon: ArrowUp, className: "text-green-600 dark:text-green-400" },
  red: { icon: ArrowDown, className: "text-red-600 dark:text-red-400" },
  orange: { icon: AlertCircle, className: "text-orange-600 dark:text-orange-400" },
} as const;

function EmptySection({ message }: { message: string }) {
  return (
    <p className="text-sm text-muted-foreground text-center py-6 px-2">{message}</p>
  );
}

// Custom Tooltip para gráficos
const CustomLineTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-popover p-4 rounded-lg border border-border shadow-lg"
      >
        <p className="font-semibold text-foreground text-sm">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p
            key={index}
            style={{ color: entry.color }}
            className="text-sm font-medium"
          >
            {entry.name}: <span className="font-bold">{entry.value}%</span>
          </p>
        ))}
      </motion.div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const { period, dateRange } = usePeriodFilter();

  const { attendants, performanceRecords, absences, productionGoals } = useLumoData();

  const dashboardStats = useMemo(
    () => buildDashboardStats(attendants, performanceRecords, productionGoals, dateRange),
    [attendants, performanceRecords, productionGoals, dateRange]
  );

  const periodIndicators = useMemo(
    () => recordsToIndicators(performanceRecords, attendants, productionGoals, dateRange),
    [performanceRecords, attendants, productionGoals, dateRange]
  );

  const goalRankings = useMemo(
    () => buildGoalRankings(periodIndicators),
    [periodIndicators]
  );

  const attendantSummaries = useMemo(
    () => buildAttendantSummaries(performanceRecords, attendants, productionGoals, dateRange),
    [performanceRecords, attendants, productionGoals, dateRange]
  );

  const ligacaoSummaries = useMemo(
    () =>
      buildAttendantSummaries(
        performanceRecords,
        attendants,
        productionGoals,
        dateRange,
        "Ligação"
      ),
    [performanceRecords, attendants, productionGoals, dateRange]
  );

  const whatsappSummaries = useMemo(
    () =>
      buildAttendantSummaries(
        performanceRecords,
        attendants,
        productionGoals,
        dateRange,
        "WhatsApp"
      ),
    [performanceRecords, attendants, productionGoals, dateRange]
  );

  const productivityTrend = useMemo(
    () => buildProductivityTrend(performanceRecords, attendants, productionGoals, dateRange),
    [performanceRecords, attendants, productionGoals, dateRange]
  );

  const operationHighlights = useMemo(
    () => buildOperationHighlights(attendantSummaries, periodIndicators),
    [attendantSummaries, periodIndicators]
  );

  const absenceRanking = useMemo(
    () => buildAbsenceRanking(absences, dateRange),
    [absences, dateRange]
  );

  const absenceDistribution = useMemo(
    () => buildAbsenceDistribution(absences, dateRange),
    [absences, dateRange]
  );

  const totalAbsenceDays = useMemo(
    () => totalAbsenceDaysInRange(absences, dateRange),
    [absences, dateRange]
  );

  const mainCards = [
    {
      title: "Total de Colaboradores",
      value: String(dashboardStats.totalAttendants),
      comparison: `${attendants.length} cadastrados`,
      trend: "up" as const,
      icon: Users,
      color: "bg-gradient-to-br from-blue-600 to-blue-700",
      iconColor: "text-white",
    },
    {
      title: periodAttendancesLabel(period),
      value: String(dashboardStats.totalAttendances),
      comparison: `${dashboardStats.attendantsWithRecords} colaboradores`,
      trend: "up" as const,
      icon: TrendingUp,
      color: "bg-gradient-to-br from-emerald-500 to-emerald-600",
      iconColor: "text-white",
    },
    {
      title: periodMetaLabel(period),
      value:
        dashboardStats.averagePercentage > 0
          ? `${dashboardStats.averagePercentage.toFixed(0)}%`
          : "—",
      comparison: "média da equipe",
      trend: dashboardStats.averagePercentage >= 85 ? ("up" as const) : ("down" as const),
      icon: Target,
      color: "bg-gradient-to-br from-violet-600 to-violet-700",
      iconColor: "text-white",
    },
    {
      title: "Dias de Ausência",
      value: totalAbsenceDays > 0 ? String(totalAbsenceDays) : "—",
      comparison: `${absenceRanking.length} colaborador(es)`,
      trend: "down" as const,
      icon: AlertCircle,
      color: "bg-gradient-to-br from-orange-500 to-orange-600",
      iconColor: "text-white",
    },
  ];

  const performanceTable = attendantSummaries
    .filter((s) => s.totalAttendances > 0)
    .sort((a, b) => b.performanceScore - a.performanceScore)
    .map((summary, index) => ({
      name: summary.name,
      productivity: Math.round(summary.averagePercentage),
      meta: 100,
      percentage: Math.round(summary.averagePercentage),
      ranking: index + 1,
      attendances: summary.totalAttendances,
      avgTime: formatAverageTime(summary.averageTimeMinutes),
      score: summary.performanceScore,
    }));

  return (
    <motion.div
      className="space-y-5 pb-6"
      initial="hidden"
      animate="visible"
      variants={pageContainerVariants}
    >
      {/* Header */}
      <motion.div
        variants={pageItemVariants}
        className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-start"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Visão gerencial e métricas-chave do seu time
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row shrink-0">
          <ManagementReportButton className="gap-2" />
          <Button
            variant="outline"
            onClick={() => setShowExportModal(true)}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Exportar Dados
          </Button>
          <Button
            onClick={() => setShowImportModal(true)}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Upload className="h-4 w-4" />
            Importar Planilha
          </Button>
        </div>
      </motion.div>

      {/* Period Filter */}
      <motion.div variants={pageItemVariants}>
        <PeriodFilterBar />
      </motion.div>

      {/* Main Cards Grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        variants={pageContainerVariants}
      >
        {mainCards.map((card, index) => {
          const IconComponent = card.icon;
          const isPositive = card.trend === "up";

          return (
            <motion.div
              key={index}
              variants={pageItemVariants}
              className={`${card.color} rounded-xl p-4 border-0 shadow-lg hover:shadow-2xl transition-all hover:scale-105`}
            >
              <div className="flex justify-between items-start mb-4">
                <IconComponent className={`${card.iconColor} h-8 w-8`} />
                <div
                  className={`flex items-center gap-1 text-xs font-semibold ${
                    isPositive ? "text-white/90" : "text-white/80"
                  }`}
                >
                  {isPositive ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  )}
                  {card.comparison}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-white/80 font-medium">
                  {card.title}
                </p>
                <p className="text-2xl font-bold text-white">
                  {card.value}
                </p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Rankings Section */}
      <motion.div variants={pageItemVariants}>
        <PerformanceRankings
          ligacaoSummaries={ligacaoSummaries}
          whatsappSummaries={whatsappSummaries}
          overallSummaries={attendantSummaries}
          period={period}
        />
      </motion.div>

      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        variants={pageContainerVariants}
      >
        {/* Absence Ranking */}
        <motion.div
          variants={pageItemVariants}
          className="lumo-panel p-4"
        >
          <h2 className="text-lg font-bold text-foreground mb-6">
            ⚠️ Ranking de Ausências
          </h2>

          <div className="space-y-4">
            {absenceRanking.length > 0 ? (
              absenceRanking.slice(0, 5).map((entry, index) => (
                <motion.div
                  key={entry.attendantId}
                  whileHover={{ x: 4 }}
                  className="flex items-start gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="text-xl font-bold text-red-600 dark:text-red-400 w-8">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {entry.name}
                    </p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <span className="text-xs bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 px-2 py-1 rounded">
                        {entry.typeLabel}: {entry.totalDays} dia(s)
                      </span>
                      <span className="text-xs text-muted-foreground">
                        até {new Date(`${entry.lastDate}T12:00:00`).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <EmptySection message="Nenhuma ausência registrada no período selecionado." />
            )}
          </div>
        </motion.div>

        {/* Highlights */}
        <motion.div
          variants={pageItemVariants}
          className="lumo-panel p-4"
        >
          <h2 className="text-lg font-bold text-foreground mb-6">
            ✨ Destaques da Operação
          </h2>

          <div className="space-y-4">
            {operationHighlights.length > 0 ? (
              operationHighlights.map((highlight, index) => {
                const tone = highlightToneStyles[highlight.tone];
                const IconComponent = tone.icon;
                return (
                  <motion.div
                    key={index}
                    whileHover={{ x: 4 }}
                    className="flex items-start gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <IconComponent className={`${tone.className} h-6 w-6 mt-1`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground font-medium">
                        {highlight.title}
                      </p>
                      <p className="font-semibold text-foreground truncate">
                        {highlight.value}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {highlight.detail}
                      </p>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <EmptySection message="Nenhum destaque no período selecionado." />
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Charts Section */}
      <motion.div variants={pageContainerVariants}>
        <motion.div
          variants={pageItemVariants}
          className="lumo-panel p-4"
        >
          <div className="mb-6">
            <h2 className="text-lg font-bold text-foreground">
              Evolução da Produtividade
            </h2>
            <p className="text-sm text-muted-foreground">
              Média diária de atingimento de meta no período
            </p>
          </div>

          {productivityTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={productivityTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" className="text-muted-foreground" />
                <YAxis className="text-muted-foreground" />
                <Tooltip content={<CustomLineTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="productivity"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{ fill: "#2563eb", r: 5 }}
                  activeDot={{ r: 7 }}
                  name="Produtividade"
                />
                <Line
                  type="monotone"
                  dataKey="target"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Meta (100%)"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptySection message="Registre atendimentos em Desempenho para visualizar a evolução." />
          )}
        </motion.div>
      </motion.div>

      {/* Absence Distribution */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        variants={pageContainerVariants}
      >
        <motion.div
          variants={pageItemVariants}
          className="lumo-panel p-4"
        >
          <div className="mb-6">
            <h2 className="text-lg font-bold text-foreground">
              Distribuição de Ausências
            </h2>
            <p className="text-sm text-muted-foreground">
              Tipos de ausência no período
            </p>
          </div>

          {absenceDistribution.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={absenceDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {absenceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `${value} dia(s)`}
                    contentStyle={chartTooltipContentStyle}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="mt-4 space-y-2">
                {absenceDistribution.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-muted-foreground">
                      {item.name}: {item.value} dia(s)
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptySection message="Nenhuma ausência no período. Registre em Ausências para visualizar aqui." />
          )}
        </motion.div>
      </motion.div>

      {/* Performance Table */}
      <motion.div
        variants={pageItemVariants}
        className="lumo-panel p-4"
      >
        <h2 className="text-lg font-bold text-foreground mb-1">
          Tabela de Performance
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          {periodScopeLabel(period)} · ordenado por pontuação (volume + agilidade + meta)
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-semibold text-foreground">
                  Posição
                </th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">
                  Nome
                </th>
                <th className="text-center py-3 px-4 font-semibold text-foreground">
                  Pontuação
                </th>
                <th className="text-center py-3 px-4 font-semibold text-foreground">
                  Atendimentos
                </th>
                <th className="text-center py-3 px-4 font-semibold text-foreground">
                  Tempo Médio
                </th>
                <th className="text-center py-3 px-4 font-semibold text-foreground">
                  % Atingido
                </th>
              </tr>
            </thead>
            <tbody>
              {performanceTable.length > 0 ? (
                performanceTable.map((row, index) => (
                <motion.tr
                  key={row.name}
                  className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                >
                  <td className="py-4 px-4">
                    <span className="font-bold text-primary">
                      #{row.ranking}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-medium text-foreground">
                    {row.name}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="font-bold text-primary">{row.score.toFixed(1)} pts</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="bg-primary/15 text-primary dark:bg-primary/20 px-3 py-1 rounded-full text-xs font-semibold">
                      {row.attendances} atend.
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center font-medium">
                    {row.avgTime}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span
                      className={`font-bold ${
                        row.percentage >= 90
                          ? "text-green-600 dark:text-green-400"
                          : row.percentage >= 80
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {row.percentage}%
                    </span>
                  </td>
                </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    Nenhum atendimento no período selecionado. Ajuste o filtro ou registre em Desempenho.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Performance Indicators Section */}
      <motion.div
        className="space-y-6"
        variants={pageContainerVariants}
      >
        <motion.div variants={pageItemVariants}>
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {periodIndicatorsHeading(period)}
          </h2>
          <PerformanceIndicators
            indicators={periodIndicators}
            periodScope={periodScopePhrase(period)}
          />
        </motion.div>
      </motion.div>

      {/* Goals Section */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        variants={pageContainerVariants}
      >
        <motion.div variants={pageItemVariants}>
          <BelowGoalCard indicators={periodIndicators} period={period} />
        </motion.div>
        <motion.div variants={pageItemVariants}>
          <GoalRankingCard rankings={goalRankings} period={period} />
        </motion.div>
      </motion.div>

      {/* Import Modal */}
      <ImportModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
      />
      <ExportModal open={showExportModal} onOpenChange={setShowExportModal} />
    </motion.div>
  );
}
