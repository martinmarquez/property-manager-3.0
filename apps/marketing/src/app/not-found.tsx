import Link from 'next/link';
import { defaultLocale } from '@/lib/i18n/config';

export default function RootNotFound() {
  return (
    <html lang={defaultLocale}>
      <body>
        <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '3rem', fontWeight: 700, margin: 0 }}>404</h1>
            <p style={{ fontSize: '1.25rem', color: '#666', marginTop: '0.5rem' }}>
              Página no encontrada
            </p>
            <Link href="/" style={{ color: '#2563eb', textDecoration: 'underline', marginTop: '1rem', display: 'inline-block' }}>
              Volver al inicio
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
