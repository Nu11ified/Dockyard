# DAC Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build `dac`, a platform-agnostic IaC CLI that reconciles TypeScript config against PaaS platforms (Dokploy first).

**Architecture:** Provider pattern with Zod-validated TypeScript config → Reconciler diffs desired vs current state → Provider executes mutations. State tracked in `.dac/state.json`.

**Tech Stack:** Bun, TypeScript, Zod, Commander.js

---

## Phase 1: Project Scaffolding

### Task 1: Initialize Bun project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `bunfig.toml`
- Create: `.gitignore`
- Create: `src/index.ts`

**Step 1: Initialize project**

```bash
cd /data/github/dokploy-as-code
bun init -y
```

**Step 2: Install dependencies**

```bash
bun add zod commander chalk
bun add -d @types/bun
```

**Step 3: Configure tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "types": ["bun"]
  },
  "include": ["src/**/*"]
}
```

**Step 4: Create .gitignore**

```
node_modules/
dist/
.dac/
*.tgz
```

**Step 5: Create directory structure**

```bash
mkdir -p src/{cli,config,core,providers/dokploy,types}
```

**Step 6: Stub src/index.ts**

```ts
#!/usr/bin/env bun
console.log("dac - deploy as code");
```

**Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold bun project with dependencies"
```

---

## Phase 2: Core Types & Zod Schemas

### Task 2: Define platform-agnostic resource types with Zod

**Files:**
- Create: `src/types/source.ts`
- Create: `src/types/build.ts`
- Create: `src/types/domain.ts`
- Create: `src/types/database.ts`
- Create: `src/types/application.ts`
- Create: `src/types/compose.ts`
- Create: `src/types/mount.ts`
- Create: `src/types/port.ts`
- Create: `src/types/certificate.ts`
- Create: `src/types/registry.ts`
- Create: `src/types/redirect.ts`
- Create: `src/types/security.ts`
- Create: `src/types/backup.ts`
- Create: `src/types/environment.ts`
- Create: `src/types/config.ts`
- Create: `src/types/index.ts`
- Test: `tests/types/config.test.ts`

**Step 1: Write failing test for config validation**

```ts
// tests/types/config.test.ts
import { describe, it, expect } from "bun:test";
import { DacConfigSchema } from "../../src/types/config";

describe("DacConfigSchema", () => {
  it("validates a minimal valid config", () => {
    const config = {
      providers: {
        staging: { type: "dokploy" as const, url: "https://dok.example.com", apiKey: "key123" },
      },
      project: { name: "my-app" },
      environments: {
        staging: {
          provider: "staging",
          applications: [],
        },
      },
    };
    const result = DacConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("rejects config missing project name", () => {
    const config = {
      providers: {
        staging: { type: "dokploy" as const, url: "https://dok.example.com", apiKey: "key123" },
      },
      project: {},
      environments: {},
    };
    const result = DacConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it("validates full config with applications, databases, domains", () => {
    const config = {
      providers: {
        staging: { type: "dokploy" as const, url: "https://dok.example.com", apiKey: "key123" },
      },
      project: { name: "my-saas", description: "My app" },
      environments: {
        staging: {
          provider: "staging",
          applications: [{
            name: "api",
            source: { type: "github" as const, repo: "me/api", branch: "main", owner: "me" },
            build: { type: "dockerfile" as const, context: "." },
            domains: [{ host: "api.example.com", https: true }],
            env: { NODE_ENV: "production" },
            ports: [{ container: 3000 }],
          }],
          databases: [
            { name: "db", type: "postgres" as const, version: "16" },
            { name: "cache", type: "redis" as const },
          ],
        },
      },
    };
    const result = DacConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("validates discriminated union narrows source fields", () => {
    const dockerSource = {
      providers: {
        s: { type: "dokploy" as const, url: "https://x.com", apiKey: "k" },
      },
      project: { name: "test" },
      environments: {
        s: {
          provider: "s",
          applications: [{
            name: "app",
            source: { type: "docker" as const, image: "nginx:latest" },
            build: { type: "dockerfile" as const },
          }],
        },
      },
    };
    const result = DacConfigSchema.safeParse(dockerSource);
    expect(result.success).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
bun test tests/types/config.test.ts
```

Expected: FAIL — module not found

**Step 3: Implement source types**

```ts
// src/types/source.ts
import { z } from "zod";

export const GitHubSourceSchema = z.object({
  type: z.literal("github"),
  repo: z.string().min(1),
  branch: z.string().min(1),
  owner: z.string().min(1),
  buildPath: z.string().optional(),
  watchPaths: z.array(z.string()).optional(),
  enableSubmodules: z.boolean().optional(),
  triggerType: z.enum(["push", "tag"]).optional(),
});

export const GitLabSourceSchema = z.object({
  type: z.literal("gitlab"),
  repo: z.string().min(1),
  branch: z.string().min(1),
  owner: z.string().min(1),
  buildPath: z.string().optional(),
  projectId: z.number().optional(),
  pathNamespace: z.string().optional(),
  watchPaths: z.array(z.string()).optional(),
  enableSubmodules: z.boolean().optional(),
});

export const BitbucketSourceSchema = z.object({
  type: z.literal("bitbucket"),
  repo: z.string().min(1),
  branch: z.string().min(1),
  owner: z.string().min(1),
  repositorySlug: z.string().optional(),
  buildPath: z.string().optional(),
  watchPaths: z.array(z.string()).optional(),
  enableSubmodules: z.boolean().optional(),
});

export const GiteaSourceSchema = z.object({
  type: z.literal("gitea"),
  repo: z.string().min(1),
  branch: z.string().min(1),
  owner: z.string().min(1),
  buildPath: z.string().optional(),
  watchPaths: z.array(z.string()).optional(),
  enableSubmodules: z.boolean().optional(),
});

export const GitSourceSchema = z.object({
  type: z.literal("git"),
  url: z.string().url(),
  branch: z.string().min(1),
  buildPath: z.string().optional(),
  sshKeyId: z.string().optional(),
  watchPaths: z.array(z.string()).optional(),
  enableSubmodules: z.boolean().optional(),
});

export const DockerSourceSchema = z.object({
  type: z.literal("docker"),
  image: z.string().min(1),
  registryUrl: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
});

export const SourceSchema = z.discriminatedUnion("type", [
  GitHubSourceSchema,
  GitLabSourceSchema,
  BitbucketSourceSchema,
  GiteaSourceSchema,
  GitSourceSchema,
  DockerSourceSchema,
]);

export type Source = z.infer<typeof SourceSchema>;
export type GitHubSource = z.infer<typeof GitHubSourceSchema>;
export type DockerSource = z.infer<typeof DockerSourceSchema>;
```

**Step 4: Implement build types**

```ts
// src/types/build.ts
import { z } from "zod";

export const DockerfileBuildSchema = z.object({
  type: z.literal("dockerfile"),
  dockerfile: z.string().optional(),
  context: z.string().optional(),
  buildStage: z.string().optional(),
});

export const NixpacksBuildSchema = z.object({
  type: z.literal("nixpacks"),
});

export const BuildpackBuildSchema = z.object({
  type: z.literal("buildpacks"),
  version: z.string().optional(),
});

export const StaticBuildSchema = z.object({
  type: z.literal("static"),
  publishDirectory: z.string().optional(),
  isSpa: z.boolean().optional(),
});

export const RailpackBuildSchema = z.object({
  type: z.literal("railpack"),
  version: z.string().optional(),
});

export const BuildSchema = z.discriminatedUnion("type", [
  DockerfileBuildSchema,
  NixpacksBuildSchema,
  BuildpackBuildSchema,
  StaticBuildSchema,
  RailpackBuildSchema,
]);

export type Build = z.infer<typeof BuildSchema>;
```

**Step 5: Implement domain, port, mount, redirect, security, certificate, registry, backup types**

```ts
// src/types/domain.ts
import { z } from "zod";

export const DomainSchema = z.object({
  host: z.string().min(1),
  path: z.string().optional(),
  port: z.number().optional(),
  https: z.union([z.boolean(), z.object({
    certificate: z.enum(["letsencrypt", "custom", "none"]),
    customCertResolver: z.string().optional(),
  })]).optional(),
  stripPath: z.boolean().optional(),
  internalPath: z.string().optional(),
});

export type Domain = z.infer<typeof DomainSchema>;
```

