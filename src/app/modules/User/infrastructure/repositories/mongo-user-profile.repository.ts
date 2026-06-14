import { Schema, model, Document } from "mongoose";
import { UserProfile } from "../../domain/models/user-profile.model";
import { IUserProfileRepository } from "../../domain/interfaces/user-profile.repository.interface";

// ================================
// Mongoose Document & Model
// ================================

interface IUserProfileDocument extends Document {
  authId: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userProfileSchema = new Schema<IUserProfileDocument>(
  {
    authId: { type: String, required: true, unique: true, index: true },
    firstName: { type: String, trim: true, maxlength: 50 },
    lastName: { type: String, trim: true, maxlength: 50 },
    bio: { type: String, maxlength: 500 },
    avatarUrl: { type: String },
  },
  {
    timestamps: true,
  },
);

export const UserProfileMongooseModel = model<IUserProfileDocument>(
  "UserProfile",
  userProfileSchema,
);

// ================================
// Domain ↔ Mongoose Mapping
// ================================

function toDomain(doc: IUserProfileDocument): UserProfile {
  return UserProfile.reconstitute({
    id: doc._id.toString(),
    authId: doc.authId,
    firstName: doc.firstName || null,
    lastName: doc.lastName || null,
    bio: doc.bio || null,
    avatarUrl: doc.avatarUrl || null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });
}

function toDocumentData(profile: UserProfile): Partial<IUserProfileDocument> {
  return {
    authId: profile.authId,
    firstName: profile.firstName || undefined,
    lastName: profile.lastName || undefined,
    bio: profile.bio || undefined,
    avatarUrl: profile.avatarUrl || undefined,
  };
}

// ================================
// Repository Implementation
// ================================

/**
 * MongoUserProfileRepository
 *
 * Mongoose implementation of IUserProfileRepository.
 */
export class MongoUserProfileRepository implements IUserProfileRepository {
  async findByAuthId(authId: string): Promise<UserProfile | null> {
    const doc = await UserProfileMongooseModel.findOne({ authId });
    return doc ? toDomain(doc) : null;
  }

  async save(profile: UserProfile): Promise<UserProfile> {
    const docData = toDocumentData(profile);
    const updated = await UserProfileMongooseModel.findOneAndUpdate(
      { authId: profile.authId },
      { $set: docData },
      { new: true, upsert: true },
    );
    return toDomain(updated);
  }

  async deleteByAuthId(authId: string): Promise<void> {
    await UserProfileMongooseModel.deleteOne({ authId });
  }
}
