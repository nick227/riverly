# 14 — Contact provenance, sources, lists, and WooCommerce
Status: data contract proposal for the next implementation pass. **Contact source**, **source record**, **list**, and **saved view** are different concepts. Do not conflate.

## UX ownership
- Contacts: source selector, source counts, list membership, CSV import, duplicate review, contact provenance, saved views. Multiple source records can resolve to the same contact; source counts may overlap.
- Settings → Integrations: provider connection, credentials, scopes, synchronization schedule/status and disconnection. Settings → Data Imports may show job history.
- Activity: concise import/sync summaries and actionable failures, link to affected records.
- Manage → Reports: conversion and value segmentation by original job lead source and contact source, with explicit definitions.

## Proposed data relationships
- `Contact(id, organizationId, ...)`: canonical company-scoped identity. Never use email as immutable PK.
- `Opportunity(id, organizationId, primaryContactId, leadSourceRecordId?, ...)`: separate roofing job. Job lead origin does **not** default to all of contact's historical sources.
- `Source(id, organizationId, kind, displayName, connectionId?, status, ...)`: one WooCommerce store per source; a second store is another source. Other kinds: CSV, FORM, MANUAL, API.
- `SourceRecord(id, organizationId, sourceId, externalId, entityKind, importedAt, externalUpdatedAt?, rawPayloadRef?, contentHash?, canonicalContactId?, canonicalOpportunityId?)`: unique `(organizationId,sourceId,entityKind,externalId)`. For file rows generate stable import-batch/row identifiers.
- `ContactSourceLink(organizationId, contactId, sourceRecordId, matchedBy, confidence?, confirmedBy?)`: provenance many-to-many; retain exact original names/emails and timestamps within protected raw source records.
- `ContactList(id, organizationId, name, kind=STATIC|IMPORTED, ...)` and `ContactListMember(listId,contactId)`: user-organized and imported cohort membership. Imported list ≠ connector itself.
- `SavedContactView(id, organizationId, name, ownerId, filterDefinition)`: dynamic filters; do not copy membership rows each time.
- `ImportRun(id, organizationId, sourceId, state, cursor?, rowsSeen, created, linked, duplicatesFlagged, errors, startedAt, finishedAt?)` + `ImportIssue` for recoverable errors.
- `ExternalRecordLink`: future neutral link from canonical jobs, invoices, orders or customers to source records; never merge outside a tenant.

## Identity resolution
1. Preserve original source record and attribution unmodified.
2. Propose existing-contact matches using normalized email/phone **plus context**; two people may share either field. Do not auto-merge ambiguous cases.
3. Exact source external ID is authoritative only within one named source and object kind.
4. New WooCommerce orders should import as commerce records, **not** automatically become roofing opportunities.
5. Confirmed matches are reversible/auditable; only merge with explicit traceability, retain old references and source identifiers.
6. Contact edits do not rewrite original imported data; inbound updates follow per-field source precedence rules or go to conflict review.
7. Track origin at both contact and opportunity level; support repeated contacts across different lists and stores.

## WooCommerce first connector design
- Connect to a specific authorized WordPress/WooCommerce store; use least-privilege credentials and encrypted secrets. Test store URL, HTTPS, API availability and accessible permission scopes.
- Initially synchronize customers, orders/order items, refunds, products as separate typed external datasets. Order paid status is not equivalent to settled cash, and order totals are not operating profit. Extensions/subscriptions/COGS are **not** assumed standard.
- Historical pagination followed by incremental fetch and/or signed webhooks where supported. Store checkpoints; backoff/rate-limit; idempotent upsert with per-store external keys; handle missed/deleted/updated objects and permission expiry.
- Unlink means stop sync and revoke stored credentials where possible; **do not silently delete imported contacts, source history, or provenance**. Retention/deletion operations require an explicit admin decision.
- Build a read-only connector first. Do not mutate store orders or customer records from Riverly.

## Key UX acceptance cases
- Same customer exists in two WooCommerce stores and in an imported spreadsheet; one canonical contact can show 3 sources and multiple list memberships.
- A homeowner places two orders; neither creates an automatic roofing job.
- A CSV row collides with an existing phone/email: flagged for review, no silent destructive merge.
- Imported source filters and list filters can be combined; user can inspect original source and sync timestamp.
- Store disconnect leaves canonical CRM work and source audit trail usable.
