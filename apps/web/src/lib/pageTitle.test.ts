import { describe, expect, it } from 'vitest'
import {
  formatEntityTitle,
  formatPageTitle,
  resolveRouteTitle,
  BRAND,
} from './pageTitle'

describe('pageTitle service', () => {
  describe('top pages (formatPageTitle)', () => {
    it('formats a top-level page without company', () => {
      const res = formatPageTitle({
        pageName: 'Contacts & Pipeline',
      })
      expect(res.title).toBe('Contacts & Pipeline | Riverly CRM')
      expect(res.description).toBe(BRAND.defaultDescription)
    })

    it('formats a top-level page with company context', () => {
      const res = formatPageTitle({
        pageName: 'Contacts & Pipeline',
        companyName: 'Summit Roofing',
      })
      expect(res.title).toBe('Contacts & Pipeline · Summit Roofing | Riverly CRM')
    })

    it('formats a top-level page with value-prop context and company', () => {
      const res = formatPageTitle({
        pageName: 'Contacts & Pipeline',
        context: 'Overdue follow-ups',
        companyName: 'Summit Roofing',
      })
      expect(res.title).toBe('Contacts & Pipeline · Overdue follow-ups · Summit Roofing | Riverly CRM')
    })

    it('supports rawTitle override without butchering title', () => {
      const res = formatPageTitle({
        rawTitle: 'Custom Unformatted Title — Special Case',
      })
      expect(res.title).toBe('Custom Unformatted Title — Special Case')
    })
  })

  describe('individual entity pages (formatEntityTitle)', () => {
    it('front-loads customer name on job pages with stage and address', () => {
      const res = formatEntityTitle({
        type: 'job',
        name: 'Walter Grey',
        context: 'Inspection Stage (742 Evergreen Terr)',
        companyName: 'Summit Roofing',
      })
      expect(res.title).toBe('Walter Grey · Inspection Stage (742 Evergreen Terr) | Summit Roofing · Riverly CRM')
      expect(res.description).toContain('Walter Grey')
      expect(res.description).toContain('Summit Roofing')
    })

    it('front-loads customer name on job pages without address', () => {
      const res = formatEntityTitle({
        type: 'job',
        name: 'Angela Ruiz',
        context: 'Contract Stage',
        companyName: 'NV Custom Homes',
      })
      expect(res.title).toBe('Angela Ruiz · Contract Stage | NV Custom Homes · Riverly CRM')
    })

    it('formats contact entity page with Customer Record subtitle', () => {
      const res = formatEntityTitle({
        type: 'contact',
        name: 'Jane Doe',
        companyName: 'Summit Roofing',
      })
      expect(res.title).toBe('Jane Doe · Customer Record | Summit Roofing · Riverly CRM')
    })

    it('formats company document page with document title and kind', () => {
      const res = formatEntityTitle({
        type: 'document',
        name: 'Roof Inspection Checklist',
        context: 'Standard Operating Procedure',
        companyName: 'Summit Roofing',
      })
      expect(res.title).toBe('Roof Inspection Checklist · Standard Operating Procedure | Summit Roofing · Riverly CRM')
    })

    it('formats team member profile with user display name and role', () => {
      const res = formatEntityTitle({
        type: 'profile',
        name: 'Maria Santos',
        context: 'Manager',
        companyName: 'NV Custom Homes',
      })
      expect(res.title).toBe('Maria Santos · Team Profile (Manager) | NV Custom Homes · Riverly CRM')
    })

    it('formats public quote form with company name and Riverly brand', () => {
      const res = formatEntityTitle({
        type: 'form',
        name: 'Summit Roofing',
      })
      expect(res.title).toBe('Request a Free Roofing Estimate · Summit Roofing | Riverly')
    })

    it('formats invitation page with organization name', () => {
      const res = formatEntityTitle({
        type: 'invite',
        name: 'Summit Roofing',
      })
      expect(res.title).toBe('Join Summit Roofing on Riverly · Team Invitation')
    })
  })

  describe('route resolver (resolveRouteTitle)', () => {
    it('resolves home page', () => {
      const res = resolveRouteTitle('/', 'Summit Roofing')
      expect(res.title).toBe('Company Home · Dashboard & Tasks · Summit Roofing | Riverly CRM')
    })

    it('resolves contacts page', () => {
      const res = resolveRouteTitle('/contacts', 'Summit Roofing')
      expect(res.title).toBe('Contacts & Pipeline · Roofing Jobs · Summit Roofing | Riverly CRM')
    })

    it('resolves activity page', () => {
      const res = resolveRouteTitle('/activity', 'NV Custom Homes')
      expect(res.title).toBe('Activity River · Team Feed · NV Custom Homes | Riverly CRM')
    })

    it('resolves review duplicate queue', () => {
      const res = resolveRouteTitle('/contacts/review', 'Summit Roofing')
      expect(res.title).toBe('Review Matches · Lead Intake Queue · Summit Roofing | Riverly CRM')
    })

    it('resolves settings subpages', () => {
      const reports = resolveRouteTitle('/settings/reports', 'Summit Roofing')
      expect(reports.title).toBe('Reports & Business Analytics · Settings · Summit Roofing | Riverly CRM')

      const workflow = resolveRouteTitle('/settings/workflow', 'Summit Roofing')
      expect(workflow.title).toBe('Workflow & Pipeline Stages · Settings · Summit Roofing | Riverly CRM')

      const email = resolveRouteTitle('/settings/email', 'Summit Roofing')
      expect(email.title).toBe('Email Templates & Senders · Settings · Summit Roofing | Riverly CRM')
    })

    it('resolves sign in and sign up without company', () => {
      const login = resolveRouteTitle('/login')
      expect(login.title).toBe('Sign In · Roofing Contractor CRM | Riverly CRM')

      const signup = resolveRouteTitle('/signup')
      expect(signup.title).toBe('Set Up Your Company · Roofing CRM | Riverly CRM')
    })

    it('provides clean loading fallbacks for dynamic entity routes', () => {
      const jobFallback = resolveRouteTitle('/jobs/opp_123', 'Summit Roofing')
      expect(jobFallback.title).toBe('Job Details · Pipeline · Summit Roofing | Riverly CRM')

      const contactFallback = resolveRouteTitle('/contacts/c_456', 'Summit Roofing')
      expect(contactFallback.title).toBe('Contact Details · Customer Record · Summit Roofing | Riverly CRM')

      const docFallback = resolveRouteTitle('/docs/safety', 'Summit Roofing')
      expect(docFallback.title).toBe('Company Documentation · Guides & SOPs · Summit Roofing | Riverly CRM')

      const profileFallback = resolveRouteTitle('/u/maria', 'Summit Roofing')
      expect(profileFallback.title).toBe('Team Member Profile · Directory · Summit Roofing | Riverly CRM')
    })
  })
})
