# Roadmap — Agents and Teams to Implement

This document is a living roadmap and todo list: which agents and capabilities are still to be implemented or improved so the system supports a **full development cycle**.

---

## Current Status (Done)

| Component | Status | Notes |
|-----------|--------|--------|
| Architect agent | Done | `.cursor/agents/architect.md` |
| Orchestrator agent | Done | `.cursor/agents/orchestrator.md` |
| Frontend Worker | Done | `.cursor/agents/frontend-worker.md` |
| Frontend Reviewer | Done | `.cursor/agents/frontend-reviewer.md` |
| Backend Worker | Done | `.cursor/agents/backend-worker.md` |
| Backend Reviewer | Done | `.cursor/agents/backend-reviewer.md` |
| Implement-feature skill | Done | Full workflow: architect → plan → implement → review → test → docs |
| Implement rule | Done | Triggers skill on "implement" / "implement: &lt;feature&gt;" |
| Agent Registry | Done | Maps assignee → subagent_type (frontend + backend + testers, docs-writer) |
| Design segment | Done | design-feature skill, designer, design-reviewer, design-command rule |
| Designer agent | Done | `.cursor/agents/designer.md` — HTML+CSS in `designs/<feature-slug>/` |
| Design Reviewer agent | Done | `.cursor/agents/design-reviewer.md` |
| Design rule | Done | Triggers design-feature on "design" / "design: &lt;feature&gt;" |
| Design → implement handoff | Done | User passes design folder; Planner/frontend-worker use it |
| Documentation | Done | README, docs/ARCHITECTURE, AGENTS, WORKFLOW, DESIGN-WORKFLOW |

---

## 0. Design Segment (Done)

Standalone design flow: UI/UX prototypes as HTML+CSS in a feature folder, then pass that folder to implement.

| Item | Description | Deliverable |
|------|-------------|-------------|
| **design-feature skill** | Design Orchestrator calls Designer → Design Reviewer; output folder `designs/<feature-slug>/`. | Done: `.cursor/skills/design-feature/SKILL.md` |
| **designer** | Produces HTML+CSS in given folder from feature description / ref / competitor; semantic HTML, responsive, a11y. | Done: `.cursor/agents/designer.md` |
| **design-reviewer** | Reviews folder for requirements, responsiveness, accessibility; APPROVED or FAILED + issues. | Done: `.cursor/agents/design-reviewer.md` |
| **design-command rule** | Triggers design-feature on "design" / "design: &lt;feature&gt;". | Done: `.cursor/rules/design-command.mdc` |
| **Handoff to implement** | User passes design folder path; Planner and frontend-worker implement from that design. | Done: implement-feature Step 0, Context Handoffs, planner.md, frontend-worker.md; `designs/README.md` |

---

## 1. Backend Agents (Done)

Backend worker and reviewer are implemented; Architect and Orchestrator use assignees `backend-worker` and `backend-reviewer` for backend tasks.

| Item | Description | Deliverable |
|------|-------------|-------------|
| **backend-worker** | Agent that implements a single backend task (e.g. Nest/Express module, controller, service, DTOs) within given scope and contracts. | Done: `.cursor/agents/backend-worker.md`; in Agent Registry; docs/AGENTS.md. |
| **backend-reviewer** | Agent that reviews backend changes for architecture compliance, types, error handling, security, scope. | Done: `.cursor/agents/backend-reviewer.md`; in Agent Registry; docs/AGENTS.md. |
| **Orchestrator/Architect alignment** | Architect and Orchestrator use assignees `backend-worker` and `backend-reviewer` for backend tasks. | Done: SKILL.md, orchestrator.md, planner.md, architect.md. |

---

## 2. Testing Agents (Medium Priority)

End-to-end quality gates are not yet automated in the workflow.

| Item | Description | Deliverable |
|------|-------------|-------------|
| **test-runner / test-executor** | Agent (or integration) that runs unit/integration tests for changed scope and reports pass/fail. | Optional agent `.cursor/agents/test-runner.md` or script; decision whether it runs after Worker or after Reviewer. |
| **E2E or QA agent** | Optional agent that suggests or runs E2E checks for the feature (e.g. critical paths). | Lower priority; can be a later phase. |

---

## 3. DevOps / CI Integration (Medium Priority)

| Item | Description | Deliverable |
|------|-------------|-------------|
| **Pipeline / CI hints** | Document or agent that outputs suggested CI steps (lint, test, build) for the changed scope. | Either in Architect/Orchestrator output or a small "devops" agent. |
| **Lint / format** | Ensure Workers or a dedicated step run lint/format so Reviewer sees clean code. | Rule or skill step: run lint before or after Worker; document in WORKFLOW. |

---

## 4. Documentation and Product (Lower Priority)

| Item | Description | Deliverable |
|------|-------------|-------------|
| **Documentation writer agent** | Agent that drafts or updates user-facing or API docs for the implemented feature. | `.cursor/agents/docs-writer.md`; assignee in Orchestrator for "docs" tasks. |
| **Changelog / release notes** | Optional step or agent that suggests changelog/release-note bullets from completed tasks. | Can be part of final report or a small script. |

---

## 5. System Improvements (Ongoing)

| Item | Description | Deliverable |
|------|-------------|-------------|
| **Expand Agent Registry** | Every new agent (backend, test, docs) must be registered in implement-feature skill and, if needed, in Architect/Orchestrator instructions. | Edits to SKILL.md and optionally architect.md / orchestrator.md. |
| **ADR and decisions** | When Architect suggests an ADR, ensure there is a standard place (e.g. `docs/adr/`) and optionally an agent or rule that reminds to create it. | docs/adr/ folder; optional ADR template; mention in WORKFLOW. |
| **Clarification flow** | Orchestrator already can return follow-up questions; ensure the coordinator passes them to the user and resumes cleanly. | Verify in skill and docs. |
| **Parallel execution** | Execution plan already supports parallel_group; ensure the coordinator actually runs tasks in the same phase/group in parallel when multiple agents are available. | Verify in skill implementation. |

---

## 6. Suggested Implementation Order

1. ~~**Backend Worker + Backend Reviewer**~~ — Done; full-stack "implement" flows supported.
2. **Agent Registry + docs update** — Register any future agents (test-runner, docs-writer) and document them.
3. **Lint/format in workflow** — Quick win for quality.
4. **Test-runner (or test step)** — After backend is in place, add test execution to the loop.
5. **CI hints / DevOps** — Once tasks and scope are stable.
6. **Documentation writer / changelog** — As needed for product docs.

---

## 7. Todo Checklist (Copy and Use)

- [x] Add `backend-worker` agent (`.cursor/agents/backend-worker.md`)
- [x] Add `backend-reviewer` agent (`.cursor/agents/backend-reviewer.md`)
- [x] Register backend agents in implement-feature skill Agent Registry
- [x] Update Architect/Orchestrator to use `backend-worker` / `backend-reviewer` for backend tasks
- [x] Update docs/AGENTS.md with backend agents
- [x] Add design segment: design-feature skill, designer, design-reviewer, design-command rule
- [x] Document design output and handoff to implement (designs/README.md, docs/DESIGN-WORKFLOW.md)
- [ ] Define lint/format step in workflow (rule or skill)
- [ ] Add `docs/adr/` and ADR template (optional)
- [ ] Design and add test-runner or test step (optional)
- [x] Add documentation writer agent (optional) — done
- [ ] Add CI/pipeline hints to architecture or report (optional)

---

*Last updated: 2026-02 — design segment added; adjust dates and check off items as the project evolves.*
