import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useSession } from './session'

/**
 * Riverly Page Title & SEO Brand Constants
 */
export const BRAND = {
  short: 'Riverly',
  full: 'Riverly CRM',
  tagline: 'Contractor CRM',
  defaultDescription:
    'Riverly CRM — Move each inquiry from lead to completed job with a streamlined pipeline, activity history, and unified customer records.',
} as const

export interface PageTitleOptions {
  /** Page name for top-level pages (e.g., "Contacts & Pipeline", "Settings") */
  pageName?: string | null
  /** Entity name for individual record pages (e.g., "Walter Grey", "Inspection SOP") */
  entityName?: string | null
  /** Semantic type of the entity */
  entityType?: 'job' | 'contact' | 'document' | 'profile' | 'form' | 'invite' | string | null
  /** Contextual subtitle, stage, or address (e.g., "Inspection Stage", "742 Evergreen Terr", "Manager") */
  context?: string | null
  /** Company or organization name override (defaults to active session organization) */
  companyName?: string | null
  /** Custom SEO meta description */
  description?: string | null
  /** Raw title override (bypasses formatting while still synchronizing SEO meta tags) */
  rawTitle?: string | null
  /** Omit the Riverly CRM brand suffix */
  omitBrand?: boolean
}

export interface EntityTitleOptions {
  /** Semantic type of the entity */
  type: 'job' | 'contact' | 'document' | 'profile' | 'form' | 'invite' | string
  /** Primary entity name (e.g., customer name, document title, user display name) */
  name?: string | null
  /** Contextual subtitle (e.g., stage, address, document kind, role) */
  context?: string | null
  /** Company name override */
  companyName?: string | null
  /** Custom SEO meta description */
  description?: string | null
}

export interface FormattedPageTitle {
  title: string
  description: string
}

/**
 * Pure title builder for top pages and individual entity pages.
 *
 * Rules:
 * - Individual pages: The Entity Name is HERO (front-loaded for instant tab recognition and SEO weighting).
 * - Top pages: The Page Name is HERO with descriptive value-prop context.
 * - Branding: Dressed up with company context and Riverly CRM branding.
 */
export function formatPageTitle(options: PageTitleOptions): FormattedPageTitle {
  const {
    pageName,
    entityName,
    entityType,
    context,
    companyName,
    description,
    rawTitle,
    omitBrand = false,
  } = options

  // 1. Raw title override
  if (rawTitle && rawTitle.trim()) {
    return {
      title: rawTitle.trim(),
      description: description?.trim() || BRAND.defaultDescription,
    }
  }

  const brandSuffix = omitBrand ? '' : BRAND.full
  const cleanContext = context?.trim() || null
  const cleanCompany = companyName?.trim() || null

  // 2. Individual Entity Pages (Entity Name is the HERO)
  if (entityName && entityName.trim()) {
    const cleanEntity = entityName.trim()

    let entityLabel = cleanEntity
    let entityContext = cleanContext
    let fallbackDesc = `View and manage ${cleanEntity} in ${cleanCompany ? `${cleanCompany} on ` : ''}${BRAND.full}.`

    switch (entityType) {
      case 'job':
        entityContext = cleanContext || 'Job Details'
        fallbackDesc = `project details and stage workflow for ${cleanEntity}${cleanCompany ? ` at ${cleanCompany}` : ''}. Track progress, schedule visits, and view history in ${BRAND.full}.`
        break

      case 'contact':
        entityContext = cleanContext || 'Customer Record'
        fallbackDesc = `Customer contact record for ${cleanEntity}${cleanCompany ? ` at ${cleanCompany}` : ''}. Manage inquiries, phone, email, and job history.`
        break

      case 'document':
        entityContext = cleanContext || 'Company Guide'
        fallbackDesc = `Company documentation: ${cleanEntity}${cleanCompany ? ` for ${cleanCompany}` : ''}.`
        break

      case 'profile':
        entityContext = cleanContext ? `Team Profile (${cleanContext})` : 'Team Profile'
        fallbackDesc = `Team member profile for ${cleanEntity}${cleanCompany ? ` at ${cleanCompany}` : ''}. View achievements, assigned jobs, and activity.`
        break

      case 'form':
        return {
          title: `Request a Free Estimate · ${cleanEntity} | ${BRAND.short}`,
          description:
            description?.trim() ||
            `Submit your inquiry to ${cleanEntity}. Fast estimates, quality inspections, and reliable services.`,
        }

      case 'invite':
        return {
          title: `Join ${cleanEntity} on ${BRAND.short} · Team Invitation`,
          description:
            description?.trim() ||
            `You have been invited to join ${cleanEntity} on ${BRAND.full}. Accept your invitation to collaborate.`,
        }
    }

    const mainSection = entityContext ? `${entityLabel} · ${entityContext}` : entityLabel

    let suffix = ''
    if (cleanCompany && brandSuffix) {
      suffix = `${cleanCompany} · ${brandSuffix}`
    } else if (cleanCompany) {
      suffix = cleanCompany
    } else if (brandSuffix) {
      suffix = brandSuffix
    }

    const title = suffix ? `${mainSection} | ${suffix}` : mainSection
    return {
      title,
      description: description?.trim() || fallbackDesc,
    }
  }

  // 3. Top-Level Pages (Page Name is the HERO)
  const cleanPage = pageName?.trim() || 'Dashboard'
  let pageDesc = description?.trim() || BRAND.defaultDescription

  let topTitle = cleanPage
  if (cleanContext) {
    topTitle = `${cleanPage} · ${cleanContext}`
  }

  if (cleanCompany) {
    topTitle = `${topTitle} · ${cleanCompany}`
  }

  if (brandSuffix) {
    topTitle = `${topTitle} | ${brandSuffix}`
  }

  return {
    title: topTitle,
    description: pageDesc,
  }
}

