# CBT System — FCT College of Education, Zuba

You are working on a **Computer-Based Testing (CBT) system** built for **FCT College of Education, Zuba** (Abuja, Nigeria). This is a production application for conducting and managing examinations at a Nigerian College of Education that runs the NCE (Nigeria Certificate in Education) programme.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Laravel 12 (PHP 8.2+) |
| Frontend | Next.js 16 (React 19, TypeScript, Tailwind CSS) |
| Database | MySQL 8 (InnoDB) |
| Cache/Queue | Redis 7 |
| Auth | Laravel Sanctum (SPA cookie-based, httpOnly) |
| API | RESTful JSON, versioned at `/api/v1/` |

**Scale:** 30 controllers, 160+ API routes, 51 frontend pages, 25 database tables.

**Directory layout:**
```
cbtsystem/
  backend/          ← Laravel 12 app
  frontend/         ← Next.js 16 app
  guides/           ← 8 documentation guides (architecture, schema, API, deployment, security, etc.)
```

---

## The Five Roles

Every user has exactly one `role` string. Lecturers also have boolean sub-role flags.

### admin
- Full system oversight, user management, system-wide analytics
- Can intervene at any workflow stage

### edu_portal (Educational Portal Admin)
- Manages academic structure: schools, departments, levels, courses, combinations
- User CRUD, bulk CSV/Excel upload, enrollment management
- System analytics
- **Publishes final results to students** (last step of post-exam flow)

### cbt (CBT Center Admin)
- **Publishes approved exams and syncs them to the offline server** (last step of pre-exam flow)
- Syncs student results back from offline to online after exams
- Manages exam access codes

### lecturer
- Creates questions and exams, submits for approval
- Grades essays and fill-in-blank answers manually
- Three boolean sub-role flags (a lecturer can hold one or more):
  - `is_hod` — Head of Department: approves/rejects exams submitted by lecturers in their department
  - `is_school_exam_officer` — Approves exams at the school level after HOD verification
  - `is_department_exam_officer` — Approves grading results before publication

### student
- Enrolls in courses through their combination and level
- Takes exams (onsite via offline server, or practice exams online)
- Views results, performance analytics, exam history

---

## Exam Approval — Chain of Command

This is the core business process. Every real exam follows this multi-stage approval pipeline.

### Pre-Exam Flow (Exam Creation → Students Take Exam)

```
Lecturer creates exam (status: draft)
  │
  ├─ Lecturer submits to HOD
  │    status: draft → pending_review
  │    Notification sent to HODs in the course's department
  │
  ├─ HOD reviews
  │    ├─ APPROVE → status: pending_review → verified
  │    │    Notification sent to exam creator + admins
  │    │
  │    └─ REJECT → status: pending_review → draft
  │         ExamFeedback record created with rejection comments
  │         Lecturer revises and resubmits
  │
  ├─ School Exam Officer reviews
  │    ├─ APPROVE → status: verified → published
  │    │    Validates: exam has questions, has start_time/end_time
  │    │    Notification sent to creator + all enrolled students
  │    │
  │    └─ REJECT → status: verified → draft
  │         ExamFeedback record created
  │
  └─ CBT Admin publishes and syncs exam to offline server
       Exam questions, student enrollments, access codes pushed to offline
       Students can now take the exam onsite
```

### Post-Exam Flow (Exam Complete → Students See Scores)

```
CBT Admin syncs results from offline server
  │  status: results_status → pending_grading
  │  Student sessions, answers, violation logs synced to online DB
  │
  ├─ Auto-grading runs
  │    MCQ and True/False answers graded automatically
  │    Essay and Fill-in-Blank flagged for manual grading
  │
  ├─ Lecturer grades essays/fill-in-blank manually
  │    Uses grading UI: assigns points + feedback per answer
  │    Session scores recalculated after each manual grade
  │
  ├─ Lecturer submits grading
  │    results_status: pending_grading → grading_submitted
  │    Validates: all essay/fill-in-blank answers are graded
  │    Notification sent to HODs
  │
  ├─ Department Exam Officer reviews
  │    ├─ APPROVE → results_status: grading_submitted → results_verified
  │    │    Notification sent to admins + creator
  │    │
  │    └─ REJECT → results_status: grading_submitted → pending_grading
  │         ExamFeedback with rejection comments
  │         Lecturer re-grades and resubmits
  │
  └─ Edu Portal admin publishes results
       results_status: results_verified → results_published
       Students can now see their scores
```

