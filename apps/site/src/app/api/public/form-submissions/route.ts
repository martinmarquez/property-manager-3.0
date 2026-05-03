import { NextRequest, NextResponse } from 'next/server';
import { eq, and, isNull } from 'drizzle-orm';
import { site, siteFormSubmission } from '@corredor/db';
import { getDb } from '../../../../lib/db';

interface SubmissionBody {
  siteId: string;
  pageId?: string;
  blockId?: string;
  data: Record<string, unknown>;
  recaptchaToken?: string;
}

export async function POST(request: NextRequest) {
  let body: SubmissionBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.siteId || !body.data || typeof body.data !== 'object') {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const db = getDb();

  const sites = await db
    .select({ id: site.id, tenantId: site.tenantId })
    .from(site)
    .where(and(eq(site.id, body.siteId), isNull(site.deletedAt)))
    .limit(1);

  if (!sites[0]) {
    return NextResponse.json({ error: 'site_not_found' }, { status: 404 });
  }

  const tenantId = sites[0].tenantId;

  let recaptchaScore: number | null = null;
  const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
  if (body.recaptchaToken && recaptchaSecret) {
    try {
      const verifyUrl = new URL('https://www.google.com/recaptcha/api/siteverify');
      verifyUrl.searchParams.set('secret', recaptchaSecret);
      verifyUrl.searchParams.set('response', body.recaptchaToken);

      const verifyRes = await fetch(verifyUrl.toString(), { method: 'POST' });
      const verifyData = await verifyRes.json() as { success: boolean; score?: number };

      if (verifyData.success && verifyData.score != null) {
        recaptchaScore = verifyData.score;
      }
    } catch {
      // reCAPTCHA verification failed silently — still accept submission
    }
  }

  const flaggedAsSpam = recaptchaScore != null && recaptchaScore < 0.3;

  const ip = request.headers.get('cf-connecting-ip')
    ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? null;

  const userAgent = request.headers.get('user-agent') ?? null;

  await db.insert(siteFormSubmission).values({
    tenantId,
    siteId: body.siteId,
    pageId: body.pageId ?? null,
    blockId: body.blockId ?? null,
    data: body.data,
    ip,
    userAgent,
    recaptchaScore: recaptchaScore != null ? String(recaptchaScore) : null,
    flaggedAsSpam,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
