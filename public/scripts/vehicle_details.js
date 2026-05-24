let vehicleDetailsAbortController = null;

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

const refreshVehicleDetailsContent = async (refreshUrl) => {
    const response = await fetch(refreshUrl, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
        },
    });

    if (!response.ok) {
        throw new Error('Nie udało się odświeżyć widoku pojazdu.');
    }

    const html = await response.text();
    const parser = new DOMParser();
    const documentFragment = parser.parseFromString(html, 'text/html');
    const nextContent = documentFragment.querySelector('.content');
    const currentContent = document.querySelector('.content');

    if (!nextContent || !currentContent) {
        throw new Error('Nie udało się odświeżyć zawartości pojazdu.');
    }

    currentContent.replaceWith(nextContent);
    window.initVehicleDetailsPage();
};

window.initVehicleDetailsPage = () => {
    vehicleDetailsAbortController?.abort();
    vehicleDetailsAbortController = new AbortController();
    const { signal } = vehicleDetailsAbortController;

    const modalRoot = document.querySelector('[data-vehicle-modal-root]');

    if (!modalRoot) {
        return;
    }

    const panels = Array.from(modalRoot.querySelectorAll('[data-modal-panel]'));
    const openButtons = document.querySelectorAll('[data-modal-open]');
    const closeButtons = modalRoot.querySelectorAll('[data-vehicle-modal-close]');
    const scrim = modalRoot.querySelector('[data-vehicle-modal-scrim]');
    const serviceForm = modalRoot.querySelector('[data-modal-panel="modal-service-add"] form');
    const heroMenu = document.querySelector('[data-hero-menu]');
    const heroMenuTrigger = document.querySelector('[data-hero-menu-trigger]');
    const heroMenuDropdown = document.querySelector('[data-hero-menu-dropdown]');
    const imagesEditGallery = modalRoot.querySelector('[data-vehicle-images-gallery]');
    const imagesEditInput = modalRoot.querySelector('[data-vehicle-images-input]');
    const heroCarousel = document.querySelector('[data-hero-carousel]');
    const heroCarouselTrack = document.querySelector('[data-hero-carousel-track]');
    const heroCarouselPrev = document.querySelector('[data-hero-carousel-prev]');
    const heroCarouselNext = document.querySelector('[data-hero-carousel-next]');

    let activePanel = null;
    let initialEditableExistingImages = [];
    let editableExistingImages = [];
    let editableNewFiles = [];

    const syncImagesEditInput = () => {
        if (!imagesEditInput) {
            return;
        }

        const transfer = new DataTransfer();
        editableNewFiles.forEach((file) => transfer.items.add(file));
        imagesEditInput.files = transfer.files;
    };

    const countEditableImages = () => editableExistingImages.length + editableNewFiles.length;

    const openImagesEditPicker = () => {
        if (imagesEditInput && countEditableImages() < 10) {
            imagesEditInput.click();
        }
    };

    const closeHeroMenu = () => {
        if (!heroMenuTrigger || !heroMenuDropdown) {
            return;
        }

        heroMenuTrigger.setAttribute('aria-expanded', 'false');
        heroMenuDropdown.hidden = true;
    };

    const toggleHeroMenu = () => {
        if (!heroMenuTrigger || !heroMenuDropdown) {
            return;
        }

        const isOpen = heroMenuTrigger.getAttribute('aria-expanded') === 'true';
        heroMenuTrigger.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
        heroMenuDropdown.hidden = isOpen;
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
        const nextPanel = panels.find((panel) => panel.dataset.modalPanel === panelName);

        if (!nextPanel) {
            return;
        }

        if (panelName === 'modal-images-edit') {
            initializeImagesEditState();
        }

        closeHeroMenu();
        panels.forEach((panel) => {
            panel.hidden = true;
        });

        activePanel = nextPanel;
        activePanel.hidden = false;
        modalRoot.hidden = false;
        document.body.classList.add('vehicle-modal-open');
    };

    const buildImagePlaceholder = () => {
        const placeholderButton = document.createElement('button');
        placeholderButton.type = 'button';
        placeholderButton.className = 'vehicle-images-edit-card vehicle-images-edit-card-placeholder';
        placeholderButton.setAttribute('aria-label', 'Dodaj zdjęcie pojazdu');
        placeholderButton.addEventListener('click', openImagesEditPicker, { signal });

        const placeholder = document.createElement('div');
        placeholder.className = 'vehicle-images-edit-placeholder';

        const placeholderContent = document.createElement('div');
        placeholderContent.className = 'vehicle-images-edit-placeholder-content';

        const plus = document.createElement('div');
        plus.className = 'vehicle-images-edit-placeholder-plus';
        plus.textContent = '+';

        placeholderContent.appendChild(plus);
        placeholder.appendChild(placeholderContent);
        placeholderButton.appendChild(placeholder);

        return placeholderButton;
    };

    const renderImagesEditGallery = () => {
        if (!imagesEditGallery) {
            return;
        }

        imagesEditGallery.innerHTML = '';

        editableExistingImages.forEach((image, index) => {
            const card = document.createElement('div');
            card.className = 'vehicle-images-edit-card';

            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'existing_image_ids[]';
            input.value = String(image.id);

            const photo = document.createElement('img');
            photo.className = 'vehicle-images-edit-photo';
            photo.src = image.path;
            photo.alt = `Zdjęcie pojazdu ${index + 1}`;

            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.className = 'vehicle-images-edit-remove';
            removeButton.setAttribute('aria-label', `Usuń zdjęcie ${index + 1}`);
            removeButton.addEventListener('click', () => {
                editableExistingImages = editableExistingImages.filter((_, imageIndex) => imageIndex !== index);
                renderImagesEditGallery();
            }, { signal });

            card.appendChild(input);
            card.appendChild(photo);
            card.appendChild(removeButton);
            imagesEditGallery.appendChild(card);
        });

        editableNewFiles.forEach((file, index) => {
            const overallIndex = editableExistingImages.length + index;
            const card = document.createElement('div');
            card.className = 'vehicle-images-edit-card';

            const photo = document.createElement('img');
            photo.className = 'vehicle-images-edit-photo';
            photo.alt = `Nowe zdjęcie pojazdu ${overallIndex + 1}`;

            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.className = 'vehicle-images-edit-remove';
            removeButton.setAttribute('aria-label', `Usuń nowe zdjęcie ${overallIndex + 1}`);
            removeButton.addEventListener('click', () => {
                editableNewFiles = editableNewFiles.filter((_, fileIndex) => fileIndex !== index);
                syncImagesEditInput();
                renderImagesEditGallery();
            }, { signal });

            const reader = new FileReader();
            reader.onload = () => {
                photo.src = String(reader.result ?? '');
            };
            reader.readAsDataURL(file);

            card.appendChild(photo);
            card.appendChild(removeButton);
            imagesEditGallery.appendChild(card);
        });

        if (countEditableImages() < 10) {
            imagesEditGallery.appendChild(buildImagePlaceholder());
        }
    };

    const initializeImagesEditState = () => {
        if (!imagesEditGallery) {
            return;
        }

        editableExistingImages = initialEditableExistingImages.map((image) => ({ ...image }));
        editableNewFiles = [];
        syncImagesEditInput();
        renderImagesEditGallery();
    };

    const captureInitialImagesEditState = () => {
        if (!imagesEditGallery) {
            return;
        }

        initialEditableExistingImages = Array.from(imagesEditGallery.querySelectorAll('[data-vehicle-image-existing]')).map((card) => ({
            id: Number(card.dataset.imageId || 0),
            path: String(card.dataset.imagePath || ''),
        })).filter((image) => image.id > 0 && image.path !== '');
    };

    const initializeHeroCarousel = () => {
        if (!heroCarousel || !heroCarouselTrack) {
            return;
        }

        const initialSlides = Array.from(heroCarouselTrack.children);
        if (initialSlides.length <= 1) {
            return;
        }

        const firstClone = initialSlides[0].cloneNode(true);
        const lastClone = initialSlides[initialSlides.length - 1].cloneNode(true);
        heroCarouselTrack.insertBefore(lastClone, initialSlides[0]);
        heroCarouselTrack.appendChild(firstClone);
        const allSlides = Array.from(heroCarouselTrack.children);

        let currentIndex = 1;
        let isAnimating = false;
        let slideWidth = heroCarousel.getBoundingClientRect().width;

        const applySlideWidths = () => {
            slideWidth = heroCarousel.getBoundingClientRect().width;
            heroCarouselTrack.style.width = `${slideWidth * allSlides.length}px`;

            allSlides.forEach((slide) => {
                slide.style.width = `${slideWidth}px`;
                slide.style.minWidth = `${slideWidth}px`;
                slide.style.maxWidth = `${slideWidth}px`;
                slide.style.flex = `0 0 ${slideWidth}px`;
            });
        };

        const syncPosition = () => {
            heroCarouselTrack.style.transform = `translateX(-${currentIndex * slideWidth}px)`;
        };

        const moveToIndex = (nextIndex) => {
            if (isAnimating) {
                return;
            }

            isAnimating = true;
            currentIndex = nextIndex;
            syncPosition();
        };

        heroCarouselTrack.addEventListener('transitionend', () => {
            const totalSlides = initialSlides.length;

            if (currentIndex === 0) {
                heroCarouselTrack.classList.add('is-no-transition');
                currentIndex = totalSlides;
                syncPosition();
                heroCarouselTrack.offsetHeight;
                heroCarouselTrack.classList.remove('is-no-transition');
            } else if (currentIndex === totalSlides + 1) {
                heroCarouselTrack.classList.add('is-no-transition');
                currentIndex = 1;
                syncPosition();
                heroCarouselTrack.offsetHeight;
                heroCarouselTrack.classList.remove('is-no-transition');
            }

            isAnimating = false;
        }, { signal });

        heroCarouselPrev?.addEventListener('click', () => moveToIndex(currentIndex - 1), { signal });
        heroCarouselNext?.addEventListener('click', () => moveToIndex(currentIndex + 1), { signal });

        window.addEventListener('resize', () => {
            applySlideWidths();
            heroCarouselTrack.classList.add('is-no-transition');
            syncPosition();
            heroCarouselTrack.offsetHeight;
            heroCarouselTrack.classList.remove('is-no-transition');
        }, { signal });

        requestAnimationFrame(() => {
            applySlideWidths();
            syncPosition();
        });
    };

    const enhanceNumberInputs = () => {
        const numberInputs = modalRoot.querySelectorAll('.vehicle-modal-field input[type="number"]:not([readonly])');

        numberInputs.forEach((input) => {
            if (input.parentElement?.classList.contains('vehicle-number-input')) {
                return;
            }

            const wrapper = document.createElement('div');
            wrapper.className = 'vehicle-number-input';
            input.parentNode.insertBefore(wrapper, input);
            wrapper.appendChild(input);

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
                input.stepUp();
                dispatchInputEvents();
            }, { signal });

            decreaseButton.addEventListener('click', () => {
                input.stepDown();
                dispatchInputEvents();
            }, { signal });

            stepper.appendChild(increaseButton);
            stepper.appendChild(decreaseButton);
            wrapper.appendChild(stepper);
        });
    };

    const handleVehicleAjaxSuccess = async (payload) => {
        if (payload.redirect) {
            showAppToast(payload.message || 'Zapisano.', 'success');
            window.setTimeout(() => {
                window.location.href = payload.redirect;
            }, 180);
            return;
        }

        closeModal();
        if (payload.message) {
            showAppToast(payload.message, 'success');
        }

        await refreshVehicleDetailsContent(payload.refresh_url || window.location.pathname + window.location.search);
    };

    const bindVehicleAjaxForms = () => {
        const forms = modalRoot.querySelectorAll('form[method="post"], form:not([method])');

        forms.forEach((form) => {
            form.addEventListener('submit', async (event) => {
                event.preventDefault();

                try {
                    const response = await fetch(form.action || (window.location.pathname + window.location.search), {
                        method: 'POST',
                        body: new FormData(form),
                        headers: {
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                    });
                    const payload = await response.json();

                    if (!response.ok || payload.success === false) {
                        showAppToast(payload.message || 'Nie udało się zapisać zmian.', 'error');
                        return;
                    }

                    await handleVehicleAjaxSuccess(payload);
                } catch (error) {
                    showAppToast('Nie udało się zapisać zmian. Spróbuj ponownie.', 'error');
                }
            }, { signal });
        });
    };

    openButtons.forEach((button) => {
        button.addEventListener('click', () => {
            if (button.dataset.modalOpen === 'modal-service-add' && serviceForm) {
                serviceForm.reset();

                const sourceTaskInput = serviceForm.querySelector('input[name="source_task_id"]');
                const dateInput = serviceForm.querySelector('input[name="service_date"]');

                if (sourceTaskInput) {
                    sourceTaskInput.value = '';
                }

                if (dateInput) {
                    dateInput.value = new Date().toISOString().slice(0, 10);
                }
            }

            openModal(button.dataset.modalOpen);
        }, { signal });
    });

    heroMenuTrigger?.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleHeroMenu();
    }, { signal });

    heroMenuDropdown?.addEventListener('click', (event) => {
        event.stopPropagation();
    }, { signal });

    modalRoot.querySelectorAll('[data-task-realize]').forEach((button) => {
        button.addEventListener('click', () => {
            if (!serviceForm) {
                return;
            }

            const titleInput = serviceForm.querySelector('input[name="title"]');
            const descriptionInput = serviceForm.querySelector('textarea[name="description"]');
            const costInput = serviceForm.querySelector('input[name="cost_amount"]');
            const dateInput = serviceForm.querySelector('input[name="service_date"]');
            const sourceTaskInput = serviceForm.querySelector('input[name="source_task_id"]');

            if (titleInput) {
                titleInput.value = button.dataset.taskTitle ?? '';
            }
            if (descriptionInput) {
                descriptionInput.value = button.dataset.taskDescription ?? '';
            }
            if (costInput) {
                costInput.value = button.dataset.taskCost ?? '';
            }
            if (dateInput) {
                dateInput.value = new Date().toISOString().slice(0, 10);
            }
            if (sourceTaskInput) {
                sourceTaskInput.value = button.dataset.taskId ?? '';
            }

            openModal('modal-service-add');
        }, { signal });
    });

    closeButtons.forEach((button) => {
        button.addEventListener('click', closeModal, { signal });
    });

    scrim?.addEventListener('click', closeModal, { signal });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !modalRoot.hidden) {
            closeModal();
            closeHeroMenu();
            return;
        }

        if (event.key === 'Escape') {
            closeHeroMenu();
        }
    }, { signal });

    document.addEventListener('click', (event) => {
        if (!heroMenu || heroMenu.contains(event.target)) {
            return;
        }

        closeHeroMenu();
    }, { signal });

    if (imagesEditInput) {
        imagesEditInput.addEventListener('change', () => {
            const incomingFiles = Array.from(imagesEditInput.files ?? []);

            if (incomingFiles.length === 0) {
                syncImagesEditInput();
                return;
            }

            const remainingSlots = 10 - countEditableImages();
            if (remainingSlots <= 0) {
                syncImagesEditInput();
                renderImagesEditGallery();
                return;
            }

            editableNewFiles = editableNewFiles.concat(incomingFiles.slice(0, remainingSlots));
            syncImagesEditInput();
            renderImagesEditGallery();
        }, { signal });
    }

    const openModalFromQuery = () => {
        const params = new URLSearchParams(window.location.search);
        const modalName = params.get('open_modal');

        if (!modalName) {
            return;
        }

        const hasPanel = panels.some((panel) => panel.dataset.modalPanel === modalName);

        if (hasPanel) {
            openModal(modalName);
        }
    };

    enhanceNumberInputs();
    captureInitialImagesEditState();
    initializeImagesEditState();
    initializeHeroCarousel();
    bindVehicleAjaxForms();
    openModalFromQuery();
};

document.addEventListener('DOMContentLoaded', () => {
    window.initVehicleDetailsPage();
});
