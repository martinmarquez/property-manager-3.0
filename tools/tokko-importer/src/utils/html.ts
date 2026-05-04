// HTML → plain text stripper for Tokko property descriptions.
// Pure regex, no external dependencies.

const BR_RE = /<br\s*\/?>/gi;
const CLOSING_BLOCK_RE = /<\/(p|div|li|tr|h[1-6])>/gi;
const TAG_RE = /<[^>]+>/g;
const AMP_RE = /&amp;/g;
const LT_RE = /&lt;/g;
const GT_RE = /&gt;/g;
const QUOT_RE = /&quot;/g;
const NBSP_RE = /&nbsp;/g;
const ENTITY_RE = /&#?\w+;/g;
const MULTI_NL_RE = /\n{3,}/g;

export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(BR_RE, '\n')
    .replace(CLOSING_BLOCK_RE, '\n')
    .replace(TAG_RE, '')
    .replace(AMP_RE, '&')
    .replace(LT_RE, '<')
    .replace(GT_RE, '>')
    .replace(QUOT_RE, '"')
    .replace(NBSP_RE, ' ')
    .replace(ENTITY_RE, '')
    .replace(MULTI_NL_RE, '\n\n')
    .trim();
}
