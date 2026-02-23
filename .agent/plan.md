# CBT System — Master Project Plan

> **Last Updated:** 2026-02-21
> **Status:** Phase 1 — ✅ COMPLETE (Verified 2026-02-13)
> **Reference Guides:** `/guides/01–08` (Architecture, DB Schema, API Spec, Backend, Frontend, Security, Deployment, Coding Standards)

---

## How To Use This File

**For every new chat / agent session:**
1. Read this file first to understand what has been completed and what is next.
2. Only work on the **current phase** or the specific task the user requests.
3. After completing a task, update the checkbox `[ ]` → `[x]` and add the completion date.
4. If a task is partially done, note the progress inline (e.g., `[~] 3/5 migrations created`).
5. Reference the specific guide file for implementation details (e.g., `02_DATABASE_SCHEMA.md` for table schemas).

### Status Legend
- `[ ]` — Not started
- `[~]` — In progress / partially done
- `[x]` — Completed
- `[!]` — Blocked / needs attention

---

## Current Project State (Snapshot)

| Area | Status | Details |
|------|--------|---------|
| **Backend Framework** | ✅ Scaffolded | Laravel 12 (PHP 8.2+), Sanctum installed |
| **Frontend Framework** | ✅ Scaffolded | Next.js 16 (App Router), React 19, Tailwind CSS 4, TypeScript |
| **Database** | ✅ Schema Complete | MySQL `cbt_dev` — 23 tables (14 custom CBT + 9 Laravel default), all seeded |
| **Redis** | ✅ Configured | Predis client, session/cache/queue set to Redis in `.env` |
| **Git/GitHub** | ✅ Connected | Repo: `techabdu/cbtsystem` |
| **Custom Models** | ✅ Complete | 14 models: User, Department, Course, CourseEnrollment, CourseLecturer, Question, Exam, ExamQuestion, ExamSession, StudentAnswer, SessionSnapshot, ActivityLog, SystemSetting, Notification |
| **Custom Migrations** | ✅ Complete | 14 custom migrations: users, departments, courses, enrollments, lecturers, questions, exams, exam_questions, exam_sessions, student_answers, session_snapshots, activity_logs, system_settings, notifications |
| **API Routes** | ✅ Complete | 7 auth routes: register, login, logout, me, profile update, refresh, csrf-cookie |
| **Frontend Pages** | ✅ Complete | 8 pages: login, register, student dashboard, lecturer dashboard, admin dashboard, complete-profile, 404, root |
| **Services/Controllers** | ✅ Auth Complete | AuthService, 4 Auth Controllers, RoleMiddleware, ResponseHelper, StrongPassword rule |
| **Agent Workflows** | ✅ Created | 6 workflow files in `.agent/workflows/` |
| **Agent Skills** | ✅ Created | CBT guides skill + frontend-design skill |

---

## PHASE 1: Foundation (Weeks 1–3)
> **Goal:** Development environment, database schema, basic authentication

### Stage 1.1 — Development Environment ✅
> **Guide Reference:** `07_DEPLOYMENT_AND_PHASES.md` (Section: Development Environment Setup)

- [x] Backend scaffolded (Laravel 12 via XAMPP) — 2026-02-11
- [x] Frontend scaffolded (Next.js 16 with Tailwind CSS 4) — 2026-02-11
- [x] MySQL database configured (`cbt_dev` in `.env`) — 2026-02-11
- [x] Redis configured (Predis, session/cache/queue) — 2026-02-11
- [x] Git repository initialized and connected to GitHub — 2026-02-11
- [x] `.env` files configured for local development — 2026-02-11
- [x] Agent workflows and skills created — 2026-02-11
- [x] Create MySQL database `cbt_dev` in phpMyAdmin (if not already created) — 2026-02-12 (verified: DB exists)
- [x] Verify `php artisan migrate` runs successfully against MySQL — 2026-02-12 (10 tables created: cache, cache_locks, failed_jobs, job_batches, jobs, migrations, password_reset_tokens, personal_access_tokens, sessions, users)
- [x] Verify Redis connection works (`php artisan tinker` → `Cache::put/get`) — 2026-02-12 (verified: Cache put/get/forget all working; cache=redis, session=redis, queue=redis, client=predis)

### Stage 1.2 — Database Schema Implementation ✅
> **Guide Reference:** `02_DATABASE_SCHEMA.md` (Full schema with SQL and Laravel migration examples)

**Online Platform Tables:**
- [x] Migration: `users` table (custom CBT schema — uuid, role, student_id, staff_id, security fields, metadata JSON, soft deletes) — 2026-02-12
- [x] Migration: `departments` table — 2026-02-12
- [x] Migration: `courses` table (with department FK) — 2026-02-12
- [x] Migration: `course_enrollments` table (student-course pivot) — 2026-02-12
- [x] Migration: `course_lecturers` table (lecturer-course pivot) — 2026-02-12
- [x] Migration: `questions` table (question bank with JSON options, correct_answer, media, difficulty, tags) — 2026-02-12
- [x] Migration: `exams` table (full exam config — scheduling, rules, access control, proctoring) — 2026-02-12
- [x] Migration: `exam_questions` table (exam-question pivot with ordering and points) — 2026-02-12

**Offline Exam / Session Tables:**
- [x] Migration: `exam_sessions` table (CRITICAL — session tracking, timing, progress, recovery, integrity, violations) — 2026-02-12
- [x] Migration: `student_answers` table (CRITICAL — high-write, versioning, auto-save) — 2026-02-12
- [x] Migration: `session_snapshots` table (auto-save state backups) — 2026-02-12
- [x] Migration: `activity_logs` table (comprehensive audit trail) — 2026-02-12
- [x] Migration: `system_settings` table (key-value config store) — 2026-02-12
- [x] Migration: `notifications` table — 2026-02-12

**Post-Migration:**
- [x] Create database seeder: Admin user (`admin@cbt.edu`, role=admin) — 2026-02-12
- [x] Create database seeder: Sample departments (CS, ENG, MTH, PHY, BIO, BUS) — 2026-02-12
- [x] Create database seeder: Sample courses (8 courses across departments) — 2026-02-12
- [x] Create database seeder: System settings defaults (11 settings) — 2026-02-12
- [x] Create database seeder: Sample lecturer & student users (2 lecturers, 5 students) — 2026-02-12
- [x] Add performance indexes (composite indexes from guide) — 2026-02-12
- [x] Run full migration + seed and verify — 2026-02-12 (17 migrations, 5 seeders, 23 tables, all verified)

### Stage 1.3 — Eloquent Models ✅
> **Guide Reference:** `04_BACKEND_ARCHITECTURE.md` (Model patterns) + `02_DATABASE_SCHEMA.md` (relationships)

