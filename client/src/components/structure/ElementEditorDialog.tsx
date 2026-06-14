import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StructureElement } from "@/types/structure";
import { ROOM_LABELS } from "@/lib/structureFactory";
import { clampElementBounds } from "@/lib/structureElementBounds";
import { Trash2 } from "lucide-react";

interface ElementEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  element: StructureElement | null;
  onSave: (patch: Partial<StructureElement>) => void;
  onRemove: () => void;
}

export default function ElementEditorDialog({
  open,
  onOpenChange,
  element,
  onSave,
  onRemove,
}: ElementEditorDialogProps) {
  if (!element) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar elemento</DialogTitle>
          <DialogDescription>
            {element.roomKind ? ROOM_LABELS[element.roomKind] : element.label}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {element.type === "text" && (
            <div className="space-y-2">
              <Label>Texto exibido</Label>
              <Input
                value={element.textContent ?? element.label}
                onChange={(e) =>
                  onSave({ textContent: e.target.value, label: e.target.value })
                }
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              value={element.label}
              onChange={(e) => onSave({ label: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Setor</Label>
            <Input
              value={element.sector}
              onChange={(e) => onSave({ sector: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Equipe</Label>
            <Input
              value={element.team ?? ""}
              onChange={(e) => onSave({ team: e.target.value || undefined })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Largura</Label>
              <Input
                type="number"
                min={32}
                value={Math.round(element.width)}
                onChange={(e) => {
                  const width = Number(e.target.value);
                  if (!Number.isFinite(width)) return;
                  onSave(clampElementBounds(element, { width }));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Altura</Label>
              <Input
                type="number"
                min={24}
                value={Math.round(element.height)}
                onChange={(e) => {
                  const height = Number(e.target.value);
                  if (!Number.isFinite(height)) return;
                  onSave(clampElementBounds(element, { height }));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Posição X</Label>
              <Input
                type="number"
                value={Math.round(element.x)}
                onChange={(e) => {
                  const x = Number(e.target.value);
                  if (!Number.isFinite(x)) return;
                  onSave(clampElementBounds(element, { x }));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Posição Y</Label>
              <Input
                type="number"
                value={Math.round(element.y)}
                onChange={(e) => {
                  const y = Number(e.target.value);
                  if (!Number.isFinite(y)) return;
                  onSave(clampElementBounds(element, { y }));
                }}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="gap-1.5 sm:mr-auto"
            onClick={() => {
              onRemove();
              onOpenChange(false);
            }}
          >
            <Trash2 className="h-4 w-4" />
            Remover
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Concluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
