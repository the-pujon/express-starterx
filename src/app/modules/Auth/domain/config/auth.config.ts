import { UserRole } from "../models/user.model";

/**
 * Authentication Configuration Constants
 * Matches NestJS template pattern
 */
export const AUTH_CONFIG = {
  // Password Configuration
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_REQUIREMENTS: {
    UPPERCASE: true,
    LOWERCASE: true,
    NUMBERS: true,
    SPECIAL_CHARS: true,
  },

  // Token Configuration
  TOKEN_EXPIRY: {
    ACCESS: "15m",
    REFRESH: "7d",
    VERIFICATION: "24h",
    PASSWORD_RESET: "1h",
  },

  // Legacy token settings (for backward compatibility)
  VERIFICATION_TOKEN_LENGTH: 6,
  VERIFICATION_TOKEN_EXPIRY_MINUTES: 10,
  RESET_TOKEN_EXPIRY_MINUTES: 10,
  PASSWORD_RESET_TOKEN_LENGTH: 20,

  // Rate Limiting
  RATE_LIMIT: {
    LOGIN: {
      WINDOW_MS: 15 * 60 * 1000, // 15 minutes
      MAX_ATTEMPTS: 5,
    },
    SIGNUP: {
      WINDOW_MS: 60 * 60 * 1000, // 1 hour
      MAX_ATTEMPTS: 3,
    },
    PASSWORD_RESET: {
      WINDOW_MS: 60 * 60 * 1000, // 1 hour
      MAX_ATTEMPTS: 3,
    },
    LOGIN_MAX_ATTEMPTS: 5,
    LOGIN_WINDOW_MS: 15 * 60 * 1000,
    PASSWORD_RESET_MAX_ATTEMPTS: 3,
    PASSWORD_RESET_WINDOW_MS: 60 * 60 * 1000,
  },

  // Account Lockout
  ACCOUNT_LOCKOUT: {
    LOCKOUT_DURATION_MS: 30 * 60 * 1000, // 30 minutes
    MAX_FAILED_ATTEMPTS: 5,
  },

  // Session/Device Management
  SESSION: {
    MAX_DEVICES_PER_USER: 5,
  },

  // Role Hierarchy (higher number = more permissions)
  ROLE_HIERARCHY: {
    [UserRole.CUSTOMER]: 1,
    [UserRole.SELLER]: 1,
    [UserRole.MODERATOR]: 2,
    [UserRole.ADMIN]: 3,
    [UserRole.SUPER_ADMIN]: 4,
  },

  // Cache Prefixes
  CACHE_PREFIXES: {
    VERIFICATION: "verification:",
    PASSWORD_RESET: "password_reset:",
    SESSION: "session:",
    RATE_LIMIT: "rate_limit:",
    ACCESS_TOKEN: "access_token",
    REFRESH_TOKEN: "refresh:user",
    USER_SESSIONS: "sessions:user",
    VERIFICATION_TOKEN: "verification_token",
    RESET_PASSWORD: "reset:",
    PASSWORD_RESET_TOKEN: "password_reset_token",
    TOKEN_BLACKLIST: "token_blacklist",
    USER_TOKENS: "user:tokens:",
    GOOGLE_OAUTH_STATE: "google_oauth_state:",
  },

  // OAuth Providers
  OAUTH: {
    GOOGLE: {
      CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
      CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
      REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || "",
    },
  },

  // Google OAuth Configuration
  GOOGLE_OAUTH: {
    ENDPOINTS: {
      AUTHORIZATION: "https://accounts.google.com/o/oauth2/v2/auth",
      TOKEN: "https://oauth2.googleapis.com/token",
      USERINFO: "https://www.googleapis.com/oauth2/v3/userinfo",
      TOKEN_INFO: "https://oauth2.googleapis.com/tokeninfo",
    },
    STATE_TTL_SECONDS: 600,
    RESPONSE_TYPE: "code",
    SCOPES: ["openid", "email", "profile"],
    ACCESS_TYPE: "offline",
    PROMPT: "consent",
  },
} as const;

// Export UserRole for convenience
export { UserRole };
