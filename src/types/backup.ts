import { z } from "zod";

export const BackupSchema = z.object({
  enabled: z.boolean().default(false),
  schedule: z.string().optional(),
  destination: z.string().optional(),
});

export type Backup = z.infer<typeof BackupSchema>;
