const isMarketplacePage = Boolean(document.querySelector('.marketplace-page'));
if (isMarketplacePage) {
    document.documentElement.classList.add('is-marketplace-page-root');
    document.body.classList.add('is-marketplace-page');
}

const showAppToast = (message, type = 'info') => {
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
window.showAppToast = showAppToast;

let activeMarketplaceDetailsModal = null;
let marketplaceLockedScrollY = 0;

const marketplaceCreateBackdrop = document.querySelector('[data-marketplace-create-backdrop]');
const marketplaceCreateModal = document.querySelector('[data-marketplace-create-modal]');
const marketplaceOpenCreateButtons = document.querySelectorAll('[data-open-marketplace-create]');
const marketplaceCloseCreateButtons = document.querySelectorAll('[data-close-marketplace-create]');
const marketplaceDetailedBackdrop = document.querySelector('[data-marketplace-detailed-backdrop]');
const marketplaceDetailedModal = document.querySelector('[data-marketplace-detailed-modal]');
const marketplaceOpenDetailedButtons = document.querySelectorAll('[data-open-marketplace-detailed-filters]');
const marketplaceCloseDetailedButtons = document.querySelectorAll('[data-close-marketplace-detailed-filters]');
const marketplaceImageInput = document.querySelector('[data-marketplace-image-input]');
const marketplaceGallery = document.querySelector('[data-marketplace-gallery]');
const marketplaceCreateEntry = document.querySelector('[data-marketplace-create-entry]');
const marketplaceCreateModeChoice = document.querySelector('[data-marketplace-create-mode-choice]');
const marketplaceCreateVehicleChoice = document.querySelector('[data-marketplace-create-vehicle-choice]');
const marketplaceCreateForm = document.querySelector('[data-marketplace-create-form]');
const marketplaceCreateSteps = Array.from(document.querySelectorAll('[data-marketplace-create-step]'));
const marketplaceCreateNextButtons = document.querySelectorAll('[data-marketplace-step-next]');
const marketplaceCreatePrevButtons = document.querySelectorAll('[data-marketplace-step-prev]');
const marketplaceSummaryFields = document.querySelectorAll('[data-marketplace-summary]');
const marketplaceCreateKicker = document.querySelector('[data-marketplace-create-kicker]');
const marketplaceCreateTitle = document.querySelector('[data-marketplace-create-title]');
const marketplaceCreateActionInput = document.querySelector('[data-marketplace-create-action]');
const marketplaceEditIdInput = document.querySelector('[data-marketplace-edit-id]');
const marketplaceSourceVehicleIdInput = document.querySelector('[data-marketplace-source-vehicle-id]');
const marketplaceBrandHiddenInput = document.querySelector('[data-marketplace-brand-hidden]');
const marketplaceModelHiddenInput = document.querySelector('[data-marketplace-model-hidden]');
const marketplaceCreateBrandSelect = document.querySelector('[data-marketplace-create-brand-select]');
const marketplaceCreateModelSelect = document.querySelector('[data-marketplace-create-model-select]');
const marketplaceCustomBrandField = document.querySelector('[data-marketplace-custom-brand-field]');
const marketplaceCustomModelField = document.querySelector('[data-marketplace-custom-model-field]');
const marketplaceCustomBrandInput = document.querySelector('[data-marketplace-brand-custom]');
const marketplaceCustomModelInput = document.querySelector('[data-marketplace-model-custom]');
const marketplaceCreateSubmit = document.querySelector('[data-marketplace-create-submit]');
const marketplaceExistingImagesNote = document.querySelector('[data-marketplace-existing-images-note]');
const marketplacePhoneInput = marketplaceCreateForm?.elements.namedItem('contact_phone');
const marketplaceRemovedImagesInputs = document.querySelector('[data-marketplace-removed-images-inputs]');
const marketplaceOpenImportChoiceButtons = document.querySelectorAll('[data-marketplace-open-import-choice]');
const marketplaceOpenNewChoiceButtons = document.querySelectorAll('[data-marketplace-open-new-choice]');
const marketplaceBackToModeChoiceButtons = document.querySelectorAll('[data-marketplace-back-to-mode-choice]');
const marketplaceImportVehicleButtons = document.querySelectorAll('[data-marketplace-import-vehicle]');

let editableMarketplaceFiles = [];
let existingMarketplaceImages = [];
let removedMarketplaceImages = [];
let marketplaceCurrentStep = 1;
let marketplaceImportCategoryLock = false;
const MARKETPLACE_CUSTOM_BRAND_VALUE = '__custom__';
const MARKETPLACE_CUSTOM_MODEL_VALUE = '__custom_model__';

const syncMarketplaceScrollLock = () => {
    const createOpen = marketplaceCreateModal ? !marketplaceCreateModal.hidden : false;
    const detailedOpen = marketplaceDetailedModal ? !marketplaceDetailedModal.hidden : false;
    const shouldLock = createOpen || detailedOpen || Boolean(activeMarketplaceDetailsModal);
    const root = document.documentElement;

    if (shouldLock) {
        if (!document.body.classList.contains('is-scroll-locked')) {
            marketplaceLockedScrollY = window.scrollY || window.pageYOffset || 0;
        }

        root.classList.add('is-scroll-locked');
        document.body.classList.add('is-scroll-locked');
        document.body.classList.add('vehicle-modal-open');
        document.body.style.position = 'fixed';
        document.body.style.top = `-${marketplaceLockedScrollY}px`;
        document.body.style.left = '0';
        document.body.style.right = '0';
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';
        return;
    }

    root.classList.remove('is-scroll-locked');
    document.body.classList.remove('is-scroll-locked');
    document.body.classList.remove('vehicle-modal-open');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    window.scrollTo(0, marketplaceLockedScrollY);
};

const formatMarketplacePhoneValue = (value) => {
    const digits = String(value || '').replace(/\D+/g, '').slice(0, 9);
    return digits.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
};

const syncMarketplacePhoneInput = () => {
    if (!(marketplacePhoneInput instanceof HTMLInputElement)) {
        return;
    }

    marketplacePhoneInput.value = formatMarketplacePhoneValue(marketplacePhoneInput.value);
};

if (marketplacePhoneInput instanceof HTMLInputElement) {
    marketplacePhoneInput.addEventListener('input', syncMarketplacePhoneInput);
    marketplacePhoneInput.addEventListener('blur', syncMarketplacePhoneInput);
}

const syncRemovedMarketplaceImagesInputs = () => {
    if (!marketplaceRemovedImagesInputs) {
        return;
    }

    marketplaceRemovedImagesInputs.innerHTML = '';

    removedMarketplaceImages.forEach((imagePath) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'removed_image_paths[]';
        input.value = imagePath;
        marketplaceRemovedImagesInputs.appendChild(input);
    });
};

document.querySelectorAll('.marketplace-brand-select').forEach((brandSelect) => {
    if (brandSelect.closest('[data-marketplace-create-form]')) {
        return;
    }

    const targetModelId = brandSelect.getAttribute('data-target-model');
    const modelSelect = targetModelId ? document.getElementById(targetModelId) : null;
    const modelField = modelSelect?.closest('[data-marketplace-filter-model-field]');
    const filterForm = brandSelect.closest('.marketplace-filter-stack');

    if (!modelSelect) {
        return;
    }

    const syncModelOptions = () => {
        const selectedBrandId = brandSelect.value;
        const currentModelValue = modelSelect.value;
        let currentModelStillVisible = false;

        Array.from(modelSelect.options).forEach((option, index) => {
            if (index === 0) {
                option.hidden = false;
                return;
            }

            const optionBrandId = option.getAttribute('data-brand-id');
            const shouldShow = !selectedBrandId || optionBrandId === selectedBrandId;
            option.hidden = !shouldShow;

            if (shouldShow && option.value === currentModelValue) {
                currentModelStillVisible = true;
            }
        });

        if (!currentModelStillVisible) {
            modelSelect.value = '';
        }

        modelSelect.disabled = !selectedBrandId;

        if (modelField) {
            modelField.hidden = !selectedBrandId;
        }
    };

    brandSelect.addEventListener('change', syncModelOptions);
    brandSelect.addEventListener('change', () => {
        if (filterForm && brandSelect.name === 'brand_id') {
            filterForm.requestSubmit();
        }
    });

    modelSelect.addEventListener('change', () => {
        if (filterForm && modelSelect.name === 'model_id') {
            filterForm.requestSubmit();
        }
    });

    syncModelOptions();
});

