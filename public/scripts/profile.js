const isProfilePage = Boolean(document.querySelector('.profile-page'));

if (isProfilePage) {
    document.body.classList.add('is-profile-page');
}

let activeProfileMarketplaceConfirmResolver = null;
let activeProfileMarketplaceConfirmKeyHandler = null;
let activeProfileAvatarPreviewUrl = null;
let activeProfileFeedObserver = null;
let isProfileFeedRequestInFlight = false;
let activeProfileFeedElement = null;
let activeProfileFeedCheckInterval = null;
let activeProfileInfiniteScrollTarget = null;
let activeProfileInfiniteScrollHandler = null;
let activeProfileHashPostSearch = null;

const getProfileScrollContainer = () => {
    const content = document.querySelector('.content');
    if (content instanceof HTMLElement) {
        const style = window.getComputedStyle(content);
        const overflowY = style.overflowY;
        if ((overflowY === 'auto' || overflowY === 'scroll') && content.scrollHeight > content.clientHeight) {
            return content;
        }
    }

    return window;
};

const refreshProfileStats = async () => {
    if (!isProfilePage) {
        return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set('profile_stats', '1');

    try {
        const response = await fetch(url.toString(), {
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Request failed');
        }

        const payload = parseProfileJsonResponse(await response.text());
        if (!payload.success) {
            throw new Error('Invalid payload');
        }

        const statsMap = {
            vehicles: Number(payload.vehicle_count ?? 0),
            posts: Number(payload.post_count ?? 0),
            listings: Number(payload.listing_count ?? 0),
        };

        Object.entries(statsMap).forEach(([key, value]) => {
            document.querySelectorAll(`[data-profile-stat="${key}"]`).forEach((element) => {
                element.textContent = String(value);
            });
        });
    } catch {
        // Keep current values when refresh fails.
    }
};

const parseProfileJsonResponse = (responseText) => {
    const normalized = String(responseText || '').trim();
    if (normalized === '') {
        throw new Error('Empty response');
    }

    try {
        return JSON.parse(normalized);
    } catch {
        const firstBrace = normalized.indexOf('{');
        const lastBrace = normalized.lastIndexOf('}');
        if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
            throw new Error('Invalid response payload');
        }

        return JSON.parse(normalized.slice(firstBrace, lastBrace + 1));
    }
};

const getProfilePostHashTargetId = () => {
    const hash = window.location.hash || '';
    if (!hash.startsWith('#post-')) {
        return null;
    }

    const postId = Number(hash.slice('#post-'.length));
    return Number.isInteger(postId) && postId > 0 ? postId : null;
};

const getProfileOpenCommentsPostId = () => {
    const url = new URL(window.location.href);
    const postId = Number(url.searchParams.get('open_comments_post') || 0);
    return Number.isInteger(postId) && postId > 0 ? postId : null;
};

const scrollProfilePostIntoView = (postId) => {
    const target = document.getElementById(`post-${postId}`);
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    target.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
    });

    return true;
};

const waitForNextFrame = () => new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
});

const maybeOpenProfilePostComments = async (postId) => {
    const openCommentsPostId = getProfileOpenCommentsPostId();
    if (!openCommentsPostId || openCommentsPostId !== postId) {
        return false;
    }

    const finalizeOpenedComments = () => {
        const url = new URL(window.location.href);
        url.searchParams.delete('open_comments_post');
        window.history.replaceState({}, '', url.toString());
    };

    const tryOpenViaTrigger = async () => {
        const postElement = document.getElementById(`post-${postId}`);
        if (!(postElement instanceof HTMLElement)) {
            return false;
        }

        const commentTrigger = postElement.querySelector('[data-open-comments-modal]');
        if (!(commentTrigger instanceof HTMLElement)) {
            return false;
        }

        commentTrigger.dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window,
        }));

        await waitForNextFrame();
        await waitForNextFrame();

        const modalId = commentTrigger.getAttribute('data-comments-modal-id') || `community-comments-modal-${postId}`;
        const modal = document.getElementById(modalId);
        if (!(modal instanceof HTMLElement) || modal.hidden) {
            return false;
        }

        finalizeOpenedComments();
        return true;
    };

    const openModalOnceReady = async () => {
        const modal = document.getElementById(`community-comments-modal-${postId}`);
        if (!(modal instanceof HTMLElement)) {
            return false;
        }

        if (typeof window.openCommunityCommentsModal === 'function') {
            window.openCommunityCommentsModal(modal);
        } else {
            modal.hidden = false;
        }

        await waitForNextFrame();
        modal.querySelectorAll('[data-community-carousel]').forEach((carousel) => {
            if (typeof window.initializeCommunityCarousel === 'function') {
                window.initializeCommunityCarousel(carousel);
            }
        });

        if (modal.hidden) {
            return false;
        }

        finalizeOpenedComments();
        return true;
    };

    for (let attempt = 0; attempt < 6; attempt += 1) {
        const openedViaTrigger = await tryOpenViaTrigger();
        if (openedViaTrigger) {
            return true;
        }

        const opened = await openModalOnceReady();
        if (opened) {
            return true;
        }

        await waitForNextFrame();
        await new Promise((resolve) => window.setTimeout(resolve, 60));
    }

    const openedViaTrigger = await tryOpenViaTrigger();
    if (openedViaTrigger) {
        return true;
    }

    return false;
};

const ensureProfileMarketplaceConfirmModal = () => {
    let modal = document.querySelector('[data-profile-marketplace-confirm-modal]');
    if (modal) {
        return modal;
    }

    modal = document.createElement('div');
    modal.className = 'marketplace-confirm-backdrop';
    modal.setAttribute('data-profile-marketplace-confirm-modal', '');
    modal.hidden = true;
    modal.innerHTML = `
        <div class="marketplace-confirm-scrim" data-profile-marketplace-confirm-cancel></div>
        <div class="marketplace-confirm-shell">
            <section class="marketplace-confirm-panel">
                <div class="marketplace-confirm-head">
                    <div class="marketplace-confirm-title-wrap">
                        <div class="marketplace-confirm-kicker" data-profile-marketplace-confirm-kicker></div>
                        <h3 class="marketplace-confirm-title" data-profile-marketplace-confirm-title></h3>
                    </div>
                    <button type="button" class="community-modal-close" aria-label="Zamknij" data-profile-marketplace-confirm-cancel>
                        <img src="/public/assets/icons/close.svg" alt="">
                    </button>
                </div>
                <div class="marketplace-confirm-copy">
                    <p class="marketplace-confirm-message" data-profile-marketplace-confirm-message></p>
                </div>
                <div class="marketplace-confirm-actions">
                    <button type="button" class="marketplace-button marketplace-button-muted" data-profile-marketplace-confirm-cancel>Anuluj</button>
                    <button type="button" class="marketplace-button marketplace-confirm-submit" data-profile-marketplace-confirm-submit></button>
                </div>
            </section>
        </div>
    `;

    document.body.appendChild(modal);
    return modal;
};

const closeProfileMarketplaceConfirmModal = (accepted = false) => {
    const modal = document.querySelector('[data-profile-marketplace-confirm-modal]');
    if (!(modal instanceof HTMLElement)) {
        return;
    }

    modal.hidden = true;
    document.body.classList.remove('vehicle-modal-open');

    if (activeProfileMarketplaceConfirmKeyHandler) {
        document.removeEventListener('keydown', activeProfileMarketplaceConfirmKeyHandler);
        activeProfileMarketplaceConfirmKeyHandler = null;
    }

    if (activeProfileMarketplaceConfirmResolver) {
        const resolver = activeProfileMarketplaceConfirmResolver;
        activeProfileMarketplaceConfirmResolver = null;
        resolver(accepted);
    }
};

