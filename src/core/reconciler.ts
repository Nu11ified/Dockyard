export interface DesiredResource {
  key: string;
  type: string;
  config: Record<string, unknown>;
  dependsOn?: string[];
}

export interface PlanAction {
  action: "create" | "update" | "delete";
  key: string;
  type: string;
  remoteId?: string;
  config?: Record<string, unknown>;
}

export class Reconciler {
  static diff(
    desired: DesiredResource[],
    current: Record<string, { remoteId: string }>,
  ): PlanAction[] {
    const actions: PlanAction[] = [];
    const desiredKeys = new Set(desired.map(d => d.key));

    // Creates and updates
    for (const resource of desired) {
      const existing = current[resource.key];
      if (!existing) {
        actions.push({
          action: "create",
          key: resource.key,
          type: resource.type,
          config: resource.config,
        });
      } else {
        actions.push({
          action: "update",
          key: resource.key,
          type: resource.type,
          remoteId: existing.remoteId,
          config: resource.config,
        });
      }
    }

    // Deletes
    for (const [key, value] of Object.entries(current)) {
      if (!desiredKeys.has(key)) {
        const type = key.split(":")[0];
        actions.push({
          action: "delete",
          key,
          type,
          remoteId: value.remoteId,
        });
      }
    }

    return actions;
  }
}
