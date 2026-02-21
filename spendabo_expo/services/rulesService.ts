import { RULES } from "./mockData";
import type { Rule } from "../types";

// TODO: Replace with real API calls to Cloud Run backend

export async function getRules(): Promise<Rule[]> {
  // TODO: GET /api/rules
  return [...RULES].sort((a, b) => b.priority - a.priority);
}

export async function toggleRule(id: string, enabled: boolean): Promise<Rule> {
  // TODO: PATCH /api/rules/:id
  const rule = RULES.find((r) => r.id === id);
  if (!rule) throw new Error("Rule not found");
  return { ...rule, enabled };
}

export async function deleteRule(id: string): Promise<void> {
  // TODO: DELETE /api/rules/:id
}
