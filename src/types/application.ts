import { z } from "zod";
import { SourceSchema } from "./source.js";
import { BuildSchema } from "./build.js";
import { DomainSchema } from "./domain.js";
import { PortSchema } from "./port.js";
import { MountSchema } from "./mount.js";
import { RedirectSchema } from "./redirect.js";
import { SecuritySchema } from "./security.js";

export const ResourcesSchema = z.object({
  cpuLimit: z.number().optional(),
  cpuReservation: z.number().optional(),
  memoryLimit: z.string().optional(),
  memoryReservation: z.string().optional(),
});

export const ApplicationSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  source: SourceSchema,
  build: BuildSchema,
  domains: z.array(DomainSchema).optional(),
  env: z.record(z.string(), z.string()).optional(),
  buildArgs: z.record(z.string(), z.string()).optional(),
  ports: z.array(PortSchema).optional(),
  mounts: z.array(MountSchema).optional(),
  redirects: z.array(RedirectSchema).optional(),
  security: z.array(SecuritySchema).optional(),
  resources: ResourcesSchema.optional(),
  replicas: z.number().optional(),
  autoDeploy: z.boolean().optional(),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
});

export type Resources = z.infer<typeof ResourcesSchema>;
export type Application = z.infer<typeof ApplicationSchema>;
