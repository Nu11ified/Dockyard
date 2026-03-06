import { DokployClient } from "./client.js";
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
} from "../provider.js";

const DB_TYPES = ["postgres", "mysql", "mariadb", "redis", "mongo"] as const;
type DbType = (typeof DB_TYPES)[number];

const DB_ID_FIELD: Record<DbType, string> = {
  postgres: "postgresId",
  mysql: "mysqlId",
  mariadb: "mariadbId",
  redis: "redisId",
  mongo: "mongoId",
};

export class DokployProvider implements Provider {
  readonly name: string;
  readonly type = "dokploy";
  private client: DokployClient;

  constructor(name: string, url: string, apiKey: string) {
    this.name = name;
    this.client = new DokployClient(url, apiKey);
  }

  // ── Projects ──────────────────────────────────────────────────────

  async getProject(id: string): Promise<RemoteProject | null> {
    try {
      return await this.client.post<RemoteProject>("project.one", { projectId: id });
    } catch {
      return null;
    }
  }

  async listProjects(): Promise<RemoteProject[]> {
    return this.client.get<RemoteProject[]>("project.all");
  }

  async createProject(config: { name: string; description?: string }): Promise<RemoteProject> {
    return this.client.post<RemoteProject>("project.create", config);
  }

  async updateProject(id: string, config: Partial<{ name: string; description?: string }>): Promise<void> {
    await this.client.post("project.update", { projectId: id, ...config });
  }

  async deleteProject(id: string): Promise<void> {
    await this.client.post("project.remove", { projectId: id });
  }

  // ── Environments ──────────────────────────────────────────────────

  async getEnvironment(id: string): Promise<RemoteEnvironment | null> {
    try {
      return await this.client.post<RemoteEnvironment>("environment.one", { environmentId: id });
    } catch {
      return null;
    }
  }

  async listEnvironments(projectId: string): Promise<RemoteEnvironment[]> {
    return this.client.post<RemoteEnvironment[]>("environment.byProjectId", { projectId });
  }

  async createEnvironment(config: { name: string; description?: string; projectId: string }): Promise<RemoteEnvironment> {
    return this.client.post<RemoteEnvironment>("environment.create", config);
  }

  async updateEnvironment(id: string, config: Partial<{ name: string; description?: string }>): Promise<void> {
    await this.client.post("environment.update", { environmentId: id, ...config });
  }

  async deleteEnvironment(id: string): Promise<void> {
    await this.client.post("environment.remove", { environmentId: id });
  }

  // ── Applications ──────────────────────────────────────────────────

  async getApplication(id: string): Promise<RemoteApplication | null> {
    try {
      return await this.client.post<RemoteApplication>("application.one", { applicationId: id });
    } catch {
      return null;
    }
  }

  async listApplications(environmentId: string): Promise<RemoteApplication[]> {
    const results = await this.client.post<RemoteApplication[]>("application.search", { environmentId });
    return results;
  }

  async createApplication(config: { name: string; environmentId: string; serverId?: string }): Promise<RemoteApplication> {
    return this.client.post<RemoteApplication>("application.create", {
      name: config.name,
      appName: config.name.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      environmentId: config.environmentId,
      ...(config.serverId ? { serverId: config.serverId } : {}),
    });
  }

  async updateApplication(id: string, config: Record<string, unknown>): Promise<void> {
    await this.client.post("application.update", { applicationId: id, ...config });
  }

  async deleteApplication(id: string): Promise<void> {
    await this.client.post("application.delete", { applicationId: id });
  }

  // ── Databases ─────────────────────────────────────────────────────

  async getDatabase(id: string): Promise<RemoteDatabase | null> {
    // Try each database type since the ID field differs per type
    for (const dbType of DB_TYPES) {
      try {
        const idField = DB_ID_FIELD[dbType];
        const result = await this.client.post<RemoteDatabase>(`${dbType}.one`, { [idField]: id });
        if (result) {
          return { ...result, _dbType: dbType };
        }
      } catch {
        // Not this type, try next
      }
    }
    return null;
  }

  async listDatabases(environmentId: string): Promise<RemoteDatabase[]> {
    const all: RemoteDatabase[] = [];
    for (const dbType of DB_TYPES) {
      try {
        const results = await this.client.post<RemoteDatabase[]>(`${dbType}.search`, { environmentId });
        all.push(...results.map((r) => ({ ...r, _dbType: dbType })));
      } catch {
        // Type not available or no results
      }
    }
    return all;
  }

