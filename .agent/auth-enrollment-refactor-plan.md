# Auth & Enrollment Refactor — Implementation Plan

> **Created:** 2026-02-13
> **Status:** ✅ Approved — Ready to build
> **Scope:** Replace self-registration with first-time activation + Student self-service course enrollment

---

## Overview

Two fundamental changes to how the CBT system works:

1. **No self-registration.** Admin pre-creates user records (without passwords). Students and lecturers "activate" their accounts on first visit by entering their Matric Number / File Number and creating a password.
2. **Department-based course enrollment.** Students belong to a department. They browse courses in their department and self-enroll.

---

## Current State vs. Target State

### Authentication

| Aspect | Current (Before) | Target (After) |
|--------|-------------------|----------------|
| Registration | Students self-register via `/register` page | ❌ **Removed** — No self-registration |
| User creation | Admin creates users with password at `/admin/users/create` | Admin creates users **without password**, only basic info + matric/file number |
| First login | User logs in with email + password | New user goes to `/activate`, enters matric/file number, creates password |
| Login identifier | Email | **Matric Number** (students) / **File Number** (lecturers/admins) |
| Login flow | Email + password → dashboard | Identifier + password → dashboard; if no password → "Activate your account first" |

### Course Enrollment

| Aspect | Current (Before) | Target (After) |
|--------|-------------------|----------------|
| Student department | No `department_id` on users | Students have a `department_id` linking them to their department |
| Enrollment method | Admin manually enrolls students one-by-one | Student self-enrolls from dashboard |
| Course discovery | No student-facing course list | Student sees all courses in their department |
| Enrollment UI | Admin-only (`/admin/courses/[id]` → enroll tab) | Student page `/student/courses` with "Available" + "My Courses" tabs |

---

## Sprint 1: Database + Backend Auth Refactor

### 1.1 — Database Migrations

#### Migration: Add `department_id` to `users` table
> **File:** `database/migrations/2026_02_13_000001_add_department_id_to_users_table.php`

```php
Schema::table('users', function (Blueprint $table) {
    $table->foreignId('department_id')
          ->nullable()
          ->after('staff_id')
          ->constrained('departments')
          ->nullOnDelete();
    
    $table->index(['department_id', 'deleted_at'], 'idx_users_department');
});
```

**Why nullable:** Only admins don't need a department. `department_id` is **required** for students and lecturers (enforced at validation level), nullable at DB level for admins.

#### Migration: Make `password` nullable on `users` table
> **File:** `database/migrations/2026_02_13_000002_make_password_nullable_on_users_table.php`

```php
Schema::table('users', function (Blueprint $table) {
    $table->string('password')->nullable()->change();
});
```

**Why:** When admin creates a user, they only provide name + identifier. The user creates their own password during activation. A `NULL` password = account not yet activated.

#### Migration: Add index on `staff_id`
> **File:** (can be combined with the department migration)

```php
$table->index(['staff_id', 'deleted_at'], 'idx_users_staff_id');
```

**Why:** Login will now search by `staff_id` for lecturers/admins. Needs to be fast.

---

### 1.2 — User Model Changes

> **File:** `app/Models/User.php`

**Add to `$fillable`:**
```php
'department_id',
```

**Add relationship:**
```php
/** Department the user belongs to (students, optionally lecturers). */
public function department(): BelongsTo
{
    return $this->belongsTo(Department::class);
}
```

**Add accessor:**
```php
/** Check if the user has activated their account (set a password). */
public function getIsActivatedAttribute(): bool
{
    return $this->password !== null;
}
```

**Add scope:**
```php
/** Scope: users who have not yet activated (no password set). */
public function scopeNotActivated($query)
{
    return $query->whereNull('password');
}
```

---

### 1.3 — Remove Self-Registration

**Delete files:**
- `app/Http/Controllers/Api/V1/Auth/RegisterController.php`
- `app/Http/Requests/Auth/RegisterRequest.php`

**Modify `routes/api.php`:**
- Remove `POST /auth/register` route

**Modify `AuthService.php`:**
- Remove `register()` method entirely

---

### 1.4 — Create Account Activation Endpoint

> **New endpoint:** `POST /api/v1/auth/activate`

#### New file: `app/Http/Requests/Auth/ActivateAccountRequest.php`