### Exam Status Values

| Field | Values |
|-------|--------|
| `status` | `draft`, `pending_review`, `verified`, `published`, `ongoing`, `completed`, `archived` |
| `results_status` | `pending_grading`, `grading_submitted`, `results_verified`, `results_published` |
| `exam_type` | `midterm`, `final`, `quiz`, `practice`, `makeup` |

**Practice exams** bypass the full approval chain — they can be published directly and show instant results.

---

## Academic Structure

```
School (6 schools, e.g., School of Sciences)
  └─ Department (34 total, e.g., Computer Science — code: CSC)
       ├─ Course (e.g., CSC 101 — Intro to CS, 2 credit hours, 100L, first semester)
       └─ Lecturers (5 per department: HOD, School Exam Officer, Dept Exam Officer, 2 regular)

Level (4 levels: 100L, 200L, 300L, 400L/PGD)
  └─ Students at each academic year level

Combination (35 NCE subject pairs, e.g., MTH/PHY — Mathematics/Physics)
  ├─ first_department_id → Department
  ├─ second_department_id → Department
  ├─ is_double_major (true if both departments are the same)
  └─ Students (each student belongs to exactly ONE combination)
```

**Key concept — "Combination":** NCE students must study TWO subjects. A combination is a specific subject pairing (e.g., Mathematics/Physics, English/History). Each student belongs to one combination and can enroll in courses from both departments in that combination.

**Seeded data:** 6 schools, 34 departments, 35 combinations, 4 levels, ~102 courses, 3 admin users, 170 lecturers (5/dept), ~105 students (3 per combination across 3 levels).

---

## Online vs Offline Architecture

### Online Platform (internet-accessible)
- Full dashboards for all roles
- Exam creation, approval workflow, question bank management
- Analytics, PDF/Excel exports, in-app notifications
- Practice exams with instant grading
- Student enrollment, course management

### Offline Exam Server (air-gapped campus network)
- Isolated VLAN network (192.168.100.x) — no internet access during exams
- Runs the same Laravel backend + Next.js frontend
- Student authentication: **matric number + semester access code** (no username/password login)
- Auto-detects the active exam from the student's enrolled courses
- All exam sessions and answers stored locally
- Crash recovery via session snapshots

### Sync Flow

```
ONLINE → OFFLINE (pre-exam setup):
  CBT Admin pushes:
    - Exam questions and configuration
    - Student enrollment data
    - Semester access codes
  Method: Manual data transfer (USB/network copy) or API sync

OFFLINE → ONLINE (post-exam):
  CBT Admin syncs back:
    - Exam sessions (student attempts)
    - Student answers (all versions)
    - Violation logs (cheating attempts)
    - Session snapshots
  Trigger: POST /api/v1/exams/{exam}/sync-results
```

### Offline Entry Flow (Student Taking Exam)

1. Student enters **matric number** (e.g., `FCTZUBA/2025/MTH-PHY/0001`)
2. Student enters **semester access code** (8-char code, e.g., `ABCD-EFGH`)
3. Backend validates: student exists, is active, access code valid and not expired
4. Auto-detects current exam from enrolled courses (one active exam at a time)
5. Checks for existing session:
   - Already submitted → reject
   - In-progress/interrupted → resume at last question
   - No session → create new session
6. Issues short-lived Sanctum token (exam duration + 30 min buffer)
7. Redirects to exam interface at `/exam/[sessionId]`

---

## Exam-Taking Experience

The exam interface (`/exam/[sessionId]`) is a real-time, full-screen exam environment.

### Timer
- Countdown display (h:mm:ss)
- Color-coded: green (>5 min) → yellow (5-1 min) → red + pulsing (<1 min)
- Auto-submits when timer reaches zero

