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

let editableMarketplaceFiles = [];

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
    } else if (editableMarketplaceFiles.length < 10) {
        marketplaceGallery.appendChild(buildMarketplaceImagePlaceholder());
    }
};

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
        const form = marketplaceCreateModal?.querySelector('form');
        form?.reset();
        editableMarketplaceFiles = [];
        syncMarketplaceImagesInput();
        renderMarketplaceGallery();
        marketplaceCreateModal?.querySelectorAll('.marketplace-brand-select').forEach((brandSelect) => {
            brandSelect.dispatchEvent(new Event('change'));
        });
        openMarketplaceCreateModal();
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

    const remainingSlots = 10 - editableMarketplaceFiles.length;
    if (remainingSlots <= 0) {
        syncMarketplaceImagesInput();
        renderMarketplaceGallery();
        return;
    }

    editableMarketplaceFiles = editableMarketplaceFiles.concat(incomingFiles.slice(0, remainingSlots));
    syncMarketplaceImagesInput();
    renderMarketplaceGallery();
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
    ? '/public/assets/icons/save_icon_full.svg'
    : '/public/assets/icons/save_icon.svg';

const bindMarketplaceSaveForms = (root) => {
    root.querySelectorAll('[data-marketplace-save-form]').forEach((form) => {
        if (form.dataset.boundSave === 'true') {
            return;
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const button = form.querySelector('[data-marketplace-save-button]');
            const icon = form.querySelector('[data-marketplace-save-icon]');
            const count = form.querySelector('[data-marketplace-save-count]');

            if (!button || !icon || !count) {
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
                icon.src = renderMarketplaceSaveIcon(Boolean(payload.saved_by_current_user));
                count.textContent = String(payload.save_count ?? 0);
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

            modal.querySelectorAll('[data-marketplace-carousel]').forEach((carousel) => {
                initializeMarketplaceCarousel(carousel);
            });
            openMarketplaceDetailsModal(modal);
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
initializeMarketplaceChunk(document);
