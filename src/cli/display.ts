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

    console.log(`  ${symbol} ${action.type} ${chalk.bold(`"${action.key.split(":").slice(1).join(":")}"`)} (${action.action})`);
  }

  const creates = actions.filter(a => a.action === "create").length;
  const updates = actions.filter(a => a.action === "update").length;
  const deletes = actions.filter(a => a.action === "delete").length;

  console.log(
    `\n  ${chalk.green(`${creates} to create`)}, ${chalk.yellow(`${updates} to update`)}, ${chalk.red(`${deletes} to delete`)}\n`
  );
}
