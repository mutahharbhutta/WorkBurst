/* ============================
   Service Worker for TaskLog PWA
   Handles caching and push notifications
============================ */

const CACHE_NAME = 'tasklog-v1.0.1';
const urlsToCache = [
  './',
  './index.html',
  './app.js',
  './style.css',
  './timetable.html',
  './timetable.css',
  './timetable.js',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
  'https://www.gstatic.com/firebasejs/12.3.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/12.3.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore-compat.js'
];

/* ============================
   Install Event - Cache Resources
============================ */
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(urlsToCache).catch((error) => {
          console.error('[Service Worker] Cache addAll error:', error);
          // Continue even if some resources fail to cache
          return Promise.resolve();
        });
      })
      .then(() => self.skipWaiting())
  );
});

/* ============================
   Activate Event - Clean Old Caches
============================ */
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

/* ============================
   Fetch Event - Network First, Fall Back to Cache
============================ */
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin) &&
    !event.request.url.startsWith('https://fonts.googleapis.com') &&
    !event.request.url.startsWith('https://www.gstatic.com') &&
    !event.request.url.startsWith('https://fonts.gstatic.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Check if valid response
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseToCache);
          });

        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request);
      })
  );
});

/* ============================
   Push Notification Event
============================ */
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');

  const data = event.data ? event.data.json() : {};
  const title = data.title || 'TaskLog Reminder';
  const options = {
    body: data.body || 'You have a task due soon!',
    icon: './icons/icon-192x192.png',
    badge: './icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'task-reminder',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'View Task',
        icon: './icons/icon-72x72.png'
      },
      {
        action: 'close',
        title: 'Dismiss',
        icon: './icons/icon-72x72.png'
      }
    ],
    data: {
      url: data.url || './',
      taskId: data.taskId
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

/* ============================
   Notification Click Event
============================ */
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked');

  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  } else if (event.action === 'close') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Check if app is already open
          for (let client of clientList) {
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              return client.focus();
            }
          }
          // Open new window if not open
          if (clients.openWindow) {
            return clients.openWindow('./');
          }
        })
    );
  }
});

/* ============================
   Background Sync Event
============================ */
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync triggered');

  if (event.tag === 'sync-tasks') {
    event.waitUntil(syncTasks());
  }
});

async function syncTasks() {
  try {
    console.log('[Service Worker] Syncing tasks...');
    return Promise.resolve();
  } catch (error) {
    console.error('[Service Worker] Sync failed:', error);
    return Promise.reject(error);
  }
}

/* ============================
   Message Event - Communication with App
============================ */
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
    scheduleNotification(event.data.payload);
  }
});

/* ============================
   Schedule Notification Function
============================ */
function scheduleNotification(payload) {
  const { title, body, notificationTime, taskId } = payload;
  const now = Date.now();
  const delay = notificationTime - now;

  if (delay > 0) {
    setTimeout(() => {
      self.registration.showNotification(title, {
        body: body,
        icon: './icons/icon-192x192.png',
        badge: './icons/icon-72x72.png',
        vibrate: [200, 100, 200],
        tag: `task-${taskId}`,
        requireInteraction: true,
        data: {
          url: './',
          taskId: taskId
        }
      });
    }, delay);
  }
}