import type { Attendant } from "@/types/attendant";
import type {
  AlertLevel,
  AttendanceChannel,
  GoalRanking,
  JobRole,
  PerformanceAlert,
  PerformanceIndicator,
  ProductionGoal,
} from "@/types/goals";
import type { DailyPerformanceRecord } from "@/types/performance";
import type { DateRange } from "@/lib/dateRangeFilter";
import { getLocalDateString } from "@/lib/performanceStorage";

function getAlertLevel(percentage: number): AlertLevel {
  if (percentage >= 100) return "green";
  if (percentage >= 85) return "yellow";
  return "red";
}

export function filterRecordsByRange(
  records: DailyPerformanceRecord[],
  range: DateRange
): DailyPerformanceRecord[] {
  return records.filter((record) => record.date >= range.start && record.date <= range.end);
}

export function getDaysWithRecordsInRange(
  records: DailyPerformanceRecord[],
  range: DateRange
): string[] {
  return Array.from(
    new Set(
      filterRecordsByRange(records, range).map((record) => record.date)
    )
  ).sort((a, b) => b.localeCompare(a));
}

export function getDailyTarget(
  channel: AttendanceChannel,
  productionGoals: ProductionGoal[]
): number {
  const goal = productionGoals.find((g) => g.channel === channel && g.status === "Ativo");
  return goal?.dailyTarget ?? 0;
}

export function recordsToIndicators(
  records: DailyPerformanceRecord[],
  attendants: Attendant[],
  productionGoals: ProductionGoal[],
  range?: DateRange
): PerformanceIndicator[] {
  const periodRecords = range ? filterRecordsByRange(records, range) : records;

  return periodRecords.map((record) => {
    const attendant = attendants.find((a) => a.id === record.attendantId);
    const dailyTarget = getDailyTarget(record.channel, productionGoals);
    const produced = record.attendancesCount;
    const difference = produced - dailyTarget;
    const percentage = dailyTarget > 0 ? (produced / dailyTarget) * 100 : 0;

    return {
      id: record.id,
      attendantId: record.attendantId,
      attendantName: attendant?.name ?? record.attendantName,
      role: (attendant?.role ?? "Atendente") as JobRole,
      date: record.date,
      channel: record.channel,
      dailyTarget,
      produced,
      difference,
      percentage,
      alertLevel: getAlertLevel(percentage),
    };
  });
}

export function buildGoalRankings(indicators: PerformanceIndicator[]): GoalRanking[] {
  const byAttendant = new Map<number, PerformanceIndicator[]>();

  for (const indicator of indicators) {
    const group = byAttendant.get(indicator.attendantId) ?? [];
    group.push(indicator);
    byAttendant.set(indicator.attendantId, group);
  }

  const aggregated = Array.from(byAttendant.values()).map((group) => {
    const first = group[0];
    const avgPercentage =
      group.reduce((sum, item) => sum + item.percentage, 0) / group.length;
    const totalProduced = group.reduce((sum, item) => sum + item.produced, 0);
    const totalTarget = group.reduce((sum, item) => sum + item.dailyTarget, 0);

    return {
      ...first,
      produced: totalProduced,
      dailyTarget: totalTarget,
      percentage: avgPercentage,
      alertLevel: getAlertLevel(avgPercentage),
    };
  });

  const sorted = aggregated.sort((a, b) => b.percentage - a.percentage);

  return sorted.map((indicator, index) => ({
    position: index + 1,
    attendantId: indicator.attendantId,
    attendantName: indicator.attendantName,
    role: indicator.role,
    supervisor: "—",
    dailyTarget: indicator.dailyTarget,
    produced: indicator.produced,
    percentage: indicator.percentage,
    alertLevel: indicator.alertLevel,
    type: indicator.percentage >= 100 ? "exceeded" : "below",
  }));
}

export interface AttendantPerformanceSummary {
  attendantId: number;
  name: string;
  role: string;
  totalAttendances: number;
  averageTimeMinutes: number;
  averagePercentage: number;
  /** Atendimentos por minuto de TMA — volume + agilidade */
  performanceScore: number;
  ranking: number;
}

/**
 * Quanto maior, melhor: combina volume (atendimentos) com agilidade (menor TMA).
 * Ex.: 100 atend. em 4min → 25 pts · 80 atend. em 3min → 26,7 pts (fica à frente).
 */
