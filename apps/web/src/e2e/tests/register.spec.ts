import { test, expect } from '@playwright/test';
import { RegisterPage } from '../pages/RegisterPage.js';

const TS = Date.now();
const OWNER_EMAIL = `owner+${TS}@example.com`;
const PASSWORD = 'Test1234!@#';

test.describe('Registro — Phase A smoke', () => {
  test('el flujo de 3 pasos se completa y redirige tras crear cuenta', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Step 0 — Tu cuenta
    await expect(page.getByText('Tu cuenta')).toBeVisible();
    await registerPage.nombreInput.fill('Martín');
    await registerPage.apellidoInput.fill('García');
    await registerPage.emailInput.fill(OWNER_EMAIL);
    await registerPage.passwordInput.fill(PASSWORD);
    await registerPage.confirmPasswordInput.fill(PASSWORD);
    await registerPage.continueButton.click();

    // Step 1 — Tu agencia
    await expect(page.getByText('Tu agencia')).toBeVisible();
    await registerPage.agencyNameInput.fill('Agencia Test SA');
    await registerPage.cuitInput.fill('30-71234567-8');
    await registerPage.provinciaSelect.selectOption('Ciudad Autónoma de Buenos Aires');
    await registerPage.continueButton.click();

    // Step 2 — Equipo (exact: true avoids matching body text containing "equipo")
    await expect(page.getByText('Equipo', { exact: true })).toBeVisible();
    await registerPage.createAccountButton.click();

    // After submit, the app navigates away from /register.
    // Phase A stub goes to /setup/2fa; Phase B (real auth) will go to /dashboard.
    await expect(page).not.toHaveURL(/\/register/);
  });

  test('validation: campos requeridos bloquean el primer paso', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Submit empty step 0 — should stay on step 0
    await registerPage.continueButton.click();
    await expect(page).toHaveURL(/\/register/);
    await expect(page.getByText('Tu cuenta')).toBeVisible();
  });

  test('el tercer paso permite agregar un email de invitación', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Step 0
    await registerPage.nombreInput.fill('Ana');
    await registerPage.apellidoInput.fill('López');
    await registerPage.emailInput.fill(`owner2+${TS}@example.com`);
    await registerPage.passwordInput.fill(PASSWORD);
    await registerPage.confirmPasswordInput.fill(PASSWORD);
    await registerPage.continueButton.click();

    // Step 1
    await registerPage.agencyNameInput.fill('Agencia Invite SA');
    await registerPage.cuitInput.fill('30-71234567-8');
    await registerPage.provinciaSelect.selectOption('Ciudad Autónoma de Buenos Aires');
    await registerPage.continueButton.click();

    // Step 2 — fill invite
    const inviteEmail = `invited+${TS}@example.com`;
    await registerPage.inviteTeamMember(inviteEmail);
    await expect(registerPage.inviteEmailInput).toHaveValue(inviteEmail);

    // Button label changes to "Crear cuenta e invitar"
    await expect(page.getByRole('button', { name: /Crear cuenta e invitar/ })).toBeVisible();
  });
});
