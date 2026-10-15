import type { OrgRole } from '@project/db'

export const DEMO_PASSWORD = 'riverly-demo-2026'
export const DEMO_COMPANY_SLUG = 'nv-custom-homes'
export const SECOND_COMPANY_SLUG = 'summit-roofing'

export type Person = { key: string; name: string; email: string; role: OrgRole; title: string; bio?: string; status?: 'ACTIVE' | 'DEACTIVATED' }

/** NV Custom Homes — the fully loaded demo company. Keys are used by the story below. */
export const NV_PEOPLE: Person[] = [
  { key: 'chris', name: 'Chris Harper', email: 'chris@nvcustomhomes.test', role: 'OWNER', title: 'Owner', bio: 'Started NV Custom Homes in 2009. Still climbs every roof he bids.' },
  { key: 'dana', name: 'Dana Price', email: 'dana@nvcustomhomes.test', role: 'ADMIN', title: 'Office manager', bio: 'Keeps the schedule, the templates and everyone on time.' },
  { key: 'marcus', name: 'Marcus Webb', email: 'marcus@nvcustomhomes.test', role: 'MANAGER', title: 'Sales manager' },
  { key: 'ava', name: 'Ava Collins', email: 'ava@nvcustomhomes.test', role: 'MANAGER', title: 'Production manager', bio: 'Runs crews and job sites from tear-off to final walk-through.' },
  { key: 'nina', name: 'Nina Ortiz', email: 'nina@nvcustomhomes.test', role: 'MEMBER', title: 'Senior salesperson', bio: 'Twelve years helping Treasure Valley homeowners get the roof they actually need.' },
  { key: 'jake', name: 'Jake Turner', email: 'jake@nvcustomhomes.test', role: 'MEMBER', title: 'Salesperson' },
  { key: 'sofia', name: 'Sofia Ramirez', email: 'sofia@nvcustomhomes.test', role: 'MEMBER', title: 'Salesperson', bio: 'Bilingual sales — English and Spanish.' },
  { key: 'tyler', name: 'Tyler Brooks', email: 'tyler@nvcustomhomes.test', role: 'MEMBER', title: 'Salesperson (new)' },
  { key: 'owen', name: 'Owen Park', email: 'owen@nvcustomhomes.test', role: 'MEMBER', title: 'Project coordinator' },
  { key: 'alex', name: 'Alex Morgan', email: 'alex@riverly-demo.test', role: 'MEMBER', title: 'Estimator (also at Summit Roofing)' },
  { key: 'ryan', name: 'Ryan Cole', email: 'ryan@nvcustomhomes.test', role: 'MEMBER', title: 'Former salesperson', status: 'DEACTIVATED' },
]

/** Summit Roofing — a second tenant for isolation and company-switching tests. */
export const SUMMIT_PEOPLE: Person[] = [
  { key: 'sara', name: 'Sara Kim', email: 'sara@summitroofing.test', role: 'OWNER', title: 'Owner' },
  { key: 'alex', name: 'Alex Morgan', email: 'alex@riverly-demo.test', role: 'MANAGER', title: 'Sales manager' },
  { key: 'ben', name: 'Ben Hall', email: 'ben@summitroofing.test', role: 'MEMBER', title: 'Salesperson' },
]

export const PENDING_INVITE = { email: 'new.hire@nvcustomhomes.test', role: 'MEMBER' as OrgRole }

export const EXTERNAL_PEOPLE = [
  { key: 'ivan', displayName: 'Ivan Petrov', companyName: 'Treasure Valley Inspections', phone: '(208) 555-0142', email: 'ivan@tvinspections.test', role: 'inspector' },
  { key: 'grace', displayName: 'Grace Lindqvist', companyName: 'Northwest Roof Assessors', phone: '(208) 555-0148', email: null, role: 'inspector' },
  { key: 'luis', displayName: 'Luis Romero', companyName: 'Romero Roofing Crew', phone: '(208) 555-0177', email: null, role: 'crew' },
  { key: 'dmitri', displayName: 'Dmitri Volkov', companyName: 'Summit Crew Co.', phone: '(208) 555-0181', email: null, role: 'crew' },
  { key: 'hank', displayName: 'Hank Miller', companyName: 'Miller Gutters (sub)', phone: '(208) 555-0190', email: null, role: 'subcontractor' },
] as const

