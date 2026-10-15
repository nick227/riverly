# API Reference

> Generated from `packages/api-spec/openapi.yaml`. Do not edit by hand.

## System

| Endpoint | Description | Auth | Success |
|---|---|---|---|
| `GET /health` | Get health | Public | `200` |

## Auth

| Endpoint | Description | Auth | Success |
|---|---|---|---|
| `POST /auth/login` | Login | Public | `200` |
| `POST /auth/logout` | Logout | Auth required | `200` |
| `GET /auth/me` | Get current user | Auth required | `200` |
| `POST /auth/switch-organization` | Switch organization | Auth required | `200` |
| `POST /auth/company-signup` | Licensed company onboarding (creates company + owner). Disabled unless ALLOW_COMPANY_SIGNUP=true. | Public | `201` |
| `GET /invitations/{token}` | Get invitation | Public | `200` |
| `POST /invitations/{token}/accept` | Accept invitation | Public | `200` |

## Organization

| Endpoint | Description | Auth | Success |
|---|---|---|---|
| `GET /organization` | Get organization | Auth required | `200` |
| `PATCH /organization` | Update organization | Auth required | `200` |

## Team

| Endpoint | Description | Auth | Success |
|---|---|---|---|
| `GET /members` | List members | Auth required | `200` |
| `PATCH /members/{id}` | Update member | Auth required | `200` |
| `GET /team/invitations` | List invitations | Auth required | `200` |
| `POST /team/invitations` | Create invitation | Auth required | `201` |
| `DELETE /team/invitations/{id}` | Revoke invitation | Auth required | `200` |

## Workflow

| Endpoint | Description | Auth | Success |
|---|---|---|---|
| `GET /workflow` | Get workflow | Auth required | `200` |
| `POST /workflow/publish` | Publish workflow | Auth required | `201` |
| `GET /resources` | List resources | Auth required | `200` |
| `POST /resources` | Create resource | Auth required | `201` |
| `PATCH /resources/{id}` | Update resource | Auth required | `200` |

## Contacts

| Endpoint | Description | Auth | Success |
|---|---|---|---|
| `GET /contacts` | List contacts | Auth required | `200` |
| `POST /contacts` | Manual intake — creates the contact, a MANUAL source record and optionally a first job. | Auth required | `201` |
| `POST /contacts/match` | Find possible existing contacts by normalized email/phone/name. Never merges. | Auth required | `200` |
| `GET /contacts/{id}` | Get contact | Auth required | `200` |
| `PATCH /contacts/{id}` | Update contact | Auth required | `200` |

## Jobs

| Endpoint | Description | Auth | Success |
|---|---|---|---|
| `POST /contacts/{id}/opportunities` | Add an independent job to an existing contact. | Auth required | `201` |
| `GET /opportunities` | List opportunities | Auth required | `200` |
| `GET /opportunities/{id}` | Get opportunity | Auth required | `200` |
| `PATCH /opportunities/{id}` | Update opportunity | Auth required | `200` |
| `PUT /opportunities/{id}/fields/{fieldId}` | Set opportunity field | Auth required | `200` |
| `POST /opportunities/{id}/transitions` | Manually move the job to another stage (forward or back). Never gated. | Auth required | `200` |
| `POST /opportunities/{id}/status` | Mark a job lost / on hold / canceled / reopened, independent of stage. | Auth required | `200` |

## Activity

| Endpoint | Description | Auth | Success |
|---|---|---|---|
| `POST /opportunities/{id}/activities` | Log a note, contact attempt (self-reported) or progress update on a job. | Auth required | `201` |
| `GET /activity` | Company river, or a job/contact/profile projection of it. | Auth required | `200` |
| `POST /activity/{id}/corrections` | Append a correction that references the original entry. The original is never edited. | Auth required | `201` |
| `GET /activity/{id}/comments` | List comments | Auth required | `200` |
| `POST /activity/{id}/comments` | Create comment | Auth required | `201` |
| `POST /activity/{id}/reactions` | Add the reaction, or remove it if the caller already reacted with this code. | Auth required | `200` |
| `POST /posts` | Create post | Auth required | `201` |
| `DELETE /posts/{id}` | Author (or a manager) removes a post; the river shows it as removed. | Auth required | `200` |

## Fieldwork