const openProfileMarketplaceConfirmModal = ({
    kicker = 'Potwierdzenie',
    title = 'Potwierdź akcję',
    message = '',
    confirmLabel = 'Potwierdź',
    tone = 'muted',
} = {}) => {
    const modal = ensureProfileMarketplaceConfirmModal();
    const kickerElement = modal.querySelector('[data-profile-marketplace-confirm-kicker]');
    const titleElement = modal.querySelector('[data-profile-marketplace-confirm-title]');
    const messageElement = modal.querySelector('[data-profile-marketplace-confirm-message]');
    const submitButton = modal.querySelector('[data-profile-marketplace-confirm-submit]');

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

    modal.querySelectorAll('[data-profile-marketplace-confirm-cancel]').forEach((button) => {
        if (button instanceof HTMLElement && button.dataset.boundProfileMarketplaceConfirmCancel !== 'true') {
            button.addEventListener('click', () => closeProfileMarketplaceConfirmModal(false));
            button.dataset.boundProfileMarketplaceConfirmCancel = 'true';
        }
    });

    if (submitButton.dataset.boundProfileMarketplaceConfirmSubmit !== 'true') {
        submitButton.addEventListener('click', () => closeProfileMarketplaceConfirmModal(true));
        submitButton.dataset.boundProfileMarketplaceConfirmSubmit = 'true';
    }

    modal.hidden = false;
    document.body.classList.add('vehicle-modal-open');

    activeProfileMarketplaceConfirmKeyHandler = (event) => {
        if (event.key === 'Escape') {
            closeProfileMarketplaceConfirmModal(false);
        }
    };
    document.addEventListener('keydown', activeProfileMarketplaceConfirmKeyHandler);

    return new Promise((resolve) => {
        activeProfileMarketplaceConfirmResolver = resolve;
    });
};

const revokeActiveProfileAvatarPreviewUrl = () => {
    if (activeProfileAvatarPreviewUrl) {
        URL.revokeObjectURL(activeProfileAvatarPreviewUrl);
        activeProfileAvatarPreviewUrl = null;
    }
};

const ensureProfileAvatarImage = (src) => {
    document.querySelectorAll('[data-profile-avatar-shell]').forEach((shell) => {
        if (!(shell instanceof HTMLElement)) {
            return;
        }

        let image = shell.querySelector('[data-profile-avatar-image]');
        if (!(image instanceof HTMLImageElement)) {
            image = document.createElement('img');
            image.className = 'profile-avatar-image';
            image.setAttribute('data-profile-avatar-image', '');
            image.alt = '';
            const ring = shell.querySelector('.community-avatar-ring');
            shell.insertBefore(image, ring ?? shell.firstChild);
        }

        image.src = src;
    });
};

const closeProfileAvatarModal = () => {
    const modal = document.querySelector('[data-profile-avatar-modal]');
    const form = document.querySelector('[data-profile-avatar-form]');
    const input = document.querySelector('[data-profile-avatar-input]');
    const submitButton = document.querySelector('[data-profile-avatar-submit]');
    const preview = document.querySelector('[data-profile-avatar-preview]');

    if (!(modal instanceof HTMLElement) || !(form instanceof HTMLFormElement) || !(input instanceof HTMLInputElement)) {
        return;
    }

    modal.hidden = true;
    document.body.classList.remove('vehicle-modal-open');
    form.reset();
    input.value = '';
    revokeActiveProfileAvatarPreviewUrl();

    if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = true;
    }

    if (preview instanceof HTMLElement) {
        const storedImage = preview.getAttribute('data-current-avatar-src') || '';
        preview.innerHTML = storedImage !== ''
            ? `<img src="${storedImage}" alt="" class="profile-avatar-preview-image" data-profile-avatar-preview-image>`
            : '<div class="profile-avatar-preview-placeholder" data-profile-avatar-preview-placeholder><span class="community-avatar-ring"></span></div>';
    }
};

const openProfileAvatarModal = () => {
    const modal = document.querySelector('[data-profile-avatar-modal]');
    if (!(modal instanceof HTMLElement)) {
        return;
    }

    modal.hidden = false;
    document.body.classList.add('vehicle-modal-open');
};

const syncProfileAvatarPreview = (file) => {
    const preview = document.querySelector('[data-profile-avatar-preview]');
    const submitButton = document.querySelector('[data-profile-avatar-submit]');

    if (!(preview instanceof HTMLElement) || !(submitButton instanceof HTMLButtonElement)) {
        return;
    }

    revokeActiveProfileAvatarPreviewUrl();

    if (!(file instanceof File)) {
        submitButton.disabled = true;
        const storedImage = preview.getAttribute('data-current-avatar-src') || '';
        preview.innerHTML = storedImage !== ''
            ? `<img src="${storedImage}" alt="" class="profile-avatar-preview-image" data-profile-avatar-preview-image>`
            : '<div class="profile-avatar-preview-placeholder" data-profile-avatar-preview-placeholder><span class="community-avatar-ring"></span></div>';
        return;
    }

    activeProfileAvatarPreviewUrl = URL.createObjectURL(file);
    preview.innerHTML = `<img src="${activeProfileAvatarPreviewUrl}" alt="" class="profile-avatar-preview-image" data-profile-avatar-preview-image>`;
    submitButton.disabled = false;
};

const bindProfileAvatarModal = () => {
    const modal = document.querySelector('[data-profile-avatar-modal]');
    const form = document.querySelector('[data-profile-avatar-form]');
    const input = document.querySelector('[data-profile-avatar-input]');
    const pickButton = document.querySelector('[data-profile-avatar-pick]');
    const preview = document.querySelector('[data-profile-avatar-preview]');

    if (!(modal instanceof HTMLElement)
        || !(form instanceof HTMLFormElement)
        || !(input instanceof HTMLInputElement)
        || !(pickButton instanceof HTMLElement)
        || !(preview instanceof HTMLElement)) {
        return;
    }

    if (!preview.hasAttribute('data-current-avatar-src')) {
        const currentImage = preview.querySelector('[data-profile-avatar-preview-image]');
        preview.setAttribute('data-current-avatar-src', currentImage instanceof HTMLImageElement ? currentImage.src : '');
    }

    document.querySelectorAll('[data-open-profile-avatar-modal]').forEach((button) => {
        if (button instanceof HTMLElement && button.dataset.boundProfileAvatarOpen !== 'true') {
            button.addEventListener('click', () => openProfileAvatarModal());
            button.dataset.boundProfileAvatarOpen = 'true';
        }
    });

    modal.querySelectorAll('[data-close-profile-avatar-modal]').forEach((button) => {
        if (button instanceof HTMLElement && button.dataset.boundProfileAvatarClose !== 'true') {
            button.addEventListener('click', () => closeProfileAvatarModal());
            button.dataset.boundProfileAvatarClose = 'true';
        }
    });

    if (pickButton.dataset.boundProfileAvatarPick !== 'true') {
        pickButton.addEventListener('click', () => input.click());
        pickButton.dataset.boundProfileAvatarPick = 'true';
    }

    if (input.dataset.boundProfileAvatarInput !== 'true') {
        input.addEventListener('change', () => {
            const file = input.files && input.files[0] ? input.files[0] : null;
            syncProfileAvatarPreview(file);
        });
        input.dataset.boundProfileAvatarInput = 'true';
    }

    if (form.dataset.boundProfileAvatarSubmit !== 'true') {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            if (!input.files || !input.files[0]) {
                return;
            }

            const formData = new FormData(form);
            const endpoint = form.getAttribute('action') || window.location.pathname + window.location.search;

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
                if (!payload.success || typeof payload.avatar_path !== 'string' || payload.avatar_path === '') {
                    throw new Error('Invalid payload');
                }

                ensureProfileAvatarImage(payload.avatar_path);
                preview.setAttribute('data-current-avatar-src', payload.avatar_path);
                closeProfileAvatarModal();

                if (typeof window.showAppToast === 'function') {
                    window.showAppToast(payload.message || 'Zdjęcie profilowe zostało zaktualizowane.', 'success');
                }
            } catch {
                form.submit();
            }
        });
        form.dataset.boundProfileAvatarSubmit = 'true';
    }
};

