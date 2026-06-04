document.body.classList.add('is-community-page');
if (document.querySelector('.community-profile-page')) {
    document.body.classList.add('is-community-profile-page');
}

document.querySelectorAll('.community-brand-select').forEach((brandSelect) => {
    const targetModelId = brandSelect.getAttribute('data-target-model');
    const modelSelect = targetModelId ? document.getElementById(targetModelId) : null;

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
    };

    brandSelect.addEventListener('change', syncModelOptions);
    syncModelOptions();
});

const createPostModal = document.querySelector('[data-community-modal]');
const createPostBackdrop = document.querySelector('[data-community-modal-backdrop]');
const openModalButtons = document.querySelectorAll('[data-open-community-modal]');
const closeModalButton = document.querySelector('[data-close-community-modal]');
const createPostForm = createPostModal?.querySelector('[data-community-create-form]') ?? null;
const createPostActionInput = createPostModal?.querySelector('[data-community-modal-action]') ?? null;
const createPostIdInput = createPostModal?.querySelector('[data-community-modal-post-id]') ?? null;
const removedPostImageIdsInput = createPostModal?.querySelector('[data-community-removed-image-ids]') ?? null;
const modalTextarea = createPostModal?.querySelector('.community-modal-textarea') ?? null;
const imagesGallery = createPostModal?.querySelector('[data-community-images-gallery]') ?? null;
const imagesInput = createPostModal?.querySelector('[data-community-images-input]') ?? null;
const imagesTrigger = createPostModal?.querySelector('[data-community-images-trigger]') ?? null;
const modalPanel = createPostModal?.querySelector('.community-modal-panel') ?? null;
const createPostModalTitle = createPostModal?.querySelector('.community-modal-title') ?? null;
const createPostSubmitButton = createPostModal?.querySelector('.community-modal-submit') ?? null;
const createPostBrandSelect = createPostModal?.querySelector('select[name="brand_id"]') ?? null;
const createPostModelSelect = createPostModal?.querySelector('select[name="model_id"]') ?? null;

let editablePostFiles = [];
let editableExistingPostImages = [];
let removedExistingPostImageIds = [];
let activeCommentsModal = null;
let lockedScrollY = 0;

