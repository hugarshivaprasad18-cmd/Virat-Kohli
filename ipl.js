/* ============================================================
   KING KOHLI — ipl.js
   IPL Career Stats & Performances
   ============================================================ */
'use strict';

const API = {
  iplStats: '/api/ipl/stats',
  iplPerf:  '/api/ipl/performances',
};

let allPerformances = [];
let searchDebounce;

/* ── Utilities ─────────────────────────────────────────── */
function animateCounter(el, target, duration = 1800) {
  const start = performance.now();
  function step(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.floor(eased * target).toLocaleString();
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = target.toLocaleString();
  }
  requestAnimationFrame(step);
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function resultBadge(r) {
  const cls = r === 'Won' ? 'result-won' : r === 'Lost' ? 'result-lost' : 'result-draw';
  return `<span class="result-badge ${cls}">${r}</span>`;
}
function escapeHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

async function apiFetch(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* ── Navbar ─────────────────────────────────────────────── */
window.addEventListener('scroll', () => {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 40);
});
document.getElementById('navToggle').addEventListener('click', () => {
  document.getElementById('navLinks').classList.toggle('open');
});

/* ── Hero counters ──────────────────────────────────────── */
(function() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        animateCounter(e.target, parseFloat(e.target.dataset.target));
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.hero-stat-number[data-target]').forEach(c => io.observe(c));
})();

/* ── Season Stats ───────────────────────────────────────── */
async function loadIplStats() {
  const tbody   = document.getElementById('iplStatsBody');
  const summary = document.getElementById('iplSummaryRow');

  try {
    const data = await apiFetch(API.iplStats);

    // Summary totals
    const totals = data.reduce((a, s) => ({
      matches:       a.matches       + (s.matches       || 0),
      runs:          a.runs          + (s.runs          || 0),
      centuries:     a.centuries     + (s.centuries     || 0),
      halfCenturies: a.halfCenturies + (s.halfCenturies || 0),
    }), { matches: 0, runs: 0, centuries: 0, halfCenturies: 0 });

    const best = data.reduce((a, b) => (b.runs > a.runs ? b : a), data[0]);

    summary.innerHTML = `
      <div class="ipl-summary-card">
        <div class="ipl-sc-icon">🏏</div>
        <div class="ipl-sc-value" data-count="${totals.matches}">0</div>
        <div class="ipl-sc-label">Total Matches</div>
      </div>
      <div class="ipl-summary-card">
        <div class="ipl-sc-icon">🏆</div>
        <div class="ipl-sc-value" data-count="${totals.runs}">0</div>
        <div class="ipl-sc-label">Total Runs</div>
      </div>
      <div class="ipl-summary-card">
        <div class="ipl-sc-icon">💯</div>
        <div class="ipl-sc-value" data-count="${totals.centuries}">0</div>
        <div class="ipl-sc-label">Centuries</div>
      </div>
      <div class="ipl-summary-card">
        <div class="ipl-sc-icon">⭐</div>
        <div class="ipl-sc-value" data-count="${totals.halfCenturies}">0</div>
        <div class="ipl-sc-label">Half-Centuries</div>
      </div>
      <div class="ipl-summary-card">
        <div class="ipl-sc-icon">🔥</div>
        <div class="ipl-sc-value">${best.season}</div>
        <div class="ipl-sc-label">Best Season</div>
      </div>
      <div class="ipl-summary-card">
        <div class="ipl-sc-icon">📈</div>
        <div class="ipl-sc-value" data-count="${best.runs}">0</div>
        <div class="ipl-sc-label">Best Season Runs</div>
      </div>`;

    // Animate summary counters
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting && e.target.dataset.count) {
          animateCounter(e.target, parseFloat(e.target.dataset.count));
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.3 });
    summary.querySelectorAll('[data-count]').forEach(el => io.observe(el));

    // Stats table
    tbody.innerHTML = data.map(s => `
      <tr class="${s.season === 2016 ? 'season-2016' : ''}">
        <td><strong style="color:var(--gold)">${s.season}</strong></td>
        <td><span style="color:var(--crimson);font-weight:600;">${s.team}</span></td>
        <td>${s.matches}</td>
        <td style="color:var(--gold);font-family:'Oswald',sans-serif;font-size:1.05rem;">${s.runs}</td>
        <td>${s.centuries}</td>
        <td>${s.halfCenturies}</td>
        <td>${s.highestScore}${s.season === 2016 && s.highestScore === 113 ? '*' : ''}</td>
        <td>${s.average?.toFixed(2) ?? '—'}</td>
        <td>${s.strikeRate?.toFixed(2) ?? '—'}</td>
        <td>${s.orangeCap ? '<span class="orange-cap-badge">🧢 Orange Cap</span>' : '—'}</td>
      </tr>`).join('');

    // Season filter buttons
    buildSeasonButtons(data.map(s => s.season));

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="10" class="table-empty">⚠️ Could not load IPL stats. Is the server running?</td></tr>`;
    summary.innerHTML = `<div class="table-empty">⚠️ Server not reachable.</div>`;
    console.error(err);
  }
}

/* ── Season filter buttons ──────────────────────────────── */
function buildSeasonButtons(seasons) {
  const bar = document.getElementById('iplSeasonBtns');
  bar.innerHTML = `<button class="filter-btn-sm active" data-ipl-season="ALL">All</button>` +
    seasons.map(s => `<button class="filter-btn-sm" data-ipl-season="${s}">${s}</button>`).join('');

  bar.querySelectorAll('[data-ipl-season]').forEach(btn => {
    btn.addEventListener('click', () => {
      bar.querySelectorAll('[data-ipl-season]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const season = btn.dataset.iplSeason;
      document.getElementById('iplSearch').value = '';
      document.getElementById('iplSearchClear').style.display = 'none';
      loadPerformances(season === 'ALL' ? null : parseInt(season));
    });
  });
}

/* ── Performances ───────────────────────────────────────── */
async function loadPerformances(season) {
  const tbody = document.getElementById('iplPerfBody');
  tbody.innerHTML = `<tr><td colspan="9" class="table-loading"><div class="spinner"></div> Loading…</td></tr>`;
  try {
    const url = season ? `${API.iplPerf}?season=${season}` : API.iplPerf;
    allPerformances = await apiFetch(url);
    renderPerformances(allPerformances);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" class="table-empty">⚠️ Could not load performances.</td></tr>`;
    console.error(err);
  }
}

function renderPerformances(data) {
  const tbody = document.getElementById('iplPerfBody');
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

/* ── Search ─────────────────────────────────────────────── */
const iplSearch = document.getElementById('iplSearch');
const iplClear  = document.getElementById('iplSearchClear');

iplSearch.addEventListener('input', () => {
  const q = iplSearch.value.trim();
  iplClear.style.display = q ? 'block' : 'none';
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(async () => {
    if (!q) { renderPerformances(allPerformances); return; }
    try {
      const data = await apiFetch(`${API.iplPerf}/search?query=${encodeURIComponent(q)}`);
      renderPerformances(data);
    } catch (err) { console.error(err); }
  }, 350);
});

iplClear.addEventListener('click', () => {
  iplSearch.value = '';
  iplClear.style.display = 'none';
  renderPerformances(allPerformances);
});

/* ── Init ───────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  loadIplStats();
  loadPerformances(null);
});
