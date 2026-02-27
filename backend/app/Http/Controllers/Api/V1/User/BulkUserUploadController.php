<?php

namespace App\Http\Controllers\Api\V1\User;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Imports\UserImport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class BulkUserUploadController extends Controller
{
    /**
     * GET /api/v1/templates/{name}
     *
     * Serves an Excel template file for download with proper CORS-friendly headers.
     * Allowed names: bulk-students-template, bulk-lecturers-template, bulk-users-template, bulk-questions-template
     *
     * @param  string  $name  Filename without .xlsx extension
     * @return BinaryFileResponse|JsonResponse
     */
    public function downloadTemplate(string $name): BinaryFileResponse|JsonResponse
    {
        $allowed = [
            'bulk-students-template',
            'bulk-lecturers-template',
            'bulk-users-template',
            'bulk-questions-template',
        ];

        if (! in_array($name, $allowed, true)) {
            return ResponseHelper::error('Template not found.', 404);
        }

        $path = public_path("templates/{$name}.xlsx");

        if (! file_exists($path)) {
            return ResponseHelper::error('Template file not found. Run php artisan templates:generate.', 404);
        }

        return response()->download($path, "{$name}.xlsx", [
            'Content-Type'        => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$name}.xlsx\"",
        ]);
    }

    /**
     * POST /api/v1/users/bulk-upload
     *
     * Accepts an Excel file (.xlsx or .xls) and bulk-creates user accounts.
     * Returns a summary of created, skipped, and error rows.
     *
     * @param  Request  $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'file' => [
                'required',
                'file',
                'mimes:xlsx,xls',
                'max:10240', // 10 MB
            ],
        ]);

        $import = new UserImport();

        try {
            Excel::import($import, $request->file('file'));
        } catch (\Maatwebsite\Excel\Validators\ValidationException $e) {
            return ResponseHelper::error(
                message: 'Validation failed while processing the Excel file.',
                statusCode: 422,
                errors: collect($e->failures())->map(fn ($f) => [
                    'row'     => $f->row(),
                    'message' => implode(', ', $f->errors()),
                ])->toArray(),
            );
        } catch (\Throwable $e) {
            return ResponseHelper::error(
                message: 'Failed to process the uploaded file: ' . $e->getMessage(),
                statusCode: 500,
            );
        }

        $results = $import->getResults();

        // 207 Multi-Status if some rows failed
        $statusCode = $results['skipped'] > 0 ? 207 : 201;

        return ResponseHelper::success(
            data: $results,
            message: "Bulk upload completed. {$results['created']} user(s) created, {$results['skipped']} skipped.",
            statusCode: $statusCode,
        );
    }
}