const renderProfileMarketplaceSaveIcon = (saved) => saved
    ? '<svg viewBox="0 0 24 24" class="marketplace-save-heart-svg is-filled"><path d="M12 21.35 10.55 20.03C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54Z"/></svg>'
    : '<svg viewBox="0 0 24 24" class="marketplace-save-heart-svg is-outline"><path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09A5.964 5.964 0 0 0 7.5 3C4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.31C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3Zm-4.4 15.55-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5 18.5 5 20 6.5 20 8.5c0 2.89-3.14 5.74-7.9 10.05Z"/></svg>';

const closeProfileCommunityPostMenus = (exceptMenu = null) => {
    document.querySelectorAll('.profile-page [data-community-post-menu], [data-community-comments-modal] [data-community-post-menu]').forEach((menu) => {
        if (!(menu instanceof HTMLElement) || menu === exceptMenu) {
            return;
        }

        const trigger = menu.querySelector('[data-community-post-menu-trigger]');
        const dropdown = menu.querySelector('[data-community-post-menu-dropdown]');

        if (trigger instanceof HTMLElement) {
            trigger.setAttribute('aria-expanded', 'false');
        }

        if (dropdown instanceof HTMLElement) {
            dropdown.hidden = true;
        }
    });
};

const ensureProfileModerationReasonModal = () => {
    let modal = document.querySelector('[data-profile-moderation-reason-modal]');
    if (modal) {
        return modal;
    }

    modal = document.createElement('div');
    modal.className = 'profile-moderation-modal';
    modal.hidden = true;
    modal.setAttribute('data-profile-moderation-reason-modal', '');
    modal.innerHTML = `
        <div class="profile-moderation-modal-backdrop" data-profile-moderation-close></div>
        <div class="profile-moderation-modal-shell">
            <section class="profile-moderation-modal-panel">
                <div class="profile-moderation-modal-head">
                    <div class="profile-moderation-modal-copy">
                        <div class="profile-moderation-modal-kicker" data-profile-moderation-kicker></div>
                        <h3 class="profile-moderation-modal-title" data-profile-moderation-title></h3>
                    </div>
                    <button type="button" class="community-modal-close" aria-label="Zamknij" data-profile-moderation-close>
                        <img src="/public/assets/icons/close.svg" alt="">
                    </button>
                </div>
                <div class="profile-moderation-modal-body">
                    <div class="profile-moderation-modal-subtitle">Wybierz powód usunięcia</div>
                    <div class="profile-moderation-options" data-profile-moderation-options></div>
                    <label class="profile-moderation-other" hidden data-profile-moderation-other-wrap>
                        <span>Inny powód</span>
                        <textarea rows="4" maxlength="800" data-profile-moderation-other-input></textarea>
                    </label>
                </div>
                <div class="profile-moderation-modal-actions">
                    <button type="button" class="marketplace-button marketplace-button-muted" data-profile-moderation-close>Anuluj</button>
                    <button type="button" class="marketplace-button marketplace-confirm-submit is-danger" data-profile-moderation-submit>Zatwierdź</button>
                </div>
            </section>
        </div>
    `;

    document.body.appendChild(modal);
    return modal;
};

const closeProfileModerationReasonModal = (result = null) => {
    const modal = document.querySelector('[data-profile-moderation-reason-modal]');
    if (!(modal instanceof HTMLElement)) {
        return;
    }

    modal.hidden = true;
    document.body.classList.remove('vehicle-modal-open');

    if (typeof modal._resolveModerationReason === 'function') {
        const resolve = modal._resolveModerationReason;
        modal._resolveModerationReason = null;
        resolve(result);
    }
};

const openProfileModerationReasonModal = ({
    kicker = 'Moderacja',
    title = 'Usuń treść',
    reasons = [],
} = {}) => {
    const modal = ensureProfileModerationReasonModal();
    const kickerElement = modal.querySelector('[data-profile-moderation-kicker]');
    const titleElement = modal.querySelector('[data-profile-moderation-title]');
    const optionsRoot = modal.querySelector('[data-profile-moderation-options]');
    const otherWrap = modal.querySelector('[data-profile-moderation-other-wrap]');
    const otherInput = modal.querySelector('[data-profile-moderation-other-input]');
    const submitButton = modal.querySelector('[data-profile-moderation-submit]');

    if (!(kickerElement instanceof HTMLElement)
        || !(titleElement instanceof HTMLElement)
        || !(optionsRoot instanceof HTMLElement)
        || !(otherWrap instanceof HTMLElement)
        || !(otherInput instanceof HTMLTextAreaElement)
        || !(submitButton instanceof HTMLButtonElement)) {
        return Promise.resolve('');
    }

    kickerElement.textContent = kicker;
    titleElement.textContent = title;
    optionsRoot.innerHTML = '';
    otherWrap.hidden = true;
    otherInput.value = '';

    const normalizedReasons = Array.isArray(reasons) ? reasons.filter((reason) => typeof reason === 'string' && reason.trim() !== '') : [];
    normalizedReasons.forEach((reason, index) => {
        const label = document.createElement('label');
        label.className = 'profile-moderation-option';

        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'profile_moderation_reason';
        input.value = reason;
        input.checked = index === 0;

        const text = document.createElement('span');
        text.textContent = reason;

        label.appendChild(input);
        label.appendChild(text);
        optionsRoot.appendChild(label);
    });

    const otherLabel = document.createElement('label');
    otherLabel.className = 'profile-moderation-option';
    otherLabel.innerHTML = '<input type="radio" name="profile_moderation_reason" value="__other__"><span>Inny powód</span>';
    optionsRoot.appendChild(otherLabel);

    const syncOtherField = () => {
        const selected = optionsRoot.querySelector('input[name="profile_moderation_reason"]:checked');
        const isOther = selected instanceof HTMLInputElement && selected.value === '__other__';
        otherWrap.hidden = !isOther;
        if (isOther) {
            window.setTimeout(() => otherInput.focus(), 20);
        }
    };

    optionsRoot.querySelectorAll('input[name="profile_moderation_reason"]').forEach((input) => {
        input.addEventListener('change', syncOtherField);
    });
    syncOtherField();

    modal.querySelectorAll('[data-profile-moderation-close]').forEach((button) => {
        if (button instanceof HTMLElement && button.dataset.boundProfileModerationClose !== 'true') {
            button.addEventListener('click', () => closeProfileModerationReasonModal(null));
            button.dataset.boundProfileModerationClose = 'true';
        }
    });

    submitButton.onclick = () => {
        const selected = optionsRoot.querySelector('input[name="profile_moderation_reason"]:checked');
        if (!(selected instanceof HTMLInputElement)) {
            return;
        }

        const value = selected.value === '__other__'
            ? otherInput.value.trim()
            : selected.value.trim();

        if (value === '') {
            if (typeof window.showAppToast === 'function') {
                window.showAppToast('Wpisz powód usunięcia.', 'error');
            }
            return;
        }

        closeProfileModerationReasonModal(value);
    };

    modal.hidden = false;
    document.body.classList.add('vehicle-modal-open');
    return new Promise((resolve) => {
        modal._resolveModerationReason = resolve;
    });
};

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

