import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object: AI Copilot
 *
 * Covers the floating widget (CopilotFloat) and the full-page view (/copilot).
 * The float button has aria-label="Abrir Copilot IA".
 * The compact sheet dialog has role="dialog" and aria-label="Copilot IA".
 */
export class CopilotFloatPage {
  readonly page: Page;
  readonly floatButton: Locator;
  readonly dialog: Locator;
  readonly messageInput: Locator;
  readonly sendButton: Locator;
  readonly closeButton: Locator;
  readonly expandButton: Locator;
  readonly messageList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.floatButton = page.getByRole('button', { name: 'Abrir Copilot IA' });
    this.dialog = page.getByRole('dialog', { name: 'Copilot IA' });
    this.messageInput = page.locator('[role="dialog"][aria-label="Copilot IA"] input[placeholder="Pregunta algo…"]');
    this.sendButton = page.getByRole('button', { name: 'Enviar mensaje' });
    this.closeButton = page.getByRole('button', { name: 'Cerrar Copilot' });
    this.expandButton = page.locator('[role="dialog"][aria-label="Copilot IA"] button[title="Abrir en página completa"]');
    this.messageList = this.dialog;
  }

  async openFloat(): Promise<void> {
    await this.floatButton.click();
    await this.dialog.waitFor({ state: 'visible' });
  }

  async closeFloat(): Promise<void> {
    await this.closeButton.click();
  }

  async closeWithEsc(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  async sendMessage(text: string): Promise<void> {
    await this.messageInput.fill(text);
    await this.sendButton.click();
  }

  async sendMessageViaEnter(text: string): Promise<void> {
    await this.messageInput.fill(text);
    await this.messageInput.press('Enter');
  }

  isFloatVisible(): Promise<boolean> {
    return this.floatButton.isVisible();
  }

  isDialogVisible(): Promise<boolean> {
    return this.dialog.isVisible();
  }
}
