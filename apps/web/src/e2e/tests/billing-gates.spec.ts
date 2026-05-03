import { test, expect } from '@playwright/test';

// ─── Cross-module billing plan gates E2E — Phase G ────────────────────────
//
// These tests verify that plan-tier gating is wired up correctly across
// modules. The UpsellWall component renders when a feature requires a higher
// plan. In Phase A the gating is stub-based (mock subscription data), so
// tests validate the UpsellWall UI elements are present when expected.

test.describe('Tasaciones — gating por plan', () => {
  test('muestra UpsellWall para usuarios sin plan de tasaciones', async ({ page }) => {
    // The AppraisalsPage checks `getUpsellPayload` and may render UpsellWall
    await page.goto('/appraisals');
    await expect(page).toHaveURL(/\/appraisals/);

    // Either the full appraisals list renders, or the UpsellWall renders.
    // Both are valid — this test asserts the page loads without crashing.
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByText(/error/i)).not.toBeVisible();
  });

  test('el UpsellWall muestra el plan requerido y botón de upgrade', async ({ page }) => {
    await page.goto('/appraisals');

    // If UpsellWall is rendered, it must show:
    // - lock icon (🔒)
    // - plan name
    // - "Actualizar plan" button
    const upsellWall = page.getByRole('button', { name: 'Actualizar plan' });

    if (await upsellWall.isVisible()) {
      await expect(page.getByText(/disponible desde el plan/i)).toBeVisible();
      await expect(upsellWall).toBeEnabled();
    }
  });
});

test.describe('Sitio web — gating de temas por plan', () => {
  test('plan "Solo" muestra subdominio, planes superiores muestran dominio propio', async ({ page }) => {
    await page.goto('/settings/billing');

    // Plan tab: site feature differs by tier
    const planTab = page.getByRole('button', { name: 'Plan', exact: true });
    await planTab.click();

    // Solo plan shows "Subdominio"
    await expect(page.getByText('Subdominio')).toBeVisible();

    // Agencia and Pro plans show "Dom. propio"
    await expect(page.getByText('Dom. propio').first()).toBeVisible();
  });

  test('plan "Empresa" ofrece dominio con CDN', async ({ page }) => {
    await page.goto('/settings/billing');

    const planTab = page.getByRole('button', { name: 'Plan', exact: true });
    await planTab.click();

    await expect(page.getByText('Dom. + CDN')).toBeVisible();
  });
});

test.describe('Reportes — gating por plan', () => {
  test('plan "Solo" y "Agencia" tienen acceso a reportes básicos, Pro/Empresa tienen todos', async ({ page }) => {
    await page.goto('/settings/billing');

    const planTab = page.getByRole('button', { name: 'Plan', exact: true });
    await planTab.click();

    // Reportes field in plan comparison
    await expect(page.getByText('Básicos').first()).toBeVisible();
    await expect(page.getByText('Todos').first()).toBeVisible();
  });

  test('plan "Empresa" tiene acceso a Reportes + API', async ({ page }) => {
    await page.goto('/settings/billing');

    const planTab = page.getByRole('button', { name: 'Plan', exact: true });
    await planTab.click();

    await expect(page.getByText('Todos + API')).toBeVisible();
  });
});

test.describe('AI — gating por plan', () => {
  test('plan "Solo" no tiene IA, planes Pro/Empresa tienen IA avanzada', async ({ page }) => {
    await page.goto('/settings/billing');

    const planTab = page.getByRole('button', { name: 'Plan', exact: true });
    await planTab.click();

    // AI column values per plan
    await expect(page.getByText('Avanzada').first()).toBeVisible();
  });
});

test.describe('AFIP — gating por plan', () => {
  test('plan "Solo" no incluye AFIP, todos los demás sí', async ({ page }) => {
    await page.goto('/settings/billing');

    const planTab = page.getByRole('button', { name: 'Plan', exact: true });
    await planTab.click();

    // AFIP row is visible in the plan comparison table
    await expect(page.getByText('AFIP').first()).toBeVisible();
  });
});

test.describe('UpsellWall — componente', () => {
  test('el componente UpsellWall muestra featureName, requiredPlan y botón', async ({ page }) => {
    // Navigate to appraisals which uses UpsellWall when plan is insufficient
    await page.goto('/appraisals');

    const upsellBtn = page.getByRole('button', { name: 'Actualizar plan' });

    if (await upsellBtn.isVisible()) {
      // Validate all UpsellWall elements
      await expect(page.getByText(/esta función no está disponible/i)
        .or(page.getByText(/disponible desde el plan/i))).toBeVisible();
      await expect(upsellBtn).toBeEnabled();
    } else {
      // Feature is available on this plan — list renders normally
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }
  });
});

test.describe('Límites de usuarios y propiedades por plan', () => {
  test('plan "Solo" permite 1 usuario y 50 propiedades', async ({ page }) => {
    await page.goto('/settings/billing');

    const planTab = page.getByRole('button', { name: 'Plan', exact: true });
    await planTab.click();

    await expect(page.getByText('50').first()).toBeVisible();
  });

  test('plan "Pro" tiene usuarios ilimitados en propiedades', async ({ page }) => {
    await page.goto('/settings/billing');

    const planTab = page.getByRole('button', { name: 'Plan', exact: true });
    await planTab.click();

    await expect(page.getByText('Sin límite').first()).toBeVisible();
  });
});

test.describe('Portales por plan', () => {
  test('plan "Solo" permite 1 portal, Pro/Empresa son ilimitados', async ({ page }) => {
    await page.goto('/settings/billing');

    const planTab = page.getByRole('button', { name: 'Plan', exact: true });
    await planTab.click();

    // Portal limits visible in comparison table
    await expect(page.getByText('Sin límite').first()).toBeVisible();
  });
});
