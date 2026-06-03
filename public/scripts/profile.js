const isProfilePage = Boolean(document.querySelector('.profile-page'));

if (isProfilePage) {
    document.body.classList.add('is-profile-page');
}

const renderProfileMarketplaceSaveIcon = (saved) => saved
    ? '<svg viewBox="0 0 24 24" class="marketplace-save-heart-svg is-filled"><path d="M12 21.35 10.55 20.03C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54Z"/></svg>'
    : '<svg viewBox="0 0 24 24" class="marketplace-save-heart-svg is-outline"><path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09A5.964 5.964 0 0 0 7.5 3C4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.31C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3Zm-4.4 15.55-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5 18.5 5 20 6.5 20 8.5c0 2.89-3.14 5.74-7.9 10.05Z"/></svg>';

const closeProfileMarketplaceMenus = (exceptMenu = null) => {
    document.querySelectorAll('.profile-page [data-marketplace-menu], [data-marketplace-details-modal] [data-marketplace-menu]').forEach((menu) => {
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

const closeProfileTransientUi = () => {
    document.querySelectorAll('[data-marketplace-details-modal]').forEach((modal) => {
        modal.hidden = true;
    });
    document.querySelectorAll('[data-community-comments-modal]').forEach((modal) => {
        modal.hidden = true;
    });
    closeProfileMarketplaceMenus();
};

const syncProfileMarketplaceSaveState = (listingId, saved) => {
    document.querySelectorAll(`[data-marketplace-save-form][data-marketplace-listing-id="${listingId}"]`).forEach((form) => {
        const button = form.querySelector('[data-marketplace-save-button]');
        const icon = form.querySelector('[data-marketplace-save-icon]');
        if (!button || !icon) {
            return;
        }

        button.classList.toggle('is-active', saved);
        icon.innerHTML = renderProfileMarketplaceSaveIcon(saved);
    });
};

const initializeProfileMarketplaceCarousel = (carousel) => {
    if (!(carousel instanceof HTMLElement) || carousel.dataset.profileCarouselReady === 'true') {
        return;
    }

    const track = carousel.querySelector('[data-marketplace-carousel-track]');
    const prev = carousel.querySelector('[data-marketplace-carousel-prev]');
    const next = carousel.querySelector('[data-marketplace-carousel-next]');
    if (!(track instanceof HTMLElement)) {
        return;
    }

    const initialSlides = Array.from(track.children).filter((slide) => slide instanceof HTMLElement);
    if (initialSlides.length <= 1) {
        carousel.dataset.profileCarouselReady = 'true';
        return;
    }

    const firstClone = initialSlides[0].cloneNode(true);
    const lastClone = initialSlides[initialSlides.length - 1].cloneNode(true);
    track.insertBefore(lastClone, initialSlides[0]);
    track.appendChild(firstClone);

    const allSlides = Array.from(track.children).filter((slide) => slide instanceof HTMLElement);
    let currentIndex = 1;
    let isAnimating = false;
    let slideWidth = 0;

    const applySlideWidths = () => {
        slideWidth = carousel.getBoundingClientRect().width;
        if (slideWidth <= 0) {
            return;
        }

        track.style.width = `${slideWidth * allSlides.length}px`;
        allSlides.forEach((slide) => {
            slide.style.width = `${slideWidth}px`;
            slide.style.minWidth = `${slideWidth}px`;
            slide.style.maxWidth = `${slideWidth}px`;
            slide.style.flex = `0 0 ${slideWidth}px`;
        });
    };

    const syncPosition = () => {
        if (slideWidth <= 0) {
            return;
        }

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

    const resizeHandler = () => {
        applySlideWidths();
        track.classList.add('is-no-transition');
        syncPosition();
        track.offsetHeight;
        track.classList.remove('is-no-transition');
    };

    window.addEventListener('resize', resizeHandler);
    requestAnimationFrame(() => {
        applySlideWidths();
        syncPosition();
    });

    carousel.dataset.profileCarouselReady = 'true';
};

let profileMarketplaceFallbackExistingImages = [];
let profileMarketplaceFallbackNewImageUrls = [];
let profileMarketplaceFallbackRemovedImages = [];
let profileMarketplaceFallbackStep = 1;
const PROFILE_CUSTOM_BRAND_VALUE = '__custom__';
const PROFILE_CUSTOM_MODEL_VALUE = '__custom_model__';
const profileMarketplaceFallbackBrandSelect = document.querySelector('[data-marketplace-create-brand-select]');
const profileMarketplaceFallbackModelSelect = document.querySelector('[data-marketplace-create-model-select]');
const profileMarketplaceFallbackCatalog = (() => {
    if (!(profileMarketplaceFallbackBrandSelect instanceof HTMLSelectElement)
        || !(profileMarketplaceFallbackModelSelect instanceof HTMLSelectElement)) {
        return [];
    }

    return Array.from(profileMarketplaceFallbackBrandSelect.options)
        .filter((option) => option.value !== '' && option.value !== PROFILE_CUSTOM_BRAND_VALUE)
        .map((option) => ({
            id: option.value,
            name: option.textContent?.trim() || '',
            models: Array.from(profileMarketplaceFallbackModelSelect.options)
                .filter((modelOption) => modelOption.getAttribute('data-brand-id') === option.value)
                .map((modelOption) => ({
                    id: modelOption.value,
                    name: modelOption.textContent?.trim() || '',
                })),
        }));
})();

const buildProfileMarketplaceFallbackOption = (value, label, selected = false) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    option.selected = selected;
    return option;
};

const revokeProfileMarketplaceFallbackImageUrls = () => {
    profileMarketplaceFallbackNewImageUrls.forEach((url) => URL.revokeObjectURL(url));
    profileMarketplaceFallbackNewImageUrls = [];
};

const syncProfileMarketplaceFallbackRemovedImagesInputs = () => {
    const container = document.querySelector('[data-marketplace-removed-images-inputs]');
    if (!(container instanceof HTMLElement)) {
        return;
    }

    container.innerHTML = '';
    profileMarketplaceFallbackRemovedImages.forEach((imagePath) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'removed_image_paths[]';
        input.value = imagePath;
        container.appendChild(input);
    });
};

const getProfileMarketplaceFallbackSteps = () => Array.from(document.querySelectorAll('[data-marketplace-create-step]'))
    .filter((step) => step instanceof HTMLElement);

const setProfileMarketplaceFallbackStep = (stepNumber) => {
    profileMarketplaceFallbackStep = stepNumber;
    getProfileMarketplaceFallbackSteps().forEach((step) => {
        const isActive = Number(step.getAttribute('data-marketplace-create-step')) === stepNumber;
        step.hidden = !isActive;
    });
};

const renderProfileMarketplaceFallbackSummary = (form) => {
    const getFieldValue = (name) => {
        const field = form.elements.namedItem(name);
        if (!(field instanceof HTMLElement)) {
            return '-';
        }

        if (field instanceof HTMLSelectElement) {
            return field.options[field.selectedIndex]?.textContent?.trim() || '-';
        }

        return ('value' in field ? String(field.value || '').trim() : '') || '-';
    };

    document.querySelectorAll('[data-marketplace-summary]').forEach((field) => {
        const key = field.getAttribute('data-marketplace-summary');
        if (!key) {
            return;
        }

        let value = getFieldValue(key);
        if (value !== '-') {
            if (key === 'price_amount') {
                value = `${value} PLN`;
            } else if (key === 'mileage_km') {
                value = `${value} km`;
            } else if (key === 'engine_capacity_cc') {
                value = `${value} cm3`;
            } else if (key === 'power_hp') {
                value = `${value} KM`;
            }
        }

        field.textContent = value;
    });
};

const initializeProfileMarketplaceFallbackNumberInputs = (root = document) => {
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

        if (input.dataset.boundProfileMarketplaceNumberInput !== 'true') {
            input.addEventListener('input', () => {
                input.value = formatNumericValue(input.value);
            });
            input.dataset.boundProfileMarketplaceNumberInput = 'true';
        }

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
        increaseButton.textContent = '+';

        const decreaseButton = document.createElement('button');
        decreaseButton.type = 'button';
        decreaseButton.className = 'vehicle-number-stepper-button';
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

        if (input.form && input.dataset.boundProfileMarketplaceSubmit !== 'true') {
            input.form.addEventListener('submit', () => {
                input.value = normalizeNumericValueForSubmit(input.value);
            });
            input.dataset.boundProfileMarketplaceSubmit = 'true';
        }
    });
};

