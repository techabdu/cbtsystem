import axios from 'axios';
import { API_BASE_URL } from '@/lib/constants';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    timeout: 30000,
    withCredentials: true,
    withXSRFToken: true,
});

// Request interceptor — attach bearer token for offline exam sessions only
apiClient.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const offlineToken = sessionStorage.getItem('offline_exam_token');
        if (offlineToken) {
            config.headers.Authorization = `Bearer ${offlineToken}`;
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