export type StageKey = 'lead' | 'called' | 'inspection' | 'contract' | 'started' | 'completed'
export const STAGES: StageKey[] = ['lead', 'called', 'inspection', 'contract', 'started', 'completed']

export type Scenario = {
  name: string
  email?: string | null
  phone?: string | null
  street: string
  city: string
  zip: string
  title: string
  source: 'google_ad' | 'local_services_ad' | 'referral' | 'web_form' | 'repeat_customer' | 'other' | null
  urgency?: 'asap' | 'quarter' | 'flexible'
  owner: string | null // person key, or null = unassigned
  stage: StageKey
  daysAgo: number // when the lead arrived
  estimate?: number // dollars
  inquiry?: string
  status?: { to: 'LOST' | 'ON_HOLD' | 'CANCELED'; reason: string }
  overdueFollowUp?: boolean
  noOutreach?: boolean
  upcomingInspectionInDays?: number
  reviewRequested?: boolean
  paid?: boolean
  photos?: boolean
  note?: string
}

/**
 * NV Custom Homes pipeline. Names used by the Playwright suite (Maria Santos, Robert Hale,
 * Angela Ruiz, Don Lou) keep their owners and stages.
 */
export const NV_SCENARIOS: Scenario[] = [
  // ── New leads ──
  { name: 'Priya Shah', email: 'priya.shah@example.com', phone: '(208) 555-0133', street: '19 Aspen Dr', city: 'Boise', zip: '83702', title: 'Pre-purchase roof inspection', source: 'web_form', owner: null, stage: 'lead', daysAgo: 0.05, noOutreach: true, inquiry: 'Buying this house — want an inspection before closing.' },
  { name: 'Hector Alvarez', email: 'hector.alvarez@example.com', phone: '(208) 555-0161', street: '880 W Pine Ave', city: 'Meridian', zip: '83642', title: 'Hail damage assessment', source: 'local_services_ad', urgency: 'asap', owner: null, stage: 'lead', daysAgo: 0.3, noOutreach: true, inquiry: 'Hail last night, granules in the gutters.' },
  { name: 'Wendy Cho', email: 'wendy.cho@example.com', phone: '(208) 555-0174', street: '27 Lark St', city: 'Eagle', zip: '83616', title: 'Roof replacement', source: 'google_ad', urgency: 'quarter', owner: 'tyler', stage: 'lead', daysAgo: 1.2, inquiry: '20-year-old 3-tab, wants architectural shingles.' },
  { name: 'Frank Delgado', email: null, phone: '(208) 555-0129', street: '4402 S Five Mile Rd', city: 'Boise', zip: '83709', title: 'Leak repair', source: 'referral', urgency: 'asap', owner: 'sofia', stage: 'lead', daysAgo: 0.6, inquiry: 'Water stain on living room ceiling. Prefers phone, no email.' },
  { name: 'Olivia Grant', email: 'olivia.grant@example.com', phone: '(208) 555-0115', street: '12 Harbor Ln', city: 'Nampa', zip: '83651', title: 'Skylight reflash', source: 'other', owner: 'jake', stage: 'lead', daysAgo: 2.5, overdueFollowUp: true },

  // ── Called ──
  { name: 'Maria Santos', email: 'maria.santos@example.com', phone: '(208) 555-0199', street: '42 Cedar Ln', city: 'Meridian', zip: '83642', title: 'Roof repair', source: 'local_services_ad', urgency: 'asap', owner: 'jake', stage: 'called', daysAgo: 4, overdueFollowUp: true, inquiry: 'Leak above the kitchen after heavy rain.' },
  { name: 'Kevin Brooks', email: 'kevin.brooks@example.com', phone: '(208) 555-0108', street: '301 E State St', city: 'Eagle', zip: '83616', title: 'Metal roof quote', source: 'google_ad', urgency: 'flexible', owner: 'nina', stage: 'called', daysAgo: 6 },
  { name: 'Lucia Moreno', email: 'lucia.moreno@example.com', phone: '(208) 555-0186', street: '77 Sunset Peak Rd', city: 'Kuna', zip: '83634', title: 'Roof replacement', source: 'referral', urgency: 'quarter', owner: 'sofia', stage: 'called', daysAgo: 3 },
  { name: 'Dean Foster', email: 'dean.foster@example.com', phone: '(208) 555-0152', street: '9 Quail Run', city: 'Star', zip: '83669', title: 'Gutter + fascia', source: 'web_form', owner: 'tyler', stage: 'called', daysAgo: 8, overdueFollowUp: true },

  // ── Inspection ──
  { name: 'Robert Hale', email: 'rhale@example.com', phone: '(208) 555-0123', street: '7 Bluff View', city: 'Boise', zip: '83702', title: 'Roof replacement', source: 'referral', urgency: 'flexible', owner: 'nina', stage: 'inspection', daysAgo: 11, upcomingInspectionInDays: 2, inquiry: 'Referred by the Lous. 25-year-old roof, considering metal.' },
  { name: 'Samantha Reed', email: 'sam.reed@example.com', phone: '(208) 555-0137', street: '1550 N Linder Rd', city: 'Meridian', zip: '83646', title: 'Storm damage repair', source: 'google_ad', urgency: 'asap', owner: 'jake', stage: 'inspection', daysAgo: 9, upcomingInspectionInDays: 1 },
  { name: 'Victor Huang', email: 'victor.huang@example.com', phone: '(208) 555-0144', street: '640 Riverside Dr', city: 'Garden City', zip: '83714', title: 'Roof replacement', source: 'local_services_ad', urgency: 'quarter', owner: 'sofia', stage: 'inspection', daysAgo: 14, estimate: 19_800, photos: true, note: 'Inspection done — two layers of shingles, needs full tear-off.' },
  { name: 'Natalie Price', email: 'natalie.price@example.com', phone: '(208) 555-0119', street: '22 Oakmont Ct', city: 'Eagle', zip: '83616', title: 'Insurance claim inspection', source: 'referral', owner: 'nina', stage: 'inspection', daysAgo: 18, estimate: 24_500, status: { to: 'ON_HOLD', reason: 'Waiting on the insurance adjuster visit.' } },

  // ── Contract signed ──
  { name: 'Angela Ruiz', email: 'angela.ruiz@example.com', phone: '(208) 555-0168', street: '310 Willow Way', city: 'Nampa', zip: '83651', title: 'Roof replacement', source: 'google_ad', urgency: 'quarter', owner: 'jake', stage: 'contract', daysAgo: 25, estimate: 28_400, photos: true },
  { name: 'George Kim', email: 'george.kim@example.com', phone: '(208) 555-0171', street: '18 Pheasant Hill', city: 'Boise', zip: '83716', title: 'Metal roof installation', source: 'referral', urgency: 'flexible', owner: 'nina', stage: 'contract', daysAgo: 30, estimate: 41_200 },
  { name: 'Theresa Walsh', email: 'theresa.walsh@example.com', phone: '(208) 555-0158', street: '505 Elm St', city: 'Caldwell', zip: '83605', title: 'Roof replacement', source: 'repeat_customer', owner: 'sofia', stage: 'contract', daysAgo: 21, estimate: 17_600 },

  // ── Job started ──
  { name: 'Tom Becker', email: 'tom.becker@example.com', phone: '(208) 555-0110', street: '5 Harbor Ct', city: 'Eagle', zip: '83616', title: 'Storm damage repair', source: 'referral', urgency: 'asap', owner: 'jake', stage: 'started', daysAgo: 18, estimate: 14_200, photos: true },
  { name: 'Irene Novak', email: 'irene.novak@example.com', phone: '(208) 555-0126', street: '73 Canyon Rim', city: 'Boise', zip: '83706', title: 'Roof replacement', source: 'google_ad', owner: 'nina', stage: 'started', daysAgo: 35, estimate: 23_900 },

  // ── Job completed ──
  { name: 'Don Lou', email: 'donlou@example.com', phone: '(555) 123-4567', street: '123 Maple Ave', city: 'Boise', zip: '83704', title: 'Roof replacement', source: 'google_ad', urgency: 'quarter', owner: 'nina', stage: 'completed', daysAgo: 45, estimate: 28_400, photos: true, paid: true, reviewRequested: true, inquiry: 'Shingles lifting after the spring storm; wants a full replacement quote.' },
  { name: 'Patricia Long', email: 'patricia.long@example.com', phone: '(208) 555-0103', street: '914 N 15th St', city: 'Boise', zip: '83702', title: 'Roof replacement', source: 'referral', owner: 'sofia', stage: 'completed', daysAgo: 60, estimate: 21_300, photos: true, paid: true, reviewRequested: true },
  { name: 'Marcus Allen', email: 'marcus.allen@example.com', phone: '(208) 555-0112', street: '3 Ridgecrest Ct', city: 'Meridian', zip: '83642', title: 'Storm damage repair', source: 'local_services_ad', owner: 'jake', stage: 'completed', daysAgo: 52, estimate: 9_800, paid: false },
  { name: 'Helen Fischer', email: 'helen.fischer@example.com', phone: '(208) 555-0193', street: '61 Lakeview Dr', city: 'Eagle', zip: '83616', title: 'Roof replacement', source: 'google_ad', owner: 'ryan', stage: 'completed', daysAgo: 75, estimate: 26_700, paid: true },

  // ── Lost / canceled ──
  { name: 'Lena Ford', email: 'lena.ford@example.com', phone: '(208) 555-0155', street: '8 Birch Ct', city: 'Boise', zip: '83704', title: 'Roof repair', source: 'google_ad', owner: 'jake', stage: 'called', daysAgo: 9, status: { to: 'LOST', reason: 'Chose a lower bid from another contractor.' } },
  { name: 'Carl Jensen', email: 'carl.jensen@example.com', phone: '(208) 555-0164', street: '2201 W Main St', city: 'Boise', zip: '83702', title: 'Roof replacement', source: 'local_services_ad', owner: 'tyler', stage: 'contract', daysAgo: 28, estimate: 22_100, status: { to: 'CANCELED', reason: 'Homeowner sold the house before work started.' } },
  { name: 'Rosa Medina', email: 'rosa.medina@example.com', phone: '(208) 555-0177', street: '45 Juniper Way', city: 'Nampa', zip: '83686', title: 'Gutter replacement', source: 'web_form', owner: 'sofia', stage: 'lead', daysAgo: 12, status: { to: 'LOST', reason: 'Never reached after five attempts.' } },
]

