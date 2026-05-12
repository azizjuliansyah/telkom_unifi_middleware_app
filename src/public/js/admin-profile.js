document.getElementById('profile-form').onsubmit = async function(e) {
  e.preventDefault();

  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  const messageEl = document.getElementById('form-message');
  const btn = document.getElementById('save-profile-btn');

  // Reset message
  messageEl.classList.add('hidden');
  messageEl.classList.remove('bg-green-50', 'text-green-600', 'bg-red-50', 'text-red-600');

  if (!newPassword) {
    showMessage('Password baru wajib diisi', 'error');
    return;
  }

  if (newPassword !== confirmPassword) {
    showMessage('Konfirmasi password tidak cocok', 'error');
    return;
  }

  if (newPassword.length < 6) {
    showMessage('Password minimal 6 karakter', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Menyimpan...';

  try {
    const res = await fetch('/admin/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword })
    });
    const data = await res.json();

    if (data.success) {
      showMessage('Password berhasil diperbarui!', 'success');
      document.getElementById('new-password').value = '';
      document.getElementById('confirm-password').value = '';
    } else {
      showMessage(data.message || 'Terjadi kesalahan', 'error');
    }
  } catch (err) {
    showMessage('Terjadi kesalahan koneksi', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Simpan Perubahan';
  }
};

function showMessage(msg, type) {
  const messageEl = document.getElementById('form-message');
  messageEl.textContent = msg;
  messageEl.classList.remove('hidden');
  if (type === 'success') {
    messageEl.classList.add('bg-green-50', 'text-green-600', 'border', 'border-green-100');
  } else {
    messageEl.classList.add('bg-red-50', 'text-red-600', 'border', 'border-red-100');
  }
}
