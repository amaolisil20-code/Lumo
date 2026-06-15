import type { AlertLevel } from "@/types/goals";

export const chartTooltipClass =
  "bg-popover p-3 rounded-lg border border-border shadow-overlay";

export const chartTooltipContentStyle = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  color: "var(--popover-foreground)",
  boxShadow: "var(--shadow-overlay)",
};

export function alertSurfaceClass(level: AlertLevel): string {
  switch (level) {
    case "green":
      return "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800";
    case "yellow":
      return "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800";
    case "red":
      return "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800";
    default:
      return "bg-muted/50 border-border";
  }
}

export function alertTextClass(level: AlertLevel): string {
  switch (level) {
    case "green":
      return "text-green-700 dark:text-green-400";
    case "yellow":
      return "text-yellow-700 dark:text-yellow-400";
    case "red":
      return "text-red-700 dark:text-red-400";
    default:
      return "text-muted-foreground";
  }
}

export function alertBadgeClass(level: AlertLevel): string {
  switch (level) {
    case "green":
      return "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400";
    case "yellow":
      return "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400";
    case "red":
      return "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function alertSoftBgClass(level: AlertLevel): string {
  switch (level) {
    case "green":
      return "bg-green-50 dark:bg-green-950/30";
    case "yellow":
      return "bg-yellow-50 dark:bg-yellow-950/30";
    case "red":
      return "bg-red-50 dark:bg-red-950/30";
    default:
      return "bg-muted/50";
  }
}

export function alertIconClass(level: AlertLevel): string {
  switch (level) {
    case "green":
      return "text-green-600 dark:text-green-400";
    case "yellow":
      return "text-yellow-600 dark:text-yellow-400";
    case "red":
      return "text-red-600 dark:text-red-400";
    default:
      return "text-primary";
  }
}
