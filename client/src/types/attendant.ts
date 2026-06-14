export interface Attendant {
  id: number;
  name: string;
  role: string;
  workingHours: string;
  /** Início da jornada (HH:mm), ex.: 12:40 */
  jornadaStart: string;
  /** Fim da jornada (HH:mm), ex.: 19:00 */
  jornadaEnd: string;
  observation: string;
  registrationDate: string;
}

export type AttendantInput = Omit<Attendant, "id" | "registrationDate">;