### Auto-Save
- Debounced: saves 3 seconds after student stops interacting
- Batched: multiple answers sent in one request
- Version tracking: each save creates a new version row in `student_answers`
- Session snapshots (checkpoints) created every 10 answers
- Non-blocking: save failures don't disrupt the exam, retries automatically

### Question Types
| Type | Input | Grading |
|------|-------|---------|
| `multiple_choice` | Radio buttons (A/B/C/D) | Auto-graded |
| `true_false` | Two toggle buttons | Auto-graded |
| `fill_in_blank` | Text input | Manual grading |
| `essay` | Textarea (resizable) | Manual grading |

### Navigation
- Previous/Next buttons (Next disabled if backtracking blocked)
- Question dot grid: blue = current, light blue = answered, gray = unanswered, amber = flagged
- Clickable dots to jump between questions (if backtracking allowed)
- Flag button to mark questions for review

### Session Recovery
- If browser crashes or network drops, student re-enters matric + access code
- System loads latest session snapshot, restores all answers
- Resumes at last question index with "session recovered" message

### Anti-Cheating (client-side detection + server-side logging)
| Violation Type | Detection |
|----------------|-----------|
| `tab_switch` | Browser visibility change |
| `copy_paste` | Clipboard operations blocked (paste allowed in essay fields) |
| `right_click` | Context menu blocked |
| `devtools` | F12, Ctrl+Shift+I/J, Ctrl+U blocked |
| `screenshot_attempt` | PrintScreen key blocked |
| `window_blur` | Alt+Tab / focus loss |

- Violations reported to: `POST /exam-sessions/{id}/violations`
- Each violation increments `session.violation_count`
- Violations stored as JSON array with timestamps
- `has_violations` flag set for lecturer review

### Exam Configuration Options
- `randomize_questions` — Shuffle question order per student
- `randomize_options` — Shuffle MCQ option order
- `allow_backtrack` — Allow/block going back to previous questions
- `show_results_immediately` — Show score after submission
- `show_correct_answers` — Reveal correct answers in results

---

## Database Schema (25 Tables)

### Core Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `users` | All system users | uuid, email, password, role, student_id, staff_id, school_id, department_id, combination_id, level_id, is_hod, is_school_exam_officer, is_department_exam_officer, is_active, is_verified, failed_login_attempts, locked_until |
| `schools` | Academic schools/faculties | uuid, code, name, is_active |
| `departments` | Academic departments | school_id, code, name, is_active |
| `levels` | Academic year levels | code, name, numeric_order, is_active |
| `combinations` | NCE subject pairs | code, name, first_department_id, second_department_id, is_double_major |
| `courses` | Academic courses | uuid, department_id, level_id, code, title, credit_hours, semester, academic_year |
| `course_enrollments` | Student-course links | student_id, course_id, enrollment_date, status (active/dropped/completed) |
| `course_lecturers` | Lecturer-course assignments | lecturer_id, course_id, role (lecturer/coordinator/assistant) |

### Question & Exam Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `questions` | Question bank | uuid, course_id, created_by, question_text, question_type, options (JSON), correct_answer (JSON), points, difficulty_level, has_image, image_url, is_verified, verified_by |
| `exams` | Exam definitions | uuid, course_id, created_by, title, exam_type, duration_minutes, total_marks, passing_marks, status, results_status, randomize_questions, allow_backtrack, is_practice |
| `exam_questions` | Exam-question pivot | exam_id, question_id, question_order, points, is_required |
| `exam_feedback` | Rejection comments | exam_id, user_id (reviewer), recipient_id, stage, comments, resolved |

### Exam Session Tables (High-Write)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `exam_sessions` | Individual attempts | uuid, exam_id, student_id, session_token, started_at, scheduled_end_time, submitted_at, status (in_progress/submitted/auto_submitted/interrupted), question_sequence (JSON), current_question_index, questions_answered, questions_flagged (JSON), total_score, percentage, has_violations, violation_count, violations (JSON), ip_address, user_agent, device_fingerprint |
| `student_answers` | Answer storage (versioned) | session_id, question_id, answer_text, selected_option (JSON), is_flagged, time_spent_seconds, version, is_final, is_correct, points_awarded, grader_feedback, graded_by, graded_at |
| `session_snapshots` | Crash recovery | session_id, snapshot_type (auto_save/checkpoint), snapshot_data (JSON), answers_count |
| `exam_access_codes` | Offline auth codes | student_id, access_code, semester, academic_year, is_active, expires_at |