const syncBodyScrollLock = () => {
    const createPostModalOpen = createPostModal ? !createPostModal.hidden : false;
    const shouldLock = createPostModalOpen || Boolean(activeCommentsModal);
    const root = document.documentElement;

    if (shouldLock) {
        if (!document.body.classList.contains('is-scroll-locked')) {
            lockedScrollY = window.scrollY || window.pageYOffset || 0;
        }

        root.classList.add('is-scroll-locked');
        document.body.classList.add('is-scroll-locked');
        document.body.classList.add('vehicle-modal-open');
        document.body.style.position = 'fixed';
        document.body.style.top = `-${lockedScrollY}px`;
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
    window.scrollTo(0, lockedScrollY);
};

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

let activeCommunityConfirmResolver = null;
let activeCommunityConfirmKeyHandler = null;

const ensureCommunityConfirmModal = () => {
    let modal = document.querySelector('[data-community-confirm-modal]');
    if (modal) {
        return modal;
    }

    modal = document.createElement('div');
    modal.className = 'community-confirm-backdrop';
    modal.setAttribute('data-community-confirm-modal', '');
    modal.hidden = true;
    modal.innerHTML = `
        <div class="community-confirm-scrim" data-community-confirm-cancel></div>
        <div class="community-confirm-shell">
            <section class="community-confirm-panel">
                <div class="community-confirm-head">
                    <div class="community-confirm-title-wrap">
                        <div class="community-confirm-kicker" data-community-confirm-kicker></div>
                        <h3 class="community-confirm-title" data-community-confirm-title></h3>
                    </div>
                    <button type="button" class="community-modal-close" aria-label="Zamknij" data-community-confirm-cancel>
                        <img src="/public/assets/icons/close.svg" alt="">
                    </button>
                </div>
                <div class="community-confirm-copy">
                    <p class="community-confirm-message" data-community-confirm-message></p>
                </div>
                <div class="community-confirm-actions">
                    <button type="button" class="community-button community-button-muted" data-community-confirm-cancel>Anuluj</button>
                    <button type="button" class="community-button community-confirm-submit" data-community-confirm-submit></button>
                </div>
            </section>
        </div>
    `;

    document.body.appendChild(modal);
    return modal;
};

const closeCommunityConfirmModal = (accepted = false) => {
    const modal = document.querySelector('[data-community-confirm-modal]');
    if (!(modal instanceof HTMLElement)) {
        return;
    }

    modal.hidden = true;
    document.body.classList.remove('vehicle-modal-open');

    if (activeCommunityConfirmKeyHandler) {
        document.removeEventListener('keydown', activeCommunityConfirmKeyHandler);
        activeCommunityConfirmKeyHandler = null;
    }

    if (activeCommunityConfirmResolver) {
        const resolver = activeCommunityConfirmResolver;
        activeCommunityConfirmResolver = null;
        resolver(accepted);
    }
};

const openCommunityConfirmModal = ({
    kicker = 'Potwierdzenie',
    title = 'Potwierdź akcję',
    message = '',
    confirmLabel = 'Potwierdź',
    tone = 'danger',
} = {}) => {
    const modal = ensureCommunityConfirmModal();
    const kickerElement = modal.querySelector('[data-community-confirm-kicker]');
    const titleElement = modal.querySelector('[data-community-confirm-title]');
    const messageElement = modal.querySelector('[data-community-confirm-message]');
    const submitButton = modal.querySelector('[data-community-confirm-submit]');

    if (!(kickerElement instanceof HTMLElement)
        || !(titleElement instanceof HTMLElement)
        || !(messageElement instanceof HTMLElement)
        || !(submitButton instanceof HTMLButtonElement)) {
        return Promise.resolve(window.confirm(message || title));
    }

    kickerElement.textContent = kicker;
    titleElement.textContent = title;
    messageElement.textContent = message;
    submitButton.textContent = confirmLabel;
    submitButton.classList.remove('is-danger', 'is-muted');
    submitButton.classList.add(tone === 'danger' ? 'is-danger' : 'is-muted');

    modal.querySelectorAll('[data-community-confirm-cancel]').forEach((button) => {
        if (button instanceof HTMLElement && button.dataset.boundCommunityConfirmCancel !== 'true') {
            button.addEventListener('click', () => closeCommunityConfirmModal(false));
            button.dataset.boundCommunityConfirmCancel = 'true';
        }
    });

    if (submitButton.dataset.boundCommunityConfirmSubmit !== 'true') {
        submitButton.addEventListener('click', () => closeCommunityConfirmModal(true));
        submitButton.dataset.boundCommunityConfirmSubmit = 'true';
    }

    modal.hidden = false;
    document.body.classList.add('vehicle-modal-open');

    activeCommunityConfirmKeyHandler = (event) => {
        if (event.key === 'Escape') {
            closeCommunityConfirmModal(false);
        }
    };
    document.addEventListener('keydown', activeCommunityConfirmKeyHandler);

    return new Promise((resolve) => {
        activeCommunityConfirmResolver = resolve;
    });
};

const syncPostImagesInput = () => {
    if (!imagesInput) {
        return;
    }

    const transfer = new DataTransfer();
    editablePostFiles.forEach((file) => transfer.items.add(file));
    imagesInput.files = transfer.files;
};

const syncRemovedExistingPostImageIds = () => {
    if (!removedPostImageIdsInput) {
        return;
    }

    removedPostImageIdsInput.value = removedExistingPostImageIds.join(',');
};

const countEditablePostImages = () => editablePostFiles.length + editableExistingPostImages.length;

const openPostImagePicker = () => {
    if (imagesInput && countEditablePostImages() < 8) {
        imagesInput.click();
    }
};

const buildPostImagePlaceholder = () => {
    const placeholderButton = document.createElement('button');
    placeholderButton.type = 'button';
    placeholderButton.className = 'community-post-images-edit-card community-post-images-edit-card-placeholder';
    placeholderButton.setAttribute('aria-label', 'Dodaj zdjecie do posta');
    placeholderButton.addEventListener('click', openPostImagePicker);

    const placeholder = document.createElement('div');
    placeholder.className = 'community-post-images-edit-placeholder';

    const placeholderContent = document.createElement('div');
    placeholderContent.className = 'community-post-images-edit-placeholder-content';

    const plus = document.createElement('div');
    plus.className = 'community-post-images-edit-placeholder-plus';
    plus.textContent = '+';

    placeholderContent.appendChild(plus);
    placeholder.appendChild(placeholderContent);
    placeholderButton.appendChild(placeholder);

    return placeholderButton;
};

const renderPostImagesGallery = () => {
    if (!imagesGallery) {
        return;
    }

    imagesGallery.innerHTML = '';

    editableExistingPostImages.forEach((image, index) => {
        const card = document.createElement('div');
        card.className = 'community-post-images-edit-card';

        const photo = document.createElement('img');
        photo.className = 'community-post-images-edit-photo';
        photo.alt = `Istniejace zdjecie posta ${index + 1}`;
        photo.src = String(image.path ?? '');

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'community-post-images-edit-remove';
        removeButton.setAttribute('aria-label', `Usun zdjecie ${index + 1}`);
        removeButton.addEventListener('click', () => {
            if (image.id) {
                removedExistingPostImageIds.push(Number(image.id));
                removedExistingPostImageIds = Array.from(new Set(removedExistingPostImageIds));
                syncRemovedExistingPostImageIds();
            }
            editableExistingPostImages = editableExistingPostImages.filter((currentImage) => currentImage.id !== image.id);
            renderPostImagesGallery();
        });

        card.appendChild(photo);
        card.appendChild(removeButton);
        imagesGallery.appendChild(card);
    });

    editablePostFiles.forEach((file, index) => {
        const card = document.createElement('div');
        card.className = 'community-post-images-edit-card';

        const photo = document.createElement('img');
        photo.className = 'community-post-images-edit-photo';
        photo.alt = `Nowe zdjecie posta ${index + 1}`;

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'community-post-images-edit-remove';
        removeButton.setAttribute('aria-label', `Usun zdjecie ${index + 1}`);
        removeButton.addEventListener('click', () => {
            editablePostFiles = editablePostFiles.filter((_, fileIndex) => fileIndex !== index);
            syncPostImagesInput();
            renderPostImagesGallery();
        });

        const reader = new FileReader();
        reader.onload = () => {
            photo.src = String(reader.result ?? '');
        };
        reader.readAsDataURL(file);

        card.appendChild(photo);
        card.appendChild(removeButton);
        imagesGallery.appendChild(card);
    });

    if (editablePostFiles.length > 0 && editablePostFiles.length < 8) {
        imagesGallery.appendChild(buildPostImagePlaceholder());
    }

    if (imagesTrigger) {
        imagesTrigger.classList.toggle('is-hidden', editablePostFiles.length > 0);
    }

    if (modalPanel) {
        modalPanel.classList.toggle('has-post-images', editablePostFiles.length > 0);
    }
};

const resetPostImagesGallery = () => {
    editablePostFiles = [];
    editableExistingPostImages = [];
    removedExistingPostImageIds = [];
    syncRemovedExistingPostImageIds();
    syncPostImagesInput();
    renderPostImagesGallery();
};

const resetCreatePostFormState = () => {
    createPostForm?.reset();
    if (createPostActionInput) {
        createPostActionInput.value = 'create_post';
    }
    if (createPostIdInput) {
        createPostIdInput.value = '';
    }
    if (createPostModalTitle) {
        createPostModalTitle.textContent = 'Utwórz post';
    }
    if (createPostSubmitButton) {
        createPostSubmitButton.textContent = 'Opublikuj';
    }
    if (createPostBrandSelect) {
        createPostBrandSelect.value = '';
        createPostBrandSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (createPostModelSelect) {
        createPostModelSelect.value = '';
        createPostModelSelect.disabled = true;
    }
    resetPostImagesGallery();
};

const openCreatePostModal = () => {
    if (!createPostModal || !createPostBackdrop) {
        return;
    }

    createPostModal.hidden = false;
    createPostBackdrop.hidden = false;
    syncBodyScrollLock();

    if (modalTextarea) {
        window.setTimeout(() => modalTextarea.focus(), 30);
    }
};

const populateEditPostModal = (payload) => {
    resetCreatePostFormState();

    if (createPostActionInput) {
        createPostActionInput.value = 'update_post';
    }
    if (createPostIdInput) {
        createPostIdInput.value = String(payload.id ?? '');
    }
    if (createPostModalTitle) {
        createPostModalTitle.textContent = 'Edytuj post';
    }
    if (createPostSubmitButton) {
        createPostSubmitButton.textContent = 'Zapisz zmiany';
    }
    if (modalTextarea) {
        modalTextarea.value = String(payload.content ?? '');
    }
    if (createPostBrandSelect) {
        createPostBrandSelect.value = payload.brand_id ? String(payload.brand_id) : '';
        createPostBrandSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (createPostModelSelect) {
        createPostModelSelect.value = payload.model_id ? String(payload.model_id) : '';
    }

    editableExistingPostImages = Array.isArray(payload.images)
        ? payload.images
            .filter((image) => image && image.path)
            .slice(0, 8)
            .map((image) => ({
                id: Number(image.id || 0),
                path: String(image.path || ''),
            }))
        : [];
    syncRemovedExistingPostImageIds();
    renderPostImagesGallery();
};

const closeCreatePostModal = () => {
    if (!createPostModal || !createPostBackdrop) {
        return;
    }

    createPostModal.hidden = true;
    createPostBackdrop.hidden = true;
    syncBodyScrollLock();
    resetCreatePostFormState();
};

const openCommentsModal = (modalElement) => {
    if (!modalElement) {
        return;
    }

    activeCommentsModal = modalElement;
    modalElement.hidden = false;
    syncBodyScrollLock();
};

const closeCommentsModal = (modalElement = activeCommentsModal) => {
    if (!modalElement) {
        return;
    }

    modalElement.hidden = true;
    if (activeCommentsModal === modalElement) {
        activeCommentsModal = null;
    }

    syncBodyScrollLock();
};

openModalButtons.forEach((button) => {
    button.addEventListener('click', () => {
        resetCreatePostFormState();
        openCreatePostModal();
    });
});

closeModalButton?.addEventListener('click', closeCreatePostModal);
createPostBackdrop?.addEventListener('click', closeCreatePostModal);
imagesTrigger?.addEventListener('click', openPostImagePicker);

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && createPostModal && !createPostModal.hidden) {
        closeCreatePostModal();
    }

    if (event.key === 'Escape' && activeCommentsModal) {
        closeCommentsModal(activeCommentsModal);
    }
});

