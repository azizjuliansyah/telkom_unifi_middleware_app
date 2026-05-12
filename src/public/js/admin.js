let currentDeleteId = null;
let isEditMode = false;
let currentPage = 1;
let currentSearch = '';
const limit = 10;

async function init() {
  const meRes = await fetch('/admin/api/me');
  if (meRes.status === 401) return window.location.href = '/admin/login';
  const me = await meRes.json();
  
  // Update header display names
  const adminDisplayNameEl = document.getElementById('admin-display-name');
  const adminDropdownUsernameEl = document.getElementById('admin-dropdown-username');
  if (adminDisplayNameEl) adminDisplayNameEl.textContent = me.data.username;
  if (adminDropdownUsernameEl) adminDropdownUsernameEl.textContent = me.data.username;

  loadUsers();
}

async function loadUsers() {
  const loadingState = document.getElementById('loading-state');
  const usersTbody = document.getElementById('users-tbody');
  const emptyState = document.getElementById('empty-state');

  if (loadingState) loadingState.style.display = 'block';
  if (usersTbody) usersTbody.innerHTML = '';
  if (emptyState) emptyState.style.display = 'none';

  try {
    const res = await fetch(`/admin/api/users?search=${encodeURIComponent(currentSearch)}&page=${currentPage}&limit=${limit}`);
    const data = await res.json();

    if (loadingState) loadingState.style.display = 'none';

    if (!data.users || data.users.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      updatePagination(0, 0, 0);
      return;
    }

    if (usersTbody) {
      data.users.forEach((user, i) => {
        const tr = document.createElement('tr');
        const date = new Date(user.created_at).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
        const statusBadge = user.is_active
          ? '<span class="badge badge-active">Aktif</span>'
          : '<span class="badge badge-inactive">Nonaktif</span>';
        
        tr.innerHTML = `
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${i + 1}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${escapeHtml(user.username)}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${escapeHtml(user.full_name || '-')}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${statusBadge}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${date}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
            <button class="text-red-600 hover:text-red-900 mr-3" onclick="openEditModal('${user.id}', '${escapeHtml(user.username)}', '${escapeHtml(user.full_name || '')}', ${user.is_active})" title="Edit">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
            </button>
            <button class="text-red-600 hover:text-red-900" onclick="openDeleteModal('${user.id}', '${escapeHtml(user.username)}')" title="Hapus">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
          </td>
        `;
        usersTbody.appendChild(tr);
      });
    }

    updatePagination(data.pagination.total, data.pagination.page, data.pagination.totalPages);

  } catch (err) {
    console.error('Error loading users:', err);
    if (loadingState) loadingState.textContent = 'Gagal memuat data.';
  }
}