```php
public function rules(): array
{
    return [
        'identifier'            => 'required|string|max:50',
        'password'              => ['required', 'string', 'min:8', 'confirmed', new StrongPassword()],
    ];
}
```

#### New file: `app/Http/Controllers/Api/V1/Auth/ActivateAccountController.php`

**Logic:**
1. Receive `identifier` + `password` + `password_confirmation`
2. Search: `User::where('student_id', identifier)->orWhere('staff_id', identifier)->first()`
3. **Not found** → 422: "No account found with this ID. Contact your administrator."
4. **Already has password** → 422: "Account already activated. Please log in instead."
5. **Not active** → 422: "Your account has been deactivated. Contact your administrator."
6. Set password on user: `$user->update(['password' => $password, 'is_verified' => true, 'password_changed_at' => now()])`
7. Auto-login: create Sanctum token, return `{ user, token, expires_in }`
8. Log activity: `account_activated`

#### Add to `AuthService.php`:

```php
public function activate(string $identifier, string $password): array
{
    $user = User::where('student_id', $identifier)
                ->orWhere('staff_id', $identifier)
                ->first();

    if (!$user) {
        throw ValidationException::withMessages([
            'identifier' => ['No account found with this ID. Contact your administrator.'],
        ]);
    }

    if ($user->password !== null) {
        throw ValidationException::withMessages([
            'identifier' => ['Account already activated. Please log in instead.'],
        ]);
    }

    if (!$user->is_active) {
        throw ValidationException::withMessages([
            'identifier' => ['Your account has been deactivated. Contact your administrator.'],
        ]);
    }

    $user->update([
        'password'            => $password,  // 'hashed' cast handles bcrypt
        'is_verified'         => true,
        'password_changed_at' => now(),
    ]);

    // Auto-login
    $expiresInMinutes = (int) config('sanctum.expiration', 1440);
    $token = $user->createToken('auth_token', ['*'],
        $expiresInMinutes ? now()->addMinutes($expiresInMinutes) : null
    )->plainTextToken;

    $this->logActivity($user, 'account_activated');

    return [
        'user'       => $user->fresh(),
        'token'      => $token,
        'expires_in' => $expiresInMinutes * 60,
    ];
}
```

---

### 1.5 — Modify Login to Use Identifier (not Email)

> **File:** `app/Services/Auth/AuthService.php` → `login()`
> **File:** `app/Http/Requests/Auth/LoginRequest.php`
> **File:** `app/Http/Controllers/Api/V1/Auth/LoginController.php`

#### LoginRequest — change validation:

```php
// BEFORE
'email'    => 'required|email|max:255',

// AFTER
'identifier' => 'required|string|max:50',
```

#### AuthService::login() — change lookup:

```php
// BEFORE
public function login(string $email, string $password): array
{
    $user = User::where('email', $email)->first();
    ...
}

// AFTER
public function login(string $identifier, string $password): array
{
    $user = User::where('student_id', $identifier)
                ->orWhere('staff_id', $identifier)
                ->first();

    if (!$user) {
        throw ValidationException::withMessages([
            'identifier' => ['The provided credentials are incorrect.'],
        ]);
    }

    // Check if account is activated (has password)
    if ($user->password === null) {
        throw ValidationException::withMessages([
            'identifier' => ['Your account has not been activated. Please activate your account first.'],
        ]);
    }

    // ... rest of existing logic (locked, inactive, password check) ...
}
```

#### LoginController — update parameter:

```php
$result = $this->authService->login(
    $request->validated('identifier'),  // was 'email'
    $request->validated('password')
);
```

---

### 1.6 — Modify Admin User Creation (No Password Required)

> **File:** `app/Http/Requests/User/CreateUserRequest.php`

```php
// BEFORE
'password' => ['required', 'string', 'min:8', 'confirmed', new StrongPassword()],

// AFTER — remove password entirely, add department_id
'department_id' => 'nullable|integer|exists:departments,id',
// password removed — users create their own on activation
```

> **File:** `app/Services/User/UserService.php` → `create()`

```php
// BEFORE
'password' => $data['password'],

// AFTER — no password set
// 'password' => null,  (omit or explicitly set null)
'department_id' => $data['department_id'] ?? null,
```

**Validation note:** When `role = student`, `department_id` should be **required**. We can add a conditional rule:

