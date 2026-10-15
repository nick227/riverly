# 19 — Pilot validation and architecture restraint
Status: pre-development decision gate (2026-10-15). This document explicitly narrows earlier architecture ambitions. Hypotheses are not established results.

## Pilot hypothesis
For one roofing company with a known lead source and defined sales process, Riverly can reduce **time from lead receipt to first verified outreach** and increase the **share of eligible leads booked for inspection**, without imposing duplicate data entry.

Do not claim Riverly is differentiated merely because it has a six-stage pipeline, configurable workflows, or a chronological Activity river. These are enabling capabilities, not measured advantages.

## Minimum measurement definitions
- **Lead received at:** timestamp from originating provider/form, plus timezone and provider record ID; preserve ingest time separately. When only CSV/manual data is available, mark timestamp provenance and confidence.
- **First outreach attempt:** timestamp of an outbound action tied to the lead, with method and outcome.
- **Verified outreach:** provider-confirmed outbound call or message event (e.g., phone-system call record or email-provider accepted send). A human-entered call note is **self-reported**, not verified; email delivery is separate from reply or meaningful contact.
- **Inspection booked:** an inspection appointment record with date/time and linked opportunity; cancellation and rescheduling retain history.
- **Eligible lead cohort:** deduplicated new inquiries from the chosen source(s), consistently defined over baseline and pilot periods; exclude test/spam records using the same rules in both periods.
- **Metrics:** median and distribution of receipt→first verified attempt, percent attempted within pre-agreed service window, booked-inspection conversion within a defined observation window, missing-capture rate, and manual-entry burden.

## Pilot protocol
1. Interview owner and primary salesperson; map the actual lead channels, existing software, and who is responsible for every record.
2. Establish a baseline period (proposed 2–4 weeks or enough volume for a meaningful comparison); record source coverage, lead volume and stage outcomes. If reliable historical verification is unavailable, disclose that limitation and collect a forward-looking baseline first.
3. Select ONE lead channel and one team before expanding. Instrument arrivals and outbound communications so the primary metric can be independently confirmed.
4. Run a comparable pilot period under the same lead eligibility, working-hour and booking definitions; note seasonality, ad spend, staffing, and changes in lead quality.
5. Compare coverage, contact latency, inspection booking, duplicate-entry minutes, and operator feedback; examine the underlying records for missed or falsely matched leads.
6. Treat findings as preliminary if lead volume is low or experimental conditions differ; no causal/ROI claim without suitable evidence.

## Source-of-truth contract — decide before implementing connectors
For each pilot data domain, identify the owner, write direction and conflict policy:

| Domain | Default POC authority | Requirement |
|---|---|---|
| Raw lead submission | Original website/form/provider | Immutable source pointer and receipt timestamp |
| Canonical contact and job | Riverly once created | Link provenance to all matching source records; no duplicate blind overwrite |
| Email delivery | Authorized sending provider | Provider event ID and status, separate from CRM note |
| Call verification | Connected phone/call provider, if available | Otherwise show self-reported and exclude from verified outreach metric |
| Inspection booking | Whichever scheduling system company actually uses | Choose manual Riverly entry OR named external source; no silent two-way sync |
| Financial orders/invoices | WooCommerce/accounting provider | Read-only references; never assume sales amounts are cash collected |

If pilot leads originate in systems Riverly cannot ingest without repeated manual entry, do not claim the lead-capture wedge works. Choose a supported channel, build a small connector, or change the hypothesis.

## Engineering restraint
- **Implement only abstractions exercised by the pilot.** A typed six-stage definition may be static source configuration; no need to ship arbitrary stage editing, workflow version migration, generic field engines, custom-role editors or multi-product services unless pilot users actually require them.
- Preserve basic stable IDs, tenant ownership and append-only important events because these protect active data, but implement richer versioning and multi-source normalization only as needed.
- Use one company, one reliable channel, one pipeline and one communications path for the first end-to-end pilot. Add CSV/form/WooCommerce based on actual pilot intake, not speculative integrations.
- Do not treat manually entered call logs as proof of contact, worker queue acceptance as email delivery, or contract value as realized revenue.
- The earlier V1 customization ambition remains a **product direction**, not automatically a pilot implementation promise. Document any variance explicitly before coding.

## Go / no-go review
Before building full admin editing, advanced reports, simulations, automation bots, profile recognition or affiliate payout workflows, show: reliable lead capture, operator adoption, verifiable communication events, usable job history, and an agreed improvement target with the pilot company. Approval to expand must be a separate explicit decision.

## Open decisions requiring pilot-owner signoff
- Which one incoming lead channel and one team do we pilot?
- What existing systems are authoritative for contacts, appointments and job status?
- Is verified phone outreach available, or should email verification be the initial measurable channel?
- What baseline/pilot time windows and inspection-booking observation window are suitable?
- What target improvement would justify continued investment, and what new manual work is acceptable?
