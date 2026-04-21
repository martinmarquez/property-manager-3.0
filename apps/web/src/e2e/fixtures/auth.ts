import { type Page } from '@playwright/test';
import { RegisterPage } from '../pages/RegisterPage.js';

export interface TenantOptions {
  nombre?: string;
  apellido?: string;
  email: string;
  password: string;
  agencyName?: string;
  cuit?: string;
  provincia?: string;
}

export interface UserCredentials {
  email: string;
  password: string;
}

/**
 * Creates a new tenant via the 3-step RegisterFlow at /register.
 * Uses sensible defaults for optional fields.
 */
export async function createTenant(page: Page, opts: TenantOptions): Promise<void> {
  const register = new RegisterPage(page);
  await register.goto();
  await register.register({
    nombre: opts.nombre ?? 'Test',
    apellido: opts.apellido ?? 'User',
    email: opts.email,
    password: opts.password,
    agencyName: opts.agencyName ?? 'Test Agency',
    cuit: opts.cuit ?? '30-12345678-9',
    provincia: opts.provincia ?? 'Ciudad Autónoma de Buenos Aires',
  });
}

/**
 * Signs in an existing user at /login.
 * Waits for navigation away from /login after submit.
 */
export async function loginAs(page: Page, creds: UserCredentials): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(creds.email);
  await page.getByLabel('Contraseña', { exact: true }).fill(creds.password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  // In Phase B (real auth): wait for redirect to /dashboard.
  // Until then, the stub navigates to / which redirects to /dashboard.
  await page.waitForURL(/\/(dashboard|setup)/);
}
