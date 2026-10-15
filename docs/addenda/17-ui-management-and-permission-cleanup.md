# 17 — UX, permission and integration cleanup before implementation
Status: supersedes earlier speculative UI suggestions only where explicit user decisions changed direction.

## Final navigation and roles
- Everyday: Contacts, Activity, Profile. Individual contact/job detail is a route under Contacts, not separate top-level navigation. Email is a single modal, returning to originating page on close.
- Manager: Manage with assignments, workload, reports, inspections and aging.
- Company Admin/Owner: Settings with Team, Workflow, Fields, Email Templates, Integrations, Data Imports. Company Owner controls subscription ownership and admin grants.
- Affiliate: Partner view with referral link, attributed signups, license state, earned/pending/paid balances; no CRM tenant records.
- Platform Admin: Platform Admin view with companies, licenses, affiliate agreements and commercial status; **not default authority** to read tenant content; audited support access is distinct.
- One user can hold different grants in different companies and separate affiliate/platform status. Invited staff cannot create a company by virtue of membership. Company signup/provisioning is a separate licensed flow.

## Contacts and detail hierarchy
- Contacts combines list/pipeline/source views. Preserve source cohorts, multiple independent opportunities per person, assigned staff and provenance badges.
- Job detail has full-width header + bar-only pipeline; main selected stage workspace plus persistent shared river, with compact contact bio card, accessible communication controls, stage resources and instructions. No redundant stage-specific notes widget, email-history duplication, separate job/tasks sections, excessive decorative icons or gradients. Minimalist white/black/gray palette, generous spacing, sans font, reusable CSS tokens.
- Main workflow stage fields remain schema-configured, initially four high-value controls per roofing stage; do not introduce mandatory checklists for progression. Original six stage names are templates and mutable. A source list is not a pipeline stage.

## Email workflow
- Authorized sender, recipient(s), subject and rendered template are ready in universal email modal. Includes template selector, optional edit/personal note and explicit final Send after preview. Closing restores context. Stage-specific defaults: Welcome, Follow-up, Inspection Complete, Thank You for Signing, Work Started, Job Completed. Specialized: Inspection Confirmation, Appointment Reminder, Estimate Ready, Estimate Follow-up, Schedule Change, Payment Request (provider-owned URL), Review Request.
- Exact rendered snapshot, actor, template version, recipient, job and worker status are stored; Activity shows message and delivery outcome. Editing one send does not mutate company template. Review-request status distinct from review-received status. No one-click blind sends, no silent autosend on stage transition. Validate review link and actual template variables before send.

## Frontend quality baseline
Three layers: small primitives (layout/typography/controls), reusable patterns (Card/Field/List/Gallery/Composer), semantic CRM feature components. Design tokens control spacing, typography, color, borders, radius; BEM-like consistent classes, semantic names only for top-level feature containers. No per-stage screen clones, business label-dependent CSS, one-off layout wrappers or duplicate data cards. Admin configuration chooses allowed fields/actions/options, not arbitrary executable code. Ensure keyboard access, edit validation, small-screen behavior and tests.

## Permissions and least privilege
Members can update authorized work; managers assign and inspect workload; company admins manage workflows, team and email configs; owners additionally manage admin grants/company subscription. External inspectors are explicit limited participants; never silently turn a sourced customer into a staff user. Every API, activity and worker command authorizes tenant, role, record and provider connection scope on server; route hiding is not authorization.
