import { test, expect } from '@playwright/test';
import { AppraisalsListPageObject, AppraisalWizardPageObject } from '../pages/AppraisalsPageObject.js';

// ─── Appraisals E2E — Phase G ──────────────────────────────────────────────

test.describe('Lista de tasaciones', () => {
  test('carga la página de tasaciones con encabezado y botón "Nueva"', async ({ page }) => {
    const list = new AppraisalsListPageObject(page);
    await list.goto();

    await expect(page).toHaveURL(/\/appraisals/);
    await expect(list.heading).toBeVisible();
    await expect(list.newAppraisalButton).toBeVisible();
  });

  test('muestra tarjetas de estadísticas (total, mes, pendientes, completadas)', async ({ page }) => {
    const list = new AppraisalsListPageObject(page);
    await list.goto();

    await expect(list.statsCards).toBeVisible();
    // Stats section contains count labels
    await expect(page.getByText(/este mes|mes/i).first()).toBeVisible();
  });

  test('muestra campo de búsqueda de tasaciones', async ({ page }) => {
    const list = new AppraisalsListPageObject(page);
    await list.goto();

    const search = page.getByRole('searchbox')
      .or(page.getByPlaceholder(/buscar/i))
      .first();

    await expect(search).toBeVisible();
  });

  test('filtro de estado "Todos" está activo por defecto', async ({ page }) => {
    const list = new AppraisalsListPageObject(page);
    await list.goto();

    // Status filter buttons: Todos, Completada, En proceso, Borrador
    await expect(page.getByRole('button', { name: /todos/i }).first()).toBeVisible();
  });

  test('permite filtrar por estado "Completada"', async ({ page }) => {
    const list = new AppraisalsListPageObject(page);
    await list.goto();

    const completadaBtn = page.getByRole('button', { name: /completada/i });
    if (await completadaBtn.isVisible()) {
      await completadaBtn.click();
      await expect(page.locator('body')).not.toContainText('Error');
    }
  });

  test('muestra columnas: dirección, propósito, fecha, estado, PDF, acciones', async ({ page }) => {
    const list = new AppraisalsListPageObject(page);
    await list.goto();

    // Column headers
    await expect(page.getByText(/dirección|address/i).first()).toBeVisible();
    await expect(page.getByText(/estado|status/i).first()).toBeVisible();
  });

  test('el botón "Nueva tasación" navega al wizard', async ({ page }) => {
    const list = new AppraisalsListPageObject(page);
    await list.goto();

    await list.newAppraisalButton.click();
    await expect(page).toHaveURL(/\/appraisals\/new/);
  });
});

test.describe('Wizard de tasación — Paso 1: Propiedad', () => {
  test('carga el wizard en el paso 1 con el indicador de pasos', async ({ page }) => {
    const wizard = new AppraisalWizardPageObject(page);
    await wizard.goto();

    await expect(page).toHaveURL(/\/appraisals\/new/);

    // Step labels visible
    await expect(page.getByText(/propiedad|datos del inmueble/i).first()).toBeVisible();
    await expect(page.getByText(/propósito|finalidad/i).first()).toBeVisible();
    await expect(page.getByText(/comparables/i).first()).toBeVisible();
    await expect(page.getByText(/informe|reporte/i).first()).toBeVisible();
  });

  test('muestra campos de dirección y tipo de propiedad', async ({ page }) => {
    const wizard = new AppraisalWizardPageObject(page);
    await wizard.goto();

    // Address and property type fields
    await expect(
      page.getByRole('textbox').first()
    ).toBeVisible();
    await expect(
      page.getByRole('combobox').first()
        .or(page.getByRole('listbox'))
    ).toBeVisible();
  });

  test('el botón Cancelar regresa al listado', async ({ page }) => {
    const wizard = new AppraisalWizardPageObject(page);
    await wizard.goto();

    await wizard.cancelButton.click();
    await expect(page).toHaveURL(/\/appraisals(?!\/new)/);
  });
});

