export class AuthSession {
  constructor(
    public readonly id: string, // maps to jti
    public readonly userId: string,
    public readonly tokenHash: string,
    public readonly ip: string,
    public readonly userAgent: string,
    public readonly device: string | null,
    public readonly expiresAt: Date,
    public revoked: boolean,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public rotatedFrom: string | null = null
  ) {}

  static create(data: {
    id: string;
    userId: string;
    tokenHash: string;
    ip: string;
    userAgent: string;
    device?: string;
    expiresAt: Date;
    rotatedFrom?: string;
  }): AuthSession {
    return new AuthSession(
      data.id,
      data.userId,
      data.tokenHash,
      data.ip,
      data.userAgent,
      data.device || null,
      data.expiresAt,
      false,
      new Date(),
      new Date(),
      data.rotatedFrom || null
    );
  }

  static reconstitute(data: {
    id: string;
    userId: string;
    tokenHash: string;
    ip: string;
    userAgent: string;
    device: string | null;
    expiresAt: Date;
    revoked: boolean;
    createdAt: Date;
    updatedAt: Date;
    rotatedFrom?: string | null;
  }): AuthSession {
    return new AuthSession(
      data.id,
      data.userId,
      data.tokenHash,
      data.ip,
      data.userAgent,
      data.device,
      data.expiresAt,
      data.revoked,
      data.createdAt,
      data.updatedAt,
      data.rotatedFrom || null
    );
  }

  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  isValid(): boolean {
    return !this.revoked && !this.isExpired();
  }

  revoke(): void {
    this.revoked = true;
    this.updatedAt = new Date();
  }

  canBeUsed(): { valid: boolean; reason?: string } {
    if (this.revoked) {
      return { valid: false, reason: "Session has been revoked" };
    }
    if (this.isExpired()) {
      return { valid: false, reason: "Session has expired" };
    }
    return { valid: true };
  }

  toDTO() {
    return {
      id: this.id,
      userId: this.userId,
      ip: this.ip,
      userAgent: this.userAgent,
      device: this.device,
      expiresAt: this.expiresAt,
      createdAt: this.createdAt,
      isActive: this.isValid(),
    };
  }
}
