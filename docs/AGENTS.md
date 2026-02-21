# Agents Reference

This document describes each agent in the system. It is intended for both humans and for AI context (e.g. the Architect is instructed to read `AGENTS.md` when present).

## Agent List (Current)

| Agent | Role | Trigger / When used |
|-------|------|----------------------|
| **architect** | Full-stack design: structure, contracts, DTOs, constraints for Planner | Design phase; optional for trivial features |
| **orchestrator** | Management only: decides whom to call (Architect, Planner, Workers, Reviewers), passes context; does not write code or create the plan | Executing agent when running implement-feature |
| **planner** | Create task list and execution plan from feature + optional architecture | After (optional) Architect; invoked by Orchestrator |
| **frontend-worker** | Implement a single frontend task (React/Next.js/TypeScript) | Per task with assignee `frontend-worker` |
| **frontend-reviewer** | Review frontend changes for scope, types, SSR, performance, a11y | After each frontend-worker task |

## Architect

- **Does:** Analyzes requirements, evaluates codebase patterns, defines frontend and backend approach, specifies boundaries, DTOs, API contracts, file structure, state management, steering rules, constraints for Planner, risks, optional ADR.
- **Does not:** Implement code, split into tasks, review code, manage execution.
- **Output:** Structured JSON (see `.cursor/agents/architect.md`) including `architecture_conflict` when circuit breaker applies.

## Orchestrator

- **Does:** Receives the feature request; decides whether to call Architect; calls Planner with feature + optional architecture; receives plan; runs each task by calling Worker then Reviewer (by assignee); handles rework and circuit breaker; reports to user.
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

## Adding New Agents

1. Add a new agent definition file under `.cursor/agents/` (e.g. `backend-worker.md`, `backend-reviewer.md`).
2. In the implement-feature skill’s **Agent Registry**, add a row mapping the new assignee to the new `subagent_type`.
3. In Architect and Planner instructions/outputs, use the new assignee (e.g. `backend-worker`, `backend-reviewer`) for backend tasks.
4. Ensure your Cursor/environment supports the new `subagent_type` in `mcp_task` (or equivalent) so the coordinator can invoke the new agent.