const syncProfileMarketplaceFallbackPhone = () => {
    const phoneInput = document.querySelector('[name="contact_phone"]');
    if (!(phoneInput instanceof HTMLInputElement)) {
        return;
    }

    const formatPhoneValue = (value) => String(value || '')
        .replace(/\D+/g, '')
        .slice(0, 9)
        .replace(/(\d{3})(?=\d)/g, '$1 ')
        .trim();

    phoneInput.value = formatPhoneValue(phoneInput.value);

    if (phoneInput.dataset.boundProfileMarketplacePhone !== 'true') {
        phoneInput.addEventListener('input', () => {
            phoneInput.value = formatPhoneValue(phoneInput.value);
        });
        phoneInput.addEventListener('blur', () => {
            phoneInput.value = formatPhoneValue(phoneInput.value);
        });
        phoneInput.dataset.boundProfileMarketplacePhone = 'true';
    }
};

const syncProfileMarketplaceFallbackCategoryFields = (payload) => {
    const brandSelect = document.querySelector('[data-marketplace-create-brand-select]');
    const modelSelect = document.querySelector('[data-marketplace-create-model-select]');
    const customBrandField = document.querySelector('[data-marketplace-custom-brand-field]');
    const customModelField = document.querySelector('[data-marketplace-custom-model-field]');
    const customBrandInput = document.querySelector('[data-marketplace-brand-custom]');
    const customModelInput = document.querySelector('[data-marketplace-model-custom]');
    const brandHiddenInput = document.querySelector('[data-marketplace-brand-hidden]');
    const modelHiddenInput = document.querySelector('[data-marketplace-model-hidden]');

    if (!(brandSelect instanceof HTMLSelectElement) || !(modelSelect instanceof HTMLSelectElement)) {
        return;
    }

    brandSelect.disabled = false;
    modelSelect.disabled = false;
    if (customBrandInput instanceof HTMLInputElement) {
        customBrandInput.readOnly = false;
    }
    if (customModelInput instanceof HTMLInputElement) {
        customModelInput.readOnly = false;
    }

    const brandName = String(payload.brand_name || '').trim();
    const modelName = String(payload.model_name || '').trim();
    const brandId = String(payload.brand_id || '');
    const modelId = String(payload.model_id || '');

    const normalize = (value) => String(value || '').trim().toLowerCase();
    const brandEntry = profileMarketplaceFallbackCatalog.find((brand) =>
        brand.id === brandId || normalize(brand.name) === normalize(brandName)
    ) || null;

    brandSelect.innerHTML = '';
    brandSelect.appendChild(buildProfileMarketplaceFallbackOption('', 'Wybierz markę', !brandName));
    profileMarketplaceFallbackCatalog.forEach((brand) => {
        brandSelect.appendChild(buildProfileMarketplaceFallbackOption(
            brand.id,
            brand.name,
            brandEntry !== null && brand.id === brandEntry.id,
        ));
    });
    brandSelect.appendChild(buildProfileMarketplaceFallbackOption(
        PROFILE_CUSTOM_BRAND_VALUE,
        'Inna marka',
        brandName !== '' && brandEntry === null,
    ));

    if (brandEntry !== null) {
        brandSelect.value = brandEntry.id;
        if (customBrandField instanceof HTMLElement) {
            customBrandField.hidden = true;
        }
        if (customBrandInput instanceof HTMLInputElement) {
            customBrandInput.value = '';
        }

        const approvedModel = brandEntry.models.find((model) =>
            model.id === modelId || normalize(model.name) === normalize(modelName)
        ) || null;

        modelSelect.innerHTML = '';
        modelSelect.appendChild(buildProfileMarketplaceFallbackOption('', 'Wybierz model', !modelName));
        brandEntry.models.forEach((model) => {
            const option = buildProfileMarketplaceFallbackOption(
                model.id,
                model.name,
                approvedModel !== null && model.id === approvedModel.id,
            );
            option.setAttribute('data-brand-id', brandEntry.id);
            modelSelect.appendChild(option);
        });
        modelSelect.appendChild(buildProfileMarketplaceFallbackOption(
            PROFILE_CUSTOM_MODEL_VALUE,
            'Inny model',
            modelName !== '' && approvedModel === null,
        ));

        if (approvedModel !== null) {
            modelSelect.value = approvedModel.id;
            if (customModelField instanceof HTMLElement) {
                customModelField.hidden = true;
            }
            if (customModelInput instanceof HTMLInputElement) {
                customModelInput.value = '';
            }

            brandSelect.disabled = true;
            modelSelect.disabled = true;
            if (customBrandInput instanceof HTMLInputElement) {
                customBrandInput.readOnly = false;
            }
            if (customModelInput instanceof HTMLInputElement) {
                customModelInput.readOnly = false;
            }
        } else {
            modelSelect.value = PROFILE_CUSTOM_MODEL_VALUE;
            if (customModelField instanceof HTMLElement) {
                customModelField.hidden = false;
            }
            if (customModelInput instanceof HTMLInputElement) {
                customModelInput.value = modelName;
                customModelInput.readOnly = true;
            }

            brandSelect.disabled = true;
            modelSelect.disabled = true;
            if (customBrandInput instanceof HTMLInputElement) {
                customBrandInput.readOnly = false;
            }
        }
    } else {
        brandSelect.value = PROFILE_CUSTOM_BRAND_VALUE;
        modelSelect.innerHTML = '';

        const customModelOption = document.createElement('option');
        customModelOption.value = PROFILE_CUSTOM_MODEL_VALUE;
        customModelOption.textContent = 'Inny model';
        customModelOption.selected = true;
        modelSelect.appendChild(customModelOption);
        modelSelect.disabled = true;

        if (customBrandField instanceof HTMLElement) {
            customBrandField.hidden = false;
        }
        if (customModelField instanceof HTMLElement) {
            customModelField.hidden = false;
        }
        if (customBrandInput instanceof HTMLInputElement) {
            customBrandInput.value = brandName;
            customBrandInput.readOnly = true;
        }
        if (customModelInput instanceof HTMLInputElement) {
            customModelInput.value = modelName;
            customModelInput.readOnly = true;
        }

        brandSelect.disabled = true;
        modelSelect.disabled = true;
    }

    if (brandHiddenInput instanceof HTMLInputElement) {
        brandHiddenInput.value = brandName;
    }
    if (modelHiddenInput instanceof HTMLInputElement) {
        modelHiddenInput.value = modelName;
    }
};

