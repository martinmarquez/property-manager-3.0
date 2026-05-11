import { describe, it, expect } from 'vitest';
import { stripHtml } from './html.js';

describe('stripHtml', () => {
  it('strips basic inline tags', () => {
    expect(stripHtml('<b>Hello</b> world')).toBe('Hello world');
  });

  it('converts <br> to newline', () => {
    expect(stripHtml('line one<br>line two')).toBe('line one\nline two');
  });

  it('converts <br/> to newline', () => {
    expect(stripHtml('a<br/>b')).toBe('a\nb');
  });

  it('converts closing block tags to newline', () => {
    expect(stripHtml('<p>paragraph</p>next')).toBe('paragraph\nnext');
  });

  it('converts </div> to newline', () => {
    expect(stripHtml('<div>block</div>after')).toBe('block\nafter');
  });

  it('decodes &amp;', () => {
    expect(stripHtml('a &amp; b')).toBe('a & b');
  });

  it('decodes &lt; and &gt;', () => {
    expect(stripHtml('&lt;tag&gt;')).toBe('<tag>');
  });

  it('decodes &quot;', () => {
    expect(stripHtml('&quot;quoted&quot;')).toBe('"quoted"');
  });

  it('decodes &nbsp; to space', () => {
    expect(stripHtml('a&nbsp;b')).toBe('a b');
  });

  it('collapses 3+ newlines to 2', () => {
    expect(stripHtml('a\n\n\n\nb')).toBe('a\n\nb');
  });

  it('returns empty string for null', () => {
    expect(stripHtml(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(stripHtml(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(stripHtml('')).toBe('');
  });

  it('trims leading and trailing whitespace', () => {
    expect(stripHtml('  <b>text</b>  ')).toBe('text');
  });
});
