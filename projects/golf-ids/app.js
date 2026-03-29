const STORAGE_KEY = 'golf_ids_mates';

// ── State ──────────────────────────────────────────────
let mates       = loadMates();
let searchQuery = '';
let round       = []; // ids of mates added to tonight's round

// ── DOM refs ───────────────────────────────────────────
const inputName   = document.getElementById('input-name');
const inputGolfId = document.getElementById('input-golfid');
const btnAdd      = document.getElementById('btn-add');
const formError   = document.getElementById('form-error');
const inputSearch = document.getElementById('input-search');
const matesList   = document.getElementById('mates-list');
const emptyState  = document.getElementById('empty-state');
const roundPanel  = document.getElementById('round-panel');
const roundList   = document.getElementById('round-list');
const btnClear    = document.getElementById('btn-clear-round');

// ── Event listeners ────────────────────────────────────
btnAdd.addEventListener('click', handleAdd);
btnClear.addEventListener('click', () => { round = []; renderMates(); renderRound(); });

[inputName, inputGolfId].forEach(el =>
  el.addEventListener('keydown', e => { if (e.key === 'Enter') handleAdd(); })
);

inputSearch.addEventListener('input', () => {
  searchQuery = inputSearch.value.trim().toLowerCase();
  renderMates();
});

// ── Handlers ───────────────────────────────────────────
function handleAdd() {
  const name   = inputName.value.trim();
  const golfId = inputGolfId.value.trim();

  if (!name || !golfId) {
    showError('Please enter both a name and a Golf ID.');
    return;
  }

  const duplicate = mates.find(m => m.golfId.toLowerCase() === golfId.toLowerCase());
  if (duplicate) {
    showError(`That Golf ID is already saved for ${duplicate.name}.`);
    return;
  }

  mates.push({ id: Date.now(), name, golfId });
  saveMates();

  inputName.value   = '';
  inputGolfId.value = '';
  hideError();
  renderMates();
  inputName.focus();
}

function handleDelete(id) {
  mates = mates.filter(m => m.id !== id);
  round = round.filter(r => r !== id);
  saveMates();
  renderMates();
  renderRound();
}

function toggleRound(id) {
  if (round.includes(id)) {
    round = round.filter(r => r !== id);
  } else {
    round.push(id);
  }
  renderMates();
  renderRound();
}

async function handleCopy(golfId, btn) {
  try {
    await navigator.clipboard.writeText(golfId);
    btn.textContent = '✓';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = '📋';
      btn.classList.remove('copied');
    }, 1500);
  } catch {
    btn.textContent = '✗';
    setTimeout(() => { btn.textContent = '📋'; }, 1500);
  }
}

// ── Render ─────────────────────────────────────────────
function renderMates() {
  const filtered = mates.filter(m =>
    m.name.toLowerCase().includes(searchQuery) ||
    m.golfId.toLowerCase().includes(searchQuery)
  );

  matesList.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    emptyState.textContent = mates.length === 0
      ? 'No mates added yet. Add the first one above!'
      : 'No results match your search.';
    return;
  }

  emptyState.classList.add('hidden');

  filtered.forEach(mate => {
    const inRound = round.includes(mate.id);
    const li = document.createElement('li');
    li.className = 'mate-item';
    li.innerHTML = `
      <div class="mate-info">
        <div class="mate-name">${escapeHtml(mate.name)}</div>
        <div class="mate-id">${escapeHtml(mate.golfId)}</div>
      </div>
      <div class="mate-actions">
        <button class="btn-icon btn-round ${inRound ? 'in-round' : ''}" title="${inRound ? 'Remove from round' : 'Add to round'}">⛳</button>
        <button class="btn-icon btn-copy" title="Copy Golf ID">📋</button>
        <button class="btn-icon btn-delete" title="Remove">🗑</button>
      </div>
    `;

    li.querySelector('.btn-round').addEventListener('click', () => toggleRound(mate.id));
    li.querySelector('.btn-copy').addEventListener('click', function () { handleCopy(mate.golfId, this); });
    li.querySelector('.btn-delete').addEventListener('click', () => handleDelete(mate.id));

    matesList.appendChild(li);
  });
}

function renderRound() {
  roundList.innerHTML = '';

  if (round.length === 0) {
    roundPanel.classList.add('hidden');
    document.body.classList.remove('has-round');
    return;
  }

  roundPanel.classList.remove('hidden');
  document.body.classList.add('has-round');

  round.forEach(id => {
    const mate = mates.find(m => m.id === id);
    if (!mate) return;

    const li = document.createElement('li');
    li.className = 'round-item';
    li.innerHTML = `
      <div class="round-item-info">
        <div class="round-item-name">${escapeHtml(mate.name)}</div>
        <div class="round-item-id">${escapeHtml(mate.golfId)}</div>
      </div>
      <div class="round-item-actions">
        <button class="btn-icon btn-copy" title="Copy Golf ID">📋</button>
      </div>
    `;

    li.querySelector('.btn-copy').addEventListener('click', function () { handleCopy(mate.golfId, this); });

    roundList.appendChild(li);
  });
}

