import { describe, it, expect } from "bun:test";
import { RailwayProvider } from "../../../src/providers/railway/provider";

describe("RailwayProvider", () => {
  it("should instantiate with correct name and type", () => {
    const provider = new RailwayProvider("my-railway", "test-token");
    expect(provider.name).toBe("my-railway");
    expect(provider.type).toBe("railway");
  });

  it("should accept optional teamId", () => {
    const provider = new RailwayProvider("my-railway", "test-token", "team-123");
    expect(provider.name).toBe("my-railway");
    expect(provider.type).toBe("railway");
  });

  it("should implement the Provider interface shape", () => {
    const provider = new RailwayProvider("test", "token");

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

    // Compose (should exist but throw)
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

    // Redirects (should exist but throw)
    expect(typeof provider.listRedirects).toBe("function");
    expect(typeof provider.createRedirect).toBe("function");
    expect(typeof provider.updateRedirect).toBe("function");
    expect(typeof provider.deleteRedirect).toBe("function");

    // Security (should exist but throw)
    expect(typeof provider.listSecurity).toBe("function");
    expect(typeof provider.createSecurity).toBe("function");
    expect(typeof provider.updateSecurity).toBe("function");
    expect(typeof provider.deleteSecurity).toBe("function");

    // Certificates (should exist but throw)
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

  it("should throw on unsupported compose operations", async () => {
    const provider = new RailwayProvider("test", "token");
    await expect(provider.createCompose({ name: "stack", environmentId: "env-1" })).rejects.toThrow("Railway does not support compose services");
    await expect(provider.getCompose("id")).rejects.toThrow("Railway does not support compose services");
    await expect(provider.listCompose("id")).rejects.toThrow("Railway does not support compose services");
    await expect(provider.updateCompose("id", {})).rejects.toThrow("Railway does not support compose services");
    await expect(provider.deleteCompose("id")).rejects.toThrow("Railway does not support compose services");
  });

  it("should throw on unsupported redirect operations", async () => {
    const provider = new RailwayProvider("test", "token");
    await expect(provider.createRedirect({ regex: ".*", replacement: "/", permanent: true, applicationId: "a" })).rejects.toThrow("Railway does not support redirects");
    await expect(provider.listRedirects("id")).rejects.toThrow("Railway does not support redirects");
    await expect(provider.updateRedirect("id", {})).rejects.toThrow("Railway does not support redirects");
    await expect(provider.deleteRedirect("id")).rejects.toThrow("Railway does not support redirects");
  });

  it("should throw on unsupported security operations", async () => {
    const provider = new RailwayProvider("test", "token");
    await expect(provider.createSecurity({ username: "u", password: "p", applicationId: "a" })).rejects.toThrow("Railway does not support basic auth");
    await expect(provider.listSecurity("id")).rejects.toThrow("Railway does not support basic auth");
    await expect(provider.updateSecurity("id", {})).rejects.toThrow("Railway does not support basic auth");
    await expect(provider.deleteSecurity("id")).rejects.toThrow("Railway does not support basic auth");
  });

  it("should throw on unsupported certificate operations", async () => {
    const provider = new RailwayProvider("test", "token");
    await expect(provider.createCertificate({ name: "c", certificateData: "d", privateKey: "k" })).rejects.toThrow("Railway does not support manual certificates");
    await expect(provider.listCertificates()).rejects.toThrow("Railway does not support manual certificates");
    await expect(provider.deleteCertificate("id")).rejects.toThrow("Railway does not support manual certificates");
  });

  it("should throw for unsupported database types", async () => {
    const provider = new RailwayProvider("test", "token");
    (provider as any)._projectId = "proj-1";
    await expect(
      provider.createDatabase({ name: "cache", type: "cassandra", environmentId: "env-1" })
    ).rejects.toThrow("Unsupported database type for Railway: cassandra");
  });

  it("should have setProjectId helper", () => {
    const provider = new RailwayProvider("test", "token");
    provider.setProjectId("proj-123");
    expect((provider as any)._projectId).toBe("proj-123");
  });
});
