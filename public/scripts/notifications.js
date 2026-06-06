const notificationShell = document.querySelector('[data-notification-shell]');
const notificationTrigger = document.querySelector('[data-notification-trigger]');
const notificationPanel = document.querySelector('[data-notification-panel]');
const notificationBody = document.querySelector('[data-notification-body]');
const notificationBellIcon = document.querySelector('[data-notification-bell-icon]');

const notificationState = {
    loaded: false,
    unreadCount: notificationTrigger?.classList.contains('is-active') ? 1 : 0,
};

const notificationBellIcons = {
    idle: notificationTrigger?.getAttribute('data-notification-bell-idle') || '/public/assets/icons/bell_icon.svg',
    active: notificationTrigger?.getAttribute('data-notification-bell-active') || '/public/assets/icons/bell_icon_active.svg',
};

const csrfHeaders = () => {
    const token = String(window.APP_CSRF_TOKEN || '');
    return token !== '' ? { 'X-CSRF-Token': token } : {};
};

const getToast = () => {
    if (typeof window.showAppToast === 'function') {
        return window.showAppToast;
    }

    return (message, type = 'info') => {
        const existingToast = document.querySelector('[data-app-toast]');
        existingToast?.remove();

        const toast = document.createElement('div');
        toast.className = `app-toast app-toast-${type}`;
        toast.setAttribute('data-app-toast', '');

        const messageElement = document.createElement('div');
        messageElement.className = 'app-toast-message';
        messageElement.textContent = message;

        toast.appendChild(messageElement);
        document.body.appendChild(toast);

        window.setTimeout(() => {
            toast.classList.add('is-hiding');
            window.setTimeout(() => toast.remove(), 260);
        }, 5000);
    };
};

const syncNotificationBellState = (unreadCount) => {
    notificationState.unreadCount = Math.max(0, Number(unreadCount) || 0);
    const isActive = notificationState.unreadCount > 0;

    notificationTrigger?.classList.toggle('is-active', isActive);
    if (notificationTrigger instanceof HTMLButtonElement) {
        notificationTrigger.setAttribute('aria-label', isActive ? 'Powiadomienia - nowe' : 'Powiadomienia');
    }

    if (notificationBellIcon instanceof HTMLImageElement) {
        notificationBellIcon.src = isActive ? notificationBellIcons.active : notificationBellIcons.idle;
    }
};

const setNotificationLoadingState = (message = 'Ładowanie powiadomień...') => {
    if (!(notificationBody instanceof HTMLElement)) {
        return;
    }

    notificationBody.innerHTML = `<div class="notification-panel-loading">${message}</div>`;
};

const escapeNotificationHtml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const renderNotificationItems = (notifications) => {
    if (!(notificationBody instanceof HTMLElement)) {
        return;
    }

    if (!Array.isArray(notifications) || notifications.length === 0) {
        notificationBody.innerHTML = '<div class="notification-panel-empty">Brak powiadomień.</div>';
        return;
    }

    notificationBody.innerHTML = notifications.map((notification) => `
        <a
            href="${escapeNotificationHtml(notification.target_path || '/dashboard')}"
            class="notification-item${notification.is_read ? ' is-read' : ''}"
            data-notification-item
            data-notification-id="${Number(notification.id || 0)}"
            data-notification-read="${notification.is_read ? 'true' : 'false'}"
        >
            <div class="notification-item-header">
                <div class="notification-item-title">${escapeNotificationHtml(notification.title || '')}</div>
                <div class="notification-item-time">${escapeNotificationHtml(notification.created_at_label || '')}</div>
            </div>
            <div class="notification-item-message">${escapeNotificationHtml(notification.message || '')}</div>
        </a>
    `).join('');
};

const loadNotifications = async ({ force = false } = {}) => {
    if (!force && notificationState.loaded) {
        return;
    }

    setNotificationLoadingState();

    try {
        const response = await fetch('/notifications', {
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            },
        });

        if (!response.ok) {
            throw new Error('Request failed');
        }

        const payload = await response.json();
        if (!payload.success) {
            throw new Error('Invalid payload');
        }

        renderNotificationItems(payload.notifications || []);
        syncNotificationBellState(payload.unread_count ?? 0);
        notificationState.loaded = true;
    } catch (error) {
        notificationBody && (notificationBody.innerHTML = '<div class="notification-panel-empty">Nie udało się załadować powiadomień.</div>');
    }
};

const openNotificationPanel = async () => {
    if (!(notificationPanel instanceof HTMLElement) || !(notificationTrigger instanceof HTMLButtonElement)) {
        return;
    }

    notificationPanel.hidden = false;
    notificationTrigger.setAttribute('aria-expanded', 'true');
    await loadNotifications({ force: true });
};

const closeNotificationPanel = () => {
    if (!(notificationPanel instanceof HTMLElement) || !(notificationTrigger instanceof HTMLButtonElement)) {
        return;
    }

    notificationPanel.hidden = true;
    notificationTrigger.setAttribute('aria-expanded', 'false');
};

notificationTrigger?.addEventListener('click', async (event) => {
    event.stopPropagation();

    if (!notificationPanel) {
        return;
    }

    if (notificationPanel.hidden) {
        await openNotificationPanel();
        return;
    }

    closeNotificationPanel();
});

document.addEventListener('click', (event) => {
    if (!(notificationShell instanceof HTMLElement) || notificationPanel?.hidden) {
        return;
    }

    const target = event.target;
    if (target instanceof Node && notificationShell.contains(target)) {
        return;
    }

    closeNotificationPanel();
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && notificationPanel && !notificationPanel.hidden) {
        closeNotificationPanel();
    }
});

notificationBody?.addEventListener('click', async (event) => {
    const target = event.target instanceof Element
        ? event.target.closest('[data-notification-item]')
        : null;

    if (!(target instanceof HTMLAnchorElement)) {
        return;
    }

    const notificationId = Number(target.dataset.notificationId || 0);
    const targetPath = target.getAttribute('href') || '/dashboard';
    const isRead = target.dataset.notificationRead === 'true';

    if (notificationId <= 0 || isRead) {
        return;
    }

    event.preventDefault();

    try {
        const formData = new FormData();
        formData.set('action', 'mark_read');
        formData.set('notification_id', String(notificationId));

        const response = await fetch('/notifications', {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                ...csrfHeaders(),
            },
        });

        if (!response.ok) {
            throw new Error('Request failed');
        }

        const payload = await response.json();
        if (!payload.success) {
            throw new Error('Invalid payload');
        }

        target.classList.add('is-read');
        target.dataset.notificationRead = 'true';
        syncNotificationBellState(payload.unread_count ?? 0);
        window.location.href = payload.target_path || targetPath;
    } catch (error) {
        getToast()('Nie udało się oznaczyć powiadomienia.', 'error');
        window.location.href = targetPath;
    }
});

if (notificationTrigger) {
    loadNotifications({ force: true });
}
