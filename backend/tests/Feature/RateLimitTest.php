<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class RateLimitTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        RateLimiter::clear('public-auth');
        RateLimiter::clear('offline-entry');
    }

    public function test_login_rate_limited_after_5_attempts(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/login', [
                'email'    => 'wrong@example.com',
                'password' => 'wrong',
            ]);
        }

        $this->postJson('/api/v1/auth/login', [
            'email'    => 'wrong@example.com',
            'password' => 'wrong',
        ])->assertStatus(429);
    }

    public function test_activation_rate_limited_after_5_attempts(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/activate', [
                'email'                 => 'fake@example.com',
                'password'              => 'Password1!',
                'password_confirmation' => 'Password1!',
            ]);
        }

        $this->postJson('/api/v1/auth/activate', [
            'email'                 => 'fake@example.com',
            'password'              => 'Password1!',
            'password_confirmation' => 'Password1!',
        ])->assertStatus(429);
    }

    public function test_offline_entry_rate_limited_after_5_attempts(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/offline-exams/start', [
                'matric_number' => 'FAKE/001',
                'access_code'   => 'INVALID',
            ]);
        }

        $this->postJson('/api/v1/offline-exams/start', [
            'matric_number' => 'FAKE/001',
            'access_code'   => 'INVALID',
        ])->assertStatus(429);
    }
}
