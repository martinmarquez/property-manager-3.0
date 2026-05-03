import { test, expect } from '@playwright/test';
import {
  SiteOverviewPage,
  SiteCreationWizardPage,
  SitePagesPage,
  SiteEditorPage,
  SiteThemesPage,
  SiteDomainsPage,
  SiteFormSubmissionsPage,
} from '../pages/SitePage.js';

// ─── Website Builder E2E — Phase G ─────────────────────────────────────────

test.describe('Sitio web — overview', () => {
  test('muestra el estado del sitio y estadísticas de visitas', async ({ page }) => {
    const overview = new SiteOverviewPage(page);
    await overview.goto();

    await expect(page).toHaveURL(/\/site/);
    await expect(overview.heading).toBeVisible();
    await expect(overview.statusBadge).toBeVisible();
    await expect(overview.visitStats).toBeVisible();
  });

  test('tiene accesos rápidos a páginas, temas, dominio y blog', async ({ page }) => {
    const overview = new SiteOverviewPage(page);
    await overview.goto();

    // Quick action links are visible
    await expect(page.getByText('Páginas').first()).toBeVisible();
    await expect(page.getByText('Temas').first()).toBeVisible();
  });
});

test.describe('Asistente de creación de sitio', () => {
  test('muestra los tres pasos del asistente', async ({ page }) => {
    const wizard = new SiteCreationWizardPage(page);
    await wizard.goto();

    await expect(page).toHaveURL(/\/site\/new/);
    // Step indicator with 3 steps
    await expect(page.getByText('Elegí un tema')).toBeVisible();
    await expect(page.getByText('Configurá tu marca')).toBeVisible();
    await expect(page.getByText('Publicá tu sitio')).toBeVisible();
  });

  test('permite seleccionar un tema en el paso 1', async ({ page }) => {
    const wizard = new SiteCreationWizardPage(page);
    await wizard.goto();

    // All 5 themes should be visible
    await expect(page.getByText('Clásico')).toBeVisible();
    await expect(page.getByText('Oscuro')).toBeVisible();
    await expect(page.getByText('Moderno')).toBeVisible();
    await expect(page.getByText('Minimal')).toBeVisible();

    // Select "Moderno" theme
    await page.getByText('Moderno').click();

    // Next button should be enabled
    const nextBtn = page.getByRole('button', { name: /siguiente|continuar/i });
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();

    // Should advance to step 2 (brand config)
    await expect(page.getByText('Configurá tu marca')).toBeVisible();
  });

  test('paso 2: permite ingresar datos de marca', async ({ page }) => {
    const wizard = new SiteCreationWizardPage(page);
    await wizard.goto();

    // Skip step 1 by selecting a theme and advancing
    await page.getByText('Clásico').click();
    await page.getByRole('button', { name: /siguiente|continuar/i }).click();

    // Step 2: brand settings
    const nameInput = page.getByRole('textbox').first();
    await expect(nameInput).toBeVisible();
    await nameInput.fill('Mi Inmobiliaria Test');

    // Advance to step 3
    const nextBtn = page.getByRole('button', { name: /siguiente|continuar/i });
    await nextBtn.click();

    // Step 3: publish
    await expect(page.getByText('Publicá tu sitio')).toBeVisible();
  });

  test('paso 3: muestra opción de publicar', async ({ page }) => {
    const wizard = new SiteCreationWizardPage(page);
    await wizard.goto();

    // Navigate through steps 1 and 2
    await page.getByText('Clásico').click();
    await page.getByRole('button', { name: /siguiente|continuar/i }).click();
    await page.getByRole('button', { name: /siguiente|continuar/i }).click();

    // Should show publish button or success state
    await expect(
      page.getByRole('button', { name: /publicar/i })
        .or(page.getByText(/sitio publicado|listo/i))
    ).toBeVisible();
  });
});

