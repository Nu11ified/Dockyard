import { z } from "zod";

export const RedirectSchema = z.object({
  regex: z.string(),
  replacement: z.string(),
  permanent: z.boolean(),
});

export type Redirect = z.infer<typeof RedirectSchema>;
