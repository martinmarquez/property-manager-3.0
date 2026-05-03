import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object: Billing settings (/settings/billing)
 */
export class BillingPageObject {
  readonly page: Page;

  // Tabs
  readonly planTab: Locator;
  readonly pagoTab: Locator;
  readonly facturasTab: Locator;
  readonly fiscalTab: Locator;
  readonly cancelarTab: Locator;

  // Plan tab
  readonly planCards: Locator;
  readonly monthlyToggle: Locator;
  readonly annualToggle: Locator;
  readonly upgradeButton: Locator;
  readonly currentPlanBadge: Locator;

  // Payment tab
  readonly paymentMethods: Locator;
  readonly addPaymentButton: Locator;

  // Invoices tab
  readonly invoiceTable: Locator;
  readonly downloadInvoiceButton: Locator;
  readonly caeColumn: Locator;

  // Fiscal tab
  readonly cuitInput: Locator;
  readonly razonSocialInput: Locator;

  // Cancel tab
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.planTab = page.getByRole('button', { name: 'Plan', exact: true });
    this.pagoTab = page.getByRole('button', { name: 'Pago', exact: true });
    this.facturasTab = page.getByRole('button', { name: 'Facturas', exact: true });
    this.fiscalTab = page.getByRole('button', { name: 'Datos fiscales', exact: true });
    this.cancelarTab = page.getByRole('button', { name: 'Cancelar', exact: true });

    this.planCards = page.getByText('Solo').first();
    this.monthlyToggle = page.getByRole('button', { name: /mensual/i });
    this.annualToggle = page.getByRole('button', { name: /anual/i });
    this.upgradeButton = page.getByRole('button', { name: /actualizar|upgrade/i }).first();
    this.currentPlanBadge = page.getByText(/plan actual|actual/i).first();

    this.paymentMethods = page.getByText('Visa');
    this.addPaymentButton = page.getByRole('button', { name: /agregar método|añadir/i });

    this.invoiceTable = page.getByRole('table');
    this.downloadInvoiceButton = page.getByRole('button', { name: /descargar|pdf/i }).first();
    this.caeColumn = page.getByText('CAE');

    this.cuitInput = page.getByLabel(/cuit/i);
    this.razonSocialInput = page.getByLabel(/razón social/i);

    this.cancelButton = page.getByRole('button', { name: /cancelar suscripción/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/settings/billing');
  }
}
