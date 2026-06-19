import axios from 'axios';
import apiClient from './client';
import { BACKEND_URL } from '../constants';
import { LoginCredentials, ActivateAccountData, UpdateProfileData } from '../types/api';
import { User } from '../types/models';

export interface AuthLoginResponse {
    user: User;
    token: string;
    expires_in: number;
}

export interface AuthMeResponse {
    user: User;
}

export const initCsrf = async (): Promise<void> => {
    await axios.get(`${BACKEND_URL}/sanctum/csrf-cookie`, { withCredentials: true });
};

export const login = async (credentials: LoginCredentials): Promise<AuthLoginResponse> => {
    await initCsrf();
    const response = await apiClient.post('/auth/login', credentials);
    return response.data.data;
};

export const activateAccount = async (data: ActivateAccountData): Promise<AuthLoginResponse> => {
    await initCsrf();
    const response = await apiClient.post('/auth/activate', data);
    return response.data.data;
};

export const logout = async (): Promise<void> => {
    await apiClient.post('/auth/logout');
};

export const getCurrentUser = async (): Promise<AuthMeResponse> => {
    const response = await apiClient.get('/auth/me');
    return response.data.data;
};

export const refreshToken = async (): Promise<AuthLoginResponse> => {
    const response = await apiClient.post('/auth/refresh');
    return response.data.data;
};

export const updateProfile = async (data: UpdateProfileData): Promise<AuthMeResponse> => {
    const response = await apiClient.put('/auth/profile', data);
    return response.data.data;
};
