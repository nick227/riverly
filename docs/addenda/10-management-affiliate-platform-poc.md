# Addendum 10 — Minimum Management and Commercial POC Surfaces

These are permissioned routes, not additional general-employee CRM tabs. Use existing shared primitives, tables, fields, detail panels and filters; avoid new UI frameworks or deployments.

## 1. Manage — Manager + Company Admin
One screen: active jobs, unassigned leads, upcoming inspections; simple team workload table; reassign jobs; inspect team activity and jump to jobs. **No workflow schema editing**. Metrics scoped to authorized company/team records.

## 2. Settings — Company Admin + Owner
One screen with grouped sections: Team invitations/roles; workflow stage rename/reorder/add/retire; stage field labels/input types/options; vocabulary, company resources; email sender and stock templates/review destination; company name/branding. Owner-only subscription ownership and admin governance.

POC proof: rename Inspection to Site visit and alter an input option; existing job activities, identifiers, historical values and report aggregations must remain intact. Version/retire stage definitions with migration decisions; never reuse IDs for new meanings.

## 3. Partner — Affiliate
One private screen: referral link, attributed signups, license statuses, agreed compensation method, earned/pending/paid amounts, payout history. No CRM tenant data. Earnings are derived from qualifying **platform license payments**, not roofing company revenue. Profit-share agreement must define cost base and timing explicitly; display provisional versus settled clearly.

## 4. Platform Admin — Site operations
One minimal admin screen with companies/licenses, affiliate attribution and agreements, earnings/payout approval/manual recording, account status and restricted staff grants. No arbitrary CRM record access. No POC need for standalone affiliate payment automation.

## Boundaries
- Our company collects only software license payments. Customer external billing accounts, invoice links, subscriptions and receipts belong to customers, remain detachable, and do not feed affiliate commissions.
- POC may use one API/deployment with separately owned modules and authoritative permission checks; independent microservices or portal deployments are not required.
- Don't develop a custom permission-builder, marketplace, reseller platform, advanced accounting dashboard or complex workflow editor.