// ── Persistence ────────────────────────────────────────
function loadMates() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveMates() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mates));
}

// ── Helpers ────────────────────────────────────────────
function showError(msg) {
  formError.textContent = msg;
  formError.classList.remove('hidden');
}

function hideError() {
  formError.classList.add('hidden');
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Init ───────────────────────────────────────────────
renderMates();
renderRound();


// ── State ──────────────────────────────────────────────
let mates        = loadMates();
let clubs        = loadClubs();
let searchQuery  = '';

// ── DOM refs ───────────────────────────────────────────
const inputName       = document.getElementById('input-name');
const inputGolfId     = document.getElementById('input-golfid');
const btnAdd          = document.getElementById('btn-add');
const formError       = document.getElementById('form-error');
const inputSearch     = document.getElementById('input-search');
const matesList       = document.getElementById('mates-list');
const emptyState      = document.getElementById('empty-state');

const inputClubName   = document.getElementById('input-club-name');
const inputClubUrl    = document.getElementById('input-club-url');
const btnAddClub      = document.getElementById('btn-add-club');
const clubFormError   = document.getElementById('club-form-error');
const clubsList       = document.getElementById('clubs-list');
const clubsEmptyState = document.getElementById('clubs-empty-state');

// ── Event listeners ────────────────────────────────────
btnAdd.addEventListener('click', handleAdd);
btnAddClub.addEventListener('click', handleAddClub);

[inputName, inputGolfId].forEach(el =>
  el.addEventListener('keydown', e => { if (e.key === 'Enter') handleAdd(); })
);

[inputClubName, inputClubUrl].forEach(el =>
  el.addEventListener('keydown', e => { if (e.key === 'Enter') handleAddClub(); })
);

inputSearch.addEventListener('input', () => {
  searchQuery = inputSearch.value.trim().toLowerCase();
  renderMates();
});

// ── Mate handlers ──────────────────────────────────────
function handleAdd() {
  const name   = inputName.value.trim();
  const golfId = inputGolfId.value.trim();

  if (!name || !golfId) {
    showError(formError, 'Please enter both a name and a Golf ID.');
    return;
  }

  const duplicate = mates.find(m => m.golfId.toLowerCase() === golfId.toLowerCase());
  if (duplicate) {
    showError(formError, `That Golf ID is already saved for ${duplicate.name}.`);
    return;
  }

  mates.push({ id: Date.now(), name, golfId });
  saveMates();

  inputName.value   = '';
  inputGolfId.value = '';
  hideError(formError);
  renderMates();
  inputName.focus();
}

function handleDelete(id) {
  mates = mates.filter(m => m.id !== id);
  saveMates();
  renderMates();
}

async function handleCopy(golfId, btn) {
  try {
    await navigator.clipboard.writeText(golfId);
    btn.textContent = '✓';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = '📋';
      btn.classList.remove('copied');
    }, 1500);
  } catch {
    btn.textContent = '✗';
    setTimeout(() => { btn.textContent = '📋'; }, 1500);
  }
}

// ── Club handlers ──────────────────────────────────────
function handleAddClub() {
  const name = inputClubName.value.trim();
  let   url  = inputClubUrl.value.trim();

  if (!name || !url) {
    showError(clubFormError, 'Please enter both a club name and a booking URL.');
    return;
  }

  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  clubs.push({ id: Date.now(), name, url });
  saveClubs();

  inputClubName.value = '';
  inputClubUrl.value  = '';
  hideError(clubFormError);
  renderClubs();
  inputClubName.focus();
}

function handleDeleteClub(id) {
  clubs = clubs.filter(c => c.id !== id);
  saveClubs();
  renderClubs();
}

// ── Render ─────────────────────────────────────────────
function renderMates() {
  const filtered = mates.filter(m =>
    m.name.toLowerCase().includes(searchQuery) ||
    m.golfId.toLowerCase().includes(searchQuery)
  );

  matesList.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    emptyState.textContent = mates.length === 0
      ? 'No mates added yet. Add the first one above!'
      : 'No results match your search.';
    return;
  }

  emptyState.classList.add('hidden');

  filtered.forEach(mate => {
    const li = document.createElement('li');
    li.className = 'mate-item';
    li.innerHTML = `
      <div class="mate-info">
        <div class="mate-name">${escapeHtml(mate.name)}</div>
        <div class="mate-id">${escapeHtml(mate.golfId)}</div>
      </div>
      <div class="mate-actions">
        <button class="btn-icon btn-copy" title="Copy Golf ID">📋</button>
        <button class="btn-icon btn-delete" title="Remove">🗑</button>
      </div>
    `;

    li.querySelector('.btn-copy').addEventListener('click', function () {
      handleCopy(mate.golfId, this);
    });
    li.querySelector('.btn-delete').addEventListener('click', () => handleDelete(mate.id));

    matesList.appendChild(li);
  });
}

