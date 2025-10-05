/* ============================
   Firebase Configuration
============================ */
const firebaseConfig = {
  apiKey: "AIzaSyAalidbfXTEVwSoDmJDURnISTE563O6BJE",
  authDomain: "task-manager-dd410.firebaseapp.com",
  projectId: "task-manager-dd410",
  storageBucket: "task-manager-dd410.firebasestorage.app",
  messagingSenderId: "419202415333",
  appId: "1:419202415333:web:5c1f0a0a695f6ff973f20c",
  measurementId: "G-6J6N5XJ8MZ"
};

/* ============================
   Initialize Firebase
============================ */
firebase.initializeApp(firebaseConfig);

firebase.firestore().enablePersistence({ synchronizeTabs: true }).catch(err => {
  if (err.code !== 'failed-precondition' && err.code !== 'unimplemented') {
    console.warn('Persistence error:', err);
  }
});

const auth = firebase.auth();
const db = firebase.firestore();

/* ============================
   Helper Functions
============================ */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

/* ============================
   Firebase Cloud Messaging Setup
============================ */
let messaging = null;
let fcmToken = null;

async function initializeMessaging() {
  try {
    messaging = firebase.messaging();
    
    // Request notification permission first
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return false;
    }
    
    // Get FCM token - REPLACE 'YOUR_VAPID_KEY' with your actual key from Firebase Console
    fcmToken = await messaging.getToken({
      vapidKey: 'BNdK4SCRa8WbmM_bqj51En-u3uzYFr4omivYxxyZQ4GA0tImdI5bpf5PQ6J015474caZlT5Q7mEUPv26_uYFiM4'
    });
    
    console.log('FCM Token:', fcmToken);
    
    // Store token in Firestore for backend to use
    if (auth.currentUser) {
      await db.collection('users').doc(auth.currentUser.uid).set({
        fcmToken: fcmToken,
        email: auth.currentUser.email,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
    
    // Handle foreground messages
    messaging.onMessage((payload) => {
      console.log('Foreground message received:', payload);
      
      new Notification(payload.notification.title, {
        body: payload.notification.body,
        icon: './icons/icon-192x192.png',
        badge: './icons/icon-72x72.png',
        vibrate: [200, 100, 200],
        requireInteraction: true
      });
    });
    
    return true;
  } catch (error) {
    console.error('FCM initialization error:', error);
    if (error.code === 'messaging/unsupported-browser') {
      alert('This browser does not support push notifications. Please use Chrome, Firefox, or Edge.');
    }
    return false;
  }
}

/* ============================
   PWA Service Worker Registration
============================ */
let deferredPrompt;
let swRegistration = null;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      swRegistration = await navigator.serviceWorker.register('./sw.js');
      console.log('Service Worker registered:', swRegistration);
      
      swRegistration.addEventListener('updatefound', () => {
        const newWorker = swRegistration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            if (confirm('New version available! Reload to update?')) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
            }
          }
        });
      });
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  });
  
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

/* ============================
   PWA Install Prompt
============================ */
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  const installBanner = $('#installBanner');
  if (installBanner) {
    installBanner.style.display = 'flex';
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const installBtn = $('#installBtn');
  const dismissBtn = $('#dismissInstall');
  const installBanner = $('#installBanner');
  
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log(`User response to install prompt: ${outcome}`);
      
      deferredPrompt = null;
      if (installBanner) {
        installBanner.style.display = 'none';
      }
    });
  }
  
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      if (installBanner) {
        installBanner.style.display = 'none';
      }
    });
  }
});

window.addEventListener('appinstalled', () => {
  console.log('PWA was installed');
  const installBanner = $('#installBanner');
  if (installBanner) {
    installBanner.style.display = 'none';
  }
});

/* ============================
   Helper Functions (continued)
============================ */
function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;"
  })[c]);
}

function escapeAttr(s) {
  return String(s).replace(/["<>]/g, '');
}

function fmtDate(d) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(d);
  } catch {
    return d.toLocaleString();
  }
}

function getDayOfWeek(d) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[d.getDay()];
}