if (imagesInput) {
    imagesInput.addEventListener('change', () => {
        const incomingFiles = Array.from(imagesInput.files ?? []);

        if (incomingFiles.length === 0) {
            syncPostImagesInput();
            return;
        }

        const remainingSlots = 8 - countEditablePostImages();
        if (remainingSlots <= 0) {
            syncPostImagesInput();
            renderPostImagesGallery();
            return;
        }

        editablePostFiles = editablePostFiles.concat(incomingFiles.slice(0, remainingSlots));
        syncPostImagesInput();
        renderPostImagesGallery();
    });
}

createPostForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(createPostForm);
    const action = String(formData.get('action') || 'create_post');
    const postId = String(formData.get('post_id') || '');

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

        if (typeof payload.html === 'string' && payload.html !== '') {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = payload.html;
            const nextPost = wrapper.firstElementChild;

            if (!(nextPost instanceof HTMLElement)) {
                throw new Error('Invalid post markup');
            }

            if (action === 'update_post' && postId !== '') {
                const currentPost = document.getElementById(`post-${postId}`);
                if (currentPost) {
                    currentPost.replaceWith(nextPost);
                    initializeCommunityFeedChunk(nextPost);
                    requestAnimationFrame(() => initializeCommunityFeedChunk(nextPost));
                }
            } else {
                const feedRoot = document.querySelector('[data-community-feed]') ?? document.querySelector('.community-profile-feed');
                if (feedRoot instanceof HTMLElement) {
                    const emptyState = feedRoot.querySelector('.community-empty');
                    emptyState?.remove();
                    feedRoot.prepend(nextPost);
                    initializeCommunityFeedChunk(nextPost);
                    requestAnimationFrame(() => initializeCommunityFeedChunk(nextPost));
                }
            }
        }

        closeCreatePostModal();
        showAppToast(payload.message || (action === 'update_post' ? 'Post został zaktualizowany.' : 'Post został opublikowany.'), 'success');
    } catch (error) {
        createPostForm.submit();
    }
});

