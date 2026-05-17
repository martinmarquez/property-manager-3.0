#!/usr/bin/env tsx
/**
 * RENA-250: Send personalized GA embargo briefing emails to Tier-1 Argentine PropTech outlets.
 *
 * Usage:
 *   RESEND_API_KEY=re_xxx pnpm tsx scripts/send-press-embargo-emails.ts
 *   RESEND_API_KEY=re_xxx pnpm tsx scripts/send-press-embargo-emails.ts --dry-run
 *
 * All 5 emails are pre-personalized and ready to send.
 * Sender: Martín Marquez <martin.marquez@burningman.org>
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const GA_DATE = process.env.GA_DATE ?? '18 de mayo de 2026';

const SENDER_NAME = 'Martín Marquez';
const SENDER_TITLE = 'Fundador & CEO';
const SENDER_EMAIL = 'martin.marquez@burningman.org';
// Send from verified rentals-manager.com domain; reply-to routes responses to Martin's inbox
const FROM_ADDRESS = `${SENDER_NAME} — Corredor <hola@rentals-manager.com>`;

const FOUNDER_QUOTE =
  '"Corredor nació de conversar con cientos de corredores que estaban atrapados en herramientas que no entendían su realidad. Construimos la plataforma que nosotros mismos hubiéramos querido tener — hecha para el mercado argentino, desde cero."';

interface PressContact {
  outlet: string;
  contact: string;
  role: string;
  email: string;
  subject: string;
  intro: string;
  angle: string;
}

const PRESS_CONTACTS: PressContact[] = [
  {
    outlet: 'Reporte Inmobiliario',
    contact: 'José Rozados',
    role: 'Director',
    email: 'joserozados@reporteinmobiliario.com',
    subject: '[EMBARGO] Corredor: la plataforma de gestión inmobiliaria hecha para el corredor argentino — lanzamiento GA',
    intro: 'Estimado José',
    angle: `Como referente indiscutido del sector inmobiliario argentino, sabemos que Reporte Inmobiliario está siempre a la vanguardia de las tendencias que impactan al corredor profesional. Por eso queremos que Reporte Inmobiliario sea el primero en conocer Corredor antes de nuestro lanzamiento oficial.`,
  },
  {
    outlet: 'Infobae Propiedades',
    contact: 'Lucrecia Eterovich',
    role: 'Periodista de Real Estate',
    email: 'leterovich@infobae.com',
    subject: '[EMBARGO] Corredor: la startup argentina que digitaliza al corredor inmobiliario — exclusiva previa al lanzamiento',
    intro: 'Estimada Lucrecia',
    angle: `Millones de argentinos buscan propiedades en Infobae cada mes. Detrás de cada operación hay un corredor que hasta ahora trabajaba con herramientas que no entendían la realidad local. Corredor cambia eso — y creemos que es una historia que le va a interesar a tus lectores.`,
  },
  {
    outlet: 'La Nación Propiedades',
    contact: 'Carla Quiroga',
    role: 'Periodista — Verticales y Eventos',
    email: 'cquiroga@lanacion.com.ar',
    subject: '[EMBARGO] Corredor: tecnología profesional para el mercado inmobiliario argentino — briefing previo al GA',
    intro: 'Estimada Carla',
    angle: `La Nación Propiedades es la referencia para quienes toman decisiones inmobiliarias serias. Corredor lleva esa misma exigencia al lado del profesional: una herramienta diseñada para el corredor argentino que opera con rigor, trazabilidad y cumplimiento de las normativas locales.`,
  },
  {
    outlet: 'Cronista Comercial',
    contact: 'Adrián Mansilla',
    role: 'Editor de Tecnología',
    email: 'amansilla@cronista.com',
    subject: '[EMBARGO] Corredor: PropTech argentino alcanza GA — plataforma nativa para el corredor local',
    intro: 'Estimado Adrián',
    angle: `En el ecosistema PropTech argentino, la mayoría de las soluciones son adaptaciones de plataformas extranjeras que no entienden la operatoria local. Corredor es diferente: nació en Argentina, para el mercado argentino, con arquitectura multi-tenant, integración con el ecosistema de portales local y cumplimiento regulatorio desde el primer día. Una historia de tecnología con raíces locales.`,
  },
  {
    outlet: 'iProfesional Inmobiliario',
    contact: 'Leila Ganem',
    role: 'Periodista de Real Estate',
    email: 'lganem@iprofesional.com',
    subject: '[EMBARGO] Corredor: la plataforma que el corredor argentino estaba esperando — briefing exclusivo',
    intro: 'Estimada Leila',
    angle: `iProfesional sigue de cerca la transformación digital de los sectores productivos argentinos. El sector inmobiliario es uno de los que más lo necesita: el corredor sigue trabajando con planillas, WhatsApp y procesos manuales. Corredor cierra esa brecha con una plataforma integral diseñada específicamente para la operatoria argentina.`,
  },
];

function buildEmailHtml(contact: PressContact, gaDate: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${contact.subject}</title>
</head>
<body style="font-family: Georgia, 'Times New Roman', serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #1a1a1a; background: #ffffff; line-height: 1.7;">

  <div style="border-left: 3px solid #d4a00a; padding-left: 16px; margin-bottom: 32px;">
    <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888; font-family: Arial, sans-serif;">
      ⚠️ BAJO EMBARGO — No publicar antes de ${gaDate}
    </p>
  </div>

  <p>${contact.intro},</p>

  <p>${contact.angle}</p>

  <p>Le escribo para compartirle un briefing exclusivo sobre el lanzamiento de <strong>Corredor</strong> — nuestra plataforma de gestión inmobiliaria diseñada desde cero para el corredor profesional argentino.</p>

  <h2 style="font-size: 18px; margin-top: 32px; border-bottom: 1px solid #eee; padding-bottom: 8px;">Qué es Corredor</h2>

  <p>Corredor es una plataforma SaaS integral que centraliza todo el ciclo de trabajo del corredor: gestión de propiedades, cartera de clientes, publicación automática en portales (Zonaprop, Argenprop, MercadoLibre Inmuebles), seguimiento de operaciones, firma digital, y reportes de gestión — todo en una sola herramienta, en español, con soporte para las particularidades del mercado argentino.</p>

  <ul style="padding-left: 20px; line-height: 2;">
    <li>Sincronización automática con los principales portales argentinos</li>
    <li>Gestión multi-oficina y multi-usuario con roles y permisos</li>
    <li>Cumplimiento regulatorio integrado (CUCICBA, CAPICor, etc.)</li>
    <li>App móvil nativa (iOS y Android)</li>
    <li>Precios en pesos argentinos, soporte local</li>
  </ul>

  <h2 style="font-size: 18px; margin-top: 32px; border-bottom: 1px solid #eee; padding-bottom: 8px;">La voz del fundador</h2>

  <blockquote style="border-left: 4px solid #1a1a1a; margin: 24px 0; padding: 16px 20px; background: #f9f9f9; font-style: italic; color: #333;">
    ${FOUNDER_QUOTE}
    <footer style="margin-top: 12px; font-style: normal; font-size: 13px; color: #666;">
      — <strong>${SENDER_NAME}</strong>, ${SENDER_TITLE}
    </footer>
  </blockquote>

  <h2 style="font-size: 18px; margin-top: 32px; border-bottom: 1px solid #eee; padding-bottom: 8px;">Datos clave del lanzamiento</h2>

  <table style="width: 100%; border-collapse: collapse; font-size: 14px; font-family: Arial, sans-serif;">
    <tr style="background: #f5f5f5;">
      <td style="padding: 10px 12px; border: 1px solid #e0e0e0; font-weight: bold; width: 40%;">Fecha de lanzamiento GA</td>
      <td style="padding: 10px 12px; border: 1px solid #e0e0e0;">${gaDate}</td>
    </tr>
    <tr>
      <td style="padding: 10px 12px; border: 1px solid #e0e0e0; font-weight: bold;">Embargo levanta</td>
      <td style="padding: 10px 12px; border: 1px solid #e0e0e0;">${gaDate} a las 10:00 hs (ARG)</td>
    </tr>
    <tr style="background: #f5f5f5;">
      <td style="padding: 10px 12px; border: 1px solid #e0e0e0; font-weight: bold;">Mercado objetivo</td>
      <td style="padding: 10px 12px; border: 1px solid #e0e0e0;">Corredores inmobiliarios de Argentina</td>
    </tr>
    <tr>
      <td style="padding: 10px 12px; border: 1px solid #e0e0e0; font-weight: bold;">Modelo de negocio</td>
      <td style="padding: 10px 12px; border: 1px solid #e0e0e0;">SaaS — suscripción mensual en pesos</td>
    </tr>
    <tr style="background: #f5f5f5;">
      <td style="padding: 10px 12px; border: 1px solid #e0e0e0; font-weight: bold;">URL</td>
      <td style="padding: 10px 12px; border: 1px solid #e0e0e0;">corredor.app</td>
    </tr>
  </table>

  <h2 style="font-size: 18px; margin-top: 32px; border-bottom: 1px solid #eee; padding-bottom: 8px;">Para ${contact.outlet}</h2>

  <p>Estamos disponibles para una entrevista exclusiva antes del lanzamiento, acceso anticipado a la demo, o cualquier información adicional que necesite para su nota. También podemos coordinar acceso a usuarios beta que ya están usando la plataforma para testimonios.</p>

  <p>Por favor confirme recepción de este briefing y háganos saber si tiene interés en cobertura exclusiva antes del ${gaDate}.</p>

  <p>Quedamos a disposición.</p>

  <p style="margin-top: 32px;">Saludos,</p>
  <p>
    <strong>${SENDER_NAME}</strong><br>
    <span style="color: #555;">${SENDER_TITLE}, Corredor</span><br>
    <a href="mailto:${SENDER_EMAIL}" style="color: #1a1a1a;">${SENDER_EMAIL}</a><br>
    <a href="https://corredor.app" style="color: #1a1a1a;">corredor.app</a>
  </p>

  <hr style="margin-top: 40px; border: none; border-top: 1px solid #eee;">
  <p style="font-size: 11px; color: #999; font-family: Arial, sans-serif; text-align: center;">
    Este mensaje contiene información bajo embargo periodístico.<br>
    Por favor no publicar antes de ${gaDate} a las 10:00 hs (hora Argentina).
  </p>

</body>
</html>`;
}

async function sendEmail(opts: {
  to: string;
  contactName: string;
  subject: string;
  html: string;
  dryRun: boolean;
}): Promise<{ id: string; status: 'sent' | 'dry-run' | 'error'; error?: string }> {
  if (opts.dryRun) {
    console.log(`[DRY RUN] → ${opts.contactName} <${opts.to}>`);
    console.log(`           Subject: ${opts.subject}`);
    return { id: 'dry-run', status: 'dry-run' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [opts.to],
        reply_to: SENDER_EMAIL,
        subject: opts.subject,
        html: opts.html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend error ${res.status}: ${body}`);
    }

    const json = (await res.json()) as { id: string };
    console.log(`✅ Sent → ${opts.contactName} <${opts.to}> (id=${json.id})`);
    return { id: json.id, status: 'sent' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ Failed → ${opts.contactName} <${opts.to}>: ${msg}`);
    return { id: '', status: 'error', error: msg };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  if (!dryRun && !RESEND_API_KEY) {
    console.error('ERROR: RESEND_API_KEY is required. Set it in your environment.');
    console.error('Usage: RESEND_API_KEY=re_xxx pnpm tsx scripts/send-press-embargo-emails.ts');
    process.exit(1);
  }

  console.log(`\n=== Corredor GA Press Embargo Briefing ===`);
  console.log(`Mode:    ${dryRun ? 'DRY RUN' : 'LIVE SEND'}`);
  console.log(`From:    ${FROM_ADDRESS}`);
  console.log(`GA date: ${GA_DATE}`);
  console.log(`Emails:  ${PRESS_CONTACTS.length}\n`);

  const results: Array<{
    outlet: string;
    contact: string;
    email: string;
    status: string;
    resendId: string;
    error?: string;
  }> = [];

  for (const contact of PRESS_CONTACTS) {
    const html = buildEmailHtml(contact, GA_DATE);
    const result = await sendEmail({
      to: contact.email,
      contactName: `${contact.contact} (${contact.outlet})`,
      subject: contact.subject,
      html,
      dryRun,
    });

    results.push({
      outlet: contact.outlet,
      contact: contact.contact,
      email: contact.email,
      status: result.status,
      resendId: result.id,
      error: result.error,
    });

    // 500ms between sends to respect Resend rate limits
    if (!dryRun) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  console.log('\n=== Send Summary ===');
  console.table(
    results.map((r) => ({
      Outlet: r.outlet,
      Contact: r.contact,
      Status: r.status,
      'Resend ID': r.resendId || r.error || '—',
    }))
  );

  const sent = results.filter((r) => r.status === 'sent').length;
  const failed = results.filter((r) => r.status === 'error').length;
  console.log(`\nTotal: ${sent} sent, ${failed} failed, ${results.length - sent - failed} dry-run`);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
