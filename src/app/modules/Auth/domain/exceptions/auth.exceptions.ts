import AppError from "../../../../errors/AppError";
import httpStatus from "http-status";

export class UserAlreadyExistsException extends AppError {
  constructor(identifier?: string) {
    super(
      httpStatus.CONFLICT,
      identifier
        ? `${identifier} already exists!`
        : "User already exists!"
    );
  }
}

export class InvalidCredentialsException extends AppError {
  constructor() {
    super(httpStatus.UNAUTHORIZED, "Invalid email or password");
  }
}

export class AccountLockedException extends AppError {
  constructor(remainingMinutes?: number) {
    const msg = remainingMinutes
      ? `Account is temporarily locked. Please try again in ${remainingMinutes} minutes.`
      : "Account is temporarily locked.";
    super(httpStatus.FORBIDDEN, msg);
  }
}

export class EmailNotVerifiedException extends AppError {
  constructor() {
    super(
      httpStatus.FORBIDDEN,
      "Please verify your email address before logging in"
    );
  }
}

export class EmailAlreadyVerifiedException extends AppError {
  constructor() {
    super(httpStatus.BAD_REQUEST, "User is already verified");
  }
}

export class InvalidVerificationCodeException extends AppError {
  constructor(message = "Invalid or expired verification code") {
    super(httpStatus.BAD_REQUEST, message);
  }
}

export class InvalidTokenException extends AppError {
  constructor(message = "Invalid or expired token") {
    super(httpStatus.UNAUTHORIZED, message);
  }
}

export class TokenExpiredException extends AppError {
  constructor() {
    super(httpStatus.UNAUTHORIZED, "Your session has expired. Please login again.");
  }
}

export class UserNotFoundException extends AppError {
  constructor(identifier?: string) {
    super(
      httpStatus.NOT_FOUND,
      identifier ? `User ${identifier} not found` : "User not found"
    );
  }
}

export class WeakPasswordException extends AppError {
  constructor(message = "Password does not meet security requirements") {
    super(httpStatus.BAD_REQUEST, message);
  }
}

export class InvalidPasswordException extends AppError {
  constructor() {
    super(httpStatus.BAD_REQUEST, "Current password is incorrect");
  }
}

export class SessionNotFoundException extends AppError {
  constructor(message = "Session has been revoked. Please login again.") {
    super(httpStatus.UNAUTHORIZED, message);
  }
}

export class RateLimitExceededException extends AppError {
  constructor(retryAfterSeconds?: number) {
    const message = retryAfterSeconds
      ? `Rate limit exceeded. Please try again after ${retryAfterSeconds} seconds.`
      : "Too many attempts. Please try again later.";
    super(httpStatus.TOO_MANY_REQUESTS, message);
  }
}

export class OAuthErrorException extends AppError {
  constructor(message: string) {
    super(httpStatus.BAD_REQUEST, `OAuth authentication failed: ${message}`);
  }
}