- [x] Model: `User` (UUID boot, role scopes, enrollments/courses/exams/sessions/logs relationships, login tracking, full_name accessor) — 2026-02-12
- [x] Model: `Department` (courses relationship, active scope) — 2026-02-12
- [x] Model: `Course` (UUID, department/students/lecturers/questions/exams relationships, semester/year/level scopes) — 2026-02-12
- [x] Model: `CourseEnrollment` (student/course relationships, status scopes) — 2026-02-12
- [x] Model: `CourseLecturer` (lecturer/course relationships, role scopes) — 2026-02-12
- [x] Model: `Question` (UUID, JSON casts, hidden correct_answer, exams/creator/verifier relationships, type/difficulty scopes) — 2026-02-12
- [x] Model: `Exam` (UUID, datetime/boolean/JSON casts, questions pivot, sessions, published/upcoming/ongoing scopes, time window helpers) — 2026-02-12
- [x] Model: `ExamQuestion` (pivot with exam/question relationships, no updated_at) — 2026-02-12
- [x] Model: `ExamSession` (CRITICAL — UUID + session token boot, JSON casts, answers/snapshots/logs relationships, violation recording, time remaining helper) — 2026-02-12
- [x] Model: `StudentAnswer` (custom timestamps, JSON selected_option, final/flagged/latestVersions scopes) — 2026-02-12
- [x] Model: `SessionSnapshot` (immutable, JSON snapshot_data, type scopes) — 2026-02-12
- [x] Model: `ActivityLog` (immutable, JSON old/new values, static log() factory method, entity/date scopes) — 2026-02-12
- [x] Model: `SystemSetting` (static getValue/setValue/getPublicSettings, type casting) — 2026-02-12
- [x] Model: `Notification` (user relationship, read/unread scopes, markAsRead helpers) — 2026-02-12

### Stage 1.4 — Authentication System ✅ (Verified 2026-02-13)
> **Guide Reference:** `03_API_SPECIFICATION.md` (Auth endpoints) + `06_SECURITY_IMPLEMENTATION.md` (JWT, password policy)
> **⚠️ REFACTOR PENDING:** Self-registration will be replaced with admin-provisioned activation flow. Login will change from email to identifier (matric/file number). See **Stage 2.3.5** and `.agent/auth-enrollment-refactor-plan.md`.

- [x] Install JWT package (e.g., `firebase/php-jwt` or `tymon/jwt-auth`, or use Sanctum tokens) — **Used Sanctum (already installed)**
- [x] Create `AuthService` (login, register, logout, refresh, token generation) — 2026-02-12
- [x] Create `JwtService` (if using raw JWT; or configure Sanctum token-based auth) — **Configured Sanctum token-based auth**
- [x] Create `RegisterController` — `POST /api/v1/auth/register` (auto-login after register) — 2026-02-12
- [x] Create `LoginController` — `POST /api/v1/auth/login` — 2026-02-12
- [x] Create `LogoutController` — `POST /api/v1/auth/logout` — 2026-02-12
- [x] Create auth route: `GET /api/v1/auth/me` (current user) — 2026-02-12
- [x] Create auth route: `POST /api/v1/auth/refresh` (returns user + new token) — 2026-02-12
- [x] Create auth route: `PUT /api/v1/auth/profile` (profile update) — 2026-02-13
- [x] Create `StrongPassword` validation rule — 2026-02-12
- [x] Create `RoleMiddleware` (admin, lecturer, student) — 2026-02-12
- [x] Create `Authenticate` middleware (JWT/Sanctum guard for API) — **Configured via bootstrap/app.php exception handler**
- [x] Form Request: `RegisterRequest` (validation + sanitization) — 2026-02-12
- [x] Form Request: `LoginRequest` — 2026-02-12
- [x] Form Request: `UpdateProfileRequest` (profile update validation) — 2026-02-13
- [x] API Resource: `UserResource` (response transformer, includes `is_profile_complete`) — 2026-02-12, updated 2026-02-13
- [x] User Model: `is_profile_complete` computed attribute (checks phone + student_id/staff_id) — 2026-02-13
- [x] Configure CORS for frontend (`http://localhost:3000`) — 2026-02-12
- [x] Test: Registration flow (6 tests) ✅
- [x] Test: Login flow (token returned) (14 tests) ✅
- [x] Test: Protected route access (7 tests) ✅
- [x] Test: Role-based access control (included in AuthMiddlewareTest) ✅
- [x] **API verification: All 7 auth endpoints tested via curl** — 2026-02-13
  - ✅ POST /register — returns user + token, validates duplicates + password strength
  - ✅ POST /login — returns user + token, updates last_login_at
  - ✅ GET /me — returns authenticated user with is_profile_complete
  - ✅ PUT /profile — updates profile fields, flips is_profile_complete
  - ✅ POST /refresh — returns user + new token
  - ✅ POST /logout — invalidates token
  - ✅ Token invalidation verified (401 after logout)

### Stage 1.5 — Frontend Foundation ✅ (Verified 2026-02-13)
> **Guide Reference:** `05_FRONTEND_ARCHITECTURE.md` (project structure, API client, auth store)

- [x] Create project directory structure (`app/(auth)`, `app/(dashboard)`, `components/`, `lib/`, etc.) — 2026-02-12
- [x] Install core dependencies: `axios`, `zustand`, `react-hook-form`, `zod`, `lucide-react`, `date-fns` — 2026-02-12
- [x] Create API client (`lib/api/client.ts` — Axios instance with interceptors, correct response parsing) — 2026-02-12, fixed 2026-02-13
- [x] Create auth API functions (`lib/api/auth.ts` — login, register, logout, me, refresh, updateProfile) — 2026-02-12, updated 2026-02-13
- [x] Create auth store (`lib/store/authStore.ts` — Zustand persist + Cookies for middleware, hydration tracking) — 2026-02-12, refactored 2026-02-13
- [x] Create TypeScript types (`lib/types/api.ts`, `lib/types/models.ts` — matches UserResource exactly) — 2026-02-12, updated 2026-02-13
- [x] Create constants file (`lib/constants.ts`) — 2026-02-12
- [x] Build Login page (`app/(auth)/login/page.tsx`) — 2026-02-12
- [x] Build Register page (`app/(auth)/register/page.tsx`) — 2026-02-12
- [x] Build Auth layout (`app/(auth)/layout.tsx` — split panel with branding) — 2026-02-12, refined 2026-02-13
- [x] Create `middleware.ts` (Edge middleware — role-based route protection using auth_token + auth_user_role cookies) — 2026-02-12, rewritten 2026-02-13
- [x] Build Dashboard layout (`app/(dashboard)/layout.tsx` — client-side auth guard + role check, all redirects in useEffect) — 2026-02-12, fixed 2026-02-13
- [x] Build Student dashboard (`app/(dashboard)/student/page.tsx` — stats cards + profile info + profile completion gate) — 2026-02-12, enhanced 2026-02-13
- [x] Build Lecturer dashboard (`app/(dashboard)/lecturer/page.tsx` — stats cards + profile info) — 2026-02-12, enhanced 2026-02-13
- [x] Build Admin dashboard (`app/(dashboard)/admin/page.tsx` — stats cards + profile info) — 2026-02-12, enhanced 2026-02-13
- [x] Build Complete Profile page (`app/(dashboard)/student/complete-profile/page.tsx` — mandatory for students without phone) — 2026-02-13
- [x] Create shared UI components: Button, Input, Card, Label — 2026-02-12
- [x] Create Dashboard components: Header (role badge, user avatar, logout), Sidebar (role-filtered nav) — 2026-02-12, refined 2026-02-13
- [x] Create Form components: LoginForm (error handling, role redirect), RegisterForm (password strength, field errors) — 2026-02-12, refined 2026-02-13
- [x] Implement role-based redirect after login (middleware + LoginForm + DashboardLayout) — 2026-02-13
- [x] Implement mandatory profile completion flow (register → complete-profile → dashboard) — 2026-02-13
- [x] **Frontend build verification: 0 TypeScript errors, 10 routes compiled** — 2026-02-13
- [x] **28 backend tests passing (96 assertions)** — Verified 2026-02-13

