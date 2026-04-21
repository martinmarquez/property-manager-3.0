import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object: DashboardPage (at /dashboard)
 *
 * Phase A: renders with a mock user ("Buenos días, {nombre}") and onboarding checklist.
 * Phase B: will render with a real authenticated user from the session.
 */
export class DashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly onboardingChecklist: Locator;

  constructor(page: Page) {
    this.page = page;
    // h1 greeting: "Buenos días, {name} 👋"
    this.heading = page.getByRole('heading', { level: 1 });
    // Onboarding checklist items from DashboardPage
    this.onboardingChecklist = page.getByRole('list');
  }

  async goto(): Promise<void> {
    await this.page.goto('/dashboard');
  }

  isAt(): Promise<void> {
    return this.page.waitForURL('**/dashboard');
  }
}
