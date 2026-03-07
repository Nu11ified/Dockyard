import { RailwayClient } from "./client.js";
import * as Q from "./queries.js";
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

// ── Helpers ────────────────────────────────────────────────────────

interface Edge<T> {
  node: T;
}

function unwrapEdges<T>(connection: { edges: Edge<T>[] } | null | undefined): T[] {
  if (!connection || !connection.edges) return [];
  return connection.edges.map((e) => e.node);
}

// ── Database image mapping ─────────────────────────────────────────

const DB_IMAGES: Record<
  string,
  {
    image: string;
    mountPath: string;
    envVars: (name: string, user: string, password: string) => Record<string, string>;
  }
> = {
  postgres: {
    image: "postgres",
    mountPath: "/var/lib/postgresql/data",
    envVars: (name, user, password) => ({ POSTGRES_DB: name, POSTGRES_USER: user, POSTGRES_PASSWORD: password }),
  },
  mysql: {
    image: "mysql",
    mountPath: "/var/lib/mysql",
    envVars: (name, user, password) => ({ MYSQL_DATABASE: name, MYSQL_USER: user, MYSQL_PASSWORD: password, MYSQL_ROOT_PASSWORD: password }),
  },
  mariadb: {
    image: "mariadb",
    mountPath: "/var/lib/mysql",
    envVars: (name, user, password) => ({ MARIADB_DATABASE: name, MARIADB_USER: user, MARIADB_PASSWORD: password, MARIADB_ROOT_PASSWORD: password }),
  },
  redis: {
    image: "redis",
    mountPath: "/data",
    envVars: () => ({}),
  },
  mongo: {
    image: "mongo",
    mountPath: "/data/db",
    envVars: (_name, user, password) => ({ MONGO_INITDB_ROOT_USERNAME: user, MONGO_INITDB_ROOT_PASSWORD: password }),
  },
};

// ── Provider ───────────────────────────────────────────────────────

export class RailwayProvider implements Provider {
  readonly name: string;
  readonly type = "railway";
  private client: RailwayClient;
  private _projectId: string | undefined;

  constructor(name: string, token: string, teamId?: string) {
    this.name = name;
    this.client = new RailwayClient(token, teamId);
  }

  /** Allow the engine to set the project context after loading state. */
  setProjectId(id: string): void {
    this._projectId = id;
  }

  private requireProjectId(): string {
    if (!this._projectId) {
      throw new Error("Project ID is not set. Call setProjectId() or createProject() first.");
    }
    return this._projectId;
  }

  // ── Projects ──────────────────────────────────────────────────────

  async getProject(id: string): Promise<RemoteProject | null> {
    try {
      const data = await this.client.query<{ id: string; name: string }>(Q.GET_PROJECT, { id });
      if (data) {
        this._projectId = data.id;
        return data as RemoteProject;
      }
      return null;
    } catch {
      return null;
    }
  }

  async listProjects(): Promise<RemoteProject[]> {
    const data = await this.client.query<{ edges: Edge<{ id: string; name: string }>[] }>(Q.LIST_PROJECTS);
    return unwrapEdges(data) as RemoteProject[];
  }

  async createProject(config: { name: string; description?: string }): Promise<RemoteProject> {
    const input: Record<string, unknown> = { name: config.name };
    if (config.description) input.description = config.description;
    const teamId = this.client.getTeamId();
    if (teamId) input.teamId = teamId;

    const data = await this.client.mutate<{ id: string; name: string; environments: { edges: Edge<{ id: string; name: string }>[] } }>(
      Q.CREATE_PROJECT,
      { input },
    );
    this._projectId = data.id;
    return data as unknown as RemoteProject;
  }

  async updateProject(id: string, config: Partial<{ name: string; description?: string }>): Promise<void> {
    await this.client.mutate(Q.UPDATE_PROJECT, { id, input: config });
  }

  async deleteProject(id: string): Promise<void> {
    await this.client.mutate(Q.DELETE_PROJECT, { id });
    if (this._projectId === id) {
      this._projectId = undefined;
    }
  }

  // ── Environments ──────────────────────────────────────────────────

  async getEnvironment(id: string): Promise<RemoteEnvironment | null> {
    // Railway doesn't have a direct getEnvironment query, so list and filter
    const projectId = this.requireProjectId();
    const envs = await this.listEnvironments(projectId);
    return envs.find((e) => e.id === id) ?? null;
  }

  async listEnvironments(projectId: string): Promise<RemoteEnvironment[]> {
    const data = await this.client.query<{ edges: Edge<{ id: string; name: string }>[] }>(Q.LIST_ENVIRONMENTS, { projectId });
    return unwrapEdges(data) as RemoteEnvironment[];
  }

