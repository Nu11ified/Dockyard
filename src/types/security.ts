import { z } from "zod";

export const SecuritySchema = z.object({
  username: z.string(),
  password: z.string(),
});

export type Security = z.infer<typeof SecuritySchema>;
