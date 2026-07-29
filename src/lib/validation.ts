import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export const registerSchema = z.object({
  fullName: z.string().min(2, "Please enter your name").max(120),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
});

export const createOrgSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(120),
});

export const addMemberSchema = z.object({
  email: z.string().email("Enter a valid email"),
  role: z.enum(["admin", "faculty", "parent", "student", "artist"]),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
