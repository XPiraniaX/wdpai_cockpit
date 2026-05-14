document.addEventListener('DOMContentLoaded', () => {
    const modalRoot = document.querySelector('[data-cars-modal-root]');

    if (!modalRoot) {
        return;
    }

    const panels = Array.from(modalRoot.querySelectorAll('[data-cars-modal-panel]'));
    const openButtons = document.querySelectorAll('[data-cars-modal-open]');
    const closeButtons = modalRoot.querySelectorAll('[data-cars-modal-close]');
    const scrim = modalRoot.querySelector('[data-cars-modal-scrim]');
    const addVehicleForm = modalRoot.querySelector('[data-cars-modal-panel="cars-add-vehicle"] form');
    const previewImage = modalRoot.querySelector('[data-add-vehicle-preview-image]');
    const previewPlaceholder = modalRoot.querySelector('[data-add-vehicle-preview-placeholder]');
    const imageInput = modalRoot.querySelector('[data-add-vehicle-image-input]');
    let activePanel = null;

    const resetAddVehiclePreview = () => {
        if (previewImage) {
            previewImage.src = '';
            previewImage.hidden = true;
        }

        if (previewPlaceholder) {
            previewPlaceholder.hidden = false;
        }
    };

    const closeModal = () => {
        modalRoot.hidden = true;
        document.body.classList.remove('vehicle-modal-open');

        if (activePanel) {
            activePanel.hidden = true;
            activePanel = null;
        }
    };

    const openModal = (panelName) => {
        const nextPanel = panels.find((panel) => panel.dataset.carsModalPanel === panelName);

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
            if (button.dataset.carsModalOpen === 'cars-add-vehicle' && addVehicleForm) {
                addVehicleForm.reset();
                resetAddVehiclePreview();
            }

            openModal(button.dataset.carsModalOpen);
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

    if (imageInput) {
        imageInput.addEventListener('change', () => {
            const file = imageInput.files && imageInput.files[0];

            if (!file) {
                resetAddVehiclePreview();
                return;
            }

            const fileReader = new FileReader();
            fileReader.onload = () => {
                if (!previewImage || !previewPlaceholder) {
                    return;
                }

                previewImage.src = String(fileReader.result ?? '');
                previewImage.hidden = false;
                previewPlaceholder.hidden = true;
            };
            fileReader.readAsDataURL(file);
        });
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('open_modal') === 'cars-add-vehicle') {
        openModal('cars-add-vehicle');
    }
});