export function calculatePerformanceScore(
  totalAttendances: number,
  averageTimeMinutes: number,
  averagePercentage: number
): number {
  if (totalAttendances <= 0 || averageTimeMinutes <= 0) return 0;

  const throughput = totalAttendances / averageTimeMinutes;
  const metaFactor = averagePercentage / 100;

  return throughput * metaFactor;
}

export function compareAttendantSummaries(
  a: AttendantPerformanceSummary,
  b: AttendantPerformanceSummary
): number {
  if (b.performanceScore !== a.performanceScore) {
    return b.performanceScore - a.performanceScore;
  }
  if (b.totalAttendances !== a.totalAttendances) {
    return b.totalAttendances - a.totalAttendances;
  }
  if (a.averageTimeMinutes !== b.averageTimeMinutes) {
    return a.averageTimeMinutes - b.averageTimeMinutes;
  }
  return b.averagePercentage - a.averagePercentage;
}

export function buildAttendantSummaries(
  records: DailyPerformanceRecord[],
  attendants: Attendant[],
  productionGoals: ProductionGoal[],
  range: DateRange,
  channel?: AttendanceChannel
): AttendantPerformanceSummary[] {
  let periodRecords = filterRecordsByRange(records, range);
  if (channel) {
    periodRecords = periodRecords.filter((record) => record.channel === channel);
  }

  const summaries = attendants.map((attendant) => {
    const attendantRecords = periodRecords.filter((r) => r.attendantId === attendant.id);

    if (attendantRecords.length === 0) {
      return {
        attendantId: attendant.id,
        name: attendant.name,
        role: attendant.role,
        totalAttendances: 0,
        averageTimeMinutes: 0,
        averagePercentage: 0,
        performanceScore: 0,
        ranking: 0,
      };
    }

    const totalAttendances = attendantRecords.reduce((sum, r) => sum + r.attendancesCount, 0);
    const weightedTime =
      attendantRecords.reduce((sum, r) => sum + r.averageTimeMinutes * r.attendancesCount, 0) /
      totalAttendances;

    const percentages = attendantRecords.map((r) => {
      const target = getDailyTarget(r.channel, productionGoals);
      return target > 0 ? (r.attendancesCount / target) * 100 : 0;
    });
    const averagePercentage =
      percentages.reduce((sum, p) => sum + p, 0) / percentages.length;

    const performanceScore = calculatePerformanceScore(
      totalAttendances,
      weightedTime,
      averagePercentage
    );

    return {
      attendantId: attendant.id,
      name: attendant.name,
      role: attendant.role,
      totalAttendances,
      averageTimeMinutes: weightedTime,
      averagePercentage,
      performanceScore,
      ranking: 0,
    };
  });

  const withData = summaries
    .filter((s) => s.totalAttendances > 0)
    .sort(compareAttendantSummaries);

  withData.forEach((summary, index) => {
    summary.ranking = index + 1;
  });

  const rankedIds = new Set(withData.map((s) => s.attendantId));
  return [...withData, ...summaries.filter((s) => !rankedIds.has(s.attendantId))];
}

export interface DashboardStats {
  totalAttendants: number;
  totalAttendances: number;
  averagePercentage: number;
  averageTime: number;
  attendantsWithRecords: number;
}

export function buildDashboardStats(
  attendants: Attendant[],
  records: DailyPerformanceRecord[],
  productionGoals: ProductionGoal[],
  range: DateRange
): DashboardStats {
  const periodRecords = filterRecordsByRange(records, range);
  const indicators = recordsToIndicators(records, attendants, productionGoals, range);

  const totalAttendances = periodRecords.reduce((sum, r) => sum + r.attendancesCount, 0);

  const averagePercentage =
    indicators.length > 0
      ? indicators.reduce((sum, i) => sum + i.percentage, 0) / indicators.length
      : 0;

  const averageTime =
    totalAttendances > 0
      ? periodRecords.reduce((sum, r) => sum + r.averageTimeMinutes * r.attendancesCount, 0) /
        totalAttendances
      : 0;

  return {
    totalAttendants: attendants.length,
    totalAttendances,
    averagePercentage,
    averageTime,
    attendantsWithRecords: new Set(periodRecords.map((r) => r.attendantId)).size,
  };
}

