import { IUserProfileRepository } from "../../domain/interfaces/user-profile.repository.interface";
import { IUserRepository } from "../../../Auth/domain/interfaces/user.repository.interface";
import { UserProfile } from "../../domain/models/user-profile.model";
import { UserNotFoundException } from "../../../Auth/domain/exceptions/auth.exceptions";

/**
 * UserProfileService
 * Handles user profile retrieval and updates.
 */
export class UserProfileService {
  constructor(
    private readonly userProfileRepository: IUserProfileRepository,
    private readonly userRepository: IUserRepository,
  ) {}

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundException(userId);
    }
    return this.userProfileRepository.findByAuthId(userId);
  }

  async updateProfile(
    userId: string,
    data: { firstName?: string; lastName?: string; bio?: string; avatarUrl?: string },
  ): Promise<UserProfile> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundException(userId);
    }

    let profile = await this.userProfileRepository.findByAuthId(userId);
    if (!profile) {
      profile = UserProfile.create({ authId: userId });
    }

    profile.update(data);
    return this.userProfileRepository.save(profile);
  }
}
