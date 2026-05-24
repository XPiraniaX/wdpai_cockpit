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

const refreshMyCarsContent = async (refreshUrl) => {
    const scrollY = window.scrollY;
    const response = await fetch(refreshUrl, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
        },
    });

    if (!response.ok) {
        throw new Error('Nie udało się odświeżyć garażu.');
    }

    const html = await response.text();
    const parser = new DOMParser();
    const documentFragment = parser.parseFromString(html, 'text/html');
    const nextPage = documentFragment.querySelector('.cars-page');
    const currentPage = document.querySelector('.cars-page');

    if (!nextPage || !currentPage) {
        throw new Error('Nie udało się odświeżyć zawartości garażu.');
    }

    currentPage.replaceWith(nextPage);
    window.scrollTo(0, scrollY);
    window.initMyCarsPage();
};

window.initMyCarsPage = () => {
    const pendingToast = sessionStorage.getItem('myCarsToast');
    if (pendingToast) {
        sessionStorage.removeItem('myCarsToast');
        showAppToast(pendingToast, 'success');
    }

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
    const brandCatalogNode = document.getElementById('cars-brand-catalog-data');
    const brandSelect = modalRoot.querySelector('[data-cars-brand-select]');
    const modelSelect = modalRoot.querySelector('[data-cars-model-select]');
    const brandHiddenInput = modalRoot.querySelector('[data-cars-brand-hidden]');
    const modelHiddenInput = modalRoot.querySelector('[data-cars-model-hidden]');
    const customBrandField = modalRoot.querySelector('[data-cars-custom-brand-field]');
    const customModelField = modalRoot.querySelector('[data-cars-custom-model-field]');
    const customBrandInput = modalRoot.querySelector('[data-cars-brand-custom]');
    const customModelInput = modalRoot.querySelector('[data-cars-model-custom]');
    const feedbackModal = modalRoot.querySelector('[data-cars-feedback]');
    const feedbackMessage = modalRoot.querySelector('[data-cars-feedback-message]');
    const feedbackCloseButton = modalRoot.querySelector('[data-cars-feedback-close]');

    let activePanel = null;
    let selectedFiles = [];
    let isSubmittingAddVehicle = false;
    let brandCatalog = {};
    const CUSTOM_BRAND_VALUE = '__custom__';

    try {
        brandCatalog = brandCatalogNode ? JSON.parse(brandCatalogNode.textContent || '{}') : {};
    } catch {
        brandCatalog = {};
    }

    const buildOption = (value, label, isSelected = false) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        option.selected = isSelected;

        return option;
    };

    const populateBrandOptions = (selectedBrand = '') => {
        if (!brandSelect) {
            return;
        }

        const nextBrand = selectedBrand || '';
        const hasCatalogBrand = Object.prototype.hasOwnProperty.call(brandCatalog, nextBrand);
        const shouldUseCustomBrand = nextBrand !== '' && !hasCatalogBrand;
        brandSelect.innerHTML = '';
        brandSelect.appendChild(buildOption('', 'Wybierz markę', nextBrand === '' && !shouldUseCustomBrand));

        Object.keys(brandCatalog).forEach((brandName) => {
            brandSelect.appendChild(buildOption(brandName, brandName, brandName === nextBrand));
        });

        brandSelect.appendChild(buildOption(CUSTOM_BRAND_VALUE, 'Inna marka', shouldUseCustomBrand));
    };

    const populateModelOptions = (brandName, selectedModel = '') => {
        if (!modelSelect) {
            return;
        }

        const models = brandCatalog[brandName] ?? [];
        const nextModel = selectedModel || '';

        modelSelect.innerHTML = '';

        if (!brandName || brandName === CUSTOM_BRAND_VALUE) {
            modelSelect.appendChild(buildOption('', 'Wpisz model ręcznie', true));
            modelSelect.disabled = true;
            return;
        }

        if (models.length === 0) {
            modelSelect.appendChild(buildOption('', 'Najpierw wybierz markę', true));
            modelSelect.disabled = true;
            return;
        }

        modelSelect.disabled = false;
        modelSelect.appendChild(buildOption('', 'Wybierz model', nextModel === ''));

        models.forEach((modelName) => {
            modelSelect.appendChild(buildOption(modelName, modelName, modelName === nextModel));
        });
    };

    const syncCustomBrandMode = () => {
        const isCustomBrand = brandSelect?.value === CUSTOM_BRAND_VALUE;

        if (customBrandField) {
            customBrandField.hidden = !isCustomBrand;
        }

        if (customModelField) {
            customModelField.hidden = !isCustomBrand;
        }

        if (customBrandInput) {
            customBrandInput.required = Boolean(isCustomBrand);
        }

        if (customModelInput) {
            customModelInput.required = Boolean(isCustomBrand);
        }
    };

    const syncHiddenBrandModelValues = () => {
        const isCustomBrand = brandSelect?.value === CUSTOM_BRAND_VALUE;

        if (brandHiddenInput) {
            brandHiddenInput.value = isCustomBrand
                ? (customBrandInput?.value || '')
                : (brandSelect?.value || '');
        }

        if (modelHiddenInput) {
            modelHiddenInput.value = isCustomBrand
                ? (customModelInput?.value || '')
                : (modelSelect?.value || '');
        }
    };

    const syncBrandModelFields = (selectedBrand = '', selectedModel = '') => {
        populateBrandOptions(selectedBrand);

        const hasCatalogBrand = Object.prototype.hasOwnProperty.call(brandCatalog, selectedBrand);
        const isCustomBrand = selectedBrand !== '' && !hasCatalogBrand;

        if (brandSelect) {
            brandSelect.value = isCustomBrand ? CUSTOM_BRAND_VALUE : selectedBrand;
        }

        if (customBrandInput) {
            customBrandInput.value = isCustomBrand ? selectedBrand : '';
        }

        if (customModelInput) {
            customModelInput.value = isCustomBrand ? selectedModel : '';
        }

        populateModelOptions(isCustomBrand ? CUSTOM_BRAND_VALUE : selectedBrand, selectedModel);

        if (!isCustomBrand && modelSelect) {
            modelSelect.value = selectedModel || '';
        }

        syncCustomBrandMode();
        syncHiddenBrandModelValues();
    };

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
            image.alt = `Podgląd pojazdu ${index + 1}`;

            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.className = 'cars-add-image-remove';
            removeButton.setAttribute('aria-label', `Usuń zdjęcie ${index + 1}`);
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

        const renderPlaceholderCard = () => {
            const placeholderCard = document.createElement('button');
            placeholderCard.type = 'button';
            placeholderCard.className = 'cars-add-image-preview cars-add-image-picker is-placeholder';
            placeholderCard.setAttribute('aria-label', 'Dodaj zdjęcie pojazdu');
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
        };

        if (selectedFiles.length === 0) {
            renderPlaceholderCard();
            renderPlaceholderCard();
        } else if (selectedFiles.length < MAX_VEHICLE_IMAGES) {
            renderPlaceholderCard();
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
        if (feedbackModal) {
            feedbackModal.hidden = true;
        }

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

    const showFeedback = (message) => {
        if (!feedbackModal || !feedbackMessage) {
            window.alert(message);
            return;
        }

        feedbackMessage.textContent = message;
        feedbackModal.hidden = false;
    };

    const hideFeedback = () => {
        if (feedbackModal) {
            feedbackModal.hidden = true;
        }
    };

    openButtons.forEach((button) => {
        button.addEventListener('click', () => {
            if (button.dataset.carsModalOpen === 'cars-add-vehicle' && addVehicleForm) {
                addVehicleForm.reset();
                resetAddVehiclePreview();
                syncBrandModelFields();
            }

            openModal(button.dataset.carsModalOpen);
        });
    });

    closeButtons.forEach((button) => {
        button.addEventListener('click', closeModal);
    });

    feedbackCloseButton?.addEventListener('click', hideFeedback);
    scrim?.addEventListener('click', closeModal);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && feedbackModal && !feedbackModal.hidden) {
            hideFeedback();
            return;
        }

        if (event.key === 'Escape' && !modalRoot.hidden) {
            closeModal();
        }
    }, { once: false });

    imageInput?.addEventListener('change', () => {
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

    brandSelect?.addEventListener('change', () => {
        const isCustomBrand = brandSelect.value === CUSTOM_BRAND_VALUE;

        if (customBrandInput) {
            customBrandInput.value = '';
        }

        if (customModelInput) {
            customModelInput.value = '';
        }

        populateModelOptions(brandSelect.value, '');
        syncCustomBrandMode();
        syncHiddenBrandModelValues();

        if (isCustomBrand) {
            customBrandInput?.focus();
        }
    });

    modelSelect?.addEventListener('change', syncHiddenBrandModelValues);
    customBrandInput?.addEventListener('input', syncHiddenBrandModelValues);
    customModelInput?.addEventListener('input', syncHiddenBrandModelValues);

    if (addVehicleForm) {
        addVehicleForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            if (isSubmittingAddVehicle) {
                return;
            }

            isSubmittingAddVehicle = true;
            hideFeedback();

            const submitButton = addVehicleForm.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
            }

            try {
                syncHiddenBrandModelValues();

                const response = await fetch(addVehicleForm.action, {
                    method: 'POST',
                    body: new FormData(addVehicleForm),
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'Accept': 'application/json',
                    },
                });

                let payload = null;
                try {
                    payload = await response.json();
                } catch {
                    payload = null;
                }

                if (!response.ok || !payload?.success) {
                    showFeedback(payload?.message || 'Nie udało się dodać pojazdu. Sprawdź dane i spróbuj ponownie.');
                    return;
                }

                if (payload.message) {
                    sessionStorage.setItem('myCarsToast', payload.message);
                }

                window.location.href = payload.redirect || '/my-cars';
            } catch {
                showFeedback('Nie udało się połączyć z serwerem. Spróbuj ponownie.');
            } finally {
                isSubmittingAddVehicle = false;
                if (submitButton) {
                    submitButton.disabled = false;
                }
            }
        });
    }

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
                await refreshMyCarsContent(payload.refresh_url || '/my-cars');
            } catch {
                showAppToast('Nie udało się zmienić pojazdu głównego.', 'error');
            }
        });
    });

    renderImageGallery();
    syncBrandModelFields(
        brandSelect?.dataset.selectedBrand || '',
        modelSelect?.dataset.selectedModel || ''
    );

    const params = new URLSearchParams(window.location.search);
    if (params.get('open_modal') === 'cars-add-vehicle') {
        openModal('cars-add-vehicle');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.initMyCarsPage();
});
