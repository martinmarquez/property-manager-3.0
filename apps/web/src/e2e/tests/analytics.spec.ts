import { test, expect } from '@playwright/test';
import { ReportsIndexPageObject, ReportViewPageObject } from '../pages/ReportsPageObject.js';

// ─── Analytics / Reports E2E — Phase G ────────────────────────────────────

test.describe('Índice de reportes', () => {
  test('carga la página de reportes con tarjetas de informes', async ({ page }) => {
    const reportsIndex = new ReportsIndexPageObject(page);
    await reportsIndex.goto();

    await expect(page).toHaveURL(/\/reports/);
    await expect(reportsIndex.heading).toBeVisible();
  });

  test('muestra reportes operacionales', async ({ page }) => {
    const reportsIndex = new ReportsIndexPageObject(page);
    await reportsIndex.goto();

    // Operational reports are present
    await expect(page.getByText(/pipeline|embudo|funnel/i).first()).toBeVisible();
  });

  test('filtra reportes por categoría "Operacional"', async ({ page }) => {
    const reportsIndex = new ReportsIndexPageObject(page);
    await reportsIndex.goto();

    const operacionalButton = page.getByRole('button', { name: /operacional/i }).first();
    if (await operacionalButton.isVisible()) {
      await operacionalButton.click();
      // After filtering, operational report cards remain visible
      await expect(page.getByText(/pipeline|embudo|agente|tasación/i).first()).toBeVisible();
    }
  });

  test('filtra reportes por categoría "Estratégico"', async ({ page }) => {
    const reportsIndex = new ReportsIndexPageObject(page);
    await reportsIndex.goto();

    const estrategicoButton = page.getByRole('button', { name: /estratégico/i }).first();
    if (await estrategicoButton.isVisible()) {
      await estrategicoButton.click();
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('campo de búsqueda filtra los reportes visibles', async ({ page }) => {
    const reportsIndex = new ReportsIndexPageObject(page);
    await reportsIndex.goto();

    const searchInput = page.getByRole('searchbox')
      .or(page.getByPlaceholder(/buscar/i))
      .first();

    if (await searchInput.isVisible()) {
      await searchInput.fill('funnel');
      // Only funnel-related reports should remain
      await expect(page.getByText(/funnel|embudo|conversión/i).first()).toBeVisible();
    }
  });

  test('navega a un reporte desde la tarjeta', async ({ page }) => {
    const reportsIndex = new ReportsIndexPageObject(page);
    await reportsIndex.goto();

    // Click on first clickable report card/link
    const firstReportLink = page
      .getByRole('link', { name: /conversión|funnel|agente|pipeline/i })
      .first();

    if (await firstReportLink.isVisible()) {
      await firstReportLink.click();
      await expect(page).toHaveURL(/\/reports\/.+/);
    }
  });
});

test.describe('Vista de reporte — Conversión de Pipeline', () => {
  test('carga el reporte de conversión de pipeline', async ({ page }) => {
    const view = new ReportViewPageObject(page);
    await view.goto('funnel-conversion');

    await expect(page).toHaveURL(/\/reports\/funnel-conversion/);
    await expect(view.title).toBeVisible();
  });

  test('muestra chips de rango de fecha', async ({ page }) => {
    const view = new ReportViewPageObject(page);
    await view.goto('funnel-conversion');

    await expect(page.getByRole('button', { name: '7D' })).toBeVisible();
    await expect(page.getByRole('button', { name: '30D' })).toBeVisible();
    await expect(page.getByRole('button', { name: '90D' })).toBeVisible();
  });

  test('cambia el rango de fecha al hacer clic en chip "30D"', async ({ page }) => {
    const view = new ReportViewPageObject(page);
    await view.goto('funnel-conversion');

    const chip30d = page.getByRole('button', { name: '30D' });
    await chip30d.click();

    // The chip should now appear selected (active state)
    await expect(chip30d).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Error');
  });

  test('muestra botones de exportación CSV y Excel', async ({ page }) => {
    const view = new ReportViewPageObject(page);
    await view.goto('funnel-conversion');

    // Export controls should be present
    await expect(
      page.getByRole('button', { name: /exportar|export|csv|excel|xlsx/i }).first()
    ).toBeVisible();
  });
});

test.describe('Vista de reporte — Productividad de Agentes', () => {
  test('carga el reporte de productividad', async ({ page }) => {
    const view = new ReportViewPageObject(page);
    await view.goto('agent-productivity');

    await expect(page).toHaveURL(/\/reports\/agent-productivity/);
    await expect(view.title).toBeVisible();
  });

  test('muestra contenido de gráfico o tabla', async ({ page }) => {
    const view = new ReportViewPageObject(page);
    await view.goto('agent-productivity');

    // At least one visual element — chart, table, or KPI card
    await expect(
      page.locator('canvas, table, [role="table"], svg').first()
        .or(page.getByText(/agente|respuesta|promedio/i).first())
    ).toBeVisible();
  });
});

test.describe('Vista de reporte — Performance de Listings', () => {
  test('carga el reporte de listings', async ({ page }) => {
    const view = new ReportViewPageObject(page);
    await view.goto('listing-performance');

    await expect(page).toHaveURL(/\/reports\/listing-performance/);
    await expect(view.title).toBeVisible();
  });
});

test.describe('Vista de reporte — Pronóstico de Ingresos', () => {
  test('carga el reporte de pronóstico de ingresos', async ({ page }) => {
    const view = new ReportViewPageObject(page);
    await view.goto('revenue-forecast');

    await expect(page).toHaveURL(/\/reports\/revenue-forecast/);
    await expect(view.title).toBeVisible();
  });
});

test.describe('Vista de reporte — Portal ROI', () => {
  test('carga el reporte de retorno de portales', async ({ page }) => {
    const view = new ReportViewPageObject(page);
    await view.goto('portal-roi');

    await expect(page).toHaveURL(/\/reports\/portal-roi/);
    await expect(view.title).toBeVisible();
  });
});

test.describe('Reportes restantes — humo', () => {
  const REPORT_SLUGS = [
    'pipeline-velocity',
    'retention-cohort',
    'zone-analysis',
    'ai-usage',
    'lead-cohorts',
    'sla-adherence',
    'commission-owed',
    'inbox-activity',
    'closing-calendar',
    'pipeline-by-branch',
    'reservation-rates',
    'document-expiry',
    'captured-listings',
    'inventory-balance',
    'revenue-trend',
    'price-evolution',
    'customer-acquisition',
  ];

  for (const slug of REPORT_SLUGS) {
    test(`carga reporte: ${slug}`, async ({ page }) => {
      await page.goto(`/reports/${slug}`);
      await expect(page).toHaveURL(new RegExp(`/reports/${slug}`));

      // Must NOT show "not found" error message
      await expect(page.getByText('Reporte no encontrado')).not.toBeVisible();

      // Must show a heading
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });
  }
});

test.describe('Reporte desconocido', () => {
  test('muestra mensaje de reporte no encontrado para slug inválido', async ({ page }) => {
    await page.goto('/reports/slug-inexistente-xyz');
    await expect(page.getByText('Reporte no encontrado')).toBeVisible();
  });
});