```php
'department_id' => [
    Rule::requiredIf($this->input('role') === 'student'),
    'nullable', 'integer', 'exists:departments,id',
],
'student_id' => [
    Rule::requiredIf($this->input('role') === 'student'),
    'nullable', 'string', 'max:50', 'unique:users,student_id',
],
'staff_id' => [
    Rule::requiredIf(in_array($this->input('role'), ['lecturer', 'admin'])),
    'nullable', 'string', 'max:50', 'unique:users,staff_id',
],
```

---

### 1.7 — Update UserResource

> **File:** `app/Http/Resources/UserResource.php`

Add to output:
```php
'department_id'  => $this->department_id,
'department'     => $this->whenLoaded('department', fn() => [
    'id'   => $this->department->id,
    'name' => $this->department->name,
    'code' => $this->department->code,
]),
'is_activated'   => $this->password !== null,
```

---

### 1.8 — Update API Routes

> **File:** `routes/api.php`

```php
// REMOVE
Route::post('auth/register', RegisterController::class);

// ADD
Route::post('auth/activate', ActivateAccountController::class);
```

---

### Sprint 1 Checklist

- [ ] Migration: Add `department_id` to `users` table
- [ ] Migration: Make `password` nullable
- [ ] Migration: Add `staff_id` composite index
- [ ] User Model: Add `department_id` to fillable, add `department()` relationship, add `is_activated` accessor, add `notActivated` scope
- [ ] Delete: `RegisterController.php`
- [ ] Delete: `RegisterRequest.php`
- [ ] Create: `ActivateAccountController.php`
- [ ] Create: `ActivateAccountRequest.php`
- [ ] Modify: `AuthService.php` — remove `register()`, add `activate()`, change `login()` to use identifier
- [ ] Modify: `LoginRequest.php` — `email` → `identifier`
- [ ] Modify: `LoginController.php` — pass `identifier` instead of `email`
- [ ] Modify: `CreateUserRequest.php` — remove `password`, add `department_id`, conditional `student_id`/`staff_id` rules
- [ ] Modify: `UserService::create()` — no password, add `department_id`
- [ ] Modify: `UserResource.php` — add `department`, `is_activated`
- [ ] Modify: `routes/api.php` — remove register, add activate
- [ ] Update existing tests (remove register tests, add activate tests, update login tests)
- [ ] Run migrations
- [ ] Run full test suite

---

## Sprint 2: Frontend Auth Refactor

### 2.1 — Delete Register Page

- [ ] Delete `app/(auth)/register/page.tsx`
- [ ] Remove register link from Login page
- [ ] Remove register link from Auth layout
- [ ] Remove `register()` function from `lib/api/auth.ts`
- [ ] Remove `RegisterData` type from `lib/types/api.ts`

### 2.2 — Create Activate Account Page

> **File:** `app/(auth)/activate/page.tsx`

**UI Design:**
```
┌─────────────────────────────────────────┐
│          🎓 Activate Your Account       │
│                                         │
│  Welcome! Enter your Matric Number or   │
│  File Number to activate your account.  │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ Matric / File Number            │    │
│  │ e.g. CSC/2020/001              │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ Create Password                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ Confirm Password               │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │       Activate Account          │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Already activated? Log in →            │
└─────────────────────────────────────────┘
```

**On success:** Redirect to `/${role}/dashboard` based on returned user role.

### 2.3 — Modify Login Page

> **File:** `app/(auth)/login/page.tsx`

**Changes:**
- Replace "Email" input → "Matric Number / File Number" input
  - Field name: `identifier`
  - Placeholder: `e.g. CSC/2020/001 or STF/001`
  - Type: `text` (not `email`)
- Replace "Don't have an account? Register →" → "First time? Activate your account →" (link to `/activate`)
- Handle new error message: "Account not activated" → show link to `/activate`

### 2.4 — Modify Auth API Functions

> **File:** `lib/api/auth.ts`

```typescript
// REMOVE
export function register(data: RegisterData) { ... }

// ADD
export function activateAccount(data: ActivateData) {
  return apiClient.post('/auth/activate', data);
}

// MODIFY login
export function login(data: { identifier: string; password: string }) {
  return apiClient.post('/auth/login', data);
}
```

> **File:** `lib/types/api.ts`

```typescript
// REMOVE
export interface RegisterData { ... }

// ADD
export interface ActivateData {
  identifier: string;
  password: string;
  password_confirmation: string;
}

// MODIFY
export interface LoginData {
  identifier: string;  // was: email
  password: string;
}
```

