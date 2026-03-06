import { z } from "zod";

export const CertificateSchema = z.object({
  name: z.string(),
  certificateData: z.string(),
  privateKey: z.string(),
  autoRenew: z.boolean().optional(),
});

export type Certificate = z.infer<typeof CertificateSchema>;
