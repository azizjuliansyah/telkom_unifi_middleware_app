document.getElementById('profile-form').onsubmit = async function(e) {
  e.preventDefault();

  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  const btn = document.getElementById('save-profile-btn');

  if (!newPassword) {
    showToast('Please enter a new password', 'error');
    return;
  }

  if (newPassword !== confirmPassword) {
    showToast('Passwords do not match', 'error');
    return;
  }

  if (newPassword.length < 6) {
    showToast('Password must be at least 6 characters', 'error');
    return;
  }

  btn.disabled = true;
  const originalHtml = btn.innerHTML;
  btn.innerHTML = `
    <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    SAVING...
  `;

  try {
    const res = await fetch('/admin/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword })
    });
    const data = await res.json();

    if (data.success) {
      showToast('Password updated successfully!', 'success');
      document.getElementById('new-password').value = '';
      document.getElementById('confirm-password').value = '';
    } else {
      showToast(data.message || 'An error occurred', 'error');
    }
  } catch (err) {
    showToast('Connection error', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
};

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
