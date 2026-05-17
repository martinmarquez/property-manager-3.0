#!/usr/bin/env tsx
/**
 * RENA-236: Send beta appreciation email to all beta users.
 *
 * Usage:
 *   pnpm send-beta-email -- --dry-run
 *   pnpm send-beta-email -- --subject-variant=A
 *   pnpm send-beta-email -- --subject-variant=B
 *
 * Required env vars:
 *   RESEND_API_KEY      — Resend API key
 *   DATABASE_URL        — Production Postgres connection string
 *
 * Optional env vars:
 *   EARLY_ACCESS_URL    — CTA link (default: https://corredor.app/early-access)
 *   APP_URL             — Base URL for unsubscribe links
 */

import postgres from 'postgres';
import { render } from '@react-email/render';
import { BetaAppreciationEmail } from '../apps/worker/src/email/beta-appreciation-template.js';

const SUBJECT_A = 'Tu feedback construyó Corredor — gracias';
const SUBJECT_B = 'Porque nos escuchaste, hoy lanzamos';

const RATE_LIMIT_MS = 100; // 10 emails/sec — stays well within Resend free tier limits
const BATCH_SIZE = 50;

async function getBetaUsers(sql: ReturnType<typeof postgres>) {
  return sql<{ id: string; email: string; name: string | null }[]>`
    SELECT u.id, u.email, u.full_name as name
    FROM "user" u
    WHERE u.active = true
      AND u.deleted_at IS NULL
      AND u.email_verified_at IS NOT NULL
      AND u.email NOT LIKE '%test%'
      AND u.email NOT LIKE '%example%'
      AND u.email NOT LIKE '%tennant.%'
      AND u.email NOT LIKE '%.invalid'
      AND u.email NOT LIKE '%@email.com'
    ORDER BY u.created_at ASC
  `;
}

async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  recipientName: string | null;
  dryRun: boolean;
}) {
  if (opts.dryRun) {
    console.log(`[DRY RUN] Would send to: ${opts.to} | Subject: ${opts.subject}`);
    return { id: 'dry-run' };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Corredor <hola@rentals-manager.com>',
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<{ id: string }>;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const variantArg = args.find((a) => a.startsWith('--subject-variant='));
  const variant: 'A' | 'B' = variantArg?.endsWith('B') ? 'B' : 'A';

  if (!dryRun && !process.env.RESEND_API_KEY) {
    console.error('ERROR: RESEND_API_KEY is required');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is required');
    process.exit(1);
  }

  const earlyAccessUrl = process.env.EARLY_ACCESS_URL ?? 'https://corredor.app/early-access';
  const appUrl = process.env.APP_URL ?? 'https://corredor.app';
  const subject = variant === 'B' ? SUBJECT_B : SUBJECT_A;

  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE SEND'}`);
  console.log(`Subject variant: ${variant} — "${subject}"`);

  const sql = postgres(process.env.DATABASE_URL);

  try {
    const users = await getBetaUsers(sql);
    console.log(`Found ${users.length} beta users`);

    if (users.length === 0) {
      console.log('No beta users found — exiting');
      return;
    }

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);

      for (const user of batch) {
        const html = await render(
          BetaAppreciationEmail({
            recipientName: user.name,
            unsubscribeUrl: `${appUrl}/unsubscribe?uid=${user.id}`,
            earlyAccessUrl,
          }) as React.ReactElement
        );

        try {
          const result = await sendEmail({
            to: user.email,
            subject,
            html,
            recipientName: user.name,
            dryRun,
          });
          sent++;
          if (sent % 10 === 0) console.log(`Progress: ${sent}/${users.length} (id=${result.id})`);
        } catch (err) {
          failed++;
          console.error(`Failed for ${user.email}:`, err);
        }

        await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));
      }
    }

    console.log(`\nDone. Sent: ${sent} | Failed: ${failed}`);
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
