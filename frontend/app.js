/* ═══════════════════════════════════════════════
   BuildMarshal — Main Application
   Only features backed by real API endpoints
   ═══════════════════════════════════════════════ */
(function () {
  'use strict';

  // ═══ State ═══
  const state = {
    currentPage: 'project-details',
    expandedGroups: { project: true, companySettings: false },
    chats: {},
    activeChatId: null,
    uploadedDocs: [],
    isStreaming: false,
    isConnected: false,
    // Backend data
    trades: [],
    vendors: [],
    teamMembers: []
  };

  // ═══ DOM ═══
  const $ = sel => document.querySelector(sel);
  const $$ = sel => document.querySelectorAll(sel);

  const DOM = {
    sidebar: $('#sidebar'),
    contentArea: $('#contentArea'),
    headerPageTitle: $('#headerPageTitle'),
    chatPanel: $('#chatPanel'),
    chatMessages: $('#chatMessages'),
    chatInput: $('#chatInput'),
    btnChatSend: $('#btnChatSend'),
    btnToggleChat: $('#btnToggleChat'),
    btnSidebarToggle: $('#btnSidebarToggle'),
    statusDot: $('#statusDot'),
    statusText: $('#statusText'),
    statusDotNav: $('#statusDotNav'),
    statusTextNav: $('#statusTextNav'),
    settingsModal: $('#settingsModal'),
    btnCloseSettings: $('#btnCloseSettings'),
    btnCancelSettings: $('#btnCancelSettings'),
    btnSaveSettings: $('#btnSaveSettings'),
    btnOpenSettings: $('#btnOpenSettings'),
    btnHeaderSettings: $('#btnHeaderSettings'),
    apiUrlInput: $('#apiUrlInput'),
    modelSelect: $('#modelSelect'),
    topKInput: $('#topKInput'),
    crudModal: $('#crudModal'),
    crudModalTitle: $('#crudModalTitle'),
    crudModalBody: $('#crudModalBody'),
    btnCloseCrud: $('#btnCloseCrud'),
    btnCancelCrud: $('#btnCancelCrud'),
    btnSaveCrud: $('#btnSaveCrud'),
    imagePreviewOverlay: $('#imagePreviewOverlay'),
    imagePreviewImg: $('#imagePreviewImg'),
    uploadPanel: $('#uploadPanel'),
    uploadPanelOverlay: $('#uploadPanelOverlay'),
    btnCloseUploadPanel: $('#btnCloseUploadPanel'),
    dropZone: $('#dropZone'),
    fileInput: $('#fileInput'),
    documentList: $('#documentList'),
    docTotalCount: $('#docTotalCount'),
    docCountBadge: $('#docCountBadge'),
    toastContainer: $('#toastContainer'),
    btnChatAttach: $('#btnChatAttach')
  };

  // ═══ Utilities ═══
  function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function esc(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
  function fmtSize(b) { if (b < 1024) return b + ' B'; if (b < 1048576) return (b/1024).toFixed(1)+' KB'; return (b/1048576).toFixed(1)+' MB'; }
  function fmtTime(d) { return new Date(d).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }); }
  function getExt(n) { return n.split('.').pop().toLowerCase(); }

  function renderMd(text) {
    if (!text) return '';
    let h = esc(text);
    h = h.replace(/```(\w*)\n([\s\S]*?)```/g, (_,l,c) => `<pre><code>${c.trim()}</code></pre>`);
    h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
    h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/\*(.+?)\*/g, '<em>$1</em>');
    h = h.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    h = h.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    h = h.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    h = h.replace(/^- (.+)$/gm, '<li>$1</li>');
    h = h.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    h = h.replace(/\n\n/g, '</p><p>');
    h = h.replace(/\n/g, '<br>');
    h = '<p>' + h + '</p>';
    h = h.replace(/<p>\s*<\/p>/g, '');
    return h;
  }

  function showToast(msg, type='info', dur=4000) {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    const icons = { success:'✓', error:'✕', info:'ℹ', warning:'⚠' };
    t.innerHTML = `<span>${icons[type]||'ℹ'}</span><span>${esc(msg)}</span>`;
    DOM.toastContainer.appendChild(t);
    setTimeout(() => { t.classList.add('leaving'); setTimeout(() => t.remove(), 300); }, dur);
  }

  // ═══ Persistence ═══
  function saveChats() {
    try {
      localStorage.setItem(APP_CONFIG.STORAGE_KEYS.CHATS, JSON.stringify(state.chats));
      localStorage.setItem(APP_CONFIG.STORAGE_KEYS.ACTIVE_CHAT, state.activeChatId || '');
    } catch(e) {}
  }
  function loadChats() {
    try {
      const r = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.CHATS);
      if (r) state.chats = JSON.parse(r);
      state.activeChatId = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.ACTIVE_CHAT) || null;
    } catch(e) {}
  }

  // ═══ API ═══
  function getApiUrl() { return APP_CONFIG.API_URL || localStorage.getItem(APP_CONFIG.STORAGE_KEYS.API_URL) || ''; }

  async function apiReq(endpoint, opts={}) {
    const base = getApiUrl();
    if (!base) throw new Error('Backend URL not configured. Open Settings.');
    const res = await fetch(`${base.replace(/\/$/,'')}${endpoint}`, {
      ...opts, headers: { ...opts.headers, 'ngrok-skip-browser-warning':'true' }
    });
    if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.detail || `API error: ${res.status}`); }
    return res;
  }

  async function checkConnection() {
    try {
      const base = getApiUrl();
      if (!base) { setConn('disconnected'); return; }
      setConn('connecting');
      const r = await apiReq('/api/health');
      const d = await r.json();
      d.status === 'healthy' ? setConn('connected') : setConn('disconnected');
      state.isConnected = d.status === 'healthy';
    } catch(e) { setConn('disconnected'); state.isConnected = false; }
  }

  function setConn(s) {
    const labels = { connected:'Connected', disconnected:'Disconnected', connecting:'Connecting...' };
    DOM.statusDot.className = `status-dot ${s}`;
    DOM.statusText.textContent = labels[s] || s;
    DOM.statusDotNav.className = `status-dot ${s}`;
    DOM.statusTextNav.textContent = labels[s] || s;
  }

  // ═══ Data Fetching from Backend ═══
  async function fetchTrades() {
    try { const r = await apiReq('/api/trades'); const d = await r.json(); state.trades = d.trades || []; } catch(e) { state.trades = []; }
  }
  async function fetchVendors() {
    try { const r = await apiReq('/api/vendors'); const d = await r.json(); state.vendors = d.vendors || []; } catch(e) { state.vendors = []; }
  }
  async function fetchTeamMembers() {
    try { const r = await apiReq('/api/team-members'); const d = await r.json(); state.teamMembers = d.team_members || []; } catch(e) { state.teamMembers = []; }
  }
  async function fetchDocuments() {
    try {
      const r = await apiReq('/api/documents');
      const d = await r.json();
      state.uploadedDocs = d.documents || [];
      renderDocList();
      if (state.uploadedDocs.length > 0) {
        DOM.docCountBadge.textContent = state.uploadedDocs.length;
        DOM.docCountBadge.style.display = 'inline';
      } else {
        DOM.docCountBadge.style.display = 'none';
      }
    } catch(e) { state.uploadedDocs = []; }
  }
  async function fetchAllData() {
    if (!getApiUrl()) return;
    await Promise.all([fetchTrades(), fetchVendors(), fetchTeamMembers(), fetchDocuments()]);
    renderPage();
  }

  // ═══ Navigation ═══
  const PAGE_TITLES = {
    'project-details':'Project Details', 'trades':'Trades Management', 'vendors':'Vendors Management',
    'documents':'Indexed Documents', 'marshal-chat':'Marshal Chat'
  };

  function navigateTo(page) {
    state.currentPage = page;
    $$('.nav-item').forEach(i => i.classList.remove('active'));
    const active = $(`.nav-item[data-page="${page}"]`);
    if (active) active.classList.add('active');
    if (['project-details'].includes(page)) state.expandedGroups.project = true;
    if (['trades','vendors'].includes(page)) state.expandedGroups.companySettings = true;
    updateNavGroups();
    DOM.headerPageTitle.textContent = PAGE_TITLES[page] || page;
    renderPage();
  }

  function updateNavGroups() {
    document.querySelectorAll('.nav-group').forEach(g => {
      const hdr = g.querySelector('.nav-group-header');
      const key = hdr?.dataset.group;
      if (key && state.expandedGroups[key]) g.classList.add('expanded');
      else g.classList.remove('expanded');
    });
  }

  function renderPage() {
    const page = state.currentPage;
    switch(page) {
      case 'project-details': DOM.contentArea.innerHTML = renderProjectDetails(); break;
      case 'trades': DOM.contentArea.innerHTML = renderTradesPage(); break;
      case 'vendors': DOM.contentArea.innerHTML = renderVendorsPage(); break;
      case 'documents': DOM.contentArea.innerHTML = renderDocumentsPage(); break;
      case 'marshal-chat': DOM.contentArea.innerHTML = renderChatFullPage(); break;
      default: DOM.contentArea.innerHTML = renderProjectDetails(); break;
    }
    bindPageEvents();
  }

  // ═══ Page Renderers ═══

  function notConnectedMsg() {
    if (getApiUrl()) return '';
    return `<div class="connection-banner">
      <span class="material-icons-outlined">cloud_off</span>
      <span>Backend not connected.</span>
      <button class="btn btn-primary btn-sm" onclick="document.getElementById('btnOpenSettings').click()">Open Settings</button>
    </div>`;
  }

  function renderProjectDetails() {
    const internal = state.teamMembers.filter(m => m.category === 'internal');
    const vendors = state.teamMembers.filter(m => m.category === 'vendor');
    const contractors = state.teamMembers.filter(m => m.category === 'contractor');
    const consultants = state.teamMembers.filter(m => m.category === 'consultant');

    const cards = [
      { title:'Internal Team', members:internal, cols:['Name','Email','Department'], getRow: m => [m.name,m.email,m.department||'—'] },
      { title:'Subcontractors & Trades', members:contractors, cols:['Name','Company'], getRow: m => [m.name,m.company||'—'] },
      { title:'Consultants & Designers', members:consultants, cols:['Name','Company'], getRow: m => [m.name,m.company||'—'] },
      { title:'Vendors & Suppliers', members:vendors, cols:['Vendor','Contact','Email'], getRow: m => [m.company||m.name,m.contactName||'—',m.email||'—'] }
    ];

    return `${notConnectedMsg()}<div class="team-grid">${cards.map(c => `
      <div class="team-card">
        <div class="team-card-header">
          <span class="team-card-title">${c.title} (${c.members.length})</span>
          <button class="btn btn-primary" data-action="add-team" data-cat="${c.title}" style="padding:4px 14px;font-size:0.8rem">
            <span class="material-icons-outlined" style="font-size:16px">add</span> Add
          </button>
        </div>
        <div class="team-card-body">
          ${c.members.length ? `<table>
            <thead><tr>${c.cols.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
            <tbody>${c.members.map(m=>`<tr>${c.getRow(m).map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>` : `<div class="empty-msg">No ${c.title.toLowerCase()} yet</div>`}
        </div>
      </div>
    `).join('')}</div>`;
  }

  function renderTradesPage() {
    return `${notConnectedMsg()}
      <div class="page-header">
        <h1 class="page-title">Trades Management</h1>
        <button class="btn btn-primary" id="btnCreateTrade"><span class="material-icons-outlined">add</span> Create Trade</button>
      </div>
      <div class="filters-bar">
        <div class="filters-row">
          <div class="filter-group"><div class="filter-label">Search</div>
            <input class="filter-input search" id="tradeSearch" placeholder="Search by name...">
          </div>
          <div class="filter-group"><div class="filter-label">Status</div>
            <select class="filter-input" id="tradeStatusFilter"><option value="">All</option><option value="Active">Active</option><option value="Inactive">Inactive</option></select>
          </div>
        </div>
        <div class="filters-meta"><span class="total-count">Total: ${state.trades.length}</span></div>
      </div>
      <div class="data-table-container">
        <table class="data-table" id="tradesTable">
          <thead><tr><th>Name</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>${state.trades.length ? state.trades.map(t => `
            <tr data-id="${t.id}">
              <td>${esc(t.name)}</td><td>${esc(t.description)}</td>
              <td><span class="badge ${t.status==='Active'?'badge-active':'badge-inactive'}">${t.status}</span></td>
              <td><div class="table-actions">
                <button class="btn-table-action" data-action="edit-trade" data-id="${t.id}" title="Edit"><span class="material-icons-outlined">edit</span></button>
                <button class="btn-table-action delete" data-action="delete-trade" data-id="${t.id}" title="Delete"><span class="material-icons-outlined">delete</span></button>
              </div></td>
            </tr>`).join('') : `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:40px">${getApiUrl()?'No trades found':'Connect backend to load trades'}</td></tr>`}
          </tbody>
        </table>
      </div>`;
  }

  function renderVendorsPage() {
    return `${notConnectedMsg()}
      <div class="breadcrumb">
        <a href="#" data-nav="project-details"><span class="material-icons-outlined">home</span></a>
        <span class="sep">/</span><span>Company Settings</span>
        <span class="sep">/</span><span>Vendors</span>
      </div>
      <div class="page-header">
        <h1 class="page-title">Vendors Management</h1>
        <button class="btn btn-primary" id="btnCreateVendor"><span class="material-icons-outlined">add</span> Create Vendor</button>
      </div>
      <div class="filters-bar">
        <div class="filters-row">
          <div class="filter-group"><div class="filter-label">Search</div>
            <input class="filter-input search" id="vendorSearch" placeholder="Search by name...">
          </div>
          <div class="filter-group"><div class="filter-label">Status</div>
            <select class="filter-input" id="vendorStatusFilter"><option value="">All</option><option value="Active">Active</option><option value="Inactive">Inactive</option></select>
          </div>
        </div>
        <div class="filters-meta"><span class="total-count">Total: ${state.vendors.length}</span></div>
      </div>
      <div class="data-table-container">
        <table class="data-table" id="vendorsTable">
          <thead><tr><th>Vendor Name</th><th>Vendor Type</th><th>Trade</th><th>Active Projects</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>${state.vendors.length ? state.vendors.map(v => `
            <tr data-id="${v.id}">
              <td>${esc(v.name)}</td>
              <td><span class="badge badge-blue">${v.vendorType||'—'}</span></td>
              <td>${esc(v.trade||'—')}</td><td>${v.activeProjects||0}</td>
              <td><span class="badge ${v.status==='Active'?'badge-active':'badge-inactive'}">${v.status}</span></td>
              <td><div class="table-actions">
                <button class="btn-table-action" data-action="edit-vendor" data-id="${v.id}" title="Edit"><span class="material-icons-outlined">edit</span></button>
                <button class="btn-table-action delete" data-action="delete-vendor" data-id="${v.id}" title="Delete"><span class="material-icons-outlined">delete</span></button>
              </div></td>
            </tr>`).join('') : `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:40px">${getApiUrl()?'No vendors found':'Connect backend to load vendors'}</td></tr>`}
          </tbody>
        </table>
      </div>`;
  }

  function renderDocumentsPage() {
    return `${notConnectedMsg()}
      <div class="page-header">
        <h1 class="page-title">Indexed Documents</h1>
        <button class="btn btn-primary" id="btnUploadDocs"><span class="material-icons-outlined">upload_file</span> Upload Document</button>
      </div>
      <div class="data-table-container">
        <table class="data-table">
          <thead><tr><th>Name</th><th>Type</th><th>Pages</th><th>Status</th></tr></thead>
          <tbody>${state.uploadedDocs.length ? state.uploadedDocs.map(d => `
            <tr>
              <td>${esc(d.name)}</td>
              <td><span class="badge badge-blue">${d.type||'—'}</span></td>
              <td>${d.pages||0}</td>
              <td><span class="badge ${d.status==='indexed'?'badge-active':'badge-inactive'}">${d.status||'—'}</span></td>
            </tr>`).join('') : `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:40px">${getApiUrl()?'No documents uploaded yet. Upload documents to chat with Marshal AI.':'Connect backend to manage documents.'}</td></tr>`}
          </tbody>
        </table>
      </div>`;
  }

  function renderChatFullPage() {
    return `<div class="empty-state">
      <span class="material-icons-outlined">smart_toy</span>
      <h3>Marshal Chat</h3>
      <p>Use the chat panel on the right to interact with Marshal AI. Upload documents and ask questions about your construction projects.</p>
      <button class="btn btn-primary" id="btnOpenChatPanel" style="margin-top:16px">Open Chat Panel</button>
    </div>`;
  }

  // ═══ Page Events ═══
  function bindPageEvents() {
    $$('[data-nav]').forEach(el => el.addEventListener('click', e => { e.preventDefault(); navigateTo(el.dataset.nav); }));
    $$('[data-action]').forEach(el => el.addEventListener('click', handleAction));
    const btnCT = $('#btnCreateTrade'); if (btnCT) btnCT.addEventListener('click', () => openCrudModal('trade'));
    const btnCV = $('#btnCreateVendor'); if (btnCV) btnCV.addEventListener('click', () => openCrudModal('vendor'));
    const btnUD = $('#btnUploadDocs'); if (btnUD) btnUD.addEventListener('click', openUploadPanel);
    const btnOC = $('#btnOpenChatPanel'); if (btnOC) btnOC.addEventListener('click', () => { DOM.chatPanel.classList.remove('collapsed'); DOM.chatPanel.classList.add('visible'); });
  }

  async function handleAction(e) {
    const btn = e.currentTarget;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (action === 'edit-trade') openCrudModal('trade', id);
    else if (action === 'delete-trade') {
      try { await apiReq(`/api/trades/${id}`, { method:'DELETE' }); await fetchTrades(); renderPage(); showToast('Trade deleted','info'); } catch(e) { showToast('Delete failed: '+e.message,'error'); }
    }
    else if (action === 'edit-vendor') openCrudModal('vendor', id);
    else if (action === 'delete-vendor') {
      try { await apiReq(`/api/vendors/${id}`, { method:'DELETE' }); await fetchVendors(); renderPage(); showToast('Vendor deleted','info'); } catch(e) { showToast('Delete failed: '+e.message,'error'); }
    }
  }

  // ═══ CRUD Modal ═══
  let crudCallback = null;

  function openCrudModal(type, editId) {
    const isEdit = !!editId;
    DOM.crudModalTitle.textContent = isEdit ? `Edit ${type}` : `Create ${type}`;
    let fields = '';

    if (type === 'trade') {
      const item = isEdit ? state.trades.find(t => t.id === editId) : { name:'', description:'', status:'Active' };
      if (!item) return;
      fields = `
        <div class="form-group"><label class="form-label">Name</label><input class="form-input" id="crudName" value="${esc(item.name)}"></div>
        <div class="form-group"><label class="form-label">Description</label><input class="form-input" id="crudDesc" value="${esc(item.description)}"></div>
        <div class="form-group"><label class="form-label">Status</label><select class="form-input" id="crudStatus">
          <option value="Active" ${item.status==='Active'?'selected':''}>Active</option>
          <option value="Inactive" ${item.status==='Inactive'?'selected':''}>Inactive</option>
        </select></div>`;
      crudCallback = async () => {
        const payload = { name:$('#crudName').value.trim(), description:$('#crudDesc').value.trim()||'-', status:$('#crudStatus').value };
        if (!payload.name) { showToast('Name is required','warning'); return false; }
        try {
          if (isEdit) { await apiReq(`/api/trades/${editId}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) }); }
          else { await apiReq('/api/trades', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) }); }
          await fetchTrades(); return true;
        } catch(e) { showToast('Save failed: '+e.message,'error'); return false; }
      };
    } else if (type === 'vendor') {
      const item = isEdit ? state.vendors.find(v => v.id === editId) : { name:'', vendorType:'Material Supplier', trade:'', status:'Active' };
      if (!item) return;
      fields = `
        <div class="form-group"><label class="form-label">Vendor Name</label><input class="form-input" id="crudName" value="${esc(item.name)}"></div>
        <div class="form-group"><label class="form-label">Vendor Type</label><select class="form-input" id="crudType">
          <option value="Material Supplier" ${item.vendorType==='Material Supplier'?'selected':''}>Material Supplier</option>
          <option value="Subcontractor" ${item.vendorType==='Subcontractor'?'selected':''}>Subcontractor</option>
        </select></div>
        <div class="form-group"><label class="form-label">Trade</label><select class="form-input" id="crudTrade">
          <option value="">Select trade...</option>
          ${state.trades.map(t=>`<option value="${esc(t.name)}" ${item.trade===t.name?'selected':''}>${esc(t.name)}</option>`).join('')}
        </select></div>
        <div class="form-group"><label class="form-label">Status</label><select class="form-input" id="crudStatus">
          <option value="Active" ${item.status==='Active'?'selected':''}>Active</option>
          <option value="Inactive" ${item.status==='Inactive'?'selected':''}>Inactive</option>
        </select></div>`;
      crudCallback = async () => {
        const payload = { name:$('#crudName').value.trim(), vendorType:$('#crudType').value, trade:$('#crudTrade').value, status:$('#crudStatus').value };
        if (!payload.name) { showToast('Name is required','warning'); return false; }
        try {
          if (isEdit) { await apiReq(`/api/vendors/${editId}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) }); }
          else { await apiReq('/api/vendors', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) }); }
          await fetchVendors(); return true;
        } catch(e) { showToast('Save failed: '+e.message,'error'); return false; }
      };
    }
    DOM.crudModalBody.innerHTML = fields;
    DOM.crudModal.classList.add('open');
  }

  function closeCrudModal() { DOM.crudModal.classList.remove('open'); crudCallback = null; }

  // ═══ Chat Panel ═══
  function createNewChat() {
    const id = genId();
    state.chats[id] = { id, title:'New Chat', messages:[], createdAt:Date.now() };
    state.activeChatId = id;
    saveChats();
    return id;
  }
  function getActiveChat() { return state.activeChatId ? state.chats[state.activeChatId] : null; }

  function addMessage(role, content, sources=null) {
    let chat = getActiveChat();
    if (!chat) { createNewChat(); chat = getActiveChat(); }
    const msg = { id:genId(), role, content, sources, timestamp:Date.now() };
    chat.messages.push(msg);
    if (role==='user' && chat.messages.filter(m=>m.role==='user').length===1) {
      chat.title = content.slice(0,50)+(content.length>50?'…':'');
    }
    saveChats(); return msg;
  }

  function renderChatMessages() {
    const chat = getActiveChat();
    if (!chat || chat.messages.length === 0) {
      DOM.chatMessages.innerHTML = `<div class="empty-state" style="padding:40px 16px">
        <span class="material-icons-outlined" style="font-size:40px">forum</span>
        <h3 style="font-size:1rem">Ask Marshal anything</h3>
        <p style="font-size:0.85rem">Upload documents and ask questions about your construction projects.</p>
      </div>`;
      return;
    }
    DOM.chatMessages.innerHTML = chat.messages.map(msg => {
      let srcHtml = '';
      if (msg.sources && msg.sources.length > 0) {
        const cards = msg.sources.map(s => {
          const prev = s.image_url ? `<img src="${esc(s.image_url)}" alt="Preview" loading="lazy">` : `<span class="material-icons-outlined" style="font-size:24px;color:var(--text-muted)">description</span>`;
          return `<div class="citation-card" data-image-url="${s.image_url?esc(s.image_url):''}">
            <div class="card-preview">${prev}</div>
            <div class="card-info"><div class="card-doc-name">${esc(s.doc_name||'Document')}</div><div class="card-page">Page ${s.page||'?'}</div>${s.score?`<div class="card-score">Score: ${(s.score*100).toFixed(1)}%</div>`:''}</div>
          </div>`;
        }).join('');
        srcHtml = `<div class="source-citations"><div class="citations-label">📎 Sources</div><div class="citation-cards">${cards}</div></div>`;
      }
      return `<div class="chat-msg ${msg.role==='user'?'user':'bot'}" data-msg-id="${msg.id}">
        <div class="message-text">${renderMd(msg.content)}</div>${srcHtml}
        <div class="chat-msg-time">${fmtTime(msg.timestamp)}</div>
      </div>`;
    }).join('');
    DOM.chatMessages.querySelectorAll('.citation-card').forEach(c => {
      c.addEventListener('click', ()=>{ if(c.dataset.imageUrl) openImagePreview(c.dataset.imageUrl); });
    });
    scrollChatBottom();
  }

  function scrollChatBottom() { requestAnimationFrame(()=>{ DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight; }); }

  async function sendChatMessage() {
    const text = DOM.chatInput.value.trim();
    if (!text || state.isStreaming) return;
    if (!getActiveChat()) createNewChat();
    addMessage('user', text);
    DOM.chatInput.value = '';
    renderChatMessages();
    state.isStreaming = true;

    const typEl = document.createElement('div');
    typEl.className = 'chat-msg bot'; typEl.id = 'typingIndicator';
    typEl.innerHTML = '<div class="typing-indicator"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>';
    DOM.chatMessages.appendChild(typEl);
    scrollChatBottom();

    try {
      const chat = getActiveChat();
      const history = chat.messages.filter(m=>m.role==='user'||m.role==='bot').slice(-10).map(m=>({role:m.role==='bot'?'assistant':m.role,content:m.content}));
      history.pop();
      const res = await apiReq('/api/chat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ query:text, history, model:APP_CONFIG.MODEL, top_k:APP_CONFIG.TOP_K })
      });
      const el = document.getElementById('typingIndicator'); if(el)el.remove();
      const ct = res.headers.get('content-type')||'';
      if (ct.includes('text/event-stream')) { await handleStream(res); }
      else { const data = await res.json(); addMessage('bot', data.response, data.sources||null); renderChatMessages(); }
    } catch(error) {
      const el = document.getElementById('typingIndicator'); if(el)el.remove();
      if (error.message.includes('Backend URL not configured')) {
        addMessage('bot', '⚙️ **Backend not connected.** Open Settings and enter your ngrok URL.');
      } else { addMessage('bot', `❌ **Error:** ${error.message}`); }
      renderChatMessages();
    } finally { state.isStreaming = false; }
  }

  async function handleStream(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '', sources = null, buffer = '';
    const msgId = addMessage('bot', '').id;
    renderChatMessages();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream:true });
        const lines = buffer.split('\n'); buffer = lines.pop();
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.token) { fullText += parsed.token; updateMsgContent(msgId, fullText); scrollChatBottom(); }
              if (parsed.sources) sources = parsed.sources;
            } catch(e) { fullText += data; updateMsgContent(msgId, fullText); scrollChatBottom(); }
          }
        }
      }
    } catch(e) {}
    const chat = getActiveChat();
    if (chat) { const msg = chat.messages.find(m=>m.id===msgId); if(msg){msg.content=fullText;msg.sources=sources;saveChats();} }
    renderChatMessages();
  }

  function updateMsgContent(msgId, content) {
    const el = DOM.chatMessages.querySelector(`[data-msg-id="${msgId}"] .message-text`);
    if (el) el.innerHTML = renderMd(content);
  }

  // ═══ Upload Panel ═══
  function openUploadPanel() {
    DOM.uploadPanel.classList.add('open');
    DOM.uploadPanelOverlay.classList.add('open');
    fetchDocuments();
  }
  function closeUploadPanel() { DOM.uploadPanel.classList.remove('open'); DOM.uploadPanelOverlay.classList.remove('open'); }

  async function uploadFiles(files) {
    const valid = Array.from(files).filter(f => {
      const ext = '.'+getExt(f.name);
      if (!APP_CONFIG.ACCEPTED_EXTENSIONS.includes(ext)) { showToast(`Unsupported: ${f.name}`,'warning'); return false; }
      if (f.size > APP_CONFIG.MAX_FILE_SIZE) { showToast(`Too large: ${f.name}`,'warning'); return false; }
      return true;
    });
    for (const file of valid) {
      const docId = genId();
      const doc = { id:docId, name:file.name, type:getExt(file.name), size:file.size, status:'uploading', pages:0 };
      state.uploadedDocs.push(doc); renderDocList();
      try {
        const fd = new FormData(); fd.append('file',file); fd.append('doc_id',docId);
        const res = await apiReq('/api/upload',{method:'POST',body:fd});
        const data = await res.json();
        doc.status='indexed'; doc.pages=data.pages||0;
        renderDocList(); showToast(`Uploaded: ${file.name}`,'success');
      } catch(e) { doc.status='error'; renderDocList(); showToast(`Upload failed: ${file.name}`,'error'); }
    }
  }

  function renderDocList() {
    const container = DOM.documentList;
    container.querySelectorAll('.document-item').forEach(el=>el.remove());
    state.uploadedDocs.forEach(doc => {
      const icon = APP_CONFIG.FILE_ICONS[doc.type]||'📄';
      const tc = APP_CONFIG.FILE_TYPE_CLASS[doc.type]||'doc';
      const item = document.createElement('div'); item.className='document-item';
      const sLabel = doc.status==='indexing'?'⟳ Indexing':doc.status==='indexed'?'✓ Ready':doc.status==='uploading'?'⬆ Uploading':'✕ Error';
      item.innerHTML = `<div class="doc-icon ${tc}">${icon}</div><div class="doc-info"><div class="doc-name">${esc(doc.name)}</div><div class="doc-meta">${fmtSize(doc.size||0)}${doc.pages?' · '+doc.pages+' pages':''}</div></div><span class="doc-status ${doc.status}">${sLabel}</span><button class="doc-delete" title="Remove">🗑</button>`;
      item.querySelector('.doc-delete').addEventListener('click',async()=>{
        try{await apiReq(`/api/documents/${doc.id}`,{method:'DELETE'});state.uploadedDocs=state.uploadedDocs.filter(d=>d.id!==doc.id);renderDocList();showToast('Removed','info');}catch(e){showToast('Delete failed','error');}
      });
      container.appendChild(item);
    });
    DOM.docTotalCount.textContent = `${state.uploadedDocs.length} file${state.uploadedDocs.length!==1?'s':''}`;
  }

  // ═══ Settings ═══
  function openSettings() {
    DOM.apiUrlInput.value = getApiUrl();
    DOM.modelSelect.value = APP_CONFIG.MODEL;
    DOM.topKInput.value = APP_CONFIG.TOP_K;
    DOM.settingsModal.classList.add('open');
  }
  function closeSettings() { DOM.settingsModal.classList.remove('open'); }
  function saveSettings() {
    const url = DOM.apiUrlInput.value.trim();
    APP_CONFIG.API_URL = url;
    APP_CONFIG.MODEL = DOM.modelSelect.value;
    APP_CONFIG.TOP_K = Math.max(1,Math.min(20,parseInt(DOM.topKInput.value)||5));
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.API_URL, url);
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.MODEL, APP_CONFIG.MODEL);
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.TOP_K, String(APP_CONFIG.TOP_K));
    closeSettings();
    showToast('Settings saved!','success');
    checkConnection();
    fetchAllData();
  }

  // ═══ Image Preview ═══
  function openImagePreview(url) { DOM.imagePreviewImg.src=url; DOM.imagePreviewOverlay.classList.add('open'); }
  function closeImagePreview() { DOM.imagePreviewOverlay.classList.remove('open'); DOM.imagePreviewImg.src=''; }

  // ═══ Event Listeners ═══
  function initEvents() {
    $$('.nav-item[data-page]').forEach(item => item.addEventListener('click', () => navigateTo(item.dataset.page)));
    $$('.nav-group-header').forEach(hdr => hdr.addEventListener('click', () => { state.expandedGroups[hdr.dataset.group] = !state.expandedGroups[hdr.dataset.group]; updateNavGroups(); }));
    DOM.btnSidebarToggle.addEventListener('click', () => DOM.sidebar.classList.toggle('open'));
    DOM.btnToggleChat.addEventListener('click', () => {
      DOM.chatPanel.classList.toggle('collapsed');
      if (window.innerWidth <= 1200) DOM.chatPanel.classList.toggle('visible');
    });
    DOM.btnChatSend.addEventListener('click', sendChatMessage);
    DOM.chatInput.addEventListener('keydown', e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChatMessage();} });
    DOM.btnOpenSettings.addEventListener('click', openSettings);
    DOM.btnHeaderSettings.addEventListener('click', openSettings);
    DOM.btnCloseSettings.addEventListener('click', closeSettings);
    DOM.btnCancelSettings.addEventListener('click', closeSettings);
    DOM.btnSaveSettings.addEventListener('click', saveSettings);
    DOM.settingsModal.addEventListener('click', e => { if(e.target===DOM.settingsModal) closeSettings(); });
    DOM.btnCloseCrud.addEventListener('click', closeCrudModal);
    DOM.btnCancelCrud.addEventListener('click', closeCrudModal);
    DOM.btnSaveCrud.addEventListener('click', async () => { if(crudCallback && await crudCallback()){closeCrudModal();renderPage();showToast('Saved','success');} });
    DOM.crudModal.addEventListener('click', e => { if(e.target===DOM.crudModal) closeCrudModal(); });
    DOM.btnCloseUploadPanel.addEventListener('click', closeUploadPanel);
    DOM.uploadPanelOverlay.addEventListener('click', closeUploadPanel);
    DOM.btnChatAttach.addEventListener('click', openUploadPanel);
    DOM.dropZone.addEventListener('dragover', e => { e.preventDefault(); DOM.dropZone.classList.add('drag-over'); });
    DOM.dropZone.addEventListener('dragleave', () => DOM.dropZone.classList.remove('drag-over'));
    DOM.dropZone.addEventListener('drop', e => { e.preventDefault(); DOM.dropZone.classList.remove('drag-over'); uploadFiles(e.dataTransfer.files); });
    DOM.fileInput.addEventListener('change', e => { if(e.target.files.length>0){uploadFiles(e.target.files);e.target.value='';} });
    DOM.imagePreviewOverlay.addEventListener('click', e => { if(e.target===DOM.imagePreviewOverlay||e.target.closest('.image-preview-close')) closeImagePreview(); });
    document.addEventListener('keydown', e => { if(e.key==='Escape'){closeImagePreview();closeSettings();closeCrudModal();closeUploadPanel();} });
  }

  // ═══ Init ═══
  function init() {
    loadChats();
    initEvents();
    updateNavGroups();
    navigateTo('project-details');
    renderChatMessages();
    if (getApiUrl()) { checkConnection(); fetchAllData(); }
    else {
      // Show settings on first load if no backend configured
      setTimeout(() => {
        showToast('Configure your backend URL in Settings to get started.','info',6000);
      }, 500);
    }
    setInterval(checkConnection, 30000);
  }

  document.readyState==='loading' ? document.addEventListener('DOMContentLoaded',init) : init();
})();
