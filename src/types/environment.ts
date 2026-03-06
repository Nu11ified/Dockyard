import { z } from "zod";
import { ApplicationSchema } from "./application.js";
import { DatabaseSchema } from "./database.js";
import { ComposeSchema } from "./compose.js";

export const EnvironmentSchema = z.object({
  provider: z.string(),
  description: z.string().optional(),
  applications: z.array(ApplicationSchema).default([]),
  databases: z.array(DatabaseSchema).default([]),
  compose: z.array(ComposeSchema).default([]),
});

export type Environment = z.infer<typeof EnvironmentSchema>;
