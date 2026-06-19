'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AxiosError } from 'axios';
import { User } from '@/lib/types/models';
import { LoginCredentials, ActivateAccountData, UpdateProfileData } from '@/lib/types/api';
import * as authApi from '@/lib/api/auth';

function setCookie(name: string, value: string, days: number = 7) {
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; expires=${expires}; SameSite=Lax`;
}

function removeCookie(name: string) {
    document.cookie = `${name}=; path=/; max-age=0`;
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    isHydrated: boolean;
    login: (credentials: LoginCredentials) => Promise<void>;
    activateAccount: (data: ActivateAccountData) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
    updateProfile: (data: UpdateProfileData) => Promise<void>;
    clearError: () => void;
    setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            isHydrated: false,

            login: async (credentials) => {
                set({ isLoading: true, error: null });
                try {
                    const data = await authApi.login(credentials);

                    setCookie('auth_user_role', data.user.role);

                    set({
                        user: data.user,
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

            activateAccount: async (data) => {
                set({ isLoading: true, error: null });
                try {
                    const result = await authApi.activateAccount(data);

                    setCookie('auth_user_role', result.user.role);

                    set({
                        user: result.user,
                        isAuthenticated: true,
                        isLoading: false,
                    });
                } catch (error) {
                    const err = error as AxiosError<{ message: string; errors?: Record<string, string[]> }>;
                    const msg = err.response?.data?.message || 'Account activation failed.';
                    set({ error: msg, isLoading: false });
                    throw error;
                }
            },

            logout: async () => {
                try {
                    await authApi.logout();
                } catch (e) {
                    console.warn('Logout API error (ignored):', e);
                }

                removeCookie('auth_user_role');

                set({
                    user: null,
                    isAuthenticated: false,
                    error: null,
                });
            },

            checkAuth: async () => {
                set({ isLoading: true });
                try {
                    const data = await authApi.getCurrentUser();

                    setCookie('auth_user_role', data.user.role);

                    set({
                        user: data.user,
                        isAuthenticated: true,
                        isLoading: false,
                    });
                } catch {
                    removeCookie('auth_user_role');

                    set({
                        user: null,
                        isAuthenticated: false,
                        isLoading: false,
                    });
                }
            },

            updateProfile: async (data) => {
                set({ isLoading: true, error: null });
                try {
                    const result = await authApi.updateProfile(data);

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
                user: state.user,
                isAuthenticated: state.isAuthenticated,
            }),
            onRehydrateStorage: () => (state) => {
                state?.setHydrated();
            },
        }
    )
);
