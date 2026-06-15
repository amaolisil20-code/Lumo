import type { AttendanceChannel } from "./goals";

/** Canal principal de atendimento do colaborador */
export type AttendantServiceChannel = Extract<AttendanceChannel, "Ligação" | "WhatsApp">;

export interface Attendant {
  id: number;
  name: string;
  role: string;
  /** Canal de atendimento: Ligação ou WhatsApp */
  serviceChannel: AttendantServiceChannel;
  workingHours: string;
  /** Início da jornada (HH:mm), ex.: 12:40 */
  jornadaStart: string;
  /** Fim da jornada (HH:mm), ex.: 19:00 */
  jornadaEnd: string;
  observation: string;
  registrationDate: string;
}

export type AttendantInput = Omit<Attendant, "id" | "registrationDate">;