const initializeCommunityCarousel = (carousel) => {
    const track = carousel.querySelector('[data-community-carousel-track]');
    const prev = carousel.querySelector('[data-community-carousel-prev]');
    const next = carousel.querySelector('[data-community-carousel-next]');

    if (!track || carousel.dataset.communityCarouselReady === 'true') {
        return;
    }

    if (carousel.offsetParent === null) {
        return;
    }

    const initialSlides = Array.from(track.children);
    if (initialSlides.length <= 1) {
        carousel.dataset.communityCarouselReady = 'true';
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

    prev?.addEventListener('click', () => moveToIndex(currentIndex - 1));
    next?.addEventListener('click', () => moveToIndex(currentIndex + 1));

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

    carousel.dataset.communityCarouselReady = 'true';
};

document.querySelectorAll('[data-community-carousel]').forEach((carousel) => {
    initializeCommunityCarousel(carousel);
});

document.querySelectorAll('[data-community-comments-modal]').forEach((commentsModal) => {
    if (commentsModal.parentElement !== document.body) {
        document.body.appendChild(commentsModal);
    }
});

document.querySelectorAll('[data-open-comments-modal]').forEach((button) => {
    button.addEventListener('click', () => {
        const modalId = button.getAttribute('data-comments-modal-id');
        if (!modalId) {
            return;
        }

        const commentsModal = document.getElementById(modalId);
        if (!commentsModal) {
            return;
        }

        openCommentsModal(commentsModal);
        requestAnimationFrame(() => {
            commentsModal.querySelectorAll('[data-community-carousel]').forEach((carousel) => {
                initializeCommunityCarousel(carousel);
            });
        });
    });
});

document.querySelectorAll('[data-community-comments-modal]').forEach((commentsModal) => {
    commentsModal.querySelectorAll('[data-close-comments-modal]').forEach((closeButton) => {
        closeButton.addEventListener('click', () => closeCommentsModal(commentsModal));
    });
});

const renderCommunityLikeIcon = (liked) => {
    if (liked) {
        return `
            <svg viewBox="0 0 24 24" class="community-post-action-like-svg is-filled">
                <path d="M12 21.35 10.55 20.03C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54Z"/>
            </svg>
        `;
    }

    return `
        <svg viewBox="0 0 24 24" class="community-post-action-like-svg is-outline">
            <path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09A5.964 5.964 0 0 0 7.5 3C4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.31C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3Zm-4.4 15.55-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5 18.5 5 20 6.5 20 8.5c0 2.89-3.14 5.74-7.9 10.05Z"/>
        </svg>
    `;
};

document.querySelectorAll('[data-community-like-form]').forEach((form) => {
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const button = form.querySelector('[data-community-like-button]');
        const icon = form.querySelector('[data-community-like-icon]');
        const count = form.querySelector('[data-community-like-count]');

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

            button.classList.toggle('is-active', Boolean(payload.liked_by_current_user));
            icon.innerHTML = renderCommunityLikeIcon(Boolean(payload.liked_by_current_user));
            count.textContent = String(payload.like_count ?? 0);
        } catch (error) {
            form.submit();
        }
    });
});

document.querySelectorAll('[data-community-save-form]').forEach((form) => {
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const button = form.querySelector('[data-community-save-button]');
        const icon = form.querySelector('[data-community-save-icon]');
        const count = form.querySelector('[data-community-save-count]');

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
            icon.src = payload.saved_by_current_user
                ? '/public/assets/icons/save_icon_full.svg'
                : '/public/assets/icons/save_icon.svg';
            count.textContent = String(payload.save_count ?? 0);
        } catch (error) {
            form.submit();
        }
    });
});

document.querySelectorAll('[data-community-report-form]').forEach((form) => {
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

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

            showAppToast(payload.message || 'Zgloszenie zostalo przyjete.', 'success');

            const menu = form.closest('[data-community-post-menu]');
            if (menu) {
                closeCommunityPostMenu(menu);
            }
        } catch (error) {
            form.submit();
        }
    });
});

