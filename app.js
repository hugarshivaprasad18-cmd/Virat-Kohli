/* ============================================================
   KING KOHLI FAN EXPERIENCE — app.js
   Full backend integration via Fetch API
   ============================================================ */

'use strict';

/* ── Preloader ─────────────────────────────────────────── */
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('preloader').classList.add('hidden');
  }, 1900);
});

/* ── Hero particles ────────────────────────────────────── */
(function spawnParticles() {
  const container = document.getElementById('heroParticles');
  if (!container) return;
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.cssText = `
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      width: ${Math.random() * 4 + 2}px;
      height: ${Math.random() * 4 + 2}px;
      animation-duration: ${Math.random() * 8 + 6}s;
      animation-delay: ${Math.random() * 6}s;
      background: ${Math.random() > .5 ? '#dc143c' : '#ffd700'};
      opacity: 0;
    `;
    container.appendChild(p);
  }
})();

/* ── Scroll reveal ─────────────────────────────────────── */
(function initReveal() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
})();

const API = {
  stats:    '/api/stats',
  matches:  '/api/matches',
  comments: '/api/comments',
  search:   '/api/search',
};

/* ============================================================
   UTILITIES
   ============================================================ */
function animateCounter(el, target, duration = 1800) {
  const isDecimal = !Number.isInteger(target);
  const start = performance.now();
  function step(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    const val = eased * target;
    el.textContent = isDecimal ? val.toFixed(2) : Math.floor(val).toLocaleString();
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = isDecimal ? target.toFixed(2) : target.toLocaleString();
  }
  requestAnimationFrame(step);
}

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

async function apiFetch(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* ============================================================
   NAVBAR
   ============================================================ */
(function initNavbar() {
  const navbar = document.getElementById('navbar');
  const toggle = document.getElementById('navToggle');
  const links  = document.getElementById('navLinks');
  const navLinks = document.querySelectorAll('.nav-link');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  });

  toggle.addEventListener('click', () => links.classList.toggle('open'));

  navLinks.forEach(l => l.addEventListener('click', () => links.classList.remove('open')));

  // Active link on scroll
  const sections = document.querySelectorAll('section[id]');
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        navLinks.forEach(l => l.classList.remove('active'));
        const a = document.querySelector(`.nav-link[href="#${e.target.id}"]`);
        if (a) a.classList.add('active');
      }
    });
  }, { threshold: 0.4 });
  sections.forEach(s => io.observe(s));
})();

/* ============================================================
   HERO — counter animation on scroll into view
   ============================================================ */
(function initHero() {
  const counters = document.querySelectorAll('.hero-stat-number[data-target]');
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        animateCounter(e.target, parseFloat(e.target.dataset.target));
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(c => io.observe(c));
})();

/* ============================================================
   DASHBOARD — Stats
   ============================================================ */
const icons = { ODI: '🏏', Test: '🎯', T20: '⚡' };

