---
description: Build or modify frontend pages/components for the CBT system. Loads frontend architecture guide and design skill.
---

# Build Frontend Workflow

Use this workflow when building new pages, components, or modifying the frontend UI.

## Steps

1. **Read the frontend architecture guide** to understand project structure, hooks, state management, and component patterns.
   - Read file: `guides/05_FRONTEND_ARCHITECTURE.md`

2. **Read the frontend-design skill** to follow the design philosophy and aesthetic guidelines.
   - Read file: `.agent/skills/frontend-design/SKILL.md`

3. **Read the API specification** to understand what backend endpoints are available for data fetching.
   - Read file: `guides/03_API_SPECIFICATION.md`

4. **Read the coding standards** (TypeScript/Next.js section) for naming conventions, component structure, and React best practices.
   - Read file: `guides/08_CODING_STANDARDS.md`

5. **Identify the context** for the frontend work:
   - Which dashboard is this for? (student / lecturer / admin / exam interface)
   - What route group does it belong to? (`(auth)`, `(dashboard)`, `exam/`)
   - What existing components can be reused?
   - What API endpoints will this page/component consume?

6. **Choose a bold aesthetic direction** as per the frontend-design skill:
   - Purpose and audience
   - Tone and visual style
   - Typography choices (avoid generic fonts)
   - Color palette with CSS variables
   - Animation strategy

7. **Propose the component plan** — list all components, hooks, and API calls needed. Wait for user approval.

8. **Implement the frontend** following the approved plan:
   - Use TypeScript with explicit types
   - Follow the hook patterns (useAuth, useExamSession, useAutoSave, useTimer)
   - Use Zustand for state management
   - Use React Hook Form + Zod for form validation
   - Use TanStack Query for data fetching
   - Apply the design aesthetic consistently