export function todayRange(): DateRange {
  const today = getLocalDateString();
  return { start: today, end: today, label: today };
}

function formatTrendDateLabel(isoDate: string): string {
  const [, month, day] = isoDate.split("-");
  return `${day}/${month}`;
}

export interface ProductivityTrendPoint {
  date: string;
  label: string;
  productivity: number;
  target: number;
}

export function buildProductivityTrend(
  records: DailyPerformanceRecord[],
  attendants: Attendant[],
  productionGoals: ProductionGoal[],
  range: DateRange
): ProductivityTrendPoint[] {
  const periodRecords = filterRecordsByRange(records, range);
  const byDate = new Map<string, DailyPerformanceRecord[]>();

  for (const record of periodRecords) {
    const group = byDate.get(record.date) ?? [];
    group.push(record);
    byDate.set(record.date, group);
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayRecords]) => {
      const indicators = recordsToIndicators(dayRecords, attendants, productionGoals);
      const productivity =
        indicators.length > 0
          ? indicators.reduce((sum, item) => sum + item.percentage, 0) / indicators.length
          : 0;

      return {
        date,
        label: formatTrendDateLabel(date),
        productivity: Math.round(productivity * 10) / 10,
        target: 100,
      };
    });
}

export interface OperationHighlight {
  title: string;
  value: string;
  detail: string;
  tone: "green" | "red" | "orange";
}

export function buildOperationHighlights(
  summaries: AttendantPerformanceSummary[],
  indicators: PerformanceIndicator[]
): OperationHighlight[] {
  const withData = summaries.filter((s) => s.totalAttendances > 0);
  if (withData.length === 0) return [];

  const sorted = [...withData].sort(compareAttendantSummaries);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const highlights: OperationHighlight[] = [];

  highlights.push({
    title: "Melhor Desempenho",
    value: best.name,
    detail: `${best.totalAttendances} atend. · ${formatMinutesLabel(best.averageTimeMinutes)} TMA · ${Math.round(best.averagePercentage)}% meta`,
    tone: "green",
  });

  if (worst.name !== best.name) {
    highlights.push({
      title: "Precisa Atenção",
      value: worst.name,
      detail: `${worst.totalAttendances} atend. · ${formatMinutesLabel(worst.averageTimeMinutes)} TMA · ${Math.round(worst.averagePercentage)}% meta`,
      tone: "red",
    });
  }

  const belowMeta = new Set(
    indicators.filter((i) => i.alertLevel === "red").map((i) => i.attendantId)
  ).size;

  if (belowMeta > 0) {
    highlights.push({
      title: "Abaixo da Meta",
      value: `${belowMeta} colaborador(es)`,
      detail: "Registros abaixo de 85% no período",
      tone: "orange",
    });
  }

  return highlights;
}

export function buildPerformanceAlerts(indicators: PerformanceIndicator[]): PerformanceAlert[] {
  return indicators
    .filter((indicator) => indicator.alertLevel !== "green")
    .sort((a, b) => {
      const levelOrder = { red: 0, yellow: 1, green: 2 };
      const levelDiff = levelOrder[a.alertLevel] - levelOrder[b.alertLevel];
      if (levelDiff !== 0) return levelDiff;
      return a.percentage - b.percentage;
    })
    .map((indicator) => ({
      id: indicator.id,
      attendantId: indicator.attendantId,
      attendantName: indicator.attendantName,
      role: indicator.role,
      date: indicator.date,
      dailyTarget: indicator.dailyTarget,
      produced: indicator.produced,
      percentage: indicator.percentage,
      message:
        indicator.alertLevel === "red"
          ? `${indicator.channel}: ${indicator.produced} de ${indicator.dailyTarget} atendimentos (${indicator.percentage.toFixed(1)}%).`
          : `${indicator.channel}: ${indicator.produced} de ${indicator.dailyTarget} — ${indicator.percentage.toFixed(1)}% da meta.`,
      alertLevel: indicator.alertLevel,
      timestamp: `${indicator.date}T12:00:00`,
      read: false,
    }));
}

function formatMinutesLabel(minutes: number): string {
  const wholeMinutes = Math.floor(minutes);
  const seconds = Math.round((minutes - wholeMinutes) * 60);
  if (seconds === 0) return `${wholeMinutes}m`;
  return `${wholeMinutes}m ${seconds}s`;
}