const escapeHtml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const buildCommunityCommentMarkup = (comment) => `
    <article class="community-comment" data-community-comment-id="${Number(comment.id || 0)}" data-community-post-id="${Number(comment.post_id || 0)}">
        <div class="community-comment-meta">
            <div class="community-comment-meta-main">
                <a href="${escapeHtml(comment.profile_path)}" class="community-comment-author">${escapeHtml(comment.author_name)}</a>
                <span>${escapeHtml(comment.formatted_created_at)}</span>
            </div>
            ${comment.is_own_comment ? `
                <div class="community-post-menu community-comment-menu" data-community-post-menu>
                    <button
                        type="button"
                        class="community-post-menu-trigger"
                        aria-label="Opcje komentarza"
                        aria-expanded="false"
                        data-community-post-menu-trigger
                    >
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>
                    <div class="community-post-menu-dropdown" hidden data-community-post-menu-dropdown>
                        <button type="button" class="community-post-menu-action is-primary" data-community-edit-comment-open>
                            Edytuj komentarz
                        </button>
                        <form method="post" class="community-inline-form community-comment-delete-form" data-community-comment-delete-form>
                            <input type="hidden" name="comment_id" value="${Number(comment.id || 0)}">
                            <input type="hidden" name="post_id" value="${Number(comment.post_id || 0)}">
                            <input type="hidden" name="redirect_to" value="${escapeHtml(window.location.pathname + window.location.search)}">
                            <input type="hidden" name="action" value="delete_comment">
                            <button type="submit" class="community-post-menu-action is-danger">
                                Usun komentarz
                            </button>
                        </form>
                    </div>
                </div>
            ` : ''}
        </div>
        <p class="community-comment-content" data-community-comment-content>${escapeHtml(comment.content).replace(/\n/g, '<br>')}</p>
        ${comment.is_own_comment ? `
            <form method="post" class="community-comment-edit-form" hidden data-community-comment-edit-form>
                <input type="hidden" name="action" value="update_comment">
                <input type="hidden" name="comment_id" value="${Number(comment.id || 0)}">
                <input type="hidden" name="post_id" value="${Number(comment.post_id || 0)}">
                <input type="hidden" name="redirect_to" value="${escapeHtml(window.location.pathname + window.location.search)}">
                <textarea name="comment_content" rows="4" class="community-textarea-small" required>${escapeHtml(comment.content)}</textarea>
                <div class="community-comment-edit-actions">
                    <button type="button" class="community-button community-button-muted" data-community-edit-comment-cancel>
                        Anuluj
                    </button>
                    <button type="submit" class="community-button community-button-primary">
                        Zapisz
                    </button>
                </div>
            </form>
        ` : ''}
    </article>
`;

const syncCommunityCommentTriggerState = (postId, commentCount, commentedByCurrentUser) => {
    const commentButton = document.querySelector(`[data-open-comments-modal][data-comments-modal-id="community-comments-modal-${postId}"]`);
    if (!commentButton) {
        return;
    }

    const count = commentButton.querySelector('[data-community-comment-count]');
    const icon = commentButton.querySelector('[data-community-comment-icon]');
    commentButton.classList.toggle('is-active', Boolean(commentedByCurrentUser));

    if (count) {
        count.textContent = String(commentCount ?? 0);
    }

    if (icon) {
        icon.src = commentedByCurrentUser
            ? '/public/assets/icons/comment_icon_full.svg'
            : '/public/assets/icons/comment_icon.svg';
    }
};

document.querySelectorAll('[data-community-comment-form]').forEach((form) => {
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const commentsModal = form.closest('[data-community-comments-modal]');
        const commentsList = commentsModal?.querySelector('[data-community-comments-list]') ?? null;
        const textarea = form.querySelector('textarea[name="comment_content"]');
        const submitButton = form.querySelector('button[type="submit"]');
        const postId = form.querySelector('input[name="post_id"]')?.value ?? '';
        const commentButton = document.querySelector(`[data-open-comments-modal][data-comments-modal-id="community-comments-modal-${postId}"]`);

        if (!commentsList || !textarea || !submitButton || !postId || !commentButton) {
            form.submit();
            return;
        }

        const formData = new FormData(form);
        submitButton.disabled = true;

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
            if (!payload.success || !payload.comment) {
                throw new Error('Invalid payload');
            }

            commentsList.querySelector('[data-community-comments-empty]')?.remove();
            commentsList.insertAdjacentHTML('afterbegin', buildCommunityCommentMarkup(payload.comment));
            textarea.value = '';

            initializeCommunityFeedChunk(commentsList);
            syncCommunityCommentTriggerState(postId, payload.comment_count ?? 0, payload.commented_by_current_user);
        } catch (error) {
            form.submit();
        } finally {
            submitButton.disabled = false;
        }
    });
});

const closeCommunityPostMenu = (menu) => {
    const trigger = menu.querySelector('[data-community-post-menu-trigger]');
    const dropdown = menu.querySelector('[data-community-post-menu-dropdown]');

    if (!trigger || !dropdown) {
        return;
    }

    trigger.setAttribute('aria-expanded', 'false');
    dropdown.hidden = true;
};

const bindCommunityCarousels = (root) => {
    root.querySelectorAll('[data-community-carousel]').forEach((carousel) => {
        initializeCommunityCarousel(carousel);
    });
};

