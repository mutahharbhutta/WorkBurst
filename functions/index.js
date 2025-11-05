const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Scheduled function to send push notifications
 * Runs every 1 minute to check for pending notifications
 * FIXED: Better error handling and token validation
 */
exports.sendScheduledNotifications = functions.pubsub
  .schedule('every 1 minutes')
  .timeZone('UTC')
  .onRun(async (context) => {
    console.log('[ClassSync] Checking for scheduled notifications...');
    
    const now = admin.firestore.Timestamp.now();
    const fiveMinutesAgo = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 5 * 60 * 1000)
    );
    
    try {
      // Get notifications that should be sent now
      const snapshot = await admin.firestore()
        .collection('scheduledNotifications')
        .where('sent', '==', false)
        .where('notificationTime', '<=', now)
        .where('notificationTime', '>=', fiveMinutesAgo)
        .limit(100)
        .get();
      
      if (snapshot.empty) {
        console.log('[ClassSync] No notifications to send');
        return null;
      }
      
      console.log(`[ClassSync] Found ${snapshot.size} notifications to send`);
      
      const promises = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // Validate FCM token exists
        if (!data.fcmToken) {
          console.error(`[ClassSync] No FCM token for notification ${doc.id}`);
          promises.push(doc.ref.update({ 
            sent: true, 
            error: 'No FCM token',
            sentAt: admin.firestore.FieldValue.serverTimestamp()
          }));
          return;
        }
        
        // Format due date
        const dueDate = data.dueDate.toDate();
        const dateStr = dueDate.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        // Prepare FCM message
        const message = {
          notification: {
            title: '⏰ ClassSync Reminder',
            body: `"${data.title}" is due in 12 hours!\nDue: ${dateStr}`
          },
          data: {
            taskTitle: data.title,
            dueDate: data.dueDate.toDate().toISOString(),
            notificationId: doc.id,
            click_action: 'https://mutahharbhutta.github.io/ClassSync/'
          },
          token: data.fcmToken,
          webpush: {
            notification: {
              icon: '/icons/icon-192x192.png',
              badge: '/icons/icon-72x72.png',
              vibrate: [200, 100, 200],
              requireInteraction: true,
              tag: 'classsync-reminder',
              renotify: true
            },
            fcmOptions: {
              link: 'https://mutahharbhutta.github.io/ClassSync/'
            }
          }
        };
        
        // Send notification
        promises.push(
          admin.messaging().send(message)
            .then(() => {
              console.log(`[ClassSync] ✅ Notification sent: ${data.title}`);
              return doc.ref.update({ 
                sent: true, 
                sentAt: admin.firestore.FieldValue.serverTimestamp() 
              });
            })
            .catch((error) => {
              console.error(`[ClassSync] ❌ Error sending notification for ${doc.id}:`, error.code, error.message);
              
              // Mark as sent to avoid retry loops, but log the error
              return doc.ref.update({ 
                sent: true, 
                error: `${error.code}: ${error.message}`,
                sentAt: admin.firestore.FieldValue.serverTimestamp()
              });
            })
        );
      });
      
      await Promise.all(promises);
      console.log(`[ClassSync] ✅ Processed ${promises.length} notifications`);
      return null;
      
    } catch (error) {
      console.error('[ClassSync] ❌ Error in sendScheduledNotifications:', error);
      return null;
    }
  });

/**
 * Clean up old sent notifications
 * Runs daily at midnight UTC
 */
exports.cleanupOldNotifications = functions.pubsub
  .schedule('every 24 hours')
  .timeZone('UTC')
  .onRun(async (context) => {
    console.log('[ClassSync] Cleaning up old notifications...');
    
    // Delete notifications older than 7 days
    const cutoff = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    
    try {
      const snapshot = await admin.firestore()
        .collection('scheduledNotifications')
        .where('sent', '==', true)
        .where('createdAt', '<', cutoff)
        .limit(500)
        .get();
      
      if (snapshot.empty) {
        console.log('[ClassSync] No old notifications to clean up');
        return null;
      }
      
      console.log(`[ClassSync] Deleting ${snapshot.size} old notifications`);
      
      const batch = admin.firestore().batch();
      snapshot.forEach((doc) => batch.delete(doc.ref));
      
      await batch.commit();
      console.log('[ClassSync] ✅ Cleanup completed successfully');
      return null;
      
    } catch (error) {
      console.error('[ClassSync] ❌ Error in cleanupOldNotifications:', error);
      return null;
    }
  });

/**
 * Delete scheduled notifications when task is deleted
 * Triggered on item deletion
 */
exports.onTaskDelete = functions.firestore
  .document('items/{itemId}')
  .onDelete(async (snap, context) => {
    const taskData = snap.data();
    const taskTitle = taskData.title;
    
    if (!taskTitle) {
      console.log('[ClassSync] No title found for deleted task');
      return null;
    }
    
    try {
      // Find and delete associated notifications
      const notifications = await admin.firestore()
        .collection('scheduledNotifications')
        .where('title', '==', taskTitle)
        .where('sent', '==', false)
        .get();
      
      if (notifications.empty) {
        console.log(`[ClassSync] No notifications found for task: ${taskTitle}`);
        return null;
      }
      
      const batch = admin.firestore().batch();
      notifications.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      
      console.log(`[ClassSync] ✅ Deleted ${notifications.size} notifications for: ${taskTitle}`);
      return null;
      
    } catch (error) {
      console.error('[ClassSync] ❌ Error deleting notifications:', error);
      return null;
    }
  });

/**
 * Clean up stale presence records
 * Runs every hour
 */
exports.cleanupPresence = functions.pubsub
  .schedule('every 1 hours')
  .timeZone('UTC')
  .onRun(async (context) => {
    console.log('[ClassSync] Cleaning up stale presence records...');
    
    // Delete presence records older than 10 minutes
    const cutoff = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 10 * 60 * 1000)
    );
    
    try {
      const snapshot = await admin.firestore()
        .collection('presence')
        .where('lastSeen', '<', cutoff)
        .limit(500)
        .get();
      
      if (snapshot.empty) {
        console.log('[ClassSync] No stale presence records');
        return null;
      }
      
      console.log(`[ClassSync] Deleting ${snapshot.size} stale presence records`);
      
      const batch = admin.firestore().batch();
      snapshot.forEach((doc) => batch.delete(doc.ref));
      
      await batch.commit();
      console.log('[ClassSync] ✅ Presence cleanup completed');
      return null;
      
    } catch (error) {
      console.error('[ClassSync] ❌ Error in cleanupPresence:', error);
      return null;
    }
  });