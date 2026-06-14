export enum LoginAction {
  LOGIN = "login",
  LOGOUT = "logout",
}

export enum EmailType {
  VERIFICATION = "verification",
  PASSWORD_RESET = "password_reset",
  NOTIFICATION = "notification",
  WELCOME = "welcome",
}

export enum EmailStatus {
  SENT = "sent",
  FAILED = "failed",
  PENDING = "pending",
  BOUNCED = "bounced",
  DELIVERED = "delivered",
  OPENED = "opened",
  CLICKED = "clicked",
}

export interface ILoginHistory {
  authId: string;
  ipAddress: string;
  userAgent: string;
  deviceId?: string;
  geoCountry?: string;
  geoCity?: string;
  action: LoginAction;
  success: boolean;
  failureReason?: string;
  attemptNumber: number;
  isSuspicious: boolean;
  createdAt?: Date;
}

export interface IEmailHistory {
  authId: string;
  emailTo: string;
  emailType: EmailType;
  subject: string;
  emailProvider?: string;
  messageId: string;
  emailStatus: EmailStatus;
  retryCount: number;
  ipAddress?: string;
  userAgent?: string;
  sentAt?: Date;
  errorMessage?: string;
  createdAt?: Date;
}

export interface IUserProfile {
  authId: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatarUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Google OAuth Interfaces
export interface IGoogleOAuthState {
  state: string;
  codeVerifier: string;
  redirectUrl?: string;
  ip: string;
  userAgent: string;
  createdAt: string;
}

export interface IGoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
}

export interface IGoogleOAuthInitResponse {
  url: string;
  state: string;
  authorizationUrl?: string;
}

export interface IGoogleOAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

export interface IGoogleIdTokenClaims {
  iss: string;
  azp: string;
  aud: string;
  sub: string;
  at_hash: string;
  iat: number;
  exp: number;
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  locale?: string;
}
