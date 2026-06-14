import { IUserRepository } from "../../domain/interfaces/user.repository.interface";
import { IEmailHistoryRepository } from "../../domain/interfaces/email-history.repository.interface";
import {
  UserNotFoundException,
  InvalidVerificationCodeException,
  RateLimitExceededException,
  EmailAlreadyVerifiedException,
  WeakPasswordException,
} from "../../domain/exceptions/auth.exceptions";
import { AUTH_CONFIG } from "../../domain/config/auth.config";
import { EmailType, EmailStatus } from "../../domain/interfaces/auth.interface";
import { sendEmail, getEmailTemplate } from "../../../../utils/sendEmail";
import {
  cacheData,
  getCachedData,
  deleteCachedData,
} from "../../../../utils/redis.utils";
import {
  checkRateLimit,
  validatePassword,
  generateVerificationCode,
} from "../../application/utils/auth.utils";
import config from "../../../../config";

export interface IVerificationData {
  code: string;
  expiresAt: number;
  attempts: number;
}

/**
 * Email Verification Service
 *
 * Handles email verification code generation, sending, and validation.
 *
 * Pattern: Application Service (Use Case)
 */
export class EmailVerificationService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly emailHistoryRepository: IEmailHistoryRepository,
  ) {}

  /**
   * Get verification cache key
   */
  private getCacheKey(email: string): string {
    return `${config.redis_cache_key_prefix}:${AUTH_CONFIG.CACHE_PREFIXES.VERIFICATION}${email}`;
  }

  /**
   * Generate and store a new verification code for the given email
   */
  async generateAndSendCode(
    email: string,
    userId: string,
    meta?: { ip?: string; userAgent?: string },
  ): Promise<void> {
    const verificationCode = generateVerificationCode();
    const expiresAt =
      Date.now() + AUTH_CONFIG.VERIFICATION_TOKEN_EXPIRY_MINUTES * 60 * 1000;

    const verificationData: IVerificationData = {
      code: verificationCode,
      expiresAt,
      attempts: 0,
    };

    await cacheData(
      this.getCacheKey(email),
      verificationData,
      AUTH_CONFIG.VERIFICATION_TOKEN_EXPIRY_MINUTES * 60,
    );

    const emailTemplate = getEmailTemplate("verification-email.html", {
      code: verificationCode,
      expiryTime: AUTH_CONFIG.VERIFICATION_TOKEN_EXPIRY_MINUTES,
      year: new Date().getFullYear(),
    });

    await sendEmail({
      to: email,
      subject: "Email Verification Code",
      html: emailTemplate,
    });

    await this.emailHistoryRepository.create({
      authId: userId,
      emailTo: email,
      emailType: EmailType.VERIFICATION,
      subject: "Email Verification Code",
      messageId: `verification-${userId}-${Date.now()}`,
      emailStatus: EmailStatus.SENT,
      ipAddress: meta?.ip,
      userAgent: meta?.userAgent,
    });
  }

  /**
   * Validate a verification code from cache
   */
  async validateCode(email: string, code: string): Promise<void> {
    const cacheKey = this.getCacheKey(email);
    const verificationData = (await getCachedData(
      cacheKey,
    )) as IVerificationData | null;

    if (!verificationData) {
      throw new InvalidVerificationCodeException(
        "Verification code expired or not found",
      );
    }

    if (verificationData.attempts >= 3) {
      throw new RateLimitExceededException();
    }

    if (verificationData.code !== code) {
      verificationData.attempts++;
      await cacheData(
        cacheKey,
        verificationData,
        AUTH_CONFIG.VERIFICATION_TOKEN_EXPIRY_MINUTES * 60,
      );
      throw new InvalidVerificationCodeException("Invalid verification code");
    }

    if (verificationData.expiresAt < Date.now()) {
      throw new InvalidVerificationCodeException("Verification code expired");
    }

    // Clear from cache on success
    await deleteCachedData(cacheKey);
  }

  /**
   * Resend verification code with rate limiting
   */
  async resendCode(
    email: string,
    meta?: { ip?: string; userAgent?: string },
  ): Promise<void> {
    await checkRateLimit(
      `resend:${email}`,
      AUTH_CONFIG.RATE_LIMIT.SIGNUP.MAX_ATTEMPTS,
      AUTH_CONFIG.RATE_LIMIT.SIGNUP.WINDOW_MS,
    );

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new UserNotFoundException();
    }

    if (user.isVerified) {
      throw new EmailAlreadyVerifiedException();
    }

    await this.generateAndSendCode(email, user.id, meta);
  }
}
