/**
 * UserProfile Domain Model
 */
export class UserProfile {
  constructor(
    public readonly id: string | null,
    public readonly authId: string,
    public firstName: string | null,
    public lastName: string | null,
    public bio: string | null,
    public avatarUrl: string | null,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}

  static create(data: {
    authId: string;
    firstName?: string | null;
    lastName?: string | null;
    bio?: string | null;
    avatarUrl?: string | null;
  }): UserProfile {
    return new UserProfile(
      null,
      data.authId,
      data.firstName || null,
      data.lastName || null,
      data.bio || null,
      data.avatarUrl || null,
    );
  }

  static reconstitute(data: {
    id: string;
    authId: string;
    firstName: string | null;
    lastName: string | null;
    bio: string | null;
    avatarUrl: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }): UserProfile {
    return new UserProfile(
      data.id,
      data.authId,
      data.firstName,
      data.lastName,
      data.bio,
      data.avatarUrl,
      data.createdAt,
      data.updatedAt,
    );
  }

  update(data: { firstName?: string; lastName?: string; bio?: string; avatarUrl?: string }) {
    if (data.firstName !== undefined) this.firstName = data.firstName;
    if (data.lastName !== undefined) this.lastName = data.lastName;
    if (data.bio !== undefined) this.bio = data.bio;
    if (data.avatarUrl !== undefined) this.avatarUrl = data.avatarUrl;
  }
}
