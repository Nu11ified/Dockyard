import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { StateManager } from "../../src/core/state";
import { rmSync, mkdirSync, existsSync } from "fs";

const TEST_DIR = "/tmp/dac-test-state";

describe("StateManager", () => {
  beforeEach(() => { mkdirSync(TEST_DIR, { recursive: true }); });
  afterEach(() => { rmSync(TEST_DIR, { recursive: true, force: true }); });

  it("creates new state if none exists", () => {
    const sm = new StateManager(TEST_DIR);
    const state = sm.load();
    expect(state.version).toBe(1);
    expect(state.providers).toEqual({});
  });

  it("saves and loads state", () => {
    const sm = new StateManager(TEST_DIR);
    sm.setResource("staging", "dokploy", "project:my-app", { remoteId: "abc" });
    sm.save();
    const sm2 = new StateManager(TEST_DIR);
    const state = sm2.load();
    expect(state.providers.staging.resources["project:my-app"].remoteId).toBe("abc");
  });

  it("gets a resource", () => {
    const sm = new StateManager(TEST_DIR);
    sm.setResource("staging", "dokploy", "application:api", { remoteId: "xyz", environmentId: "e1" });
    const res = sm.getResource("staging", "application:api");
    expect(res?.remoteId).toBe("xyz");
  });

  it("removes a resource", () => {
    const sm = new StateManager(TEST_DIR);
    sm.setResource("staging", "dokploy", "db:pg", { remoteId: "d1" });
    sm.removeResource("staging", "db:pg");
    expect(sm.getResource("staging", "db:pg")).toBeUndefined();
  });

  it("lists resources by provider", () => {
    const sm = new StateManager(TEST_DIR);
    sm.setResource("staging", "dokploy", "app:a", { remoteId: "1" });
    sm.setResource("staging", "dokploy", "app:b", { remoteId: "2" });
    const resources = sm.listResources("staging");
    expect(Object.keys(resources)).toHaveLength(2);
  });
});