  async createDatabase(config: { name: string; type: string; environmentId: string; [key: string]: unknown }): Promise<RemoteDatabase> {
    const dbType = config.type as DbType;
    const body: Record<string, unknown> = {
      name: config.name,
      appName: config.name.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      environmentId: config.environmentId,
    };

    // Auto-generate credentials if not provided
    if (dbType !== "redis") {
      body.databaseName = config.databaseName ?? config.name.toLowerCase().replace(/[^a-z0-9_]/g, "_");
      body.databaseUser = config.databaseUser ?? `user_${crypto.randomUUID().slice(0, 8)}`;
      body.databasePassword = config.databasePassword ?? crypto.randomUUID();
    }

    if (dbType === "mysql" || dbType === "mariadb") {
      body.databaseRootPassword = config.databaseRootPassword ?? crypto.randomUUID();
    }

    // Copy additional config fields
    for (const [key, value] of Object.entries(config)) {
      if (!["name", "type", "environmentId"].includes(key) && !(key in body)) {
        body[key] = value;
      }
    }

    const result = await this.client.post<RemoteDatabase>(`${dbType}.create`, body);
    return { ...result, _dbType: dbType };
  }

  async updateDatabase(id: string, config: Record<string, unknown>): Promise<void> {
    const dbType = (config._dbType as DbType) ?? (await this.detectDbType(id));
    if (!dbType) {
      throw new Error(`Cannot determine database type for id: ${id}`);
    }
    const { _dbType, ...rest } = config;
    const idField = DB_ID_FIELD[dbType];
    await this.client.post(`${dbType}.update`, { [idField]: id, ...rest });
  }

  async deleteDatabase(id: string): Promise<void> {
    // Try each type
    for (const dbType of DB_TYPES) {
      try {
        const idField = DB_ID_FIELD[dbType];
        await this.client.post(`${dbType}.remove`, { [idField]: id });
        return;
      } catch {
        // Not this type, try next
      }
    }
    throw new Error(`Could not delete database with id: ${id}`);
  }

  private async detectDbType(id: string): Promise<DbType | null> {
    for (const dbType of DB_TYPES) {
      try {
        const idField = DB_ID_FIELD[dbType];
        await this.client.post(`${dbType}.one`, { [idField]: id });
        return dbType;
      } catch {
        // Not this type
      }
    }
    return null;
  }

  // ── Compose ───────────────────────────────────────────────────────

  async getCompose(id: string): Promise<RemoteCompose | null> {
    try {
      return await this.client.post<RemoteCompose>("compose.one", { composeId: id });
    } catch {
      return null;
    }
  }

  async listCompose(environmentId: string): Promise<RemoteCompose[]> {
    return this.client.post<RemoteCompose[]>("compose.search", { environmentId });
  }

  async createCompose(config: { name: string; environmentId: string; [key: string]: unknown }): Promise<RemoteCompose> {
    return this.client.post<RemoteCompose>("compose.create", {
      name: config.name,
      appName: config.name.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      environmentId: config.environmentId,
      ...this.omitKeys(config, ["name", "environmentId"]),
    });
  }

  async updateCompose(id: string, config: Record<string, unknown>): Promise<void> {
    await this.client.post("compose.update", { composeId: id, ...config });
  }

  async deleteCompose(id: string): Promise<void> {
    await this.client.post("compose.delete", { composeId: id });
  }

  // ── Domains ───────────────────────────────────────────────────────

  async listDomains(applicationId: string): Promise<RemoteDomain[]> {
    return this.client.post<RemoteDomain[]>("domain.byApplicationId", { applicationId });
  }

  async createDomain(config: { host: string; applicationId?: string; composeId?: string; [key: string]: unknown }): Promise<RemoteDomain> {
    return this.client.post<RemoteDomain>("domain.create", config);
  }

  async updateDomain(id: string, config: Record<string, unknown>): Promise<void> {
    await this.client.post("domain.update", { domainId: id, ...config });
  }

  async deleteDomain(id: string): Promise<void> {
    await this.client.post("domain.delete", { domainId: id });
  }

  // ── Ports ─────────────────────────────────────────────────────────

  async listPorts(applicationId: string): Promise<RemotePort[]> {
    // Ports come embedded in the application response
    const app = await this.client.post<{ ports?: RemotePort[] }>("application.one", { applicationId });
    return app.ports ?? [];
  }

  async createPort(config: { targetPort: number; publishedPort: number; applicationId: string; protocol?: string; publishMode?: string }): Promise<RemotePort> {
    return this.client.post<RemotePort>("port.create", config);
  }

  async updatePort(id: string, config: Record<string, unknown>): Promise<void> {
    await this.client.post("port.update", { portId: id, ...config });
  }

  async deletePort(id: string): Promise<void> {
    await this.client.post("port.delete", { portId: id });
  }

  // ── Mounts ────────────────────────────────────────────────────────

