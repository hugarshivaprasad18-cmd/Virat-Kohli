/* ============================================================
   KING KOHLI — admin.js
   Full backend integration: Dashboard · Matches · Stats · Comments
   ============================================================ */

'use strict';

const API = {
  stats:    '/api/stats',
  matches:  '/api/matches',
  comments: '/api/comments',
};

/* ============================================================
   STATE
   ============================================================ */
let matchesData  = [];
let statsData    = [];
let commentsData = [];
let pendingDeleteId   = null;
let pendingDeleteType = null;

/* ============================================================
   UTILITIES
   ============================================================ */
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatBadge(fmt) {
  const cls = fmt === 'ODI' ? 'format-odi' : fmt === 'Test' ? 'format-test' : 'format-t20';
  return `<span class="format-badge ${cls}">${fmt}</span>`;
}
function resultBadge(r) {
  const cls = r === 'Won' ? 'result-won' : r === 'Lost' ? 'result-lost' : 'result-draw';
  return `<span class="result-badge ${cls}">${r}</span>`;
}
function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

/* Toast notification */
let toastTimer;
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = (type === 'success' ? '✅ ' : '⚠️ ') + msg;
  t.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = 'toast'; }, 3500);
}

/* Generic fetch wrapper */
async function apiFetch(url, options = {}) {
  const res = await fetch(url, options);
  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* ============================================================
   SIDEBAR / TAB NAVIGATION
   ============================================================ */
const tabTitles = { dashboard: 'Dashboard', matches: 'Matches', stats: 'Stats', comments: 'Comments' };

document.querySelectorAll('.sidebar-link[data-tab]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const tab = link.dataset.tab;
    document.querySelectorAll('.sidebar-link[data-tab]').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
    document.getElementById('pageTitle').textContent = tabTitles[tab];
    document.getElementById('sidebar').classList.remove('open');
  });
});

