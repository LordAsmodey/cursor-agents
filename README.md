# Cursor Agents — Subagent System for Full Development Cycle

A structured multi-agent system for Cursor that runs **two main workflows**: (1) **design** — UI/UX HTML+CSS prototypes in a feature folder; (2) **implement** — from architecture and task decomposition to implementation, review, tests, and docs. Handoffs, circuit breakers, and extensible agent registry.

## What This Is

This repository defines **subagents** and **coordinated workflows**:

### Design workflow (separate segment)

- Say **"design"** or **"design: &lt;feature&gt;"** (optionally with reference URL, competitor site, or style notes — Figma not required).
- The **Design Orchestrator** (executing agent) calls **Designer** → **viewport-runner** (screenshots at several resolutions) → **Design Reviewer** (code, then screenshots); output is a folder **`designs/<feature-slug>/`** with HTML+CSS and optionally `screenshots/`. You can then pass that folder to the implement flow. For viewport capture, run `npm install` (and once `npx playwright install chromium`); see [Design workflow](docs/DESIGN-WORKFLOW.md) → "Setup for viewport capture". Optional: [Playwright MCP](https://github.com/microsoft/playwright-mcp) (config in `.cursor/mcp.json`).

### Implement workflow

A single **"implement"** request can:

1. **Design** the feature technically (Architect, optional)
2. **Create the plan** — ordered, scoped tasks (Planner); if design folder was provided, frontend tasks implement to match it
3. **Execute** the plan: implement each task (Workers) and review each change (Reviewers); the **Orchestrator** (executing agent) only manages — it does not write code or the plan
4. **Test** (frontend-tester → backend-tester → e2e-tester) and **docs** (docs-writer)
5. **Report** back with a summary and any failures

Agents are invoked via Cursor’s `mcp_task` (or equivalent) by an executing agent that follows the **design-feature** or **implement-feature** skill. No production app code lives here — only agent definitions, rules, and skills.

## Key Concepts

| Concept | Description |
|--------|-------------|
| **Design Orchestrator** | Runs design flow: calls Designer, then Design Reviewer; does not create HTML/CSS. Output: `designs/<feature-slug>/`. |
| **Designer** | UI/UX agent: produces HTML+CSS prototype in the given folder (semantic HTML, responsive, a11y). Input: feature description, optional ref/competitor. |
| **Viewport-runner** | Runs the viewport screenshot script for a design folder (Node + Playwright); saves PNGs to `designs/<feature>/screenshots/`. Optional; if skipped, reviewer does code-only. |
| **Design Reviewer** | Reviews code (HTML/CSS) first, then screenshots (if present) for requirements, responsiveness, accessibility; returns APPROVED or FAILED with issues. |
| **Architect** | Full-stack technical design: frontend/backend structure, contracts, DTOs, constraints for the Planner. Optional for trivial features. |
| **Orchestrator** | Management only: decides whom to call (Architect, Planner, Workers, Reviewers) and what to pass; does not write code or create the plan. |
| **Planner** | Creates the implementation plan: atomic tasks, dependencies, execution order, assignees. Consumes architecture and optional design folder path. |
| **Workers** | Implement a single scoped task (e.g. `frontend-worker`, `backend-worker`). Frontend-worker can receive design folder to implement from. |
| **Reviewers** | Review changes for scope, architecture compliance, and quality (e.g. `frontend-reviewer`, `backend-reviewer`). |
| **Agent Registry** | Maps task `assignee` (from Planner) → `subagent_type` so the Orchestrator knows which agent to call. |
| **Circuit breaker** | Orchestrator/Design Orchestrator keep rework_count (max 3 retries). After 3 retries, task/design is frozen and next steps suggested. |

## Project Structure

```
.cursor/
  rules/            # Always-on rules ("implement" → implement-feature; "design" → design-feature)
  skills/           # Skills: implement-feature, design-feature
  agents/           # Per-agent prompts and behavior
    architect.md
    orchestrator.md
    planner.md
    designer.md           # UI/UX design (HTML+CSS)
    viewport-runner.md    # Viewport screenshots (script: scripts/viewport-screenshots.js)
    design-reviewer.md    # Review design folder (code + screenshots)
    frontend-worker.md
    frontend-reviewer.md
    backend-worker.md
    backend-reviewer.md
    frontend-tester.md, backend-tester.md, e2e-tester.md
    docs-writer.md
designs/            # Output of design flow: designs/<feature-slug>/ (HTML+CSS per feature)
docs/               # Project documentation (architecture, agents, workflows)
ROADMAP.md          # Roadmap and todo
```

## How to Use

### Design (optional, separate from implement)

- Say **"design"** or **"design: &lt;feature description&gt;"** (e.g. "design: onboarding wizard" or with a reference URL / competitor site).
- The rule applies the **design-feature** skill; the executing agent acts as **Design Orchestrator**: call **designer** → **design-reviewer** (rework up to 3 times if FAILED) → report with path to **`designs/<feature-slug>/`**.

### Implement

- Say **"implement"** or **"implement: &lt;feature description&gt;"** in Cursor. If design is already done: **"implement: &lt;feature&gt; — design is ready in `designs/onboarding-wizard/`"**.
- The rule applies the **implement-feature** skill; the executing agent acts as **Orchestrator**: (as needed) Architect → **Planner** (with optional design folder path) → for each task Worker then Reviewer → test phase → docs phase → report.
- Ensure your environment has the corresponding `subagent_type` values (including `designer`, `viewport-runner`, `design-reviewer` for design; `architect`, `planner`, workers, reviewers, testers, docs-writer for implement) so `mcp_task` can dispatch to them.

## Documentation

- [Architecture & flow](docs/ARCHITECTURE.md) — high-level design, implement and design segments, handoffs
- [Agents reference](docs/AGENTS.md) — role and behavior of each agent (implement + design)
- [Implement workflow](docs/WORKFLOW.md) — detailed implement-feature steps
- [Design workflow](docs/DESIGN-WORKFLOW.md) — design-feature steps, output folder, handoff to implement
- [Roadmap](ROADMAP.md) — planned agents and improvements

## Extending the System

- **New domain (implement):** Add worker and reviewer agent definitions, register in implement-feature skill’s Agent Registry, use same assignees in Architect and Planner.
- **Design segment:** Uses `designer` and `design-reviewer` subagent types; no Registry assignees (Design Orchestrator calls them explicitly). See `.cursor/skills/design-feature/SKILL.md`.
- **New rules:** Add `.mdc` files under `.cursor/rules/` (e.g. `design-command.mdc` for "design").
- **New skills:** Add skill folders under `.cursor/skills/` and reference from rules or docs.

## License

Use and adapt as needed for your workspace.
