---
description: Review code against the CBT system coding standards, security guidelines, and architectural patterns.
---

# Code Review Workflow

Use this workflow to review existing code for quality, security, and adherence to project standards.

## Steps

1. **Read the coding standards** for all naming conventions, structure, and best practices.
   - Read file: `guides/08_CODING_STANDARDS.md`

2. **Read the security guide** for security checks.
   - Read file: `guides/06_SECURITY_IMPLEMENTATION.md`

3. **Read the backend architecture** guide if reviewing PHP/Laravel code.
   - Read file: `guides/04_BACKEND_ARCHITECTURE.md`

4. **Read the frontend architecture** guide if reviewing Next.js/React code.
   - Read file: `guides/05_FRONTEND_ARCHITECTURE.md`

5. **Review the code** against this checklist:

   ### Code Quality
   - [ ] Follows naming conventions (PascalCase classes, camelCase methods/variables, snake_case DB)
   - [ ] One class per file
   - [ ] Functions are focused and < 20 lines
   - [ ] No `console.log()` or `dd()` left in code
   - [ ] No commented-out code
   - [ ] Meaningful variable names (no single-letter variables)
   - [ ] Proper PHPDoc / JSDoc on public methods
   - [ ] Uses type hints (PHP) or explicit TypeScript types (no `any`)

   ### Architecture
   - [ ] Business logic is in Services, NOT in controllers
   - [ ] Controllers are thin (validate → delegate → respond)
   - [ ] Uses Form Requests for validation (not inline validation)
   - [ ] Uses API Resources for response formatting
   - [ ] Follows the standard JSON response format
   - [ ] Uses eager loading (no N+1 queries)

   ### Security
   - [ ] Uses parameterized queries (no string concatenation in SQL)
   - [ ] Input validated and sanitized
   - [ ] Output escaped (htmlspecialchars / React auto-escaping)
   - [ ] Role-based access control on all endpoints
   - [ ] No hardcoded secrets or credentials
   - [ ] Sensitive data encrypted

   ### Frontend
   - [ ] React hooks follow rules of hooks
   - [ ] Proper useCallback/useMemo where needed
   - [ ] Error boundaries and loading states handled
   - [ ] Accessible markup (semantic HTML, ARIA labels)

6. **Report findings** organized by severity (Critical > Warning > Suggestion).
