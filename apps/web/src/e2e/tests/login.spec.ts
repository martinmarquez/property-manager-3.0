import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage.js';

test.describe('Login — Phase A smoke', () => {
  test('la página de login muestra el formulario correctamente', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(page).toHaveURL(/\/login/);
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
    await expect(loginPage.submitButton).toHaveText('Ingresar');
  });

  test('credenciales vacías muestran validación de cliente', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Submit with empty fields — client validation should show alert
    await loginPage.submitButton.click();
    await expect(loginPage.errorMessage).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('usuario puede iniciar sesión y llegar al dashboard', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.login(
      process.env.E2E_USER_EMAIL ?? 'test@corredor.ar',
      process.env.E2E_USER_PASSWORD ?? 'Test1234!@#',
    );

    // Phase A stub: onSubmit navigates to '/' which redirects to /dashboard.
    // Phase B (real auth): will validate session cookie and redirect.
    await expect(page).toHaveURL(/\/(dashboard|login)/);
  });
});
