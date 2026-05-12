document.getElementById('login-form').addEventListener('submit', async function(e) {
  e.preventDefault();

  const btn = document.getElementById('submit-btn');



  btn.disabled = true;
  btn.textContent = 'Memproses...';

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  try {
    const res = await fetch('/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (data.success) {
      window.location.href = '/admin';
    } else {
      showToast(data.message || 'Login gagal', 'error');
      btn.disabled = false;
      btn.textContent = 'Login';
    }
  } catch (err) {
    showToast('Terjadi kesalahan koneksi, coba lagi', 'error');
    btn.disabled = false;
    btn.textContent = 'Login';
  }
});
