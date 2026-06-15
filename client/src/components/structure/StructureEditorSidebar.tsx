import { MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { STRUCTURE_PALETTE, getElementIcon } from "@/lib/structureEditorTools";
import { DRAG_MIME, serializeDragPayload } from "@/lib/structureDrag";
import { cn } from "@/lib/utils";
import type { StructureElement, StructureElementType } from "@/types/structure";

interface StructureEditorSidebarProps {
  elements: StructureElement[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string) => void;
  onAddElement: (type: StructureElementType) => void;
}

export default function StructureEditorSidebar({
  elements,
  selectedId,
  onSelect,
  onRemove,
  onEdit,
  onAddElement,
}: StructureEditorSidebarProps) {
  const layers = [...elements].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <aside className="lumo-panel-sm flex h-full min-h-0 w-[200px] shrink-0 flex-col overflow-hidden border-r-0">
      <div className="shrink-0 border-b border-border/50 px-3 py-2.5">
        <p className="text-sm font-semibold text-foreground">Elementos</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Arraste os elementos para o layout
        </p>
        <div className="mt-2 max-h-[min(200px,28vh)] space-y-1 overflow-y-auto">
          {STRUCTURE_PALETTE.map((tool) => (
            <button
              key={tool.id}
              type="button"
              draggable
              onClick={() => onAddElement(tool.elementType)}
              onDragStart={(e) => {
                e.dataTransfer.setData(
                  DRAG_MIME,
                  serializeDragPayload(tool.elementType, tool.label)
                );
                e.dataTransfer.effectAllowed = "copy";
              }}
              className="flex w-full cursor-grab items-center gap-2 rounded-md border border-transparent px-2 py-2 text-left text-sm hover:border-border/60 hover:bg-muted/40 active:cursor-grabbing"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted/60">
                <tool.icon className="h-4 w-4 text-blue-600" />
              </span>
              {tool.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-border/50 px-3 py-2">
          <p className="text-sm font-semibold text-foreground">Camadas</p>
          {layers.length > 0 && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {layers.length} no layout
            </p>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {layers.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">
              Nenhum elemento no layout
            </p>
          ) : (
            <div className="space-y-0.5">
              {layers.map((element) => {
                const Icon = getElementIcon(element.type);
                return (
                  <div
                    key={element.id}
                    className={cn(
                      "group flex items-center gap-1.5 rounded-md px-2 py-2 text-sm",
                      selectedId === element.id
                        ? "bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200"
                        : "hover:bg-muted/40"
                    )}
                  >
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      onClick={() => onSelect(element.id)}
                    >
                      <Icon className="h-4 w-4 shrink-0 opacity-70" />
                      <span className="truncate">{element.label}</span>
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded text-destructive hover:bg-destructive/10",
                        selectedId === element.id
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100"
                      )}
                      onClick={() => onRemove(element.id)}
                      title="Excluir elemento"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(element.id)}>
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => onRemove(element.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
