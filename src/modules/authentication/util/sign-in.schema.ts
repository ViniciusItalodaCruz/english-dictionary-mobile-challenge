import * as z from "zod";

export const signInSchema = z.object({
  email: z.email("E-mail is required."),
  password: z.string().min(1, "Password is required."),
});

export type SignInSchema = z.infer<typeof signInSchema>;
