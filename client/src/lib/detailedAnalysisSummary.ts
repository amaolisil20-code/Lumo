import type { Attendant } from "@/types/attendant";
import type { Absence } from "@/types/absence";
import type { ProductionGoal, PerformanceIndicator } from "@/types/goals";
import type { DailyPerformanceRecord } from "@/types/performance";
import type { DateRange } from "@/lib/dateRangeFilter";
import { ABSENCE_TYPE_LABELS, getAbsencesForDate } from "@/lib/absenceMetrics";
import { filterRecordsByRange, recordsToIndicators } from "@/lib/performanceMetrics";
import { formatAverageTime } from "@/lib/performanceStorage";

export interface DaySummaryBlock {
  date: string;
  dateLabel: string;
  title: string;
  paragraphs: string[];
}

export interface DetailedAnalysisReport {
  hasData: boolean;
  intro: string | null;
  managerNote: string | null;
  criticalDays: DaySummaryBlock[];
  bestDays: DaySummaryBlock[];
  periodInsights: string[];
}

interface DaySnapshot {
  date: string;
  dateLabel: string;
  totalAttendances: number;
  ligacao: number;
  whatsapp: number;
  averageMeta: number;
  averageTma: number;
  attendantsWithRecords: number;
  belowMetaCount: number;
  aboveMetaCount: number;
  belowMetaNames: string[];
  aboveMetaNames: string[];
  absences: Absence[];
}

const META_THRESHOLD = 85;

