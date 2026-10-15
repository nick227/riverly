# 02 — UX/UI design specification

## Visual direction
White canvas (`#FFFFFF`), black and neutral gray type, sans-serif font, sparse borders, no gradients, no left navigation rail, no decorative icon overload. Use comfortable whitespace, aligned controls, and restrained accent (near-black). High information utility with low copy density; never repeat the same data in multiple cards simply to fill space.

## Desktop layout
1. **AppHeader**: company name, small “Roofing CRM” subtitle, search, signed-in user.
2. **PipelineBar**: six equal-width horizontal bar segments with concise labels below; current stage filled near-black, other stages light gray. Selected stage may have a discreet outline/text indicator; *selected* must not be mistaken for *current*.
3. **Main grid**: wide **StageWorkspace** above **ActivityFeed** on left; persistent **ContactCard** in right column. Recommended initial split ~65/35, responsive, with comfortable gap and consistent container edges.
4. **Full Record** mode: vertically stacks all six StageWorkspace sections on same opportunity; PipelineBar jumps to section; shared bio remains accessible as a sticky/compact panel where screen width allows.

## Components and responsibilities
| Component | Renders | Configuration-driven elements |
|---|---|---|
| `AppHeader` | Brand, search, account | Product/company labels, visibility |
| `PipelineBar` | Segmented stage navigation | Stage order, labels, status style |
| `StageWorkspace` | Stage facts, actions, resource links, compact optional inputs | Stage field bindings, inputs, order, visibility, primary action, resource IDs |
| `ActivityFeed` | Quick activity composer and chronological history | Activity types, selectable outcomes, filter, timestamps |
| `ContactCard` | Small aligned avatar/name, Call/Text/Email/Schedule, editable fields, photo gallery | Display fields, ordering, edit affordances, thumbnails, action visibility |
| `FieldControl` | Single typed form element | Label, widget, options, validation, editability |

## New Lead example
**Left stage card:** compact stage status and received timestamp; “Mark called” action; service/inquiry fields only where not duplicated in right bio; prominent assigned salesperson selector; inquiry text; small resources row (links only). No “Next steps” checklist; no verbose instruction paragraphs or giant title.

**Left Activity:** title “Activity”; filter (all/stage/type); choose `Note`, `Call`, `Email`, etc; outcome options driven by schema; short input; Add; time/actor/type in timeline. A click to call launches the contact method; it does not automatically assert a successful call. Repeated logs supported.

**Right bio:** smaller round avatar aligned with name, designation, and edit menu; persistent Call/Text/Email/Schedule controls; editable values clearly indicated with trailing edit/chevron affordances; gallery 3-ish visible thumbnails with open-all. No duplicate separate Contact Info block. Editable property/service/lead source displayed here if configured, but still stored on the opportunity, not the contact.

## Stage control templates (maximum four highlighted controls)
| Stage | Primary controls |
|---|---|
| New Lead | Lead source, Inquiry, Salesperson, Urgency |
| Called | Contact method/outcome logger, Sales notes, Follow-up, Customer interest |
| Inspection | Appointment, Inspector, Inspection report, Photos |
| Contract Signed | Estimate, Contract, Signature status, Deposit reference |
| Job Started | Start date, Crew, Progress, Change orders |
| Job Completed | Completion report, Final photos, Payment status, Review request |

These are templates, not mandatory checkboxes; management can rename and configure them. Repeatable actions create events. Fields display latest state plus history when relevant.

## Interaction patterns
- **Inline edit:** distinct editable-state affordance, enter/blur save with validation; clear failure state; do not claim success until acknowledged.
- **Stage switch:** select workspace only. Explicit `Advance / Move stage` changes official stage; event emitted once.
- **Activity:** choose type and outcome, optional note and next follow-up; save produces timestamped record. Never make booleans (“emailed”) stand in for repeatable event history.
- **Gallery:** photos belong to a single attachment record with optional stage and opportunity associations. Thumbnails open full image; permissions apply.
- **Resources:** company-managed external links/documents; open directly in context; no workflow gating.
- **Empty states:** concise (“No calls logged”), with immediate Add action. Avoid instruction-heavy copy.
- **Lost/paused:** outcome/status independent of six success stages; preserved stage history.

## Responsive behavior
Desktop: two columns. Tablet: narrower right card or collapsible panel. Phone: one column with sticky compact pipeline (horizontally scrollable if required), contact actions near identity, stage content and Activity below. No sideways scrolling for field grids or composer.

## Presentation schema example
```json
{
  "pageId": "opportunity-detail",
  "layout": "workflow-sidebar",
  "theme": {"surface":"#FFFFFF","text":"#141414","muted":"#707070","border":"#E6E6E6","accent":"#242424","font":"system-ui","radius":12,"density":"comfortable"},
  "contactCard": {"avatarSize":"sm","actions":["call","text","email","schedule"],"fieldIds":["contact.phone","contact.email","opportunity.propertyAddress","opportunity.service","opportunity.leadSource"],"galleryLimit":3},
  "stageWorkspace": {"showLargeTitle":false,"resourcesStyle":"links"},
  "activity": {"defaultScope":"selectedStage","allowAllFilter":true}
}
```

**Rule:** UI config only controls appearance, labeling, visibility and available *approved* actions. Authorization and field validation remain on the server. Use a whitelisted component registry, bounded design tokens and approved action IDs—not arbitrary runtime code/CSS.

## Design QA checklist
- Pipeline stage labels match configured language; active and selected visibly distinguishable.
- Bio values align in predictable grid; avatar baseline matches name; editability is discoverable.
- Stage card does not duplicate bio facts unnecessarily.
- Four primary stage controls max; optional resources are quiet links.
- Notes composer is identical across stages and captures consistent structured data.
- Pure white background and readable neutral contrast; keyboard and mobile usable.


## V1 decisions ratified — 15 October 2026

The following requirements supersede earlier proposals where they differ:

1. A **Contact** is persistent; it can own **multiple independent Opportunities/jobs**, each with its own stage, assignment, activity and attachments.
2. A company admin can **rename, reorder, add or retire stages** within its own workflow; an industry/platform template supplies initial defaults. Removing a used stage means retiring/mapping it, not deleting its historical identity.
3. Company admins can define **fields, input types, and option lists** from an approved registry. IDs stay stable across relabeling.
4. Every stage exposes both **repeatable immutable activity history** and a **current summary** derived from or updated alongside those events. Summaries are not a substitute for history.
5. Stage transitions are **manual**, can move forward/back, and have **no required checklists or field-completion gates**; transitions are logged.
6. **Template → company override** controls vocabulary, stage configuration and supported presentation settings. Platform defines safe capabilities, company chooses labels/options.
7. Opportunities support internal staff **and external contractors/inspectors**; external parties are recorded as participants and do not receive application access by default.
8. V1 lead intake: **manual entry, CSV import, embeddable web forms**. API ingestion for form infrastructure is internal; general public integrations are deferred.
9. V1 finance: **values, payment status supplied manually, and external invoice/payment URLs**. No provider sync, in-app charging, or bookkeeping.
10. V1 reporting: **basic pipeline and activity reports** only. AI assistant and advanced analytics are deferred.

The initial roofing labels remain New Lead, Called, Inspection, Contract Signed, Job Started, Job Completed. They are seeded defaults, not hardcoded enum values.
