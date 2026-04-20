import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage.js';
import { DashboardPage } from '../pages/DashboardPage.js';

test.describe('Login — Phase A smoke', () => {
  test('existing user can sign in and reach dashboard', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.goto();
    await loginPage.login(
      process.env.E2E_USER_EMAIL ?? 'test@corredor.app',
      process.env.E2E_USER_PASSWORD ?? 'Test1234!@#',
    );

    await dashboardPage.isAt();
    await expect(dashboardPage.heading).toBeVisible();
  });

  test('invalid credentials show an error message', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login('nobody@example.com', 'wrongpassword');

    await expect(loginPage.errorMessage).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});
