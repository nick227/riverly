/**
 * Golden-path smoke tests against the seeded demo company. Run `pnpm db:seed -- --reset` first.
 */
import { expect, test } from '@playwright/test'
import { loginAs, USERS } from './helpers'

test.describe('auth', () => {
  test('guests get the front page, which leads to sign in', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: /Keep every roofing lead moving/ })).toBeVisible()
    await page.getByRole('banner').getByRole('link', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('login → contacts → sign out', async ({ page }) => {
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
  test('managers see the sales board on Activity and only Reports in Settings', async ({ page }) => {
    await loginAs(page, USERS.manager)
    await page.getByRole('link', { name: 'Activity', exact: true }).click()
    const board = page.getByRole('complementary', { name: 'Sales board' })
    await expect(board.getByRole('heading', { name: 'Scoreboard' })).toBeVisible()
    await board.getByRole('tab', { name: 'This week' }).click()
    await expect(board.getByRole('heading', { name: 'Leaders' })).toBeVisible()
    await page.getByRole('link', { name: 'Settings', exact: true }).click()
    await expect(page).toHaveURL(/\/settings\/reports/)
    await expect(page.getByRole('heading', { name: 'Reports', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Workflow' })).toHaveCount(0)
    await page.goto('/settings/workflow')
    await expect(page).toHaveURL(/\/settings\/reports/)
  })

  test('company home: logo, personal welcome and tasks, overview steps link to Contacts, documents open', async ({ page }) => {
    await loginAs(page, USERS.member)
    await page.getByRole('link', { name: 'Company home' }).click()
    await expect(page.getByRole('img', { name: 'NV Custom Homes logo' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: /Jake/ })).toBeVisible()
    const steps = page.getByRole('region', { name: 'Company overview' })
    await expect(steps.getByText('Job Completed', { exact: true })).toBeVisible()
    await page.getByRole('link', { name: /Safety on the roof/ }).click()
    await expect(page).toHaveURL(/\/docs\/safety/)
    await expect(page.getByText('This is a sample document.')).toBeVisible()
    await page.getByRole('link', { name: 'Company home' }).first().click()
    await steps.getByRole('link', { name: /Inspection/ }).click()
    await expect(page).toHaveURL(/\/contacts\?stage=inspection/)
  })

  test('members see the sales board but not Settings', async ({ page }) => {
    await loginAs(page, USERS.member)
    await page.goto('/activity')
    await expect(page.getByRole('complementary', { name: 'Sales board' }).getByText('Calls', { exact: true })).toBeVisible()
    await page.goto('/settings')
    await expect(page).toHaveURL(/\/contacts/)
  })

  test('contacts list: sort options and the Import modal (no separate page)', async ({ page }) => {
    await loginAs(page, USERS.manager)
    await page.getByRole('tab', { name: 'Least active' }).click()
    await expect(page).toHaveURL(/sort=stale/)
    await page.getByRole('tab', { name: 'Oldest' }).click()
    await expect(page.locator('.crm-job-row').nth(1)).toBeVisible()
    await page.getByRole('combobox', { name: 'Needs attention' }).selectOption('overdue')
    await expect(page).toHaveURL(/attention=overdue/)
    await page.getByRole('combobox', { name: 'Needs attention' }).selectOption('')
    await expect(page.getByText('No value yet')).toHaveCount(0)
    await page.getByRole('button', { name: 'Import', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('Choose a CSV file')).toBeVisible()
    await expect(page).toHaveURL(/\/contacts/)
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog).toHaveCount(0)
  })

  test('contacts rows: assign and change status in place', async ({ page }) => {
    await loginAs(page, USERS.manager)
    const row = page.locator('.crm-job-row').nth(1)
    const owner = row.getByRole('combobox', { name: /Assigned to for/ })
    await expect(owner).toBeEnabled()
    expect(await owner.locator('option').count()).toBeGreaterThan(2)
    const status = row.getByRole('combobox', { name: /Status for/ })
    await expect(status).toHaveValue('OPEN')
    await status.selectOption('LOST')
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('button', { name: 'Mark lost' })).toBeDisabled()
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog).toHaveCount(0)
    await expect(status).toHaveValue('OPEN')
    // The name still opens the job.
    await row.locator('.crm-job-row__link').click()
    await expect(page).toHaveURL(/\/jobs\//)
  })

  test('admins can open the workflow editor', async ({ page }) => {
    await loginAs(page, USERS.admin)
    await page.goto('/settings/workflow')
    await expect(page.getByRole('heading', { name: 'Stages' })).toBeVisible()
  })
})