const bindCommunityCommentModals = (root) => {
    root.querySelectorAll('[data-community-comments-modal]').forEach((commentsModal) => {
        if (commentsModal.parentElement !== document.body) {
            document.body.appendChild(commentsModal);
        }

        bindCommunityPostMenus(commentsModal);
        bindCommunityReportForms(commentsModal);
        bindCommunityCommentForms(commentsModal);
        bindCommunityCommentEditActions(commentsModal);
        bindCommunityCommentDeleteForms(commentsModal);

        if (commentsModal.dataset.boundClose === 'true') {
            return;
        }

        commentsModal.querySelectorAll('[data-close-comments-modal]').forEach((closeButton) => {
            closeButton.addEventListener('click', () => closeCommentsModal(commentsModal));
        });

        commentsModal.dataset.boundClose = 'true';
    });
};

const bindCommunityCommentOpeners = (root) => {
    root.querySelectorAll('[data-open-comments-modal]').forEach((button) => {
        if (button.dataset.boundOpen === 'true') {
            return;
        }

        button.addEventListener('click', () => {
            const modalId = button.getAttribute('data-comments-modal-id');
            if (!modalId) {
                return;
            }

            const commentsModal = document.getElementById(modalId);
            if (!commentsModal) {
                return;
            }

            openCommentsModal(commentsModal);
            requestAnimationFrame(() => {
                commentsModal.querySelectorAll('[data-community-carousel]').forEach((carousel) => {
                    initializeCommunityCarousel(carousel);
                });
            });
        });

        button.dataset.boundOpen = 'true';
    });
};

const bindCommunityLikeForms = (root) => {
    root.querySelectorAll('[data-community-like-form]').forEach((form) => {
        if (form.dataset.boundLike === 'true') {
            return;
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const button = form.querySelector('[data-community-like-button]');
            const icon = form.querySelector('[data-community-like-icon]');
            const count = form.querySelector('[data-community-like-count]');

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

                button.classList.toggle('is-active', Boolean(payload.liked_by_current_user));
                icon.innerHTML = renderCommunityLikeIcon(Boolean(payload.liked_by_current_user));
                count.textContent = String(payload.like_count ?? 0);
            } catch (error) {
                form.submit();
            }
        });

        form.dataset.boundLike = 'true';
    });
};

const bindCommunitySaveForms = (root) => {
    root.querySelectorAll('[data-community-save-form]').forEach((form) => {
        if (form.dataset.boundSave === 'true') {
            return;
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const button = form.querySelector('[data-community-save-button]');
            const icon = form.querySelector('[data-community-save-icon]');
            const count = form.querySelector('[data-community-save-count]');

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
                icon.src = payload.saved_by_current_user
                    ? '/public/assets/icons/save_icon_full.svg'
                    : '/public/assets/icons/save_icon.svg';
                count.textContent = String(payload.save_count ?? 0);
            } catch (error) {
                form.submit();
            }
        });

        form.dataset.boundSave = 'true';
    });
};

const bindCommunityReportForms = (root) => {
    root.querySelectorAll('[data-community-report-form]').forEach((form) => {
        if (form.dataset.boundReport === 'true') {
            return;
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

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

            showAppToast(payload.message || 'Zgloszenie zostalo przyjete.', 'success');

                const menu = form.closest('[data-community-post-menu]');
                if (menu) {
                    closeCommunityPostMenu(menu);
                }
            } catch (error) {
                form.submit();
            }
        });

        form.dataset.boundReport = 'true';
    });
};

const bindCommunityDeletePostForms = (root) => {
    root.querySelectorAll('[data-community-delete-post-form]').forEach((form) => {
        if (form.dataset.boundDeletePost === 'true') {
            return;
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const post = form.closest('.community-post');

            if (!(post instanceof HTMLElement)) {
                form.submit();
                return;
            }

            const confirmed = await openCommunityConfirmModal({
                kicker: 'Usuwanie posta',
                title: 'Usunąć post?',
                message: 'Usunięcie posta skasuje go na stałe wraz z jego zdjęciami i komentarzami. Tej operacji nie da się cofnąć.',
                confirmLabel: 'Usuń post',
                tone: 'danger',
            });

            if (!confirmed) {
                const menu = form.closest('[data-community-post-menu]');
                if (menu) {
                    closeCommunityPostMenu(menu);
                }
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

                post.remove();
                showAppToast(payload.message || 'Post został usunięty.', 'success');

                const menu = form.closest('[data-community-post-menu]');
                if (menu) {
                    closeCommunityPostMenu(menu);
                }
            } catch (error) {
                form.submit();
            }
        });

        form.dataset.boundDeletePost = 'true';
    });
};