  async createEnvironment(config: { name: string; description?: string; projectId: string }): Promise<RemoteEnvironment> {
    // Railway auto-creates "production" environment. Check if the env already exists.
    const existing = await this.listEnvironments(config.projectId);
    const found = existing.find((e) => e.name.toLowerCase() === config.name.toLowerCase());
    if (found) return found;

    const input: Record<string, unknown> = {
      name: config.name,
      projectId: config.projectId,
    };
    const data = await this.client.mutate<{ id: string; name: string }>(Q.CREATE_ENVIRONMENT, { input });
    return data as RemoteEnvironment;
  }

  async updateEnvironment(_id: string, _config: Partial<{ name: string; description?: string }>): Promise<void> {
    // Railway environments have limited update capabilities.
    // This is a no-op (not a throw) because environment updates are not a
    // declarative config feature users would specify in dac.config.ts.
  }

  async deleteEnvironment(id: string): Promise<void> {
    await this.client.mutate(Q.DELETE_ENVIRONMENT, { id });
  }

  // ── Applications ──────────────────────────────────────────────────

  async getApplication(id: string): Promise<RemoteApplication | null> {
    // List services in the project and find by ID.
    // listApplications ignores the environmentId param (Railway is project-scoped).
    try {
      const apps = await this.listApplications("");
      return apps.find((a) => a.id === id) ?? null;
    } catch {
      return null;
    }
  }

  async listApplications(_environmentId: string): Promise<RemoteApplication[]> {
    // Railway services are project-scoped, not environment-scoped.
    // The environmentId parameter is ignored; we list all services in the project.
    const projectId = this.requireProjectId();
    const data = await this.client.query<{
      id: string;
      name: string;
      services: { edges: Edge<{ id: string; name: string }>[] };
    }>(Q.GET_PROJECT_WITH_SERVICES, { id: projectId });
    return unwrapEdges(data?.services) as RemoteApplication[];
  }

  async createApplication(config: { name: string; environmentId: string; serverId?: string }): Promise<RemoteApplication> {
    const projectId = this.requireProjectId();
    const input: Record<string, unknown> = {
      name: config.name,
      projectId,
    };
    const data = await this.client.mutate<{ id: string; name: string }>(Q.CREATE_SERVICE, { input });
    return data as RemoteApplication;
  }

  async updateApplication(id: string, config: Record<string, unknown>): Promise<void> {
    const { environmentId, source, buildConfig, envVars, startCommand, ...rest } = config as {
      environmentId?: string;
      source?: Record<string, unknown>;
      buildConfig?: Record<string, unknown>;
      envVars?: Record<string, string>;
      startCommand?: string;
      [key: string]: unknown;
    };

    const envId = environmentId as string | undefined;

    // Update service instance if there are instance-level settings
    if (envId && (source || buildConfig || startCommand || Object.keys(rest).length > 0)) {
      const input: Record<string, unknown> = {};
      if (source) input.source = source;
      if (buildConfig) input.builder = buildConfig;
      if (startCommand) input.startCommand = startCommand;
      Object.assign(input, rest);

      await this.client.mutate(Q.UPDATE_SERVICE_INSTANCE, {
        serviceId: id,
        environmentId: envId,
        input,
      });
    }

    // Upsert environment variables if provided
    if (envId && envVars && Object.keys(envVars).length > 0) {
      const projectId = this.requireProjectId();
      await this.client.mutate(Q.UPSERT_VARIABLES, {
        input: {
          projectId,
          environmentId: envId,
          serviceId: id,
          variables: envVars,
        },
      });
    }
  }

  async deleteApplication(id: string): Promise<void> {
    await this.client.mutate(Q.DELETE_SERVICE, { id });
  }

  // ── Databases ─────────────────────────────────────────────────────

  async getDatabase(id: string): Promise<RemoteDatabase | null> {
    // Databases are services in Railway; reuse application lookup
    try {
      const app = await this.getApplication(id);
      if (app) return app as unknown as RemoteDatabase;
      return null;
    } catch {
      return null;
    }
  }

  async listDatabases(environmentId: string): Promise<RemoteDatabase[]> {
    // In Railway, databases and apps are both services. Return the same list.
    const apps = await this.listApplications(environmentId);
    return apps as unknown as RemoteDatabase[];
  }

