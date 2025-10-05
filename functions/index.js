const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Scheduled function to send push notifications
 * Runs every 1 minute to check for pending notifications
 */
exports.sendScheduledNotifications = functions.pubsub
  .schedule('every 1 minutes')
  .timeZone('UTC')
  .onRun(async (context) => {
    console.log('Checking for scheduled notifications...');
    
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
        console.log('No notifications to send');
        return null;
      }
      
      console.log(`Found ${snapshot.size} notifications to send`);
      
      const promises = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // Validate FCM token exists
        if (!data.fcmToken) {
          console.error(`No FCM token for notification ${doc.id}`);
          promises.push(doc.ref.update({ sent: true, error: 'No FCM token' }));
          return;
        }
        
        // Prepare FCM message
        const message = {
          notification: {
            title: 'WorkBurst Reminder',
            body: `Task "${data.title}" is due in 12 hours!`
          },
          data: {
            taskTitle: data.title,
            dueDate: data.dueDate.toDate().toISOString(),
            notificationId: doc.id
          },
          token: data.fcmToken,
          webpush: {
            notification: {
              icon: '/icons/icon-192x192.png',
              badge: '/icons/icon-72x72.png',
              vibrate: [200, 100, 200],
              requireInteraction: true,
              tag: 'workburst-reminder'
            }
          }
        };
        
        // Send notification
        promises.push(
          admin.messaging().send(message)
            .then(() => {
              console.log(`Notification sent successfully for: ${data.title}`);
              return doc.ref.update({ 
                sent: true, 
                sentAt: admin.firestore.FieldValue.serverTimestamp() 
              });
            })
            .catch((error) => {
              console.error(`Error sending notification for ${doc.id}:`, error);
              // Mark as sent to avoid retry loops, but log the error
              return doc.ref.update({ 
                sent: true, 
                error: error.message,
                sentAt: admin.firestore.FieldValue.serverTimestamp()
              });
            })
        );
      });
      
      await Promise.all(promises);
      console.log(`Processed ${promises.length} notifications`);
      return null;
      
    } catch (error) {
      console.error('Error in sendScheduledNotifications:', error);
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
    console.log('Cleaning up old notifications...');
    
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
        console.log('No old notifications to clean up');
        return null;
      }
      
      console.log(`Deleting ${snapshot.size} old notifications`);
      
      const batch = admin.firestore().batch();
      snapshot.forEach((doc) => batch.delete(doc.ref));
      
      await batch.commit();
      console.log('Cleanup completed successfully');
      return null;
      
    } catch (error) {
      console.error('Error in cleanupOldNotifications:', error);
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
    const userId = taskData.userId;
    
    if (!userId) return null;
    
    try {
      // Find and delete associated notifications
      const notifications = await admin.firestore()
        .collection('scheduledNotifications')
        .where('userId', '==', userId)
        .where('title', '==', taskData.title)
        .where('sent', '==', false)
        .get();
      
      if (notifications.empty) return null;
      
      const batch = admin.firestore().batch();
      notifications.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      
      console.log(`Deleted ${notifications.size} notifications for deleted task`);
      return null;
      
    } catch (error) {
      console.error('Error deleting notifications:', error);
      return null;
    }
  });