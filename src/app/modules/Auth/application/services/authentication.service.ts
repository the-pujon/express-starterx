import { User, UserStatus, UserRole } from "../../domain/models/user.model";
import { AuthSession } from "../../domain/models/auth-session.model";
import { IUserRepository } from "../../domain/interfaces/user.repository.interface";
import { IAuthSessionRepository } from "../../domain/interfaces/auth-session.repository.interface";
import { ILoginHistoryRepository } from "../../domain/interfaces/login-history.repository.interface";
import { MongoUserRepository } from "../../infrastructure/persistence/repositories/mongo-user.repository";
import { RedisAuthSessionRepository } from "../../infrastructure/persistence/repositories/redis-auth-session.repository";
import { MongoLoginHistoryRepository } from "../../infrastructure/persistence/repositories/mongo-history.repository";
import {
  InvalidCredentialsException,
  AccountLockedException,
  SessionNotFoundException,
  InvalidTokenException,
  TokenExpiredException,
  UserAlreadyExistsException,
} from "../../domain/exceptions/auth.exceptions";
import { TokenService, TokenPair } from "./token.service";
import { AUTH_CONFIG } from "../../domain/config/auth.config";
import { LoginAction } from "../../domain/interfaces/auth.interface";
import bcrypt from "bcrypt";
import {
  hashToken,
  parseExpiryToSeconds,
  checkRateLimit,
} from "../../application/utils/auth.utils";
import {
  globalEventEmitter,
  DomainEventType,
  UserLoggedInEventPayload,
  UserRegisteredEventPayload,
} from "../../../../shared/events";

export interface IRequestMeta {
  ip: string;
  userAgent: string;
  device?: string;
}

export interface ILoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    username: string;
    name: string;
    role: string;
    isVerified: boolean;
  };
  expiresIn: number;
}

/**
 * Authentication Service
 *
 * Handles login, logout, refresh token, and Google OAuth callback use cases.
 *
 * Pattern: Application Service (Use Case)
 */
