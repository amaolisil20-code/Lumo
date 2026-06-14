import type { Attendant } from "@/types/attendant";

export function formatJornadaTime(time: string): string {
  if (!time) return "";
  const [hourPart, minutePart] = time.split(":");
  const minutes = minutePart ?? "00";
  if (minutes === "00") {
    return `${Number(hourPart)}h`;
  }
  return `${hourPart}:${minutes}`;
}

export function formatJornada(
  attendant: Pick<Attendant, "jornadaStart" | "jornadaEnd">
): string {
  if (!attendant.jornadaStart || !attendant.jornadaEnd) return "";
  return `${formatJornadaTime(attendant.jornadaStart)} - ${formatJornadaTime(attendant.jornadaEnd)}`;
}

export function isValidJornada(start: string, end: string): boolean {
  if (!start && !end) return true;
  if (!start || !end) return false;
  return start < end;
}
