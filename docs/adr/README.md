# Architecture Decision Records (ADR)

This folder holds **Architecture Decision Records** — short documents that capture important architectural decisions for the project.

## When to add an ADR

- The **Architect** agent may suggest an ADR when a feature introduces significant choices (e.g. new tech, patterns, or module boundaries). In the final report, the Orchestrator will mention the suggested path (e.g. `docs/adr/ADR-0001-feature-name.md`).
- **Who creates the file:** The user (or a follow-up task) creates the ADR file under `docs/adr/` using `docs/adr/ADR-TEMPLATE.md`. The Architect does not write the file; it only recommends that one be created.
- Use the template, fill in context, decision, consequences, and alternatives. Keep the document immutable after acceptance (append new ADRs for changes).

## Naming

- `ADR-NNNN-short-title.md` (e.g. `ADR-0001-jwt-auth.md`).
