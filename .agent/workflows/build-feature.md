---
description: Build a new feature for the CBT system. Reads the relevant architecture guides before writing any code.
---

# Build Feature Workflow

Use this workflow when building any new feature for the CBT system. It ensures all relevant guides are consulted before coding begins.

## Steps

1. **Read the system architecture overview** to understand where this feature fits in the overall system.
   - Read file: `guides/01_SYSTEM_ARCHITECTURE_OVERVIEW.md`

2. **Read the coding standards** to ensure all code follows project conventions.
   - Read file: `guides/08_CODING_STANDARDS.md`

3. **Read the database schema** to understand existing tables and relationships before making any DB changes.
   - Read file: `guides/02_DATABASE_SCHEMA.md`

4. **Read the API specification** to follow established endpoint patterns and response formats.
   - Read file: `guides/03_API_SPECIFICATION.md`

5. **Read the backend architecture** to follow the Service Layer, Repository, and controller patterns.
   - Read file: `guides/04_BACKEND_ARCHITECTURE.md`

6. **Read the frontend architecture** to follow component structure, hooks, and state management patterns.
   - Read file: `guides/05_FRONTEND_ARCHITECTURE.md`

7. **Read the security guide** to ensure the feature follows all security requirements.
   - Read file: `guides/06_SECURITY_IMPLEMENTATION.md`

8. **Summarize your understanding** of the guides as they relate to the user's requested feature. Outline:
   - Which existing tables/APIs/components are relevant
   - What new tables/endpoints/components need to be created
   - Which design patterns to follow (Service Layer, Repository, etc.)
   - Any security considerations specific to this feature

9. **Propose an implementation plan** before writing any code. Wait for user approval.

10. **Implement the feature** following the approved plan, adhering to all patterns and standards from the guides.
