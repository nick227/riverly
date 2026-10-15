# Addendum 11 — Profile, Recognition and Frontend Reuse

## Profile: third non-admin destination
A distinct social-inspired profile at a shareable **custom user URL** (`/u/:slug` proposed), not a Myspace layout, not a company-settings form. Premium editorial hero, avatar/photo, role, brief bio, selected job contributions and work history; concise metrics and curated highlights; award/sticker shelf and peer appreciation.

User identity is global; work stats, activity visibility, and recognition are scoped by company and role. Custom slug requires uniqueness, collision handling and rename/redirect policy. Define privacy/access for URLs before allowing external public sharing: internal-first is the POC default. Avoid exposing private contact or job details in profiles.

Minimum actions: edit own profile, open assigned jobs, give a peer permitted sticker/award, see recognition and selected history, visit profiles from Activity and assignment labels. Award/sticker provenance (giver, receiver, company, timestamp, optional note) must be recorded. Avoid leaderboard/ranking mechanics and elaborate follow systems in V1.

## Shared frontend quality policy
- Small set of generic primitives (Box/Stack/Row/Grid, Text/Heading, Card/Field/ActionBar, controls, Avatar, AttachmentGrid, ActivityItem) and feature compositions (PipelineBar, StageWorkspace, ContactCard, ActivityRiver, EmailModal, ProfileHero).
- Design tokens for color, typography, spacing, radii, borders, density and interaction states. Pure white baseline, black/neutral hierarchy, minimal brown accent optionally; no gradients or one-off per-screen styles.
- Common reusable CSS class naming and variants, unique semantic names only for top-level regions or meaningful features; no business vocabulary in class names. One canonical CSS owner per primitive/pattern, logical token/base/primitives/patterns/features structure.
- Schema-based workflow labels/fields/options are content, not distinct CSS or component implementations. Reuse one stage workspace for all six stages and the Full Record view.
- Accessibility, keyboard support, visible focus and responsive stacking are default requirements; test primitive changes across feature uses.
- Minimize conceptual overhead: no speculative component factory, no per-stage page forks, no giant page-builder, no duplicate activity/email data stores.
