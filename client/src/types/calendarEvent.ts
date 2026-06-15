export type CalendarEventType = "meeting" | "appointment" | "event" | "reminder";

export interface CalendarEvent {
  id: number;
  title: string;
  type: CalendarEventType;
  date: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEventInput {
  title: string;
  type: CalendarEventType;
  date: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
}

export interface CalendarEventUpdateInput extends Partial<CalendarEventInput> {}

export const CALENDAR_EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  meeting: "Reunião",
  appointment: "Compromisso",
  event: "Acontecimento",
  reminder: "Lembrete",
};

export const CALENDAR_EVENT_TYPE_COLORS: Record<CalendarEventType, string> = {
  meeting: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  appointment: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
  event: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  reminder: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
};

export const CALENDAR_EVENT_TYPE_DOT: Record<CalendarEventType, string> = {
  meeting: "bg-blue-500",
  appointment: "bg-violet-500",
  event: "bg-emerald-500",
  reminder: "bg-amber-500",
};
