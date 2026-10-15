# Addendum 09 — Identity, Tenancy, Teams and Permissions

## Canonical concepts
- User = a global human login and profile.
- Organization (UI: **Company**) = the licensed, data-isolated CRM tenant, e.g. XYZ Roofing.
- Opportunity (UI: **Job** / configurable wording) = a customer's work, NEVER the organization/workspace itself.
- OrganizationMembership grants a per-company role. A person may belong to several companies with different roles.
- AffiliateAccount is a separate commercial relationship, not a CRM organization role. PlatformRoleGrant provides independent restricted platform privileges.

## Onboarding
- New company creation is a separate purchase/onboarding process for an intended owner, not a default capability for employees.
- Staff join existing companies **by invitation**; invitations scoped to company, role, inviter, expiration and acceptance state. Invite accepts existing or new global accounts.
- Organization owner can administer membership and subscription ownership. Preserve continuity of owner via deliberate transfer rules. External inspectors/contractors may first exist as limited participants, not full company accounts.

## Role definitions
| Role | Can do | Cannot do by default |
| --- | --- | --- |
| Member | Use authorized contact/job workflows and Activity; send allowed templates | Configure company, grant roles, see affiliate earnings |
| Manager | Member + team pipeline oversight, job assignment, workload/reporting | Change workflow schema, company sender credentials, licenses |
| Company Admin | Manager + workflow/stage/field/term/resource configuration, team invitations, email templates/connections | Manage platform licenses/commissions across companies |
| Company Owner | Company Admin + subscription ownership, owner/admin governance | Platform-wide commercial operations |
| Affiliate | View own attribution, qualifying licenses, earnings, payouts | View referred tenant's contacts/jobs/internal Activity |
| Platform Admin | Manage company license accounts, affiliate terms, platform financial operations | Implicitly read arbitrary tenant CRM data |

Company Admin and Manager are deliberately different: Admin configures **how the application operates**, Manager oversees **how work gets done**. External inspector participation is scoped per job, with minimal data/access and explicit authorization when an account exists.

## Permission enforcement
Authorize on every backend query/command with user, organizationId, role, resource scope and action. Company admin is not platform admin. Platform admin access to support tenant data, if ever added, must use exceptional audited delegated access. Affiliate permissions do not imply access to the businesses they referred. Client-side nav hiding is convenience, never enforcement.

## Minimal schema additions
User; Organization; OrganizationMembership; Invitation; PlatformRoleGrant; ExternalParticipant; OpportunityAssignment; AffiliateAccount; Referral; LicenseAccount/LicenseSubscription; CommissionAgreement; Earning; Payout; Profile/Recognition records. These are conceptual additions: reconcile names/relations with existing schema before migrations.
