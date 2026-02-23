'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
} from '@/lib/api/notifications';
import type { Notification } from '@/lib/types/models';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Loader2,
    AlertCircle,
    Bell,
    CheckCheck,
    Trash2,
    Check,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [unreadOnly, setUnreadOnly] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [markingId, setMarkingId] = useState<number | null>(null);
    const [isMarkingAll, setIsMarkingAll] = useState(false);

    const fetchNotifications = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const res = await getNotifications({ unread_only: unreadOnly, per_page: 50 });
            setNotifications(res.data);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            setError(e.response?.data?.message || 'Failed to load notifications.');
        } finally {
            setIsLoading(false);
        }
    }, [unreadOnly]);

    useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

    const handleMarkRead = async (id: number) => {
        setMarkingId(id);
        try {
            await markNotificationAsRead(id);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: true } : n)
            );
        } catch (err) {
            console.error('Failed to mark as read:', err);
        } finally {
            setMarkingId(null);
        }
    };

    const handleMarkAllRead = async () => {
        setIsMarkingAll(true);
        try {
            await markAllNotificationsAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (err) {
            console.error('Failed to mark all read:', err);
        } finally {
            setIsMarkingAll(false);
        }
    };

    const handleDelete = async (id: number) => {
        setDeletingId(id);
        try {
            await deleteNotification(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (err) {
            console.error('Failed to delete notification:', err);
        } finally {
            setDeletingId(null);
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
                    <p className="text-muted-foreground">
                        {unreadCount > 0
                            ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}.`
                            : 'All caught up!'}
                    </p>
                </div>
                {unreadCount > 0 && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleMarkAllRead}
                        disabled={isMarkingAll}
                        className="gap-2 shrink-0"
                    >
                        {isMarkingAll
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <CheckCheck className="h-4 w-4" />
                        }
                        Mark all read
                    </Button>
                )}
            </div>

            {/* Filter toggle */}
            <div className="flex space-x-1 rounded-lg bg-muted p-1 w-fit">
                {([false, true] as const).map(val => (
                    <button
                        key={String(val)}
                        onClick={() => setUnreadOnly(val)}
                        className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${unreadOnly === val
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-background/50'
                            }`}
                    >
                        {val ? 'Unread' : 'All'}
                    </button>
                ))}
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {/* Loading */}
            {isLoading ? (
                <div className="flex min-h-[30vh] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : notifications.length === 0 ? (
                <Card>
                    <CardContent className="py-16 text-center">
                        <Bell className="mx-auto h-10 w-10 text-muted-foreground/40" />
                        <p className="mt-2 text-sm font-medium text-muted-foreground">
                            {unreadOnly ? 'No unread notifications' : 'No notifications yet'}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-2">
                    {notifications.map(notification => (
                        <Card
                            key={notification.id}
                            className={`shadow-sm transition-colors ${!notification.is_read
                                ? 'border-primary/30 bg-primary/5 dark:bg-primary/10'
                                : ''
                                }`}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                    {/* Unread dot */}
                                    <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${!notification.is_read ? 'bg-primary' : 'bg-transparent'}`} />

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="text-sm font-semibold leading-tight">{notification.title}</p>
                                                <p className="text-sm text-muted-foreground mt-0.5">{notification.message}</p>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                {!notification.is_read && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleMarkRead(notification.id)}
                                                        disabled={markingId === notification.id}
                                                        title="Mark as read"
                                                        className="h-7 w-7"
                                                    >
                                                        {markingId === notification.id
                                                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                            : <Check className="h-3.5 w-3.5" />
                                                        }
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(notification.id)}
                                                    disabled={deletingId === notification.id}
                                                    title="Delete"
                                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                >
                                                    {deletingId === notification.id
                                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        : <Trash2 className="h-3.5 w-3.5" />
                                                    }
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1.5">
                                            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                                {notification.type.replace(/_/g, ' ')}
                                            </span>
                                            {notification.created_at && (
                                                <span className="text-[10px] text-muted-foreground">
                                                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
