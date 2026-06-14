import { UserProfile } from "../models/user-profile.model";

/**
 * IUserProfileRepository
 * Port interface for UserProfile persistence.
 */
export interface IUserProfileRepository {
  findByAuthId(authId: string): Promise<UserProfile | null>;
  save(profile: UserProfile): Promise<UserProfile>;
  deleteByAuthId(authId: string): Promise<void>;
}
