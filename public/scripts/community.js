document.body.classList.add('is-community-page');
if (document.querySelector('.community-profile-page')) {
    document.body.classList.add('is-community-profile-page');
}

const shouldBootstrapCommunityDocumentDirectly = !document.querySelector('.profile-page');

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

const COMMUNITY_REPORT_TEXT = {
    modalSubtitle: 'Wybierz pow\u00f3d zg\u0142oszenia',
    otherReason: 'Inny pow\u00f3d',
    submit: 'Zg\u0142o\u015b',
    report: 'Zg\u0142oszenie',
    reportComment: 'Zg\u0142oszenie komentarza',
    reportCommentTitle: 'Wybierz pow\u00f3d zg\u0142oszenia komentarza',
    reportPost: 'Zg\u0142oszenie postu',
    reportPostTitle: 'Wybierz pow\u00f3d zg\u0142oszenia postu',
    abusiveComment: 'Komentarz ma charakter obra\u017aliwy lub n\u0119kaj\u0105cy',
    privacyComment: 'Komentarz narusza prywatno\u015b\u0107 lub dane osobowe',
    abusivePost: 'Tre\u015b\u0107 ma charakter obra\u017aliwy lub n\u0119kaj\u0105cy',
    privacyPost: 'Tre\u015b\u0107 narusza prywatno\u015b\u0107 lub dane osobowe',
    offtopicPost: 'Tre\u015b\u0107 jest niezgodna z tematyk\u0105 serwisu',
    prohibitedPost: 'Tre\u015b\u0107 narusza regulamin serwisu',
    reportFailed: 'Nie uda\u0142o si\u0119 zg\u0142osi\u0107 tre\u015bci.',
    reportAccepted: 'Zg\u0142oszenie zosta\u0142o przyj\u0119te.',
};

const normalizeCommunityReportText = (value) => {
    let text = String(value ?? '');

    const mojibakeMap = new Map([
        ['Zgłoszenie komentarza', 'Zgłoszenie komentarza'],
        ['Wybierz powód zgłoszenia komentarza', 'Wybierz powód zgłoszenia komentarza'],
        ['Komentarz ma charakter obraźliwy lub nękający', 'Komentarz ma charakter obraźliwy lub nękający'],
        ['Komentarz narusza prywatność lub dane osobowe', 'Komentarz narusza prywatność lub dane osobowe'],
        ['Zgłoszenie postu', 'Zgłoszenie postu'],
        ['Wybierz powód zgłoszenia postu', 'Wybierz powód zgłoszenia postu'],
        ['Treść ma charakter obraźliwy lub nękający', 'Treść ma charakter obraźliwy lub nękający'],
        ['Treść narusza prywatność lub dane osobowe', 'Treść narusza prywatność lub dane osobowe'],
        ['Treść jest niezgodna z tematyką serwisu', 'Treść jest niezgodna z tematyką serwisu'],
        ['Treść narusza regulamin serwisu', 'Treść narusza regulamin serwisu'],
    ]);

    mojibakeMap.forEach((replacement, broken) => {
        text = text.split(broken).join(replacement);
    });

    try {
        return decodeURIComponent(escape(text));
    } catch {
        return text;
    }
};

const dispatchProfileStatsRefresh = () => {
    document.dispatchEvent(new CustomEvent('profile:stats-refresh'));
};

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

    kickerElement.textContent = normalizeCommunityReportText(kicker);
    titleElement.textContent = normalizeCommunityReportText(title);
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

