import { z } from "zod";
import { GitHubSourceSchema } from "./source.js";
import { GitLabSourceSchema } from "./source.js";
import { GitSourceSchema } from "./source.js";
import { BitbucketSourceSchema } from "./source.js";
import { GiteaSourceSchema } from "./source.js";
import { DomainSchema } from "./domain.js";

export const RawComposeSourceSchema = z.object({
  type: z.literal("raw"),
  content: z.string(),
});

export const ComposeSourceSchema = z.discriminatedUnion("type", [
  GitHubSourceSchema,
  GitLabSourceSchema,
  GitSourceSchema,
  BitbucketSourceSchema,
  GiteaSourceSchema,
  RawComposeSourceSchema,
]);

export const ComposeSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  source: ComposeSourceSchema,
  env: z.record(z.string(), z.string()).optional(),
  domains: z.record(z.string(), z.array(DomainSchema)).optional(),
});

export type RawComposeSource = z.infer<typeof RawComposeSourceSchema>;
export type ComposeSource = z.infer<typeof ComposeSourceSchema>;
export type Compose = z.infer<typeof ComposeSchema>;
