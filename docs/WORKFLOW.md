# Implement-Feature Workflow

This document describes the **implement-feature** workflow in detail. The canonical source is `.cursor/skills/implement-feature/SKILL.md`; here we summarize and clarify.

## When the Workflow Applies

- User says **"implement"** or **"implement: &lt;feature description&gt;"** (or equivalent).
- The rule in `.cursor/rules/implement-command.mdc` is always applied and instructs the executing agent to run the implement-feature skill.

Do **not** use the full workflow for one-off edits, small bugfixes without feature scope, or when the user only wants design or only a task list.

## Steps in Order

### Step 0 — Parse user input

- Extract the feature description from the user message.
- If too vague, ask one clarifying question before starting.

### Step 1 — Architect (optional)

- **Call when:** Feature is non-trivial. Call for: new API module or API surface, new flow/screen with its own state, multiple modules affected, module/package boundary changes, new integration (e.g. auth, payment). **Skip** for: single-component or single-file change, one new endpoint in an existing module, tiny UI tweak, single bugfix.
- **Pass:** Feature description; request full architectural design per `.cursor/agents/architect.md` (JSON output).
- **After:** If `architecture_conflict: true`, report to user and stop. Otherwise keep architecture, constraints_for_orchestrator, contracts, steering_rules, risks.

### Step 2 — Planner

- **Pass:** Feature description; optionally full architecture (or summary) and note to use constraints_for_orchestrator and contracts.
- **Request:** Task list and execution plan per `.cursor/agents/planner.md`: tasks with id, title, description, scope, depends_on, acceptance_criteria, expected_output, assignee, parallel_group.
- **Keep:** tasks array and execution plan (order and parallel groups). The Orchestrator (you) does not create the plan — only call Planner and use its output.
- **Validate plan:** Before executing, ensure each task has non-empty scope, assignee is in Agent Registry, and depends_on has no circular references. If not, ask Planner to fix or report to user.

### Step 3 — Execute tasks

- Resolve order from the execution plan (respect depends_on and parallel_group). **Parallel execution:** Tasks in the same phase with the same non-null `parallel_group` must be run in parallel (multiple mcp_task calls), then run the matching Reviewer for each. Other tasks run sequentially (Worker → Reviewer per task).
- **Retry limit:** The Orchestrator maintains a **rework_count** per task (initial 0). Maximum **3 retries** per task; no infinite Worker ↔ Reviewer loops.
- For **each task**:
  1. **Call Worker** — use Agent Registry to get `subagent_type` from task’s `assignee`. Pass task + architecture/contracts. Capture summary.
  2. **Call Reviewer** — use reviewer that matches the domain (e.g. frontend-reviewer for frontend-worker, backend-reviewer for backend-worker). Pass task + architecture/contracts + changes. Get APPROVED or FAILED.
  3. If **APPROVED** → mark task done, continue.
  4. If **FAILED** → Orchestrator increments this task's rework_count. If rework_count &lt; 3 → send issues to same Worker, repeat from step 1 for this task. If rework_count ≥ 3 → **circuit breaker**: freeze task, summarize failure, suggest next steps (decompose, reassess, or manual fix), then continue with next task or report to user; do not retry this task again.

### Step 3.5 — Test phase (after all implementation tasks)

- Run testers in order: **frontend-tester** → **backend-tester** → **e2e-tester** (build + E2E/integration).
- Orchestrator maintains **test_retry_count** (initial 0). Maximum **3 test retry cycles**.
- If any tester reports **FAILED**: increment test_retry_count; if test_retry_count &lt; 3, identify affected tasks by domain (frontend failure → frontend-worker tasks; backend → backend-worker; E2E → all or as suggested), rework them (Worker → Reviewer), then re-run the test phase. If test_retry_count ≥ 3 → **test circuit breaker**: stop test rework, summarize which tester failed, suggest next steps, include in final report.

### Step 4 — Report to user

- Summarize: feature name, completed tasks, any failed/frozen tasks.
- Summarize **test phase**: frontend/backend/e2e PASSED or FAILED; if test circuit breaker triggered, which tester failed and after how many retries.
- List important files changed and manual verification steps.
- **ADR:** If the Architect suggested an ADR (`adr_candidate`), mention the suggested path (e.g. `docs/adr/ADR-0001-title.md`) and suggest the user create the file from `docs/adr/ADR-TEMPLATE.md`. ADRs live in `docs/adr/`; see `docs/adr/README.md` for when and how to add them.

## Agent Registry (Reference)

| assignee | subagent_type | Role |
|----------|----------------|------|
| frontend-worker | frontend-worker | Implement frontend task |
| frontend-reviewer | frontend-reviewer | Review frontend changes |
| backend-worker | backend-worker | Implement backend task |
| backend-reviewer | backend-reviewer | Review backend changes |
| — | frontend-tester | Run frontend test suite |
| — | backend-tester | Run backend test suite |
| — | e2e-tester | Build app + E2E/integration |
| architect | architect | Produce architecture design |
| planner | planner | Create tasks + execution plan |

Testers are invoked by the Orchestrator during the test phase (not by task assignee). When new implementation agents are added, extend this table in the skill and use the same assignees in Planner output.

## Checklist Before Starting

- Feature description is clear (or one clarifying question asked).
- Agent Registry matches available `subagent_type` values in the environment.
- Executing agent has access to `mcp_task` and can pass `subagent_type` and prompt.

## Checklist Before Reporting

- All completed tasks listed with outcomes.
- Test phase result (PASSED or FAILED, and which tester if FAILED) summarized.
- Any frozen task or test circuit breaker has a short failure reason and suggestion.
- ADR suggestion (if any) mentioned.
- Key files changed and manual verification steps summarized.
