---
name: design-feature
description: Runs the design workflow: Designer produces HTML+CSS prototype in a feature folder, Design Reviewer checks requirements, responsiveness, and accessibility. The executing agent acts as Design Orchestrator (management only). Output is a folder (designs/<feature-name>/) ready to be passed to the implement flow. Use when the user says "design", "design: <feature>", or requests a UI/UX design for a feature. Input can be description, reference URL, competitor site, or similar — no Figma required.
---

# Design Feature — Full Workflow

This skill defines the **design-only** workflow. The **executing agent** acts as **Design Orchestrator**: it coordinates the Designer and Design Reviewer via `mcp_task`, passes context, and enforces the rework loop. It does **not** create HTML/CSS itself — the **Designer** subagent does. The output is a **folder** with the feature name containing HTML+CSS, which can later be passed to the implement flow as "design is ready in this folder."

---

## When to Apply

- User says **"design"**, **"design: &lt;feature description&gt;"**, or clearly requests a UI/UX design for a feature (e.g. "сделай дизайн онбординга", "design the checkout flow").
- Input may be: text description, reference URL, competitor site link, moodboard description — **no Figma or ready mockups required**.
- Do **not** apply for: implementation requests (use implement-feature), code review, or architecture-only design (use Architect in implement flow).

---

## High-Level Flow

```
User: "design: <feature>" (or "design" + description / ref / competitor URL)
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ DESIGN ORCHESTRATOR (you)                                        │
│ 1. Parse input → feature name, description, optional refs        │
│ 2. Define output folder: designs/<feature-slug>/                 │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│ DESIGNER        │  subagent_type: designer
│ UI/UX prototype │  → creates HTML+CSS in designs/<feature-slug>/
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ DESIGN REVIEWER │  subagent_type: design-reviewer
│ Check: reqs,    │  → APPROVED or FAILED + issues
│ responsive, a11y│
└────────┬────────┘
         │  FAILED (rework_count < 3) → pass issues to Designer, repeat
         │  FAILED (rework_count ≥ 3) → circuit breaker → report
         ▼  APPROVED
┌─────────────────┐
│ REPORT to User  │  Path to folder, summary, how to use with implement
└─────────────────┘
```

---

## Output Convention

- **Root folder for all design outputs:** `designs/` (at project root, or as specified in project rules).
- **Per-feature folder:** `designs/<feature-slug>/` where `<feature-slug>` is a short kebab-case name derived from the feature (e.g. `onboarding-wizard`, `checkout-flow`).
- **Contents:** Only HTML and CSS files. No JavaScript framework code. Structure can include:
  - `index.html` — main entry or list of screens
  - Optional: one HTML per screen (e.g. `login.html`, `dashboard.html`) and shared `styles.css` or per-screen CSS.
  - Optional: `README.md` in the folder describing screens and states (for implement flow).
- The Designer agent is responsible for creating this structure; the Orchestrator only defines the folder path and passes it to Designer and Design Reviewer.

---

## Step-by-Step Instructions

### Step 0: Parse User Input

- Extract **feature name/description** from the user message (e.g. after "design:" or from the full message).
- Extract **optional context:** reference URL, competitor site, style notes, target audience, constraints (e.g. "mobile-first", "must match our brand").
- If the description is too vague, ask **one clarifying question** (e.g. "Which screens should this include?" or "Do you have a reference style?") before starting.
- Derive a **feature-slug** (kebab-case, no spaces) for the folder name, e.g. `designs/onboarding-wizard/`.

### Step 1: Call Designer

- **subagent_type:** `designer`
- **Prompt** must include:
  - Feature name and description
  - Output folder path (e.g. `designs/<feature-slug>/`)
  - Any reference URL, competitor site, or style/constraint notes from the user
  - Instruction: "Create HTML+CSS prototype in the given folder. Follow best practices: semantic HTML, responsive layout, accessibility. Use BEM-like or kebab-case class names; keep CSS modular. Produce only HTML and CSS (no JS framework). See .cursor/agents/designer.md for full instructions."
- Capture the Designer’s summary (files created, structure, key decisions).

