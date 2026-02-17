<?php

namespace App\Http\Controllers\Api\V1\Combination;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Combination\CreateCombinationRequest;
use App\Http\Requests\Combination\UpdateCombinationRequest;
use App\Http\Resources\CombinationResource;
use App\Services\Combination\CombinationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CombinationController extends Controller
{
    public function __construct(
        private readonly CombinationService $combinationService,
    ) {}

    /* ------------------------------------------------------------------ */
    /*  List (paginated)                                                  */
    /* ------------------------------------------------------------------ */

    public function index(Request $request): JsonResponse
    {
        $combinations = $this->combinationService->list($request->all());

        return ResponseHelper::paginated($combinations, 'Combinations retrieved', CombinationResource::class);
    }

    /* ------------------------------------------------------------------ */
    /*  All active (for dropdowns — no pagination)                        */
    /* ------------------------------------------------------------------ */

    public function allActive(): JsonResponse
    {
        $combinations = $this->combinationService->allActive();

        return ResponseHelper::success([
            'combinations' => CombinationResource::collection($combinations),
        ], 'Active combinations retrieved');
    }

    /* ------------------------------------------------------------------ */
    /*  Show                                                              */
    /* ------------------------------------------------------------------ */

    public function show(int $id): JsonResponse
    {
        $combination = $this->combinationService->find($id);

        return ResponseHelper::success([
            'combination' => new CombinationResource($combination),
        ], 'Combination retrieved');
    }

    /* ------------------------------------------------------------------ */
    /*  Store                                                             */
    /* ------------------------------------------------------------------ */

    public function store(CreateCombinationRequest $request): JsonResponse
    {
        $combination = $this->combinationService->create(
            $request->validated(),
            $request->user(),
        );

        return ResponseHelper::success([
            'combination' => new CombinationResource($combination),
        ], 'Combination created successfully', 201);
    }

    /* ------------------------------------------------------------------ */
    /*  Update                                                            */
    /* ------------------------------------------------------------------ */

    public function update(UpdateCombinationRequest $request, int $id): JsonResponse
    {
        $combination = $this->combinationService->find($id);

        $combination = $this->combinationService->update(
            $combination,
            $request->validated(),
            $request->user(),
        );

        return ResponseHelper::success([
            'combination' => new CombinationResource($combination),
        ], 'Combination updated successfully');
    }

    /* ------------------------------------------------------------------ */
    /*  Delete                                                            */
    /* ------------------------------------------------------------------ */

    public function destroy(int $id): JsonResponse
    {
        $combination = $this->combinationService->find($id);

        try {
            $this->combinationService->delete($combination, auth()->user());
        } catch (\RuntimeException $e) {
            return ResponseHelper::error($e->getMessage(), 422);
        }

        return ResponseHelper::success(null, 'Combination deleted successfully');
    }

    /* ------------------------------------------------------------------ */
    /*  Restore                                                           */
    /* ------------------------------------------------------------------ */

    public function restore(Request $request, int $id): JsonResponse
    {
        $combination = $this->combinationService->restore($id, $request->user());

        return ResponseHelper::success([
            'combination' => new CombinationResource($combination),
        ], 'Combination restored successfully');
    }
}
