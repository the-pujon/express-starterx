import { AuthSession } from "../models/auth-session.model";

export interface IAuthSessionRepository {
  save(session: AuthSession, ttlSeconds: number): Promise<void>;
  find(userId: string, jti: string): Promise<AuthSession | null>;
  delete(userId: string, jti: string): Promise<void>;
  getUserSessions(userId: string): Promise<string[]>;
  saveUserSessions(userId: string, sessions: string[], ttlSeconds: number): Promise<void>;
  revokeAllUserSessions(userId: string): Promise<void>;
}
