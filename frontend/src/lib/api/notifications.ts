import apiClient from './client';
import { ApiResponse, PaginatedResponse } from '@/lib/types/api';
import { Notification } from '@/lib/types/models';

/* ------------------------------------------------------------------ */
/*  Notifications API                                                    */
/* ------------------------------------------------------------------ */

/**
 * Get paginated notifications for the authenticated user.
 */
export async function getNotifications(filters?: {
    unread_only?: boolean;
    per_page?: number;
    page?: number;
}): Promise<PaginatedResponse<Notification>> {
    const params = new URLSearchParams();
    if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined) params.append(key, String(value));
        });
    }
    const response = await apiClient.get<PaginatedResponse<Notification>>(
        `/notifications?${params.toString()}`
    );
    return response.data;
}

/**
 * Get the count of unread notifications.
 */
export async function getUnreadCount(): Promise<ApiResponse<{ count: number }>> {
    const response = await apiClient.get<ApiResponse<{ count: number }>>(
        '/notifications/unread-count'
    );
    return response.data;
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationAsRead(id: number): Promise<ApiResponse<Notification>> {
    const response = await apiClient.patch<ApiResponse<Notification>>(
        `/notifications/${id}/read`
    );
    return response.data;
}

/**
 * Mark all notifications as read.
 */
export async function markAllNotificationsAsRead(): Promise<ApiResponse<{ updated: number }>> {
    const response = await apiClient.patch<ApiResponse<{ updated: number }>>(
        '/notifications/read-all'
    );
    return response.data;
}

/**
 * Delete a notification.
 */
export async function deleteNotification(id: number): Promise<ApiResponse<null>> {
    const response = await apiClient.delete<ApiResponse<null>>(`/notifications/${id}`);
    return response.data;
}
