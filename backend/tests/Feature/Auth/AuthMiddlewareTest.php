<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class AuthMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    /* ------------------------------------------------------------------ */
    /*  Protected Route Access                                             */
    /* ------------------------------------------------------------------ */

    #[Test]
    public function unauthenticated_request_returns_401_json(): void
    {
        $response = $this->getJson('/api/v1/auth/me');

        $response->assertStatus(401)
            ->assertJson([
                'success'    => false,
                'error_code' => 'AUTH_REQUIRED',
            ]);
    }

    #[Test]
    public function invalid_token_returns_401(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer invalid-token-here')
            ->getJson('/api/v1/auth/me');

        $response->assertStatus(401);
    }

    /* ------------------------------------------------------------------ */
    /*  Role-Based Access Control                                          */
    /* ------------------------------------------------------------------ */

    #[Test]
    public function admin_user_has_admin_role(): void
    {
        $admin = User::factory()->create([
            'role'      => 'admin',
            'is_active' => true,
        ]);

        $token = $admin->createToken('auth_token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/auth/me');

        $response->assertOk()
            ->assertJson([
                'data' => ['user' => ['role' => 'admin']],
            ]);
    }

    #[Test]
    public function lecturer_user_has_lecturer_role(): void
    {
        $lecturer = User::factory()->create([
            'role'      => 'lecturer',
            'is_active' => true,
        ]);

        $token = $lecturer->createToken('auth_token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/auth/me');

        $response->assertOk()
            ->assertJson([
                'data' => ['user' => ['role' => 'lecturer']],
            ]);
    }

    #[Test]
    public function student_user_has_student_role(): void
    {
        $student = User::factory()->create([
            'role'      => 'student',
            'is_active' => true,
        ]);

        $token = $student->createToken('auth_token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/auth/me');

        $response->assertOk()
            ->assertJson([
                'data' => ['user' => ['role' => 'student']],
            ]);
    }

    /* ------------------------------------------------------------------ */
    /*  API Returns JSON (not HTML redirects)                              */
    /* ------------------------------------------------------------------ */

    #[Test]
    public function api_404_returns_json_not_html(): void
    {
        $response = $this->getJson('/api/v1/nonexistent-route');

        $response->assertStatus(404)
            ->assertJson([
                'success'    => false,
                'error_code' => 'NOT_FOUND',
            ]);
    }

    #[Test]
    public function api_wrong_method_returns_json(): void
    {
        $response = $this->deleteJson('/api/v1/auth/login');

        $response->assertStatus(405)
            ->assertJson([
                'success'    => false,
                'error_code' => 'METHOD_NOT_ALLOWED',
            ]);
    }
}
