export type AbsenceType = "vacation" | "sick" | "personal";

export type AbsenceStatus = "approved" | "pending" | "rejected";

export interface Absence {
  id: number;
  attendantId: number;
  attendantName: string;
  type: AbsenceType;
  startDate: string;
  endDate: string;
  reason: string;
  status: AbsenceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AbsenceInput {
  attendantId: number;
  type: AbsenceType;
  startDate: string;
  endDate: string;
  reason?: string;
  status?: AbsenceStatus;
}

export interface AbsenceUpdateInput {
  attendantId?: number;
  type?: AbsenceType;
  startDate?: string;
  endDate?: string;
  reason?: string;
  status?: AbsenceStatus;
}
