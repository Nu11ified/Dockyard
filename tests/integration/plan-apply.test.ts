import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { Reconciler } from "../../src/core/reconciler";
import { StateManager } from "../../src/core/state";
import { orderActions } from "../../src/core/dependency";
import { rmSync, mkdirSync } from "fs";

const TEST_DIR = "/tmp/dac-integration-test";

describe("Plan/Apply integration", () => {
  beforeEach(() => mkdirSync(TEST_DIR, { recursive: true }));
  afterEach(() => rmSync(TEST_DIR, { recursive: true, force: true }));

  it("full lifecycle: create → update → delete", () => {
    const state = new StateManager(TEST_DIR);

    // Step 1: Initial create — all new resources
    const desired1 = [
      { key: "project:app", type: "project", config: { name: "app" } },
      { key: "environment:staging", type: "environment", config: { name: "staging" } },
      { key: "database:pg", type: "database", config: { name: "pg", type: "postgres" } },
      { key: "application:api", type: "application", config: { name: "api" } },
    ];
    const plan1 = orderActions(Reconciler.diff(desired1, {}));
    expect(plan1).toHaveLength(4);
    expect(plan1.every(a => a.action === "create")).toBe(true);
    // Verify ordering: project → environment → database → application
    expect(plan1[0].type).toBe("project");
    expect(plan1[1].type).toBe("environment");
    expect(plan1[2].type).toBe("database");
    expect(plan1[3].type).toBe("application");

    // Simulate apply
    for (const action of plan1) {
      state.setResource("staging", "dokploy", action.key, { remoteId: `id-${action.key}` });
    }
    state.save();

    // Step 2: Update — add worker, remove database
    const desired2 = [
      { key: "project:app", type: "project", config: { name: "app" } },
      { key: "environment:staging", type: "environment", config: { name: "staging" } },
      { key: "application:api", type: "application", config: { name: "api", replicas: 3 } },
      { key: "application:worker", type: "application", config: { name: "worker" } },
    ];
    const state2 = new StateManager(TEST_DIR);
    const current2 = state2.listResources("staging");
    const plan2 = orderActions(Reconciler.diff(desired2, current2));

    const creates = plan2.filter(a => a.action === "create");
    const updates = plan2.filter(a => a.action === "update");
    const deletes = plan2.filter(a => a.action === "delete");

    expect(creates).toHaveLength(1); // worker
    expect(creates[0].key).toBe("application:worker");
    expect(updates).toHaveLength(3); // project, environment, api
    expect(deletes).toHaveLength(1); // database:pg
    expect(deletes[0].key).toBe("database:pg");

    // Verify deletes come after creates/updates
    const deleteIndex = plan2.findIndex(a => a.action === "delete");
    const lastNonDeleteIndex = plan2.map((a, i) => a.action !== "delete" ? i : -1).filter(i => i >= 0).pop()!;
    expect(deleteIndex).toBeGreaterThan(lastNonDeleteIndex);
  });

  it("state persists across manager instances", () => {
    const sm1 = new StateManager(TEST_DIR);
    sm1.setResource("prod", "railway", "project:myapp", { remoteId: "r-123" });
    sm1.setResource("prod", "railway", "application:web", { remoteId: "r-456" });
    sm1.save();

    const sm2 = new StateManager(TEST_DIR);
    expect(sm2.getResource("prod", "project:myapp")?.remoteId).toBe("r-123");
    expect(sm2.getResource("prod", "application:web")?.remoteId).toBe("r-456");

    sm2.removeResource("prod", "application:web");
    sm2.save();

    const sm3 = new StateManager(TEST_DIR);
    expect(sm3.getResource("prod", "application:web")).toBeUndefined();
    expect(sm3.getResource("prod", "project:myapp")?.remoteId).toBe("r-123");
  });

  it("empty desired state produces only deletes", () => {
    const state = new StateManager(TEST_DIR);
    state.setResource("s", "dokploy", "application:old", { remoteId: "1" });
    state.setResource("s", "dokploy", "database:old", { remoteId: "2" });
    state.save();

    const state2 = new StateManager(TEST_DIR);
    const plan = orderActions(Reconciler.diff([], state2.listResources("s")));
    expect(plan).toHaveLength(2);
    expect(plan.every(a => a.action === "delete")).toBe(true);
    // Deletes are in reverse type order: application (5) > database (4)
    // So application deletes before database
    expect(plan[0].type).toBe("application");
    expect(plan[1].type).toBe("database");
  });
});
