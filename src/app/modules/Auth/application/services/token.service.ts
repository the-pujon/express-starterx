import jwt from "jsonwebtoken";
import config from "../../../../config";
import { AUTH_CONFIG } from "../../domain/config/auth.config";
import { User } from "../../domain/models/user.model";
import {
  InvalidTokenException,
  TokenExpiredException,
} from "../../domain/exceptions/auth.exceptions";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  jti: string;
  expiresAt: Date;
  expiresIn: number;
}

export interface AccessTokenPayload {
  userId: string;
  email: string;
  username: string;
  role: string;
  tokenVersion: number;
  type: "access";
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenVersion: number;
  jti: string;
  type: "refresh";
  iat?: number;
  exp?: number;
}

export class TokenService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;

  constructor() {
    this.accessTokenSecret = config.jwt_access_secret || "your-secret-key";
    this.refreshTokenSecret =
      config.jwt_refresh_secret || "your-refresh-secret-key";
  }

  async generateTokenPair(user: User): Promise<TokenPair> {
    const { ACCESS, REFRESH } = AUTH_CONFIG.TOKEN_EXPIRY;
    const jti = this.generateJti();

    const accessPayload: Omit<AccessTokenPayload, "iat" | "exp"> = {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      tokenVersion: user.tokenVersion,
      type: "access",
    };

    const refreshPayload: Omit<RefreshTokenPayload, "iat" | "exp" | "jti"> = {
      userId: user.id,
      tokenVersion: user.tokenVersion,
      type: "refresh",
    };

    const accessToken = jwt.sign(accessPayload, this.accessTokenSecret, {
      expiresIn: ACCESS,
    });

    const refreshToken = jwt.sign(refreshPayload, this.refreshTokenSecret, {
      expiresIn: REFRESH,
      jwtid: jti,
    });

    const expiresAt = new Date(Date.now() + this.parseExpiryToMs(REFRESH));
    const expiresIn = this.parseExpiryToSeconds(ACCESS);

    return {
      accessToken,
      refreshToken,
      jti,
      expiresAt,
      expiresIn,
    };
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    try {
      const payload = jwt.verify(
        token,
        this.accessTokenSecret,
      ) as AccessTokenPayload;
      if (payload.type !== "access") {
        throw new InvalidTokenException("Invalid token type");
      }
      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new TokenExpiredException();
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new InvalidTokenException(error.message);
      }
      throw new InvalidTokenException();
    }
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      const payload = jwt.verify(
        token,
        this.refreshTokenSecret,
      ) as RefreshTokenPayload;
      if (payload.type !== "refresh") {
        throw new InvalidTokenException("Invalid token type");
      }
      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new TokenExpiredException();
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new InvalidTokenException(error.message);
      }
      throw new InvalidTokenException();
    }
  }

  decode(token: string): any {
    return jwt.decode(token);
  }

  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) return null;
    const [type, token] = authHeader.split(" ");
    if (type !== "Bearer" || !token) return null;
    return token;
  }

  private generateJti(): string {
    return `jti_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private parseExpiryToMs(expiry: string): number {
    return this.parseExpiryToSeconds(expiry) * 1000;
  }

  private parseExpiryToSeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])?$/);
    if (!match) return 3600;

    const value = parseInt(match[1], 10);
    const unit = match[2] || "s";

    switch (unit) {
      case "s":
        return value;
      case "m":
        return value * 60;
      case "h":
        return value * 3600;
      case "d":
        return value * 86400;
      default:
        return value;
    }
  }
}