const validateProfileMarketplaceFallbackStep = (stepNumber) => {
    const step = getProfileMarketplaceFallbackSteps().find(
        (candidate) => Number(candidate.getAttribute('data-marketplace-create-step')) === stepNumber,
    );
    if (!(step instanceof HTMLElement)) {
        return true;
    }

    if (stepNumber === 1) {
        const imageInput = document.querySelector('[data-marketplace-image-input]');
        const newFilesCount = imageInput instanceof HTMLInputElement ? (imageInput.files?.length || 0) : 0;
        if (profileMarketplaceFallbackExistingImages.length + newFilesCount === 0) {
            imageInput?.click();
            return false;
        }
    }

    const fields = step.querySelectorAll('input, select, textarea');
    for (const field of fields) {
        if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) {
            continue;
        }

        if (field.disabled || field.type === 'hidden') {
            continue;
        }

        if (!field.checkValidity()) {
            field.reportValidity();
            return false;
        }
    }

    return true;
};

const renderProfileMarketplaceFallbackGallery = () => {
    const gallery = document.querySelector('[data-marketplace-gallery]');
    const imageInput = document.querySelector('[data-marketplace-image-input]');
    const note = document.querySelector('[data-marketplace-existing-images-note]');
    if (!(gallery instanceof HTMLElement)) {
        return;
    }

    revokeProfileMarketplaceFallbackImageUrls();
    gallery.innerHTML = '';

    profileMarketplaceFallbackExistingImages.forEach((imagePath, index) => {
        const preview = document.createElement('div');
        preview.className = 'cars-add-image-preview';

        const image = document.createElement('img');
        image.className = 'cars-add-image-preview-photo';
        image.src = imagePath;
        image.alt = 'Zdjecie ogloszenia';

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'cars-add-image-remove';
        removeButton.setAttribute('aria-label', `Usun zdjecie ${index + 1}`);
        removeButton.addEventListener('click', () => {
            profileMarketplaceFallbackExistingImages = profileMarketplaceFallbackExistingImages.filter((_, imageIndex) => imageIndex !== index);
            profileMarketplaceFallbackRemovedImages.push(imagePath);
            syncProfileMarketplaceFallbackRemovedImagesInputs();
            renderProfileMarketplaceFallbackGallery();
        });

        preview.appendChild(image);
        preview.appendChild(removeButton);
        gallery.appendChild(preview);
    });

    if (imageInput instanceof HTMLInputElement) {
        Array.from(imageInput.files ?? []).forEach((file, index) => {
            const preview = document.createElement('div');
            preview.className = 'cars-add-image-preview';

            const image = document.createElement('img');
            image.className = 'cars-add-image-preview-photo';
            const objectUrl = URL.createObjectURL(file);
            profileMarketplaceFallbackNewImageUrls.push(objectUrl);
            image.src = objectUrl;
            image.alt = file.name;

            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.className = 'cars-add-image-remove';
            removeButton.setAttribute('aria-label', `Usun zdjecie ${index + 1}`);
            removeButton.addEventListener('click', () => {
                const dataTransfer = new DataTransfer();
                Array.from(imageInput.files ?? []).forEach((currentFile, currentIndex) => {
                    if (currentIndex !== index) {
                        dataTransfer.items.add(currentFile);
                    }
                });
                imageInput.files = dataTransfer.files;
                renderProfileMarketplaceFallbackGallery();
            });

            preview.appendChild(image);
            preview.appendChild(removeButton);
            gallery.appendChild(preview);
        });

        if (profileMarketplaceFallbackExistingImages.length + (imageInput.files?.length || 0) < 12) {
            const picker = document.createElement('button');
            picker.type = 'button';
            picker.className = 'cars-add-image-preview cars-add-image-picker is-placeholder';
            picker.addEventListener('click', () => imageInput.click());

            const placeholder = document.createElement('div');
            placeholder.className = 'cars-add-image-placeholder';
            const placeholderContent = document.createElement('div');
            placeholderContent.className = 'cars-add-image-placeholder-content';
            const plus = document.createElement('div');
            plus.className = 'cars-add-image-placeholder-plus';
            plus.textContent = '+';

            placeholderContent.appendChild(plus);
            placeholder.appendChild(placeholderContent);
            picker.appendChild(placeholder);
            gallery.appendChild(picker);
        }
    }

    if (note instanceof HTMLElement) {
        note.hidden = profileMarketplaceFallbackExistingImages.length === 0;
    }
};

