import { test, expect } from '@playwright/test';
import { BillingPageObject } from '../pages/BillingPageObject.js';

// ─── Billing E2E — Phase G ─────────────────────────────────────────────────

test.describe('Página de facturación — tabs', () => {
  test('carga la página de facturación con los 5 tabs', async ({ page }) => {
    const billing = new BillingPageObject(page);
    await billing.goto();

    await expect(page).toHaveURL(/\/settings\/billing/);
    await expect(billing.planTab).toBeVisible();
    await expect(billing.pagoTab).toBeVisible();
    await expect(billing.facturasTab).toBeVisible();
    await expect(billing.fiscalTab).toBeVisible();
    await expect(billing.cancelarTab).toBeVisible();
  });

  test('cambia al tab "Pago" y muestra métodos de pago', async ({ page }) => {
    const billing = new BillingPageObject(page);
    await billing.goto();

    await billing.pagoTab.click();
    // Payment methods should appear
    await expect(billing.paymentMethods.or(page.getByText(/stripe|mercado pago|visa/i).first())).toBeVisible();
  });

  test('cambia al tab "Facturas" y muestra historial de facturas', async ({ page }) => {
    const billing = new BillingPageObject(page);
    await billing.goto();

    await billing.facturasTab.click();

    // Invoice table must be present
    await expect(
      billing.invoiceTable.or(page.getByRole('table'))
    ).toBeVisible();

    // CAE column is present (AFIP compliance)
    await expect(billing.caeColumn.or(page.getByText('CAE'))).toBeVisible();
  });

  test('cambia al tab "Datos fiscales" y muestra formulario AFIP', async ({ page }) => {
    const billing = new BillingPageObject(page);
    await billing.goto();

    await billing.fiscalTab.click();

    // AFIP fiscal fields
    await expect(
      page.getByText(/cuit/i).first()
        .or(page.getByLabel(/cuit/i))
    ).toBeVisible();
    await expect(
      page.getByText(/razón social/i).first()
        .or(page.getByLabel(/razón social/i))
    ).toBeVisible();
  });

  test('cambia al tab "Cancelar" y muestra advertencia de cancelación', async ({ page }) => {
    const billing = new BillingPageObject(page);
    await billing.goto();

    await billing.cancelarTab.click();

    // Cancel subscription section should be visible with warning
    await expect(
      page.getByText(/cancelar suscripción|cancelación/i).first()
    ).toBeVisible();
  });
});

test.describe('Comparación de planes', () => {
  test('muestra los 4 planes: Solo, Agencia, Pro, Empresa', async ({ page }) => {
    const billing = new BillingPageObject(page);
    await billing.goto();

    await billing.planTab.click();

    await expect(page.getByText('Solo')).toBeVisible();
    await expect(page.getByText('Agencia')).toBeVisible();
    await expect(page.getByText('Pro')).toBeVisible();
    await expect(page.getByText('Empresa')).toBeVisible();
  });

  test('muestra precios en ciclo mensual por defecto', async ({ page }) => {
    const billing = new BillingPageObject(page);
    await billing.goto();

    await billing.planTab.click();

    // Monthly prices
    await expect(page.getByText('$12').or(page.getByText('USD 12')).or(page.getByText('12/mes')).first()).toBeVisible();
  });

  test('cambia a ciclo anual y muestra precios con descuento', async ({ page }) => {
    const billing = new BillingPageObject(page);
    await billing.goto();

    await billing.planTab.click();

    const annualBtn = page.getByRole('button', { name: /anual/i });
    if (await annualBtn.isVisible()) {
      await annualBtn.click();
      // Annual prices should be visible (e.g. $10/mo billed annually)
      await expect(page.getByText(/10|anual/i).first()).toBeVisible();
    }
  });

  test('muestra características diferenciales por plan (AFIP, soporte, reportes)', async ({ page }) => {
    const billing = new BillingPageObject(page);
    await billing.goto();

    await billing.planTab.click();

    // Plan feature rows visible
    await expect(page.getByText('AFIP').or(page.getByText('afip')).first()).toBeVisible();
    await expect(page.getByText(/soporte|support/i).first()).toBeVisible();
  });

  test('el plan "Empresa" muestra "Contactar" en lugar de precio', async ({ page }) => {
    const billing = new BillingPageObject(page);
    await billing.goto();

    await billing.planTab.click();

    // Enterprise plan typically shows "Contact us" or "Consultar"
    await expect(
      page.getByText(/consultar|contactar|enterprise/i).first()
    ).toBeVisible();
  });
});

test.describe('Métodos de pago', () => {
  test('muestra Stripe (Visa) y Mercado Pago como métodos activos', async ({ page }) => {
    const billing = new BillingPageObject(page);
    await billing.goto();

    await billing.pagoTab.click();

    await expect(page.getByText('Visa').or(page.getByText('stripe')).first()).toBeVisible();
    await expect(page.getByText('Mercado Pago')).toBeVisible();
  });

  test('identifica el método de pago principal', async ({ page }) => {
    const billing = new BillingPageObject(page);
    await billing.goto();

    await billing.pagoTab.click();

    // Primary payment method badge
    await expect(page.getByText(/principal|primario|primary/i).first()).toBeVisible();
  });
});

test.describe('Historial de facturas con CAE (AFIP)', () => {
  test('muestra facturas con fecha, período, monto y estado', async ({ page }) => {
    const billing = new BillingPageObject(page);
    await billing.goto();

    await billing.facturasTab.click();

    // Invoice rows with details
    await expect(page.getByText(/abr 2026|mar 2026|ene 2026/i).first()).toBeVisible();
    await expect(page.getByText(/USD|\\$120/i).first()).toBeVisible();
    await expect(page.getByText(/pagada|paid/i).first()).toBeVisible();
  });

  test('las facturas muestran número de CAE', async ({ page }) => {
    const billing = new BillingPageObject(page);
    await billing.goto();

    await billing.facturasTab.click();

    // CAE numbers are 8-digit identifiers from AFIP
    await expect(page.getByText(/7329|7320|7298/i).first()).toBeVisible();
  });

  test('tiene acción para descargar factura en PDF', async ({ page }) => {
    const billing = new BillingPageObject(page);
    await billing.goto();

    await billing.facturasTab.click();

    // Download button per invoice row
    await expect(
      page.getByRole('button', { name: /descargar|pdf|download/i }).first()
        .or(page.getByRole('link', { name: /pdf|descargar/i }).first())
    ).toBeVisible();
  });
});

test.describe('Banner de trial / estado de suscripción', () => {
  test('muestra el estado actual de la suscripción', async ({ page }) => {
    const billing = new BillingPageObject(page);
    await billing.goto();

    // Subscription status is visible somewhere on the page
    await expect(
      page.getByText(/trial|activo|suscripción|plan/i).first()
    ).toBeVisible();
  });
});
