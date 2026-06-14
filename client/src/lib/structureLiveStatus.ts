import type { Absence, AbsenceType } from "@/types/absence";
import type { Attendant } from "@/types/attendant";
import type { AlertLevel, ProductionGoal } from "@/types/goals";
import type { DailyPerformanceRecord } from "@/types/performance";
import type { StructureLayout, StructureSlot } from "@/types/structure";
import { ABSENCE_TYPE_LABELS, getAbsencesForDate } from "@/lib/absenceMetrics";
import { recordsToIndicators } from "@/lib/performanceMetrics";
import { getAllSlots } from "@/lib/structureMetrics";

export type SlotLiveVisualStatus =
  | "vacant"
  | "absent"
  | "no-data"
  | "green"
  | "yellow"
  | "red"
  | "blocked"
  | "unavailable";

export interface ChannelDayStats {
  channel: string;
  attendancesCount: number;
  averageTimeMinutes: number;
  dailyTarget: number;
  percentage: number;
  alertLevel: AlertLevel;
}

export interface AttendantLiveInsight {
  attendantId: number;
  name: string;
  visualStatus: SlotLiveVisualStatus;
  absenceLabel?: string;
  absenceType?: AbsenceType;
  totalAttendances: number;
  averagePercentage: number;
  channels: ChannelDayStats[];
  hasRecords: boolean;
}

export interface StructureLiveSummary {
  assigned: number;
  absent: number;
  green: number;
  yellow: number;
  red: number;
  noData: number;
  vacant: number;
}

const ALERT_ORDER: Record<AlertLevel, number> = { red: 0, yellow: 1, green: 2 };

export function buildAttendantLiveInsights(
  dateStr: string,
  attendants: Attendant[],
  records: DailyPerformanceRecord[],
  absences: Absence[],
  productionGoals: ProductionGoal[]
): Map<number, AttendantLiveInsight> {
  const map = new Map<number, AttendantLiveInsight>();
  const dayRecords = records.filter((record) => record.date === dateStr);
  const dayAbsences = getAbsencesForDate(absences, dateStr);
  const absenceByAttendant = new Map<number, Absence>();

  for (const absence of dayAbsences) {
    if (!absenceByAttendant.has(absence.attendantId)) {
      absenceByAttendant.set(absence.attendantId, absence);
    }
  }

  for (const attendant of attendants) {
    const absence = absenceByAttendant.get(attendant.id);

    if (absence) {
      map.set(attendant.id, {
        attendantId: attendant.id,
        name: attendant.name,
        visualStatus: "absent",
        absenceLabel: ABSENCE_TYPE_LABELS[absence.type],
        absenceType: absence.type,
        totalAttendances: 0,
        averagePercentage: 0,
        channels: [],
        hasRecords: false,
      });
      continue;
    }

    const attendantRecords = dayRecords.filter(
      (record) => record.attendantId === attendant.id
    );

    if (attendantRecords.length === 0) {
      map.set(attendant.id, {
        attendantId: attendant.id,
        name: attendant.name,
        visualStatus: "no-data",
        totalAttendances: 0,
        averagePercentage: 0,
        channels: [],
        hasRecords: false,
      });
      continue;
    }

    const indicators = recordsToIndicators(attendantRecords, attendants, productionGoals);
    const channels: ChannelDayStats[] = attendantRecords.map((record) => {
      const indicator = indicators.find((item) => item.id === record.id)!;
      return {
        channel: record.channel,
        attendancesCount: record.attendancesCount,
        averageTimeMinutes: record.averageTimeMinutes,
        dailyTarget: indicator.dailyTarget,
        percentage: indicator.percentage,
        alertLevel: indicator.alertLevel,
      };
    });

    const totalAttendances = attendantRecords.reduce(
      (sum, record) => sum + record.attendancesCount,
      0
    );
    const averagePercentage =
      indicators.reduce((sum, item) => sum + item.percentage, 0) / indicators.length;
    const worstLevel = indicators.reduce<AlertLevel>(
      (worst, item) => (ALERT_ORDER[item.alertLevel] < ALERT_ORDER[worst] ? item.alertLevel : worst),
      "green"
    );

    const visualStatus: SlotLiveVisualStatus =
      worstLevel === "green" ? "green" : worstLevel === "yellow" ? "yellow" : "red";

    map.set(attendant.id, {
      attendantId: attendant.id,
      name: attendant.name,
      visualStatus,
      totalAttendances,
      averagePercentage,
      channels,
      hasRecords: true,
    });
  }

  return map;
}

export function getSlotVisualStatus(
  slot: StructureSlot,
  liveByAttendant: Map<number, AttendantLiveInsight>
): SlotLiveVisualStatus {
  if (slot.status === "blocked") return "blocked";
  if (slot.status === "unavailable") return "unavailable";
  if (slot.attendantId == null || slot.status === "vacant") return "vacant";
  return liveByAttendant.get(slot.attendantId)?.visualStatus ?? "no-data";
}

export function computeStructureLiveSummary(
  layout: StructureLayout,
  liveByAttendant: Map<number, AttendantLiveInsight>
): StructureLiveSummary {
  const summary: StructureLiveSummary = {
    assigned: 0,
    absent: 0,
    green: 0,
    yellow: 0,
    red: 0,
    noData: 0,
    vacant: 0,
  };

  for (const { slot } of getAllSlots(layout)) {
    const status = getSlotVisualStatus(slot, liveByAttendant);
    if (status === "vacant") summary.vacant++;
    else if (status === "absent") summary.absent++;
    else if (status === "green") summary.green++;
    else if (status === "yellow") summary.yellow++;
    else if (status === "red") summary.red++;
    else if (status === "no-data") summary.noData++;
    if (slot.attendantId != null && status !== "vacant") summary.assigned++;
  }

  return summary;
}

export function liveStatusDeskStyles(status: SlotLiveVisualStatus) {
  switch (status) {
    case "green":
      return {
        card: "border-green-500/70 bg-green-50/40 dark:bg-green-950/20",
        topBar: "bg-green-600",
        badge: "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300",
        label: "Meta OK",
      };
    case "yellow":
      return {
        card: "border-amber-500/70 bg-amber-50/40 dark:bg-amber-950/20",
        topBar: "bg-amber-500",
        badge: "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200",
        label: "Atenção",
      };
    case "red":
      return {
        card: "border-red-500/70 bg-red-50/40 dark:bg-red-950/20",
        topBar: "bg-red-600",
        badge: "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300",
        label: "Abaixo da meta",
      };
    case "absent":
      return {
        card: "border-purple-400/70 bg-purple-50/40 dark:bg-purple-950/20",
        topBar: "bg-purple-500",
        badge: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300",
        label: "Ausente",
      };
    case "no-data":
      return {
        card: "border-border/60 bg-white",
        topBar: "bg-slate-400",
        badge: "bg-muted text-muted-foreground",
        label: "Sem registro",
      };
    case "blocked":
      return {
        card: "border-red-300 bg-red-50/60",
        topBar: "bg-red-400",
        badge: "bg-red-100 text-red-700",
        label: "Bloqueada",
      };
    case "unavailable":
      return {
        card: "border-amber-300 bg-amber-50/60",
        topBar: "bg-amber-400",
        badge: "bg-amber-100 text-amber-800",
        label: "Indisponível",
      };
    default:
      return {
        card: "border-blue-300/60 bg-white",
        topBar: "bg-blue-600",
        badge: "bg-blue-50 text-blue-700",
        label: "Vaga",
      };
  }
}
