# Cursor Agents — Subagent System for Full Development Cycle

A structured multi-agent system for Cursor that runs a full feature implementation workflow: from architecture design and task decomposition to implementation and code review, with handoffs, circuit breakers, and extensible agent registry.

## What This Is

This repository defines **subagents** and a **coordinated workflow** so that a single "implement" request can:

1. **Design** the feature (Architect)
2. **Decompose** it into ordered, scoped tasks (Orchestrator)
3. **Implement** each task (Workers)
4. **Review** each change (Reviewers)
5. **Report** back with a summary and any failures

Agents are invoked via Cursor’s `mcp_task` (or equivalent) by an executing agent that follows the **implement-feature** skill. No production app code lives here — only agent definitions, rules, and skills.

## Key Concepts

| Concept | Description |
|--------|-------------|
| **Architect** | Full-stack design: frontend/backend structure, contracts, DTOs, constraints for the Orchestrator. Optional for trivial features. |
| **Orchestrator** | Breaks the feature into atomic tasks, dependencies, execution order, and assignees. |
| **Workers** | Implement a single scoped task (e.g. `frontend-worker`, future `backend-worker`). |
| **Reviewers** | Review changes for scope, architecture compliance, and quality (e.g. `frontend-reviewer`). |
| **Agent Registry** | Maps task `assignee` → `subagent_type` so the coordinator knows which agent to call. |
| **Circuit breaker** | After 3 failed review iterations for a task, the workflow freezes it and escalates instead of retrying. |

## Project Structure

```
.cursor/
  rules/           # Always-on rules (e.g. "implement" triggers full workflow)
  skills/          # implement-feature skill (step-by-step workflow)
  agents/          # Per-agent prompts and behavior
    architect.md
    orchestrator.md
    frontend-worker.md
    frontend-reviewer.md
docs/              # Project documentation (architecture, agents, workflow)
ROADMAP.md         # Roadmap and todo: agents/teams to add
```

## How to Use

- Say **"implement"** or **"implement: &lt;feature description&gt;"** in Cursor.
- The rule in `.cursor/rules/` applies the **implement-feature** skill.
- The executing agent will (as needed): call Architect → Orchestrator → for each task call Worker then Reviewer → report to you.
- Ensure your environment has the corresponding `subagent_type` values (e.g. `architect`, `orchestrator`, `frontend-worker`, `frontend-reviewer`) so `mcp_task` can dispatch to them.

## Documentation

- [Architecture & flow](docs/ARCHITECTURE.md) — high-level design and handoffs
- [Agents reference](docs/AGENTS.md) — role and behavior of each agent
- [Implement workflow](docs/WORKFLOW.md) — detailed implement-feature steps
- [Roadmap](ROADMAP.md) — planned agents and improvements

## Extending the System

- **New domain (e.g. backend):** Add `backend-worker` and `backend-reviewer` agent definitions, register them in the implement-feature skill’s Agent Registry, and use the same assignees in Architect/Orchestrator outputs.
- **New rules:** Add `.mdc` files under `.cursor/rules/`.
- **New skills:** Add skill folders under `.cursor/skills/` and reference them from rules or docs.

## License

Use and adapt as needed for your workspace.
