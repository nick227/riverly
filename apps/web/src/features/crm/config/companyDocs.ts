// Sample company documents for the home page. Placeholder content until companies can upload
// their own; every page that shows them says so.

export type CompanyDoc = {
  id: string
  title: string
  summary: string
  kind: 'Guide' | 'Policy' | 'Price list' | 'Checklist'
  updated: string // ISO date
  sections: { heading: string; body?: string; items?: string[] }[]
  img?: string
}

export const COMPANY_DOCS: CompanyDoc[] = [
  {
    id: 'sales-playbook',
    title: 'How we win a roofing job',
    summary: 'The steps from the first phone call to a signed contract, and what to say at each one.',
    kind: 'Guide',
    updated: '2026-09-28',
    sections: [
      {
        heading: 'Call every new lead within 15 minutes',
        body: 'A homeowner with a leaking roof calls three or four roofers. The first one who calls back and books a visit usually gets the job. If you are on a roof, ask a teammate to make the call for you.',
      },
      {
        heading: 'What to ask on the first call',
        items: [
          'What is happening with the roof, and when did it start?',
          'Is water coming inside right now?',
          'Is an insurance claim involved, or will they pay directly?',
          'Who else needs to be there when we inspect? Book a time that works for everyone who decides.',
        ],
      },
      {
        heading: 'At the inspection',
        body: 'Take photos of every problem you find and show them to the homeowner on your phone before you leave. People sign with the roofer they trust, and photos build trust faster than words.',
      },
      {
        heading: 'After the estimate',
        body: 'Follow up within two days. If they are not ready, set a date to call again in Riverly so the follow-up is not forgotten. Most contracts are signed on the second or third conversation.',
      },
    ],
  },
  {
    id: 'price-guide',
    title: '2026 price guide',
    summary: 'Starting prices for our most common jobs. Use these on the first call to set expectations.',
    kind: 'Price list',
    updated: '2026-01-06',
    sections: [
      {
        heading: 'Starting prices',
        items: [
          'Full roof replacement, asphalt shingles: from $9,500 for a typical single-story home',
          'Full roof replacement, metal: from $18,000',
          'Leak repair: from $450',
          'Storm damage inspection: free',
          'Gutter replacement: from $1,200',
        ],
      },
      {
        heading: 'How to talk about price',
        body: 'Give the starting price and explain that the inspection sets the final number. Never quote a final price over the phone.',
      },
    ],
  },
  {
    id: 'warranty',
    title: 'Our warranty, in plain words',
    summary: 'What we cover, for how long, and how a homeowner makes a warranty claim.',
    kind: 'Policy',
    updated: '2026-03-14',
    sections: [
      { heading: 'Workmanship', body: 'We guarantee our installation work for 10 years. If something we installed fails because of how we installed it, we fix it for free.' },
      { heading: 'Materials', body: 'Shingles and metal panels carry the manufacturer’s warranty, usually 25 to 50 years. We register the warranty for the homeowner after the job is finished.' },
      { heading: 'Making a claim', body: 'The homeowner calls the office. We add a note to their job in Riverly and book an inspection within five business days.' },
    ],
  },
  {
    id: 'insurance-claims',
    title: 'Helping homeowners with insurance claims',
    summary: 'How storm damage claims work and how we support the homeowner through one.',
    kind: 'Guide',
    updated: '2026-06-02',
    sections: [
      {
        heading: 'The usual order of events',
        items: [
          'We inspect the roof and photograph the damage.',
          'The homeowner files a claim with their insurance company.',
          'We meet the insurance adjuster at the house if the homeowner wants us there.',
          'The insurance company approves the claim, and we sign the contract.',
        ],
      },
      { heading: 'What we never do', body: 'We never promise that a claim will be approved, and we never offer to cover a homeowner’s deductible.' },
    ],
  },
  {
    id: 'inspection-checklist',
    title: 'Roof inspection checklist',
    summary: 'Everything to check and photograph on every inspection, so no estimate misses anything.',
    kind: 'Checklist',
    updated: '2026-08-19',
    sections: [
      {
        heading: 'Outside',
        items: ['Missing, cracked or curling shingles', 'Hail marks on shingles, vents and gutters', 'Flashing around chimneys, walls and skylights', 'Gutters and downspouts', 'Soft spots when you walk the roof'],
      },
      { heading: 'Inside', items: ['Water stains on ceilings', 'Attic: daylight through boards, damp insulation, mold'] },
      { heading: 'Before you leave', body: 'Upload your photos to the job in Riverly and tell the homeowner when to expect the estimate.' },
    ],
  },
  {
    id: 'safety',
    title: 'Safety on the roof',
    summary: 'The rules everyone follows on every job. No exceptions.',
    kind: 'Policy',
    updated: '2026-02-10',
    sections: [
      {
        heading: 'Every time',
        items: ['Wear a harness on any roof steeper than 4/12 or higher than one story', 'Tie off ladders and extend them three feet above the roof edge', 'Never work on a wet or icy roof', 'Two people on site for every roof walk'],
      },
      { heading: 'If someone is hurt', body: 'Call 911 first, then the office. Do not move the injured person unless they are in danger.' },
    ],
  },
]

export const findCompanyDoc = (id: string | undefined) => COMPANY_DOCS.find((d) => d.id === id)

/** Calendar date as written (parsed at noon so no timezone shifts it a day). */
export const docDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
