import { z } from "zod";
import { BackupSchema } from "./backup.js";

export const DatabaseSchema = z.object({
  name: z.string(),
  type: z.enum(["postgres", "mysql", "mariadb", "redis", "mongo"]),
  version: z.string().optional(),
  databaseName: z.string().optional(),
  databaseUser: z.string().optional(),
  databasePassword: z.string().optional(),
  databaseRootPassword: z.string().optional(),
  env: z.record(z.string(), z.string()).optional(),
  backups: BackupSchema.optional(),
});

export type Database = z.infer<typeof DatabaseSchema>;
