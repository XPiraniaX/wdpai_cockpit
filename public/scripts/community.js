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

const modal = document.querySelector('[data-community-modal]');
const modalBackdrop = document.querySelector('[data-community-modal-backdrop]');
const openModalButtons = document.querySelectorAll('[data-open-community-modal]');
const closeModalButton = document.querySelector('[data-close-community-modal]');
const modalTextarea = modal?.querySelector('.community-modal-textarea') ?? null;
const imagesGallery = modal?.querySelector('[data-community-images-gallery]') ?? null;
const imagesInput = modal?.querySelector('[data-community-images-input]') ?? null;
const imagesTrigger = modal?.querySelector('[data-community-images-trigger]') ?? null;
const modalPanel = modal?.querySelector('.community-modal-panel') ?? null;
let editablePostFiles = [];

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

const openModal = () => {
    if (!modal || !modalBackdrop) {
        return;
    }

    modal.hidden = false;
    modalBackdrop.hidden = false;
    document.body.style.overflow = 'hidden';

    if (modalTextarea) {
        window.setTimeout(() => modalTextarea.focus(), 30);
    }
};

const closeModal = () => {
    if (!modal || !modalBackdrop) {
        return;
    }

    modal.hidden = true;
    modalBackdrop.hidden = true;
    document.body.style.overflow = '';
};

openModalButtons.forEach((button) => {
    button.addEventListener('click', openModal);
});

closeModalButton?.addEventListener('click', closeModal);
modalBackdrop?.addEventListener('click', closeModal);
imagesTrigger?.addEventListener('click', openPostImagePicker);

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal && !modal.hidden) {
        closeModal();
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

    if (!track) {
        return;
    }

    const initialSlides = Array.from(track.children);
    if (initialSlides.length <= 1) {
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
};

document.querySelectorAll('[data-community-carousel]').forEach((carousel) => {
    initializeCommunityCarousel(carousel);
});

resetPostImagesGallery();
