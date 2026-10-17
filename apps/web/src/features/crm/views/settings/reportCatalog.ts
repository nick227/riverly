import type { Cell, CellStyle, CellValue, WorksheetSpec } from '@/lib/xlsx'

type Format = 'text' | 'integer' | 'money' | 'percent' | 'decimal'

interface Column {
  header: string
  format?: Format
  width?: number
  /** Totals row gets a live SUM for this column. */
  sum?: boolean
  /** Live formula for each data row (and the totals row, unless `sum`), given the Excel row number. */
  formula?: (row: number) => string
  /** Highlighted cell the reader fills in (e.g. marketing spend). */
  input?: boolean
}

interface DataSheet {
  name: string
  purpose: string
  columns: Column[]
  /** Full-width rows; use null where a column is a formula or an input. */
  rows: CellValue[][]
}

interface Figure {
  label: string
  value: number | string
  format?: Format
}

export interface ReportDefinition {
  id: string
  /** "Name: what it reveals". The part before the colon names the file and sheet subtitles. */
  title: string
  /** Why it's worth opening; shown in the report library. */
  pitch: string
  /** What the report contains, in one plain sentence (Summary sheet). */
  shows: string
  /** The decision it supports. */
  useIt: string
  audience: string
  cadence: 'Weekly' | 'Monthly'
  figures: Figure[]
  highlights: string[]
  /** Caveat printed on the Summary sheet, e.g. where values come from. */
  note?: string
  sheets: DataSheet[]
}

const int = (header: string, extra: Partial<Column> = {}): Column => ({ header, format: 'integer', ...extra })
const usd = (header: string, extra: Partial<Column> = {}): Column => ({ header, format: 'money', ...extra })
const pct = (header: string, extra: Partial<Column> = {}): Column => ({ header, format: 'percent', ...extra })
const dec = (header: string, extra: Partial<Column> = {}): Column => ({ header, format: 'decimal', ...extra })
const txt = (header: string, width?: number): Column => ({ header, width })

const MANUAL_VALUES = 'Estimated and contract values are entered by your team on each job and are not verified against invoices or payments.'

