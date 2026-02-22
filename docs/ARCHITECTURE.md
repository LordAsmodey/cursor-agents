# Architecture — Subagent System

This document describes the high-level architecture of the Cursor subagent system for the full development cycle. The system has **two segments**: **design** (standalone UI/UX prototypes) and **implement** (architecture, plan, code, review, test, docs).

## Overview

The system is **orchestration-centric**: one executing agent drives each flow and calls specialized subagents via `mcp_task` with a `subagent_type` and a detailed prompt. There is no shared queue or external scheduler — coordination is linear and phase-based.

- **Design segment:** Executing agent runs **design-feature** skill as **Design Orchestrator**; calls **designer** then **design-reviewer**. Output: folder `designs/<feature-slug>/` with HTML+CSS. Not tied to implement.
- **Implement segment:** Executing agent runs **implement-feature** skill as **Orchestrator**; calls Architect (optional), Planner, Workers, Reviewers, testers, docs-writer. Can consume a design folder path when user provides it.

## Design Flow (standalone)

```
User: "design: <feature>" (optional: ref URL, competitor, style notes)
         │
         ▼
┌─────────────────────┐
│ DESIGN ORCHESTRATOR │  (executing agent; management only)
│ Parse input, set    │  → output folder: designs/<feature-slug>/
│ output folder       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐     ┌─────────────────────┐
│ DESIGNER             │ ──► │ DESIGN REVIEWER      │
│ HTML+CSS in folder  │     │ requirements,        │
│ (semantic, a11y,     │     │ responsive, a11y    │
│  responsive)         │     │ → APPROVED / FAILED  │
└─────────────────────┘     └──────────┬────────────┘
           │ FAILED (≤3)                │ APPROVED
           └────────────────────────────┘ → report path to user
```

Design flow does not call Architect or Planner. Handoff to implement: user later says **"implement: &lt;feature&gt; — design is ready in `designs/<feature-slug>/`"**; Orchestrator passes that path to Planner and frontend tasks.

## Implement Flow (high-level)

The **Orchestrator** (executing agent) only manages: it decides whom to call and what to pass; it does not write code or create the plan. The **Planner** produces the task list and execution plan.

```
User: "implement: <feature>"
         │
         ▼
┌─────────────────────┐
│ 1. ARCHITECT        │  (optional; Orchestrator decides)
│    Design           │  → architecture JSON, constraints_for_orchestrator, contracts
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 2. PLANNER         │
│    Create plan      │  → tasks[], execution plan (assignee, scope, order)
└──────────┬──────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. ORCHESTRATOR executes plan: FOR EACH TASK (by plan order)  │
│    ┌────────────┐         ┌────────────────┐                  │
│    │ WORKER     │ ──────► │ REVIEWER       │                  │
│    │ (assignee) │         │ (matching)     │                  │
│    └─────┬──────┘         └───────┬────────┘                  │
│          │ FAILED ≤3              │ APPROVED                   │
│          └────────────────────────┘ → next task                │
│          │ FAILED, rework_count≥3 → circuit breaker → freeze, next task or report │
└──────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────┐
│ 4. REPORT TO USER   │  Summary, files changed, failures
└─────────────────────┘
```

## Components

### Orchestrator (executing agent / coordinator)

- Reads `.cursor/skills/implement-feature/SKILL.md` and acts as Orchestrator (management only).
- Parses user input; decides whether to call Architect; calls Planner with feature + optional architecture.
- Receives plan from Planner; does **not** create the plan or write code.
- For each task in plan order: calls Worker by assignee, then matching Reviewer; handles rework loop and circuit breaker.
- Produces final report.

### Architect

- **Input:** Feature description (and codebase context as needed).
- **Output:** Architecture design (JSON), contracts, `constraints_for_orchestrator`, steering rules, risks, optional ADR candidate.
- **Circuit breaker:** Can set `architecture_conflict: true` and stop the workflow.

### Planner

- **Input:** Feature description; optionally architecture (or summary) and constraints from Architect.
- **Output:** List of tasks (id, title, scope, depends_on, acceptance_criteria, assignee, parallel_group) and execution plan.
- Does not implement, review, or manage execution; only creates the plan. Consumes `constraints_for_orchestrator` when architecture is provided.

### Workers

- **Input:** One task (title, description, scope, acceptance_criteria, expected_output) plus relevant architecture/contracts.
- **Output:** Implementation summary (files changed, decisions).
- One worker type per domain (e.g. frontend-worker, backend-worker).

### Reviewers

- **Input:** Same task, architecture/contracts, and description of changes (or diff).
- **Output:** `APPROVED` or `FAILED` with a list of issues.
- One reviewer per domain (e.g. frontend-reviewer, backend-reviewer).

## Context Handoffs

### Design segment

| From → To | What is passed |
|-----------|----------------|
| User → Design Orchestrator | Feature description; optional ref URL, competitor, style notes |
| Design Orchestrator → Designer | Feature name, description, output folder path, refs/constraints |
| Designer → Design Orchestrator | Summary of files created, structure |
| Design Orchestrator → Design Reviewer | Folder path, feature description/requirements |
| Design Reviewer → Design Orchestrator | APPROVED or FAILED + issues |
| Design Orchestrator → Designer (rework) | Same folder + "FAILED" + issues list |
| Design Orchestrator → User | Path to folder; how to use with implement |

### Implement segment

| From → To | What is passed |
|-----------|----------------|
| User → Architect | Feature description |
| User → Orchestrator | When design ready: design folder path (e.g. `designs/<feature-slug>/`) |
| Architect → Planner | Feature + architecture (or summary) + constraints_for_orchestrator + contracts |
| Orchestrator → Planner | Feature + architecture (if any); design folder path when provided |
| Planner → Orchestrator | tasks array + execution plan |
| Orchestrator → Worker | One task + architecture/contracts; for frontend: design folder path when provided |
| Worker → Reviewer | Same task + architecture/contracts + description of changes |
| Reviewer → Worker (rework) | Same task + "FAILED" + list of issues |
| Any phase → User | Final report; on conflict or circuit breaker: reason and next steps |

## Agent Registry

The **implement-feature** skill keeps an **Agent Registry** that maps task `assignee` (from Planner) → `subagent_type` for `mcp_task` (frontend-worker, backend-worker, frontend-reviewer, backend-reviewer, plus testers and docs-writer invoked by Orchestrator at test/docs phase).

The **design-feature** skill does not use assignees from a plan; the Design Orchestrator calls **designer** and **design-reviewer** explicitly by `subagent_type`. Ensure the environment supports `designer` and `design-reviewer` for `mcp_task` when using the design flow.

## Failure Handling

- **Design:** Design Reviewer returns FAILED → Design Orchestrator sends issues to Designer and repeats (max 3 rework cycles). After 3 cycles, circuit breaker: report path and issues, suggest manual fix or re-run design with adjusted requirements.
- **Implement — architecture conflict:** Architect sets `architecture_conflict: true` → coordinator stops and reports.
- **Implement — review FAILED (≤3 times):** Coordinator sends issues to Worker and retries the same task.
- **Implement — review FAILED (4th time):** Circuit breaker — freeze task, suggest decomposition or architecture reassessment, report to user.
- **Missing subagent type:** Report to user and list available types.

## Design Principles

- **Single coordinator:** One agent drives the flow; subagents are stateless per call.
- **Explicit contracts:** Architect defines API/hook/component contracts; Workers and Reviewers use them.
- **Strict scope:** Tasks have explicit file scope; Workers and Reviewers must not exceed it.
- **Extensibility:** New domains (backend, tests, etc.) are added by new agent definitions + Registry entries.