const marketplaceApprovedBrandCatalog = (() => {
    if (!(marketplaceCreateBrandSelect instanceof HTMLSelectElement) || !(marketplaceCreateModelSelect instanceof HTMLSelectElement)) {
        return [];
    }

    return Array.from(marketplaceCreateBrandSelect.options)
        .filter((option) => option.value !== '')
        .map((option) => ({
            id: option.value,
            name: option.textContent?.trim() || '',
            models: Array.from(marketplaceCreateModelSelect.options)
                .filter((modelOption) => modelOption.getAttribute('data-brand-id') === option.value)
                .map((modelOption) => ({
                    id: modelOption.value,
                    name: modelOption.textContent?.trim() || '',
                })),
        }));
})();

const buildMarketplaceSelectOption = (value, label, isSelected = false) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    option.selected = isSelected;
    return option;
};

const setMarketplaceCategoryFieldLocks = ({
    brandSelectDisabled = false,
    modelSelectDisabled = false,
    customBrandReadOnly = false,
    customModelReadOnly = false,
} = {}) => {
    if (marketplaceCreateBrandSelect instanceof HTMLSelectElement) {
        marketplaceCreateBrandSelect.disabled = brandSelectDisabled;
    }

    if (marketplaceCreateModelSelect instanceof HTMLSelectElement) {
        marketplaceCreateModelSelect.disabled = modelSelectDisabled;
    }

    if (marketplaceCustomBrandInput instanceof HTMLInputElement) {
        marketplaceCustomBrandInput.readOnly = customBrandReadOnly;
    }

    if (marketplaceCustomModelInput instanceof HTMLInputElement) {
        marketplaceCustomModelInput.readOnly = customModelReadOnly;
    }
};

const syncMarketplaceCustomCategoryMode = () => {
    const isCustomBrand = marketplaceCreateBrandSelect?.value === MARKETPLACE_CUSTOM_BRAND_VALUE;
    const isCustomModel = marketplaceCreateModelSelect?.value === MARKETPLACE_CUSTOM_MODEL_VALUE;

    if (marketplaceCustomBrandField) {
        marketplaceCustomBrandField.hidden = !isCustomBrand;
    }

    if (marketplaceCustomModelField) {
        marketplaceCustomModelField.hidden = !(isCustomBrand || isCustomModel);
    }

    if (marketplaceCustomBrandInput instanceof HTMLInputElement) {
        marketplaceCustomBrandInput.required = Boolean(isCustomBrand);
    }

    if (marketplaceCustomModelInput instanceof HTMLInputElement) {
        marketplaceCustomModelInput.required = Boolean(isCustomBrand || isCustomModel);
    }
};

const syncMarketplaceCategoryHiddenValues = () => {
    const isCustomBrand = marketplaceCreateBrandSelect?.value === MARKETPLACE_CUSTOM_BRAND_VALUE;
    const isCustomModel = marketplaceCreateModelSelect?.value === MARKETPLACE_CUSTOM_MODEL_VALUE;

    if (marketplaceBrandHiddenInput instanceof HTMLInputElement) {
        if (isCustomBrand) {
            marketplaceBrandHiddenInput.value = marketplaceCustomBrandInput?.value?.trim() || '';
        } else {
            const selectedOption = marketplaceCreateBrandSelect?.selectedOptions?.[0];
            marketplaceBrandHiddenInput.value = selectedOption?.textContent?.trim() || '';
        }
    }

    if (marketplaceModelHiddenInput instanceof HTMLInputElement) {
        if (isCustomBrand || isCustomModel) {
            marketplaceModelHiddenInput.value = marketplaceCustomModelInput?.value?.trim() || '';
        } else {
            const selectedOption = marketplaceCreateModelSelect?.selectedOptions?.[0];
            marketplaceModelHiddenInput.value = selectedOption?.textContent?.trim() || '';
        }
    }
};

const populateMarketplaceBrandOptions = (selectedBrandName = '') => {
    if (!(marketplaceCreateBrandSelect instanceof HTMLSelectElement)) {
        return;
    }

    const nextBrandName = String(selectedBrandName || '').trim();
    const hasApprovedBrand = marketplaceApprovedBrandCatalog.some((brand) => brand.name === nextBrandName);
    const useCustomBrand = nextBrandName !== '' && !hasApprovedBrand;

    marketplaceCreateBrandSelect.innerHTML = '';
    marketplaceCreateBrandSelect.appendChild(buildMarketplaceSelectOption('', 'Wybierz markę', nextBrandName === '' && !useCustomBrand));

    marketplaceApprovedBrandCatalog.forEach((brand) => {
        marketplaceCreateBrandSelect.appendChild(buildMarketplaceSelectOption(brand.id, brand.name, brand.name === nextBrandName));
    });

    marketplaceCreateBrandSelect.appendChild(buildMarketplaceSelectOption(MARKETPLACE_CUSTOM_BRAND_VALUE, 'Inna marka', useCustomBrand));
};

const populateMarketplaceModelOptions = (brandName = '', selectedModelName = '') => {
    if (!(marketplaceCreateModelSelect instanceof HTMLSelectElement)) {
        return;
    }

    const nextBrandName = String(brandName || '').trim();
    const nextModelName = String(selectedModelName || '').trim();
    const brandEntry = marketplaceApprovedBrandCatalog.find((brand) => brand.name === nextBrandName) || null;
    const approvedModels = brandEntry?.models || [];
    const hasApprovedModel = approvedModels.some((model) => model.name === nextModelName);
    const useCustomModel = nextModelName !== '' && !hasApprovedModel;

    marketplaceCreateModelSelect.innerHTML = '';

    if (!nextBrandName) {
        marketplaceCreateModelSelect.appendChild(buildMarketplaceSelectOption('', 'Wybierz model', true));
        marketplaceCreateModelSelect.disabled = true;
        return;
    }

    if (brandEntry === null || marketplaceCreateBrandSelect?.value === MARKETPLACE_CUSTOM_BRAND_VALUE) {
        marketplaceCreateModelSelect.appendChild(buildMarketplaceSelectOption(MARKETPLACE_CUSTOM_MODEL_VALUE, 'Inny model', true));
        marketplaceCreateModelSelect.disabled = true;
        return;
    }

    marketplaceCreateModelSelect.disabled = false;
    marketplaceCreateModelSelect.appendChild(buildMarketplaceSelectOption('', 'Wybierz model', nextModelName === '' && !useCustomModel));

    approvedModels.forEach((model) => {
        const option = buildMarketplaceSelectOption(model.id, model.name, model.name === nextModelName);
        option.setAttribute('data-brand-id', brandEntry.id);
        marketplaceCreateModelSelect.appendChild(option);
    });

    marketplaceCreateModelSelect.appendChild(buildMarketplaceSelectOption(MARKETPLACE_CUSTOM_MODEL_VALUE, 'Inny model', useCustomModel));
};

const syncMarketplaceCategoryFields = (selectedBrandName = '', selectedModelName = '') => {
    const nextBrandName = String(selectedBrandName || '').trim();
    const nextModelName = String(selectedModelName || '').trim();
    const brandEntry = marketplaceApprovedBrandCatalog.find((brand) => brand.name === nextBrandName) || null;
    const useCustomBrand = nextBrandName !== '' && brandEntry === null;
    const useCustomModel = !useCustomBrand && nextModelName !== '' && !(brandEntry?.models || []).some((model) => model.name === nextModelName);

    populateMarketplaceBrandOptions(nextBrandName);

    if (marketplaceCustomBrandInput instanceof HTMLInputElement) {
        marketplaceCustomBrandInput.value = useCustomBrand ? nextBrandName : '';
    }

    populateMarketplaceModelOptions(nextBrandName, nextModelName);

    if (marketplaceCreateBrandSelect instanceof HTMLSelectElement) {
        if (useCustomBrand) {
            marketplaceCreateBrandSelect.value = MARKETPLACE_CUSTOM_BRAND_VALUE;
        } else if (brandEntry !== null) {
            marketplaceCreateBrandSelect.value = brandEntry.id;
        } else {
            marketplaceCreateBrandSelect.value = '';
        }
    }

    if (marketplaceCreateModelSelect instanceof HTMLSelectElement) {
        if (useCustomBrand || useCustomModel) {
            marketplaceCreateModelSelect.value = MARKETPLACE_CUSTOM_MODEL_VALUE;
        } else {
            const approvedModel = (brandEntry?.models || []).find((model) => model.name === nextModelName) || null;
            marketplaceCreateModelSelect.value = approvedModel?.id || '';
        }
    }

    if (marketplaceCustomModelInput instanceof HTMLInputElement) {
        marketplaceCustomModelInput.value = (useCustomBrand || useCustomModel) ? nextModelName : '';
    }

    syncMarketplaceCustomCategoryMode();
    syncMarketplaceCategoryHiddenValues();
};

