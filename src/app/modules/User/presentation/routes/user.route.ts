import express from "express";
import { UserController } from "../controllers/user.controller";
import { auth } from "../../../../middlewares/auth";
import { UserProfileService } from "../../application/services/user-profile.service";
import { UserManagementService } from "../../application/services/user-management.service";
import { MongoUserRepository } from "../../../Auth/infrastructure/persistence/repositories/mongo-user.repository";
import { MongoUserProfileRepository } from "../../infrastructure/repositories/mongo-user-profile.repository";
import { RedisAuthSessionRepository } from "../../../Auth/infrastructure/persistence/repositories/redis-auth-session.repository";
import validateRequest from "../../../../middlewares/validateRequest";
import { AuthValidation } from "../../../Auth/presentation/validation/auth.validation";

const router = express.Router();

// ==========================================
// Composition Root (Manual Wiring)
// ==========================================

const userRepository = new MongoUserRepository();
const userProfileRepository = new MongoUserProfileRepository();
const sessionRepository = new RedisAuthSessionRepository();

const userProfileService = new UserProfileService(
  userProfileRepository,
  userRepository,
);
const userManagementService = new UserManagementService(
  userRepository,
  userProfileRepository,
  sessionRepository,
);

const userController = new UserController(
  userProfileService,
  userManagementService,
);

// ==========================================
// Routes Definition
// ==========================================

// Protected routes (require authentication)
router.get("/me", auth(), userController.getMe);
router.patch("/me", auth(), userController.updateMe);
router.patch("/me/profile", auth(), userController.updateMyProfile);

// Admin routes
router.get("/", auth("superAdmin", "admin"), userController.getAllUsers);
router.get("/:id", auth("superAdmin", "admin"), userController.getUserById);
router.patch(
  "/change-role",
  auth("admin", "superAdmin"),
  validateRequest(AuthValidation.changeRoleSchema),
  userController.changeRole,
);
router.delete("/:id", auth("superAdmin"), userController.deleteUser);

export const UserRoutes = router;
