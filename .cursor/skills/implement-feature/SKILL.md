---
name: implement-feature
description: Runs the full feature implementation workflow: design (Architect), plan creation (Planner), then execution per task (Worker → Reviewer) driven by the Orchestrator. The executing agent acts as Orchestrator (management only); it does not write code or the plan. Use when the user says "implement", "implement: <feature>", or requests to implement a feature end-to-end using project agents.
---

# Implement Feature — Full Workflow

This skill defines the end-to-end workflow for implementing a feature using project agents. The **executing agent** acts as **Orchestrator**: it coordinates subagents via `mcp_task`, decides who to call (Architect, Planner, Workers, Reviewers), and passes context between phases. It does **not** write code or create the implementation plan — the **Planner** creates the plan.

---

## When to Apply

- User says **"implement"**, **"implement: &lt;feature description&gt;"**, or clearly requests to implement a feature using the agent pipeline.
- Do **not** apply for one-off edits, bugfixes without feature scope, or when the user only wants design or only wants a task list.

---

## High-Level Flow

The **Orchestrator** (you, the executing agent) only manages: you decide whom to call and what to pass. The **Planner** produces the task list and execution plan; you never write the plan yourself.

```
User: "implement: <feature>"
    │
    ▼
┌─────────────────┐
│ 1. ARCHITECT    │  (optional: Orchestrator decides; skip if trivial)
│    Design       │  → architecture design (JSON), constraints_for_orchestrator
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. PLANNER      │  Input: feature + (architecture or none)
│    Create plan  │  → tasks[], execution plan (assignee, scope, order)
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 3. ORCHESTRATOR executes plan: FOR EACH TASK (in order)  │
│    ┌──────────────┐    ┌────────────────┐               │
│    │ WORKER       │ →  │ REVIEWER       │               │
│    │ (assignee)   │    │ (matching)     │               │
│    └──────┬───────┘    └───────┬────────┘               │
│           │  FAILED (≤3 tries) │  APPROVED               │
│           └────────────────────┘ → next task or done     │
│           │  FAILED (>3) → circuit breaker → user        │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│ 4. REPORT       │  Summarize: what was done, files changed, any failures
│    to User      │
└─────────────────┘
```

---

## Agent Registry (Extensible)

Map task `assignee` from **Planner** output to `subagent_type` for `mcp_task`. The Orchestrator (you) calls Architect and Planner explicitly; for execution you use this table to dispatch Workers and Reviewers by assignee.

| assignee           | subagent_type     | Role                          |
|--------------------|-------------------|-------------------------------|
| frontend-worker    | frontend-worker   | Implement frontend task       |
| frontend-reviewer  | frontend-reviewer | Review frontend changes       |
| architect          | architect         | Produce architecture design   |
| planner            | planner           | Create tasks + execution plan |

**Adding agents:** Define new assignees in Architect and Planner outputs (e.g. `backend-worker`, `backend-reviewer`), add corresponding rows here and ensure those subagent types exist in the environment.

---

## Step-by-Step Instructions

### Step 0: Parse User Input

- Extract **feature description** from the user message (e.g. after "implement:" or from the last message).
- If the description is vague or too short, ask one clarifying question before starting (e.g. "Which screens and API should this include?").

### Step 1: Call Architect (Optional)

- **When to call:** Feature is non-trivial (new flows, new API surface, new state, multiple modules). Skip for tiny UI tweaks or single-file changes.
- **Prompt to pass:** Feature description + request to produce the full architectural design per `.cursor/agents/architect.md` (overview, backend/frontend, contracts, constraints_for_orchestrator, steering_rules, risks). Ask for output in the JSON structure defined in architect.md.
- **After call:**
  - If `architecture_conflict: true` → report to user with `conflict_reason` and `suggested_refactor`; stop workflow.
  - Otherwise keep: `architecture` (full design), `constraints_for_orchestrator`, `contracts`, `steering_rules`, `risks`.

### Step 2: Call Planner