const applyMarketplaceImportedCategoryState = (brandName = '', modelName = '') => {
    const nextBrandName = String(brandName || '').trim();
    const nextModelName = String(modelName || '').trim();
    const brandEntry = marketplaceApprovedBrandCatalog.find((brand) => brand.name === nextBrandName) || null;
    const approvedModel = (brandEntry?.models || []).find((model) => model.name === nextModelName) || null;

    marketplaceImportCategoryLock = true;
    syncMarketplaceCategoryFields(nextBrandName, nextModelName);

    if (!nextBrandName) {
        setMarketplaceCategoryFieldLocks();
        marketplaceImportCategoryLock = false;
        return;
    }

    if (brandEntry === null) {
        if (marketplaceCreateBrandSelect instanceof HTMLSelectElement) {
            marketplaceCreateBrandSelect.value = MARKETPLACE_CUSTOM_BRAND_VALUE;
        }
        if (marketplaceCreateModelSelect instanceof HTMLSelectElement) {
            marketplaceCreateModelSelect.innerHTML = '';
            marketplaceCreateModelSelect.appendChild(buildMarketplaceSelectOption(MARKETPLACE_CUSTOM_MODEL_VALUE, 'Inny model', true));
            marketplaceCreateModelSelect.value = MARKETPLACE_CUSTOM_MODEL_VALUE;
            marketplaceCreateModelSelect.disabled = true;
        }
        if (marketplaceCustomBrandInput instanceof HTMLInputElement) {
            marketplaceCustomBrandInput.value = nextBrandName;
        }
        if (marketplaceCustomModelInput instanceof HTMLInputElement) {
            marketplaceCustomModelInput.value = nextModelName;
        }

        syncMarketplaceCustomCategoryMode();
        syncMarketplaceCategoryHiddenValues();
        setMarketplaceCategoryFieldLocks({
            brandSelectDisabled: true,
            modelSelectDisabled: true,
            customBrandReadOnly: true,
            customModelReadOnly: true,
        });
        return;
    }

    if (marketplaceCreateBrandSelect instanceof HTMLSelectElement) {
        marketplaceCreateBrandSelect.value = brandEntry.id;
    }

    if (approvedModel !== null) {
        populateMarketplaceModelOptions(nextBrandName, nextModelName);
        if (marketplaceCreateModelSelect instanceof HTMLSelectElement) {
            marketplaceCreateModelSelect.value = approvedModel.id;
        }
        syncMarketplaceCustomCategoryMode();
        syncMarketplaceCategoryHiddenValues();
        setMarketplaceCategoryFieldLocks({
            brandSelectDisabled: true,
            modelSelectDisabled: true,
        });
        return;
    }

    populateMarketplaceModelOptions(nextBrandName, nextModelName);
    if (marketplaceCreateModelSelect instanceof HTMLSelectElement) {
        marketplaceCreateModelSelect.value = MARKETPLACE_CUSTOM_MODEL_VALUE;
        marketplaceCreateModelSelect.disabled = true;
    }
    if (marketplaceCustomModelInput instanceof HTMLInputElement) {
        marketplaceCustomModelInput.value = nextModelName;
    }
    syncMarketplaceCustomCategoryMode();
    syncMarketplaceCategoryHiddenValues();
    setMarketplaceCategoryFieldLocks({
        brandSelectDisabled: true,
        modelSelectDisabled: true,
        customModelReadOnly: true,
    });
};

marketplaceCreateBrandSelect?.addEventListener('change', () => {
    if (marketplaceImportCategoryLock) {
        return;
    }

    if (marketplaceCustomBrandInput instanceof HTMLInputElement) {
        marketplaceCustomBrandInput.value = '';
    }

    if (marketplaceCustomModelInput instanceof HTMLInputElement) {
        marketplaceCustomModelInput.value = '';
    }

    if (marketplaceCreateBrandSelect.value === MARKETPLACE_CUSTOM_BRAND_VALUE) {
        populateMarketplaceModelOptions(MARKETPLACE_CUSTOM_BRAND_VALUE, '');
        if (marketplaceCreateModelSelect instanceof HTMLSelectElement) {
            marketplaceCreateModelSelect.value = MARKETPLACE_CUSTOM_MODEL_VALUE;
        }
        syncMarketplaceCustomCategoryMode();
        syncMarketplaceCategoryHiddenValues();
        marketplaceCustomBrandInput?.focus();
        return;
    }

    const selectedBrand = marketplaceApprovedBrandCatalog.find((brand) => brand.id === marketplaceCreateBrandSelect.value);
    populateMarketplaceModelOptions(selectedBrand?.name || '', '');
    syncMarketplaceCustomCategoryMode();
    syncMarketplaceCategoryHiddenValues();
});

marketplaceCreateModelSelect?.addEventListener('change', () => {
    if (marketplaceImportCategoryLock) {
        return;
    }

    if (marketplaceCreateModelSelect.value !== MARKETPLACE_CUSTOM_MODEL_VALUE && marketplaceCustomModelInput instanceof HTMLInputElement) {
        marketplaceCustomModelInput.value = '';
    }

    syncMarketplaceCustomCategoryMode();
    syncMarketplaceCategoryHiddenValues();

    if (marketplaceCreateModelSelect.value === MARKETPLACE_CUSTOM_MODEL_VALUE) {
        marketplaceCustomModelInput?.focus();
    }
});

marketplaceCustomBrandInput?.addEventListener('input', syncMarketplaceCategoryHiddenValues);
marketplaceCustomModelInput?.addEventListener('input', syncMarketplaceCategoryHiddenValues);

const syncMarketplaceImagesInput = () => {
    if (!marketplaceImageInput) {
        return;
    }

    const transfer = new DataTransfer();
    editableMarketplaceFiles.forEach((file) => transfer.items.add(file));
    marketplaceImageInput.files = transfer.files;
};

const buildMarketplaceImagePlaceholder = () => {
    const placeholderCard = document.createElement('button');
    placeholderCard.type = 'button';
    placeholderCard.className = 'cars-add-image-preview cars-add-image-picker is-placeholder';
    placeholderCard.setAttribute('aria-label', 'Dodaj zdjęcie ogłoszenia');
    placeholderCard.addEventListener('click', () => marketplaceImageInput?.click());

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

    return placeholderCard;
};

const renderMarketplaceGallery = () => {
    if (!marketplaceGallery) {
        return;
    }

    marketplaceGallery.innerHTML = '';

    existingMarketplaceImages.forEach((imagePath, index) => {
        const card = document.createElement('div');
        card.className = 'cars-add-image-preview';

        const image = document.createElement('img');
        image.className = 'cars-add-image-preview-photo';
        image.alt = `Obecne zdjęcie ${index + 1}`;
        image.src = imagePath;

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'cars-add-image-remove';
        removeButton.setAttribute('aria-label', `Usuń zdjęcie ${index + 1}`);
        removeButton.addEventListener('click', () => {
            existingMarketplaceImages = existingMarketplaceImages.filter((_, imageIndex) => imageIndex !== index);
            removedMarketplaceImages.push(imagePath);
            syncRemovedMarketplaceImagesInputs();
            renderMarketplaceGallery();
        });

        card.appendChild(image);
        card.appendChild(removeButton);
        marketplaceGallery.appendChild(card);
    });

    editableMarketplaceFiles.forEach((file, index) => {
        const card = document.createElement('div');
        card.className = 'cars-add-image-preview';

        const image = document.createElement('img');
        image.className = 'cars-add-image-preview-photo';
        image.alt = `Podgląd zdjęcia ${index + 1}`;

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'cars-add-image-remove';
        removeButton.setAttribute('aria-label', `Usuń zdjęcie ${index + 1}`);
        removeButton.addEventListener('click', () => {
            editableMarketplaceFiles = editableMarketplaceFiles.filter((_, fileIndex) => fileIndex !== index);
            syncMarketplaceImagesInput();
            renderMarketplaceGallery();
        });

        const reader = new FileReader();
        reader.onload = () => {
            image.src = String(reader.result ?? '');
        };
        reader.readAsDataURL(file);

        card.appendChild(image);
        card.appendChild(removeButton);
        marketplaceGallery.appendChild(card);
    });

    const totalImages = existingMarketplaceImages.length + editableMarketplaceFiles.length;

    if (marketplaceExistingImagesNote) {
        marketplaceExistingImagesNote.hidden = existingMarketplaceImages.length === 0;
    }

    if (totalImages === 0) {
        marketplaceGallery.appendChild(buildMarketplaceImagePlaceholder());
        marketplaceGallery.appendChild(buildMarketplaceImagePlaceholder());
    } else if (totalImages < 12) {
        marketplaceGallery.appendChild(buildMarketplaceImagePlaceholder());
    }
};

