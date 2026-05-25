document.body.classList.add('is-marketplace-page');

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
const marketplaceCreateForm = document.querySelector('[data-marketplace-create-form]');
const marketplaceCreateSteps = Array.from(document.querySelectorAll('[data-marketplace-create-step]'));
const marketplaceCreateNextButtons = document.querySelectorAll('[data-marketplace-step-next]');
const marketplaceCreatePrevButtons = document.querySelectorAll('[data-marketplace-step-prev]');
const marketplaceSummaryFields = document.querySelectorAll('[data-marketplace-summary]');

let editableMarketplaceFiles = [];
let marketplaceCurrentStep = 1;

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

document.querySelectorAll('.marketplace-brand-select').forEach((brandSelect) => {
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

    if (editableMarketplaceFiles.length === 0) {
        marketplaceGallery.appendChild(buildMarketplaceImagePlaceholder());
        marketplaceGallery.appendChild(buildMarketplaceImagePlaceholder());
    } else if (editableMarketplaceFiles.length < 12) {
        marketplaceGallery.appendChild(buildMarketplaceImagePlaceholder());
    }
};

const initializeMarketplaceNumberInputs = (root = document) => {
    const numberInputs = root.querySelectorAll('input[data-marketplace-number]:not([readonly])');

    const parseNumericValue = (value) => {
        const digits = String(value ?? '').replace(/\s+/g, '').replace(/[^\d]/g, '');
        return digits === '' ? 0 : Number.parseInt(digits, 10);
    };

    const formatNumericValue = (value) => {
        const digits = String(value ?? '').replace(/\s+/g, '').replace(/[^\d]/g, '');
        if (digits === '') {
            return '';
        }

        return Number.parseInt(digits, 10).toLocaleString('pl-PL');
    };

    numberInputs.forEach((input) => {
        if (input.parentElement?.classList.contains('vehicle-number-input')) {
            input.value = formatNumericValue(input.value);
            return;
        }

        input.value = formatNumericValue(input.value);

        input.addEventListener('input', () => {
            const cursorFromEnd = input.value.length - input.selectionStart;
            input.value = formatNumericValue(input.value);
            const nextPosition = Math.max(0, input.value.length - cursorFromEnd);
            input.setSelectionRange(nextPosition, nextPosition);
        });

        input.addEventListener('blur', () => {
            input.value = formatNumericValue(input.value);
        });

        if (input.form && input.dataset.boundMarketplaceSubmit !== 'true') {
            input.form.addEventListener('submit', () => {
                input.value = String(parseNumericValue(input.value));
            });
            input.dataset.boundMarketplaceSubmit = 'true';
        }

        if (input.parentElement?.classList.contains('vehicle-currency-field')) {
            const currencyWrapper = input.parentElement;
            const numberWrapper = document.createElement('div');
            numberWrapper.className = 'vehicle-number-input';
            currencyWrapper.insertBefore(numberWrapper, input);
            numberWrapper.appendChild(input);
        } else {
            const wrapper = document.createElement('div');
            wrapper.className = 'vehicle-number-input';
            input.parentNode.insertBefore(wrapper, input);
            wrapper.appendChild(input);
        }

        const stepValue = Number.parseInt(String(input.getAttribute('step') || '1'), 10) || 1;
        const minValue = Number.parseInt(String(input.getAttribute('min') || '0'), 10) || 0;
        const wrapper = input.parentElement;
        if (!wrapper) {
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
            const nextValue = parseNumericValue(input.value) + stepValue;
            input.value = formatNumericValue(nextValue);
            dispatchInputEvents();
        });

        decreaseButton.addEventListener('click', () => {
            const nextValue = Math.max(minValue, parseNumericValue(input.value) - stepValue);
            input.value = formatNumericValue(nextValue);
            dispatchInputEvents();
        });

        stepper.appendChild(increaseButton);
        stepper.appendChild(decreaseButton);
        wrapper.appendChild(stepper);
    });
};

const getMarketplaceCreateStepElement = (stepNumber) => marketplaceCreateSteps.find(
    (step) => Number(step.getAttribute('data-marketplace-create-step')) === stepNumber
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
    activeStep?.querySelector('input, select, textarea, button')?.focus({preventScroll: true});
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

    if (stepNumber === 1 && editableMarketplaceFiles.length === 0) {
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

const openMarketplaceCreateModal = () => {
    if (!marketplaceCreateBackdrop || !marketplaceCreateModal) {
        return;
    }

    setMarketplaceCreateStep(1);
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

marketplaceOpenCreateButtons.forEach((button) => {
    button.addEventListener('click', () => {
        marketplaceCreateForm?.reset();
        editableMarketplaceFiles = [];
        syncMarketplaceImagesInput();
        renderMarketplaceGallery();
        initializeMarketplaceNumberInputs(marketplaceCreateModal);
        marketplaceCreateModal?.querySelectorAll('.marketplace-brand-select').forEach((brandSelect) => {
            brandSelect.dispatchEvent(new Event('change'));
        });
        openMarketplaceCreateModal();
    });
});

marketplaceCreateNextButtons.forEach((button) => {
    button.addEventListener('click', () => {
        if (!validateMarketplaceCreateStep(marketplaceCurrentStep)) {
            return;
        }

        const nextStep = marketplaceCurrentStep + 1;
        if (nextStep === 5) {
            syncMarketplaceCreateSummary();
        }

        setMarketplaceCreateStep(nextStep);
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

marketplaceCreateForm?.addEventListener('submit', (event) => {
    for (let step = 1; step <= 4; step += 1) {
        if (!validateMarketplaceCreateStep(step)) {
            event.preventDefault();
            setMarketplaceCreateStep(step);
            return;
        }
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

const bindMarketplaceSaveForms = (root) => {
    root.querySelectorAll('[data-marketplace-save-form]').forEach((form) => {
        if (form.dataset.boundSave === 'true') {
            return;
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const button = form.querySelector('[data-marketplace-save-button]');
            const icon = form.querySelector('[data-marketplace-save-icon]');

            if (!button || !icon) {
                form.submit();
                return;
            }

            const formData = new FormData(form);

            try {
                const response = await fetch(window.location.pathname + window.location.search, {
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

                button.classList.toggle('is-active', Boolean(payload.saved_by_current_user));
                icon.innerHTML = renderMarketplaceSaveIcon(Boolean(payload.saved_by_current_user));
            } catch {
                form.submit();
            }
        });

        form.dataset.boundSave = 'true';
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
            const card = button.parentElement?.querySelector('[data-marketplace-contact-card]');
            if (!card) {
                return;
            }

            const isHidden = card.hidden;
            card.hidden = !isHidden;
            button.textContent = isHidden ? 'Ukryj dane kontaktowe' : 'Sprawdź dane kontaktowe';
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
    bindMarketplaceDetailModals(root);
    bindMarketplaceDetailOpeners(root);
    bindMarketplaceContactToggles(root);
};

document.addEventListener('click', (event) => {
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

renderMarketplaceGallery();
setMarketplaceCreateStep(1);
initializeMarketplaceNumberInputs(document);
initializeMarketplaceChunk(document);