const bindCommunityCommentForms = (root) => {
    root.querySelectorAll('[data-community-comment-form]').forEach((form) => {
        if (form.dataset.boundComment === 'true') {
            return;
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const commentsModal = form.closest('[data-community-comments-modal]');
            const commentsList = commentsModal?.querySelector('[data-community-comments-list]') ?? null;
            const textarea = form.querySelector('textarea[name="comment_content"]');
            const submitButton = form.querySelector('button[type="submit"]');
            const postId = form.querySelector('input[name="post_id"]')?.value ?? '';
            const commentButton = document.querySelector(`[data-open-comments-modal][data-comments-modal-id="community-comments-modal-${postId}"]`);

            if (!commentsList || !textarea || !submitButton || !postId || !commentButton) {
                form.submit();
                return;
            }

            const formData = new FormData(form);
            submitButton.disabled = true;

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
                if (!payload.success || !payload.comment) {
                    throw new Error('Invalid payload');
                }

                commentsList.querySelector('[data-community-comments-empty]')?.remove();
                commentsList.insertAdjacentHTML('afterbegin', buildCommunityCommentMarkup(payload.comment));
                textarea.value = '';
                initializeCommunityFeedChunk(commentsList);
                syncCommunityCommentTriggerState(postId, payload.comment_count ?? 0, payload.commented_by_current_user);
            } catch (error) {
                form.submit();
            } finally {
                submitButton.disabled = false;
            }
        });

        form.dataset.boundComment = 'true';
    });
};

const bindCommunityCommentEditActions = (root) => {
    root.querySelectorAll('[data-community-edit-comment-open]').forEach((button) => {
        if (button.dataset.boundEditOpen === 'true') {
            return;
        }

        button.addEventListener('click', () => {
            const comment = button.closest('[data-community-comment-id]');
            const editForm = comment?.querySelector('[data-community-comment-edit-form]');
            const content = comment?.querySelector('[data-community-comment-content]');
            const menu = button.closest('[data-community-post-menu]');

            if (!comment || !editForm || !content) {
                return;
            }

            content.hidden = true;
            editForm.hidden = false;
            editForm.querySelector('textarea[name="comment_content"]')?.focus();

            if (menu) {
                closeCommunityPostMenu(menu);
            }
        });

        button.dataset.boundEditOpen = 'true';
    });

    root.querySelectorAll('[data-community-edit-comment-cancel]').forEach((button) => {
        if (button.dataset.boundEditCancel === 'true') {
            return;
        }

        button.addEventListener('click', () => {
            const comment = button.closest('[data-community-comment-id]');
            const editForm = comment?.querySelector('[data-community-comment-edit-form]');
            const content = comment?.querySelector('[data-community-comment-content]');

            if (!comment || !editForm || !content) {
                return;
            }

            editForm.hidden = true;
            content.hidden = false;
        });

        button.dataset.boundEditCancel = 'true';
    });

    root.querySelectorAll('[data-community-comment-edit-form]').forEach((form) => {
        if (form.dataset.boundEditSubmit === 'true') {
            return;
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const comment = form.closest('[data-community-comment-id]');
            const content = comment?.querySelector('[data-community-comment-content]');
            const submitButton = form.querySelector('button[type="submit"]');
            const textarea = form.querySelector('textarea[name="comment_content"]');
            const postId = form.querySelector('input[name="post_id"]')?.value ?? '';

            if (!comment || !content || !submitButton || !textarea || !postId) {
                form.submit();
                return;
            }

            const formData = new FormData(form);
            submitButton.disabled = true;

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
                if (!payload.success || !payload.comment) {
                    throw new Error('Invalid payload');
                }

                content.innerHTML = escapeHtml(payload.comment.content).replace(/\n/g, '<br>');
                textarea.value = payload.comment.content;
                content.hidden = false;
                form.hidden = true;
                syncCommunityCommentTriggerState(postId, payload.comment_count ?? 0, payload.commented_by_current_user);
                showAppToast(payload.message || 'Komentarz zostal zaktualizowany.', 'success');
            } catch (error) {
                form.submit();
            } finally {
                submitButton.disabled = false;
            }
        });

        form.dataset.boundEditSubmit = 'true';
    });
};

const bindCommunityCommentDeleteForms = (root) => {
    root.querySelectorAll('[data-community-comment-delete-form]').forEach((form) => {
        if (form.dataset.boundDeleteComment === 'true') {
            return;
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const comment = form.closest('[data-community-comment-id]');
            const commentsList = form.closest('[data-community-comments-list]');
            const postId = form.querySelector('input[name="post_id"]')?.value ?? '';

            if (!comment || !commentsList || !postId) {
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

                comment.remove();
                if (!commentsList.querySelector('[data-community-comment-id]')) {
                    commentsList.innerHTML = '<p class="community-comments-empty" data-community-comments-empty>Brak komentarzy. Badz pierwszy.</p>';
                }

                syncCommunityCommentTriggerState(postId, payload.comment_count ?? 0, payload.commented_by_current_user);
                showAppToast(payload.message || 'Komentarz zostal usuniety.', 'success');

                const menu = form.closest('[data-community-post-menu]');
                if (menu) {
                    closeCommunityPostMenu(menu);
                }
            } catch (error) {
                form.submit();
            }
        });

        form.dataset.boundDeleteComment = 'true';
    });
};

const bindCommunityEditPostButtons = (root) => {
    root.querySelectorAll('[data-community-edit-post-button]').forEach((button) => {
        if (button.dataset.boundEditPost === 'true') {
            return;
        }

        button.addEventListener('click', () => {
            const payloadRaw = button.getAttribute('data-community-edit-post-payload');
            const menu = button.closest('[data-community-post-menu]');

            if (!payloadRaw) {
                return;
            }

            try {
                const payload = JSON.parse(payloadRaw);
                populateEditPostModal(payload);
                openCreatePostModal();
                if (menu) {
                    closeCommunityPostMenu(menu);
                }
            } catch (error) {
                // ignore malformed payload
            }
        });

        button.dataset.boundEditPost = 'true';
    });
};