function renderClubs() {
  clubsList.innerHTML = '';

  if (clubs.length === 0) {
    clubsEmptyState.classList.remove('hidden');
    return;
  }

  clubsEmptyState.classList.add('hidden');

  clubs.forEach(club => {
    const li = document.createElement('li');
    li.className = 'club-item';
    li.innerHTML = `
      <span class="club-name">🏌️ ${escapeHtml(club.name)}</span>
      <div class="club-actions">
        <a class="btn-book" href="${escapeHtml(club.url)}" target="_blank" rel="noopener noreferrer">
          Book →
        </a>
        <button class="btn-icon btn-delete" title="Remove">🗑</button>
      </div>
    `;

    li.querySelector('.btn-delete').addEventListener('click', () => handleDeleteClub(club.id));

    clubsList.appendChild(li);
  });
}

// ── Persistence ────────────────────────────────────────
function loadMates() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveMates() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mates));
}

function loadClubs() {
  try { return JSON.parse(localStorage.getItem(CLUBS_STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveClubs() {
  localStorage.setItem(CLUBS_STORAGE_KEY, JSON.stringify(clubs));
}

// ── Helpers ────────────────────────────────────────────
function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
}

function hideError(el) {
  el.classList.add('hidden');
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Init ───────────────────────────────────────────────
renderClubs();
renderMates();


// ── State ──────────────────────────────────────────────
let mates = loadMates();
let searchQuery = '';

// ── DOM refs ───────────────────────────────────────────
const inputName    = document.getElementById('input-name');
const inputGolfId  = document.getElementById('input-golfid');
const btnAdd       = document.getElementById('btn-add');
const formError    = document.getElementById('form-error');
const inputSearch  = document.getElementById('input-search');
const matesList    = document.getElementById('mates-list');
const emptyState   = document.getElementById('empty-state');

// ── Event listeners ────────────────────────────────────
btnAdd.addEventListener('click', handleAdd);

[inputName, inputGolfId].forEach(el =>
  el.addEventListener('keydown', e => { if (e.key === 'Enter') handleAdd(); })
);

inputSearch.addEventListener('input', () => {
  searchQuery = inputSearch.value.trim().toLowerCase();
  render();
});

// ── Handlers ───────────────────────────────────────────
function handleAdd() {
  const name   = inputName.value.trim();
  const golfId = inputGolfId.value.trim();

  if (!name || !golfId) {
    showError('Please enter both a name and a Golf ID.');
    return;
  }

  const duplicate = mates.find(m => m.golfId.toLowerCase() === golfId.toLowerCase());
  if (duplicate) {
    showError(`That Golf ID is already saved for ${duplicate.name}.`);
    return;
  }

  mates.push({ id: Date.now(), name, golfId });
  saveMates();

  inputName.value  = '';
  inputGolfId.value = '';
  hideError();
  render();
  inputName.focus();
}

function handleDelete(id) {
  mates = mates.filter(m => m.id !== id);
  saveMates();
  render();
}

async function handleCopy(golfId, btn) {
  try {
    await navigator.clipboard.writeText(golfId);
    btn.textContent = '✓';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = '📋';
      btn.classList.remove('copied');
    }, 1500);
  } catch {
    btn.textContent = '✗';
    setTimeout(() => { btn.textContent = '📋'; }, 1500);
  }
}

// ── Render ─────────────────────────────────────────────
function render() {
  const filtered = mates.filter(m =>
    m.name.toLowerCase().includes(searchQuery) ||
    m.golfId.toLowerCase().includes(searchQuery)
  );

  matesList.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    emptyState.textContent = mates.length === 0
      ? 'No mates added yet. Add the first one above!'
      : 'No results match your search.';
    return;
  }

  emptyState.classList.add('hidden');

  filtered.forEach(mate => {
    const li = document.createElement('li');
    li.className = 'mate-item';
    li.innerHTML = `
      <div class="mate-info">
        <div class="mate-name">${escapeHtml(mate.name)}</div>
        <div class="mate-id">${escapeHtml(mate.golfId)}</div>
      </div>
      <div class="mate-actions">
        <button class="btn-icon btn-copy" title="Copy Golf ID">📋</button>
        <button class="btn-icon btn-delete" title="Remove">🗑</button>
      </div>
    `;

    li.querySelector('.btn-copy').addEventListener('click', function () {
      handleCopy(mate.golfId, this);
    });
    li.querySelector('.btn-delete').addEventListener('click', () => handleDelete(mate.id));

    matesList.appendChild(li);
  });
}

// ── Persistence ────────────────────────────────────────
function loadMates() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveMates() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mates));
}

// ── Helpers ────────────────────────────────────────────
function showError(msg) {
  formError.textContent = msg;
  formError.classList.remove('hidden');
}

function hideError() {
  formError.classList.add('hidden');
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Init ───────────────────────────────────────────────
render();
