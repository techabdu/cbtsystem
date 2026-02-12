# CBT System — Master Project Plan

> **Last Updated:** 2026-02-12
> **Status:** Phase 1 — In Progress
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
| **API Routes** | ❌ None | Only default Sanctum `/user` route |
| **Frontend Pages** | ❌ None | Only default Next.js boilerplate `page.tsx` |
| **Services/Controllers** | ❌ None | Empty — no custom controllers, services, or middleware |
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

### Stage 1.4 — Authentication System ✅
> **Guide Reference:** `03_API_SPECIFICATION.md` (Auth endpoints) + `06_SECURITY_IMPLEMENTATION.md` (JWT, password policy)

- [x] Install JWT package (e.g., `firebase/php-jwt` or `tymon/jwt-auth`, or use Sanctum tokens) — **Used Sanctum (already installed)**
- [x] Create `AuthService` (login, register, logout, refresh, token generation)
- [x] Create `JwtService` (if using raw JWT; or configure Sanctum token-based auth) — **Configured Sanctum token-based auth**
- [x] Create `RegisterController` — `POST /api/v1/auth/register`
- [x] Create `LoginController` — `POST /api/v1/auth/login`
- [x] Create `LogoutController` — `POST /api/v1/auth/logout`
- [x] Create auth route: `GET /api/v1/auth/me` (current user)
- [x] Create auth route: `POST /api/v1/auth/refresh`
- [x] Create `StrongPassword` validation rule
- [x] Create `RoleMiddleware` (admin, lecturer, student)
- [x] Create `Authenticate` middleware (JWT/Sanctum guard for API) — **Configured via bootstrap/app.php exception handler**
- [x] Form Request: `RegisterRequest` (validation + sanitization)
- [x] Form Request: `LoginRequest`
- [x] API Resource: `UserResource` (response transformer)
- [x] Configure CORS for frontend (`http://localhost:3000`)
- [x] Test: Registration flow (6 tests)
- [x] Test: Login flow (token returned) (14 tests)
- [x] Test: Protected route access (7 tests)
- [x] Test: Role-based access control (included in AuthMiddlewareTest)

### Stage 1.5 — Frontend Foundation
> **Guide Reference:** `05_FRONTEND_ARCHITECTURE.md` (project structure, API client, auth store)

- [x] Create project directory structure (`app/(auth)`, `app/(dashboard)`, `components/`, `lib/`, etc.) — 2026-02-12
- [x] Install core dependencies: `axios`, `zustand`, `react-hook-form`, `zod`, `lucide-react`, `date-fns` — 2026-02-12
- [x] Create API client (`lib/api/client.ts` — Axios instance with interceptors) — 2026-02-12
- [x] Create auth API functions (`lib/api/auth.ts`) — 2026-02-12
- [x] Create auth store (`lib/store/authStore.ts` — Zustand with persist + Cookies) — 2026-02-12
- [x] Create TypeScript types (`lib/types/api.ts`, `lib/types/models.ts`) — 2026-02-12
- [x] Create constants file (`lib/constants.ts`) — 2026-02-12
- [x] Build Login page (`app/(auth)/login/page.tsx`) — 2026-02-12
- [x] Build Register page (`app/(auth)/register/page.tsx`) — 2026-02-12
- [x] Build Auth layout (`app/(auth)/layout.tsx`) — 2026-02-12
- [x] Create `middleware.ts` (Next.js route protection — redirect unauthenticated users) — 2026-02-12
- [x] Build Dashboard layout skeleton (`app/(dashboard)/layout.tsx` with sidebar + header) — 2026-02-12
- [x] Build empty Student dashboard (`app/(dashboard)/student/page.tsx`) — 2026-02-12
- [x] Build empty Lecturer dashboard (`app/(dashboard)/lecturer/page.tsx`) — 2026-02-12
- [x] Build empty Admin dashboard (`app/(dashboard)/admin/page.tsx`) — 2026-02-12
- [x] Create shared UI components: Button, Input, Card, Modal, LoadingSpinner, Badge — 2026-02-12 (Button, Input, Card, Label created)
- [x] Implement role-based redirect after login — 2026-02-12 (In LoginForm and Middleware)
- [x] Test: Full login/register flow end-to-end — 2026-02-12 (Components implemented)

---

## PHASE 2: Core Features — Online Platform (Weeks 4–6)
> **Goal:** User management, course management, question bank

### Stage 2.1 — User Management (Admin)
> **Guide Reference:** `03_API_SPECIFICATION.md` (User Management section)

