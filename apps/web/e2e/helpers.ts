import { expect, type Page } from '@playwright/test'

export const PASSWORD = 'riverly-demo-2026'
export const USERS = {
  member: 'jake@nvcustomhomes.test',
  manager: 'marcus@nvcustomhomes.test',
  admin: 'dana@nvcustomhomes.test',
  otherCompany: 'sara@summitroofing.test',
}

export async function loginAs(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  // Signing in lands on the company home page; most tests start from Contacts.
  await expect(page.getByRole('region', { name: 'Your tasks' })).toBeVisible()
  await page.goto('/contacts')
}
