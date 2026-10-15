# 15 — Reports, financial data and simulations
Status: product extension design; **basic pipeline/activity Reports are POC**. Extended analytics and interactive simulations are not prerequisites for shipping core CRM.

## Surface ownership
Manager's **Manage → Reports**, not a new daily navigation destination. Provide metrics, a compact chart/table, shared filters (date, person, workflow, source, import cohort), record drill-down, and named definitions. Avoid separate pages per insight and avoid marketing names for generic reports.

## Baseline reports
Lead aging, pipeline aging, stage conversions, lead sources, sales activity, follow-up, inspection timing, estimated vs signed job value. Introduce repeat-customer and communications reporting only after data quality is sufficient.

## Evidence model / terminology
Store traceable metric definition ID, tenant/time window, filters, cohort denominator, source IDs, calculation version and freshness. Stage reporting uses stable identifiers (or versioned semantic categories where needed), not display strings. Historical stage transition times must survive workflow edits. Distinguish lead conversion from order conversion.

## Finance guardrails
- Native CRM knows **estimated and contracted values**, which are **not revenue received**.
- WooCommerce knows orders and refunds; Stripe knows processor transaction/subscription events; QuickBooks knows invoices/payments/expenses; Jobber knows operational job data subject to API scope. None alone guarantees complete company profitability.
- External ownership remains with provider. Never create an internal duplicate invoice as a new receivable solely because we synced it.
- Link the same transaction seen in multiple systems by stable provider refs and confirmed matches; avoid additive double counting. Document gross/net/refund/tax/shipping/currency rules per report. Respect currencies, date zones, refunds, voids, partial payments, cancellations and stale sync.
- Flag **observed, derived, manually entered, estimated, unavailable** data. Include source and last synced on values. Disallow a profit label when COGS/expenses are missing.

## Scenario engine (future)
Pure versioned calculation functions with transparent assumptions and input origin. Suggested scenarios: lead volume × close rate × average signed contract, stage-adjusted pipeline value (only with adequate cohorts), inspector capacity constraints, collection timing (with provider invoices), hiring break-even (with cost inputs), lead recovery sensitivity. Display baseline and scenario separately; label projections as modeled—not forecast certainty. Show sample sizes and confidence limitations; no invented user data or implied causality.

## Rollout
1. Import/source and activity completeness checks.
2. Deterministic pipeline queries with drill-down and QA fixtures.
3. WooCommerce read-only orders and revenue-style metrics, if pilot warrants.
4. Optional scenario controls with labeled assumptions.
5. Cross-source cost/profit insights only after reconciled accounting data and user confirmation.
