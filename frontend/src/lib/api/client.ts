import axios from 'axios';
import { API_BASE_URL } from '@/lib/constants';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    timeout: 30000,
});

// Request interceptor — attach Bearer token from localStorage
apiClient.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// Response interceptor — handle global errors
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (typeof window !== 'undefined') {
            const status = error.response?.status;

            if (status === 401) {
                // Clear auth state and redirect to login
                localStorage.removeItem('auth_token');
                localStorage.removeItem('auth_user_role');
                document.cookie = 'auth_token=; path=/; max-age=0';
                document.cookie = 'auth_user_role=; path=/; max-age=0';

                if (!window.location.pathname.startsWith('/login')) {
                    window.location.href = '/login';
                }
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;
