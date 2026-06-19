<?php

namespace App\Http\Controllers\Api\V1\Notification;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Services\Notification\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function __construct(
        private NotificationService $notificationService
    ) {}

    /* ------------------------------------------------------------------ */
    /*  Index — Paginated notification list for authenticated user         */
    /* ------------------------------------------------------------------ */

    public function index(Request $request): JsonResponse
    {
        $filters = $request->only(['unread_only', 'per_page']);

        $paginator = $this->notificationService->listForUser($request->user(), $filters);

        return ResponseHelper::paginated($paginator, 'Notifications retrieved successfully');
    }

    /* ------------------------------------------------------------------ */
    /*  Unread Count                                                       */
    /* ------------------------------------------------------------------ */

    public function unreadCount(Request $request): JsonResponse
    {
        $count = $this->notificationService->unreadCount($request->user());

        return ResponseHelper::success(['count' => $count], 'Unread count retrieved');
    }

    /* ------------------------------------------------------------------ */
    /*  Mark Single as Read                                                */
    /* ------------------------------------------------------------------ */

    public function markAsRead(int $id, Request $request): JsonResponse
    {
        $notification = Notification::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->first();

        if (! $notification) {
            return ResponseHelper::error('Notification not found.', 404);
        }

        try {
            $updated = $this->notificationService->markAsRead($notification, $request->user());
        } catch (\RuntimeException $e) {
            return ResponseHelper::error($e->getMessage(), 403);
        }

        return ResponseHelper::success($updated, 'Notification marked as read');
    }

    /* ------------------------------------------------------------------ */
    /*  Mark All as Read                                                   */
    /* ------------------------------------------------------------------ */

    public function markAllAsRead(Request $request): JsonResponse
    {
        $updated = $this->notificationService->markAllAsRead($request->user());

        return ResponseHelper::success(
            ['updated' => $updated],
            'All notifications marked as read'
        );
    }

    /* ------------------------------------------------------------------ */
    /*  Delete                                                             */
    /* ------------------------------------------------------------------ */

    public function destroy(int $id, Request $request): JsonResponse
    {
        $notification = Notification::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->first();

        if (! $notification) {
            return ResponseHelper::error('Notification not found.', 404);
        }

        try {
            $this->notificationService->delete($notification, $request->user());
        } catch (\RuntimeException $e) {
            return ResponseHelper::error($e->getMessage(), 403);
        }

        return ResponseHelper::success(null, 'Notification deleted');
    }
}