### System Tables

| Table | Purpose |
|-------|---------|
| `activity_logs` | Audit trail (user_id, action, entity, old/new values, IP) |
| `notifications` | In-app notifications (user_id, type, title, message, is_read) |
| `system_settings` | Key-value config (institution_name, enrollment dates, exam timeouts, security) |
| `personal_access_tokens` | Sanctum tokens |

---

## API Route Map

Base: `/api/v1/` — All routes return JSON via `ResponseHelper`.

### Public (No Auth)
```
GET  /health                           → HealthCheckController (DB, cache, storage status)
POST /auth/activate                    → Account activation
POST /offline-exams/start              → Offline entry (matric + access code)
```

### Auth
```
POST /auth/login                       → Login (returns Sanctum cookie)
POST /auth/logout                      → Logout
GET  /auth/me                          → Current user profile
PUT  /auth/profile                     → Update profile
POST /auth/refresh                     → Refresh token
```

### User Management (admin, edu_portal)
```
CRUD /users                            → Full user management
POST /users/{id}/restore               → Restore soft-deleted
PATCH /users/{id}/toggle-active        → Toggle active status
POST /users/bulk-upload                → Bulk CSV/Excel upload
```

### Academic Structure (admin, edu_portal)
```
CRUD /departments                      → + /active (dropdown list)
CRUD /schools                          → + /active
CRUD /levels                           → + /active
CRUD /combinations                     → + /active
```

### Courses (role-aware)
```
CRUD /courses
GET  /courses/{id}/students            → Enrolled students
GET  /courses/{id}/lecturers           → Assigned lecturers
POST /courses/{id}/enroll              → Enroll student
POST /courses/{id}/enroll/bulk         → Bulk enroll
POST /courses/{id}/lecturers           → Assign lecturer
```

### Student Course Enrollment (student only)
```
GET  /student/courses/available        → Courses available to enroll
GET  /student/courses/enrolled         → My enrolled courses
POST /student/courses/enroll           → Self-enroll
POST /student/courses/unenroll         → Self-unenroll
```

### Question Bank (lecturer, admin)
```
CRUD /questions                        → + /stats
PATCH /questions/{id}/verify           → Mark as verified
POST /questions/{id}/image             → Upload question image
POST /questions/bulk-upload            → Bulk upload (JSON)
POST /questions/bulk-upload-excel      → Bulk upload (Excel)
```

### Exams (lecturer, admin)
```
CRUD /exams                            → + /stats
POST /exams/{id}/questions             → Add questions (bulk)
DELETE /exams/{id}/questions/{qid}     → Remove question
GET  /exams/{id}/results               → Exam results + statistics
GET  /exams/{id}/manual-grading        → Sessions needing grading
GET  /exams/{id}/grading-summary       → Grading progress
```

### Exam Workflow (role-dependent)
```
POST /exams/{exam}/submit-hod          → Lecturer submits to HOD
POST /exams/{exam}/hod-approve         → HOD approves
POST /exams/{exam}/hod-reject          → HOD rejects (with comments)
POST /exams/{exam}/school-officer-approve → School Officer approves
POST /exams/{exam}/school-officer-reject  → School Officer rejects
POST /exams/{exam}/cbt-publish         → CBT Admin publishes
POST /exams/{exam}/sync-results        → CBT Admin syncs from offline
POST /exams/{exam}/submit-grading      → Lecturer submits grades
POST /exams/{exam}/dept-officer-approve → Dept Officer approves grades
POST /exams/{exam}/dept-officer-reject  → Dept Officer rejects grades
```

