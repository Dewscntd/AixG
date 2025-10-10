# Repository Guidelines

## Project Structure & Module Organization
Core back-end services live in `src/`, split by domain (`api-gateway`, `video-ingestion-service`, `analytics-engine-service`, `ml-pipeline-service`, `team-management-service`) with shared utilities in `src/shared` and CQRS artifacts under `src/domain` and `src/application`. The React/Next.js dashboard is in `frontend/`. Jest suites sit in `test/` (unit, integration, contract, e2e, performance, chaos), while infrastructure manifests live in `infrastructure/` and `k8s/`. Database schema, migrations, and seeds are managed in `prisma/`, with additional fixtures in `database/` and automation helpers in `scripts/`.

## Build, Test, and Development Commands
Use `npm run setup:dev` to install dependencies, start Docker services, and run migrations for a fresh environment. `npm run dev:all` runs backend, frontend, and supporting services concurrently. `npm run build` compiles TypeScript and triggers the frontend build; invoke before packaging or container builds. For targeted workflows, `npm run start:video-ingestion`, `npm run start:analytics`, or `npm run start:frontend` focus on individual services. `npm run test:all` aggregates unit, integration, contract, and e2e suites, while `npm run test:ci` adds performance and security checks. `docker-compose -f docker-compose.development.yml up -d` restores the local Pulsar/Postgres/Redis stack.

## Coding Style & Naming Conventions
Follow TypeScript best practices with 2-space indentation, strict typing, and NestJS providers/controllers per domain. Name files after their bounded context (`player-tracking.command.ts`, `formation-analysis.service.ts`), and keep React components PascalCase under `frontend/src/components`. Run `npm run lint` and `npm run format:check` before pushing; they invoke ESLint + Prettier for backend and frontend, keeping imports sorted and decorators aligned.

## Testing Guidelines
Jest config covers backend suites in `test/` with specs suffixed `.spec.ts`; co-locate new tests beside the code or in the matching test bucket. Ensure coverage stays ≥90% using `npm run test:coverage`, reviewing `jest_html_reporters.html` when regressions appear. Performance and chaos harnesses live under `test/performance` and `test/chaos`; trigger with `npm run test:performance` and `npm run test:chaos`. Playwright scenarios for the dashboard reside in `frontend/tests` and run via `npm run test:frontend`.

## Commit & Pull Request Guidelines
Follow the Conventional Commits pattern visible in history (`feat(scope):`, `fix:`, `docs:`). Group changes per bounded context and mention affected services and Prisma migration status in the PR description. Attach screenshots or video clips for UI updates and note any feature flags or rollout steps. Every PR should pass `npm run test:all` and `npm run lint`; include command output in the PR checklist and link the corresponding Jira ticket or issue. Highlight breaking changes in the PR title and outline rollback or mitigation steps.