const initializeMarketplaceNumberInputs = (root = document) => {
    const numberInputs = root.querySelectorAll('input[data-marketplace-number]:not([readonly])');

    const parseNumericValue = (value) => {
        const digits = String(value ?? '').replace(/\s+/g, '').replace(/[^\d]/g, '');
        return digits === '' ? 0 : Number.parseInt(digits, 10);
    };

    const normalizeNumericValueForSubmit = (value) => {
        const digits = String(value ?? '').replace(/\s+/g, '').replace(/[^\d]/g, '');
        return digits === '' ? '' : String(Number.parseInt(digits, 10));
    };

    const formatNumericValue = (value) => {
        const digits = String(value ?? '').replace(/\D+/g, '');
        return digits === '' ? '' : Number.parseInt(digits, 10).toLocaleString('pl-PL');
    };

    numberInputs.forEach((input) => {
        if (!(input instanceof HTMLInputElement)) {
            return;
        }

        input.value = formatNumericValue(input.value);

        input.addEventListener('input', () => {
            input.value = formatNumericValue(input.value);
        });

        const currencyField = input.closest('.vehicle-currency-field');
        let numberField = input.closest('.vehicle-number-input');

        if (!currencyField && !numberField) {
            numberField = document.createElement('div');
            numberField.className = 'vehicle-number-input';
            input.parentNode?.insertBefore(numberField, input);
            numberField.appendChild(input);
        }

        const stepperHost = currencyField || numberField || input.parentElement;

        if (!stepperHost || stepperHost.querySelector('.vehicle-number-stepper')) {
            return;
        }

        const stepper = document.createElement('div');
        stepper.className = 'vehicle-number-stepper';

        const increaseButton = document.createElement('button');
        increaseButton.type = 'button';
        increaseButton.className = 'vehicle-number-stepper-button';
        increaseButton.setAttribute('aria-label', 'Zwiększ wartość');
        increaseButton.textContent = '+';

        const decreaseButton = document.createElement('button');
        decreaseButton.type = 'button';
        decreaseButton.className = 'vehicle-number-stepper-button';
        decreaseButton.setAttribute('aria-label', 'Zmniejsz wartość');
        decreaseButton.textContent = '-';

        const dispatchInputEvents = () => {
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        };

        increaseButton.addEventListener('click', () => {
            const nextValue = parseNumericValue(input.value) + 1;
            input.value = formatNumericValue(String(nextValue));
            dispatchInputEvents();
        });

        decreaseButton.addEventListener('click', () => {
            const nextValue = Math.max(0, parseNumericValue(input.value) - 1);
            input.value = formatNumericValue(String(nextValue));
            dispatchInputEvents();
        });

        stepper.appendChild(increaseButton);
        stepper.appendChild(decreaseButton);
        stepperHost.appendChild(stepper);

        if (input.form && input.dataset.boundMarketplaceSubmit !== 'true') {
            input.form.addEventListener('submit', () => {
                input.value = normalizeNumericValueForSubmit(input.value);
            });
            input.dataset.boundMarketplaceSubmit = 'true';
        }
    });
};

const showMarketplaceCreateModeChoice = () => {
    if (marketplaceCreateEntry) {
        marketplaceCreateEntry.hidden = false;
    }
    if (marketplaceCreateModeChoice) {
        marketplaceCreateModeChoice.hidden = false;
    }
    if (marketplaceCreateVehicleChoice) {
        marketplaceCreateVehicleChoice.hidden = true;
    }
    if (marketplaceCreateForm) {
        marketplaceCreateForm.hidden = true;
    }
};

const showMarketplaceCreateVehicleChoice = () => {
    if (marketplaceCreateEntry) {
        marketplaceCreateEntry.hidden = false;
    }
    if (marketplaceCreateModeChoice) {
        marketplaceCreateModeChoice.hidden = true;
    }
    if (marketplaceCreateVehicleChoice) {
        marketplaceCreateVehicleChoice.hidden = false;
    }
    if (marketplaceCreateForm) {
        marketplaceCreateForm.hidden = true;
    }
};

const showMarketplaceCreateForm = () => {
    if (marketplaceCreateEntry) {
        marketplaceCreateEntry.hidden = true;
    }
    if (marketplaceCreateForm) {
        marketplaceCreateForm.hidden = false;
    }
};

const initializeMarketplaceDecimalInputs = (root = document) => {
    const decimalInputs = root.querySelectorAll('input[data-marketplace-decimal]:not([readonly])');

    const sanitizeDecimalValue = (value) => {
        const normalized = String(value ?? '').replace(',', '.').replace(/[^\d.]/g, '');
        const [integerPart = '', ...decimalParts] = normalized.split('.');
        const decimalPart = decimalParts.join('');

        if (integerPart === '' && decimalPart === '') {
            return '';
        }

        return decimalPart === '' ? integerPart : `${integerPart}.${decimalPart.slice(0, 1)}`;
    };

    const parseDecimalValue = (value) => {
        const sanitized = sanitizeDecimalValue(value);
        return sanitized === '' ? 0 : Number.parseFloat(sanitized);
    };

    const formatDecimalValue = (value) => {
        const sanitized = sanitizeDecimalValue(value);
        if (sanitized === '') {
            return '';
        }

        const parsed = Number.parseFloat(sanitized);
        return Number.isFinite(parsed) ? parsed.toFixed(1) : '';
    };

    decimalInputs.forEach((input) => {
        if (!(input instanceof HTMLInputElement)) {
            return;
        }

        const decimalScale = Number.parseInt(input.dataset.marketplaceDecimalScale || '1', 10) || 1;
        input.value = formatDecimalValue(input.value);

        input.addEventListener('input', () => {
            input.value = sanitizeDecimalValue(input.value);
        });

        input.addEventListener('blur', () => {
            input.value = formatDecimalValue(input.value);
        });

        const currencyField = input.closest('.vehicle-currency-field');
        let numberField = input.closest('.vehicle-number-input');

        if (!currencyField && !numberField) {
            numberField = document.createElement('div');
            numberField.className = 'vehicle-number-input';
            input.parentNode?.insertBefore(numberField, input);
            numberField.appendChild(input);
        }

        const stepperHost = currencyField || numberField || input.parentElement;

        if (!stepperHost || stepperHost.querySelector('.vehicle-number-stepper')) {
            return;
        }

        const stepper = document.createElement('div');
        stepper.className = 'vehicle-number-stepper';

        const increaseButton = document.createElement('button');
        increaseButton.type = 'button';
        increaseButton.className = 'vehicle-number-stepper-button';
        increaseButton.setAttribute('aria-label', 'Zwiększ wartość');
        increaseButton.textContent = '+';

        const decreaseButton = document.createElement('button');
        decreaseButton.type = 'button';
        decreaseButton.className = 'vehicle-number-stepper-button';
        decreaseButton.setAttribute('aria-label', 'Zmniejsz wartość');
        decreaseButton.textContent = '-';

        const dispatchInputEvents = () => {
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        };

        increaseButton.addEventListener('click', () => {
            const nextValue = parseDecimalValue(input.value) + 0.1;
            input.value = formatDecimalValue(String(nextValue));
            dispatchInputEvents();
        });

        decreaseButton.addEventListener('click', () => {
            const nextValue = Math.max(0, parseDecimalValue(input.value) - 0.1);
            input.value = formatDecimalValue(String(nextValue));
            dispatchInputEvents();
        });

        stepper.appendChild(increaseButton);
        stepper.appendChild(decreaseButton);
        stepperHost.appendChild(stepper);

        if (input.form && input.dataset.boundMarketplaceDecimalSubmit !== 'true') {
            input.form.addEventListener('submit', () => {
                input.value = sanitizeDecimalValue(input.value);
            });
            input.dataset.boundMarketplaceDecimalSubmit = 'true';
        }
    });
};

