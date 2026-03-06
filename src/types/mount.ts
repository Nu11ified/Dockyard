import { z } from "zod";

export const BindMountSchema = z.object({
  type: z.literal("bind"),
  hostPath: z.string(),
  mountPath: z.string(),
});

export const VolumeMountSchema = z.object({
  type: z.literal("volume"),
  name: z.string(),
  mountPath: z.string(),
});

export const FileMountSchema = z.object({
  type: z.literal("file"),
  content: z.string(),
  mountPath: z.string(),
  filePath: z.string().optional(),
});

export const MountSchema = z.discriminatedUnion("type", [
  BindMountSchema,
  VolumeMountSchema,
  FileMountSchema,
]);

export type BindMount = z.infer<typeof BindMountSchema>;
export type VolumeMount = z.infer<typeof VolumeMountSchema>;
export type FileMount = z.infer<typeof FileMountSchema>;
export type Mount = z.infer<typeof MountSchema>;
