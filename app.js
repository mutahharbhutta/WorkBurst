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
   PWA Service Worker Registration
============================ */
let deferredPrompt;
let swRegistration = null;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      swRegistration = await navigator.serviceWorker.register('/sw.js');
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
  
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
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

auth.onAuthStateChanged(user => {
  setAdminUI(!!user);
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
    ${task.course ? `<div class="task-modal-course"> ${escapeHtml(task.course)}</div>` : ''}
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
    
    scheduleNotification(payload.title, dueAt);
    
    fillForm();
  } catch (err) {
    alert('Save failed: ' + err.message);
  }
});

/* ============================
   Notification System
============================ */
async function scheduleNotification(title, dueDate) {
  const notificationsEnabled = $('#enableNotifications')?.checked;
  if (!notificationsEnabled) return;

  const notificationTime = new Date(dueDate.getTime() - (12 * 60 * 60 * 1000));
  const now = new Date();

  if (notificationTime > now) {
    if ('Notification' in window) {
      let permission = Notification.permission;
      
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }
      
      if (permission === 'granted') {
        if (swRegistration && swRegistration.active) {
          swRegistration.active.postMessage({
            type: 'SCHEDULE_NOTIFICATION',
            payload: {
              title: 'WorkBurst Reminder',
              body: `Task "${title}" is due in 12 hours!`,
              notificationTime: notificationTime.getTime(),
              taskId: Date.now()
            }
          });
          
          console.log('Notification scheduled via service worker');
        } else {
          const timeUntilNotification = notificationTime.getTime() - now.getTime();
          
          setTimeout(() => {
            new Notification('WorkBurst Reminder', {
              body: `Task "${title}" is due in 12 hours!`,
              icon: '/icons/icon-192x192.png',
              badge: '/icons/icon-72x72.png',
              vibrate: [200, 100, 200],
              tag: 'task-reminder',
              requireInteraction: true
            });
          }, timeUntilNotification);
          
          console.log('Notification scheduled via setTimeout');
        }
      }
    }
  }
}

$('#enableNotifications')?.addEventListener('change', async (e) => {
  if (e.target.checked && 'Notification' in window) {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      alert('Notifications enabled! You will receive reminders 12 hours before task deadlines.');
    } else {
      alert('Please enable notifications in your browser settings to receive reminders.');
      e.target.checked = false;
    }
  }
});

/* ============================
   Fallback: Hide Preloader
============================ */
setTimeout(() => {
  $('#preloader').classList.add('hidden');
}, 10000);