const ensureProfileContentReportModal = () => {
    let modal = document.querySelector('[data-profile-content-report-modal]');
    if (modal) {
        return modal;
    }

    modal = document.createElement('div');
    modal.className = 'profile-moderation-modal';
    modal.hidden = true;
    modal.setAttribute('data-profile-content-report-modal', '');
    modal.innerHTML = `
        <div class="profile-moderation-modal-backdrop" data-profile-content-report-close></div>
        <div class="profile-moderation-modal-shell">
            <section class="profile-moderation-modal-panel">
                <div class="profile-moderation-modal-head">
                    <div class="profile-moderation-modal-copy">
                        <div class="profile-moderation-modal-kicker" data-profile-content-report-kicker></div>
                        <h3 class="profile-moderation-modal-title" data-profile-content-report-title></h3>
                    </div>
                    <button type="button" class="community-modal-close" aria-label="Zamknij" data-profile-content-report-close>
                        <img src="/public/assets/icons/close.svg" alt="">
                    </button>
                </div>
                <div class="profile-moderation-modal-body">
                    <div class="profile-moderation-modal-subtitle">Wybierz powod zgloszenia</div>
                    <div class="profile-moderation-options" data-profile-content-report-options></div>
                    <label class="profile-moderation-other" hidden data-profile-content-report-other-wrap>
                        <span>Inny powod</span>
                        <textarea rows="4" maxlength="800" data-profile-content-report-other-input></textarea>
                    </label>
                </div>
                <div class="profile-moderation-modal-actions">
                    <button type="button" class="marketplace-button marketplace-button-muted" data-profile-content-report-close>Anuluj</button>
                    <button type="button" class="marketplace-button marketplace-confirm-submit is-danger" data-profile-content-report-submit>Zglos</button>
                </div>
            </section>
        </div>
    `;

    document.body.appendChild(modal);
    return modal;
};

const closeProfileContentReportModal = (result = null) => {
    const modal = document.querySelector('[data-profile-content-report-modal]');
    if (!(modal instanceof HTMLElement)) {
        return;
    }

    modal.hidden = true;
    document.body.classList.remove('vehicle-modal-open');

    if (typeof modal._resolveProfileContentReport === 'function') {
        modal._resolveProfileContentReport(result);
        modal._resolveProfileContentReport = null;
    }
};

