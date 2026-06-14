import { setImmediate } from "timers";
import { User, UserRole, UserStatus } from "../../domain/models/user.model";
import { IUserRepository } from "../../domain/interfaces/user.repository.interface";
import { IEmailHistoryRepository } from "../../domain/interfaces/email-history.repository.interface";
import {
  UserAlreadyExistsException,
  WeakPasswordException,
  UserNotFoundException,
  EmailAlreadyVerifiedException,
  InvalidVerificationCodeException,
  RateLimitExceededException,
} from "../../domain/exceptions/auth.exceptions";
import { AUTH_CONFIG } from "../../domain/config/auth.config";
import { EmailType, EmailStatus } from "../../domain/interfaces/auth.interface";
import bcrypt from "bcrypt";
import config from "../../../../config";
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
import {
  globalEventEmitter,
  DomainEventType,
  UserRegisteredEventPayload,
} from "../../../../shared/events";

export interface IRequestMeta {
  ip: string;
  userAgent: string;
  device?: string;
}

export interface IVerificationData {
  code: string;
  expiresAt: number;
  attempts: number;
}

/**
 * Registration Service
 *
 * Handles user signup and email verification use cases.
 * Dependencies are injected via constructor (Composition Root pattern).
 *
 * Pattern: Application Service (Use Case)
 */
export class RegistrationService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly emailHistoryRepository: IEmailHistoryRepository,
  ) {}

  /**
   * Register a new local user
   */
  async signup(
    payload: {
      name: string;
      username: string;
      email: string;
      phone: string;
      password: string;
    },
    meta?: IRequestMeta,
  ): Promise<{ user: User }> {
    const { email, username, password } = payload;

    // Rate limit check
    await checkRateLimit(
      `signup:${email}`,
      AUTH_CONFIG.RATE_LIMIT.SIGNUP.MAX_ATTEMPTS,
      AUTH_CONFIG.RATE_LIMIT.SIGNUP.WINDOW_MS,
    );

    // Validate password strength
    if (!validatePassword(password)) {
      throw new WeakPasswordException();
    }

    // Check for duplicates
    const existingByEmail = await this.userRepository.existsByEmail(email);
    if (existingByEmail) {
      throw new UserAlreadyExistsException("Email");
    }

    const existingByUsername =
      await this.userRepository.existsByUsername(username);
    if (existingByUsername) {
      throw new UserAlreadyExistsException("Username");
    }

    // Password will be hashed by Mongoose pre-save hook
    // Create domain model
    const newUser = User.create({
      name: payload.name,
      username,
      email,
      phone: payload.phone,
      password, // Plain password - Mongoose will hash it via pre-save hook
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
      provider: "local",
      isVerified: false,
    });
    console.log("User before save:", newUser); // Debug log

    // Persist
    const savedUser = await this.userRepository.save(newUser);

    // Cache verification data
    const verificationCode = generateVerificationCode();
    const expiresAt =
      Date.now() + AUTH_CONFIG.VERIFICATION_TOKEN_EXPIRY_MINUTES * 60 * 1000;
    const verificationData: IVerificationData = {
      code: verificationCode,
      expiresAt,
      attempts: 0,
    };

    await cacheData(
      `${config.redis_cache_key_prefix}:${AUTH_CONFIG.CACHE_PREFIXES.VERIFICATION}${email}`,
      verificationData,
      AUTH_CONFIG.VERIFICATION_TOKEN_EXPIRY_MINUTES * 60,
    );

    // Emit domain event for cross-module communication (fire and forget)
    const registeredEventPayload: UserRegisteredEventPayload = {
      userId: savedUser.id,
      email: savedUser.email,
      username: savedUser.username,
    };
    void globalEventEmitter.emitType(
      DomainEventType.USER_REGISTERED,
      registeredEventPayload,
    );

    // Log email as pending
    await this.emailHistoryRepository.create({
      authId: savedUser.id,
      emailTo: email,
      emailType: EmailType.VERIFICATION,
      subject: "Email Verification Code",
      messageId: `verification-${savedUser.id}-${Date.now()}`,
      emailStatus: EmailStatus.PENDING,
      ipAddress: meta?.ip,
      userAgent: meta?.userAgent,
    });

    // Send verification email asynchronously
    setImmediate(() => {
      const emailTemplate = getEmailTemplate("verification-email.html", {
        code: verificationCode,
        expiryTime: AUTH_CONFIG.VERIFICATION_TOKEN_EXPIRY_MINUTES,
        year: new Date().getFullYear(),
      });

      sendEmail({
        to: email,
        subject: "Email Verification Code",
        html: emailTemplate,
      })
        .then(() => {
          return this.emailHistoryRepository.updateStatus(
            savedUser.id,
            EmailType.VERIFICATION,
            EmailStatus.SENT,
          );
        })
        .catch((err) => {
          console.error("Failed to send verification email:", err);
          return this.emailHistoryRepository.updateStatus(
            savedUser.id,
            EmailType.VERIFICATION,
            EmailStatus.FAILED,
            err.message,
          );
        });
    });

    return { user: savedUser };
  }

  /**
   * Verify user email with the 6-digit code
   */
  async verifyEmail(
    email: string,
    code: string,
    meta?: IRequestMeta,
  ): Promise<{ user: User }> {
    const cacheKey = `${config.redis_cache_key_prefix}:${AUTH_CONFIG.CACHE_PREFIXES.VERIFICATION}${email}`;
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

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new UserNotFoundException(email);
    }

    user.verifyEmail();
    const savedUser = await this.userRepository.save(user);

    // Clear verification cache
    await deleteCachedData(cacheKey);

    // Emit domain event for email verification
    void globalEventEmitter.emitType(DomainEventType.USER_EMAIL_VERIFIED, {
      userId: savedUser.id,
      email: savedUser.email,
    });

    // Send welcome email (fire and forget)
    setImmediate(() => {
      const welcomeTemplate = getEmailTemplate("welcome.html", {
        username: savedUser.username || savedUser.name,
        year: new Date().getFullYear(),
      });
      sendEmail({
        to: email,
        subject: "Welcome to our platform!",
        html: welcomeTemplate,
      })
        .then(() =>
          this.emailHistoryRepository.create({
            authId: savedUser.id,
            emailTo: email,
            emailType: EmailType.WELCOME,
            subject: "Welcome to our platform!",
            messageId: `welcome-${savedUser.id}-${Date.now()}`,
            emailStatus: EmailStatus.SENT,
          }),
        )
        .catch(console.error);
    });

    return { user: savedUser };
  }

  /**
   * Resend email verification code
   */
  async resendVerifyEmailCode(
    email: string,
    meta?: IRequestMeta,
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

    const verificationCode = generateVerificationCode();
    const expiresAt =
      Date.now() + AUTH_CONFIG.VERIFICATION_TOKEN_EXPIRY_MINUTES * 60 * 1000;
    const verificationData: IVerificationData = {
      code: verificationCode,
      expiresAt,
      attempts: 0,
    };

    await cacheData(
      `${config.redis_cache_key_prefix}:${AUTH_CONFIG.CACHE_PREFIXES.VERIFICATION}${email}`,
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
      subject: "New Email Verification Code",
      html: emailTemplate,
    });

    await this.emailHistoryRepository.create({
      authId: user.id,
      emailTo: email,
      emailType: EmailType.VERIFICATION,
      subject: "New Email Verification Code",
      messageId: `resend-${user.id}-${Date.now()}`,
      emailStatus: EmailStatus.SENT,
      ipAddress: meta?.ip,
      userAgent: meta?.userAgent,
    });
  }
}
