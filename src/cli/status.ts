import chalk from "chalk";
import { loadConfig } from "../config/loader";
import { StateManager } from "../core/state";

export async function statusCommand(): Promise<void> {
  try {
    const cwd = process.cwd();
    const config = await loadConfig(cwd);
    const state = new StateManager(cwd);

    let hasResources = false;

    for (const [providerName] of Object.entries(config.providers)) {
      const resources = state.listResources(providerName);
      const entries = Object.entries(resources);

      if (entries.length === 0) continue;
      hasResources = true;

      console.log(chalk.bold(`\nProvider: ${providerName}\n`));
      console.log(
        `  ${chalk.dim("TYPE".padEnd(15))} ${chalk.dim("NAME".padEnd(30))} ${chalk.dim("REMOTE ID")}`,
      );
      console.log(`  ${"─".repeat(15)} ${"─".repeat(30)} ${"─".repeat(30)}`);

      for (const [key, value] of entries) {
        const type = key.split(":")[0];
        const name = key.split(":").slice(1).join(":");
        console.log(
          `  ${type.padEnd(15)} ${name.padEnd(30)} ${value.remoteId}`,
        );
      }
    }

    if (!hasResources) {
      console.log(chalk.yellow("\nNo managed resources found. Run 'dac apply' to create resources.\n"));
    } else {
      console.log("");
    }
  } catch (error) {
    console.error(chalk.red(`Error: ${(error as Error).message}`));
    process.exit(1);
  }
}