function parseDue(dateStr, timeStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  let hh = 23, mm = 59;
  if (timeStr) {
    [hh, mm] = timeStr.split(':').map(Number);
  }
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

function countdown(d) {
  const diff = d.getTime() - Date.now();
  if (diff <= 0) return 'Overdue';
  const dd = Math.floor(diff / 86400000);
  const hh = Math.floor((diff % 86400000) / 3600000);
  const mm = Math.floor((diff % 3600000) / 60000);
  if (dd > 0) return `${dd}d ${hh}h`;
  if (hh > 0) return `${hh}h ${mm}m`;
  return `${mm}m`;
}

function getWeekLabel(d) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const taskDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((taskDate - today) / 86400000);
  
  if (diffDays < 0) return 'Overdue Tasks';
  if (diffDays < 7) return 'This Week';
  if (diffDays < 14) return 'Next Week';
  if (diffDays < 21) return 'In 2 Weeks';
  if (diffDays < 30) return 'In 3-4 Weeks';
  return 'Later';
}

/* ============================
   Theme Management
============================ */
function applyTheme(t) {
  document.documentElement.className = t;
  localStorage.setItem('theme', t);
}

applyTheme(localStorage.getItem('theme') || 'darkest');

const themeBtn = $('#themeBtn');
const themeDropdown = $('#themeDropdown');

themeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  themeDropdown.classList.toggle('active');
});

document.addEventListener('click', () => {
  themeDropdown.classList.remove('active');
});

$$('#themeDropdown button').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const theme = btn.dataset.theme;
    applyTheme(theme);
    themeDropdown.classList.remove('active');
  });
});

/* ============================
   Preloader Tips
============================ */
const tips = [
  'Break large tasks into smaller chunks',
  'Review notes before starting assignments',
  'Set reminders 24 hours before deadlines',
  'Prioritize tasks by due date',
  'Take regular breaks to stay focused',
  'Enable notifications to never miss a deadline',
  'Keep your task notes detailed and clear'
];

function rotateTips() {
  const tipElement = $('#loaderTip');
  if (tipElement) {
    let index = 0;
    setInterval(() => {
      index = (index + 1) % tips.length;
      tipElement.textContent = tips[index];
    }, 3000);
  }
}

rotateTips();

/* ============================
   Authentication
============================ */
const loginDialog = $('#loginDialog');

$('#loginBtn').addEventListener('click', () => {
  loginDialog.showModal();
});

$('#cancelLogin').addEventListener('click', () => {
  loginDialog.close();
});

$('#confirmLogin').addEventListener('click', async () => {
  const email = $('#email').value.trim();
  const password = $('#password').value;
  
  try {
    await auth.signInWithEmailAndPassword(email, password);
    loginDialog.close();
    $('#email').value = '';
    $('#password').value = '';
  } catch (e) {
    alert('Login failed: ' + e.message);
  }
});

$('#logoutBtn').addEventListener('click', () => {
  auth.signOut();
});

function setAdminUI(isAdmin) {
  document.body.classList.toggle('admin-active', !!isAdmin);
}

auth.onAuthStateChanged(async (user) => {
  setAdminUI(!!user);
  
  // Initialize FCM when user logs in
  if (user && localStorage.getItem('notificationsEnabled') === 'true') {
    await initializeMessaging();
  }
});

/* ============================
   Timetable Feature
============================ */
$('#timetableBtn').addEventListener('click', () => {
  window.open('timetable.html', '_blank');
});

/* ============================
   Data Management
============================ */
const weeklyTasksContainer = $('#weeklyTasks');
const adminTbody = $('#adminTbody');
let dataLoaded = false;
let lastUpdateTime = null;

function sortStable(list) {
  return list.slice().sort((a, b) => {
    const ta = (a.dueAt?.toDate ? a.dueAt.toDate() : new Date(a.dueAt)).getTime();
    const tb = (b.dueAt?.toDate ? b.dueAt.toDate() : new Date(b.dueAt)).getTime();
    if (ta !== tb) return ta - tb;
    return (a.title || '').localeCompare(b.title || '');
  });
}

