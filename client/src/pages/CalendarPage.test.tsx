import { describe, expect, it } from "vitest";
import CalendarPage from "./CalendarPage";
import { eventOccursOnDate, getEventsForDate } from "@/lib/calendarMetrics";
import type { CalendarEvent } from "@/types/calendarEvent";

describe("CalendarPage", () => {
  it("component should be importable", () => {
    expect(CalendarPage).toBeDefined();
    expect(typeof CalendarPage).toBe("function");
  });
});

describe("calendarMetrics", () => {
  const events: CalendarEvent[] = [
    {
      id: 1,
      title: "Reunião",
      type: "meeting",
      date: "2026-06-10",
      startTime: "09:00",
      createdAt: "",
      updatedAt: "",
    },
    {
      id: 2,
      title: "Treinamento",
      type: "event",
      date: "2026-06-10",
      endDate: "2026-06-12",
      createdAt: "",
      updatedAt: "",
    },
  ];

  it("detects multi-day events", () => {
    expect(eventOccursOnDate(events[1], "2026-06-11")).toBe(true);
    expect(eventOccursOnDate(events[1], "2026-06-13")).toBe(false);
  });

  it("sorts events by start time", () => {
    const dayEvents = getEventsForDate(events, "2026-06-10");
    expect(dayEvents.map((event) => event.id)).toEqual([1, 2]);
  });
});