### Exam Sessions (student, during exam)
```
GET  /exam-sessions/{id}/status        → Session status + time remaining
GET  /exam-sessions/{id}/questions     → All question metadata
GET  /exam-sessions/{id}/questions/{i} → Specific question by index
POST /exam-sessions/{id}/answers       → Save single answer
POST /exam-sessions/{id}/answers/batch → Save multiple answers
POST /exam-sessions/{id}/flag          → Toggle question flag
POST /exam-sessions/{id}/submit        → Final submission
POST /exam-sessions/{id}/violations    → Report cheating violation
```

### Student Exams & Practice
```
GET  /student/exams                    → My available exams
GET  /student/exams/{id}               → Exam details
GET  /student/exams/{id}/results       → My results
GET  /student/practice-exams           → Practice exams list
GET  /student/practice-exams/{id}      → Practice exam details
POST /student/practice-exams/{id}/submit → Submit practice exam
```

### Manual Grading (lecturer, admin)
```
POST /student-answers/{id}/grade       → Grade single answer { points_awarded, feedback }
```

### Analytics (role-based)
```
GET /analytics/student/performance     → Student's own performance (student)
GET /analytics/lecturer/dashboard      → Lecturer dashboard stats (lecturer)
GET /analytics/courses/{id}            → Course analytics (lecturer, admin)
GET /analytics/exams/{id}              → Exam analytics with question breakdown (lecturer, admin)
GET /analytics/system                  → System-wide stats (admin, edu_portal)
```

### Officers
```
GET /officer/department-exams          → Dept officer: exams in my department
GET /officer/school-exams              → School officer: exams in my school
```

### HOD
```
GET    /hod/department-lecturers       → Lecturers in my department
GET    /hod/department-courses         → Courses in my department
GET    /hod/assignments                → Course-lecturer assignments
POST   /hod/assign-course              → Assign course to lecturer
DELETE /hod/unassign-course/{lid}/{cid} → Unassign
```

### Exports
```
GET /exports/students/{id}/transcript  → PDF transcript
GET /exports/exams/{id}/results/pdf    → PDF exam results
GET /exports/enrollments               → Excel enrollment list
GET /exports/results                   → Excel results export
```

### Notifications (all authenticated)
```
GET    /notifications                  → List (paginated, filter: unread_only)
GET    /notifications/unread-count     → Unread count
PATCH  /notifications/{id}/read        → Mark as read
PATCH  /notifications/read-all         → Mark all as read
DELETE /notifications/{id}             → Delete
```

---

## Key Services (Business Logic Layer)

All services are in `backend/app/Services/`.

| Service | Path | Responsibility |
|---------|------|----------------|
| `ExamService` | `Exam/ExamService.php` | Exam CRUD, all workflow transitions (submit, approve, reject, publish), question management, results calculation, stats |
| `GradingService` | `ExamSession/GradingService.php` | Auto-grade MCQ/TF, flag essay/fill-in-blank for manual, recalculate session scores, check if manual grading needed |
| `SessionService` | `ExamSession/SessionService.php` | Save answers (single + batch), flag questions, submit exam, auto-submit on timeout |
| `RecoveryService` | `ExamSession/RecoveryService.php` | Restore sessions from snapshots after browser crash, best-effort answer recovery |
| `AnalyticsService` | `Analytics/AnalyticsService.php` | Student performance, lecturer dashboard, course analytics, exam analytics (question-level), system-wide stats |
| `NotificationService` | `Notification/NotificationService.php` | Send notifications (single + bulk via queue), mark read, role-scoped delivery |
| `CourseService` | `Course/CourseService.php` | Course CRUD, enrollment, lecturer assignments |
| `UserService` | `User/UserService.php` | User CRUD, bulk upload, toggle active, soft delete/restore |
| `QuestionService` | `Question/QuestionService.php` | Question CRUD, bulk upload (JSON + Excel), image management, verification |

---

## Frontend Page Structure

All under `frontend/src/app/`.

### Auth Pages (public)
- `/login` — Login form
- `/activate` — Account activation (first-time password set)

### Dashboard Layout (`/(dashboard)/layout.tsx`)
- Auth guard with role-based routing
- Sidebar navigation + header with user menu
- Wraps all role-specific pages

### Admin Pages (`/(dashboard)/admin/`)
- Dashboard: system analytics, user stats, daily activity chart, exam status distribution

