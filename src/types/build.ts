import { z } from "zod";

export const DockerfileBuildSchema = z.object({
  type: z.literal("dockerfile"),
  dockerfile: z.string().optional(),
  context: z.string().optional(),
  buildStage: z.string().optional(),
});

export const NixpacksBuildSchema = z.object({
  type: z.literal("nixpacks"),
});

export const BuildpackBuildSchema = z.object({
  type: z.literal("buildpacks"),
  version: z.string().optional(),
});

export const StaticBuildSchema = z.object({
  type: z.literal("static"),
  publishDirectory: z.string().optional(),
  isSpa: z.boolean().optional(),
});

export const RailpackBuildSchema = z.object({
  type: z.literal("railpack"),
  version: z.string().optional(),
});

export const BuildSchema = z.discriminatedUnion("type", [
  DockerfileBuildSchema,
  NixpacksBuildSchema,
  BuildpackBuildSchema,
  StaticBuildSchema,
  RailpackBuildSchema,
]);

export type DockerfileBuild = z.infer<typeof DockerfileBuildSchema>;
export type NixpacksBuild = z.infer<typeof NixpacksBuildSchema>;
export type BuildpackBuild = z.infer<typeof BuildpackBuildSchema>;
export type StaticBuild = z.infer<typeof StaticBuildSchema>;
export type RailpackBuild = z.infer<typeof RailpackBuildSchema>;
export type Build = z.infer<typeof BuildSchema>;
