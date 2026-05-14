document.addEventListener('DOMContentLoaded', () => {
    const modalRoot = document.querySelector('[data-cars-modal-root]');

    if (!modalRoot) {
        return;
    }

    const MAX_VEHICLE_IMAGES = 10;
    const panels = Array.from(modalRoot.querySelectorAll('[data-cars-modal-panel]'));
    const openButtons = document.querySelectorAll('[data-cars-modal-open]');
    const closeButtons = modalRoot.querySelectorAll('[data-cars-modal-close]');
    const scrim = modalRoot.querySelector('[data-cars-modal-scrim]');
    const addVehicleForm = modalRoot.querySelector('[data-cars-modal-panel="cars-add-vehicle"] form');
    const mediaColumn = modalRoot.querySelector('.cars-add-media-column');
    const gallery = modalRoot.querySelector('[data-add-vehicle-gallery]');
    const imageInput = modalRoot.querySelector('[data-add-vehicle-image-input]');
    let activePanel = null;
    let selectedFiles = [];

    const syncImageInput = () => {
        if (!imageInput) {
            return;
        }

        const transfer = new DataTransfer();
        selectedFiles.forEach((file) => transfer.items.add(file));
        imageInput.files = transfer.files;
    };

    const openImagePicker = () => {
        if (imageInput && selectedFiles.length < MAX_VEHICLE_IMAGES) {
            imageInput.click();
        }
    };

    const renderImageGallery = () => {
        if (!gallery) {
            return;
        }

        gallery.innerHTML = '';

        selectedFiles.forEach((file, index) => {
            const card = document.createElement('div');
            card.className = 'cars-add-image-preview';

            const image = document.createElement('img');
            image.className = 'cars-add-image-preview-photo';
            image.alt = `Podglad pojazdu ${index + 1}`;

            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.className = 'cars-add-image-remove';
            removeButton.setAttribute('aria-label', `Usun zdjecie ${index + 1}`);
            removeButton.addEventListener('click', () => {
                selectedFiles = selectedFiles.filter((_, fileIndex) => fileIndex !== index);
                syncImageInput();
                renderImageGallery();
            });

            const fileReader = new FileReader();
            fileReader.onload = () => {
                image.src = String(fileReader.result ?? '');
            };
            fileReader.readAsDataURL(file);

            card.appendChild(image);
            card.appendChild(removeButton);
            gallery.appendChild(card);
        });

        if (selectedFiles.length < MAX_VEHICLE_IMAGES) {
            const placeholderCard = document.createElement('button');
            placeholderCard.type = 'button';
            placeholderCard.className = 'cars-add-image-preview cars-add-image-picker is-placeholder';
            placeholderCard.setAttribute('aria-label', 'Dodaj zdjecie pojazdu');
            placeholderCard.addEventListener('click', openImagePicker);

            const placeholder = document.createElement('div');
            placeholder.className = 'cars-add-image-placeholder';

            const placeholderContent = document.createElement('div');
            placeholderContent.className = 'cars-add-image-placeholder-content';

            const plus = document.createElement('div');
            plus.className = 'cars-add-image-placeholder-plus';
            plus.textContent = '+';

            placeholderContent.appendChild(plus);
            placeholder.appendChild(placeholderContent);
            placeholderCard.appendChild(placeholder);
            gallery.appendChild(placeholderCard);
        }

        if (mediaColumn && selectedFiles.length > 0) {
            mediaColumn.scrollTop = 0;
        }
    };

    const resetAddVehiclePreview = () => {
        selectedFiles = [];
        syncImageInput();
        renderImageGallery();
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
            const incomingFiles = Array.from(imageInput.files ?? []);

            if (incomingFiles.length === 0) {
                syncImageInput();
                return;
            }

            const remainingSlots = MAX_VEHICLE_IMAGES - selectedFiles.length;
            if (remainingSlots <= 0) {
                syncImageInput();
                renderImageGallery();
                return;
            }

            selectedFiles = selectedFiles.concat(incomingFiles.slice(0, remainingSlots));
            syncImageInput();
            renderImageGallery();
        });
    }

    renderImageGallery();

    const params = new URLSearchParams(window.location.search);
    if (params.get('open_modal') === 'cars-add-vehicle') {
        openModal('cars-add-vehicle');
    }
});
