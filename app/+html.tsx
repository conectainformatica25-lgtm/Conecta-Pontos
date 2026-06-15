import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * HTML root configurado para PWA completo:
 * - Meta tags para Android (theme-color, manifest)
 * - Meta tags para iOS (apple-mobile-web-app-capable, touch-icon)
 * - Viewport responsivo
 * - Registro do Service Worker
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />

        {/* ── Viewport responsivo para todos os dispositivos ── */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=5, viewport-fit=cover"
        />

        {/* ── PWA — Geral ── */}
        <meta name="application-name" content="Conecta Pontos" />
        <meta name="description" content="Sistema de registro de ponto eletrônico" />
        <link rel="manifest" href="/manifest.json" />

        {/* ── Android / Chrome ── */}
        <meta name="theme-color" content="#0F52BA" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* ── iOS / Safari ── */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Conecta Pontos" />

        {/* ── iOS Touch Icons (tela inicial) ── */}
        <link rel="apple-touch-icon" href="/assets/images/icon.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/assets/images/icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/assets/images/icon.png" />

        {/* ── iOS Splash Screens ── */}
        <meta name="apple-touch-startup-image" content="/assets/images/splash-icon.png" />

        {/* ── Favicon ── */}
        <link rel="icon" type="image/png" href="/assets/images/favicon.png" />
        <link rel="shortcut icon" href="/assets/images/favicon.png" />

        <ScrollViewStyleReset />
      </head>
      <body>
        {children}

        {/* ── Service Worker Registration ── */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', { scope: '/' })
                    .then(function(registration) {
                      console.log('[SW] Registrado com sucesso. Scope:', registration.scope);
                    })
                    .catch(function(err) {
                      console.warn('[SW] Falha no registro:', err);
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
