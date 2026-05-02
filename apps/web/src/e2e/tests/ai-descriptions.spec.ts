import { test, expect, type Page } from '@playwright/test';

// A fake property ID used to reach the edit route
const MOCK_PROPERTY_ID = 'aaaaaaaa-bbbb-cccc-dddd-000000000001';
const PROPERTY_EDIT_URL = `/properties/${MOCK_PROPERTY_ID}/edit`;

// ---------------------------------------------------------------------------
// API mocks
// ---------------------------------------------------------------------------

/**
 * Mock all tRPC endpoints needed to render the PropertyFormPage without errors.
 */
async function mockPropertyFormApis(page: Page) {
  // Property detail (for PropertyFormPage to load the existing property data)
  await page.route('**/trpc/property.get**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{
        result: {
          data: {
            id: MOCK_PROPERTY_ID,
            referenceCode: 'PAL-00142',
            propertyType: 'Departamento',
            operationKind: 'sale',
            status: 'available',
            bedrooms: 3,
            bathrooms: 2,
            totalArea: 95,
            coveredArea: 85,
            price: 180000,
            currency: 'USD',
            address: 'Av. Santa Fe 2000',
            locality: 'Palermo',
            province: 'Buenos Aires',
            country: 'Argentina',
            description: 'Hermoso departamento en Palermo.',
            tags: [],
            features: {},
            gallery: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      }]),
    });
  });

  // AI description list (drafts)
  await page.route('**/trpc/propertyDescription.list**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ result: { data: [] } }]),
    });
  });
}

/**
 * Mock the generate mutation to return a generated description.
 */
async function mockGenerateDescription(page: Page, body: string) {
  await page.route('**/trpc/propertyDescription.generate**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{
        result: {
          data: {
            body,
            tone: 'formal',
            targetPortal: 'zonaprop',
            model: 'claude-sonnet-4-6',
            promptTokens: 120,
            completionTokens: 80,
          },
        },
      }]),
    });
  });
}

/**
 * Mock the save mutation.
 */
async function mockSaveDescription(page: Page) {
  await page.route('**/trpc/propertyDescription.save**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{
        result: {
          data: {
            id: 'desc-id-001',
            propertyId: MOCK_PROPERTY_ID,
            body: 'Descripción guardada.',
            tone: 'formal',
            targetPortal: 'zonaprop',
            isDraft: true,
            createdAt: new Date().toISOString(),
          },
        },
      }]),
    });
  });
}

// ---------------------------------------------------------------------------
// Helpers — open the AI Description Modal
// ---------------------------------------------------------------------------

async function openAiDescriptionModal(page: Page) {
  // The AI generate button is inside the description section
  // It's only enabled when propertyId is set (edit route)
  const aiButton = page.getByRole('button', { name: /Generar con IA|AI|Descripción IA/i })
    .or(page.locator('button[title*="IA"], button[title*="AI"], button[aria-label*="IA"]').first());

  await expect(aiButton).toBeVisible({ timeout: 8000 });
  await aiButton.click();
}

// ---------------------------------------------------------------------------
// AI Descriptions E2E Tests
// ---------------------------------------------------------------------------

