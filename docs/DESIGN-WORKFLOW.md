# Design-Feature Workflow

This document describes the **design-feature** workflow. The canonical source is `.cursor/skills/design-feature/SKILL.md`. The design flow is **standalone**: it does not call the Architect or Planner from the implement flow. Output is a folder with HTML+CSS that can later be passed to implement.

## When the Workflow Applies

- User says **"design"** or **"design: &lt;feature description&gt;"** (or equivalent).
- The rule in `.cursor/rules/design-command.mdc` instructs the executing agent to run the design-feature skill.

**Input can be:** text description, reference URL, competitor site, style notes. Figma or ready mockups are **not** required.

## Steps in Order

### Step 0 — Parse user input

- Extract **feature name/description** (e.g. after "design:" or from the message).
- Extract **optional context:** reference URL, competitor site, style/brand constraints, target device (e.g. mobile-first).
- If too vague, ask one clarifying question before starting.
- Derive a **feature-slug** (kebab-case) for the folder name, e.g. `onboarding-wizard` → output folder `designs/onboarding-wizard/`.

### Step 1 — Call Designer

- **subagent_type:** `designer`
- **Pass:** Feature name and description, **output folder path** (e.g. `designs/<feature-slug>/`), any reference URL / competitor / style notes.
- **Request:** Create HTML+CSS prototype in that folder; follow semantic HTML, responsive layout, accessibility, modular CSS (see `.cursor/agents/designer.md`).
- Capture the Designer’s summary (files created, structure, key decisions).

### Step 2 — Call Design Reviewer

- **subagent_type:** `design-reviewer`
- **Pass:** Path to the design folder, original feature description/requirements.
- **Request:** Review for (1) requirements compliance, (2) responsiveness, (3) accessibility, (4) structure/maintainability. Output APPROVED or FAILED with issues per `.cursor/agents/design-reviewer.md`.
- Capture the result: APPROVED or FAILED and, if FAILED, the list of issues.

### Step 3 — Handle review result

- **If APPROVED:** go to Step 4 (Report to User).
- **If FAILED:** Increment **rework_count** (initial 0). If rework_count &lt; 3: pass the issues to the **Designer** (same folder, same feature + "Review Result: FAILED" + issues), call Designer again, then call Design Reviewer again. Repeat until APPROVED or rework_count ≥ 3.
- **If rework_count ≥ 3:** Circuit breaker — stop rework, summarize failure and suggest next steps (e.g. adjust requirements and re-run design, or fix folder manually). Report to the user.

### Step 4 — Report to user

- Confirm the **path to the design folder** (e.g. `designs/<feature-slug>/`).
- Brief summary: what was designed (screens/states), that the Reviewer approved it.
- **Handoff to implement:** "To implement this feature using this design, run the implement flow and pass the design folder, e.g.: **implement: &lt;feature&gt; — design is ready in `designs/<feature-slug>/`**."

## Output Convention

- **Root:** `designs/` (at project root; see `designs/README.md`).
- **Per feature:** `designs/<feature-slug>/` containing only HTML, CSS, and optionally README.md describing screens and states. No JavaScript framework code.

## Design Agents (no Registry)

The design flow does not use task assignees from a Planner. The Design Orchestrator calls:

| subagent_type    | Role |
|------------------|------|
| designer         | Create HTML+CSS in the given folder |
| design-reviewer  | Review folder for requirements, responsive, a11y; return APPROVED or FAILED |

Ensure the environment supports these `subagent_type` values for `mcp_task` when using the design flow.

## Consuming Design in Implement

When the user runs **implement** and the design is already done:

1. User includes the design folder in the request, e.g. **"implement: onboarding wizard — design is ready in `designs/onboarding-wizard/`"**.
2. The implement Orchestrator captures the path in Step 0 and passes it to the **Planner** and to **frontend-worker** tasks.
3. Frontend tasks implement the UI to match the HTML/CSS in that folder (structure, layout, components, states), translating to the project stack (e.g. React/Next.js, Tailwind) as per architecture.

See `.cursor/skills/implement-feature/SKILL.md` (Step 0, Context Handoffs) and `.cursor/agents/planner.md`, `.cursor/agents/frontend-worker.md`.

## Checklist Before Starting

- Feature description (or ref) is clear, or one clarifying question asked.
- Output folder path is defined: `designs/<feature-slug>/`.
- Access to `mcp_task` with `subagent_type: designer` and `subagent_type: design-reviewer`.

## Checklist Before Reporting

- Design folder path is stated clearly.
- If APPROVED: mention that the design is ready for implement and how to pass the folder.
- If circuit breaker: failure summary and suggested next steps.
