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
      showToast('Akses diberikan! Mengalihkan...', 'success');
      setTimeout(() => { 
        window.location.href = `/guest/success?url=${encodeURIComponent(data.redirect)}`;
      }, 800);
    } else {
      showToast(data.message || 'Login gagal', 'error');
      btn.disabled = false;
      btn.textContent = 'Masuk';
    }
  } catch (err) {
    showToast('Terjadi kesalahan koneksi, coba lagi', 'error');
    btn.disabled = false;
    btn.textContent = 'Masuk';
  }
});
