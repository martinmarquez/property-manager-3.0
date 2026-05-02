import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object: Smart Search (CommandPalette + SearchPage)
 *
 * The palette is rendered in AuthenticatedLayout and toggled by Cmd/Ctrl+K.
 * The full search page lives at /search?q=...
 */
export class SmartSearchPage {
  readonly page: Page;

  // CommandPalette locators
  readonly palette: Locator;
  readonly searchInput: Locator;
  readonly resultsList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.palette = page.getByRole('combobox', { name: 'Búsqueda rápida' });
    this.searchInput = page.locator('[data-cmd-palette] input');
    this.resultsList = page.getByRole('listbox');
  }

  async openWithKeyboard(): Promise<void> {
    // macOS: Meta+K; others: Ctrl+K — Playwright sends the right modifier
    await this.page.keyboard.press('Meta+k');
  }

  async openWithCtrl(): Promise<void> {
    await this.page.keyboard.press('Control+k');
  }

  async close(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  async typeQuery(query: string): Promise<void> {
    await this.searchInput.fill(query);
  }

  async pressArrowDown(): Promise<void> {
    await this.palette.press('ArrowDown');
  }

  async pressArrowUp(): Promise<void> {
    await this.palette.press('ArrowUp');
  }

  async pressEnter(): Promise<void> {
    await this.palette.press('Enter');
  }

  /** Returns the currently active/highlighted option */
  activeOption(): Locator {
    return this.page.locator('[role="option"][aria-selected="true"]');
  }

  /** Returns all visible result options */
  resultOptions(): Locator {
    return this.page.locator('[role="option"]');
  }

  isOpen(): Promise<boolean> {
    return this.palette.isVisible();
  }
}
