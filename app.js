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

// Enable offline persistence
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

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;"
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

/* ============================
   Theme Management
============================ */
function applyTheme(t) {
  if (t === 'light') {
    document.documentElement.classList.add('light');
  } else {
    document.documentElement.classList.remove('light');
  }
  localStorage.setItem('theme', t);
}

// Apply saved theme on load
applyTheme(localStorage.getItem('theme') || 'dark');

// Theme toggle button
$('#toggleTheme').addEventListener('click', () => {
  const currentTheme = localStorage.getItem('theme') || 'dark';
  applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
});

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
   Data Management
============================ */
const cards = $('#cards');
const adminTbody = $('#adminTbody');
let dataLoaded = false;

function sortStable(list) {
  return list.slice().sort((a, b) => {
    const ta = (a.dueAt?.toDate ? a.dueAt.toDate() : new Date(a.dueAt)).getTime();
    const tb = (b.dueAt?.toDate ? b.dueAt.toDate() : new Date(b.dueAt)).getTime();
    if (ta !== tb) return ta - tb;
    return (a.title || '').localeCompare(b.title || '');
  });
}

/* ============================
   Firestore Live Query
============================ */
db.collection('items')
  .orderBy('dueAt', 'asc')
  .onSnapshot({ includeMetadataChanges: true }, (snap) => {
    const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    window.__ALL_ITEMS__ = sortStable(all);

    // Hide preloader on first real data load
    if (!dataLoaded && !snap.metadata.fromCache) {
      dataLoaded = true;
      setTimeout(() => {
        $('#preloader').classList.add('hidden');
      }, 500);
    }

    renderCards();
    renderAdminTable();
  });

/* ============================
   Filters
============================ */
['#search', '#filterType'].forEach(sel => {
  $(sel).addEventListener('input', renderCards);
  $(sel).addEventListener('change', renderCards);
});

function filteredItems() {
  const fType = $('#filterType').value;
  const qText = $('#search').value.trim().toLowerCase();
  let arr = (window.__ALL_ITEMS__ || []).slice();

  // Only show pending tasks
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
   Render Cards
============================ */
function renderCards() {
  const list = filteredItems();
  cards.innerHTML = '';
  $('#emptyState').style.display = list.length ? 'none' : 'block';
  
  // Update task count
  const totalTasks = (window.__ALL_ITEMS__ || []).length;
  $('#taskCount').textContent = `${totalTasks} task${totalTasks !== 1 ? 's' : ''}`;
  
  const now = Date.now();

  for (const it of list) {
    const due = it.dueAt && it.dueAt.toDate ? it.dueAt.toDate() : new Date(it.dueAt);
    const overdue = (it.status !== 'completed') && (due.getTime() < now);
    const soon = !overdue && (due.getTime() - now < 48 * 3600000);

    const badgeClass = it.type ? it.type.toLowerCase() : 'assignment';
    const countdownClass = overdue ? 'overdue' : (soon ? 'soon' : 'safe');

    const el = document.createElement('article');
    el.className = 'card';
    el.innerHTML = `
      <div class="card-header">
        <span class="badge ${badgeClass}">${it.type || '—'}</span>
        <div class="card-actions">
          ${auth.currentUser ? `<button class="icon-btn" data-del-card="${it.id}" title="Delete">🗑️</button>` : ''}
        </div>
      </div>
      
      <h3>${escapeHtml(it.title || 'Untitled')}</h3>
      
      ${it.course ? `<div class="card-course"> ${escapeHtml(it.course)}</div>` : ''}
      
      ${it.notes ? `<div class="card-notes">${escapeHtml(it.notes)}</div>` : ''}
      
      <div class="card-footer">
        <div class="due-info">
          Due: <strong>${fmtDate(due)}</strong>
        </div>
        <div class="countdown ${countdownClass}">
          ${countdown(due)}
        </div>
      </div>
      
      ${it.link ? `<a class="card-link" href="${escapeAttr(it.link)}" target="_blank" rel="noopener">🔗 Open Link</a>` : ''}
    `;
    cards.appendChild(el);
  }
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
          <button class="btn secondary" data-edit="${it.id}">✏️ Edit</button>
          <button class="btn danger" data-del="${it.id}">🗑️ Delete</button>
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
      // Optimistic UI update
      window.__ALL_ITEMS__ = (window.__ALL_ITEMS__ || []).filter(x => x.id !== idDel);
      renderCards();
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
cards.addEventListener('click', async (e) => {
  const idDel = e.target.closest('[data-del-card]')?.getAttribute('data-del-card');
  if (!idDel) return;

  if (!auth.currentUser) {
    alert('Please log in first.');
    return;
  }

  if (!confirm('Delete this item?')) return;

  // Optimistic UI update
  window.__ALL_ITEMS__ = (window.__ALL_ITEMS__ || []).filter(x => x.id !== idDel);
  renderCards();
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

  // Scroll to form
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

  // Optimistic UI update
  window.__ALL_ITEMS__ = (window.__ALL_ITEMS__ || []).filter(x => x.id !== id);
  renderCards();
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
    status: 'pending' // Always set to pending
  };

  const dueAt = parseDue(payload.dueDate, payload.dueTime);
  if (!dueAt) {
    alert('Invalid date/time');
    return;
  }

  // Optimistic UI update
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
  renderCards();
  renderAdminTable();

  try {
    if (id) {
      // Update existing item
      await db.collection('items').doc(id).set({
        ...payload,
        dueAt: dueAt,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } else {
      // Create new item
      await db.collection('items').add({
        ...payload,
        dueAt: dueAt,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    fillForm();
  } catch (err) {
    alert('Save failed: ' + err.message);
  }
});

/* ============================
   Fallback: Hide Preloader
============================ */
// Hide preloader after 10 seconds as fallback
setTimeout(() => {
  $('#preloader').classList.add('hidden');
}, 10000);