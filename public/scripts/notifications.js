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

const escapeNotificationHtml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

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

const ensureNotificationDetailModal = () => {
    let modal = document.querySelector('[data-notification-detail-modal]');
    if (modal) {
        return modal;
    }

    modal = document.createElement('div');
    modal.className = 'notification-detail-modal';
    modal.hidden = true;
    modal.setAttribute('data-notification-detail-modal', '');
    modal.innerHTML = `
        <div class="notification-detail-backdrop" data-notification-detail-close></div>
        <div class="notification-detail-shell">
            <section class="notification-detail-panel">
                <div class="notification-detail-head">
                    <div class="notification-detail-copy">
                        <div class="notification-detail-kicker">Powiadomienie</div>
                        <h3 class="notification-detail-title" data-notification-detail-title></h3>
                    </div>
                    <button type="button" class="community-modal-close" aria-label="Zamknij" data-notification-detail-close>
                        <img src="/public/assets/icons/close.svg" alt="">
                    </button>
                </div>
                <div class="notification-detail-body">
                    <div class="notification-detail-block">
                        <div class="notification-detail-label" data-notification-detail-intro></div>
                        <div class="notification-detail-subject" data-notification-detail-subject></div>
                    </div>
                    <div class="notification-detail-block">
                        <div class="notification-detail-label">Zostało usunięte z powodu:</div>
                        <div class="notification-detail-reason" data-notification-detail-reason></div>
                    </div>
                </div>
                <div class="notification-detail-actions">
                    <button type="button" class="community-button community-button-primary" data-notification-detail-close>Zamknij</button>
                </div>
            </section>
        </div>
    `;

    modal.querySelectorAll('[data-notification-detail-close]').forEach((button) => {
        button.addEventListener('click', () => {
            modal.hidden = true;
            document.body.classList.remove('vehicle-modal-open');
        });
    });

    document.body.appendChild(modal);
    return modal;
};

const openNotificationDetailModal = (notification) => {
    const payload = notification?.payload;
    if (!payload || typeof payload !== 'object') {
        return false;
    }

    const intro = String(payload.modal_intro || '').trim();
    const subject = String(payload.modal_subject || '').trim();
    const reason = String(payload.modal_reason || '').trim();
    if (intro === '' || subject === '' || reason === '') {
        return false;
    }

    const modal = ensureNotificationDetailModal();
    const title = modal.querySelector('[data-notification-detail-title]');
    const introElement = modal.querySelector('[data-notification-detail-intro]');
    const subjectElement = modal.querySelector('[data-notification-detail-subject]');
    const reasonElement = modal.querySelector('[data-notification-detail-reason]');
    if (!(title instanceof HTMLElement)
        || !(introElement instanceof HTMLElement)
        || !(subjectElement instanceof HTMLElement)
        || !(reasonElement instanceof HTMLElement)) {
        return false;
    }

    title.textContent = String(notification.title || 'Powiadomienie');
    introElement.textContent = intro;
    subjectElement.textContent = subject;
    reasonElement.textContent = reason;
    modal.hidden = false;
    document.body.classList.add('vehicle-modal-open');
    return true;
};

const renderNotificationItems = (notifications) => {
    if (!(notificationBody instanceof HTMLElement)) {
        return;
    }

    if (!Array.isArray(notifications) || notifications.length === 0) {
        notificationBody.innerHTML = '<div class="notification-panel-empty">Brak powiadomień.</div>';
        return;
    }

    notificationBody.innerHTML = notifications.map((notification) => {
        const payload = notification && typeof notification.payload === 'object' ? notification.payload : null;
        const accent = payload && payload.accent === 'danger' ? ' is-danger' : '';

        return `
            <a
                href="${escapeNotificationHtml(notification.target_path || '/dashboard')}"
                class="notification-item${notification.is_read ? ' is-read' : ''}${accent}"
                data-notification-item
                data-notification-id="${Number(notification.id || 0)}"
                data-notification-read="${notification.is_read ? 'true' : 'false'}"
                data-notification-payload="${escapeNotificationHtml(JSON.stringify(payload || {}))}"
            >
                <div class="notification-item-header">
                    <div class="notification-item-title">${escapeNotificationHtml(notification.title || '')}</div>
                    <div class="notification-item-time">${escapeNotificationHtml(notification.created_at_label || '')}</div>
                </div>
                <div class="notification-item-message">${escapeNotificationHtml(notification.message || '')}</div>
            </a>
        `;
    }).join('');
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
    } catch {
        if (notificationBody instanceof HTMLElement) {
            notificationBody.innerHTML = '<div class="notification-panel-empty">Nie udało się załadować powiadomień.</div>';
        }
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
    const payloadRaw = target.dataset.notificationPayload || '{}';
    let notificationPayload = null;

    try {
        notificationPayload = JSON.parse(payloadRaw);
    } catch {
        notificationPayload = null;
    }

    const shouldOpenModal = !!notificationPayload
        && typeof notificationPayload === 'object'
        && String(notificationPayload.modal_subject || '').trim() !== ''
        && String(notificationPayload.modal_reason || '').trim() !== '';

    if (notificationId <= 0) {
        return;
    }

    const openLocalModal = () => {
        if (shouldOpenModal) {
            closeNotificationPanel();
            openNotificationDetailModal({
                title: target.querySelector('.notification-item-title')?.textContent || '',
                payload: notificationPayload,
            });
            return;
        }

        window.location.href = targetPath;
    };

    if (isRead) {
        event.preventDefault();
        openLocalModal();
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
        openLocalModal();
    } catch {
        getToast()('Nie udało się oznaczyć powiadomienia.', 'error');
        openLocalModal();
    }
});

if (notificationTrigger) {
    loadNotifications({ force: true });
}
