// Service Worker completo para Conecta Pontos PWA
// Suporta: cache offline, Web Push notifications, install

const CACHE_NAME = 'conecta-pontos-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// ── Install: pré-cache dos assets críticos ──────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Ignora erros de cache no install
      });
    })
  );
});

// ── Activate: limpa caches antigos ─────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => clients.claim())
  );
});

// ── Fetch: Network First para API, Cache First para assets ─────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API: sempre network, sem cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request).catch(() =>
      new Response(JSON.stringify({ error: 'Sem conexão com o servidor.' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 503,
      })
    ));
    return;
  }

  // Assets: cache first, fallback para network
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          // Não cachear respostas de erro ou não-básicas
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response;
          }
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Fallback offline: retorna a página principal cacheada
          if (request.destination === 'document') {
            return caches.match('/') || caches.match('/index.html');
          }
          return new Response('', { status: 503 });
        });
    })
  );
});

// ── Push: recebe notificação do servidor e exibe ao usuário ────────────────
self.addEventListener('push', (event) => {
  let data = {
    title: '🕐 Conecta Pontos',
    body: 'Novo registro de ponto.',
    employeeName: '',
    recordType: '',
    timestamp: '',
    companyId: '',
  };

  try {
    data = { ...data, ...event.data.json() };
  } catch (e) {
    data.body = event.data ? event.data.text() : 'Novo registro de ponto.';
  }

  // Mapa de tipos para labels legíveis
  const typeLabels = {
    ENTRADA: '🟢 Entrada',
    SAIDA_ALMOCO: '🟡 Início do Almoço',
    RETORNO_ALMOCO: '🔵 Retorno do Almoço',
    SAIDA: '🔴 Saída',
  };
  const typeLabel = typeLabels[data.recordType] || data.recordType;

  const title = `${typeLabel} — ${data.employeeName}`;
  const body = `Horário: ${data.timestamp}`;

  const options = {
    body,
    icon: '/assets/images/icon.png',
    badge: '/assets/images/favicon.png',
    tag: `ponto-${data.companyId}-${Date.now()}`,  // tag única por empresa+tempo
    requireInteraction: true,  // PERSISTENTE: não desaparece sozinha
    vibrate: [200, 100, 200],
    data: {
      url: '/dashboard',
      companyId: data.companyId,
    },
    actions: [
      { action: 'ver-relatorio', title: '📋 Ver Relatório' },
      { action: 'fechar', title: '✕ Fechar' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ── Notification Click: abre o app ao clicar ───────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'fechar') return;

  const targetUrl = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Tenta focar uma janela já aberta
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Abre nova janela se não houver nenhuma aberta
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
