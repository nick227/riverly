import { expect, test, type Page } from '@playwright/test'
import { loginAs, USERS } from './helpers'

/**
 * Elements that poke past the right edge of the screen. The page clips sideways overflow as a safety net,
 * so document width alone would hide these; intentional scrollers (tabs, pipeline, tables) are skipped.
 */
async function offscreen(page: Page) {
  return page.evaluate(() => {
    const w = window.innerWidth
    const insideScroller = (el: Element) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) if (getComputedStyle(p).overflowX !== 'visible') return true
      return false
    }
    return [...document.querySelectorAll('body *')]
      .filter((el) => {
        const r = el.getBoundingClientRect()
        return r.width > 0 && r.right > w + 1 && getComputedStyle(el).position !== 'fixed' && !insideScroller(el)
      })
      .map((el) => `${el.tagName.toLowerCase()}.${el.className}`)
  })
}

test('job page works at phone width without horizontal page scroll', async ({ page }) => {
  await loginAs(page, USERS.member)
  await page.getByRole('link', { name: /Robert Hale/ }).first().click()
  await expect(page).toHaveURL(/\/jobs\//)
  await expect(page.locator('.crm-contact')).toBeVisible()
  expect(await offscreen(page)).toEqual([])
  await expect(page.locator('.crm-nav-mobile')).toBeVisible()
})

test('settings fits phone width and the one bottom nav reaches every section', async ({ page }) => {
  await loginAs(page, USERS.admin)
  const nav = page.locator('.crm-nav-mobile')
  await expect(page.locator('nav[aria-label="Primary"]:visible')).toHaveCount(1)
  for (const name of ['Home', 'Activity', 'Contacts', 'Settings', 'Profile']) await expect(nav.getByRole('link', { name })).toBeVisible()
  await nav.getByRole('link', { name: 'Settings' }).click()
  await expect(nav.getByRole('link', { name: 'Settings' })).toHaveAttribute('aria-current', 'page')
  for (const section of ['team', 'workflow', 'email', 'billing']) {
    await page.goto(`/settings/${section}`)
    await expect(page.locator('.crm-settings-nav .is-active')).toBeInViewport()
    expect(await offscreen(page), section).toEqual([])
  }
})

test('contacts, activity and the empty-state intake fit phone width', async ({ page }) => {
  await loginAs(page, USERS.admin)
  for (const path of ['/contacts', '/contacts?preview_empty=1', '/activity', '/']) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    expect(await offscreen(page), path).toEqual([])
  }
})