---

## PHASE 2: Core Features — Online Platform (Weeks 4–6)
> **Goal:** User management, course management, question bank

### Stage 2.1 — User Management (Admin) ✅
> **Guide Reference:** `03_API_SPECIFICATION.md` (User Management section)

- [x] Service: `UserService` (list with search/filter/paginate, create, show, update, soft-delete, restore, toggleActive, activity logging) — 2026-02-13
- [x] Controller: `UserController` — 7 actions (index, store, show, update, destroy, restore, toggleActive) — 2026-02-13
- [x] Form Requests: `CreateUserRequest`, `UpdateUserRequest` (with StrongPassword rule, unique constraints) — 2026-02-13
- [x] API Routes: `GET/POST /api/v1/users`, `GET/PUT/DELETE /api/v1/users/{id}`, `POST /api/v1/users/{id}/restore`, `PATCH /api/v1/users/{id}/toggle-active` — all behind `role:admin` — 2026-02-13
- [x] API Resource: `UserResource` (existing, reused), `ResponseHelper::paginated()` enhanced with `$resourceClass` parameter — 2026-02-13
- [x] Frontend: API functions (`src/lib/api/users.ts`) — getUsers, getUser, createUser, updateUser, deleteUser, restoreUser, toggleUserActive — 2026-02-13
- [x] Frontend: Types extended (`src/lib/types/api.ts`) — PaginatedResponse, CreateUserData, UpdateUserData, UserFilters — 2026-02-13
- [x] Frontend: Admin Users list page (`/admin/users`) — stats cards, search/filter bar, responsive table, role/status badges, action dropdowns, pagination — 2026-02-13
- [x] Frontend: Create User form (`/admin/users/create`) — multi-card layout, role-conditional fields, password visibility toggle, field-level errors — 2026-02-13
- [x] Frontend: User detail + edit page (`/admin/users/[id]`) — view mode (info + status cards), edit mode (multi-card form), toggle-active, delete — 2026-02-13
- [x] Frontend: Soft delete / deactivate user — via action dropdown on list page and buttons on detail page — 2026-02-13
- [x] **API verification: All 7 user management endpoints tested via curl** — 2026-02-13
- [x] **Build verification: `npx next build` passes with 0 TypeScript errors** — 2026-02-13

### Stage 2.2 — Department Management (Admin) ✅
- [x] Service: `DepartmentService` (list/search/filter/paginate, allActive for dropdowns, CRUD, delete-with-active-courses guard, activity logging) — 2026-02-13
- [x] Controller: `DepartmentController` — 5 actions (index, allActive, show, store, update, destroy) — 2026-02-13
- [x] Form Requests: `CreateDepartmentRequest`, `UpdateDepartmentRequest` — 2026-02-13
- [x] API Resource: `DepartmentResource` (includes courses_count) — 2026-02-13
- [x] API Routes: Admin CRUD + `GET /departments/active` (any auth user) — 6 routes behind `role:admin` — 2026-02-13
- [x] Frontend: API functions (`src/lib/api/departments.ts`) — getDepartments, getActiveDepartments, getDepartment, createDepartment, updateDepartment, deleteDepartment — 2026-02-13
- [x] Frontend: Types (`Department` model, `CreateDepartmentData`, `UpdateDepartmentData`, `DepartmentFilters`) — 2026-02-13
- [x] Frontend: Admin Departments page (`/admin/departments`) — inline create/edit form, search, responsive table with code badges, course counts, status toggles, inline actions — 2026-02-13
- [x] Frontend: Sidebar link added (Building2 icon) — 2026-02-13
- [x] Seeder: Already has 6 realistic departments (CS, ENG, MTH, PHY, BIO, BUS) from Phase 1 — verified
- [x] **API verification: All 6 department endpoints tested via curl** — 2026-02-13
- [x] **Build verification: `npx next build` passes with 0 TypeScript errors** — 2026-02-13

### Stage 2.3 — Course Management ✅ COMPLETE
> **Guide Reference:** `03_API_SPECIFICATION.md` (Course Management section)
> **Completed:** 2026-02-13

- [x] Service: `CourseService` — list/filter/paginate (role-aware), CRUD, student enrollment/unenrollment, bulk enrollment, lecturer assignment/unassignment, activity logging — 2026-02-13
- [x] Controller: `CourseController` — index (admin=all, lecturer=assigned, student=enrolled), show, store, update, destroy, students, lecturers — 2026-02-13
- [x] Controller: `EnrollmentController` — enroll, unenroll, bulkEnroll — 2026-02-13
- [x] Controller: `CourseLecturerController` — assign, unassign — 2026-02-13
- [x] Form Requests: `CreateCourseRequest`, `UpdateCourseRequest` — 2026-02-13
- [x] API Resource: `CourseResource` — nested department, relationship counts, optional lecturers — 2026-02-13
- [x] API Routes: 12 course endpoints (CRUD, students, lecturers, enrollment, lecturer assignment) — 2026-02-13
- [x] Frontend: Types (`Course` model extended, `CreateCourseData`, `UpdateCourseData`, `CourseFilters`, enrollment/lecturer types) — 2026-02-13
- [x] Frontend: API client (`courses.ts`) — all CRUD, enrollment, and lecturer assignment functions — 2026-02-13
- [x] Frontend: Admin Courses list page (`/admin/courses`) — stats cards, inline create/edit form, department/level/semester filters, responsive table, pagination — 2026-02-13
- [x] Frontend: Admin Course detail page (`/admin/courses/[id]`) — stats cards, tabbed students/lecturers, inline enroll/assign forms with user search — 2026-02-13
- [x] Frontend: Sidebar link already present (BookOpen icon) — verified
- [x] **Build verification: `npx tsc --noEmit` passes with 0 TypeScript errors** — 2026-02-13
- [x] **Route verification: All 12 course API routes registered** — 2026-02-13
- [ ] Frontend: Lecturer Courses page (assigned courses only) — deferred to Phase 3 integration
- [ ] Frontend: Student Courses page (enrolled courses) — **moved to Stage 2.3.5 (student self-enrollment)**

### Stage 2.3.5 — Auth & Enrollment Refactor ✅ COMPLETE
> **Detailed Plan:** `.agent/auth-enrollment-refactor-plan.md`
> **Scope:** Replace self-registration with activation flow + Student self-service course enrollment

