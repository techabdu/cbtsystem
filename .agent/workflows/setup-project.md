---
description: Set up the development environment for the CBT system (Laravel backend + Next.js frontend + MySQL + Redis).
---

# Setup Project Workflow

Use this workflow to set up the development environment from scratch.

## Steps

1. **Read the deployment guide** for environment setup instructions.
   - Read file: `guides/07_DEPLOYMENT_AND_PHASES.md`

2. **Read the database schema** to understand the database structure.
   - Read file: `guides/02_DATABASE_SCHEMA.md`

3. **Read the system architecture** to understand the full tech stack.
   - Read file: `guides/01_SYSTEM_ARCHITECTURE_OVERVIEW.md`

4. **Check current environment** — verify what's already installed:
   // turbo
   - Run: `php -v` to check PHP version (need 8.2+)
   // turbo
   - Run: `composer --version` to check Composer
   // turbo
   - Run: `node -v` to check Node.js (need 20+)
   // turbo
   - Run: `mysql --version` to check MySQL (need 8.0+)

5. **Set up the Laravel backend** following the deployment guide:
   - Install Composer dependencies
   - Copy `.env.example` to `.env`
   - Generate application key
   - Configure database connection in `.env`
   - Create the database (`cbt_dev`)
   - Run migrations and seeders

6. **Set up the Next.js frontend**:
   - Install npm dependencies
   - Create `.env.local` with `NEXT_PUBLIC_API_URL`
   - Start dev server

7. **Verify setup**:
   - Backend API is accessible
   - Frontend dev server is running
   - Database connection works
   - Test user can log in

8. **Report status** — confirm what's working and what needs attention.
