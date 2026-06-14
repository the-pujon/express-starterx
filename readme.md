# Express.js Backend Boilerplate Documentation

A production-ready Express.js backend boilerplate with TypeScript, featuring a modular architecture, comprehensive security features, and best practices implementation.

## 📋 Table of Contents
- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Core Features](#core-features)
- [Implementation Guidelines](#implementation-guidelines)
- [Security](#security)
- [Error Handling](#error-handling)
- [File Upload](#file-upload)
- [Caching](#caching)
- [Email System](#email-system)
- [Payment Integration](#payment-integration)
- [Development Guide](#development-guide)

## 🏗️ System Architecture

### Core Components
1. **Application Layer**
   - Express.js server setup
   - Middleware configuration
   - Route management
   - Error handling

2. **Service Layer**
   - Business logic implementation
   - External service integration
   - Data processing

3. **Data Layer**
   - MongoDB integration
   - Redis caching
   - File storage (Cloudinary)

### Directory Structure
```
src/
├── app/
│   ├── config/         # Environment and service configurations
│   ├── errors/         # Custom error handlers and classes
│   ├── helpers/        # Utility helper functions
│   ├── interface/      # TypeScript type definitions
│   ├── middlewares/    # Express middleware functions
│   ├── modules/        # Feature-based modules
│   ├── routes/         # API route definitions
│   ├── shared/         # Shared utilities and constants
│   └── utils/          # Common utility functions
├── templates/          # Email templates
├── app.ts             # Express app configuration
└── server.ts          # Server entry point
```

## ⚙️ Configuration

### Environment Variables
Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=4000
NODE_ENV=development

# Database
MONGODB_URI=your_mongodb_uri

# Authentication
BCRYPT_SALT_ROUNDS=12
JWT_ACCESS_SECRET=your_access_secret
JWT_ACCESS_EXPIRES_IN=1d
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d
JWT_PASSWORD_SECRET=your_password_secret
JWT_PASSWORD_EXPIRES_IN=1h

# Redis Configuration
REDIS_URL=your_redis_url
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_TTL=3600
REDIS_CACHE_KEY_PREFIX=app:
REDIS_TTL_ACCESS_TOKEN=3600
REDIS_TTL_REFRESH_TOKEN=604800

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email Configuration
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your_email
EMAIL_PASS=your_password

# Payment Gateway (SSLCommerz)
STORE_ID=your_store_id
STORE_PASSWD=your_store_password
IS_LIVE=false
```

## 🔧 Core Features

### 1. Authentication System
- JWT-based authentication
- Access and refresh token mechanism
- Password reset functionality
- Role-based access control

### 2. Error Handling
The boilerplate implements a robust error handling system:

```typescript
// Custom error class
class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;
}

// Error handlers for different scenarios
- handleCastError: MongoDB cast errors
- handleDuplicateError: Duplicate key errors
- handleValidationError: Validation errors
- handleZodError: Schema validation errors
- handleMulterErrors: File upload errors
```

### 3. File Upload System
- Cloudinary integration
- Multer middleware
- File type validation
- Size restrictions
- Automatic cleanup

### 4. Caching System
- Redis-based caching
- Token storage
- Query result caching
- Cache invalidation

### 5. Email System
- HTML email templates
- Nodemailer integration
- Templates for:
  - Email verification
  - Password reset

## 🛠️ Implementation Guidelines

### 1. Creating New Modules
```typescript
// 1. Create module structure
modules/
  └── YourModule/
      ├── controller.ts
      ├── service.ts
      ├── model.ts
      ├── validation.ts
      └── routes.ts

// 2. Implement controller
export const createItem = catchAsync(async (req: Request, res: Response) => {
  const result = await YourService.createItem(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    data: result
  });
});

// 3. Add routes
router.post('/', validateRequest(YourValidation.createSchema), createItem);
```

### 2. Using Middleware
```typescript
// Authentication middleware
router.use(auth());

// File upload middleware
router.post('/upload', 
  multerMiddleware.single('file'),
  uploadController
);

// Request validation
router.post('/create',
  validateRequest(validationSchema),
  controller
);
```

### 3. Error Handling
```typescript
try {
  // Your code
} catch (error) {
  throw new AppError('Error message', httpStatus.BAD_REQUEST);
}
```

### 4. File Upload
```typescript
// Configure multer
const upload = multer({
  storage: cloudinaryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Use in route
router.post('/upload', upload.single('file'), uploadController);
```

### 5. Caching Implementation
```typescript
// Cache data with TTL
await cacheData(
  'cache-key',
  { data: 'value' },
  3600 // TTL in seconds
);

// Retrieve cached data
const cachedData = await getCachedData('cache-key');

// Delete cached data by pattern
await deleteCachedData('pattern*');

// Clear all cached data
await clearAllCachedData();
```

The Redis caching system provides the following utilities:

1. **cacheData**
   - Caches data with a specified TTL (Time To Live)
   - Automatically serializes data to JSON
   - Handles errors gracefully with logging

2. **getCachedData**
   - Retrieves cached data by key
   - Automatically deserializes JSON data
   - Returns null if data doesn't exist or on error

3. **deleteCachedData**
   - Deletes cached data matching a pattern
   - Supports wildcard patterns
   - Handles multiple key deletion

4. **clearAllCachedData**
   - Clears all cached data from Redis
   - Useful for cache invalidation

Example usage in a service:
```typescript
// In your service file
const getData = async (id: string) => {
  // Try to get from cache first
  const cachedData = await getCachedData(`data:${id}`);
  if (cachedData) {
    return cachedData;
  }

  // If not in cache, get from database
  const data = await YourModel.findById(id);
  
  // Cache the result
  await cacheData(`data:${id}`, data, 3600); // Cache for 1 hour
  
  return data;
};
```

## 🔒 Security Features

### 1. Authentication
- JWT token-based authentication
- Refresh token rotation
- Token blacklisting
- Password hashing with bcrypt

### 2. Request Validation
- Zod schema validation
- Input sanitization
- Type checking

### 3. File Upload Security
- File type validation
- Size restrictions
- Secure storage
- Automatic cleanup

### 4. API Security
- CORS protection
- Rate limiting
- XSS protection
- SQL injection prevention

## 📧 Email System Implementation

### 1. Email Templates
Located in `templates/`:
- `verification-email.html`
- `reset-password-email.html`

### 2. Sending Emails
```typescript
await sendEmail({
  to: user.email,
  subject: 'Email Verification',
  html: verificationEmailTemplate
});
```

## 💳 Payment Integration

### SSLCommerz Integration
```typescript
const sslcommerz = new SSLCommerz(
  config.store_id,
  config.store_passwd,
  config.is_live === 'true'
);

// Create payment session
const paymentSession = await sslcommerz.initiatePayment({
  // payment details
});
```

## 🚀 Development Guide

### 1. Setup Development Environment
```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Start development server
npm run dev
```

### 2. Building for Production
```bash
npm run build
```

### 3. Docker Deployment
```bash
# Build and run with Docker
docker-compose up --build
```

## 📝 Best Practices

1. **Code Organization**
   - Follow modular architecture
   - Keep controllers thin
   - Implement proper separation of concerns

2. **Error Handling**
   - Use custom error classes
   - Implement proper error logging
   - Handle all possible error scenarios

3. **Security**
   - Validate all inputs
   - Implement proper authentication
   - Use environment variables
   - Follow security best practices

4. **Performance**
   - Implement caching where appropriate
   - Optimize database queries
   - Use proper indexing

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Redis Documentation](https://redis.io/documentation)
- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [SSLCommerz Documentation](https://developer.sslcommerz.com/)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

ISC License