```ts
// src/types/port.ts
import { z } from "zod";

export const PortSchema = z.object({
  container: z.number(),
  host: z.number().optional(), // auto-assigned if omitted
  protocol: z.enum(["tcp", "udp"]).default("tcp"),
  publishMode: z.enum(["ingress", "host"]).default("ingress"),
});

export type Port = z.infer<typeof PortSchema>;
```

```ts
// src/types/mount.ts
import { z } from "zod";

export const BindMountSchema = z.object({
  type: z.literal("bind"),
  hostPath: z.string().min(1),
  mountPath: z.string().min(1),
});

export const VolumeMountSchema = z.object({
  type: z.literal("volume"),
  name: z.string().min(1),
  mountPath: z.string().min(1),
});

export const FileMountSchema = z.object({
  type: z.literal("file"),
  content: z.string(),
  mountPath: z.string().min(1),
  filePath: z.string().optional(),
});

export const MountSchema = z.discriminatedUnion("type", [
  BindMountSchema,
  VolumeMountSchema,
  FileMountSchema,
]);

export type Mount = z.infer<typeof MountSchema>;
```

```ts
// src/types/redirect.ts
import { z } from "zod";

export const RedirectSchema = z.object({
  regex: z.string().min(1),
  replacement: z.string().min(1),
  permanent: z.boolean(),
});

export type Redirect = z.infer<typeof RedirectSchema>;
```

```ts
// src/types/security.ts
import { z } from "zod";

export const SecuritySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type Security = z.infer<typeof SecuritySchema>;
```

```ts
// src/types/certificate.ts
import { z } from "zod";

export const CertificateSchema = z.object({
  name: z.string().min(1),
  certificateData: z.string().min(1),
  privateKey: z.string().min(1),
  autoRenew: z.boolean().optional(),
});

export type Certificate = z.infer<typeof CertificateSchema>;
```

```ts
// src/types/registry.ts
import { z } from "zod";

export const RegistrySchema = z.object({
  name: z.string().min(1),
  url: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
  imagePrefix: z.string().optional(),
});

export type Registry = z.infer<typeof RegistrySchema>;
```

```ts
// src/types/backup.ts
import { z } from "zod";

export const BackupSchema = z.object({
  enabled: z.boolean().default(false),
  schedule: z.string().optional(),
  destination: z.string().optional(),
});

export type Backup = z.infer<typeof BackupSchema>;
```

**Step 6: Implement database type**

```ts
// src/types/database.ts
import { z } from "zod";
import { BackupSchema } from "./backup";

export const DatabaseSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["postgres", "mysql", "mariadb", "redis", "mongo"]),
  version: z.string().optional(),
  databaseName: z.string().optional(),
  databaseUser: z.string().optional(),
  databasePassword: z.string().optional(),
  databaseRootPassword: z.string().optional(),
  env: z.record(z.string()).optional(),
  backups: BackupSchema.optional(),
});

export type Database = z.infer<typeof DatabaseSchema>;
```

**Step 7: Implement application type**

```ts
// src/types/application.ts
import { z } from "zod";
import { SourceSchema } from "./source";
import { BuildSchema } from "./build";
import { DomainSchema } from "./domain";
import { PortSchema } from "./port";
import { MountSchema } from "./mount";
import { RedirectSchema } from "./redirect";
import { SecuritySchema } from "./security";

export const ApplicationSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  source: SourceSchema,
  build: BuildSchema,
  domains: z.array(DomainSchema).optional(),
  env: z.record(z.string()).optional(),
  buildArgs: z.record(z.string()).optional(),
  ports: z.array(PortSchema).optional(),
  mounts: z.array(MountSchema).optional(),
  redirects: z.array(RedirectSchema).optional(),
  security: z.array(SecuritySchema).optional(),
  resources: z.object({
    cpuLimit: z.string().optional(),
    cpuReservation: z.string().optional(),
    memoryLimit: z.string().optional(),
    memoryReservation: z.string().optional(),
  }).optional(),
  replicas: z.number().optional(),
  autoDeploy: z.boolean().optional(),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
});

export type Application = z.infer<typeof ApplicationSchema>;
```

**Step 8: Implement compose type**

```ts
// src/types/compose.ts
import { z } from "zod";
import { GitHubSourceSchema, GitLabSourceSchema, GitSourceSchema, BitbucketSourceSchema, GiteaSourceSchema } from "./source";
import { DomainSchema } from "./domain";

const ComposeSourceSchema = z.discriminatedUnion("type", [
  GitHubSourceSchema,
  GitLabSourceSchema,
  GitSourceSchema,
  BitbucketSourceSchema,
  GiteaSourceSchema,
  z.object({
    type: z.literal("raw"),
    content: z.string().min(1),
  }),
]);

export const ComposeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  source: ComposeSourceSchema,
  env: z.record(z.string()).optional(),
  domains: z.record(z.string(), z.array(DomainSchema)).optional(),
});

export type Compose = z.infer<typeof ComposeSchema>;
```

**Step 9: Implement environment type**

```ts
// src/types/environment.ts
import { z } from "zod";
import { ApplicationSchema } from "./application";
import { DatabaseSchema } from "./database";
import { ComposeSchema } from "./compose";

export const EnvironmentSchema = z.object({
  provider: z.string().min(1),
  description: z.string().optional(),
  applications: z.array(ApplicationSchema).optional().default([]),
  databases: z.array(DatabaseSchema).optional().default([]),
  compose: z.array(ComposeSchema).optional().default([]),
});

export type Environment = z.infer<typeof EnvironmentSchema>;
```

**Step 10: Implement top-level config schema with defineConfig**

```ts
// src/types/config.ts
import { z } from "zod";
import { EnvironmentSchema } from "./environment";
import { CertificateSchema } from "./certificate";
import { RegistrySchema } from "./registry";

export const ProviderConfigSchema = z.object({
  type: z.string().min(1),
  url: z.string().optional(),
  apiKey: z.string().optional(),
  token: z.string().optional(),
}).passthrough();

export const ProjectConfigSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export const DacConfigSchema = z.object({
  providers: z.record(z.string(), ProviderConfigSchema),
  project: ProjectConfigSchema,
  environments: z.record(z.string(), EnvironmentSchema),
  certificates: z.array(CertificateSchema).optional(),
  registries: z.array(RegistrySchema).optional(),
});

export type DacConfig = z.infer<typeof DacConfigSchema>;

export function defineConfig(config: DacConfig): DacConfig {
  return DacConfigSchema.parse(config);
}
```

**Step 11: Create barrel export**

```ts
// src/types/index.ts
export * from "./source";
export * from "./build";
export * from "./domain";
export * from "./database";
export * from "./application";
export * from "./compose";
export * from "./mount";
export * from "./port";
export * from "./certificate";
export * from "./registry";
export * from "./redirect";
export * from "./security";
export * from "./backup";
export * from "./environment";
export * from "./config";
```

**Step 12: Run tests**

```bash
bun test tests/types/config.test.ts
```

Expected: ALL PASS

**Step 13: Commit**

```bash
git add -A
git commit -m "feat: add Zod schemas for all resource types with discriminated unions"
```

---

## Phase 3: Provider Interface & State Manager

### Task 3: Define the abstract Provider interface

**Files:**
- Create: `src/providers/provider.ts`
- Create: `src/providers/index.ts`
- Test: `tests/providers/provider.test.ts`

**Step 1: Write failing test**

```ts
// tests/providers/provider.test.ts
import { describe, it, expect } from "bun:test";
import type { Provider, RemoteResource } from "../../src/providers/provider";

describe("Provider interface", () => {
  it("can be implemented by a mock provider", () => {
    const mock: Provider = {
      name: "mock",
      type: "mock",

      async getProject() { return null; },
      async listProjects() { return []; },
      async createProject(c) { return { id: "p1", name: c.name }; },
      async updateProject() {},
      async deleteProject() {},

      async getEnvironment() { return null; },
      async listEnvironments() { return []; },
      async createEnvironment(c) { return { id: "e1", name: c.name }; },
      async updateEnvironment() {},
      async deleteEnvironment() {},

      async getApplication() { return null; },
      async listApplications() { return []; },
      async createApplication(c) { return { id: "a1", name: c.name }; },
      async updateApplication() {},
      async deleteApplication() {},

      async getDatabase() { return null; },
      async listDatabases() { return []; },
      async createDatabase(c) { return { id: "d1", name: c.name }; },
      async updateDatabase() {},
      async deleteDatabase() {},

      async getCompose() { return null; },
      async listCompose() { return []; },
      async createCompose(c) { return { id: "c1", name: c.name }; },
      async updateCompose() {},
      async deleteCompose() {},

      async listDomains() { return []; },
      async createDomain(c) { return { id: "dm1", host: c.host }; },
      async updateDomain() {},
      async deleteDomain() {},

      async listPorts() { return []; },
      async createPort(c) { return { id: "pt1" }; },
      async updatePort() {},
      async deletePort() {},

      async listMounts() { return []; },
      async createMount(c) { return { id: "m1" }; },
      async updateMount() {},
      async deleteMount() {},

      async listRedirects() { return []; },
      async createRedirect(c) { return { id: "r1" }; },
      async updateRedirect() {},
      async deleteRedirect() {},

      async listSecurity() { return []; },
      async createSecurity(c) { return { id: "s1" }; },
      async updateSecurity() {},
      async deleteSecurity() {},

      async listCertificates() { return []; },
      async createCertificate(c) { return { id: "ct1" }; },
      async deleteCertificate() {},

      async listRegistries() { return []; },
      async createRegistry(c) { return { id: "rg1" }; },
      async updateRegistry() {},
      async deleteRegistry() {},

      async deploy() { return { success: true }; },
      async rollback() {},
      async stop() {},
      async start() {},
    };

    expect(mock.name).toBe("mock");
  });
});
```

