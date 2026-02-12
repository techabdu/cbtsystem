<?php

namespace App\Services\Auth;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AuthService
{
    /* ------------------------------------------------------------------ */
    /*  Register                                                           */
    /* ------------------------------------------------------------------ */

    /**
     * Register a new student user.
     *
     * @param  array  $data  Validated registration data.
     * @return User
     */
    public function register(array $data): User
    {
        $user = User::create([
            'first_name'  => $data['first_name'],
            'last_name'   => $data['last_name'],
            'middle_name' => $data['middle_name'] ?? null,
            'email'       => $data['email'],
            'password'    => $data['password'], // 'hashed' cast on User handles bcrypt
            'student_id'  => $data['student_id'] ?? null,
            'phone'       => $data['phone'] ?? null,
            'role'        => 'student', // Only students register themselves
            'is_active'   => true,
            'is_verified' => false,
        ]);

        $this->logActivity($user, 'user_registered');

        return $user;
    }

    /* ------------------------------------------------------------------ */
    /*  Login                                                              */
    /* ------------------------------------------------------------------ */

    /**
     * Authenticate user and return a Sanctum token.
     *
     * @param  string $email
     * @param  string $password
     * @return array{user: User, token: string, expires_in: int}
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function login(string $email, string $password): array
    {
        $user = User::where('email', $email)->first();

        // --- User not found ---
        if (! $user) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // --- Account locked ---
        if ($user->isLocked()) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'email' => ['Account is locked. Please try again after ' . $user->locked_until->diffForHumans() . '.'],
            ]);
        }

        // --- Account deactivated ---
        if (! $user->is_active) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'email' => ['Your account has been deactivated. Contact an administrator.'],
            ]);
        }

        // --- Wrong password ---
        if (! Hash::check($password, $user->password)) {
            $user->recordFailedLogin();

            throw \Illuminate\Validation\ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // --- Success ---
        $user->recordSuccessfulLogin();

        // Revoke previous tokens (single device policy — optional, uncomment if desired)
        // $user->tokens()->delete();

        $expiresInMinutes = (int) config('sanctum.expiration', 1440); // default 24 hours
        $token = $user->createToken(
            'auth_token',
            ['*'],
            $expiresInMinutes ? now()->addMinutes($expiresInMinutes) : null
        )->plainTextToken;

        $this->logActivity($user, 'user_login');

        return [
            'user'       => $user,
            'token'      => $token,
            'expires_in' => $expiresInMinutes * 60, // return seconds
        ];
    }

    /* ------------------------------------------------------------------ */
    /*  Logout                                                             */
    /* ------------------------------------------------------------------ */

    /**
     * Revoke the current access token.
     */
    public function logout(User $user): void
    {
        /** @var \Laravel\Sanctum\PersonalAccessToken|null $token */
        $token = $user->currentAccessToken();

        if ($token) {
            $token->delete();
        }

        $this->logActivity($user, 'user_logout');
    }

    /* ------------------------------------------------------------------ */
    /*  Refresh                                                            */
    /* ------------------------------------------------------------------ */

    /**
     * Revoke current token and issue a new one (token rotation).
     *
     * @return array{token: string, expires_in: int}
     */
    public function refresh(User $user): array
    {
        // Delete current token
        $user->currentAccessToken()->delete();

        $expiresInMinutes = (int) config('sanctum.expiration', 1440);
        $newToken = $user->createToken(
            'auth_token',
            ['*'],
            $expiresInMinutes ? now()->addMinutes($expiresInMinutes) : null
        )->plainTextToken;

        $this->logActivity($user, 'token_refreshed');

        return [
            'token'      => $newToken,
            'expires_in' => $expiresInMinutes * 60,
        ];
    }

    /* ------------------------------------------------------------------ */
    /*  Helpers                                                            */
    /* ------------------------------------------------------------------ */

    /**
     * Log an authentication activity.
     */
    private function logActivity(User $user, string $action): void
    {
        ActivityLog::log(
            action: $action,
            entityType: 'user',
            entityId: $user->id,
            extra: ['user_id' => $user->id],
        );
    }
}