async function loadStats(format) {
  const grid   = document.getElementById('statsGrid');
  const aggBar = document.getElementById('aggregateBar');
  grid.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>Loading stats…</p></div>`;
  aggBar.style.display = 'none';

  try {
    const url  = format === 'ALL' ? API.stats : `${API.stats}/filter?format=${format}`;
    const data = await apiFetch(url);

    if (!data.length) {
      grid.innerHTML = `<div class="table-empty">No stats found.</div>`;
      return;
    }

    grid.innerHTML = data.map(s => statCardHTML(s)).join('');
    grid.querySelectorAll('[data-count]').forEach(el => {
      animateCounter(el, parseFloat(el.dataset.count));
    });

    if (format === 'ALL') {
      const t = data.reduce((a, s) => ({
        matches:       a.matches       + (s.matches       || 0),
        runs:          a.runs          + (s.runs          || 0),
        centuries:     a.centuries     + (s.centuries     || 0),
        halfCenturies: a.halfCenturies + (s.halfCenturies || 0),
      }), { matches: 0, runs: 0, centuries: 0, halfCenturies: 0 });

      document.getElementById('aggMatches').textContent       = t.matches.toLocaleString();
      document.getElementById('aggRuns').textContent          = t.runs.toLocaleString();
      document.getElementById('aggCenturies').textContent     = t.centuries;
      document.getElementById('aggHalfCenturies').textContent = t.halfCenturies;
      aggBar.style.display = 'flex';
    }
  } catch (err) {
    grid.innerHTML = `<div class="table-empty">⚠️ Could not load stats. Is the server running?</div>`;
    console.error(err);
  }
}

function statCardHTML(s) {
  const fmtCls = s.format === 'ODI' ? 'format-odi' : s.format === 'Test' ? 'format-test' : 'format-t20';
  return `
    <div class="stat-card">
      <span class="stat-card-format format-badge ${fmtCls}">${s.format}</span>
      <div class="stat-card-icon">${icons[s.format] || '📊'}</div>
      <div class="stat-card-label">Matches</div>
      <div class="stat-card-value" data-count="${s.matches}">0</div>
      <div class="stat-card-sub">Innings played</div>
    </div>
    <div class="stat-card">
      <span class="stat-card-format format-badge ${fmtCls}">${s.format}</span>
      <div class="stat-card-icon">🏆</div>
      <div class="stat-card-label">Runs</div>
      <div class="stat-card-value" data-count="${s.runs}">0</div>
      <div class="stat-card-sub">Total runs scored</div>
    </div>
    <div class="stat-card">
      <span class="stat-card-format format-badge ${fmtCls}">${s.format}</span>
      <div class="stat-card-icon">💯</div>
      <div class="stat-card-label">Centuries</div>
      <div class="stat-card-value" data-count="${s.centuries}">0</div>
      <div class="stat-card-sub">${s.halfCenturies} half-centuries</div>
    </div>
    <div class="stat-card">
      <span class="stat-card-format format-badge ${fmtCls}">${s.format}</span>
      <div class="stat-card-icon">📈</div>
      <div class="stat-card-label">Average</div>
      <div class="stat-card-value" data-count="${s.average}">0</div>
      <div class="stat-card-sub">SR: ${s.strikeRate}</div>
    </div>`;
}

document.querySelectorAll('.filter-btn[data-format]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn[data-format]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadStats(btn.dataset.format);
  });
});

/* ── IPL summary inside Dashboard ── */
async function loadIplDashboard() {
  const cards = document.getElementById('iplDashCards');
  try {
    const data = await apiFetch('/api/ipl/stats');

    const t = data.reduce((a, s) => ({
      matches:       a.matches       + (s.matches       || 0),
      runs:          a.runs          + (s.runs          || 0),
      centuries:     a.centuries     + (s.centuries     || 0),
      halfCenturies: a.halfCenturies + (s.halfCenturies || 0),
      seasons:       a.seasons       + 1,
    }), { matches: 0, runs: 0, centuries: 0, halfCenturies: 0, seasons: 0 });

    // Best season
    const best = data.reduce((a, b) => (b.runs > a.runs ? b : a), data[0]);
    // Career average across all seasons
    const avgArr = data.filter(s => s.average > 0);
    const careerAvg = avgArr.length
      ? (avgArr.reduce((a, s) => a + s.average, 0) / avgArr.length).toFixed(2)
      : '—';
    // Career SR
    const srArr = data.filter(s => s.strikeRate > 0);
    const careerSR = srArr.length
      ? (srArr.reduce((a, s) => a + s.strikeRate, 0) / srArr.length).toFixed(2)
      : '—';

    cards.innerHTML = `
      <div class="ipl-dash-card">
        <div class="ipl-dash-icon">📅</div>
        <div class="ipl-dash-value" data-dash-count="${t.seasons}">${t.seasons}</div>
        <div class="ipl-dash-label">Seasons</div>
        <div class="ipl-dash-sub">2008 – 2024</div>
      </div>
      <div class="ipl-dash-card">
        <div class="ipl-dash-icon">🏏</div>
        <div class="ipl-dash-value" data-dash-count="${t.matches}">0</div>
        <div class="ipl-dash-label">Matches</div>
        <div class="ipl-dash-sub">For RCB</div>
      </div>
      <div class="ipl-dash-card">
        <div class="ipl-dash-icon">🏆</div>
        <div class="ipl-dash-value" data-dash-count="${t.runs}">0</div>
        <div class="ipl-dash-label">Runs</div>
        <div class="ipl-dash-sub">Total IPL runs</div>
      </div>
      <div class="ipl-dash-card">
        <div class="ipl-dash-icon">💯</div>
        <div class="ipl-dash-value" data-dash-count="${t.centuries}">0</div>
        <div class="ipl-dash-label">Centuries</div>
        <div class="ipl-dash-sub">${t.halfCenturies} half-centuries</div>
      </div>
      <div class="ipl-dash-card">
        <div class="ipl-dash-icon">📈</div>
        <div class="ipl-dash-value">${careerAvg}</div>
        <div class="ipl-dash-label">Average</div>
        <div class="ipl-dash-sub">Career avg</div>
      </div>
      <div class="ipl-dash-card">
        <div class="ipl-dash-icon">⚡</div>
        <div class="ipl-dash-value">${careerSR}</div>
        <div class="ipl-dash-label">Strike Rate</div>
        <div class="ipl-dash-sub">Career SR</div>
      </div>
      <div class="ipl-dash-card">
        <div class="ipl-dash-icon">🔥</div>
        <div class="ipl-dash-value">${best.season}</div>
        <div class="ipl-dash-label">Best Season</div>
        <div class="ipl-dash-sub">${best.runs} runs</div>
      </div>
      <div class="ipl-dash-card">
        <div class="ipl-dash-icon">🧢</div>
        <div class="ipl-dash-value">1</div>
        <div class="ipl-dash-label">Orange Cap</div>
        <div class="ipl-dash-sub">2016 — 973 runs</div>
      </div>`;

    // Animate counters when visible
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting && e.target.dataset.dashCount) {
          animateCounter(e.target, parseFloat(e.target.dataset.dashCount));
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.3 });
    cards.querySelectorAll('[data-dash-count]').forEach(el => io.observe(el));

  } catch (err) {
    cards.innerHTML = `<div style="padding:20px;color:var(--text-muted);font-size:.85rem;">⚠️ Could not load IPL data.</div>`;
    console.error(err);
  }
}

/* ============================================================
   MATCH HISTORY
   ============================================================ */
let allMatches = [];
let searchDebounce;

async function loadMatches(format) {
  const tbody = document.getElementById('matchTableBody');
  tbody.innerHTML = `<tr><td colspan="9" class="table-loading"><div class="spinner"></div> Loading…</td></tr>`;
  try {
    const url = (format && format !== 'ALL')
      ? `${API.matches}?format=${format}`
      : API.matches;
    allMatches = await apiFetch(url);
    renderMatchTable(allMatches);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" class="table-empty">⚠️ Could not load matches.</td></tr>`;
    console.error(err);
  }
}

