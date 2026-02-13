<?php

namespace App\Http\Controllers\Api\V1\Department;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Department\CreateDepartmentRequest;
use App\Http\Requests\Department\UpdateDepartmentRequest;
use App\Http\Resources\DepartmentResource;
use App\Services\Department\DepartmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DepartmentController extends Controller
{
    public function __construct(
        private readonly DepartmentService $departmentService,
    ) {}

    /* ------------------------------------------------------------------ */
    /*  List (paginated)                                                   */
    /* ------------------------------------------------------------------ */

    public function index(Request $request): JsonResponse
    {
        $departments = $this->departmentService->list($request->all());

        return ResponseHelper::paginated($departments, 'Departments retrieved', DepartmentResource::class);
    }

    /* ------------------------------------------------------------------ */
    /*  All active (for dropdowns — no pagination)                         */
    /* ------------------------------------------------------------------ */

    public function allActive(): JsonResponse
    {
        $departments = $this->departmentService->allActive();

        return ResponseHelper::success([
            'departments' => DepartmentResource::collection($departments),
        ], 'Active departments retrieved');
    }

    /* ------------------------------------------------------------------ */
    /*  Show                                                               */
    /* ------------------------------------------------------------------ */

    public function show(int $id): JsonResponse
    {
        $department = $this->departmentService->find($id);

        return ResponseHelper::success([
            'department' => new DepartmentResource($department),
        ], 'Department retrieved');
    }

    /* ------------------------------------------------------------------ */
    /*  Store                                                              */
    /* ------------------------------------------------------------------ */

    public function store(CreateDepartmentRequest $request): JsonResponse
    {
        $department = $this->departmentService->create(
            $request->validated(),
            $request->user(),
        );

        return ResponseHelper::success([
            'department' => new DepartmentResource($department),
        ], 'Department created successfully', 201);
    }

    /* ------------------------------------------------------------------ */
    /*  Update                                                             */
    /* ------------------------------------------------------------------ */

    public function update(UpdateDepartmentRequest $request, int $id): JsonResponse
    {
        $department = $this->departmentService->find($id);

        $department = $this->departmentService->update(
            $department,
            $request->validated(),
            $request->user(),
        );

        return ResponseHelper::success([
            'department' => new DepartmentResource($department),
        ], 'Department updated successfully');
    }

    /* ------------------------------------------------------------------ */
    /*  Delete                                                             */
    /* ------------------------------------------------------------------ */

    public function destroy(int $id): JsonResponse
    {
        $department = $this->departmentService->find($id);

        try {
            $this->departmentService->delete($department, auth()->user());
        } catch (\RuntimeException $e) {
            return ResponseHelper::error($e->getMessage(), 422);
        }

        return ResponseHelper::success(null, 'Department deleted successfully');
    }

    /* ------------------------------------------------------------------ */
    /*  Restore                                                            */
    /* ------------------------------------------------------------------ */

    public function restore(Request $request, int $id): JsonResponse
    {
        $department = $this->departmentService->restore($id, $request->user());

        return ResponseHelper::success([
            'department' => new DepartmentResource($department),
        ], 'Department restored successfully');
    }
}
