export interface RemoteResource {
  id: string;
  [key: string]: unknown;
}

export interface RemoteProject extends RemoteResource { name: string; }
export interface RemoteEnvironment extends RemoteResource { name: string; }
export interface RemoteApplication extends RemoteResource { name: string; }
export interface RemoteDatabase extends RemoteResource { name: string; }
export interface RemoteCompose extends RemoteResource { name: string; }
export interface RemoteDomain extends RemoteResource { host: string; }
export interface RemotePort extends RemoteResource {}
export interface RemoteMount extends RemoteResource {}
export interface RemoteRedirect extends RemoteResource {}
export interface RemoteSecurity extends RemoteResource {}
export interface RemoteCertificate extends RemoteResource {}
export interface RemoteRegistry extends RemoteResource {}

export interface DeploymentResult {
  success: boolean;
  buildId?: string;
  error?: string;
}

export interface Provider {
  name: string;
  type: string;

  // Projects
  getProject(id: string): Promise<RemoteProject | null>;
  listProjects(): Promise<RemoteProject[]>;
  createProject(config: { name: string; description?: string }): Promise<RemoteProject>;
  updateProject(id: string, config: Partial<{ name: string; description?: string }>): Promise<void>;
  deleteProject(id: string): Promise<void>;

  // Environments
  getEnvironment(id: string): Promise<RemoteEnvironment | null>;
  listEnvironments(projectId: string): Promise<RemoteEnvironment[]>;
  createEnvironment(config: { name: string; description?: string; projectId: string }): Promise<RemoteEnvironment>;
  updateEnvironment(id: string, config: Partial<{ name: string; description?: string }>): Promise<void>;
  deleteEnvironment(id: string): Promise<void>;

  // Applications
  getApplication(id: string): Promise<RemoteApplication | null>;
  listApplications(environmentId: string): Promise<RemoteApplication[]>;
  createApplication(config: { name: string; environmentId: string; serverId?: string }): Promise<RemoteApplication>;
  updateApplication(id: string, config: Record<string, unknown>): Promise<void>;
  deleteApplication(id: string): Promise<void>;

  // Databases
  getDatabase(id: string): Promise<RemoteDatabase | null>;
  listDatabases(environmentId: string): Promise<RemoteDatabase[]>;
  createDatabase(config: { name: string; type: string; environmentId: string; [key: string]: unknown }): Promise<RemoteDatabase>;
  updateDatabase(id: string, config: Record<string, unknown>): Promise<void>;
  deleteDatabase(id: string): Promise<void>;

  // Compose
  getCompose(id: string): Promise<RemoteCompose | null>;
  listCompose(environmentId: string): Promise<RemoteCompose[]>;
  createCompose(config: { name: string; environmentId: string; [key: string]: unknown }): Promise<RemoteCompose>;
  updateCompose(id: string, config: Record<string, unknown>): Promise<void>;
  deleteCompose(id: string): Promise<void>;

  // Domains
  listDomains(applicationId: string): Promise<RemoteDomain[]>;
  createDomain(config: { host: string; applicationId?: string; composeId?: string; [key: string]: unknown }): Promise<RemoteDomain>;
  updateDomain(id: string, config: Record<string, unknown>): Promise<void>;
  deleteDomain(id: string): Promise<void>;

  // Ports
  listPorts(applicationId: string): Promise<RemotePort[]>;
  createPort(config: { targetPort: number; publishedPort: number; applicationId: string; protocol?: string; publishMode?: string }): Promise<RemotePort>;
  updatePort(id: string, config: Record<string, unknown>): Promise<void>;
  deletePort(id: string): Promise<void>;

  // Mounts
  listMounts(serviceId: string, serviceType?: string): Promise<RemoteMount[]>;
  createMount(config: { type: string; mountPath: string; serviceId: string; serviceType?: string; [key: string]: unknown }): Promise<RemoteMount>;
  updateMount(id: string, config: Record<string, unknown>): Promise<void>;
  deleteMount(id: string): Promise<void>;

  // Redirects
  listRedirects(applicationId: string): Promise<RemoteRedirect[]>;
  createRedirect(config: { regex: string; replacement: string; permanent: boolean; applicationId: string }): Promise<RemoteRedirect>;
  updateRedirect(id: string, config: Record<string, unknown>): Promise<void>;
  deleteRedirect(id: string): Promise<void>;

  // Security
  listSecurity(applicationId: string): Promise<RemoteSecurity[]>;
  createSecurity(config: { username: string; password: string; applicationId: string }): Promise<RemoteSecurity>;
  updateSecurity(id: string, config: Record<string, unknown>): Promise<void>;
  deleteSecurity(id: string): Promise<void>;

  // Certificates
  listCertificates(): Promise<RemoteCertificate[]>;
  createCertificate(config: { name: string; certificateData: string; privateKey: string; [key: string]: unknown }): Promise<RemoteCertificate>;
  deleteCertificate(id: string): Promise<void>;

  // Registries
  listRegistries(): Promise<RemoteRegistry[]>;
  createRegistry(config: { name: string; url: string; username: string; password: string; [key: string]: unknown }): Promise<RemoteRegistry>;
  updateRegistry(id: string, config: Record<string, unknown>): Promise<void>;
  deleteRegistry(id: string): Promise<void>;

  // Deployment lifecycle
  deploy(appId: string, opts?: { title?: string; description?: string }): Promise<DeploymentResult>;
  rollback(appId: string, deploymentId?: string): Promise<void>;
  stop(appId: string): Promise<void>;
  start(appId: string): Promise<void>;
}
