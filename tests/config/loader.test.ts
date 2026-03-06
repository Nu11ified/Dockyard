import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { loadConfig } from "../../src/config/loader";
import { writeFileSync, mkdirSync, rmSync } from "fs";

const TEST_DIR = "/tmp/dac-test-config";

describe("loadConfig", () => {
  beforeEach(() => mkdirSync(TEST_DIR, { recursive: true }));
  afterEach(() => rmSync(TEST_DIR, { recursive: true, force: true }));

  it("loads and validates a dac.config.ts file", async () => {
    writeFileSync(
      `${TEST_DIR}/dac.config.ts`,
      `
      export default {
        providers: { staging: { type: "dokploy", url: "https://x.com", apiKey: "k" } },
        project: { name: "test" },
        environments: {
          staging: { provider: "staging", applications: [] },
        },
      };
    `
    );
    const config = await loadConfig(TEST_DIR);
    expect(config.project.name).toBe("test");
  });

  it("throws on invalid config", async () => {
    writeFileSync(
      `${TEST_DIR}/dac.config.ts`,
      `export default { project: {} };`
    );
    expect(loadConfig(TEST_DIR)).rejects.toThrow();
  });

  it("throws if no config file found", async () => {
    expect(loadConfig(TEST_DIR + "/nonexistent")).rejects.toThrow();
  });
});