function updateLastUpdatedMessage() {
  const updateTimeElement = $('#updateTime');
  if (lastUpdateTime) {
    updateTimeElement.textContent = `Last updated: ${fmtDate(lastUpdateTime)}`;
  } else {
    updateTimeElement.textContent = 'No updates yet';
  }
}

/* ============================
   Firestore Live Query
============================ */
db.collection('items')
  .orderBy('dueAt', 'asc')
  .onSnapshot({ includeMetadataChanges: true }, (snap) => {
    const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    window.__ALL_ITEMS__ = sortStable(all);

    if (all.length > 0 && !snap.metadata.fromCache) {
      const latestUpdate = all.reduce((latest, item) => {
        const itemUpdate = item.updatedAt?.toDate?.() || item.createdAt?.toDate?.() || new Date();
        return itemUpdate > latest ? itemUpdate : latest;
      }, new Date(0));
      lastUpdateTime = latestUpdate;
      updateLastUpdatedMessage();
    }

    if (!dataLoaded && !snap.metadata.fromCache) {
      dataLoaded = true;
      setTimeout(() => {
        $('#preloader').classList.add('hidden');
      }, 500);
    }

    renderWeeklyTasks();
    renderAdminTable();
  });

/* ============================
   Filters
============================ */
['#search', '#filterType'].forEach(sel => {
  $(sel).addEventListener('input', renderWeeklyTasks);
  $(sel).addEventListener('change', renderWeeklyTasks);
});

function filteredItems() {
  const fType = $('#filterType').value;
  const qText = $('#search').value.trim().toLowerCase();
  let arr = (window.__ALL_ITEMS__ || []).slice();

  arr = arr.filter(x => x.status === 'pending');

  if (fType !== 'all') {
    arr = arr.filter(x => x.type === fType);
  }
  if (qText) {
    arr = arr.filter(x =>
      (`${x.title} ${x.course} ${x.notes || ''}`).toLowerCase().includes(qText)
    );
  }

  return arr;
}

/* ============================
   Task Modal Functionality
============================ */
const taskModal = $('#taskModal');
const taskModalBody = $('#taskModalBody');
const closeTaskModalBtn = $('#closeTaskModal');

