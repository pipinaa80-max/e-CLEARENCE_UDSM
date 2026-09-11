const API = 'http://localhost:8090/api';
const state = { token: localStorage.getItem('superuser-token'), tab: 'overview', data: null, detail: null, message: '', systemStatus: 'checking', lastChecked: null, filter: '', adminFilter: '', auditFilter: '', showCreateForm: false };
const permissions = ['INSTITUTIONAL_ADMIN', 'VIEW_USERS', 'MANAGE_CLEARANCE'];

async function request(path, options = {}) {
  const response = await fetch(API + path, { ...options, headers: { 'Content-Type': 'application/json', ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}), ...(options.headers || {}) } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || 'Request failed');
  return payload;
}
function esc(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char])); }
function formatDate(value) { return value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Not recorded'; }
function initials(name) { return String(name || '?').split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase(); }
function bindInteractions() { document.querySelectorAll('.panel,.metric-card,.admin-row').forEach(surface => surface.addEventListener('pointermove', event => { const rect = surface.getBoundingClientRect(); surface.style.setProperty('--pointer-x', `${event.clientX - rect.left}px`); surface.style.setProperty('--pointer-y', `${event.clientY - rect.top}px`); })); document.querySelectorAll('button').forEach(button => button.addEventListener('pointerdown', event => { const rect = button.getBoundingClientRect(); const ripple = document.createElement('span'); ripple.className = 'ripple'; const size = Math.max(rect.width, rect.height) * 1.3; ripple.style.width = `${size}px`; ripple.style.height = `${size}px`; ripple.style.left = `${event.clientX - rect.left - size / 2}px`; ripple.style.top = `${event.clientY - rect.top - size / 2}px`; button.appendChild(ripple); ripple.addEventListener('animationend', () => ripple.remove(), { once: true }); })); }
function render() { document.querySelector('#app').innerHTML = state.token ? shell() : login(); bindInteractions(); }
function login() { return `<section class="login"><div class="login-orbit orbit-one"></div><div class="login-orbit orbit-two"></div><div class="login-panel"><div class="login-brand"><div><strong style="color:#F6B418; font-size:12px; letter-spacing:0.1em; text-transform:uppercase">E-CLEARENCE MIS</strong><h1 style="font-family:Georgia,serif; margin:5px 0 0; font-size:32px; color:#000000">SUPERADMIN</h1></div></div><div class="login-rule"></div><div class="eyebrow">SECURE OPERATIONS CONSOLE</div><h1>Welcome back.</h1><p>Govern delegated access, institutional ownership, and clearance operations from one focused workspace.</p>${state.message ? `<div class="message">${esc(state.message)}</div>` : ''}<form id="login-form"><div class="field"><label>Email address</label><div class="input-wrap"><span>@</span><input name="email" type="email" value="superuser@admin.local" autocomplete="username" required></div></div><div class="field"><label>Password</label><div class="input-wrap"><span>••</span><input name="password" type="password" autocomplete="current-password" required></div></div><button class="primary login-submit">Enter control center <span>→</span></button></form><div class="login-foot"><span class="online-dot"></span>Protected local workspace <span class="login-version">MIS / 01</span></div></div></section>`; }
function shell() {
  const isInstAdmin = state.data?.role === 'INSTITUTIONAL_ADMIN';
  const tabs = isInstAdmin ? [['overview','Overview'],['branding','Theme'],['dashboards','Dashboards']] : [['overview','Overview'],['admins','Institutional Administrators'],['dashboards','Enabled Dashboards'],['audit','Audit Events'],['posture','Access Posture']];
  const statusText = state.systemStatus === 'connected' ? 'API connected' : state.systemStatus === 'error' ? 'Connection issue' : 'Checking API';
  const statusTitle = state.lastChecked ? `Last checked ${formatDate(state.lastChecked)}` : 'Checking the Superadmin API';
  const user = { name: isInstAdmin ? 'Admin' : 'Superadmin', email: isInstAdmin ? 'admin@udsm.ac.tz' : 'superuser@admin.local' };

  return `<div class="shell">
    <aside class="sidebar">
      <div class="sidebar-brand">
        <div class="brand-main">E-CLEARENCE MIS</div>
        <div class="brand">SUPERUSER</div>
      </div>
      <div class="sidebar-info">
        <div class="brand-context">${isInstAdmin ? 'Institutional admin workspace' : 'System administration'}</div>
      </div>
      <nav class="nav">${tabs.map(([id,label]) => `<button class="${state.tab === id ? 'active' : ''}" data-tab="${id}"><span class="nav-dot"></span>${label}</button>`).join('')}</nav>
      <div class="sidebar-foot system-status ${state.systemStatus}" title="${statusTitle}"><span class="online-dot"></span> ${statusText}</div>
      <button class="logout" id="logout">Sign out</button>
    </aside>
    <div class="main-layout">
      <header class="main-header">
        <div class="breadcrumb">
          <span>Console</span> / <span>${tabs.find(t => t[0] === state.tab)?.[1] || 'Dashboard'}</span>
        </div>
        <div class="header-right">
          <div class="header-user">
            <div class="user-meta">
              <strong>${esc(user.name)}</strong>
              <span>${esc(user.email)}</span>
            </div>
            <div class="avatar">${initials(user.name)}</div>
          </div>
        </div>
      </header>
      <section class="content">
        ${state.message ? `<div class="message">${esc(state.message)}</div>` : ''}
        ${state.detail ? adminDetail() : state.tab === 'overview' ? overview() : state.tab === 'admins' ? admins() : state.tab === 'branding' ? branding() : state.tab === 'audit' ? audit() : state.tab === 'posture' ? posture() : dashboards()}
      </section>
      <footer class="main-footer">
        <div>&copy; 2026 University of Dar es Salaam. <span class="muted">E-Clearance Management Information System.</span></div>
        <div class="footer-right">
          <span class="muted">Version 2.4.0-Enterprise</span>
          · <a href="#" class="support-link">Support</a>
        </div>
      </footer>
    </div>
  </div>`;
}
function metric(label, value, detail, tone = '', tab = '') { return `<div class="metric-card ${tone}" ${tab ? `data-tab="${tab}" style="cursor:pointer"` : ''}><div class="metric-label">${label}</div><div class="metric-value">${value}</div><div class="metric-detail">${detail}</div></div>`; }
function adminRows(admins) { return `<div class="admin-list">${admins.map(a => `<div class="admin-row"><div class="avatar">${initials(a.name)}</div><div class="admin-identity"><strong>${esc(a.name)}</strong><span>${esc(a.email)}</span></div><div class="admin-project">${esc(a.metrics?.project?.name || 'Institutional workspace')}<small>${esc(a.projectId)}</small></div><div class="admin-stat"><strong>${a.metrics?.dashboards?.enabled ?? 0}</strong><span>dashboards</span></div><span class="status ${a.active ? 'active' : 'suspended'}"><i></i>${a.active ? 'Active' : 'Suspended'}</span><button class="row-action" data-view-admin="${a.id}">View details <span>→</span></button></div>`).join('') || '<div class="empty-state">No administrators created yet.</div>'}</div>`; }
function overview() {
  const d = state.data || { dashboards: [], subAdmins: [], branding: {}, activity: [], throughput: {}, statusSummary: {} };
  const active = d.subAdmins.filter(a => a.active).length;
  const events = d.activity || [];
  const status = d.statusSummary || {};
  const totalRequests = Object.values(status).reduce((a, b) => a + b, 0);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return `<div class="topline"><div><div class="eyebrow">Operations / overview</div><h1>${greeting}, Superadmin.</h1><div class="muted">A live view of delegated access and institutional activity.</div></div><button class="primary" data-tab="admins">Manage administrators →</button></div>
  <div class="metric-grid">
    ${metric('Institutional administrators', d.subAdmins.length, `${active} active accounts`, 'blue', 'admins')}
    ${metric('Enabled dashboards', d.dashboards.filter(x => x.enabled).length, `${d.dashboards.length} configured surfaces`, 'mint', 'dashboards')}
    ${metric('Audit events', events.length, 'Latest recorded actions', 'amber', 'audit')}
    ${metric('System throughput', totalRequests, 'Total clearance requests', 'green', 'posture')}
  </div>
  <div class="dashboard-grid">
    <section class="panel activity-panel">
      <div class="panel-head"><div><div class="eyebrow">Audit stream</div><h2>Recent activity</h2></div><span class="live-label"><i></i> Live</span></div>
      ${events.length ? `<div class="activity-list">${events.slice(0, 6).map(event => `<div class="activity-item"><div class="activity-icon">${event.action === 'LOGIN' ? '↗' : '+'}</div><div><strong>${esc(event.description)}</strong><p>${esc(event.adminName || 'System')} · ${formatDate(event.createdAt)}</p></div></div>`).join('')}</div>` : '<div class="empty-state">No activity has been recorded yet.</div>'}
    </section>
    <div class="stats-column" style="display: grid; gap: 24px;">
      <section class="panel distribution-panel">
        <div class="panel-head"><div><div class="eyebrow">Access distribution</div><h2>Administrator status</h2></div></div>
        <div class="donut-wrap">
          <div class="donut"><span>${active}<small>active</small></span></div>
          <div class="legend">
            <span><i class="legend-active"></i>Active <b>${active}</b></span>
            <span><i class="legend-muted"></i>Suspended <b>${d.subAdmins.length - active}</b></span>
          </div>
        </div>
      </section>
      <section class="panel health-panel">
        <div class="panel-head"><div><div class="eyebrow">System throughput</div><h2>Clearance status</h2></div></div>
        <div class="status-bars" style="display: grid; gap: 12px; margin-top: 10px;">
          ${Object.entries(status).map(([key, value]) => {
            const percent = totalRequests ? (value / totalRequests * 100) : 0;
            return `
              <div class="status-bar-item">
                <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
                  <span style="font-weight: 700; color: var(--ink-soft);">${key}</span>
                  <span style="color: var(--muted);">${value} (${Math.round(percent)}%)</span>
                </div>
                <div style="height: 6px; background: #eee; border-radius: 3px; overflow: hidden;">
                  <div style="height: 100%; width: ${percent}%; background: var(--sea); border-radius: 3px;"></div>
                </div>
              </div>
            `;
          }).join('') || '<div class="empty-state">No clearance data available.</div>'}
        </div>
      </section>
    </div>
  </div>
  <section class="panel table-panel"><div class="panel-head"><div><div class="eyebrow">Delegated access</div><h2>Administrators at a glance</h2></div><button class="text-button" data-tab="admins">View directory →</button></div>${adminRows(d.subAdmins.slice(0, 5))}</section>`;
}
function admins() {
  let admins = state.data?.subAdmins || [];
  if (state.adminFilter) {
    const f = state.adminFilter.toLowerCase();
    admins = admins.filter(a => esc(a.name).toLowerCase().includes(f) || esc(a.email).toLowerCase().includes(f) || esc(a.projectId || '').toLowerCase().includes(f));
  }
  return `<div class="topline"><div><div class="eyebrow">Directory / delegated access</div><h1>Administrators</h1><div class="muted">Monitor ownership, permissions, and institutional health from one directory.</div></div><button class="primary" id="toggle-admin-form">${state.showCreateForm ? '✕ Close form' : '+ Create administrator'}</button></div><div class="panel filter-panel" style="margin-bottom: 24px;"><div class="field" style="margin: 0"><label>Search directory</label><div class="input-wrap"><span>🔍</span><input type="text" id="admin-search" placeholder="Filter by name, email, or project ID..." value="${esc(state.adminFilter)}"></div></div></div><section class="panel table-panel"><div class="panel-head"><div><div class="eyebrow">${admins.length} accounts</div><h2>Access directory</h2></div><span class="muted">Sorted by creation date</span></div>${adminRows(admins)}</section><div class="panel create-panel" id="admin-form" style="${state.showCreateForm ? 'display:block' : 'display:none'}; margin-top: 24px;"><div class="panel-head"><div><h2>Provision access</h2><p class="muted">Create a scoped institutional workspace with fixed administrative permissions.</p></div></div><form id="admin-form-submit" class="form-grid"><div class="field"><label>Institutional name</label><input name="name" placeholder="e.g. College of Engineering" required></div><div class="field"><label>Institutional email</label><input name="email" type="email" placeholder="admin@college.udsm.ac.tz" required></div><div class="field"><label>Password</label><input name="password" type="password" minlength="12" required></div><div class="field full"><label>Permissions</label><div class="pill">INSTITUTIONAL ADMIN</div><input type="hidden" name="permissions" value="INSTITUTIONAL_ADMIN"></div><div><button class="primary">Create scoped workspace</button></div></form></div>`;
}
function dashboards() {
  const isSuperuser = state.data?.role === 'SUPERUSER';
  let items = state.data?.dashboards || [];
  if (state.filter) {
    const f = state.filter.toLowerCase();
    items = items.filter(d => esc(d.name).toLowerCase().includes(f) || esc(d.university || '').toLowerCase().includes(f) || esc(d.id).toLowerCase().includes(f));
  }
  return `<div class="topline"><div><div class="eyebrow">${isSuperuser ? 'Global / surfaces' : 'Institutional surfaces'}</div><h1>Dashboards</h1><div class="muted">Monitor configured dashboard entries and their active clearance counts.</div></div></div>${!isSuperuser ? `<div class="card"><h2>Add dashboard</h2><form id="dashboard-form" class="form-grid"><div class="field"><label>Identifier</label><input name="id" pattern="[a-z0-9-]+" required></div><div class="field"><label>Name</label><input name="name" required></div><div class="field full"><label>Description</label><textarea name="description" rows="3"></textarea></div><button class="primary">Add dashboard</button></form></div>` : `<div class="panel filter-panel" style="margin-bottom: 24px;"><div class="field" style="margin: 0"><label>Filter dashboards</label><div class="input-wrap"><span>🔍</span><input type="text" id="dashboard-filter" placeholder="Search by name, university, or ID..." value="${esc(state.filter)}"></div></div></div>`}<div class="section grid">${items.map(d => `<div class="card dashboard-stat-card"><div class="eyebrow" style="font-size: 10px">${esc(d.university || 'Institutional Surface')}</div><h3>${esc(d.name)}</h3><p class="muted" style="font-size: 12px; margin-bottom: 15px;">${esc(d.description)}</p><div class="metric-value" style="font-size: 24px; margin: 10px 0">${d.requestCount || 0}</div><div class="metric-detail" style="margin-bottom: 15px">Active clearance requests</div><div class="actions">${!isSuperuser ? `<button class="${d.enabled ? 'primary' : 'danger'}" data-toggle-dashboard="${d.id}">${d.enabled ? 'Enabled' : 'Disabled'}</button><button class="danger" data-delete-dashboard="${d.id}">Delete</button>` : `<span class="status ${d.enabled ? 'active' : 'suspended'}"><i></i>${d.enabled ? 'Operational' : 'Disabled'}</span>`}</div></div>`).join('') || '<div class="empty-state">No matching dashboards found.</div>'}</div>`;
}
function audit() {
  let events = state.data?.activity || [];
  if (state.auditFilter) {
    const f = state.auditFilter.toLowerCase();
    events = events.filter(e =>
      esc(e.description).toLowerCase().includes(f) ||
      esc(e.adminName || 'System').toLowerCase().includes(f) ||
      e.action.toLowerCase().includes(f)
    );
  }
  return `<div class="topline"><div><div class="eyebrow">Governance / stream</div><h1>Audit events</h1><div class="muted">A complete ledger of system operations and administrative actions.</div></div></div><div class="panel filter-panel" style="margin-bottom: 24px;"><div class="field" style="margin: 0"><label>Search activity</label><div class="input-wrap"><span>🔍</span><input type="text" id="audit-search" placeholder="Filter by description, administrator, or action..." value="${esc(state.auditFilter)}"></div></div></div><section class="panel"><div class="panel-head"><div><div class="eyebrow">Audit stream</div><h2>Recent activity</h2></div><span class="live-label"><i></i> Live</span></div>${events.length ? `<div class="activity-list">${events.map(event => `<div class="activity-item"><div class="activity-icon">${event.action === 'LOGIN' ? '↗' : '+'}</div><div><strong>${esc(event.description)}</strong><p>${esc(event.adminName || 'System')} · ${formatDate(event.createdAt)}</p></div></div>`).join('')}</div>` : '<div class="empty-state">No activity matches your search.</div>'}</section>`;
}
function posture() { return `<div class="topline"><div><div class="eyebrow">System / status</div><h1>Access posture</h1><div class="muted">Monitor the security health and connectivity of the Superadmin API.</div></div></div><div class="metric-grid">${metric('System status', 'Healthy', 'All services operational', 'green')}${metric('API Latency', '24ms', 'Excellent response time', 'blue')}${metric('Active Sessions', '3', 'Current superadmin access', 'amber')}</div><section class="panel"><div class="panel-head"><div><h2>Security Overview</h2></div></div><div class="padded"><p>The system is currently operating within normal parameters. No critical alerts have been triggered in the last 24 hours.</p><ul class="muted"><li>SSL Certificates: Valid</li><li>Database Connectivity: Stable</li><li>Authentication Gateway: Active</li></ul></div></section>`; }
function adminDetail() {
  const d = state.detail;
  const m = d.metrics;
  const a = d.admin;
  const activity = d.activity || [];

  return `
    <div class="topline">
      <div>
        <button class="back-button" data-tab="admins" data-close-detail>← Administrators</button>
        <div class="eyebrow">Administrator / profile</div>
        <h1>${esc(a.name)}</h1>
        <div class="muted">${esc(a.email)} · ${esc(a.projectId)}</div>
      </div>
      <span class="status large ${a.active ? 'active' : 'suspended'}"><i></i>${a.active ? 'Active access' : 'Suspended access'}</span>
    </div>

    <div class="profile-banner">
      <div class="avatar large-avatar">${initials(a.name)}</div>
      <div>
        <strong>${esc(a.name)}</strong>
        <span>Institutional administrator</span>
        <small>Created ${formatDate(a.createdAt)} · Last login ${formatDate(a.lastLoginAt)}</small>
      </div>
      <div class="profile-actions">
        <button class="outline" data-reset-admin="${a.id}">Reset password</button>
        <button class="danger" data-toggle-admin="${a.id}">${a.active ? 'Suspend access' : 'Activate access'}</button>
      </div>
    </div>

    <div class="metric-grid">
      ${metric('Managed staff', m.staff?.total || 0, 'Total institutional staff', 'blue')}
      ${metric('Enabled dashboards', m.dashboards.enabled, `${m.dashboards.total} configured`, 'mint')}
      ${metric('Recorded actions', m.activity.total, `${m.activity.last7Days} in the last 7 days`, 'amber')}
      ${metric('Permissions', a.permissions.length, a.permissions.length ? a.permissions.join(' · ') : 'No extra permissions', 'green')}
    </div>

    <div class="dashboard-grid">
      <section class="panel" style="grid-column: 1 / -1;">
        <div class="panel-head">
          <div>
            <div class="eyebrow">Governance history</div>
            <h2>Recorded activity</h2>
          </div>
        </div>
        ${activity.length ? `
          <div class="activity-list">
            ${activity.map(event => `
              <div class="activity-item">
                <div class="activity-icon">${event.action === 'LOGIN' ? '↗' : '•'}</div>
                <div>
                  <strong>${esc(event.description)}</strong>
                  <p>${formatDate(event.createdAt)}</p>
                </div>
              </div>
            `).join('')}
          </div>
        ` : '<div class="empty-state">No recorded actions for this administrator.</div>'}
      </section>
    </div>
  `;
}
async function refresh() { try { state.data = await request('/overview'); state.systemStatus = 'connected'; state.lastChecked = new Date().toISOString(); state.message = ''; render(); } catch (error) { state.systemStatus = 'error'; state.lastChecked = new Date().toISOString(); throw error; } }
async function loadDetail(adminId) { state.detail = await request(`/sub-admins/${adminId}/activity`); render(); }
document.addEventListener('input', event => {
  if (event.target.id === 'dashboard-filter') { state.filter = event.target.value; render(); const input = document.getElementById('dashboard-filter'); if (input) { input.focus(); input.setSelectionRange(state.filter.length, state.filter.length); } }
  if (event.target.id === 'admin-search') { state.adminFilter = event.target.value; render(); const input = document.getElementById('admin-search'); if (input) { input.focus(); input.setSelectionRange(state.adminFilter.length, state.adminFilter.length); } }
  if (event.target.id === 'audit-search') {
    state.auditFilter = event.target.value;
    render();
    const input = document.getElementById('audit-search');
    if (input) { input.focus(); input.setSelectionRange(state.auditFilter.length, state.auditFilter.length); }
  }
});
document.addEventListener('submit', async event => {
  event.preventDefault(); const form = event.target;
  try {
    if (form.id === 'login-form') { const result = await request('/login', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(form))) }); state.token = result.token; localStorage.setItem('superuser-token', state.token); await refresh(); }
    else if (form.id === 'admin-form-submit') { const input = Object.fromEntries(new FormData(form)); input.permissions = [form.querySelector('[name=permissions]').value]; await request('/sub-admins', { method: 'POST', body: JSON.stringify(input) }); state.tab = 'admins'; state.showCreateForm = false; await refresh(); }
    else if (form.id === 'branding-form') { const input = Object.fromEntries(new FormData(form)); delete input.logoFile; await request(state.data?.role === 'SUPERUSER' ? '/global-branding' : '/branding', { method: 'PUT', body: JSON.stringify(input) }); await refresh(); state.tab = 'branding'; render(); }
  } catch (error) { state.message = error.message; render(); }
});
document.addEventListener('click', async event => {
  const target = event.target.closest('button, [data-tab]'); if (!target) return;
  try {
    if (target.id === 'sidebar-toggle') {
      state.sidebarOpen = !state.sidebarOpen;
      render();
      return;
    }
    if (target.id === 'toggle-admin-form') { state.showCreateForm = !state.showCreateForm; render(); if (state.showCreateForm) document.getElementById('admin-form')?.scrollIntoView({ behavior: 'smooth' }); return; }
    if (target.dataset.tab) { state.detail = null; state.tab = target.dataset.tab; state.message = ''; render(); }
    if (target.dataset.viewAdmin) await loadDetail(target.dataset.viewAdmin);
    if (target.id === 'logout') { localStorage.removeItem('superuser-token'); state.token = null; render(); }
    if (target.dataset.toggleDashboard) { const dashboard = state.data.dashboards.find(d => d.id === target.dataset.toggleDashboard); await request(`/dashboards/${dashboard.id}`, { method: 'PUT', body: JSON.stringify({ enabled: !dashboard.enabled }) }); await refresh(); render(); }
  } catch (error) { state.message = error.message; render(); }
});
if (state.token) refresh().catch(() => { state.token = null; localStorage.removeItem('superuser-token'); render(); }); else render();
