/**
 * Domain Events for Cross-Module Communication
 *
 * This follows the Domain Events pattern to decouple modules.
 * Instead of direct imports, modules emit events that other modules can listen to.
 */

export enum DomainEventType {
  // Auth events
  USER_LOGGED_IN = "user.logged_in",
  USER_LOGGED_OUT = "user.logged_out",
  USER_REGISTERED = "user.registered",
  USER_PASSWORD_CHANGED = "user.password_changed",
  USER_EMAIL_VERIFIED = "user.email_verified",
  USER_PASSWORD_RESET = "user.password_reset",

  // User events
  USER_PROFILE_UPDATED = "user.profile_updated",
  USER_DELETED = "user.deleted",

  // Generic events
  ENTITY_CREATED = "entity.created",
  ENTITY_UPDATED = "entity.updated",
  ENTITY_DELETED = "entity.deleted",
}

export interface DomainEvent<T = unknown> {
  type: DomainEventType;
  payload: T;
  timestamp: Date;
  correlationId?: string;
}

export interface UserLoggedInEventPayload {
  userId: string;
  email: string;
  ip?: string;
  userAgent?: string;
  device?: string;
}

export interface UserRegisteredEventPayload {
  userId: string;
  email: string;
  username: string;
}

export interface UserLoggedOutEventPayload {
  userId: string;
  sessionId: string;
}

export interface UserEmailVerifiedEventPayload {
  userId: string;
  email: string;
}

export interface UserPasswordChangedEventPayload {
  userId: string;
  email: string;
}

export interface UserPasswordResetEventPayload {
  userId: string;
  email: string;
}
