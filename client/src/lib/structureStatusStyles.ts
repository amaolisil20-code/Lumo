import type { PositionStatus } from "@/types/structure";

export const STATUS_LABELS: Record<PositionStatus, string> = {
  occupied: "Ocupada",
  vacant: "Vaga",
  blocked: "Bloqueada",
  unavailable: "Indisponível",
};

export function statusSurfaceClass(status: PositionStatus): string {
  switch (status) {
    case "occupied":
      return "bg-blue-700 border-blue-600 text-white shadow-md shadow-blue-700/25";
    case "vacant":
      return "bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-muted-foreground";
    case "blocked":
      return "bg-red-100 dark:bg-red-950/50 border-red-300 dark:border-red-800 text-red-800 dark:text-red-300";
    case "unavailable":
      return "bg-amber-100 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200";
  }
}

export function statusDotClass(status: PositionStatus): string {
  switch (status) {
    case "occupied":
      return "bg-indigo-500";
    case "vacant":
      return "bg-slate-400";
    case "blocked":
      return "bg-red-400";
    case "unavailable":
      return "bg-amber-400";
  }
}