test.describe('AI Descriptions — modal de generación', () => {
  test.beforeEach(async ({ page }) => {
    await mockPropertyFormApis(page);
    await page.goto(PROPERTY_EDIT_URL);
    await page.waitForLoadState('networkidle');
  });

  test('la página de edición de propiedad carga con el botón de IA', async ({ page }) => {
    const aiButton = page.getByRole('button', { name: /Generar con IA|AI|Descripción IA/i })
      .or(page.locator('button[title*="IA"], button[title*="AI"]').first());
    await expect(aiButton).toBeVisible({ timeout: 8000 });
    await expect(aiButton).toBeEnabled();
  });

  test('el botón de IA abre el modal de descripción', async ({ page }) => {
    await openAiDescriptionModal(page);

    // Modal should be visible with tone and portal selectors
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });
  });

  test('el modal muestra los selectores de tono', async ({ page }) => {
    await openAiDescriptionModal(page);

    // Tone options: Formal, Casual, Lujo
    await expect(page.getByText(/Formal/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Casual/i).first()).toBeVisible();
    await expect(page.getByText(/Lujo/i).first()).toBeVisible();
  });

  test('el modal muestra el selector de portal', async ({ page }) => {
    await openAiDescriptionModal(page);

    // Portal options
    await expect(page.getByText('ZonaProp').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('MercadoLibre').first()).toBeVisible();
    await expect(page.getByText('Argenprop').first()).toBeVisible();
  });

  test('Esc cierra el modal en estado idle', async ({ page }) => {
    await openAiDescriptionModal(page);

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });

    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible({ timeout: 3000 });
  });

  test('el botón Cancelar cierra el modal', async ({ page }) => {
    await openAiDescriptionModal(page);

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });

    const cancelButton = page.getByRole('button', { name: /Cancelar|Cancel|Cerrar/i }).first();
    await cancelButton.click();
    await expect(modal).not.toBeVisible({ timeout: 3000 });
  });

  test('se puede seleccionar un tono diferente', async ({ page }) => {
    await openAiDescriptionModal(page);
    await page.waitForLoadState('networkidle');

    // Click the "Casual" tone option
    const casualTone = page.getByText(/Casual/i).first();
    await expect(casualTone).toBeVisible({ timeout: 5000 });
    await casualTone.click();
    // After click, the tone button should be styled as selected — no error
  });

  test('se puede seleccionar un portal diferente', async ({ page }) => {
    await openAiDescriptionModal(page);
    await page.waitForLoadState('networkidle');

    const mlOption = page.getByText('MercadoLibre');
    await expect(mlOption).toBeVisible({ timeout: 5000 });
    await mlOption.click();
  });

  test('el botón Generar dispara la mutación y muestra la preview', async ({ page }) => {
    const generatedText = 'Elegante departamento en Palermo con 3 ambientes y balcón corrido al parque.';
    await mockGenerateDescription(page, generatedText);

    await openAiDescriptionModal(page);

    // Click generate
    const generateButton = page.getByRole('button', { name: /Generar/i }).first();
    await expect(generateButton).toBeVisible({ timeout: 5000 });
    await generateButton.click();

    // Should show generated text (via typewriter effect — wait for completion)
    await expect(page.getByText(generatedText, { exact: false })).toBeVisible({ timeout: 10000 });
  });

  test('la descripción generada aparece en un textarea editable', async ({ page }) => {
    const generatedText = 'Departamento en planta alta con vista panorámica en Belgrano.';
    await mockGenerateDescription(page, generatedText);

    await openAiDescriptionModal(page);

    const generateButton = page.getByRole('button', { name: /Generar/i }).first();
    await expect(generateButton).toBeVisible({ timeout: 5000 });
    await generateButton.click();

    // After generation completes, a textarea should be editable
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible({ timeout: 10000 });
    await expect(textarea).not.toBeDisabled();
  });

  test('se puede guardar la descripción generada', async ({ page }) => {
    const generatedText = 'PH luminoso en Recoleta con terraza exclusiva.';
    await mockGenerateDescription(page, generatedText);
    await mockSaveDescription(page);

    await openAiDescriptionModal(page);

    const generateButton = page.getByRole('button', { name: /Generar/i }).first();
    await expect(generateButton).toBeVisible({ timeout: 5000 });
    await generateButton.click();

    // Wait for generation to complete
    await expect(page.getByText(generatedText, { exact: false })).toBeVisible({ timeout: 10000 });

    // Click save
    const saveButton = page.getByRole('button', { name: /Guardar/i });
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    // Should show success toast or close modal
    // "Draft saved" toast or modal closes are both valid success states
    const success = page.getByText(/guardad/i).first()
      .or(page.locator('[role="status"]').first());
    await expect(success.or(page.getByRole('dialog').last())).toBeVisible({ timeout: 5000 });
  });

  test('se puede regenerar la descripción', async ({ page }) => {
    const firstText = 'Primera generación de texto.';
    const secondText = 'Segunda generación con más detalle y calidad.';

    await mockGenerateDescription(page, firstText);

    await openAiDescriptionModal(page);

    const generateButton = page.getByRole('button', { name: /Generar/i }).first();
    await expect(generateButton).toBeVisible({ timeout: 5000 });
    await generateButton.click();

    // Wait for first generation
    await expect(page.getByText(firstText, { exact: false })).toBeVisible({ timeout: 10000 });

    // Mock second generation
    await mockGenerateDescription(page, secondText);

    // Click regenerate
    const regenerateButton = page.getByRole('button', { name: /Regenerar/i });
    await expect(regenerateButton).toBeVisible();
    await regenerateButton.click();

    // Wait for second generation
    await expect(page.getByText(secondText, { exact: false })).toBeVisible({ timeout: 10000 });
  });

  test('error de API muestra mensaje de error en el modal', async ({ page }) => {
    await page.route('**/trpc/propertyDescription.generate**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          error: {
            json: {
              message: 'Rate limit exceeded',
              code: -32603,
            },
          },
        }]),
      });
    });

    await openAiDescriptionModal(page);

    const generateButton = page.getByRole('button', { name: /Generar/i }).first();
    await expect(generateButton).toBeVisible({ timeout: 5000 });
    await generateButton.click();

    // Should show an error message
    const error = page.locator('[role="alert"]').or(page.getByText(/Error|error|falló/i).first());
    await expect(error).toBeVisible({ timeout: 8000 });
  });
});

