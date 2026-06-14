import { Model, Schema, model, Document } from 'mongoose';
import { IUser, IUserModel, UserRole } from './auth.interface';
import bcrypt from 'bcrypt';
import config from '../../config';
import { AUTH_CONFIG } from './auth.config';

// Define the schema with proper types and validation
const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
      index: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      match: [/^\+?[\d\s-]{10,}$/, 'Please enter a valid phone number'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false, // Don't include password in queries by default
      minlength: [AUTH_CONFIG.PASSWORD_MIN_LENGTH, `Password must be at least ${AUTH_CONFIG.PASSWORD_MIN_LENGTH} characters long`],
    },
    role: {
      type: String,
      enum: {
        values: Object.values(UserRole),
        message: '{VALUE} is not a valid role',
      },
      default: UserRole.CUSTOMER,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    lastFailedLogin: {
      type: Date,
      select: false,
    },
    accountLocked: {
      type: Boolean,
      default: false,
      select: false,
    },
    accountLockedUntil: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret: Partial<IUser & Document>) => {
        delete ret.password;
        delete ret.failedLoginAttempts;
        delete ret.lastFailedLogin;
        delete ret.accountLocked;
        delete ret.accountLockedUntil;
        return ret;
      },
    },
  }
);

// Indexes for better query performance
userSchema.index({ role: 1 });
userSchema.index({ isVerified: 1 });

// Middleware to hash password before saving (Mongoose 6+ async/await syntax)
userSchema.pre('save', async function () {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return;

  // Generate salt and hash password
  const salt = await bcrypt.genSalt(Number(config.bcrypt_salt_rounds));
  this.password = await bcrypt.hash(this.password, salt);
});

// Static method to find user by email
userSchema.statics.isUserExistsByEmail = async function (email: string): Promise<IUser | null> {
  return await this.findOne({ email }).select('+password');
};

// Static method to compare passwords
userSchema.statics.isPasswordMatched = async function (
  plainTextPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return await bcrypt.compare(plainTextPassword, hashedPassword);
};

// Instance method to check if user is locked
userSchema.methods.isAccountLocked = function(): boolean {
  return this.accountLocked && 
         this.accountLockedUntil && 
         this.accountLockedUntil > new Date();
};

// Instance method to increment failed login attempts
userSchema.methods.incrementFailedLoginAttempts = async function(): Promise<void> {
  this.failedLoginAttempts = (this.failedLoginAttempts || 0) + 1;
  this.lastFailedLogin = new Date();
  
  if (this.failedLoginAttempts >= AUTH_CONFIG.RATE_LIMIT.LOGIN.MAX_ATTEMPTS) {
    this.accountLocked = true;
    this.accountLockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  }
  
  await this.save();
};

// Instance method to reset failed login attempts
userSchema.methods.resetFailedLoginAttempts = async function(): Promise<void> {
  this.failedLoginAttempts = 0;
  this.accountLocked = false;
  this.accountLockedUntil = undefined;
  this.lastLogin = new Date();
  await this.save();
};

// Create and export the model
export const User = model<IUser, IUserModel>('User', userSchema);