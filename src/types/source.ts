import { z } from "zod";

export const GitHubSourceSchema = z.object({
  type: z.literal("github"),
  repo: z.string(),
  branch: z.string(),
  owner: z.string(),
  buildPath: z.string().optional(),
  watchPaths: z.array(z.string()).optional(),
  enableSubmodules: z.boolean().optional(),
  triggerType: z.string().optional(),
});

export const GitLabSourceSchema = z.object({
  type: z.literal("gitlab"),
  repo: z.string(),
  branch: z.string(),
  owner: z.string(),
  buildPath: z.string().optional(),
  projectId: z.number().optional(),
  pathNamespace: z.string().optional(),
  watchPaths: z.array(z.string()).optional(),
  enableSubmodules: z.boolean().optional(),
});

export const BitbucketSourceSchema = z.object({
  type: z.literal("bitbucket"),
  repo: z.string(),
  branch: z.string(),
  owner: z.string(),
  repositorySlug: z.string().optional(),
  buildPath: z.string().optional(),
  watchPaths: z.array(z.string()).optional(),
  enableSubmodules: z.boolean().optional(),
});

export const GiteaSourceSchema = z.object({
  type: z.literal("gitea"),
  repo: z.string(),
  branch: z.string(),
  owner: z.string(),
  buildPath: z.string().optional(),
  watchPaths: z.array(z.string()).optional(),
  enableSubmodules: z.boolean().optional(),
});

export const GitSourceSchema = z.object({
  type: z.literal("git"),
  url: z.string().url(),
  branch: z.string(),
  buildPath: z.string().optional(),
  sshKeyId: z.string().optional(),
  watchPaths: z.array(z.string()).optional(),
  enableSubmodules: z.boolean().optional(),
});

export const DockerSourceSchema = z.object({
  type: z.literal("docker"),
  image: z.string(),
  registryUrl: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
});

export const SourceSchema = z.discriminatedUnion("type", [
  GitHubSourceSchema,
  GitLabSourceSchema,
  BitbucketSourceSchema,
  GiteaSourceSchema,
  GitSourceSchema,
  DockerSourceSchema,
]);

export type GitHubSource = z.infer<typeof GitHubSourceSchema>;
export type GitLabSource = z.infer<typeof GitLabSourceSchema>;
export type BitbucketSource = z.infer<typeof BitbucketSourceSchema>;
export type GiteaSource = z.infer<typeof GiteaSourceSchema>;
export type GitSource = z.infer<typeof GitSourceSchema>;
export type DockerSource = z.infer<typeof DockerSourceSchema>;
export type Source = z.infer<typeof SourceSchema>;
