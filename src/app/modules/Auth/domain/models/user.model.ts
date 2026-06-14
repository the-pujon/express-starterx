import bcrypt from "bcrypt";

export enum UserRole {
  SUPER_ADMIN = "superAdmin",
  ADMIN = "admin",
  MODERATOR = "moderator",
  CUSTOMER = "customer",
  SELLER = "seller",
}

export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
  BLOCKED = "blocked",
  DELETED = "deleted",
}

export enum MfaMethod {
  TOTP = "totp",
  SMS = "sms",
  EMAIL = "email",
  WEBAUTHN = "webauthn",
}

export class User {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly username: string,
    public readonly email: string,
    public readonly phone: string,
    private password: string,
    public role: UserRole,
    public status: UserStatus,
    public lastLogin: Date,
    public isVerified: boolean,
    public readonly provider: string,
    public readonly providerId: string | null,
    public deletedAt: Date | null,
    private failedLoginAttempts: number,
    private lastFailedLogin: Date | null,
    private accountLocked: boolean,
    private accountLockedUntil: Date | null,
    public mfaEnabled: boolean,
    public mfaMethod: MfaMethod | null,
    private mfaSecret: string | null,
    public lastPasswordChange: Date,
    public tokenVersion: number,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}

  static create(data: {
    name: string;
    username: string;
    email: string;
    phone: string;
    password: string;
    role?: UserRole;
    status?: UserStatus;
    provider?: string;
    providerId?: string;
    isVerified?: boolean;
  }): User {
    const now = new Date();
    return new User(
      "", // Will be populated by DB on insert
      data.name,
      data.username,
      data.email,
      data.phone,
      data.password,
      data.role || UserRole.CUSTOMER,
      data.status || UserStatus.ACTIVE,
      now,
      data.isVerified || false,
      data.provider || "local",
      data.providerId || null,
      null,
      0,
      null,
      false,
      null,
      false,
      null,
      null,
      now,
      0, // tokenVersion
      now,
      now,
    );
  }

  static reconstitute(data: {
    id: string;
    name: string;
    username: string;
    email: string;
    phone: string;
    password: string;
    role: UserRole;
    status: UserStatus;
    lastLogin: Date;
    isVerified: boolean;
    provider: string;
    providerId: string | null;
    deletedAt: Date | null;
    failedLoginAttempts: number;
    lastFailedLogin: Date | null;
    accountLocked: boolean;
    accountLockedUntil: Date | null;
    mfaEnabled: boolean;
    mfaMethod: MfaMethod | null;
    mfaSecret: string | null;
    lastPasswordChange: Date;
    tokenVersion: number;
    createdAt?: Date;
    updatedAt?: Date;
  }): User {
    return new User(
      data.id,
      data.name,
      data.username,
      data.email,
      data.phone,
      data.password,
      data.role,
      data.status,
      data.lastLogin,
      data.isVerified,
      data.provider,
      data.providerId,
      data.deletedAt,
      data.failedLoginAttempts,
      data.lastFailedLogin,
      data.accountLocked,
      data.accountLockedUntil,
      data.mfaEnabled,
      data.mfaMethod,
      data.mfaSecret,
      data.lastPasswordChange,
      data.tokenVersion,
      data.createdAt,
      data.updatedAt,
    );
  }

  // ==================== Business Methods ====================

  async verifyPassword(plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, this.password);
  }

  isLocked(): boolean {
    if (!this.accountLocked) return false;
    if (!this.accountLockedUntil) return false;
    return new Date() < this.accountLockedUntil;
  }

  getLockExpiresAt(): Date | null {
    return this.accountLockedUntil;
  }

  incrementFailedAttempts(
    maxAttempts: number,
    lockoutDurationMs: number,
  ): void {
    this.failedLoginAttempts++;
    this.lastFailedLogin = new Date();

    if (this.failedLoginAttempts >= maxAttempts) {
      this.accountLocked = true;
      this.accountLockedUntil = new Date(Date.now() + lockoutDurationMs);
    }
  }

  resetFailedAttempts(): void {
    this.failedLoginAttempts = 0;
    this.accountLocked = false;
    this.accountLockedUntil = null;
    this.lastLogin = new Date();
  }

  verifyEmail(): void {
    this.isVerified = true;
  }

  updatePassword(newPassword: string): void {
    this.password = newPassword;
    this.tokenVersion++;
    this.lastPasswordChange = new Date();
  }

  revokeAllTokens(): void {
    this.tokenVersion++;
  }

  canLogin(): { canLogin: boolean; reason?: string } {
    if (this.isLocked()) {
      const remainingTime = Math.ceil(
        (this.accountLockedUntil!.getTime() - Date.now()) / 1000 / 60,
      );
      return {
        canLogin: false,
        reason: `Account is temporarily locked. Please try again in ${remainingTime} minutes.`,
      };
    }

    if (!this.isVerified) {
      return {
        canLogin: false,
        reason: "Please verify your email address before logging in",
      };
    }

    if (
      this.status === UserStatus.BLOCKED ||
      this.status === UserStatus.SUSPENDED
    ) {
      return {
        canLogin: false,
        reason: `Your account has been ${this.status}. Please contact support.`,
      };
    }

    if (
      this.status === UserStatus.DELETED ||
      this.status === UserStatus.INACTIVE
    ) {
      return {
        canLogin: false,
        reason: "Invalid email or password",
      };
    }

    return { canLogin: true };
  }

  getPassword(): string {
    return this.password;
  }

  getFailedLoginAttempts(): number {
    return this.failedLoginAttempts;
  }

  getLastFailedLogin(): Date | null {
    return this.lastFailedLogin;
  }

  getMfaSecret(): string | null {
    return this.mfaSecret;
  }

  toDTO() {
    return {
      id: this.id,
      name: this.name,
      username: this.username,
      email: this.email,
      phone: this.phone,
      role: this.role,
      status: this.status,
      isVerified: this.isVerified,
      provider: this.provider,
      lastLogin: this.lastLogin,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