export const REPORTS: ReportDefinition[] = [
  {
    id: 'pipeline-conversion',
    title: 'Pipeline Conversion & Stalled Deal Report: Where Jobs Slip Away, Stage by Stage',
    pitch: 'Pinpoint the one stage bleeding the most deals, see how many days jobs sit before they move, and get a ready-to-call list of every open job that has gone silent for two weeks.',
    shows: 'How many jobs move from each stage to the next, how long they sit at each stage, and which open jobs have stalled.',
    useIt: 'Run it before the weekly sales meeting to decide which deals need a push and which stage needs attention.',
    audience: 'Owners and sales managers',
    cadence: 'Weekly',
    figures: [
      { label: 'Open jobs', value: 49, format: 'integer' },
      { label: 'Open pipeline value', value: 812400, format: 'money' },
      { label: 'Lead-to-contract conversion', value: 0.44, format: 'percent' },
      { label: 'Average days from lead to signed contract', value: 21.6, format: 'decimal' },
      { label: 'Stalled open jobs (no activity in 14+ days)', value: 3, format: 'integer' },
    ],
    highlights: [
      'Estimate Sent loses the most jobs: 9 of 38 (24%) were lost at this stage.',
      'Jobs wait longest at Work Scheduled, 8.5 days on average.',
      '3 open jobs worth $59,500 have had no calls, emails or stage changes in 14+ days. They are listed on the Stalled Jobs sheet with phone and email.',
    ],
    note: MANUAL_VALUES,
    sheets: [
      {
        name: 'Stage Conversion',
        purpose: 'Jobs that reached each stage, and how many moved forward, went back, or were lost there.',
        columns: [
          txt('Stage', 20),
          int('Jobs entered'),
          int('Moved forward'),
          int('Moved back'),
          int('Lost at stage'),
          pct('Conversion rate', { formula: (r) => `IF(B${r}>0,C${r}/B${r},"")` }),
          dec('Avg. days in stage'),
        ],
        rows: [
          ['New Lead', 48, 44, 0, 4, null, 1.4],
          ['Visit Scheduled', 44, 38, 2, 4, null, 3.2],
          ['Estimate Sent', 38, 26, 3, 9, null, 6.8],
          ['Contract Pending', 26, 21, 1, 4, null, 4.1],
          ['Work Scheduled', 21, 20, 0, 1, null, 8.5],
          ['Completed', 20, 20, 0, 0, null, 2.0],
        ],
      },
      {
        name: 'Time in Stage',
        purpose: 'Days that open jobs have spent at their current stage.',
        columns: [txt('Stage', 20), int('Open jobs', { sum: true }), dec('Average days'), dec('Median days'), dec('Shortest'), dec('Longest')],
        rows: [
          ['New Lead', 8, 1.4, 1.0, 0.1, 4.2],
          ['Visit Scheduled', 12, 3.2, 2.5, 0.5, 9.0],
          ['Estimate Sent', 15, 6.8, 5.0, 1.0, 22.0],
          ['Contract Pending', 7, 4.1, 3.0, 0.5, 14.5],
          ['Work Scheduled', 7, 8.5, 7.0, 2.0, 18.0],
        ],
      },
      {
        name: 'Open Jobs by Age',
        purpose: 'Every open job, oldest lead first, with its stage, owner, value and next follow-up.',
        columns: [
          txt('Customer', 18),
          txt('Job', 18),
          txt('Stage', 17),
          txt('Owner', 15),
          int('Days since lead'),
          int('Days in stage'),
          txt('Last activity', 13),
          usd('Estimated value', { sum: true }),
          txt('Next follow-up', 14),
        ],
        rows: [
          ['Lena Ward', 'Commercial project', 'Estimate Sent', 'Walter Grey', 41, 15, '2026-10-08', 42000, '2026-10-21'],
          ['Bradley Cooper', 'Full replacement', 'Estimate Sent', 'Jake Miller', 38, 23, '2026-09-24', 18500, ''],
          ['Greg Holloway', 'Commercial project', 'Contract Pending', 'Jake Miller', 33, 14, '2026-10-01', 26800, '2026-10-20'],
          ['Karen Phillips', 'Repair', 'Visit Scheduled', 'Nina Patel', 24, 17, '2026-09-28', 14200, ''],
          ['Thomas Shelby', 'Insurance claim', 'Estimate Sent', 'Nina Patel', 15, 8, '2026-10-15', 31500, '2026-10-18'],
          ['Hannah Abbott', 'Repair', 'Contract Pending', 'Walter Grey', 9, 3, '2026-10-16', 12400, '2026-10-19'],
          ['Rebecca Ferguson', 'Full replacement', 'New Lead', 'Unassigned', 1, 1, '2026-10-16', 17600, ''],
        ],
      },
      {
        name: 'Stalled Jobs',
        purpose: 'Open jobs with no calls, emails or stage changes in the last 14 days.',
        columns: [txt('Customer', 18), txt('Stage', 17), txt('Owner', 15), txt('Last activity', 13), int('Days inactive'), usd('Estimated value', { sum: true }), txt('Phone', 16), txt('Email', 24)],
        rows: [
          ['Bradley Cooper', 'Estimate Sent', 'Jake Miller', '2026-09-24', 23, 18500, '(555) 349-8812', 'bcooper@example.com'],
          ['Karen Phillips', 'Visit Scheduled', 'Nina Patel', '2026-09-28', 19, 14200, '(555) 912-4401', 'kphillips@example.com'],
          ['Greg Holloway', 'Contract Pending', 'Jake Miller', '2026-10-01', 16, 26800, '(555) 773-1920', 'gholloway@example.com'],
        ],
      },
    ],
  },
  {
    id: 'revenue-forecast',
    title: '90-Day Revenue Forecast: What Will Sign, When, and How Much You Can Count On',
    pitch: 'Know what\'s coming before it lands. Every open job is weighted by your own close rates to project revenue for the next 30, 60 and 90 days, so you can book crews, order materials and plan cash with confidence.',
    shows: 'Expected revenue from open jobs over the next 30, 60 and 90 days, with each job weighted by how often jobs at its stage have signed in your own history.',
    useIt: 'Use it to plan crews, materials and cash flow, and to set realistic monthly targets.',
    audience: 'Owners and office managers',
    cadence: 'Monthly',
    figures: [
      { label: 'Open pipeline before contract', value: 733400, format: 'money' },
      { label: 'Weighted forecast, next 90 days', value: 412334, format: 'money' },
      { label: 'Expected to sign in the next 30 days', value: 261934, format: 'money' },
      { label: 'Signed in the last 90 days', value: 646100, format: 'money' },
      { label: 'Historical lead-to-contract rate', value: 0.44, format: 'percent' },
    ],
    highlights: [
      '$261,934 is expected to sign in the next 30 days, led by 7 jobs at Contract Pending (81% historically sign).',
      'Estimate Sent carries the most weighted value ($147,400). Following up on these 15 estimates moves the forecast most.',
      'Win probabilities come from your own past conversions, so the forecast sharpens as more jobs close.',
    ],
    note: `${MANUAL_VALUES} Win probability = share of past jobs at that stage that went on to sign.`,
    sheets: [
      {
        name: 'Forecast by Period',
        purpose: 'Weighted revenue expected to sign in each period, based on typical days to sign from each stage.',
        columns: [txt('Period', 18), int('Jobs', { sum: true }), usd('Pipeline value', { sum: true }), usd('Weighted forecast', { sum: true }), txt('Mostly from', 30)],
        rows: [
          ['Next 30 days', 22, 409400, 261934, 'Contract Pending, Estimate Sent'],
          ['31–60 days', 12, 196000, 94080, 'Visit Scheduled'],
          ['61–90 days', 8, 128000, 56320, 'New Lead'],
        ],
      },
      {
        name: 'Forecast by Stage',
        purpose: 'Open value at each stage multiplied by the historical chance that jobs at that stage sign.',
        columns: [
          txt('Stage', 18),
          int('Open jobs', { sum: true }),
          usd('Pipeline value', { sum: true }),
          pct('Historical win rate'),
          usd('Weighted value', { sum: true, formula: (r) => `C${r}*D${r}` }),
          int('Typical days to sign'),
        ],
        rows: [
          ['New Lead', 8, 128000, 0.44, null, 72],
          ['Visit Scheduled', 12, 196000, 0.48, null, 41],
          ['Estimate Sent', 15, 268000, 0.55, null, 18],
          ['Contract Pending', 7, 141400, 0.81, null, 6],
        ],
      },
      {
        name: 'Weighted Job List',
        purpose: 'Each open job before contract with its win probability and expected signing month.',
        columns: [
          txt('Customer', 18),
          txt('Job', 18),
          txt('Stage', 17),
          txt('Owner', 15),
          usd('Estimated value', { sum: true }),
          pct('Win probability'),
          usd('Weighted value', { sum: true, formula: (r) => `E${r}*F${r}` }),
          txt('Expected to sign', 15),
        ],
        rows: [
          ['Lena Ward', 'Commercial project', 'Estimate Sent', 'Walter Grey', 42000, 0.55, null, 'November 2026'],
          ['Thomas Shelby', 'Insurance claim', 'Estimate Sent', 'Nina Patel', 31500, 0.55, null, 'November 2026'],
          ['Greg Holloway', 'Commercial project', 'Contract Pending', 'Jake Miller', 26800, 0.81, null, 'October 2026'],
          ['Bradley Cooper', 'Full replacement', 'Estimate Sent', 'Jake Miller', 18500, 0.55, null, 'November 2026'],
          ['Rebecca Ferguson', 'Full replacement', 'New Lead', 'Unassigned', 17600, 0.44, null, 'January 2027'],
          ['Karen Phillips', 'Repair', 'Visit Scheduled', 'Nina Patel', 14200, 0.48, null, 'December 2026'],
          ['Hannah Abbott', 'Repair', 'Contract Pending', 'Walter Grey', 12400, 0.81, null, 'October 2026'],
        ],
      },
    ],
  },
  {
    id: 'lost-jobs',
    title: 'Lost Job Analysis: Why Customers Said No and What It Cost You',
    pitch: 'Every lost job, the stage it died at, the reason given and the dollars that walked out the door, ranked so you fix the problem costing you the most first.',
    shows: 'Every job marked lost in the period, the stage where it was lost, the reason recorded, and the estimated value that walked away.',
    useIt: 'Use it to find pricing, follow-up or qualification problems and fix the costliest one first.',
    audience: 'Owners and sales managers',
    cadence: 'Monthly',
    figures: [
      { label: 'Jobs lost', value: 22, format: 'integer' },
      { label: 'Estimated value lost', value: 348600, format: 'money' },
      { label: 'Most common reason', value: 'Price too high (7 jobs)' },
      { label: 'Stage with the most losses', value: 'Estimate Sent (9 jobs)' },
      { label: 'Lost after an estimate was sent', value: 0.64, format: 'percent' },
    ],
    highlights: [
      'Price is the top reason (7 jobs, $124,600). Review how estimates are presented before changing prices.',
      '64% of losses happen after the estimate goes out, so a set estimate follow-up routine is the biggest opportunity.',
      '1 lost job has no reason recorded. Asking for a reason every time makes this report sharper.',
    ],
    note: MANUAL_VALUES,
    sheets: [
      {
        name: 'Loss Reasons',
        purpose: 'Why jobs were lost, ranked by value.',
        columns: [
          txt('Reason', 30),
          int('Jobs', { sum: true }),
          usd('Estimated value', { sum: true }),
          pct('Share of value', { formula: (r) => `IF(SUM(C$5:C$10)>0,C${r}/SUM(C$5:C$10),"")` }),
        ],
        rows: [
          ['Price too high', 7, 124600, null],
          ['Chose another contractor', 5, 86400, null],
          ['No response after estimate', 4, 61800, null],
          ['Project postponed', 3, 42000, null],
          ['Outside service area or not a fit', 2, 19600, null],
          ['No reason recorded', 1, 14200, null],
        ],
      },
      {
        name: 'Losses by Stage',
        purpose: 'Where in the process jobs were lost.',
        columns: [txt('Stage lost at', 18), int('Jobs', { sum: true }), usd('Estimated value', { sum: true }), txt('Top reason', 28)],
        rows: [
          ['New Lead', 4, 42000, 'Outside service area or not a fit'],
          ['Visit Scheduled', 4, 58800, 'Project postponed'],
          ['Estimate Sent', 9, 152400, 'Price too high'],
          ['Contract Pending', 4, 81200, 'Chose another contractor'],
          ['Work Scheduled', 1, 14200, 'No reason recorded'],
        ],
      },
      {
        name: 'Losses by Salesperson',
        purpose: 'Jobs won and lost by each owner, with their close rate.',
        columns: [
          txt('Salesperson', 18),
          int('Won', { sum: true }),
          int('Lost', { sum: true }),
          pct('Close rate', { formula: (r) => `IF(B${r}+C${r}>0,B${r}/(B${r}+C${r}),"")` }),
          usd('Value lost', { sum: true }),
          txt('Top reason', 26),
        ],
        rows: [
          ['Jake Miller', 13, 9, null, 148200, 'Price too high'],
          ['Nina Patel', 16, 6, null, 98400, 'Chose another contractor'],
          ['Walter Grey', 8, 5, null, 72600, 'Price too high'],
          ['Unassigned', 0, 2, null, 29400, 'No response after estimate'],
        ],
      },
      {
        name: 'Lost Jobs',
        purpose: 'Each lost job with its stage, reason and value.',
        columns: [txt('Date lost', 12), txt('Customer', 18), txt('Job', 18), txt('Stage lost at', 17), txt('Owner', 15), txt('Reason', 28), usd('Estimated value', { sum: true }), int('Days open')],
        rows: [
          ['2026-10-15', 'Paul Rudd', 'Full replacement', 'Estimate Sent', 'Walter Grey', 'Price too high', 21400, 26],
          ['2026-10-11', 'Mia Torres', 'Commercial project', 'Contract Pending', 'Jake Miller', 'Chose another contractor', 38600, 34],
          ['2026-10-08', 'Dean Fox', 'Repair', 'Estimate Sent', 'Jake Miller', 'No response after estimate', 6800, 22],
          ['2026-10-04', 'June Park', 'Insurance claim', 'Visit Scheduled', 'Nina Patel', 'Project postponed', 18200, 12],
          ['2026-09-29', 'Al Grant', 'Repair', 'New Lead', 'Unassigned', 'Outside service area or not a fit', 9800, 3],
        ],
      },
    ],
  },
  {
    id: 'lead-source-roi',
    title: 'Lead Source ROI Report: Which Marketing Channels Actually Turn Into Signed Contracts',
    pitch: 'Stop guessing where to spend. Win rate, signed revenue and average job size for every lead source, month by month. Drop in your ad spend and it calculates cost per lead, cost per signed job and the return on every dollar.',
    shows: 'Leads, win rate, signed revenue and average job size for every lead source, month by month. Enter your marketing spend and the workbook calculates cost per lead, cost per signed job and revenue per dollar spent.',
    useIt: 'Use it to move budget toward the sources that sign the most work.',
    audience: 'Owners and marketing',
    cadence: 'Monthly',
    figures: [
      { label: 'Leads received', value: 100, format: 'integer' },
      { label: 'Contracts signed', value: 41, format: 'integer' },
      { label: 'Overall win rate', value: 0.41, format: 'percent' },
      { label: 'Signed revenue', value: 646100, format: 'money' },
      { label: 'Average signed job', value: 15759, format: 'money' },
    ],
    highlights: [
      'Referrals sign best: 9 of 12 leads (75%).',
      'Google brings in the most signed revenue: $218,500 from 14 jobs.',
      'Imported lists bring the most leads (34) but sign only 18%. Add spend in the yellow column to see whether they pay off.',
    ],
    note: `${MANUAL_VALUES} Spend is not stored in Riverly; enter it in the yellow cells.`,
    sheets: [
      {
        name: 'Source Performance',
        purpose: 'Results by lead source. Enter marketing spend in the yellow column to calculate cost and return.',
        columns: [
          txt('Lead source', 18),
          int('Leads', { sum: true }),
          int('Estimates given', { sum: true }),
          int('Contracts signed', { sum: true }),
          pct('Win rate', { formula: (r) => `IF(B${r}>0,D${r}/B${r},"")` }),
          usd('Signed revenue', { sum: true }),
          usd('Avg. signed job', { formula: (r) => `IF(D${r}>0,F${r}/D${r},"")` }),
          usd('Marketing spend', { sum: true, input: true }),
          usd('Cost per lead', { formula: (r) => `IF(AND(H${r}>0,B${r}>0),H${r}/B${r},"")` }),
          usd('Cost per signed job', { formula: (r) => `IF(AND(H${r}>0,D${r}>0),H${r}/D${r},"")` }),
          dec('Revenue per $1 spent', { formula: (r) => `IF(H${r}>0,F${r}/H${r},"")` }),
        ],
        rows: [
          ['Google', 28, 24, 14, null, 218500, null, null, null, null, null],
          ['Website form', 18, 14, 8, null, 134200, null, null, null, null, null],
          ['Referral', 12, 11, 9, null, 142000, null, null, null, null, null],
          ['Imported list', 34, 18, 6, null, 89400, null, null, null, null, null],
          ['Signs & drive-by', 8, 7, 4, null, 62000, null, null, null, null, null],
        ],
      },
      {
        name: 'Monthly Trend',
        purpose: 'New leads per month from each source.',
        columns: [txt('Month', 16), int('Google', { sum: true }), int('Website form', { sum: true }), int('Referral', { sum: true }), int('Imported list', { sum: true }), int('Signs & drive-by', { sum: true }), int('All sources', { sum: true, formula: (r) => `SUM(B${r}:F${r})` })],
        rows: [
          ['July 2026', 5, 3, 2, 0, 1, null],
          ['August 2026', 8, 5, 3, 20, 2, null],
          ['September 2026', 9, 6, 4, 10, 3, null],
          ['October 2026', 6, 4, 3, 4, 2, null],
        ],
      },
      {
        name: 'Lead Detail',
        purpose: 'Each lead with its source, stage and outcome.',
        columns: [txt('Received', 12), txt('Customer', 18), txt('Lead source', 15), txt('Stage', 17), txt('Owner', 15), usd('Estimated value'), usd('Signed value'), txt('Outcome', 10)],
        rows: [
          ['2026-10-14', 'Marcus Vance', 'Website form', 'Visit Scheduled', 'Nina Patel', 15800, null, 'Open'],
          ['2026-10-13', 'Emily Watson', 'Imported list', 'New Lead', 'Jake Miller', null, null, 'Open'],
          ['2026-10-12', 'Sarah Jenkins', 'Google', 'Estimate Sent', 'Nina Patel', 19400, null, 'Open'],
          ['2026-10-05', 'Claire Bennet', 'Referral', 'Completed', 'Nina Patel', 24000, 24000, 'Won'],
          ['2026-10-02', 'Martin Fowler', 'Google', 'Work Scheduled', 'Jake Miller', 16500, 17200, 'Won'],
          ['2026-09-30', 'Paul Rudd', 'Imported list', 'Estimate Sent', 'Walter Grey', 21400, null, 'Lost'],
        ],
      },
    ],
  },
  {
    id: 'lead-response',
    title: 'Speed-to-Lead Report: How Fast Your Team Responds and Which Leads Are Left Waiting',
    pitch: 'The first contractor to call usually wins the job. See response times by rep, source and time of day, the leads that waited hours (weekends especially), and every follow-up promise that slipped.',
    shows: 'How long each new lead waited for a first call, text or email, by salesperson, lead source and time of day, plus every follow-up date that has been missed.',
    useIt: 'The first company to respond often wins the job. Use it to coach response habits and decide who gets new leads.',
    audience: 'Sales managers',
    cadence: 'Weekly',
    figures: [
      { label: 'Median time to first contact (minutes)', value: 12, format: 'integer' },
      { label: 'Leads contacted within 1 hour', value: 0.82, format: 'percent' },
      { label: 'Leads not contacted yet', value: 3, format: 'integer' },
      { label: 'Missed follow-ups', value: 7, format: 'integer' },
      { label: 'Average days past due', value: 2.4, format: 'decimal' },
    ],
    highlights: [
      'Nina Patel responds fastest, with a median of 7 minutes.',
      'Weekend leads wait a median of 3.4 hours, against 8 minutes on weekdays. Consider a weekend on-call rotation.',
      '7 follow-ups are past due; 3 belong to Jake Miller.',
    ],
    note: 'Calls and visits are logged by your team. Email times come from the email provider. Lead arrival time comes from the web form or import file where available.',
    sheets: [
      {
        name: 'By Salesperson',
        purpose: 'How quickly each person makes first contact with the leads assigned to them.',
        columns: [txt('Salesperson', 18), int('New leads', { sum: true }), int('Median minutes'), pct('Within 15 minutes'), pct('Within 1 hour'), int('Not contacted yet', { sum: true })],
        rows: [
          ['Jake Miller', 34, 14, 0.53, 0.79, 1],
          ['Nina Patel', 38, 7, 0.76, 0.92, 0],
          ['Walter Grey', 18, 19, 0.44, 0.78, 1],
          ['Unassigned', 10, 41, 0.2, 0.6, 1],
        ],
      },
      {
        name: 'By Source',
        purpose: 'How quickly leads from each source are contacted.',
        columns: [txt('Lead source', 18), int('Leads', { sum: true }), int('Median minutes'), pct('Within 1 hour')],
        rows: [
          ['Google', 28, 9, 0.93],
          ['Website form', 18, 11, 0.89],
          ['Referral', 12, 6, 0.92],
          ['Imported list', 34, 85, 0.65],
          ['Signs & drive-by', 8, 14, 0.88],
        ],
      },
      {
        name: 'By Time Received',
        purpose: 'Response times for leads that arrive during and outside business hours.',
        columns: [txt('Received', 26), int('Leads', { sum: true }), int('Median minutes'), pct('Within 1 hour')],
        rows: [
          ['Weekdays, 8 AM–6 PM', 71, 8, 0.94],
          ['Weekday evenings and nights', 17, 46, 0.65],
          ['Weekends', 12, 204, 0.33],
        ],
      },
      {
        name: 'Slowest Responses',
        purpose: 'Leads that waited longest for a first contact.',
        columns: [txt('Received', 17), txt('Customer', 18), txt('Lead source', 15), txt('First contact', 17), int('Minutes waited'), txt('Method', 12), txt('Owner', 15)],
        rows: [
          ['2026-10-11 19:40', 'Ivy Chen', 'Website form', '2026-10-13 08:05', 2185, 'Phone call', 'Nina Patel'],
          ['2026-10-12 10:15', 'Sam Ortega', 'Google', '2026-10-12 16:50', 395, 'Email', 'Jake Miller'],
          ['2026-10-13 11:20', 'Emily Watson', 'Imported list', '2026-10-13 12:45', 85, 'Phone call', 'Jake Miller'],
          ['2026-10-14 13:02', 'Rita Gomez', 'Referral', '2026-10-14 14:01', 59, 'Text', 'Walter Grey'],
        ],
      },
      {
        name: 'Missed Follow-Ups',
        purpose: 'Follow-up dates that passed with no contact logged since.',
        columns: [txt('Customer', 18), txt('Job', 18), txt('Owner', 15), txt('Follow-up was due', 16), int('Days past due'), txt('Last contact', 13), txt('Method', 12)],
        rows: [
          ['Owen Park', 'Repair', 'Jake Miller', '2026-10-12', 5, '2026-10-02', 'Phone call'],
          ['Sandra Bullock', 'Urgent repair', 'Jake Miller', '2026-10-14', 3, '2026-10-07', 'Phone call'],
          ['Sam Ortega', 'Commercial project', 'Jake Miller', '2026-10-14', 3, '2026-10-06', 'Email'],
          ['Keith Morrison', 'Full replacement', 'Nina Patel', '2026-10-15', 2, '2026-10-09', 'Email'],
          ['Rita Gomez', 'Full replacement', 'Walter Grey', '2026-10-15', 2, '2026-10-08', 'Text'],
          ['Lydia Vance', 'Insurance claim', 'Unassigned', '2026-10-16', 1, '2026-10-12', 'Website form'],
          ['Ivy Chen', 'Repair', 'Nina Patel', '2026-10-16', 1, '2026-10-10', 'Phone call'],
        ],
      },
    ],
  },
  {
    id: 'salesperson-scorecard',
    title: 'Salesperson Scorecard: Activity, Close Rate and Revenue for Every Rep, Side by Side',
    pitch: 'Who is making the calls, who is closing, and who is bringing in the money. Attempts, conversations, appointments, close rate and signed revenue for every rep, ready for one-on-ones and commission reviews.',
    shows: 'Calls, conversations, appointments, estimates, contracts signed and revenue for each salesperson side by side, with close rate and average job size.',
    useIt: 'Use it for one-on-ones, commission reviews and setting individual targets.',
    audience: 'Owners and sales managers',
    cadence: 'Monthly',
    figures: [
      { label: 'Contact attempts', value: 248, format: 'integer' },
      { label: 'Conversations (customer reached)', value: 143, format: 'integer' },
      { label: 'Appointments completed', value: 31, format: 'integer' },
      { label: 'Contracts signed', value: 41, format: 'integer' },
      { label: 'Signed revenue', value: 646100, format: 'money' },
    ],
    highlights: [
      'Nina Patel leads on signed revenue ($262,300) and on activity (96 attempts).',
      'Walter Grey turns 89% of estimates into contracts, the highest on the team.',
      'Texts reach customers 75% of the time but make up only 18% of attempts.',
    ],
    note: `Contact attempts are logged by your team, so they reflect effort rather than confirmed conversations. ${MANUAL_VALUES}`,
    sheets: [
      {
        name: 'Scorecard',
        purpose: 'Activity and results for each salesperson. Rates and averages calculate from the columns to their left.',
        columns: [
          txt('Salesperson', 18),
          int('Contact attempts', { sum: true }),
          int('Conversations', { sum: true }),
          pct('Reach rate', { formula: (r) => `IF(B${r}>0,C${r}/B${r},"")` }),
          int('Appointments', { sum: true }),
          int('Estimates sent', { sum: true }),
          int('Contracts signed', { sum: true }),
          pct('Estimate close rate', { formula: (r) => `IF(F${r}>0,G${r}/F${r},"")` }),
          usd('Signed revenue', { sum: true }),
          usd('Avg. signed job', { formula: (r) => `IF(G${r}>0,I${r}/G${r},"")` }),
        ],
        rows: [
          ['Jake Miller', 84, 45, null, 9, 18, 13, null, 204600, null],
          ['Nina Patel', 96, 57, null, 11, 22, 16, null, 262300, null],
          ['Walter Grey', 46, 27, null, 8, 9, 8, null, 121400, null],
          ['Angela Ruiz', 22, 14, null, 3, 6, 4, null, 57800, null],
        ],
      },
      {
        name: 'Weekly Activity',
        purpose: 'Contact attempts logged per person each week.',
        columns: [txt('Week of', 14), int('Jake Miller', { sum: true }), int('Nina Patel', { sum: true }), int('Walter Grey', { sum: true }), int('Angela Ruiz', { sum: true }), int('Team', { sum: true, formula: (r) => `SUM(B${r}:E${r})` })],
        rows: [
          ['2026-09-21', 19, 22, 10, 4, null],
          ['2026-09-28', 22, 25, 12, 6, null],
          ['2026-10-05', 21, 26, 13, 7, null],
          ['2026-10-12', 22, 23, 11, 5, null],
        ],
      },
      {
        name: 'Results by Method',
        purpose: 'How often each contact method reaches the customer, and when it works best.',
        columns: [
          txt('Method', 14),
          int('Attempts', { sum: true }),
          int('Reached', { sum: true }),
          int('Voicemail', { sum: true }),
          int('No answer', { sum: true }),
          pct('Reach rate', { formula: (r) => `IF(B${r}>0,C${r}/B${r},"")` }),
          txt('Best time of day', 16),
        ],
        rows: [
          ['Phone call', 132, 75, 40, 17, null, '9:00–11:30 AM'],
          ['Text', 44, 33, 0, 11, null, '12:00–2:00 PM'],
          ['Email', 52, 24, 0, 28, null, '8:00–10:00 AM'],
          ['In person', 20, 11, 3, 6, null, '4:30–6:30 PM'],
        ],
      },
    ],
  },
  {
    id: 'receivables',
    title: 'Unpaid Invoices & Cash Collection Report: Every Dollar Owed and How Long It Has Waited',
    pitch: 'See exactly who owes you, how much, and for how long, aged into 30, 60 and 90-day buckets, plus finished jobs that were never invoiced at all.',
    shows: 'Invoices, deposits and payments recorded on each job, what is still unpaid and for how long, and completed jobs that have no invoice recorded.',
    useIt: 'Use it weekly to chase unpaid balances before they age past 60 days.',
    audience: 'Owners and office managers',
    cadence: 'Weekly',
    figures: [
      { label: 'Unpaid invoices', value: 86450, format: 'money' },
      { label: 'Unpaid for more than 30 days', value: 46150, format: 'money' },
      { label: 'Payments and deposits recorded', value: 40690, format: 'money' },
      { label: 'Completed jobs with no invoice recorded', value: 2, format: 'integer' },
      { label: 'Contract value of those jobs', value: 31600, format: 'money' },
    ],
    highlights: [
      '$46,150 (53%) of unpaid invoices is more than 30 days old.',
      'One invoice of $14,950 is over 90 days old. Consider a direct call rather than another email.',
      '2 completed jobs worth $31,600 have no invoice recorded. Confirm they were billed.',
    ],
    note: 'Invoice, deposit and payment amounts and statuses are entered by your team on each job. They are not synced with your accounting system.',
    sheets: [
      {
        name: 'Unpaid Invoices',
        purpose: 'Invoices not yet marked paid, oldest first.',
        columns: [txt('Customer', 18), txt('Job', 18), txt('Invoice', 12), txt('Invoice date', 12), int('Days unpaid'), usd('Amount', { sum: true }), txt('Status', 10), txt('Owner', 15)],
        rows: [
          ['Owen Park', 'Repair', 'INV-1031', '2026-07-14', 95, 14950, 'Overdue', 'Jake Miller'],
          ['Sam Ortega', 'Commercial project', 'INV-1044', '2026-08-11', 67, 17000, 'Overdue', 'Jake Miller'],
          ['Rita Gomez', 'Full replacement', 'INV-1052', '2026-09-06', 41, 14200, 'Sent', 'Walter Grey'],
          ['Nora Kim', 'Full replacement', 'INV-1058', '2026-09-23', 24, 18900, 'Sent', 'Nina Patel'],
          ['Summit Plaza', 'Commercial project', 'INV-1063', '2026-10-05', 12, 21400, 'Sent', 'Walter Grey'],
        ],
      },
      {
        name: 'Aging Summary',
        purpose: 'Unpaid invoices grouped by how long they have been outstanding.',
        columns: [txt('Days unpaid', 14), int('Invoices', { sum: true }), usd('Amount', { sum: true }), pct('Share', { formula: (r) => `IF(SUM(C$5:C$8)>0,C${r}/SUM(C$5:C$8),"")` })],
        rows: [
          ['0–30 days', 2, 40300, null],
          ['31–60 days', 1, 14200, null],
          ['61–90 days', 1, 17000, null],
          ['Over 90 days', 1, 14950, null],
        ],
      },
      {
        name: 'Payments Recorded',
        purpose: 'Deposits and payments recorded on jobs in the period.',
        columns: [txt('Date', 12), txt('Customer', 18), txt('Job', 18), txt('Type', 14), usd('Amount', { sum: true }), txt('Reference', 14)],
        rows: [
          ['2026-10-14', 'Martin Fowler', 'Full replacement', 'Final payment', 17200, 'INV-1049'],
          ['2026-10-09', 'Claire Bennet', 'Insurance claim', 'Deposit', 7200, 'DEP-212'],
          ['2026-10-06', 'Nora Kim', 'Full replacement', 'Deposit', 5670, 'DEP-209'],
          ['2026-10-02', 'Summit Plaza', 'Commercial project', 'Deposit', 6420, 'DEP-207'],
          ['2026-09-28', 'Douglas Adams', 'Repair', 'Payment in full', 4200, 'INV-1050'],
        ],
      },
      {
        name: 'Completed, Not Invoiced',
        purpose: 'Jobs at the final stage with no invoice recorded.',
        columns: [txt('Customer', 18), txt('Job', 18), txt('Completed', 12), usd('Contract value', { sum: true }), txt('Owner', 15)],
        rows: [
          ['Claire Bennet', 'Insurance claim', '2026-10-07', 24000, 'Nina Patel'],
          ['Hugo Lane', 'Repair', '2026-10-10', 7600, 'Walter Grey'],
        ],
      },
    ],
  },
  {
    id: 'appointments-crews',
    title: 'Appointment & Crew Performance Report: Completed Visits, No-Shows and Who Is Carrying the Load',
    pitch: 'Completion and no-show rates for every rep and outside crew, the full appointment log with notes, and the next two weeks of bookings, so you can balance workloads and stop wasted trips.',
    shows: 'Booked, completed, cancelled and no-show appointments for every team member and outside crew, with the next two weeks of bookings.',
    useIt: 'Use it to cut no-shows, balance workloads and decide which outside crews to keep booking.',
    audience: 'Operations and office managers',
    cadence: 'Weekly',
    figures: [
      { label: 'Appointments booked', value: 38, format: 'integer' },
      { label: 'Completed', value: 31, format: 'integer' },
      { label: 'Completion rate', value: 0.82, format: 'percent' },
      { label: 'Cancelled', value: 4, format: 'integer' },
      { label: 'No-shows', value: 3, format: 'integer' },
    ],
    highlights: [
      '82% of appointments were completed as booked.',
      'Walter Grey completed the most visits (12 of 14) with one no-show.',
      'All 3 no-shows were afternoon visits with no reminder email sent the day before.',
    ],
    sheets: [
      {
        name: 'By Team Member',
        purpose: 'Appointment outcomes for each person and outside crew.',
        columns: [
          txt('Assigned to', 22),
          int('Booked', { sum: true }),
          int('Completed', { sum: true }),
          int('Cancelled', { sum: true }),
          int('No-shows', { sum: true }),
          pct('Completion rate', { formula: (r) => `IF(B${r}>0,C${r}/B${r},"")` }),
        ],
        rows: [
          ['Walter Grey', 14, 12, 1, 1, null],
          ['Jake Miller', 10, 8, 1, 1, null],
          ['Nina Patel', 9, 7, 1, 1, null],
          ['Apex Field Services (outside)', 5, 4, 1, 0, null],
        ],
      },
      {
        name: 'Outside Crews',
        purpose: 'Outside crews and partners on active jobs, with their workload and contact details.',
        columns: [txt('Name', 18), txt('Company', 24), txt('Role', 12), int('Active jobs', { sum: true }), int('Visits completed', { sum: true }), txt('Phone', 16)],
        rows: [
          ['Carlos Mendez', 'Mendez Contracting', 'Crew lead', 3, 0, '(555) 231-9011'],
          ['Bill Henderson', 'Apex Field Services', 'Inspector', 2, 4, '(555) 890-3341'],
          ['Eduardo Silva', 'Silva Specialty Trades', 'Specialist', 1, 0, '(555) 671-2299'],
        ],
      },
      {
        name: 'Appointment Log',
        purpose: 'Every appointment in the period with its outcome and notes.',
        columns: [txt('Date', 12), txt('Time', 8), txt('Customer', 18), txt('Address', 20), txt('Assigned to', 18), txt('Status', 11), txt('Notes', 28)],
        rows: [
          ['2026-10-15', '14:00', 'Ivy Chen', '77 Birch Hollow', 'Nina Patel', 'Cancelled', 'Customer asked to rebook next week'],
          ['2026-10-13', '15:00', 'Douglas Adams', '512 Summit Crest', 'Walter Grey', 'No-show', 'Gate locked, no answer'],
          ['2026-10-12', '13:00', 'Claire Bennet', '892 Oak Valley Dr', 'Apex Field Services', 'Completed', 'Report attached'],
          ['2026-10-11', '10:00', 'Martin Fowler', '1428 Elm Creek Rd', 'Walter Grey', 'Completed', 'Photos added'],
        ],
      },
      {
        name: 'Next Two Weeks',
        purpose: 'Appointments already booked for the next 14 days.',
        columns: [txt('Date', 12), txt('Time', 8), txt('Customer', 18), txt('Address', 20), txt('Assigned to', 18), txt('Customer phone', 16)],
        rows: [
          ['2026-10-19', '09:00', 'Keith Morrison', '334 Ridge Line Ct', 'Jake Miller', '(555) 404-1188'],
          ['2026-10-20', '13:30', 'Lena Ward', '88 Market St', 'Walter Grey', '(555) 220-7341'],
          ['2026-10-22', '10:00', 'Ivy Chen', '77 Birch Hollow', 'Nina Patel', '(555) 618-2290'],
        ],
      },
    ],
  },
  {
    id: 'reviews-email',
    title: 'Reviews & Reputation Report: Turning Finished Jobs Into Five-Star Reviews',
    pitch: 'Which happy customers left a review, which were never asked, and which emails never arrived. Your shortest path to more stars and fewer bounced estimates.',
    shows: 'Review requests sent after completed jobs and which became confirmed reviews, completed jobs nobody has asked yet, and every customer email that bounced.',
    useIt: 'Use it to grow your online reviews and fix bad email addresses before the next estimate goes out.',
    audience: 'Owners and office managers',
    cadence: 'Monthly',
    figures: [
      { label: 'Review requests sent', value: 18, format: 'integer' },
      { label: 'Reviews confirmed', value: 9, format: 'integer' },
      { label: 'Completed jobs not asked for a review', value: 3, format: 'integer' },
      { label: 'Customer emails sent', value: 214, format: 'integer' },
      { label: 'Email delivery rate', value: 0.981, format: 'percent' },
    ],
    highlights: [
      'Half of review requests (9 of 18) turned into a confirmed review.',
      '3 completed jobs have not been asked for a review yet; the oldest finished 17 days ago.',
      '4 emails bounced, 2 of them estimates. The addresses are on the Bounced Emails sheet.',
    ],
    note: 'Email delivery comes from the email provider. Reviews are marked confirmed by your team.',
    sheets: [
      {
        name: 'Review Requests',
        purpose: 'Review requests sent and whether a review was confirmed.',
        columns: [txt('Customer', 18), txt('Job', 18), txt('Completed', 12), txt('Request sent', 12), txt('Review confirmed', 16), txt('Owner', 15)],
        rows: [
          ['Martin Fowler', 'Full replacement', '2026-10-03', '2026-10-04', 'Yes', 'Jake Miller'],
          ['Claire Bennet', 'Insurance claim', '2026-10-07', '2026-10-08', 'Yes', 'Nina Patel'],
          ['Summit Plaza', 'Commercial project', '2026-10-10', '2026-10-11', 'Not yet', 'Walter Grey'],
          ['Douglas Adams', 'Repair', '2026-10-12', '2026-10-13', 'Not yet', 'Jake Miller'],
        ],
      },
      {
        name: 'Not Yet Asked',
        purpose: 'Completed jobs with no review request sent.',
        columns: [txt('Customer', 18), txt('Job', 18), txt('Completed', 12), int('Days since completed'), txt('Owner', 15), txt('Email', 24)],
        rows: [
          ['Hugo Lane', 'Repair', '2026-10-10', 7, 'Walter Grey', 'hugo.lane@example.com'],
          ['Nora Kim', 'Full replacement', '2026-10-06', 11, 'Nina Patel', 'nora.kim@example.com'],
          ['Ray Diaz', 'Repair', '2026-09-30', 17, 'Jake Miller', 'rdiaz@example.com'],
        ],
      },
      {
        name: 'Email Delivery',
        purpose: 'Delivery results for each type of customer email.',
        columns: [txt('Email', 24), int('Sent', { sum: true }), int('Delivered', { sum: true }), int('Bounced', { sum: true }), pct('Delivery rate', { formula: (r) => `IF(B${r}>0,C${r}/B${r},"")` })],
        rows: [
          ['Thanks for reaching out', 62, 61, 1, null],
          ['Appointment reminder', 58, 58, 0, null],
          ['Estimate', 46, 44, 2, null],
          ['Follow-up', 30, 29, 1, null],
          ['Review request', 18, 18, 0, null],
        ],
      },
      {
        name: 'Bounced Emails',
        purpose: 'Emails that were not delivered, with the reason, so addresses can be corrected.',
        columns: [txt('Sent', 17), txt('Customer', 18), txt('Address', 28), txt('Email', 22), txt('Reason', 26)],
        rows: [
          ['2026-10-14 11:02', 'Ben Archer', 'ben.archer@exmaple.com', 'Thanks for reaching out', 'Domain does not exist'],
          ['2026-10-09 15:40', 'Lena Ward', 'lena.ward@example.co', 'Estimate', 'Mailbox not found'],
          ['2026-10-03 10:12', 'Owen Park', 'owen@example.org', 'Estimate', 'Mailbox full'],
          ['2026-09-28 08:55', 'Rita Gomez', 'rgomez@example.net', 'Follow-up', 'Rejected by recipient server'],
        ],
      },
    ],
  },
  {
    id: 'data-quality',
    title: 'Data Cleanup Report: The Missing Details Quietly Skewing Every Other Number',
    pitch: 'Jobs with no owner, no source, no follow-up date or no address, plus suspected duplicates, each with the exact fix. Fifteen minutes here makes every other report trustworthy.',
    shows: 'Open jobs missing an owner, lead source, follow-up date or address, and possible duplicate contacts waiting for a decision.',
    useIt: 'Clean records keep every other report accurate. Work through the Records to Fix sheet each week.',
    audience: 'Office managers and admins',
    cadence: 'Weekly',
    figures: [
      { label: 'Open jobs checked', value: 49, format: 'integer' },
      { label: 'Jobs with all key details', value: 0.61, format: 'percent' },
      { label: 'Missing a follow-up date', value: 16, format: 'integer' },
      { label: 'Missing an owner', value: 3, format: 'integer' },
      { label: 'Possible duplicates awaiting review', value: 1, format: 'integer' },
    ],
    highlights: [
      'A missing follow-up date is the most common gap (16 open jobs), and those jobs never show up as overdue.',
      '3 open jobs have no owner, so nobody is responsible for the next step.',
      '1 possible duplicate contact is waiting for a decision on the import review screen.',
    ],
    sheets: [
      {
        name: 'Missing Details',
        purpose: 'How many open jobs are missing each key detail.',
        columns: [txt('Detail', 18), int('Jobs missing it'), pct('Share of open jobs', { formula: (r) => `B${r}/49` })],
        rows: [
          ['Follow-up date', 16, null],
          ['Address', 4, null],
          ['Owner', 3, null],
          ['Lead source', 2, null],
        ],
      },
      {
        name: 'Records to Fix',
        purpose: 'Each incomplete job and what to fill in.',
        columns: [txt('Customer', 18), txt('Stage', 16), txt('Owner', 15), txt('Missing', 22), txt('Action', 34)],
        rows: [
          ['Rebecca Ferguson', 'New Lead', 'Unassigned', 'Owner, lead source', 'Assign an owner and choose a lead source'],
          ['Paula Ortiz', 'New Lead', 'Unassigned', 'Owner', 'Assign an owner'],
          ['Bradley Cooper', 'Estimate Sent', 'Jake Miller', 'Follow-up date', 'Set a follow-up date'],
          ['George Miller', 'Visit Scheduled', 'Walter Grey', 'Address', 'Confirm the job address'],
        ],
      },
      {
        name: 'Duplicate Contacts',
        purpose: 'Contacts that arrived more than once and how each was resolved.',
        columns: [txt('Name as received', 20), txt('Came from', 14), txt('Matched on', 16), txt('Outcome', 16), txt('Decided by', 14), txt('Date', 12)],
        rows: [
          ['Arthur Pendelton', 'Website form', 'Name and address', 'Awaiting review', '', ''],
          ['Robert Chen', 'Imported list', 'Phone', 'Merged', 'Jake Miller', '2026-10-09'],
          ['Sarah Jenkins', 'Website form', 'Email', 'Merged', 'Automatic', '2026-10-10'],
          ['Test Submission', 'Imported list', 'No valid phone', 'Rejected', 'Jake Miller', '2026-10-11'],
        ],
      },
    ],
  },
]