const ensureCommunityContentReportModal = () => {
    let modal = document.querySelector('[data-community-content-report-modal]');
    if (modal) {
        return modal;
    }

    modal = document.createElement('div');
    modal.className = 'profile-moderation-modal';
    modal.hidden = true;
    modal.setAttribute('data-community-content-report-modal', '');
    modal.innerHTML = `
        <div class="profile-moderation-modal-backdrop" data-community-content-report-close></div>
        <div class="profile-moderation-modal-shell">
            <section class="profile-moderation-modal-panel">
                <div class="profile-moderation-modal-head">
                    <div class="profile-moderation-modal-copy">
                        <div class="profile-moderation-modal-kicker" data-community-content-report-kicker></div>
                        <h3 class="profile-moderation-modal-title" data-community-content-report-title></h3>
                    </div>
                    <button type="button" class="community-modal-close" aria-label="Zamknij" data-community-content-report-close>
                        <img src="/public/assets/icons/close.svg" alt="">
                    </button>
                </div>
                <div class="profile-moderation-modal-body">
                    <div class="profile-moderation-modal-subtitle">${COMMUNITY_REPORT_TEXT.modalSubtitle}</div>
                    <div class="profile-moderation-options" data-community-content-report-options></div>
                    <label class="profile-moderation-other" hidden data-community-content-report-other-wrap>
                        <span>${COMMUNITY_REPORT_TEXT.otherReason}</span>
                        <textarea rows="4" maxlength="800" data-community-content-report-other-input></textarea>
                    </label>
                </div>
                <div class="profile-moderation-modal-actions">
                    <button type="button" class="community-button community-button-muted" data-community-content-report-close>Anuluj</button>
                    <button type="button" class="community-button community-confirm-submit is-danger" data-community-content-report-submit>${COMMUNITY_REPORT_TEXT.submit}</button>
                </div>
            </section>
        </div>
    `;

    document.body.appendChild(modal);
    return modal;
};

const closeCommunityContentReportModal = (result = null) => {
    const modal = document.querySelector('[data-community-content-report-modal]');
    if (!(modal instanceof HTMLElement)) {
        return;
    }

    modal.hidden = true;
    document.body.classList.remove('vehicle-modal-open');

    if (typeof modal._resolveCommunityContentReport === 'function') {
        modal._resolveCommunityContentReport(result);
        modal._resolveCommunityContentReport = null;
    }
};

