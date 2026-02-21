# Architecture — Subagent System

This document describes the high-level architecture of the Cursor subagent system for the full development cycle.

## Overview

The system is **orchestration-centric**: one executing agent (the one that reads the implement-feature skill) drives the flow and calls specialized subagents via `mcp_task` with a `subagent_type` and a detailed prompt. There is no shared queue or external scheduler — coordination is linear and phase-based.

## High-Level Flow

```
User: "implement: <feature>"
         │
         ▼
┌─────────────────────┐
│ 1. ARCHITECT        │  (optional)
│    Design           │  → architecture JSON, constraints_for_orchestrator, contracts
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 2. ORCHESTRATOR     │
│    Decompose        │  → tasks[], execution plan
└──────────┬──────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. FOR EACH TASK (by execution plan)                          │
│    ┌────────────┐         ┌────────────────┐                  │
│    │ WORKER     │ ──────► │ REVIEWER       │                  │
│    │ (assignee) │         │ (matching)     │                  │
│    └─────┬──────┘         └───────┬────────┘                  │
│          │ FAILED ≤3              │ APPROVED                   │
│          └────────────────────────┘ → next task                │
│          │ FAILED >3 → circuit breaker → escalate               │
└──────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────┐
│ 4. REPORT TO USER   │  Summary, files changed, failures
└─────────────────────┘
```

## Components

### Coordinator (executing agent)

- Reads `.cursor/skills/implement-feature/SKILL.md`.
- Parses user input, optionally calls Architect, then Orchestrator.
- For each task: calls Worker by assignee, then matching Reviewer; handles rework loop and circuit breaker.
- Produces final report.

### Architect

- **Input:** Feature description (and codebase context as needed).
- **Output:** Architecture design (JSON), contracts, `constraints_for_orchestrator`, steering rules, risks, optional ADR candidate.
- **Circuit breaker:** Can set `architecture_conflict: true` and stop the workflow.

### Orchestrator

- **Input:** Feature description; optionally architecture (or summary) and constraints.
- **Output:** List of tasks (id, title, scope, depends_on, acceptance_criteria, assignee, parallel_group) and execution plan.
- Does not implement or review; only plans.

### Workers

- **Input:** One task (title, description, scope, acceptance_criteria, expected_output) plus relevant architecture/contracts.
- **Output:** Implementation summary (files changed, decisions).
- One worker type per domain (e.g. frontend-worker; backend-worker when added).

### Reviewers

- **Input:** Same task, architecture/contracts, and description of changes (or diff).
- **Output:** `APPROVED` or `FAILED` with a list of issues.
- One reviewer per domain (e.g. frontend-reviewer; backend-reviewer when added).

## Context Handoffs

| From → To | What is passed |
|-----------|----------------|
| User → Architect | Feature description |
| Architect → Orchestrator | Feature + architecture (or summary) + constraints_for_orchestrator + contracts |
| Orchestrator → Worker | One task + architecture/contracts relevant to that task |
| Worker → Reviewer | Same task + architecture/contracts + description of changes |
| Reviewer → Worker (rework) | Same task + "FAILED" + list of issues |
| Any phase → User | Final report; on conflict or circuit breaker: reason and next steps |

## Agent Registry

The implement-feature skill keeps an **Agent Registry** table that maps:

- Task `assignee` (string from Orchestrator) → `subagent_type` (string for `mcp_task`).

When you add new agents (e.g. backend-worker), add a row to that table and use the same assignee in Architect/Orchestrator outputs so the coordinator can dispatch correctly.

## Failure Handling

- **Architecture conflict:** Architect sets `architecture_conflict: true` → coordinator stops and reports.
- **Review FAILED (≤3 times):** Coordinator sends issues to Worker and retries the same task.
- **Review FAILED (4th time):** Circuit breaker — freeze task, suggest decomposition or architecture reassessment, report to user.
- **Missing subagent type:** Report to user and list available types.

## Design Principles

- **Single coordinator:** One agent drives the flow; subagents are stateless per call.
- **Explicit contracts:** Architect defines API/hook/component contracts; Workers and Reviewers use them.
- **Strict scope:** Tasks have explicit file scope; Workers and Reviewers must not exceed it.
- **Extensibility:** New domains (backend, tests, etc.) are added by new agent definitions + Registry entries.
