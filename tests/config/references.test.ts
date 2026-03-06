import { describe, it, expect } from "bun:test";
import { resolveReferences } from "../../src/config/references";

describe("resolveReferences", () => {
  it("resolves database connection string references", () => {
    const env = {
      DATABASE_URL: "${{db.postgres.connectionString}}",
      REDIS_URL: "${{db.cache.connectionString}}",
      STATIC: "hello",
    };
    const context = {
      databases: {
        postgres: { connectionString: "postgres://user:pass@host:5432/db" },
        cache: { connectionString: "redis://host:6379" },
      },
    };
    const resolved = resolveReferences(env, context);
    expect(resolved.DATABASE_URL).toBe("postgres://user:pass@host:5432/db");
    expect(resolved.REDIS_URL).toBe("redis://host:6379");
    expect(resolved.STATIC).toBe("hello");
  });

  it("throws on unresolved reference", () => {
    const env = { URL: "${{db.missing.connectionString}}" };
    expect(() => resolveReferences(env, { databases: {} })).toThrow("Unresolved reference");
  });

  it("handles no references", () => {
    const env = { FOO: "bar" };
    const resolved = resolveReferences(env, { databases: {} });
    expect(resolved.FOO).toBe("bar");
  });

  it("resolves multiple references in one value", () => {
    const env = { COMBO: "${{db.pg.host}}:${{db.pg.port}}" };
    const context = { databases: { pg: { host: "localhost", port: 5432 } } };
    const resolved = resolveReferences(env, context);
    expect(resolved.COMBO).toBe("localhost:5432");
  });
});
