import { Command } from "commander";
import { initCommand } from "./init";
import { planCommand } from "./plan";
import { applyCommand } from "./apply";
import { deployCommand } from "./deploy";
import { destroyCommand } from "./destroy";
import { statusCommand } from "./status";
import { rollbackCommand } from "./rollback";

export function createCli(): Command {
  const program = new Command();

  program
    .name("dac")
    .description("Dokploy as Code — manage infrastructure declaratively")
    .version("0.1.0");

  program
    .command("init")
    .description("Scaffold a new dac.config.ts file")
    .action(async () => {
      await initCommand();
    });

  program
    .command("plan")
    .description("Preview infrastructure changes")
    .action(async () => {
      await planCommand();
    });

  program
    .command("apply")
    .description("Apply infrastructure changes")
    .option("--auto-approve", "Skip confirmation prompt")
    .action(async (opts) => {
      await applyCommand({ autoApprove: opts.autoApprove });
    });

  program
    .command("deploy [app]")
    .description("Deploy an application (or all applications)")
    .action(async (app?: string) => {
      await deployCommand(app);
    });

  program
    .command("destroy")
    .description("Destroy all managed resources")
    .option("--auto-approve", "Skip confirmation prompt")
    .action(async (opts) => {
      await destroyCommand({ autoApprove: opts.autoApprove });
    });

  program
    .command("status")
    .description("Show all managed resources and their remote IDs")
    .action(async () => {
      await statusCommand();
    });

  program
    .command("rollback <app>")
    .description("Rollback an application to its previous deployment")
    .action(async (app: string) => {
      await rollbackCommand(app);
    });

  return program;
}