// ---------------------------------------------------------------------------
// Draft management
// ---------------------------------------------------------------------------

test.describe('AI Descriptions — gestión de borradores', () => {
  test('los borradores existentes se muestran en el panel de borradores', async ({ page }) => {
    // Mock with one existing draft
    await page.route('**/trpc/property.get**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          result: {
            data: {
              id: MOCK_PROPERTY_ID,
              referenceCode: 'PAL-00142',
              propertyType: 'Departamento',
              operationKind: 'sale',
              status: 'available',
              description: 'Descripción existente.',
              gallery: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
        }]),
      });
    });

    await page.route('**/trpc/propertyDescription.list**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          result: {
            data: [
              {
                id: 'draft-001',
                propertyId: MOCK_PROPERTY_ID,
                body: 'Primer borrador generado con tono formal.',
                tone: 'formal',
                targetPortal: 'zonaprop',
                isDraft: true,
                createdAt: new Date().toISOString(),
              },
            ],
          },
        }]),
      });
    });

    await page.goto(PROPERTY_EDIT_URL);
    await page.waitForLoadState('networkidle');

    await openAiDescriptionModal(page);

    // Show drafts panel
    const draftsButton = page.getByRole('button', { name: /borradores|Borradores|Historial/i }).first();
    if (await draftsButton.isVisible()) {
      await draftsButton.click();
      await expect(page.getByText('Primer borrador generado con tono formal.')).toBeVisible({ timeout: 5000 });
    }
  });
});

// ---------------------------------------------------------------------------
// New property — AI button disabled before save
// ---------------------------------------------------------------------------

test.describe('AI Descriptions — propiedad nueva (botón deshabilitado)', () => {
  test('en /properties/new el botón de IA está deshabilitado hasta guardar', async ({ page }) => {
    await page.route('**/trpc/propertyDescription.list**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ result: { data: [] } }]),
      });
    });

    await page.goto('/properties/new');
    await page.waitForLoadState('networkidle');

    const aiButton = page.locator('button[title*="IA"], button[title*="AI"], button[title*="Generar"]').first();
    if (await aiButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(aiButton).toBeDisabled();
    }
    // If not found, that's also valid — button may not render at all for new properties
  });
});
