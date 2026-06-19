<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class HealthCheckController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $checks = [];

        try {
            DB::connection()->getPdo();
            $checks['database'] = 'ok';
        } catch (\Throwable) {
            $checks['database'] = 'error';
        }

        try {
            Cache::store()->put('health-check', true, 10);
            $checks['cache'] = Cache::store()->get('health-check') ? 'ok' : 'error';
        } catch (\Throwable) {
            $checks['cache'] = 'error';
        }

        try {
            $checks['storage'] = is_writable(storage_path('logs')) ? 'ok' : 'error';
        } catch (\Throwable) {
            $checks['storage'] = 'error';
        }

        $healthy = !in_array('error', $checks, true);

        return response()->json([
            'status' => $healthy ? 'healthy' : 'degraded',
            'checks' => $checks,
            'timestamp' => now()->toIso8601String(),
        ], $healthy ? 200 : 503);
    }
}
