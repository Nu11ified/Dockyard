import chalk from "chalk";
import { buildPlan } from "./engine";
import { displayPlan } from "./display";
import type { PlanAction } from "../core/reconciler";
import type { Provider } from "../providers/provider";
import type { StateManager } from "../core/state";
import type { DacConfig } from "../types/config";

async function confirm(message: string): Promise<boolean> {
  process.stdout.write(`${message} (yes/no): `);
  return new Promise((resolve) => {
    process.stdin.setEncoding("utf-8");
    process.stdin.once("data", (data: string) => {
      const answer = data.toString().trim().toLowerCase();
      resolve(answer === "yes" || answer === "y");
    });
    process.stdin.resume();
  });
}

function getProviderForAction(
  action: PlanAction,
  config: DacConfig,
  providers: Record<string, Provider>,
): Provider {
  // Project-level resources use the first provider
  if (action.type === "project") {
    const firstProviderName = Object.keys(config.providers)[0];
    return providers[firstProviderName];
  }

  // For environment and child resources, look up the provider from config
  const providerName = (action.config?.provider as string) ?? Object.keys(config.providers)[0];
  const provider = providers[providerName];
  if (!provider) {
    throw new Error(`Provider "${providerName}" not found`);
  }
  return provider;
}

function getProviderName(
  action: PlanAction,
  config: DacConfig,
): string {
  if (action.type === "project") {
    return Object.keys(config.providers)[0];
  }
  return (action.config?.provider as string) ?? Object.keys(config.providers)[0];
}

