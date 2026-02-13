'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AxiosError } from 'axios';
import { User } from '@/lib/types/models';
import { LoginCredentials, RegisterData, UpdateProfileData } from '@/lib/types/api';
import * as authApi from '@/lib/api/auth';

/**
 * Set a cookie that middleware.ts can read.
 * We set both `auth_token` and `auth_user_role` so middleware
 * can enforce role-based route protection at the edge.
 */
function setCookie(name: string, value: string, days: number = 7) {
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; expires=${expires}; SameSite=Lax`;
}

function removeCookie(name: string) {
    document.cookie = `${name}=; path=/; max-age=0`;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    isHydrated: boolean;
    login: (credentials: LoginCredentials) => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
    updateProfile: (data: UpdateProfileData) => Promise<void>;
    clearError: () => void;
    setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            isHydrated: false,

            login: async (credentials) => {
                set({ isLoading: true, error: null });
                try {
                    const data = await authApi.login(credentials);

                    // Persist token + role for middleware
                    localStorage.setItem('auth_token', data.token);
                    setCookie('auth_token', data.token);
                    setCookie('auth_user_role', data.user.role);

                    set({
                        user: data.user,
                        token: data.token,
                        isAuthenticated: true,
                        isLoading: false,
                    });
                } catch (error) {
                    const err = error as AxiosError<{ message: string; errors?: Record<string, string[]> }>;
                    const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
                    set({ error: msg, isLoading: false });
                    throw error;
                }
            },

            register: async (data) => {
                set({ isLoading: true, error: null });
                try {
                    const result = await authApi.register(data);

                    // Persist token + role for middleware
                    localStorage.setItem('auth_token', result.token);
                    setCookie('auth_token', result.token);
                    setCookie('auth_user_role', result.user.role);

                    set({
                        user: result.user,
                        token: result.token,
                        isAuthenticated: true,
                        isLoading: false,
                    });
                } catch (error) {
                    const err = error as AxiosError<{ message: string; errors?: Record<string, string[]> }>;
                    const msg = err.response?.data?.message || 'Registration failed.';
                    set({ error: msg, isLoading: false });
                    throw error;
                }
            },

            logout: async () => {
                try {
                    await authApi.logout();
                } catch (e) {
                    // Ignore API errors during logout (e.g. expired token)
                    console.warn('Logout API error (ignored):', e);
                }

                // Clear everything
                localStorage.removeItem('auth_token');
                removeCookie('auth_token');
                removeCookie('auth_user_role');

                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    error: null,
                });
            },

            checkAuth: async () => {
                const token = localStorage.getItem('auth_token');
                if (!token) {
                    set({ isAuthenticated: false, user: null, token: null });
                    return;
                }

                set({ isLoading: true });
                try {
                    // Verify token is still valid by fetching current user
                    const data = await authApi.getCurrentUser();

                    // Update cookies in case they're stale
                    setCookie('auth_token', token);
                    setCookie('auth_user_role', data.user.role);

                    set({
                        user: data.user,
                        token,
                        isAuthenticated: true,
                        isLoading: false,
                    });
                } catch {
                    // Token invalid — clean up
                    localStorage.removeItem('auth_token');
                    removeCookie('auth_token');
                    removeCookie('auth_user_role');

                    set({
                        user: null,
                        token: null,
                        isAuthenticated: false,
                        isLoading: false,
                    });
                }
            },

            updateProfile: async (data) => {
                set({ isLoading: true, error: null });
                try {
                    const result = await authApi.updateProfile(data);

                    // Update cookies in case role-related data changed
                    setCookie('auth_user_role', result.user.role);

                    set({
                        user: result.user,
                        isLoading: false,
                    });
                } catch (error) {
                    const err = error as import('axios').AxiosError<{ message: string }>;
                    const msg = err.response?.data?.message || 'Profile update failed.';
                    set({ error: msg, isLoading: false });
                    throw error;
                }
            },

            clearError: () => set({ error: null }),

            setHydrated: () => set({ isHydrated: true }),
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                token: state.token,
                user: state.user,
                isAuthenticated: state.isAuthenticated,
            }),
            onRehydrateStorage: () => (state) => {
                state?.setHydrated();
            },
        }
    )
);
