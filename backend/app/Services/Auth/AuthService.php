<?php

namespace App\Services\Auth;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthService
{
    /* ------------------------------------------------------------------ */
    /*  Activate (First-Time Account Setup)                                */
    /* ------------------------------------------------------------------ */

    /**
     * Activate a pre-created account by setting the password.
     * Admin creates users without passwords. This is the first-time setup.
     *
     * @param  string  $identifier  Student matric number or staff file number.
     * @param  string  $password    The new password to set.
     * @return array{user: User, token: string, expires_in: int}
     *
     * @throws ValidationException
     */
    public function activate(string $identifier, string $password): array
    {
        $user = User::where('student_id', $identifier)
                    ->orWhere('staff_id', $identifier)
                    ->orWhere('email', strtolower($identifier))
                    ->first();

        // Not found
        if (! $user) {
            throw ValidationException::withMessages([
                'identifier' => ['No account found with this ID. Contact your administrator.'],
            ]);
        }

        // Already activated (password already set)
        if ($user->password !== null) {
            throw ValidationException::withMessages([
                'identifier' => ['Account already activated. Please log in instead.'],
            ]);
        }

        // Account deactivated by admin
        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'identifier' => ['Your account has been deactivated. Contact your administrator.'],
            ]);
        }

        // Set password and mark as verified
        $user->update([
            'password'            => $password, // 'hashed' cast handles bcrypt
            'is_verified'         => true,
            'password_changed_at' => now(),
        ]);

        // Auto-login: issue a Sanctum token
        $expiresInMinutes = (int) config('sanctum.expiration', 1440);
        $token = $user->createToken(
            'auth_token',
            ['*'],
            $expiresInMinutes ? now()->addMinutes($expiresInMinutes) : null
        )->plainTextToken;

        $this->logActivity($user, 'account_activated');

        return [
            'user'       => $user->fresh(),
            'token'      => $token,
            'expires_in' => $expiresInMinutes * 60,
        ];
    }

    /* ------------------------------------------------------------------ */
    /*  Login                                                              */
    /* ------------------------------------------------------------------ */

    /**
     * Authenticate user by matric number (student) or file number (lecturer/admin).
     *
     * @param  string $identifier  Matric number or file number.
     * @param  string $password
     * @return array{user: User, token: string, expires_in: int}
     *
     * @throws ValidationException
     */
    public function login(string $identifier, string $password): array
    {
        $user = User::where('student_id', $identifier)
                    ->orWhere('staff_id', $identifier)
                    ->orWhere('email', strtolower($identifier))
                    ->first();

        // --- User not found ---
        if (! $user) {
            throw ValidationException::withMessages([
                'identifier' => ['The provided credentials are incorrect.'],
            ]);
        }

        // --- Account not yet activated (no password set) ---
        if ($user->password === null) {
            throw ValidationException::withMessages([
                'identifier' => ['Your account has not been activated. Please activate your account first.'],
            ]);
        }

        // --- Account locked ---
        if ($user->isLocked()) {
            throw ValidationException::withMessages([
                'identifier' => ['Account is locked. Please try again after ' . $user->locked_until->diffForHumans() . '.'],
            ]);
        }

        // --- Account deactivated ---
        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'identifier' => ['Your account has been deactivated. Contact an administrator.'],
            ]);
        }

        // --- Wrong password ---
        if (! Hash::check($password, $user->password)) {
            $user->recordFailedLogin();

            throw ValidationException::withMessages([
                'identifier' => ['The provided credentials are incorrect.'],
            ]);
        }

        // --- Success ---
        $user->recordSuccessfulLogin();

        $expiresInMinutes = (int) config('sanctum.expiration', 1440);
        $token = $user->createToken(
            'auth_token',
            ['*'],
            $expiresInMinutes ? now()->addMinutes($expiresInMinutes) : null
        )->plainTextToken;

        $this->logActivity($user, 'user_login');

        return [
            'user'       => $user,
            'token'      => $token,
            'expires_in' => $expiresInMinutes * 60,
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
