import { describe, it, expect } from "bun:test";
import type {
  Provider,
  RemoteProject,
  RemoteEnvironment,
  RemoteApplication,
  RemoteDatabase,
  RemoteCompose,
  RemoteDomain,
  RemotePort,
  RemoteMount,
  RemoteRedirect,
  RemoteSecurity,
  RemoteCertificate,
  RemoteRegistry,
  DeploymentResult,
} from "../../src/providers";

function createMockProvider(): Provider {
  const stub = async () => {};
  const stubNull = async () => null;
  const stubList = async () => [];

  return {
    name: "mock",
    type: "mock",

    // Projects
    getProject: stubNull as Provider["getProject"],
    listProjects: stubList as Provider["listProjects"],
    createProject: async (config) => ({ id: "proj-1", name: config.name }),
    updateProject: stub,
    deleteProject: stub,

    // Environments
    getEnvironment: stubNull as Provider["getEnvironment"],
    listEnvironments: stubList as Provider["listEnvironments"],
    createEnvironment: async (config) => ({ id: "env-1", name: config.name }),
    updateEnvironment: stub,
    deleteEnvironment: stub,

    // Applications
    getApplication: stubNull as Provider["getApplication"],
    listApplications: stubList as Provider["listApplications"],
    createApplication: async (config) => ({ id: "app-1", name: config.name }),
    updateApplication: stub,
    deleteApplication: stub,

    // Databases
    getDatabase: stubNull as Provider["getDatabase"],
    listDatabases: stubList as Provider["listDatabases"],
    createDatabase: async (config) => ({ id: "db-1", name: config.name }),
    updateDatabase: stub,
    deleteDatabase: stub,

    // Compose
    getCompose: stubNull as Provider["getCompose"],
    listCompose: stubList as Provider["listCompose"],
    createCompose: async (config) => ({ id: "comp-1", name: config.name }),
    updateCompose: stub,
    deleteCompose: stub,

    // Domains
    listDomains: stubList as Provider["listDomains"],
    createDomain: async (config) => ({ id: "dom-1", host: config.host }),
    updateDomain: stub,
    deleteDomain: stub,

    // Ports
    listPorts: stubList as Provider["listPorts"],
    createPort: async () => ({ id: "port-1" }),
    updatePort: stub,
    deletePort: stub,

    // Mounts
    listMounts: stubList as Provider["listMounts"],
    createMount: async () => ({ id: "mount-1" }),
    updateMount: stub,
    deleteMount: stub,

    // Redirects
    listRedirects: stubList as Provider["listRedirects"],
    createRedirect: async () => ({ id: "redir-1" }),
    updateRedirect: stub,
    deleteRedirect: stub,

    // Security
    listSecurity: stubList as Provider["listSecurity"],
    createSecurity: async () => ({ id: "sec-1" }),
    updateSecurity: stub,
    deleteSecurity: stub,

    // Certificates
    listCertificates: stubList as Provider["listCertificates"],
    createCertificate: async () => ({ id: "cert-1" }),
    deleteCertificate: stub,

    // Registries
    listRegistries: stubList as Provider["listRegistries"],
    createRegistry: async () => ({ id: "reg-1" }),
    updateRegistry: stub,
    deleteRegistry: stub,

    // Deployment lifecycle
    deploy: async () => ({ success: true, buildId: "build-1" }),
    rollback: stub,
    stop: stub,
    start: stub,
  };
}