### 2.5 — Modify Admin Create User Page

> **File:** `app/(dashboard)/admin/users/create/page.tsx`

**Changes:**
- Remove password + password_confirmation fields
- Add department dropdown (fetch from `/departments/active`)
  - Show when role = `student` (required) or `lecturer` (optional)
- Make `student_id` required when role = `student`
- Make `staff_id` required when role = `lecturer` or `admin`
- Add helper text: "The user will create their own password when they first activate their account."

### 2.6 — Update Middleware & Auth Store

- Remove any register-related redirects
- Add `/activate` to public (unauthenticated) routes in `middleware.ts`
- Update `authStore` if it has register-related state

### Sprint 2 Checklist

- [ ] Delete `app/(auth)/register/page.tsx`
- [ ] Create `app/(auth)/activate/page.tsx`
- [ ] Modify `app/(auth)/login/page.tsx` — identifier field, activate link
- [ ] Modify `lib/api/auth.ts` — remove register, add activate, update login
- [ ] Modify `lib/types/api.ts` — remove RegisterData, add ActivateData, update LoginData
- [ ] Modify `app/(dashboard)/admin/users/create/page.tsx` — remove password, add department
- [ ] Modify Auth layout — remove register navigation
- [ ] Modify `middleware.ts` — add `/activate` as public route
- [ ] Verify build: `npx next build` with 0 errors
- [ ] Manual test: full activation + login flow

---

## Sprint 3: Student Self-Service Course Enrollment

### 3.1 — Backend: Student Enrollment API

#### New file: `app/Http/Controllers/Api/V1/Student/StudentCourseController.php`

**Endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/student/available-courses` | All active courses in student's department, excluding already-enrolled |
| `GET` | `/api/v1/student/my-courses` | Student's enrolled courses with details |
| `POST` | `/api/v1/student/enroll` | Bulk self-enroll: `{ course_ids: [1, 2, 5] }` |
| `DELETE` | `/api/v1/student/unenroll/{courseId}` | Unenroll from a single course |

**`GET /student/available-courses` logic:**
```php
$student = $request->user();
$enrolledIds = $student->enrolledCourses()->pluck('courses.id');

$courses = Course::active()
    ->where('department_id', $student->department_id)
    ->whereNotIn('id', $enrolledIds)
    ->with('department')
    ->get();
```

**`POST /student/enroll` logic:**
```php
$validated = $request->validate([
    'course_ids'   => 'required|array|min:1',
    'course_ids.*' => 'integer|exists:courses,id',
]);

$student = $request->user();

// Verify all courses belong to student's department
$courses = Course::active()
    ->where('department_id', $student->department_id)
    ->whereIn('id', $validated['course_ids'])
    ->get();

if ($courses->count() !== count($validated['course_ids'])) {
    return error: "Some courses are not in your department or are inactive.";
}

// Enroll (skip already enrolled)
foreach ($courses as $course) {
    if (!$student->isEnrolledIn($course->id)) {
        CourseEnrollment::create([
            'student_id'      => $student->id,
            'course_id'       => $course->id,
            'enrollment_date' => now()->toDateString(),
            'status'          => 'active',
        ]);
    }
}
```

#### New route group in `routes/api.php`:

```php
Route::prefix('student')
    ->middleware(['auth:sanctum', 'role:student'])
    ->group(function () {
        Route::get('available-courses', [StudentCourseController::class, 'availableCourses']);
        Route::get('my-courses',        [StudentCourseController::class, 'myCourses']);
        Route::post('enroll',           [StudentCourseController::class, 'enroll']);
        Route::delete('unenroll/{courseId}', [StudentCourseController::class, 'unenroll']);
    });