| Endpoint | Description | Auth | Success |
|---|---|---|---|
| `POST /opportunities/{id}/appointments` | Create appointment | Auth required | `201` |
| `POST /opportunities/{id}/participants` | Add participant | Auth required | `201` |
| `DELETE /participants/{id}` | Remove participant | Auth required | `200` |
| `POST /opportunities/{id}/external-links` | Create external link | Auth required | `201` |
| `PATCH /external-links/{id}` | Update external link | Auth required | `200` |
| `PATCH /appointments/{id}` | Reschedule, reassign, complete or cancel. Every change is logged. | Auth required | `200` |
| `GET /external-people` | List external people | Auth required | `200` |
| `POST /external-people` | Create external person | Auth required | `201` |

## Files

| Endpoint | Description | Auth | Success |
|---|---|---|---|
| `POST /attachments` | Upload a file once and link it to a job / stage / field. Max 25 MB; images, PDF, office docs. | Auth required | `201` |
| `DELETE /attachment-links/{id}` | Remove a file from a job/stage. The stored file and its history remain. | Auth required | `200` |
| `GET /files/{id}` | Signed, expiring download for locally stored files (development driver). | Public | `200` |

## Intake

| Endpoint | Description | Auth | Success |
|---|---|---|---|
| `GET /sources` | List sources | Auth required | `200` |
| `POST /imports/preview` | Preview import | Auth required | `200` |
| `GET /imports` | List imports | Auth required | `200` |
| `POST /imports` | Import CSV rows. Exact email matches link; ambiguous matches go to review; nothing merges silently. | Auth required | `201` |
| `GET /intake/review` | List review queue | Auth required | `200` |
| `POST /intake/review/{id}` | Resolve review item | Auth required | `200` |
| `GET /lead-forms` | List lead forms | Auth required | `200` |
| `POST /lead-forms` | Create lead form | Auth required | `201` |
| `PATCH /lead-forms/{id}` | Update lead form | Auth required | `200` |

## Public

| Endpoint | Description | Auth | Success |
|---|---|---|---|
| `GET /public/forms/{token}` | Get public form | Public | `200` |
| `POST /public/forms/{token}/submissions` | Submit public form | Public | `202` |

## Email

| Endpoint | Description | Auth | Success |
|---|---|---|---|
| `GET /email/templates` | List email templates | Auth required | `200` |
| `PATCH /email/templates/{id}` | Update email template | Auth required | `200` |
| `POST /email/render` | Resolve a template against real records for preview. Unknown values are reported, never invented. | Auth required | `200` |
| `GET /email/messages` | List messages | Auth required | `200` |
| `POST /email/messages` | Queue the exact reviewed message. Responds QUEUED; delivery is reported later by the worker/provider. | Auth required | `202` |
| `GET /email/messages/{id}` | Get message | Auth required | `200` |
| `POST /email/messages/{id}/retry` | Re-queue a FAILED message (same frozen content). Explicit action; never automatic duplicates. | Auth required | `202` |
| `GET /email/senders` | List senders | Auth required | `200` |
| `POST /email/senders` | Create sender | Auth required | `201` |
| `DELETE /email/senders/{id}` | Delete sender | Auth required | `200` |
| `POST /email/senders/{id}/verify` | Check with the provider that the sender's domain is verified for this account. | Auth required | `200` |
| `POST /webhooks/email/resend` | Signed Resend delivery events (svix). De-duplicated by event id. | Public | `200` |

## Profiles

| Endpoint | Description | Auth | Success |
|---|---|---|---|
| `PATCH /profiles/me` | Update my profile | Auth required | `200` |
| `GET /profiles/{slug}` | Internal profile, visible only to members of a company the person belongs to. | Auth required | `200` |
| `GET /recognition-types` | List recognition types | Auth required | `200` |
| `POST /recognitions` | Give recognition | Auth required | `201` |

## Manage

| Endpoint | Description | Auth | Success |
|---|---|---|---|
| `GET /manage/overview` | Get manage overview | Auth required | `200` |
| `GET /reports/pipeline` | Get pipeline report | Auth required | `200` |
| `GET /reports/activity` | Get activity report | Auth required | `200` |
| `GET /diagnostics/worker-runs` | Operational worker log (admin only; not part of the Activity river). | Auth required | `200` |
