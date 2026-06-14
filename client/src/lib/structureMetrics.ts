import type {
  StructureElement,
  StructureFilterMode,
  StructureLayout,
  StructureSlot,
  PositionStatus,
} from "@/types/structure";

export interface StructureStats {
  total: number;
  occupied: number;
  vacant: number;
  blocked: number;
  unavailable: number;
  occupancyRate: number;
}

export interface SlotRef {
  element: StructureElement;
  slot: StructureSlot;
}

export function getAllSlots(layout: StructureLayout): SlotRef[] {
  const refs: SlotRef[] = [];
  for (const element of layout.elements) {
    for (const slot of element.slots) {
      refs.push({ element, slot });
    }
  }
  return refs;
}

export function computeStructureStats(layout: StructureLayout): StructureStats {
  const slots = getAllSlots(layout);
  const total = slots.length;
  let occupied = 0;
  let vacant = 0;
  let blocked = 0;
  let unavailable = 0;

  for (const { slot } of slots) {
    const effectiveStatus = resolveSlotStatus(slot);
    if (effectiveStatus === "occupied") occupied++;
    else if (effectiveStatus === "vacant") vacant++;
    else if (effectiveStatus === "blocked") blocked++;
    else unavailable++;
  }

  const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;

  return { total, occupied, vacant, blocked, unavailable, occupancyRate };
}

export function resolveSlotStatus(slot: StructureSlot): PositionStatus {
  if (slot.attendantId != null && slot.status !== "blocked" && slot.status !== "unavailable") {
    return "occupied";
  }
  return slot.status;
}

export function collectSectors(layout: StructureLayout): string[] {
  const set = new Set<string>();
  for (const element of layout.elements) {
    if (element.sector) set.add(element.sector);
    for (const slot of element.slots) {
      if (slot.sector) set.add(slot.sector);
    }
  }
  return Array.from(set).sort();
}

export function collectTeams(layout: StructureLayout): string[] {
  const set = new Set<string>();
  for (const element of layout.elements) {
    if (element.team) set.add(element.team);
  }
  return Array.from(set).sort();
}

export function matchesFilter(
  element: StructureElement,
  slot: StructureSlot | null,
  mode: StructureFilterMode,
  filterValue: string
): boolean {
  if (mode === "all") return true;

  if (mode === "vacant") {
    if (slot) return resolveSlotStatus(slot) === "vacant";
    return element.slots.some((s) => resolveSlotStatus(s) === "vacant");
  }

  if (mode === "sector") {
    if (slot) return slot.sector === filterValue || element.sector === filterValue;
    return element.sector === filterValue || element.slots.some((s) => s.sector === filterValue);
  }

  if (mode === "team") {
    return element.team === filterValue;
  }

  return true;
}

export function getOccupancyChartData(stats: StructureStats) {
  return [
    { name: "Ocupadas", value: stats.occupied, fill: "#2563eb" },
    { name: "Vagas", value: stats.vacant, fill: "#94a3b8" },
    { name: "Bloqueadas", value: stats.blocked, fill: "#f87171" },
    { name: "Indisponíveis", value: stats.unavailable, fill: "#fbbf24" },
  ].filter((item) => item.value > 0);
}