const openCommunityContentReportModal = ({
                                             kicker = COMMUNITY_REPORT_TEXT.report,
                                             title = COMMUNITY_REPORT_TEXT.modalSubtitle,
                                             reasons = [],
                                         } = {}) => {
    const modal = ensureCommunityContentReportModal();
    const kickerElement = modal.querySelector('[data-community-content-report-kicker]');
    const titleElement = modal.querySelector('[data-community-content-report-title]');
    const optionsRoot = modal.querySelector('[data-community-content-report-options]');
    const otherWrap = modal.querySelector('[data-community-content-report-other-wrap]');
    const otherInput = modal.querySelector('[data-community-content-report-other-input]');
    const submitButton = modal.querySelector('[data-community-content-report-submit]');

    if (!(kickerElement instanceof HTMLElement)
        || !(titleElement instanceof HTMLElement)
        || !(optionsRoot instanceof HTMLElement)
        || !(otherWrap instanceof HTMLElement)
        || !(otherInput instanceof HTMLTextAreaElement)
        || !(submitButton instanceof HTMLButtonElement)
    ) {
        return Promise.resolve(null);
    }

    kickerElement.textContent = kicker;
    titleElement.textContent = title;
    optionsRoot.innerHTML = '';
    otherInput.value = '';

    const normalizedReasons = Array.isArray(reasons)
        ? reasons.filter((reason) => reason && typeof reason.value === 'string' && typeof reason.label === 'string')
        : [];

    normalizedReasons.forEach((reason, index) => {
        const label = document.createElement('label');
        label.className = 'profile-moderation-option';
        label.innerHTML = `
            <input type="radio" name="community_content_report_reason" value="${String(reason.value)}"${index === 0 ? ' checked' : ''}>
            <span>${normalizeCommunityReportText(reason.label)}</span>
        `;
        optionsRoot.appendChild(label);
    });

    const otherLabel = document.createElement('label');
    otherLabel.className = 'profile-moderation-option';
    otherLabel.innerHTML = `<input type="radio" name="community_content_report_reason" value="other"><span>${COMMUNITY_REPORT_TEXT.otherReason}</span>`;
    optionsRoot.appendChild(otherLabel);

    const syncOtherField = () => {
        const selected = optionsRoot.querySelector('input[name="community_content_report_reason"]:checked');
        const isOther = selected instanceof HTMLInputElement && selected.value === 'other';
        otherWrap.hidden = !isOther;
        if (isOther) {
            window.setTimeout(() => otherInput.focus(), 20);
        }
    };

    optionsRoot.querySelectorAll('input[name="community_content_report_reason"]').forEach((input) => {
        input.addEventListener('change', syncOtherField);
    });
    syncOtherField();

    modal.querySelectorAll('[data-community-content-report-close]').forEach((button) => {
        if (button instanceof HTMLElement && button.dataset.boundCommunityContentReportClose !== 'true') {
            button.addEventListener('click', () => closeCommunityContentReportModal(null));
            button.dataset.boundCommunityContentReportClose = 'true';
        }
    });

    submitButton.onclick = () => {
        const selected = optionsRoot.querySelector('input[name="community_content_report_reason"]:checked');
        if (!(selected instanceof HTMLInputElement)) {
            return;
        }

        if (selected.value === 'other') {
            const text = otherInput.value.trim();
            if (text === '') {
                otherInput.focus();
                return;
            }

            closeCommunityContentReportModal({
                code: 'other',
                text,
            });
            return;
        }

        closeCommunityContentReportModal({
            code: selected.value,
            text: '',
        });
    };

    modal.hidden = false;
    document.body.classList.add('vehicle-modal-open');

    return new Promise((resolve) => {
        modal._resolveCommunityContentReport = resolve;
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

    editableExistingPostImages.forEach((image, index) => {
        const card = document.createElement('div');
        card.className = 'community-post-images-edit-card';

        const photo = document.createElement('img');
        photo.className = 'community-post-images-edit-photo';
        photo.alt = `Istniejące zdjęcie posta ${index + 1}`;
        photo.src = String(image.path ?? '');

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'community-post-images-edit-remove';
        removeButton.setAttribute('aria-label', `Usuń zdjęcie ${index + 1}`);
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
window.openCommunityCommentsModal = openCommentsModal;

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
window.closeCommunityCommentsModal = closeCommentsModal;

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
        dispatchProfileStatsRefresh();
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
                                Usuń komentarz
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

            const payload = await response.json().catch(() => null);
            if (!response.ok || !payload?.success || !payload?.comment) {
                const message = typeof payload?.message === 'string' && payload.message.trim() !== ''
                    ? payload.message.trim()
                    : 'Nie udało się dodać komentarza.';
                throw new Error(message);
            }

            commentsList.querySelector('[data-community-comments-empty]')?.remove();
            commentsList.insertAdjacentHTML('afterbegin', buildCommunityCommentMarkup(payload.comment));
            textarea.value = '';

            initializeCommunityFeedChunk(commentsList);
            syncCommunityCommentTriggerState(postId, payload.comment_count ?? 0, payload.commented_by_current_user);
        } catch (error) {
            showAppToast(error instanceof Error ? error.message : 'Nie udało się dodać komentarza.', 'error');
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

        const handleCommunityReport = async (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (typeof event.stopImmediatePropagation === 'function') {
                event.stopImmediatePropagation();
            }

            const action = String(form.querySelector('input[name="action"]')?.value || '');
            const modalConfig = action === 'report_comment'
                ? {
                    kicker: COMMUNITY_REPORT_TEXT.reportComment,
                    title: COMMUNITY_REPORT_TEXT.reportCommentTitle,
                    reasons: [
                        { value: 'abusive_comment', label: COMMUNITY_REPORT_TEXT.abusiveComment },
                        { value: 'spam_comment', label: 'To spam lub flood' },
                        { value: 'privacy_comment', label: 'Komentarz narusza prywatność lub dane osobowe' },
                        { value: 'prohibited_comment', label: 'Komentarz narusza regulamin serwisu' },
                    ],
                }
                : {
                    kicker: 'Zgłoszenie postu',
                    title: 'Wybierz powód zgłoszenia postu',
                    reasons: [
                        { value: 'abusive_post', label: 'Treść ma charakter obraźliwy lub nękający' },
                        { value: 'spam_post', label: 'To spam lub niedozwolona promocja' },
                        { value: 'privacy_post', label: 'Treść narusza prywatność lub dane osobowe' },
                        { value: 'offtopic_post', label: 'Treść jest niezgodna z tematyką serwisu' },
                        { value: 'prohibited_post', label: 'Treść narusza regulamin serwisu' },
                    ],
                };
            const selection = await openCommunityContentReportModal(modalConfig);
            if (!selection || typeof selection.code !== 'string' || selection.code.trim() === '') {
                return;
            }

            const formData = new FormData(form);
            formData.set('report_reason_code', selection.code);
            formData.set('report_reason_text', typeof selection.text === 'string' ? selection.text : '');

            try {
                const response = await fetch(window.location.pathname + window.location.search, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                });

                const payload = await response.json().catch(() => null);
                if (!response.ok || !payload?.success) {
                    throw new Error(String(payload?.message || 'Nie udało się zgłosić treści.'));
                }

                showAppToast(payload.message || 'Zgłoszenie zostało przyjęte.', 'success');

                const menu = form.closest('[data-community-post-menu]');
                if (menu) {
                    closeCommunityPostMenu(menu);
                }
            } catch (error) {
                showAppToast(error instanceof Error ? error.message : 'Nie udało się zgłosić treści.', 'error');
            }
        };

        form.addEventListener('submit', handleCommunityReport);

        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton instanceof HTMLButtonElement) {
            submitButton.addEventListener('click', handleCommunityReport, true);
        }

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
                dispatchProfileStatsRefresh();
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

                const payload = await response.json().catch(() => null);
                if (!response.ok || !payload?.success || !payload?.comment) {
                    const message = typeof payload?.message === 'string' && payload.message.trim() !== ''
                        ? payload.message.trim()
                        : 'Nie udało się dodać komentarza.';
                    throw new Error(message);
                }

                commentsList.querySelector('[data-community-comments-empty]')?.remove();
                commentsList.insertAdjacentHTML('afterbegin', buildCommunityCommentMarkup(payload.comment));
                textarea.value = '';
                initializeCommunityFeedChunk(commentsList);
                syncCommunityCommentTriggerState(postId, payload.comment_count ?? 0, payload.commented_by_current_user);
            } catch (error) {
                showAppToast(error instanceof Error ? error.message : 'Nie udało się dodać komentarza.', 'error');
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
                showAppToast(payload.message || 'Komentarz został zaktualizowany.', 'success');
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
                    commentsList.innerHTML = '<p class="community-comments-empty" data-community-comments-empty>Brak komentarzy. Bądź pierwszy.</p>';
                }

                syncCommunityCommentTriggerState(postId, payload.comment_count ?? 0, payload.commented_by_current_user);
                showAppToast(payload.message || 'Komentarz został usunięty.', 'success');

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
    const isProfileChunk = root instanceof Element
        ? Boolean(root.closest('.profile-page'))
        : Boolean(document.querySelector('.profile-page'));

    bindCommunityCarousels(root);
    bindCommunityCommentModals(root);
    bindCommunityCommentOpeners(root);
    bindCommunityEditPostButtons(root);
    bindCommunityLikeForms(root);
    bindCommunitySaveForms(root);
    if (!isProfileChunk) {
        bindCommunityReportForms(root);
    }
    bindCommunityDeletePostForms(root);
    bindCommunityCommentForms(root);
    bindCommunityCommentEditActions(root);
    bindCommunityCommentDeleteForms(root);
    bindCommunityPostMenus(root);
};

const submitCommunityReportForm = async (form) => {
    if (!(form instanceof HTMLFormElement)) {
        return;
    }

    if (form.dataset.reportPending === 'true') {
        return;
    }

    form.dataset.reportPending = 'true';

    const action = String(form.querySelector('input[name="action"]')?.value || '');
    const modalConfig = action === 'report_comment'
        ? {
            kicker: 'Zgłoszenie komentarza',
            title: 'Wybierz powód zgłoszenia komentarza',
            reasons: [
                { value: 'abusive_comment', label: 'Komentarz ma charakter obraźliwy lub nękający' },
                { value: 'spam_comment', label: 'To spam lub flood' },
                { value: 'privacy_comment', label: 'Komentarz narusza prywatność lub dane osobowe' },
                { value: 'prohibited_comment', label: 'Komentarz narusza regulamin serwisu' },
            ],
        }
        : {
            kicker: 'Zgłoszenie postu',
            title: 'Wybierz powód zgłoszenia postu',
            reasons: [
                { value: 'abusive_post', label: 'Treść ma charakter obraźliwy lub nękający' },
                { value: 'spam_post', label: 'To spam lub niedozwolona promocja' },
                { value: 'privacy_post', label: 'Treść narusza prywatność lub dane osobowe' },
                { value: 'offtopic_post', label: 'Treść jest niezgodna z tematyką serwisu' },
                { value: 'prohibited_post', label: 'Treść narusza regulamin serwisu' },
            ],
        };

    const selection = await openCommunityContentReportModal(modalConfig);
    if (!selection || typeof selection.code !== 'string' || selection.code.trim() === '') {
        form.dataset.reportPending = 'false';
        return;
    }

    const formData = new FormData(form);
    formData.set('report_reason_code', selection.code);
    formData.set('report_reason_text', typeof selection.text === 'string' ? selection.text : '');

    try {
        const response = await fetch(window.location.pathname + window.location.search, {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            },
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.success) {
            throw new Error(String(payload?.message || 'Nie udało się zgłosić treści.'));
        }

        showAppToast(payload.message || 'Zgłoszenie zostało przyjęte.', 'success');

        const menu = form.closest('[data-community-post-menu]');
        if (menu) {
            closeCommunityPostMenu(menu);
        }
    } catch (error) {
        showAppToast(error instanceof Error ? error.message : 'Nie udało się zgłosić treści.', 'error');
    } finally {
        form.dataset.reportPending = 'false';
    }
};

window.submitCommunityReportForm = submitCommunityReportForm;

window.initializeCommunityFeedChunk = initializeCommunityFeedChunk;
if (shouldBootstrapCommunityDocumentDirectly) {
    initializeCommunityFeedChunk(document);

    document.addEventListener('click', (event) => {
        const target = event.target instanceof Element ? event.target : null;
        const submitButton = target?.closest('button[type="submit"]');
        if (!(submitButton instanceof HTMLButtonElement)) {
            return;
        }

        const form = submitButton.closest('[data-community-report-form]');
        if (!(form instanceof HTMLFormElement)) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') {
            event.stopImmediatePropagation();
        }

        if (typeof window.submitCommunityReportForm === 'function') {
            window.submitCommunityReportForm(form);
            return;
        }

        form.requestSubmit();
    }, true);

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
}
const initializeCommunityInfiniteFeed = (root = document) => {
    if (root === document && document.querySelector('.profile-page')) {
        return;
    }

    const feed = root.querySelector('[data-community-feed]');
    const feedSentinel = root.querySelector('[data-community-feed-sentinel]');
    const feedLoader = root.querySelector('[data-community-feed-loader]');

    if (!(feed instanceof HTMLElement) || !(feedSentinel instanceof HTMLElement) || !(feedLoader instanceof HTMLElement)) {
        return;
    }

    if (feed.dataset.feedObserverBound === 'true') {
        return;
    }

    let isLoadingNextFeedPage = false;

    const setFeedPaginationState = (hasMore, nextCreatedAt, nextId) => {
        feed.dataset.hasMore = hasMore ? '1' : '0';
        feed.dataset.nextCursorCreatedAt = nextCreatedAt || '';
        feed.dataset.nextCursorId = nextId ? String(nextId) : '';
    };

    const buildCommunityFeedPageUrl = () => {
        const url = new URL(window.location.href);
        url.searchParams.set('feed_page', '1');
        url.searchParams.set('cursor_created_at', feed.dataset.nextCursorCreatedAt ?? '');
        url.searchParams.set('cursor_id', feed.dataset.nextCursorId ?? '');
        return url.toString();
    };

    const loadNextCommunityFeedPage = async () => {
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
    feed.dataset.feedObserverBound = 'true';
};

window.initializeCommunityInfiniteFeed = initializeCommunityInfiniteFeed;
initializeCommunityInfiniteFeed(document);

const maybeOpenRequestedCommunityComments = () => {
    const params = new URLSearchParams(window.location.search);
    const postId = params.get('open_comments_post');
    if (!postId) {
        return;
    }

    const modal = document.getElementById(`community-comments-modal-${postId}`);
    if (!(modal instanceof HTMLElement)) {
        return;
    }

    openCommentsModal(modal);

    const highlightCommentId = params.get('highlight_comment');
    if (!highlightCommentId) {
        return;
    }

    const comment = modal.querySelector(`[data-community-comment-id="${highlightCommentId}"]`);
    if (!(comment instanceof HTMLElement)) {
        return;
    }

    comment.classList.add('is-report-highlight');
    comment.scrollIntoView({ block: 'center', behavior: 'smooth' });
    window.setTimeout(() => comment.classList.remove('is-report-highlight'), 2800);
};

bindCommunityCommentEditActions(document);
bindCommunityCommentDeleteForms(document);
bindCommunityEditPostButtons(document);
bindCommunityDeletePostForms(document);
resetPostImagesGallery();
maybeOpenRequestedCommunityComments();
