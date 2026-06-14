import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StructureLiveSummary } from "@/lib/structureLiveStatus";

type StructureLiveBarProps = {
  selectedDate: string;
  onDateChange: (date: string) => void;
  summary: StructureLiveSummary;
};

const LEGEND = [
  { key: "green", label: "Meta OK", className: "bg-green-600" },
  { key: "yellow", label: "Atenção", className: "bg-amber-500" },
  { key: "red", label: "Abaixo", className: "bg-red-600" },
  { key: "absent", label: "Ausente", className: "bg-purple-500" },
  { key: "noData", label: "Sem registro", className: "bg-slate-400" },
] as const;

export default function StructureLiveBar({
  selectedDate,
  onDateChange,
  summary,
}: StructureLiveBarProps) {
  const formattedDate = new Date(`${selectedDate}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return (
      <div className="flex shrink-0 flex-col gap-2 lumo-panel-sm px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
        <div className="space-y-1">
          <Label htmlFor="structure-day" className="text-xs">
            Dia operacional
          </Label>
          <Input
            id="structure-day"
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="h-8 w-40"
          />
        </div>
        <p className="text-xs text-muted-foreground capitalize pb-0.5">{formattedDate}</p>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px]">
        {LEGEND.map((item) => (
          <span key={item.key} className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span className={`h-2.5 w-2.5 rounded-full ${item.className}`} />
            {item.label}
            <span className="font-semibold text-foreground">
              ({summary[item.key as keyof StructureLiveSummary] ?? 0})
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