**Key Decisions:**
- ❌ No self-registration — admin pre-creates users without passwords
- 🔑 Students & lecturers "activate" by entering matric/file number and creating a password
- 🔐 Login uses matric number (students) / file number (lecturers) — NOT email
- 🏫 Students & lecturers each belong to one department (`department_id` FK on users)
- 📚 Students self-enroll in courses from their department
- 📅 Enrollment window set by admin via `system_settings` (`enrollment_start_date`, `enrollment_end_date`)

**Sprint 1 — Database + Backend Auth: ✅ COMPLETE**
- [x] Migration: Add `department_id` FK to `users` table — 2026-02-13
- [x] Migration: Make `password` nullable on `users` table — 2026-02-13
- [x] Migration: Add `staff_id` composite index — 2026-02-13
- [x] User Model: Add `department_id` fillable, `department()` relationship, `is_activated` accessor, `notActivated`/`inDepartment` scopes — 2026-02-13
- [x] Delete: `RegisterController.php`, `RegisterRequest.php` — 2026-02-13
- [x] Create: `ActivateAccountController.php`, `ActivateAccountRequest.php` — 2026-02-13
- [x] Modify: `AuthService.php` — remove `register()`, add `activate()`, change `login()` to use identifier — 2026-02-13
- [x] Modify: `LoginRequest.php`, `LoginController.php` — `email` → `identifier` — 2026-02-13
- [x] Modify: `CreateUserRequest.php` — remove password, add `department_id` (required for student/lecturer) — 2026-02-13
- [x] Modify: `UserService::create()` — no password, add `department_id` — 2026-02-13
- [x] Modify: `UserResource.php` — add `department`, `is_activated` — 2026-02-13
- [x] Modify: `routes/api.php` — remove register, add activate — 2026-02-13
- [x] Modify: `AuthController@me` — load department relation — 2026-02-13
- [x] **API verification:** Admin create user (no password), activate, login by identifier, error cases — all tested — 2026-02-13
- [ ] Update existing tests (register tests need removal, activate + login tests need updating)

**Sprint 2 — Frontend Auth: ✅ COMPLETE**
- [x] Delete: Register page, RegisterForm — 2026-02-13
- [x] Create: Activate Account page (`app/(auth)/activate/page.tsx`) + `ActivateForm.tsx` — 2026-02-13
- [x] Modify: Login page — identifier field (matric/file/email), activate link — 2026-02-13
- [x] Modify: `lib/api/auth.ts` — replaced `register()` with `activateAccount()` — 2026-02-13
- [x] Modify: `lib/types/api.ts` — `LoginCredentials.identifier`, `ActivateAccountData`, removed pwd from `CreateUserData` — 2026-02-13
- [x] Modify: `lib/types/models.ts` — added `department_id`, `department`, `is_activated` to User — 2026-02-13
- [x] Modify: `lib/store/authStore.ts` — replaced `register()` with `activateAccount()` — 2026-02-13
- [x] Modify: Admin Create User page — removed password fields, added department dropdown, info banner — 2026-02-13
- [x] Modify: `middleware.ts` — replaced `/register` with `/activate` in public routes — 2026-02-13
- [x] Modify: `constants.ts` — REGISTER → ACTIVATE — 2026-02-13
- [x] Modify: `app/page.tsx` — register links → activate links — 2026-02-13
- [x] **Build verification: 0 TypeScript errors** ✅ — 2026-02-13

**Sprint 3 — Combination Management:** ✅ COMPLETE
> NCE two-subject combination system: each student studies two departments (first + second major).
> Some specialized fields use "Double Major" (single dept studied in depth).
> Lecturers remain single-department. Admins have no department.

**Sprint 3a — Database + Backend:**
- [x] Migration: Create `combinations` table (`id`, `code`, `name`, `first_department_id` FK, `second_department_id` FK, `is_double_major` boolean, `is_active`, timestamps, soft deletes)
- [x] Migration: Add `combination_id` FK to `users` table (nullable, for students)
- [x] Model: Create `Combination` model with relationships (`firstDepartment`, `secondDepartment`, `students`)
- [x] Model: Update `User` — add `combination_id` fillable, `combination()` relationship, `departmentIds()` accessor
- [x] Service: Create `CombinationService` (CRUD, list with filters)
- [x] Controller: Create `CombinationController` (index, store, show, update, destroy, restore)
- [x] Requests: `CreateCombinationRequest`, `UpdateCombinationRequest`
- [x] Resource: `CombinationResource` (includes nested departments)
- [x] Routes: CRUD under `/api/v1/combinations` (admin only) + `GET /api/v1/combinations/active` (public)
- [x] Seeder: Seed sample combinations (CS/MTH, ENG/HIS, BIO/CHM, PHE double-major, etc.)
- [x] Update `CreateUserRequest` — students require `combination_id` (not `department_id`)
- [x] Update `UserService::create()` — set `combination_id` for students
- [x] Update `UserResource` — include `combination` with nested departments
- [x] API verification

**Sprint 3b — Frontend:**
- [x] Types: Add `Combination` to `models.ts`, `CreateCombinationData`/`UpdateCombinationData` to `api.ts`
- [x] API: Create `lib/api/combinations.ts`
- [x] Page: Admin Combinations list (`/admin/combinations`)
- [x] Page: Admin Create Combination (`/admin/combinations/create`)
- [x] Page: Admin Edit Combination (`/admin/combinations/[id]`)
- [x] Update: Admin Create User — students pick **combination** dropdown, lecturers pick **department** dropdown
- [x] Update: `User` model type — add `combination_id`, `combination` fields
- [x] Sidebar: Add "Combinations" link under admin nav
- [x] Build verification: 0 TypeScript errors

**Sprint 4 — Student Course Enrollment:** ✅ COMPLETE
> Uses student's `combination_id` → resolves to two department IDs → filters available courses
- [x] Create: `StudentCourseController.php` — available-courses, my-courses, enroll, unenroll — 2026-02-14
- [x] Add enrollment window check via `system_settings` (`enrollment_start_date`, `enrollment_end_date`) — 2026-02-14
- [x] Seed: `enrollment_start_date` and `enrollment_end_date` in system_settings (`EnrollmentSettingsSeeder.php`) — 2026-02-14
- [x] Add routes: 4 student enrollment endpoints (`GET /available`, `GET /enrolled`, `POST /enroll`, `POST /unenroll` under `student/courses` with `role:student`) — 2026-02-14
- [x] Create: `lib/api/student.ts` (frontend API — `getAvailableCourses`, `getEnrolledCourses`, `enrollInCourse`, `unenrollFromCourse`) — 2026-02-14
- [x] Create: Student Courses page (`/student/courses`) — "My Courses" + "Available Courses" tabs with `CourseCard` component (300 lines) — 2026-02-14
- [x] Modify: Sidebar — add student "My Courses" link — 2026-02-14
- [x] API test + build verification — **Verified 2026-02-20**: 4 routes registered, TypeScript 0 errors, enrollment settings seeded in DB


### Stage 2.4 — Question Bank ✅ COMPLETE
> **Guide Reference:** `03_API_SPECIFICATION.md` (Question Bank section) + `04_BACKEND_ARCHITECTURE.md`

