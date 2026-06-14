import { IUserRepository } from "../../../Auth/domain/interfaces/user.repository.interface";
import { IUserProfileRepository } from "../../domain/interfaces/user-profile.repository.interface";
import { IAuthSessionRepository } from "../../../Auth/domain/interfaces/auth-session.repository.interface";
import { User, UserRole } from "../../../Auth/domain/models/user.model";
import { UserNotFoundException } from "../../../Auth/domain/exceptions/auth.exceptions";
import { canModifyRole } from "../../../Auth/application/utils/auth.utils";
import AppError from "../../../../errors/AppError";
import httpStatus from "http-status";
import { deleteCachedData } from "../../../../utils/redis.utils";
import config from "../../../../config";
import { AUTH_CONFIG } from "../../../Auth/domain/config/auth.config";

export interface IUserFilters {
  page?: number;
  limit?: number;
  searchTerm?: string;
  role?: string;
  status?: string;
  isVerified?: boolean;
}

/**
 * UserManagementService
 * Handles admin-level user actions, list paginations, role changes, and account deletions.
 */
export class UserManagementService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly userProfileRepository: IUserProfileRepository,
    private readonly sessionRepository: IAuthSessionRepository,
  ) {}

  async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new UserNotFoundException(id);
    }
    return user;
  }

  async updateUser(
    id: string,
    data: { name?: string; phone?: string },
  ): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new UserNotFoundException(id);
    }

    // Re-reconstitute with updated fields since name/phone are readonly
    const updatedUser = User.reconstitute({
      id: user.id,
      name: data.name ?? user.name,
      username: user.username,
      email: user.email,
      phone: data.phone ?? user.phone,
      password: user.getPassword(),
      role: user.role,
      status: user.status,
      lastLogin: user.lastLogin,
      isVerified: user.isVerified,
      provider: user.provider,
      providerId: user.providerId,
      deletedAt: user.deletedAt,
      failedLoginAttempts: user.getFailedLoginAttempts(),
      lastFailedLogin: user.getLastFailedLogin(),
      accountLocked: user.isLocked(),
      accountLockedUntil: user.getLockExpiresAt(),
      mfaEnabled: user.mfaEnabled,
      mfaMethod: user.mfaMethod,
      mfaSecret: user.getMfaSecret(),
      lastPasswordChange: user.lastPasswordChange,
      tokenVersion: user.tokenVersion,
    });

    return this.userRepository.save(updatedUser);
  }

  async getAllUsers(filters: IUserFilters) {
    return this.userRepository.findAll(filters);
  }

  async changeRole(
    email: string,
    newRole: UserRole,
    currentUser: { email: string; role: string },
  ): Promise<User> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new UserNotFoundException(email);
    }

    if (!canModifyRole(currentUser.role as UserRole, user.role, newRole)) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You don't have permission to perform this action",
      );
    }

    user.role = newRole;
    return this.userRepository.save(user);
  }

  async deleteUser(
    id: string,
    currentUser: { email: string; role: string },
  ): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new UserNotFoundException(id);
    }

    if (currentUser.role !== UserRole.SUPER_ADMIN) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "Only super admin can delete users",
      );
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      throw new AppError(httpStatus.FORBIDDEN, "Cannot delete super admin");
    }

    if (user.email === currentUser.email) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "Cannot delete your own account",
      );
    }

    const deletedUser = await this.userRepository.delete(id);
    if (!deletedUser) {
      throw new AppError(httpStatus.BAD_REQUEST, "Failed to delete user");
    }

    // Clear user's cached data, sessions, and profile
    await Promise.all([
      this.sessionRepository.revokeAllUserSessions(id),
      deleteCachedData(
        `${config.redis_cache_key_prefix}:${AUTH_CONFIG.CACHE_PREFIXES.VERIFICATION}${user.email}`,
      ),
      deleteCachedData(
        `${config.redis_cache_key_prefix}:${AUTH_CONFIG.CACHE_PREFIXES.RESET_PASSWORD}${user.email}`,
      ),
      this.userProfileRepository.deleteByAuthId(id),
    ]);

    return deletedUser;
  }
}
