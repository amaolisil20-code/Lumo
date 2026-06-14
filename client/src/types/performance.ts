import type { AttendanceChannel } from "./goals";

export interface DailyPerformanceRecord {
  id: number;
  attendantId: number;
  attendantName: string;
  date: string;
  channel: AttendanceChannel;
  attendancesCount: number;
  averageTimeMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export type DailyPerformanceInput = Omit<
  DailyPerformanceRecord,
  "id" | "attendantName" | "createdAt" | "updatedAt"
>;
