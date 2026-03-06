import { existsSync, writeFileSync } from "fs";
import { join } from "path";
import chalk from "chalk";

const TEMPLATE = `import { defineConfig } from "dokploy-as-code";

export default defineConfig({
  providers: {
    dokploy: {
      type: "dokploy",
      url: process.env.DOKPLOY_URL ?? "https://dokploy.example.com",
      token: process.env.DOKPLOY_TOKEN ?? "",
    },
  },

  project: {
    name: "my-project",
    description: "Managed by DAC",
  },

  environments: {
    production: {
      provider: "dokploy",
      description: "Production environment",
      applications: [],
      databases: [],
      compose: [],
    },
  },
});
`;

export async function initCommand(): Promise<void> {
  const configPath = join(process.cwd(), "dac.config.ts");

  if (existsSync(configPath)) {
    console.log(chalk.yellow("dac.config.ts already exists. Skipping."));
    return;
  }

  writeFileSync(configPath, TEMPLATE);
  console.log(chalk.green("Created dac.config.ts"));
  console.log(
    chalk.dim("\nEdit the file to configure your infrastructure, then run:"),
  );
  console.log(chalk.dim("  dac plan    — preview changes"));
  console.log(chalk.dim("  dac apply   — apply changes"));
}
