# Complete Developer Guide

---

## Table of Contents

1. [What is this Project?](#1-what-is-this-project)
2. [Architecture Overview](#2-architecture-overview)
3. [Understanding the Flow](#3-understanding-the-flow)
4. [Key Concepts Explained](#4-key-concepts-explained)
5. [SOLID Principles](#5-solid-principles)
6. [Folder Structure](#6-folder-structure)
7. [How to Add New Features](#7-how-to-add-new-features)
8. [Common Patterns](#8-common-patterns)
9. [FAQ](#9-faq)

---

## 1. How to Start (Quick Setup)

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18+ | JavaScript runtime |
| npm or yarn | Latest | Package manager |
| Docker Desktop | Latest | Container runtime (optional) |
| MongoDB | 7.0 | Database (optional, can use Docker) |
| Redis | 7.2 | Cache (optional, can use Docker) |


### Using Docker Compose (Recommended)

#### Step 1: Clone and Setup

Choose one of the following ways to get started:

**Option 1 — npx (recommended, no install needed):**
```bash
npx express-starterx@latest my-app
cd my-app
```

**Option 2 — global install:**
```bash
npm install -g express-starterx
express-starterx my-app
cd my-app
```

**Option 3 — git clone:**
```bash
git clone https://github.com/the-pujon/express-starterx.git
cd express-starterx
npm install
```

#### Step 2: Configure Environment

```bash
cp .env.example .env
```

Update `.env` with Docker-specific values:

```env
# Application
NODE_ENV=development
PORT=4000

# Database (Docker internal)
MONGODB_URI=mongodb://admin:admin123@mongo:27017/express_auth?authSource=admin
BCRYPT_SALT_ROUNDS=12

# JWT
JWT_ACCESS_SECRET=your_super_secure_access_token_secret_min_32_chars
JWT_ACCESS_EXPIRES_IN=1h
JWT_REFRESH_SECRET=your_super_secure_refresh_token_secret_min_32_chars
JWT_REFRESH_EXPIRES_IN=7d
JWT_PASSWORD_SECRET=your_super_secure_password_reset_secret
JWT_PASSWORD_EXPIRES_IN=15m

# Redis (Docker internal)
REDIS_URL=redis://:admin123@redis:6379

# Email & Cloudinary (optional)
...

# Docker Compose (must match docker-compose.yml)
MONGO_ROOT_PASSWORD=admin123
MONGO_DB=express_auth
MONGO_EXPRESS_PASSWORD=admin123
REDIS_PASSWORD=admin123
```

#### Step 3: Start All Services

```bash
# Start MongoDB, Redis, and Mongo Express
npm run docker:up

# Or manually:
docker-compose up -d
```

#### Step 4: Verify Services

```bash
# Check running containers
docker-compose ps

# View logs
npm run docker:logs
```

#### Step 5: Start the Application

```bash
# In a new terminal, run the dev server
npm run dev
```

---

### Available Services

| Service | URL | Credentials |
|---------|-----|-------------|
| API | http://localhost:4000 | - |
| MongoDB | localhost:27017 | admin / admin123 |
| Redis | localhost:6379 | (password from .env) |
| Mongo Express | http://localhost:8081 | admin / admin123 |

---

### Common Commands

```bash
# Development
npm run dev          # Start dev server with hot reload
npm run build        # Build for production
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage

# Docker
npm run docker:up    # Start all containers
npm run docker:down  # Stop all containers
npm run docker:build # Rebuild containers
npm run docker:logs  # View logs

# Module Generation
npm run create-module # Generate new module structure
```

---

### API Endpoints

Once running, access the API at `http://localhost:4000`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/signup` | Register new user |
| POST | `/api/v1/auth/login` | Login user |
| POST | `/api/v1/auth/refresh-token` | Refresh access token |
| POST | `/api/v1/auth/logout` | Logout user |
| POST | `/api/v1/auth/forgot-password` | Request password reset |
| POST | `/api/v1/auth/reset-password` | Reset password |
| GET | `/api/v1/auth/me` | Get current user |
| GET | `/api/v1/users` | Get all users (admin) |

---

## 1. What is this Project?

This is a **production-ready Node.js/Express REST API starter** built with **Clean Architecture** principles.

### What does that mean?

| Term | Simple Explanation |
|------|-------------------|
| **Node.js** | JavaScript runtime for building servers |
| **Express** | Web framework for handling HTTP requests |
| **MongoDB** | Database for storing data |
| **Clean Architecture** | A way to organize code so it's easy to test, maintain, and scale |

### Why use this architecture?

- ✅ Easy to test each part separately
- ✅ Easy to change databases (MongoDB → PostgreSQL)
- ✅ Business logic is separate from technical details
- ✅ Scales well as project grows

---

## 2. Architecture Overview

### The Big Picture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER REQUEST                              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  ROUTE (auth.route.ts)                                           │
│  • Wires up all dependencies (Composition Root)                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  CONTROLLER (auth.controller.ts)                                │
│  • Receives request, calls service                              │
│  • Returns response                                              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  SERVICE (registration.service.ts)                               │
│  • Contains business logic                                      │
│  • Coordinates operations                                        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  REPOSITORY (mongo-user.repository.ts)                          │
│  • Handles database operations                                   │
│  • Implements interface                                          │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  MONGODB DATABASE                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Understanding the Flow

### Example: User Registration

Let's trace what happens when a user signs up:

```
1. USER SENDS POST /auth/signup
        │
        ▼
2. ROUTE (auth.route.ts)
   │
   │  const userRepository = new MongoUserRepository();
   │  const registrationService = new RegistrationService(userRepository);
   │  const authController = new AuthController(registrationService);
   │
        ▼
3. CONTROLLER
   │
   │  authController.signup(req, res)
   │       │
   │       ▼
   │  registrationService.signup(payload)
   │
        ▼
4. SERVICE (Business Logic)
   │
   │  • Check rate limit
   │  • Validate password
   │  • Check if email already exists
   │  • Create new user: User.create({...})
   │  • Save to database: userRepository.save(user)
   │
        ▼
5. REPOSITORY (Database Operations)
   │
   │  • Convert User to document: toDocumentData(user)
   │  • Save to MongoDB: UserMongooseModel.create(doc)
   │  • Convert back to User: toDomain(doc)
   │
        ▼
6. RESPONSE BACK TO USER
```

---

## 4. Key Concepts Explained

### 4.1 Why Use a User Class Instead of Plain Object?

**Question:** Why do we use `User.create({...})` instead of just a plain object?

**Answer:** The User class provides:

1. **Encapsulation** - Private fields that can't be accessed directly
2. **Business Methods** - Methods like `verifyEmail()`, `lockAccount()`
3. **Defaults** - Automatic default values
4. **Single Source of Truth** - All user logic in one place

```typescript
// Using class
const user = User.create({ name: "John", email: "john@..." });
user.verifyEmail();  // Business logic in one place

// Using plain object (simpler but less organized)
const user = { name: "John", email: "john@...", isVerified: false };
// Business logic would be scattered everywhere
```

### 4.2 Why Do We Need a Repository?

The Repository pattern separates **business logic** from **database operations**.

```typescript
// Service doesn't know about MongoDB
class RegistrationService {
  constructor(private userRepository: IUserRepository) {}
  
  async signup(payload) {
    // Just calls interface methods - no DB code here!
    await this.userRepository.save(user);
  }
}

// Repository handles the DB details
class MongoUserRepository implements IUserRepository {
  async save(user: User) {
    // MongoDB-specific code here
    await UserModel.create(docData);
  }
}
```

**Benefit:** If you want to switch from MongoDB to PostgreSQL later, you only change the repository - the service stays the same!

### 4.3 What Does the Mapper Do?

The Mapper converts between different representations:

```typescript
// User class → MongoDB document (for saving to DB)
toDocumentData(user: User): Partial<IUserDocument>

// MongoDB document → User class (for using in code)
toDomain(doc: IUserDocument): User
```

### 4.4 What is Composition Root?

The place where we connect all the pieces together:

```typescript
// filepath: auth.route.ts (Composition Root)
const userRepository = new MongoUserRepository();           // Create repo
const emailHistoryRepo = new MongoEmailHistoryRepository(); // Create repo
const registrationService = new RegistrationService(       // Wire them up
  userRepository,
  emailHistoryRepo
);
const authController = new AuthController(registrationService); // Pass to controller
```

### 4.5 Static vs Instance Methods

```typescript
class User {
  // STATIC - called on the class, no instance needed
  static create(data: {...}): User {
    return new User(...);
  }
  
  static reconstitute(data: {...}): User {
    return new User(...);
  }

  // INSTANCE - called on an instance
  verifyEmail(): void {
    this.isVerified = true;  // 'this' refers to the instance
  }
}

// Usage
const newUser = User.create({...});     // Static - no instance
user.verifyEmail();                      // Instance - needs instance
```

---

## 5. SOLID Principles

This codebase follows SOLID principles:

| Letter | Principle | How It's Applied |
|--------|-----------|------------------|
| **S**ingle Responsibility | Each class does one thing | User model = user logic only, Repository = DB only |
| **O**pen/Closed | Open for extension, closed for modification | Add new methods without changing existing code |
| **L**iskov Substitution | Any implementation can replace another | `MongoUserRepository` can be swapped with `PostgresUserRepository` |
| **I**nterface Segregation | Many small interfaces vs one big one | `IUserRepository` defines clear contract |
| **D**ependency Inversion | Depend on abstractions, not concretions | Service depends on `IUserRepository`, not `MongoUserRepository` |

---

## 6. Folder Structure

```
src/
├── app/
│   ├── modules/
│   │   ├── Auth/
│   │   │   ├── application/        # Use cases (services)
│   │   │   │   └── services/
│   │   │   │       ├── registration.service.ts
│   │   │   │       ├── authentication.service.ts
│   │   │   │       └── ...
│   │   │   ├── domain/              # Business logic (no DB code)
│   │   │   │   ├── models/
│   │   │   │   │   └── user.model.ts
│   │   │   │   ├── interfaces/
│   │   │   │   │   └── user.repository.interface.ts
│   │   │   │   ├── exceptions/
│   │   │   │   └── config/
│   │   │   ├── infrastructure/    # Technical implementations
│   │   │   │   ├── persistence/
│   │   │   │   │   ├── repositories/
│   │   │   │   │   │   └── mongo-user.repository.ts
│   │   │   │   │   ├── mappers/
│   │   │   │   │   │   └── user.mapper.ts
│   │   │   │   │   └── mongoose/
│   │   │   │   │       └── user.schema.ts
│   │   │   │   └── adapters/
│   │   │   └── presentation/      # HTTP layer
│   │   │       ├── controllers/
│   │   │       ├── routes/
│   │   │       └── validation/
│   │   ├── User/
│   │   └── ActivityLog/
│   ├── middlewares/                 # Express middlewares
│   ├── shared/                     # Shared utilities
│   └── utils/                      # Helper functions
├── server.ts                       # Entry point
└── app.ts                          # Express app setup
```

### Layer Responsibilities

| Layer | Folder | Responsibility |
|-------|--------|----------------|
| **Presentation** | `presentation/` | HTTP requests/responses |
| **Application** | `application/` | Use cases, business flow |
| **Domain** | `domain/` | Business rules, entities |
| **Infrastructure** | `infrastructure/` | DB, external services |

---

## 7. How to Add New Features

### Example: Adding a "Forgot Password" Feature

#### Step 1: Create the Service

```typescript
// filepath: src/app/modules/Auth/application/services/forgot-password.service.ts

import { IUserRepository } from "../../domain/interfaces/user.repository.interface";

export class ForgotPasswordService {
  constructor(private userRepository: IUserRepository) {}

  async sendResetLink(email: string) {
    // 1. Find user
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error("User not found");
    }
    
    // 2. Generate reset token
    const resetToken = generateToken();
    
    // 3. Save to cache/database
    await cacheData(`reset:${email}`, resetToken, 3600);
    
    // 4. Send email
    await sendEmail(email, "Reset your password", ...);
  }
}
```

#### Step 2: Wire it up in the Route

```typescript
// filepath: src/app/modules/Auth/presentation/routes/auth.route.ts

import { ForgotPasswordService } from "../../application/services/forgot-password.service";

// In Composition Root:
const forgotPasswordService = new ForgotPasswordService(userRepository);
const authController = new AuthController(
  registrationService,
  authenticationService,
  forgotPasswordService  // Add new service
);

// Add route
router.post("/forgot-password", authController.forgotPassword);
```

#### Step 3: Add Controller Method

```typescript
// filepath: src/app/modules/Auth/presentation/controllers/auth.controller.ts

async forgotPassword(req, res) {
  const { email } = req.body;
  await this.forgotPasswordService.sendResetLink(email);
  res.json({ message: "Reset link sent" });
}
```

---

## 8. Common Patterns

### 8.1 Repository Pattern

```typescript
// Interface (contract)
interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<User>;
}

// Implementation
class MongoUserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const doc = await UserModel.findOne({ email });
    return doc ? toDomain(doc) : null;
  }
  
  async save(user: User): Promise<User> {
    const docData = toDocumentData(user);
    const created = await UserModel.create(docData);
    return toDomain(created);
  }
}
```

### 8.2 Factory Pattern

```typescript
class User {
  // Private constructor - can't use 'new User()' directly
  private constructor(...) {}
  
  // Factory method for creating new users
  static create(data: {...}): User {
    return new User("", data.name, ...);  // id = "" for new users
  }
  
  // Factory method for reconstructing from DB
  static reconstitute(data: {...}): User {
    return new User(data.id, data.name, ...);  // id from DB
  }
}
```

### 8.3 Dependency Injection

```typescript
// Instead of creating dependencies inside the class:
class BadService {
  userRepository = new MongoUserRepository();  // ❌ Hard to test
}

// Dependencies are injected via constructor:
class GoodService {
  constructor(private userRepository: IUserRepository) {}  // ✅ Easy to test
}

// Usage - dependencies are wired externally
const userRepo = new MongoUserRepository();
const service = new GoodService(userRepo);
```

---

## 9. FAQ

### Q: Why is there so many files? Can't we simplify?

**A:** This architecture is designed for **medium-large projects**. For small projects, you can use simpler patterns. This boilerplate follows "best practices" which may be overkill for simple apps.

### Q: What's the difference between `User.create()` and `User.reconstitute()`?

| Method | When to Use |
|--------|-------------|
| `User.create()` | Creating a NEW user (id starts as empty string) |
| `User.reconstitute()` | Loading an EXISTING user from database |

### Q: How do I test this code?

You can mock the repository:

```typescript
// Mock the repository
const mockUserRepository = {
  save: jest.fn().mockResolvedValue(user),
  findByEmail: jest.fn().mockResolvedValue(null)
};

// Pass mock to service
const service = new RegistrationService(mockUserRepository, ...);

// Test - no real DB call!
await service.signup(payload);
expect(mockUserRepository.save).toHaveBeenCalled();
```

### Q: Can I use a different database?

Yes! Just create a new repository:

```typescript
// To switch from MongoDB to PostgreSQL:
class PostgresUserRepository implements IUserRepository {
  // Implement same methods with PostgreSQL
}

// Service code stays the same!
```

### Q: What is the "this" keyword in User class methods?

`this` refers to the current instance:

```typescript
class User {
  name: string;
  
  verifyEmail() {
    this.isVerified = true;  // 'this' = the user instance
  }
}

const user = User.create({ name: "John" });
user.verifyEmail();  // Inside verifyEmail(), 'this' = user
```

---

## Quick Reference Card

| When you need to... | Go to this file |
|---------------------|-----------------|
| Add new API endpoint | `modules/Auth/presentation/routes/auth.route.ts` |
| Add business logic | `modules/Auth/application/services/` |
| Change database logic | `modules/Auth/infrastructure/persistence/repositories/` |
| Add user-related logic | `modules/Auth/domain/models/user.model.ts` |
| Change DB schema | `modules/Auth/infrastructure/persistence/mongoose/user.schema.ts` |

---

## Conclusion

This codebase uses **Clean Architecture** to keep your code:
- ✅ **Testable** - Each layer can be tested separately
- ✅ **Maintainable** - Clear separation of concerns
- ✅ **Flexible** - Easy to swap databases or frameworks
- ✅ **Scalable** - Grows well with your project

Remember: **Simpler is often better**. If your project doesn't need all these layers, feel free to simplify!

---

*Happy Coding! 🚀*