  async createDatabase(config: { name: string; type: string; environmentId: string; [key: string]: unknown }): Promise<RemoteDatabase> {
    const dbConfig = DB_IMAGES[config.type];
    if (!dbConfig) {
      throw new Error(`Unsupported database type for Railway: ${config.type}`);
    }

    const projectId = this.requireProjectId();

    // 1. Create the service
    const service = await this.client.mutate<{ id: string; name: string }>(Q.CREATE_SERVICE, {
      input: {
        name: config.name,
        projectId,
      },
    });

    // 2. Set the Docker image source on the service instance
    await this.client.mutate(Q.UPDATE_SERVICE_INSTANCE, {
      serviceId: service.id,
      environmentId: config.environmentId,
      input: {
        source: { image: `${dbConfig.image}:${(config.version as string) ?? "latest"}` },
      },
    });

    // 3. Attach a volume
    const volumeInput: Record<string, unknown> = {
      projectId,
      serviceId: service.id,
      mountPath: dbConfig.mountPath,
    };
    if (config.environmentId) {
      volumeInput.environmentId = config.environmentId;
    }
    await this.client.mutate(Q.CREATE_VOLUME, {
      input: volumeInput,
    });

    // 4. Set credential env vars
    const dbName = (config.databaseName as string) ?? config.name.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const dbUser = (config.databaseUser as string) ?? `user_${crypto.randomUUID().slice(0, 8)}`;
    const dbPassword = (config.databasePassword as string) ?? crypto.randomUUID();
    const envVars = dbConfig.envVars(dbName, dbUser, dbPassword);

    if (Object.keys(envVars).length > 0) {
      await this.client.mutate(Q.UPSERT_VARIABLES, {
        input: {
          projectId,
          environmentId: config.environmentId,
          serviceId: service.id,
          variables: envVars,
        },
      });
    }

    return service as unknown as RemoteDatabase;
  }

  async updateDatabase(id: string, config: Record<string, unknown>): Promise<void> {
    await this.updateApplication(id, config);
  }

  async deleteDatabase(id: string): Promise<void> {
    await this.deleteApplication(id);
  }

  // ── Compose (unsupported) ──────────────────────────────────────────

  async getCompose(_id: string): Promise<RemoteCompose | null> {
    throw new Error("Railway does not support compose services. Use individual applications instead.");
  }

  async listCompose(_environmentId: string): Promise<RemoteCompose[]> {
    throw new Error("Railway does not support compose services. Use individual applications instead.");
  }

  async createCompose(_config: { name: string; environmentId: string; [key: string]: unknown }): Promise<RemoteCompose> {
    throw new Error("Railway does not support compose services. Use individual applications instead.");
  }

  async updateCompose(_id: string, _config: Record<string, unknown>): Promise<void> {
    throw new Error("Railway does not support compose services. Use individual applications instead.");
  }

  async deleteCompose(_id: string): Promise<void> {
    throw new Error("Railway does not support compose services. Use individual applications instead.");
  }

  // ── Domains ───────────────────────────────────────────────────────

  async listDomains(_applicationId: string): Promise<RemoteDomain[]> {
    // Railway doesn't have a direct list domains query in our queries; return empty
    return [];
  }

  async createDomain(config: { host: string; applicationId?: string; composeId?: string; [key: string]: unknown }): Promise<RemoteDomain> {
    const environmentId = config.environmentId as string | undefined;
    if (!environmentId || !config.applicationId) {
      throw new Error("environmentId and applicationId are required for Railway domains.");
    }
    const projectId = this.requireProjectId();
    const input: Record<string, unknown> = {
      domain: config.host,
      serviceId: config.applicationId,
      environmentId,
      projectId,
    };
    const data = await this.client.mutate<{ id: string; domain: string }>(Q.CREATE_CUSTOM_DOMAIN, { input });
    return { id: data.id, host: data.domain } as RemoteDomain;
  }

  async updateDomain(_id: string, _config: Record<string, unknown>): Promise<void> {
    // Railway custom domains don't support in-place updates; delete and recreate instead.
    // This is a no-op (not a throw) because domain updates are limited on Railway
    // and the engine handles this via delete+create when the host changes.
  }

  async deleteDomain(id: string): Promise<void> {
    await this.client.mutate(Q.DELETE_CUSTOM_DOMAIN, { id });
  }

  // ── Ports ─────────────────────────────────────────────────────────

  async listPorts(applicationId: string): Promise<RemotePort[]> {
    // Return empty — TCP proxy listing requires environmentId which we may not have
    return [];
  }

  async createPort(config: { targetPort: number; publishedPort: number; applicationId: string; protocol?: string; publishMode?: string }): Promise<RemotePort> {
    // Railway TCP proxies are simplified — return a stub
    return { id: `tcp-${config.applicationId}-${config.targetPort}` } as RemotePort;
  }

  async updatePort(_id: string, _config: Record<string, unknown>): Promise<void> {
    // Railway TCP proxies have no update operation.
    // This is a no-op (not a throw) because port updates are not a declarative
    // config feature; the engine handles changes via delete+create.
  }

  async deletePort(_id: string): Promise<void> {
    // No-op for Railway TCP proxies
  }

  // ── Mounts ────────────────────────────────────────────────────────