/**
 * Format entity titles with clean type-safe ergonomics.
 */
export function formatEntityTitle(options: EntityTitleOptions): FormattedPageTitle {
  return formatPageTitle({
    entityName: options.name,
    entityType: options.type,
    context: options.context,
    companyName: options.companyName,
    description: options.description,
  })
}

/**
 * Resolves standard top-page titles and fallback titles based on pathname.
 */
export function resolveRouteTitle(pathname: string, companyName?: string | null): FormattedPageTitle {
  try {
    const path = (pathname || '/').replace(/\/$/, '') || '/'

    if (path === '/') {
      return formatPageTitle({
        pageName: companyName || BRAND.short,
        context: 'Home',
        description: 'Daily operations dashboard, homeowner follow-ups, and company overview in Riverly CRM.',
      })
    }

    if (path === '/contacts') {
      return formatPageTitle({
        pageName: 'Contacts',
        context: 'Jobs',
        companyName,
        description: 'Track leads, follow-ups, inspections, and completed jobs across your pipeline in Riverly CRM.',
      })
    }

    if (path === '/contacts/review') {
      return formatPageTitle({
        pageName: 'Review Matches',
        context: 'Lead Intake Queue',
        companyName,
        description: 'Review potential duplicate customer leads and resolve matches before pipeline assignment in Riverly CRM.',
      })
    }

    if (path === '/activity') {
      return formatPageTitle({
        pageName: 'Activity River',
        context: 'Team Feed',
        companyName,
        description: 'Real-time river of customer interactions, job stage movements, team posts, and recognition in Riverly CRM.',
      })
    }

    // Settings subpages
    if (path === '/settings' || path === '/settings/company') {
      return formatPageTitle({
        pageName: 'Company Settings',
        context: 'Administration',
        companyName,
        description: 'Manage company branding, timezone, contact details, and organization preferences in Riverly CRM.',
      })
    }
    if (path === '/settings/billing') {
      return formatPageTitle({
        pageName: 'Billing & Plan',
        context: 'Administration',
        companyName,
        description: 'Manage your subscription plan, billing details, and receipts in Riverly CRM.',
      })
    }
    if (path === '/settings/team') {
      return formatPageTitle({
        pageName: 'Team Members & Roles',
        context: 'Settings',
        companyName,
        description: 'Manage company members, invitation links, access permissions, and roles in Riverly CRM.',
      })
    }
    if (path === '/settings/workflow') {
      return formatPageTitle({
        pageName: 'Workflow & Pipeline Stages',
        context: 'Settings',
        companyName,
        description: 'Configure workflow stages, required inspection fields, and automated transition rules.',
      })
    }
    if (path === '/settings/email') {
      return formatPageTitle({
        pageName: 'Email Templates & Senders',
        context: 'Settings',
        companyName,
        description: 'Customize email templates, review requests, and verified domain senders in Riverly CRM.',
      })
    }
    if (path === '/settings/integrations') {
      return formatPageTitle({
        pageName: 'Integrations & API Webhooks',
        context: 'Settings',
        companyName,
        description: 'Connect third-party services, webhooks, and developer API credentials in Riverly CRM.',
      })
    }
    if (path === '/settings/reports') {
      return formatPageTitle({
        pageName: 'Reports & Business Analytics',
        context: 'Settings',
        companyName,
        description: 'Sales velocity, inspection conversion rates, crew workload, and revenue performance reports.',
      })
    }
    if (path === '/settings/diagnostics') {
      return formatPageTitle({
        pageName: 'System Diagnostics',
        context: 'Settings',
        companyName,
        description: 'System health checks, email delivery logs, and background worker status.',
      })
    }

    // Auth & Onboarding
    if (path === '/login') {
      return formatPageTitle({
        pageName: 'Sign In',
        context: 'Contractor CRM',
        omitBrand: false,
        description: 'Sign in to your Riverly CRM account. Move inquiries seamlessly from lead to completed job.',
      })
    }
    if (path === '/signup') {
      return formatPageTitle({
        pageName: 'Set Up Your Company',
        context: 'CRM',
        omitBrand: false,
        description: 'Create your Riverly account. Standardize workflows and customer pipelines.',
      })
    }
    if (path === '/onboarding') {
      return formatPageTitle({
        pageName: 'Workspace Setup',
        context: 'Onboarding',
        companyName,
        description: 'Configure your company profile and team preferences.',
      })
    }

    // Fallbacks for entity routes before data loads
    if (path.startsWith('/jobs/')) {
      return formatPageTitle({
        pageName: 'Job Details',
        context: 'Pipeline',
        companyName,
        description: 'project details and stage workflow in Riverly CRM.',
      })
    }
    if (path.startsWith('/contacts/')) {
      return formatPageTitle({
        pageName: 'Contact Details',
        context: 'Customer Record',
        companyName,
        description: 'Customer contact details and history in Riverly CRM.',
      })
    }
    if (path.startsWith('/docs/')) {
      return formatPageTitle({
        pageName: 'Company Documentation',
        context: 'Guides & SOPs',
        companyName,
        description: 'Company documentation, manuals, and procedures in Riverly CRM.',
      })
    }
    if (path.startsWith('/u/')) {
      return formatPageTitle({
        pageName: 'Team Member Profile',
        context: 'Directory',
        companyName,
        description: 'Team member profile, achievements, and activity in Riverly CRM.',
      })
    }
    if (path.startsWith('/f/')) {
      return formatPageTitle({
        pageName: 'Request a Free Estimate',
        context: 'Inquiry',
        omitBrand: false,
        description: 'Submit a inquiry for a fast, comprehensive quote and inspection.',
      })
    }
    if (path.startsWith('/invite/')) {
      return formatPageTitle({
        pageName: 'Team Invitation',
        context: 'Riverly CRM',
        omitBrand: false,
        description: 'Accept your team invitation to join Riverly CRM.',
      })
    }

    return formatPageTitle({
      pageName: 'Page Not Found',
      context: 'Riverly CRM',
      omitBrand: false,
      description: BRAND.defaultDescription,
    })
  } catch {
    return formatPageTitle({
      pageName: 'Dashboard',
      companyName: companyName || null,
      description: BRAND.defaultDescription,
    })
  }
}

