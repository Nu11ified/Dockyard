# DAC — Deploy As Code

**Date:** 2026-03-06
**Status:** Approved

## Overview

`dac` is a platform-agnostic Infrastructure-as-Code CLI tool for PaaS platforms. Users declare their entire infrastructure in a type-safe TypeScript config file (`dac.config.ts`), and the tool reconciles live state against the declared desired state — creating, updating, or deleting resources as needed.

Built with **Bun** (compiled to a single binary), **Zod** (schema validation + TypeScript type inference), and a **provider architecture** that abstracts over multiple platforms (Dokploy first, Railway/Coolify/etc. later).

## Goals

- **Declarative**: Define infrastructure once, apply anywhere
- **Type-safe DX**: Full autocomplete, discriminated unions, compile-time errors in the config file
- **Platform-agnostic**: Provider interface abstracts over Dokploy, Railway, Coolify, etc.
- **Reconciliation**: Terraform-style plan/apply with diffs and confirmation prompts
- **Portable**: One config can target multiple providers (e.g., Dokploy for staging, Railway for prod)
- **QoL**: Auto port allocation, cross-resource references, dependency ordering, import existing resources

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Language | TypeScript + Bun | Type-safe config, single binary via `bun build --compile` |
| Config format | TypeScript (`dac.config.ts`) | Full autocomplete, discriminated unions, composability |
| State management | Reconciliation (plan/apply) | Terraform-proven pattern, visibility into changes |
| Deploy behavior | Configure-only, separate `dac deploy` | Separation of concerns, safer |
| Provider model | Per-resource via named providers | Mix providers in one config (staging/prod split) |
| CLI name | `dac` | Short for "deploy-as-code" |
| v1 scope | Full resource coverage | Projects, apps, databases, compose, domains, certs, registry, backups, redirects, security |

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  dac CLI                         │
│  init │ plan │ apply │ deploy │ destroy │ status │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│              Config Loader                       │
│  Loads dac.config.ts → validates with Zod        │
│  Resolves ${{refs}}, env vars, secrets           │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│              Reconciler                          │
│  Desired State (config) vs Current State (API)   │
│  Produces: Plan { creates, updates, deletes }    │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│           Provider Interface                     │
│  Abstract contract every provider implements     │
│  CRUD for each resource type + deploy/rollback   │
└──────┬──────────────┬───────────────┬───────────┘
       │              │               │
  ┌────▼────┐   ┌─────▼─────┐  ┌─────▼─────┐
  │ Dokploy │   │  Railway  │  │  Coolify  │
  │ Provider│   │  Provider │  │  Provider │
  └─────────┘   └───────────┘  └───────────┘
```

## Core Abstractions

Platform-agnostic types that every provider maps to/from:

```ts
type Application = {
  name: string
  source: GitHubSource | GitSource | DockerSource | ComposeSource
  build: NixpacksBuild | DockerfileBuild | BuildpackBuild | StaticBuild | RailpackBuild
  domains?: Domain[]
  env?: Record<string, string>
  ports?: Port[]
  mounts?: Mount[]
  resources?: { cpu?: string; memory?: string }
  replicas?: number
  autoDeploy?: boolean
}

type Database = {
  name: string
  type: 'postgres' | 'mysql' | 'mariadb' | 'redis' | 'mongo'
  version?: string
  backups?: BackupConfig
}

type Domain = {
  host: string
  https?: boolean | { certificate: 'letsencrypt' | 'custom' }
  redirects?: Redirect[]
}
```

These use **discriminated unions** so TypeScript narrows the type based on `type` field — users get autocomplete for only the fields relevant to their chosen source/build type.

## Provider Interface

```ts
interface Provider {
  name: string

  // Read current state
  getProject(name: string): Promise<RemoteProject | null>
  getApplications(projectId: string): Promise<RemoteApplication[]>
  getDatabases(projectId: string): Promise<RemoteDatabase[]>
  getCompose(projectId: string): Promise<RemoteCompose[]>
  getDomains(serviceId: string): Promise<RemoteDomain[]>

