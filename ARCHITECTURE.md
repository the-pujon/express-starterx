# Express + MongoDB Clean Architecture Boilerplate

> A production-ready Node.js/Express REST API starter built on **Clean Architecture** principles. All business logic is framework-agnostic; Express and Mongoose are treated as infrastructure details.

---

## Table of Contents

1. [Philosophy & Principles](#1-philosophy--principles)
2. [Project Root Structure](#2-project-root-structure)
3. [Source Tree (`src/`)](#3-source-tree-src)
4. [Clean Architecture Layers](#4-clean-architecture-layers)
5. [Module Breakdown](#5-module-breakdown)
   - [Auth Module](#51-auth-module)
   - [User Module](#52-user-module)
   - [ActivityLog Module](#53-activitylog-module)
6. [Cross-Cutting Infrastructure](#6-cross-cutting-infrastructure)
7. [Shared Utilities](#7-shared-utilities)
8. [Middleware](#8-middleware)
9. [Configuration](#9-configuration)
10. [Testing Strategy](#10-testing-strategy)
11. [Request Lifecycle](#11-request-lifecycle)
12. [Dependency Injection Pattern](#12-dependency-injection-pattern)
13. [Error Handling](#13-error-handling)
14. [Security Model](#14-security-model)
15. [Adding a New Module](#15-adding-a-new-module)
16. [Environment Variables](#16-environment-variables)
17. [Scripts & Docker](#17-scripts--docker)

---

## 1. Philosophy & Principles

This project follows **Clean Architecture** (Robert C. Martin) adapted for a TypeScript/Express context:

| Principle | Implementation |
|-----------|---------------|
| **Dependency Rule** | Inner layers (domain) never import from outer layers (infrastructure) |
| **Domain Independence** | Business logic has zero Express/Mongoose imports |
| **Constructor Injection** | All services receive dependencies via constructor; wired at the route (Composition Root) |
| **Port & Adapter** | Repository interfaces (ports) defined in domain; Mongoose/Redis implementations (adapters) in infrastructure |
| **Single Responsibility** | One service per use-case group (registration, authentication, token, etc.) |

---

## 2. Project Root Structure

```
modular-express-mongo-starter/
├── src/                    # All application source code
├── templates/              # HTML email templates (Handlebars-style {{variable}})
│   ├── verification-email.html
│   ├── reset-password-email.html
│   └── welcome.html
├── .env                    # Local environment (gitignored)
├── .env.example            # Template with all required variables
├── .env.test               # Test environment overrides
├── Dockerfile              # Production Docker image
├── docker-compose.yml      # Local dev: MongoDB + Redis + App
├── ecosystem.config.js     # PM2 process manager config (production)
├── jest.config.js          # Jest test runner configuration
├── tsconfig.json           # TypeScript compiler config
├── createModule.js         # CLI scaffold: generates a new Clean Architecture module
├── package.json
└── ARCHITECTURE.md         # This file
```

---

## 3. Source Tree (`src/`)

```
src/
├── app.ts                  # Express app factory (middleware, routes, error handlers)
├── server.ts               # Entry point: DB connect, Redis connect, HTTP listen
│
├── __tests__/
│   ├── setup.ts            # Jest global setup (loads .env.test)
│   ├── e2e/
│   │   └── auth.e2e.test.ts        # Integration tests (requires real MongoDB)
│   └── modules/
│       └── Auth/
│           └── auth.service.test.ts # Unit tests (fully mocked)
│
└── app/
    ├── config/             # App-level config singletons
    ├── errors/             # Error class + Mongoose/Zod/Multer error parsers
    ├── helpers/            # Pagination math helpers
    ├── interface/          # Shared TypeScript interfaces & Express augmentation
    ├── middlewares/        # Express middleware (auth, validation, error, 404, multer)
    ├── modules/            # Feature modules (Clean Architecture)
    │   ├── Auth/
    │   ├── User/
    │   └── ActivityLog/
    ├── routes/             # Top-level router (mounts all module routes)
    ├── shared/             # Tiny cross-module pure utilities (pick, etc.)
    └── utils/              # Infrastructure utilities (Redis, email, Cloudinary, etc.)
```

---

## 4. Clean Architecture Layers

Each module is split into four concentric layers. **Dependencies point inward only.**

```
┌─────────────────────────────────────────────┐
│           Presentation Layer                │  ← Express Controllers, Routes, DTOs
│  (auth.route.ts, auth.controller.ts)        │
├─────────────────────────────────────────────┤
│           Application Layer                 │  ← Use-Case Services
│  (registration.service.ts, token.service.ts)│
├─────────────────────────────────────────────┤
│             Domain Layer                    │  ← Pure Business Logic
│  (user.model.ts, auth.exceptions.ts,        │
│   IUserRepository interface)                │
├─────────────────────────────────────────────┤
│          Infrastructure Layer               │  ← DB/Cache Implementations
│  (mongo-user.repository.ts,                 │
│   redis-auth-session.repository.ts)         │
└─────────────────────────────────────────────┘
```

### Layer Responsibilities

| Layer | Contains | May Import |
|-------|----------|-----------|
| **Domain** | Entities, value objects, repository interfaces, domain exceptions | Nothing external |
| **Application** | Use-case services, orchestration, DTOs | Domain layer only |
| **Infrastructure** | Mongoose models, Redis adapters, OAuth adapters | Domain + npm libs |
| **Presentation** | Express controllers, Zod validation, route wiring (Composition Root) | Application + Infrastructure |

---

## 5. Module Breakdown

### 5.1 Auth Module

**Path:** `src/app/modules/Auth/`

The most complex module. Handles registration, login, OAuth, token refresh, logout, email verification, and password reset.

#### File Map

```
Auth/
├── auth.config.ts          # All Auth constants (token expiry, rate limits, cache prefixes)
├── auth.interface.ts       # Shared enums: EmailType, EmailStatus, LoginAction
├── auth.utils.ts           # Pure helper functions (checkRateLimit, hashToken, etc.)
├── auth.validation.ts      # Zod schemas for all auth endpoints
│
├── domain/
│   ├── models/
│   │   ├── user.model.ts           # User rich domain entity
│   │   └── auth-session.model.ts   # AuthSession value object
│   ├── interfaces/
│   │   ├── user.repository.interface.ts          # IUserRepository port
│   │   ├── auth-session.repository.interface.ts  # IAuthSessionRepository port
│   │   ├── email-history.repository.interface.ts # IEmailHistoryRepository port
│   │   ├── login-history.repository.interface.ts # ILoginHistoryRepository port
│   │   └── google-oauth.adapter.interface.ts     # IGoogleOAuthAdapter port
│   └── exceptions/
│       └── auth.exceptions.ts      # Semantic domain exceptions
│
├── application/
│   └── services/
│       ├── registration.service.ts      # signup, verifyEmail, resendVerifyEmailCode
│       ├── authentication.service.ts    # login, logout, refreshToken, authenticateWithGoogle
│       ├── email-verification.service.ts # email flow helpers
│       ├── password-reset.service.ts    # forgotPassword, resetPassword
│       └── token.service.ts             # JWT generation & verification
│
├── infrastructure/
│   ├── repositories/
│   │   ├── mongo-user.repository.ts         # Mongoose impl of IUserRepository
│   │   ├── redis-auth-session.repository.ts # Redis impl of IAuthSessionRepository
│   │   └── mongo-history.repository.ts      # Mongoose impl for login + email history
│   └── adapters/
│       └── google-oauth.adapter.ts          # Google token verification via googleapis
│
└── presentation/
    ├── dto/
    │   └── auth.dto.ts             # Response DTO shapes
    ├── controllers/
    │   └── auth.controller.ts      # HTTP handlers; delegates to services
    └── routes/
        └── auth.route.ts           # Express router + Composition Root (DI wiring)
```

#### Domain: `user.model.ts`

The `User` class is a **rich entity** — all business logic lives here, not in services or controllers.

| Method | Purpose |
|--------|---------|
| `User.create(props)` | Factory method for new users (sets defaults) |
| `User.reconstitute(props)` | Rehydrates from persistence (no side effects) |
| `user.canLogin()` | Returns `{ canLogin, reason }` — checks verified, active, not locked |
| `user.verifyPassword(plain)` | bcrypt compare against stored hash |
| `user.incrementFailedAttempts(max, lockDuration)` | Tracks failed logins; auto-locks account |
| `user.resetFailedAttempts()` | Clears lock after successful login |
| `user.verifyEmail()` | Sets `isVerified = true` |
| `user.isLocked()` | Returns boolean; checks lockout window |

#### Domain: `auth-session.model.ts`

Value object representing a refresh token session (stored in Redis). Contains:
- `id` (jti — JWT token ID)
- `userId`, `tokenHash`, `ip`, `userAgent`, `device`, `expiresAt`

#### Domain Exceptions: `auth.exceptions.ts`

All exceptions extend `AppError`. Services throw semantic exceptions; controllers don't need to know the details.

| Exception | HTTP Status | Description |
|-----------|------------|-------------|
| `UserAlreadyExistsException` | 400 | Duplicate email or username |
| `InvalidCredentialsException` | 401 | Bad email/password |
| `AccountLockedException` | 403 | Too many failed attempts |
| `EmailNotVerifiedException` | 403 | Login before verification |
| `InvalidTokenException` | 401 | Malformed/tampered JWT |
| `TokenExpiredException` | 401 | Expired JWT |
| `SessionNotFoundException` | 401 | Refresh token not found (possible reuse attack) |
| `UserNotFoundException` | 404 | User lookup failed |
| `WeakPasswordException` | 400 | Password fails strength rules |
| `InvalidVerificationCodeException` | 400 | Wrong or expired email code |
| `RateLimitExceededException` | 429 | Too many requests |

#### Application Services

**`RegistrationService`**
- `signup(payload, meta)` — validates uniqueness, hashes password, creates user, caches verification code, fires email
- `verifyEmail(email, code, meta)` — validates Redis code, marks user verified, sends welcome email
- `resendVerifyEmailCode(email, meta)` — rate-limited resend of verification email

**`AuthenticationService`**
- `login(credentials, meta)` — rate-limited, bcrypt compare, account lock check, token pair generation, session save
- `authenticateWithGoogle(googleUser, meta)` — find-or-create for OAuth users
- `logout(refreshToken, userId, meta)` — verifies token ownership, deletes session from Redis
- `logoutAllDevices(userId)` — revokes all Redis sessions
- `refreshToken(token, meta)` — validates session hash, rotates token pair (atomic: delete old, save new)

**`TokenService`**
- `generateTokenPair(user)` — signs access + refresh JWTs with unique `jti`
- `verifyAccessToken(token)` — returns decoded payload
- `verifyRefreshToken(token)` — returns decoded payload (checks `tokenVersion`)

**`PasswordResetService`**
- `forgotPassword(email, meta)` — generates reset code, caches in Redis, sends email
- `resetPassword(email, code, newPassword, meta)` — validates code, hashes new password, bumps `tokenVersion` (invalidates all sessions)

#### Infrastructure: Repositories

**`MongoUserRepository`** — Implements `IUserRepository`
- Exports `UserMongooseModel` (used by E2E tests for DB seeding/cleanup)
- `toDomain(doc)` — maps Mongoose document → `User` domain entity
- Handles Mongoose `lean()` queries for performance

**`RedisAuthSessionRepository`** — Implements `IAuthSessionRepository`
- `save(session, ttl)` — stores session as Redis hash with expiry
- `find(userId, jti)` — retrieves session by composite key
- `delete(userId, jti)` — removes single session
- `getUserSessions(userId)` — retrieves list of active jtis
- `saveUserSessions(userId, jtis, ttl)` — overwrites session list
- `revokeAllUserSessions(userId)` — DEL all session keys (reuse attack response)

**`MongoHistoryRepository`** — Implements both `ILoginHistoryRepository` and `IEmailHistoryRepository`
- Two Mongoose schemas (LoginHistory, EmailHistory) in a single repository file

#### Presentation: Composition Root (`auth.route.ts`)

The route file is where **Dependency Injection is wired**:

```typescript
// All repositories are instantiated here
const userRepo = new MongoUserRepository();
const sessionRepo = new RedisAuthSessionRepository();
const loginHistoryRepo = new MongoHistoryRepository();
const emailHistoryRepo = new MongoHistoryRepository();
const activityLogRepo = new MongoActivityLogRepository();
const googleAdapter = new GoogleOAuthAdapter();

// Services receive their dependencies
const tokenService = new TokenService();
const registrationService = new RegistrationService(userRepo, emailHistoryRepo, activityLogRepo);
const authenticationService = new AuthenticationService(userRepo, sessionRepo, loginHistoryRepo, tokenService, activityLogRepo);
// ...

// Controller receives all services
const authController = new AuthController(registrationService, authenticationService, ...);
```

#### Auth Endpoints

| Method | Path | Middleware | Description |
|--------|------|-----------|-------------|
| `POST` | `/api/v1/auth/signup` | `validateRequest` | Register new user |
| `POST` | `/api/v1/auth/login` | `validateRequest` | Email/password login |
| `POST` | `/api/v1/auth/logout` | `auth` | Logout current device |
| `POST` | `/api/v1/auth/refresh-token` | — | Rotate refresh token (cookie) |
| `POST` | `/api/v1/auth/verify-email` | — | Submit 6-digit code |
| `POST` | `/api/v1/auth/resend-verify-email` | — | Resend verification email |
| `POST` | `/api/v1/auth/forgot-password` | — | Request password reset |
| `POST` | `/api/v1/auth/reset-password` | — | Submit new password |
| `GET` | `/api/v1/auth/google` | — | Initiate Google OAuth |
| `GET` | `/api/v1/auth/google/callback` | — | Google OAuth callback |
| `POST` | `/api/v1/auth/logout-all` | `auth` | Logout all devices |

---

### 5.2 User Module

**Path:** `src/app/modules/User/`

Handles user profile viewing and management (admin operations).

```
User/
├── domain/
│   ├── models/
│   │   └── user-profile.model.ts          # UserProfile value object (read-only projection)
│   └── interfaces/
│       └── user-profile.repository.interface.ts  # IUserProfileRepository port
│
├── application/
│   └── services/
│       ├── user-profile.service.ts         # getMyProfile, updateProfile
│       └── user-management.service.ts      # getAllUsers, getUserById, deleteUser (admin)
│
├── infrastructure/
│   └── repositories/
│       └── mongo-user-profile.repository.ts  # Reuses Auth module's UserMongooseModel
│
└── presentation/
    ├── controllers/
    │   └── user.controller.ts
    └── routes/
        └── user.route.ts                   # Composition Root for User module
```

#### User Endpoints

| Method | Path | Middleware | Description |
|--------|------|-----------|-------------|
| `GET` | `/api/v1/user/me` | `auth` | Get own profile |
| `PATCH` | `/api/v1/user/me` | `auth` | Update own profile |
| `GET` | `/api/v1/user/` | `auth(admin)` | List all users (admin) |
| `GET` | `/api/v1/user/:id` | `auth(admin)` | Get user by ID (admin) |
| `DELETE` | `/api/v1/user/:id` | `auth(admin)` | Soft-delete user (admin) |

---

### 5.3 ActivityLog Module

**Path:** `src/app/modules/ActivityLog/`

Passive logging of user actions (create, update, delete) for audit trails.

```
ActivityLog/
├── domain/
│   ├── models/
│   │   └── activity-log.model.ts          # ActivityLog entity + ActionType/EventType enums
│   └── interfaces/
│       └── activity-log.repository.interface.ts  # IActivityLogRepository port
│
├── application/
│   └── services/
│       └── activity-log.service.ts        # Thin service wrapping repository
│
└── infrastructure/
    └── repositories/
        └── mongo-activity-log.repository.ts  # Mongoose ActivityLog schema + implementation
```

ActivityLog is **write-only** from the app's perspective — services call `activityLogRepository.create(...)` as a fire-and-forget operation (`void`). It never blocks user-facing flows.

---

## 6. Cross-Cutting Infrastructure

### `src/app/config/`

| File | Purpose |
|------|---------|
| `index.ts` | Reads & validates all `process.env` variables; exports a typed `config` object |
| `redis.config.ts` | Singleton Redis client with reconnect strategy (3 retries) |

### `src/app/routes/index.ts`

The top-level Express router. Mounts all module sub-routers:

```typescript
router.use('/auth', authRouter);
router.use('/user', userRouter);
```

---

## 7. Shared Utilities

### `src/app/utils/`

| File | Purpose |
|------|---------|
| `catchAsync.ts` | Wraps async route handlers; forwards errors to Express `next()` |
| `sendResponse.ts` | Standardized JSON success response: `{ success, statusCode, message, data }` |
| `redis.utils.ts` | `cacheData`, `getCachedData`, `deleteCachedData` — thin wrappers over the Redis client |
| `sendEmail.ts` | Nodemailer transporter + `getEmailTemplate(file, vars)` for HTML template interpolation |
| `cloudinary.ts` | Cloudinary SDK instance |
| `cloudinary_file_upload.ts` | Upload buffer → Cloudinary, returns secure URL |
| `cloudinaryDelete.ts` | Delete asset from Cloudinary by public_id |
| `multerConfig.ts` | Memory-storage Multer instance |
| `queryFilter.ts` | Builds Mongoose query from request query params |
| `extractPublicId.ts` | Parses Cloudinary public_id from a URL |

### `src/app/shared/`

| File | Purpose |
|------|---------|
| `pick.ts` | `pick(obj, keys)` — type-safe object subset (used in pagination query building) |

### `src/app/helpers/`

| File | Purpose |
|------|---------|
| `paginationHelpers.ts` | Calculates `page`, `limit`, `skip`, `totalPages`, `hasNextPage`, `hasPrevPage` |

---

## 8. Middleware

**Path:** `src/app/middlewares/`

| File | Purpose |
|------|---------|
| `auth.ts` | JWT auth guard: verifies access token, checks `tokenVersion`, attaches `req.user` |
| `validateRequest.ts` | Zod schema middleware factory: validates `body`, `query`, or `params` |
| `globalErrorhandler.ts` | Catches all errors; maps `AppError`, Zod errors, Mongoose errors → JSON response |
| `notFound.ts` | 404 handler for unmatched routes |
| `multerMiddleware.ts` | Per-route file upload middleware (single/array/fields) |

#### Auth Middleware Detail

The `auth` middleware in `middlewares/auth.ts`:
1. Reads `Authorization` header (Bearer token)
2. Verifies JWT signature using `JWT_ACCESS_SECRET`
3. Fetches user from DB to check current `tokenVersion`
4. If `jwt.tokenVersion !== user.tokenVersion`, rejects (handles password change invalidation)
5. Attaches `{ id, role, email, tokenVersion }` to `req.user`

---

## 9. Configuration

### `auth.config.ts` — Auth Constants

```typescript
AUTH_CONFIG = {
  TOKEN_EXPIRY: {
    ACCESS: '15m',
    REFRESH: '7d',
  },
  RATE_LIMIT: {
    LOGIN:  { MAX_ATTEMPTS: 5, WINDOW_MS: 15 * 60 * 1000 },
    SIGNUP: { MAX_ATTEMPTS: 3, WINDOW_MS: 60 * 60 * 1000 },
  },
  ACCOUNT_LOCKOUT: {
    MAX_FAILED_ATTEMPTS: 5,
    LOCKOUT_DURATION_MS: 30 * 60 * 1000,  // 30 minutes
  },
  VERIFICATION_TOKEN_EXPIRY_MINUTES: 10,
  PASSWORD_RESET_EXPIRY_MINUTES: 15,
  MAX_SESSIONS_PER_USER: 5,
  CACHE_PREFIXES: {
    VERIFICATION: 'verify:',
    RESET: 'reset:',
    RATE_LIMIT: 'rate:',
  },
}
```

---

## 10. Testing Strategy

### Unit Tests (`src/__tests__/modules/`)

- **Fully isolated** — no real database, Redis, or network calls
- All external dependencies mocked via `jest.fn()`
- Tests the **Application layer** (services) by injecting mock repositories
- `auth.utils` is mocked at module level (`jest.mock(...)`) to prevent Redis calls from `checkRateLimit`

**File:** `auth.service.test.ts`

| Test | Covers |
|------|--------|
| `RegistrationService — email taken` | `existsByEmail` returns `true` → throws `UserAlreadyExistsException` |
| `RegistrationService — success` | `existsByEmail/Username` return `false` → user saved, service returns user |
| `AuthenticationService — user not found` | `findByEmail` returns `null` → throws `InvalidCredentialsException` |

### E2E Tests (`src/__tests__/e2e/`)

- **Integration tests** — hit real HTTP endpoints via `supertest`
- Require a running MongoDB (gracefully skipped if unavailable via `dbAvailable` flag)
- Clean up created data in `afterAll`

**File:** `auth.e2e.test.ts`

Covers the full signup → login → profile → refresh → logout flow.

### Running Tests

```bash
# All tests
npm test

# Unit tests only
npx jest --testPathPatterns="auth.service.test"

# E2E tests only (requires Docker services running)
npx jest --testPathPatterns="auth.e2e.test"

# With coverage
npm run test:coverage
```

---

## 11. Request Lifecycle

```
HTTP Request
     │
     ▼
app.ts (Express middleware stack)
     │  cors → cookieParser → rateLimit → body parser
     ▼
routes/index.ts
     │  /api/v1/auth/* or /api/v1/user/*
     ▼
auth.route.ts / user.route.ts
     │  validateRequest(schema) → auth middleware (if protected)
     ▼
AuthController.methodName()
     │  Extracts DTO from req.body/params/cookies
     ▼
ApplicationService.useCase()
     │  Pure business logic; calls repository ports
     ▼
IUserRepository / IAuthSessionRepository / ...
     │  (interface — dependency inversion)
     ▼
MongoUserRepository / RedisAuthSessionRepository
     │  Real DB/cache operations
     ▼
Response ← sendResponse(res, { statusCode, message, data })
```

---

## 12. Dependency Injection Pattern

Since Express has no built-in DI container, **Constructor Injection** is used with the **Composition Root** pattern. All wiring happens in the route file:

```typescript
// auth.route.ts (Composition Root)
const userRepo           = new MongoUserRepository();
const sessionRepo        = new RedisAuthSessionRepository();
const historyRepo        = new MongoHistoryRepository();
const activityLogRepo    = new MongoActivityLogRepository();
const tokenService       = new TokenService();

const registrationSvc    = new RegistrationService(userRepo, historyRepo, activityLogRepo);
const authenticationSvc  = new AuthenticationService(userRepo, sessionRepo, historyRepo, tokenService, activityLogRepo);

const controller         = new AuthController(registrationSvc, authenticationSvc, ...);

router.post('/signup', validateRequest(AuthValidation.signup), (req, res, next) =>
  controller.signup(req, res, next)
);
```

**Why no DI container?** This keeps the codebase dependency-free and trivially testable — unit tests just pass mock objects directly to constructors.

---

## 13. Error Handling

### AppError

All thrown errors inherit from `AppError`:

```typescript
class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) { ... }
}
```

### Global Error Handler (`globalErrorhandler.ts`)

Catches every error thrown or passed to `next(err)`:

| Error Type | Handler | Behavior |
|-----------|---------|---------|
| `AppError` | Direct | Uses `statusCode` and `message` from instance |
| `ZodError` | `handleZodError` | Maps field errors to user-friendly format |
| `CastError` (Mongoose) | `handleCastError` | Invalid ObjectId → 400 |
| Duplicate key (code 11000) | `handleDuplicateError` | → 400 with field name |
| `ValidationError` (Mongoose) | `handleValidationError` | → 400 with field details |
| `MulterError` | `handleMulterErrors` | File upload errors → 400 |
| Unknown | Fallback | 500 Internal Server Error |

### catchAsync Wrapper

```typescript
export const catchAsync = (fn: RequestHandler) =>
  (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
```

All async controller methods are wrapped with `catchAsync` so thrown errors automatically reach the global handler.

---

## 14. Security Model

### Token Strategy

| Token | Storage | Expiry | Purpose |
|-------|---------|--------|---------|
| **Access Token** | `Authorization` header | 15 min | API authentication |
| **Refresh Token** | `httpOnly` cookie | 7 days | Access token renewal |

### Session Invalidation

- Each refresh token has a unique `jti` (JWT ID), stored as a Redis hash
- The hash includes a `tokenHash` (SHA-256 of the raw token) — prevents token substitution attacks
- On refresh: old session deleted, new session created atomically (**Token Rotation**)
- On logout: session deleted from Redis
- On reuse attack (token not found): **all sessions revoked**
- On password change: `tokenVersion` bumped — access tokens with old version are rejected

### Rate Limiting

- Global: express-rate-limit (100 req / 15 min)
- Signup: 3 attempts / 1 hour per email (Redis-based)
- Login: 5 attempts / 15 min per email (Redis-based)
- Account lockout: 30 min after 5 failed login attempts

### Account Lockout

Tracked in the `User` domain entity (`accountLocked`, `accountLockedUntil`). Checked in `user.canLogin()` before any password comparison.

---

## 15. Adding a New Module

Use the built-in scaffold:

```bash
npm run create-module
# Prompts for module name → creates the full 4-layer skeleton
```

Or follow this manual pattern:

```
src/app/modules/YourModule/
├── domain/
│   ├── models/your.model.ts
│   ├── interfaces/your.repository.interface.ts
│   └── exceptions/your.exceptions.ts
│
├── application/
│   └── services/your.service.ts
│
├── infrastructure/
│   └── repositories/mongo-your.repository.ts
│
└── presentation/
    ├── controllers/your.controller.ts
    ├── dto/your.dto.ts
    └── routes/your.route.ts      ← Composition Root (DI wiring here)
```

Then register in `src/app/routes/index.ts`:

```typescript
import yourRouter from '../modules/YourModule/presentation/routes/your.route';
router.use('/your', yourRouter);
```

---

## 16. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | ✓ | `development` / `production` / `test` |
| `PORT` | ✓ | HTTP server port |
| `MONGODB_URI` | ✓ | Full MongoDB connection string |
| `REDIS_URL` | ✓ | Redis connection URL |
| `JWT_ACCESS_SECRET` | ✓ | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | ✓ | Secret for signing refresh tokens |
| `JWT_ACCESS_EXPIRES_IN` | ✓ | e.g. `15m` |
| `JWT_REFRESH_EXPIRES_IN` | ✓ | e.g. `7d` |
| `BCRYPT_SALT_ROUNDS` | ✓ | e.g. `12` |
| `SMTP_HOST` | ✓ | Email server host |
| `SMTP_PORT` | ✓ | Email server port |
| `SMTP_USER` | ✓ | Email sender address |
| `SMTP_PASS` | ✓ | Email sender password |
| `EMAIL_FROM` | ✓ | Display name for sent emails |
| `GOOGLE_CLIENT_ID` | OAuth | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | OAuth | OAuth redirect URI |
| `CLOUDINARY_CLOUD_NAME` | Files | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Files | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Files | Cloudinary API secret |
| `FRONTEND_URLS` | ✓ | Comma-separated allowed CORS origins |
| `REDIS_CACHE_KEY_PREFIX` | — | Prefix for all Redis keys (default: `express_starter`) |

---

## 17. Scripts & Docker

### NPM Scripts

```bash
npm run dev           # tsx watch — hot reload development server
npm run build         # tsc — compile to /dist
npm test              # jest — run all tests
npm run test:watch    # jest --watch
npm run test:coverage # jest --coverage
npm run create-module # interactive module scaffold
npm run docker:up     # docker-compose up -d (MongoDB + Redis)
npm run docker:down   # docker-compose down
npm run docker:build  # rebuild and start containers
npm run docker:logs   # tail container logs
```

### Docker Compose Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `mongodb` | mongo:7 | 27017 | Primary database |
| `redis` | redis:7-alpine | 6379 | Session store + cache |
| `app` | (Dockerfile) | 3000 | Express API |

### Production (PM2)

```bash
npm run build
pm2 start ecosystem.config.js
```

`ecosystem.config.js` configures:
- `cluster` mode (utilizes all CPU cores)
- Automatic restart on crash
- Environment variable injection