- [x] Service: `QuestionService` — list (role-aware), CRUD, verify, bulk upload (JSON), stats, activity logging — 2026-02-20
- [x] Controller: `QuestionController` — index, show, store, update, destroy, restore, verify, bulkUpload, stats — 2026-02-20
- [x] Form Requests: `CreateQuestionRequest`, `UpdateQuestionRequest` (conditional validation for MCQ options, correct_answer) — 2026-02-20
- [x] API Resource: `QuestionResource` (conditional correct_answer exposure — admin/creator only) — 2026-02-20
- [x] API Routes: 9 endpoints (`GET/POST /questions`, `GET/PUT/DELETE /questions/{id}`, `POST /questions/bulk-upload`, `GET /questions/stats`, `POST /questions/{id}/restore`, `PATCH /questions/{id}/verify`) — 2026-02-20
- [x] Frontend Types: `Question` model + `CreateQuestionData`, `UpdateQuestionData`, `QuestionFilters`, `BulkUploadData`, `BulkUploadResult`, `QuestionStats` — 2026-02-20
- [x] Frontend API: `lib/api/questions.ts` — all CRUD + stats + verify + bulk upload — 2026-02-20
- [x] Frontend Page: Lecturer Questions page (`/lecturer/questions`) — stats cards, inline create/edit form with MCQ option builder, T/F/Fill-in/Essay support, course/type/difficulty filters, preview toggle, verify action, pagination — 2026-02-20
- [x] UX Fix: Scroll-to-form behavior on Departments, Combinations, Levels, Courses, and Questions pages — auto-scroll + auto-focus on create/edit — 2026-02-20
- [x] Build verification: 0 TypeScript errors, 9 backend routes registered — 2026-02-20
- [ ] Frontend: Bulk upload page (JSON upload with progress + error report) — deferred
- [ ] Frontend: Image upload for question media — deferred

### Stage 2.5 — HOD Course Assignment ✅ COMPLETE
> **Feature:** Head of Department can assign courses to lecturers in their department.
> Lecturers see their assigned courses and set questions per course.
> **Design:** `is_hod` boolean flag on users table (not a separate role).

