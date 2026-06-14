import express from "express";
import { AuthController } from "../controllers/auth.controller";
import { auth } from "../../../../middlewares/auth";
import { RegistrationService } from "../../application/services/registration.service";
import { AuthenticationService } from "../../application/services/authentication.service";
import { EmailVerificationService } from "../../application/services/email-verification.service";
import { PasswordResetService } from "../../application/services/password-reset.service";
import { MongoUserRepository } from "../../infrastructure/persistence/repositories/mongo-user.repository";
import { MongoEmailHistoryRepository } from "../../infrastructure/persistence/repositories/mongo-history.repository";
import { MongoLoginHistoryRepository } from "../../infrastructure/persistence/repositories/mongo-history.repository";
import { RedisAuthSessionRepository } from "../../infrastructure/persistence/repositories/redis-auth-session.repository";
import { TokenService } from "../../application/services/token.service";
import validateRequest from "../../../../middlewares/validateRequest";
import { AuthValidation } from "../validation/auth.validation";

const router = express.Router();

// ==========================================
// Composition Root (Manual Wiring)
// ==========================================

// Repositories
const userRepository = new MongoUserRepository();
const emailHistoryRepository = new MongoEmailHistoryRepository();
const loginHistoryRepository = new MongoLoginHistoryRepository();
const sessionRepository = new RedisAuthSessionRepository();

// Token Service
const tokenService = new TokenService();

// Application Services - Registration
const registrationService = new RegistrationService(
  userRepository,
  emailHistoryRepository,
);

// Application Services - Authentication
const authenticationService = new AuthenticationService(
  userRepository,
  sessionRepository,
  loginHistoryRepository,
  tokenService,
);

// Application Services - Email Verification
const emailVerificationService = new EmailVerificationService(
  userRepository,
  emailHistoryRepository,
);

// Application Services - Password Reset
const passwordResetService = new PasswordResetService(
  userRepository,
  sessionRepository,
  emailHistoryRepository,
);

// Controller
const authController = new AuthController(
  registrationService,
  authenticationService,
  emailVerificationService,
  passwordResetService,
);

// ==========================================
// Routes Definition
// ==========================================

// Public routes
router.post(
  "/signup",
  // validateRequest(AuthValidation.signupSchema),
  authController.signup,
);

router.post(
  "/login",
  // validateRequest(AuthValidation.loginSchema),
  authController.login,
);

router.post("/refresh-token", authController.refreshAccessToken);

router.post(
  "/forgot-password",
  validateRequest(AuthValidation.forgotPasswordSchema),
  authController.initiatePasswordReset,
);

router.post(
  "/reset-password",
  validateRequest(AuthValidation.resetPasswordSchema),
  authController.resetPassword,
);

router.get(
  "/verify-email",
  validateRequest(AuthValidation.verifyEmailSchema),
  authController.verifyEmail,
);

router.post(
  "/resend-verification",
  validateRequest(AuthValidation.resendVerificationSchema),
  authController.resendVerification,
);

// Protected routes
router.post("/logout", auth(), authController.logout);

router.post("/logout-all", auth(), authController.logoutAll);

export const AuthRoutes = router;
