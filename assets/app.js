// Public front-end logic
document.addEventListener('DOMContentLoaded', () => {
  DB.seedIfEmpty();

  const list = document.getElementById('camps-list');
  const modal = document.getElementById('reg-modal');
  const successModal = document.getElementById('success-modal');
  const form = document.getElementById('reg-form');
  const formError = document.getElementById('form-error');
  let activeCampId = null;

  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function renderCamps() {
    const camps = DB.getCamps();
    if (camps.length === 0) {
      list.innerHTML = '<div class="empty-state">Momentálně žádné kempy nejsou vypsány.</div>';
      return;
    }

    list.innerHTML = camps.map(camp => {
      const status = DB.campStatusLabel(camp);
      const open = DB.isCampOpen(camp);
      const registered = DB.getRidersForCamp(camp.id).length;
      const spotsHtml = camp.capacity > 0
        ? `<span class="camp-spots">${registered} / ${camp.capacity} míst obsazeno</span>`
        : '';

      return `
        <div class="camp-card" data-id="${camp.id}">
          <div class="camp-info">
            <div class="camp-name">${escHtml(camp.name)}</div>
            <div class="camp-meta">
              <span class="camp-place">${escHtml(camp.place)}</span>
              <span class="camp-dates">${formatDate(camp.dateFrom)} – ${formatDate(camp.dateTo)}</span>
              ${spotsHtml}
            </div>
          </div>
          <span class="camp-status-badge ${status.css}">${status.text}</span>
          ${open
            ? `<button class="btn btn-primary reg-btn" data-id="${camp.id}">Přihlásit se</button>`
            : `<button class="btn btn-disabled" disabled>Přihlášení uzavřeno</button>`}
        </div>`;
    }).join('');

    list.querySelectorAll('.reg-btn').forEach(btn => {
      btn.addEventListener('click', () => openModal(btn.dataset.id));
    });
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function openModal(campId) {
    activeCampId = campId;
    const camp = DB.getCamps().find(c => c.id === campId);
    document.getElementById('modal-camp-name').textContent = camp ? camp.name : '';
    form.reset();
    formError.classList.add('hidden');
    form.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
    modal.classList.remove('hidden');
    document.getElementById('rider-name').focus();
  }

  function closeModal() {
    modal.classList.add('hidden');
    activeCampId = null;
  }

  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  form.addEventListener('submit', e => {
    e.preventDefault();
    formError.classList.add('hidden');

    const riderName   = form.riderName.value.trim();
    const contactName = form.contactName.value.trim();
    const contactPhone= form.contactPhone.value.trim();
    let valid = true;

    [['rider-name', riderName], ['contact-name', contactName], ['contact-phone', contactPhone]]
      .forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (!val) { el.classList.add('invalid'); valid = false; }
        else el.classList.remove('invalid');
      });

    if (!valid) {
      formError.textContent = 'Vyplňte prosím všechna povinná pole.';
      formError.classList.remove('hidden');
      return;
    }

    if (!DB.isCampOpen({ id: activeCampId, ...DB.getCamps().find(c => c.id === activeCampId) })) {
      formError.textContent = 'Přihlášky na tento kemp jsou již uzavřeny.';
      formError.classList.remove('hidden');
      return;
    }

    DB.addRider({ campId: activeCampId, riderName, contactName, contactPhone });
    closeModal();

    const camp = DB.getCamps().find(c => c.id === activeCampId) ||
                 DB.getCamps()[DB.getCamps().length - 1];
    document.getElementById('success-message').textContent =
      `${riderName} byl(a) úspěšně přihlášen(a).`;
    successModal.classList.remove('hidden');
    renderCamps();
  });

  document.getElementById('success-close-btn').addEventListener('click', () => {
    successModal.classList.add('hidden');
  });
  successModal.addEventListener('click', e => {
    if (e.target === successModal) successModal.classList.add('hidden');
  });

  renderCamps();
});