const openProfileMarketplaceEditFallback = (payload) => {
    const backdrop = document.querySelector('[data-marketplace-create-backdrop]');
    const modal = document.querySelector('[data-marketplace-create-modal]');
    const entry = document.querySelector('[data-marketplace-create-entry]');
    const form = document.querySelector('[data-marketplace-create-form]');
    const kicker = document.querySelector('[data-marketplace-create-kicker]');
    const title = document.querySelector('[data-marketplace-create-title]');
    const actionInput = document.querySelector('[data-marketplace-create-action]');
    const editIdInput = document.querySelector('[data-marketplace-edit-id]');
    const submitButton = document.querySelector('[data-marketplace-create-submit]');
    const imageInput = document.querySelector('[data-marketplace-image-input]');

    if (!(backdrop instanceof HTMLElement)
        || !(modal instanceof HTMLElement)
        || !(form instanceof HTMLFormElement)
        || !(actionInput instanceof HTMLInputElement)
        || !(editIdInput instanceof HTMLInputElement)) {
        return;
    }

    form.reset();
    profileMarketplaceFallbackExistingImages = Array.isArray(payload.images) ? payload.images.slice(0, 12) : [];
    profileMarketplaceFallbackRemovedImages = [];
    syncProfileMarketplaceFallbackRemovedImagesInputs();
    const selectedBrandName = String(payload.brand_name || '').trim();
    const selectedModelName = String(payload.model_name || '').trim();

    if (typeof window.syncMarketplaceCategoryFields === 'function') {
        window.syncMarketplaceCategoryFields(selectedBrandName, selectedModelName);
    } else {
        syncProfileMarketplaceFallbackCategoryFields(payload);
    }

    if (kicker instanceof HTMLElement) {
        kicker.textContent = 'Edycja ogloszenia';
    }
    if (title instanceof HTMLElement) {
        title.textContent = 'Edytuj ogloszenie';
    }
    actionInput.value = 'update_listing';
    editIdInput.value = String(payload.id ?? '');
    if (submitButton instanceof HTMLElement) {
        submitButton.textContent = 'Zapisz ogloszenie';
    }
    if (imageInput instanceof HTMLInputElement) {
        imageInput.required = false;
        imageInput.value = '';
    }

    Object.entries(payload).forEach(([key, value]) => {
        if (key === 'id' || key === 'images' || key === 'brand_id' || key === 'model_id') {
            return;
        }

        const field = form.elements.namedItem(key);
        if (!(field instanceof HTMLElement) || !('value' in field)) {
            return;
        }

        field.value = value ?? '';
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
    });

    renderProfileMarketplaceFallbackGallery();
    renderProfileMarketplaceFallbackSummary(form);

    backdrop.hidden = false;
    modal.hidden = false;
    if (entry instanceof HTMLElement) {
        entry.hidden = true;
    }
    form.hidden = false;
    if (typeof window.setMarketplaceCreateStep === 'function') {
        window.setMarketplaceCreateStep(1);
    } else {
        setProfileMarketplaceFallbackStep(1);
    }

    window.requestAnimationFrame(() => {
        if (typeof window.initializeMarketplaceNumberInputs === 'function') {
            window.initializeMarketplaceNumberInputs(modal);
        } else {
            initializeProfileMarketplaceFallbackNumberInputs(modal);
        }

        if (typeof window.syncMarketplaceCategoryFields === 'function') {
            window.syncMarketplaceCategoryFields(selectedBrandName, selectedModelName);
        } else {
            syncProfileMarketplaceFallbackCategoryFields(payload);
        }

        if (typeof window.syncMarketplacePhoneInput === 'function') {
            window.syncMarketplacePhoneInput();
        } else {
            syncProfileMarketplaceFallbackPhone();
        }
    });
};

