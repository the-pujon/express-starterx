import { UserMongooseModel } from "../mongoose/user.schema";
import { toDomain, toDocumentData } from "../mappers/user.mapper";
import { IUserRepository } from "../../../domain/interfaces/user.repository.interface";
import { User } from "../../../domain/models/user.model";

/**
 * MongoUserRepository
 *
 * Mongoose implementation of IUserRepository.
 * Maps between Mongoose documents and pure User domain models.
 */
export class MongoUserRepository implements IUserRepository {
  private selectSecurityFields =
    "+password +failedLoginAttempts +lastFailedLogin +accountLocked +accountLockedUntil +tokenVersion";

  async findById(id: string): Promise<User | null> {
    const doc = await UserMongooseModel.findById(id).select(
      this.selectSecurityFields,
    );
    return doc ? toDomain(doc.toObject({ virtuals: false })) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const doc = await UserMongooseModel.findOne({ email }).select(
      this.selectSecurityFields,
    );
    return doc ? toDomain(doc.toObject({ virtuals: false })) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const doc = await UserMongooseModel.findOne({ username }).select(
      this.selectSecurityFields,
    );
    return doc ? toDomain(doc.toObject({ virtuals: false })) : null;
  }

  async findByProvider(
    provider: string,
    providerId: string,
  ): Promise<User | null> {
    const doc = await UserMongooseModel.findOne({
      provider,
      providerId,
    }).select(this.selectSecurityFields);
    return doc ? toDomain(doc.toObject({ virtuals: false })) : null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await UserMongooseModel.countDocuments({ email });
    return count > 0;
  }

  async existsByUsername(username: string): Promise<boolean> {
    const count = await UserMongooseModel.countDocuments({ username });
    return count > 0;
  }

  async save(user: User): Promise<User> {
    if (!user.id) {
      // CREATE: new document
      const docData = toDocumentData(user);
      const created = await UserMongooseModel.create(docData);
      return toDomain((created as any).toObject({ virtuals: false }));
    } else {
      // UPDATE: existing document
      const docData = toDocumentData(user);
      const updated = await UserMongooseModel.findByIdAndUpdate(
        user.id,
        { $set: docData },
        { new: true, select: this.selectSecurityFields },
      );
      if (!updated) throw new Error(`User ${user.id} not found for update`);
      return toDomain((updated as any).toObject({ virtuals: false }));
    }
  }

  async delete(id: string): Promise<User | null> {
    const doc = await UserMongooseModel.findByIdAndDelete(id).select(
      this.selectSecurityFields,
    );
    return doc ? toDomain(doc.toObject({ virtuals: false })) : null;
  }

  async findAll(filters: {
    limit?: number;
    page?: number;
    searchTerm?: string;
    role?: string;
    status?: string;
    isVerified?: boolean;
  }): Promise<{
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
    data: User[];
  }> {
    const {
      limit = 10,
      page = 1,
      searchTerm = "",
      role,
      status,
      isVerified,
    } = filters;
    const skip = (page - 1) * limit;

    const conditions: Record<string, unknown> = {};
    if (searchTerm) {
      conditions["$or"] = [
        { name: { $regex: searchTerm, $options: "i" } },
        { username: { $regex: searchTerm, $options: "i" } },
        { email: { $regex: searchTerm, $options: "i" } },
        { phone: { $regex: searchTerm, $options: "i" } },
      ];
    }
    if (role) conditions["role"] = role;
    if (status) conditions["status"] = status;
    if (typeof isVerified === "boolean") conditions["isVerified"] = isVerified;

    const [docs, total] = await Promise.all([
      UserMongooseModel.find(conditions)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      UserMongooseModel.countDocuments(conditions),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      data: docs.map((doc) => toDomain(doc.toObject({ virtuals: false }))),
    };
  }
}