function renderMatchTable(matches) {
  const tbody = document.getElementById('matchTableBody');
  const count = document.getElementById('matchCount');
  if (!matches.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="table-empty">No matches found.</td></tr>`;
    count.textContent = '';
    return;
  }
  tbody.innerHTML = matches.map(m => `
    <tr>
      <td>${formatBadge(m.format)}</td>
      <td><strong>${escapeHtml(m.opponent)}</strong></td>
      <td>${formatDate(m.date)}</td>
      <td style="max-width:180px;white-space:normal;font-size:.82rem;">${escapeHtml(m.venue || '—')}</td>
      <td class="runs-cell">${m.runs}${m.notOut ? '*' : ''}</td>
      <td>${m.balls ?? '—'}</td>
      <td>${m.fours ?? '—'}</td>
      <td>${m.sixes ?? '—'}</td>
      <td>${resultBadge(m.result)}</td>
    </tr>`).join('');
  count.textContent = `Showing ${matches.length} match${matches.length !== 1 ? 'es' : ''}`;
}

// Search input
const matchSearchInput = document.getElementById('matchSearch');
const searchClear      = document.getElementById('searchClear');

matchSearchInput.addEventListener('input', () => {
  const q = matchSearchInput.value.trim();
  searchClear.style.display = q ? 'block' : 'none';
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => doMatchSearch(q), 350);
});

searchClear.addEventListener('click', () => {
  matchSearchInput.value = '';
  searchClear.style.display = 'none';
  renderMatchTable(allMatches);
});

async function doMatchSearch(query) {
  if (!query) { renderMatchTable(allMatches); return; }
  try {
    const data = await apiFetch(`${API.matches}/search?query=${encodeURIComponent(query)}`);
    renderMatchTable(data);
  } catch (err) { console.error(err); }
}

// Format filter
document.querySelectorAll('.filter-btn-sm[data-match-format]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn-sm[data-match-format]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    matchSearchInput.value = '';
    searchClear.style.display = 'none';
    loadMatches(btn.dataset.matchFormat);
  });
});

/* ============================================================
   GLOBAL SEARCH
   ============================================================ */
const globalInput  = document.getElementById('globalSearchInput');
const globalBtn    = document.getElementById('globalSearchBtn');
const globalResult = document.getElementById('globalSearchResults');

async function runGlobalSearch() {
  const q = globalInput.value.trim();
  if (!q) return;
  globalResult.style.display = 'block';
  globalResult.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>Searching…</p></div>`;
  try {
    const data = await apiFetch(`${API.search}?query=${encodeURIComponent(q)}`);
    renderGlobalResults(data, q);
  } catch (err) {
    globalResult.innerHTML = `<div class="search-no-results">⚠️ Search failed. Is the server running?</div>`;
    console.error(err);
  }
}

function renderGlobalResults({ matches = [], comments = [], totalResults = 0 }, q) {
  if (!totalResults) {
    globalResult.innerHTML = `<div class="search-no-results">No results for "<strong>${escapeHtml(q)}</strong>"</div>`;
    return;
  }
  let html = `<p style="color:var(--text-muted);font-size:.85rem;margin-bottom:20px;">
    ${totalResults} result(s) for "<strong style="color:var(--text-primary)">${escapeHtml(q)}</strong>"</p>`;

  if (matches.length) {
    html += `<div class="search-results-section">
      <div class="search-results-title">🏏 MATCHES (${matches.length})</div>
      ${matches.map(m => `
        <div class="search-result-item">
          ${formatBadge(m.format)} <strong>${escapeHtml(m.opponent)}</strong> —
          ${m.runs}${m.notOut ? '*' : ''} runs &bull; ${formatDate(m.date)} &bull; ${resultBadge(m.result)}
        </div>`).join('')}
    </div>`;
  }
  if (comments.length) {
    html += `<div class="search-results-section">
      <div class="search-results-title">💬 COMMENTS (${comments.length})</div>
      ${comments.map(c => `
        <div class="search-result-item">
          <span style="color:var(--gold);font-weight:600;">${escapeHtml(c.username)}</span>:
          ${escapeHtml(c.message)}
        </div>`).join('')}
    </div>`;
  }
  globalResult.innerHTML = html;
}

globalBtn.addEventListener('click', runGlobalSearch);
globalInput.addEventListener('keydown', e => { if (e.key === 'Enter') runGlobalSearch(); });

/* ============================================================
   COMMENTS
   ============================================================ */
const commentForm    = document.getElementById('commentForm');
const commentsList   = document.getElementById('commentsList');
const charCountEl    = document.getElementById('charCount');
const commentMessage = document.getElementById('commentMessage');
const submitBtn      = document.getElementById('submitBtn');
const formSuccess    = document.getElementById('formSuccess');

commentMessage.addEventListener('input', () => {
  charCountEl.textContent = commentMessage.value.length;
});

async function loadComments() {
  commentsList.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>Loading comments…</p></div>`;
  try {
    const data = await apiFetch(API.comments);
    renderComments(data);
  } catch (err) {
    commentsList.innerHTML = `<div class="comments-empty">⚠️ Could not load comments.</div>`;
    console.error(err);
  }
}

function renderComments(comments) {
  if (!comments.length) {
    commentsList.innerHTML = `<div class="comments-empty">No comments yet. Be the first! 👑</div>`;
    return;
  }
  commentsList.innerHTML = comments.map(c => `
    <div class="comment-card">
      <div class="comment-header">
        <span class="comment-username">👑 ${escapeHtml(c.username)}</span>
        <span class="comment-time">${formatDate(c.createdAt)}</span>
      </div>
      <p class="comment-message">${escapeHtml(c.message)}</p>
    </div>`).join('');
}

commentForm.addEventListener('submit', async e => {
  e.preventDefault();
  const username = document.getElementById('commentUsername').value.trim();
  const message  = commentMessage.value.trim();
  const uErr = document.getElementById('usernameError');
  const mErr = document.getElementById('messageError');

  uErr.textContent = '';
  mErr.textContent = '';
  document.getElementById('commentUsername').classList.remove('error');
  commentMessage.classList.remove('error');

  let valid = true;
  if (!username) { uErr.textContent = 'Name is required.'; document.getElementById('commentUsername').classList.add('error'); valid = false; }
  if (!message)  { mErr.textContent = 'Message is required.'; commentMessage.classList.add('error'); valid = false; }
  if (!valid) return;

  submitBtn.querySelector('.btn-text').style.display    = 'none';
  submitBtn.querySelector('.btn-loading').style.display = 'inline';
  submitBtn.disabled = true;

  try {
    const res = await fetch(API.comments, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username, message }),
    });
    if (!res.ok) throw new Error('Post failed');
    commentForm.reset();
    charCountEl.textContent = '0';
    formSuccess.style.display = 'block';
    setTimeout(() => { formSuccess.style.display = 'none'; }, 3000);
    await loadComments();
  } catch (err) {
    mErr.textContent = '⚠️ Failed to post. Is the server running?';
    console.error(err);
  } finally {
    submitBtn.querySelector('.btn-text').style.display    = 'inline';
    submitBtn.querySelector('.btn-loading').style.display = 'none';
    submitBtn.disabled = false;
  }
});

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  loadStats('ALL');
  loadMatches('ALL');
  loadComments();
  loadIplDashboard();
  loadIplStats();
  loadIplPerformances(null);
});

/* ============================================================
   IPL SECTION
   ============================================================ */
const IPL_API = {
  stats: '/api/ipl/stats',
  perf:  '/api/ipl/performances',
};

let allIplPerformances = [];
let iplSearchDebounce;

/* ── IPL Summary Cards + Season Table ── */
async function loadIplStats() {
  const summaryEl = document.getElementById('iplSummaryCards');
  const tbody     = document.getElementById('iplSeasonBody');

  try {
    const data = await apiFetch(IPL_API.stats);

    // Totals
    const totals = data.reduce((a, s) => ({
      matches:       a.matches       + (s.matches       || 0),
      runs:          a.runs          + (s.runs          || 0),
      centuries:     a.centuries     + (s.centuries     || 0),
      halfCenturies: a.halfCenturies + (s.halfCenturies || 0),
    }), { matches: 0, runs: 0, centuries: 0, halfCenturies: 0 });

    const best = data.reduce((a, b) => (b.runs > a.runs ? b : a), data[0]);

    summaryEl.innerHTML = `
      <div class="ipl-summary-card">
        <div class="ipl-sc-icon">🏏</div>
        <div class="ipl-sc-value" data-ipl-count="${totals.matches}">0</div>
        <div class="ipl-sc-label">IPL Matches</div>
      </div>
      <div class="ipl-summary-card">
        <div class="ipl-sc-icon">🏆</div>
        <div class="ipl-sc-value" data-ipl-count="${totals.runs}">0</div>
        <div class="ipl-sc-label">IPL Runs</div>
      </div>
      <div class="ipl-summary-card">
        <div class="ipl-sc-icon">💯</div>
        <div class="ipl-sc-value" data-ipl-count="${totals.centuries}">0</div>
        <div class="ipl-sc-label">Centuries</div>
      </div>
      <div class="ipl-summary-card">
        <div class="ipl-sc-icon">⭐</div>
        <div class="ipl-sc-value" data-ipl-count="${totals.halfCenturies}">0</div>
        <div class="ipl-sc-label">Half-Centuries</div>
      </div>
      <div class="ipl-summary-card">
        <div class="ipl-sc-icon">🔥</div>
        <div class="ipl-sc-value">${best.season}</div>
        <div class="ipl-sc-label">Best Season</div>
      </div>
      <div class="ipl-summary-card">
        <div class="ipl-sc-icon">📈</div>
        <div class="ipl-sc-value" data-ipl-count="${best.runs}">0</div>
        <div class="ipl-sc-label">Best Season Runs</div>
      </div>`;

    // Animate summary counters when visible
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting && e.target.dataset.iplCount) {
          animateCounter(e.target, parseFloat(e.target.dataset.iplCount));
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.3 });
    summaryEl.querySelectorAll('[data-ipl-count]').forEach(el => io.observe(el));

    // Season table
    tbody.innerHTML = data.map(s => `
      <tr class="${s.season === 2016 ? 'season-highlight' : ''}">
        <td><strong style="color:var(--gold)">${s.season}</strong></td>
        <td><span style="color:var(--crimson);font-weight:600;">${s.team}</span></td>
        <td>${s.matches}</td>
        <td style="color:var(--gold);font-family:'Oswald',sans-serif;font-size:1.05rem;font-weight:700;">${s.runs}</td>
        <td>${s.centuries}</td>
        <td>${s.halfCenturies}</td>
        <td>${s.highestScore}</td>
        <td>${s.average?.toFixed(2) ?? '—'}</td>
        <td>${s.strikeRate?.toFixed(2) ?? '—'}</td>
        <td>${s.orangeCap ? '<span class="orange-cap-badge">🧢 Orange Cap</span>' : '—'}</td>
      </tr>`).join('');

    // Build season filter buttons
    buildIplSeasonBtns(data.map(s => s.season));

  } catch (err) {
    summaryEl.innerHTML = `<div class="table-empty">⚠️ Could not load IPL stats.</div>`;
    tbody.innerHTML = `<tr><td colspan="10" class="table-empty">⚠️ Server not reachable.</td></tr>`;
    console.error(err);
  }
}

/* ── Season filter buttons ── */
function buildIplSeasonBtns(seasons) {
  const bar = document.getElementById('iplSeasonFilterBtns');
  bar.innerHTML =
    `<button class="filter-btn-sm active" data-ipl-season="ALL">All</button>` +
    seasons.map(s => `<button class="filter-btn-sm" data-ipl-season="${s}">${s}</button>`).join('');

  bar.querySelectorAll('[data-ipl-season]').forEach(btn => {
    btn.addEventListener('click', () => {
      bar.querySelectorAll('[data-ipl-season]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('iplPerfSearch').value = '';
      document.getElementById('iplPerfClear').style.display = 'none';
      const season = btn.dataset.iplSeason;
      loadIplPerformances(season === 'ALL' ? null : parseInt(season));
    });
  });
}

/* ── IPL Performances ── */
async function loadIplPerformances(season) {
  const tbody = document.getElementById('iplPerfTableBody');
  tbody.innerHTML = `<tr><td colspan="9" class="table-loading"><div class="spinner"></div> Loading…</td></tr>`;
  try {
    const url = season ? `${IPL_API.perf}?season=${season}` : IPL_API.perf;
    allIplPerformances = await apiFetch(url);
    renderIplPerformances(allIplPerformances);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" class="table-empty">⚠️ Could not load IPL performances.</td></tr>`;
    console.error(err);
  }
}

