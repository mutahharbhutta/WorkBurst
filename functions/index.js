/* ============================
   Firebase Cloud Function for Push Notifications
   Deploy this to Firebase Functions
============================ */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

/* ============================
   Scheduled Function - Runs Every Hour
   Checks for notifications to send
============================ */
exports.sendScheduledNotifications = functions.pubsub
  .schedule('every 1 hours')
  .timeZone('Asia/Karachi')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const oneHourFromNow = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + (60 * 60 * 1000)
    );

    console.log('Checking for scheduled notifications...');

    try {
      const snapshot = await admin.firestore()
        .collection('scheduledNotifications')
        .where('sent', '==', false)
        .where('notificationTime', '<=', oneHourFromNow)
        .get();

      if (snapshot.empty) {
        console.log('No notifications to send');
        return null;
      }

      const notifications = [];
      const batch = admin.firestore().batch();

      for (const doc of snapshot.docs) {
        const data = doc.data();

        if (data.notificationTime.toMillis() <= now.toMillis()) {
          console.log(`Sending notification for: ${data.title}`);

          const payload = {
            notification: {
              title: 'Task Reminder',
              body: `${data.title} is due in 12 hours!`,
              icon: '/icons/icon-192x192.png',
              badge: '/icons/icon-72x72.png',
              requireInteraction: true,
              tag: `task-${doc.id}`,
            },
            data: {
              taskTitle: data.title,
              dueDate: data.dueDate.toDate().toISOString(),
              click_action: '/',
            },
            webpush: {
              fcmOptions: {
                link: '/',
              },
              notification: {
                vibrate: [200, 100, 200],
                requireInteraction: true,
              },
            },
          };

          if (data.fcmToken) {
            notifications.push(
              admin.messaging().send({
                token: data.fcmToken,
                ...payload,
              }).catch((error) => {
                console.error(`Failed to send to ${data.fcmToken}:`, error);
                return null;
              })
            );
          }

          batch.update(doc.ref, {
            sent: true,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      await Promise.all(notifications);
      await batch.commit();

      console.log(`Sent ${notifications.length} notifications`);
      return null;
    } catch (error) {
      console.error('Error sending notifications:', error);
      return null;
    }
  });

/* ============================
   Trigger on New Task Creation
   Automatically schedule notification
============================ */
exports.onTaskCreated = functions.firestore
  .document('items/{itemId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();

    if (data.status !== 'pending' || !data.dueAt) {
      return null;
    }

    try {
      const dueTime = data.dueAt.toMillis();
      const notificationTime = dueTime - (12 * 60 * 60 * 1000);
      const now = Date.now();

      if (notificationTime <= now) {
        console.log('Task due date too soon, skipping notification');
        return null;
      }

      const usersSnapshot = await admin.firestore()
        .collection('users')
        .where('fcmToken', '!=', null)
        .get();

      const batch = admin.firestore().batch();

      usersSnapshot.forEach((userDoc) => {
        const userData = userDoc.data();

        const notificationRef = admin.firestore()
          .collection('scheduledNotifications')
          .doc();

        batch.set(notificationRef, {
          userId: userDoc.id,
          fcmToken: userData.fcmToken,
          taskId: snap.id,
          title: data.title,
          course: data.course || '',
          dueDate: data.dueAt,
          notificationTime: admin.firestore.Timestamp.fromMillis(
            notificationTime
          ),
          sent: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      await batch.commit();
      console.log(`Scheduled notifications for task: ${data.title}`);
      return null;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  });

/* ============================
   Clean up old notifications
   Runs daily to delete sent notifications older than 7 days
============================ */
exports.cleanupOldNotifications = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const sevenDaysAgo = admin.firestore.Timestamp.fromMillis(
      Date.now() - (7 * 24 * 60 * 60 * 1000)
    );

    try {
      const snapshot = await admin.firestore()
        .collection('scheduledNotifications')
        .where('sent', '==', true)
        .where('sentAt', '<=', sevenDaysAgo)
        .get();

      if (snapshot.empty) {
        console.log('No old notifications to clean up');
        return null;
      }

      const batch = admin.firestore().batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`Deleted ${snapshot.size} old notifications`);
      return null;
    } catch (error) {
      console.error('Error cleaning up notifications:', error);
      return null;
    }
  });