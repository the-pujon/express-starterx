import { User } from "../../../domain/models/user.model";
import { IUserDocument } from "../mongoose/user.schema";

// ================================
// Domain ↔ Mongoose Mapping
// ================================

export function toDomain(doc: IUserDocument & { _id?: any }): User {
  return User.reconstitute({
    id: doc._id?.toString() || "",
    name: doc.name,
    username: doc.username,
    email: doc.email,
    phone: doc.phone,
    password: doc.password,
    role: doc.role as any,
    status: doc.status as any,
    lastLogin: doc.lastLogin,
    isVerified: doc.isVerified,
    provider: doc.provider,
    providerId: doc.providerId || null,
    deletedAt: doc.deletedAt || null,
    failedLoginAttempts: doc.failedLoginAttempts || 0,
    lastFailedLogin: doc.lastFailedLogin || null,
    accountLocked: doc.accountLocked || false,
    accountLockedUntil: doc.accountLockedUntil || null,
    mfaEnabled: doc.mfaEnabled || false,
    mfaMethod: (doc.mfaMethod as any) || null,
    mfaSecret: doc.mfaSecret || null,
    lastPasswordChange: doc.lastPasswordChange || new Date(),
    tokenVersion: doc.tokenVersion || 0,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });
}

export function toDocumentData(user: User): Partial<IUserDocument> {
  return {
    name: user.name,
    username: user.username,
    email: user.email,
    phone: user.phone,
    password: user.getPassword(),
    role: user.role,
    status: user.status,
    lastLogin: user.lastLogin,
    isVerified: user.isVerified,
    provider: user.provider,
    providerId: user.providerId || undefined,
    deletedAt: user.deletedAt || undefined,
    tokenVersion: user.tokenVersion,
    failedLoginAttempts: user.getFailedLoginAttempts(),
    lastFailedLogin: user.getLastFailedLogin() || undefined,
    accountLocked: user.isLocked(),
    accountLockedUntil: user.getLockExpiresAt() || undefined,
    mfaEnabled: user.mfaEnabled,
    mfaMethod: user.mfaMethod || undefined,
    lastPasswordChange: user.lastPasswordChange,
  };
}