function renderIplPerformances(data) {
  const tbody = document.getElementById('iplPerfTableBody');
  const count = document.getElementById('iplPerfCount');
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="table-empty">No performances found.</td></tr>`;
    count.textContent = '';
    return;
  }
  tbody.innerHTML = data.map(p => `
    <tr>
      <td><strong style="color:var(--gold)">${p.season}</strong></td>
      <td><strong>${escapeHtml(p.opponent)}</strong></td>
      <td>${formatDate(p.date)}</td>
      <td style="max-width:160px;white-space:normal;font-size:.82rem;">${escapeHtml(p.venue || '—')}</td>
      <td class="runs-cell">${p.runs}${p.notOut ? '*' : ''}</td>
      <td>${p.balls ?? '—'}</td>
      <td>${p.fours ?? '—'}</td>
      <td>${p.sixes ?? '—'}</td>
      <td>${resultBadge(p.result)}</td>
    </tr>`).join('');
  count.textContent = `Showing ${data.length} performance${data.length !== 1 ? 's' : ''}`;
}

/* ── IPL Search ── */
const iplPerfSearch = document.getElementById('iplPerfSearch');
const iplPerfClear  = document.getElementById('iplPerfClear');

iplPerfSearch.addEventListener('input', () => {
  const q = iplPerfSearch.value.trim();
  iplPerfClear.style.display = q ? 'block' : 'none';
  clearTimeout(iplSearchDebounce);
  iplSearchDebounce = setTimeout(async () => {
    if (!q) { renderIplPerformances(allIplPerformances); return; }
    try {
      const data = await apiFetch(`${IPL_API.perf}/search?query=${encodeURIComponent(q)}`);
      renderIplPerformances(data);
    } catch (err) { console.error(err); }
  }, 350);
});

iplPerfClear.addEventListener('click', () => {
  iplPerfSearch.value = '';
  iplPerfClear.style.display = 'none';
  renderIplPerformances(allIplPerformances);
});
