import type { ReactNode } from 'react'

export type ReportCategory =
  | 'Velocity & Inbound'
  | 'Pipeline & Conversion'
  | 'Revenue & ROI'
  | 'Field Operations'
  | 'Sales & Outreach'
  | 'Reputation & Quality'
  | 'Data Quality & Audits'

export interface CustomReportDefinition {
  id: string
  title: string
  headline: string
  description: string
  category: ReportCategory
  models: string[]
  format: 'CSV' | 'XLS'
  cadence: string
  badgeTone: 'accent' | 'success' | 'warning' | 'neutral'
  sampleHeaders: string[]
  generateSampleRows: (days: number) => (string | number)[][]
}

export const REPORT_CATEGORIES: ReportCategory[] = [
  'Velocity & Inbound',
  'Pipeline & Conversion',
  'Revenue & ROI',
  'Field Operations',
  'Sales & Outreach',
  'Reputation & Quality',
  'Data Quality & Audits',
]

export const CUSTOM_REPORTS: CustomReportDefinition[] = [
  {
    id: 'speed-to-lead-velocity',
    title: 'Speed-to-Lead & First Touch Velocity Audit',
    headline: 'Measure exact response times from inbound submission to first live rep outreach.',
    description:
      'Correlates inbound lead timestamps with initial phone calls, SMS, and provider-verified emails. Isolates self-reported attempts from confirmed provider deliveries.',
    category: 'Velocity & Inbound',
    models: ['Opportunity', 'ActivityEvent', 'OutboundMessage'],
    format: 'CSV',
    cadence: 'Real-time',
    badgeTone: 'accent',
    sampleHeaders: [
      'Lead_ID',
      'Homeowner_Name',
      'Intake_Channel',
      'Ingest_Timestamp',
      'First_Touch_Timestamp',
      'Response_Minutes',
      'Touch_Method',
      'Verified_Email_Delivery',
      'Assigned_Rep',
    ],
    generateSampleRows: (days) => [
      ['lead_9812', 'David Martinez', 'Website Lead Form', '2026-10-12 14:02', '2026-10-12 14:14', 12, 'Phone Call', 'N/A', 'Jake Miller'],
      ['lead_9815', 'Sarah Jenkins', 'Storm Damage Landing Page', '2026-10-12 15:30', '2026-10-12 15:38', 8, 'Outbound Email', 'YES (Resend: del_884)', 'Nina Patel'],
      ['lead_9821', 'Robert Chen', 'Direct Phone Intake', '2026-10-13 09:15', '2026-10-13 09:15', 0, 'Inbound Call', 'N/A', 'Walter Grey'],
      ['lead_9829', 'Emily Watson', 'CSV Storm List Import', '2026-10-13 11:20', '2026-10-13 12:45', 85, 'Phone Call', 'N/A', 'Jake Miller'],
      ['lead_9834', 'Marcus Vance', 'Website Lead Form', '2026-10-14 16:40', '2026-10-14 16:47', 7, 'Outbound Email', 'YES (Resend: del_901)', 'Nina Patel'],
    ],
  },
  {
    id: 'pipeline-stage-leakage',
    title: 'Pipeline Stage Drop-Off & Leakage Breakdown',
    headline: 'Uncover where roofing deals stall or regress between inspection and closing.',
    description:
      'Audits forward and backward stage transitions across all six standard stages. Identifies exact bottlenecks, dwell times, and drop-offs before contracts are signed.',
    category: 'Pipeline & Conversion',
    models: ['StageTransition', 'Opportunity'],
    format: 'CSV',
    cadence: 'Daily',
    badgeTone: 'warning',
    sampleHeaders: [
      'Stage_ID',
      'Stage_Label',
      'Jobs_Entered',
      'Forward_Progressions',
      'Backward_Regressions',
      'Marked_Lost_Here',
      'Stage_Conversion_Pct',
      'Avg_Dwell_Days',
    ],
    generateSampleRows: () => [
      ['lead', 'New Inquiry', 48, 44, 0, 4, '91.7%', 1.4],
      ['inspection_scheduled', 'Inspection Scheduled', 44, 38, 2, 4, '86.4%', 3.2],
      ['estimate_sent', 'Estimate Sent', 38, 26, 3, 9, '68.4%', 6.8],
      ['contract_review', 'Contract Pending', 26, 21, 1, 4, '80.8%', 4.1],
      ['production_scheduled', 'Work Scheduled', 21, 20, 0, 1, '95.2%', 8.5],
      ['job_completed', 'Completed & Paid', 20, 20, 0, 0, '100.0%', 2.0],
    ],
  },
  {
    id: 'lead-source-contract-roi',
    title: 'Lead Source Conversion & Realized Contract Value',
    headline: 'Attribute signed contract dollars and win rates to original marketing channels.',
    description:
      'Compares unverified estimates against signed contract revenue mapped back to intake source (web form, CSV import, yard sign, insurance partner, or referral).',
    category: 'Revenue & ROI',
    models: ['Opportunity', 'WorkflowVersion', 'SourceRecord'],
    format: 'CSV',
    cadence: 'Real-time',
    badgeTone: 'success',
    sampleHeaders: [
      'Source_Channel',
      'Total_Inquiries',
      'Inspections_Reached',
      'Contracts_Signed',
      'Close_Rate_Pct',
      'Total_Est_Value_USD',
      'Realized_Contract_USD',
      'Avg_Ticket_USD',
    ],
    generateSampleRows: () => [
      ['Google Local Services', 28, 24, 14, '50.0%', 392000, 218500, 15607],
      ['Website Quote Form', 18, 14, 8, '44.4%', 254000, 134200, 16775],
      ['Past Customer Referral', 12, 11, 9, '75.0%', 168000, 142000, 15777],
      ['Storm Canvassing (CSV)', 34, 18, 6, '17.6%', 410000, 89400, 14900],
      ['Yard Sign / Drive-By', 8, 7, 4, '50.0%', 98000, 62000, 15500],
    ],
  },
  {
    id: 'roof-inspection-completion-log',
    title: 'Roof Inspection Scheduling & Crew Completion Log',
    headline: 'Keep field adjusters and estimators accountable with verified on-site visits.',
    description:
      'Detailed log of all roof inspection appointments, tracking completion status, adjuster assignments, homeowner cancellations, and reschedule frequency.',
    category: 'Field Operations',
    models: ['Appointment', 'ExternalPerson', 'Opportunity'],
    format: 'CSV',
    cadence: 'Daily',
    badgeTone: 'accent',
    sampleHeaders: [
      'Appointment_ID',
      'Opportunity_Title',
      'Homeowner_Address',
      'Assigned_Inspector',
      'Inspector_Type',
      'Status',
      'Starts_At',
      'Ends_At',
      'Field_Notes_Logged',
    ],
    generateSampleRows: () => [
      ['apt_401', 'Full Shingle Replacement', '1428 Elm Creek Rd', 'Walter Grey', 'Internal Staff', 'COMPLETED', '2026-10-11 10:00', '2026-10-11 11:30', 'YES (Damage documented)'],
      ['apt_404', 'Storm Hail Assessment', '892 Oak Valley Dr', 'Apex Field Adjusters', 'External Subcontractor', 'COMPLETED', '2026-10-12 13:00', '2026-10-12 14:15', 'YES (14 photo links)'],
      ['apt_409', 'Tile Roof Leak Diagnostics', '512 Summit Crest', 'Walter Grey', 'Internal Staff', 'NO_SHOW', '2026-10-13 15:00', 'N/A', 'Homeowner locked gate'],
      ['apt_415', 'Gutters & Flashing Quote', '334 Ridge Line Ct', 'Jake Miller', 'Internal Staff', 'SCHEDULED', '2026-10-16 11:00', '2026-10-16 12:00', 'Pending inspection'],
    ],
  },
  {
    id: 'sales-rep-activity-matrix',
    title: 'Sales Rep Activity Volume & Outreach Outcome Matrix',
    headline: 'Objective rep accountability: calls made, voicemails left, and deals won.',
    description:
      'Aggregates phone calls, voicemails, emails, and notes logged per team member. Distinguishes self-reported notes from provider-verified customer emails.',
    category: 'Sales & Outreach',
    models: ['ActivityEvent', 'Membership', 'User'],
    format: 'CSV',
    cadence: 'Weekly',
    badgeTone: 'neutral',
    sampleHeaders: [
      'Team_Member',
      'Role',
      'Total_Attempts',
      'Phone_Calls',
      'Spoke_With_Homeowner',
      'Voicemails_Left',
      'Emails_Queued',
      'Verified_Delivered',
      'Connect_Ratio_Pct',
    ],
    generateSampleRows: () => [
      ['Jake Miller', 'Manager / Sales', 84, 52, 28, 24, 32, 31, '53.8%'],
      ['Nina Patel', 'Sales Specialist', 96, 58, 34, 24, 38, 37, '58.6%'],
      ['Walter Grey', 'Senior Inspector', 46, 32, 19, 13, 14, 14, '59.3%'],
      ['Angela Ruiz', 'Operations', 22, 14, 9, 5, 8, 8, '64.2%'],
    ],
  },
  {
    id: 'dormant-stale-pipeline-recovery',
    title: 'Dormant Leads & Stale Pipeline Recovery List',
    headline: 'Surface high-potential bids and inquiries where communication has stalled.',
    description:
      'Extracts active jobs with zero logged calls, emails, or stage changes in the past 14 or 30 days. Perfect for automated or manual re-activation campaigns.',
    category: 'Pipeline & Conversion',
    models: ['Opportunity', 'ActivityEvent'],
    format: 'CSV',
    cadence: 'Daily',
    badgeTone: 'warning',
    sampleHeaders: [
      'Opportunity_ID',
      'Homeowner_Name',
      'Current_Stage',
      'Assigned_Rep',
      'Last_Activity_Date',
      'Days_Inactive',
      'Estimated_Value_USD',
      'Phone_Number',
      'Email_Address',
    ],
    generateSampleRows: () => [
      ['opp_1042', 'Bradley Cooper', 'Estimate Sent', 'Jake Miller', '2026-09-24', 21, 18500, '(555) 349-8812', 'bcooper@example.com'],
      ['opp_1059', 'Karen Phillips', 'Inspection Scheduled', 'Nina Patel', '2026-09-28', 17, 14200, '(555) 912-4401', 'kphillips@example.com'],
      ['opp_1081', 'Greg Holloway', 'Contract Pending', 'Jake Miller', '2026-10-01', 14, 26800, '(555) 773-1920', 'gholloway@example.com'],
    ],
  },
  {
    id: 'follow-up-compliance-audit',
    title: 'Follow-Up Compliance & Overdue Commitments Log',
    headline: 'Zero dropped promises: audit scheduled call-backs against logged touches.',
    description:
      'Audits promised follow-up target dates against real logged communication history. Highlights overdue homeowner commitments segmented by assigned sales rep.',
    category: 'Sales & Outreach',
    models: ['Opportunity', 'Membership'],
    format: 'CSV',
    cadence: 'Daily',
    badgeTone: 'warning',
    sampleHeaders: [
      'Opportunity_ID',
      'Homeowner_Name',
      'Assigned_Owner',
      'Follow_Up_Target_Date',
      'Days_Overdue',
      'Prior_Contact_Method',
      'Urgency_Tier',
      'Service_Title',
    ],
    generateSampleRows: () => [
      ['opp_1102', 'Sandra Bullock', 'Jake Miller', '2026-10-12', 3, 'Phone Call', 'High (Active Leak)', 'Emergency Tarp & Slate Repair'],
      ['opp_1114', 'Keith Morrison', 'Nina Patel', '2026-10-13', 2, 'Outbound Email', 'Normal', 'Architectural Shingle Upgrade'],
      ['opp_1119', 'Lydia Vance', 'Unassigned', '2026-10-14', 1, 'Website Form', 'High', 'Insurance Claim Hail Damage'],
    ],
  },
  {
    id: 'email-deliverability-bounce-audit',
    title: 'Email Delivery, Open Verification & Bounce Audit',
    headline: 'Inbox deliverability transparency: confirm homeowner receipt with signed webhooks.',
    description:
      'Comprehensive audit of outbound estimate quotes, follow-up messages, and inspection alerts. Correlates provider acceptance with delivered webhooks and bounce codes.',
    category: 'Sales & Outreach',
    models: ['OutboundMessage', 'EmailProviderEvent'],
    format: 'CSV',
    cadence: 'Real-time',
    badgeTone: 'neutral',
    sampleHeaders: [
      'Message_ID',
      'Recipient_Email',
      'Template_Key',
      'Queued_Timestamp',
      'Provider_Status',
      'Provider_Event_ID',
      'Delivery_Attempts',
      'Bounce_Code_Or_Error',
    ],
    generateSampleRows: () => [
      ['msg_7701', 'homeowner1@gmail.com', 'estimate_proposal', '2026-10-14 09:12', 'DELIVERED', 'resend_evt_441', 1, 'None'],
      ['msg_7708', 'r.miller@corporate.net', 'inspection_reminder', '2026-10-14 10:45', 'DELIVERED', 'resend_evt_449', 1, 'None'],
      ['msg_7712', 'badaddress@typo-domain.invalid', 'welcome_inquiry', '2026-10-14 11:02', 'BOUNCED', 'resend_evt_455', 2, '550 Host not found'],
      ['msg_7719', 'vance_family@icloud.com', 'review_request', '2026-10-14 14:20', 'DELIVERED', 'resend_evt_462', 1, 'None'],
    ],
  },
  {
    id: 'customer-review-generation-tracker',
    title: 'Customer Review Request & Reputation Generation Tracker',
    headline: 'Turn completed roof replacements into verified 5-star online reviews.',
    description:
      'Tracks review request emails sent upon job completion and monitors confirmed review postings across Google Business Profile, Facebook, and custom URLs.',
    category: 'Reputation & Quality',
    models: ['ReviewRequest', 'OutboundMessage', 'Opportunity'],
    format: 'CSV',
    cadence: 'Weekly',
    badgeTone: 'success',
    sampleHeaders: [
      'Request_ID',
      'Opportunity_Title',
      'Homeowner_Name',
      'Destination_Platform_URL',
      'Sent_At',
      'Review_Status',
      'Confirmed_At',
      'Closing_Sales_Rep',
    ],
    generateSampleRows: () => [
      ['rev_301', 'Full Shingle Install', 'Martin Fowler', 'https://g.page/r/riverly-roofing/review', '2026-10-04 11:00', 'CONFIRMED', '2026-10-06 14:22', 'Jake Miller'],
      ['rev_308', 'Metal Standing Seam Roof', 'Claire Bennet', 'https://g.page/r/riverly-roofing/review', '2026-10-08 09:30', 'CONFIRMED', '2026-10-09 18:05', 'Nina Patel'],
      ['rev_314', 'Flat Commercial EPDM', 'Summit Plaza Ltd', 'https://g.page/r/riverly-roofing/review', '2026-10-11 16:00', 'UNKNOWN', 'Pending Homeowner', 'Walter Grey'],
      ['rev_319', 'Cedar Shake Restoration', 'Douglas Adams', 'https://g.page/r/riverly-roofing/review', '2026-10-13 10:15', 'UNKNOWN', 'Pending Homeowner', 'Jake Miller'],
    ],
  },
  {
    id: 'contracted-vs-estimated-variance',
    title: 'Contracted vs. Estimated Value Variance Report',
    headline: 'Estimating precision: analyze quote accuracy against final contract numbers.',
    description:
      'Analyzes variance percentages between initial quote estimates and finalized signed contracts across roof replacements, repairs, and insurance claims.',
    category: 'Revenue & ROI',
    models: ['Opportunity', 'ExternalRecordLink'],
    format: 'CSV',
    cadence: 'Weekly',
    badgeTone: 'accent',
    sampleHeaders: [
      'Job_ID',
      'Service_Title',
      'Property_City',
      'Initial_Estimate_USD',
      'Final_Contract_USD',
      'Variance_USD',
      'Variance_Pct',
      'Date_Signed',
    ],
    generateSampleRows: () => [
      ['opp_891', 'Complete Shingle Tear-off', 'Denver', 16500, 17200, 700, '+4.2%', '2026-10-02'],
      ['opp_912', 'Hail Claim Tile Replacement', 'Lakewood', 24000, 24000, 0, '0.0%', '2026-10-05'],
      ['opp_930', 'Flat Roof Decking & Membrane', 'Aurora', 19800, 21400, 1600, '+8.1%', '2026-10-08'],
      ['opp_945', 'Gutter & Soffit Repair', 'Centennial', 4500, 4200, -300, '-6.7%', '2026-10-11'],
    ],
  },
  {
    id: 'subcontractor-crew-engagement',
    title: 'Subcontractor & External Labor Assignment Roster',
    headline: 'Total field visibility: third-party inspectors, tear-off crews, and labor partners.',
    description:
      'Catalogs external participants, independent roof inspectors, and installation crews linked to specific active jobs and production stages.',
    category: 'Field Operations',
    models: ['OpportunityParticipant', 'ExternalPerson', 'Opportunity'],
    format: 'CSV',
    cadence: 'Daily',
    badgeTone: 'neutral',
    sampleHeaders: [
      'Participant_ID',
      'External_Person_Name',
      'Company_Or_Crew',
      'Assigned_Role',
      'Linked_Opportunity',
      'Current_Job_Stage',
      'Phone_Contact',
    ],
    generateSampleRows: () => [
      ['part_51', 'Carlos Mendez', 'Mendez Roofing Subcontractors', 'Installation Crew Lead', '342 Aspen Way Roof Replacement', 'Production Scheduled', '(555) 231-9011'],
      ['part_58', 'Bill Henderson', 'Rocky Mountain Drone Inspections', 'External Roof Inspector', '781 Silver Spur Hail Claim', 'Inspection Scheduled', '(555) 890-3341'],
      ['part_64', 'Eduardo Silva', 'Silva Flashing & Sheet Metal', 'Specialist Subcontractor', '1904 Continental Crest', 'Work in Progress', '(555) 671-2299'],
    ],
  },
  {
    id: 'duplicate-ingestion-audit',
    title: 'Duplicate Ingestion & Dedupe Matching History',
    headline: 'Pristine database hygiene: review flagged duplicates across web forms and CSVs.',
    description:
      'Audits all incoming homeowner leads flagged by phone or email deduplication. Logs automatic links, manual reviews, and spam rejections.',
    category: 'Data Quality & Audits',
    models: ['SourceRecord', 'ContactSourceLink', 'Contact'],
    format: 'CSV',
    cadence: 'Real-time',
    badgeTone: 'warning',
    sampleHeaders: [
      'Source_Record_ID',
      'Ingest_Source',
      'Raw_Homeowner_Name',
      'Matched_Contact_ID',
      'Dedupe_Status',
      'Match_Criteria',
      'Reviewed_By',
      'Reviewed_At',
    ],
    generateSampleRows: () => [
      ['src_119', 'CSV Upload (Storm Leads)', 'Robert Chen', 'cnt_301', 'LINKED_EXISTING', 'Phone Normalized Match', 'Jake Miller', '2026-10-09 11:22'],
      ['src_124', 'Website Embed Form', 'Sarah Jenkins', 'cnt_412', 'LINKED_EXISTING', 'Email Normalized Match', 'Auto System', '2026-10-10 14:01'],
      ['src_131', 'CSV Upload (Neighborhood)', 'Test Submission Spam', 'N/A', 'REJECTED', 'No Valid Phone / Spam', 'Jake Miller', '2026-10-11 09:40'],
      ['src_138', 'Website Embed Form', 'Arthur Pendelton', 'cnt_550', 'PENDING_REVIEW', 'Fuzzy Name + Address Match', 'Unreviewed', 'Pending'],
    ],
  },
  {
    id: 'stage-dwell-cycle-duration',
    title: 'Stage Dwell Time & Sales Cycle Duration Analysis',
    headline: 'Cycle velocity: measure exact days spent in each pipeline phase.',
    description:
      'Breaks down average and median calendar days jobs stay in Lead, Inspection, Estimate Sent, and Contract stages to diagnose deal friction.',
    category: 'Velocity & Inbound',
    models: ['StageTransition', 'Opportunity'],
    format: 'CSV',
    cadence: 'Weekly',
    badgeTone: 'accent',
    sampleHeaders: [
      'Stage_Label',
      'Stage_Key',
      'Active_Job_Count',
      'Average_Dwell_Days',
      'Median_Dwell_Days',
      'Min_Days_Observed',
      'Max_Days_Observed',
    ],
    generateSampleRows: () => [
      ['New Inquiry', 'lead', 8, 1.4, 1.0, 0.1, 4.2],
      ['Inspection Scheduled', 'inspection_scheduled', 12, 3.2, 2.5, 0.5, 9.0],
      ['Estimate Sent', 'estimate_sent', 15, 6.8, 5.0, 1.0, 22.0],
      ['Contract Pending', 'contract_review', 9, 4.1, 3.0, 0.5, 14.5],
      ['Work Scheduled', 'production_scheduled', 7, 8.5, 7.0, 2.0, 18.0],
      ['Completed & Paid', 'job_completed', 20, 2.0, 1.5, 0.5, 5.0],
    ],
  },
  {
    id: 'contact-reachability-channel-analysis',
    title: 'Contact Reachability & Preferred Channel Analysis',
    headline: 'Find the best connection channel: phone call answer rates vs. SMS and email.',
    description:
      'Analyzes homeowner response rates across contact methods to establish company-wide communication benchmarks and optimal contact hours.',
    category: 'Sales & Outreach',
    models: ['ActivityEvent', 'WorkflowVersion'],
    format: 'CSV',
    cadence: 'Weekly',
    badgeTone: 'neutral',
    sampleHeaders: [
      'Contact_Method',
      'Total_Attempts',
      'Direct_Conversations',
      'Voicemails_Left',
      'No_Answer',
      'Connect_Rate_Pct',
      'Optimal_Time_Window',
    ],
    generateSampleRows: () => [
      ['Direct Phone Call', 142, 81, 44, 17, '57.0%', '09:00 - 11:30 AM'],
      ['SMS Text Message', 68, 52, 0, 16, '76.5%', '12:00 - 02:00 PM'],
      ['Outbound Email (Resend)', 92, 48, 0, 44, '52.2%', '08:00 - 10:00 AM'],
      ['In-Person Door Knock', 24, 14, 6, 4, '58.3%', '04:30 - 06:30 PM'],
    ],
  },
  {
    id: 'data-completeness-record-health',
    title: 'Data Completeness & Field Record Health Check',
    headline: 'CRM hygiene: flag missing lead sources, unassigned reps, or blank addresses.',
    description:
      'Scans active opportunities for incomplete data fields to ensure sales forecasting and marketing attribution remain 100% reliable.',
    category: 'Data Quality & Audits',
    models: ['Opportunity', 'Contact'],
    format: 'CSV',
    cadence: 'Daily',
    badgeTone: 'warning',
    sampleHeaders: [
      'Opportunity_ID',
      'Homeowner_Name',
      'Current_Stage',
      'Missing_Source',
      'Missing_Owner',
      'Missing_Follow_Up',
      'Missing_Property_Address',
      'Hygiene_Status',
    ],
    generateSampleRows: () => [
      ['opp_1201', 'Thomas Shelby', 'Estimate Sent', 'NO', 'NO', 'YES', 'NO', 'Action Needed: Set Follow-Up'],
      ['opp_1205', 'Rebecca Ferguson', 'New Inquiry', 'YES', 'YES', 'NO', 'NO', 'Action Needed: Assign Owner & Source'],
      ['opp_1211', 'George Miller', 'Inspection Scheduled', 'NO', 'NO', 'NO', 'YES', 'Action Needed: Confirm Property Address'],
      ['opp_1218', 'Hannah Abbott', 'Contract Pending', 'NO', 'NO', 'NO', 'NO', 'Clean Record (100%)'],
    ],
  },
]

/** Browser CSV trigger that creates formatted file for download */
export function downloadReportCsv(
  report: CustomReportDefinition,
  days: number,
  companyName = 'Riverly Roofing Co.',
) {
  const metaLines = [
    `# ═══════════════════════════════════════════════════════════════════════════════`,
    `# Riverly CRM — Custom Analytical Report`,
    `# Report Title: ${report.title}`,
    `# Category: ${report.category}`,
    `# Company Scope: ${companyName}`,
    `# Date Window: Last ${days} days (Generated: ${new Date().toISOString()})`,
    `# Underlying Data Models: ${report.models.join(', ')}`,
    `# Audit Guarantee: Stable stage/option IDs — renaming labels never rewrites history.`,
    `# ═══════════════════════════════════════════════════════════════════════════════`,
  ]

  const escapeCell = (val: string | number) => {
    const str = String(val ?? '')
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const rows = report.generateSampleRows(days)
  const csvContent = [
    ...metaLines,
    report.sampleHeaders.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ].join('\r\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${report.id}_${days}d_export.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