/**
 * Synchronizes document.title and SEO meta tags (og:title, twitter:title, description, og:description).
 */
export function applyPageMetadata(title: string, description?: string | null): void {
  if (typeof document === 'undefined') return

  try {
    document.title = title

    setOrCreateMetaTag('property', 'og:title', title)
    setOrCreateMetaTag('name', 'twitter:title', title)
    setOrCreateMetaTag('property', 'og:site_name', BRAND.full)

    if (description) {
      setOrCreateMetaTag('name', 'description', description)
      setOrCreateMetaTag('property', 'og:description', description)
      setOrCreateMetaTag('name', 'twitter:description', description)
    }
  } catch (err) {
    console.warn('Could not apply page metadata', err)
  }
}

function setOrCreateMetaTag(attrName: 'name' | 'property', attrValue: string, content: string): void {
  try {
    let el = document.querySelector<HTMLMetaElement>(`meta[${attrName}="${attrValue}"]`)
    if (!el) {
      el = document.createElement('meta')
      el.setAttribute(attrName, attrValue)
      document.head.appendChild(el)
    }
    el.content = content
  } catch {
    // ignore
  }
}

/**
 * React hook to set dressed-up page titles with SEO metadata.
 */
export function usePageTitle(
  input?: string | PageTitleOptions,
  deps: React.DependencyList = [],
): FormattedPageTitle {
  const { org } = useSession()

  const options: PageTitleOptions =
    typeof input === 'string' ? { pageName: input } : { ...input }

  if (!options.companyName && org?.name) {
    options.companyName = org.name
  }

  const result = formatPageTitle(options)

  useEffect(() => {
    try {
      if (result?.title) {
        applyPageMetadata(result.title, result.description)
      }
    } catch (err) {
      console.warn('Could not apply page metadata in usePageTitle', err)
    }
  }, [result.title, result.description, ...deps])

  return result
}

/**
 * React hook specifically for individual entity pages (Job, Contact, Document, Profile, etc.).
 * Front-loads the entity name for instant tab recognition and SEO.
 */
export function useEntityTitle(
  options: EntityTitleOptions,
  deps: React.DependencyList = [],
): FormattedPageTitle {
  const { org } = useSession()

  return usePageTitle(
    {
      entityName: options.name,
      entityType: options.type,
      context: options.context,
      companyName: options.companyName || org?.name,
      description: options.description,
    },
    deps,
  )
}

/**
 * Top-level listener inside BrowserRouter that automatically sets dressed-up default titles on navigation.
 */
export function PageTitleManager() {
  const location = useLocation()
  const { org } = useSession()

  useEffect(() => {
    try {
      const meta = resolveRouteTitle(location.pathname, org?.name)
      if (meta?.title) {
        applyPageMetadata(meta.title, meta.description)
      }
    } catch (err) {
      console.warn('Could not resolve route title', err)
    }
  }, [location.pathname, org?.name])

  return null
}
