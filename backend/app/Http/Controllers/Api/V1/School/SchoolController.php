<?php

namespace App\Http\Controllers\Api\V1\School;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\School\CreateSchoolRequest;
use App\Http\Requests\School\UpdateSchoolRequest;
use App\Http\Resources\SchoolResource;
use App\Services\School\SchoolService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SchoolController extends Controller
{
    public function __construct(
        private readonly SchoolService $schoolService,
    ) {}

    /* ------------------------------------------------------------------ */
    /*  List (paginated)                                                   */
    /* ------------------------------------------------------------------ */

    public function index(Request $request): JsonResponse
    {
        $schools = $this->schoolService->list($request->all());

        return ResponseHelper::paginated($schools, 'Schools retrieved', SchoolResource::class);
    }

    /* ------------------------------------------------------------------ */
    /*  All active (for dropdowns — no pagination)                         */
    /* ------------------------------------------------------------------ */

    public function allActive(): JsonResponse
    {
        $schools = $this->schoolService->allActive();

        return ResponseHelper::success([
            'schools' => SchoolResource::collection($schools),
        ], 'Active schools retrieved');
    }

    /* ------------------------------------------------------------------ */
    /*  Show                                                               */
    /* ------------------------------------------------------------------ */

    public function show(string $id): JsonResponse
    {
        $school = $this->schoolService->find($id);

        return ResponseHelper::success([
            'school' => new SchoolResource($school),
        ], 'School retrieved');
    }

    /* ------------------------------------------------------------------ */
    /*  Store                                                              */
    /* ------------------------------------------------------------------ */

    public function store(CreateSchoolRequest $request): JsonResponse
    {
        $school = $this->schoolService->create(
            $request->validated(),
            $request->user(),
        );

        return ResponseHelper::success([
            'school' => new SchoolResource($school),
        ], 'School created successfully', 201);
    }

    /* ------------------------------------------------------------------ */
    /*  Update                                                             */
    /* ------------------------------------------------------------------ */

    public function update(UpdateSchoolRequest $request, string $id): JsonResponse
    {
        $school = $this->schoolService->find($id);

        $school = $this->schoolService->update(
            $school,
            $request->validated(),
            $request->user(),
        );

        return ResponseHelper::success([
            'school' => new SchoolResource($school),
        ], 'School updated successfully');
    }

    /* ------------------------------------------------------------------ */
    /*  Delete                                                             */
    /* ------------------------------------------------------------------ */

    public function destroy(string $id): JsonResponse
    {
        $school = $this->schoolService->find($id);

        try {
            $this->schoolService->delete($school, auth()->user());
        } catch (\RuntimeException $e) {
            return ResponseHelper::error($e->getMessage(), 422);
        }

        return ResponseHelper::success(null, 'School deleted successfully');
    }

    /* ------------------------------------------------------------------ */
    /*  Restore                                                            */
    /* ------------------------------------------------------------------ */

    public function restore(Request $request, string $id): JsonResponse
    {
        $school = $this->schoolService->restore($id, $request->user());

        return ResponseHelper::success([
            'school' => new SchoolResource($school),
        ], 'School restored successfully');
    }
}
