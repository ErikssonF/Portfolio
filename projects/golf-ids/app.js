const STORAGE_KEY = 'golf_ids_mates';

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
