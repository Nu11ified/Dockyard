import { describe, it, expect } from "bun:test";
import { Reconciler } from "../../src/core/reconciler";
import { orderActions } from "../../src/core/dependency";

describe("Reconciler", () => {
  it("produces create actions for new resources", () => {
    const desired = [
      { key: "application:api", type: "application", config: { name: "api" } },
      { key: "database:pg", type: "database", config: { name: "pg", type: "postgres" } },
    ];
    const plan = Reconciler.diff(desired, {});
    expect(plan).toHaveLength(2);
    expect(plan.every(a => a.action === "create")).toBe(true);
  });

  it("produces delete actions for removed resources", () => {
    const plan = Reconciler.diff([], { "application:old": { remoteId: "old-id" } });
    expect(plan).toHaveLength(1);
    expect(plan[0].action).toBe("delete");
    expect(plan[0].key).toBe("application:old");
  });

  it("produces update actions for existing resources", () => {
    const desired = [{ key: "application:api", type: "application", config: { name: "api", replicas: 3 } }];
    const plan = Reconciler.diff(desired, { "application:api": { remoteId: "a1" } });
    expect(plan).toHaveLength(1);
    expect(plan[0].action).toBe("update");
    expect(plan[0].remoteId).toBe("a1");
  });

  it("produces no actions when nothing changed", () => {
    const plan = Reconciler.diff([], {});
    expect(plan).toHaveLength(0);
  });
});

describe("orderActions", () => {
  it("orders creates by dependency (project → environment → database → application)", () => {
    const actions = [
      { action: "create" as const, key: "application:api", type: "application", config: {} },
      { action: "create" as const, key: "project:app", type: "project", config: {} },
      { action: "create" as const, key: "database:pg", type: "database", config: {} },
      { action: "create" as const, key: "environment:staging", type: "environment", config: {} },
    ];
    const ordered = orderActions(actions);
    expect(ordered[0].type).toBe("project");
    expect(ordered[1].type).toBe("environment");
    expect(ordered[2].type).toBe("database");
    expect(ordered[3].type).toBe("application");
  });

  it("puts deletes after creates/updates", () => {
    const actions = [
      { action: "delete" as const, key: "application:old", type: "application", remoteId: "x" },
      { action: "create" as const, key: "application:new", type: "application", config: {} },
    ];
    const ordered = orderActions(actions);
    expect(ordered[0].action).toBe("create");
    expect(ordered[1].action).toBe("delete");
  });

  it("orders deletes in reverse dependency (security → application → environment → project)", () => {
    const actions = [
      { action: "delete" as const, key: "project:app", type: "project", remoteId: "p" },
      { action: "delete" as const, key: "application:api", type: "application", remoteId: "a" },
      { action: "delete" as const, key: "security:auth", type: "security", remoteId: "s" },
      { action: "delete" as const, key: "environment:staging", type: "environment", remoteId: "e" },
    ];
    const ordered = orderActions(actions);
    expect(ordered[0].type).toBe("security");
    expect(ordered[1].type).toBe("application");
    expect(ordered[2].type).toBe("environment");
    expect(ordered[3].type).toBe("project");
  });
});