### Edu Portal Pages (`/(dashboard)/edu_portal/`)
- Dashboard, user management (CRUD + bulk upload), student management, lecturer management
- Academic structure: courses, departments, schools, levels, combinations
- Results viewing

### Lecturer Pages (`/(dashboard)/lecturer/`)
- Dashboard: courses, questions, exams, pending grading alerts
- Question bank management
- Exam creation/management (draft → review → published states)
- Exam detail/edit with question management
- Manual grading interface (essay/fill-in-blank)
- Exam reviews (feedback from HOD/officers)
- Department exams, school exams views
- Course assignments, results verification
- Analytics

### Student Pages (`/(dashboard)/student/`)
- Dashboard: enrolled courses, upcoming exams, score trends
- Available exams, exam history
- Practice exams with instant results
- Results (list + individual detail with per-question breakdown)
- Complete profile (required before exam access)

### CBT Pages (`/(dashboard)/cbt/`)
- Dashboard
- Exam publishing to offline system

### Offline Entry (`/(offline)/exams/`)
- Matric number + access code entry form
- No auth required — standalone page

### Exam Interface (`/exam/[sessionId]/`)
- Full-screen exam-taking environment (~1000 lines)
- Timer, question display, auto-save, navigation, flagging, submit

---

## Security Implementation

### Authentication
- Sanctum SPA cookies (httpOnly, secure, sameSite)
- CSRF protection on all state-changing requests
- Account lockout after 5 failed login attempts (15 min lockout)
- Password change tracking (`password_changed_at`)

### Authorization
- `RoleMiddleware` — Route-level: `middleware('role:admin,lecturer')`
- `ExamPolicy` — Fine-grained: controls who can approve/reject at each workflow stage
- UUID route keys prevent integer ID enumeration

### Security Headers (applied to all API responses)
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### Input Sanitization
- HTML purification via `stevebauman/purify` package
- `SanitizesHtml` concern on form requests
- Allowed tags: h1-h6, b, u, strong, em, a, ul, ol, li, p, br, span, img, blockquote

### Rate Limiting
- Public auth routes: 5 requests/minute
- Offline entry: 5 requests/minute per IP
- API reads: standard throttle
- Exam auto-save: relaxed throttle (high-frequency saves)
- Redis-backed when `CACHE_STORE=redis`

---

## Key Codebase Conventions

### Backend Patterns
- All models use `uuid` as route key (`getRouteKeyName()` returns `'uuid'`)
- Soft deletes on users, exams, questions (with restore endpoints)
- `ResponseHelper::success()` / `ResponseHelper::error()` for consistent JSON envelope
- Cache invalidation on reference data save/delete (schools, departments, levels, combinations)
- Activity logging on all major actions (creates ActivityLog records)
- Named parameters throughout (PHP 8.2 style)
- Form request classes for validation (`backend/app/Http/Requests/`)
- API resources for response transformation (`backend/app/Http/Resources/`)
- Policies for authorization beyond role middleware (`backend/app/Policies/`)

### Frontend Patterns
- API client with auth interceptor (`frontend/src/lib/api/`)
- Separate API modules: `auth.ts`, `exams.ts`, `sessions.ts`, `users.ts`, etc.
- Role-based sidebar navigation
- `useExamSecurity` hook for anti-cheating
- Offline entry uses raw axios (bypasses auth interceptor)
- Auth state stored in cookies (`auth_user_role`)

### Database Conventions
- Column `numeric_order` (not `order`) on levels table
- Column `title` (not `name`) on courses table
- Column `credit_hours` (not `credit_units`) on courses table
- Column `question_order` (not `order`) on exam_questions table
- `is_final` flag on student_answers distinguishes draft saves from final answers
- Answer versioning: each auto-save creates a new row, `version` increments

### Environment Variables for Seeders
```
SEED_ADMIN_PASSWORD=Admin@123456       ← used by AdminUserSeeder + SampleUsersSeeder
SEED_LECTURER_PASSWORD=Lecturer@123456 ← used by LecturerSeeder + SampleUsersSeeder
SEED_STUDENT_PASSWORD=Student@123456   ← used by StudentSeeder + SampleUsersSeeder
```

