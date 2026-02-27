<?php

namespace App\Http\Controllers\Api\V1\User;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Imports\UserImport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class BulkUserUploadController extends Controller
{
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
