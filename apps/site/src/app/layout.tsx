import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Corredor',
  description: 'La plataforma para corredores inmobiliarios argentinos',
};

export default function RootLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
