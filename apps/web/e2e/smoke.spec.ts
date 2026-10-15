/**
 * Golden-path smoke tests against the seeded demo company. Run `pnpm db:seed -- --reset` first.
 */
import { expect, test } from '@playwright/test'
import { loginAs, USERS } from './helpers'

test.describe('auth', () => {
  test('login → contacts → sign out', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
    await loginAs(page, USERS.member)
    await expect(page.getByRole('heading', { name: 'Contacts' })).toBeVisible()
    await page.getByRole('button', { name: 'Account menu' }).click()
    await page.getByRole('menuitem', { name: 'Sign out' }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated access redirects to login', async ({ page }) => {
    await page.goto('/activity')
    await expect(page).toHaveURL(/\/login/)
  })

  test('another company never sees NV Custom Homes contacts', async ({ page }) => {
    await loginAs(page, USERS.otherCompany)
    await expect(page.getByText('Walter Grey')).toBeVisible()
    await expect(page.getByText('Maria Santos')).toHaveCount(0)
  })
})

test.describe('job workflow', () => {
  test('selecting a stage never moves the job; contact attempts are logged', async ({ page }) => {
    await loginAs(page, USERS.member)
    await page.getByRole('link', { name: /Maria Santos/ }).first().click()
    await expect(page).toHaveURL(/\/jobs\//)
    const current = page.locator('.crm-job__pipeline-sticky .crm-pipeline__segment.is-current .crm-pipeline__label')
    const before = await current.textContent()

    await page.locator('.crm-job__pipeline-sticky .crm-pipeline__segment', { hasText: 'Inspection' }).click()
    await expect(page.getByRole('heading', { name: 'Inspection', level: 2 })).toBeVisible()
    await expect(current).toHaveText(before!)

    await page.getByRole('tab', { name: 'Call / contact' }).click()
    await page.getByLabel('Outcome').last().selectOption('no_answer')
    const note = `e2e attempt ${Date.now()}`
    await page.getByLabel('Note', { exact: true }).fill(note)
    await page.getByRole('button', { name: 'Log attempt' }).click()
    await expect(page.getByText(note)).toBeVisible()
  })

  test('email overlay shows sender, recipient and message before an explicit send', async ({ page }) => {
    await loginAs(page, USERS.member)
    await page.getByRole('link', { name: /Angela Ruiz/ }).first().click()
    await page.locator('.crm-contact').getByRole('button', { name: 'Email', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('From')).toBeVisible()
    await expect(dialog.getByText(/angela\.ruiz@example\.com/)).toBeVisible()
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog).toHaveCount(0)
  })
})

test.describe('roles', () => {
  test('managers get the attention rail on Activity and only Reports in Settings', async ({ page }) => {
    await loginAs(page, USERS.manager)
    await page.getByRole('link', { name: 'Activity', exact: true }).click()
    await expect(page.getByRole('complementary', { name: 'Needs attention' }).getByRole('heading', { name: 'Upcoming appointments' })).toBeVisible()
    await page.getByRole('link', { name: 'Settings', exact: true }).click()
    await expect(page).toHaveURL(/\/settings\/reports/)
    await expect(page.getByRole('heading', { name: 'Speed to first outreach' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Workflow' })).toHaveCount(0)
    await page.goto('/settings/workflow')
    await expect(page).toHaveURL(/\/settings\/reports/)
  })

  test('members see neither the attention rail nor Settings', async ({ page }) => {
    await loginAs(page, USERS.member)
    await page.goto('/activity')
    await expect(page.getByRole('complementary', { name: 'Needs attention' })).toHaveCount(0)
    await page.goto('/settings')
    await expect(page).toHaveURL(/\/contacts/)
  })

  test('contacts list: sort options and the Import modal (no separate page)', async ({ page }) => {
    await loginAs(page, USERS.manager)
    await page.getByRole('tab', { name: 'Least active' }).click()
    await expect(page).toHaveURL(/sort=stale/)
    await page.getByRole('tab', { name: 'Oldest' }).click()
    await expect(page.locator('.crm-job-row').nth(1)).toBeVisible()
    await expect(page.getByText('No value yet')).toHaveCount(0)
    await page.getByRole('button', { name: 'Import', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('Choose a CSV file')).toBeVisible()
    await expect(page).toHaveURL(/\/contacts/)
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog).toHaveCount(0)
  })

  test('admins can open the workflow editor', async ({ page }) => {
    await loginAs(page, USERS.admin)
    await page.goto('/settings/workflow')
    await expect(page.getByRole('heading', { name: 'Stages' })).toBeVisible()
  })
})
