import apiClient from './client';
import { LoginCredentials, ActivateAccountData, UpdateProfileData } from '../types/api';
import { User } from '../types/models';

/**
 * Backend responses are wrapped: { success, message, data: { user, token, ... } }
 * Axios puts that in response.data, so the actual payload is at response.data.data
 */

export interface AuthLoginResponse {
    user: User;
    token: string;
    expires_in: number;
}

export interface AuthMeResponse {
    user: User;
}

export const login = async (credentials: LoginCredentials): Promise<AuthLoginResponse> => {
    const response = await apiClient.post('/auth/login', credentials);
    // response.data = { success, message, data: { user, token, expires_in } }
    return response.data.data;
};

export const activateAccount = async (data: ActivateAccountData): Promise<AuthLoginResponse> => {
    const response = await apiClient.post('/auth/activate', data);
    // response.data = { success, message, data: { user, token, expires_in } }
    return response.data.data;
};

export const logout = async (): Promise<void> => {
    await apiClient.post('/auth/logout');
};

export const getCurrentUser = async (): Promise<AuthMeResponse> => {
    const response = await apiClient.get('/auth/me');
    // response.data = { success, data: { user } }
    return response.data.data;
};

export const refreshToken = async (): Promise<AuthLoginResponse> => {
    const response = await apiClient.post('/auth/refresh');
    // response.data = { success, data: { user, token, expires_in } }
    return response.data.data;
};

export const updateProfile = async (data: UpdateProfileData): Promise<AuthMeResponse> => {
    const response = await apiClient.put('/auth/profile', data);
    // response.data = { success, data: { user } }
    return response.data.data;
};
