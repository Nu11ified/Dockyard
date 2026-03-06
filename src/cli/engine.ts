import { loadConfig } from "../config/loader";
import { Reconciler, type PlanAction, type DesiredResource } from "../core/reconciler";
import { StateManager } from "../core/state";
import { orderActions } from "../core/dependency";
import type { Provider } from "../providers/provider";
import type { DacConfig } from "../types/config";

export interface BuildPlanResult {
  actions: PlanAction[];
  providers: Record<string, Provider>;
  state: StateManager;
  config: DacConfig;
}

export function createProvider(name: string, providerConfig: { type: string; [key: string]: unknown }): Provider {
  if (providerConfig.type === "dokploy") {
    const { DokployProvider } = require("../providers/dokploy") as {
      DokployProvider: new (name: string, url: string, apiKey: string) => Provider;
    };
    const url = (providerConfig.url as string) ?? "";
    const apiKey = (providerConfig.token as string) ?? (providerConfig.apiKey as string) ?? "";
    return new DokployProvider(name, url, apiKey);
  }
  throw new Error(`Unknown provider type: "${providerConfig.type}". Supported types: dokploy`);
}

export async function buildPlan(cwd: string = process.cwd()): Promise<BuildPlanResult> {
  const config = await loadConfig(cwd);

  // Create provider instances
  const providers: Record<string, Provider> = {};
  for (const [name, providerConfig] of Object.entries(config.providers)) {
    providers[name] = createProvider(name, providerConfig);
  }

  // Build desired resource list
  const desired: DesiredResource[] = [];

  // Project
  desired.push({
    key: "project:" + config.project.name,
    type: "project",
    config: {
      name: config.project.name,
      description: config.project.description,
    },
  });

  // Environments and their children
  for (const [envName, env] of Object.entries(config.environments)) {
    desired.push({
      key: "environment:" + envName,
      type: "environment",
      config: {
        name: envName,
        description: env.description,
        provider: env.provider,
      },
      dependsOn: ["project:" + config.project.name],
    });

    // Applications
    for (const app of env.applications) {
      desired.push({
        key: "application:" + envName + "/" + app.name,
        type: "application",
        config: { ...app, environment: envName, provider: env.provider },
        dependsOn: ["environment:" + envName],
      });
    }

    // Databases
    for (const db of env.databases) {
      desired.push({
        key: "database:" + envName + "/" + db.name,
        type: "database",
        config: { ...db, environment: envName, provider: env.provider },
        dependsOn: ["environment:" + envName],
      });
    }

    // Compose services
    for (const compose of env.compose) {
      desired.push({
        key: "compose:" + envName + "/" + compose.name,
        type: "compose",
        config: { ...compose, environment: envName, provider: env.provider },
        dependsOn: ["environment:" + envName],
      });
    }
  }

  // Load state and diff
  const state = new StateManager(cwd);
  const currentResources = getAllCurrentResources(state, config);
  const actions = Reconciler.diff(desired, currentResources);
  const ordered = orderActions(actions);

  return { actions: ordered, providers, state, config };
}

function getAllCurrentResources(
  state: StateManager,
  config: DacConfig,
): Record<string, { remoteId: string }> {
  const all: Record<string, { remoteId: string }> = {};

  for (const [providerName] of Object.entries(config.providers)) {
    const resources = state.listResources(providerName);
    for (const [key, value] of Object.entries(resources)) {
      all[key] = { remoteId: value.remoteId };
    }
  }

  return all;
}
