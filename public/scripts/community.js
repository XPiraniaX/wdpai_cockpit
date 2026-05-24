document.body.classList.add('is-community-page');

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
const modalTextarea = createPostModal?.querySelector('.community-modal-textarea') ?? null;
const imagesGallery = createPostModal?.querySelector('[data-community-images-gallery]') ?? null;
const imagesInput = createPostModal?.querySelector('[data-community-images-input]') ?? null;
const imagesTrigger = createPostModal?.querySelector('[data-community-images-trigger]') ?? null;
const modalPanel = createPostModal?.querySelector('.community-modal-panel') ?? null;

let editablePostFiles = [];
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

const syncPostImagesInput = () => {
    if (!imagesInput) {
        return;
    }

    const transfer = new DataTransfer();
    editablePostFiles.forEach((file) => transfer.items.add(file));
    imagesInput.files = transfer.files;
};

const countEditablePostImages = () => editablePostFiles.length;

const openPostImagePicker = () => {
    if (imagesInput && countEditablePostImages() < 8) {
        imagesInput.click();
    }
};

const buildPostImagePlaceholder = () => {
    const placeholderButton = document.createElement('button');
    placeholderButton.type = 'button';
    placeholderButton.className = 'community-post-images-edit-card community-post-images-edit-card-placeholder';
    placeholderButton.setAttribute('aria-label', 'Dodaj zdjęcie do posta');
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

    editablePostFiles.forEach((file, index) => {
        const card = document.createElement('div');
        card.className = 'community-post-images-edit-card';

        const photo = document.createElement('img');
        photo.className = 'community-post-images-edit-photo';
        photo.alt = `Nowe zdjęcie posta ${index + 1}`;

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'community-post-images-edit-remove';
        removeButton.setAttribute('aria-label', `Usuń zdjęcie ${index + 1}`);
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
    syncPostImagesInput();
    renderPostImagesGallery();
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

const closeCreatePostModal = () => {
    if (!createPostModal || !createPostBackdrop) {
        return;
    }

    createPostModal.hidden = true;
    createPostBackdrop.hidden = true;
    syncBodyScrollLock();
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
    button.addEventListener('click', openCreatePostModal);
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

        commentsModal.querySelectorAll('[data-community-carousel]').forEach((carousel) => {
            initializeCommunityCarousel(carousel);
        });
        openCommentsModal(commentsModal);
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

            showAppToast(payload.message || 'Zgłoszenie zostało przyjęte.', 'success');

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
    <article class="community-comment">
        <div class="community-comment-meta">
            <a href="${escapeHtml(comment.profile_path)}" class="community-comment-author">${escapeHtml(comment.author_name)}</a>
            <span>${escapeHtml(comment.formatted_created_at)}</span>
        </div>
        <p class="community-comment-content">${escapeHtml(comment.content).replace(/\n/g, '<br>')}</p>
    </article>
`;

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

            const count = commentButton.querySelector('[data-community-comment-count]');
            const icon = commentButton.querySelector('[data-community-comment-icon]');
            commentButton.classList.toggle('is-active', Boolean(payload.commented_by_current_user));

            if (count) {
                count.textContent = String(payload.comment_count ?? 0);
            }

            if (icon) {
                icon.src = payload.commented_by_current_user
                    ? '/public/assets/icons/comment_icon_full.svg'
                    : '/public/assets/icons/comment_icon.svg';
            }
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
});

resetPostImagesGallery();
