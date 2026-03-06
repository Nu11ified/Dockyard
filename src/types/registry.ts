import { z } from "zod";

export const RegistrySchema = z.object({
  name: z.string(),
  url: z.string(),
  username: z.string(),
  password: z.string(),
  imagePrefix: z.string().optional(),
});

export type Registry = z.infer<typeof RegistrySchema>;
