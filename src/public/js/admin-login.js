document.getElementById('login-form').addEventListener('submit', async function(e) {
  e.preventDefault();

  const btn = document.getElementById('submit-btn');
  const errorEl = document.getElementById('error-msg');

  if (errorEl) errorEl.style.display = 'none';
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
      if (errorEl) {
        errorEl.textContent = data.message || 'Login gagal';
        errorEl.style.display = 'block';
      }
      btn.disabled = false;
      btn.textContent = 'Login';
    }
  } catch (err) {
    if (errorEl) {
      errorEl.textContent = 'Terjadi kesalahan koneksi, coba lagi';
      errorEl.style.display = 'block';
    }
    btn.disabled = false;
    btn.textContent = 'Login';
  }
});
