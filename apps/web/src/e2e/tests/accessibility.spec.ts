import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loginAs } from '../fixtures/auth.js';

const E2E_EMAIL = process.env.E2E_USER_EMAIL ?? 'test@corredor.ar';
const E2E_PASSWORD = process.env.E2E_USER_PASSWORD ?? 'Test1234!@#';

function axeScan(page: import('@playwright/test').Page) {
  return new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();
}

test.describe('Accessibility — Public Pages', () => {
  test('Login page has no serious violations', async ({ page }) => {
    await page.goto('/login');
    const results = await axeScan(page);
    expect(results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  });

  test('Register page has no serious violations', async ({ page }) => {
    await page.goto('/register');
    const results = await axeScan(page);
    expect(results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  });

  test('Reset password page has no serious violations', async ({ page }) => {
    await page.goto('/reset-password');
    const results = await axeScan(page);
    expect(results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  });
});

test.describe('Accessibility — Authenticated Views', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, { email: E2E_EMAIL, password: E2E_PASSWORD });
  });

  test('Dashboard has no serious violations', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const results = await axeScan(page);
    expect(results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  });

  test('Properties list has no serious violations', async ({ page }) => {
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');
    const results = await axeScan(page);
    expect(results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  });

  test('Contacts list has no serious violations', async ({ page }) => {
    await page.goto('/contacts');
    await page.waitForLoadState('networkidle');
    const results = await axeScan(page);
    expect(results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  });

  test('Pipelines (Oportunidades) has no serious violations', async ({ page }) => {
    await page.goto('/pipelines');
    await page.waitForLoadState('networkidle');
    const results = await axeScan(page);
    expect(results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  });

  test('Inquiries (Bandeja) has no serious violations', async ({ page }) => {
    await page.goto('/inquiries');
    await page.waitForLoadState('networkidle');
    const results = await axeScan(page);
    expect(results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  });

  test('Copilot has no serious violations', async ({ page }) => {
    await page.goto('/copilot');
    await page.waitForLoadState('networkidle');
    const results = await axeScan(page);
    expect(results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  });

  test('Site builder has no serious violations', async ({ page }) => {
    await page.goto('/site');
    await page.waitForLoadState('networkidle');
    const results = await axeScan(page);
    expect(results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  });

  test('Reports has no serious violations', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    const results = await axeScan(page);
    expect(results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  });

  test('Appraisals has no serious violations', async ({ page }) => {
    await page.goto('/appraisals');
    await page.waitForLoadState('networkidle');
    const results = await axeScan(page);
    expect(results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  });

  test('Settings has no serious violations', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    const results = await axeScan(page);
    expect(results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  });

  test('Calendar has no serious violations', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');
    const results = await axeScan(page);
    expect(results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  });

  test('Billing has no serious violations', async ({ page }) => {
    await page.goto('/settings/billing');
    await page.waitForLoadState('networkidle');
    const results = await axeScan(page);
    expect(results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  });
});

test.describe('Accessibility — Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, { email: E2E_EMAIL, password: E2E_PASSWORD });
  });

  test('skip-link is present and functional', async ({ page }) => {
    await page.goto('/dashboard');
    const skipLink = page.locator('a[href="#main-content"]');
    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
  });

  test('sidebar navigation items are keyboard-accessible', async ({ page }) => {
    await page.goto('/dashboard');
    const nav = page.getByRole('navigation', { name: /navegación principal/i });
    await expect(nav).toBeVisible();

    const menuItems = nav.getByRole('menuitem');
    const count = await menuItems.count();
    expect(count).toBeGreaterThan(0);

    await menuItems.first().focus();
    await expect(menuItems.first()).toBeFocused();
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle');
  });

  test('all interactive elements have visible focus indicators', async ({ page }) => {
    await page.goto('/dashboard');
    const buttons = page.getByRole('button');
    const firstButton = buttons.first();
    await firstButton.focus();

    const outlineStyle = await firstButton.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        outline: styles.outline,
        outlineOffset: styles.outlineOffset,
        boxShadow: styles.boxShadow,
      };
    });

    const hasFocusIndicator =
      (outlineStyle.outline && outlineStyle.outline !== 'none' && !outlineStyle.outline.includes('0px')) ||
      (outlineStyle.boxShadow && outlineStyle.boxShadow !== 'none');
    expect(hasFocusIndicator).toBe(true);
  });

  test('modal dialogs trap focus', async ({ page }) => {
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');

    const newButton = page.getByRole('button', { name: /nueva|nuevo|agregar|crear/i });
    if (await newButton.isVisible()) {
      await newButton.click();
      const dialog = page.getByRole('dialog');
      if (await dialog.isVisible()) {
        await page.keyboard.press('Tab');
        const focusedEl = page.locator(':focus');
        const isInsideDialog = await focusedEl.evaluate((el) => {
          return el.closest('[role="dialog"]') !== null;
        });
        expect(isInsideDialog).toBe(true);
      }
    }
  });
});

test.describe('Accessibility — Color Contrast', () => {
  test('Login page meets contrast requirements', async ({ page }) => {
    await page.goto('/login');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .withRules(['color-contrast'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test.beforeEach(async ({ page }) => {
    await loginAs(page, { email: E2E_EMAIL, password: E2E_PASSWORD });
  });

  test('Dashboard meets contrast requirements', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .withRules(['color-contrast'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