**Step 2: Implement provider interface**

```ts
// src/providers/provider.ts
import type { Application, Database, Domain, Port, Mount, Redirect, Security, Certificate, Registry, Compose } from "../types";

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
```

```ts
// src/providers/index.ts
export type { Provider, RemoteResource, RemoteProject, RemoteEnvironment, RemoteApplication, RemoteDatabase, RemoteCompose, RemoteDomain, RemotePort, RemoteMount, RemoteRedirect, RemoteSecurity, RemoteCertificate, RemoteRegistry, DeploymentResult } from "./provider";
```

**Step 3: Run tests**

```bash
bun test tests/providers/provider.test.ts
```

Expected: PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: define Provider interface with full resource CRUD"
```

### Task 4: Implement State Manager

**Files:**
- Create: `src/core/state.ts`
- Test: `tests/core/state.test.ts`

**Step 1: Write failing tests**

```ts
// tests/core/state.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { StateManager } from "../../src/core/state";
import { rmSync, mkdirSync, existsSync } from "fs";

const TEST_DIR = "/tmp/dac-test-state";

describe("StateManager", () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });
  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("creates new state file if none exists", () => {
    const sm = new StateManager(TEST_DIR);
    const state = sm.load();
    expect(state.version).toBe(1);
    expect(state.providers).toEqual({});
  });

  it("saves and loads state", () => {
    const sm = new StateManager(TEST_DIR);
    sm.setResource("staging", "dokploy", "project:my-app", { remoteId: "abc" });
    sm.save();

    const sm2 = new StateManager(TEST_DIR);
    const state = sm2.load();
    expect(state.providers.staging.resources["project:my-app"].remoteId).toBe("abc");
  });

  it("gets a resource", () => {
    const sm = new StateManager(TEST_DIR);
    sm.setResource("staging", "dokploy", "application:api", { remoteId: "xyz", environmentId: "e1" });
    const res = sm.getResource("staging", "application:api");
    expect(res?.remoteId).toBe("xyz");
  });

  it("removes a resource", () => {
    const sm = new StateManager(TEST_DIR);
    sm.setResource("staging", "dokploy", "db:pg", { remoteId: "d1" });
    sm.removeResource("staging", "db:pg");
    expect(sm.getResource("staging", "db:pg")).toBeUndefined();
  });

  it("lists resources by provider", () => {
    const sm = new StateManager(TEST_DIR);
    sm.setResource("staging", "dokploy", "app:a", { remoteId: "1" });
    sm.setResource("staging", "dokploy", "app:b", { remoteId: "2" });
    const resources = sm.listResources("staging");
    expect(Object.keys(resources)).toHaveLength(2);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
bun test tests/core/state.test.ts
```

**Step 3: Implement StateManager**

```ts
// src/core/state.ts
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

export interface ResourceState {
  remoteId: string;
  [key: string]: unknown;
}

export interface ProviderState {
  type: string;
  resources: Record<string, ResourceState>;
}

export interface DacState {
  version: number;
  providers: Record<string, ProviderState>;
}

export class StateManager {
  private statePath: string;
  private state: DacState;

  constructor(baseDir: string) {
    const dacDir = join(baseDir, ".dac");
    this.statePath = join(dacDir, "state.json");

    if (!existsSync(dacDir)) {
      mkdirSync(dacDir, { recursive: true });
    }

    this.state = this.load();
  }

  load(): DacState {
    if (existsSync(this.statePath)) {
      const raw = readFileSync(this.statePath, "utf-8");
      this.state = JSON.parse(raw);
      return this.state;
    }
    this.state = { version: 1, providers: {} };
    return this.state;
  }

  save(): void {
    writeFileSync(this.statePath, JSON.stringify(this.state, null, 2));
  }

  setResource(providerName: string, providerType: string, resourceKey: string, value: ResourceState): void {
    if (!this.state.providers[providerName]) {
      this.state.providers[providerName] = { type: providerType, resources: {} };
    }
    this.state.providers[providerName].resources[resourceKey] = value;
  }

  getResource(providerName: string, resourceKey: string): ResourceState | undefined {
    return this.state.providers[providerName]?.resources[resourceKey];
  }

  removeResource(providerName: string, resourceKey: string): void {
    if (this.state.providers[providerName]) {
      delete this.state.providers[providerName].resources[resourceKey];
    }
  }

  listResources(providerName: string): Record<string, ResourceState> {
    return this.state.providers[providerName]?.resources ?? {};
  }

  getState(): DacState {
    return this.state;
  }
}
```

**Step 4: Run tests**

```bash
bun test tests/core/state.test.ts
```

Expected: ALL PASS

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: implement StateManager for tracking remote resource IDs"
```

---

## Phase 4: Config Loader & Reference Resolver

### Task 5: Config loader — load and validate dac.config.ts

**Files:**
- Create: `src/config/loader.ts`
- Create: `src/config/index.ts`
- Test: `tests/config/loader.test.ts`

**Step 1: Write failing test**

```ts
// tests/config/loader.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { loadConfig } from "../../src/config/loader";
import { writeFileSync, mkdirSync, rmSync } from "fs";

const TEST_DIR = "/tmp/dac-test-config";

describe("loadConfig", () => {
  beforeEach(() => mkdirSync(TEST_DIR, { recursive: true }));
  afterEach(() => rmSync(TEST_DIR, { recursive: true, force: true }));

  it("loads and validates a dac.config.ts file", async () => {
    writeFileSync(`${TEST_DIR}/dac.config.ts`, `
      export default {
        providers: { staging: { type: "dokploy", url: "https://x.com", apiKey: "k" } },
        project: { name: "test" },
        environments: {
          staging: {
            provider: "staging",
            applications: [],
          },
        },
      };
    `);
    const config = await loadConfig(TEST_DIR);
    expect(config.project.name).toBe("test");
  });

  it("throws on invalid config", async () => {
    writeFileSync(`${TEST_DIR}/dac.config.ts`, `
      export default { project: {} };
    `);
    expect(loadConfig(TEST_DIR)).rejects.toThrow();
  });

  it("throws if no config file found", async () => {
    expect(loadConfig(TEST_DIR + "/nonexistent")).rejects.toThrow();
  });
});
```

**Step 2: Implement config loader**

```ts
// src/config/loader.ts
import { existsSync } from "fs";
import { join, resolve } from "path";
import { DacConfigSchema, type DacConfig } from "../types/config";

export async function loadConfig(baseDir: string): Promise<DacConfig> {
  const configPath = join(resolve(baseDir), "dac.config.ts");

  if (!existsSync(configPath)) {
    throw new Error(`No dac.config.ts found in ${baseDir}`);
  }

  const mod = await import(configPath);
  const raw = mod.default ?? mod;

  const result = DacConfigSchema.safeParse(raw);
  if (!result.success) {
    const errors = result.error.issues.map(i => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid config:\n${errors}`);
  }

  return result.data;
}
```

```ts
// src/config/index.ts
export { loadConfig } from "./loader";
```

**Step 3: Run tests**

```bash
bun test tests/config/loader.test.ts
```

Expected: ALL PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: implement config loader with Zod validation"
```

### Task 6: Reference resolver for cross-resource references

**Files:**
- Create: `src/config/references.ts`
- Test: `tests/config/references.test.ts`

**Step 1: Write failing test**

```ts
// tests/config/references.test.ts
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
});
```