function openTaskModal(task) {
  const due = task.dueAt && task.dueAt.toDate ? task.dueAt.toDate() : new Date(task.dueAt);
  const overdue = (task.status !== 'completed') && (due.getTime() < Date.now());
  const soon = !overdue && (due.getTime() - Date.now() < 48 * 3600000);
  const badgeClass = task.type ? task.type.toLowerCase() : 'assignment';
  const countdownClass = overdue ? 'overdue' : (soon ? 'soon' : 'safe');
  const dayOfWeek = getDayOfWeek(due);

  taskModalBody.innerHTML = `
    <span class="badge ${badgeClass}">${task.type || '—'}</span>
    <h2>${escapeHtml(task.title || 'Untitled')}</h2>
    ${task.course ? `<div class="task-modal-course">${escapeHtml(task.course)}</div>` : ''}
    ${task.notes ? `<div class="task-modal-notes">${escapeHtml(task.notes)}</div>` : '<div class="task-modal-notes">No additional notes</div>'}
    
    <div class="task-modal-info">
      <div class="task-modal-info-item">
        <div class="task-modal-info-label">Day</div>
        <div class="task-modal-info-value">${dayOfWeek}</div>
      </div>
      <div class="task-modal-info-item">
        <div class="task-modal-info-label">Due Date</div>
        <div class="task-modal-info-value">${fmtDate(due)}</div>
      </div>
      <div class="task-modal-info-item">
        <div class="task-modal-info-label">Status</div>
        <div class="task-modal-info-value countdown ${countdownClass}">${countdown(due)}</div>
      </div>
      <div class="task-modal-info-item">
        <div class="task-modal-info-label">Type</div>
        <div class="task-modal-info-value">${task.type || 'Assignment'}</div>
      </div>
    </div>
    
    ${task.link ? `<a class="task-modal-link" href="${escapeAttr(task.link)}" target="_blank" rel="noopener">🔗 Open Link</a>` : ''}
  `;

  taskModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeTaskModal() {
  taskModal.classList.remove('active');
  document.body.style.overflow = '';
}

closeTaskModalBtn.addEventListener('click', closeTaskModal);

taskModal.addEventListener('click', (e) => {
  if (e.target === taskModal) {
    closeTaskModal();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && taskModal.classList.contains('active')) {
    closeTaskModal();
  }
});

/* ============================
   Render Weekly Tasks
============================ */
function renderWeeklyTasks() {
  const list = filteredItems();
  weeklyTasksContainer.innerHTML = '';
  $('#emptyState').style.display = list.length ? 'none' : 'block';

  if (list.length === 0) return;

  const weekGroups = {};
  
  list.forEach(task => {
    const due = task.dueAt && task.dueAt.toDate ? task.dueAt.toDate() : new Date(task.dueAt);
    const weekLabel = getWeekLabel(due);
    
    if (!weekGroups[weekLabel]) {
      weekGroups[weekLabel] = [];
    }
    weekGroups[weekLabel].push(task);
  });

  const weekOrder = ['Overdue Tasks', 'This Week', 'Next Week', 'In 2 Weeks', 'In 3-4 Weeks', 'Later'];
  
  weekOrder.forEach(weekLabel => {
    if (weekGroups[weekLabel] && weekGroups[weekLabel].length > 0) {
      const weekSection = document.createElement('div');
      weekSection.className = 'week-group';
      
      const weekHeader = document.createElement('div');
      weekHeader.className = 'week-header';
      weekHeader.innerHTML = `
        <div class="week-title">${weekLabel}</div>
        <div class="week-count">${weekGroups[weekLabel].length} task${weekGroups[weekLabel].length !== 1 ? 's' : ''}</div>
      `;
      
      const grid = document.createElement('div');
      grid.className = 'grid';
      
      const now = Date.now();
      
      weekGroups[weekLabel].forEach(it => {
        const due = it.dueAt && it.dueAt.toDate ? it.dueAt.toDate() : new Date(it.dueAt);
        const overdue = (it.status !== 'completed') && (due.getTime() < now);
        const soon = !overdue && (due.getTime() - now < 48 * 3600000);

        const badgeClass = it.type ? it.type.toLowerCase() : 'assignment';
        const countdownClass = overdue ? 'overdue' : (soon ? 'soon' : 'safe');
        const dayOfWeek = getDayOfWeek(due);

        const el = document.createElement('article');
        el.className = 'card';
        el.dataset.taskId = it.id;
        el.innerHTML = `
          <div class="card-header">
            <span class="badge ${badgeClass}">${it.type || '—'}</span>
            <div class="card-actions">
              ${auth.currentUser ? `<button class="icon-btn" data-del-card="${it.id}" title="Delete">×</button>` : ''}
            </div>
          </div>
          
          <h3>${escapeHtml(it.title || 'Untitled')}</h3>
          
          ${it.course ? `<div class="card-course">${escapeHtml(it.course)}</div>` : ''}
          
          ${it.notes ? `<div class="card-notes">${escapeHtml(it.notes)}</div>` : ''}
          
          <div class="card-footer">
            <div class="due-info">
              <span class="due-day">${dayOfWeek}</span>
              Due: <strong>${fmtDate(due)}</strong>
            </div>
            <div class="countdown ${countdownClass}">
              ${countdown(due)}
            </div>
          </div>
          
          ${it.link ? `<a class="card-link" href="${escapeAttr(it.link)}" target="_blank" rel="noopener">Open Link</a>` : ''}
        `;
        
        el.addEventListener('click', (e) => {
          if (!e.target.closest('.icon-btn') && !e.target.closest('.card-link')) {
            openTaskModal(it);
          }
        });
        
        grid.appendChild(el);
      });
      
      weekSection.appendChild(weekHeader);
      weekSection.appendChild(grid);
      weeklyTasksContainer.appendChild(weekSection);
    }
  });
}

/* ============================
   Render Admin Table
============================ */
function renderAdminTable() {
  if (!auth.currentUser) {
    adminTbody.innerHTML = '';
    return;
  }

  const list = filteredItems();
  adminTbody.innerHTML = '';

  for (const it of list) {
    const d = it.dueAt && it.dueAt.toDate ? it.dueAt.toDate() : new Date(it.dueAt);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="badge ${it.type.toLowerCase()}">${it.type}</span></td>
      <td>${escapeHtml(it.course || '')}</td>
      <td>${escapeHtml(it.title || '')}</td>
      <td>${fmtDate(d)}</td>
      <td>
        <div class="table-actions">
          <button class="btn secondary" data-edit="${it.id}">Edit</button>
          <button class="btn danger" data-del="${it.id}" title="Delete">×</button>
        </div>
      </td>
    `;
    adminTbody.appendChild(tr);
  }
}

/* ============================
   Admin Table Actions
============================ */
adminTbody.addEventListener('click', async (e) => {
  const idEdit = e.target.closest('[data-edit]')?.getAttribute('data-edit');
  const idDel = e.target.closest('[data-del]')?.getAttribute('data-del');

  if (idEdit) {
    loadIntoForm(idEdit);
  }

  if (idDel) {
    if (!auth.currentUser) {
      alert('Please log in first.');
      return;
    }
    if (confirm('Delete this item?')) {
      window.__ALL_ITEMS__ = (window.__ALL_ITEMS__ || []).filter(x => x.id !== idDel);
      renderWeeklyTasks();
      renderAdminTable();

      try {
        await db.collection('items').doc(idDel).delete();
      } catch (err) {
        alert('Delete failed: ' + err.message);
      }
    }
  }
});

/* ============================
   Card Delete Action
============================ */
weeklyTasksContainer.addEventListener('click', async (e) => {
  const idDel = e.target.closest('[data-del-card]')?.getAttribute('data-del-card');
  if (!idDel) return;

  if (!auth.currentUser) {
    alert('Please log in first.');
    return;
  }

  if (!confirm('Delete this item?')) return;

  window.__ALL_ITEMS__ = (window.__ALL_ITEMS__ || []).filter(x => x.id !== idDel);
  renderWeeklyTasks();
  renderAdminTable();

  try {
    await db.collection('items').doc(idDel).delete();
  } catch (err) {
    alert('Delete failed: ' + (err?.message || err));
  }
});

/* ============================
   Form Management
============================ */
const deleteBtn = $('#deleteBtn');

function loadIntoForm(id) {
  const it = (window.__ALL_ITEMS__ || []).find(x => x.id === id);
  if (!it) return;

  $('#itemId').value = it.id;
  $('#type').value = it.type || 'Assignment';
  $('#course').value = it.course || '';
  $('#title').value = it.title || '';

  const d = it.dueAt && it.dueAt.toDate ? it.dueAt.toDate() : new Date(it.dueAt);
  $('#dueDate').value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  $('#dueTime').value = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  $('#link').value = it.link || '';
  $('#notes').value = it.notes || '';
  $('#title').focus();

  if (deleteBtn) {
    deleteBtn.dataset.id = it.id;
    deleteBtn.style.display = 'inline-block';
  }

  $('#itemForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function fillForm() {
  $('#itemId').value = '';
  $('#type').value = 'Assignment';
  $('#course').value = '';
  $('#title').value = '';
  $('#dueDate').value = '';
  $('#dueTime').value = '';
  $('#link').value = '';
  $('#notes').value = '';

  if (deleteBtn) {
    deleteBtn.style.display = 'none';
    deleteBtn.removeAttribute('data-id');
  }
}

$('#resetBtn')?.addEventListener('click', () => {
  fillForm();
});

deleteBtn?.addEventListener('click', async () => {
  if (!auth.currentUser) {
    alert('Please log in first.');
    return;
  }

  const id = deleteBtn.dataset.id;
  if (!id) return;

  if (!confirm('Delete this item?')) return;

  window.__ALL_ITEMS__ = (window.__ALL_ITEMS__ || []).filter(x => x.id !== id);
  renderWeeklyTasks();
  renderAdminTable();

  try {
    await db.collection('items').doc(id).delete();
    fillForm();
  } catch (err) {
    alert('Delete failed: ' + (err?.message || err));
  }
});

/* ============================
   Schedule Notification with FCM
============================ */
/* ============================
   100% FREE Notification System (No Cloud Functions)
   Add this to app.js after line 500
   
   LIMITATIONS:
   - Works when browser is open (even minimized)
   - Won't work if browser completely closed
   - Perfect for PWA installed on mobile
============================ */

/* ============================
   Periodic Notification Checker
============================ */
let notificationCheckInterval = null;

function startNotificationChecker() {
  // Clear any existing interval
  if (notificationCheckInterval) {
    clearInterval(notificationCheckInterval);
  }

  // Check every 5 minutes when online
  notificationCheckInterval = setInterval(checkAndSendNotifications, 5 * 60 * 1000);
  
  // Also check immediately
  checkAndSendNotifications();
  
  console.log('Notification checker started');
}

function stopNotificationChecker() {
  if (notificationCheckInterval) {
    clearInterval(notificationCheckInterval);
    notificationCheckInterval = null;
  }
  console.log('Notification checker stopped');
}

/* ============================
   Check Tasks and Send Notifications
============================ */
async function checkAndSendNotifications() {
  if (!auth.currentUser || !localStorage.getItem('notificationsEnabled')) {
    return;
  }

  const now = Date.now();
  const twelveHoursFromNow = now + (12 * 60 * 60 * 1000);
  
  // Get all pending tasks
  const allTasks = window.__ALL_ITEMS__ || [];
  
  for (const task of allTasks) {
    if (task.status !== 'pending') continue;
    
    const dueTime = task.dueAt?.toDate ? task.dueAt.toDate().getTime() : new Date(task.dueAt).getTime();
    const notificationTime = dueTime - (12 * 60 * 60 * 1000);
    
    // Check if we should notify (within 12-hour window but not yet notified)
    if (notificationTime <= now && now < dueTime) {
      const notificationId = `notif-${task.id}-${Math.floor(notificationTime / 60000)}`;
      
      // Check if already notified (using IndexedDB)
      const alreadyNotified = await isNotificationSent(notificationId);
      
      if (!alreadyNotified) {
        await sendTaskNotification(task);
        await markNotificationSent(notificationId);
      }
    }
  }
}

/* ============================
   Send Task Notification
============================ */
async function sendTaskNotification(task) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const title = '🔔 Task Reminder - WorkBurst';
  const dueDate = task.dueAt?.toDate ? task.dueAt.toDate() : new Date(task.dueAt);
  const timeUntilDue = countdown(dueDate);
  
  const options = {
    body: `${task.title}\nDue in: ${timeUntilDue}\nCourse: ${task.course || 'N/A'}`,
    icon: './icons/icon-192x192.png',
    badge: './icons/icon-72x72.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: `task-${task.id}`,
    requireInteraction: true,
    data: {
      taskId: task.id,
      url: '/'
    },
    actions: [
      { action: 'view', title: '📋 View Task' },
      { action: 'dismiss', title: '✕ Dismiss' }
    ]
  };

  try {
    const notification = new Notification(title, options);
    
    notification.onclick = function() {
      window.focus();
      notification.close();
      
      // Open task modal if possible
      const taskElement = document.querySelector(`[data-task-id="${task.id}"]`);
      if (taskElement) {
        taskElement.click();
      }
    };

    console.log(`Notification sent for: ${task.title}`);
    
    // Also send via service worker for better reliability
    if ('serviceWorker' in navigator && swRegistration) {
      swRegistration.showNotification(title, options);
    }
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

/* ============================
   IndexedDB for Notification Tracking
============================ */
let notificationDB = null;

function initNotificationDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('WorkBurstNotifications', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      notificationDB = request.result;
      resolve(notificationDB);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('sentNotifications')) {
        db.createObjectStore('sentNotifications', { keyPath: 'id' });
      }
    };
  });
}

async function markNotificationSent(notificationId) {
  if (!notificationDB) await initNotificationDB();
  
  return new Promise((resolve, reject) => {
    const transaction = notificationDB.transaction(['sentNotifications'], 'readwrite');
    const store = transaction.objectStore('sentNotifications');
    
    const request = store.put({
      id: notificationId,
      sentAt: Date.now()
    });
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function isNotificationSent(notificationId) {
  if (!notificationDB) await initNotificationDB();
  
  return new Promise((resolve, reject) => {
    const transaction = notificationDB.transaction(['sentNotifications'], 'readonly');
    const store = transaction.objectStore('sentNotifications');
    const request = store.get(notificationId);
    
    request.onsuccess = () => resolve(!!request.result);
    request.onerror = () => reject(request.error);
  });
}

/* ============================
   Cleanup Old Notification Records (weekly)
============================ */
async function cleanupOldNotifications() {
  if (!notificationDB) await initNotificationDB();
  
  const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  
  return new Promise((resolve, reject) => {
    const transaction = notificationDB.transaction(['sentNotifications'], 'readwrite');
    const store = transaction.objectStore('sentNotifications');
    const request = store.openCursor();
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        if (cursor.value.sentAt < oneWeekAgo) {
          cursor.delete();
        }
        cursor.continue();
      } else {
        resolve();
      }
    };
    
    request.onerror = () => reject(request.error);
  });
}

/* ============================
   Online/Offline Detection
============================ */
window.addEventListener('online', () => {
  console.log('Device online - checking for notifications');
  checkAndSendNotifications();
});

window.addEventListener('offline', () => {
  console.log('Device offline');
});

/* ============================
   Visibility Change - Check when tab becomes visible
============================ */
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    console.log('Tab visible - checking for notifications');
    checkAndSendNotifications();
  }
});

/* ============================
   Update Notification Enable/Disable Handler
   Replace the existing handler around line 600
============================ */
$('#enableNotifications')?.addEventListener('change', async (e) => {
  if (e.target.checked) {
    if (!auth.currentUser) {
      alert('Please log in first to enable notifications.');
      e.target.checked = false;
      return;
    }
    
    if (!('Notification' in window)) {
      alert('This browser does not support notifications');
      e.target.checked = false;
      return;
    }

    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      localStorage.setItem('notificationsEnabled', 'true');
      await initNotificationDB();
      startNotificationChecker();
      
      // Test notification
      new Notification('WorkBurst Notifications Active', {
        body: 'You will receive reminders 12 hours before deadlines',
        icon: './icons/icon-192x192.png',
        badge: './icons/icon-72x72.png'
      });
      
      alert('Notifications enabled! Keep browser open for reminders.');
    } else {
      alert('Notification permission denied. Please enable in browser settings.');
      e.target.checked = false;
    }
  } else {
    localStorage.setItem('notificationsEnabled', 'false');
    stopNotificationChecker();
  }
});

/* ============================
   Auto-start notification checker on page load
============================ */
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize IndexedDB
  await initNotificationDB();
  
  // Restore notification preference
  const enabled = localStorage.getItem('notificationsEnabled') === 'true';
  if ($('#enableNotifications')) {
    $('#enableNotifications').checked = enabled;
    
    if (enabled && auth.currentUser) {
      startNotificationChecker();
      console.log('Auto-started notification checker');
    }
  }
  
  // Cleanup old records weekly
  const lastCleanup = localStorage.getItem('lastNotificationCleanup');
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  
  if (!lastCleanup || Date.now() - parseInt(lastCleanup) > oneWeek) {
    await cleanupOldNotifications();
    localStorage.setItem('lastNotificationCleanup', Date.now().toString());
  }
});

/* ============================
   Auth State Change - Start/Stop checker
============================ */
auth.onAuthStateChanged((user) => {
  setAdminUI(!!user);
  
  if (user && localStorage.getItem('notificationsEnabled') === 'true') {
    startNotificationChecker();
  } else {
    stopNotificationChecker();
  }
});
/* ============================
   Notification Status Display
============================ */
async function updateNotificationStatus() {
  const statusEl = $('#notificationStatus');
  if (!statusEl || !auth.currentUser) return;
  
  try {
    const snapshot = await db.collection('scheduledNotifications')
      .where('userId', '==', auth.currentUser.uid)
      .where('sent', '==', false)
      .get();
    
    const upcoming = snapshot.docs.filter(doc => {
      const notifTime = doc.data().notificationTime.toDate();
      return notifTime > new Date();
    });
    
    if (upcoming.length > 0) {
      statusEl.innerHTML = `📬 ${upcoming.length} reminder${upcoming.length !== 1 ? 's' : ''} scheduled`;
      statusEl.style.color = 'var(--success)';
    } else {
      statusEl.innerHTML = '📭 No upcoming reminders';
      statusEl.style.color = 'var(--text-secondary)';
    }
  } catch (error) {
    console.error('Error updating notification status:', error);
  }
}

/* ============================
   Notification Enable/Disable
============================ */
$('#enableNotifications')?.addEventListener('change', async (e) => {
  if (e.target.checked) {
    if (!auth.currentUser) {
      alert('Please log in first to enable notifications.');
      e.target.checked = false;
      return;
    }
    
    if (!('Notification' in window)) {
      alert('This browser does not support notifications');
      e.target.checked = false;
      return;
    }

    const success = await initializeMessaging();
    
    if (success) {
      alert('Notifications enabled! You will receive reminders 12 hours before deadlines, even when the app is closed.');
      localStorage.setItem('notificationsEnabled', 'true');
      updateNotificationStatus();
      
      // Test notification
      new Notification('WorkBurst Notifications Active', {
        body: 'You will receive reminders even when the browser is closed',
        icon: './icons/icon-192x192.png',
        badge: './icons/icon-72x72.png'
      });
    } else {
      alert('Failed to initialize notifications. Please check browser permissions.');
      e.target.checked = false;
    }
  } else {
    localStorage.setItem('notificationsEnabled', 'false');
    updateNotificationStatus();
  }
});



/* ============================
   Form Submit (Create/Update)
============================ */
$('#itemForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!auth.currentUser) {
    alert('Please log in first.');
    return;
  }

  const id = $('#itemId').value;
  const payload = {
    type: $('#type').value,
    course: $('#course').value.trim(),
    title: $('#title').value.trim(),
    dueDate: $('#dueDate').value,
    dueTime: $('#dueTime').value,
    link: $('#link').value.trim(),
    notes: $('#notes').value.trim(),
    status: 'pending'
  };

  const dueAt = parseDue(payload.dueDate, payload.dueTime);
  if (!dueAt) {
    alert('Invalid date/time');
    return;
  }

  const optimistic = { id: id || `__local_${Date.now()}`, ...payload, dueAt };
  const local = (window.__ALL_ITEMS__ || []).slice();

  if (id) {
    const idx = local.findIndex(x => x.id === id);
    if (idx >= 0) {
      local[idx] = optimistic;
    } else {
      local.unshift(optimistic);
    }
  } else {
    local.unshift(optimistic);
  }

  window.__ALL_ITEMS__ = sortStable(local);
  renderWeeklyTasks();
  renderAdminTable();

  try {
    if (id) {
      await db.collection('items').doc(id).set({
        ...payload,
        dueAt: dueAt,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } else {
      await db.collection('items').add({
        ...payload,
        dueAt: dueAt,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    
    // Schedule notification
    await scheduleNotification(payload.title, dueAt);
    
    fillForm();
  } catch (err) {
    alert('Save failed: ' + err.message);
  }
});

/* ============================
   Initialize on Page Load
============================ */
document.addEventListener('DOMContentLoaded', async () => {
  // Restore notification preference
  const enabled = localStorage.getItem('notificationsEnabled') === 'true';
  if ($('#enableNotifications')) {
    $('#enableNotifications').checked = enabled;
    
    if (enabled && auth.currentUser) {
      await initializeMessaging();
      updateNotificationStatus();
    }
  }
});

/* ============================
   Update notification status periodically
============================ */
setInterval(() => {
  if (auth.currentUser && localStorage.getItem('notificationsEnabled') === 'true') {
    updateNotificationStatus();
  }
}, 60000); // Every minute

/* ============================
   Fallback: Hide Preloader
============================ */
setTimeout(() => {
  $('#preloader').classList.add('hidden');
}, 10000);