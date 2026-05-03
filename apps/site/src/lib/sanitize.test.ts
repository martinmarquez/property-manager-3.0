import { describe, it, expect } from 'vitest';
import { sanitizeHeadHtml, sanitizeCss } from './sanitize';

describe('sanitizeHeadHtml', () => {
  it('strips script tags entirely', () => {
    const input = '<script>alert("xss")</script>';
    expect(sanitizeHeadHtml(input)).toBe('');
  });

  it('strips inline event handlers', () => {
    const input = '<meta name="desc" content="ok" onload="alert(1)">';
    const result = sanitizeHeadHtml(input);
    expect(result).not.toContain('onload');
    expect(result).toContain('name="desc"');
  });

  it('allows safe meta tags', () => {
    const input = '<meta name="description" content="A site">';
    expect(sanitizeHeadHtml(input)).toContain('meta');
    expect(sanitizeHeadHtml(input)).toContain('description');
  });

  it('allows safe link tags (stylesheet)', () => {
    const input = '<link rel="stylesheet" href="https://example.com/style.css">';
    expect(sanitizeHeadHtml(input)).toContain('link');
    expect(sanitizeHeadHtml(input)).toContain('stylesheet');
  });

  it('strips javascript: URLs from link href', () => {
    const input = '<link rel="stylesheet" href="javascript:alert(1)">';
    const result = sanitizeHeadHtml(input);
    expect(result).not.toContain('javascript');
  });

  it('strips img tags (not allowed in head)', () => {
    const input = '<img src=x onerror="alert(1)">';
    expect(sanitizeHeadHtml(input)).toBe('');
  });

  it('strips iframe tags', () => {
    const input = '<iframe src="https://evil.com"></iframe>';
    expect(sanitizeHeadHtml(input)).toBe('');
  });

  it('strips style tags with JS expressions', () => {
    const input = '<style>body{background:url("javascript:alert(1)")}</style>';
    expect(sanitizeHeadHtml(input)).toBe('');
  });
});

describe('sanitizeCss', () => {
  it('allows normal CSS rules', () => {
    const input = 'body { color: red; font-size: 16px; }';
    expect(sanitizeCss(input)).toBe(input);
  });

  it('blocks expression() calls', () => {
    const input = 'div { width: expression(document.body.clientWidth); }';
    expect(sanitizeCss(input)).not.toContain('expression(');
  });

  it('blocks -moz-binding', () => {
    const input = 'div { -moz-binding: url("https://evil.com/xbl"); }';
    expect(sanitizeCss(input)).not.toContain('-moz-binding');
  });

  it('blocks @import directives', () => {
    const input = '@import url("https://evil.com/steal.css"); body { color: red; }';
    const result = sanitizeCss(input);
    expect(result).not.toContain('@import');
    expect(result).toContain('color: red');
  });

  it('blocks javascript: in url()', () => {
    const input = 'div { background: url("javascript:alert(1)"); }';
    expect(sanitizeCss(input)).not.toContain('javascript');
  });

  it('blocks data: URI in url()', () => {
    const input = 'div { background: url("data:text/html,<script>alert(1)</script>"); }';
    expect(sanitizeCss(input)).not.toContain('data:');
  });

  it('blocks behavior property', () => {
    const input = 'div { behavior: url(xss.htc); }';
    expect(sanitizeCss(input)).not.toContain('behavior');
  });
});