  // Mutations
  createProject(config: ProjectConfig): Promise<RemoteProject>
  updateProject(id: string, config: Partial<ProjectConfig>): Promise<void>
  deleteProject(id: string): Promise<void>

  createApplication(config: ApplicationConfig): Promise<RemoteApplication>
  updateApplication(id: string, config: Partial<ApplicationConfig>): Promise<void>
  deleteApplication(id: string): Promise<void>

  createDatabase(config: DatabaseConfig): Promise<RemoteDatabase>
  updateDatabase(id: string, config: Partial<DatabaseConfig>): Promise<void>
  deleteDatabase(id: string): Promise<void>

  // ... same for compose, domains, certs, mounts, ports, etc.

  // Deployment lifecycle
  deploy(appId: string): Promise<DeploymentResult>
  rollback(appId: string, deploymentId?: string): Promise<void>
  stop(appId: string): Promise<void>
  start(appId: string): Promise<void>
}
```

## State Management

State stored locally in `.dac/state.json` — maps config resource names to remote IDs:

```json
{
  "version": 1,
  "providers": {
    "staging": {
      "type": "dokploy",
      "resources": {
        "project:my-saas": { "remoteId": "abc123" },
        "application:api": { "remoteId": "def456", "projectId": "abc123" },
        "database:postgres": { "remoteId": "ghi789", "projectId": "abc123" }
      }
    }
  }
}
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `dac init` | Scaffold a new `dac.config.ts` with provider setup |
| `dac plan` | Show diff of what would change (no mutations) |
| `dac apply` | Apply changes with confirmation prompt |
| `dac apply --auto-approve` | Apply without confirmation |
| `dac deploy [app]` | Trigger deployment for an app or all apps |
| `dac destroy` | Tear down all managed resources |
| `dac status` | Show current state of all resources |
| `dac rollback <app>` | Rollback an application |
| `dac import` | Import existing resources into state |

## Config Example

```ts
// dac.config.ts
import { defineConfig, dokploy } from 'dac'

export default defineConfig({
  providers: {
    staging: dokploy({
      url: process.env.DOKPLOY_URL!,
      apiKey: process.env.DOKPLOY_API_KEY!,
    }),
  },

  project: {
    name: 'my-saas',
    description: 'My SaaS platform',
  },

  environments: {
    staging: {
      provider: 'staging',

      applications: [{
        name: 'api',
        source: {
          type: 'github',
          repo: 'myorg/api',
          branch: 'main',
        },
        build: { type: 'dockerfile', context: '.' },
        domains: [{ host: 'api.staging.example.com', https: true }],
        env: {
          NODE_ENV: 'staging',
          DATABASE_URL: '${{db.postgres.connectionString}}',
          REDIS_URL: '${{db.redis.connectionString}}',
        },
        ports: [{ container: 3000 }],
        mounts: [{ type: 'volume', name: 'uploads', path: '/app/uploads' }],
      }],

      databases: [
        { name: 'postgres', type: 'postgres', version: '16' },
        { name: 'redis', type: 'redis', version: '7' },
      ],

      compose: [{
        name: 'monitoring',
        source: {
          type: 'git',
          url: 'https://github.com/myorg/monitoring-stack.git',
          branch: 'main',
        },
      }],
    },
  },
})
```

## QoL Features

- **Auto port allocation**: `ports: [{ container: 3000 }]` auto-picks available host port, stored in state
- **Cross-resource references**: `${{db.postgres.connectionString}}` resolves after databases are created
- **Dependency ordering**: Databases created before apps that reference them
- **Dry-run by default**: `dac plan` shows changes without applying
- **Import existing**: `dac import` pulls live resources into state

## Project Structure

```
src/
├── cli/              # CLI commands (init, plan, apply, deploy, etc.)
├── config/           # Config loader, Zod schemas, reference resolver
├── core/             # Reconciler, state manager, dependency graph
├── providers/
│   ├── provider.ts   # Provider interface
│   ├── dokploy/      # Dokploy provider implementation
│   └── railway/      # (future) Railway provider
└── types/            # Shared platform-agnostic types
```