**Step 2: Implement reference resolver**

```ts
// src/config/references.ts
const REF_PATTERN = /\$\{\{([^}]+)\}\}/g;

export interface ReferenceContext {
  databases: Record<string, { connectionString?: string; host?: string; port?: number; [key: string]: unknown }>;
}

export function resolveReferences(
  env: Record<string, string>,
  context: ReferenceContext,
): Record<string, string> {
  const resolved: Record<string, string> = {};

  for (const [key, value] of Object.entries(env)) {
    resolved[key] = value.replace(REF_PATTERN, (match, ref: string) => {
      const parts = ref.trim().split(".");
      if (parts[0] === "db" && parts.length === 3) {
        const dbName = parts[1];
        const field = parts[2];
        const db = context.databases[dbName];
        if (!db || !(field in db)) {
          throw new Error(`Unresolved reference: ${match} — database "${dbName}" field "${field}" not found`);
        }
        return String(db[field]);
      }
      throw new Error(`Unresolved reference: ${match} — unknown reference format`);
    });
  }

  return resolved;
}
```

**Step 3: Run tests**

```bash
bun test tests/config/references.test.ts
```

Expected: ALL PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: implement cross-resource reference resolver"
```

---

## Phase 5: Reconciler

### Task 7: Build the reconciler that diffs desired vs current state

**Files:**
- Create: `src/core/reconciler.ts`
- Create: `src/core/dependency.ts`
- Create: `src/core/index.ts`
- Test: `tests/core/reconciler.test.ts`

**Step 1: Write failing tests**

```ts
// tests/core/reconciler.test.ts
import { describe, it, expect } from "bun:test";
import { Reconciler, type PlanAction } from "../../src/core/reconciler";

describe("Reconciler", () => {
  it("produces create actions for new resources", () => {
    const desired = [
      { key: "application:api", type: "application", config: { name: "api" } },
      { key: "database:pg", type: "database", config: { name: "pg", type: "postgres" } },
    ];
    const current: Record<string, { remoteId: string }> = {};

    const plan = Reconciler.diff(desired, current);
    expect(plan).toHaveLength(2);
    expect(plan.every(a => a.action === "create")).toBe(true);
  });

  it("produces delete actions for removed resources", () => {
    const desired: Array<{ key: string; type: string; config: Record<string, unknown> }> = [];
    const current = {
      "application:old": { remoteId: "old-id" },
    };

    const plan = Reconciler.diff(desired, current);
    expect(plan).toHaveLength(1);
    expect(plan[0].action).toBe("delete");
    expect(plan[0].key).toBe("application:old");
  });

  it("produces update actions when config changes", () => {
    const desired = [
      { key: "application:api", type: "application", config: { name: "api", replicas: 3 } },
    ];
    const current = {
      "application:api": { remoteId: "a1" },
    };

    const plan = Reconciler.diff(desired, current);
    expect(plan).toHaveLength(1);
    expect(plan[0].action).toBe("update");
  });

  it("produces no actions when nothing changed", () => {
    const desired: Array<{ key: string; type: string; config: Record<string, unknown> }> = [];
    const current: Record<string, { remoteId: string }> = {};

    const plan = Reconciler.diff(desired, current);
    expect(plan).toHaveLength(0);
  });
});
```

**Step 2: Implement reconciler**

```ts
// src/core/reconciler.ts
export interface DesiredResource {
  key: string;
  type: string;
  config: Record<string, unknown>;
  dependsOn?: string[];
}

export interface PlanAction {
  action: "create" | "update" | "delete";
  key: string;
  type: string;
  remoteId?: string;
  config?: Record<string, unknown>;
}

export class Reconciler {
  static diff(
    desired: DesiredResource[],
    current: Record<string, { remoteId: string }>,
  ): PlanAction[] {
    const actions: PlanAction[] = [];
    const desiredKeys = new Set(desired.map(d => d.key));

    // Creates and updates
    for (const resource of desired) {
      const existing = current[resource.key];
      if (!existing) {
        actions.push({
          action: "create",
          key: resource.key,
          type: resource.type,
          config: resource.config,
        });
      } else {
        actions.push({
          action: "update",
          key: resource.key,
          type: resource.type,
          remoteId: existing.remoteId,
          config: resource.config,
        });
      }
    }

    // Deletes
    for (const [key, value] of Object.entries(current)) {
      if (!desiredKeys.has(key)) {
        const type = key.split(":")[0];
        actions.push({
          action: "delete",
          key,
          type,
          remoteId: value.remoteId,
        });
      }
    }

    return actions;
  }
}
```

**Step 3: Implement dependency graph for ordering**

```ts
// src/core/dependency.ts
import type { PlanAction } from "./reconciler";

export function orderActions(actions: PlanAction[]): PlanAction[] {
  const typeOrder: Record<string, number> = {
    project: 0,
    environment: 1,
    registry: 2,
    certificate: 3,
    database: 4,
    application: 5,
    compose: 6,
    domain: 7,
    port: 8,
    mount: 9,
    redirect: 10,
    security: 11,
  };

  return [...actions].sort((a, b) => {
    // Deletes go in reverse order
    if (a.action === "delete" && b.action === "delete") {
      return (typeOrder[b.type] ?? 99) - (typeOrder[a.type] ?? 99);
    }
    // Deletes after creates/updates
    if (a.action === "delete") return 1;
    if (b.action === "delete") return -1;
    // Creates/updates in dependency order
    return (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99);
  });
}
```

```ts
// src/core/index.ts
export { Reconciler, type PlanAction, type DesiredResource } from "./reconciler";
export { StateManager, type DacState, type ResourceState } from "./state";
export { orderActions } from "./dependency";
```

**Step 4: Run tests**

```bash
bun test tests/core/reconciler.test.ts
```

Expected: ALL PASS

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: implement reconciler with dependency-ordered action planning"
```

---

## Phase 6: Dokploy Provider

### Task 8: Implement Dokploy HTTP client

**Files:**
- Create: `src/providers/dokploy/client.ts`
- Test: `tests/providers/dokploy/client.test.ts`

**Step 1: Write failing test**

```ts
// tests/providers/dokploy/client.test.ts
import { describe, it, expect } from "bun:test";
import { DokployClient } from "../../../src/providers/dokploy/client";

describe("DokployClient", () => {
  it("constructs with url and apiKey", () => {
    const client = new DokployClient("https://dok.example.com", "test-key");
    expect(client).toBeDefined();
  });

  it("builds correct endpoint URLs", () => {
    const client = new DokployClient("https://dok.example.com", "test-key");
    // @ts-ignore - testing internal
    expect(client.buildUrl("project.create")).toBe("https://dok.example.com/api/project.create");
  });
});
```

**Step 2: Implement DokployClient**

```ts
// src/providers/dokploy/client.ts
export class DokployClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(url: string, apiKey: string) {
    this.baseUrl = url.replace(/\/$/, "");
    this.apiKey = apiKey;
  }

  private buildUrl(endpoint: string): string {
    return `${this.baseUrl}/api/${endpoint}`;
  }

  private get headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "x-api-key": this.apiKey,
    };
  }

  async post<T = unknown>(endpoint: string, body: Record<string, unknown> = {}): Promise<T> {
    const res = await fetch(this.buildUrl(endpoint), {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Dokploy API error ${res.status} on ${endpoint}: ${text}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : ({} as T);
  }

  async get<T = unknown>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(this.buildUrl(endpoint));
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: this.headers,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Dokploy API error ${res.status} on ${endpoint}: ${text}`);
    }
    return res.json() as Promise<T>;
  }
}
```

**Step 3: Run tests**

```bash
bun test tests/providers/dokploy/client.test.ts
```

Expected: PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: implement Dokploy HTTP client"
```

### Task 9: Implement Dokploy Provider (projects, environments, applications)

**Files:**
- Create: `src/providers/dokploy/provider.ts`
- Create: `src/providers/dokploy/index.ts`
- Test: `tests/providers/dokploy/provider.test.ts`

This is the largest task. The provider maps our abstract interface to Dokploy's tRPC-style API.

**Step 1: Write test (integration-style, can be run against real instance with env vars)**

```ts
// tests/providers/dokploy/provider.test.ts
import { describe, it, expect } from "bun:test";
import { DokployProvider } from "../../../src/providers/dokploy/provider";

describe("DokployProvider", () => {
  it("can be instantiated", () => {
    const provider = new DokployProvider("https://dok.example.com", "test-key");
    expect(provider.name).toBe("dokploy");
    expect(provider.type).toBe("dokploy");
  });
});
```

