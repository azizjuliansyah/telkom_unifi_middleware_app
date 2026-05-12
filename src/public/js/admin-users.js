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
        tr.className = 'hover:bg-surface-container-low transition-colors duration-200';
        
        const createdAt = new Date(user.created_at).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });

        const updatedAt = new Date(user.updated_at).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });

        const statusHtml = user.is_active
          ? `<div class="flex items-center gap-2 text-emerald-600 text-[11px] font-bold">
              <span class="w-2 h-2 rounded-full bg-emerald-600"></span>
              ACTIVE
             </div>`
          : `<div class="flex items-center gap-2 text-red-600 text-[11px] font-bold">
              <span class="w-2 h-2 rounded-full bg-red-600"></span>
              INACTIVE
             </div>`;
        
        tr.innerHTML = `
          <td class="px-6 py-4 text-xs font-bold text-on-secondary-container">${(currentPage - 1) * limit + i + 1}</td>
          <td class="px-6 py-4">
            <span class="text-sm font-bold text-on-surface">${escapeHtml(user.username)}</span>
          </td>
          <td class="px-6 py-4 text-sm font-medium text-on-secondary-container">${escapeHtml(user.full_name || '-')}</td>
          <td class="px-6 py-4">${statusHtml}</td>
          <td class="px-6 py-4 text-xs font-bold text-outline uppercase tracking-wider">${createdAt}</td>
          <td class="px-6 py-4 text-xs font-bold text-outline uppercase tracking-wider">${updatedAt}</td>
          <td class="px-6 py-4">
            <div class="flex items-center">
              <button class="material-symbols-outlined text-on-secondary-container hover:text-primary transition-colors p-1" onclick="openEditModal('${user.id}', '${escapeHtml(user.username)}', '${escapeHtml(user.full_name || '')}', ${user.is_active})" title="Edit">edit</button>
              <button class="material-symbols-outlined text-on-secondary-container hover:text-primary transition-colors p-1" onclick="openDeleteModal('${user.id}', '${escapeHtml(user.username)}')" title="Delete">delete</button>
            </div>
          </td>
        `;
        usersTbody.appendChild(tr);
      });
    }

    updatePagination(data.pagination.total, data.pagination.page, data.pagination.totalPages);

  } catch (err) {
    console.error('Error loading users:', err);
    showToast('Gagal memuat data user', 'error');
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
    paginationInfo.textContent = `Showing ${start} to ${end} of ${total} users`;
  }

  if (prevBtn) prevBtn.disabled = page <= 1;
  if (nextBtn) nextBtn.disabled = page >= totalPages;

  if (pageNumbers) {
    pageNumbers.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement('button');
      btn.textContent = i;
      btn.className = `w-9 h-9 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
        i === page 
          ? 'bg-primary text-white shadow-md shadow-red-100' 
          : 'bg-white border border-outline-variant text-on-secondary-container hover:bg-surface-container-high'
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
    document.getElementById('modal-title').textContent = 'Add New User';
    document.getElementById('user-id').value = '';
    document.getElementById('field-username').value = '';
    document.getElementById('field-fullname').value = '';
    document.getElementById('field-password').value = '';
    document.getElementById('field-password').placeholder = '••••••••';
    document.getElementById('field-password-hint').classList.add('hidden');
    document.getElementById('field-status-group').classList.add('hidden');

    document.getElementById('modal-overlay').classList.remove('hidden');
  };
}

window.openEditModal = function(id, username, fullName, isActive) {
  isEditMode = true;
  document.getElementById('modal-title').textContent = 'Edit User';
  document.getElementById('user-id').value = id;
  document.getElementById('field-username').value = username;
  document.getElementById('field-fullname').value = fullName;
  document.getElementById('field-password').value = '';
  document.getElementById('field-password').placeholder = '••••••••';
  document.getElementById('field-password-hint').classList.remove('hidden');
  document.getElementById('field-status-group').classList.remove('hidden');
  document.getElementById('field-status').value = isActive ? '1' : '0';

  document.getElementById('modal-overlay').classList.remove('hidden');
}

window.closeModal = function() {
  document.getElementById('modal-overlay').classList.add('hidden');
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

    if (!username) return showToast('Username wajib diisi', 'error');
    if (!isEditMode && !password) return showToast('Password wajib diisi', 'error');

    const saveBtn = document.getElementById('modal-save');
    saveBtn.disabled = true;
    saveBtn.textContent = 'SAVING...';

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
        showToast(isEditMode ? 'User berhasil diperbarui' : 'User berhasil ditambahkan', 'success');
        closeModal();
        loadUsers();
      } else {
        showToast(data.message || 'Terjadi kesalahan', 'error');
      }
    } catch (err) {
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'SAVE USER';
    }
  };
}



window.openDeleteModal = function(id, username) {
  currentDeleteId = id;
  const deleteConfirmText = document.getElementById('delete-confirm-text');
  if (deleteConfirmText) {
    deleteConfirmText.textContent = `Hapus user "${username}"? Tindakan ini tidak dapat dibatalkan.`;
  }
  document.getElementById('delete-overlay').classList.remove('hidden');
}

const deleteCancel = document.getElementById('delete-cancel');
if (deleteCancel) {
  deleteCancel.onclick = function() {
    document.getElementById('delete-overlay').classList.add('hidden');
  };
}

const deleteConfirm = document.getElementById('delete-confirm');
if (deleteConfirm) {
  deleteConfirm.onclick = async function() {
    const res = await fetch(`/admin/api/users/${currentDeleteId}`, { method: 'DELETE' });
    const data = await res.json();
    
    document.getElementById('delete-overlay').classList.add('hidden');
    
    if (data.success) {
      showToast('User berhasil dihapus', 'success');
      loadUsers();
    } else {
      showToast(data.message || 'Gagal menghapus user', 'error');
    }
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