const getMarketplaceCreateStepElement = (stepNumber) => marketplaceCreateSteps.find(
    (step) => Number(step.getAttribute('data-marketplace-create-step')) === stepNumber,
);

const setMarketplaceCreateStep = (stepNumber) => {
    marketplaceCurrentStep = stepNumber;

    marketplaceCreateSteps.forEach((step) => {
        const isActive = Number(step.getAttribute('data-marketplace-create-step')) === stepNumber;
        step.hidden = !isActive;
    });

    const activeStep = getMarketplaceCreateStepElement(stepNumber);
    const activeGrid = activeStep?.querySelector('.marketplace-create-step-grid');
    if (activeGrid) {
        activeGrid.scrollTop = 0;
    }
    if (marketplaceCreateModal) {
        marketplaceCreateModal.scrollTop = 0;
    }
    activeStep?.querySelector('input, select, textarea, button')?.focus({ preventScroll: true });
};

const getMarketplaceFieldLabel = (field) => {
    const wrapper = field.closest('label, .vehicle-modal-field');
    const label = wrapper?.querySelector('span');
    return label?.textContent?.trim() || field.name || 'Pole';
};

const validateMarketplaceCreateStep = (stepNumber) => {
    const step = getMarketplaceCreateStepElement(stepNumber);
    if (!step) {
        return true;
    }

    const totalImages = editableMarketplaceFiles.length + existingMarketplaceImages.length;
    if (stepNumber === 1 && totalImages === 0) {
        showAppToast('Dodaj przynajmniej jedno zdjęcie ogłoszenia.', 'error');
        marketplaceImageInput?.click();
        return false;
    }

    const fields = step.querySelectorAll('input, select, textarea');
    for (const field of fields) {
        const input = field;

        if (input.disabled || input.type === 'hidden') {
            continue;
        }

        if (!input.checkValidity()) {
            const message = input.validationMessage || `Uzupełnij pole: ${getMarketplaceFieldLabel(input)}.`;
            input.reportValidity();
            showAppToast(message, 'error');
            return false;
        }
    }

    return true;
};

const formatMarketplaceSummaryValue = (fieldName) => {
    const field = marketplaceCreateForm?.elements.namedItem(fieldName);
    if (!(field instanceof HTMLElement)) {
        return '—';
    }

    if (field instanceof HTMLSelectElement) {
        const selectedOption = field.options[field.selectedIndex];
        return selectedOption?.textContent?.trim() || '—';
    }

    const rawValue = 'value' in field ? String(field.value || '').trim() : '';
    if (rawValue === '') {
        return '—';
    }

    if (fieldName === 'price_amount') {
        return `${rawValue} PLN`;
    }

    if (fieldName === 'mileage_km') {
        return `${rawValue} km`;
    }

    if (fieldName === 'engine_capacity_cc') {
        return `${rawValue} cm3`;
    }

    if (fieldName === 'power_hp') {
        return `${rawValue} KM`;
    }

    return rawValue;
};

const syncMarketplaceCreateSummary = () => {
    marketplaceSummaryFields.forEach((field) => {
        const key = field.getAttribute('data-marketplace-summary');
        if (!key) {
            return;
        }

        field.textContent = formatMarketplaceSummaryValue(key);
    });
};

const resetMarketplaceCreateMode = () => {
    marketplaceImportCategoryLock = false;
    if (marketplaceCreateKicker) {
        marketplaceCreateKicker.textContent = 'Nowe ogłoszenie';
    }
    if (marketplaceCreateTitle) {
        marketplaceCreateTitle.textContent = 'Dodaj ogłoszenie';
    }
    if (marketplaceCreateActionInput) {
        marketplaceCreateActionInput.value = 'create_listing';
    }
    if (marketplaceEditIdInput) {
        marketplaceEditIdInput.value = '';
    }
    if (marketplaceSourceVehicleIdInput) {
        marketplaceSourceVehicleIdInput.value = '';
    }
    if (marketplaceCreateSubmit) {
        marketplaceCreateSubmit.textContent = 'Dodaj ogłoszenie';
    }
    if (marketplaceImageInput) {
        marketplaceImageInput.required = true;
    }
    if (marketplaceBrandHiddenInput instanceof HTMLInputElement) {
        marketplaceBrandHiddenInput.value = '';
    }
    if (marketplaceModelHiddenInput instanceof HTMLInputElement) {
        marketplaceModelHiddenInput.value = '';
    }
    if (marketplaceCustomBrandInput instanceof HTMLInputElement) {
        marketplaceCustomBrandInput.value = '';
    }
    if (marketplaceCustomModelInput instanceof HTMLInputElement) {
        marketplaceCustomModelInput.value = '';
    }
    removedMarketplaceImages = [];
    syncRemovedMarketplaceImagesInputs();
    syncMarketplaceCustomCategoryMode();
    setMarketplaceCategoryFieldLocks();
};
const fillMarketplaceCreateForm = (payload) => {
    if (!marketplaceCreateForm || !payload) {
        return;
    }

    const selectedBrandName = String(payload.brand_name || '').trim();
    const selectedModelName = String(payload.model_name || '').trim();
    const isImportedVehicle = Number.parseInt(String(payload.source_vehicle_id || ''), 10) > 0;

    if (isImportedVehicle) {
        applyMarketplaceImportedCategoryState(selectedBrandName, selectedModelName);
    } else {
        syncMarketplaceCategoryFields(selectedBrandName, selectedModelName);
    }

    Object.entries(payload).forEach(([key, value]) => {
        if (key === 'id' || key === 'images' || key === 'brand_id' || key === 'model_id') {
            return;
        }

        const field = marketplaceCreateForm.elements.namedItem(key);
        if (!(field instanceof HTMLElement) || !('value' in field)) {
            return;
        }

        field.value = value ?? '';
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
    });

    initializeMarketplaceNumberInputs(marketplaceCreateModal);
    if (isImportedVehicle) {
        applyMarketplaceImportedCategoryState(selectedBrandName, selectedModelName);
    } else {
        syncMarketplaceCategoryFields(selectedBrandName, selectedModelName);
    }
    syncMarketplacePhoneInput();
};

const openMarketplaceEditModal = (payload) => {
    if (!marketplaceCreateForm || !payload) {
        return;
    }

    marketplaceCreateForm.reset();
    editableMarketplaceFiles = [];
    existingMarketplaceImages = Array.isArray(payload.images) ? payload.images.slice(0, 12) : [];
    removedMarketplaceImages = [];
    syncMarketplaceImagesInput();
    syncRemovedMarketplaceImagesInputs();
    renderMarketplaceGallery();
    resetMarketplaceCreateMode();

    if (marketplaceCreateKicker) {
        marketplaceCreateKicker.textContent = 'Edycja ogłoszenia';
    }
    if (marketplaceCreateTitle) {
        marketplaceCreateTitle.textContent = 'Edytuj ogłoszenie';
    }
    if (marketplaceCreateActionInput) {
        marketplaceCreateActionInput.value = 'update_listing';
    }
    if (marketplaceEditIdInput) {
        marketplaceEditIdInput.value = String(payload.id ?? '');
    }
    if (marketplaceCreateSubmit) {
        marketplaceCreateSubmit.textContent = 'Zapisz ogłoszenie';
    }
    if (marketplaceImageInput) {
        marketplaceImageInput.required = false;
    }

    fillMarketplaceCreateForm(payload);
    showMarketplaceCreateForm();
    openMarketplaceCreateModal();
};
window.openMarketplaceEditModal = openMarketplaceEditModal;
window.addEventListener('marketplace:open-edit', (event) => {
    const payload = event.detail;
    if (!payload) {
        return;
    }

    openMarketplaceEditModal(payload);
});
document.addEventListener('marketplace:open-edit', (event) => {
    const payload = event.detail;
    if (!payload) {
        return;
    }

    openMarketplaceEditModal(payload);
});

