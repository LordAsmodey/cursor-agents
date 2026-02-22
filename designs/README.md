# Design outputs

This folder contains **HTML+CSS design prototypes** produced by the **design flow** (skill: `design-feature`). Each subfolder is named after a feature (kebab-case) and holds the static design for that feature.

## How designs are created

- Run the design flow: **design:** or **design: &lt;feature description&gt;** (see `.cursor/rules/design-command.mdc`).
- You can provide: text description, reference URL, competitor site, or style notes — Figma is not required.
- The flow: Designer creates HTML+CSS in `designs/<feature-slug>/`, then **viewport-runner** (optional) captures screenshots at several resolutions into `screenshots/`, then Design Reviewer checks code and (if present) screenshots. Output is ready when review is APPROVED.

## Folder structure (per feature)

- **Path:** `designs/<feature-slug>/` (e.g. `designs/onboarding-wizard/`).
- **Contents:** HTML and CSS only (no JS framework). Optional `README.md` in the folder describing screens and states.
- **Screenshots (optional):** After the Designer, the viewport-runner may add `screenshots/` (e.g. `320x720-mobile.png`, `768x1024-tablet.png`, `1024x768-desktop.png`) for the Design Reviewer to check responsiveness. Requires `npm install` and `node scripts/viewport-screenshots.js <design-folder>` (see project root).
- Typical files: `index.html`, `styles.css`, or one HTML per screen plus shared CSS.

## Using a design in implement

When the design is ready, run the **implement** flow and pass the folder:

- Example: **implement: onboarding wizard — design is ready in `designs/onboarding-wizard/`**
- The implement Orchestrator will pass this path to the Planner and frontend tasks so the UI is implemented to match the HTML/CSS (e.g. translated to React/Next.js and Tailwind as per project stack).

See `.cursor/skills/design-feature/SKILL.md` (section "Consuming Design Output in Implement Flow") and `.cursor/skills/implement-feature/SKILL.md` (Step 0, design folder path).