const bindCommunityPostMenus = (root) => {
    root.querySelectorAll('[data-community-post-menu]').forEach((menu) => {
        const trigger = menu.querySelector('[data-community-post-menu-trigger]');
        const dropdown = menu.querySelector('[data-community-post-menu-dropdown]');

        if (!trigger || !dropdown || trigger.dataset.boundMenu === 'true') {
            return;
        }

        trigger.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();

            const isOpen = trigger.getAttribute('aria-expanded') === 'true';

            document.querySelectorAll('[data-community-post-menu]').forEach((otherMenu) => {
                if (otherMenu !== menu) {
                    closeCommunityPostMenu(otherMenu);
                }
            });

            trigger.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
            dropdown.hidden = isOpen;
        });

        trigger.dataset.boundMenu = 'true';
    });
};

const initializeCommunityFeedChunk = (root) => {
    bindCommunityCarousels(root);
    bindCommunityCommentModals(root);
    bindCommunityCommentOpeners(root);
    bindCommunityEditPostButtons(root);
    bindCommunityLikeForms(root);
    bindCommunitySaveForms(root);
    bindCommunityReportForms(root);
    bindCommunityDeletePostForms(root);
    bindCommunityCommentForms(root);
    bindCommunityCommentEditActions(root);
    bindCommunityCommentDeleteForms(root);
    bindCommunityPostMenus(root);
};

window.initializeCommunityFeedChunk = initializeCommunityFeedChunk;
document.querySelectorAll('[data-community-post-menu]').forEach((menu) => {
    const trigger = menu.querySelector('[data-community-post-menu-trigger]');
    const dropdown = menu.querySelector('[data-community-post-menu-dropdown]');

    if (!trigger || !dropdown) {
        return;
    }

    trigger.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        const isOpen = trigger.getAttribute('aria-expanded') === 'true';

        document.querySelectorAll('[data-community-post-menu]').forEach((otherMenu) => {
            if (otherMenu !== menu) {
                closeCommunityPostMenu(otherMenu);
            }
        });

        trigger.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
        dropdown.hidden = isOpen;
    });
});

document.addEventListener('click', (event) => {
    document.querySelectorAll('[data-community-post-menu]').forEach((menu) => {
        if (!menu.contains(event.target)) {
            closeCommunityPostMenu(menu);
        }
    });

    const target = event.target instanceof Element ? event.target : null;
    if (!target) {
        return;
    }
});
const feed = document.querySelector('[data-community-feed]');
const feedSentinel = document.querySelector('[data-community-feed-sentinel]');
const feedLoader = document.querySelector('[data-community-feed-loader]');
let isLoadingNextFeedPage = false;

const setFeedPaginationState = (hasMore, nextCreatedAt, nextId) => {
    if (!feed) {
        return;
    }

    feed.dataset.hasMore = hasMore ? '1' : '0';
    feed.dataset.nextCursorCreatedAt = nextCreatedAt || '';
    feed.dataset.nextCursorId = nextId ? String(nextId) : '';
};

const buildCommunityFeedPageUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('feed_page', '1');
    url.searchParams.set('cursor_created_at', feed?.dataset.nextCursorCreatedAt ?? '');
    url.searchParams.set('cursor_id', feed?.dataset.nextCursorId ?? '');
    return url.toString();
};

const loadNextCommunityFeedPage = async () => {
    if (!feed || !feedSentinel || !feedLoader) {
        return;
    }

    if (isLoadingNextFeedPage || feed.dataset.hasMore !== '1') {
        return;
    }

    const cursorCreatedAt = feed.dataset.nextCursorCreatedAt ?? '';
    const cursorId = feed.dataset.nextCursorId ?? '';

    if (!cursorCreatedAt || !cursorId) {
        setFeedPaginationState(false, '', '');
        return;
    }

    isLoadingNextFeedPage = true;
    feedLoader.hidden = false;

    try {
        const response = await fetch(buildCommunityFeedPageUrl(), {
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
        initializeCommunityFeedChunk(wrapper);

        const fragment = document.createDocumentFragment();
        while (wrapper.firstChild) {
            fragment.appendChild(wrapper.firstChild);
        }

        feed.insertBefore(fragment, feedLoader);
        setFeedPaginationState(
            Boolean(payload.has_more),
            payload.next_cursor_created_at || '',
            payload.next_cursor_id || ''
        );
    } catch (error) {
        setFeedPaginationState(false, '', '');
    } finally {
        feedLoader.hidden = true;
        isLoadingNextFeedPage = false;
    }
};

if (feed && feedSentinel) {
    const feedObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                loadNextCommunityFeedPage();
            }
        });
    }, {
        root: null,
        rootMargin: '600px 0px 600px 0px',
        threshold: 0.01,
    });

    feedObserver.observe(feedSentinel);
}

bindCommunityCommentEditActions(document);
bindCommunityCommentDeleteForms(document);
bindCommunityEditPostButtons(document);
bindCommunityDeletePostForms(document);
resetPostImagesGallery();
