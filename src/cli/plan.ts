import chalk from "chalk";
import { buildPlan } from "./engine";
import { displayPlan } from "./display";

export async function planCommand(): Promise<void> {
  try {
    const { actions } = await buildPlan(process.cwd());
    displayPlan(actions);
  } catch (error) {
    console.error(chalk.red(`Error: ${(error as Error).message}`));
    process.exit(1);
  }
}
