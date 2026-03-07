interface UserProfileResponse {
  id: string
  auth_id: string
  username: string
  email: string
  sleeper_username?: string | null
  sleeper_id?: string | null
}

interface UserSettingsResponse {
  sleeper_username?: string | null
}

interface UpdateSleeperProfileInput {
  sleeper_username: string
}

interface CreateUserProfileInput {
  authId: string
  email: string
  username: string
}

export interface IUserApi {
  getUserProfile(): Promise<UserProfileResponse>
  updateUserSleeperProfile(data: UpdateSleeperProfileInput): Promise<Response>
  addUserProfile(data: CreateUserProfileInput): Promise<Response>
  getUserSettings(): Promise<UserSettingsResponse>
}

export class UserApi implements IUserApi {
  public async getUserSettings(): Promise<UserSettingsResponse> {
    const response = await fetch('/api/settings', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    return response.json()
  }

  public async getUserProfile(): Promise<UserProfileResponse> {
    const response = await fetch('/api/user-profile', {
      cache: 'force-cache',
      method: 'GET',
      next: { revalidate: 300 },
      headers: {
        'Content-Type': 'application/json',
      },
    })
    return response.json()
  }

  public async updateUserSleeperProfile(data: UpdateSleeperProfileInput): Promise<Response> {
    const response = await fetch('/api/user-profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sleeper_username: data.sleeper_username,
      }),
    })
    return response
  }

  public async addUserProfile(data: CreateUserProfileInput): Promise<Response> {
    const response = await fetch('/api/user-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authId: data.authId,
        email: data.email,
        username: data.username,
      }),
    })
    return response
  }
}

export const userApi = new UserApi()
