import { User } from "../models/user.model";

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findByProvider(provider: string, providerId: string): Promise<User | null>;
  existsByEmail(email: string): Promise<boolean>;
  existsByUsername(username: string): Promise<boolean>;
  save(user: User): Promise<User>;
  delete(id: string): Promise<User | null>;
  findAll(filters: {
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
  }>;
}