```

---

### 3.2 — Frontend: Student Course Registration Page

> **File:** `app/(dashboard)/student/courses/page.tsx`

**UI Design:**

```
┌──────────────────────────────────────────────────────┐
│  📚 Course Registration                              │
│  Department: Computer Science / Mathematics (CSC/MAT)│
│                                                      │
│  ┌──────────┐  ┌────────────────────┐                │
│  │ My Courses│  │ Available Courses  │                │
│  └──────────┘  └────────────────────┘                │
│                                                      │
│  ☑ CSC 101 — Introduction to Computer Science  (3cr) │
│  ☑ MAT 101 — Calculus I                        (3cr) │
│  ☐ CSC 201 — Data Structures                   (3cr) │
│  ☐ MAT 201 — Linear Algebra                    (3cr) │
│  ☑ CSC 301 — Operating Systems                 (3cr) │
│                                                      │
│  Selected: 3 courses (9 credit hours)                │
│                                                      │
│  ┌───────────────────────────────────┐               │
│  │     Enroll in Selected Courses    │               │
│  └───────────────────────────────────┘               │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**"My Courses" tab:**
- Shows enrolled courses as cards/table (code, title, credit hours, semester, status)
- Each has an "Unenroll" button (with confirmation dialog)

**"Available Courses" tab:**
- Shows all department courses not yet enrolled in
- Checkboxes for multi-select
- Shows running total of selected courses and credit hours
- "Enroll in Selected" button (disabled if nothing selected)
- Success toast after enrollment, then auto-switch to "My Courses" tab

### 3.3 — Frontend: API Functions & Types

> **File:** `lib/api/student.ts` (new)

```typescript
export function getAvailableCourses(): Promise<Course[]> { ... }
export function getMyCourses(): Promise<Course[]> { ... }
export function enrollInCourses(courseIds: number[]): Promise<void> { ... }
export function unenrollFromCourse(courseId: number): Promise<void> { ... }
```

### 3.4 — Sidebar Update

> **File:** Sidebar component

Add under student navigation:
```typescript
{ label: 'Courses', href: '/student/courses', icon: BookOpen }
```

### Sprint 3 Checklist

- [ ] Create: `StudentCourseController.php`
- [ ] Add routes: 4 student enrollment endpoints in `routes/api.php`
- [ ] Create: `lib/api/student.ts` (frontend API functions)
- [ ] Create: `app/(dashboard)/student/courses/page.tsx` (enrollment UI)
- [ ] Modify: Sidebar — add student "Courses" link
- [ ] API test: all 4 endpoints via curl
- [ ] Build verification: `npx next build` passes
- [ ] Manual test: full enrollment flow

---

## Files Affected — Complete Reference

### New Files (Create)
| File | Purpose |
|------|---------|
| `database/migrations/2026_02_13_000001_add_department_id_to_users_table.php` | Add `department_id` FK to users |
| `database/migrations/2026_02_13_000002_make_password_nullable_on_users_table.php` | Allow NULL passwords for activation flow |
| `app/Http/Controllers/Api/V1/Auth/ActivateAccountController.php` | First-time account activation endpoint |
| `app/Http/Requests/Auth/ActivateAccountRequest.php` | Validation for activation |
| `app/Http/Controllers/Api/V1/Student/StudentCourseController.php` | Student self-enrollment endpoints |
| `frontend/src/app/(auth)/activate/page.tsx` | Activate account page |
| `frontend/src/lib/api/student.ts` | Student API functions |
| `frontend/src/app/(dashboard)/student/courses/page.tsx` | Course registration page |

### Modified Files (Edit)
| File | Changes |
|------|---------|
| `app/Models/User.php` | Add `department_id` to fillable, `department()` relationship, `is_activated` accessor |
| `app/Services/Auth/AuthService.php` | Remove `register()`, add `activate()`, change `login()` to use identifier |
| `app/Http/Controllers/Api/V1/Auth/LoginController.php` | Pass `identifier` instead of `email` |
| `app/Http/Requests/Auth/LoginRequest.php` | `email` → `identifier` |
| `app/Http/Requests/User/CreateUserRequest.php` | Remove password, add `department_id`, conditional student_id/staff_id rules |
| `app/Services/User/UserService.php` | Create without password, add `department_id` |
| `app/Http/Resources/UserResource.php` | Add `department`, `is_activated` |
| `routes/api.php` | Remove register route, add activate + student routes |
| `frontend/src/app/(auth)/login/page.tsx` | Identifier field, activate link, remove register link |
| `frontend/src/lib/api/auth.ts` | Remove `register()`, add `activateAccount()`, update `login()` |
| `frontend/src/lib/types/api.ts` | Remove `RegisterData`, add `ActivateData`, update `LoginData` |
| `frontend/src/app/(dashboard)/admin/users/create/page.tsx` | Remove password fields, add department dropdown |
| `frontend/src/middleware.ts` | Add `/activate` to public routes |
| Sidebar component | Add student "Courses" link |

