import { test, expect } from '@playwright/test';
import { RegisterPage } from '../pages/RegisterPage.js';
import { DashboardPage } from '../pages/DashboardPage.js';

const TEST_ORG = 'Smoke Test Agency';
const OWNER_EMAIL = `owner+${Date.now()}@example.com`;
const OWNER_PASSWORD = 'Test1234!@#';
const INVITED_EMAIL = `invited+${Date.now()}@example.com`;

test.describe('Register — Phase A smoke', () => {
  test('new agency owner can sign up and land on dashboard', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    const dashboardPage = new DashboardPage(page);

    await registerPage.goto();
    await registerPage.register(TEST_ORG, OWNER_EMAIL, OWNER_PASSWORD);

    await dashboardPage.isAt();
    await expect(dashboardPage.heading).toBeVisible();
  });

  test('registered owner can invite a second user by email', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    const dashboardPage = new DashboardPage(page);

    // First register
    await registerPage.goto();
    await registerPage.register(TEST_ORG, `owner2+${Date.now()}@example.com`, OWNER_PASSWORD);
    await dashboardPage.isAt();

    // Then invite
    await registerPage.inviteUser(INVITED_EMAIL);
    await expect(page.getByText(/invite sent/i)).toBeVisible();
  });
});
