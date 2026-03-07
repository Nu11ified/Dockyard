import { describe, it, expect } from "bun:test";
import { createProvider } from "../../src/cli/engine";

describe("createProvider", () => {
  it("should create a DokployProvider for type dokploy", () => {
    const provider = createProvider("my-dokploy", {
      type: "dokploy",
      url: "https://dokploy.example.com",
      apiKey: "test-key",
    });
    expect(provider.name).toBe("my-dokploy");
    expect(provider.type).toBe("dokploy");
  });

  it("should create a RailwayProvider for type railway", () => {
    const provider = createProvider("my-railway", {
      type: "railway",
      token: "test-token",
    });
    expect(provider.name).toBe("my-railway");
    expect(provider.type).toBe("railway");
  });

  it("should create a RailwayProvider with optional teamId", () => {
    const provider = createProvider("my-railway", {
      type: "railway",
      token: "test-token",
      teamId: "team-123",
    });
    expect(provider.name).toBe("my-railway");
    expect(provider.type).toBe("railway");
  });

  it("should throw on unknown provider type", () => {
    expect(() => createProvider("bad", { type: "unknown" })).toThrow(
      'Unknown provider type: "unknown". Supported types: dokploy, railway',
    );
  });
});
