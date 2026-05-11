document.addEventListener('DOMContentLoaded', () => {
    const modalRoot = document.querySelector('[data-vehicle-modal-root]');

    if (!modalRoot) {
        return;
    }

    const panels = Array.from(modalRoot.querySelectorAll('[data-modal-panel]'));
    const openButtons = document.querySelectorAll('[data-modal-open]');
    const closeButtons = modalRoot.querySelectorAll('[data-vehicle-modal-close]');
    const scrim = modalRoot.querySelector('[data-vehicle-modal-scrim]');
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
        const nextPanel = panels.find((panel) => panel.dataset.modalPanel === panelName);

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
            openModal(button.dataset.modalOpen);
        });
    });

    closeButtons.forEach((button) => {
        button.addEventListener('click', closeModal);
    });

    if (scrim) {
        scrim.addEventListener('click', closeModal);
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !modalRoot.hidden) {
            closeModal();
        }
    });
});
