import { Providers } from './providers';

export const metadata = {
  title: 'TRT4 - Gestão de Favorecidos',
  description: 'Sistema de Consulta e Gestão de Dados Bancários de Favorecidos - TRT4',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

