import type {
  CalendarEvent,
  CalendarEventInput,
} from "@/types/calendarEvent";

const STORAGE_KEY = "lumo-calendar-events";

export function loadCalendarEvents(): CalendarEvent[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as CalendarEvent[];
    }
  } catch {
    // ignore parse errors
  }
  return [];
}

export function saveCalendarEvents(events: CalendarEvent[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export function createCalendarEvent(
  input: CalendarEventInput,
  existing: CalendarEvent[]
): CalendarEvent {
  const now = new Date().toISOString();
  const nextId = existing.length > 0 ? Math.max(...existing.map((event) => event.id)) + 1 : 1;

  return {
    id: nextId,
    title: input.title.trim(),
    type: input.type,
    date: input.date,
    endDate: input.endDate?.trim() || undefined,
    startTime: input.startTime?.trim() || undefined,
    endTime: input.endTime?.trim() || undefined,
    location: input.location?.trim() || undefined,
    description: input.description?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
}
