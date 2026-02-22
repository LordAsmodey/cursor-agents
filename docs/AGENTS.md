# Agents Reference

This document describes each agent in the system. It is intended for both humans and for AI context (e.g. the Architect is instructed to read `AGENTS.md` when present).

## Agent List (Current)

| Agent | Role | Trigger / When used |
|-------|------|----------------------|
| **architect** | Researches best practices, proposes 3+ options, chooses best; full-stack design aligned with existing architecture | Design phase; use strongest model (e.g. Opus); optional for trivial features |
| **orchestrator** | Management only: decides whom to call (Architect, Planner, Workers, Reviewers), passes context; does not write code or create the plan | Executing agent when running implement-feature |
| **planner** | Create task list and execution plan from feature + optional architecture | After (optional) Architect; invoked by Orchestrator |
| **frontend-worker** | Implement a single frontend task (React/Next.js/TypeScript) | Per task with assignee `frontend-worker` |
| **frontend-reviewer** | Review frontend changes for scope, types, SSR, performance, a11y | After each frontend-worker task |
| **backend-worker** | Implement a single backend task (API, services, DTOs, validation, DB) | Per task with assignee `backend-worker` |
| **backend-reviewer** | Review backend changes for contracts, validation, security, scope | After each backend-worker task |
| **frontend-tester** | Design test cases from tasks, write or extend frontend tests, run suite; report PASSED or FAILED | Test phase, after all implementation tasks |
| **backend-tester** | Design test cases from tasks, write or extend backend tests, run suite; report PASSED or FAILED | Test phase, after frontend-tester |
| **e2e-tester** | Design E2E cases, write or extend E2E tests, build and run; report PASSED or FAILED | Test phase, after backend-tester |
| **docs-writer** | Create/update ADR, README, docs/ after implementation | Docs phase, after test phase; invoked by Orchestrator |

## Architect

- **Does:** Researches (web search, best practices, docs); produces at least 3 architectural options and chooses the best for the task and project; analyzes requirements; evaluates and **respects existing codebase architecture**; defines frontend and backend approach, boundaries, DTOs, API contracts, file structure, state management, steering rules, constraints for Planner, risks, optional ADR. Run with the **most capable model** (e.g. Claude Opus); Orchestrator should invoke with strongest model, not default/fast.
- **Does not:** Implement code, split into tasks, review code, manage execution.
- **Output:** Structured JSON (see `.cursor/agents/architect.md`) including `architecture_conflict` when circuit breaker applies.

## Orchestrator

- **Does:** Receives the feature request; decides whether to call Architect; calls Planner with feature + optional architecture; receives plan; runs each task by calling Worker then Reviewer (by assignee); handles rework and circuit breaker; after all tasks runs test phase (passes tasks + acceptance_criteria to testers; testers design cases, write tests, run suite); on test FAILED sends feedback to Worker → Reviewer → re-runs test phase (max 3 cycles); then runs docs phase (docs-writer) and reports to user.
- **Does not:** Write code, review code, or create the implementation plan (Planner creates the plan).
- **Output:** No standalone output; drives the workflow and produces the final report to the user.

## Planner

- **Does:** Analyzes feature request (and optional architecture), breaks into atomic tasks, defines dependencies and execution order, assigns assignees, produces execution plan. Respects `constraints_for_orchestrator` when architecture is provided.
- **Does not:** Implement code, review code, manage execution, or make architecture decisions.
- **Output:** List of tasks (with id, title, scope, depends_on, acceptance_criteria, assignee, parallel_group) and a step-by-step execution plan (see `.cursor/agents/planner.md`).
- **Rules:** No circular dependencies; scope must not overlap (or tasks strictly sequenced); assignees must exist in Agent Registry.

## Frontend Worker

