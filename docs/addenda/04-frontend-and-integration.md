# Frontend quality and cross-surface integration addendum

## Navigation and routes
Primary non-admin areas: **Contacts**, **Activity**, and **Profile** (profile entry can live in account/avatar navigation). Contacts includes lead intake, pipeline/directory projections and job detail; `/jobs/:id` remains a detail route. Activity is one company river. Email is an overlay reachable from the contact bio and stage template actions. Settings/admin are outside this list.

## Shared frontend composition
- Primitives: `Box`, `Stack`, `Row`, `Grid`, `Text`, `Heading`, `Button`, `Input`, `Select`, `Textarea`, `Avatar`, `Menu`, `Divider`.
- Patterns: `Card`, `EditableField`, `FieldGroup`, `ActionBar`, `MediaGrid`, `ActivityItem`, `OverlayShell`, `MessagePreview`, `MemberPicker`.
- Features: `PipelineBar`, `StageWorkspace`, `ContactCard`, `ActivityRiver`, `PostComposer`, `ProfileHero`, `RecognitionShelf`, `EmailModal`.
- One canonical component and CSS implementation per primitive/pattern; features compose these. A stage is configuration, not a bespoke page. Avoid rendering the same contact/lead data in both bio and stage workspace without a distinct use.

## Tokens and CSS quality
Pure white page and card surfaces, sans typography, black/charcoal/gray neutral palette, restrained accent where needed. No gradients. Six bar-only pipeline segments, no numbered circles. Generous whitespace, explicit alignments, reduced icon noise, short labels, and no redundant copy. Global token categories: color semantics, typography scale/weight, spacing, radii, borders, z-layers, breakpoints and dimensions. Components consume semantic CSS custom properties, not raw literals. Use consistent reusable class names such as `.card`, `.field`, `.activity-item`, `.button--primary`; semantic page containers such as `.crm-workspace` and `.crm-profile` are reserved for real feature boundaries. Avoid per-stage selectors (e.g., `.roofing-lead-form`) and deeply nested overrides. Keep CSS grouped as tokens/base/primitives/patterns/features, with controlled cascade layers and minimal specificity.

## Shared schema/read models
Contact is an identity with multiple jobs/opportunities. Job stage IDs and field option IDs are stable regardless of labels; stage actions log structured events. Admin-owned platform templates plus business overrides configure workflow vocabulary, stage structure, field types/options, visible actions, linked resources, and template labels. Manual stage advancement has no required gates. Stage facts/summaries are separate from repeatable historic activity. Activity, profiles, email and management read views reference the same contact, job, user, event and message IDs, never duplicate divergent copies.

## Cross-surface flows
1. Lead arrives from form/CSV/manual -> Contact/Job is created or matched -> Activity entry -> job appears in Contacts.
2. User logs call or advances stage -> domain write -> structured Activity event -> company river + job history + permitted user history.
3. User opens Email from job -> modal preloads approved template and full context -> user reviews and sends -> worker updates one linked outbound message -> Activity renders grouped delivery state.
4. User posts/recognizes coworker -> team Activity -> linked user profile and permitted work references.
5. Inspector attaches report -> inspection stage artifact and event -> Activity media attachment references same authorized source file.

## UI conventions and operational gates
- All editable values expose clear affordance/focus; no hover-only actions on touch devices.
- Persist current view and selected stage on overlay close; warn on discard. The modal remains accessible and keyboard-operable (focus trap, ESC policy, focus restoration).
- Loading, empty, unavailable and error states are standardized; prevent duplicate commands and false success toasts.
- Every action enforces organization access and permissions server-side. Activity visibility is not implied by its appearance in a shared feed.
- Test with roofing-specific data and a second set of changed vocabulary/configuration to verify no hidden hardcoding.
- Visual regression: desktop/mobile/contact card/pipeline, activity variants, post composer, profile, email overlay. API tests: authorization, idempotency, event delivery, template rendering, retained history.

## V1 scope guardrails
Keep the mature CRM workflow and Activity first; profile recognition and email templates can be rolled out progressively without introducing new top-level Email pages or generic website builders. The previous decisions to defer AI, advanced campaign marketing, automated workflows, payment processing and financial integrations still stand. External payment/invoice links remain references to the customer's own provider.
