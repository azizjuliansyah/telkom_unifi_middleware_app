/**
 * Common UI interactions for Telkom Admin Portal
 */

document.addEventListener('click', function(e) {
  // Password Visibility Toggle
  const toggleBtn = e.target.closest('[data-password-toggle]');
  if (toggleBtn) {
    e.preventDefault();
    
    // Find the input field
    // 1. Try finding by ID if provided in data-target
    // 2. Fallback to finding the nearest input in the same container
    const targetId = toggleBtn.getAttribute('data-target');
    let input;
    
    if (targetId) {
      input = document.getElementById(targetId);
    } else {
      const container = toggleBtn.closest('.relative') || toggleBtn.parentElement;
      input = container.querySelector('input');
    }

    if (input) {
      const iconOn = toggleBtn.querySelector('.icon-on');
      const iconOff = toggleBtn.querySelector('.icon-off');

      if (input.type === 'password') {
        input.type = 'text';
        if (iconOn) iconOn.classList.add('hidden');
        if (iconOff) iconOff.classList.remove('hidden');
      } else {
        input.type = 'password';
        if (iconOn) iconOn.classList.remove('hidden');
        if (iconOff) iconOff.classList.add('hidden');
      }
    }
  }
});
