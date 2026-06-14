import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Attendant } from "@/types/attendant";
import type { PositionStatus, StructureSlot } from "@/types/structure";
import { STATUS_LABELS } from "@/lib/structureStatusStyles";
import type { AttendantLiveInsight } from "@/lib/structureLiveStatus";
import { liveStatusDeskStyles } from "@/lib/structureLiveStatus";
import { formatAverageTime } from "@/lib/performanceStorage";

interface SlotEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: StructureSlot | null;
  attendants: Attendant[];
  assignedElsewhere: Set<number>;
  selectedDate: string;
  liveByAttendant: Map<number, AttendantLiveInsight>;
  onOpenPerformance: () => void;
  onSave: (patch: Partial<StructureSlot>) => void;
}

function LiveInsightPanel({
  selectedDate,
  liveInsight,
  onOpenPerformance,
}: {
  selectedDate: string;
  liveInsight?: AttendantLiveInsight;
  onOpenPerformance: () => void;
}) {
  const formattedDate = new Date(`${selectedDate}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  if (!liveInsight) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-4 text-center text-xs text-muted-foreground">
        Selecione um colaborador para ver o desempenho do dia ({formattedDate}).
      </div>
    );
  }

  const styles = liveStatusDeskStyles(liveInsight.visualStatus);

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-foreground">Desempenho do dia</p>
          <p className="text-[11px] text-muted-foreground">{formattedDate}</p>
        </div>
        <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold ${styles.badge}`}>
          {styles.label}
        </span>
      </div>

      {liveInsight.visualStatus === "absent" ? (
        <p className="text-sm text-foreground">
          Ausência registrada:{" "}
          <span className="font-medium">{liveInsight.absenceLabel ?? "Ausente"}</span>
        </p>
      ) : liveInsight.hasRecords ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {liveInsight.totalAttendances} atendimentos · média{" "}
            {Math.round(liveInsight.averagePercentage)}% da meta
          </p>
          <div className="space-y-1.5">
            {liveInsight.channels.map((channel) => {
              const channelStyles = liveStatusDeskStyles(channel.alertLevel);
              return (
                <div
                  key={channel.channel}
                  className="flex items-center justify-between gap-2 rounded-md border border-border/40 bg-background px-2.5 py-1.5 text-[11px]"
                >
                  <span className="font-medium">{channel.channel}</span>
                  <span className="text-muted-foreground">
                    {channel.attendancesCount} atend. · {formatAverageTime(channel.averageTimeMinutes)}
                  </span>
                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${channelStyles.badge}`}>
                    {Math.round(channel.percentage)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nenhum registro de desempenho importado para este dia.
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full gap-1.5"
        onClick={onOpenPerformance}
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Ver em Desempenho
      </Button>
    </div>
  );
}

export default function SlotEditorDialog({
  open,
  onOpenChange,
  slot,
  attendants,
  assignedElsewhere,
  selectedDate,
  liveByAttendant,
  onOpenPerformance,
  onSave,
}: SlotEditorDialogProps) {
  const [draft, setDraft] = useState<StructureSlot | null>(slot);

  useEffect(() => {
    if (open && slot) {
      setDraft({ ...slot });
    }
  }, [open, slot]);

  if (!slot || !draft) return null;

  const handleAttendantChange = (value: string) => {
    if (value === "__none__") {
      setDraft((prev) =>
        prev ? { ...prev, attendantId: null, status: "vacant" } : prev
      );
      return;
    }
    setDraft((prev) =>
      prev ? { ...prev, attendantId: Number(value), status: "occupied" } : prev
    );
  };

  const handleStatusChange = (value: PositionStatus) => {
    if (value === "vacant") {
      setDraft((prev) =>
        prev ? { ...prev, status: value, attendantId: null } : prev
      );
      return;
    }
    setDraft((prev) => (prev ? { ...prev, status: value } : prev));
  };

  const handleConfirm = () => {
    onSave({
      label: draft.label?.trim() || undefined,
      sector: draft.sector,
      attendantId: draft.attendantId,
      status: draft.status,
    });
    onOpenChange(false);
  };

  const attendantLiveInsight =
    draft.attendantId != null ? liveByAttendant.get(draft.attendantId) : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Posição de trabalho</DialogTitle>
          <DialogDescription>
            {slot.label ? slot.label : "Configure funcionário, setor e status"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <LiveInsightPanel
            selectedDate={selectedDate}
            liveInsight={attendantLiveInsight}
            onOpenPerformance={onOpenPerformance}
          />

          <div className="space-y-2">
            <Label>Identificação</Label>
            <Input
              value={draft.label ?? ""}
              onChange={(e) => setDraft((prev) => (prev ? { ...prev, label: e.target.value } : prev))}
              placeholder="Ex: Mesa 12"
            />
          </div>

          <div className="space-y-2">
            <Label>Setor</Label>
            <Input
              value={draft.sector}
              onChange={(e) => setDraft((prev) => (prev ? { ...prev, sector: e.target.value } : prev))}
              placeholder="Ex: Chat, Suporte"
            />
          </div>

          <div className="space-y-2">
            <Label>Funcionário</Label>
            <Select
              value={draft.attendantId != null ? String(draft.attendantId) : "__none__"}
              onValueChange={handleAttendantChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um colaborador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Vaga —</SelectItem>
                {attendants.map((attendant) => {
                  const taken =
                    assignedElsewhere.has(attendant.id) &&
                    draft.attendantId !== attendant.id;
                  return (
                    <SelectItem
                      key={attendant.id}
                      value={String(attendant.id)}
                      disabled={taken}
                    >
                      {attendant.name}
                      {taken ? " (já alocado)" : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={draft.status} onValueChange={(v) => handleStatusChange(v as PositionStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABELS) as PositionStatus[]).map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm}>
            Salvar posição
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
