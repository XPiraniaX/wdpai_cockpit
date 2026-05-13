document.addEventListener('DOMContentLoaded', () => {
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
    });
});