describe("Provider interface", () => {
  it("should create a mock provider with correct name and type", () => {
    const provider = createMockProvider();
    expect(provider.name).toBe("mock");
    expect(provider.type).toBe("mock");
  });

  it("should have all project CRUD methods", async () => {
    const provider = createMockProvider();
    const project = await provider.createProject({ name: "test-project" });
    expect(project.id).toBe("proj-1");
    expect(project.name).toBe("test-project");

    const fetched = await provider.getProject("proj-1");
    expect(fetched).toBeNull();

    const list = await provider.listProjects();
    expect(list).toEqual([]);

    await provider.updateProject("proj-1", { name: "updated" });
    await provider.deleteProject("proj-1");
  });

  it("should have all environment CRUD methods", async () => {
    const provider = createMockProvider();
    const env = await provider.createEnvironment({ name: "staging", projectId: "proj-1" });
    expect(env.id).toBe("env-1");
    expect(env.name).toBe("staging");

    const fetched = await provider.getEnvironment("env-1");
    expect(fetched).toBeNull();

    const list = await provider.listEnvironments("proj-1");
    expect(list).toEqual([]);
  });

  it("should have all application CRUD methods", async () => {
    const provider = createMockProvider();
    const app = await provider.createApplication({ name: "web-app", environmentId: "env-1" });
    expect(app.id).toBe("app-1");
    expect(app.name).toBe("web-app");

    const fetched = await provider.getApplication("app-1");
    expect(fetched).toBeNull();

    const list = await provider.listApplications("env-1");
    expect(list).toEqual([]);
  });

  it("should have all database CRUD methods", async () => {
    const provider = createMockProvider();
    const db = await provider.createDatabase({ name: "main-db", type: "postgres", environmentId: "env-1" });
    expect(db.id).toBe("db-1");
    expect(db.name).toBe("main-db");
  });

  it("should have all compose CRUD methods", async () => {
    const provider = createMockProvider();
    const compose = await provider.createCompose({ name: "stack", environmentId: "env-1" });
    expect(compose.id).toBe("comp-1");
    expect(compose.name).toBe("stack");
  });

  it("should have all domain CRUD methods", async () => {
    const provider = createMockProvider();
    const domain = await provider.createDomain({ host: "example.com", applicationId: "app-1" });
    expect(domain.id).toBe("dom-1");
    expect(domain.host).toBe("example.com");

    const list = await provider.listDomains("app-1");
    expect(list).toEqual([]);
  });

  it("should have all port CRUD methods", async () => {
    const provider = createMockProvider();
    const port = await provider.createPort({ targetPort: 3000, publishedPort: 80, applicationId: "app-1" });
    expect(port.id).toBe("port-1");
  });

  it("should have all mount CRUD methods", async () => {
    const provider = createMockProvider();
    const mount = await provider.createMount({ type: "volume", mountPath: "/data", serviceId: "app-1" });
    expect(mount.id).toBe("mount-1");
  });

  it("should have all redirect CRUD methods", async () => {
    const provider = createMockProvider();
    const redirect = await provider.createRedirect({
      regex: "^/old/(.*)",
      replacement: "/new/$1",
      permanent: true,
      applicationId: "app-1",
    });
    expect(redirect.id).toBe("redir-1");
  });

  it("should have all security CRUD methods", async () => {
    const provider = createMockProvider();
    const sec = await provider.createSecurity({ username: "admin", password: "secret", applicationId: "app-1" });
    expect(sec.id).toBe("sec-1");
  });

  it("should have certificate methods", async () => {
    const provider = createMockProvider();
    const cert = await provider.createCertificate({
      name: "wildcard",
      certificateData: "cert-data",
      privateKey: "key-data",
    });
    expect(cert.id).toBe("cert-1");

    const list = await provider.listCertificates();
    expect(list).toEqual([]);
  });

  it("should have registry methods", async () => {
    const provider = createMockProvider();
    const reg = await provider.createRegistry({
      name: "docker-hub",
      url: "https://registry.hub.docker.com",
      username: "user",
      password: "pass",
    });
    expect(reg.id).toBe("reg-1");
  });

  it("should have deployment lifecycle methods", async () => {
    const provider = createMockProvider();

    const result = await provider.deploy("app-1", { title: "v1.0" });
    expect(result.success).toBe(true);
    expect(result.buildId).toBe("build-1");

    await provider.rollback("app-1", "build-0");
    await provider.stop("app-1");
    await provider.start("app-1");
  });

  it("should return DeploymentResult with error on failure", async () => {
    const provider = createMockProvider();
    // Override deploy to simulate failure
    provider.deploy = async () => ({ success: false, error: "Build failed" });

    const result = await provider.deploy("app-1");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Build failed");
  });
});
