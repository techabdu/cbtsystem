<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    /* ------------------------------------------------------------------ */
    /*  Successful Registration                                            */
    /* ------------------------------------------------------------------ */

    /** @test */
    public function a_student_can_register_with_valid_data(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'email'                 => 'newstudent@college.edu',
            'password'              => 'SecurePass1!',
            'password_confirmation' => 'SecurePass1!',
            'first_name'            => 'John',
            'last_name'             => 'Doe',
            'student_id'            => '2024/CS/001',
            'phone'                 => '+2348012345678',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'user' => ['id', 'uuid', 'email', 'first_name', 'last_name', 'role'],
                ],
                'meta' => ['timestamp', 'version'],
            ])
            ->assertJson([
                'success' => true,
                'data' => [
                    'user' => [
                        'email'     => 'newstudent@college.edu',
                        'role'      => 'student',
                        'first_name' => 'John',
                    ],
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'newstudent@college.edu',
            'role'  => 'student',
        ]);
    }

    /** @test */
    public function registration_generates_uuid_automatically(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'email'                 => 'uuid@college.edu',
            'password'              => 'SecurePass1!',
            'password_confirmation' => 'SecurePass1!',
            'first_name'            => 'UUID',
            'last_name'             => 'Test',
        ]);

        $user = User::where('email', 'uuid@college.edu')->first();
        $this->assertNotNull($user->uuid);
        $this->assertEquals(36, strlen($user->uuid)); // UUID v4 format
    }

    /* ------------------------------------------------------------------ */
    /*  Validation Failures                                                */
    /* ------------------------------------------------------------------ */

    /** @test */
    public function registration_fails_without_required_fields(): void
    {
        $response = $this->postJson('/api/v1/auth/register', []);

        $response->assertStatus(422)
            ->assertJson(['success' => false])
            ->assertJsonStructure([
                'errors' => ['email', 'password', 'first_name', 'last_name'],
            ]);
    }

    /** @test */
    public function registration_fails_with_weak_password(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'email'                 => 'weak@college.edu',
            'password'              => 'password',  // No uppercase, no digit, no special
            'password_confirmation' => 'password',
            'first_name'            => 'Weak',
            'last_name'             => 'Pass',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('password');
    }

    /** @test */
    public function registration_fails_with_duplicate_email(): void
    {
        User::factory()->create(['email' => 'exists@college.edu']);

        $response = $this->postJson('/api/v1/auth/register', [
            'email'                 => 'exists@college.edu',
            'password'              => 'SecurePass1!',
            'password_confirmation' => 'SecurePass1!',
            'first_name'            => 'Dup',
            'last_name'             => 'Email',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('email');
    }

    /** @test */
    public function registration_fails_when_password_confirmation_does_not_match(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'email'                 => 'mismatch@college.edu',
            'password'              => 'SecurePass1!',
            'password_confirmation' => 'DifferentPass1!',
            'first_name'            => 'Mis',
            'last_name'             => 'Match',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('password');
    }
}