### Seeded Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@fctzuba.edu.ng | (SEED_ADMIN_PASSWORD) |
| Edu Portal | eduportal@fctzuba.edu.ng | (SEED_ADMIN_PASSWORD) |
| CBT Center | cbt@fctzuba.edu.ng | (SEED_ADMIN_PASSWORD) |
| Lecturer (sample) | lecturer1@cbt.edu | (SEED_LECTURER_PASSWORD) |
| Student (sample) | student1@cbt.edu | (SEED_STUDENT_PASSWORD) |

### Seeder Execution Order (dependency-ordered)
1. SchoolSeeder → 2. DepartmentSeeder → 3. CombinationSeeder → 4. LevelSeeder → 5. AdminUserSeeder → 6. LecturerSeeder → 7. StudentSeeder → 8. CourseSeeder → 9. ExamAccessCodeSeeder → 10. SystemSettingsSeeder

---

## Notification System

In-app notifications triggered during workflow transitions:

| Event | Recipients |
|-------|-----------|
| Exam submitted for review | HODs in the course's department |
| Exam approved by HOD | Exam creator + admins |
| Exam rejected | Exam creator |
| Exam published | Exam creator + enrolled students |
| Grading submitted | HODs in department |
| Grading rejected | Exam creator |
| Results verified | Admins + exam creator |
| Results published | Enrolled students |

Bulk notifications dispatched via `SendBulkNotifications` job (queued, 3 retries, 30s backoff).

---

## System Settings (Database-Driven)

Stored in `system_settings` table, configurable at runtime:

| Group | Key Settings |
|-------|-------------|
| Institution | institution_name, academic_year, current_semester |
| Enrollment | enrollment_open, enrollment_start_date, enrollment_end_date |
| Exam | auto_submit_grace_seconds (60), session_timeout_minutes (30), snapshot_interval (10), max_violations (5) |
| Security | password_min_length (8), max_login_attempts (5), lockout_duration_minutes (15) |
| System | maintenance_mode, maintenance_message |

---

## Grading Details

### Auto-Grading (immediate on submission)
- **Multiple Choice:** Case-insensitive comparison of `selected_option` vs `correct_answer` → full points or 0
- **True/False:** Same logic → full points or 0

### Manual Grading (lecturer does this)
- **Fill-in-Blank:** Lecturer assigns points (0 to max) + optional feedback
- **Essay:** Lecturer assigns points (0 to max) + optional feedback
- After each manual grade, session `total_score` and `percentage` are recalculated
- Grading endpoint: `POST /api/v1/student-answers/{id}/grade` with `{ points_awarded, feedback }`

### Grading Completion Check
Before lecturer can submit grading, ALL essay and fill-in-blank answers must be graded. `GradingService::needsManualGrading()` validates this.

---

## Testing

18 test files in `backend/tests/`:

| Category | Test Files |
|----------|-----------|
| Auth | LoginTest, ActivateAccountTest |
| Exams | ExamWorkflowTest |
| Sessions | SessionConcurrencyTest, SessionRecoveryTest, AutoSaveIntegrityTest |
| Grading | GradingServiceTest, GradingAccuracyTest |
| Workflow | ExamWorkflowServiceTest |
| Exports | ExportTest |
| Security | RateLimitingTest |

Run with: `cd backend && php artisan test`

---

## Documentation Guides

8 guides in the `guides/` directory:

1. `01_SYSTEM_ARCHITECTURE_OVERVIEW.md` — High-level architecture, tech stack decisions
2. `02_DATABASE_SCHEMA.md` — Full schema documentation
3. `03_API_SPECIFICATION.md` — Endpoint reference
4. `04_CODING_STANDARDS.md` — Code conventions
5. `05_FRONTEND_ARCHITECTURE.md` — Next.js structure, component patterns
6. `06_SECURITY_IMPLEMENTATION.md` — Security layers, network isolation
7. `07_DEPLOYMENT_AND_PHASES.md` — Step-by-step deployment (online + offline server)
8. `08_TESTING_GUIDE.md` — Test structure, running tests
