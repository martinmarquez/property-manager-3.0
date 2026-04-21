import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object: RegisterFlow (3-step wizard at /register)
 *
 * Step 0 — Tu cuenta  : Nombre, Apellido, Email, Contraseña, Confirmar contraseña
 * Step 1 — Tu agencia : Nombre de la inmobiliaria / agencia, CUIT, Provincia, Teléfono
 * Step 2 — Equipo     : Optional invite emails → "Crear cuenta"
 *
 * Label text is in Spanish — matches the RegisterFlow component in @corredor/ui.
 */
export class RegisterPage {
  readonly page: Page;

  // Step 0 — Tu cuenta
  readonly nombreInput: Locator;
  readonly apellidoInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;

  // Step 1 — Tu agencia
  readonly agencyNameInput: Locator;
  readonly cuitInput: Locator;
  readonly provinciaSelect: Locator;

  // Step 2 — Equipo
  readonly inviteEmailInput: Locator;

  // Shared
  readonly continueButton: Locator;
  readonly createAccountButton: Locator;
  readonly inviteButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Step 0
    this.nombreInput = page.getByLabel('Nombre', { exact: true });
    this.apellidoInput = page.getByLabel('Apellido');
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Contraseña', { exact: true });
    this.confirmPasswordInput = page.getByLabel('Confirmar contraseña');

    // Step 1
    this.agencyNameInput = page.getByLabel('Nombre de la inmobiliaria / agencia');
    this.cuitInput = page.getByLabel('CUIT');
    this.provinciaSelect = page.getByLabel('Provincia');

    // Step 2
    this.inviteEmailInput = page.getByPlaceholder('colega@inmobiliaria.com');

    // Shared nav buttons
    this.continueButton = page.getByRole('button', { name: 'Continuar' });
    this.createAccountButton = page.getByRole('button', { name: /Crear cuenta/ });
    this.inviteButton = page.getByRole('button', { name: /Agregar/ });
  }

  async goto(): Promise<void> {
    await this.page.goto('/register');
  }

  /** Complete all 3 steps and submit. */
  async register(opts: {
    nombre: string;
    apellido: string;
    email: string;
    password: string;
    agencyName: string;
    cuit: string;
    provincia: string;
  }): Promise<void> {
    // Step 0 — Tu cuenta
    await this.nombreInput.fill(opts.nombre);
    await this.apellidoInput.fill(opts.apellido);
    await this.emailInput.fill(opts.email);
    await this.passwordInput.fill(opts.password);
    await this.confirmPasswordInput.fill(opts.password);
    await this.continueButton.click();

    // Step 1 — Tu agencia
    await this.agencyNameInput.fill(opts.agencyName);
    await this.cuitInput.fill(opts.cuit);
    await this.provinciaSelect.selectOption(opts.provincia);
    await this.continueButton.click();

    // Step 2 — Equipo (skip invites)
    await this.createAccountButton.click();
  }

  /** Add an invite email on step 2. Assumes step 2 is active. */
  async inviteTeamMember(email: string): Promise<void> {
    await this.inviteEmailInput.fill(email);
  }
}