async function executeAction(
  action: PlanAction,
  provider: Provider,
  providerName: string,
  state: StateManager,
  config: DacConfig,
): Promise<void> {
  const label = `${action.type} "${action.key.split(":").slice(1).join(":")}"`;

  switch (action.type) {
    case "project": {
      if (action.action === "create") {
        const result = await provider.createProject({
          name: action.config!.name as string,
          description: action.config!.description as string | undefined,
        });
        state.setResource(providerName, config.providers[providerName].type, action.key, {
          remoteId: result.id,
          name: result.name,
        });
      } else if (action.action === "update") {
        await provider.updateProject(action.remoteId!, {
          name: action.config!.name as string,
          description: action.config!.description as string | undefined,
        });
      } else if (action.action === "delete") {
        await provider.deleteProject(action.remoteId!);
        state.removeResource(providerName, action.key);
      }
      break;
    }

    case "environment": {
      if (action.action === "create") {
        const projectKey = "project:" + config.project.name;
        const projectState = state.getResource(providerName, projectKey);
        if (!projectState) {
          throw new Error(`Project not found in state. Cannot create environment.`);
        }
        const result = await provider.createEnvironment({
          name: action.config!.name as string,
          description: action.config!.description as string | undefined,
          projectId: projectState.remoteId,
        });
        state.setResource(providerName, config.providers[providerName].type, action.key, {
          remoteId: result.id,
          name: result.name,
        });
      } else if (action.action === "update") {
        await provider.updateEnvironment(action.remoteId!, {
          name: action.config!.name as string,
          description: action.config!.description as string | undefined,
        });
      } else if (action.action === "delete") {
        await provider.deleteEnvironment(action.remoteId!);
        state.removeResource(providerName, action.key);
      }
      break;
    }

    case "application": {
      const envName = (action.config?.environment as string) ?? action.key.split(":")[1].split("/")[0];
      const envKey = "environment:" + envName;

      if (action.action === "create") {
        const envState = state.getResource(providerName, envKey);
        if (!envState) {
          throw new Error(`Environment "${envName}" not found in state. Cannot create application.`);
        }
        const result = await provider.createApplication({
          name: action.config!.name as string,
          environmentId: envState.remoteId,
        });
        state.setResource(providerName, config.providers[providerName].type, action.key, {
          remoteId: result.id,
          name: result.name,
        });
        // Apply updates for additional config after creation
        const updateConfig = { ...action.config };
        delete updateConfig.name;
        delete updateConfig.environment;
        delete updateConfig.provider;
        if (Object.keys(updateConfig).length > 0) {
          await provider.updateApplication(result.id, updateConfig);
        }
      } else if (action.action === "update") {
        const updateConfig = { ...action.config };
        delete updateConfig.environment;
        delete updateConfig.provider;
        await provider.updateApplication(action.remoteId!, updateConfig);
      } else if (action.action === "delete") {
        await provider.deleteApplication(action.remoteId!);
        state.removeResource(providerName, action.key);
      }
      break;
    }

    case "database": {
      const envName = (action.config?.environment as string) ?? action.key.split(":")[1].split("/")[0];
      const envKey = "environment:" + envName;

      if (action.action === "create") {
        const envState = state.getResource(providerName, envKey);
        if (!envState) {
          throw new Error(`Environment "${envName}" not found in state. Cannot create database.`);
        }
        const result = await provider.createDatabase({
          name: action.config!.name as string,
          type: action.config!.type as string,
          environmentId: envState.remoteId,
          ...action.config,
        });
        state.setResource(providerName, config.providers[providerName].type, action.key, {
          remoteId: result.id,
          name: result.name,
        });
      } else if (action.action === "update") {
        const updateConfig = { ...action.config };
        delete updateConfig.environment;
        delete updateConfig.provider;
        await provider.updateDatabase(action.remoteId!, updateConfig);
      } else if (action.action === "delete") {
        await provider.deleteDatabase(action.remoteId!);
        state.removeResource(providerName, action.key);
      }
      break;
    }

    case "compose": {
      const envName = (action.config?.environment as string) ?? action.key.split(":")[1].split("/")[0];
      const envKey = "environment:" + envName;

      if (action.action === "create") {
        const envState = state.getResource(providerName, envKey);
        if (!envState) {
          throw new Error(`Environment "${envName}" not found in state. Cannot create compose service.`);
        }
        const result = await provider.createCompose({
          name: action.config!.name as string,
          environmentId: envState.remoteId,
          ...action.config,
        });
        state.setResource(providerName, config.providers[providerName].type, action.key, {
          remoteId: result.id,
          name: result.name,
        });
      } else if (action.action === "update") {
        const updateConfig = { ...action.config };
        delete updateConfig.environment;
        delete updateConfig.provider;
        await provider.updateCompose(action.remoteId!, updateConfig);
      } else if (action.action === "delete") {
        await provider.deleteCompose(action.remoteId!);
        state.removeResource(providerName, action.key);
      }
      break;
    }

    default:
      console.log(chalk.yellow(`  Skipping unknown resource type: ${action.type}`));
      return;
  }

  const symbol = action.action === "create" ? chalk.green("+")
    : action.action === "update" ? chalk.yellow("~")
    : chalk.red("-");
  console.log(`  ${symbol} ${label} ... ${chalk.green("done")}`);
}

export async function applyCommand(options: { autoApprove?: boolean } = {}): Promise<void> {
  try {
    const { actions, providers, state, config } = await buildPlan(process.cwd());

    if (actions.length === 0) {
      console.log(chalk.green("\nNo changes. Infrastructure is up to date.\n"));
      return;
    }

    displayPlan(actions);

    if (!options.autoApprove) {
      const approved = await confirm("Do you want to apply these changes?");
      if (!approved) {
        console.log(chalk.yellow("\nApply cancelled.\n"));
        return;
      }
    }

    console.log(chalk.bold("\nApplying changes...\n"));

    for (const action of actions) {
      const provider = getProviderForAction(action, config, providers);
      const providerName = getProviderName(action, config);
      await executeAction(action, provider, providerName, state, config);
      state.save();
    }

    console.log(chalk.green("\nAll changes applied successfully.\n"));
  } catch (error) {
    console.error(chalk.red(`\nError: ${(error as Error).message}\n`));
    process.exit(1);
  }
}