const openProfileContentReportModal = ({
    kicker = 'Zgloszenie',
    title = 'Wybierz powod zgloszenia',
    reasons = [],
} = {}) => {
    const modal = ensureProfileContentReportModal();
    const kickerElement = modal.querySelector('[data-profile-content-report-kicker]');
    const titleElement = modal.querySelector('[data-profile-content-report-title]');
    const optionsRoot = modal.querySelector('[data-profile-content-report-options]');
    const otherWrap = modal.querySelector('[data-profile-content-report-other-wrap]');
    const otherInput = modal.querySelector('[data-profile-content-report-other-input]');
    const submitButton = modal.querySelector('[data-profile-content-report-submit]');

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
            <input type="radio" name="profile_content_report_reason" value="${String(reason.value)}"${index === 0 ? ' checked' : ''}>
            <span>${String(reason.label)}</span>
        `;
        optionsRoot.appendChild(label);
    });

    const otherLabel = document.createElement('label');
    otherLabel.className = 'profile-moderation-option';
    otherLabel.innerHTML = '<input type="radio" name="profile_content_report_reason" value="other"><span>Inny powod</span>';
    optionsRoot.appendChild(otherLabel);

    const syncOtherField = () => {
        const selected = optionsRoot.querySelector('input[name="profile_content_report_reason"]:checked');
        const isOther = selected instanceof HTMLInputElement && selected.value === 'other';
        otherWrap.hidden = !isOther;
        if (isOther) {
            window.setTimeout(() => otherInput.focus(), 20);
        }
    };

    optionsRoot.querySelectorAll('input[name="profile_content_report_reason"]').forEach((input) => {
        input.addEventListener('change', syncOtherField);
    });
    syncOtherField();

    modal.querySelectorAll('[data-profile-content-report-close]').forEach((button) => {
        if (button instanceof HTMLElement && button.dataset.boundProfileContentReportClose !== 'true') {
            button.addEventListener('click', () => closeProfileContentReportModal(null));
            button.dataset.boundProfileContentReportClose = 'true';
        }
    });

    submitButton.onclick = () => {
        const selected = optionsRoot.querySelector('input[name="profile_content_report_reason"]:checked');
        if (!(selected instanceof HTMLInputElement)) {
            return;
        }

        if (selected.value === 'other') {
            const text = otherInput.value.trim();
            if (text === '') {
                otherInput.focus();
                return;
            }

            closeProfileContentReportModal({
                code: 'other',
                text,
            });
            return;
        }

        closeProfileContentReportModal({
            code: selected.value,
            text: '',
        });
    };

    modal.hidden = false;
    document.body.classList.add('vehicle-modal-open');

    return new Promise((resolve) => {
        modal._resolveProfileContentReport = resolve;
    });
};

const submitProfileCommunityReportForm = async (form) => {
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
            kicker: 'Zgloszenie komentarza',
            title: 'Wybierz powod zgloszenia komentarza',
            reasons: [
                { value: 'abusive_comment', label: 'Komentarz ma charakter obrazliwy lub nekajacy' },
                { value: 'spam_comment', label: 'To spam lub flood' },
                { value: 'privacy_comment', label: 'Komentarz narusza prywatnosc lub dane osobowe' },
                { value: 'prohibited_comment', label: 'Komentarz narusza regulamin serwisu' },
            ],
        }
        : {
            kicker: 'Zgloszenie postu',
            title: 'Wybierz powod zgloszenia postu',
            reasons: [
                { value: 'abusive_post', label: 'Tresc ma charakter obrazliwy lub nekajacy' },
                { value: 'spam_post', label: 'To spam lub niedozwolona promocja' },
                { value: 'privacy_post', label: 'Tresc narusza prywatnosc lub dane osobowe' },
                { value: 'offtopic_post', label: 'Tresc jest niezgodna z tematyka serwisu' },
                { value: 'prohibited_post', label: 'Tresc narusza regulamin serwisu' },
            ],
        };

    const selection = await openProfileContentReportModal(modalConfig);
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
            throw new Error(String(payload?.message || 'Nie udalo sie zglosic tresci.'));
        }

        if (typeof window.showAppToast === 'function') {
            window.showAppToast(payload.message || 'Zgloszenie zostalo przyjete.', 'success');
        }

        closeProfileCommunityPostMenus();
    } catch (error) {
        if (typeof window.showAppToast === 'function') {
            window.showAppToast(error instanceof Error ? error.message : 'Nie udalo sie zglosic tresci.', 'error');
        }
    } finally {
        form.dataset.reportPending = 'false';
    }
};

const bindProfileHeroActions = () => {
    document.querySelectorAll('[data-profile-report-form]').forEach((form) => {
        if (!(form instanceof HTMLFormElement) || form.dataset.boundProfileHeroReport === 'true') {
            return;
        }

        const handleProfileReport = async (event) => {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            const selection = await openProfileContentReportModal({
                kicker: 'Zgłoszenie profilu',
                title: 'Wybierz powód zgłoszenia profilu',
                reasons: [
                    { value: 'impersonation_profile', label: 'Profil podszywa się pod inną osobę lub markę' },
                    { value: 'abusive_profile', label: 'Profil narusza zasady społeczności' },
                    { value: 'spam_profile', label: 'Profil służy do spamu lub nadużyć' },
                    { value: 'fraud_profile', label: 'Profil wygląda na próbę oszustwa' },
                ],
            });
            if (!selection || typeof selection.code !== 'string' || selection.code.trim() === '') {
                return;
            }

            const formData = new FormData(form);
            formData.set('report_reason_code', selection.code);
            formData.set('report_reason_text', typeof selection.text === 'string' ? selection.text : '');

            try {
                const response = await fetch(form.getAttribute('action') || window.location.pathname + window.location.search, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                });

                const payload = parseProfileJsonResponse(await response.text());
                if (!response.ok || !payload.success) {
                    throw new Error(String(payload.message || 'Nie udało się zgłosić profilu.'));
                }

                if (typeof window.showAppToast === 'function') {
                    window.showAppToast(payload.message || 'Profil został zgłoszony.', 'success');
                }

                closeProfileMarketplaceMenus();
            } catch (error) {
                if (typeof window.showAppToast === 'function') {
                    window.showAppToast(error instanceof Error ? error.message : 'Nie udało się zgłosić profilu.', 'error');
                }
            }
        };

        form.addEventListener('submit', handleProfileReport, true);

        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton instanceof HTMLButtonElement) {
            submitButton.addEventListener('click', handleProfileReport, true);
        }

        form.dataset.boundProfileHeroReport = 'true';
    });
};

const disconnectProfileFeedObserver = () => {
    if (activeProfileFeedObserver) {
        activeProfileFeedObserver.disconnect();
        activeProfileFeedObserver = null;
    }
    activeProfileFeedElement = null;
};

const clearProfileFeedCheckInterval = () => {
    if (activeProfileFeedCheckInterval !== null) {
        window.clearInterval(activeProfileFeedCheckInterval);
        activeProfileFeedCheckInterval = null;
    }
};

const ensureProfileFeedSentinel = (feed) => {
    if (!(feed instanceof HTMLElement)) {
        return null;
    }

    let sentinel = feed.parentElement?.querySelector(':scope > [data-profile-feed-sentinel]');
    if (sentinel instanceof HTMLElement) {
        return sentinel;
    }

    sentinel = document.createElement('div');
    sentinel.className = 'community-feed-sentinel';
    sentinel.setAttribute('data-profile-feed-sentinel', '');
    feed.insertAdjacentElement('afterend', sentinel);
    return sentinel;
};

const loadNextProfileFeedPage = async (feed) => {
    if (!(feed instanceof HTMLElement) || isProfileFeedRequestInFlight) {
        return;
    }

    const feedType = feed.getAttribute('data-profile-feed-type') || '';
    const hasMore = feed.getAttribute('data-profile-has-more') === '1';
    if (!hasMore) {
        disconnectProfileFeedObserver();
        return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set('profile_feed_page', '1');
    url.searchParams.set('scope', feedType);

    if (feedType === 'posts') {
        const cursorCreatedAt = feed.getAttribute('data-profile-next-cursor-created-at') || '';
        const cursorId = feed.getAttribute('data-profile-next-cursor-id') || '';
        if (cursorCreatedAt === '' || cursorId === '' || cursorId === '0') {
            feed.setAttribute('data-profile-has-more', '0');
            disconnectProfileFeedObserver();
            return;
        }
        url.searchParams.set('cursor_created_at', cursorCreatedAt);
        url.searchParams.set('cursor_id', cursorId);
    } else if (feedType === 'listings') {
        const nextOffset = feed.getAttribute('data-profile-next-offset') || '';
        if (nextOffset === '') {
            feed.setAttribute('data-profile-has-more', '0');
            disconnectProfileFeedObserver();
            return;
        }
        url.searchParams.set('offset', nextOffset);
    } else {
        return;
    }

    isProfileFeedRequestInFlight = true;

    try {
        const response = await fetch(url.toString(), {
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json',
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
            const fragment = document.createDocumentFragment();

            while (wrapper.firstChild) {
                fragment.appendChild(wrapper.firstChild);
            }

            feed.appendChild(fragment);

            if (feedType === 'posts') {
                if (typeof window.initializeCommunityFeedChunk === 'function') {
                    window.initializeCommunityFeedChunk(feed);
                    window.requestAnimationFrame(() => window.initializeCommunityFeedChunk(feed));
                }
            } else if (feedType === 'listings') {
                bindProfileMarketplaceChunk(feed);
                window.requestAnimationFrame(() => bindProfileMarketplaceChunk(feed));
            }
        }

        if (feedType === 'posts') {
            feed.setAttribute('data-profile-has-more', payload.has_more ? '1' : '0');
            feed.setAttribute('data-profile-next-cursor-created-at', String(payload.next_cursor_created_at || ''));
            feed.setAttribute('data-profile-next-cursor-id', String(payload.next_cursor_id || ''));
        } else {
            feed.setAttribute('data-profile-has-more', payload.has_more ? '1' : '0');
            feed.setAttribute('data-profile-next-offset', payload.next_offset === null || payload.next_offset === undefined ? '' : String(payload.next_offset));
        }

        if (feed.getAttribute('data-profile-has-more') === '1') {
            ensureProfileFeedSentinel(feed);
            window.requestAnimationFrame(() => setupProfileInfiniteScroll(feed.parentElement ?? document));
            window.requestAnimationFrame(() => runProfileInfiniteScrollCheck());
        } else {
            feed.parentElement?.querySelector(':scope > [data-profile-feed-sentinel]')?.remove();
            disconnectProfileFeedObserver();
        }
    } finally {
        isProfileFeedRequestInFlight = false;
    }
};

const setupProfileInfiniteScroll = (root = document) => {
    disconnectProfileFeedObserver();
    clearProfileFeedCheckInterval();

    const feed = root.querySelector('[data-profile-feed]');
    if (!(feed instanceof HTMLElement)) {
        return;
    }

    if (feed.getAttribute('data-profile-has-more') !== '1') {
        root.querySelector('[data-profile-feed-sentinel]')?.remove();
        return;
    }

    const sentinel = ensureProfileFeedSentinel(feed);
    if (!(sentinel instanceof HTMLElement)) {
        return;
    }

    activeProfileFeedElement = feed;
    activeProfileFeedCheckInterval = window.setInterval(() => {
        runProfileInfiniteScrollCheck();
    }, 500);

    activeProfileFeedObserver = new IntersectionObserver((entries) => {
        const firstEntry = entries[0];
        if (!firstEntry?.isIntersecting) {
            return;
        }

        loadNextProfileFeedPage(feed).catch(() => {
            disconnectProfileFeedObserver();
        });
    }, {
        rootMargin: '240px 0px',
    });

    activeProfileFeedObserver.observe(sentinel);

    window.requestAnimationFrame(() => {
        const rect = sentinel.getBoundingClientRect();
        if (rect.top <= window.innerHeight + 240) {
            loadNextProfileFeedPage(feed).catch(() => {
                disconnectProfileFeedObserver();
            });
        }
    });
};

const runProfileInfiniteScrollCheck = () => {
    maybeLoadNextProfilePage(document).catch(() => {});
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
    brandSelect.appendChild(buildProfileMarketplaceFallbackOption('', 'Wybierz markÄ™', !brandName));
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
    if (typeof window.openMarketplaceEditModal === 'function') {
        window.openMarketplaceEditModal(payload);
        return;
    }

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
    if (typeof window.closeMarketplaceCreateModal === 'function') {
        window.closeMarketplaceCreateModal();
    } else {
        const backdrop = document.querySelector('[data-marketplace-create-backdrop]');
        const modal = document.querySelector('[data-marketplace-create-modal]');
        if (backdrop instanceof HTMLElement) {
            backdrop.hidden = true;
        }
        if (modal instanceof HTMLElement) {
            modal.hidden = true;
        }
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
            refreshProfileStats();
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

const applyAdminProfileMarketplaceModeration = (root = document) => {
    if (!document.querySelector('[data-admin-profile-view="1"]')) {
        return;
    }

    if (!(root instanceof Element || root instanceof Document)) {
        return;
    }

    root.querySelectorAll('[data-marketplace-report-form]').forEach((form) => {
        if (!(form instanceof HTMLFormElement)) {
            return;
        }

        form.removeAttribute('data-marketplace-report-form');
        form.setAttribute('data-marketplace-delete-form', '');

        const actionInput = form.querySelector('input[name="action"]');
        if (actionInput instanceof HTMLInputElement) {
            actionInput.value = 'delete_listing';
        }

        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton instanceof HTMLButtonElement) {
            submitButton.textContent = 'Usuń ogłoszenie';
        }
    });
};

const bindProfileMarketplaceChunk = (root = document) => {
    if (!(root instanceof Element || root instanceof Document)) {
        return;
    }

    const queryProfileMarketplaceTargets = (selector) => {
        const scopedTargets = Array.from(root.querySelectorAll(selector));
        if (root instanceof Document) {
            return scopedTargets;
        }

        const documentTargets = Array.from(document.querySelectorAll(selector));
        return Array.from(new Set([...scopedTargets, ...documentTargets]));
    };

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

    applyAdminProfileMarketplaceModeration(root);
    bindProfileMarketplaceFallbackWizard();
    bindProfileMarketplaceCreateForm();

    root.querySelectorAll('[data-marketplace-carousel]').forEach((carousel) => {
        initializeProfileMarketplaceCarousel(carousel);
    });

    queryProfileMarketplaceTargets('[data-marketplace-save-form]').forEach((form) => {
        if (!(form instanceof HTMLFormElement) || form.dataset.boundProfileSave === 'true') {
            return;
        }

        form.addEventListener('click', (event) => {
            event.stopPropagation();
        });

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

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
        }, true);

        form.dataset.boundProfileSave = 'true';
    });

    queryProfileMarketplaceTargets('[data-marketplace-report-form]').forEach((form) => {
        if (!(form instanceof HTMLFormElement) || form.dataset.boundProfileReport === 'true') {
            return;
        }

        const handleListingReport = async (event) => {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            const selection = await openProfileContentReportModal({
                kicker: 'Zgłoszenie ogłoszenia',
                title: 'Wybierz powód zgłoszenia ogłoszenia',
                reasons: [
                    { value: 'misleading_listing', label: 'Ogłoszenie zawiera wprowadzające w błąd informacje' },
                    { value: 'prohibited_listing', label: 'Ogłoszenie zawiera niedozwoloną treść' },
                    { value: 'spam_listing', label: 'To spam lub duplikat ogłoszenia' },
                    { value: 'privacy_listing', label: 'Ogłoszenie narusza prywatność lub dane osobowe' },
                    { value: 'scam_listing', label: 'Ogłoszenie wygląda na próbę oszustwa' },
                ],
            });
            if (!selection || typeof selection.code !== 'string' || selection.code.trim() === '') {
                return;
            }

            const formData = new FormData(form);
            formData.set('report_reason_code', selection.code);
            formData.set('report_reason_text', typeof selection.text === 'string' ? selection.text : '');
            const endpoint = form.getAttribute('action') || '/marketplace';

            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                });

                const payload = await response.json().catch(() => null);
                if (!response.ok || !payload?.success) {
                    throw new Error(String(payload?.message || 'Nie udało się zgłosić ogłoszenia.'));
                }

                if (typeof window.showAppToast === 'function') {
                    window.showAppToast(payload.message || 'Ogloszenie zostalo zgloszone.', 'success');
                }
                closeProfileMarketplaceMenus();
            } catch (error) {
                if (typeof window.showAppToast === 'function') {
                    window.showAppToast(error instanceof Error ? error.message : 'Nie udało się zgłosić ogłoszenia.', 'error');
                }
            }
        };

        form.addEventListener('submit', handleListingReport, true);

        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton instanceof HTMLButtonElement) {
            submitButton.addEventListener('click', handleListingReport, true);
        }

        form.dataset.boundProfileReport = 'true';
    });

    queryProfileMarketplaceTargets('[data-marketplace-delete-form]').forEach((form) => {
        if (!(form instanceof HTMLFormElement) || form.dataset.boundProfileDelete === 'true') {
            return;
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            const confirmed = await openProfileMarketplaceConfirmModal({
                kicker: 'Usuwanie ogłoszenia',
                title: 'Usunąć ogłoszenie?',
                message: 'Usunięcie ogłoszenia skasuje je na stałe wraz z jego zdjęciami. Tej operacji nie da się cofnąć.',
                confirmLabel: 'Usuń ogłoszenie',
                tone: 'danger',
            });
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
                refreshProfileStats();
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

    queryProfileMarketplaceTargets('[data-marketplace-visibility-form]').forEach((form) => {
        if (!(form instanceof HTMLFormElement) || form.dataset.boundProfileVisibility === 'true') {
            return;
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            const action = String(form.querySelector('input[name="action"]')?.value || '');
            const confirmed = await openProfileMarketplaceConfirmModal(action === 'resume_listing'
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
                });
            if (!confirmed) {
                return;
            }

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

                refreshProfileStats();
                if (typeof window.showAppToast === 'function') {
                    window.showAppToast(payload.message || (payload.is_active ? 'Ogłoszenie zostało wznowione.' : 'Ogłoszenie zostało zakończone.'), 'success');
                }
                closeProfileMarketplaceMenus();
            } catch {
                form.submit();
            }
        }, true);

        form.dataset.boundProfileVisibility = 'true';
    });
};

let isProfilePostsPageLoading = false;
let isProfileListingsPageLoading = false;

const teardownProfileInfiniteScrollListeners = () => {
    if (activeProfileInfiniteScrollTarget && activeProfileInfiniteScrollHandler) {
        activeProfileInfiniteScrollTarget.removeEventListener('scroll', activeProfileInfiniteScrollHandler);
    }

    window.removeEventListener('resize', runProfileInfiniteScrollCheck);
    activeProfileInfiniteScrollTarget = null;
    activeProfileInfiniteScrollHandler = null;
};

const getActiveProfileFeed = (root = document) => {
    const postsFeed = root.querySelector('[data-community-feed]');
    if (postsFeed instanceof HTMLElement) {
        return { type: 'posts', feed: postsFeed };
    }

    const listingsFeed = root.querySelector('[data-marketplace-feed]');
    if (listingsFeed instanceof HTMLElement) {
        return { type: 'listings', feed: listingsFeed };
    }

    return null;
};

const isNearBottomOfProfileScroll = () => {
    const scrollContainer = getProfileScrollContainer();

    if (scrollContainer instanceof Window) {
        const scrollBottom = window.scrollY + window.innerHeight;
        const pageBottom = document.documentElement.scrollHeight;
        return scrollBottom >= pageBottom - 180;
    }

    const scrollBottom = scrollContainer.scrollTop + scrollContainer.clientHeight;
    return scrollBottom >= scrollContainer.scrollHeight - 180;
};

const maybeLoadNextProfilePage = async (root = document) => {
    const activeFeed = getActiveProfileFeed(root);
    if (!activeFeed || !isNearBottomOfProfileScroll()) {
        return;
    }

    if (activeFeed.type === 'posts') {
        await loadNextProfilePostsPage(activeFeed.feed);
        return;
    }

    await loadNextProfileListingsPage(activeFeed.feed);
};

const loadNextProfilePostsPage = async (feed, { suppressAutoCascade = false } = {}) => {
    if (!(feed instanceof HTMLElement) || isProfilePostsPageLoading || feed.dataset.hasMore !== '1') {
        return;
    }

    const cursorCreatedAt = feed.dataset.nextCursorCreatedAt ?? '';
    const cursorId = feed.dataset.nextCursorId ?? '';
    if (!cursorCreatedAt || !cursorId) {
        feed.dataset.hasMore = '0';
        return;
    }

    const loader = feed.querySelector('[data-community-feed-loader]');
    if (loader instanceof HTMLElement) {
        loader.hidden = false;
    }

    isProfilePostsPageLoading = true;

    try {
        const url = new URL(window.location.href);
        url.searchParams.set('scope', 'posts');
        url.searchParams.set('feed_page', '1');
        url.searchParams.set('cursor_created_at', cursorCreatedAt);
        url.searchParams.set('cursor_id', cursorId);

        const response = await fetch(url.toString(), {
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Request failed');
        }

        const payload = parseProfileJsonResponse(await response.text());
        if (!payload.success) {
            throw new Error('Invalid payload');
        }

        const wrapper = document.createElement('div');
        wrapper.innerHTML = payload.html || '';
        if (typeof window.initializeCommunityFeedChunk === 'function') {
            window.initializeCommunityFeedChunk(wrapper);
        }

        const fragment = document.createDocumentFragment();
        while (wrapper.firstChild) {
            fragment.appendChild(wrapper.firstChild);
        }

        const sentinel = feed.querySelector('[data-community-feed-sentinel]');
        const referenceNode = sentinel ?? loader ?? null;
        feed.insertBefore(fragment, referenceNode);

        feed.dataset.hasMore = payload.has_more ? '1' : '0';
        feed.dataset.nextCursorCreatedAt = String(payload.next_cursor_created_at || '');
        feed.dataset.nextCursorId = payload.next_cursor_id ? String(payload.next_cursor_id) : '';
    } catch {
        feed.dataset.hasMore = '0';
    } finally {
        if (loader instanceof HTMLElement) {
            loader.hidden = true;
        }
        isProfilePostsPageLoading = false;

        if (!suppressAutoCascade && feed.dataset.hasMore === '1' && isNearBottomOfProfileScroll()) {
            window.setTimeout(() => {
                loadNextProfilePostsPage(feed).catch(() => {});
            }, 80);
        }
    }
};

const loadNextProfileListingsPage = async (feed) => {
    if (!(feed instanceof HTMLElement) || isProfileListingsPageLoading || feed.dataset.hasMore !== '1') {
        return;
    }

    const nextOffset = feed.dataset.nextOffset ?? '0';
    if (!nextOffset) {
        feed.dataset.hasMore = '0';
        return;
    }

    const loader = feed.querySelector('[data-marketplace-feed-loader]');
    if (loader instanceof HTMLElement) {
        loader.hidden = false;
    }

    isProfileListingsPageLoading = true;

    try {
        const url = new URL(window.location.href);
        url.searchParams.set('scope', 'listings');
        url.searchParams.set('feed_page', '1');
        url.searchParams.set('offset', nextOffset);

        const response = await fetch(url.toString(), {
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Request failed');
        }

        const payload = parseProfileJsonResponse(await response.text());
        if (!payload.success) {
            throw new Error('Invalid payload');
        }

        const wrapper = document.createElement('div');
        wrapper.innerHTML = payload.html || '';
        if (typeof window.initializeMarketplaceChunk === 'function') {
            window.initializeMarketplaceChunk(wrapper);
        }
        bindProfileMarketplaceChunk(wrapper);

        const fragment = document.createDocumentFragment();
        while (wrapper.firstChild) {
            fragment.appendChild(wrapper.firstChild);
        }

        const sentinel = feed.querySelector('[data-marketplace-feed-sentinel]');
        const referenceNode = sentinel ?? loader ?? null;
        feed.insertBefore(fragment, referenceNode);

        feed.dataset.hasMore = payload.has_more ? '1' : '0';
        feed.dataset.nextOffset = payload.next_offset ? String(payload.next_offset) : '0';
    } catch {
        feed.dataset.hasMore = '0';
    } finally {
        if (loader instanceof HTMLElement) {
            loader.hidden = true;
        }
        isProfileListingsPageLoading = false;

        if (feed.dataset.hasMore === '1') {
            window.setTimeout(() => {
                loadNextProfileListingsPage(feed).catch(() => {});
            }, 80);
        }
    }
};

const maybeResolveProfilePostHashTarget = async (root = document) => {
    const postId = getProfilePostHashTargetId();
    if (!postId) {
        activeProfileHashPostSearch = null;
        return;
    }

    const activeFeed = getActiveProfileFeed(root);
    if (!activeFeed || activeFeed.type !== 'posts') {
        activeProfileHashPostSearch = null;
        return;
    }

    if (scrollProfilePostIntoView(postId)) {
        await maybeOpenProfilePostComments(postId);
        activeProfileHashPostSearch = null;
        return;
    }

    if (activeFeed.feed.dataset.hasMore !== '1') {
        activeProfileHashPostSearch = null;
        return;
    }

    if (activeProfileHashPostSearch === postId || isProfilePostsPageLoading) {
        return;
    }

    activeProfileHashPostSearch = postId;

    try {
        while (activeFeed.feed.dataset.hasMore === '1') {
            await loadNextProfilePostsPage(activeFeed.feed, { suppressAutoCascade: true });

            if (scrollProfilePostIntoView(postId)) {
                await maybeOpenProfilePostComments(postId);
                activeProfileHashPostSearch = null;
                return;
            }

            if (activeFeed.feed.dataset.hasMore !== '1') {
                break;
            }
        }
    } finally {
        if (activeProfileHashPostSearch === postId) {
            activeProfileHashPostSearch = null;
        }
    }
};

const initializeProfileFeedPagination = (root = document) => {
    teardownProfileInfiniteScrollListeners();

    const activeFeed = getActiveProfileFeed(root);
    if (!activeFeed || activeFeed.feed.dataset.hasMore !== '1') {
        return;
    }

    const scrollContainer = getProfileScrollContainer();
    const scrollTarget = scrollContainer instanceof Window ? window : scrollContainer;
    const handler = () => {
        maybeLoadNextProfilePage(root).catch(() => {});
    };

    scrollTarget.addEventListener('scroll', handler, { passive: true });
    window.addEventListener('resize', runProfileInfiniteScrollCheck, { passive: true });
    activeProfileInfiniteScrollTarget = scrollTarget;
    activeProfileInfiniteScrollHandler = handler;

    window.setTimeout(() => {
        maybeLoadNextProfilePage(root).catch(() => {});
    }, 80);
};

const reinitializeProfileActivityChunk = (root = document) => {
    if (typeof window.initializeCommunityFeedChunk === 'function') {
        window.initializeCommunityFeedChunk(root);
    }

    bindProfileMarketplaceChunk(root);
    initializeProfileFeedPagination(root);
    maybeResolveProfilePostHashTarget(root).catch(() => {});
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
    bindProfileAvatarModal();
    bindProfileHeroActions();
    reinitializeProfileActivityChunk(document.querySelector('[data-profile-activity-root]') ?? document);
    window.addEventListener('hashchange', () => {
        maybeResolveProfilePostHashTarget(document.querySelector('[data-profile-activity-root]') ?? document).catch(() => {});
    });
    document.addEventListener('profile:stats-refresh', () => {
        refreshProfileStats();
    });
    document.addEventListener('click', (event) => {
        const target = event.target instanceof Element ? event.target : null;
        const submitButton = target?.closest('button[type="submit"]');
        if (!(submitButton instanceof HTMLButtonElement)) {
            return;
        }

        const profileReportForm = submitButton.closest('[data-profile-report-form]');
        if (profileReportForm instanceof HTMLFormElement) {
            event.preventDefault();
            event.stopPropagation();
            if (typeof event.stopImmediatePropagation === 'function') {
                event.stopImmediatePropagation();
            }

            profileReportForm.requestSubmit();
            return;
        }

        const communityReportForm = submitButton.closest('[data-community-report-form]');
        if (communityReportForm instanceof HTMLFormElement) {
            event.preventDefault();
            event.stopPropagation();
            if (typeof event.stopImmediatePropagation === 'function') {
                event.stopImmediatePropagation();
            }

            submitProfileCommunityReportForm(communityReportForm);
            return;
        }

        const marketplaceReportForm = submitButton.closest('[data-marketplace-report-form]');
        if (marketplaceReportForm instanceof HTMLFormElement) {
            event.preventDefault();
            event.stopPropagation();
            if (typeof event.stopImmediatePropagation === 'function') {
                event.stopImmediatePropagation();
            }

            marketplaceReportForm.requestSubmit();
        }
    }, true);

    document.addEventListener('submit', async (event) => {
        const form = event.target instanceof HTMLFormElement ? event.target : null;
        if (!(form instanceof HTMLFormElement) || !document.querySelector('[data-admin-profile-view="1"]')) {
            return;
        }

        const actionInput = form.querySelector('input[name="action"]');
        const action = String(actionInput?.value || '');
        if (action !== 'delete_post' && action !== 'delete_listing') {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const isPostDelete = action === 'delete_post';
        const reason = await openProfileModerationReasonModal({
            kicker: 'Moderacja',
            title: isPostDelete ? 'Usuń post użytkownika' : 'Usuń ogłoszenie użytkownika',
            reasons: isPostDelete
                ? [
                    'Treść narusza regulamin serwisu.',
                    'Treść ma charakter obraźliwy lub nękający.',
                    'To spam lub niedozwolona promocja.',
                    'Treść narusza prywatność lub dane osobowe.',
                    'Treść jest niezgodna z tematyką serwisu.',
                ]
                : [
                    'Ogłoszenie narusza regulamin serwisu.',
                    'To spam lub duplikat ogłoszenia.',
                    'Ogłoszenie zawiera wprowadzające w błąd informacje.',
                    'Ogłoszenie zawiera niedozwoloną treść.',
                    'Ogłoszenie narusza prywatność lub dane osobowe.',
                ],
        });

        if (typeof reason !== 'string' || reason.trim() === '') {
            return;
        }

        let reasonInput = form.querySelector('input[name="moderation_reason"]');
        if (!(reasonInput instanceof HTMLInputElement)) {
            reasonInput = document.createElement('input');
            reasonInput.type = 'hidden';
            reasonInput.name = 'moderation_reason';
            form.appendChild(reasonInput);
        }
        reasonInput.value = reason.trim();

        const formData = new FormData(form);
        const endpoint = form.getAttribute('action') || (isPostDelete ? window.location.pathname + window.location.search : '/marketplace');

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            const payload = await response.json();
            if (!response.ok || !payload.success) {
                throw new Error(String(payload?.message || 'Request failed'));
            }

            if (isPostDelete) {
                const postId = String(formData.get('post_id') || '');
                document.querySelectorAll(`#post-${postId}`).forEach((element) => element.remove());
                if (typeof window.showAppToast === 'function') {
                    window.showAppToast(payload.message || 'Post został usunięty.', 'success');
                }
                closeProfileCommunityPostMenus();
            } else {
                const listingId = String(formData.get('listing_id') || '');
                document.querySelectorAll(`#listing-${listingId}`).forEach((element) => element.remove());
                document.querySelectorAll(`#marketplace-details-modal-${listingId}`).forEach((element) => element.remove());
                if (typeof window.showAppToast === 'function') {
                    window.showAppToast(payload.message || 'Ogłoszenie zostało usunięte.', 'success');
                }
                closeProfileMarketplaceMenus();
            }

            refreshProfileStats();
        } catch (error) {
            const message = error instanceof Error && error.message !== '' ? error.message : 'Nie udało się usunąć treści.';
            if (typeof window.showAppToast === 'function') {
                window.showAppToast(message, 'error');
            } else {
                form.submit();
            }
        }
    }, true);

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

        const communityReportButton = target.closest('[data-community-report-form] button[type="submit"]');
        if (communityReportButton instanceof HTMLButtonElement && communityReportButton.closest('.profile-page, [data-community-comments-modal]')) {
            const form = communityReportButton.closest('[data-community-report-form]');
            if (form instanceof HTMLFormElement) {
                event.preventDefault();
                event.stopPropagation();
                if (typeof event.stopImmediatePropagation === 'function') {
                    event.stopImmediatePropagation();
                }

                submitProfileCommunityReportForm(form);
                return;
            }
        }

        const communityMenuTrigger = target.closest('[data-community-post-menu-trigger]');
        if (communityMenuTrigger && communityMenuTrigger.closest('.profile-page, [data-community-comments-modal]')) {
            event.preventDefault();
            event.stopPropagation();

            const menu = communityMenuTrigger.closest('[data-community-post-menu]');
            const dropdown = menu?.querySelector('[data-community-post-menu-dropdown]');
            if (!(menu instanceof HTMLElement) || !(dropdown instanceof HTMLElement)) {
                return;
            }

            const isOpen = communityMenuTrigger.getAttribute('aria-expanded') === 'true';
            closeProfileCommunityPostMenus(isOpen ? null : menu);
            communityMenuTrigger.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
            dropdown.hidden = isOpen;
            return;
        }

        if (!target.closest('[data-community-post-menu]')) {
            closeProfileCommunityPostMenus();
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
            contactToggle.textContent = shouldShow ? 'Ukryj dane kontaktowe' : 'SprawdĹş dane kontaktowe';
            return;
        }
    });
}