const closeProfileMarketplaceEditFallback = () => {
    const backdrop = document.querySelector('[data-marketplace-create-backdrop]');
    const modal = document.querySelector('[data-marketplace-create-modal]');
    if (backdrop instanceof HTMLElement) {
        backdrop.hidden = true;
    }
    if (modal instanceof HTMLElement) {
        modal.hidden = true;
    }
    profileMarketplaceFallbackStep = 1;
    profileMarketplaceFallbackRemovedImages = [];
    syncProfileMarketplaceFallbackRemovedImagesInputs();
    revokeProfileMarketplaceFallbackImageUrls();
};

const bindProfileMarketplaceFallbackWizard = () => {
    document.querySelectorAll('[data-close-marketplace-create]').forEach((button) => {
        if (!(button instanceof HTMLElement) || button.dataset.boundProfileMarketplaceClose === 'true') {
            return;
        }

        button.addEventListener('click', (event) => {
            event.preventDefault();
            closeProfileMarketplaceEditFallback();
        });

        button.dataset.boundProfileMarketplaceClose = 'true';
    });

    const backdrop = document.querySelector('[data-marketplace-create-backdrop]');
    if (backdrop instanceof HTMLElement && backdrop.dataset.boundProfileMarketplaceBackdrop !== 'true') {
        backdrop.addEventListener('click', (event) => {
            if (event.target === backdrop) {
                closeProfileMarketplaceEditFallback();
            }
        });
        backdrop.dataset.boundProfileMarketplaceBackdrop = 'true';
    }

    document.querySelectorAll('[data-marketplace-step-next]').forEach((button) => {
        if (!(button instanceof HTMLButtonElement) || button.dataset.boundProfileMarketplaceNext === 'true') {
            return;
        }

        button.addEventListener('click', () => {
            const currentStep = Number(button.getAttribute('data-marketplace-step-current') || profileMarketplaceFallbackStep);
            if (!validateProfileMarketplaceFallbackStep(currentStep)) {
                return;
            }

            if (currentStep === 4) {
                const form = document.querySelector('[data-marketplace-create-form]');
                if (form instanceof HTMLFormElement) {
                    renderProfileMarketplaceFallbackSummary(form);
                }
            }

            setProfileMarketplaceFallbackStep(Math.min(5, currentStep + 1));
        });

        button.dataset.boundProfileMarketplaceNext = 'true';
    });

    document.querySelectorAll('[data-marketplace-step-prev]').forEach((button) => {
        if (!(button instanceof HTMLButtonElement) || button.dataset.boundProfileMarketplacePrev === 'true') {
            return;
        }

        button.addEventListener('click', () => {
            setProfileMarketplaceFallbackStep(Math.max(1, profileMarketplaceFallbackStep - 1));
        });

        button.dataset.boundProfileMarketplacePrev = 'true';
    });

    const imageInput = document.querySelector('[data-marketplace-image-input]');
    if (imageInput instanceof HTMLInputElement && imageInput.dataset.boundProfileMarketplaceImages !== 'true') {
        imageInput.addEventListener('change', () => {
            renderProfileMarketplaceFallbackGallery();
        });
        imageInput.dataset.boundProfileMarketplaceImages = 'true';
    }
};

