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

- **Call when:** Feature is non-trivial (new flows, new API, multiple modules). Skip for tiny UI tweaks or single-file changes.
- **Pass:** Feature description; request full architectural design per `.cursor/agents/architect.md` (JSON output).
- **After:** If `architecture_conflict: true`, report to user and stop. Otherwise keep architecture, constraints_for_orchestrator, contracts, steering_rules, risks.

### Step 2 — Orchestrator

- **Pass:** Feature description; optionally full architecture (or summary) and note to use constraints_for_orchestrator and contracts.
- **Request:** Task list and execution plan per `.cursor/agents/orchestrator.md`: tasks with id, title, description, scope, depends_on, acceptance_criteria, expected_output, assignee, parallel_group.
- **Keep:** tasks array and execution plan (order and parallel groups).

### Step 3 — Execute tasks

- Resolve order from the execution plan (respect depends_on and parallel_group). Same phase + same parallel_group → can run in parallel.
- For **each task**:
  1. **Call Worker** — use Agent Registry to get `subagent_type` from task’s `assignee`. Pass task + architecture/contracts. Capture summary.
  2. **Call Reviewer** — use reviewer that matches the domain (e.g. frontend-reviewer for frontend-worker). Pass task + architecture/contracts + changes. Get APPROVED or FAILED.
  3. If **APPROVED** → mark task done, continue.
  4. If **FAILED** and rework count &lt; 3 → send issues to same Worker, increment rework, repeat from 3.1.
  5. If **FAILED** and rework count ≥ 3 → **circuit breaker**: freeze task, summarize failure, suggest decomposition or architecture reassessment, report to user; do not retry.

### Step 4 — Report to user

- Summarize: feature name, completed tasks, any failed/frozen tasks.
- List important files changed and manual verification steps.
- Mention ADR suggestion and path if Architect suggested one.

## Agent Registry (Reference)

| assignee | subagent_type | Role |
|----------|----------------|------|
| frontend-worker | frontend-worker | Implement frontend task |
| frontend-reviewer | frontend-reviewer | Review frontend changes |
| architect | architect | Produce architecture design |
| orchestrator | orchestrator | Decompose into tasks |

When new agents are added (e.g. backend-worker, backend-reviewer), extend this table in the skill and use the same assignees in Orchestrator output.

## Checklist Before Starting

- Feature description is clear (or one clarifying question asked).
- Agent Registry matches available `subagent_type` values in the environment.
- Executing agent has access to `mcp_task` and can pass `subagent_type` and prompt.

## Checklist Before Reporting

- All completed tasks listed with outcomes.
- Any frozen task has a short failure reason and suggestion.
- ADR suggestion (if any) mentioned.
- Key files changed and manual verification steps summarized.
