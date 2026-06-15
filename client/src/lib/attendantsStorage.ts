import type { Attendant, AttendantInput, AttendantServiceChannel } from "@/types/attendant";
import type { AttendanceChannel } from "@/types/goals";
import { getLocalDateString } from "@/lib/performanceStorage";

const STORAGE_KEY = "lumo-attendants";

export function loadAttendants(): Attendant[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return (JSON.parse(stored) as Attendant[]).map(normalizeAttendant);
    }
  } catch {
    // ignore
  }
  return [];
}

function normalizeAttendant(raw: Attendant): Attendant {
  const channel = raw.serviceChannel;
  const serviceChannel: AttendantServiceChannel =
    channel === "WhatsApp" ? "WhatsApp" : "Ligação";

  return {
    ...raw,
    serviceChannel,
    jornadaStart: raw.jornadaStart ?? "",
    jornadaEnd: raw.jornadaEnd ?? "",
  };
}

export function saveAttendants(attendants: Attendant[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(attendants));
}

export function toAttendantServiceChannel(
  channel: AttendanceChannel
): AttendantServiceChannel | null {
  if (channel === "Ligação" || channel === "WhatsApp") return channel;
  return null;
}

export function pickDominantServiceChannel(
  counts: Map<AttendantServiceChannel, number>
): AttendantServiceChannel {
  let dominant: AttendantServiceChannel = "Ligação";
  let bestCount = 0;

  for (const [channel, count] of counts) {
    if (count > bestCount) {
      dominant = channel;
      bestCount = count;
    }
  }

  return dominant;
}

export function createAttendant(input: AttendantInput, existing: Attendant[]): Attendant {
  return {
    id: Math.max(...existing.map((a) => a.id), 0) + 1,
    ...input,
    registrationDate: getLocalDateString(),
  };
}

export type { AttendantInput };
