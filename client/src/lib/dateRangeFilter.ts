import { getLocalDateString } from "@/lib/performanceStorage";

export type DashboardPeriod = "day" | "week" | "month";

export interface DateRange {
  start: string;
  end: string;
  label: string;
}

export function getMonthString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getWeekRange(dateStr: string): { start: string; end: string } {
  const date = new Date(`${dateStr}T12:00:00`);
  const dayOfWeek = date.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    start: getLocalDateString(monday),
    end: getLocalDateString(sunday),
  };
}

function getMonthRange(monthStr: string): { start: string; end: string } {
  const [year, month] = monthStr.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const monthPadded = String(month).padStart(2, "0");
  return {
    start: `${year}-${monthPadded}-01`,
    end: `${year}-${monthPadded}-${String(lastDay).padStart(2, "0")}`,
  };
}

function formatDateBR(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("pt-BR");
}

export function resolveDateRange(period: DashboardPeriod, value: string): DateRange {
  if (period === "day") {
    return {
      start: value,
      end: value,
      label: formatDateBR(value),
    };
  }

  if (period === "week") {
    const { start, end } = getWeekRange(value);
    return {
      start,
      end,
      label: `${formatDateBR(start)} — ${formatDateBR(end)}`,
    };
  }

  const { start, end } = getMonthRange(value);
  const [year, month] = value.split("-");
  const monthName = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return {
    start,
    end,
    label: monthName.charAt(0).toUpperCase() + monthName.slice(1),
  };
}

export function periodAttendancesLabel(period: DashboardPeriod): string {
  if (period === "day") return "Atendimentos no Dia";
  if (period === "week") return "Atendimentos na Semana";
  return "Atendimentos no Mês";
}

export function periodMetaLabel(period: DashboardPeriod): string {
  if (period === "day") return "Meta Atingida";
  if (period === "week") return "Meta Média (Semana)";
  return "Meta Média (Mês)";
}

export function periodScopePhrase(period: DashboardPeriod): string {
  if (period === "day") return "no dia selecionado";
  if (period === "week") return "na semana selecionada";
  return "no mês selecionado";
}

export function periodScopeLabel(period: DashboardPeriod): string {
  const phrase = periodScopePhrase(period);
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

export function periodBelowGoalTitle(period: DashboardPeriod): string {
  if (period === "day") return "Funcionários Abaixo da Meta no Dia";
  if (period === "week") return "Funcionários Abaixo da Meta na Semana";
  return "Funcionários Abaixo da Meta no Mês";
}

export function periodRankingSubtitle(period: DashboardPeriod): string {
  if (period === "day") return "Desempenho no dia selecionado";
  if (period === "week") return "Desempenho na semana selecionada";
  return "Desempenho no mês selecionado";
}

export function periodIndicatorsHeading(period: DashboardPeriod): string {
  if (period === "day") return "Indicadores do Dia";
  if (period === "week") return "Indicadores da Semana";
  return "Indicadores do Mês";
}
