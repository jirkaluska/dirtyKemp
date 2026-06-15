// Admin panel logic
const ADMIN_PASS_KEY = 'dg_admin_pass';
const DEFAULT_PASS = 'dirtygoats2024';

document.addEventListener('DOMContentLoaded', () => {
  const loginScreen = document.getElementById('login-screen');
  const adminPanel  = document.getElementById('admin-panel');
  const loginForm   = document.getElementById('login-form');
  const loginError  = document.getElementById('login-error');

  function getStoredPass() {
    return localStorage.getItem(ADMIN_PASS_KEY) || DEFAULT_PASS;
  }

  function showAdmin() {
    loginScreen.classList.add('hidden');
    adminPanel.classList.remove('hidden');
    renderAdminCamps();
    renderAdminRiders();
    populateCampFilter();
  }

  if (sessionStorage.getItem('dg_admin_ok') === '1') showAdmin();

  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const pass = document.getElementById('admin-pass').value;
    if (pass === getStoredPass()) {
      sessionStorage.setItem('dg_admin_ok', '1');
      loginError.classList.add('hidden');
      showAdmin();
    } else {
      loginError.classList.remove('hidden');
      document.getElementById('admin-pass').focus();
    }
  });

  // ===== Tabs =====
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.remove('hidden');
    });
  });

  // ===== Camp form modal =====
  const campModal      = document.getElementById('camp-modal');
  const campForm       = document.getElementById('camp-form');
  const campFormError  = document.getElementById('camp-form-error');
  const campModalTitle = document.getElementById('camp-modal-title');

  function openCampModal(camp = null) {
    campFormError.classList.add('hidden');
    if (camp) {
      campModalTitle.textContent = 'Upravit kemp';
      document.getElementById('camp-id').value       = camp.id;
      document.getElementById('camp-name').value     = camp.name;
      document.getElementById('camp-place').value    = camp.place;
      document.getElementById('camp-from').value     = camp.dateFrom;
      document.getElementById('camp-to').value       = camp.dateTo;
      document.getElementById('camp-capacity').value = camp.capacity ?? 0;
      document.getElementById('camp-closed').checked = !!camp.closed;
      document.getElementById('camp-desc').value     = camp.description || '';
    } else {
      campModalTitle.textContent = 'Nový kemp';
      campForm.reset();
      document.getElementById('camp-id').value = '';
    }
    campModal.classList.remove('hidden');
    document.getElementById('camp-name').focus();
  }

  function closeCampModal() { campModal.classList.add('hidden'); }

  document.getElementById('new-camp-btn').addEventListener('click', () => openCampModal());
  document.getElementById('camp-modal-close').addEventListener('click', closeCampModal);
  document.getElementById('camp-cancel-btn').addEventListener('click', closeCampModal);
  campModal.addEventListener('click', e => { if (e.target === campModal) closeCampModal(); });

  campForm.addEventListener('submit', e => {
    e.preventDefault();
    campFormError.classList.add('hidden');

    const name     = document.getElementById('camp-name').value.trim();
    const place    = document.getElementById('camp-place').value.trim();
    const dateFrom = document.getElementById('camp-from').value;
    const dateTo   = document.getElementById('camp-to').value;
    const capacity = parseInt(document.getElementById('camp-capacity').value) || 0;
    const closed   = document.getElementById('camp-closed').checked;
    const description = document.getElementById('camp-desc').value.trim();

    if (!name || !place || !dateFrom || !dateTo) {
      campFormError.textContent = 'Vyplňte prosím všechna povinná pole.';
      campFormError.classList.remove('hidden');
      return;
    }
    if (dateTo < dateFrom) {
      campFormError.textContent = 'Datum do musí být stejné nebo pozdější než datum od.';
      campFormError.classList.remove('hidden');
      return;
    }

    const camps = DB.getCamps();
    const existingId = document.getElementById('camp-id').value;

    if (existingId) {
      const idx = camps.findIndex(c => c.id === existingId);
      if (idx >= 0) camps[idx] = { ...camps[idx], name, place, dateFrom, dateTo, capacity, closed, description };
    } else {
      camps.push({
        id: Date.now().toString(36),
        name, place, dateFrom, dateTo, capacity, closed, description
      });
    }

    DB.saveCamps(camps);
    closeCampModal();
    renderAdminCamps();
    populateCampFilter();
    renderAdminRiders();
  });

  // ===== Delete confirm =====
  const confirmModal  = document.getElementById('confirm-modal');
  let pendingDeleteId = null;

  function openConfirm(campId, campName) {
    pendingDeleteId = campId;
    document.getElementById('confirm-text').textContent =
      `Opravdu chcete smazat kemp "${campName}" a všechny přihlášky?`;
    confirmModal.classList.remove('hidden');
  }

  document.getElementById('confirm-cancel').addEventListener('click', () => {
    confirmModal.classList.add('hidden');
    pendingDeleteId = null;
  });
  confirmModal.addEventListener('click', e => {
    if (e.target === confirmModal) { confirmModal.classList.add('hidden'); pendingDeleteId = null; }
  });

  document.getElementById('confirm-ok').addEventListener('click', () => {
    if (!pendingDeleteId) return;
    const camps = DB.getCamps().filter(c => c.id !== pendingDeleteId);
    DB.saveCamps(camps);
    const riders = DB.getRiders().filter(r => r.campId !== pendingDeleteId);
    DB.saveRiders(riders);
    confirmModal.classList.add('hidden');
    pendingDeleteId = null;
    renderAdminCamps();
    renderAdminRiders();
    populateCampFilter();
  });

  // ===== Render admin camps =====
  function renderAdminCamps() {
    const list = document.getElementById('admin-camps-list');
    const camps = DB.getCamps();
    if (camps.length === 0) {
      list.innerHTML = '<div class="empty-state">Žádné kempy. Vytvořte první kliknutím na "+ Nový kemp".</div>';
      return;
    }
    list.innerHTML = camps.map(camp => {
      const status = DB.campStatusLabel(camp);
      const count  = DB.getRidersForCamp(camp.id).length;
      const spotsText = camp.capacity > 0
        ? `${count} / ${camp.capacity} jezdců`
        : `${count} jezdců`;
      return `
        <div class="admin-camp-card">
          <div class="camp-info">
            <div class="camp-name">${escHtml(camp.name)}</div>
            <div class="camp-meta">
              <span class="camp-place">${escHtml(camp.place)}</span>
              <span class="camp-dates">${formatDate(camp.dateFrom)} – ${formatDate(camp.dateTo)}</span>
              <span class="camp-spots">${spotsText}</span>
            </div>
            <div class="toggle-row" style="margin-top:0.5rem">
              <label class="toggle-switch">
                <input type="checkbox" class="close-toggle" data-id="${camp.id}" ${camp.closed ? 'checked' : ''}>
                <span class="toggle-slider"></span>
              </label>
              Ručně uzavřít přihlášky
              &nbsp;&nbsp;
              <span class="camp-status-badge ${status.css}" style="font-size:0.7rem">${status.text}</span>
            </div>
          </div>
          <div class="admin-camp-actions">
            <button class="btn btn-sm btn-edit edit-camp-btn" data-id="${camp.id}">Upravit</button>
            <button class="btn btn-sm btn-danger delete-camp-btn" data-id="${camp.id}">Smazat</button>
          </div>
        </div>`;
    }).join('');

    list.querySelectorAll('.edit-camp-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const camp = DB.getCamps().find(c => c.id === btn.dataset.id);
        if (camp) openCampModal(camp);
      });
    });

    list.querySelectorAll('.delete-camp-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const camp = DB.getCamps().find(c => c.id === btn.dataset.id);
        if (camp) openConfirm(camp.id, camp.name);
      });
    });

    list.querySelectorAll('.close-toggle').forEach(toggle => {
      toggle.addEventListener('change', () => {
        const camps = DB.getCamps();
        const idx = camps.findIndex(c => c.id === toggle.dataset.id);
        if (idx >= 0) { camps[idx].closed = toggle.checked; DB.saveCamps(camps); }
        renderAdminCamps();
      });
    });
  }

  // ===== Render riders =====
  function populateCampFilter() {
    const sel = document.getElementById('camp-filter');
    const cur = sel.value;
    sel.innerHTML = '<option value="">— Všechny kempy —</option>' +
      DB.getCamps().map(c => `<option value="${c.id}">${escHtml(c.name)}</option>`).join('');
    if (cur) sel.value = cur;
  }

  document.getElementById('camp-filter').addEventListener('change', renderAdminRiders);

  function renderAdminRiders() {
    const container = document.getElementById('admin-riders-list');
    const countEl   = document.getElementById('riders-count');
    const filterId  = document.getElementById('camp-filter').value;
    const camps     = DB.getCamps();
    const campsMap  = Object.fromEntries(camps.map(c => [c.id, c]));
    let riders = DB.getRiders();
    if (filterId) riders = riders.filter(r => r.campId === filterId);

    countEl.textContent = riders.length
      ? `Celkem: ${riders.length} jezdec/jezdců`
      : '';

    if (riders.length === 0) {
      container.innerHTML = '<div class="empty-state">Žádní přihlášení jezdci.</div>';
      return;
    }

    const filteredCamp = filterId ? campsMap[filterId] : null;

    container.innerHTML = `
      <div class="print-header">
        <img src="../assets/brand/logo.png" alt="Dirty Goats" class="print-logo">
        <h1>${filteredCamp ? escHtml(filteredCamp.name) : 'Dirty Goats – BMX Kempy'}</h1>
        <p>${filteredCamp ? `${formatDate(filteredCamp.dateFrom)} – ${formatDate(filteredCamp.dateTo)} | ${escHtml(filteredCamp.place)}` : 'Všechny kempy'} &nbsp;|&nbsp; Přihlášených jezdců: ${riders.length}</p>
      </div>
      <div class="riders-table-wrapper">
        <table class="riders-table">
          <thead>
            <tr>
              <th>#</th>
              ${!filterId ? '<th>Kemp</th>' : ''}
              <th>Jméno jezdce</th>
              <th>Kontaktní osoba</th>
              <th>Telefon</th>
              <th>Přihlášen/a</th>
            </tr>
          </thead>
          <tbody>
            ${riders.map((r, i) => `
              <tr>
                <td>${i + 1}</td>
                ${!filterId ? `<td>${escHtml(campsMap[r.campId]?.name || '–')}</td>` : ''}
                <td><strong>${escHtml(r.riderName)}</strong></td>
                <td>${escHtml(r.contactName)}</td>
                <td><a href="tel:${escHtml(r.contactPhone)}">${escHtml(r.contactPhone)}</a></td>
                <td>${formatDatetime(r.registeredAt)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  document.getElementById('print-btn').addEventListener('click', () => window.print());

  // ===== Helpers =====
  function escHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function formatDatetime(iso) {
    const d = new Date(iso);
    return d.toLocaleString('cs-CZ', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
});
