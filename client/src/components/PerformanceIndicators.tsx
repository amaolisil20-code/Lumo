import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "@/lib/motionVariants";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Filter, Phone, Trophy, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PerformanceIndicator, AlertLevel } from "@/types/goals";
import { aggregateIndicatorsByAttendant, buildChannelComparisonChartData } from "@/lib/performanceMetrics";
import {
  alertSoftBgClass,
  alertTextClass,
  chartTooltipClass,
} from "@/lib/alertColors";
import { pageContainerVariants, pageItemVariants } from "@/lib/motionVariants";
import { cn } from "@/lib/utils";

interface PerformanceIndicatorsProps {
  indicators: PerformanceIndicator[];
  periodScope?: string;
}

const getAlertColor = (level: AlertLevel) => {
  switch (level) {
    case "green":
      return "#10b981";
    case "yellow":
      return "#f59e0b";
    case "red":
      return "#ef4444";
    default:
      return "#6b7280";
  }
};

const getAlertBgColor = alertSoftBgClass;
const getAlertTextColor = alertTextClass;

const rankBadgeStyles = [
  "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
  "bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-100",
  "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300",
];

function HighlightCard({
  icon: Icon,
  label,
  name,
  value,
  accentClass,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  name: string;
  value: string;
  accentClass: string;
}) {
  return (
    <div className="lumo-panel-sm p-4">
      <div className={cn("mb-3 flex h-9 w-9 items-center justify-center rounded-lg", accentClass)}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-foreground">{name}</p>
      <p className="mt-0.5 text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

export default function PerformanceIndicators({ indicators, periodScope }: PerformanceIndicatorsProps) {
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterChannel, setFilterChannel] = useState<string>("all");

  // Get unique roles and channels
  const roles = Array.from(new Set(indicators.map((i) => i.role)));
  const channels = Array.from(new Set(indicators.map((i) => i.channel)));

  // Filter indicators
  const filteredIndicators = useMemo(() => {
    return indicators.filter((ind) => {
      const roleMatch = filterRole === "all" || ind.role === filterRole;
      const channelMatch = filterChannel === "all" || ind.channel === filterChannel;
      return roleMatch && channelMatch;
    });
  }, [indicators, filterRole, filterChannel]);

  const rankedAttendants = useMemo(
    () => aggregateIndicatorsByAttendant(filteredIndicators),
    [filteredIndicators]
  );

  const topOverall = rankedAttendants[0] ?? null;
  const topVolume = useMemo(() => {
    if (rankedAttendants.length === 0) return null;
    return [...rankedAttendants].sort((a, b) => b.totalProduced - a.totalProduced)[0];
  }, [rankedAttendants]);
  const topPerformance = useMemo(() => {
    if (rankedAttendants.length === 0) return null;
    return [...rankedAttendants].sort((a, b) => b.averagePercentage - a.averagePercentage)[0];
  }, [rankedAttendants]);

  // Prepare data for charts (agrupado por colaborador e canal)
  const chartData = useMemo(
    () => buildChannelComparisonChartData(filteredIndicators),
    [filteredIndicators]
  );

  const showLigacao = filterChannel === "all" || filterChannel === "Ligação";
  const showWhatsapp = filterChannel === "all" || filterChannel === "WhatsApp";

  // Calculate statistics
  const stats = {
    total: filteredIndicators.length,
    above: filteredIndicators.filter((i) => i.alertLevel === "green").length,
    warning: filteredIndicators.filter((i) => i.alertLevel === "yellow").length,
    below: filteredIndicators.filter((i) => i.alertLevel === "red").length,
    average: filteredIndicators.length > 0
      ? (filteredIndicators.reduce((sum, i) => sum + i.percentage, 0) / filteredIndicators.length).toFixed(1)
      : 0,
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={chartTooltipClass}
        >
          <p className="font-semibold text-foreground text-sm">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              style={{ color: entry.color }}
              className="text-sm font-medium"
            >
              {entry.name}: <span className="font-bold">{entry.value}</span>
            </p>
          ))}
        </motion.div>
      );
    }
    return null;
  };

  return (
    <motion.div
      className="space-y-6"
      variants={pageContainerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Stats Cards */}
      <motion.div
        variants={pageItemVariants}
        className="grid grid-cols-2 md:grid-cols-5 gap-3"
      >
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
          <p className="text-xs opacity-90">Total</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
          <p className="text-xs opacity-90">Acima da Meta</p>
          <p className="text-2xl font-bold">{stats.above}</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-4 text-white">
          <p className="text-xs opacity-90">Atenção</p>
          <p className="text-2xl font-bold">{stats.warning}</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-4 text-white">
          <p className="text-xs opacity-90">Abaixo da Meta</p>
          <p className="text-2xl font-bold">{stats.below}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
          <p className="text-xs opacity-90">Média</p>
          <p className="text-2xl font-bold">{stats.average}%</p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={pageItemVariants} className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Filtros:</span>
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Funções</SelectItem>
            {roles.map((role) => (
              <SelectItem key={role} value={role}>
                {role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterChannel} onValueChange={setFilterChannel}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Canais</SelectItem>
            {channels.map((channel) => (
              <SelectItem key={channel} value={channel}>
                {channel}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Charts */}
      <motion.div variants={pageItemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Meta vs Realizado</CardTitle>
            <CardDescription>
              Meta e produção separados por Ligação e WhatsApp{" "}
              {periodScope ?? "no período selecionado"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData} barGap={2} barCategoryGap="18%">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {showLigacao && (
                  <>
                    <Bar dataKey="metaLigacao" fill="#93c5fd" name="Meta Ligação" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ligacao" fill="#2563eb" name="Ligação" radius={[4, 4, 0, 0]} />
                  </>
                )}
                {showWhatsapp && (
                  <>
                    <Bar dataKey="metaWhatsapp" fill="#86efac" name="Meta WhatsApp" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="whatsapp" fill="#10b981" name="WhatsApp" radius={[4, 4, 0, 0]} />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Detailed rankings */}
      <motion.div variants={pageItemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Indicadores Detalhados</CardTitle>
            <CardDescription>
              Ranking do período — quem lidera, quem atendeu mais e quem teve melhor desempenho
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {rankedAttendants.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <HighlightCard
                    icon={Trophy}
                    label="1º no ranking"
                    name={topOverall?.attendantName ?? "—"}
                    value={
                      topOverall
                        ? `${topOverall.rankingScore.toFixed(1)} pts`
                        : "—"
                    }
                    accentClass="bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
                  />
                  <HighlightCard
                    icon={Phone}
                    label="Mais atendimentos"
                    name={topVolume?.attendantName ?? "—"}
                    value={
                      topVolume ? `${topVolume.totalProduced} atend.` : "—"
                    }
                    accentClass="bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400"
                  />
                  <HighlightCard
                    icon={TrendingUp}
                    label="Melhor desempenho"
                    name={topPerformance?.attendantName ?? "—"}
                    value={
                      topPerformance
                        ? `${topPerformance.averagePercentage.toFixed(1)}%`
                        : "—"
                    }
                    accentClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                  />
                </div>

                <div className="space-y-3">
                  <AnimatePresence>
                    {rankedAttendants.map((entry, index) => (
                      <motion.div
                        key={entry.attendantId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: index * 0.04 }}
                        className={cn(
                          "rounded-lg border-2 p-4 transition-all",
                          getAlertBgColor(entry.alertLevel),
                          "border-opacity-50"
                        )}
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="flex min-w-0 flex-1 items-start gap-3">
                            <span
                              className={cn(
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                                index < 3
                                  ? rankBadgeStyles[index]
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {entry.rank}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-foreground">
                                {entry.attendantName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {entry.role} • {entry.channels.join(", ")}
                              </p>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <p
                              className={cn(
                                "text-lg font-bold",
                                getAlertTextColor(entry.alertLevel)
                              )}
                            >
                              {entry.averagePercentage.toFixed(1)}%
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {entry.totalProduced}/{entry.totalTarget} atend.
                            </p>
                            <p className="text-[11px] font-medium text-muted-foreground">
                              {entry.rankingScore.toFixed(1)} pts
                            </p>
                          </div>
                        </div>

                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${Math.min(entry.averagePercentage, 100)}%`,
                            }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                            className="h-full rounded-full"
                            style={{
                              backgroundColor: getAlertColor(entry.alertLevel),
                            }}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8 text-center">
                <p className="text-muted-foreground">
                  Nenhum indicador encontrado com os filtros selecionados
                </p>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

