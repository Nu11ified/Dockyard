import chalk from "chalk";
import { loadConfig } from "../config/loader";
import { StateManager } from "../core/state";
import { createProvider } from "./engine";

export async function rollbackCommand(appName: string): Promise<void> {
  try {
    const cwd = process.cwd();
    const config = await loadConfig(cwd);
    const state = new StateManager(cwd);

    // Find the application across all environments
    let found = false;
    for (const [envName, env] of Object.entries(config.environments)) {
      const app = env.applications.find(a => a.name === appName);
      if (!app) continue;

      found = true;
      const providerName = env.provider;
      const providerConfig = config.providers[providerName];
      if (!providerConfig) {
        console.error(chalk.red(`Provider "${providerName}" not found in config.`));
        process.exit(1);
      }

      const provider = createProvider(providerName, providerConfig);
      const appKey = `application:${envName}/${appName}`;
      const appState = state.getResource(providerName, appKey);

      if (!appState) {
        console.error(chalk.yellow(`Application "${appName}" not yet provisioned. Run 'dac apply' first.`));
        process.exit(1);
      }

      console.log(chalk.bold(`Rolling back ${appName}...`));
      await provider.rollback(appState.remoteId);
      console.log(chalk.green(`  ${appName} rolled back successfully.`));
      break;
    }

    if (!found) {
      console.error(chalk.red(`Application "${appName}" not found in config.`));
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red(`Error: ${(error as Error).message}`));
    process.exit(1);
  }
}
