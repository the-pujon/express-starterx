import { z } from "zod";

export const AuthValidation = {
  signupSchema: z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    username: z.string().min(3, "Username must be at least 3 characters"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(10, "Phone number must be at least 10 characters"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(
        /[@$!%*?&]/,
        "Password must contain at least one special character",
      ),
    role: z.string().optional().default("customer"),
  }),

  loginSchema: z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
  }),

  verifyEmailSchema: z.object({
    token: z.string().min(1, "Verification token is required"),
  }),

  resendVerificationSchema: z.object({
    email: z.string().email("Invalid email address"),
  }),

  forgotPasswordSchema: z.object({
    email: z.string().email("Invalid email address"),
  }),

  resetPasswordSchema: z.object({
    token: z.string().min(1, "Password reset token is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(
        /[@$!%*?&]/,
        "Password must contain at least one special character",
      ),
  }),

  changeRoleSchema: z.object({
    userId: z.string().min(1, "User ID is required"),
    role: z.enum(["customer", "admin", "superAdmin"]),
  }),
};