function updatePagination(total, page, totalPages) {
  const prevBtn = document.getElementById('prev-page');
  const nextBtn = document.getElementById('next-page');
  const paginationInfo = document.getElementById('pagination-info');
  const pageNumbers = document.getElementById('page-numbers');

  if (paginationInfo) {
    const start = total === 0 ? 0 : (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);
    paginationInfo.textContent = `Menampilkan ${start}-${end} dari ${total} data`;
  }

  if (prevBtn) prevBtn.disabled = page <= 1;
  if (nextBtn) nextBtn.disabled = page >= totalPages;

  if (pageNumbers) {
    pageNumbers.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement('button');
      btn.textContent = i;
      btn.className = `w-8 h-8 rounded-lg text-xs font-black transition-all ${
        i === page 
          ? 'bg-red-600 text-white shadow-lg shadow-red-100' 
          : 'text-gray-400 hover:bg-gray-100'
      }`;
      btn.onclick = () => {
        currentPage = i;
        loadUsers();
      };
      pageNumbers.appendChild(btn);
    }
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

const addUserBtn = document.getElementById('add-user-btn');
if (addUserBtn) {
  addUserBtn.onclick = function() {
    isEditMode = false;
    document.getElementById('modal-title').textContent = 'Tambah User';
    document.getElementById('user-id').value = '';
    document.getElementById('field-username').value = '';
    document.getElementById('field-fullname').value = '';
    document.getElementById('field-password').value = '';
    document.getElementById('field-password').placeholder = 'Password';
    document.getElementById('password-hint').style.display = 'none';
    document.getElementById('status-group').style.display = 'none';
    document.getElementById('modal-error').style.display = 'none';
    document.getElementById('modal-overlay').style.display = 'flex';
  };
}

window.openEditModal = function(id, username, fullName, isActive) {
  isEditMode = true;
  document.getElementById('modal-title').textContent = 'Edit User';
  document.getElementById('user-id').value = id;
  document.getElementById('field-username').value = username;
  document.getElementById('field-fullname').value = fullName;
  document.getElementById('field-password').value = '';
  document.getElementById('field-password').placeholder = 'Kosongkan jika tidak diubah';
  document.getElementById('password-hint').style.display = 'block';
  document.getElementById('status-group').style.display = 'block';
  document.getElementById('field-status').value = isActive ? '1' : '0';
  document.getElementById('modal-error').style.display = 'none';
  document.getElementById('modal-overlay').style.display = 'flex';
}

window.closeModal = function() {
  document.getElementById('modal-overlay').style.display = 'none';
}

const modalClose = document.getElementById('modal-close');
const modalCancel = document.getElementById('modal-cancel');
if (modalClose) modalClose.onclick = closeModal;
if (modalCancel) modalCancel.onclick = closeModal;

const modalSave = document.getElementById('modal-save');
if (modalSave) {
  modalSave.onclick = async function() {
    const id = document.getElementById('user-id').value;
    const username = document.getElementById('field-username').value.trim();
    const fullName = document.getElementById('field-fullname').value.trim();
    const password = document.getElementById('field-password').value;
    const isActive = document.getElementById('field-status').value;

    const errorEl = document.getElementById('modal-error');
    if (errorEl) errorEl.style.display = 'none';

    if (!username) return showModalError('Username wajib diisi');
    if (!isEditMode && !password) return showModalError('Password wajib diisi');

    const saveBtn = document.getElementById('modal-save');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Menyimpan...';

    try {
      const url = isEditMode ? `/admin/api/users/${id}` : '/admin/api/users';
      const method = isEditMode ? 'PUT' : 'POST';
      const body = { username, fullName };
      if (password) body.password = password;
      if (isEditMode) body.isActive = parseInt(isActive);

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (data.success) {
        closeModal();
        loadUsers();
      } else {
        showModalError(data.message || 'Terjadi kesalahan');
      }
    } catch (err) {
      showModalError('Terjadi kesalahan koneksi');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Simpan';
    }
  };
}

function showModalError(msg) {
  const el = document.getElementById('modal-error');
  if (el) {
    el.textContent = msg;
    el.style.display = 'block';
  }
}

window.openDeleteModal = function(id, username) {
  currentDeleteId = id;
  const deleteConfirmText = document.getElementById('delete-confirm-text');
  if (deleteConfirmText) {
    deleteConfirmText.textContent = `Hapus user "${username}"? Tindakan ini tidak dapat dibatalkan.`;
  }
  document.getElementById('delete-overlay').style.display = 'flex';
}

const deleteCancel = document.getElementById('delete-cancel');
if (deleteCancel) {
  deleteCancel.onclick = function() {
    document.getElementById('delete-overlay').style.display = 'none';
  };
}

const deleteConfirm = document.getElementById('delete-confirm');
if (deleteConfirm) {
  deleteConfirm.onclick = async function() {
    if (!currentDeleteId) return;
    await fetch(`/admin/api/users/${currentDeleteId}`, { method: 'DELETE' });
    document.getElementById('delete-overlay').style.display = 'none';
    loadUsers();
  };
}

const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.onclick = async function() {
    await fetch('/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  };
}

// Dropdown User Menu
const userMenuBtn = document.getElementById('user-menu-btn');
const userDropdown = document.getElementById('user-dropdown');
const userMenuContainer = document.getElementById('user-menu-container');

if (userMenuBtn && userDropdown) {
  userMenuBtn.onclick = function(e) {
    e.stopPropagation();
    userDropdown.classList.toggle('hidden');
  };

  document.addEventListener('click', function(e) {
    if (userMenuContainer && !userMenuContainer.contains(e.target)) {
      userDropdown.classList.add('hidden');
    }
  });
}

// Logout via header
const logoutBtnHeader = document.getElementById('logout-btn-header');
if (logoutBtnHeader) {
  logoutBtnHeader.onclick = async function() {
    await fetch('/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  };
}

// Search debounce
let searchTimeout;
const searchInput = document.getElementById('search-input');
if (searchInput) {
  searchInput.oninput = (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentSearch = e.target.value;
      currentPage = 1;
      loadUsers();
    }, 500);
  };
}

// Pagination buttons
const prevBtn = document.getElementById('prev-page');
const nextBtn = document.getElementById('next-page');
if (prevBtn) {
  prevBtn.onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      loadUsers();
    }
  };
}
if (nextBtn) {
  nextBtn.onclick = () => {
    currentPage++;
    loadUsers();
  };
}

init();