const FORMAT_STYLE: Record<Format, CellStyle> = { text: 'text', integer: 'integer', money: 'money', percent: 'percent', decimal: 'decimal' }
const DEFAULT_WIDTH: Record<Format, number> = { text: 16, integer: 12, money: 15, percent: 12, decimal: 12 }
/** Data sheets: title, subtitle, blank, header, then data from this row. */
const FIRST_DATA_ROW = 5

const styled = (v: CellValue, format: Format = 'text'): Cell => (typeof v === 'number' ? { v, s: FORMAT_STYLE[format] } : v)

function summarySheet(report: ReportDefinition, meta: string): WorksheetSpec {
  const section = (title: string): Cell[] => [{ v: title, s: 'section' }, { v: null, s: 'section' }]
  const rows: Cell[][] = [
    [{ v: report.title, s: 'title' }],
    [{ v: meta, s: 'subtitle' }],
    [{ v: 'Example data: this workbook shows the report layout and is not yet drawn from your records.', s: 'note' }],
    [],
    section('What this report shows'),
    [report.shows],
    [],
    section('How to use it'),
    [report.useIt],
    [`For: ${report.audience}  ·  Review: ${report.cadence.toLowerCase()}`],
    [],
    section('Key figures'),
    ...report.figures.map((f): Cell[] => [f.label, styled(f.value, f.format)]),
    [],
    section('Highlights'),
    ...report.highlights.map((h): Cell[] => [`•  ${h}`]),
    [],
    section('Sheets in this report'),
    ...report.sheets.map((s): Cell[] => [{ v: s.name, s: 'bold' }, s.purpose]),
  ]
  if (report.note) rows.push([], [{ v: report.note, s: 'note' }])
  return { name: 'Summary', rows, widths: [46, 24] }
}

