# 04 — Decisions & open questions

## Locked direction
- Roofing is prototype industry; schema/config must support later industry terminology and workflows.
- Single traditional CRM with optional AI assistant over the same backend.
- One opportunity and continuous activity history, rendered as six stage workspaces.
- Six default stage labels: New Lead, Called, Inspection, Contract Signed, Job Started, Job Completed.
- Persistent bar-only pipeline, pure white background, sans-serif, black/gray design and no left sidebar.
- Stage views remain accessible independent of current stage; logging is repeatable and optional, not a stage gate.
- Contact bio is a persistent right-side card with communication actions, inline edit and photo gallery.
- Activity logging is consistent across all stages; salesperson assignment is prominent.
- Workflow language, field options, resources and presentation are business-admin manageable.
- Tenant businesses own financial relationships and external billing accounts; platform only charges product license fees.
- Avoid overbuilding affiliate/platform infrastructure while CRM is priority.

## Proposals to confirm before migration
1. **Opportunity naming and lifecycle:** whether a lead becomes WON on Contract Signed, while the job continues through Started and Completed; distinct `salesOutcome` vs `jobStatus` may be preferable to one `status` enum.
2. **Workflow version strategy:** preserve each opportunity's original schema version vs migrate active opportunities upon admin publish; recommend version pin + explicit migration.
3. **Activity correction policy:** append correction events vs allow edits with immutable audit; recommend corrections not destructive overwrite.
4. **Stage definitions:** ensure admin cannot remove a stage with active jobs without mapping/migration; define safe reorder behavior.
5. **Native field list:** final common fields for indexing/reporting; selected template attributes remain extensible.
6. **Phone/email integration:** V1 controls may use `tel:`, `sms:`, `mailto:`; these are launch actions, not verified communications.
7. **Lead intake:** initial form embed needs spam prevention, domain rules, consent language, duplicate review queue.
8. **Field access:** establish what sales reps vs inspectors vs managers can change.
9. **Attachments:** retention, max size, supported formats, antivirus checks and signed URLs.
10. **Financial status:** external reference + manual status only for V1; provider adapter APIs deferred.

## Engineering cautions for sample schema
- `schema/domain.prisma` is a **design draft**. It must be validated with `prisma validate`, reviewed for organization-safe foreign keys and indexes, and migrated against the selected database engine before use.
- Database relations alone do not protect cross-tenant IDs; enforce scoping in every query/mutation and consider compound scoped constraints.
- Admin configuration changes must be schema-validated and published atomically; generated UI cannot authorize a forbidden domain operation.
- JSON option definitions are intentionally compact in V1. A later normalized field-definition model may be worthwhile if cross-workflow reporting demands it.
- Workflow field entries should be separated into persistent facts, repeated activity inputs and external references before implementing generic save handlers.

## Definition of architecture readiness
- Can seed six-stage roofing template and render all stage controls from configuration.
- Can rename stages, field labels and option labels without breaking historical event reports.
- Can log repeated voicemail/call attempts with actor/time, and separately persist latest structured opportunity facts.
- Can show a multi-job contact in the same UI without duplicating contact identity.
- Can deny cross-organization data access end-to-end, including media and activity.
- Can run CRM without any company licensing/affiliate or external billing service dependency during early local development.
