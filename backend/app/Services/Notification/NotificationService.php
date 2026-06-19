<?php

namespace App\Services\Notification;
use App\Exceptions\BusinessRuleException;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class NotificationService
{
    /* ------------------------------------------------------------------ */
    /*  List / Fetch                                                       */
    /* ------------------------------------------------------------------ */

    /**
     * Return paginated notifications for a user.
     *
     * @param  User   $user
     * @param  array  $filters  Supports: unread_only (bool), per_page (int)
     */
    public function listForUser(User $user, array $filters = []): LengthAwarePaginator
    {
        $query = Notification::forUser($user->id)->latest();

        if (! empty($filters['unread_only'])) {
            $query->unread();
        }

        $perPage = min((int) ($filters['per_page'] ?? 20), 100);

        return $query->paginate($perPage);
    }

    /**
     * Count unread notifications for a user.
     */
    public function unreadCount(User $user): int
    {
        return Notification::forUser($user->id)->unread()->count();
    }

    /* ------------------------------------------------------------------ */
    /*  Create                                                             */
    /* ------------------------------------------------------------------ */

    /**
     * Send an in-app (and optionally email) notification to a single user.
     *
     * @param  User    $recipient
     * @param  string  $type       e.g. 'exam_published', 'exam_review_requested'
     * @param  string  $title
     * @param  string  $message
     * @param  array   $options    related_entity_type, related_entity_id, sent_via
     */
    public function notify(
        User $recipient,
        string $type,
        string $title,
        string $message,
        array $options = []
    ): Notification {
        return Notification::create([
            'user_id'             => $recipient->id,
            'type'                => $type,
            'title'               => $title,
            'message'             => $message,
            'related_entity_type' => $options['related_entity_type'] ?? null,
            'related_entity_id'   => $options['related_entity_id'] ?? null,
            'sent_via'            => $options['sent_via'] ?? ['in_app'],
            'is_read'             => false,
        ]);
    }

    /**
     * Send a notification to multiple users.
     *
     * @param  iterable<User>  $recipients
     */
    public function notifyMany(
        iterable $recipients,
        string $type,
        string $title,
        string $message,
        array $options = []
    ): void {
        foreach ($recipients as $recipient) {
            $this->notify($recipient, $type, $title, $message, $options);
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Mark Read / Delete                                                 */
    /* ------------------------------------------------------------------ */

    /**
     * Mark a single notification as read (must belong to the user).
     */
    public function markAsRead(Notification $notification, User $user): Notification
    {
        if ($notification->user_id !== $user->id) {
            throw new BusinessRuleException('Notification does not belong to this user.');
        }

        $notification->markAsRead();

        return $notification->fresh();
    }

    /**
     * Mark all notifications as read for a user.
     */
    public function markAllAsRead(User $user): int
    {
        return Notification::where('user_id', $user->id)
            ->where('is_read', false)
            ->update(['is_read' => true, 'read_at' => now()]);
    }

    /**
     * Delete a notification (must belong to the user).
     */
    public function delete(Notification $notification, User $user): void
    {
        if ($notification->user_id !== $user->id && $user->role !== 'admin') {
            throw new BusinessRuleException('You do not have permission to delete this notification.');
        }

        $notification->delete();
    }
}
