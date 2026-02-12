
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';
import { AxiosError } from 'axios';
import { User } from '@/lib/types/models';
import { LoginCredentials, RegisterData } from '@/lib/types/api';
import { login, logout, register, refresh } from '@/lib/api/auth';
import apiClient from '@/lib/api/client';

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    login: (credentials: LoginCredentials) => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => void;
    checkAuth: () => Promise<void>;
    setUser: (user: User) => void;
    setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,

            login: async (credentials) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await login(credentials);
                    set({
                        user: response.user,
                        token: response.token,
                        isAuthenticated: true,
                        isLoading: false,
                    });
                    localStorage.setItem('auth_token', response.token);
                    Cookies.set('auth_token', response.token, { expires: 7 }); // 7 days
                    apiClient.defaults.headers.Authorization = `Bearer ${response.token}`;
                } catch (error) {
                    const err = error as AxiosError<{ message: string }>;
                    const errorMessage = err.response?.data?.message || 'Login failed';
                    set({
                        error: errorMessage,
                        isLoading: false,
                    });
                    throw err;
                }
            },

            register: async (data) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await register(data);
                    set({
                        user: response.user,
                        token: response.token,
                        isAuthenticated: true,
                        isLoading: false,
                    });
                    localStorage.setItem('auth_token', response.token);
                    Cookies.set('auth_token', response.token, { expires: 7 });
                    apiClient.defaults.headers.Authorization = `Bearer ${response.token}`;
                } catch (error) {
                    const err = error as AxiosError<{ message: string }>;
                    const errorMessage = err.response?.data?.message || 'Registration failed';
                    set({
                        error: errorMessage,
                        isLoading: false,
                    });
                    throw err;
                }
            },

            logout: async () => {
                try {
                    await logout();
                } catch (error) {
                    // Ignore logout errors
                    console.error('Logout error:', error);
                }
                localStorage.removeItem('auth_token');
                Cookies.remove('auth_token');
                delete apiClient.defaults.headers.Authorization;
                set({ user: null, token: null, isAuthenticated: false });
            },

            checkAuth: async () => {
                const token = localStorage.getItem('auth_token');
                if (!token) return;

                set({ isLoading: true });
                try {
                    const response = await refresh();
                    set({
                        user: response.user,
                        token: response.token,
                        isAuthenticated: true,
                        isLoading: false,
                    });
                    localStorage.setItem('auth_token', response.token);
                    Cookies.set('auth_token', response.token, { expires: 7 });
                    apiClient.defaults.headers.Authorization = `Bearer ${response.token}`;
                } catch (error) {
                    console.error('CheckAuth error:', error);
                    get().logout();
                    set({ isLoading: false });
                }
            },

            setUser: (user) => set({ user }),
            setToken: (token) => set({ token }),
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }),
        }
    )
);