**Step 2: Implement DokployProvider**

```ts
// src/providers/dokploy/provider.ts
import { DokployClient } from "./client";
import type {
  Provider,
  RemoteProject, RemoteEnvironment, RemoteApplication, RemoteDatabase,
  RemoteCompose, RemoteDomain, RemotePort, RemoteMount, RemoteRedirect,
  RemoteSecurity, RemoteCertificate, RemoteRegistry, DeploymentResult,
} from "../provider";

export class DokployProvider implements Provider {
  name = "dokploy";
  type = "dokploy";
  private client: DokployClient;

  constructor(url: string, apiKey: string) {
    this.client = new DokployClient(url, apiKey);
  }

  // --- Projects ---
  async getProject(id: string): Promise<RemoteProject | null> {
    try {
      return await this.client.get<RemoteProject>("project.one", { projectId: id });
    } catch { return null; }
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

  // --- Environments ---
  async getEnvironment(id: string): Promise<RemoteEnvironment | null> {
    try {
      return await this.client.get<RemoteEnvironment>("environment.one", { environmentId: id });
    } catch { return null; }
  }
  async listEnvironments(projectId: string): Promise<RemoteEnvironment[]> {
    return this.client.get<RemoteEnvironment[]>("environment.byProjectId", { projectId });
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

  // --- Applications ---
  async getApplication(id: string): Promise<RemoteApplication | null> {
    try {
      return await this.client.get<RemoteApplication>("application.one", { applicationId: id });
    } catch { return null; }
  }
  async listApplications(environmentId: string): Promise<RemoteApplication[]> {
    const result = await this.client.get<{ data: RemoteApplication[] }>("application.search", { environmentId });
    return result.data ?? [];
  }
  async createApplication(config: { name: string; environmentId: string; serverId?: string }): Promise<RemoteApplication> {
    return this.client.post<RemoteApplication>("application.create", config);
  }
  async updateApplication(id: string, config: Record<string, unknown>): Promise<void> {
    await this.client.post("application.update", { applicationId: id, ...config });
  }
  async deleteApplication(id: string): Promise<void> {
    await this.client.post("application.delete", { applicationId: id });
  }

  // --- Databases ---
  async getDatabase(id: string): Promise<RemoteDatabase | null> {
    // Dokploy has separate endpoints per DB type, so we try each
    for (const dbType of ["postgres", "mysql", "mariadb", "redis", "mongo"]) {
      try {
        return await this.client.get<RemoteDatabase>(`${dbType}.one`, { [`${dbType}Id`]: id });
      } catch { continue; }
    }
    return null;
  }
  async listDatabases(environmentId: string): Promise<RemoteDatabase[]> {
    const results: RemoteDatabase[] = [];
    for (const dbType of ["postgres", "mysql", "mariadb", "redis", "mongo"]) {
      try {
        const res = await this.client.get<{ data: RemoteDatabase[] }>(`${dbType}.search`, { environmentId });
        results.push(...(res.data ?? []));
      } catch { continue; }
    }
    return results;
  }
  async createDatabase(config: { name: string; type: string; environmentId: string; [key: string]: unknown }): Promise<RemoteDatabase> {
    const { type: dbType, ...rest } = config;
    const body: Record<string, unknown> = { ...rest };
    // Set defaults based on DB type
    if (dbType !== "redis" && dbType !== "mongo") {
      body.databaseName = body.databaseName ?? config.name;
      body.databaseUser = body.databaseUser ?? config.name;
      body.databasePassword = body.databasePassword ?? crypto.randomUUID().replace(/-/g, "");
    }
    if (dbType === "redis") {
      body.databasePassword = body.databasePassword ?? crypto.randomUUID().replace(/-/g, "");
    }
    if (dbType === "mongo") {
      body.databaseUser = body.databaseUser ?? config.name;
      body.databasePassword = body.databasePassword ?? crypto.randomUUID().replace(/-/g, "");
    }
    return this.client.post<RemoteDatabase>(`${dbType}.create`, body);
  }
  async updateDatabase(id: string, config: Record<string, unknown>): Promise<void> {
    const dbType = config._dbType as string ?? "postgres";
    delete config._dbType;
    await this.client.post(`${dbType}.update`, { [`${dbType}Id`]: id, ...config });
  }
  async deleteDatabase(id: string): Promise<void> {
    // Try each type
    for (const dbType of ["postgres", "mysql", "mariadb", "redis", "mongo"]) {
      try {
        await this.client.post(`${dbType}.remove`, { [`${dbType}Id`]: id });
        return;
      } catch { continue; }
    }
  }

  // --- Compose ---
  async getCompose(id: string): Promise<RemoteCompose | null> {
    try {
      return await this.client.get<RemoteCompose>("compose.one", { composeId: id });
    } catch { return null; }
  }
  async listCompose(environmentId: string): Promise<RemoteCompose[]> {
    // Compose doesn't have a search, use project environments
    return [];
  }
  async createCompose(config: { name: string; environmentId: string; [key: string]: unknown }): Promise<RemoteCompose> {
    return this.client.post<RemoteCompose>("compose.create", config);
  }
  async updateCompose(id: string, config: Record<string, unknown>): Promise<void> {
    await this.client.post("compose.update", { composeId: id, ...config });
  }
  async deleteCompose(id: string): Promise<void> {
    await this.client.post("compose.delete", { composeId: id });
  }

  // --- Domains ---
  async listDomains(applicationId: string): Promise<RemoteDomain[]> {
    return this.client.get<RemoteDomain[]>("domain.byApplicationId", { applicationId });
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

  // --- Ports ---
  async listPorts(_applicationId: string): Promise<RemotePort[]> {
    // Dokploy doesn't have a list ports endpoint; ports come from application.one
    return [];
  }
  async createPort(config: { targetPort: number; publishedPort: number; applicationId: string; protocol?: string; publishMode?: string }): Promise<RemotePort> {
    return this.client.post<RemotePort>("port.create", {
      targetPort: config.targetPort,
      publishedPort: config.publishedPort,
      applicationId: config.applicationId,
      protocol: config.protocol ?? "tcp",
      publishMode: config.publishMode ?? "ingress",
    });
  }
  async updatePort(id: string, config: Record<string, unknown>): Promise<void> {
    await this.client.post("port.update", { portId: id, ...config });
  }
  async deletePort(id: string): Promise<void> {
    await this.client.post("port.delete", { portId: id });
  }

  // --- Mounts ---
  async listMounts(serviceId: string, serviceType?: string): Promise<RemoteMount[]> {
    return this.client.get<RemoteMount[]>("mounts.allNamedByApplicationId", { applicationId: serviceId });
  }
  async createMount(config: { type: string; mountPath: string; serviceId: string; serviceType?: string; [key: string]: unknown }): Promise<RemoteMount> {
    return this.client.post<RemoteMount>("mounts.create", config);
  }
  async updateMount(id: string, config: Record<string, unknown>): Promise<void> {
    await this.client.post("mounts.update", { mountId: id, ...config });
  }
  async deleteMount(id: string): Promise<void> {
    await this.client.post("mounts.remove", { mountId: id });
  }

  // --- Redirects ---
  async listRedirects(_applicationId: string): Promise<RemoteRedirect[]> {
    return [];
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

  // --- Security ---
  async listSecurity(_applicationId: string): Promise<RemoteSecurity[]> {
    return [];
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

  // --- Certificates ---
  async listCertificates(): Promise<RemoteCertificate[]> {
    return this.client.get<RemoteCertificate[]>("certificates.all");
  }
  async createCertificate(config: { name: string; certificateData: string; privateKey: string; [key: string]: unknown }): Promise<RemoteCertificate> {
    return this.client.post<RemoteCertificate>("certificates.create", config);
  }
  async deleteCertificate(id: string): Promise<void> {
    await this.client.post("certificates.remove", { certificateId: id });
  }

  // --- Registries ---
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
      imagePrefix: config.imagePrefix,
    });
  }
  async updateRegistry(id: string, config: Record<string, unknown>): Promise<void> {
    await this.client.post("registry.update", { registryId: id, ...config });
  }
  async deleteRegistry(id: string): Promise<void> {
    await this.client.post("registry.remove", { registryId: id });
  }

  // --- Deployment lifecycle ---
  async deploy(appId: string, opts?: { title?: string; description?: string }): Promise<DeploymentResult> {
    try {
      await this.client.post("application.deploy", { applicationId: appId, ...opts });
      return { success: true };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }
  async rollback(appId: string): Promise<void> {
    // Dokploy rollback is via redeploy with previous image
    await this.client.post("application.redeploy", { applicationId: appId });
  }
  async stop(appId: string): Promise<void> {
    await this.client.post("application.stop", { applicationId: appId });
  }
  async start(appId: string): Promise<void> {
    await this.client.post("application.start", { applicationId: appId });
  }
}
```

