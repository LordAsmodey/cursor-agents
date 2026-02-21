# Architecture Decision Records (ADR)

This folder holds **Architecture Decision Records** — short documents that capture important architectural decisions for the project.

## When to add an ADR

- The **Architect** agent may suggest an ADR when a feature introduces significant choices (e.g. new tech, patterns, or module boundaries). The Architect outputs an `adr_candidate` (path and title).
- **Who creates the file:** The **docs-writer** agent creates the ADR file under `docs/adr/` using `docs/adr/ADR-TEMPLATE.md` when the Orchestrator runs the docs phase (after the test phase). If docs-writer was not run or is unavailable, the user can create the file manually from the template; the final report will mention the suggested path.
- Use the template, fill in context, decision, consequences, and alternatives. Keep the document immutable after acceptance (append new ADRs for changes).

## Naming

- `ADR-NNNN-short-title.md` (e.g. `ADR-0001-jwt-auth.md`).
