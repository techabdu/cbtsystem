---
description: Build or modify exam-related features (exam session, auto-save, grading, recovery, anti-cheating). This is the most critical part of the CBT system.
---

# Build Exam Feature Workflow

Use this workflow for any exam-related work. The exam system is the MOST CRITICAL part of the CBT system and requires the highest level of care.

## Steps

1. **Read the system architecture overview** to understand the hybrid online/offline architecture and data flow during exams.
   - Read file: `guides/01_SYSTEM_ARCHITECTURE_OVERVIEW.md`

2. **Read the database schema** with focus on the Offline Exam Database tables: `exam_sessions`, `student_answers`, `session_snapshots`.
   - Read file: `guides/02_DATABASE_SCHEMA.md`

3. **Read the API specification** with focus on the Exam Session endpoints: start, get question, save answer, submit, recover.
   - Read file: `guides/03_API_SPECIFICATION.md`

4. **Read the backend architecture** with focus on: `SessionService`, `RecoveryService`, `GradingService`.
   - Read file: `guides/04_BACKEND_ARCHITECTURE.md`

5. **Read the frontend architecture** with focus on: `useExamSession`, `useAutoSave`, `useTimer` hooks and the exam interface components.
   - Read file: `guides/05_FRONTEND_ARCHITECTURE.md`

6. **Read the security guide** with focus on: anti-cheating measures, device fingerprinting, violation logging, air-gapped network.
   - Read file: `guides/06_SECURITY_IMPLEMENTATION.md`

7. **Critical requirements checklist** — confirm the feature handles ALL of these:
   - [ ] Auto-save every 5 seconds (client-side) with versioned answers
   - [ ] Session snapshots every 5 minutes or 10 answers
   - [ ] Recovery from browser crash / power failure / network interruption
   - [ ] Timer accuracy (countdown with auto-submit on expiry)
   - [ ] Anti-cheating: right-click disabled, copy/paste blocked, tab-switch detection, dev tools blocked
   - [ ] Device fingerprint verification
   - [ ] Violation logging with timestamps
   - [ ] Randomized question and option order per student
   - [ ] Grading accuracy for MCQ, True/False, Fill-in-blank (manual for essay)
   - [ ] One session per student per exam (no duplicate sessions)
   - [ ] Proper status transitions: not_started → in_progress → submitted/auto_submitted/interrupted

8. **Propose the implementation plan** with special attention to edge cases and failure scenarios. Wait for user approval.

9. **Implement** with comprehensive error handling and test scenarios for:
   - Normal flow (start → answer → submit)
   - Recovery flow (crash → recover → resume → submit)
   - Auto-submit flow (timer expires during exam)
   - Concurrent writes (auto-save race conditions)
