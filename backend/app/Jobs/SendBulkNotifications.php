<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\Notification\NotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Dispatch bulk notifications to a list of user IDs.
 *
 * Usage:
 *   SendBulkNotifications::dispatch(
 *       userIds: [1, 2, 3],
 *       type:    'exam_published',
 *       title:   'Exam Published',
 *       message: 'Your exam is now available.',
 *       options: ['related_entity_type' => 'exam', 'related_entity_id' => 12],
 *   );
 */
class SendBulkNotifications implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 30;

    public function __construct(
        private array $userIds,
        private string $type,
        private string $title,
        private string $message,
        private array $options = [],
    ) {}

    public function handle(NotificationService $notificationService): void
    {
        $users = User::whereIn('id', $this->userIds)
            ->where('is_active', true)
            ->get();

        $notificationService->notifyMany(
            $users,
            $this->type,
            $this->title,
            $this->message,
            $this->options
        );
    }
}
