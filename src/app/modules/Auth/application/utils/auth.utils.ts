import crypto from "crypto";
import { deleteCachedData } from "../../../../utils/redis.utils";
import config from "../../../../config";
import { UserRole } from "../../domain/models/user.model";
import { AUTH_CONFIG } from "../../domain/config/auth.config";
import { getRedisClient } from "../../../../config/redis.config";
import AppError from "../../../../errors/AppError";
import httpStatus from "http-status";

/**
 * Generates a cryptographically secure random ID
 * Used for JTI (JWT ID) to prevent collisions
 */
export const generateSecureId = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

/**
 * Generates a random verification code
 */
export const generateVerificationCode = (): string => {
  return crypto.randomBytes(3).toString("hex").toUpperCase().slice(0, 6);
};

/**
 * Hash a token using SHA-256 for secure storage
 * Never store raw tokens - only hashes
 */
export const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

/**
 * Checks rate limiting for operations using Redis
 */
export const checkRateLimit = async (
  key: string,
  maxAttempts: number,
  windowMs: number,
): Promise<boolean> => {
  // Skip rate limiting in test environment
  if (process.env.NODE_ENV === "test") {
    return true;
  }

  const cacheKey = `${config.redis_cache_key_prefix}:${AUTH_CONFIG.CACHE_PREFIXES.RATE_LIMIT}${key}`;
  const lockKey = `${cacheKey}:locked`;
  const redisClient = await getRedisClient();

  // First check if we're in a locked state
  const isLocked = await redisClient.get(lockKey);
  if (isLocked) {
    throw new AppError(
      httpStatus.TOO_MANY_REQUESTS,
      `Rate limit exceeded. Please try again after ${windowMs / 1000} seconds.`,
    );
  }

  // Use Redis INCR to atomically increment the counter
  const currentAttempts = await redisClient.incr(cacheKey);

  // Set expiry on first attempt
  if (currentAttempts === 1) {
    await redisClient.expire(cacheKey, windowMs / 1000);
  }

  if (currentAttempts > maxAttempts) {
    // Set a lock with TTL instead of continuing to increment
    await redisClient.setEx(lockKey, windowMs / 1000, "1");
    throw new AppError(
      httpStatus.TOO_MANY_REQUESTS,
      `Rate limit exceeded. Please try again after ${windowMs / 1000} seconds.`,
    );
  }

  return true;
};

/**
 * Validates password strength
 */
export const validatePassword = (password: string): boolean => {
  const { PASSWORD_MIN_LENGTH, PASSWORD_REQUIREMENTS } = AUTH_CONFIG;

  if (password.length < PASSWORD_MIN_LENGTH) {
    return false;
  }

  if (PASSWORD_REQUIREMENTS.UPPERCASE && !/[A-Z]/.test(password)) {
    return false;
  }

  if (PASSWORD_REQUIREMENTS.LOWERCASE && !/[a-z]/.test(password)) {
    return false;
  }

  if (PASSWORD_REQUIREMENTS.NUMBERS && !/\d/.test(password)) {
    return false;
  }

  if (
    PASSWORD_REQUIREMENTS.SPECIAL_CHARS &&
    !/[!@#$%^&*(),.?":{}|<>]/.test(password)
  ) {
    return false;
  }

  return true;
};

/**
 * Checks if a user can modify another user's role based on role hierarchy
 */
export const canModifyRole = (
  currentUserRole: UserRole,
  targetUserRole: UserRole,
  newRole: UserRole,
): boolean => {
  const { ROLE_HIERARCHY } = AUTH_CONFIG;

  // Super admin can modify any role except other super admins
  if (currentUserRole === UserRole.SUPER_ADMIN) {
    return (
      targetUserRole !== UserRole.SUPER_ADMIN &&
      newRole !== UserRole.SUPER_ADMIN
    );
  }

  // Admin can only modify moderator and customer roles
  if (currentUserRole === UserRole.ADMIN) {
    const targetRoleLevel =
      ROLE_HIERARCHY[targetUserRole as keyof typeof ROLE_HIERARCHY] || 0;
    const newRoleLevel =
      ROLE_HIERARCHY[newRole as keyof typeof ROLE_HIERARCHY] || 0;
    const adminLevel = ROLE_HIERARCHY[UserRole.ADMIN];

    return targetRoleLevel < adminLevel && newRoleLevel < adminLevel;
  }

  // Moderator can only modify customer roles
  if (currentUserRole === UserRole.MODERATOR) {
    return (
      targetUserRole === UserRole.CUSTOMER && newRole === UserRole.CUSTOMER
    );
  }

  // Customer cannot modify any roles
  if (currentUserRole === UserRole.CUSTOMER) {
    return false;
  }

  return false;
};

/**
 * Parse token expiry string to seconds
 */
export const parseExpiryToSeconds = (expiry: string): number => {
  const match = expiry.match(/^(\d+)([smhd])?$/);
  if (!match) {
    return 3600;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2] || "s";

  switch (unit) {
    case "s":
      return value;
    case "m":
      return value * 60;
    case "h":
      return value * 60 * 60;
    case "d":
      return value * 60 * 60 * 24;
    default:
      return 3600;
  }
};
