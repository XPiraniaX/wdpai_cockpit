const showAppToast = (message, type = 'info') => {
    const existingToast = document.querySelector('[data-app-toast]');
    existingToast?.remove();

    const toast = document.createElement('div');
    toast.className = `app-toast app-toast-${type}`;
    toast.setAttribute('data-app-toast', '');

    const messageNode = document.createElement('div');
    messageNode.className = 'app-toast-message';
    messageNode.textContent = message;

    toast.appendChild(messageNode);
    document.body.appendChild(toast);

    window.setTimeout(() => {
        toast.classList.add('is-hiding');
        window.setTimeout(() => toast.remove(), 260);
    }, 5000);
};

const refreshDashboardContent = async (refreshUrl) => {
    const scrollY = window.scrollY;
    const response = await fetch(refreshUrl, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
        },
    });

    if (!response.ok) {
        throw new Error('Nie udało się odświeżyć dashboardu.');
    }

    const html = await response.text();
    const parser = new DOMParser();
    const documentFragment = parser.parseFromString(html, 'text/html');
    const nextDashboard = documentFragment.querySelector('.dashboard');
    const currentDashboard = document.querySelector('.dashboard');

    if (!nextDashboard || !currentDashboard) {
        throw new Error('Nie udało się odświeżyć zawartości dashboardu.');
    }

    currentDashboard.replaceWith(nextDashboard);
    window.scrollTo(0, scrollY);
    window.initDashboardPage();
};

window.initDashboardPage = () => {
    const modalRoot = document.querySelector('[data-dashboard-modal-root]');
    if (!modalRoot) {
        return;
    }

    const panels = Array.from(modalRoot.querySelectorAll('[data-dashboard-modal-panel]'));
    const openButtons = document.querySelectorAll('[data-dashboard-modal-open]');
    const closeButtons = modalRoot.querySelectorAll('[data-dashboard-modal-close]');
    let activePanel = null;

    const closeModal = () => {
        modalRoot.hidden = true;
        document.body.classList.remove('vehicle-modal-open');

        if (activePanel) {
            activePanel.hidden = true;
            activePanel = null;
        }
    };

    const openModal = (panelName) => {
        const nextPanel = panels.find((panel) => panel.dataset.dashboardModalPanel === panelName);

        if (!nextPanel) {
            return;
        }

        panels.forEach((panel) => {
            panel.hidden = true;
        });

        activePanel = nextPanel;
        activePanel.hidden = false;
        modalRoot.hidden = false;
        document.body.classList.add('vehicle-modal-open');
    };

    openButtons.forEach((button) => {
        button.addEventListener('click', () => {
            openModal(button.dataset.dashboardModalOpen);
        });
    });

    closeButtons.forEach((button) => {
        button.addEventListener('click', closeModal);
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !modalRoot.hidden) {
            closeModal();
        }
    }, { once: false });

    document.querySelectorAll('.car-card-favorite-form').forEach((form) => {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            try {
                const response = await fetch(form.action, {
                    method: 'POST',
                    body: new FormData(form),
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'Accept': 'application/json',
                    },
                });

                const payload = await response.json();
                if (!response.ok || !payload?.success) {
                    showAppToast(payload?.message || 'Nie udało się zmienić pojazdu głównego.', 'error');
                    return;
                }

                showAppToast(payload.message || 'Pojazd główny został zmieniony.', 'success');
                await refreshDashboardContent(payload.refresh_url || '/dashboard');
            } catch {
                showAppToast('Nie udało się zmienić pojazdu głównego.', 'error');
            }
        });
    });
};

document.addEventListener('DOMContentLoaded', () => {
    window.initDashboardPage();
});
