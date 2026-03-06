import chalk from "chalk";
import { loadConfig } from "../config/loader";
import { StateManager } from "../core/state";
import { createProvider } from "./engine";
import type { Provider } from "../providers/provider";

export async function deployCommand(appName?: string): Promise<void> {
  try {
    const cwd = process.cwd();
    const config = await loadConfig(cwd);
    const state = new StateManager(cwd);

    // Collect all applications from config
    const apps: Array<{ name: string; envName: string; providerName: string }> = [];
    for (const [envName, env] of Object.entries(config.environments)) {
      for (const app of env.applications) {
        apps.push({ name: app.name, envName, providerName: env.provider });
      }
    }

    // Filter by app name if specified
    const targetApps = appName
      ? apps.filter(a => a.name === appName)
      : apps;

    if (targetApps.length === 0) {
      if (appName) {
        console.error(chalk.red(`Application "${appName}" not found in config.`));
      } else {
        console.log(chalk.yellow("No applications found in config."));
      }
      process.exit(1);
    }

    // Create providers
    const providers: Record<string, Provider> = {};
    for (const [name, providerConfig] of Object.entries(config.providers)) {
      providers[name] = createProvider(name, providerConfig);
    }

    for (const app of targetApps) {
      const provider = providers[app.providerName];
      if (!provider) {
        console.error(chalk.red(`Provider "${app.providerName}" not found.`));
        continue;
      }

      const appKey = `application:${app.envName}/${app.name}`;
      const appState = state.getResource(app.providerName, appKey);
      if (!appState) {
        console.error(chalk.yellow(`Application "${app.name}" not yet provisioned. Run 'dac apply' first.`));
        continue;
      }

      console.log(chalk.bold(`Deploying ${app.name}...`));
      const result = await provider.deploy(appState.remoteId);

      if (result.success) {
        console.log(chalk.green(`  ${app.name} deployed successfully.`));
      } else {
        console.error(chalk.red(`  ${app.name} deployment failed: ${result.error}`));
      }
    }
  } catch (error) {
    console.error(chalk.red(`Error: ${(error as Error).message}`));
    process.exit(1);
  }
}
