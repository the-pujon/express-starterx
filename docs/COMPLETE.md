# 🚀 Complete Developer Guide - Modular Express MongoDB Starter

> The ultimate beginner-friendly documentation for understanding this Clean Architecture project.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Technology Stack](#2-technology-stack)
3. [Architecture Overview](#3-architecture-overview)
4. [Understanding the Request Flow](#4-understanding-the-request-flow)
5. [Deep Dive: Each Layer Explained](#5-deep-dive-each-layer-explained)
6. [Key Concepts in Detail](#6-key-concepts-in-detail)
7. [Design Patterns Used](#7-design-patterns-used)
8. [SOLID Principles](#8-solid-principles)
9. [Folder Structure Explained](#9-folder-structure-explained)
10. [Code Examples & Walkthroughs](#10-code-examples--walkthroughs)
11. [How to Add New Features](#11-how-to-add-new-features)
12. [Testing](#12-testing)
13. [Running the Project](#13-running-the-project)
14. [Common Questions (FAQ)](#14-common-questions-faq)
15. [Quick Reference](#15-quick-reference)

---

## 1. Introduction

### What is this Project?

This is a **production-ready Node.js/Express REST API starter** built with **Clean Architecture** principles. It's designed to help developers build scalable, maintainable, and testable applications.

### Why Clean Architecture?

Traditional Express apps often become messy as they grow:
- Business logic mixed with HTTP handling
- Database code scattered everywhere
- Hard to test individual parts
- Difficult to change databases

Clean Architecture solves these problems by **separating concerns** into distinct layers.

### Who is this for?

- **Beginners** who want to learn clean code practices
- **Junior Developers** who want to understand architecture
- **Senior Developers** who need a quick reference
- **Teams** building medium-to-large applications

---

## 2. Technology Stack

### Core Technologies

| Technology | Purpose | Version |
|------------|---------|----------|
| **Node.js** | JavaScript runtime | Latest |
| **Express** | Web framework | ^5.2.1 |
| **MongoDB** | Database | Latest |
| **Mongoose** | MongoDB ODM | ^9.0.0 |
| **TypeScript** | Type safety | ^5.9.3 |

### Supporting Libraries

| Library | Purpose |
|---------|---------|
| **bcrypt** | Password hashing |
| **jsonwebtoken** | JWT token handling |
| **nodemailer** | Email sending |
| **cloudinary** | File/image upload |
| **express-rate-limit** | Rate limiting |
| **cors** | Cross-origin requests |
| **mongoose** | MongoDB object modeling |
| **jest** | Testing framework |

---

## 3. Architecture Overview

### The Four Layers

Clean Architecture divides the application into four distinct layers:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                                  │
│                     (HTTP Requests & Responses)                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                         │
│  │   Routes    │  │ Controllers │  │ Validation │                        │
│  └─────────────┘  └─────────────┘  └─────────────┘                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         APPLICATION LAYER                                  │
│                      (Business Use Cases)                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                      Services (Use Cases)                            │  │
│  │  • RegistrationService  • AuthenticationService  • TokenService      │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DOMAIN LAYER                                      │
│                    (Business Rules & Entities)                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Models    │  │ Interfaces  │  │ Exceptions │  │   Config    │        │
│  │  (User)     │  │ (Repository)│  │  (Errors)  │  │  (Auth)     │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        INFRASTRUCTURE LAYER                                 │
│                    (External Dependencies)                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │ Repositories│  │   Mappers   │  │   Schemas   │  │  Adapters   │       │
│  │  (MongoDB)  │  │ (Converter) │  │ (Mongoose) │  │ (External)  │       │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Principle: Dependency Rule

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   INNER LAYERS (Domain) ─────────────► OUTER LAYERS (Infrastructure)      │
│                                                                             │
│   Domain NEVER imports from Infrastructure                                  │
│   Infrastructure CAN import from Domain                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**What does this mean?**
- The Domain layer (business logic) knows nothing about databases, HTTP, or external services
- Only the Infrastructure layer deals with MongoDB, Redis, email services, etc.
- This makes the business logic **pure** and **testable**

---

## 4. Understanding the Request Flow

### Complete Flow: User Registration

Let's trace what happens when a user signs up for an account:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: USER SENDS REQUEST                                                  │
└─────────────────────────────────────────────────────────────────────────────┘

POST /auth/signup
Content-Type: application/json

{
  "name": "John Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "password": "SecurePass123!"
}

                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 2: EXPRESS ROUTER (auth.route.ts)                                     │
└─────────────────────────────────────────────────────────────────────────────┘

The router receives the request and passes it to the controller.

BUT FIRST - let's see how things are wired up (Composition Root):

// In auth.route.ts - Composition Root
const userRepository = new MongoUserRepository();           // Create DB repo
const emailHistoryRepo = new MongoEmailHistoryRepository(); // Create email repo
const registrationService = new RegistrationService(        // Wire up service
  userRepository,
  emailHistoryRepo
);
const authController = new AuthController(registrationService); // Wire controller

// Route definition
router.post("/signup", authController.signup);

                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 3: CONTROLLER (auth.controller.ts)                                    │
└─────────────────────────────────────────────────────────────────────────────┘

The controller's job is simple:
1. Extract data from request
2. Call the appropriate service
3. Return response

async signup(req, res) {
  const payload = req.body;  // Get data from request
  
  const result = await this.registrationService.signup(payload);
  
  // Return success response
  res.status(201).json({
    success: true,
    message: "Registration successful",
    data: result.user
  });
}

                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 4: SERVICE (registration.service.ts) - BUSINESS LOGIC                 │
└─────────────────────────────────────────────────────────────────────────────┘

This is where the magic happens! The service contains all business logic:

async signup(payload, meta?) {
  // 1. Rate limit check
  await checkRateLimit(`signup:${email}`, 3, 60 * 60 * 1000);
  
  // 2. Validate password strength
  if (!validatePassword(password)) {
    throw new WeakPasswordException();
  }
  
  // 3. Check if email already exists
  const existingByEmail = await this.userRepository.existsByEmail(email);
  if (existingByEmail) {
    throw new UserAlreadyExistsException("Email");
  }
  
  // 4. Check if username already exists
  const existingByUsername = await this.userRepository.existsByUsername(username);
  if (existingByUsername) {
    throw new UserAlreadyExistsException("Username");
  }
  
  // 5. Create new user (using User model)
  const newUser = User.create({
    name: payload.name,
    username,
    email,
    phone: payload.phone,
    password,  // Will be hashed by Mongoose pre-save hook
    role: UserRole.CUSTOMER,
    status: UserStatus.ACTIVE,
    provider: "local",
    isVerified: false,
  });
  
  // 6. Save to database
  const savedUser = await this.userRepository.save(newUser);
  
  // 7. Generate verification code
  const verificationCode = generateVerificationCode();
  
  // 8. Cache verification data (Redis)
  await cacheData(`verification:${email}`, verificationData, 600);
  
  // 9. Emit domain event
  globalEventEmitter.emit(DomainEventType.USER_REGISTERED, {...});
  
  // 10. Send verification email (async)
  setImmediate(() => {
    sendEmail({ to: email, subject: "Verify Email", html: ... });
  });
  
  return { user: savedUser };
}

                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 5: REPOSITORY (mongo-user.repository.ts) - DATABASE OPERATIONS        │
└─────────────────────────────────────────────────────────────────────────────┘

The repository handles all database operations:

async save(user: User): Promise<User> {
  if (!user.id) {
    // CREATE: New user - insert into database
    const docData = toDocumentData(user);  // Convert User → plain object
    const created = await UserMongooseModel.create(docData);
    return toDomain(created);  // Convert back to User
  } else {
    // UPDATE: Existing user - update in database
    const docData = toDocumentData(user);
    const updated = await UserMongooseModel.findByIdAndUpdate(
      user.id,
      { $set: docData },
      { new: true }
    );
    return toDomain(updated);
  }
}

                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 6: MAPPER (user.mapper.ts) - DATA CONVERSION                           │
└─────────────────────────────────────────────────────────────────────────────┘

The mapper converts between User class and MongoDB document:

// Convert User class → MongoDB document (for saving)
toDocumentData(user: User): Partial<IUserDocument> {
  return {
    name: user.name,
    username: user.username,
    email: user.email,
    password: user.getPassword(),  // Getter for private field
    role: user.role,
    status: user.status,
    // ... other fields
  };
}

// Convert MongoDB document → User class (for using)
toDomain(doc: IUserDocument): User {
  return User.reconstitute({
    id: doc._id.toString(),
    name: doc.name,
    username: doc.username,
    email: doc.email,
    // ... other fields
  });
}

                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 7: MONGOOSE SCHEMA (user.schema.ts) - DATABASE DEFINITION             │
└─────────────────────────────────────────────────────────────────────────────┘

The schema defines the document structure in MongoDB:

const userSchema = new Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
    minlength: [2, "Name must be at least 2 characters"],
    maxlength: [50, "Name cannot exceed 50 characters"]
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    select: false  // Don't return password by default
  },
  role: {
    type: String,
    enum: ["superAdmin", "admin", "moderator", "customer", "seller"],
    default: "customer"
  },
  // ... more fields
});

// Pre-save hook to hash password
userSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 8: MONGODB - DATABASE                                                 │
└─────────────────────────────────────────────────────────────────────────────┘

The data is stored in MongoDB as a document:

{
  "_id": "507f1f77bcf86cd799439011",
  "name": "John Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "password": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqKx8pX7LK",  // Hashed
  "role": "customer",
  "status": "active",
  "isVerified": false,
  "provider": "local",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}

                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 9: RESPONSE BACK TO USER                                              │
└─────────────────────────────────────────────────────────────────────────────┘

HTTP/1.1 201 Created
Content-Type: application/json

{
  "success": true,
  "message": "Registration successful",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "username": "johndoe",
    "email": "john@example.com",
    "role": "customer",
    "status": "active",
    "isVerified": false
  }
}
```

---

## 5. Deep Dive: Each Layer Explained

### 5.1 Domain Layer (The Core)

The Domain layer contains **business rules** - it knows nothing about databases, HTTP, or any external framework.

#### What's in the Domain Layer?

```
domain/
├── models/           # Business entities
│   └── user.model.ts
├── interfaces/        # Contracts (ports)
│   └── user.repository.interface.ts
├── exceptions/       # Business errors
│   └── auth.exceptions.ts
└── config/           # Configuration
    └── auth.config.ts
```

#### The User Model

The User model is a **pure TypeScript class** with no dependencies on external frameworks:

```typescript
// filepath: domain/models/user.model.ts

export class User {
  // Constructor with many fields
  constructor(
    public readonly id: string,
    public name: string,
    public username: string,
    public email: string,
    public phone: string,
    private password: string,  // Private - can't access directly!
    public role: UserRole,
    public status: UserStatus,
    public lastLogin: Date,
    public isVerified: boolean,
    // ... more fields
  ) {}

  // Factory method for creating NEW users
  static create(data: {...}): User {
    return new User(
      "",  // id is empty for new users
      data.name,
      // ... set defaults
    );
  }

  // Factory method for RECONSTITUTING from DB
  static reconstitute(data: {...}): User {
    return new User(
      data.id,  // id from database
      data.name,
      // ...
    );
  }

  // Business methods
  verifyEmail(): void {
    this.isVerified = true;
  }

  isLocked(): boolean {
    if (!this.accountLocked) return false;
    return new Date() < this.accountLockedUntil;
  }

  canLogin(): { canLogin: boolean; reason?: string } {
    if (this.isLocked()) return { canLogin: false, reason: "Account locked" };
    if (!this.isVerified) return { canLogin: false, reason: "Email not verified" };
    return { canLogin: true };
  }
}
```

**Key Points:**
- All fields are defined in the constructor
- Private fields (like `password`) can't be accessed directly
- Business logic is encapsulated in methods
- Factory methods (`create`, `reconstitute`) handle object creation

#### Enums (Constants)

```typescript
// User roles
export enum UserRole {
  SUPER_ADMIN = "superAdmin",
  ADMIN = "admin",
  MODERATOR = "moderator",
  CUSTOMER = "customer",
  SELLER = "seller",
}

// User status
export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
  BLOCKED = "blocked",
  DELETED = "deleted",
}
```

#### Repository Interface (Port)

```typescript
// filepath: domain/interfaces/user.repository.interface.ts

// This is a PORT - it defines WHAT the repository must do
// The actual implementation is in Infrastructure layer

export interface IUserRepository {
  // Find methods
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  
  // Check existence
  existsByEmail(email: string): Promise<boolean>;
  existsByUsername(username: string): Promise<boolean>;
  
  // CRUD operations
  save(user: User): Promise<User>;
  delete(id: string): Promise<User | null>;
  
  // Query with filters
  findAll(filters: {...}): Promise<{ meta: {...}, data: User[] }>;
}
```

**Why an interface?**
- Defines a contract (what methods must exist)
- Allows swapping implementations (MongoDB → PostgreSQL)
- Makes testing easy (mock the interface)

#### Exceptions (Business Errors)

```typescript
// filepath: domain/exceptions/auth.exceptions.ts

export class UserAlreadyExistsException extends Error {
  constructor(field: string) {
    super(`${field} already exists`);
    this.name = "UserAlreadyExistsException";
  }
}

export class WeakPasswordException extends Error {
  constructor() {
    super("Password does not meet requirements");
    this.name = "WeakPasswordException";
  }
}

export class UserNotFoundException extends Error {
  constructor(email?: string) {
    super(email ? `User with email ${email} not found` : "User not found");
    this.name = "UserNotFoundException";
  }
}
```

---

### 5.2 Application Layer (Use Cases)

The Application layer contains **services** that orchestrate the business logic.

#### What's in the Application Layer?

```
application/
├── services/
│   ├── registration.service.ts      # Signup flow
│   ├── authentication.service.ts   # Login flow
│   ├── email-verification.service.ts
│   ├── password-reset.service.ts
│   ├── token.service.ts
│   └── ...
└── utils/
    └── auth.utils.ts
```

#### Service Structure

```typescript
// filepath: application/services/registration.service.ts

export class RegistrationService {
  // Dependencies are injected via constructor
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly emailHistoryRepository: IEmailHistoryRepository,
  ) {}

  // Each public method is a "use case"
  async signup(payload: {...}, meta?: IRequestMeta): Promise<{ user: User }> {
    // Business logic here
  }

  async verifyEmail(email: string, code: string): Promise<{ user: User }> {
    // Business logic here
  }

  async resendVerifyEmailCode(email: string): Promise<void> {
    // Business logic here
  }
}
```

**Key Points:**
- Each service handles one area (registration, authentication, etc.)
- Dependencies are injected via constructor (Dependency Injection)
- No database code - uses repository interface
- Contains business rules and workflows

---

### 5.3 Infrastructure Layer (External Dependencies)

The Infrastructure layer handles all **technical details**: databases, external services, etc.

#### What's in the Infrastructure Layer?

```
infrastructure/
├── persistence/
│   ├── repositories/
│   │   └── mongo-user.repository.ts      # MongoDB implementation
│   ├── mappers/
│   │   └── user.mapper.ts                # Data conversion
│   └── mongoose/
│       └── user.schema.ts                # Mongoose schema
└── adapters/
    └── ...
```

#### Repository Implementation

```typescript
// filepath: infrastructure/persistence/repositories/mongo-user.repository.ts

export class MongoUserRepository implements IUserRepository {
  // Implements the interface from Domain layer
  
  async findByEmail(email: string): Promise<User | null> {
    const doc = await UserMongooseModel.findOne({ email });
    return doc ? toDomain(doc) : null;
  }

  async save(user: User): Promise<User> {
    if (!user.id) {
      // Create new
      const docData = toDocumentData(user);
      const created = await UserMongooseModel.create(docData);
      return toDomain(created);
    } else {
      // Update existing
      const docData = toDocumentData(user);
      const updated = await UserMongooseModel.findByIdAndUpdate(
        user.id,
        { $set: docData },
        { new: true }
      );
      return toDomain(updated);
    }
  }

  // ... implement all interface methods
}
```

**Key Points:**
- Implements the interface from Domain layer
- Contains all database-specific code
- Uses Mongoose for MongoDB operations
- Uses mappers to convert between layers

#### Mappers (Data Converters)

```typescript
// filepath: infrastructure/persistence/mappers/user.mapper.ts

// Convert User class → MongoDB document
export function toDocumentData(user: User): Partial<IUserDocument> {
  return {
    name: user.name,
    username: user.username,
    email: user.email,
    password: user.getPassword(),  // Use getter for private field
    role: user.role,
    status: user.status,
    // ...
  };
}

// Convert MongoDB document → User class
export function toDomain(doc: IUserDocument & { _id?: any }): User {
  return User.reconstitute({
    id: doc._id?.toString() || "",
    name: doc.name,
    username: doc.username,
    email: doc.email,
    // ...
  });
}
```

#### Mongoose Schema

```typescript
// filepath: infrastructure/persistence/mongoose/user.schema.ts

export interface IUserDocument {
  _id?: string;
  name: string;
  username: string;
  email: string;
  password: string;
  role: string;
  status: string;
  // ... more fields
}

const userSchema = new Schema<IUserDocument>({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  role: {
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.CUSTOMER,
  },
  // ... more fields
});

// Pre-save hook for password hashing
userSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

export const UserMongooseModel = model<IUserDocument>("User", userSchema);
```

---

### 5.4 Presentation Layer (HTTP)

The Presentation layer handles **HTTP requests and responses**.

#### What's in the Presentation Layer?

```
presentation/
├── controllers/
│   └── auth.controller.ts
├── routes/
│   └── auth.route.ts
└── validation/
    └── auth.validation.ts
```

#### Route (Composition Root)

```typescript
// filepath: presentation/routes/auth.route.ts

const router = express.Router();

// ==========================================
// COMPOSITION ROOT - Where dependencies are wired
// ==========================================

// Create repository instances
const userRepository = new MongoUserRepository();
const emailHistoryRepository = new MongoEmailHistoryRepository();
const loginHistoryRepository = new MongoLoginHistoryRepository();
const sessionRepository = new RedisAuthSessionRepository();

// Create services with injected dependencies
const registrationService = new RegistrationService(
  userRepository,
  emailHistoryRepository,
);

const authenticationService = new AuthenticationService(
  userRepository,
  sessionRepository,
  loginHistoryRepository,
  tokenService,
);

// Create controller with injected services
const authController = new AuthController(
  registrationService,
  authenticationService,
  // ... other services
);

// Define routes
router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/verify-email", authController.verifyEmail);
router.post("/forgot-password", authController.forgotPassword);

export default router;
```

#### Controller

```typescript
// filepath: presentation/controllers/auth.controller.ts

export class AuthController {
  constructor(
    private readonly registrationService: RegistrationService,
    private readonly authenticationService: AuthenticationService,
    // ... other services
  ) {}

  async signup(req: Request, res: Response) {
    try {
      const payload = req.body;
      
      const result = await this.registrationService.signup(payload);
      
      sendSuccessResponse(res, 201, {
        message: "Registration successful",
        data: result.user,
      });
    } catch (error) {
      handleError(error, res);
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      
      const result = await this.authenticationService.login(
        email,
        password,
        getRequestMeta(req)
      );
      
      sendSuccessResponse(res, 200, result);
    } catch (error) {
      handleError(error, res);
    }
  }
}
```

---

<!-- ## 6. Key Concepts in Detail

### 6.1 Why Use a Class for User?

**Question:** Why not just use a plain object like `{ name: "John", email: "..." }`?

**Answer:** The class provides several benefits:

| Benefit | Plain Object | Class |
|---------|--------------|-------|
| **Encapsulation** | ❌ All fields public | ✅ Can have private fields |
| **Business Logic** | ❌ Scattered everywhere | ✅ Methods in one place |
| **Defaults** | ❌ Must set manually | ✅ Factory sets defaults |
| **Validation** | ❌ None | ✅ Can validate in constructor |
| **Type Safety** | ⚠️ Partial | ✅ Full type safety |

**Example:**

```typescript
// Using plain object (simpler but less organized)
const user = { name: "John", email: "john@...", isVerified: false };
// Anyone can do: user.isVerified = true; (no validation)

// Using class (more organized)
const user = User.create({ name: "John", email: "john@" });
user.verifyEmail();  // Business logic encapsulated
// Can't do: user.isVerified = true; (it's private!)
```

### 6.2 Understanding `this` in Methods

When you call a method on an object, `this` refers to that object:

```typescript
class User {
  name: string;
  
  // 'this' refers to the instance the method is called on
  greet() {
    return `Hello, ${this.name}!`;
  }
}

const user = new User();
user.name = "John";

user.greet();  // Inside greet(), 'this' = user
// Returns: "Hello, John!"
```

### 6.3 Static vs Instance Methods

```typescript
class User {
  // STATIC - called on the CLASS, no instance needed
  static create(data: {...}): User {
    return new User(...);
  }

  // INSTANCE - called on an INSTANCE, needs object
  verifyEmail(): void {
    this.isVerified = true;
  }
}

// Usage
const newUser = User.create({...});  // Static - no instance needed
newUser.verifyEmail();               // Instance - needs instance
```

### 6.4 What is Composition Root?

The Composition Root is where all dependencies are wired together:

```typescript
// This is the Composition Root (in auth.route.ts)

// 1. Create repositories
const userRepository = new MongoUserRepository();
const emailRepo = new MongoEmailHistoryRepository();

// 2. Create services with dependencies
const registrationService = new RegistrationService(
  userRepository,  // Inject repository
  emailRepo        // Inject repository
);

// 3. Create controller with services
const authController = new AuthController(
  registrationService  // Inject service
);

// 4. Connect to routes
router.post("/signup", authController.signup);
```

### 6.5 Why Separate Layers?

**Without Clean Architecture:**
```
Route → Controller → Database Query
```
Problems:
- Can't test business logic without DB
- Hard to change databases
- Business logic mixed with HTTP code

**With Clean Architecture:**
```
Route → Controller → Service → Repository → Database
```
Benefits:
- Each layer can be tested independently
- Easy to swap databases
- Business logic is pure and testable

--- -->

## 7. Design Patterns Used

### 7.1 Repository Pattern

**Purpose:** Separate data access from business logic

```typescript
// Interface (contract)
interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<User>;
}

// Implementation
class MongoUserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<User | null> {
    // MongoDB-specific code
  }
}
```

### 7.2 Factory Pattern

**Purpose:** Centralize object creation

```typescript
class User {
  private constructor(...) {}  // Can't use 'new User()' directly
  
  static create(data: {...}): User {
    // Create new user with defaults
    return new User("", data.name, ...);
  }
  
  static reconstitute(data: {...}): User {
    // Reconstruct from database
    return new User(data.id, data.name, ...);
  }
}
```

### 7.3 Dependency Injection

**Purpose:** Pass dependencies from outside

```typescript
// BAD: Creates dependency inside
class BadService {
  userRepo = new MongoUserRepository();  // Hard to test
}

// GOOD: Injects dependency via constructor
class GoodService {
  constructor(private userRepo: IUserRepository) {}  // Easy to test
}
```

### 7.4 Mapper/Adapter Pattern

**Purpose:** Convert between different representations

```typescript
// User class → MongoDB document
toDocumentData(user: User): Partial<IUserDocument> {
  return { name: user.name, email: user.email, ... };
}

// MongoDB document → User class
toDomain(doc: IUserDocument): User {
  return User.reconstitute({ name: doc.name, email: doc.email, ... });
}
```

---

## 8. SOLID Principles

This codebase follows SOLID principles:

### S - Single Responsibility
Each class has one job:
- `User` model → User data and logic
- `RegistrationService` → Registration flow
- `MongoUserRepository` → Database operations

### O - Open/Closed
Open for extension, closed for modification:
- Add new methods to `User` without changing existing code
- Add new repositories without changing services

### L - Liskov Substitution
Any implementation can replace another:
- `MongoUserRepository` ↔ `PostgresUserRepository` (both implement `IUserRepository`)
- Service code doesn't change

### I - Interface Segregation
Small, focused interfaces:
- `IUserRepository` defines clear contract
- Clients only depend on methods they need

### D - Dependency Inversion
Depend on abstractions, not concretions:
- Service depends on `IUserRepository` (interface)
- Route passes `MongoUserRepository` (concrete)

---

## 9. Folder Structure Explained

```
src/
├── app/
│   ├── modules/
│   │   ├── Auth/
│   │   │   ├── application/        # Use cases (services)
│   │   │   │   └── services/
│   │   │   │       ├── registration.service.ts
│   │   │   │       ├── authentication.service.ts
│   │   │   │       ├── token.service.ts
│   │   │   │       └── ...
│   │   │   ├── domain/            # Business logic (pure TypeScript)
│   │   │   │   ├── models/
│   │   │   │   │   └── user.model.ts
│   │   │   │   ├── interfaces/
│   │   │   │   │   └── user.repository.interface.ts
│   │   │   │   ├── exceptions/
│   │   │   │   │   └── auth.exceptions.ts
│   │   │   │   └── config/
│   │   │   │       └── auth.config.ts
│   │   │   ├── infrastructure/   # Technical implementations
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
│   │   │       │   └── auth.controller.ts
│   │   │       ├── routes/
│   │   │       │   └── auth.route.ts
│   │   │       └── validation/
│   │   │           └── auth.validation.ts
│   │   ├── User/                  # Same structure as Auth
│   │   └── ActivityLog/           # Same structure as Auth
│   ├── middlewares/               # Express middlewares
│   │   ├── auth.ts
│   │   ├── globalErrorhandler.ts
│   │   ├── validateRequest.ts
│   │   └── ...
│   ├── shared/                    # Shared utilities
│   │   ├── events/
│   │   │   ├── event-emitter.ts
│   │   │   └── event.types.ts
│   │   └── pick.ts
│   └── utils/                     # Helper functions
│       ├── sendResponse.ts
│       ├── sendEmail.ts
│       ├── cloudinary.ts
│       └── ...
├── server.ts                     # Entry point
└── app.ts                       # Express app setup
```

### Layer Responsibilities

| Layer | Folder | Responsibility | Knows About |
|-------|--------|----------------|--------------|
| **Presentation** | `presentation/` | HTTP requests/responses | Express, Request, Response |
| **Application** | `application/` | Use cases, business flow | Domain interfaces |
| **Domain** | `domain/` | Business rules, entities | Pure TypeScript only! |
| **Infrastructure** | `infrastructure/` | DB, external services | MongoDB, Mongoose, Redis |

---

## 10. Code Examples & Walkthroughs

### Example 1: Creating a New User

```typescript
// Step 1: Create user using factory method
const newUser = User.create({
  name: "John Doe",
  username: "johndoe",
  email: "john@example.com",
  phone: "+1234567890",
  password: "SecurePass123!",
  // These get defaults:
  // role: UserRole.CUSTOMER
  // status: UserStatus.ACTIVE
  // provider: "local"
  // isVerified: false
});

console.log(newUser.name);        // "John Doe"
console.log(newUser.isVerified);  // false (default)

// Step 2: Call business method
newUser.verifyEmail();
console.log(newUser.isVerified);  // true

// Step 3: Get data for saving
const docData = toDocumentData(newUser);
// { name: "John Doe", email: "john@example.com", ... }
```

### Example 2: Finding a User

```typescript
// In service
async findUserByEmail(email: string) {
  // Call repository (which calls DB)
  const user = await this.userRepository.findByEmail(email);
  
  if (!user) {
    throw new UserNotFoundException(email);
  }
  
  // Use business methods
  const { canLogin, reason } = user.canLogin();
  if (!canLogin) {
    throw new Error(reason);
  }
  
  return user;
}
```

### Example 3: Adding a New Service

```typescript
// Step 1: Create the service file
// filepath: application/services/password-reset.service.ts

import { IUserRepository } from "../../domain/interfaces/user.repository.interface";

export class PasswordResetService {
  constructor(
    private readonly userRepository: IUserRepository,
  ) {}

  async requestReset(email: string) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return;
    }
    
    // Generate reset token
    const token = generateToken();
    
    // Cache it
    await cacheData(`reset:${email}`, token, 3600);
    
    // Send email
    await sendEmail(email, "Reset your password", ...);
  }

  async resetPassword(email: string, token: string, newPassword: string) {
    // Verify token
    const cachedToken = await getCachedData(`reset:${email}`);
    if (cachedToken !== token) {
      throw new Error("Invalid token");
    }
    
    // Find user
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new UserNotFoundException();
    }
    
    // Update password
    user.updatePassword(newPassword);
    await this.userRepository.save(user);
    
    // Clear cache
    await deleteCachedData(`reset:${email}`);
  }
}
```

---

## 11. How to Add New Features

### Step-by-Step: Adding "Change Password" Feature

#### Step 1: Add Repository Method (if needed)

```typescript
// In domain/interfaces/user.repository.interface.ts
export interface IUserRepository {
  // ... existing methods
  findById(id: string): Promise<User | null>;
}
```

#### Step 2: Implement in Repository

```typescript
// In infrastructure/persistence/repositories/mongo-user.repository.ts

async findById(id: string): Promise<User | null> {
  const doc = await UserMongooseModel.findById(id);
  return doc ? toDomain(doc) : null;
}
```

#### Step 3: Create Service

```typescript
// filepath: application/services/change-password.service.ts

import { IUserRepository } from "../../domain/interfaces/user.repository.interface";

export class ChangePasswordService {
  constructor(private userRepository: IUserRepository) {}

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ) {
    // 1. Find user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundException();
    }

    // 2. Verify current password
    const isValid = await user.verifyPassword(currentPassword);
    if (!isValid) {
      throw new Error("Current password is incorrect");
    }

    // 3. Update password
    user.updatePassword(newPassword);
    await this.userRepository.save(user);

    // 4. Revoke all tokens (security)
    user.revokeAllTokens();
    await this.userRepository.save(user);
  }
}
```

#### Step 4: Wire in Route

```typescript
// In presentation/routes/auth.route.ts

import { ChangePasswordService } from "../../application/services/change-password.service";

// In Composition Root
const changePasswordService = new ChangePasswordService(userRepository);

// Add to controller
const authController = new AuthController(
  registrationService,
  authenticationService,
  changePasswordService,  // Add new service
);

// Add route
router.post("/change-password", authMiddleware, authController.changePassword);
```

#### Step 5: Add Controller Method

```typescript
// In presentation/controllers/auth.controller.ts

async changePassword(req: Request, res: Response) {
  const userId = req.user.id;  // From auth middleware
  const { currentPassword, newPassword } = req.body;

  await this.changePasswordService.changePassword(
    userId,
    currentPassword,
    newPassword
  );

  sendSuccessResponse(res, 200, { message: "Password changed successfully" });
}
```

---

## 12. Testing

### Unit Testing a Service

```typescript
// filepath: __tests__/modules/Auth/registration.service.test.ts

import { RegistrationService } from "../../src/app/modules/Auth/application/services/registration.service";

// Mock the repositories
const mockUserRepository = {
  existsByEmail: jest.fn().mockResolvedValue(false),
  existsByUsername: jest.fn().mockResolvedValue(false),
  save: jest.fn().mockImplementation((user) => Promise.resolve(user)),
};

const mockEmailHistoryRepository = {
  create: jest.fn().mockResolvedValue({}),
  updateStatus: jest.fn().mockResolvedValue({}),
};

describe("RegistrationService", () => {
  let service: RegistrationService;

  beforeEach(() => {
    service = new RegistrationService(
      mockUserRepository,
      mockEmailHistoryRepository
    );
  });

  describe("signup", () => {
    it("should create a new user", async () => {
      const payload = {
        name: "John Doe",
        username: "johndoe",
        email: "john@example.com",
        phone: "+1234567890",
        password: "SecurePass123!",
      };

      const result = await service.signup(payload);

      expect(mockUserRepository.existsByEmail).toHaveBeenCalledWith("john@example.com");
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(result.user).toBeDefined();
    });

    it("should throw error if email exists", async () => {
      mockUserRepository.existsByEmail.mockResolvedValue(true);

      const payload = {
        name: "John Doe",
        username: "johndoe",
        email: "existing@example.com",
        phone: "+1234567890",
        password: "SecurePass123!",
      };

      await expect(service.signup(payload)).rejects.toThrow("Email already exists");
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

---

## 13. Running the Project

### Prerequisites

- Node.js (latest)
- MongoDB (local or Atlas)
- Redis (optional, for sessions)

### Installation

```bash
# Install dependencies
npm install
```

### Environment Variables

Create a `.env` file:

```env
# Server
PORT=3000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/myapp

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d

# Email (for sending verification emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Redis (optional)
REDIS_URL=redis://localhost:6379
```

### Running the App

```bash
# Development (with hot reload)
npm run dev

# Production
npm run build
npm start

# With Docker
npm run docker:up
npm run docker:build
```

### API Endpoints

```
POST /auth/signup              - Register new user
POST /auth/login               - Login
POST /auth/verify-email        - Verify email
POST /auth/resend-verification - Resend verification code
POST /auth/forgot-password     - Request password reset
POST /auth/reset-password      - Reset password

GET  /users                   - Get all users (protected)
GET  /users/:id               - Get user by ID (protected)
PATCH /users/:id              - Update user (protected)
DELETE /users/:id             - Delete user (protected)
```

---

## 14. Common Questions (FAQ)

### Q1: Why so many files? Can't we simplify?

**A:** This architecture is for **medium-large projects**. For small projects (just a few endpoints), you can use simpler patterns. This boilerplate follows "best practices" which may be overkill for simple apps.

---

### Q2: What's the difference between `User.create()` and `User.reconstitute()`?

| Method | When to Use |
|--------|-------------|
| `User.create()` | Creating a NEW user (id starts as empty string) |
| `User.reconstitute()` | Loading an EXISTING user from database |

---

### Q3: How do I test without a database?

**A:** Use mocks! The repository interface allows you to mock the database:

```typescript
const mockRepo = {
  save: jest.fn().mockResolvedValue(user),
  findByEmail: jest.fn().mockResolvedValue(null)
};

const service = new RegistrationService(mockRepo, ...);
// No real DB calls!
```

---

### Q4: Can I use a different database?

**A:** Yes! Just create a new repository:

```typescript
// To switch from MongoDB to PostgreSQL:
class PostgresUserRepository implements IUserRepository {
  // Implement same methods with PostgreSQL
}

// Service code stays the same!
```

---

### Q5: What is the "this" keyword?

**A:** `this` refers to the current instance:

```typescript
class User {
  name: string;
  
  greet() {
    return "Hello, " + this.name;  // 'this' = the user instance
  }
}

const user = new User();
user.name = "John";
user.greet();  // Returns: "Hello, John"
```

---

### Q6: Why use interfaces?

**A:** Interfaces provide:
- A contract (what methods must exist)
- Flexibility (swap implementations)
- Testability (mock easily)

---

### Q7: What is Dependency Injection?

**A:** Instead of creating dependencies inside a class, they're passed in from outside:

```typescript
// Without DI (bad)
class Service {
  repo = new MongoUserRepository();  // Hard to test
}

// With DI (good)
class Service {
  constructor(private repo: IUserRepository) {}  // Easy to test
}
```

---

### Q8: Why separate layers?

**A:** Separation allows:
- Testing each layer independently
- Changing databases without changing business logic
- Keeping business logic pure and simple

---

## 15. Quick Reference

### When you need to...

| Task | Go to |
|------|-------|
| Add new API endpoint | `modules/Auth/presentation/routes/auth.route.ts` |
| Add business logic | `modules/Auth/application/services/` |
| Change database logic | `modules/Auth/infrastructure/persistence/repositories/` |
| Add user-related logic | `modules/Auth/domain/models/user.model.ts` |
| Change DB schema | `modules/Auth/infrastructure/persistence/mongoose/user.schema.ts` |
| Add validation | `modules/Auth/presentation/validation/` |
| Handle errors | `app/errors/` |
| Add configuration | `modules/Auth/domain/config/auth.config.ts` |

### File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Service | `{name}.service.ts` | `registration.service.ts` |
| Controller | `{name}.controller.ts` | `auth.controller.ts` |
| Route | `{name}.route.ts` | `auth.route.ts` |
| Repository | `mongo-{name}.repository.ts` | `mongo-user.repository.ts` |
| Model | `{name}.model.ts` | `user.model.ts` |
| Schema | `{name}.schema.ts` | `user.schema.ts` |
| Interface | `{name}.repository.interface.ts` | `user.repository.interface.ts` |

### Common Patterns

```typescript
// Creating a new user
const user = User.create({ name: "John", email: "john@..." });

// Loading from database
const user = await repo.findByEmail("john@...");
const user = User.reconstitute({ id: "123", name: "John", ... });

// Calling business methods
user.verifyEmail();
user.updatePassword("newpass");
const { canLogin, reason } = user.canLogin();

// Saving to database
await repo.save(user);

// Converting for API response
const dto = user.toDTO();
```

---

## Conclusion

This codebase uses **Clean Architecture** to keep your code:

- ✅ **Testable** - Each layer can be tested separately
- ✅ **Maintainable** - Clear separation of concerns
- ✅ **Flexible** - Easy to swap databases or frameworks
- ✅ **Scalable** - Grows well with your project

**Remember:** Simpler is often better. If your project doesn't need all these layers, feel free to simplify!

---

## Quick Start Commands

```bash
# Install
npm install

# Run
npm run dev

# Test
npm test

# Build
npm run build
```

---

*Happy Coding! 🚀*

---

**Document Version:** 1.0  
**Last Updated:** 2026-06-14  
**Author:** Generated from codebase analysis