const openMarketplaceCreateModal = () => {
    if (!marketplaceCreateBackdrop || !marketplaceCreateModal) {
        return;
    }

    marketplaceCreateBackdrop.hidden = false;
    marketplaceCreateModal.hidden = false;
    syncMarketplaceScrollLock();
};

const closeMarketplaceCreateModal = () => {
    if (!marketplaceCreateBackdrop || !marketplaceCreateModal) {
        return;
    }

    marketplaceCreateBackdrop.hidden = true;
    marketplaceCreateModal.hidden = true;
    setMarketplaceCreateStep(1);
    syncMarketplaceScrollLock();
};

const openMarketplaceDetailedModal = () => {
    if (!marketplaceDetailedBackdrop || !marketplaceDetailedModal) {
        return;
    }

    marketplaceDetailedBackdrop.hidden = false;
    marketplaceDetailedModal.hidden = false;
    syncMarketplaceScrollLock();
};

const closeMarketplaceDetailedModal = () => {
    if (!marketplaceDetailedBackdrop || !marketplaceDetailedModal) {
        return;
    }

    marketplaceDetailedBackdrop.hidden = true;
    marketplaceDetailedModal.hidden = true;
    syncMarketplaceScrollLock();
};

const prepareMarketplaceCreateFormForNewListing = () => {
    marketplaceCreateForm?.reset();
    editableMarketplaceFiles = [];
    existingMarketplaceImages = [];
    removedMarketplaceImages = [];
    syncMarketplaceImagesInput();
    syncRemovedMarketplaceImagesInputs();
    renderMarketplaceGallery();
    resetMarketplaceCreateMode();
    initializeMarketplaceNumberInputs(marketplaceCreateModal);
    initializeMarketplaceDecimalInputs(marketplaceCreateModal);
    syncMarketplaceCategoryFields('', '');
    setMarketplaceCreateStep(1);
    showMarketplaceCreateForm();
};

marketplaceOpenCreateButtons.forEach((button) => {
    button.addEventListener('click', () => {
        resetMarketplaceCreateMode();
        showMarketplaceCreateModeChoice();
        openMarketplaceCreateModal();
    });
});

marketplaceOpenImportChoiceButtons.forEach((button) => {
    button.addEventListener('click', () => {
        showMarketplaceCreateVehicleChoice();
    });
});

marketplaceOpenNewChoiceButtons.forEach((button) => {
    button.addEventListener('click', () => {
        prepareMarketplaceCreateFormForNewListing();
    });
});

marketplaceBackToModeChoiceButtons.forEach((button) => {
    button.addEventListener('click', () => {
        showMarketplaceCreateModeChoice();
    });
});

marketplaceImportVehicleButtons.forEach((button) => {
    button.addEventListener('click', () => {
        const payloadRaw = button.getAttribute('data-marketplace-import-payload');
        if (!payloadRaw || !marketplaceCreateForm) {
            return;
        }

        try {
            const payload = JSON.parse(payloadRaw);
            prepareMarketplaceCreateFormForNewListing();
            if (marketplaceImageInput) {
                marketplaceImageInput.required = false;
            }
            existingMarketplaceImages = Array.isArray(payload.images) ? payload.images.slice(0, 12) : [];
            renderMarketplaceGallery();
            fillMarketplaceCreateForm(payload);
            setMarketplaceCreateStep(1);
            showMarketplaceCreateForm();
        } catch {
            return;
        }
    });
});

marketplaceCreateNextButtons.forEach((button) => {
    button.addEventListener('click', () => {
        const currentStep = Number(button.getAttribute('data-marketplace-step-current') || marketplaceCurrentStep);
        if (!validateMarketplaceCreateStep(currentStep)) {
            return;
        }

        if (currentStep === 4) {
            syncMarketplaceCreateSummary();
        }

        setMarketplaceCreateStep(Math.min(5, currentStep + 1));
    });
});

marketplaceCreatePrevButtons.forEach((button) => {
    button.addEventListener('click', () => {
        setMarketplaceCreateStep(Math.max(1, marketplaceCurrentStep - 1));
    });
});
marketplaceCloseCreateButtons.forEach((button) => {
    button.addEventListener('click', closeMarketplaceCreateModal);
});

marketplaceOpenDetailedButtons.forEach((button) => {
    button.addEventListener('click', openMarketplaceDetailedModal);
});

marketplaceCloseDetailedButtons.forEach((button) => {
    button.addEventListener('click', closeMarketplaceDetailedModal);
});

marketplaceImageInput?.addEventListener('change', () => {
    const incomingFiles = Array.from(marketplaceImageInput.files ?? []);

    if (incomingFiles.length === 0) {
        syncMarketplaceImagesInput();
        return;
    }

    const remainingSlots = 12 - editableMarketplaceFiles.length;
    if (remainingSlots <= 0) {
        syncMarketplaceImagesInput();
        renderMarketplaceGallery();
        return;
    }

    editableMarketplaceFiles = editableMarketplaceFiles.concat(incomingFiles.slice(0, remainingSlots));
    syncMarketplaceImagesInput();
    renderMarketplaceGallery();
});

marketplaceCreateForm?.addEventListener('submit', async (event) => {
    for (let step = 1; step <= 4; step += 1) {
        if (!validateMarketplaceCreateStep(step)) {
            event.preventDefault();
            setMarketplaceCreateStep(step);
            return;
        }
    }

    event.preventDefault();

    const formData = new FormData(marketplaceCreateForm);
    const action = String(formData.get('action') || 'create_listing');

    try {
        const response = await fetch(resolveMarketplaceFormEndpoint(marketplaceCreateForm), {
            method: 'POST',
            body: formData,
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

        const listingId = String(payload.listing_id || '');
        const existingModal = listingId !== '' ? document.getElementById(`marketplace-details-modal-${listingId}`) : null;
        existingModal?.remove();
        if (activeMarketplaceDetailsModal === existingModal) {
            activeMarketplaceDetailsModal = null;
        }

        if (typeof payload.html === 'string' && payload.html !== '') {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = payload.html;
            initializeMarketplaceChunk(wrapper);

            const nextListing = wrapper.querySelector('.marketplace-listing');
            if (!(nextListing instanceof HTMLElement)) {
                throw new Error('Invalid listing markup');
            }

            const currentListing = listingId !== '' ? document.getElementById(`listing-${listingId}`) : null;
            if (currentListing instanceof HTMLElement) {
                currentListing.replaceWith(nextListing);
            } else {
                const feedRoot = document.querySelector('.marketplace-feed') ?? document.querySelector('.community-profile-feed');
                if (feedRoot instanceof HTMLElement) {
                    const emptyState = feedRoot.querySelector('.community-empty, .marketplace-empty');
                    emptyState?.remove();
                    feedRoot.prepend(nextListing);
                }
            }
        }

        closeMarketplaceCreateModal();
        showAppToast(payload.message || (action === 'update_listing' ? 'Ogłoszenie zostało zaktualizowane.' : 'Ogłoszenie zostało opublikowane.'), 'success');
    } catch {
        marketplaceCreateForm.submit();
    }
});

const initializeMarketplaceCarousel = (carousel) => {
    const track = carousel.querySelector('[data-marketplace-carousel-track]');
    const prev = carousel.querySelector('[data-marketplace-carousel-prev]');
    const next = carousel.querySelector('[data-marketplace-carousel-next]');

    if (!track || carousel.dataset.marketplaceCarouselReady === 'true' || carousel.offsetParent === null) {
        return;
    }

    const initialSlides = Array.from(track.children);
    if (initialSlides.length <= 1) {
        carousel.dataset.marketplaceCarouselReady = 'true';
        return;
    }

    const firstClone = initialSlides[0].cloneNode(true);
    const lastClone = initialSlides[initialSlides.length - 1].cloneNode(true);
    track.insertBefore(lastClone, initialSlides[0]);
    track.appendChild(firstClone);
    const allSlides = Array.from(track.children);

    let currentIndex = 1;
    let isAnimating = false;
    let slideWidth = carousel.getBoundingClientRect().width;

    const applySlideWidths = () => {
        slideWidth = carousel.getBoundingClientRect().width;
        track.style.width = `${slideWidth * allSlides.length}px`;

        allSlides.forEach((slide) => {
            slide.style.width = `${slideWidth}px`;
            slide.style.minWidth = `${slideWidth}px`;
            slide.style.maxWidth = `${slideWidth}px`;
            slide.style.flex = `0 0 ${slideWidth}px`;
        });
    };

    const syncPosition = () => {
        track.style.transform = `translateX(-${currentIndex * slideWidth}px)`;
    };

    const moveToIndex = (nextIndex) => {
        if (isAnimating) {
            return;
        }

        isAnimating = true;
        currentIndex = nextIndex;
        syncPosition();
    };

    track.addEventListener('transitionend', () => {
        const totalSlides = initialSlides.length;

        if (currentIndex === 0) {
            track.classList.add('is-no-transition');
            currentIndex = totalSlides;
            syncPosition();
            track.offsetHeight;
            track.classList.remove('is-no-transition');
        } else if (currentIndex === totalSlides + 1) {
            track.classList.add('is-no-transition');
            currentIndex = 1;
            syncPosition();
            track.offsetHeight;
            track.classList.remove('is-no-transition');
        }

        isAnimating = false;
    });

    prev?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        moveToIndex(currentIndex - 1);
    });

    next?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        moveToIndex(currentIndex + 1);
    });

    window.addEventListener('resize', () => {
        applySlideWidths();
        track.classList.add('is-no-transition');
        syncPosition();
        track.offsetHeight;
        track.classList.remove('is-no-transition');
    });

    requestAnimationFrame(() => {
        applySlideWidths();
        syncPosition();
    });

    carousel.dataset.marketplaceCarouselReady = 'true';
};

