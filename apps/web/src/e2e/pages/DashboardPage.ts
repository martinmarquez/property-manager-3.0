import { type Page, type Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly emptyState: Locator;
  readonly userMenu: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /dashboard/i });
    this.emptyState = page.getByTestId('dashboard-empty-state');
    this.userMenu = page.getByRole('button', { name: /account/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/dashboard');
  }

  isAt(): Promise<void> {
    return this.page.waitForURL('**/dashboard');
  }
}
