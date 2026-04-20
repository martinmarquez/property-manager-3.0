import { type Page, type Locator } from '@playwright/test';

export class RegisterPage {
  readonly page: Page;
  readonly orgNameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.orgNameInput = page.getByLabel('Organisation name');
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: /create account/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/register');
  }

  async register(orgName: string, email: string, password: string): Promise<void> {
    await this.orgNameInput.fill(orgName);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async inviteUser(email: string): Promise<void> {
    await this.page.getByRole('button', { name: /invite/i }).click();
    await this.page.getByLabel(/invite email/i).fill(email);
    await this.page.getByRole('button', { name: /send invite/i }).click();
  }
}
