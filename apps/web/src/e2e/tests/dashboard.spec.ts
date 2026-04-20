import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage.js';
import { DashboardPage } from '../pages/DashboardPage.js';

test.describe('Dashboard — Phase A smoke', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(
      process.env.E2E_USER_EMAIL ?? 'test@corredor.app',
      process.env.E2E_USER_PASSWORD ?? 'Test1234!@#',
    );
    await page.waitForURL('**/dashboard');
  });

  test('dashboard loads and shows empty state for a fresh tenant', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.isAt();
    await expect(dashboardPage.heading).toBeVisible();
    await expect(dashboardPage.emptyState).toBeVisible();
  });

  test('unauthenticated user is redirected to login', async ({ page: unauthPage }) => {
    await unauthPage.goto('/dashboard');
    await expect(unauthPage).toHaveURL(/\/login/);
  });
});
