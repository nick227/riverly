import { expect, test } from '@playwright/test'
import { loginAs, USERS } from './helpers'

test('job page works at phone width without horizontal page scroll', async ({ page }) => {
  await loginAs(page, USERS.member)
  await page.getByRole('link', { name: /Robert Hale/ }).first().click()
  await expect(page).toHaveURL(/\/jobs\//)
  await expect(page.locator('.crm-contact')).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(1)
  await expect(page.locator('.crm-nav-mobile')).toBeVisible()
})
