async function init() {
  try {
    const res = await fetch('/admin/api/stats');
    const data = await res.json();

    if (data.success) {
      updateStats(data.stats);
      updateRecentUsers(data.recentUsers);
    } else {
      showToast(data.message || 'Gagal memuat statistik', 'error');
    }
  } catch (err) {
    console.error('[Dashboard] Init Error:', err);
    showToast('Terjadi kesalahan koneksi', 'error');
  }
}

function updateStats(stats) {
  const totalUsersEl = document.getElementById('stat-total-users');
  const activeUsersEl = document.getElementById('stat-active-users');
  const adminsEl = document.getElementById('stat-admins');

  if (totalUsersEl) {
    animateNumber(totalUsersEl, stats.totalUsers);
  }
  if (activeUsersEl) {
    animateNumber(activeUsersEl, stats.activeUsers);
  }
  if (adminsEl) {
    animateNumber(adminsEl, stats.totalAdmins);
  }
}

function updateRecentUsers(users) {
  const tbody = document.getElementById('recent-users-tbody');
  if (!tbody) return;

  if (!users || users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="px-8 py-12 text-center text-outline font-medium">Belum ada user yang ditambahkan.</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  users.forEach(user => {
    const tr = document.createElement('tr');
    tr.className = 'border-b border-outline-variant hover:bg-surface-container-low transition-colors duration-200';
    
    const date = new Date(user.created_at).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    tr.innerHTML = `
      <td class="px-8 py-5">
        <span class="text-sm font-bold text-on-surface">${escapeHtml(user.username)}</span>
      </td>
      <td class="px-8 py-5 text-sm font-medium text-on-secondary-container">${escapeHtml(user.full_name || '-')}</td>
      <td class="px-8 py-5 text-xs font-bold text-outline uppercase tracking-wider">${date}</td>
    `;
    tbody.appendChild(tr);
  });
}

function animateNumber(element, finalValue) {
  let startValue = 0;
  const duration = 1000;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease out expo
    const value = progress === 1 ? finalValue : Math.floor(finalValue * (1 - Math.pow(2, -10 * progress)));
    
    element.textContent = value;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

init();