/** Extra independent jobs for existing contacts (one person, many jobs). */
export const NV_EXTRA_JOBS = [
  { contact: 'Don Lou', title: 'Gutter replacement', source: 'repeat_customer' as const, owner: null, daysAgo: 0.2, street: '88 Ridge Rd', city: 'Eagle', zip: '83616' },
  { contact: 'Patricia Long', title: 'Garage roof repair', source: 'repeat_customer' as const, owner: 'sofia', daysAgo: 5, street: '914 N 15th St', city: 'Boise', zip: '83702' },
]

export const SUMMIT_SCENARIOS: Scenario[] = [
  { name: 'Walter Grey', email: 'walter@example.com', phone: '(303) 555-0101', street: '12 Pine St', city: 'Boulder', zip: '80302', title: 'Roof replacement', source: 'referral', owner: 'sara', stage: 'lead', daysAgo: 3 },
  { name: 'Emma Stone', email: 'emma.stone@example.com', phone: '(303) 555-0112', street: '400 Pearl St', city: 'Boulder', zip: '80302', title: 'Hail repair', source: 'google_ad', owner: 'ben', stage: 'called', daysAgo: 6 },
  { name: 'Noah Patel', email: 'noah.patel@example.com', phone: '(303) 555-0123', street: '9 Mesa Dr', city: 'Golden', zip: '80401', title: 'Roof replacement', source: 'referral', owner: 'alex', stage: 'contract', daysAgo: 20, estimate: 31_000 },
]

/** Rows for the demo CSV import (past clients), including a duplicate and an ambiguous match. */
export const PAST_CLIENTS_CSV = `Full Name,Email,Phone,Street Address,City,State,ZIP,Notes,Lead Date
Margaret Holt,margaret.holt@example.com,208-555-0201,15 Cottonwood Ln,Boise,ID,83702,Replaced roof 2019,2019-06-14
Daniel Price,daniel.price@example.com,208-555-0202,7 Ironwood Ct,Meridian,ID,83646,Repair 2021,2021-04-02
Susan Clarke,susan.clarke@example.com,208-555-0203,290 Fir St,Eagle,ID,83616,,2020-09-21
Patricia Long,patricia.long@example.com,208-555-0103,914 N 15th St,Boise,ID,83702,Prior client (already in CRM),2018-05-10
Ray Santos,ray.santos@example.com,(208) 555-0199,42 Cedar Ln,Meridian,ID,83642,Same household phone as an existing lead,2017-08-30
Jorge Ramirez,jorge.ramirez@example.com,208-555-0205,1 Canyon View,Kuna,ID,83634,,2022-03-11
`
