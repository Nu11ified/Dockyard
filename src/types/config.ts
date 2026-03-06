import { z } from "zod";
import { EnvironmentSchema } from "./environment.js";
import { CertificateSchema } from "./certificate.js";
import { RegistrySchema } from "./registry.js";

export const ProviderConfigSchema = z
  .object({
    type: z.string(),
    url: z.string().optional(),
    apiKey: z.string().optional(),
    token: z.string().optional(),
  })
  .passthrough();

export const ProjectConfigSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export const DacConfigSchema = z.object({
  providers: z.record(z.string(), ProviderConfigSchema),
  project: ProjectConfigSchema,
  environments: z.record(z.string(), EnvironmentSchema),
  certificates: z.array(CertificateSchema).optional(),
  registries: z.array(RegistrySchema).optional(),
});

export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;
export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;
export type DacConfig = z.infer<typeof DacConfigSchema>;

export function defineConfig(config: DacConfig): DacConfig {
  return DacConfigSchema.parse(config);
}