```ts
// src/providers/dokploy/index.ts
export { DokployProvider } from "./provider";
export { DokployClient } from "./client";
```

**Step 3: Run tests**

```bash
bun test tests/providers/dokploy/provider.test.ts
```

Expected: PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: implement full Dokploy provider with all resource types"
```

---

## Phase 7: CLI Commands

### Task 10: Set up CLI framework with Commander

**Files:**
- Create: `src/cli/index.ts`
- Modify: `src/index.ts`
- Modify: `package.json` (add bin field)

**Step 1: Create CLI entry point**

```ts
// src/cli/index.ts
import { Command } from "commander";

export function createCli(): Command {
  const program = new Command();

  program
    .name("dac")
    .description("Deploy As Code — platform-agnostic IaC for PaaS")
    .version("0.1.0");

  return program;
}
```

**Step 2: Update src/index.ts**

```ts
// src/index.ts
#!/usr/bin/env bun
export { defineConfig } from "./types/config";
export { DokployProvider } from "./providers/dokploy";
export type { DacConfig } from "./types/config";
export type { Provider } from "./providers/provider";
```

**Step 3: Create CLI runner**

```ts
// src/cli.ts
#!/usr/bin/env bun
import { createCli } from "./cli/index";

const program = createCli();
program.parse();
```

**Step 4: Update package.json bin**

Add to package.json:
```json
{
  "bin": {
    "dac": "./src/cli.ts"
  }
}
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: set up CLI framework with Commander"
```

### Task 11: Implement `dac init` command

**Files:**
- Create: `src/cli/init.ts`
- Modify: `src/cli/index.ts`

**Step 1: Implement init command**

```ts
// src/cli/init.ts
import { Command } from "commander";
import { existsSync, writeFileSync } from "fs";
import { join } from "path";
import chalk from "chalk";

const TEMPLATE = `import { defineConfig } from "dac";

export default defineConfig({
  providers: {
    // Configure your providers here
    // staging: { type: "dokploy", url: process.env.DOKPLOY_URL!, apiKey: process.env.DOKPLOY_API_KEY! },
  },

  project: {
    name: "my-project",
    description: "My project deployed with dac",
  },

  environments: {
    // staging: {
    //   provider: "staging",
    //   applications: [],
    //   databases: [],
    // },
  },
});
`;

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Scaffold a new dac.config.ts")
    .action(() => {
      const configPath = join(process.cwd(), "dac.config.ts");
      if (existsSync(configPath)) {
        console.log(chalk.yellow("dac.config.ts already exists. Skipping."));
        return;
      }
      writeFileSync(configPath, TEMPLATE);
      console.log(chalk.green("Created dac.config.ts"));
      console.log("Edit the config file and run " + chalk.cyan("dac plan") + " to see what will change.");
    });
}
```

**Step 2: Register in CLI index**

Update `src/cli/index.ts` to import and register the init command:

```ts
// src/cli/index.ts
import { Command } from "commander";
import { registerInitCommand } from "./init";

export function createCli(): Command {
  const program = new Command();

  program
    .name("dac")
    .description("Deploy As Code — platform-agnostic IaC for PaaS")
    .version("0.1.0");

  registerInitCommand(program);

  return program;
}
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: implement dac init command"
```

### Task 12: Implement the plan/apply engine

**Files:**
- Create: `src/cli/engine.ts` — shared logic for plan + apply
- Create: `src/cli/plan.ts`
- Create: `src/cli/apply.ts`
- Create: `src/cli/display.ts` — pretty-print plan output
- Modify: `src/cli/index.ts`

**Step 1: Implement display helpers**

```ts
// src/cli/display.ts
import chalk from "chalk";
import type { PlanAction } from "../core/reconciler";

export function displayPlan(actions: PlanAction[]): void {
  if (actions.length === 0) {
    console.log(chalk.green("\nNo changes. Infrastructure is up to date.\n"));
    return;
  }

  console.log(chalk.bold("\nPlanned changes:\n"));

  for (const action of actions) {
    const symbol = action.action === "create" ? chalk.green("+")
      : action.action === "update" ? chalk.yellow("~")
      : chalk.red("-");
    const verb = action.action === "create" ? chalk.green("create")
      : action.action === "update" ? chalk.yellow("update")
      : chalk.red("delete");

    console.log(`  ${symbol} ${action.type} ${chalk.bold(`"${action.key.split(":")[1]}"`)}`);
  }

  const creates = actions.filter(a => a.action === "create").length;
  const updates = actions.filter(a => a.action === "update").length;
  const deletes = actions.filter(a => a.action === "delete").length;

  console.log(
    `\n  ${chalk.green(`${creates} to create`)}, ${chalk.yellow(`${updates} to update`)}, ${chalk.red(`${deletes} to delete`)}\n`
  );
}
```

**Step 2: Implement the engine (shared plan/apply logic)**

```ts
// src/cli/engine.ts
import { loadConfig } from "../config/loader";
import { StateManager } from "../core/state";
import { Reconciler, type DesiredResource, type PlanAction } from "../core/reconciler";
import { orderActions } from "../core/dependency";
import { DokployProvider } from "../providers/dokploy";
import type { Provider } from "../providers/provider";

export interface EngineResult {
  actions: PlanAction[];
  providers: Record<string, Provider>;
  state: StateManager;
}

function createProvider(config: { type: string; [key: string]: unknown }): Provider {
  switch (config.type) {
    case "dokploy":
      return new DokployProvider(config.url as string, config.apiKey as string);
    default:
      throw new Error(`Unknown provider type: ${config.type}`);
  }
}

export async function buildPlan(cwd: string): Promise<EngineResult> {
  const config = await loadConfig(cwd);
  const state = new StateManager(cwd);

  // Build provider instances
  const providers: Record<string, Provider> = {};
  for (const [name, providerConfig] of Object.entries(config.providers)) {
    providers[name] = createProvider(providerConfig);
  }

  // Build desired resource list
  const desired: DesiredResource[] = [];

  // Project
  desired.push({
    key: "project:" + config.project.name,
    type: "project",
    config: { name: config.project.name, description: config.project.description },
  });

  // Environments and their resources
  for (const [envName, env] of Object.entries(config.environments)) {
    desired.push({
      key: `environment:${envName}`,
      type: "environment",
      config: { name: envName, description: env.description },
      dependsOn: ["project:" + config.project.name],
    });

    for (const db of env.databases ?? []) {
      desired.push({
        key: `database:${db.name}`,
        type: "database",
        config: { ...db, _provider: env.provider },
        dependsOn: [`environment:${envName}`],
      });
    }

    for (const app of env.applications ?? []) {
      desired.push({
        key: `application:${app.name}`,
        type: "application",
        config: { ...app, _provider: env.provider },
        dependsOn: [`environment:${envName}`],
      });
    }

    for (const comp of env.compose ?? []) {
      desired.push({
        key: `compose:${comp.name}`,
        type: "compose",
        config: { ...comp, _provider: env.provider },
        dependsOn: [`environment:${envName}`],
      });
    }
  }

  // Diff against current state
  const currentResources = state.listResources(
    Object.keys(config.providers)[0] ?? "default"
  );
  const actions = orderActions(Reconciler.diff(desired, currentResources));

  return { actions, providers, state };
}
```

**Step 3: Implement plan command**

```ts
// src/cli/plan.ts
import { Command } from "commander";
import { buildPlan } from "./engine";
import { displayPlan } from "./display";
import chalk from "chalk";

export function registerPlanCommand(program: Command): void {
  program
    .command("plan")
    .description("Show what changes would be applied")
    .option("-d, --dir <dir>", "Config directory", process.cwd())
    .action(async (opts) => {
      try {
        const { actions } = await buildPlan(opts.dir);
        displayPlan(actions);
      } catch (e) {
        console.error(chalk.red(`Error: ${(e as Error).message}`));
        process.exit(1);
      }
    });
}
```

**Step 4: Implement apply command**

```ts
// src/cli/apply.ts
import { Command } from "commander";
import { buildPlan } from "./engine";
import { displayPlan } from "./display";
import chalk from "chalk";
import type { PlanAction } from "../core/reconciler";
import type { Provider } from "../providers/provider";
import type { StateManager } from "../core/state";

