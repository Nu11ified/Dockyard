import { existsSync } from "fs";
import { join, resolve } from "path";
import { DacConfigSchema, type DacConfig } from "../types/config.js";

export async function loadConfig(baseDir: string): Promise<DacConfig> {
  const configPath = join(resolve(baseDir), "dac.config.ts");

  if (!existsSync(configPath)) {
    throw new Error(`No dac.config.ts found in ${baseDir}`);
  }

  // Append a cache-busting query to avoid stale module cache in Bun
  const mod = await import(`${configPath}?t=${Date.now()}`);
  const raw = mod.default ?? mod;

  const result = DacConfigSchema.safeParse(raw);
  if (!result.success) {
    const errors = result.error.issues
      .map((i: any) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid config:\n${errors}`);
  }

  return result.data;
}
