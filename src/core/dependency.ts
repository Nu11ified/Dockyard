import type { PlanAction } from "./reconciler";

export function orderActions(actions: PlanAction[]): PlanAction[] {
  const typeOrder: Record<string, number> = {
    project: 0,
    environment: 1,
    registry: 2,
    certificate: 3,
    database: 4,
    application: 5,
    compose: 6,
    domain: 7,
    port: 8,
    mount: 9,
    redirect: 10,
    security: 11,
  };

  return [...actions].sort((a, b) => {
    // Deletes go in reverse order
    if (a.action === "delete" && b.action === "delete") {
      return (typeOrder[b.type] ?? 99) - (typeOrder[a.type] ?? 99);
    }
    // Deletes after creates/updates
    if (a.action === "delete") return 1;
    if (b.action === "delete") return -1;
    // Creates/updates in dependency order
    return (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99);
  });
}