const bindProfileMarketplaceCreateForm = () => {
    const form = document.querySelector('[data-marketplace-create-form]');
    if (!(form instanceof HTMLFormElement) || form.dataset.boundProfileMarketplaceCreate === 'true') {
        return;
    }

    form.addEventListener('submit', async (event) => {
        if (!isProfilePage) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        for (let step = 1; step <= 4; step += 1) {
            if (!validateProfileMarketplaceFallbackStep(step)) {
                setProfileMarketplaceFallbackStep(step);
                return;
            }
        }

        const formData = new FormData(form);
        const action = String(formData.get('action') || 'create_listing');
        const endpoint = form.getAttribute('action') || '/marketplace';

        try {
            const response = await fetch(endpoint, {
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

            const listingId = String(payload.listing_id || formData.get('listing_id') || '');
            const existingModal = listingId !== '' ? document.getElementById(`marketplace-details-modal-${listingId}`) : null;
            existingModal?.remove();

            if (typeof payload.html === 'string' && payload.html !== '') {
                const wrapper = document.createElement('div');
                wrapper.innerHTML = payload.html;
                bindProfileMarketplaceChunk(wrapper);

                const nextListing = wrapper.querySelector('.marketplace-listing');
                if (!(nextListing instanceof HTMLElement)) {
                    throw new Error('Invalid listing markup');
                }

                const currentListing = listingId !== '' ? document.getElementById(`listing-${listingId}`) : null;
                if (currentListing instanceof HTMLElement) {
                    currentListing.replaceWith(nextListing);
                } else {
                    const feedRoot = document.querySelector('.community-profile-feed');
                    if (feedRoot instanceof HTMLElement) {
                        const emptyState = feedRoot.querySelector('.community-empty, .marketplace-empty');
                        emptyState?.remove();
                        feedRoot.prepend(nextListing);
                    }
                }
            }

            closeProfileMarketplaceEditFallback();
            if (typeof window.showAppToast === 'function') {
                window.showAppToast(
                    payload.message || (action === 'update_listing' ? 'Ogloszenie zostalo zaktualizowane.' : 'Ogloszenie zostalo opublikowane.'),
                    'success',
                );
            }
        } catch {
            form.submit();
        }
    }, true);

    form.dataset.boundProfileMarketplaceCreate = 'true';
};

const bindProfileMarketplaceChunk = (root = document) => {
    if (!(root instanceof Element || root instanceof Document)) {
        return;
    }

    const interactionRoot = document;

    root.querySelectorAll('[data-marketplace-details-modal]').forEach((modal) => {
        if (modal.parentElement !== document.body) {
            document.body.appendChild(modal);
        }
    });

    document.querySelectorAll('[data-marketplace-contact-toggle]').forEach((button) => {
        if (button instanceof HTMLElement && button.hasAttribute('onclick')) {
            button.removeAttribute('onclick');
        }
    });

    bindProfileMarketplaceFallbackWizard();
    bindProfileMarketplaceCreateForm();

    root.querySelectorAll('[data-marketplace-carousel]').forEach((carousel) => {
        initializeProfileMarketplaceCarousel(carousel);
    });

    interactionRoot.querySelectorAll('[data-marketplace-save-form]').forEach((form) => {
        if (!(form instanceof HTMLFormElement) || form.dataset.boundProfileSave === 'true') {
            return;
        }

        form.addEventListener('click', (event) => {
            event.stopPropagation();
        });

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            event.stopPropagation();

            const confirmMessage = form.getAttribute('data-marketplace-confirm-message');
            if (confirmMessage && !window.confirm(confirmMessage)) {
                return;
            }

            const formData = new FormData(form);
            const endpoint = form.getAttribute('action') || '/marketplace';
            const listingId = String(form.getAttribute('data-marketplace-listing-id') || formData.get('listing_id') || '');

            try {
                const response = await fetch(endpoint, {
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

                syncProfileMarketplaceSaveState(listingId, Boolean(payload.saved_by_current_user));
            } catch {
                form.submit();
            }
        });

        form.dataset.boundProfileSave = 'true';
    });

    interactionRoot.querySelectorAll('[data-marketplace-report-form]').forEach((form) => {
        if (!(form instanceof HTMLFormElement) || form.dataset.boundProfileReport === 'true') {
            return;
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            event.stopPropagation();

            const confirmed = typeof window.openMarketplaceConfirmModal === 'function'
                ? await window.openMarketplaceConfirmModal({
                    kicker: 'Usuwanie ogłoszenia',
                    title: 'Usunąć ogłoszenie?',
                    message: 'Usunięcie ogłoszenia skasuje je na stałe wraz z jego zdjęciami. Tej operacji nie da się cofnąć.',
                    confirmLabel: 'Usuń ogłoszenie',
                    tone: 'danger',
                })
                : window.confirm('Czy na pewno chcesz usunąć to ogłoszenie?');
            if (!confirmed) {
                return;
            }

            const formData = new FormData(form);
            const endpoint = form.getAttribute('action') || '/marketplace';

            try {
                const response = await fetch(endpoint, {
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

                if (typeof window.showAppToast === 'function') {
                    window.showAppToast(payload.message || 'Ogloszenie zostalo zgloszone.', 'success');
                }
                closeProfileMarketplaceMenus();
            } catch {
                form.submit();
            }
        });

        form.dataset.boundProfileReport = 'true';
    });

    interactionRoot.querySelectorAll('[data-marketplace-delete-form]').forEach((form) => {
        if (!(form instanceof HTMLFormElement) || form.dataset.boundProfileDelete === 'true') {
            return;
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            event.stopPropagation();

            const action = String(form.querySelector('input[name="action"]')?.value || '');
            const confirmed = typeof window.openMarketplaceConfirmModal === 'function'
                ? await window.openMarketplaceConfirmModal(action === 'resume_listing'
                    ? {
                        kicker: 'Zmiana statusu',
                        title: 'Wznowić ogłoszenie?',
                        message: 'Ogłoszenie znowu będzie widoczne w marketplace i na Twoim profilu jako aktywne.',
                        confirmLabel: 'Wznów ogłoszenie',
                        tone: 'muted',
                    }
                    : {
                        kicker: 'Zmiana statusu',
                        title: 'Zakończyć ogłoszenie?',
                        message: 'Ogłoszenie zniknie z marketplace i z profili innych użytkowników, ale nadal będzie widoczne na Twoim profilu.',
                        confirmLabel: 'Zakończ ogłoszenie',
                        tone: 'muted',
                    })
                : window.confirm(form.getAttribute('data-marketplace-confirm-message') || 'Czy na pewno chcesz zmienić status ogłoszenia?');
            if (!confirmed) {
                return;
            }

            const formData = new FormData(form);
            const endpoint = form.getAttribute('action') || '/marketplace';
            const listingId = String(formData.get('listing_id') || '');

            try {
                const response = await fetch(endpoint, {
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
                document.querySelectorAll(`#marketplace-details-modal-${listingId}`).forEach((element) => element.remove());
                if (typeof window.showAppToast === 'function') {
                    window.showAppToast(payload.message || 'Ogloszenie zostalo usuniete.', 'success');
                }
                closeProfileMarketplaceMenus();
            } catch {
                form.submit();
            }
        });

        form.dataset.boundProfileDelete = 'true';
    });

    interactionRoot.querySelectorAll('[data-marketplace-visibility-form]').forEach((form) => {
        if (!(form instanceof HTMLFormElement) || form.dataset.boundProfileVisibility === 'true') {
            return;
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            event.stopPropagation();

            const formData = new FormData(form);
            const endpoint = form.getAttribute('action') || '/marketplace';
            const listingId = String(formData.get('listing_id') || '');
            const currentVisibility = new URL(window.location.href).searchParams.get('listing_visibility') || 'all';

            try {
                const response = await fetch(endpoint, {
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

                document.querySelectorAll(`#marketplace-details-modal-${listingId}`).forEach((element) => element.remove());

                const shouldKeepVisible = currentVisibility === 'all'
                    || (currentVisibility === 'active' && payload.is_active)
                    || (currentVisibility === 'ended' && !payload.is_active);

                if (shouldKeepVisible && typeof payload.html === 'string' && payload.html !== '') {
                    const wrapper = document.createElement('div');
                    wrapper.innerHTML = payload.html;
                    bindProfileMarketplaceChunk(wrapper);

                    const nextListing = wrapper.querySelector(`#listing-${listingId}`);
                    const currentListing = document.querySelector(`#listing-${listingId}`);
                    if (nextListing instanceof HTMLElement && currentListing instanceof HTMLElement) {
                        currentListing.replaceWith(nextListing);
                        bindProfileMarketplaceChunk(nextListing.parentElement ?? nextListing);
                    } else {
                        document.querySelectorAll(`#listing-${listingId}`).forEach((element) => element.remove());
                    }
                } else {
                    document.querySelectorAll(`#listing-${listingId}`).forEach((element) => element.remove());
                }

                if (typeof window.showAppToast === 'function') {
                    window.showAppToast(payload.message || (payload.is_active ? 'Ogłoszenie zostało wznowione.' : 'Ogłoszenie zostało zakończone.'), 'success');
                }
                closeProfileMarketplaceMenus();
            } catch {
                form.submit();
            }
        });

        form.dataset.boundProfileVisibility = 'true';
    });
};

const reinitializeProfileActivityChunk = (root = document) => {
    if (typeof window.initializeCommunityFeedChunk === 'function') {
        window.initializeCommunityFeedChunk(root);
    }

    bindProfileMarketplaceChunk(root);
};

const loadProfileActivityChunk = async (url) => {
    const currentRoot = document.querySelector('[data-profile-activity-root]');
    if (!(currentRoot instanceof HTMLElement)) {
        window.location.href = url;
        return;
    }

    closeProfileTransientUi();

    const response = await fetch(url, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
        },
    });

    if (!response.ok) {
        throw new Error('Request failed');
    }

    const html = await response.text();
    const parser = new DOMParser();
    const parsed = parser.parseFromString(html, 'text/html');
    const nextRoot = parsed.querySelector('[data-profile-activity-root]');

    if (!(nextRoot instanceof HTMLElement)) {
        throw new Error('Invalid payload');
    }

    currentRoot.replaceWith(nextRoot);
    reinitializeProfileActivityChunk(nextRoot);
    window.requestAnimationFrame(() => reinitializeProfileActivityChunk(nextRoot));
    window.history.replaceState({}, '', url);
};

if (isProfilePage) {
    reinitializeProfileActivityChunk(document.querySelector('[data-profile-activity-root]') ?? document);

    document.addEventListener('click', (event) => {
        const target = event.target instanceof Element ? event.target : null;
        if (!target) {
            return;
        }

        const profileActivityLink = target.closest('[data-profile-activity-link]');
        if (profileActivityLink instanceof HTMLAnchorElement) {
            event.preventDefault();
            loadProfileActivityChunk(profileActivityLink.href).catch(() => {
                window.location.href = profileActivityLink.href;
            });
            return;
        }

        const menuTrigger = target.closest('[data-marketplace-menu-trigger]');
        if (menuTrigger && menuTrigger.closest('.profile-page, [data-marketplace-details-modal]')) {
            event.preventDefault();
            event.stopPropagation();

            const menu = menuTrigger.closest('[data-marketplace-menu]');
            const dropdown = menu?.querySelector('[data-marketplace-menu-dropdown]');
            if (!menu || !dropdown) {
                return;
            }

            const isOpen = menuTrigger.getAttribute('aria-expanded') === 'true';
            closeProfileMarketplaceMenus(isOpen ? null : menu);
            menuTrigger.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
            dropdown.hidden = isOpen;
            return;
        }

        const editTrigger = target.closest('[data-marketplace-edit-trigger]');
        if (editTrigger && editTrigger.closest('.profile-page, [data-marketplace-details-modal]')) {
            event.preventDefault();
            event.stopPropagation();

            const payloadRaw = editTrigger.getAttribute('data-marketplace-edit-payload');
            if (!payloadRaw) {
                return;
            }

            try {
                const payload = JSON.parse(payloadRaw);
                closeProfileMarketplaceMenus();

                const detailsModal = editTrigger.closest('[data-marketplace-details-modal]');
                if (detailsModal instanceof HTMLElement) {
                    detailsModal.hidden = true;
                }

                openProfileMarketplaceEditFallback(payload);
            } catch {
                return;
            }
            return;
        }

        const detailsCloser = target.closest('[data-close-marketplace-details]');
        if (detailsCloser && detailsCloser.closest('[data-marketplace-details-modal]')) {
            event.preventDefault();
            const modal = detailsCloser.closest('[data-marketplace-details-modal]');
            if (modal instanceof HTMLElement) {
                modal.hidden = true;
            }
            return;
        }

        const detailsOpener = target.closest('[data-open-marketplace-details]');
        if (detailsOpener
            && detailsOpener.closest('.profile-page')
            && !target.closest('[data-marketplace-save-form]')
            && !target.closest('[data-marketplace-menu]')
            && !target.closest('[data-marketplace-carousel-prev]')
            && !target.closest('[data-marketplace-carousel-next]')
            && !target.closest('[data-marketplace-contact-toggle]')
            && !target.closest('.marketplace-details-seller-link')) {
            event.preventDefault();

            const modalId = detailsOpener.getAttribute('data-marketplace-details-id');
            if (!modalId) {
                return;
            }

            const modal = document.getElementById(modalId);
            if (!(modal instanceof HTMLElement)) {
                return;
            }

            modal.hidden = false;
            modal.querySelectorAll('[data-marketplace-carousel]').forEach((carousel) => {
                initializeProfileMarketplaceCarousel(carousel);
            });
            return;
        }

        const contactToggle = target.closest('[data-marketplace-contact-toggle]');
        if (contactToggle && contactToggle.closest('.profile-page, [data-marketplace-details-modal]')) {
            event.preventDefault();
            event.stopPropagation();

            const contactWrapper = contactToggle.closest('.marketplace-details-contact');
            const card = contactWrapper?.querySelector('[data-marketplace-contact-card]');
            if (!(card instanceof HTMLElement) || !(contactToggle instanceof HTMLButtonElement)) {
                return;
            }

            const shouldShow = card.hidden;
            card.hidden = !shouldShow;
            contactToggle.textContent = shouldShow ? 'Ukryj dane kontaktowe' : 'Sprawdź dane kontaktowe';
            return;
        }
    });
}
