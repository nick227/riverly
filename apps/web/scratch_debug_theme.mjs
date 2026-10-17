import { chromium } from '@playwright/test';

const THEMES = [
  'light', 'dark', 'slate', 'sand', 'forest', 'material', 'apple', 'openai',
  'discord', 'monokai', 'brutalist', 'hyper-modernism', 'bauhaus', 'dream-world',
  'editorial-magazine', 'retro-terminal', 'zen-minimalism', 'nightmare-horror',
  'fjord', 'workshop', 'periwinkle', 'wayfinder', 'acid-opera', 'cobalt-cabaret',
  'bubblegum-riot', 'obsidian-gilt'
];

async function testAllThemes() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:5180/');
  await page.waitForTimeout(500);

  const results = [];

  for (const t of THEMES) {
    const res = await page.evaluate((themeName) => {
      document.documentElement.dataset.theme = themeName;
      const rootStyle = getComputedStyle(document.documentElement);
      const bodyStyle = getComputedStyle(document.body);
      return {
        theme: themeName,
        cssBg: rootStyle.getPropertyValue('--color-bg').trim(),
        cssSurface: rootStyle.getPropertyValue('--color-surface').trim(),
        cssAccent: rootStyle.getPropertyValue('--color-accent').trim(),
        bodyBg: bodyStyle.backgroundColor,
        bodyColor: bodyStyle.color,
      };
    }, t);
    results.push(res);
  }

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
}

testAllThemes().catch(console.error);