**Sprint 1 — Backend:**
- [x] Migration: Add `is_hod` boolean to `users` table (default false, composite index) — 2026-02-20
- [x] User Model: Add `is_hod` to fillable + casts, `isHod()` helper, `scopeHod()` scope — 2026-02-20
- [x] UserResource: Expose `is_hod` (for lecturers only) — 2026-02-20
- [x] CreateUserRequest / UpdateUserRequest: Allow `is_hod` field — 2026-02-20
- [x] UserService: Enforce one-HOD-per-department on create/update (auto-demote previous HOD) — 2026-02-20
- [x] Controller: `HodController` — 5 actions (departmentLecturers, departmentCourses, assignments, assignCourse, unassignCourse) — 2026-02-20
- [x] Controller: `LecturerCourseController` — myCourses (lecturer's assigned courses) — 2026-02-20
- [x] API Routes: 5 HOD routes + 1 lecturer route (all behind `role:lecturer`, HOD checks `is_hod` internally) — 2026-02-20
- [x] Security: All HOD actions scoped to own department only, activity logging — 2026-02-20

**Sprint 2 — Frontend:**
- [x] Types: Add `is_hod` to `User` model + `CreateUserData` + `UpdateUserData` + `HodAssignment` + `HodAssignCourseData` — 2026-02-20
- [x] API client: `lib/api/hod.ts` — getHodLecturers, getHodCourses, getHodAssignments, hodAssignCourse, hodUnassignCourse, getLecturerMyCourses — 2026-02-20
- [x] Admin Create User page: HOD checkbox toggle (appears for lecturer role, with warning about one-per-dept) — 2026-02-20
- [x] Admin User Detail page: HOD badge in view mode, HOD toggle in edit mode, HOD status in status card — 2026-02-20
- [x] Sidebar: HOD-only "Course Assignments" link (uses `hodOnly` flag + `user.is_hod` check) — 2026-02-20
- [x] Page: Lecturer Course Assignments (`/lecturer/course-assignments`) — HOD dashboard with stats, collapsible course-lecturer table, assign/unassign workflow — 2026-02-20
- [x] Page: Lecturer My Courses (`/lecturer/courses`) — course cards with student/question/exam counts, direct link to question bank — 2026-02-20
- [x] Build verification: 0 TypeScript errors, 6 new backend routes — 2026-02-20

---

## PHASE 3: Exam Management (Weeks 7–9)
> **Goal:** Exam creation, configuration, practice exams, notifications

### Stage 3.1 — Exam Creation & Configuration ✅ COMPLETE
> **Guide Reference:** `03_API_SPECIFICATION.md` (Exam Management section)
> **Completed:** 2026-02-21

- [x] Service: `ExamService` — list (role-aware paginated, withCount), find, create, update (blocks restricted fields on published), delete, restore, addQuestions (DB::upsert + recalc marks), removeQuestion, publish (validates draft + min 1 question), getResults, getStats — 2026-02-21
- [x] Controller: `ExamController` — index, show, store, update, destroy, restore, addQuestions, removeQuestion, publish, results, stats (with ownership checks for lecturers) — 2026-02-21
- [x] Controller: `StudentExamController` — index (published non-practice exams for enrolled courses), show (hides correct_answer + password) — 2026-02-21
- [x] Form Requests: `CreateExamRequest`, `UpdateExamRequest`, `AddExamQuestionsRequest` — 2026-02-21
- [x] API Resource: `ExamResource` (conditional correct_answer exposure, whenLoaded relationships) — 2026-02-21
- [x] API Routes: 16 routes total — exam CRUD + publish + results + stats + student/exams + student/practice-exams — 2026-02-21
- [x] Frontend Types: Extended `Exam`, `ExamQuestion`, `ExamStats`, `ExamResults`, `PracticeSubmitResult` in `models.ts` + 5 API types in `api.ts` — 2026-02-21
- [x] Frontend API: `lib/api/exams.ts` — 15 functions (lecturer/admin CRUD + student + practice) — 2026-02-21
- [x] Frontend: Exam list page (`/lecturer/exams`) — stats cards, filter bar, exam table with badges, pagination, publish/results/delete actions — 2026-02-21
- [x] Frontend: 3-step exam creation wizard (`/lecturer/exams/create`) — basic info → schedule/config → review — 2026-02-21
- [x] Frontend: Exam detail page (`/lecturer/exams/[id]`) — Overview/Questions/Results tabs, inline edit, add-from-question-bank, publish dialog — 2026-02-21
- [x] Frontend: Student exam list (`/student/exams`) — Available Now / Upcoming / Past sections — 2026-02-21
- [x] Build verification: 0 PHP syntax errors, 16 routes registered, 0 TypeScript errors — 2026-02-21

### Stage 3.2 — Practice Exam System ✅ COMPLETE
> **Completed:** 2026-02-21

- [x] Backend: `PracticeExamController` — index, show, submit (one-shot grading: MCQ/T-F exact match, fill-in-blank similar_text ≥80%, essay=0pts; returns results WITH correct_answer) — 2026-02-21
- [x] Backend: Creates `ExamSession` (status='submitted') + all `StudentAnswer` records (is_final=true) on submit — simplified vs full Stage 4 session management — 2026-02-21
- [x] Frontend: Practice exam list (`/student/practice`) — grid of cards, teal color scheme, course badge, stats — 2026-02-21
- [x] Frontend: Practice exam interface (`/student/practice/[id]`) — one-at-a-time questions, progress bar, numbered dot grid, MCQ/T-F/fill-in-blank/essay input components, submit confirmation dialog — 2026-02-21
- [x] Frontend: Practice results page (`/student/practice/[id]/results`) — score summary card (pass/fail), per-question breakdown with correct answers — via sessionStorage — 2026-02-21
- [x] Sidebar: Student "My Exams" + "Practice" links added — 2026-02-21
- [x] Build verification: 0 TypeScript errors, 3 practice routes registered — 2026-02-21

### Stage 3.2.1 — Correction: Strict Exam Publishing Workflow ✅ 2026-02-22
> **Note:** As discussed, the system must enforce a strict chain of custody for college exams.
- [x] Migration: Extend exams ENUM with `pending_review` and `verified` statuses
- [x] Exam model: Added `isPendingReview()`, `isVerified()`, `scopePendingReview()`, `scopeVerified()`
- [x] ExamService: `submitForReview()`, `verifyExam()`, `rejectExam()`; `publish()` restricted to verified-only; `getStats()` includes new status counts
- [x] ExamController: `submitForReview`, `verifyExam`, `rejectExam` actions; `publish` restricted to admin-only
- [x] Routes: Added `submit-for-review`, `verify`, `reject` routes
- [x] Frontend: `models.ts` status union updated; `ExamStats` updated; `exams.ts` API client has all workflow functions
- [x] Frontend: `lecturer/exams/[id]/page.tsx` — workflow-aware action buttons (Submit for Review / Verify / Reject / Publish); reject dialog
- [x] Frontend: `lecturer/exam-reviews/page.tsx` — HOD-only review queue page
- [x] Frontend: `admin/exams/page.tsx` — Admin exam management with publish action for verified exams
- [x] Frontend: Sidebar updated with "Exam Reviews" (HOD) and "Exams" (admin) links

### Stage 3.3 — Notifications System ✅ 2026-02-22
- [x] Service: `NotificationService` (`notify`, `notifyMany`, `listForUser`, `unreadCount`, `markAsRead`, `markAllAsRead`, `delete`)
- [x] Job: `SendBulkNotifications` (queueable, ShouldQueue)
- [x] Backend: In-app notification CRUD (`GET /api/v1/notifications`, mark as read, mark all read, delete)
- [x] Notification model: Fixed fillable (`sent_via` not `channels`/`metadata`)
- [x] NotificationController: index, unreadCount, markAsRead, markAllAsRead, destroy
- [x] Routes: Full notification CRUD routes registered
- [x] Frontend: `notifications.ts` API client (getNotifications, getUnreadCount, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification)
- [x] Frontend: `Notification` interface added to models.ts
- [x] Frontend: `NotificationBell` dropdown component in dashboard header (auto-refreshes every 60s)
- [x] Frontend: `/notifications` page — paginated list with mark-read, delete, unread filter
- [x] Frontend: Sidebar updated with "Notifications" link (all roles)

---

## PHASE 4: Exam Taking System (Weeks 10–12) — ⚠️ CRITICAL
> **Goal:** Robust exam interface, auto-save, session recovery, grading

### Stage 4.1.1 — Offline Exam Entry Refactor 
> **Goal:** Streamline the exam entry process for the offline lab architecture, allowing students to start exams directly using their Matric Number and an Exam Access Code.

- [ ] Backend: Migration `2026_02_23_000001_add_access_code_to_exams_table` — `access_code` (string 32, unique, nullable) added to `exams` table — 2026-02-23
- [ ] Backend: `Exam` model — `access_code` added to `$fillable` — 2026-02-23
- [ ] Backend: `OfflineEntryRequest` form request (`matric_number` + `access_code` validation) — 2026-02-23
- [ ] Backend: `OfflineEntryController@start` — finds student by matric, finds exam by access_code, validates published + time window + active account, calls `SessionService::startSession()`, issues short-lived Sanctum token, logs activity — 2026-02-23
- [ ] Backend: Route `POST /api/v1/offline-exams/start` registered outside `auth:sanctum` middleware (public) — 2026-02-23
- [ ] Frontend: `OfflineEntryData` + `OfflineEntryResult` types added to `api.ts` — 2026-02-23
- [ ] Frontend: `startOfflineExam()` added to `lib/api/sessions.ts` (raw axios, no auth header) — 2026-02-23
- [ ] Frontend: `app/(offline)/layout.tsx` — bare passthrough layout — 2026-02-23
- [ ] Frontend: `app/(offline)/exams/page.tsx` — full-screen kiosk entry page (dark slate theme, matric + access code form, sets auth cookies, redirects to `/exam/{sessionId}`) — 2026-02-23
- [ ] Frontend: `middleware.ts` — `/exams` added to `PUBLIC_PATHS` — 2026-02-23
- [ ] Frontend: `/student/exams` page — "Start Exam" button removed for real exams, replaced with "Report to the exam lab" notice; dialog + dead state removed — 2026-02-23
- [ ] **Verification: 0 PHP syntax errors, route registered, 0 TypeScript errors** — 2026-02-23

### Stage 4.1.2 — Exam Session Backend
> **Guide Reference:** `04_BACKEND_ARCHITECTURE.md` (SessionService, RecoveryService, GradingService)

- [ ] Service: `SessionService` (start session, save answer, submit, recover)
- [ ] Service: `RecoveryService` (snapshots, Redis caching, crash recovery)
- [ ] Service: `GradingService` (grade by question type: MCQ, T/F, fill-in-blank, essay manual flag)
- [ ] Controller: `SessionController` — start, status, current question, navigate
- [ ] Controller: `AnswerController` — save answer, get saved answers
- [ ] API Routes: All exam session endpoints (`POST /start`, `GET /status`, `POST /answers`, `POST /submit`, `POST /recover`, `GET /questions/{index}`)
- [ ] Event: `ExamStarted`, `ExamSubmitted`, `AnswerSaved`
- [ ] Listener: `LogExamActivity`
- [ ] Job: `ProcessExamResults`
- [ ] Snapshot auto-creation logic (every 5 min or 10 answers)
- [ ] Auto-submit on session timeout (background job)

### Stage 4.2 — Exam Interface Frontend
> **Guide Reference:** `05_FRONTEND_ARCHITECTURE.md` (Exam components, hooks)

- [ ] Hook: `useExamSession` (session state, navigation, save, submit)
- [ ] Hook: `useAutoSave` (queue-based auto-save every 5 seconds)
- [ ] Hook: `useTimer` (countdown with formatting, expiry detection)
- [ ] Component: `QuestionDisplay` (renders MCQ, T/F, essay, fill-in-blank)
- [ ] Component: `AnswerInput` (input components per question type)
- [ ] Component: `ExamTimer` (prominent countdown display, warning colors at low time)
- [ ] Component: `ExamNavigation` (prev/next, question grid, flag indicators)
- [ ] Component: `ExamSubmitDialog` (confirmation with unanswered question count)
- [ ] Page: `app/exam/[sessionId]/page.tsx` (full-screen exam interface)
- [ ] Browser tab/unload warning during active exam
- [ ] Recovery UI — "Resume from where you left off" on reconnect
- [ ] Saving indicator (auto-save status display)

### Stage 4.3 — Results & Grading
- [ ] Backend: Auto-grading on submit (MCQ, T/F, fill-in-blank)
- [ ] Backend: Essay questions marked as "manual grading pending"
- [ ] Backend: Exam results endpoint (`GET /api/v1/exams/{id}/results`)
- [ ] Backend: Student individual result endpoint
- [ ] Frontend: Student results page (score, percentage, pass/fail)
- [ ] Frontend: Lecturer results view (class statistics: avg, highest, lowest, pass rate)
- [ ] Frontend: Individual student result detail (per-question breakdown, if `show_correct_answers`)
- [ ] Frontend: Lecturer manual grading interface for essay questions

### Stage 4.4 — Performance Testing
- [ ] Load test: 100 concurrent simulated exam sessions
- [ ] Verify auto-save under load (no data loss)
- [ ] Verify session recovery after simulated crash
- [ ] Verify grading accuracy: 100% for auto-graded types
- [ ] Database query optimization for high-write tables (`student_answers`)

---

## PHASE 5: Analytics & Reporting (Weeks 13–14)
> **Goal:** Dashboards, charts, exportable reports

### Stage 5.1 — Analytics Backend
- [ ] Endpoint: Student performance statistics
- [ ] Endpoint: Course-level analytics (avg scores, pass rates, trends)
- [ ] Endpoint: Exam-level statistics (detailed question analysis)
- [ ] Endpoint: Question difficulty analysis (avg score per question)
- [ ] Endpoint: Admin system-wide statistics (total users, exams, completion rates)

### Stage 5.2 — Dashboard UI
- [ ] Install chart library (Recharts or Chart.js)
- [ ] Frontend: Student dashboard — stats cards (upcoming exams, avg score, completed count)
- [ ] Frontend: Student performance chart (score trends over time)
- [ ] Frontend: Lecturer dashboard — course stats, recent exam results
- [ ] Frontend: Lecturer analytics page (question difficulty, class performance)
- [ ] Frontend: Admin dashboard — system overview (users count, active exams, daily activity)
- [ ] Frontend: Admin analytics page (system-wide metrics)

### Stage 5.3 — Reports & Export
- [ ] Backend: Generate PDF reports (student transcript, exam results)
- [ ] Backend: Generate Excel export (student list, results data)
- [ ] Frontend: Export buttons on results pages (PDF, Excel download)
- [ ] Frontend: Student exam history page (all past exams with scores)

---

## PHASE 6: Security & Hardening (Weeks 15–16)
> **Goal:** Security audit, anti-cheating, rate limiting, performance tuning

### Stage 6.1 — Security Implementation
> **Guide Reference:** `06_SECURITY_IMPLEMENTATION.md` (Full security guide)

- [ ] Install and configure rate limiting middleware (per-route rates)
- [ ] Implement input sanitization (`CleanHtml` rule, HTMLPurifier)
- [ ] Enforce prepared statements / parameterized queries audit
- [ ] XSS prevention audit (backend escaping + frontend DOMPurify where needed)
- [ ] CSRF protection verification
- [ ] Sensitive data encryption (question correct_answers at rest)
- [ ] Password policy enforcement (`StrongPassword` rule)
- [ ] Session security hardening (secure cookies, HTTP-only, same-site)
- [ ] Security headers (CSP, HSTS, X-Frame-Options, etc.) — verify in responses

### Stage 6.2 — Anti-Cheating Features
> **Guide Reference:** `06_SECURITY_IMPLEMENTATION.md` (Exam-Specific Security)

- [ ] Frontend: `useExamSecurity` hook (disable right-click, copy/paste, detect tab switch, F12 block)
- [ ] Backend: Violation logging endpoint (`POST /exam-sessions/{id}/violations`)
- [ ] Backend: `DeviceFingerprintService` (fingerprint generation + verification)
- [ ] Backend: `AuditService` (comprehensive activity logging)
- [ ] Frontend: Violation counter display (for invigilator/admin view)
- [ ] Backend: Auto-flag sessions with high violation counts

### Stage 6.3 — Performance Optimization
- [ ] Database query profiling and optimization (N+1 detection, eager loading audit)
- [ ] Redis caching strategy (cache frequently-read data: courses, questions)
- [ ] API response time benchmarks (<200ms at 95th percentile)
- [ ] Load test: 5000 concurrent exam sessions
- [ ] Database: Add composite indexes for common queries
- [ ] Frontend: Code splitting, lazy loading, image optimization

---

## PHASE 7: Offline Exam Infrastructure (Weeks 17–18)
> **Goal:** Air-gapped exam server, data sync, network isolation

### Stage 7.1 — Offline Server Setup
> **Guide Reference:** `07_DEPLOYMENT_AND_PHASES.md` (Offline Exam Server section)

- [ ] Document offline server hardware requirements
- [ ] Create installation script/guide for Windows Server (XAMPP + MySQL + Redis)
- [ ] Network configuration (static IP, VLAN, no internet)
- [ ] Windows Firewall configuration (block outbound, allow LAN only)
- [ ] MySQL optimization for high concurrent writes (custom `my.ini`)
- [ ] Deploy Laravel application to offline server
- [ ] Configure IIS or Apache for serving

### Stage 7.2 — Data Synchronization
- [ ] Create sync script: Export questions, users, exam configs from online DB
- [ ] Create sync script: Import to offline exam DB
- [ ] Create sync script: Post-exam export (results, answers) from offline → online
- [ ] Test sync integrity (data completeness verification)
- [ ] Document sync procedure (step-by-step for operations team)

### Stage 7.3 — Offline Testing
- [ ] Load test: 500 concurrent sessions on offline server
- [ ] Failover/recovery testing (simulated power loss)
- [ ] UPS integration testing
- [ ] Network isolation verification (zero external connectivity)
- [ ] Backup systems verification

---

## PHASE 8: User Acceptance Testing (Weeks 19–20)
> **Goal:** Real-world testing, bug fixes, documentation

### Stage 8.1 — UAT Preparation
- [ ] Create test scenarios document (all user flows per role)
- [ ] Set up UAT environment (separate from development)
- [ ] Seed UAT database with realistic data
- [ ] Recruit test users (students, lecturers, admins)

### Stage 8.2 — UAT Execution
- [ ] UAT Round 1: Core flows (register, login, create exam, take exam, view results)
- [ ] Collect and triage bug reports
- [ ] Fix critical and high-priority bugs
- [ ] UAT Round 2: Edge cases (recovery, timeout, concurrent access)
- [ ] Fix remaining bugs

### Stage 8.3 — Documentation & Training
- [ ] Admin documentation (system setup, user management, settings)
- [ ] Lecturer documentation (question creation, exam setup, grading)
- [ ] Student documentation (registration, taking exams, viewing results)
- [ ] Operations documentation (backup, sync, monitoring)
- [ ] Training materials / video guides

---

## PHASE 9: Production Deployment (Week 21)
> **Goal:** Go live with monitoring

### Stage 9.1 — Production Deployment
> **Guide Reference:** `07_DEPLOYMENT_AND_PHASES.md` (Production Deployment section)

- [ ] Production server provisioned and hardened
- [ ] SSL certificates installed (Let's Encrypt)
- [ ] Nginx configuration (reverse proxy, rate limiting, security headers)
- [ ] Backend deployed (`composer install --no-dev`, `artisan optimize`)
- [ ] Frontend built and deployed (PM2 process manager)
- [ ] Queue workers configured (Supervisor)
- [ ] Database migrated and seeded with production data
- [ ] Redis configured for production
- [ ] Monitoring setup (uptime, performance, error tracking)
- [ ] Automated backups configured (daily full, 6-hour incremental)
- [ ] DNS configured

### Stage 9.2 — Go-Live Checklist
- [ ] All data migrated
- [ ] SSL working and verified
- [ ] Backups configured and tested
- [ ] Monitoring active (alerts configured)
- [ ] Support team trained and ready
- [ ] Rollback plan documented and tested
- [ ] Smoke tests passed on production
- [ ] Communication sent to users (launch announcement)

---

## PHASE 10: Post-Launch Support (Ongoing)
> **Goal:** Monitoring, bug fixes, iterative improvements

### Ongoing Tasks
- [ ] Monitor system uptime and performance daily
- [ ] Track and resolve bug reports
- [ ] Collect user feedback
- [ ] Plan and implement feature enhancements
- [ ] Regular security audits
- [ ] Database maintenance (cleanup old snapshots, archive logs)
- [ ] Performance tuning based on real usage patterns

### Success Metrics to Track
| Metric | Target |
|--------|--------|
| Online Platform Uptime | 99.5%+ |
| Exam System Uptime (during exams) | 99.9%+ |
| API Response Time (95th percentile) | < 200ms |
| Answer Auto-save Latency | < 1 second |
| Page Load Time (LCP) | < 2 seconds |
| Data Recovery (max data loss) | < 5 seconds |
| Concurrent Exam Sessions | 5,000+ |
| Exam Completion Rate | > 98% |

---

## Quick Reference: Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Laravel 12 (PHP 8.2+) |
| Frontend | Next.js 16 (React 19, TypeScript) |
| Styling | Tailwind CSS 4 |
| Database | MySQL 8.0+ (InnoDB) |
| Cache/Session/Queue | Redis 7+ (Predis) |
| State Management | Zustand |
| Forms | React Hook Form + Zod |
| HTTP Client | Axios + TanStack Query |
| Auth | Sanctum (or JWT) |
| Real-time | Socket.io (future) |
| Charts | Recharts |
| Icons | Lucide React |

---

## File References

| Guide | Purpose |
|-------|---------|
| `guides/01_SYSTEM_ARCHITECTURE_OVERVIEW.md` | High-level system design, components, principles |
| `guides/02_DATABASE_SCHEMA.md` | Complete DB schema (SQL + Laravel migrations) |
| `guides/03_API_SPECIFICATION.md` | All REST API endpoints with request/response examples |
| `guides/04_BACKEND_ARCHITECTURE.md` | PHP/Laravel patterns, services, middleware, jobs |
| `guides/05_FRONTEND_ARCHITECTURE.md` | Next.js structure, components, hooks, state |
| `guides/06_SECURITY_IMPLEMENTATION.md` | Security layers, auth, anti-cheating, audit |
| `guides/07_DEPLOYMENT_AND_PHASES.md` | Server setup, deployment steps, phase timeline |
| `guides/08_CODING_STANDARDS.md` | Naming conventions, patterns, testing, git |

---

## Revision History

| Date | Phase | Changes |
|------|-------|---------|
| 2026-02-11 | 1.1 | Development environment scaffolded (Laravel + Next.js + Redis + Git) |
| 2026-02-12 | 1.1 | Plan created; environment setup verified |
| 2026-02-12 | 1.1 | ✅ Stage 1.1 COMPLETE — MySQL DB verified, migrations run (10 tables), Redis Cache::put/get verified |
| 2026-02-12 | 1.2 | ✅ Stage 1.2 COMPLETE — 14 custom migrations + 5 seeders. 23 tables total. All composite indexes applied. Admin + 2 lecturers + 5 students + 6 depts + 8 courses + 11 settings seeded. |
| 2026-02-12 | 1.3 | ✅ Stage 1.3 COMPLETE — 14 Eloquent models with UUID boot, JSON casts, relationships, query scopes, and helper methods. All verified via tinker. |
| 2026-02-12 | 1.4 | ✅ Stage 1.4 COMPLETE — AuthService, 4 controllers, 3 form requests, RoleMiddleware, StrongPassword, UserResource. 28 tests (96 assertions). |
| 2026-02-12 | 1.5 | ✅ Stage 1.5 COMPLETE — Auth pages, dashboard layouts, API client, Zustand store, middleware, UI components. |
| 2026-02-13 | 1.4-1.5 | Refined: Fixed API response parsing, middleware role protection, profile completion flow, React render errors. All 7 API endpoints + frontend build verified. |
| 2026-02-13 | 1 | ✅ **PHASE 1 COMPLETE** — All 5 stages verified. 23 tables, 14 models, 7 API routes, 10 frontend routes, 28 tests passing. Ready for Phase 2. |
| 2026-02-13 | 2.3.5 | 📋 Auth & Enrollment Refactor plan created (`.agent/auth-enrollment-refactor-plan.md`). Decisions: no self-registration, login by matric/file number, admin-provisioned activation, department-based student self-enrollment, enrollment window via system_settings. |
| 2026-02-20 | 2.3.5 | ✅ **Sprint 4 (Student Course Enrollment) COMPLETE** — Verified: `StudentCourseController` (4 actions + enrollment window), `EnrollmentSettingsSeeder`, 4 API routes, `lib/api/student.ts`, Student Courses page with tabs, sidebar link. 0 TypeScript errors. |
| 2026-02-21 | 3.1 | ✅ **Stage 3.1 (Exam Creation & Configuration) COMPLETE** — ExamService, ExamController, StudentExamController, 3 Form Requests, ExamResource, 13 API routes. Frontend: types, `exams.ts` API client, lecturer exam list + 3-step create wizard + detail page (tabs: overview/questions/results), student exam list. 0 PHP syntax errors, 0 TypeScript errors. |
| 2026-02-21 | 3.2 | ✅ **Stage 3.2 (Practice Exam System) COMPLETE** — PracticeExamController (one-shot grading), 3 API routes. Frontend: practice list + exam interface (one-at-a-time, 4 question types) + results page (sessionStorage). Sidebar updated. 0 TypeScript errors. |