### Deleted Files (Remove)
| File | Reason |
|------|--------|
| `app/Http/Controllers/Api/V1/Auth/RegisterController.php` | Self-registration removed |
| `app/Http/Requests/Auth/RegisterRequest.php` | Self-registration removed |
| `frontend/src/app/(auth)/register/page.tsx` | Self-registration removed |

## Decisions Resolved

| # | Question | Decision |
|---|----------|----------|
| 1 | **Should email still be a login option?** | **No.** Login strictly by matric number (students) or file number (lecturers/admins). No email login. |
| 2 | **Can a student belong to multiple departments?** | **No pivot table needed.** In this college, departments can be combined (e.g., "Computer Science / Mathematics" = CSC/MAT is a single department record representing a double major). A student has one `department_id` FK. The department name/code itself reflects if it's combined. |
| 3 | **Should lecturers have a department?** | **Yes, required.** Each lecturer belongs to exactly one department (not combined — e.g., "Mathematics"). `department_id` is **required** for both students and lecturers, optional only for admins. |
| 4 | **Enrollment period restrictions?** | **Yes.** Admin sets a registration window via `system_settings` table (keys: `enrollment_start_date`, `enrollment_end_date`). Students can only enroll/unenroll during this window. The backend must check this before processing enrollment requests. See **Sprint 3, Section 3.1** for implementation. |
| 5 | **Credit hour limits per semester?** | **Deferred / Optional.** May be added later as a system setting (`max_credit_hours_per_semester`). Not blocking for initial implementation. |

### Enrollment Window Implementation Notes

The `system_settings` table already exists. Two new settings will be seeded:

| Key | Type | Example Value | Description |
|-----|------|---------------|-------------|
| `enrollment_start_date` | `date` | `2026-03-01` | First day students can enroll |
| `enrollment_end_date` | `date` | `2026-03-15` | Last day students can enroll |

**Backend check (in `StudentCourseController::enroll()`):**
```php
$start = SystemSetting::getValue('enrollment_start_date');
$end   = SystemSetting::getValue('enrollment_end_date');
$today = now()->toDateString();

if ($start && $end && ($today < $start || $today > $end)) {
    return ResponseHelper::error(
        'Course enrollment is currently closed. Enrollment period: ' . $start . ' to ' . $end,
        403
    );
}
```

**Admin UI:** The `/admin/settings` page (future) will allow admins to set these dates. For now, they can be set via the database seeder or direct `system_settings` update.

### Department Model Clarification

Departments in this college system work as follows:
- A department record can represent a **single major** (e.g., "Mathematics" / `MAT`) or a **double/combined major** (e.g., "Computer Science / Mathematics" / `CSC/MAT`)
- Each student belongs to **one** department (FK), but that department may cover multiple subject areas
- Each lecturer belongs to **one** department (not combined — e.g., a math lecturer belongs to "Mathematics")
- Courses have a `department_id` — a course like "CSC 101" belongs to the "Computer Science / Mathematics" department
- When a student of CSC/MAT browses available courses, they see **all courses under the CSC/MAT department**

No schema changes needed for this — the existing `departments` table with `name` and `code` fields already supports combined names.

### Updated Validation Rules (reflecting decisions)

In `CreateUserRequest`:
```php
'department_id' => [
    Rule::requiredIf(in_array($this->input('role'), ['student', 'lecturer'])),
    'nullable', 'integer', 'exists:departments,id',
],
```

---

## Execution Order

```
Sprint 1 (Backend Auth)     →  Sprint 2 (Frontend Auth)     →  Sprint 3 (Enrollment)
━━━━━━━━━━━━━━━━━━━━━━━━━   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━   ━━━━━━━━━━━━━━━━━━━━━━
• Migrations                 • Delete register page           • StudentCourseController
• User model changes         • Create activate page           • Enrollment window check
• Remove register            • Update login page              • Student API routes
• Create activate endpoint   • Update admin user form         • Frontend enrollment page
• Update login endpoint      • Update API types               • Sidebar update
• Update admin create user   • Update middleware              • Seed enrollment settings
• Update UserResource        • Build verification             • Test full flow
• Run tests
```

**Estimated effort:** ~4–6 hours total across all 3 sprints.

