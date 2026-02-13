<?php

namespace App\Helpers;

use Illuminate\Http\JsonResponse;

class ResponseHelper
{
    /**
     * Return a successful JSON response.
     *
     * @param  mixed        $data
     * @param  string       $message
     * @param  int          $statusCode
     * @param  array|null   $meta
     * @return JsonResponse
     */
    public static function success(
        mixed $data = null,
        string $message = 'Success',
        int $statusCode = 200,
        ?array $meta = null
    ): JsonResponse {
        $response = [
            'success' => true,
            'message' => $message,
            'data'    => $data,
            'meta'    => array_merge([
                'timestamp' => now()->toIso8601String(),
                'version'   => '1.0',
            ], $meta ?? []),
        ];

        return response()->json($response, $statusCode);
    }

    /**
     * Return an error JSON response.
     *
     * @param  string       $message
     * @param  int          $statusCode
     * @param  array|null   $errors
     * @param  string|null  $errorCode
     * @return JsonResponse
     */
    public static function error(
        string $message = 'An error occurred',
        int $statusCode = 400,
        ?array $errors = null,
        ?string $errorCode = null
    ): JsonResponse {
        $response = [
            'success' => false,
            'message' => $message,
            'meta'    => [
                'timestamp' => now()->toIso8601String(),
            ],
        ];

        if ($errors !== null) {
            $response['errors'] = $errors;
        }

        if ($errorCode !== null) {
            $response['error_code'] = $errorCode;
        }

        return response()->json($response, $statusCode);
    }

    /**
     * Return a paginated JSON response.
     *
     * @param  mixed        $paginator      Laravel paginator instance
     * @param  string       $message
     * @param  string|null  $resourceClass  Optional API Resource class to transform items (e.g. UserResource::class)
     * @return JsonResponse
     */
    public static function paginated(
        mixed $paginator,
        string $message = 'Success',
        ?string $resourceClass = null
    ): JsonResponse {
        $items = $resourceClass
            ? $resourceClass::collection($paginator->items())
            : $paginator->items();

        return response()->json([
            'success'    => true,
            'message'    => $message,
            'data'       => $items,
            'meta'       => [
                'timestamp' => now()->toIso8601String(),
                'version'   => '1.0',
            ],
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'total_pages'  => $paginator->lastPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
            ],
        ], 200);
    }
}
