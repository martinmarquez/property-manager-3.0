import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object: Reports module (/reports and /reports/:slug)
 */
export class ReportsIndexPageObject {
  readonly page: Page;
  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly categoryFilter: Locator;
  readonly reportCards: Locator;
  readonly operacionalTab: Locator;
  readonly estrategicoTab: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1 });
    this.searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/buscar/i));
    this.categoryFilter = page.getByRole('button', { name: /operacional/i });
    this.reportCards = page.getByRole('article').or(page.locator('[data-testid="report-card"]'));
    this.operacionalTab = page.getByRole('button', { name: /operacional/i });
    this.estrategicoTab = page.getByRole('button', { name: /estratégico/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/reports');
  }
}

export class ReportViewPageObject {
  readonly page: Page;
  readonly backButton: Locator;
  readonly title: Locator;
  readonly datePreset7d: Locator;
  readonly datePreset30d: Locator;
  readonly exportCsvButton: Locator;
  readonly exportXlsxButton: Locator;
  readonly digestButton: Locator;
  readonly chart: Locator;
  readonly refreshIndicator: Locator;

  constructor(page: Page) {
    this.page = page;
    this.backButton = page.getByRole('button', { name: /volver|atrás/i });
    this.title = page.getByRole('heading', { level: 1 });
    this.datePreset7d = page.getByRole('button', { name: '7D' });
    this.datePreset30d = page.getByRole('button', { name: '30D' });
    this.exportCsvButton = page.getByRole('button', { name: /csv/i });
    this.exportXlsxButton = page.getByRole('button', { name: /excel|xlsx/i });
    this.digestButton = page.getByRole('button', { name: /digest|semanal|diario/i });
    this.chart = page.locator('canvas, svg[class*="chart"], [data-testid*="chart"]').first();
    this.refreshIndicator = page.getByText(/actualizado|refresh/i).first();
  }

  async goto(slug: string): Promise<void> {
    await this.page.goto(`/reports/${slug}`);
  }
}
