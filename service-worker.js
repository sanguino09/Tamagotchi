const CACHE_NAME = 'catagotchi-v4';
const OFFLINE_URL = './index.html';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './icons/caticon/icon.png',
  './cat-purr.mp3',
  './little-puff-purr.mp3',
  './little-puff-purr-brr.mp3',
  './meow-1.mp3',
  './meow_QO6VsE6.mp3',
  './the-end-meow-by-nekocat-just-3-second-1.mp3'
];

const REMINDER_DELAY_MS = 1000 * 60 * 90;
const REMINDER_MIN_DELAY_MS = 1000 * 30;
const REMINDER_SYNC_TAG = 'catagotchi-reminder';
const REMINDER_DATA_CACHE = 'catagotchi-reminder-data';
const REMINDER_DATA_KEY = '__catagotchi-reminder__';

async function readReminderData() {
  try {
    const cache = await caches.open(REMINDER_DATA_CACHE);
    const response = await cache.match(REMINDER_DATA_KEY);
    if (!response) {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.warn('No se pudo leer la configuración de recordatorios', error);
    return null;
  }
}

async function writeReminderData(data) {
  try {
    const cache = await caches.open(REMINDER_DATA_CACHE);
    const body = JSON.stringify(data);
    await cache.put(
      REMINDER_DATA_KEY,
      new Response(body, {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      })
    );
  } catch (error) {
    console.warn('No se pudo guardar la configuración de recordatorios', error);
  }
}

async function updateReminderData(update = {}) {
  const current = (await readReminderData()) || {};
  const next = { ...current, ...update };
  if (update.enabled === true) {
    next.enabled = true;
  } else if (update.enabled === false) {
    next.enabled = false;
  } else if (typeof next.enabled !== 'boolean') {
    next.enabled = false;
  }
  if (typeof next.name !== 'string' || next.name.trim() === '') {
    next.name = 'Tu gatito';
  }
  if (typeof next.url !== 'string' || next.url.trim() === '') {
    next.url = './';
  }
  if (typeof next.lastInteraction !== 'number' || !Number.isFinite(next.lastInteraction)) {
    next.lastInteraction = Date.now();
  }
  await writeReminderData(next);
  return next;
}

async function handlePeriodicReminder() {
  const data = await readReminderData();
  if (!data || !data.enabled) {
    return;
  }
  const now = Date.now();
  const lastInteraction = typeof data.lastInteraction === 'number' ? data.lastInteraction : 0;
  if (lastInteraction) {
    const elapsed = now - lastInteraction;
    if (elapsed < REMINDER_MIN_DELAY_MS) {
      return;
    }
    if (elapsed < REMINDER_DELAY_MS) {
      return;
    }
  }
  const name = typeof data.name === 'string' && data.name.trim() ? data.name : 'Tu gatito';
  const title = `¡${name} te echa de menos!`;
  const body = `${name} quiere que vuelvas a jugar un ratito.`;
  try {
    await self.registration.showNotification(title, {
      body,
      icon: 'icons/caticon/icon.png',
      badge: 'icons/caticon/icon.png',
      tag: 'catagotchi-recordatorio',
      renotify: true,
      data: { url: data.url || './' }
    });
    data.lastInteraction = now;
    await writeReminderData(data);
  } catch (error) {
    console.error('No se pudo mostrar el recordatorio en segundo plano', error);
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match(OFFLINE_URL)))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(OFFLINE_URL));
    })
  );
});

self.addEventListener('message', (event) => {
  const { data } = event;
  if (!data || typeof data !== 'object') {
    return;
  }
  if (data.type === 'REMINDER_UPDATE') {
    event.waitUntil(updateReminderData(data.payload || {}));
  }
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === REMINDER_SYNC_TAG) {
    event.waitUntil(handlePeriodicReminder());
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === REMINDER_SYNC_TAG) {
    event.waitUntil(handlePeriodicReminder());
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification && event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            if (targetUrl && client.url !== targetUrl && 'navigate' in client) {
              client.navigate(targetUrl);
            }
            return;
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
        return undefined;
      })
  );
});