async function executeAction(
  action: PlanAction,
  provider: Provider,
  state: StateManager,
  providerName: string,
): Promise<void> {
  const resourceName = action.key.split(":").slice(1).join(":");

  switch (action.action) {
    case "create": {
      let result: { id: string };
      switch (action.type) {
        case "project":
          result = await provider.createProject(action.config as { name: string; description?: string });
          break;
        case "environment": {
          const projectState = state.getResource(providerName, `project:${action.config!.name ?? ""}`);
          const projectKey = Object.keys(state.listResources(providerName)).find(k => k.startsWith("project:"));
          const projectId = projectKey ? state.getResource(providerName, projectKey)?.remoteId : undefined;
          result = await provider.createEnvironment({
            name: action.config!.name as string,
            description: action.config!.description as string | undefined,
            projectId: projectId!,
          });
          break;
        }
        case "application": {
          const envKey = Object.keys(state.listResources(providerName)).find(k => k.startsWith("environment:"));
          const envId = envKey ? state.getResource(providerName, envKey)?.remoteId : undefined;
          result = await provider.createApplication({
            name: action.config!.name as string,
            environmentId: envId!,
          });
          break;
        }
        case "database": {
          const envKey = Object.keys(state.listResources(providerName)).find(k => k.startsWith("environment:"));
          const envId = envKey ? state.getResource(providerName, envKey)?.remoteId : undefined;
          result = await provider.createDatabase({
            ...(action.config as Record<string, unknown>),
            environmentId: envId!,
          });
          break;
        }
        case "compose": {
          const envKey = Object.keys(state.listResources(providerName)).find(k => k.startsWith("environment:"));
          const envId = envKey ? state.getResource(providerName, envKey)?.remoteId : undefined;
          result = await provider.createCompose({
            name: action.config!.name as string,
            environmentId: envId!,
          });
          break;
        }
        default:
          throw new Error(`Unknown resource type: ${action.type}`);
      }
      state.setResource(providerName, provider.type, action.key, { remoteId: result.id });
      console.log(chalk.green(`  + Created ${action.type} "${resourceName}"`));
      break;
    }

    case "update": {
      switch (action.type) {
        case "project":
          await provider.updateProject(action.remoteId!, action.config as { name?: string });
          break;
        case "environment":
          await provider.updateEnvironment(action.remoteId!, action.config as { name?: string });
          break;
        case "application":
          await provider.updateApplication(action.remoteId!, action.config as Record<string, unknown>);
          break;
        case "database":
          await provider.updateDatabase(action.remoteId!, action.config as Record<string, unknown>);
          break;
        case "compose":
          await provider.updateCompose(action.remoteId!, action.config as Record<string, unknown>);
          break;
      }
      console.log(chalk.yellow(`  ~ Updated ${action.type} "${resourceName}"`));
      break;
    }

    case "delete": {
      switch (action.type) {
        case "project":
          await provider.deleteProject(action.remoteId!);
          break;
        case "environment":
          await provider.deleteEnvironment(action.remoteId!);
          break;
        case "application":
          await provider.deleteApplication(action.remoteId!);
          break;
        case "database":
          await provider.deleteDatabase(action.remoteId!);
          break;
        case "compose":
          await provider.deleteCompose(action.remoteId!);
          break;
      }
      state.removeResource(providerName, action.key);
      console.log(chalk.red(`  - Deleted ${action.type} "${resourceName}"`));
      break;
    }
  }
}

export function registerApplyCommand(program: Command): void {
  program
    .command("apply")
    .description("Apply changes to match config")
    .option("-d, --dir <dir>", "Config directory", process.cwd())
    .option("--auto-approve", "Skip confirmation prompt", false)
    .action(async (opts) => {
      try {
        const { actions, providers, state } = await buildPlan(opts.dir);

        if (actions.length === 0) {
          displayPlan(actions);
          return;
        }

        displayPlan(actions);

        if (!opts.autoApprove) {
          process.stdout.write("Apply changes? [y/N] ");
          const response = await new Promise<string>((resolve) => {
            process.stdin.once("data", (data) => resolve(data.toString().trim()));
          });
          if (response.toLowerCase() !== "y") {
            console.log(chalk.yellow("Cancelled."));
            return;
          }
        }

        console.log(chalk.bold("\nApplying...\n"));

        const providerName = Object.keys(providers)[0];
        const provider = providers[providerName];

        for (const action of actions) {
          await executeAction(action, provider, state, providerName);
        }

        state.save();
        console.log(chalk.green("\nApply complete.\n"));
      } catch (e) {
        console.error(chalk.red(`Error: ${(e as Error).message}`));
        process.exit(1);
      }
    });
}
```

**Step 5: Implement deploy, destroy, status, rollback commands**

```ts
// src/cli/deploy.ts
import { Command } from "commander";
import { loadConfig } from "../config/loader";
import { StateManager } from "../core/state";
import { DokployProvider } from "../providers/dokploy";
import chalk from "chalk";

export function registerDeployCommand(program: Command): void {
  program
    .command("deploy [app]")
    .description("Deploy an application or all applications")
    .option("-d, --dir <dir>", "Config directory", process.cwd())
    .action(async (app, opts) => {
      try {
        const config = await loadConfig(opts.dir);
        const state = new StateManager(opts.dir);
        const providerName = Object.keys(config.providers)[0];
        const providerConfig = config.providers[providerName];
        const provider = new DokployProvider(providerConfig.url as string, providerConfig.apiKey as string);

        const resources = state.listResources(providerName);
        const appKeys = Object.keys(resources).filter(k => k.startsWith("application:"));

        if (app) {
          const key = `application:${app}`;
          const resource = resources[key];
          if (!resource) {
            console.error(chalk.red(`Application "${app}" not found in state. Run dac apply first.`));
            process.exit(1);
          }
          console.log(`Deploying ${chalk.bold(app)}...`);
          const result = await provider.deploy(resource.remoteId);
          if (result.success) {
            console.log(chalk.green(`Deployed ${app} successfully.`));
          } else {
            console.error(chalk.red(`Deploy failed: ${result.error}`));
          }
        } else {
          for (const key of appKeys) {
            const name = key.split(":")[1];
            const resource = resources[key];
            console.log(`Deploying ${chalk.bold(name)}...`);
            const result = await provider.deploy(resource.remoteId);
            if (result.success) {
              console.log(chalk.green(`  Deployed ${name}`));
            } else {
              console.error(chalk.red(`  Failed: ${result.error}`));
            }
          }
        }
      } catch (e) {
        console.error(chalk.red(`Error: ${(e as Error).message}`));
        process.exit(1);
      }
    });
}
```

```ts
// src/cli/destroy.ts
import { Command } from "commander";
import { loadConfig } from "../config/loader";
import { StateManager } from "../core/state";
import { DokployProvider } from "../providers/dokploy";
import chalk from "chalk";

export function registerDestroyCommand(program: Command): void {
  program
    .command("destroy")
    .description("Tear down all managed resources")
    .option("-d, --dir <dir>", "Config directory", process.cwd())
    .option("--auto-approve", "Skip confirmation", false)
    .action(async (opts) => {
      try {
        const config = await loadConfig(opts.dir);
        const state = new StateManager(opts.dir);
        const providerName = Object.keys(config.providers)[0];
        const providerConfig = config.providers[providerName];
        const provider = new DokployProvider(providerConfig.url as string, providerConfig.apiKey as string);

        const resources = state.listResources(providerName);
        const keys = Object.keys(resources);

        if (keys.length === 0) {
          console.log(chalk.green("No managed resources to destroy."));
          return;
        }

        console.log(chalk.red.bold(`\nThis will destroy ${keys.length} resources:\n`));
        for (const key of keys) {
          console.log(chalk.red(`  - ${key}`));
        }

        if (!opts.autoApprove) {
          process.stdout.write("\nDestroy all resources? [y/N] ");
          const response = await new Promise<string>((resolve) => {
            process.stdin.once("data", (data) => resolve(data.toString().trim()));
          });
          if (response.toLowerCase() !== "y") {
            console.log(chalk.yellow("Cancelled."));
            return;
          }
        }

        // Delete in reverse dependency order
        const typeOrder = ["security", "redirect", "mount", "port", "domain", "compose", "application", "database", "environment", "project"];
        const sorted = keys.sort((a, b) => {
          const typeA = a.split(":")[0];
          const typeB = b.split(":")[0];
          return typeOrder.indexOf(typeA) - typeOrder.indexOf(typeB);
        });

        for (const key of sorted) {
          const type = key.split(":")[0];
          const id = resources[key].remoteId;
          try {
            switch (type) {
              case "application": await provider.deleteApplication(id); break;
              case "database": await provider.deleteDatabase(id); break;
              case "compose": await provider.deleteCompose(id); break;
              case "environment": await provider.deleteEnvironment(id); break;
              case "project": await provider.deleteProject(id); break;
            }
            state.removeResource(providerName, key);
            console.log(chalk.red(`  - Destroyed ${key}`));
          } catch (e) {
            console.error(chalk.red(`  Failed to destroy ${key}: ${(e as Error).message}`));
          }
        }

        state.save();
        console.log(chalk.green("\nDestroy complete."));
      } catch (e) {
        console.error(chalk.red(`Error: ${(e as Error).message}`));
        process.exit(1);
      }
    });
}
```

```ts
// src/cli/status.ts
import { Command } from "commander";
import { loadConfig } from "../config/loader";
import { StateManager } from "../core/state";
import chalk from "chalk";

