import { z } from "zod";

export const HttpsConfigSchema = z.object({
  certificate: z.enum(["letsencrypt", "none", "custom"]),
  customCertResolver: z.string().optional(),
});

export const DomainSchema = z.object({
  host: z.string(),
  path: z.string().optional(),
  port: z.number().optional(),
  https: z.union([z.boolean(), HttpsConfigSchema]).optional(),
  stripPath: z.boolean().optional(),
  internalPath: z.string().optional(),
});

export type HttpsConfig = z.infer<typeof HttpsConfigSchema>;
export type Domain = z.infer<typeof DomainSchema>;
