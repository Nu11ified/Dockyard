import { describe, it, expect } from "bun:test";
import { DokployProvider } from "../../../src/providers/dokploy/provider";

describe("DokployProvider", () => {
  it("should instantiate with correct name and type", () => {
    const provider = new DokployProvider("my-server", "https://dokploy.example.com", "test-key");
    expect(provider.name).toBe("my-server");
    expect(provider.type).toBe("dokploy");
  });

  it("should implement the Provider interface shape", () => {
    const provider = new DokployProvider("test", "https://dokploy.example.com", "key");

    // Verify all expected methods exist
    // Projects
    expect(typeof provider.getProject).toBe("function");
    expect(typeof provider.listProjects).toBe("function");
    expect(typeof provider.createProject).toBe("function");
    expect(typeof provider.updateProject).toBe("function");
    expect(typeof provider.deleteProject).toBe("function");

    // Environments
    expect(typeof provider.getEnvironment).toBe("function");
    expect(typeof provider.listEnvironments).toBe("function");
    expect(typeof provider.createEnvironment).toBe("function");
    expect(typeof provider.updateEnvironment).toBe("function");
    expect(typeof provider.deleteEnvironment).toBe("function");

    // Applications
    expect(typeof provider.getApplication).toBe("function");
    expect(typeof provider.listApplications).toBe("function");
    expect(typeof provider.createApplication).toBe("function");
    expect(typeof provider.updateApplication).toBe("function");
    expect(typeof provider.deleteApplication).toBe("function");

    // Databases
    expect(typeof provider.getDatabase).toBe("function");
    expect(typeof provider.listDatabases).toBe("function");
    expect(typeof provider.createDatabase).toBe("function");
    expect(typeof provider.updateDatabase).toBe("function");
    expect(typeof provider.deleteDatabase).toBe("function");

    // Compose
    expect(typeof provider.getCompose).toBe("function");
    expect(typeof provider.listCompose).toBe("function");
    expect(typeof provider.createCompose).toBe("function");
    expect(typeof provider.updateCompose).toBe("function");
    expect(typeof provider.deleteCompose).toBe("function");

    // Domains
    expect(typeof provider.listDomains).toBe("function");
    expect(typeof provider.createDomain).toBe("function");
    expect(typeof provider.updateDomain).toBe("function");
    expect(typeof provider.deleteDomain).toBe("function");

    // Ports
    expect(typeof provider.listPorts).toBe("function");
    expect(typeof provider.createPort).toBe("function");
    expect(typeof provider.updatePort).toBe("function");
    expect(typeof provider.deletePort).toBe("function");

    // Mounts
    expect(typeof provider.listMounts).toBe("function");
    expect(typeof provider.createMount).toBe("function");
    expect(typeof provider.updateMount).toBe("function");
    expect(typeof provider.deleteMount).toBe("function");

    // Redirects
    expect(typeof provider.listRedirects).toBe("function");
    expect(typeof provider.createRedirect).toBe("function");
    expect(typeof provider.updateRedirect).toBe("function");
    expect(typeof provider.deleteRedirect).toBe("function");

    // Security
    expect(typeof provider.listSecurity).toBe("function");
    expect(typeof provider.createSecurity).toBe("function");
    expect(typeof provider.updateSecurity).toBe("function");
    expect(typeof provider.deleteSecurity).toBe("function");

    // Certificates
    expect(typeof provider.listCertificates).toBe("function");
    expect(typeof provider.createCertificate).toBe("function");
    expect(typeof provider.deleteCertificate).toBe("function");

    // Registries
    expect(typeof provider.listRegistries).toBe("function");
    expect(typeof provider.createRegistry).toBe("function");
    expect(typeof provider.updateRegistry).toBe("function");
    expect(typeof provider.deleteRegistry).toBe("function");

    // Deployment lifecycle
    expect(typeof provider.deploy).toBe("function");
    expect(typeof provider.rollback).toBe("function");
    expect(typeof provider.stop).toBe("function");
    expect(typeof provider.start).toBe("function");
  });

  it("should allow different provider names", () => {
    const p1 = new DokployProvider("prod-server", "https://prod.example.com", "key1");
    const p2 = new DokployProvider("staging-server", "https://staging.example.com", "key2");

    expect(p1.name).toBe("prod-server");
    expect(p2.name).toBe("staging-server");
    expect(p1.type).toBe("dokploy");
    expect(p2.type).toBe("dokploy");
  });
});