const openMarketplaceDetailsModal = (modalElement) => {
    if (!modalElement) {
        return;
    }

    activeMarketplaceDetailsModal = modalElement;
    modalElement.hidden = false;
    syncMarketplaceScrollLock();
};

const closeMarketplaceDetailsModal = (modalElement = activeMarketplaceDetailsModal) => {
    if (!modalElement) {
        return;
    }

    modalElement.hidden = true;
    if (activeMarketplaceDetailsModal === modalElement) {
        activeMarketplaceDetailsModal = null;
    }

    syncMarketplaceScrollLock();
};

const renderMarketplaceSaveIcon = (saved) => saved
    ? `<svg viewBox="0 0 24 24" class="marketplace-save-heart-svg is-filled"><path d="M12 21.35 10.55 20.03C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54Z"/></svg>`
    : `<svg viewBox="0 0 24 24" class="marketplace-save-heart-svg is-outline"><path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09A5.964 5.964 0 0 0 7.5 3C4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.31C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3Zm-4.4 15.55-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5 18.5 5 20 6.5 20 8.5c0 2.89-3.14 5.74-7.9 10.05Z"/></svg>`;

const resolveMarketplaceFormEndpoint = (form) => {
    const action = form.getAttribute('action');
    if (action && action.trim() !== '') {
        return action;
    }

    return window.location.pathname + window.location.search;
};

const syncMarketplaceSaveState = (listingId, saved) => {
    document.querySelectorAll(`[data-marketplace-save-form][data-marketplace-listing-id="${listingId}"]`).forEach((form) => {
        const button = form.querySelector('[data-marketplace-save-button]');
        const icon = form.querySelector('[data-marketplace-save-icon]');
        if (!button || !icon) {
            return;
        }

        button.classList.toggle('is-active', saved);
        icon.innerHTML = renderMarketplaceSaveIcon(saved);
    });
};

const closeMarketplaceMenus = (exceptMenu = null) => {
    document.querySelectorAll('[data-marketplace-menu]').forEach((menu) => {
        if (exceptMenu && menu === exceptMenu) {
            return;
        }

        const trigger = menu.querySelector('[data-marketplace-menu-trigger]');
        const dropdown = menu.querySelector('[data-marketplace-menu-dropdown]');
        if (!trigger || !dropdown) {
            return;
        }

        trigger.setAttribute('aria-expanded', 'false');
        dropdown.hidden = true;
    });
};

const bindMarketplaceSaveForms = (root) => {
    root.querySelectorAll('[data-marketplace-save-form]').forEach((form) => {
        if (form.dataset.boundSave === 'true') {
            return;
        }

        form.addEventListener('click', (event) => {
            event.stopPropagation();
        });

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            event.stopPropagation();

            const button = form.querySelector('[data-marketplace-save-button]');
            const icon = form.querySelector('[data-marketplace-save-icon]');

            if (!button || !icon) {
                form.submit();
                return;
            }

            const formData = new FormData(form);

            try {
                const response = await fetch(resolveMarketplaceFormEndpoint(form), {
                    method: 'POST',
                    body: formData,
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

                const listingId = String(form.getAttribute('data-marketplace-listing-id') || formData.get('listing_id') || '');
                syncMarketplaceSaveState(listingId, Boolean(payload.saved_by_current_user));
            } catch {
                form.submit();
            }
        });

        form.dataset.boundSave = 'true';
    });
};

const bindMarketplaceMenus = (root) => {
    root.querySelectorAll('[data-marketplace-menu]').forEach((menu) => {
        if (menu.dataset.boundMenu === 'true') {
            return;
        }

        const trigger = menu.querySelector('[data-marketplace-menu-trigger]');
        const dropdown = menu.querySelector('[data-marketplace-menu-dropdown]');
        if (!trigger || !dropdown) {
            return;
        }

        trigger.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();

            const isOpen = trigger.getAttribute('aria-expanded') === 'true';
            closeMarketplaceMenus(isOpen ? null : menu);
            trigger.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
            dropdown.hidden = isOpen;
        });

        menu.addEventListener('click', (event) => {
            event.stopPropagation();
        });

        menu.dataset.boundMenu = 'true';
    });
};

const bindMarketplaceReportForms = (root) => {
    root.querySelectorAll('[data-marketplace-report-form]').forEach((form) => {
        if (form.dataset.boundReport === 'true') {
            return;
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            event.stopPropagation();

            const formData = new FormData(form);

            try {
                const response = await fetch(resolveMarketplaceFormEndpoint(form), {
                    method: 'POST',
                    body: formData,
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

                showAppToast(payload.message || 'Ogloszenie zostalo zgloszone.', 'success');
                closeMarketplaceMenus();
            } catch {
                form.submit();
            }
        });

        form.dataset.boundReport = 'true';
    });
};

const bindMarketplaceDeleteForms = (root) => {
    root.querySelectorAll('[data-marketplace-delete-form]').forEach((form) => {
        if (form.dataset.boundDelete === 'true') {
            return;
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            event.stopPropagation();

            const formData = new FormData(form);
            const listingId = String(formData.get('listing_id') || '');

            try {
                const response = await fetch(resolveMarketplaceFormEndpoint(form), {
                    method: 'POST',
                    body: formData,
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

                document.querySelectorAll(`#listing-${listingId}`).forEach((element) => element.remove());
                document.querySelectorAll(`[id="marketplace-details-modal-${listingId}"]`).forEach((element) => element.remove());
                if (activeMarketplaceDetailsModal?.id === `marketplace-details-modal-${listingId}`) {
                    activeMarketplaceDetailsModal = null;
                    syncMarketplaceScrollLock();
                }

                showAppToast(payload.message || 'Ogłoszenie zostało usunięte.', 'success');
                closeMarketplaceMenus();
            } catch {
                form.submit();
            }
        });

        form.dataset.boundDelete = 'true';
    });
};

const bindMarketplaceEditTriggers = (root) => {
    root.querySelectorAll('[data-marketplace-edit-trigger]').forEach((button) => {
        if (button.dataset.boundEdit === 'true') {
            return;
        }

        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();

            const payloadRaw = button.getAttribute('data-marketplace-edit-payload');
            if (!payloadRaw) {
                return;
            }

            try {
                const payload = JSON.parse(payloadRaw);
                closeMarketplaceMenus();
                if (activeMarketplaceDetailsModal) {
                    closeMarketplaceDetailsModal(activeMarketplaceDetailsModal);
                }
                openMarketplaceEditModal(payload);
            } catch {
                return;
            }
        });

        button.dataset.boundEdit = 'true';
    });
};

const bindMarketplaceDetailModals = (root) => {
    root.querySelectorAll('[data-marketplace-details-modal]').forEach((modal) => {
        if (modal.parentElement !== document.body) {
            document.body.appendChild(modal);
        }

        if (modal.dataset.boundClose === 'true') {
            return;
        }

        modal.querySelectorAll('[data-close-marketplace-details]').forEach((button) => {
            button.addEventListener('click', () => closeMarketplaceDetailsModal(modal));
        });

        modal.dataset.boundClose = 'true';
    });
};

