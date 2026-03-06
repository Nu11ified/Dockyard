import chalk from "chalk";
import { loadConfig } from "../config/loader";
import { StateManager } from "../core/state";
import { createProvider } from "./engine";
import type { Provider } from "../providers/provider";

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

// Reverse dependency order for teardown
const DESTROY_ORDER = [
  "security",
  "redirect",
  "mount",
  "port",
  "domain",
  "compose",
  "application",
  "database",
  "certificate",
  "registry",
  "environment",
  "project",
];

export async function destroyCommand(options: { autoApprove?: boolean } = {}): Promise<void> {
  try {
    const cwd = process.cwd();
    const config = await loadConfig(cwd);
    const state = new StateManager(cwd);

    // Create providers
    const providers: Record<string, Provider> = {};
    for (const [name, providerConfig] of Object.entries(config.providers)) {
      providers[name] = createProvider(name, providerConfig);
    }

    // Collect all resources from state, sorted in reverse dependency order
    const resourcesToDelete: Array<{
      providerName: string;
      key: string;
      remoteId: string;
      type: string;
    }> = [];

    for (const [providerName] of Object.entries(config.providers)) {
      const resources = state.listResources(providerName);
      for (const [key, value] of Object.entries(resources)) {
        const type = key.split(":")[0];
        resourcesToDelete.push({
          providerName,
          key,
          remoteId: value.remoteId,
          type,
        });
      }
    }

    // Sort by reverse dependency order
    resourcesToDelete.sort((a, b) => {
      const aOrder = DESTROY_ORDER.indexOf(a.type);
      const bOrder = DESTROY_ORDER.indexOf(b.type);
      return (aOrder === -1 ? 99 : aOrder) - (bOrder === -1 ? 99 : bOrder);
    });

    if (resourcesToDelete.length === 0) {
      console.log(chalk.green("\nNo managed resources to destroy.\n"));
      return;
    }

    console.log(chalk.bold(chalk.red("\nResources to destroy:\n")));
    for (const resource of resourcesToDelete) {
      const label = resource.key.split(":").slice(1).join(":");
      console.log(`  ${chalk.red("-")} ${resource.type} ${chalk.bold(`"${label}"`)} (${resource.remoteId})`);
    }
    console.log(chalk.red(`\n  ${resourcesToDelete.length} resources will be destroyed.\n`));

    if (!options.autoApprove) {
      const approved = await confirm("Are you sure you want to destroy all resources?");
      if (!approved) {
        console.log(chalk.yellow("\nDestroy cancelled.\n"));
        return;
      }
    }

    console.log(chalk.bold("\nDestroying resources...\n"));

    for (const resource of resourcesToDelete) {
      const provider = providers[resource.providerName];
      if (!provider) {
        console.error(chalk.red(`  Provider "${resource.providerName}" not found. Skipping ${resource.key}.`));
        continue;
      }

      const label = resource.key.split(":").slice(1).join(":");

      try {
        switch (resource.type) {
          case "project":
            await provider.deleteProject(resource.remoteId);
            break;
          case "environment":
            await provider.deleteEnvironment(resource.remoteId);
            break;
          case "application":
            await provider.deleteApplication(resource.remoteId);
            break;
          case "database":
            await provider.deleteDatabase(resource.remoteId);
            break;
          case "compose":
            await provider.deleteCompose(resource.remoteId);
            break;
          case "domain":
            await provider.deleteDomain(resource.remoteId);
            break;
          case "port":
            await provider.deletePort(resource.remoteId);
            break;
          case "mount":
            await provider.deleteMount(resource.remoteId);
            break;
          case "redirect":
            await provider.deleteRedirect(resource.remoteId);
            break;
          case "security":
            await provider.deleteSecurity(resource.remoteId);
            break;
          case "certificate":
            await provider.deleteCertificate(resource.remoteId);
            break;
          case "registry":
            await provider.deleteRegistry(resource.remoteId);
            break;
          default:
            console.log(chalk.yellow(`  Skipping unknown type: ${resource.type}`));
            continue;
        }

        state.removeResource(resource.providerName, resource.key);
        state.save();
        console.log(`  ${chalk.red("-")} ${resource.type} ${chalk.bold(`"${label}"`)} ... ${chalk.green("destroyed")}`);
      } catch (error) {
        console.error(chalk.red(`  Failed to destroy ${resource.type} "${label}": ${(error as Error).message}`));
      }
    }

    console.log(chalk.green("\nAll resources destroyed.\n"));
  } catch (error) {
    console.error(chalk.red(`Error: ${(error as Error).message}`));
    process.exit(1);
  }
}