- **Input to pass:** Feature description; optionally full architecture output (or summary) and explicit note: "Use constraints_for_orchestrator and contracts from the architecture if provided."
- **Prompt:** Ask Planner to produce the task list and execution plan per `.cursor/agents/planner.md`: tasks with `id`, `title`, `description`, `scope`, `depends_on`, `acceptance_criteria`, `expected_output`, `assignee`, `parallel_group`. Request execution plan (phases and order).
- **Output to keep:** `tasks` (array), execution plan (which task runs when, and which are parallel).
- **You (Orchestrator) do not create the plan** — only call the Planner and use its output.

### Step 3: Execute Tasks in Order

- Resolve order from the execution plan (respect `depends_on` and `parallel_group`). Run tasks in phases: all tasks in the same phase with the same `parallel_group` can be launched in parallel via multiple `mcp_task` calls; others run sequentially.
- For **each task**:

  1. **Call Worker (assignee)**  
     - `subagent_type` = value from Agent Registry for this task’s `assignee`.  
     - **Prompt:** Include:
       - Task: `title`, `description`, `scope`, `acceptance_criteria`, `expected_output`
       - Architecture summary or relevant contracts (and steering_rules if any)
       - Instruction: "Implement only within the given scope; do not change architecture or out-of-scope files."
     - Capture the agent’s summary (files changed, key decisions).

  2. **Call Reviewer**  
     - Use the reviewer that matches the domain (e.g. frontend-reviewer for frontend-worker tasks).  
     - **Prompt:** Include:
       - The same task (acceptance_criteria, scope)
       - Architecture plan / contracts (so reviewer can check compliance)
       - Request: "Review the changes made for this task (see attached context / diff). Output either APPROVED or FAILED with issues as in .cursor/agents/frontend-reviewer.md."

  3. **If review result is APPROVED**  
     - Mark task done; continue to the next task (or phase).

  4. **If review result is FAILED**  
     - If rework count for this task **&lt; 3**: pass the reviewer’s issues back to the same Worker (same task, plus list of issues to fix). Increment rework count; go to step 3.1 for this task again.  
     - If rework count **≥ 3**: run **circuit breaker**: freeze the task, summarize failure (task id, repeated issues), suggest "architectural reassessment or recursive decomposition" per orchestrator.md. Report to user and stop or pause workflow (do not auto-retry further).

### Step 4: Report to User

- Summarize: feature name, which tasks were completed, which (if any) failed or were frozen.
- List important files changed and any manual verification steps.
- If an ADR was suggested by Architect, mention it and the suggested file path.

---

## Context Handoffs (What to Pass Where)

| From → To        | Pass                                                                 |
|------------------|----------------------------------------------------------------------|
| User → Architect | Feature description only (and codebase context as needed).           |
| Architect → Planner | Feature + architecture JSON (or summary) + constraints_for_orchestrator + contracts. |
| Planner → Orchestrator | tasks array + execution plan (Orchestrator uses this to run Workers/Reviewers). |
| Orchestrator → Worker | One task (title, description, scope, acceptance_criteria, expected_output) + architecture/contracts relevant to that task. |
| Worker → Reviewer | Same task + architecture/contracts + description of changes (or diff). |
| Reviewer → Worker (rework) | Same task + "Review Result: FAILED" and the list of issues. |
| Any phase → User | Final report; on conflict or circuit breaker, reason and next steps. |

---

## Failure and Conflict Handling

- **Architect returns architecture_conflict:** Stop; report `conflict_reason` and `suggested_refactor` to user.
- **Planner returns clarification questions:** Return those questions to the user; resume after answer.
- **Review FAILED &lt;= 3 times:** Send issues to Worker, retry same task.
- **Review FAILED 4th time (circuit breaker):** Freeze task, write short failure analysis, suggest decomposition or architecture reassessment, report to user.
- **Worker or Reviewer subagent unavailable:** Report to user that the assignee type is not available and list available subagent types so they can adjust agents or task assignees.

---

## Checklist Before Starting the Workflow

- [ ] Feature description is clear enough (or one clarifying question asked).
- [ ] Agent Registry table is aligned with available `subagent_type` values in your environment.
- [ ] You have access to `mcp_task` and can pass `subagent_type` and a detailed `prompt` for each agent.

---

## Checklist Before Reporting to User

- [ ] All completed tasks are listed with their outcomes.
- [ ] Any frozen task has a short failure reason and suggestion.
- [ ] ADR suggestion (if any) is mentioned.
- [ ] Key files changed and manual verification steps are summarized.
