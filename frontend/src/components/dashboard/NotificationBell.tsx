'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { getUnreadCount, getNotifications, markNotificationAsRead } from '@/lib/api/notifications';
import type { Notification } from '@/lib/types/models';
import { Bell, Check, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

/* ------------------------------------------------------------------ */
/*  NotificationBell — Dropdown bell in the dashboard header            */
/* ------------------------------------------------------------------ */

export default function NotificationBell() {
    const [unread, setUnread] = useState(0);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [markingId, setMarkingId] = useState<number | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    /* Fetch unread count on mount and every 60 s */
    const refreshCount = useCallback(async () => {
        try {
            const res = await getUnreadCount();
            setUnread(res.data.count);
        } catch {
            // silently fail — non-critical
        }
    }, []);

    useEffect(() => {
        refreshCount();
        const interval = setInterval(refreshCount, 60_000);
        return () => clearInterval(interval);
    }, [refreshCount]);

    /* Close dropdown on outside click */
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    /* Load recent notifications when opening */
    const handleOpen = async () => {
        setOpen(prev => !prev);
        if (!open) {
            setLoading(true);
            try {
                const res = await getNotifications({ per_page: 8 });
                setNotifications(res.data);
            } catch {
                // silently fail
            } finally {
                setLoading(false);
            }
        }
    };

    const handleMarkRead = async (id: number) => {
        setMarkingId(id);
        try {
            await markNotificationAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnread(c => Math.max(0, c - 1));
        } catch {
            // silently fail
        } finally {
            setMarkingId(null);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell button */}
            <button
                onClick={handleOpen}
                aria-label="Notifications"
                className="relative flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent transition-colors"
            >
                <Bell className="h-5 w-5 text-muted-foreground" />
                {unread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground leading-none">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute right-0 top-full mt-2 w-80 z-50 rounded-lg border bg-popover text-popover-foreground shadow-lg overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                        <p className="text-sm font-semibold">Notifications</p>
                        {unread > 0 && (
                            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                {unread} unread
                            </span>
                        )}
                    </div>

                    {/* Notifications list */}
                    <div className="max-h-80 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="py-8 text-center">
                                <Bell className="mx-auto h-8 w-8 text-muted-foreground/40" />
                                <p className="mt-1.5 text-xs text-muted-foreground">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    className={`flex items-start gap-3 px-4 py-3 border-b last:border-0 hover:bg-accent/50 transition-colors ${!n.is_read ? 'bg-primary/5' : ''}`}
                                >
                                    <div className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${!n.is_read ? 'bg-primary' : 'bg-transparent'}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold leading-tight line-clamp-1">{n.title}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                                        {n.created_at && (
                                            <p className="text-[10px] text-muted-foreground mt-1">
                                                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                            </p>
                                        )}
                                    </div>
                                    {!n.is_read && (
                                        <button
                                            onClick={() => handleMarkRead(n.id)}
                                            disabled={markingId === n.id}
                                            title="Mark as read"
                                            className="shrink-0 mt-1 flex h-6 w-6 items-center justify-center rounded hover:bg-accent transition-colors"
                                        >
                                            {markingId === n.id
                                                ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                                : <Check className="h-3 w-3 text-muted-foreground" />
                                            }
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer link */}
                    <div className="border-t px-4 py-2.5">
                        <Link
                            href="/notifications"
                            onClick={() => setOpen(false)}
                            className="block text-center text-xs font-medium text-primary hover:underline"
                        >
                            View all notifications
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
