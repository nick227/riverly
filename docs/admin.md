# Company admin guide

Settings is for Admins and the Owner. Managers use **Manage** (assignments, workload, reports) and
cannot change configuration.

| Section | What you can do | Safety rules |
|---|---|---|
| Company | Name, timezone, review link, logo | The review link is required before anyone can request reviews |
| Team | Invite by email (one-time link, 7 days), change roles, deactivate | Only the Owner grants Admin/Owner; a company always keeps one active Owner; deactivation is immediate |
| Workflow | Rename/reorder/add/retire stages, choose up to four controls per stage, stage instructions, field labels, options, contact outcomes, vocabulary | Publishing creates a new version. IDs never change; nothing is deleted — retire instead. Retiring a stage that holds jobs requires choosing where they move, and each move is logged on the job |
| Resources | Stage-aware links to guides/templates | Links only; never a required checklist |
| Email | Connect the company's Resend sender (verified domain), edit the 13 templates | API keys are encrypted and never shown again. Template edits change future emails only |
| Lead intake | Website forms with embed code, import history | Forms are rate-limited and spam-filtered; possible duplicates always wait for review |
| Diagnostics | Background worker runs for your company | No customer data is shown |

Reports always group by stable IDs, so renaming "Called" to "Contacted" never changes history or
report totals.
