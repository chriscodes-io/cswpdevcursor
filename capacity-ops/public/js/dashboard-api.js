const API_BASE = '';
const DASHBOARD_KEY_STORAGE = 'capacity_ops_dashboard_key';

function getDashboardKey() {
  return sessionStorage.getItem(DASHBOARD_KEY_STORAGE) || '';
}

function setDashboardKey(key) {
  sessionStorage.setItem(DASHBOARD_KEY_STORAGE, key);
}

async function apiFetch(path, options = {}) {
  const key = getDashboardKey();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (key) headers.Authorization = `Bearer ${key}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

async function ensureDashboardAuth() {
  let key = getDashboardKey();
  if (!key) {
    key = window.prompt('Enter dashboard API key (DASHBOARD_API_KEY):') || '';
    if (!key) throw new Error('API key required');
    setDashboardKey(key);
  }
  return key;
}

async function loadLeads() {
  await ensureDashboardAuth();
  const data = await apiFetch('/api/leads');
  return data.leads || [];
}

async function submitAuditFromDashboard(url, email, projectName) {
  const res = await fetch(`${API_BASE}/api/audit/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, email, projectName }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Audit failed');
  return data;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function renderLeadsTable(leads) {
  const tbody = document.getElementById('leadsTableBody');
  if (!tbody) return;
  tbody.replaceChildren();
  if (!leads.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 5;
    td.textContent = 'No leads yet — run an audit from the homepage.';
    td.style.color = 'var(--t2)';
    td.style.padding = '20px';
    tr.append(td);
    tbody.append(tr);
    return;
  }
  leads.forEach((lead) => {
    const audit = Array.isArray(lead.audits) ? lead.audits[0] : lead.audits;
    const tr = document.createElement('tr');
    const cols = [
      lead.email,
      lead.website_url,
      audit?.overall_score != null ? `${audit.overall_score}/100` : '—',
      lead.status || 'new',
      formatDate(lead.created_at),
    ];
    cols.forEach((text) => {
      const td = document.createElement('td');
      td.textContent = text;
      tr.append(td);
    });
    tbody.append(tr);
  });
}

async function refreshDashboard() {
  try {
    const leads = await loadLeads();
    renderLeadsTable(leads);
    const kpiLeads = document.getElementById('kpiLeadsCount');
    if (kpiLeads) kpiLeads.textContent = String(leads.length);
    const recent = leads[0];
    if (recent?.audits) {
      const audit = Array.isArray(recent.audits) ? recent.audits[0] : recent.audits;
      if (audit?.overall_score != null) {
        const kpiScore = document.getElementById('kpiAvgScore');
        if (kpiScore) kpiScore.textContent = String(audit.overall_score);
      }
    }
  } catch (err) {
    console.error(err);
    toast(err.message || 'Failed to load leads');
  }
}

async function runDashboardAudit() {
  const url = document.getElementById('auditUrlIn')?.value?.trim();
  const email = window.prompt('Lead email for this audit:');
  if (!url || !email) {
    toast('URL and email required');
    return;
  }
  toast('Running audit…');
  try {
    const data = await submitAuditFromDashboard(url, email);
    showResults();
    if (data.shareLink) {
      window.lastShareLink = data.shareLink;
    }
    if (data.scores) {
      updateAuditScores(data.scores);
    }
    await refreshDashboard();
    toast('Audit complete — report emailed');
  } catch (err) {
    toast(err.message || 'Audit failed');
  }
}

function updateAuditScores(scores) {
  const map = {
    scoreOverall: scores.overall,
    scorePerf: scores.performance,
    scoreSeo: scores.seo,
    scoreSec: scores.security,
    scoreA11y: scores.accessibility,
  };
  Object.entries(map).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val != null ? String(val) : '—';
  });
}

function shareLink() {
  const link = window.lastShareLink || `${window.location.origin}/audit/share/demo`;
  navigator.clipboard?.writeText(link).catch(() => {});
  toast('Share link copied to clipboard');
}

document.addEventListener('DOMContentLoaded', () => {
  refreshDashboard();
  const runBtn = document.querySelector('#page-audit .btn-p');
  if (runBtn) runBtn.addEventListener('click', (e) => {
    e.preventDefault();
    runDashboardAudit();
  });
});
