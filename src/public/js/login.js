// Fetch config on load
(async function() {
  try {
    const res = await fetch('/guest/config');
    const data = await res.json();
    const link = document.getElementById('forgot-password-link');
    if (link && data.forgotPasswordUrl) {
      link.href = data.forgotPasswordUrl;
      link.target = '_blank'; // Optional: open in new tab
    }
  } catch (err) {
    console.error('Failed to load config:', err);
  }
})();

document.getElementById('login-form').addEventListener('submit', async function(e) {
  e.preventDefault();

  const btn = document.getElementById('submit-btn');
  const errorEl = document.getElementById('error-msg');
  const successEl = document.getElementById('success-msg');

  if (errorEl) errorEl.style.display = 'none';
  if (successEl) successEl.style.display = 'none';
  
  btn.disabled = true;
  btn.textContent = 'Memverifikasi...';

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  const loginUrl = window.location.pathname.replace(/\/$/, '') + '/login';

  try {
    const res = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (data.success) {
      if (successEl) {
        successEl.textContent = 'Akses diberikan! Mengalihkan ke internet...';
        successEl.style.display = 'block';
      }
      setTimeout(() => { 
        window.location.href = `/guest/success?url=${encodeURIComponent(data.redirect)}`;
      }, 800);
    } else {
      if (errorEl) {
        errorEl.textContent = data.message || 'Login gagal';
        errorEl.style.display = 'block';
      }
      btn.disabled = false;
      btn.textContent = 'Masuk';
    }
  } catch (err) {
    if (errorEl) {
      errorEl.textContent = 'Terjadi kesalahan koneksi, coba lagi';
      errorEl.style.display = 'block';
    }
    btn.disabled = false;
    btn.textContent = 'Masuk';
  }
});
