import { type Page } from '@playwright/test';

export interface TenantOptions {
  orgName: string;
  ownerEmail: string;
  ownerPassword: string;
}

export interface UserCredentials {
  email: string;
  password: string;
}

/**
 * Creates a new tenant (agency owner sign-up flow).
 * Navigates to /register, fills the form, and returns the created credentials.
 */
export async function createTenant(page: Page, opts: TenantOptions): Promise<void> {
  await page.goto('/register');
  await page.getByLabel('Organisation name').fill(opts.orgName);
  await page.getByLabel('Email').fill(opts.ownerEmail);
  await page.getByLabel('Password').fill(opts.ownerPassword);
  await page.getByRole('button', { name: /create account/i }).click();
  // Wait for redirect to dashboard after successful registration
  await page.waitForURL('**/dashboard');
}

/**
 * Signs in as an existing user.
 */
export async function loginAs(page: Page, creds: UserCredentials): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(creds.email);
  await page.getByLabel('Password').fill(creds.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/dashboard');
}
