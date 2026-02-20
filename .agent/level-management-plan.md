# Level Management — Implementation Plan

> **Created:** 2026-02-19
> **Status:** ✅ Complete
> **Related:** Combination Management (Sprint 3 of `.agent/plan.md`)

---

## Problem Statement

Levels (100L, 200L, 300L, etc.) were **hardcoded** on the frontend. Students had no `level_id` assigned, and
there was no level-based course scoping.

## Solution

Made **Levels a first-class entity** (just like Departments and Combinations):
- `levels` database table with admin CRUD
- Each student is assigned a `level_id`
- Each course has a `level_id` FK (alongside the legacy string)
- Students automatically only see courses matching their level
- Level validation during enrollment

---

## Phase 1 — Backend ✅

### 1.1 — Database Migrations
- [x] Create `levels` table (code, name, numeric_order, is_active, softDeletes)
- [x] Add `level_id` FK to `users` table
- [x] Add `level_id` FK to `courses` table

### 1.2 — Level Model
- [x] `Level` model — fillable, SoftDeletes, `courses()`, `students()`, `scopeActive()`, `scopeOrdered()`

### 1.3 — Update Existing Models
- [x] `User` model — `level_id` fillable + `level()` relationship
- [x] `Course` model — `level_id` fillable + `levelRelation()` relationship

### 1.4 — Level Service
- [x] `LevelService` — list, allActive, find, create, update, delete, restore + activity logging

### 1.5 — Level Controller + Requests + Resource
- [x] `LevelController` — 7 endpoints (index, allActive, store, show, update, destroy, restore)
- [x] `CreateLevelRequest` / `UpdateLevelRequest` — validation rules
- [x] `LevelResource` — JSON API resource

### 1.6 — API Routes
- [x] All 7 level routes registered in `routes/api.php`

### 1.7 — Update Existing Requests/Resources/Services
- [x] `CreateUserRequest` — `level_id` required for students
- [x] `UpdateUserRequest` — `level_id` optional
- [x] `UserService::create()` — sets `level_id` for students
- [x] `UserService::list()` / `find()` — eager-loads `level`, `combination`, `department`
- [x] `UserResource` — includes `level_id` + nested `level` for students
- [x] `CreateCourseRequest` / `UpdateCourseRequest` — `level_id` optional FK
- [x] `CourseResource` — includes `level_id` + nested `level_data`
- [x] `CourseService` — eager-loads `levelRelation` in all queries
- [x] `AuthController::me()` — eager-loads `level` relationship

### 1.8 — Seeder + Data
- [x] `LevelSeeder` — seeds 6 defaults + back-fills `courses.level_id` from string values
- [x] `SampleUsersSeeder` — all sample students have `level_id` set
- [x] `DatabaseSeeder` — includes `LevelSeeder` in order

### 1.9 — Verification
- [x] Migrations run cleanly
- [x] Seeders populate levels and back-fill courses/users
- [x] All 7 API endpoints registered
- [x] Level model relationships verified via tinker

---

## Phase 2 — Backend: Level-Based Scoping ✅

### 2.1 — Student Course Scoping
- [x] `StudentCourseController::availableCourses()` — auto-filters by `$user->level_id`
  - Shows matching courses + courses without a level (general/common)
  - Legacy `?level=` query param still works for explicit override
- [x] Eager-loads `levelRelation` in both `availableCourses()` and `myCourses()`

### 2.2 — Enrollment Validation
- [x] `enroll()` validates course level matches student level (if both set)
  - Returns 403 "This course is not available for your current level"

### 2.3 — Exam Visibility Scoping
- [x] Exams are tied to courses → level scoping naturally follows (no additional code needed)

---

## Phase 3 — Frontend: Admin Level Management ✅

### 3.1 — TypeScript Types
- [x] `Level` interface in `models.ts`
- [x] `CreateLevelData`, `UpdateLevelData`, `LevelFilters` in `api.ts`
- [x] `User` type — `level_id`, `level?` fields
- [x] `Course` type — `level_id`, `level_data?` fields

### 3.2 — API Client
- [x] `lib/api/levels.ts` — 7 functions (getLevels, getActiveLevels, getLevel, create, update, delete, restore)

### 3.3 — Admin Levels Page
- [x] `/admin/levels/page.tsx` — stats cards, CRUD form, searchable/filterable table, pagination, toggle, delete/restore

### 3.4 — Sidebar Link
- [x] "Levels" link with `BarChart3` icon between Combinations and Courses

---

## Phase 4 — Frontend: Wire Up Levels Everywhere ✅

### 4.1 — Courses Page: Dynamic Levels
- [x] Replaced hardcoded `LEVEL_OPTIONS` with `getActiveLevels()` API call
- [x] Course form + filter dropdowns use dynamic levels

### 4.2 — User Create Form
- [x] Level selector dropdown for students (required)
- [x] Loads active levels from API on mount

### 4.3 — User Detail Page
- [x] Level badge shown in view mode for students
- [x] Level selector in edit mode
- [x] Combination badge also shown in view mode
- [x] `level_id` included in form initialization + reset

### 4.4 — Student Courses Page
- [x] Shows student's current level badge in header
- [x] CourseCard displays `level_data.code` (FK) with fallback to legacy string

---

## Files Created

| File | Purpose |
|------|---------|
| `database/migrations/2026_02_19_000001_create_levels_table.php` | Levels table + numeric_order |
| `app/Models/Level.php` | Eloquent model |
| `app/Services/Level/LevelService.php` | Full CRUD + activity logging |
| `app/Http/Controllers/Api/V1/Level/LevelController.php` | 7 API endpoints |
| `app/Http/Requests/Level/CreateLevelRequest.php` | Validation |
| `app/Http/Requests/Level/UpdateLevelRequest.php` | Validation |
| `app/Http/Resources/LevelResource.php` | JSON resource |
| `database/seeders/LevelSeeder.php` | Seeds 6 levels + back-fill |
| `frontend/src/lib/api/levels.ts` | API client |
| `frontend/src/app/(dashboard)/admin/levels/page.tsx` | Admin page |

## Files Modified

| File | Changes |
|------|---------|
| `User.php` | `level_id` fillable, `level()` relationship |
| `Course.php` | `level_id` fillable, `levelRelation()` relationship |
| `UserResource.php` | `level_id` + nested `level` |
| `CourseResource.php` | `level_id` + nested `level_data` |
| `Create/UpdateUserRequest.php` | `level_id` validation |
| `Create/UpdateCourseRequest.php` | `level_id` validation |
| `UserService.php` | Sets `level_id`, eager-loads relationships |
| `CourseService.php` | Eager-loads `levelRelation` |
| `StudentCourseController.php` | Level scoping + enrollment validation |
| `AuthController.php` | Eager-loads `level` |
| `SampleUsersSeeder.php` | All students have `level_id` |
| `DatabaseSeeder.php` | Includes `LevelSeeder` |
| `routes/api.php` | Level routes |
| `models.ts` | `Level` interface, updated `User`/`Course` |
| `api.ts` | Level types |
| `Sidebar.tsx` | Levels link |
| `admin/courses/page.tsx` | Dynamic levels |
| `admin/users/create/page.tsx` | Level selector |
| `admin/users/[id]/page.tsx` | Level view + edit |
| `student/courses/page.tsx` | Level badge + improved display |
