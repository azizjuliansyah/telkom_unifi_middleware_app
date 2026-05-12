/**
 * Toast Notification System
 * Author: Antigravity
 */

const toastStyles = {
    success: {
        bg: 'bg-green-50',
        border: 'border-green-100',
        text: 'text-green-800',
        icon: 'check_circle',
        iconColor: 'text-green-500'
    },
    error: {
        bg: 'bg-red-50',
        border: 'border-red-100',
        text: 'text-primary',
        icon: 'error',
        iconColor: 'text-primary'
    },
    info: {
        bg: 'bg-blue-50',
        border: 'border-blue-100',
        text: 'text-blue-800',
        icon: 'info',
        iconColor: 'text-blue-500'
    },
    warning: {
        bg: 'bg-amber-50',
        border: 'border-amber-100',
        text: 'text-amber-800',
        icon: 'warning',
        iconColor: 'text-amber-500'
    }
};

function showToast(message, type = 'success', duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none';
        document.body.appendChild(container);
    }

    const style = toastStyles[type] || toastStyles.info;
    const toast = document.createElement('div');
    toast.className = `
        ${style.bg} ${style.border} border ${style.text}
        px-5 py-2 rounded-xl shadow-sm flex items-center gap-4
        min-w-[320px] max-w-[420px] pointer-events-auto
        animate-in fade-in slide-in-from-right-8 duration-300
    `;

    toast.innerHTML = `
        <span class="material-symbols-outlined ${style.iconColor} text-2xl">${style.icon}</span>
        <div class="flex-grow">
            <p class="text-sm font-bold leading-tight">${message}</p>
        </div>
        <button class="text-on-secondary-container hover:text-on-surface transition-colors" onclick="this.parentElement.remove()">
            <span class="material-symbols-outlined text-lg">close</span>
        </button>
    `;

    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
        toast.classList.add('animate-out', 'fade-out', 'slide-out-to-right-8');
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 300);
    }, duration);
}

// Global exposure
window.showToast = showToast;
