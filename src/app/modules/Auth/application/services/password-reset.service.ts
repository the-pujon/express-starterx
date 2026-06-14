import { IUserRepository } from "../../domain/interfaces/user.repository.interface";
import { IEmailHistoryRepository } from "../../domain/interfaces/email-history.repository.interface";
import {
  UserNotFoundException,
  WeakPasswordException,
  RateLimitExceededException,
  InvalidVerificationCodeException,
} from "../../domain/exceptions/auth.exceptions";
import { AUTH_CONFIG } from "../../domain/config/auth.config";
import { EmailType, EmailStatus } from "../../domain/interfaces/auth.interface";
import { IAuthSessionRepository } from "../../domain/interfaces/auth-session.repository.interface";
import { sendEmail, getEmailTemplate } from "../../../../utils/sendEmail";
import {
  cacheData,
  getCachedData,
  deleteCachedData,
} from "../../../../utils/redis.utils";
import {
  checkRateLimit,
  validatePassword,
  generateSecureId,
} from "../../application/utils/auth.utils";
import bcrypt from "bcrypt";
import config from "../../../../config";

export interface IResetPasswordData {
  token: string;
  expiresAt: number;
  attempts: number;
}

/**
 * Password Reset Service
 *
 * Handles forgot password and reset password use cases.
 *
 * Pattern: Application Service (Use Case)
 */
export class PasswordResetService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly sessionRepository: IAuthSessionRepository,
    private readonly emailHistoryRepository: IEmailHistoryRepository,
  ) {}

  private getResetCacheKey(email: string): string {
    return `${config.redis_cache_key_prefix}:${AUTH_CONFIG.CACHE_PREFIXES.RESET_PASSWORD}${email}`;
  }

  /**
   * Initiate password reset — sends reset link to email
   */
  async forgotPassword(
    email: string,
    meta?: { ip?: string; userAgent?: string },
  ): Promise<void> {
    await checkRateLimit(
      `reset:${email}`,
      AUTH_CONFIG.RATE_LIMIT.PASSWORD_RESET.MAX_ATTEMPTS,
      AUTH_CONFIG.RATE_LIMIT.PASSWORD_RESET.WINDOW_MS,
    );

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Don't leak whether user exists — silently succeed
      throw new UserNotFoundException("User not found!");
    }

    const resetToken = generateSecureId().slice(
      0,
      AUTH_CONFIG.PASSWORD_RESET_TOKEN_LENGTH,
    );
    const expiresAt =
      Date.now() + AUTH_CONFIG.RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000;

    const resetData: IResetPasswordData = {
      token: resetToken,
      expiresAt,
      attempts: 0,
    };

    await cacheData(
      this.getResetCacheKey(email),
      resetData,
      AUTH_CONFIG.RESET_TOKEN_EXPIRY_MINUTES * 60,
    );

    const resetUILink = `${config.reset_pass_ui_link}${resetToken}`;
    const emailTemplate = getEmailTemplate("reset-password-email.html", {
      resetLink: resetUILink,
      expiryTime: AUTH_CONFIG.RESET_TOKEN_EXPIRY_MINUTES,
      year: new Date().getFullYear(),
    });

    await sendEmail({
      to: email,
      subject: "Password Reset Request",
      html: emailTemplate,
    });

    await this.emailHistoryRepository.create({
      authId: user.id,
      emailTo: email,
      emailType: EmailType.PASSWORD_RESET,
      subject: "Password Reset Request",
      messageId: `reset-${user.id}-${Date.now()}`,
      emailStatus: EmailStatus.SENT,
      ipAddress: meta?.ip,
      userAgent: meta?.userAgent,
    });
  }

  /**
   * Complete password reset with token validation
   */
  async resetPassword(
    email: string,
    token: string,
    newPassword: string,
  ): Promise<void> {
    if (!validatePassword(newPassword)) {
      throw new WeakPasswordException();
    }

    const cacheKey = this.getResetCacheKey(email);
    const resetData = (await getCachedData(
      cacheKey,
    )) as IResetPasswordData | null;

    if (!resetData) {
      throw new InvalidVerificationCodeException(
        "Reset token expired or not found",
      );
    }

    if (resetData.attempts >= 3) {
      throw new RateLimitExceededException();
    }

    if (resetData.token !== token) {
      resetData.attempts++;
      await cacheData(
        cacheKey,
        resetData,
        AUTH_CONFIG.RESET_TOKEN_EXPIRY_MINUTES * 60,
      );
      throw new InvalidVerificationCodeException("Invalid reset token");
    }

    if (resetData.expiresAt < Date.now()) {
      throw new InvalidVerificationCodeException("Reset token expired");
    }

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new UserNotFoundException();
    }

    const newPasswordHash = await bcrypt.hash(
      newPassword,
      Number(config.bcrypt_salt_rounds),
    );

    // Update domain model — this also increments tokenVersion
    user.updatePassword(newPasswordHash);
    await this.userRepository.save(user);

    // Clear reset token
    await deleteCachedData(cacheKey);

    // Revoke all sessions (security: forced logout from all devices)
    await this.sessionRepository.revokeAllUserSessions(user.id);
  }
}
