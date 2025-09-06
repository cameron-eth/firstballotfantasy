export interface IUserApi {
    getUserProfile(): Promise<any>;
    updateUserSleeperProfile(data: any): Promise<Response>;
    addUserProfile(data: any): Promise<Response>;
}

export class UserApi implements IUserApi {
    public async getUserProfile() {
        const response = await fetch('/api/user-profile', {
            cache: 'force-cache',
            method: 'GET',
             next: { revalidate: 300 },
            headers: {
                'Content-Type': 'application/json',
            }
        });
        return response.json();
    }

    public async updateUserSleeperProfile(data: any) {
        const response = await fetch('/api/user-profile', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: data.userId, 
                sleeper_username: data.sleeper_username
            }),
        });
        return response;
    }
    public async addUserProfile(data: any) {
        const response = await fetch('/api/user-profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                authId: data.user.id,
                email: data.user.email,
                username: data.username,
            }),
        });
        return response;
    }
}

export const userApi = new UserApi();