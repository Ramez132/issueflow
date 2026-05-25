# AI Prompts & Interaction Log

## Model Used
**Claude Sonnet 4.5** (via claude.ai)

## Approach
I used Claude as a pair programmer throughout this assignment. I shared the requirements PDF
and asked Claude to guide me step by step through scaffolding, implementation, and debugging.

## Key Prompts

### 1. Initial Analysis
> "Here is my assignment PDF. Can you help me understand what's being asked and how to approach it?"

Claude broke down the requirements into core and extended features and suggested NestJS/TypeScript
as the stack.

### 2. Project Setup
> "Let's do TypeScript with VSCode. Guide me step by step."

Claude guided installation of NestJS CLI, dependencies, Prisma, and Docker setup.

### 3. Database Schema
> "Design the full Prisma schema for all entities: users, projects, tickets, comments,
> attachments, dependencies, audit log, mentions, and token deny list."

Claude produced the full schema.prisma with all models, enums, and relations.

### 4. Auth Module
> "Build the Auth module with JWT login, logout (token deny list), and GET /auth/me."

Claude implemented jwt.strategy.ts, jwt-auth.guard.ts, auth.service.ts, auth.controller.ts.

### 5. Core Modules
> "Build the Users, Projects, Tickets, and Comments modules with full CRUD."

Claude implemented each module with proper validation, error handling, and audit logging.

### 6. Extended Features
> "Add audit log endpoint, file attachments, CSV export/import, soft delete with restore,
> @mention parsing in comments, auto-assignment by workload, and auto-escalation scheduler."

Claude implemented all extended features across the relevant services.

### 7. Debugging
> "I'm getting this TypeScript error: [error message]. How do I fix it?"

Claude diagnosed and fixed type errors, import issues, and Prisma version incompatibilities.

### 8. Tests
> "Write unit tests covering key behaviors for auth, users, and tickets services."

Claude wrote Jest unit tests with mocked PrismaService covering happy paths and edge cases.

## Notes
- All code was reviewed and understood before committing.
- Claude was used for scaffolding and guidance, not blind copy-paste.
- Debugging was collaborative — errors were shared and fixed iteratively.