import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object: Site module pages
 *
 * Covers /site (overview), /site/new (creation wizard),
 * /site/pages (page list), /site/editor/:pageId (Puck editor),
 * /site/themes, /site/domains, /site/blog, /site/form-submissions.
 */
export class SiteOverviewPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly statusBadge: Locator;
  readonly visitStats: Locator;
  readonly quickActionsSection: Locator;
  readonly viewSiteLink: Locator;
  readonly editSiteButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1 });
    this.statusBadge = page.getByText('Publicado');
    this.visitStats = page.getByText('Visitas (7d)');
    this.quickActionsSection = page.getByText('Páginas').first();
    this.viewSiteLink = page.getByRole('link', { name: /ver sitio/i }).or(page.getByText('Ver sitio'));
    this.editSiteButton = page.getByRole('button', { name: /editar/i }).first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/site');
  }
}

export class SiteCreationWizardPage {
  readonly page: Page;
  readonly stepIndicator: Locator;
  readonly themeOptions: Locator;
  readonly nextButton: Locator;
  readonly backButton: Locator;
  readonly publishButton: Locator;
  readonly agencyNameInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.stepIndicator = page.getByRole('navigation', { name: /progreso/i });
    this.themeOptions = page.getByText('Clásico');
    this.nextButton = page.getByRole('button', { name: /siguiente|continuar/i });
    this.backButton = page.getByRole('button', { name: /anterior|atrás/i });
    this.publishButton = page.getByRole('button', { name: /publicar/i });
    this.agencyNameInput = page.getByLabel(/nombre|agencia/i).first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/site/new');
  }
}

export class SitePagesPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly newPageButton: Locator;
  readonly pageList: Locator;
  readonly publishedBadge: Locator;
  readonly draftBadge: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Páginas' });
    this.newPageButton = page.getByRole('button', { name: /nueva página/i });
    this.pageList = page.getByText('Home');
    this.publishedBadge = page.getByText('Publicada').first();
    this.draftBadge = page.getByText('Borrador').first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/site/pages');
  }
}

export class SiteEditorPage {
  readonly page: Page;
  readonly blockPanel: Locator;
  readonly canvas: Locator;
  readonly saveButton: Locator;
  readonly publishButton: Locator;
  readonly undoButton: Locator;
  readonly redoButton: Locator;
  readonly desktopToggle: Locator;
  readonly mobileToggle: Locator;
  readonly addBlockButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.blockPanel = page.getByRole('button', { name: /hero|bloque|agregar/i }).first();
    this.canvas = page.locator('[aria-label*="canvas"], [class*="canvas"]').first();
    this.saveButton = page.getByRole('button', { name: /guardar/i });
    this.publishButton = page.getByRole('button', { name: /publicar/i });
    this.undoButton = page.getByRole('button', { name: /deshacer/i });
    this.redoButton = page.getByRole('button', { name: /rehacer/i });
    this.desktopToggle = page.getByRole('button', { name: /escritorio|desktop/i });
    this.mobileToggle = page.getByRole('button', { name: /móvil|mobile/i });
    this.addBlockButton = page.getByRole('button', { name: /agregar bloque|añadir/i }).first();
  }

  async goto(pageId = 'p1'): Promise<void> {
    await this.page.goto(`/site/editor/${pageId}`);
  }
}

export class SiteThemesPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly themeCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1 });
    this.themeCards = page.getByText('Clásico');
  }

  async goto(): Promise<void> {
    await this.page.goto('/site/themes');
  }
}

export class SiteDomainsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly domainInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1 });
    this.domainInput = page.getByRole('textbox').first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/site/domains');
  }
}

export class SiteFormSubmissionsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly submissionList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1 });
    this.submissionList = page.getByRole('table').or(page.getByRole('list'));
  }

  async goto(): Promise<void> {
    await this.page.goto('/site/form-submissions');
  }
}
