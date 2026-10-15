# 05 — V1 requirements, conflict resolution, acceptance

## Confirmed operating model

- A contact can have multiple opportunities; opening an opportunity shows one bar-only workflow with all stage workspaces available.
- The six roofing stages are template defaults and may be edited at the company level after safe publish/migration handling.
- Each stage view is an activity record surface: stable current facts + a timestamped record of repeated actions + files/links.
- Contact bio in right column persists across stages; stage workspace and Activity on left; Focus and Full Record use identical data.
- Field edits are inline when safe, and configuration drives labels, visible controls, options, ordering and supported style variants.
- Every significant event preserves actor, occurrence timestamp, recording timestamp, stage ID and workflow version.

## Conflicts and resolutions

| Tension | V1 resolution |
|---|---|
| Stage labels vs semantic analytics | Use immutable stage IDs, event kinds and optional stable reporting category. Display names can change. Report actual labels and stable dimensions. |
| Removing stage vs existing jobs/history | Soft-retire stage; new records cannot enter it. To remove from active pipeline require an explicit mapping for affected jobs, logged per transition. Keep old version snapshot. |
| Reordering stages vs historical order | Publish new workflow version. Historical events retain version and stage ID; reports use stage-at-event time where historical accuracy matters. |
| Current summary vs event history | Store authoritative events and fact values; update materialized stage summary as projection (rebuildable), not a second independently editable record. |
| Optional fields vs accurate pipeline | Advancement manual, never blocked; dashboards flag missing data as unknown rather than assuming complete. |
| External contractors vs account access | Store external person/assignment first; no login, data sharing, or field portal in V1. Internal users can record their work. |
| Form imports vs duplicate contacts | Preserve raw submission, normalize contact methods, suggest merge/link, do not silently merge ambiguous matches. |
| External finance links vs financial truth | URLs and manual statuses are explicitly unverified and timestamped. Never compute verified collections from these values. |
| AI-ready design vs V1 priority | Reusable domain commands/contracts only; no agent runtime or AI UI in V1. |
| Multi-industry flexibility vs delivery speed | One roofing template + minimal safe admin config editor; do not build conditional automation or arbitrary page builder. |

## V1 journeys to validate

1. Import CSV, map columns, create leads, review duplicates; retain original import/source.
2. Submit embeddable form with basic abuse prevention; create/link a contact + new job and record submission provenance.
3. Open Don Lou, add a second independent job; ensure first job stage/history untouched.
4. Log phone attempts twice in Called with different outcomes; view both entries plus accurate current summary.
5. Assign salesperson; schedule inspection and name third-party inspector without granting CRM login.
6. Change stage manually, even with empty optional fields; historical event remains accurate.
7. Rename, reorder and add stage; publish company override; record existing jobs' version and handle stage retirement safely.
8. Add external invoice URL and manually record payment status; label source as manual/unverified.
9. Show sales counts by current stage, age, owner and activity count by kind/time; restrict to organization.
10. Inline-edit person contact details and job-specific fields without overwriting other jobs.

## V1 out of scope

Stripe checkout creation/sync, recurring billing engine, accounting integrations, automated commission/affiliate portal, conditional workflow engine, autonomous stage transitions, AI assistant, customer contractor portal, advanced reports.

## Remaining implementation-level choices (not product blockers)

- Exact database engine and UI stack.
- Admin configuration publishing: whether current jobs pin to version (recommended) or migrate after preview and explicit confirmation.
- Allowed activity correction semantics (recommend append-only correction reference).
- Which optional contact communication buttons launch external apps (`tel:`, `sms:`, `mailto:`) until integrations exist.
- Form hosting and anti-spam provider, attachment limits, and access policy for third-party participants.
