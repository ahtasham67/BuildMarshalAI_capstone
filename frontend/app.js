/* ═══════════════════════════════════════════════
   BuildMarshal — Main Application
   Routing, Pages, Chat, CRUD
   ═══════════════════════════════════════════════ */
(function () {
  'use strict';

  // ═══ State ═══
  const state = {
    currentPage: 'project-details',
    expandedGroups: { project: true, companySettings: false },
    chatOpen: true,
    chats: {},
    activeChatId: null,
    uploadedDocs: [],
    isStreaming: false,
    isConnected: false,
    photosPage: 1,
    photosPerPage: 10
  };

  // ═══ DOM Helpers ═══
  const $ = sel => document.querySelector(sel);
  const $$ = sel => document.querySelectorAll(sel);

  const DOM = {
    sidebar: $('#sidebar'),
    sidebarNav: $('#sidebarNav'),
    contentArea: $('#contentArea'),
    chatPanel: $('#chatPanel'),
    chatMessages: $('#chatMessages'),
    chatInput: $('#chatInput'),
    btnChatSend: $('#btnChatSend'),
    btnToggleChat: $('#btnToggleChat'),
    btnSidebarToggle: $('#btnSidebarToggle'),
    btnBack: $('#btnBack'),
    statusDot: $('#statusDot'),
    statusText: $('#statusText'),
    settingsModal: $('#settingsModal'),
    btnCloseSettings: $('#btnCloseSettings'),
    btnCancelSettings: $('#btnCancelSettings'),
    btnSaveSettings: $('#btnSaveSettings'),
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
    const l = { connected:'Connected', disconnected:'Disconnected', connecting:'Connecting...' };
    DOM.statusDot.className = `status-dot ${s}`;
    DOM.statusText.textContent = l[s] || s;
  }

  // ═══ Navigation / Routing ═══
  function navigateTo(page) {
    state.currentPage = page;
    // Update active nav
    $$('.nav-item').forEach(i => i.classList.remove('active'));
    const active = $(`.nav-item[data-page="${page}"]`);
    if (active) active.classList.add('active');
    // Expand parent group if sub-item
    if (['all-projects','project-details'].includes(page)) {
      state.expandedGroups.project = true;
    }
    if (['company-info','trades','vendors','project-types','project-phases','user-management'].includes(page)) {
      state.expandedGroups.companySettings = true;
    }
    updateNavGroups();
    renderPage();
  }

  function updateNavGroups() {
    document.querySelectorAll('.nav-group').forEach(g => {
      const hdr = g.querySelector('.nav-group-header');
      const key = hdr?.dataset.group;
      if (key && state.expandedGroups[key]) {
        g.classList.add('expanded');
      } else {
        g.classList.remove('expanded');
      }
    });
  }

  function renderPage() {
    const page = state.currentPage;
    const area = DOM.contentArea;
    switch(page) {
      case 'project-details': area.innerHTML = renderProjectDetails(); break;
      case 'trades': area.innerHTML = renderTradesPage(); break;
      case 'vendors': area.innerHTML = renderVendorsPage(); break;
      case 'documents': area.innerHTML = renderDocumentsPage(); break;
      case 'photos': area.innerHTML = renderPhotosPage(); break;
      case 'marshal-chat': case 'new-chat':
        area.innerHTML = renderChatFullPage(); break;
      default:
        area.innerHTML = renderPlaceholderPage(page); break;
    }
    bindPageEvents();
  }

  // ═══ Page Renderers ═══

  function renderProjectDetails() {
    const internal = DEMO_DATA.teamMembers.filter(m => m.category === 'internal');
    const vendors = DEMO_DATA.teamMembers.filter(m => m.category === 'vendor');
    const cards = [
      { title: 'Internal Team', count: internal.length, cols: ['Name','Email','Department'], rows: internal.map(m => [m.name, m.email, m.department||'—']), cat: 'internal' },
      { title: 'Subcontractors & Trades', count: 0, cols: ['Name','Company'], rows: [], cat: 'contractor' },
      { title: 'Consultants & Designers', count: 0, cols: ['Name','Company'], rows: [], cat: 'consultant' },
      { title: 'Inspectors & Authorities', count: 0, cols: ['Name','Company'], rows: [], cat: 'inspector' },
      { title: 'Owner & Client Representatives', count: 0, cols: ['Name','Company'], rows: [], cat: 'representative' },
      { title: 'Vendors & Suppliers', count: vendors.length, cols: ['Vendor','Contact Na...','Email'], rows: vendors.map(v => [v.company||v.name, v.contactName||'—', v.email||'—']), cat: 'vendor' },
      { title: 'Specialist Service Providers', count: 0, cols: ['Name','Company'], rows: [], cat: 'specialist' },
      { title: 'Financial & Legal Stakeholders', count: 0, cols: ['Name','Company'], rows: [], cat: 'financial' }
    ];

    return `<div class="team-grid">${cards.map(c => `
      <div class="team-card">
        <div class="team-card-header">
          <span class="team-card-title">${c.title} (${c.count})</span>
          <button class="btn btn-primary" data-action="add-team" data-cat="${c.cat}" style="padding:4px 14px;font-size:0.8rem">
            <span class="material-icons-outlined" style="font-size:16px">add</span> Add
          </button>
        </div>
        <div class="team-card-body">
          ${c.rows.length ? `<table>
            <thead><tr>${c.cols.map(h => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>${c.rows.map(r => `<tr>${r.map(cell => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>` : `<div class="empty-msg">No ${c.title.toLowerCase()}</div>`}
        </div>
      </div>
    `).join('')}</div>`;
  }

  function renderTradesPage() {
    const trades = DEMO_DATA.trades;
    return `
      <div class="page-header">
        <h1 class="page-title">Trades Management</h1>
        <button class="btn btn-primary" id="btnCreateTrade">
          <span class="material-icons-outlined">add</span> Create Trade
        </button>
      </div>
      <div class="filters-bar">
        <div class="filters-row">
          <div class="filter-group">
            <div class="filter-label">Search</div>
            <input class="filter-input search" id="tradeSearch" placeholder="Search by name or description">
          </div>
          <div class="filter-group">
            <div class="filter-label">Status</div>
            <select class="filter-input" id="tradeStatusFilter">
              <option value="">Select status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div class="filters-meta">
          <span class="total-count">Total: ${trades.length}</span>
          <button class="btn-clear" id="btnClearTradeFilters">Clear</button>
        </div>
      </div>
      <div class="data-table-container">
        <table class="data-table" id="tradesTable">
          <thead><tr><th>Name</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>${trades.map(t => `
            <tr data-id="${t.id}">
              <td>${esc(t.name)}</td>
              <td>${esc(t.description)}</td>
              <td><span class="badge ${t.status==='Active'?'badge-active':'badge-inactive'}">${t.status}</span></td>
              <td><div class="table-actions">
                <button class="btn-table-action" data-action="edit-trade" data-id="${t.id}" title="Edit"><span class="material-icons-outlined">edit</span></button>
                <button class="btn-table-action delete" data-action="delete-trade" data-id="${t.id}" title="Delete"><span class="material-icons-outlined">delete</span></button>
              </div></td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>`;
  }

  function renderVendorsPage() {
    const vendors = DEMO_DATA.vendors;
    return `
      <div class="breadcrumb">
        <a href="#" data-nav="home-dashboard"><span class="material-icons-outlined">home</span></a>
        <span class="sep">/</span><a href="#" data-nav="company-info">Company Settings</a>
        <span class="sep">/</span><span>Vendors</span>
      </div>
      <div class="page-header">
        <h1 class="page-title">Vendors Management</h1>
        <button class="btn btn-primary" id="btnCreateVendor">
          <span class="material-icons-outlined">add</span> Create Vendor
        </button>
      </div>
      <div class="filters-bar">
        <div class="filters-row">
          <div class="filter-group">
            <div class="filter-label">Search</div>
            <input class="filter-input search" id="vendorSearch" placeholder="Search by name or email">
          </div>
          <div class="filter-group">
            <div class="filter-label">Status</div>
            <select class="filter-input" id="vendorStatusFilter"><option value="">Select status</option><option value="Active">Active</option><option value="Inactive">Inactive</option></select>
          </div>
          <div class="filter-group">
            <div class="filter-label">Vendor Type</div>
            <select class="filter-input" id="vendorTypeFilter"><option value="">Select vendor type</option><option value="Material Supplier">Material Supplier</option><option value="Subcontractor">Subcontractor</option></select>
          </div>
        </div>
        <div class="filters-meta">
          <span class="total-count">Total: ${vendors.length}</span>
          <button class="btn-clear" id="btnClearVendorFilters">Clear</button>
        </div>
      </div>
      <div class="data-table-container">
        <table class="data-table" id="vendorsTable">
          <thead><tr><th>Vendor Name</th><th>Vendor Type</th><th>Trade</th><th>Active Projects</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>${vendors.map(v => `
            <tr data-id="${v.id}">
              <td>${esc(v.name)}</td>
              <td><span class="badge badge-blue">${v.vendorType}</span></td>
              <td>${esc(v.trade)}</td>
              <td>${v.activeProjects}</td>
              <td><span class="badge ${v.status==='Active'?'badge-active':'badge-inactive'}">${v.status}</span></td>
              <td><div class="table-actions">
                <button class="btn-table-action" data-action="edit-vendor" data-id="${v.id}" title="Edit"><span class="material-icons-outlined">edit</span></button>
                <button class="btn-table-action delete" data-action="delete-vendor" data-id="${v.id}" title="Delete"><span class="material-icons-outlined">delete</span></button>
              </div></td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>`;
  }

  function renderDocumentsPage() {
    const docs = DEMO_DATA.documents;
    return `
      <div class="tab-bar">
        <div class="tab-item active">All Projects</div>
        <div class="tab-item">${esc(DEMO_DATA.currentProject.slice(0,45))} <button class="tab-close">×</button></div>
      </div>
      <div class="page-header">
        <h1 class="page-title">Shared Documents</h1>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-secondary">Share by Drive/Sites</button>
          <button class="btn btn-primary" id="btnAddDocument"><span class="material-icons-outlined">add</span> Add more file</button>
          <button class="btn btn-secondary"><span class="material-icons-outlined" style="font-size:16px">sync</span> Sync</button>
        </div>
      </div>
      <div class="filters-bar">
        <div class="filters-row">
          <div class="filter-group" style="flex:0 0 auto;min-width:auto">
            <div class="filter-label">View</div>
            <div class="view-toggle">
              <button class="view-toggle-btn" data-view="grid"><span class="material-icons-outlined">grid_view</span></button>
              <button class="view-toggle-btn active" data-view="list"><span class="material-icons-outlined">view_list</span></button>
            </div>
          </div>
          <div class="filter-group">
            <div class="filter-label">Name</div>
            <input class="filter-input search" placeholder="Filter by name (min 3 c...)">
          </div>
          <div class="filter-group">
            <div class="filter-label">Provider</div>
            <select class="filter-input"><option value="">Select provider</option><option>OneDrive</option><option>Google</option><option>BuildMarshal</option></select>
          </div>
        </div>
        <div class="filters-meta">
          <span class="total-count">Total: ${docs.length}. Project filter: <em>${esc(DEMO_DATA.currentProject)}</em></span>
          <div style="display:flex;gap:6px">
            <button class="btn-clear">Clear</button>
            <button class="btn-clear"><span class="material-icons-outlined" style="font-size:14px">refresh</span></button>
          </div>
        </div>
      </div>
      <div class="data-table-container">
        <table class="data-table">
          <thead><tr><th style="width:30px"><input type="checkbox"></th><th>Name</th><th>Provider</th><th>Project name</th></tr></thead>
          <tbody>${docs.map(d => {
            const pClass = d.provider==='OneDrive'?'provider-onedrive':d.provider==='Google'?'provider-google':'provider-buildmarshal';
            return `<tr>
              <td><input type="checkbox"></td>
              <td><a href="#" class="doc-link">${esc(d.name)}</a></td>
              <td><span class="provider-badge ${pClass}">${d.provider}</span></td>
              <td>${esc(d.projectName)}</td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>`;
  }

  function renderPhotosPage() {
    const allPhotos = DEMO_DATA.photos;
    const total = allPhotos.length;
    const pp = state.photosPerPage;
    const cp = state.photosPage;
    const totalPages = Math.ceil(total / pp);
    const photos = allPhotos.slice((cp-1)*pp, cp*pp);

    let pagBtns = '';
    if (totalPages > 1) {
      pagBtns += `<button class="page-btn ${cp===1?'disabled':''}" data-pag="${cp-1}"><span class="material-icons-outlined">chevron_left</span></button>`;
      for (let i=1; i<=Math.min(totalPages,6); i++) {
        pagBtns += `<button class="page-btn ${i===cp?'active':''}" data-pag="${i}">${i}</button>`;
      }
      pagBtns += `<button class="page-btn ${cp===totalPages?'disabled':''}" data-pag="${cp+1}"><span class="material-icons-outlined">chevron_right</span></button>`;
    }

    return `
      <div class="tab-bar">
        <div class="tab-item active">All Projects</div>
        <div class="tab-item">${esc(DEMO_DATA.currentProject.slice(0,45))} <button class="tab-close">×</button></div>
      </div>
      <div class="page-header">
        <h1 class="page-title">Photos</h1>
        <label class="checkbox-label"><input type="checkbox"> Show only Marshal camera photos</label>
      </div>
      <div class="filters-bar">
        <div class="filters-row">
          <div class="filter-group" style="flex:0 0 auto;min-width:auto">
            <div class="filter-label">View</div>
            <div class="view-toggle">
              <button class="view-toggle-btn active" data-view="grid"><span class="material-icons-outlined">grid_view</span></button>
              <button class="view-toggle-btn" data-view="list"><span class="material-icons-outlined">view_list</span></button>
            </div>
          </div>
          <div class="filter-group">
            <div class="filter-label">Name</div>
            <input class="filter-input search" placeholder="Filter by name (min 3 c...)">
          </div>
          <div class="filter-group">
            <div class="filter-label">Provider</div>
            <select class="filter-input"><option value="">Select provider</option><option>OneDrive</option><option>Google</option><option>BuildMarshal</option></select>
          </div>
        </div>
        <div class="filters-meta">
          <span class="total-count">Total ${total}</span>
          <button class="btn-clear">Clear</button>
        </div>
      </div>
      <div class="photos-grid" id="photosGrid">${photos.map(p => `
        <div class="photo-card" data-photo-url="${esc(p.url)}">
          <img class="photo-thumb" src="${esc(p.thumbnail)}" alt="${esc(p.name)}" loading="lazy">
          <div class="photo-caption">${esc(p.name)}</div>
        </div>
      `).join('')}</div>
      <div class="pagination">${pagBtns}
        <select class="filter-input" style="width:auto;margin-left:12px;padding:4px 8px" id="photosPerPageSelect">
          <option value="10" ${pp===10?'selected':''}>10 / page</option>
          <option value="20" ${pp===20?'selected':''}>20 / page</option>
          <option value="50" ${pp===50?'selected':''}>50 / page</option>
        </select>
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

  function renderPlaceholderPage(page) {
    const titles = {
      'communication':'Communication','contact':'Contact','task-manager':'Task Manager',
      'all-projects':'All Projects','calendar':'Calendar','rules-regulation':'Rules and Regulation',
      'share-file':'Share File','home-dashboard':'Home Dashboard','report':'Report',
      'company-info':'Company Info','project-types':'Project Types','project-phases':'Project Phases',
      'user-management':'User Management','procore-data':'Procore Data','microsoft-planner':'Microsoft Planner'
    };
    return `<div class="empty-state">
      <span class="material-icons-outlined">construction</span>
      <h3>${titles[page] || page}</h3>
      <p>This section is coming soon. Use the sidebar to navigate to available pages.</p>
    </div>`;
  }

  // ═══ Page Event Binding ═══
  function bindPageEvents() {
    // Breadcrumb nav
    $$('[data-nav]').forEach(el => el.addEventListener('click', e => { e.preventDefault(); navigateTo(el.dataset.nav); }));
    // Table actions
    $$('[data-action]').forEach(el => el.addEventListener('click', handleAction));
    // Create buttons
    const btnCT = $('#btnCreateTrade');
    if (btnCT) btnCT.addEventListener('click', () => openCrudModal('trade'));
    const btnCV = $('#btnCreateVendor');
    if (btnCV) btnCV.addEventListener('click', () => openCrudModal('vendor'));
    // Document add
    const btnAD = $('#btnAddDocument');
    if (btnAD) btnAD.addEventListener('click', openUploadPanel);
    // Open chat panel button
    const btnOCP = $('#btnOpenChatPanel');
    if (btnOCP) btnOCP.addEventListener('click', () => { DOM.chatPanel.classList.remove('collapsed'); DOM.chatPanel.classList.add('visible'); });
    // Photos pagination
    $$('[data-pag]').forEach(btn => btn.addEventListener('click', () => {
      const p = parseInt(btn.dataset.pag);
      if (p >= 1 && p <= Math.ceil(DEMO_DATA.photos.length / state.photosPerPage)) {
        state.photosPage = p;
        renderPage();
      }
    }));
    const ppSel = $('#photosPerPageSelect');
    if (ppSel) ppSel.addEventListener('change', () => { state.photosPerPage = parseInt(ppSel.value); state.photosPage = 1; renderPage(); });
    // Photo click
    $$('.photo-card').forEach(c => c.addEventListener('click', () => openImagePreview(c.dataset.photoUrl)));
  }

  function handleAction(e) {
    const btn = e.currentTarget;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (action === 'edit-trade') openCrudModal('trade', id);
    else if (action === 'delete-trade') { DEMO_DATA.trades = DEMO_DATA.trades.filter(t => t.id !== id); renderPage(); showToast('Trade deleted','info'); }
    else if (action === 'edit-vendor') openCrudModal('vendor', id);
    else if (action === 'delete-vendor') { DEMO_DATA.vendors = DEMO_DATA.vendors.filter(v => v.id !== id); renderPage(); showToast('Vendor deleted','info'); }
  }

  // ═══ CRUD Modal ═══
  let crudCallback = null;

  function openCrudModal(type, editId) {
    const isEdit = !!editId;
    DOM.crudModalTitle.textContent = isEdit ? `Edit ${type}` : `Create ${type}`;
    let fields = '';

    if (type === 'trade') {
      const item = isEdit ? DEMO_DATA.trades.find(t => t.id === editId) : { name:'', description:'', status:'Active' };
      fields = `
        <div class="form-group"><label class="form-label">Name</label><input class="form-input" id="crudName" value="${esc(item.name)}"></div>
        <div class="form-group"><label class="form-label">Description</label><input class="form-input" id="crudDesc" value="${esc(item.description)}"></div>
        <div class="form-group"><label class="form-label">Status</label><select class="form-input" id="crudStatus">
          <option value="Active" ${item.status==='Active'?'selected':''}>Active</option>
          <option value="Inactive" ${item.status==='Inactive'?'selected':''}>Inactive</option>
        </select></div>`;
      crudCallback = () => {
        const d = { name: $('#crudName').value.trim(), description: $('#crudDesc').value.trim() || '-', status: $('#crudStatus').value };
        if (!d.name) { showToast('Name is required','warning'); return false; }
        if (isEdit) { Object.assign(item, d); } else { DEMO_DATA.trades.push({ id: genId(), ...d }); }
        return true;
      };
    } else if (type === 'vendor') {
      const item = isEdit ? DEMO_DATA.vendors.find(v => v.id === editId) : { name:'', vendorType:'Material Supplier', trade:'', activeProjects:0, status:'Active' };
      fields = `
        <div class="form-group"><label class="form-label">Vendor Name</label><input class="form-input" id="crudName" value="${esc(item.name)}"></div>
        <div class="form-group"><label class="form-label">Vendor Type</label><select class="form-input" id="crudType">
          <option value="Material Supplier" ${item.vendorType==='Material Supplier'?'selected':''}>Material Supplier</option>
          <option value="Subcontractor" ${item.vendorType==='Subcontractor'?'selected':''}>Subcontractor</option>
        </select></div>
        <div class="form-group"><label class="form-label">Trade</label><select class="form-input" id="crudTrade">
          ${DEMO_DATA.trades.map(t => `<option value="${esc(t.name)}" ${item.trade===t.name?'selected':''}>${esc(t.name)}</option>`).join('')}
        </select></div>
        <div class="form-group"><label class="form-label">Status</label><select class="form-input" id="crudStatus">
          <option value="Active" ${item.status==='Active'?'selected':''}>Active</option>
          <option value="Inactive" ${item.status==='Inactive'?'selected':''}>Inactive</option>
        </select></div>`;
      crudCallback = () => {
        const d = { name: $('#crudName').value.trim(), vendorType: $('#crudType').value, trade: $('#crudTrade').value, status: $('#crudStatus').value, activeProjects: item.activeProjects||0 };
        if (!d.name) { showToast('Name is required','warning'); return false; }
        if (isEdit) { Object.assign(item, d); } else { DEMO_DATA.vendors.push({ id: genId(), ...d }); }
        return true;
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
    const msg = { id: genId(), role, content, sources, timestamp: Date.now() };
    chat.messages.push(msg);
    if (role==='user' && chat.messages.filter(m=>m.role==='user').length===1) {
      chat.title = content.slice(0,50) + (content.length>50?'…':'');
    }
    saveChats();
    return msg;
  }

  function renderChatMessages() {
    const chat = getActiveChat();
    if (!chat || chat.messages.length === 0) {
      DOM.chatMessages.innerHTML = `
        <div class="chat-msg bot">
          <div>Hi Carl,</div>
          <div style="margin-top:8px">I hope this message finds you well.</div>
          <div style="margin-top:8px"><strong>Pan Pacific Village Centre</strong></div>
          <div>- <strong>Summary:</strong> The document is...</div>
          <div style="margin-top:4px">- <strong>Insights:</strong> The RFT is for...</div>
          <div style="margin-top:8px">Please review the attached details.</div>
          <div style="margin-top:8px">Best regards,</div>
          <div style="margin-top:8px">Tanvir Test<br>Project Manager<br>BuildMarshal Technology Corp<br>support@buildmarshal.ai</div>
          <div class="chat-msg-time"><span class="material-icons-outlined">done_all</span> Feb 11, 2026, 4:21 PM</div>
        </div>
        <div class="chat-msg bot" style="margin-top:8px">
          <div>Please review the draft and let me know if there are any changes you'd like to make before sending it.</div>
          <div class="chat-msg-time"><span class="material-icons-outlined">done_all</span> Feb 11, 2026, 4:21 PM</div>
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
        <div class="message-text">${renderMd(msg.content)}</div>
        ${srcHtml}
        <div class="chat-msg-time">${fmtTime(msg.timestamp)}</div>
      </div>`;
    }).join('');

    DOM.chatMessages.querySelectorAll('.citation-card').forEach(c => {
      c.addEventListener('click', () => { if(c.dataset.imageUrl) openImagePreview(c.dataset.imageUrl); });
    });
    scrollChatBottom();
  }

  function scrollChatBottom() {
    requestAnimationFrame(() => { DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight; });
  }

  async function sendChatMessage() {
    const text = DOM.chatInput.value.trim();
    if (!text || state.isStreaming) return;
    if (!getActiveChat()) createNewChat();
    addMessage('user', text);
    DOM.chatInput.value = '';
    renderChatMessages();
    state.isStreaming = true;
    // Show typing
    const typEl = document.createElement('div');
    typEl.className = 'chat-msg bot';
    typEl.id = 'typingIndicator';
    typEl.innerHTML = '<div class="typing-indicator"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>';
    DOM.chatMessages.appendChild(typEl);
    scrollChatBottom();

    try {
      const chat = getActiveChat();
      const history = chat.messages.filter(m=>m.role==='user'||m.role==='bot').slice(-10).map(m=>({role:m.role==='bot'?'assistant':m.role,content:m.content}));
      history.pop();
      const res = await apiReq('/api/chat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ query:text, history, model:APP_CONFIG.MODEL, top_k:APP_CONFIG.TOP_K })
      });
      const el = document.getElementById('typingIndicator'); if(el)el.remove();
      const ct = res.headers.get('content-type')||'';
      if (ct.includes('text/event-stream')) {
        await handleStream(res);
      } else {
        const data = await res.json();
        addMessage('bot', data.response, data.sources||null);
        renderChatMessages();
      }
    } catch(error) {
      const el = document.getElementById('typingIndicator'); if(el)el.remove();
      if (error.message.includes('Backend URL not configured')) {
        addMessage('bot', '⚙️ **Backend not connected.** Open Settings and enter your ngrok URL.');
      } else {
        addMessage('bot', `❌ **Error:** ${error.message}`);
      }
      renderChatMessages();
    } finally {
      state.isStreaming = false;
    }
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
        const lines = buffer.split('\n');
        buffer = lines.pop();
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
  function closeUploadPanel() {
    DOM.uploadPanel.classList.remove('open');
    DOM.uploadPanelOverlay.classList.remove('open');
  }

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
      state.uploadedDocs.push(doc);
      renderDocList();
      try {
        const fd = new FormData(); fd.append('file',file); fd.append('doc_id',docId);
        const res = await apiReq('/api/upload',{method:'POST',body:fd});
        const data = await res.json();
        doc.status='indexed'; doc.pages=data.pages||0;
        renderDocList();
        showToast(`Uploaded: ${file.name}`,'success');
      } catch(e) { doc.status='error'; renderDocList(); showToast(`Upload failed: ${file.name}`,'error'); }
    }
  }

  async function fetchDocuments() {
    try { const r=await apiReq('/api/documents'); const d=await r.json(); state.uploadedDocs=d.documents||[]; renderDocList(); } catch(e) {}
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
    fetchDocuments();
  }

  // ═══ Image Preview ═══
  function openImagePreview(url) { DOM.imagePreviewImg.src=url; DOM.imagePreviewOverlay.classList.add('open'); }
  function closeImagePreview() { DOM.imagePreviewOverlay.classList.remove('open'); DOM.imagePreviewImg.src=''; }

  // ═══ Event Listeners ═══
  function initEvents() {
    // Sidebar nav
    $$('.nav-item[data-page]').forEach(item => {
      item.addEventListener('click', () => navigateTo(item.dataset.page));
    });
    $$('.nav-group-header').forEach(hdr => {
      hdr.addEventListener('click', () => {
        const key = hdr.dataset.group;
        state.expandedGroups[key] = !state.expandedGroups[key];
        updateNavGroups();
      });
    });

    // Sidebar toggle (mobile)
    DOM.btnSidebarToggle.addEventListener('click', () => DOM.sidebar.classList.toggle('open'));

    // Chat panel toggle
    DOM.btnToggleChat.addEventListener('click', () => {
      DOM.chatPanel.classList.toggle('collapsed');
      if (window.innerWidth <= 1200) DOM.chatPanel.classList.toggle('visible');
    });

    // Chat send
    DOM.btnChatSend.addEventListener('click', sendChatMessage);
    DOM.chatInput.addEventListener('keydown', e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChatMessage();} });

    // Settings
    const settingsNavItem = $('.nav-item[data-page="marshal-chat"]');
    // Open settings via gear icon click — we add a settings trigger
    DOM.btnCloseSettings.addEventListener('click', closeSettings);
    DOM.btnCancelSettings.addEventListener('click', closeSettings);
    DOM.btnSaveSettings.addEventListener('click', saveSettings);
    DOM.settingsModal.addEventListener('click', e => { if(e.target===DOM.settingsModal) closeSettings(); });

    // CRUD modal
    DOM.btnCloseCrud.addEventListener('click', closeCrudModal);
    DOM.btnCancelCrud.addEventListener('click', closeCrudModal);
    DOM.btnSaveCrud.addEventListener('click', () => {
      if (crudCallback && crudCallback()) { closeCrudModal(); renderPage(); showToast('Saved successfully','success'); }
    });
    DOM.crudModal.addEventListener('click', e => { if(e.target===DOM.crudModal) closeCrudModal(); });

    // Upload panel
    DOM.btnCloseUploadPanel.addEventListener('click', closeUploadPanel);
    DOM.uploadPanelOverlay.addEventListener('click', closeUploadPanel);
    DOM.btnChatAttach.addEventListener('click', openUploadPanel);
    DOM.dropZone.addEventListener('dragover', e => { e.preventDefault(); DOM.dropZone.classList.add('drag-over'); });
    DOM.dropZone.addEventListener('dragleave', () => DOM.dropZone.classList.remove('drag-over'));
    DOM.dropZone.addEventListener('drop', e => { e.preventDefault(); DOM.dropZone.classList.remove('drag-over'); uploadFiles(e.dataTransfer.files); });
    DOM.fileInput.addEventListener('change', e => { if(e.target.files.length>0){uploadFiles(e.target.files);e.target.value='';} });

    // Image preview
    DOM.imagePreviewOverlay.addEventListener('click', e => {
      if(e.target===DOM.imagePreviewOverlay||e.target.closest('.image-preview-close')) closeImagePreview();
    });

    // Keyboard
    document.addEventListener('keydown', e => {
      if(e.key==='Escape'){closeImagePreview();closeSettings();closeCrudModal();closeUploadPanel();}
    });

    // User profile → settings
    $('#userProfile').addEventListener('click', openSettings);

    // Back button
    DOM.btnBack.addEventListener('click', () => navigateTo('project-details'));
  }

  // ═══ Init ═══
  function init() {
    loadChats();
    initEvents();
    updateNavGroups();
    navigateTo('project-details');
    renderChatMessages();
    if (getApiUrl()) { checkConnection(); fetchDocuments(); }
    setInterval(checkConnection, 30000);
    console.log('%c🏗️ BuildMarshal','font-size:20px;font-weight:bold;color:#22c55e');
  }

  document.readyState==='loading' ? document.addEventListener('DOMContentLoaded',init) : init();
})();