- **Does:** Implements one scoped frontend task per architecture plan and acceptance criteria. Uses existing patterns, styling, and state management.
- **Does not:** Change architecture, modify out-of-scope files, refactor unrelated code, add new global deps or styling.
- **Context:** Reads `.cursor/rules/`; follows existing project structure and conventions.

## Frontend Reviewer

- **Does:** Reviews submitted frontend changes for architecture compliance, type safety, performance, SSR, state management, security, accessibility, scope.
- **Does not:** Rewrite code, introduce new architecture, implement features, modify files.
- **Output:** Either `APPROVED` (with short summary) or `FAILED` with a list of issues (what’s wrong, why it matters, how to fix).

## Backend Worker

- **Does:** Implements one scoped backend task per architecture plan and acceptance criteria: API endpoints, services, DTOs, validation, data layer. Uses existing patterns (Nest/Express/Fastify), validation, and error handling.
- **Does not:** Change architecture or API contracts, modify out-of-scope files, refactor unrelated code, expose secrets or PII.
- **Context:** Reads `.cursor/rules/`; follows existing project structure and API contracts.

## Backend Reviewer

- **Does:** Reviews submitted backend changes for architecture and API contract compliance, validation, error handling, security (injection, auth, no secrets in responses), database usage, and scope.
- **Does not:** Rewrite code, introduce new architecture, implement features, modify files.
- **Output:** Either `APPROVED` (with short summary) or `FAILED` with a list of issues (what's wrong, why it matters, how to fix).

## Frontend Tester

- **Does:** Receives feature summary and frontend tasks (with acceptance_criteria, scope). Designs test cases covering all scenarios, writes or extends frontend tests (unit/component), runs the suite; reports **Test Result: PASSED** or **FAILED** with Summary and, if FAILED, Failures (for Worker) and Suggested focus. Invoked by Orchestrator during test phase.
- **Does not:** Implement or fix production code; run backend or E2E tests.
- **Output:** Structured block per `.cursor/agents/frontend-tester.md` (PASSED/FAILED + summary/failures).

## Backend Tester

- **Does:** Receives feature summary and backend tasks (with acceptance_criteria, scope). Designs test cases covering all scenarios, writes or extends backend tests (unit/integration), runs the suite; reports **Test Result: PASSED** or **FAILED** with Summary and, if FAILED, Failures (for Worker) and Suggested focus. Invoked by Orchestrator during test phase.
- **Does not:** Implement or fix production code; run frontend or E2E tests.
- **Output:** Structured block per `.cursor/agents/backend-tester.md` (PASSED/FAILED + summary/failures).

## E2E Tester

- **Does:** Receives feature summary and tasks/key flows. Designs E2E test cases, writes or extends E2E/integration tests, builds the app and runs them; reports **Test Result: PASSED** or **FAILED** with Summary and, if FAILED, Failures and Suggested focus. Invoked by Orchestrator after frontend-tester and backend-tester.
- **Does not:** Implement or fix production code; run only unit/component tests.
- **Output:** Structured block per `.cursor/agents/e2e-tester.md` (PASSED/FAILED + summary/failures).

## Docs Writer

- **Does:** After the test phase, creates or updates documentation only: ADR from template when Architect suggested `adr_candidate`, README or `docs/` for setup/usage when the feature affects them. Invoked once by Orchestrator; no retry loop.
- **Does not:** Modify source code, tests, or config; introduce new architecture.
- **Output:** Docs Result: DONE or SKIPPED; Summary; Files created/updated; Notes (see `.cursor/agents/docs-writer.md`).

## Adding New Agents

1. Add a new agent definition file under `.cursor/agents/` (e.g. `test-runner.md`, `docs-writer.md`).
2. In the implement-feature skill’s **Agent Registry**, add a row mapping the new assignee to the new `subagent_type`.
3. In Architect and Planner instructions/outputs, use the new assignee for the corresponding tasks.
4. Ensure your Cursor/environment supports the new `subagent_type` in `mcp_task` (or equivalent) so the coordinator can invoke the new agent.
