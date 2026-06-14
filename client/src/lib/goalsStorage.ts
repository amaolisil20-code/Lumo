import type { ProductionGoal, RoleGoal } from "@/types/goals";

const PRODUCTION_KEY = "lumo-production-goals";
const ROLE_KEY = "lumo-role-goals";

export function loadProductionGoals(): ProductionGoal[] {
  try {
    const stored = localStorage.getItem(PRODUCTION_KEY);
    if (stored) return JSON.parse(stored) as ProductionGoal[];
  } catch {
    // ignore
  }
  return [];
}

export function saveProductionGoals(goals: ProductionGoal[]): void {
  localStorage.setItem(PRODUCTION_KEY, JSON.stringify(goals));
}

export function loadRoleGoals(): RoleGoal[] {
  try {
    const stored = localStorage.getItem(ROLE_KEY);
    if (stored) return JSON.parse(stored) as RoleGoal[];
  } catch {
    // ignore
  }
  return [];
}

export function saveRoleGoals(goals: RoleGoal[]): void {
  localStorage.setItem(ROLE_KEY, JSON.stringify(goals));
}