const bindMarketplaceDetailOpeners = (root) => {
    root.querySelectorAll('[data-open-marketplace-details]').forEach((button) => {
        if (button.dataset.boundOpen === 'true') {
            return;
        }

        button.addEventListener('click', () => {
            const modalId = button.getAttribute('data-marketplace-details-id');
            if (!modalId) {
                return;
            }

            const modal = document.getElementById(modalId);
            if (!modal) {
                return;
            }

            openMarketplaceDetailsModal(modal);
            requestAnimationFrame(() => {
                modal.querySelectorAll('[data-marketplace-carousel]').forEach((carousel) => {
                    initializeMarketplaceCarousel(carousel);
                });
            });
        });

        button.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                button.click();
            }
        });

        button.dataset.boundOpen = 'true';
    });
};

const bindMarketplaceContactToggles = (root) => {
    root.querySelectorAll('[data-marketplace-contact-toggle]').forEach((button) => {
        if (button.dataset.boundContact === 'true') {
            return;
        }

        button.addEventListener('click', () => {
            const card = button.closest('.marketplace-details-contact')?.querySelector('[data-marketplace-contact-card]');
            if (!card) {
                return;
            }

            const isHidden = card.hidden;
            card.hidden = !isHidden;
            button.textContent = isHidden ? 'Ukryj dane kontaktowe' : 'Sprawdz dane kontaktowe';
        });

        button.dataset.boundContact = 'true';
    });
};

const bindMarketplaceCarousels = (root) => {
    root.querySelectorAll('[data-marketplace-carousel]').forEach((carousel) => {
        initializeMarketplaceCarousel(carousel);
    });
};

const initializeMarketplaceChunk = (root) => {
    bindMarketplaceCarousels(root);
    bindMarketplaceSaveForms(root);
    bindMarketplaceMenus(root);
    bindMarketplaceEditTriggers(root);
    bindMarketplaceReportForms(root);
    bindMarketplaceDeleteForms(root);
    bindMarketplaceDetailModals(root);
    bindMarketplaceDetailOpeners(root);
    bindMarketplaceContactToggles(document);
};
window.initializeMarketplaceChunk = initializeMarketplaceChunk;

document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;

    if (target) {
        const menuTrigger = target.closest('[data-marketplace-menu-trigger]');
        if (menuTrigger) {
            event.preventDefault();
            event.stopPropagation();

            const menu = menuTrigger.closest('[data-marketplace-menu]');
            const dropdown = menu?.querySelector('[data-marketplace-menu-dropdown]');
            if (menu && dropdown) {
                const isOpen = menuTrigger.getAttribute('aria-expanded') === 'true';
                closeMarketplaceMenus(isOpen ? null : menu);
                menuTrigger.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
                dropdown.hidden = isOpen;
            }
            return;
        }

        const carouselControl = target.closest('[data-marketplace-carousel-prev], [data-marketplace-carousel-next]');
        if (carouselControl) {
            event.preventDefault();
            event.stopPropagation();

            const carousel = carouselControl.closest('[data-marketplace-carousel]');
            if (carousel) {
                initializeMarketplaceCarousel(carousel);
                if (carousel.dataset.marketplaceCarouselReady === 'true') {
                    carouselControl.dispatchEvent(new MouseEvent('click', {
                        bubbles: false,
                        cancelable: true,
                        view: window,
                    }));
                }
            }
            return;
        }

        const detailsCloser = target.closest('[data-close-marketplace-details]');
        if (detailsCloser) {
            event.preventDefault();
            const modal = detailsCloser.closest('[data-marketplace-details-modal]');
            closeMarketplaceDetailsModal(modal);
            return;
        }

        const detailsOpener = target.closest('[data-open-marketplace-details]');
        if (detailsOpener
            && !target.closest('[data-marketplace-save-form]')
            && !target.closest('[data-marketplace-menu]')
            && !target.closest('[data-marketplace-carousel-prev]')
            && !target.closest('[data-marketplace-carousel-next]')
            && !target.closest('[data-marketplace-contact-toggle]')
            && !target.closest('[data-marketplace-details-seller-link]')) {
            const modalId = detailsOpener.getAttribute('data-marketplace-details-id');
            if (modalId) {
                const modal = document.getElementById(modalId);
                if (modal) {
                    openMarketplaceDetailsModal(modal);
                    requestAnimationFrame(() => {
                        modal.querySelectorAll('[data-marketplace-carousel]').forEach((carousel) => {
                            initializeMarketplaceCarousel(carousel);
                        });
                    });
                }
            }
            return;
        }

        const contactToggle = target.closest('[data-marketplace-contact-toggle]');
        if (contactToggle) {
            event.preventDefault();
            const card = contactToggle.closest('.marketplace-details-contact')?.querySelector('[data-marketplace-contact-card]');
            if (card) {
                const isHidden = card.hidden;
                card.hidden = !isHidden;
                contactToggle.textContent = isHidden ? 'Ukryj dane kontaktowe' : 'Sprawdz dane kontaktowe';
            }
            return;
        }
    }

    closeMarketplaceMenus();

    if (marketplaceCreateBackdrop && event.target === marketplaceCreateBackdrop) {
        closeMarketplaceCreateModal();
    }

    if (marketplaceDetailedBackdrop && event.target === marketplaceDetailedBackdrop) {
        closeMarketplaceDetailedModal();
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && marketplaceCreateModal && !marketplaceCreateModal.hidden) {
        closeMarketplaceCreateModal();
    }

    if (event.key === 'Escape' && marketplaceDetailedModal && !marketplaceDetailedModal.hidden) {
        closeMarketplaceDetailedModal();
    }

    if (event.key === 'Escape' && activeMarketplaceDetailsModal) {
        closeMarketplaceDetailsModal(activeMarketplaceDetailsModal);
    }

    if (event.key === 'Escape') {
        closeMarketplaceMenus();
    }
});

const feed = document.querySelector('[data-marketplace-feed]');
const feedSentinel = document.querySelector('[data-marketplace-feed-sentinel]');
const feedLoader = document.querySelector('[data-marketplace-feed-loader]');
let isLoadingNextFeedPage = false;

const setFeedPaginationState = (hasMore, nextOffset) => {
    if (!feed) {
        return;
    }

    feed.dataset.hasMore = hasMore ? '1' : '0';
    feed.dataset.nextOffset = nextOffset ? String(nextOffset) : '0';
};

const buildMarketplaceFeedPageUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('feed_page', '1');
    url.searchParams.set('offset', feed?.dataset.nextOffset ?? '0');
    return url.toString();
};

const loadNextMarketplaceFeedPage = async () => {
    if (!feed || !feedSentinel || !feedLoader) {
        return;
    }

    if (isLoadingNextFeedPage || feed.dataset.hasMore !== '1') {
        return;
    }

    const nextOffset = feed.dataset.nextOffset ?? '0';

    if (!nextOffset) {
        setFeedPaginationState(false, 0);
        return;
    }

    isLoadingNextFeedPage = true;
    feedLoader.hidden = false;

    try {
        const response = await fetch(buildMarketplaceFeedPageUrl(), {
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

        const wrapper = document.createElement('div');
        wrapper.innerHTML = payload.html || '';
        initializeMarketplaceChunk(wrapper);

        const fragment = document.createDocumentFragment();
        while (wrapper.firstChild) {
            fragment.appendChild(wrapper.firstChild);
        }

        feed.insertBefore(fragment, feedLoader);
        setFeedPaginationState(Boolean(payload.has_more), payload.next_offset || 0);
    } catch {
        setFeedPaginationState(false, 0);
    } finally {
        feedLoader.hidden = true;
        isLoadingNextFeedPage = false;
    }
};

if (feed && feedSentinel) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                loadNextMarketplaceFeedPage();
            }
        });
    }, {
        root: null,
        rootMargin: '600px 0px 600px 0px',
        threshold: 0.01,
    });

    observer.observe(feedSentinel);
}

const bootstrapMarketplaceInteractions = () => {
    renderMarketplaceGallery();
    setMarketplaceCreateStep(1);
    initializeMarketplaceNumberInputs(document);
    initializeMarketplaceDecimalInputs(document);
    initializeMarketplaceChunk(document);
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapMarketplaceInteractions, { once: true });
} else {
    bootstrapMarketplaceInteractions();
}

window.addEventListener('load', () => {
    initializeMarketplaceChunk(document);
});


