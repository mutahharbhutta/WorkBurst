/* ============================
   Firebase Messaging Service Worker
   Handles background push notifications PROPERLY
============================ */

importScripts('https://www.gstatic.com/firebasejs/12.3.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.3.0/firebase-messaging-compat.js');

// Initialize Firebase in service worker
firebase.initializeApp({
  apiKey: "AIzaSyAalidbfXTEVwSoDmJDURnISTE563O6BJE",
  authDomain: "task-manager-dd410.firebaseapp.com",
  projectId: "task-manager-dd410",
  storageBucket: "task-manager-dd410.firebasestorage.app",
  messagingSenderId: "419202415333",
  appId: "1:419202415333:web:5c1f0a0a695f6ff973f20c"
});

const messaging = firebase.messaging();

/* ============================
   Handle Background Messages
   This runs when app is closed or in background
============================ */
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);
  
  const notificationTitle = payload.notification?.title || '🔔 WorkBurst Reminder';
  const notificationBody = payload.notification?.body || 'You have a task due soon!';
  
  const notificationOptions = {
    body: notificationBody,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: payload.notification?.tag || 'workburst-reminder',
    requireInteraction: true,
    renotify: true,
    data: {
      url: payload.data?.click_action || '/',
      taskTitle: payload.data?.taskTitle || '',
      dueDate: payload.data?.dueDate || '',
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'view',
        title: '📋 View Tasks',
        icon: '/icons/icon-72x72.png'
      },
      {
        action: 'snooze',
        title: '⏰ Remind in 1 hour',
        icon: '/icons/icon-72x72.png'
      },
      {
        action: 'dismiss',
        title: '✕ Dismiss',
        icon: '/icons/icon-72x72.png'
      }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

/* ============================
   Handle Notification Clicks
============================ */
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'view') {
    // Open the app
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  } else if (event.action === 'snooze') {
    // Re-show notification after 1 hour
    event.waitUntil(
      new Promise((resolve) => {
        setTimeout(() => {
          self.registration.showNotification(event.notification.title, {
            ...event.notification,
            tag: `snoozed-${Date.now()}`
          });
          resolve();
        }, 60 * 60 * 1000); // 1 hour
      })
    );
  } else if (event.action === 'dismiss') {
    // Just close, do nothing
    return;
  } else {
    // Default action - focus or open app
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
            return clients.openWindow(event.notification.data.url || '/');
          }
        })
    );
  }
});

/* ============================
   Handle Push Event (for compatibility)
============================ */
self.addEventListener('push', (event) => {
  console.log('[firebase-messaging-sw.js] Push event received');
  
  if (event.data) {
    try {
      const data = event.data.json();
      
      const notificationTitle = data.notification?.title || '🔔 WorkBurst Reminder';
      const notificationOptions = {
        body: data.notification?.body || 'You have a task due soon!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [200, 100, 200, 100, 200],
        tag: 'workburst-reminder',
        requireInteraction: true,
        data: data.data || {},
        actions: [
          { action: 'view', title: '📋 View Tasks' },
          { action: 'dismiss', title: '✕ Dismiss' }
        ]
      };

      event.waitUntil(
        self.registration.showNotification(notificationTitle, notificationOptions)
      );
    } catch (error) {
      console.error('[firebase-messaging-sw.js] Error handling push:', error);
    }
  }
});

/* ============================
   Periodic Background Sync
   Checks for missed notifications when device comes online
============================ */
self.addEventListener('sync', (event) => {
  console.log('[firebase-messaging-sw.js] Background sync triggered');
  
  if (event.tag === 'check-notifications') {
    event.waitUntil(checkMissedNotifications());
  }
});

async function checkMissedNotifications() {
  console.log('[firebase-messaging-sw.js] Checking for missed notifications...');
  
  try {
    // This will be handled by Firebase Cloud Functions
    // When device comes online, FCM will automatically deliver missed notifications
    return Promise.resolve();
  } catch (error) {
    console.error('[firebase-messaging-sw.js] Error checking notifications:', error);
    return Promise.reject(error);
  }
}

/* ============================
   Handle Service Worker Messages
============================ */
self.addEventListener('message', (event) => {
  console.log('[firebase-messaging-sw.js] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CHECK_NOTIFICATIONS') {
    checkMissedNotifications();
  }
});