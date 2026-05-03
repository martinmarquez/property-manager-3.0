import sanitizeHtml from 'sanitize-html';

/**
 * Strips all script-executable content from head HTML.
 * Allows only safe metadata tags: meta, link (stylesheets/icons), title.
 */
export function sanitizeHeadHtml(raw: string): string {
  return sanitizeHtml(raw, {
    allowedTags: ['meta', 'link', 'title'],
    allowedAttributes: {
      meta: ['name', 'content', 'property', 'charset', 'http-equiv'],
      link: ['rel', 'href', 'type', 'sizes', 'crossorigin', 'as', 'media'],
      title: [],
    },
    allowedSchemes: ['https'],
    disallowedTagsMode: 'discard',
  });
}

const DANGEROUS_CSS_PATTERNS = [
  /expression\s*\(/gi,
  /-moz-binding\s*:/gi,
  /behavior\s*:/gi,
  /javascript\s*:/gi,
  /vbscript\s*:/gi,
  /@import\b/gi,
  /url\s*\(\s*['"]?\s*(?:data|javascript|vbscript)\s*:/gi,
];

export function sanitizeCss(raw: string): string {
  let css = raw;
  for (const pattern of DANGEROUS_CSS_PATTERNS) {
    css = css.replace(pattern, '/* blocked */');
  }
  return css;
}