export function registerStatusCommand(program: Command): void {
  program
    .command("status")
    .description("Show current state of managed resources")
    .option("-d, --dir <dir>", "Config directory", process.cwd())
    .action(async (opts) => {
      try {
        const config = await loadConfig(opts.dir);
        const state = new StateManager(opts.dir);

        console.log(chalk.bold(`\nProject: ${config.project.name}\n`));

        for (const providerName of Object.keys(config.providers)) {
          const resources = state.listResources(providerName);
          const keys = Object.keys(resources);

          console.log(chalk.bold(`Provider: ${providerName} (${config.providers[providerName].type})`));

          if (keys.length === 0) {
            console.log(chalk.dim("  No managed resources. Run dac apply to create them.\n"));
            continue;
          }

          for (const key of keys) {
            const resource = resources[key];
            console.log(`  ${chalk.cyan(key)} → ${chalk.dim(resource.remoteId)}`);
          }
          console.log();
        }
      } catch (e) {
        console.error(chalk.red(`Error: ${(e as Error).message}`));
        process.exit(1);
      }
    });
}
```

```ts
// src/cli/rollback.ts
import { Command } from "commander";
import { loadConfig } from "../config/loader";
import { StateManager } from "../core/state";
import { DokployProvider } from "../providers/dokploy";
import chalk from "chalk";

export function registerRollbackCommand(program: Command): void {
  program
    .command("rollback <app>")
    .description("Rollback an application to previous deployment")
    .option("-d, --dir <dir>", "Config directory", process.cwd())
    .action(async (app, opts) => {
      try {
        const config = await loadConfig(opts.dir);
        const state = new StateManager(opts.dir);
        const providerName = Object.keys(config.providers)[0];
        const providerConfig = config.providers[providerName];
        const provider = new DokployProvider(providerConfig.url as string, providerConfig.apiKey as string);

        const resource = state.getResource(providerName, `application:${app}`);
        if (!resource) {
          console.error(chalk.red(`Application "${app}" not found in state.`));
          process.exit(1);
        }

        console.log(`Rolling back ${chalk.bold(app)}...`);
        await provider.rollback(resource.remoteId);
        console.log(chalk.green(`Rollback initiated for ${app}.`));
      } catch (e) {
        console.error(chalk.red(`Error: ${(e as Error).message}`));
        process.exit(1);
      }
    });
}
```

**Step 6: Register all commands in CLI index**

```ts
// src/cli/index.ts
import { Command } from "commander";
import { registerInitCommand } from "./init";
import { registerPlanCommand } from "./plan";
import { registerApplyCommand } from "./apply";
import { registerDeployCommand } from "./deploy";
import { registerDestroyCommand } from "./destroy";
import { registerStatusCommand } from "./status";
import { registerRollbackCommand } from "./rollback";

export function createCli(): Command {
  const program = new Command();

  program
    .name("dac")
    .description("Deploy As Code — platform-agnostic IaC for PaaS")
    .version("0.1.0");

  registerInitCommand(program);
  registerPlanCommand(program);
  registerApplyCommand(program);
  registerDeployCommand(program);
  registerDestroyCommand(program);
  registerStatusCommand(program);
  registerRollbackCommand(program);

  return program;
}
```

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: implement all CLI commands (plan, apply, deploy, destroy, status, rollback)"
```

---

## Phase 8: Build & Distribution

### Task 13: Compile to single binary with Bun

**Files:**
- Modify: `package.json` (add build script)

**Step 1: Add build scripts to package.json**

```json
{
  "scripts": {
    "dev": "bun run src/cli.ts",
    "build": "bun build src/cli.ts --compile --outfile dist/dac",
    "test": "bun test"
  }
}
```

**Step 2: Test the build**

```bash
bun run build
./dist/dac --help
```

Expected: Shows CLI help output

**Step 3: Test the binary**

```bash
./dist/dac init
```

Expected: Creates dac.config.ts

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add bun compile for single binary distribution"
```

---

## Phase 9: Integration Tests

### Task 14: Write integration test for full plan/apply cycle

**Files:**
- Create: `tests/integration/plan-apply.test.ts`

**Step 1: Write test using mock provider**

```ts
// tests/integration/plan-apply.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { Reconciler } from "../../src/core/reconciler";
import { StateManager } from "../../src/core/state";
import { orderActions } from "../../src/core/dependency";
import { rmSync, mkdirSync } from "fs";

const TEST_DIR = "/tmp/dac-integration-test";

describe("Plan/Apply integration", () => {
  beforeEach(() => mkdirSync(TEST_DIR, { recursive: true }));
  afterEach(() => rmSync(TEST_DIR, { recursive: true, force: true }));

  it("full lifecycle: create → update → delete", () => {
    const state = new StateManager(TEST_DIR);

    // Step 1: Initial create
    const desired1 = [
      { key: "project:app", type: "project", config: { name: "app" } },
      { key: "environment:staging", type: "environment", config: { name: "staging" } },
      { key: "database:pg", type: "database", config: { name: "pg", type: "postgres" } },
      { key: "application:api", type: "application", config: { name: "api" } },
    ];
    const plan1 = orderActions(Reconciler.diff(desired1, {}));
    expect(plan1).toHaveLength(4);
    expect(plan1.every(a => a.action === "create")).toBe(true);
    // Verify ordering: project → environment → database → application
    expect(plan1[0].type).toBe("project");
    expect(plan1[1].type).toBe("environment");

    // Simulate apply
    for (const action of plan1) {
      state.setResource("staging", "dokploy", action.key, { remoteId: `id-${action.key}` });
    }
    state.save();

    // Step 2: Update (add a new app, remove db)
    const desired2 = [
      { key: "project:app", type: "project", config: { name: "app" } },
      { key: "environment:staging", type: "environment", config: { name: "staging" } },
      { key: "application:api", type: "application", config: { name: "api", replicas: 3 } },
      { key: "application:worker", type: "application", config: { name: "worker" } },
    ];
    const state2 = new StateManager(TEST_DIR);
    const current2 = state2.listResources("staging");
    const plan2 = orderActions(Reconciler.diff(desired2, current2));

    const creates = plan2.filter(a => a.action === "create");
    const updates = plan2.filter(a => a.action === "update");
    const deletes = plan2.filter(a => a.action === "delete");

    expect(creates).toHaveLength(1); // worker
    expect(creates[0].key).toBe("application:worker");
    expect(updates).toHaveLength(3); // project, environment, api
    expect(deletes).toHaveLength(1); // database:pg
    expect(deletes[0].key).toBe("database:pg");
  });
});
```

**Step 2: Run tests**

```bash
bun test
```

Expected: ALL PASS

**Step 3: Commit**

```bash
git add -A
git commit -m "test: add integration test for full plan/apply lifecycle"
```

---

## Summary

| Phase | Tasks | What it delivers |
|-------|-------|-----------------|
| 1 | Task 1 | Bun project with dependencies |
| 2 | Task 2 | All Zod schemas with discriminated unions (full type-safe DX) |
| 3 | Tasks 3-4 | Provider interface + State manager |
| 4 | Tasks 5-6 | Config loader + reference resolver |
| 5 | Task 7 | Reconciler with dependency ordering |
| 6 | Tasks 8-9 | Dokploy provider (full API coverage) |
| 7 | Tasks 10-12 | All CLI commands |
| 8 | Task 13 | Single binary build |
| 9 | Task 14 | Integration tests |
