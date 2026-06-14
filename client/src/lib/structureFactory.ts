import { nanoid } from "nanoid";
import type {
  RoomKind,
  StructureElement,
  StructureElementType,
} from "@/types/structure";
import { getCenteredPosition } from "@/lib/structureConstants";

const ROOM_LABELS: Record<RoomKind, string> = {
  meeting: "Sala de Reunião",
  supervision: "Supervisão",
  directorship: "Diretoria",
  hr: "RH",
};

let deskCounter = 0;
let textCounter = 0;
let imageCounter = 0;
let areaCounter = 0;

function nextDeskLabel(): string {
  deskCounter += 1;
  return `Mesa ${deskCounter}`;
}

function nextTextLabel(): string {
  textCounter += 1;
  return `Texto ${textCounter}`;
}

function nextImageLabel(): string {
  imageCounter += 1;
  return `Imagem ${imageCounter}`;
}

function nextAreaLabel(): string {
  areaCounter += 1;
  return `Área ${areaCounter}`;
}

function syncLabelCounter(elements: StructureElement[], pattern: RegExp, setter: (n: number) => void): void {
  let max = 0;
  for (const element of elements) {
    const match = element.label.match(pattern);
    if (match) max = Math.max(max, Number(match[1]));
  }
  setter(max);
}

export function syncDeskCounter(elements: StructureElement[]): void {
  let max = 0;
  for (const element of elements) {
    for (const slot of element.slots) {
      const match = slot.label?.match(/^Mesa\s+(\d+)$/i);
      if (match) max = Math.max(max, Number(match[1]));
    }
    const elMatch = element.label.match(/^Mesa\s+(\d+)$/i);
    if (elMatch) max = Math.max(max, Number(elMatch[1]));
  }
  deskCounter = max;
  syncLabelCounter(elements, /^Texto\s+(\d+)$/i, (n) => {
    textCounter = n;
  });
  syncLabelCounter(elements, /^Imagem\s+(\d+)$/i, (n) => {
    imageCounter = n;
  });
  syncLabelCounter(elements, /^Área\s+(\d+)$/i, (n) => {
    areaCounter = n;
  });
}

export function createStructureElement(
  type: StructureElementType,
  options?: {
    roomKind?: RoomKind;
    sector?: string;
    team?: string;
    label?: string;
    textContent?: string;
    x?: number;
    y?: number;
    placementIndex?: number;
  }
): StructureElement {
  const id = nanoid();
  const sector = options?.sector ?? "Geral";
  const placementIndex = options?.placementIndex ?? 0;

  const zIndexFor = (type: StructureElementType) => {
    if (type === "sector") return 0;
    if (type === "corridor" || type === "wall" || type === "partition") return 1;
    return 2;
  };

  const base = {
    id,
    type,
    sector,
    team: options?.team,
    zIndex: zIndexFor(type),
  };

  const withPosition = (
    element: Omit<StructureElement, "x" | "y"> & { width: number; height: number }
  ): StructureElement => {
    const position =
      options?.x != null && options?.y != null
        ? { x: options.x, y: options.y }
        : getCenteredPosition(element.width, element.height, placementIndex);
    return { ...element, ...position };
  };

  switch (type) {
    case "desk-single": {
      const label = options?.label ?? nextDeskLabel();
      return withPosition({
        ...base,
        width: 152,
        height: 112,
        label,
        slots: [],
      });
    }

    case "desk-double": {
      const label = options?.label ?? "Mesa Dupla";
      return withPosition({
        ...base,
        width: 240,
        height: 108,
        label,
        slots: [],
      });
    }

    case "workstation": {
      const label = options?.label ?? nextDeskLabel();
      return withPosition({
        ...base,
        width: 168,
        height: 120,
        label,
        slots: [],
      });
    }

    case "island": {
      const label = options?.label ?? "Ilha de Atendimento";
      return withPosition({
        ...base,
        width: 300,
        height: 196,
        label,
        slots: [],
      });
    }

    case "room": {
      const roomKind = options?.roomKind ?? "meeting";
      const label = options?.label ?? ROOM_LABELS[roomKind];
      return withPosition({
        ...base,
        width: 200,
        height: 140,
        label,
        roomKind,
        slots: [],
      });
    }

    case "reception":
      return withPosition({
        ...base,
        width: 180,
        height: 120,
        label: options?.label ?? "Recepção",
        slots: [],
      });

    case "bathroom":
      return withPosition({
        ...base,
        width: 120,
        height: 100,
        label: options?.label ?? "Banheiros",
        slots: [],
      });

    case "kitchen":
      return withPosition({
        ...base,
        width: 140,
        height: 110,
        label: options?.label ?? "Copa",
        slots: [],
      });

    case "corridor":
      return withPosition({
        ...base,
        width: 320,
        height: 48,
        label: options?.label ?? "Corredor",
        slots: [],
        zIndex: 1,
      });

    case "wall":
      return withPosition({
        ...base,
        width: 280,
        height: 12,
        label: options?.label ?? "Parede",
        slots: [],
        zIndex: 1,
      });

    case "door":
      return withPosition({
        ...base,
        width: 48,
        height: 48,
        label: options?.label ?? "Porta",
        slots: [],
        zIndex: 1,
      });

    case "printer":
      return withPosition({
        ...base,
        width: 72,
        height: 72,
        label: options?.label ?? "Impressora",
        slots: [],
      });

    case "sector":
      return withPosition({
        ...base,
        width: 420,
        height: 280,
        label: options?.label ?? "Setor",
        slots: [],
        zIndex: 0,
      });

    case "partition":
      return withPosition({
        ...base,
        width: 240,
        height: 10,
        label: options?.label ?? "Divisória",
        slots: [],
        zIndex: 1,
      });

    case "text": {
      const label = options?.label ?? nextTextLabel();
      return withPosition({
        ...base,
        width: 140,
        height: 36,
        label,
        textContent: options?.textContent ?? label,
        slots: [],
      });
    }

    case "image": {
      const label = options?.label ?? nextImageLabel();
      return withPosition({
        ...base,
        width: 88,
        height: 88,
        label,
        slots: [],
      });
    }

    case "area": {
      const label = options?.label ?? nextAreaLabel();
      return withPosition({
        ...base,
        width: 220,
        height: 160,
        label,
        slots: [],
        zIndex: 0,
      });
    }

    default:
      return withPosition({
        ...base,
        width: 152,
        height: 112,
        label: "Elemento",
        slots: [],
      });
  }
}

export { ROOM_LABELS };
