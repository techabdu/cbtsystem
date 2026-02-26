<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Tests for the account activation flow.
 *
 * In this system there is no self-registration. Accounts are created by
 * an admin (via /api/v1/users) without a password. The user then activates
 * their account via POST /api/v1/auth/activate using their identifier
 * (matric number / staff ID / email) and their chosen password.
 */
class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    /* ------------------------------------------------------------------ */
    /*  Helpers                                                            */
    /* ------------------------------------------------------------------ */

    /** Create a user that has NOT yet been activated (no password). */
    private function makeUnactivatedUser(array $overrides = []): User
    {
        return User::factory()->create(array_merge([
            'password'   => null,
            'is_verified' => false,
            'is_active'  => true,
        ], $overrides));
    }

    /* ------------------------------------------------------------------ */
    /*  Successful Activation                                              */
    /* ------------------------------------------------------------------ */

    #[Test]
    public function a_student_can_register_with_valid_data(): void
    {
        $user = $this->makeUnactivatedUser([
            'email'      => 'newstudent@college.edu',
            'first_name' => 'John',
            'last_name'  => 'Doe',
            'role'       => 'student',
        ]);

        $response = $this->postJson('/api/v1/auth/activate', [
            'identifier'            => 'newstudent@college.edu',
            'password'              => 'SecurePass1!',
            'password_confirmation' => 'SecurePass1!',
        ]);

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'user' => ['id', 'uuid', 'email', 'first_name', 'last_name', 'role'],
                    'token',
                    'expires_in',
                ],
            ])
            ->assertJson([
                'success' => true,
                'data' => [
                    'user' => [
                        'email'      => 'newstudent@college.edu',
                        'role'       => 'student',
                        'first_name' => 'John',
                    ],
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'email'       => 'newstudent@college.edu',
            'is_verified' => true,
        ]);
    }

    #[Test]
    public function registration_generates_uuid_automatically(): void
    {
        $user = $this->makeUnactivatedUser(['email' => 'uuid@college.edu']);

        $this->postJson('/api/v1/auth/activate', [
            'identifier'            => 'uuid@college.edu',
            'password'              => 'SecurePass1!',
            'password_confirmation' => 'SecurePass1!',
        ]);

        $user->refresh();
        $this->assertNotNull($user->uuid);
        $this->assertEquals(36, strlen($user->uuid)); // UUID v4 format
    }

    /* ------------------------------------------------------------------ */
    /*  Validation Failures                                                */
    /* ------------------------------------------------------------------ */

    #[Test]
    public function registration_fails_without_required_fields(): void
    {
        $response = $this->postJson('/api/v1/auth/activate', []);

        $response->assertStatus(422)
            ->assertJson(['success' => false])
            ->assertJsonStructure([
                'errors' => ['identifier', 'password'],
            ]);
    }

    #[Test]
    public function registration_fails_with_weak_password(): void
    {
        $this->makeUnactivatedUser(['email' => 'weak@college.edu']);

        $response = $this->postJson('/api/v1/auth/activate', [
            'identifier'            => 'weak@college.edu',
            'password'              => 'password',   // No uppercase, digit, or special char
            'password_confirmation' => 'password',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('password');
    }

    #[Test]
    public function registration_fails_with_duplicate_email(): void
    {
        // An already-activated user cannot be reactivated
        User::factory()->create([
            'email'      => 'exists@college.edu',
            'is_verified' => true,
        ]);

        $response = $this->postJson('/api/v1/auth/activate', [
            'identifier'            => 'exists@college.edu',
            'password'              => 'SecurePass1!',
            'password_confirmation' => 'SecurePass1!',
        ]);

        // Already has a password — activation should be rejected
        $response->assertStatus(422)
            ->assertJson(['success' => false]);
    }

    #[Test]
    public function registration_fails_when_password_confirmation_does_not_match(): void
    {
        $this->makeUnactivatedUser(['email' => 'mismatch@college.edu']);

        $response = $this->postJson('/api/v1/auth/activate', [
            'identifier'            => 'mismatch@college.edu',
            'password'              => 'SecurePass1!',
            'password_confirmation' => 'DifferentPass1!',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('password');
    }

    #[Test]
    public function activation_fails_for_nonexistent_identifier(): void
    {
        $response = $this->postJson('/api/v1/auth/activate', [
            'identifier'            => 'ghost@nowhere.edu',
            'password'              => 'SecurePass1!',
            'password_confirmation' => 'SecurePass1!',
        ]);

        $response->assertStatus(422)
            ->assertJson(['success' => false]);
    }

    #[Test]
    public function activation_fails_for_deactivated_account(): void
    {
        $this->makeUnactivatedUser([
            'email'     => 'disabled@college.edu',
            'is_active' => false,
        ]);

        $response = $this->postJson('/api/v1/auth/activate', [
            'identifier'            => 'disabled@college.edu',
            'password'              => 'SecurePass1!',
            'password_confirmation' => 'SecurePass1!',
        ]);

        $response->assertStatus(422)
            ->assertJson(['success' => false]);
    }
}