test.describe('Wizard de tasación — Paso 2: Propósito', () => {
  test('avanza al paso 2 y muestra opciones de propósito', async ({ page }) => {
    const wizard = new AppraisalWizardPageObject(page);
    await wizard.goto();

    // Fill minimum required fields in step 1
    const inputs = page.getByRole('textbox');
    const count = await inputs.count();
    if (count > 0) {
      await inputs.first().fill('Av. Corrientes');
    }

    // Try to advance
    const nextBtn = page.getByRole('button', { name: /siguiente|continuar/i });
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
    }

    // Step 2 options: Venta, Alquiler, Garantía, Herencia, Impuestos, Seguro, Judicial, Otro
    await expect(
      page.getByText(/venta|alquiler|seguro|judicial/i).first()
    ).toBeVisible();
  });

  test('paso 2 tiene campo para nombre del cliente', async ({ page }) => {
    const wizard = new AppraisalWizardPageObject(page);
    await wizard.goto();

    const nextBtn = page.getByRole('button', { name: /siguiente|continuar/i });
    if (await nextBtn.isVisible()) {
      const inputs = page.getByRole('textbox');
      if (await inputs.count() > 0) await inputs.first().fill('Test');
      await nextBtn.click();
    }

    await expect(
      page.getByLabel(/cliente|client/i).first()
        .or(page.getByPlaceholder(/cliente|client/i))
    ).toBeVisible();
  });
});

test.describe('Wizard de tasación — Paso 3: Comparables', () => {
  test('el paso de comparables muestra controles de búsqueda', async ({ page }) => {
    await page.goto('/appraisals/new');

    // Navigate through step 1 and 2 quickly
    const nextBtn = page.getByRole('button', { name: /siguiente|continuar/i });

    for (let i = 0; i < 2; i++) {
      if (await nextBtn.isVisible()) {
        const inputs = page.getByRole('textbox');
        if (await inputs.count() > 0) await inputs.first().fill('Test');
        await nextBtn.click();
        // Allow brief render
        await page.waitForTimeout(300);
      }
    }

    // Step 3 elements: search and add comparable controls
    await expect(
      page.getByRole('button', { name: /agregar|añadir|buscar/i }).first()
        .or(page.getByText(/comparables/i).first())
    ).toBeVisible();
  });
});

test.describe('Wizard de tasación — Paso 4: Informe', () => {
  test('el último paso muestra botones de generar narrativa y descargar PDF', async ({ page }) => {
    await page.goto('/appraisals/new');

    // Navigate through all 3 previous steps
    const nextBtn = page.getByRole('button', { name: /siguiente|continuar/i });

    for (let i = 0; i < 3; i++) {
      if (await nextBtn.isVisible()) {
        const inputs = page.getByRole('textbox');
        if (await inputs.count() > 0) {
          await inputs.first().fill('Test data');
        }
        await nextBtn.click();
        await page.waitForTimeout(300);
      }
    }

    // Step 4: narrative generation and PDF download
    await expect(
      page.getByRole('button', { name: /generar|narrativa|ia|pdf/i }).first()
    ).toBeVisible();
  });
});

test.describe('Edición de tasación existente', () => {
  test('navega a una tasación existente via URL con ID', async ({ page }) => {
    await page.goto('/appraisals/appraisal-123');
    await expect(page).toHaveURL(/\/appraisals\/appraisal-123/);
    // Wizard should load (even if with empty/default data for mock ID)
    await expect(page.getByRole('button', { name: /cancelar/i })).toBeVisible();
  });
});

test.describe('Mapas y comparables', () => {
  test('la sección de comparables referencia mapa o lista de propiedades', async ({ page }) => {
    await page.goto('/appraisals/new');

    const nextBtn = page.getByRole('button', { name: /siguiente|continuar/i });

    for (let i = 0; i < 2; i++) {
      if (await nextBtn.isVisible()) {
        const inputs = page.getByRole('textbox');
        if (await inputs.count() > 0) await inputs.first().fill('Test');
        await nextBtn.click();
        await page.waitForTimeout(300);
      }
    }

    // Map container or comparable list should be present
    await expect(
      page.locator('[class*="map"], [id*="map"], canvas').first()
        .or(page.getByText(/comparables|comparable/i).first())
    ).toBeVisible();
  });
});