const shortTitle = (r: ReportDefinition) => r.title.split(':')[0]!.trim()

function dataSheet(sheet: DataSheet, reportTitle: string): WorksheetSpec {
  const columnStyle = (c: Column): CellStyle => (c.input ? 'input' : FORMAT_STYLE[c.format ?? 'text'])
  const header = sheet.columns.map((c): Cell => ({ v: c.header, s: 'header' }))
  const body = sheet.rows.map((row, i) =>
    row.map((v, j): Cell => {
      const c = sheet.columns[j]
      if (!c) return v
      if (c.formula) return { f: c.formula(FIRST_DATA_ROW + i), s: columnStyle(c) }
      if (c.input) return { v, s: 'input' }
      return styled(v, c.format)
    }),
  )
  const rows: Cell[][] = [[{ v: sheet.name, s: 'title' }], [{ v: `${reportTitle}  ·  ${sheet.purpose}`, s: 'subtitle' }], [], header, ...body]
  if (sheet.columns.some((c) => c.sum)) {
    const totalRow = FIRST_DATA_ROW + sheet.rows.length
    const last = totalRow - 1
    rows.push(
      sheet.columns.map((c, j): Cell => {
        if (j === 0) return { v: 'Total', s: 'bold' }
        const col = String.fromCharCode(65 + j)
        if (c.sum) return { f: `SUM(${col}${FIRST_DATA_ROW}:${col}${last})`, s: FORMAT_STYLE[c.format ?? 'text'] }
        if (c.formula) return { f: c.formula(totalRow), s: FORMAT_STYLE[c.format ?? 'text'] }
        return null
      }),
    )
  }
  const widths = sheet.columns.map((c) => Math.max(c.width ?? DEFAULT_WIDTH[c.format ?? 'text'], c.header.length + 2))
  return { name: sheet.name, rows, widths, freezeRows: 4 }
}

export async function downloadReport(report: ReportDefinition, opts: { companyName?: string; days: number }) {
  const { buildXlsx } = await import('@/lib/xlsx')
  const prepared = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const meta = [opts.companyName, `Last ${opts.days} days`, `Prepared ${prepared}`].filter(Boolean).join('  ·  ')
  const blob = buildXlsx([summarySheet(report, meta), ...report.sheets.map((s) => dataSheet(s, shortTitle(report)))])

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${shortTitle(report).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-')}-last-${opts.days}-days.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
