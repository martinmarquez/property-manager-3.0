import { test, expect } from '@playwright/test';
import { SmartSearchPage } from '../pages/SmartSearchPage.js';

// Navigate to any authenticated route that renders AuthenticatedLayout
const AUTHENTICATED_ROUTE = '/dashboard';

// ---------------------------------------------------------------------------
// Smart Search E2E
// ---------------------------------------------------------------------------

test.describe('Smart Search — CommandPalette', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(AUTHENTICATED_ROUTE);
    // Wait for the layout to mount
    await page.waitForLoadState('networkidle');
  });

  test('Cmd+K abre la paleta de búsqueda', async ({ page }) => {
    const search = new SmartSearchPage(page);
    await search.openWithKeyboard();

    await expect(search.palette).toBeVisible();
    await expect(search.searchInput).toBeFocused();
  });

  test('Ctrl+K también abre la paleta de búsqueda', async ({ page }) => {
    const search = new SmartSearchPage(page);
    await search.openWithCtrl();

    await expect(search.palette).toBeVisible();
  });

  test('Esc cierra la paleta', async ({ page }) => {
    const search = new SmartSearchPage(page);
    await search.openWithKeyboard();
    await expect(search.palette).toBeVisible();

    await search.close();
    await expect(search.palette).not.toBeVisible();
  });

  test('clic en backdrop cierra la paleta', async ({ page }) => {
    const search = new SmartSearchPage(page);
    await search.openWithKeyboard();
    await expect(search.palette).toBeVisible();

    // Click the backdrop (the overlay div behind the palette)
    await page.mouse.click(10, 10);
    await expect(search.palette).not.toBeVisible();
  });

  test('estado vacío muestra instrucciones de teclado', async ({ page }) => {
    const search = new SmartSearchPage(page);
    await search.openWithKeyboard();

    // When no query, shows hint text
    await expect(page.getByText('Empieza a escribir para buscar…')).toBeVisible();
  });

  test('estado ARIA: combobox con aria-expanded=true cuando está abierta', async ({ page }) => {
    const search = new SmartSearchPage(page);
    await search.openWithKeyboard();

    await expect(search.palette).toHaveAttribute('aria-expanded', 'true');
    await expect(search.palette).toHaveAttribute('aria-haspopup', 'listbox');
  });

  test('escribir una consulta actualiza el input', async ({ page }) => {
    const search = new SmartSearchPage(page);
    await search.openWithKeyboard();

    await search.typeQuery('Palermo');
    await expect(search.searchInput).toHaveValue('Palermo');
  });

  test('resultados agrupados por tipo aparecen tras la búsqueda', async ({ page }) => {
    const search = new SmartSearchPage(page);

    // Mock the search endpoint before typing
    await page.route('**/trpc/search**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          result: {
            data: {
              results: [
                {
                  entityType: 'property',
                  entityId: 'prop-uuid-1',
                  title: 'Departamento Palermo 3 amb',
                  subtitle: 'Palermo, CABA · En venta',
                  relevanceScore: 0.92,
                  matchedOn: 'keyword',
                },
                {
                  entityType: 'property',
                  entityId: 'prop-uuid-2',
                  title: 'PH Palermo Hollywood',
                  subtitle: 'Palermo, CABA · En alquiler',
                  relevanceScore: 0.87,
                  matchedOn: 'keyword+semantic',
                },
              ],
              total: 2,
            },
          },
        }]),
      });
    });

    await search.openWithKeyboard();
    await search.typeQuery('Palermo');

    // Wait for results to render
    await expect(search.resultOptions().first()).toBeVisible({ timeout: 5000 });
    const options = search.resultOptions();
    await expect(options).toHaveCount(2);

    // Semantic match badge "AI" should be visible
    await expect(page.getByText('AI').first()).toBeVisible();
  });

  test('referencia exacta aparece como primer resultado', async ({ page }) => {
    const search = new SmartSearchPage(page);
    const refCode = 'PAL-00142';

    await page.route('**/trpc/search**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          result: {
            data: {
              results: [
                {
                  entityType: 'property',
                  entityId: 'prop-ref-1',
                  title: refCode,
                  subtitle: 'Palermo, CABA · En venta',
                  relevanceScore: 1.0,
                  matchedOn: 'keyword',
                },
              ],
              total: 1,
            },
          },
        }]),
      });
    });

    await search.openWithKeyboard();
    await search.typeQuery(refCode);

    const firstOption = search.resultOptions().first();
    await expect(firstOption).toBeVisible({ timeout: 5000 });
    await expect(firstOption).toContainText(refCode);
  });

  test('navegación por teclado: ArrowDown activa el primer item', async ({ page }) => {
    const search = new SmartSearchPage(page);

    await page.route('**/trpc/search**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          result: {
            data: {
              results: [
                {
                  entityType: 'property',
                  entityId: 'prop-nav-1',
                  title: 'Propiedad A',
                  subtitle: 'Belgrano · En venta',
                  relevanceScore: 0.9,
                  matchedOn: 'keyword',
                },
                {
                  entityType: 'property',
                  entityId: 'prop-nav-2',
                  title: 'Propiedad B',
                  subtitle: 'Recoleta · En venta',
                  relevanceScore: 0.85,
                  matchedOn: 'keyword',
                },
              ],
              total: 2,
            },
          },
        }]),
      });
    });

    await search.openWithKeyboard();
    await search.typeQuery('prop');
    await expect(search.resultOptions().first()).toBeVisible({ timeout: 5000 });

    // Navigate down
    await search.pressArrowDown();
    const active = search.activeOption();
    await expect(active).toBeVisible();
    await expect(active).toHaveAttribute('aria-selected', 'true');
  });

  test('sin resultados muestra estado vacío apropiado', async ({ page }) => {
    const search = new SmartSearchPage(page);

    await page.route('**/trpc/search**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          result: { data: { results: [], total: 0 } },
        }]),
      });
    });
    await page.route('**/trpc/search.autocomplete**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ result: { data: [] } }]),
      });
    });

    await search.openWithKeyboard();
    await search.typeQuery('zzz-noresult-zzz');

    await expect(
      page.getByText(/No se encontraron resultados/),
    ).toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// Smart Search — Full Search Page
// ---------------------------------------------------------------------------

test.describe('Smart Search — página completa /search', () => {
  test('la página /search renderiza el campo de búsqueda', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    // SearchPage should render a search input
    const searchInput = page.getByRole('searchbox').or(
      page.locator('input[type="search"], input[placeholder*="Buscar"]').first(),
    );
    await expect(searchInput).toBeVisible();
  });

  test('la URL /search?q= incluye el parámetro de búsqueda', async ({ page }) => {
    await page.goto('/search?q=Palermo&type=property');

    await expect(page).toHaveURL(/\/search/);
    // URL should persist the search params
    expect(page.url()).toContain('q=Palermo');
  });
});
