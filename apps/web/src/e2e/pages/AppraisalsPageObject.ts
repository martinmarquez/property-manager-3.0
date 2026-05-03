import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object: Appraisals module (/appraisals and /appraisals/new)
 */
export class AppraisalsListPageObject {
  readonly page: Page;
  readonly heading: Locator;
  readonly newAppraisalButton: Locator;
  readonly searchInput: Locator;
  readonly statusFilter: Locator;
  readonly statsCards: Locator;
  readonly appraisalRows: Locator;
  readonly exportButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1 });
    this.newAppraisalButton = page.getByRole('button', { name: /nueva tasación|nueva|new/i });
    this.searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/buscar/i));
    this.statusFilter = page.getByRole('button', { name: /todos|all/i }).first();
    this.statsCards = page.getByText(/total/i).first();
    this.appraisalRows = page.getByRole('row').or(page.locator('[data-testid="appraisal-row"]'));
    this.exportButton = page.getByRole('button', { name: /exportar/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/appraisals');
  }
}

export class AppraisalWizardPageObject {
  readonly page: Page;

  // Navigation
  readonly cancelButton: Locator;
  readonly nextButton: Locator;
  readonly backButton: Locator;
  readonly saveButton: Locator;

  // Step indicator
  readonly step1: Locator;
  readonly step2: Locator;
  readonly step3: Locator;
  readonly step4: Locator;

  // Step 1 — Property Details
  readonly addressStreetInput: Locator;
  readonly addressNumberInput: Locator;
  readonly localityInput: Locator;
  readonly propertyTypeSelect: Locator;
  readonly coveredAreaInput: Locator;
  readonly roomsInput: Locator;

  // Step 2 — Purpose
  readonly purposeSaleOption: Locator;
  readonly purposeRentOption: Locator;
  readonly notesTextarea: Locator;
  readonly clientNameInput: Locator;

  // Step 3 — Comparables
  readonly compsSearch: Locator;
  readonly compsAddButton: Locator;
  readonly selectedCompsCount: Locator;

  // Step 4 — Report
  readonly generateNarrativeButton: Locator;
  readonly narrativeText: Locator;
  readonly valueMinInput: Locator;
  readonly valueMaxInput: Locator;
  readonly downloadPdfButton: Locator;
  readonly finalizeButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.cancelButton = page.getByRole('button', { name: /cancelar/i });
    this.nextButton = page.getByRole('button', { name: /siguiente|continuar/i });
    this.backButton = page.getByRole('button', { name: /anterior|atrás|volver/i });
    this.saveButton = page.getByRole('button', { name: /guardar/i });

    this.step1 = page.getByText(/propiedad|datos/i, { exact: false }).first();
    this.step2 = page.getByText(/propósito|finalidad/i, { exact: false }).first();
    this.step3 = page.getByText(/comparables/i).first();
    this.step4 = page.getByText(/informe|reporte/i, { exact: false }).first();

    this.addressStreetInput = page.getByLabel(/calle|dirección|street/i).first();
    this.addressNumberInput = page.getByLabel(/número|number/i).first();
    this.localityInput = page.getByLabel(/localidad|ciudad|locality/i).first();
    this.propertyTypeSelect = page.getByRole('combobox').first();
    this.coveredAreaInput = page.getByLabel(/cubierta|covered/i).first();
    this.roomsInput = page.getByLabel(/ambientes|rooms/i).first();

    this.purposeSaleOption = page.getByRole('button', { name: /venta|sale/i }).first();
    this.purposeRentOption = page.getByRole('button', { name: /alquiler|rent/i }).first();
    this.notesTextarea = page.getByRole('textbox', { name: /notas|notes/i }).first();
    this.clientNameInput = page.getByLabel(/cliente|client/i).first();

    this.compsSearch = page.getByPlaceholder(/buscar comparables/i).or(page.getByRole('searchbox'));
    this.compsAddButton = page.getByRole('button', { name: /agregar|añadir/i }).first();
    this.selectedCompsCount = page.getByText(/seleccionados|selected/i);

    this.generateNarrativeButton = page.getByRole('button', { name: /generar|narrativa|ia/i });
    this.narrativeText = page.getByRole('textbox', { name: /narrativa/i }).or(page.locator('textarea')).first();
    this.valueMinInput = page.getByLabel(/mínimo|min/i).first();
    this.valueMaxInput = page.getByLabel(/máximo|max/i).first();
    this.downloadPdfButton = page.getByRole('button', { name: /descargar pdf|pdf/i });
    this.finalizeButton = page.getByRole('button', { name: /finalizar|completar/i });
  }

  async goto(appraisalId?: string): Promise<void> {
    await this.page.goto(appraisalId ? `/appraisals/${appraisalId}` : '/appraisals/new');
  }
}
