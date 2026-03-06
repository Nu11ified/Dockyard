import { z } from "zod";

export const PortSchema = z.object({
  container: z.number(),
  host: z.number().optional(),
  protocol: z.enum(["tcp", "udp"]).default("tcp"),
  publishMode: z.enum(["ingress", "host"]).default("ingress"),
});

export type Port = z.infer<typeof PortSchema>;
