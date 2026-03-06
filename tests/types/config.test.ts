import { describe, it, expect } from "bun:test";
import { DacConfigSchema } from "../../src/types/config";

describe("DacConfigSchema", () => {
  it("validates a minimal valid config", () => {
    const config = {
      providers: { staging: { type: "dokploy", url: "https://dok.example.com", apiKey: "key123" } },
      project: { name: "my-app" },
      environments: { staging: { provider: "staging", applications: [] } },
    };
    expect(DacConfigSchema.safeParse(config).success).toBe(true);
  });

  it("rejects config missing project name", () => {
    const config = {
      providers: { staging: { type: "dokploy", url: "https://dok.example.com", apiKey: "key123" } },
      project: {},
      environments: {},
    };
    expect(DacConfigSchema.safeParse(config).success).toBe(false);
  });

  it("validates full config with applications, databases, domains", () => {
    const config = {
      providers: { staging: { type: "dokploy", url: "https://dok.example.com", apiKey: "key123" } },
      project: { name: "my-saas", description: "My app" },
      environments: {
        staging: {
          provider: "staging",
          applications: [{
            name: "api",
            source: { type: "github", repo: "me/api", branch: "main", owner: "me" },
            build: { type: "dockerfile", context: "." },
            domains: [{ host: "api.example.com", https: true }],
            env: { NODE_ENV: "production" },
            ports: [{ container: 3000 }],
          }],
          databases: [
            { name: "db", type: "postgres", version: "16" },
            { name: "cache", type: "redis" },
          ],
        },
      },
    };
    expect(DacConfigSchema.safeParse(config).success).toBe(true);
  });

  it("validates docker source type", () => {
    const config = {
      providers: { s: { type: "dokploy", url: "https://x.com", apiKey: "k" } },
      project: { name: "test" },
      environments: {
        s: {
          provider: "s",
          applications: [{
            name: "app",
            source: { type: "docker", image: "nginx:latest" },
            build: { type: "dockerfile" },
          }],
        },
      },
    };
    expect(DacConfigSchema.safeParse(config).success).toBe(true);
  });

  it("validates compose with raw source", () => {
    const config = {
      providers: { s: { type: "dokploy", url: "https://x.com", apiKey: "k" } },
      project: { name: "test" },
      environments: {
        s: {
          provider: "s",
          compose: [{
            name: "stack",
            source: { type: "raw", content: "version: '3'\nservices:\n  web:\n    image: nginx" },
          }],
        },
      },
    };
    expect(DacConfigSchema.safeParse(config).success).toBe(true);
  });
});
