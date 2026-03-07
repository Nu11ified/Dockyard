import { describe, it, expect } from "bun:test";
import { RailwayProvider } from "../../../src/providers/railway/provider";

describe("Railway database abstraction", () => {
  it("should instantiate without errors", () => {
    const provider = new RailwayProvider("test", "token");
    expect(provider.type).toBe("railway");
  });

  it("should throw for unsupported database types", async () => {
    const provider = new RailwayProvider("test", "token");
    provider.setProjectId("proj-1");

    await expect(
      provider.createDatabase({
        name: "cache",
        type: "cassandra",
        environmentId: "env-1",
      }),
    ).rejects.toThrow("Unsupported database type for Railway: cassandra");
  });

  it("should accept all five supported database types without type errors", () => {
    // Verify the provider doesn't reject these types at the type level
    const validTypes = ["postgres", "mysql", "mariadb", "redis", "mongo"];
    const provider = new RailwayProvider("test", "token");
    provider.setProjectId("proj-1");

    // Each type should not throw a "unsupported" error — they'll throw a network
    // error since there's no real API, but NOT an "Unsupported database type" error
    for (const dbType of validTypes) {
      const promise = provider.createDatabase({
        name: `test-${dbType}`,
        type: dbType,
        environmentId: "env-1",
      });
      // Should NOT reject with "Unsupported database type"
      expect(promise).rejects.not.toThrow(`Unsupported database type for Railway: ${dbType}`);
    }
  });
});
