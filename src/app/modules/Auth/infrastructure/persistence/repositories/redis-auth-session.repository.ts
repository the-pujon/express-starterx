import { AuthSession } from "../../../domain/models/auth-session.model";
import { IAuthSessionRepository } from "../../../domain/interfaces/auth-session.repository.interface";
import {
  cacheData,
  getCachedData,
  deleteCachedData,
} from "../../../../../utils/redis.utils";
import { AUTH_CONFIG } from "../../../domain/config/auth.config";
import config from "../../../../../config";

/**
 * RedisAuthSessionRepository
 *
 * Redis-backed implementation of IAuthSessionRepository.
 * Stores session objects (hashed refresh tokens) keyed by userId:jti.
 * Also maintains a user-level sessions list for revocation.
 */
export class RedisAuthSessionRepository implements IAuthSessionRepository {
  private sessionKey(userId: string, jti: string): string {
    return `${config.redis_cache_key_prefix}:${AUTH_CONFIG.CACHE_PREFIXES.REFRESH_TOKEN}:${userId}:${jti}`;
  }

  private userSessionsKey(userId: string): string {
    return `${config.redis_cache_key_prefix}:${AUTH_CONFIG.CACHE_PREFIXES.USER_SESSIONS}:${userId}`;
  }

  async save(session: AuthSession, ttlSeconds: number): Promise<void> {
    const key = this.sessionKey(session.userId, session.id);
    const data = {
      userId: session.userId,
      jti: session.id,
      tokenHash: session.tokenHash,
      ip: session.ip,
      userAgent: session.userAgent,
      device: session.device,
      createdAt: session.createdAt.toISOString(),
      rotatedFrom: session.rotatedFrom,
    };
    await cacheData(key, data, ttlSeconds);
  }

  async find(userId: string, jti: string): Promise<AuthSession | null> {
    const key = this.sessionKey(userId, jti);
    const data = (await getCachedData(key)) as {
      userId: string;
      jti: string;
      tokenHash: string;
      ip: string;
      userAgent: string;
      device: string | null;
      createdAt: string;
      rotatedFrom?: string | null;
    } | null;

    if (!data) return null;

    return AuthSession.reconstitute({
      id: data.jti,
      userId: data.userId,
      tokenHash: data.tokenHash,
      ip: data.ip,
      userAgent: data.userAgent,
      device: data.device,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // inferred
      revoked: false,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.createdAt),
      rotatedFrom: data.rotatedFrom || null,
    });
  }

  async delete(userId: string, jti: string): Promise<void> {
    const key = this.sessionKey(userId, jti);
    await deleteCachedData(key);
  }

  async getUserSessions(userId: string): Promise<string[]> {
    const key = this.userSessionsKey(userId);
    const sessions = (await getCachedData(key)) as string[] | null;
    if (!sessions || !Array.isArray(sessions)) return [];
    return sessions.filter((s): s is string => typeof s === "string");
  }

  async saveUserSessions(
    userId: string,
    sessions: string[],
    ttlSeconds: number,
  ): Promise<void> {
    const key = this.userSessionsKey(userId);
    await cacheData(key, sessions, ttlSeconds);
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    const sessions = await this.getUserSessions(userId);

    await Promise.all([
      ...sessions.map((jti) => this.delete(userId, jti)),
      deleteCachedData(this.userSessionsKey(userId)),
    ]);
  }
}