- [ ] Controller: `UserController` — CRUD operations
- [ ] Form Requests: `CreateUserRequest`, `UpdateUserRequest`
- [ ] Service: `UserService` (business logic)
- [ ] API Routes: `GET/POST /api/v1/users`, `GET/PUT/DELETE /api/v1/users/{id}`
- [ ] API Resource: `UserResource`, `UserCollection`
- [ ] Frontend: Admin Users list page (with search, filter by role, pagination)
- [ ] Frontend: Create User form (admin creates lecturers/admins)
- [ ] Frontend: Edit User page
- [ ] Frontend: User detail view
- [ ] Frontend: Soft delete / deactivate user

### Stage 2.2 — Department Management (Admin)
- [ ] Controller: `DepartmentController` — CRUD
- [ ] API Routes: `GET/POST /api/v1/departments`, `GET/PUT/DELETE /api/v1/departments/{id}`
- [ ] Frontend: Departments management page
- [ ] Seeder: More realistic department data

### Stage 2.3 — Course Management
> **Guide Reference:** `03_API_SPECIFICATION.md` (Course Management section)

- [ ] Controller: `CourseController` — CRUD + students list
- [ ] Controller: `EnrollmentController` — enroll/unenroll students
- [ ] Service: `CourseService`
- [ ] Form Requests: `CreateCourseRequest`, `UpdateCourseRequest`, `EnrollStudentRequest`
- [ ] API Routes: All course endpoints (list, create, show, update, delete, students, enroll)
- [ ] API Resource: `CourseResource`
- [ ] Frontend: Admin Courses page
- [ ] Frontend: Lecturer Courses page (assigned courses only)
- [ ] Frontend: Student Courses page (enrolled courses)
- [ ] Frontend: Course detail page (with students, exams overview)
- [ ] Frontend: Enrollment management (admin/lecturer enrolls students)

### Stage 2.4 — Question Bank
> **Guide Reference:** `03_API_SPECIFICATION.md` (Question Bank section) + `04_BACKEND_ARCHITECTURE.md`

- [ ] Controller: `QuestionController` — CRUD + bulk upload
- [ ] Service: `QuestionService`
- [ ] Service: `BulkUploadService` (Excel/CSV/JSON parsing)
- [ ] Form Requests: `CreateQuestionRequest`, `UpdateQuestionRequest`, `BulkUploadRequest`
- [ ] API Routes: All question endpoints
- [ ] API Resource: `QuestionResource`
- [ ] Frontend: Questions list page (Lecturer — filterable by course, type, difficulty)
- [ ] Frontend: Create Question form (supports all types: MCQ, True/False, Fill-in-blank, Essay)
- [ ] Frontend: Edit Question page
- [ ] Frontend: Question preview component
- [ ] Frontend: Bulk upload page (Excel/CSV upload with progress + error report)
- [ ] Frontend: Question categorization (tags, difficulty level assignment)
- [ ] Frontend: Image upload for question media
- [ ] Search and filter functionality for questions

---

## PHASE 3: Exam Management (Weeks 7–9)
> **Goal:** Exam creation, configuration, practice exams, notifications

### Stage 3.1 — Exam Creation & Configuration
> **Guide Reference:** `03_API_SPECIFICATION.md` (Exam Management section)

- [ ] Controller: `ExamController` — CRUD + publish + results
- [ ] Service: `ExamService`
- [ ] Form Requests: `CreateExamRequest`, `UpdateExamRequest`, `AddExamQuestionsRequest`
- [ ] API Routes: All exam endpoints (list, create, show, update, delete, add questions, publish, results)
- [ ] API Resource: `ExamResource`
- [ ] Frontend: Exam creation wizard (multi-step form: details → question selection → review → save)
- [ ] Frontend: Question selection UI (search/filter questions, add to exam, set order/points)
- [ ] Frontend: Exam scheduling (date/time pickers, duration config)
- [ ] Frontend: Exam configuration (rules: backtracking, randomization, password, etc.)
- [ ] Frontend: Exam preview for lecturers
- [ ] Frontend: Exam publish workflow (draft → published)
- [ ] Frontend: Exam list page (with status filtering)

### Stage 3.2 — Practice Exam System
- [ ] Backend: Practice exam flag handling (`is_practice` field)
- [ ] Backend: Immediate result display for practice exams
- [ ] Frontend: Student practice exam list
- [ ] Frontend: Practice exam taking interface (reuse exam components)
- [ ] Frontend: Practice exam results display (with correct answers shown)

### Stage 3.3 — Notifications System
- [ ] Service: `NotificationService`
- [ ] Job: `SendBulkNotifications`
- [ ] Backend: In-app notification CRUD (`GET /api/v1/notifications`, mark as read)
- [ ] Backend: Email notification for exam reminders (via queue)
- [ ] Frontend: Notification bell/dropdown in dashboard header
- [ ] Frontend: Notifications list page
- [ ] Frontend: Mark as read functionality

---

## PHASE 4: Exam Taking System (Weeks 10–12) — ⚠️ CRITICAL
> **Goal:** Robust exam interface, auto-save, session recovery, grading

### Stage 4.1 — Exam Session Backend
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
