<?php

namespace App\Http\Controllers\Api\V1\Level;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Level\CreateLevelRequest;
use App\Http\Requests\Level\UpdateLevelRequest;
use App\Http\Resources\LevelResource;
use App\Services\Level\LevelService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LevelController extends Controller
{
    public function __construct(
        private readonly LevelService $levelService,
    ) {}

    /* ------------------------------------------------------------------ */
    /*  List (paginated)                                                  */
    /* ------------------------------------------------------------------ */

    public function index(Request $request): JsonResponse
    {
        $levels = $this->levelService->list($request->all());

        return ResponseHelper::paginated($levels, 'Levels retrieved', LevelResource::class);
    }

    /* ------------------------------------------------------------------ */
    /*  All active (for dropdowns — no pagination)                        */
    /* ------------------------------------------------------------------ */

    public function allActive(): JsonResponse
    {
        $levels = $this->levelService->allActive();

        return ResponseHelper::success([
            'levels' => LevelResource::collection($levels),
        ], 'Active levels retrieved');
    }

    /* ------------------------------------------------------------------ */
    /*  Show                                                              */
    /* ------------------------------------------------------------------ */

    public function show(int $id): JsonResponse
    {
        $level = $this->levelService->find($id);

        return ResponseHelper::success([
            'level' => new LevelResource($level),
        ], 'Level retrieved');
    }

    /* ------------------------------------------------------------------ */
    /*  Store                                                             */
    /* ------------------------------------------------------------------ */

    public function store(CreateLevelRequest $request): JsonResponse
    {
        $level = $this->levelService->create(
            $request->validated(),
            $request->user(),
        );

        return ResponseHelper::success([
            'level' => new LevelResource($level),
        ], 'Level created successfully', 201);
    }

    /* ------------------------------------------------------------------ */
    /*  Update                                                            */
    /* ------------------------------------------------------------------ */

    public function update(UpdateLevelRequest $request, int $id): JsonResponse
    {
        $level = $this->levelService->find($id);

        $level = $this->levelService->update(
            $level,
            $request->validated(),
            $request->user(),
        );

        return ResponseHelper::success([
            'level' => new LevelResource($level),
        ], 'Level updated successfully');
    }

    /* ------------------------------------------------------------------ */
    /*  Delete                                                            */
    /* ------------------------------------------------------------------ */

    public function destroy(int $id): JsonResponse
    {
        $level = $this->levelService->find($id);

        try {
            $this->levelService->delete($level, auth()->user());
        } catch (\RuntimeException $e) {
            return ResponseHelper::error($e->getMessage(), 422);
        }

        return ResponseHelper::success(null, 'Level deleted successfully');
    }

    /* ------------------------------------------------------------------ */
    /*  Restore                                                           */
    /* ------------------------------------------------------------------ */

    public function restore(Request $request, int $id): JsonResponse
    {
        $level = $this->levelService->restore($id, $request->user());

        return ResponseHelper::success([
            'level' => new LevelResource($level),
        ], 'Level restored successfully');
    }
}