  async listMounts(serviceId: string, serviceType?: string): Promise<RemoteMount[]> {
    return this.client.post<RemoteMount[]>("mounts.allNamedByApplicationId", {
      applicationId: serviceId,
      ...(serviceType ? { serviceType } : {}),
    });
  }

  async createMount(config: { type: string; mountPath: string; serviceId: string; serviceType?: string; [key: string]: unknown }): Promise<RemoteMount> {
    const { serviceId, ...rest } = config;
    return this.client.post<RemoteMount>("mounts.create", {
      applicationId: serviceId,
      ...rest,
    });
  }

  async updateMount(id: string, config: Record<string, unknown>): Promise<void> {
    await this.client.post("mounts.update", { mountId: id, ...config });
  }

  async deleteMount(id: string): Promise<void> {
    await this.client.post("mounts.remove", { mountId: id });
  }

  // ── Redirects ─────────────────────────────────────────────────────

  async listRedirects(applicationId: string): Promise<RemoteRedirect[]> {
    const app = await this.client.post<{ redirects?: RemoteRedirect[] }>("application.one", { applicationId });
    return app.redirects ?? [];
  }

  async createRedirect(config: { regex: string; replacement: string; permanent: boolean; applicationId: string }): Promise<RemoteRedirect> {
    return this.client.post<RemoteRedirect>("redirects.create", config);
  }

  async updateRedirect(id: string, config: Record<string, unknown>): Promise<void> {
    await this.client.post("redirects.update", { redirectId: id, ...config });
  }

  async deleteRedirect(id: string): Promise<void> {
    await this.client.post("redirects.delete", { redirectId: id });
  }

  // ── Security ──────────────────────────────────────────────────────

  async listSecurity(applicationId: string): Promise<RemoteSecurity[]> {
    const app = await this.client.post<{ security?: RemoteSecurity[] }>("application.one", { applicationId });
    return app.security ?? [];
  }

  async createSecurity(config: { username: string; password: string; applicationId: string }): Promise<RemoteSecurity> {
    return this.client.post<RemoteSecurity>("security.create", config);
  }

  async updateSecurity(id: string, config: Record<string, unknown>): Promise<void> {
    await this.client.post("security.update", { securityId: id, ...config });
  }

  async deleteSecurity(id: string): Promise<void> {
    await this.client.post("security.delete", { securityId: id });
  }

  // ── Certificates ──────────────────────────────────────────────────

  async listCertificates(): Promise<RemoteCertificate[]> {
    return this.client.get<RemoteCertificate[]>("certificates.all");
  }

  async createCertificate(config: { name: string; certificateData: string; privateKey: string; [key: string]: unknown }): Promise<RemoteCertificate> {
    return this.client.post<RemoteCertificate>("certificates.create", config);
  }

  async deleteCertificate(id: string): Promise<void> {
    await this.client.post("certificates.remove", { certificateId: id });
  }

  // ── Registries ────────────────────────────────────────────────────

  async listRegistries(): Promise<RemoteRegistry[]> {
    return this.client.get<RemoteRegistry[]>("registry.all");
  }

  async createRegistry(config: { name: string; url: string; username: string; password: string; [key: string]: unknown }): Promise<RemoteRegistry> {
    return this.client.post<RemoteRegistry>("registry.create", {
      registryName: config.name,
      registryUrl: config.url,
      username: config.username,
      password: config.password,
      registryType: "cloud",
      ...this.omitKeys(config, ["name", "url", "username", "password"]),
    });
  }

  async updateRegistry(id: string, config: Record<string, unknown>): Promise<void> {
    await this.client.post("registry.update", { registryId: id, ...config });
  }

  async deleteRegistry(id: string): Promise<void> {
    await this.client.post("registry.remove", { registryId: id });
  }

  // ── Deployment lifecycle ──────────────────────────────────────────

  async deploy(appId: string, opts?: { title?: string; description?: string }): Promise<DeploymentResult> {
    try {
      await this.client.post("application.deploy", {
        applicationId: appId,
        ...(opts?.title ? { title: opts.title } : {}),
        ...(opts?.description ? { description: opts.description } : {}),
      });
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async rollback(appId: string, deploymentId?: string): Promise<void> {
    await this.client.post("application.redeploy", {
      applicationId: appId,
      ...(deploymentId ? { deploymentId } : {}),
    });
  }

  async stop(appId: string): Promise<void> {
    await this.client.post("application.stop", { applicationId: appId });
  }

  async start(appId: string): Promise<void> {
    await this.client.post("application.start", { applicationId: appId });
  }

  // ── Helpers ───────────────────────────────────────────────────────

  private omitKeys(obj: Record<string, unknown>, keys: string[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (!keys.includes(key)) {
        result[key] = value;
      }
    }
    return result;
  }
}