export class AuthenticationService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly sessionRepository: IAuthSessionRepository,
    private readonly loginHistoryRepository: ILoginHistoryRepository,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Login a user with email/password
   */
  async login(
    credentials: { email: string; password: string },
    meta: IRequestMeta,
  ): Promise<ILoginResponse> {
    const { email, password } = credentials;
    const { ip, userAgent, device } = meta;

    // Rate limit check
    await checkRateLimit(
      `login:${email}`,
      AUTH_CONFIG.RATE_LIMIT.LOGIN.MAX_ATTEMPTS,
      AUTH_CONFIG.RATE_LIMIT.LOGIN.WINDOW_MS,
    );

    const user = await this.userRepository.findByEmail(email);

    // Generic error to prevent user enumeration — timing attack prevention
    const invalidCredentials = new InvalidCredentialsException();
    const fakeHash =
      "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G4.4.G4.G4.G4.G";

    if (!user) {
      await bcrypt.compare(password, fakeHash);
      void this.loginHistoryRepository.create({
        authId: "unknown",
        ipAddress: ip,
        userAgent,
        deviceId: device,
        action: LoginAction.LOGIN,
        success: false,
        failureReason: "user_not_found",
        attemptNumber: 1,
        isSuspicious: false,
      });
      throw invalidCredentials;
    }

    // OAuth provider check
    if (user.provider !== "local") {
      throw new InvalidCredentialsException();
    }

    // Validate login eligibility (locked, verified, active)
    const loginCheck = user.canLogin();
    if (!loginCheck.canLogin) {
      void this.loginHistoryRepository.create({
        authId: user.id,
        ipAddress: ip,
        userAgent,
        deviceId: device,
        action: LoginAction.LOGIN,
        success: false,
        failureReason: loginCheck.reason,
        attemptNumber: (user.getFailedLoginAttempts() || 0) + 1,
        isSuspicious: false,
      });

      if (user.isLocked()) {
        const lockRemaining = user.getLockExpiresAt();
        const remainingMinutes = lockRemaining
          ? Math.ceil((lockRemaining.getTime() - Date.now()) / 1000 / 60)
          : undefined;
        throw new AccountLockedException(remainingMinutes);
      }

      throw new InvalidCredentialsException();
    }

    // Verify password
    const isPasswordValid = await user.verifyPassword(password);
    if (!isPasswordValid) {
      user.incrementFailedAttempts(
        AUTH_CONFIG.RATE_LIMIT.LOGIN.MAX_ATTEMPTS,
        AUTH_CONFIG.ACCOUNT_LOCKOUT.LOCKOUT_DURATION_MS,
      );
      await this.userRepository.save(user);

      void this.loginHistoryRepository.create({
        authId: user.id,
        ipAddress: ip,
        userAgent,
        deviceId: device,
        action: LoginAction.LOGIN,
        success: false,
        failureReason: "invalid_password",
        attemptNumber: user.getFailedLoginAttempts(),
        isSuspicious: false,
      });
      throw invalidCredentials;
    }

    // Generate tokens
    const tokenPair = await this.tokenService.generateTokenPair(user);

    // Persist session
    await this.persistSession(user, tokenPair, meta);

    // Reset failed login attempts
    user.resetFailedAttempts();
    await this.userRepository.save(user);

    // Log successful login
    void this.loginHistoryRepository.create({
      authId: user.id,
      ipAddress: ip,
      userAgent,
      deviceId: device,
      action: LoginAction.LOGIN,
      success: true,
      attemptNumber: 1,
      isSuspicious: false,
    });

    // Emit domain event for cross-module communication
    const loginEventPayload: UserLoggedInEventPayload = {
      userId: user.id,
      email: user.email,
      ip,
      userAgent,
      device,
    };
    void globalEventEmitter.emitType(
      DomainEventType.USER_LOGGED_IN,
      loginEventPayload,
    );

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role,
        isVerified: user.isVerified,
      },
      expiresIn: tokenPair.expiresIn,
    };
  }

  /**
   * Authenticate a user with Google profile (Finds or creates)
   */
  async authenticateWithGoogle(
    googleUser: {
      sub: string;
      email: string;
      email_verified: boolean;
      name: string;
      given_name?: string;
      family_name?: string;
      picture?: string;
    },
    meta: IRequestMeta,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      email: string;
      username: string;
      name: string;
      role: string;
      isVerified: boolean;
      provider: string;
      providerId: string | null;
    };
    expiresIn: number;
    isNewUser: boolean;
  }> {
    const { sub, email, name, given_name, family_name } = googleUser;

    let user = await this.userRepository.findByProvider("google", sub);
    let isNewUser = false;

    if (!user) {
      // Check if user exists with same email but different provider
      const existingUserWithEmail =
        await this.userRepository.findByEmail(email);

      if (existingUserWithEmail) {
        if (existingUserWithEmail.provider === "local") {
          throw new UserAlreadyExistsException(
            "An account with this email already exists. Please sign in with your email and password, then link your Google account in settings.",
          );
        } else {
          throw new UserAlreadyExistsException(
            `This email is already associated with a ${existingUserWithEmail.provider} account.`,
          );
        }
      }

      // Generate sanitized unique username and synthetic phone
      const baseName = given_name || name?.split(" ")[0] || "user";
      const sanitized = baseName.toLowerCase().replace(/[^a-z0-9]/g, "");
      const uniqueSuffix = bcrypt
        .genSaltSync(4)
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(0, 8);
      const username = `${sanitized}_${uniqueSuffix}`;

      // Synthetic phone: hash providerId to digits
      const hashedDigits = bcrypt.hashSync(sub, 10).replace(/\D/g, "");
      const numeric = `${hashedDigits}${Date.now()}`.replace(/\D/g, "");
      const phone = `+1${numeric.slice(0, 10)}`;

      user = User.create({
        name:
          name ||
          `${given_name || ""} ${family_name || ""}`.trim() ||
          "Google User",
        username,
        email,
        phone,
        password: "", // OAuth has no password
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        provider: "google",
        providerId: sub,
        isVerified: true,
      });

      user = await this.userRepository.save(user);
      isNewUser = true;

      // Emit domain event for cross-module communication
      const registeredEventPayload: UserRegisteredEventPayload = {
        userId: user.id,
        email: user.email,
        username: user.username,
      };
      void globalEventEmitter.emitType(
        DomainEventType.USER_REGISTERED,
        registeredEventPayload,
      );
    } else {
      const loginCheck = user.canLogin();
      if (!loginCheck.canLogin) {
        throw new InvalidCredentialsException();
      }
    }

    const tokenPair = await this.tokenService.generateTokenPair(user);
    await this.persistSession(user, tokenPair, meta);

    void this.loginHistoryRepository.create({
      authId: user.id,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      deviceId: meta.device,
      action: LoginAction.LOGIN,
      success: true,
      attemptNumber: 1,
      isSuspicious: false,
    });

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role,
        isVerified: user.isVerified,
        provider: user.provider,
        providerId: user.providerId,
      },
      expiresIn: tokenPair.expiresIn,
      isNewUser,
    };
  }

  /**
   * Logout the current device session
   */
  async logout(
    refreshToken: string,
    userId: string,
    meta?: IRequestMeta,
  ): Promise<void> {
    let decoded;
    try {
      decoded = await this.tokenService.verifyRefreshToken(refreshToken);
    } catch {
      // If token is invalid/expired, just clear — consider already logged out
      return;
    }

    if (decoded.userId !== userId) {
      throw new InvalidTokenException("Token does not match user");
    }

    const { jti } = decoded;
    if (jti) {
      await this.sessionRepository.delete(userId, jti);

      // Update sessions list
      const sessions = await this.sessionRepository.getUserSessions(userId);
      const updated = sessions.filter((s) => s !== jti);
      if (updated.length > 0) {
        await this.sessionRepository.saveUserSessions(
          userId,
          updated,
          parseExpiryToSeconds(AUTH_CONFIG.TOKEN_EXPIRY.REFRESH),
        );
      } else {
        await this.sessionRepository.revokeAllUserSessions(userId);
      }
    }

    if (meta) {
      void this.loginHistoryRepository.create({
        authId: userId,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
        deviceId: meta.device,
        action: LoginAction.LOGOUT,
        success: true,
        attemptNumber: 1,
        isSuspicious: false,
      });
    }
  }

  /**
   * Logout all devices for a user
   */
  async logoutAllDevices(userId: string): Promise<void> {
    await this.sessionRepository.revokeAllUserSessions(userId);
  }

  /**
   * Refresh access token using refresh token (with rotation)
   */
  async refreshToken(
    token: string,
    meta: IRequestMeta,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    if (!token) {
      throw new InvalidTokenException("Refresh token is required");
    }

    let decoded;
    try {
      decoded = await this.tokenService.verifyRefreshToken(token);
    } catch (error) {
      if (error instanceof TokenExpiredException) throw error;
      throw new InvalidTokenException();
    }

    const { userId, jti } = decoded;

    // Get stored session
    const session = await this.sessionRepository.find(userId, jti);
    if (!session) {
      // Token not found — possible reuse attack; revoke all
      await this.sessionRepository.revokeAllUserSessions(userId);
      throw new SessionNotFoundException(
        "Refresh token has been revoked. Please login again.",
      );
    }

    // Validate token hash
    const tokenHash = hashToken(token);
    if (session.tokenHash !== tokenHash) {
      await this.sessionRepository.revokeAllUserSessions(userId);
      throw new InvalidTokenException("Invalid refresh token");
    }

    // Fetch user to verify current status
    const user = await this.userRepository.findById(userId);
    if (!user || user.status !== UserStatus.ACTIVE) {
      await this.sessionRepository.revokeAllUserSessions(userId);
      throw new InvalidTokenException("User account is not active");
    }

    // TOKEN ROTATION: generate new pair
    const newTokenPair = await this.tokenService.generateTokenPair(user);

    // Atomic rotation: delete old, save new
    await this.sessionRepository.delete(userId, jti);
    await this.persistSession(user, newTokenPair, meta);

    return {
      accessToken: newTokenPair.accessToken,
      refreshToken: newTokenPair.refreshToken,
      expiresIn: newTokenPair.expiresIn,
    };
  }

  // ==================== PRIVATE HELPERS ====================

  private async persistSession(
    user: User,
    tokenPair: TokenPair,
    meta: IRequestMeta,
  ): Promise<void> {
    const ttl = parseExpiryToSeconds(AUTH_CONFIG.TOKEN_EXPIRY.REFRESH);
    const tokenHash = hashToken(tokenPair.refreshToken);

    const session = AuthSession.create({
      id: tokenPair.jti,
      userId: user.id,
      tokenHash,
      ip: meta.ip,
      userAgent: meta.userAgent,
      device: meta.device,
      expiresAt: tokenPair.expiresAt,
    });

    await this.sessionRepository.save(session, ttl);

    // Update user sessions list
    const sessions = await this.sessionRepository.getUserSessions(user.id);
    sessions.push(tokenPair.jti);
    await this.sessionRepository.saveUserSessions(user.id, sessions, ttl);
  }
}