document.getElementById('sidebarToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

/* ============================================================
   DASHBOARD
   ============================================================ */
async function loadDashboard() {
  try {
    [statsData, matchesData, commentsData] = await Promise.all([
      apiFetch(API.stats),
      apiFetch(API.matches),
      apiFetch(API.comments),
    ]);
  } catch (err) {
    showToast('Cannot reach backend — check server is running', 'error');
    console.error(err);
    statsData = []; matchesData = []; commentsData = [];
  }

  // Summary cards
  const totals = statsData.reduce((a, s) => ({
    matches:   a.matches   + (s.matches   || 0),
    runs:      a.runs      + (s.runs      || 0),
    centuries: a.centuries + (s.centuries || 0),
  }), { matches: 0, runs: 0, centuries: 0 });

  document.getElementById('sc-matches').textContent   = totals.matches.toLocaleString();
  document.getElementById('sc-runs').textContent      = totals.runs.toLocaleString();
  document.getElementById('sc-centuries').textContent = totals.centuries;
  document.getElementById('sc-comments').textContent  = commentsData.length;

  // Recent 5 matches
  const recent = [...matchesData].slice(-5).reverse();
  document.getElementById('dashRecentBody').innerHTML = recent.length
    ? recent.map(m => `
        <tr>
          <td>${formatBadge(m.format)}</td>
          <td><strong>${escapeHtml(m.opponent)}</strong></td>
          <td>${formatDate(m.date)}</td>
          <td class="runs-cell">${m.runs}${m.notOut ? '*' : ''}</td>
          <td>${resultBadge(m.result)}</td>
        </tr>`).join('')
    : `<tr><td colspan="5" class="table-empty">No matches yet.</td></tr>`;
}

/* ============================================================
   MATCHES TAB
   ============================================================ */
function renderMatchAdmin() {
  const tbody = document.getElementById('adminMatchBody');
  if (!matchesData.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-empty">No matches found.</td></tr>`;
    return;
  }
  tbody.innerHTML = matchesData.map(m => `
    <tr>
      <td>${formatBadge(m.format)}</td>
      <td><strong>${escapeHtml(m.opponent)}</strong></td>
      <td>${formatDate(m.date)}</td>
      <td class="runs-cell">${m.runs}${m.notOut ? '*' : ''}</td>
      <td>${resultBadge(m.result)}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-edit btn-sm" onclick="editMatch(${m.id})">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="confirmDelete('match',${m.id},'${escapeHtml(m.opponent)}')">🗑️ Delete</button>
        </div>
      </td>
    </tr>`).join('');
}

// Show add form
document.getElementById('addMatchBtn').addEventListener('click', () => {
  document.getElementById('matchFormTitle').textContent = 'Add Match';
  document.getElementById('matchForm').reset();
  document.getElementById('matchId').value = '';
  document.getElementById('matchFormError').textContent = '';
  document.getElementById('matchFormCard').style.display = 'block';
  document.getElementById('matchFormCard').scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('cancelMatchBtn').addEventListener('click', () => {
  document.getElementById('matchFormCard').style.display = 'none';
});

// Populate edit form
window.editMatch = function(id) {
  const m = matchesData.find(x => x.id === id);
  if (!m) return;
  document.getElementById('matchFormTitle').textContent = 'Edit Match';
  document.getElementById('matchId').value   = m.id;
  document.getElementById('mFormat').value   = m.format;
  document.getElementById('mOpponent').value = m.opponent;
  document.getElementById('mDate').value     = m.date ? String(m.date).substring(0, 10) : '';
  document.getElementById('mVenue').value    = m.venue || '';
  document.getElementById('mRuns').value     = m.runs  || 0;
  document.getElementById('mBalls').value    = m.balls || 0;
  document.getElementById('mFours').value    = m.fours || 0;
  document.getElementById('mSixes').value    = m.sixes || 0;
  document.getElementById('mResult').value   = m.result || 'Won';
  document.getElementById('mNotOut').checked = !!m.notOut;
  document.getElementById('matchFormError').textContent = '';
  document.getElementById('matchFormCard').style.display = 'block';
  document.getElementById('matchFormCard').scrollIntoView({ behavior: 'smooth' });
};

// Save match (add or update)
document.getElementById('matchForm').addEventListener('submit', async e => {
  e.preventDefault();
  const errEl = document.getElementById('matchFormError');
  errEl.textContent = '';

  const id = document.getElementById('matchId').value;
  const payload = {
    format:   document.getElementById('mFormat').value,
    opponent: document.getElementById('mOpponent').value.trim(),
    date:     document.getElementById('mDate').value || null,
    venue:    document.getElementById('mVenue').value.trim() || null,
    runs:     parseInt(document.getElementById('mRuns').value)  || 0,
    balls:    parseInt(document.getElementById('mBalls').value) || 0,
    fours:    parseInt(document.getElementById('mFours').value) || 0,
    sixes:    parseInt(document.getElementById('mSixes').value) || 0,
    result:   document.getElementById('mResult').value,
    notOut:   document.getElementById('mNotOut').checked,
  };

  if (!payload.format || !payload.opponent) {
    errEl.textContent = 'Format and Opponent are required.';
    return;
  }

  try {
    if (id) {
      // Update existing
      const updated = await apiFetch(`${API.matches}/${id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: parseInt(id), ...payload }),
      });
      const idx = matchesData.findIndex(x => x.id === parseInt(id));
      if (idx !== -1) matchesData[idx] = updated;
      showToast('Match updated!');
    } else {
      // Add new
      const created = await apiFetch(API.matches, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      matchesData.push(created);
      showToast('Match added!');
    }
    document.getElementById('matchFormCard').style.display = 'none';
    renderMatchAdmin();
    // Refresh dashboard counts
    document.getElementById('sc-matches').textContent = matchesData.length;
  } catch (err) {
    errEl.textContent = '⚠️ Save failed. Check server connection.';
    console.error(err);
  }
});

/* ============================================================
   STATS TAB
   ============================================================ */
function renderStatsAdmin() {
  const container = document.getElementById('statsFormContainer');
  if (!statsData.length) {
    container.innerHTML = `<div class="table-empty">No stats found.</div>`;
    return;
  }
  container.innerHTML = statsData.map(s => {
    const fmtCls = s.format === 'ODI' ? 'format-odi' : s.format === 'Test' ? 'format-test' : 'format-t20';
    return `
    <div class="stats-edit-card">
      <div class="stats-edit-header">
        <span class="stats-edit-title">
          <span class="format-badge ${fmtCls}">${s.format}</span>&nbsp; ${s.format} Statistics
        </span>
      </div>
      <form class="form-grid" id="statsForm-${s.id}" data-id="${s.id}">
        <div class="form-group">
          <label class="form-label">Matches</label>
          <input type="number" class="form-input" name="matches" value="${s.matches}" min="0">
        </div>
        <div class="form-group">
          <label class="form-label">Runs</label>
          <input type="number" class="form-input" name="runs" value="${s.runs}" min="0">
        </div>
        <div class="form-group">
          <label class="form-label">Centuries</label>
          <input type="number" class="form-input" name="centuries" value="${s.centuries}" min="0">
        </div>
        <div class="form-group">
          <label class="form-label">Half Centuries</label>
          <input type="number" class="form-input" name="halfCenturies" value="${s.halfCenturies}" min="0">
        </div>
        <div class="form-group">
          <label class="form-label">Average</label>
          <input type="number" class="form-input" name="average" value="${s.average}" step="0.01" min="0">
        </div>
        <div class="form-group">
          <label class="form-label">Strike Rate</label>
          <input type="number" class="form-input" name="strikeRate" value="${s.strikeRate}" step="0.01" min="0">
        </div>
      </form>
      <div class="form-actions" style="margin-top:16px;">
        <button class="btn btn-primary btn-sm" onclick="saveStats(${s.id})">💾 Save ${s.format}</button>
      </div>
    </div>`;
  }).join('');
}

window.saveStats = async function(id) {
  const form = document.getElementById(`statsForm-${id}`);
  const s    = statsData.find(x => x.id === id);
  if (!form || !s) return;

  const payload = {
    id,
    format:        s.format,
    matches:       parseInt(form.matches.value)       || 0,
    runs:          parseInt(form.runs.value)           || 0,
    centuries:     parseInt(form.centuries.value)      || 0,
    halfCenturies: parseInt(form.halfCenturies.value)  || 0,
    average:       parseFloat(form.average.value)      || 0,
    strikeRate:    parseFloat(form.strikeRate.value)   || 0,
  };

  try {
    const updated = await apiFetch(`${API.stats}/${id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    const idx = statsData.findIndex(x => x.id === id);
    if (idx !== -1) statsData[idx] = updated || payload;
    showToast(`${s.format} stats updated!`);
  } catch (err) {
    showToast('Save failed — check server', 'error');
    console.error(err);
  }
};

/* ============================================================
   COMMENTS TAB
   ============================================================ */
function renderCommentsAdmin() {
  const container = document.getElementById('adminCommentsList');
  document.getElementById('commentCountLabel').textContent =
    `${commentsData.length} comment${commentsData.length !== 1 ? 's' : ''}`;

  if (!commentsData.length) {
    container.innerHTML = `<div class="comments-empty">No comments yet.</div>`;
    return;
  }
  container.innerHTML = commentsData.map(c => `
    <div class="admin-comment-card" id="comment-card-${c.id}">
      <div class="admin-comment-body">
        <div class="admin-comment-meta">
          <span class="admin-comment-user">👑 ${escapeHtml(c.username)}</span>
          <span class="admin-comment-time">${formatDate(c.createdAt)}</span>
        </div>
        <p class="admin-comment-msg">${escapeHtml(c.message)}</p>
      </div>
      <button class="btn btn-danger btn-sm"
        onclick="confirmDelete('comment',${c.id},'${escapeHtml(c.username)}')">
        🗑️ Delete
      </button>
    </div>`).join('');
}

/* ============================================================
   DELETE CONFIRM MODAL
   ============================================================ */
window.confirmDelete = function(type, id, label) {
  pendingDeleteId   = id;
  pendingDeleteType = type;
  document.getElementById('modalMsg').textContent =
    `Delete ${type} "${label}"? This cannot be undone.`;
  document.getElementById('modalOverlay').style.display = 'flex';
};

document.getElementById('modalCancel').addEventListener('click', () => {
  document.getElementById('modalOverlay').style.display = 'none';
  pendingDeleteId = pendingDeleteType = null;
});

document.getElementById('modalConfirm').addEventListener('click', async () => {
  document.getElementById('modalOverlay').style.display = 'none';
  if (!pendingDeleteId || !pendingDeleteType) return;

  const id   = pendingDeleteId;
  const type = pendingDeleteType;
  pendingDeleteId = pendingDeleteType = null;

  try {
    const url = type === 'match'
      ? `${API.matches}/${id}`
      : `${API.comments}/${id}`;
    await apiFetch(url, { method: 'DELETE' });

    if (type === 'match') {
      matchesData = matchesData.filter(x => x.id !== id);
      renderMatchAdmin();
      document.getElementById('sc-matches').textContent = matchesData.length;
    } else {
      commentsData = commentsData.filter(x => x.id !== id);
      renderCommentsAdmin();
      document.getElementById('sc-comments').textContent = commentsData.length;
    }
    showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted!`);
  } catch (err) {
    showToast('Delete failed — check server', 'error');
    console.error(err);
  }
});

/* ============================================================
   INIT
   ============================================================ */
(async function init() {
  await loadDashboard();
  renderMatchAdmin();
  renderStatsAdmin();
  renderCommentsAdmin();
})();
