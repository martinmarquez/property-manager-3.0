import { test, expect } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage.js';

test.describe('Dashboard — Phase A smoke', () => {
  test('la ruta /dashboard carga el shell de la aplicación', async ({ page }) => {
    // Navigate directly — Phase A: no auth guard (mock session).
    // Phase B: this will redirect to /login unless a session cookie is present.
    await page.goto('/dashboard');
    const dashboard = new DashboardPage(page);

    await expect(dashboard.heading).toBeVisible();
  });

  test('el menú de navegación lateral está visible', async ({ page }) => {
    await page.goto('/dashboard');

    // AppShell renders a sidebar nav — verify at least one nav link is present
    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('la ruta raíz redirige a /dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