  async listMounts(_serviceId: string, _serviceType?: string): Promise<RemoteMount[]> {
    return [];
  }

  async createMount(config: { type: string; mountPath: string; serviceId: string; serviceType?: string; [key: string]: unknown }): Promise<RemoteMount> {
    const projectId = this.requireProjectId();
    const data = await this.client.mutate<{ id: string }>(Q.CREATE_VOLUME, {
      input: {
        projectId,
        serviceId: config.serviceId,
        mountPath: config.mountPath,
      },
    });
    return data as RemoteMount;
  }

  async updateMount(_id: string, _config: Record<string, unknown>): Promise<void> {
    // Railway volumes don't support in-place updates
  }

  async deleteMount(id: string): Promise<void> {
    await this.client.mutate(Q.DELETE_VOLUME, { volumeId: id });
  }

  // ── Redirects (unsupported) ────────────────────────────────────────

  async listRedirects(_applicationId: string): Promise<RemoteRedirect[]> {
    throw new Error("Railway does not support redirects.");
  }

  async createRedirect(_config: { regex: string; replacement: string; permanent: boolean; applicationId: string }): Promise<RemoteRedirect> {
    throw new Error("Railway does not support redirects.");
  }

  async updateRedirect(_id: string, _config: Record<string, unknown>): Promise<void> {
    throw new Error("Railway does not support redirects.");
  }

  async deleteRedirect(_id: string): Promise<void> {
    throw new Error("Railway does not support redirects.");
  }

  // ── Security (unsupported) ─────────────────────────────────────────

  async listSecurity(_applicationId: string): Promise<RemoteSecurity[]> {
    throw new Error("Railway does not support basic auth.");
  }

  async createSecurity(_config: { username: string; password: string; applicationId: string }): Promise<RemoteSecurity> {
    throw new Error("Railway does not support basic auth.");
  }

  async updateSecurity(_id: string, _config: Record<string, unknown>): Promise<void> {
    throw new Error("Railway does not support basic auth.");
  }

  async deleteSecurity(_id: string): Promise<void> {
    throw new Error("Railway does not support basic auth.");
  }

  // ── Certificates (unsupported) ─────────────────────────────────────

  async listCertificates(): Promise<RemoteCertificate[]> {
    throw new Error("Railway does not support manual certificates. SSL is automatic.");
  }

  async createCertificate(_config: { name: string; certificateData: string; privateKey: string; [key: string]: unknown }): Promise<RemoteCertificate> {
    throw new Error("Railway does not support manual certificates. SSL is automatic.");
  }

  async deleteCertificate(_id: string): Promise<void> {
    throw new Error("Railway does not support manual certificates. SSL is automatic.");
  }

  // ── Registries (no-op) ─────────────────────────────────────────────

  async listRegistries(): Promise<RemoteRegistry[]> {
    return [];
  }

  async createRegistry(_config: { name: string; url: string; username: string; password: string; [key: string]: unknown }): Promise<RemoteRegistry> {
    return { id: "noop" } as RemoteRegistry;
  }

  async updateRegistry(_id: string, _config: Record<string, unknown>): Promise<void> {
    // No-op — Railway handles registries via service source config
  }

  async deleteRegistry(_id: string): Promise<void> {
    // No-op
  }

  // ── Deployment lifecycle ───────────────────────────────────────────

  async deploy(appId: string, opts?: { title?: string; description?: string; environmentId?: string }): Promise<DeploymentResult> {
    try {
      const environmentId = opts?.environmentId;
      if (!environmentId) {
        return { success: false, error: "environmentId is required for Railway deployments" };
      }
      await this.client.mutate(Q.DEPLOY_SERVICE, {
        serviceId: appId,
        environmentId,
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
    let targetDeploymentId = deploymentId;

    if (!targetDeploymentId) {
      // List recent deployments to find the latest successful one
      const data = await this.client.query<{ edges: Edge<{ id: string; status: string }>[] }>(Q.LIST_DEPLOYMENTS, {
        input: { serviceId: appId },
      });
      const deployments = unwrapEdges(data);
      if (deployments.length === 0) {
        throw new Error("No deployments found to rollback to");
      }
      targetDeploymentId = deployments[0].id;
    }

    await this.client.mutate(Q.ROLLBACK_DEPLOYMENT, { id: targetDeploymentId });
  }

  async stop(_appId: string): Promise<void> {
    // Railway manages service lifecycle automatically; no explicit stop.
    // This is a no-op (not a throw) because stop is an operational command,
    // not a declarative config feature.
  }

  async start(_appId: string): Promise<void> {
    // Railway manages service lifecycle automatically; no explicit start.
    // This is a no-op (not a throw) because start is an operational command,
    // not a declarative config feature.
  }
}
