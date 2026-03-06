import { describe, it, expect } from "bun:test";
import { DokployClient } from "../../../src/providers/dokploy/client";

describe("DokployClient", () => {
  it("should construct with url and apiKey", () => {
    const client = new DokployClient("https://dokploy.example.com", "test-api-key");
    expect(client).toBeDefined();
    expect(client).toBeInstanceOf(DokployClient);
  });

  it("should strip trailing slash from base URL", () => {
    const client = new DokployClient("https://dokploy.example.com/", "key");
    // Access private buildUrl via casting to test URL construction
    const url = (client as any)["buildUrl"]("project.all");
    expect(url).toBe("https://dokploy.example.com/api/project.all");
  });

  it("should build correct URL for endpoints", () => {
    const client = new DokployClient("https://dokploy.example.com", "key");
    const url = (client as any)["buildUrl"]("application.create");
    expect(url).toBe("https://dokploy.example.com/api/application.create");
  });

  it("should include correct headers with api key", () => {
    const client = new DokployClient("https://dokploy.example.com", "my-secret-key");
    const headers = (client as any)["headers"];
    expect(headers).toEqual({
      "Content-Type": "application/json",
      "x-api-key": "my-secret-key",
    });
  });

  it("should handle URLs without trailing slash", () => {
    const client = new DokployClient("https://dokploy.example.com", "key");
    const url = (client as any)["buildUrl"]("project.one");
    expect(url).toBe("https://dokploy.example.com/api/project.one");
  });

  it("should handle nested endpoints", () => {
    const client = new DokployClient("https://dokploy.example.com", "key");
    const url = (client as any)["buildUrl"]("mounts.allNamedByApplicationId");
    expect(url).toBe("https://dokploy.example.com/api/mounts.allNamedByApplicationId");
  });
});