function formatDateLabel(isoDate: string): string {
  const formatted = new Date(`${isoDate}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function formatNames(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} e ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
}

function formatAbsenceNames(absences: Absence[]): string {
  return formatNames(absences.map((a) => a.attendantName));
}

function summarizeAttendantMeta(indicators: PerformanceIndicator[]) {
  const byAttendant = new Map<
    number,
    { name: string; percentages: number[]; belowOnAnyChannel: boolean }
  >();

  for (const indicator of indicators) {
    const current = byAttendant.get(indicator.attendantId) ?? {
      name: indicator.attendantName,
      percentages: [],
      belowOnAnyChannel: false,
    };
    current.percentages.push(indicator.percentage);
    if (indicator.percentage < META_THRESHOLD) {
      current.belowOnAnyChannel = true;
    }
    byAttendant.set(indicator.attendantId, current);
  }

  const belowMetaNames: string[] = [];
  const aboveMetaNames: string[] = [];

  for (const entry of byAttendant.values()) {
    if (entry.belowOnAnyChannel) {
      belowMetaNames.push(entry.name);
    } else {
      aboveMetaNames.push(entry.name);
    }
  }

  belowMetaNames.sort((a, b) => a.localeCompare(b, "pt-BR"));
  aboveMetaNames.sort((a, b) => a.localeCompare(b, "pt-BR"));

  return {
    belowMetaCount: belowMetaNames.length,
    aboveMetaCount: aboveMetaNames.length,
    belowMetaNames,
    aboveMetaNames,
  };
}

function buildDaySnapshots(
  records: DailyPerformanceRecord[],
  attendants: Attendant[],
  productionGoals: ProductionGoal[],
  absences: Absence[],
  range: DateRange
): DaySnapshot[] {
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
      const metaSummary = summarizeAttendantMeta(indicators);
      const averageMeta =
        indicators.length > 0
          ? indicators.reduce((sum, item) => sum + item.percentage, 0) / indicators.length
          : 0;

      const tmaRecords = dayRecords.filter((r) => r.averageTimeMinutes > 0);
      const averageTma =
        tmaRecords.length > 0
          ? tmaRecords.reduce((sum, r) => sum + r.averageTimeMinutes, 0) / tmaRecords.length
          : 0;

      let ligacao = 0;
      let whatsapp = 0;
      let totalAttendances = 0;
      for (const record of dayRecords) {
        totalAttendances += record.attendancesCount;
        if (record.channel === "Ligação") ligacao += record.attendancesCount;
        if (record.channel === "WhatsApp") whatsapp += record.attendancesCount;
      }

      return {
        date,
        dateLabel: formatDateLabel(date),
        totalAttendances,
        ligacao,
        whatsapp,
        averageMeta: Math.round(averageMeta * 10) / 10,
        averageTma,
        attendantsWithRecords: new Set(dayRecords.map((r) => r.attendantId)).size,
        absences: getAbsencesForDate(absences, date),
        ...metaSummary,
      };
    });
}

function describeAbsences(absences: Absence[]): string | null {
  if (absences.length === 0) return null;

  const sick = absences.filter((a) => a.type === "sick");
  const vacation = absences.filter((a) => a.type === "vacation");
  const personal = absences.filter((a) => a.type === "personal");
  const parts: string[] = [];

  if (sick.length > 0) {
    parts.push(
      `${formatAbsenceNames(sick)} ${sick.length === 1 ? "estava" : "estavam"} de ${ABSENCE_TYPE_LABELS.sick.toLowerCase()}`
    );
  }
  if (vacation.length > 0) {
    parts.push(
      `${formatAbsenceNames(vacation)} ${vacation.length === 1 ? "estava" : "estavam"} de ${ABSENCE_TYPE_LABELS.vacation.toLowerCase()}`
    );
  }
  if (personal.length > 0) {
    parts.push(
      `${formatAbsenceNames(personal)} ${personal.length === 1 ? "estava" : "estavam"} ausente(s) por ${ABSENCE_TYPE_LABELS.personal.toLowerCase()}`
    );
  }

  return parts.join("; ") + ".";
}

function describeTma(tma: number, periodAvgTma: number, isCritical: boolean): string {
  if (tma <= 0) {
    return "Não há TMA registrado neste dia.";
  }

  const formatted = formatAverageTime(tma);
  if (periodAvgTma <= 0) {
    return `O tempo médio de atendimento (TMA) foi de ${formatted}.`;
  }

  if (isCritical) {
    if (tma >= periodAvgTma * 1.1) {
      return `O TMA médio foi de ${formatted}, acima da média do período — o tempo de espera/atendimento pode ter pesado neste dia.`;
    }
    if (tma <= periodAvgTma * 0.95) {
      return `O TMA médio foi de ${formatted}, abaixo da média do período — a dificuldade parece ter sido meta individual, não demora na fila.`;
    }
    return `O TMA médio ficou em ${formatted}, próximo da média do período.`;
  }

  if (tma <= periodAvgTma * 0.95) {
    return `O TMA médio foi de ${formatted}, abaixo da média do período — fila mais ágil neste dia.`;
  }
  return `O TMA médio ficou em ${formatted}.`;
}

function buildCriticalDayBlock(snapshot: DaySnapshot, periodAvgTma: number): DaySummaryBlock {
  const paragraphs: string[] = [
    `Neste dia, ${snapshot.belowMetaCount} colaborador(es) ficaram abaixo da meta (${META_THRESHOLD}%): ${formatNames(snapshot.belowMetaNames)}.`,
  ];

  if (snapshot.aboveMetaCount > 0) {
    paragraphs.push(
      `${snapshot.aboveMetaCount} colaborador(es) bateram a meta: ${formatNames(snapshot.aboveMetaNames)}.`
    );
  }

  if (snapshot.belowMetaCount >= 2) {
    paragraphs.push(
      "Mais de um colaborador ficou abaixo da meta no mesmo dia — vale revisar escala, pausas ou suporte na operação."
    );
  }

  paragraphs.push(
    `Volume do dia (referência): ${snapshot.totalAttendances.toLocaleString("pt-BR")} atendimentos (${snapshot.ligacao.toLocaleString("pt-BR")} ligações · ${snapshot.whatsapp.toLocaleString("pt-BR")} WhatsApp). O total varia conforme o dia da semana e não define, sozinho, se o dia foi ruim.`
  );

  const absenceLine = describeAbsences(snapshot.absences);
  if (absenceLine) {
    paragraphs.push(absenceLine);
  } else if (snapshot.belowMetaCount > 0) {
    paragraphs.push(
      "Não há ausências registradas neste dia — a queda parece ligada ao desempenho individual, não a falta cadastrada."
    );
  }

  paragraphs.push(describeTma(snapshot.averageTma, periodAvgTma, true));

  return {
    date: snapshot.date,
    dateLabel: snapshot.dateLabel,
    title: snapshot.dateLabel,
    paragraphs,
  };
}

function buildBestDayBlock(snapshot: DaySnapshot, periodAvgTma: number): DaySummaryBlock {
  const paragraphs: string[] = [];

  if (snapshot.belowMetaCount === 0) {
    paragraphs.push(
      `Todos os ${snapshot.attendantsWithRecords} colaborador(es) com registro neste dia bateram a meta individual.`
    );
  } else {
    paragraphs.push(
      `${snapshot.aboveMetaCount} colaborador(es) bateram a meta. Ainda houve ${snapshot.belowMetaCount} abaixo: ${formatNames(snapshot.belowMetaNames)}.`
    );
  }

  paragraphs.push(
    `Volume do dia: ${snapshot.totalAttendances.toLocaleString("pt-BR")} atendimentos (${snapshot.ligacao.toLocaleString("pt-BR")} ligações · ${snapshot.whatsapp.toLocaleString("pt-BR")} WhatsApp), com ${snapshot.averageMeta.toLocaleString("pt-BR")}% de atingimento médio da meta por registro.`
  );

  const absenceLine = describeAbsences(snapshot.absences);
  if (absenceLine) {
    paragraphs.push(absenceLine);
  } else {
    paragraphs.push("Não houve ausências registradas.");
  }

  paragraphs.push(describeTma(snapshot.averageTma, periodAvgTma, false));

  return {
    date: snapshot.date,
    dateLabel: snapshot.dateLabel,
    title: snapshot.dateLabel,
    paragraphs,
  };
}

function pickCriticalDays(snapshots: DaySnapshot[], count: number): DaySnapshot[] {
  return [...snapshots]
    .filter((s) => s.belowMetaCount > 0)
    .sort(
      (a, b) =>
        b.belowMetaCount - a.belowMetaCount ||
        a.averageMeta - b.averageMeta ||
        b.averageTma - a.averageTma
    )
    .slice(0, count);
}

function pickBestDays(
  snapshots: DaySnapshot[],
  excludeDates: Set<string>,
  count: number
): DaySnapshot[] {
  if (count <= 0) return [];

  return [...snapshots]
    .filter((s) => !excludeDates.has(s.date))
    .sort(
      (a, b) =>
        a.belowMetaCount - b.belowMetaCount ||
        b.averageMeta - a.averageMeta ||
        a.averageTma - b.averageTma
    )
    .slice(0, count);
}

function buildPeriodInsights(snapshots: DaySnapshot[], periodAvgTma: number): string[] {
  const insights: string[] = [];
  const multiMissDays = snapshots.filter((day) => day.belowMetaCount >= 2);

  if (multiMissDays.length > 0) {
    insights.push(
      `Em ${multiMissDays.length} dia(s) do período, mais de um colaborador ficou abaixo da meta — ${multiMissDays.map((day) => day.dateLabel).join("; ")}.`
    );
  }

  const highTmaDays = snapshots.filter(
    (day) => day.averageTma > 0 && periodAvgTma > 0 && day.averageTma >= periodAvgTma * 1.1
  );

  if (highTmaDays.length > 0) {
    insights.push(
      `${highTmaDays.length} dia(s) tiveram TMA acima da média do período — tempo de espera/atendimento merece atenção (${highTmaDays.map((day) => day.dateLabel).join("; ")}).`
    );
  }

  const perfectDays = snapshots.filter(
    (day) => day.attendantsWithRecords > 0 && day.belowMetaCount === 0
  );

  if (perfectDays.length > 0) {
    insights.push(
      `${perfectDays.length} dia(s) com todos os colaboradores registrados batendo a meta individual.`
    );
  }

  return insights;
}

export function buildDetailedAnalysisReport(
  records: DailyPerformanceRecord[],
  attendants: Attendant[],
  productionGoals: ProductionGoal[],
  absences: Absence[],
  range: DateRange,
  periodScope: string,
  managerNote = ""
): DetailedAnalysisReport {
  const trimmedNote = managerNote.trim();
  const snapshots = buildDaySnapshots(records, attendants, productionGoals, absences, range);

  if (snapshots.length === 0) {
    return {
      hasData: false,
      intro: null,
      managerNote: trimmedNote || null,
      criticalDays: [],
      bestDays: [],
      periodInsights: [],
    };
  }

  const daysWithData = snapshots.filter((s) => s.attendantsWithRecords > 0);
  const periodAvgTma =
    daysWithData.filter((s) => s.averageTma > 0).reduce((sum, s) => sum + s.averageTma, 0) /
    Math.max(daysWithData.filter((s) => s.averageTma > 0).length, 1);

  const pickCount =
    daysWithData.length === 1 ? 1 : Math.min(2, Math.max(daysWithData.length - 1, 1));
  const criticalSnapshots = pickCriticalDays(daysWithData, pickCount);
  const criticalDates = new Set(criticalSnapshots.map((s) => s.date));
  const bestSnapshots = pickBestDays(daysWithData, criticalDates, pickCount);
  const periodInsights = buildPeriodInsights(daysWithData, periodAvgTma);

  const intro =
    daysWithData.length === 1
      ? `Análise ${periodScope} com foco em meta individual por colaborador — o volume total do dia não define, sozinho, se a operação foi boa ou ruim.`
      : `Análise ${periodScope} com foco em meta individual: identificamos dias em que colaboradores não bateram a meta, dias com mais de uma pessoa abaixo e TMA elevado. O total de atendimentos varia conforme o dia da semana.`;

  return {
    hasData: true,
    intro,
    managerNote: trimmedNote || null,
    criticalDays: criticalSnapshots.map((s) => buildCriticalDayBlock(s, periodAvgTma)),
    bestDays: bestSnapshots.map((s) => buildBestDayBlock(s, periodAvgTma)),
    periodInsights,
  };
}
