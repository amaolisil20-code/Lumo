import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import type { CalendarEvent } from "@/types/calendarEvent";

export function eventOccursOnDate(event: CalendarEvent, dateIso: string): boolean {
  const end = event.endDate ?? event.date;
  return dateIso >= event.date && dateIso <= end;
}

export function getEventsForDate(events: CalendarEvent[], dateIso: string): CalendarEvent[] {
  return events
    .filter((event) => eventOccursOnDate(event, dateIso))
    .sort((a, b) => {
      const timeA = a.startTime ?? "99:99";
      const timeB = b.startTime ?? "99:99";
      if (timeA !== timeB) return timeA.localeCompare(timeB);
      return a.title.localeCompare(b.title, "pt-BR");
    });
}

export function buildMonthDays(month: Date): Date[] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

export function formatMonthLabel(month: Date): string {
  const label = format(month, "MMMM yyyy", { locale: ptBR });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatDayLabel(date: Date): string {
  const label = format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatEventTime(event: CalendarEvent): string {
  if (event.startTime && event.endTime) {
    return `${event.startTime} – ${event.endTime}`;
  }
  if (event.startTime) return event.startTime;
  return "Dia inteiro";
}

export { isSameDay, isSameMonth };