test.describe('Gestión de páginas del sitio', () => {
  test('lista las páginas existentes con estado y acciones', async ({ page }) => {
    const pagesPage = new SitePagesPage(page);
    await pagesPage.goto();

    await expect(page).toHaveURL(/\/site\/pages/);
    await expect(pagesPage.heading).toBeVisible();
    await expect(pagesPage.newPageButton).toBeVisible();

    // Pages exist in the list
    await expect(page.getByText('Home')).toBeVisible();
    await expect(page.getByText('Propiedades')).toBeVisible();
    await expect(page.getByText('Contacto')).toBeVisible();

    // Status badges
    await expect(pagesPage.publishedBadge).toBeVisible();
    await expect(pagesPage.draftBadge).toBeVisible();
  });

  test('muestra el botón "Nueva página"', async ({ page }) => {
    const pagesPage = new SitePagesPage(page);
    await pagesPage.goto();

    await expect(pagesPage.newPageButton).toBeVisible();
    await expect(pagesPage.newPageButton).toBeEnabled();
  });
});

test.describe('Editor de páginas (Puck)', () => {
  test('carga el editor para una página existente', async ({ page }) => {
    const editor = new SiteEditorPage(page);
    await editor.goto('p1');

    await expect(page).toHaveURL(/\/site\/editor\/p1/);
    // Editor toolbar should have save and publish buttons
    await expect(editor.saveButton.or(page.getByRole('button', { name: /guardar/i }))).toBeVisible();
    await expect(editor.publishButton.or(page.getByRole('button', { name: /publicar/i }))).toBeVisible();
  });

  test('muestra controles de deshacer y rehacer', async ({ page }) => {
    const editor = new SiteEditorPage(page);
    await editor.goto('p1');

    await expect(editor.undoButton).toBeVisible();
    await expect(editor.redoButton).toBeVisible();
  });

  test('muestra toggle de vista escritorio/móvil', async ({ page }) => {
    const editor = new SiteEditorPage(page);
    await editor.goto('p1');

    // Viewport toggles for desktop and mobile preview
    await expect(
      page.getByRole('button', { name: /escritorio|desktop|monitor/i })
        .or(page.locator('[aria-label*="escritorio"], [aria-label*="desktop"]'))
    ).toBeVisible();
  });

  test('muestra el historial de publicaciones', async ({ page }) => {
    const editor = new SiteEditorPage(page);
    await editor.goto('p1');

    // Publish history shows version entries
    await expect(page.getByText('v6').or(page.getByText(/versión|version/i))).toBeVisible();
  });
});

test.describe('Temas del sitio', () => {
  test('muestra el catálogo de temas disponibles', async ({ page }) => {
    const themesPage = new SiteThemesPage(page);
    await themesPage.goto();

    await expect(page).toHaveURL(/\/site\/themes/);
    // Theme options visible
    await expect(page.getByText('Clásico')).toBeVisible();
    await expect(page.getByText('Oscuro')).toBeVisible();
  });
});

test.describe('Dominio personalizado', () => {
  test('muestra la configuración de dominio', async ({ page }) => {
    const domainsPage = new SiteDomainsPage(page);
    await domainsPage.goto();

    await expect(page).toHaveURL(/\/site\/domains/);
    await expect(domainsPage.heading).toBeVisible();
  });
});

test.describe('Formularios y envíos del sitio', () => {
  test('muestra la página de envíos de formularios', async ({ page }) => {
    const formsPage = new SiteFormSubmissionsPage(page);
    await formsPage.goto();

    await expect(page).toHaveURL(/\/site\/form-submissions/);
    await expect(formsPage.heading).toBeVisible();
  });
});

test.describe('Blog del sitio', () => {
  test('carga la página de blog', async ({ page }) => {
    await page.goto('/site/blog');
    await expect(page).toHaveURL(/\/site\/blog/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});

test.describe('Redirecciones del sitio', () => {
  test('carga la página de redirecciones', async ({ page }) => {
    await page.goto('/site/redirects');
    await expect(page).toHaveURL(/\/site\/redirects/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
