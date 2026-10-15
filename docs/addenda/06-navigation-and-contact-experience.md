# Addendum 06 — Navigation and Contact Experience

Status: Product/design direction confirmed except where labeled proposal. Applies after the prior documentation addenda. This document supplements, not replaces, the earlier workflow and component specifications.

## Navigation
- Primary employee surfaces: **Contacts**, **Activity**, **Profile**. No dedicated Email top-level page.
- Job workflow remains the main detail experience reached from Contacts; management/configuration are permissioned routes, not ordinary employee navigation.
- Contacts combines contact directory, incoming leads, and company pipeline: list/filter/group modes are alternate views over contact and job data, not duplicate records.
- A person can have multiple independent opportunities/jobs; selected job determines stage state and its data. The contact identity is shared across jobs.

## Updated contact/job page layout
- Full-width page with no permanent left app sidebar and no top tabs between activity, files, notes, or jobs.
- Header with business identity, global search and account controls. Use a restrained white, black and neutral theme, sans-serif, generous spacing; no gradients or ornamental icon clutter.
- **Six-stage segmented bar**, bars with text labels, not numbered circles. Stages: New lead, Called (renameable), Inspection, Contract signed, Job started, Job completed. Preserve the six only; review request is an action inside Job completed, NOT a seventh stage.
- Beneath pipeline, responsive two-column composition: persistent contact details on left; selected **StageWorkspace** on right, followed by one continuous Activity river in that same right region. On narrow screens, stack without losing functionality.
- Contact section: compact well-aligned avatar/name, call/text/email controls, inline-editable details, flexible custom fields, and recent email history consolidated on left. Avoid repeating fields and values between contact and stage surfaces.
- StageWorkspace: stage-specific four-or-fewer priority inputs/controls, assigned staff where relevant, short description only when useful, primary action, concise admin-authored instructions and stage resource links (may open offsite). Do not bring back mandatory 'Next steps' checklists.
- Activity river replaces separate stage-level notes, file log, email log, and timeline UIs: notes, images, documents, communications, human updates and system events appear as a chronological unified history, filterable to the current job/stage. Stage association remains in data, not isolated widgets.
- Recent emails on the contact column are a compact **projection** of the same message records, not a second email store.

## Interaction principles
- Stage selection (viewing) is distinct from current stage (actual pipeline state); any stage may be browsed and updated without advancement.
- Stage advancement is explicit and never blocked by missing optional stage controls.
- Inline edit affordances should be clear, but no redundant pencil icon on every piece of read-only system metadata.
- Activity entries and resources deep-link to their underlying record, source file, email or worker result.
- Full-record long-scroll mode remains a supported secondary representation of the same data; no duplicate logic.

## Design note
Most recent image concepts are visual exploration, not schema authority. Some generated images showed blue accent colors, seven pipeline steps, task/job sidebars or extra tabs; **none overrides the confirmed six-stage, monochrome/neutral, compact surface direction**.
