<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create([
            'email'    => 'student@college.edu',
            'password' => Hash::make('SecurePass1!'),
            'role'     => 'student',
            'is_active' => true,
        ]);
    }

    /* ------------------------------------------------------------------ */
    /*  Successful Login                                                   */
    /* ------------------------------------------------------------------ */

    /** @test */
    public function a_user_can_login_with_valid_credentials(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email'    => 'student@college.edu',
            'password' => 'SecurePass1!',
        ]);

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'user' => ['id', 'uuid', 'email', 'role'],
                    'token',
                    'expires_in',
                ],
            ])
            ->assertJson([
                'success' => true,
                'message' => 'Login successful',
            ]);

        $this->assertNotEmpty($response->json('data.token'));
    }

    /** @test */
    public function login_updates_last_login_timestamp(): void
    {
        $this->postJson('/api/v1/auth/login', [
            'email'    => 'student@college.edu',
            'password' => 'SecurePass1!',
        ]);

        $this->user->refresh();
        $this->assertNotNull($this->user->last_login_at);
    }

    /** @test */
    public function login_returns_correct_user_role(): void
    {
        $admin = User::factory()->create([
            'email'     => 'admin@college.edu',
            'password'  => Hash::make('AdminPass1!'),
            'role'      => 'admin',
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email'    => 'admin@college.edu',
            'password' => 'AdminPass1!',
        ]);

        $response->assertOk()
            ->assertJson([
                'data' => ['user' => ['role' => 'admin']],
            ]);
    }

    /* ------------------------------------------------------------------ */
    /*  Failed Login                                                       */
    /* ------------------------------------------------------------------ */

    /** @test */
    public function login_fails_with_wrong_password(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email'    => 'student@college.edu',
            'password' => 'WrongPass1!',
        ]);

        $response->assertStatus(401)
            ->assertJson(['success' => false]);
    }

    /** @test */
    public function login_fails_with_nonexistent_email(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email'    => 'nobody@college.edu',
            'password' => 'SecurePass1!',
        ]);

        $response->assertStatus(401)
            ->assertJson(['success' => false]);
    }

    /** @test */
    public function login_fails_for_deactivated_account(): void
    {
        $this->user->update(['is_active' => false]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email'    => 'student@college.edu',
            'password' => 'SecurePass1!',
        ]);

        $response->assertStatus(401)
            ->assertJson(['success' => false]);
    }

    /** @test */
    public function login_fails_for_locked_account(): void
    {
        $this->user->update([
            'locked_until'          => now()->addMinutes(15),
            'failed_login_attempts' => 5,
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email'    => 'student@college.edu',
            'password' => 'SecurePass1!',
        ]);

        $response->assertStatus(401)
            ->assertJson(['success' => false]);
    }

    /** @test */
    public function account_locks_after_five_failed_attempts(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/login', [
                'email'    => 'student@college.edu',
                'password' => 'WrongPass!',
            ]);
        }

        $this->user->refresh();
        $this->assertNotNull($this->user->locked_until);
        $this->assertTrue($this->user->locked_until->isFuture());
    }

    /* ------------------------------------------------------------------ */
    /*  Logout                                                             */
    /* ------------------------------------------------------------------ */

    /** @test */
    public function an_authenticated_user_can_logout(): void
    {
        $token = $this->user->createToken('auth_token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/auth/logout');

        $response->assertOk()
            ->assertJson(['success' => true, 'message' => 'Logout successful']);

        // Token should be revoked
        $this->assertDatabaseMissing('personal_access_tokens', [
            'tokenable_id' => $this->user->id,
        ]);
    }

    /** @test */
    public function logout_fails_without_token(): void
    {
        $response = $this->postJson('/api/v1/auth/logout');

        $response->assertStatus(401);
    }

    /* ------------------------------------------------------------------ */
    /*  Me Endpoint                                                        */
    /* ------------------------------------------------------------------ */

    /** @test */
    public function authenticated_user_can_get_their_profile(): void
    {
        $token = $this->user->createToken('auth_token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/auth/me');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'user' => ['id', 'uuid', 'email', 'role', 'first_name', 'last_name'],
                ],
            ])
            ->assertJson([
                'data' => [
                    'user' => ['email' => 'student@college.edu'],
                ],
            ]);
    }

    /** @test */
    public function me_fails_without_authentication(): void
    {
        $response = $this->getJson('/api/v1/auth/me');

        $response->assertStatus(401);
    }

    /* ------------------------------------------------------------------ */
    /*  Token Refresh                                                      */
    /* ------------------------------------------------------------------ */

    /** @test */
    public function authenticated_user_can_refresh_token(): void
    {
        $token = $this->user->createToken('auth_token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/auth/refresh');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => ['token', 'expires_in'],
            ]);

        // New token should be different from the old one
        $newToken = $response->json('data.token');
        $this->assertNotEquals($token, $newToken);

        // User should have exactly 1 token (old revoked, new created)
        $this->assertEquals(1, $this->user->tokens()->count());
    }
}