### Step 2: Call Design Reviewer

- **subagent_type:** `design-reviewer`
- **Prompt** must include:
  - Path to the design folder (e.g. `designs/<feature-slug>/`)
  - Original feature description and requirements (so reviewer can check compliance)
  - Request: "Review the design in this folder for: (1) compliance with requirements, (2) responsiveness, (3) accessibility, (4) structure and maintainability. Output APPROVED or FAILED with issues per .cursor/agents/design-reviewer.md."
- Capture the review result: **APPROVED** or **FAILED** and, if FAILED, the list of issues.

### Step 3: Handle Review Result

- **If APPROVED:** go to Step 4 (Report to User).
- **If FAILED:**
  - Increment **rework_count** for this design run (Orchestrator keeps the count; initial value 0).
  - If **rework_count &lt; 3:** pass the Reviewer’s issues back to the **Designer** (same folder path, same feature, plus "Review Result: FAILED" and the list of issues). Call Designer again, then call Design Reviewer again (Step 1 → Step 2). Repeat until APPROVED or rework_count ≥ 3.
  - If **rework_count ≥ 3:** run **circuit breaker** (see below); do not retry. Report to the user with the last failure summary and suggested next steps.

### Step 4: Report to User

- Confirm the **path to the design folder** (e.g. `designs/<feature-slug>/`).
- Brief summary: what was designed (screens/states), what the Reviewer approved.
- **Handoff to implement:** "To implement this feature using this design, run the implement flow and pass the design folder, e.g.: implement: &lt;feature&gt; — design is ready in `designs/<feature-slug>/`."

---

## Context Handoffs

| From → To           | Pass                                                                 |
|---------------------|----------------------------------------------------------------------|
| User → Orchestrator  | Feature description; optional: reference URL, competitor, constraints |
| Orchestrator → Designer | Feature name, description, output folder path, refs/constraints   |
| Designer → Orchestrator | Summary of files created, structure                                |
| Orchestrator → Design Reviewer | Folder path, feature description/requirements                      |
| Design Reviewer → Orchestrator | APPROVED or FAILED; if FAILED, list of issues                     |
| Orchestrator → Designer (rework) | Same folder path + "Review Result: FAILED" + issues list          |
| Orchestrator → User  | Final path, summary, how to use with implement                       |

---

## Failure Handling

- **Designer or Design Reviewer subagent unavailable:** Report to the user that the design pipeline cannot run and list available subagent types.
- **Review FAILED (rework_count &lt; 3):** Increment rework_count; send issues to Designer; call Designer then Design Reviewer again.
- **Review FAILED (rework_count ≥ 3) — circuit breaker:**
  1. Stop rework; do not call Designer again for this run.
  2. Summarize: design folder path, that review failed after 3 rework cycles, and the main issues from the last review.
  3. Suggest next steps: e.g. adjust requirements and run design again, or fix the design folder manually and then run implement with the folder path.
  4. Report to the user.

---

## Checklist Before Starting

- [ ] Feature description (or ref) is clear enough, or one clarifying question asked.
- [ ] Output folder path is defined (`designs/<feature-slug>/`).
- [ ] You have access to `mcp_task` and can pass `subagent_type: designer` and `subagent_type: design-reviewer` with detailed prompts.

---

## Checklist Before Reporting to User

- [ ] Design folder path is stated clearly.
- [ ] If APPROVED: mention that the design is ready for implement and how to pass the folder.
- [ ] If circuit breaker: failure summary and suggested next steps are included.

---

## Consuming Design Output in Implement Flow

When the user runs **implement** and the design is already done:

- User (or rule) should pass the design folder path in the request, e.g.:  
  **"implement: onboarding wizard — design is ready in `designs/onboarding-wizard/`"**
- The implement Orchestrator passes this to the **Planner** and **frontend-worker** tasks: frontend tasks should implement the UI to match the HTML/CSS in that folder (structure, layout, components, states), translating to the project’s stack (e.g. React/Next.js, Tailwind) as specified in the architecture.

This skill does not modify the implement-feature skill; it only produces the folder. The implement flow uses the folder as input context when provided.
