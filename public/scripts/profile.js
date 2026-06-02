const isProfilePage = Boolean(document.querySelector('.profile-page'));

if (isProfilePage) {
    document.body.classList.add('is-profile-page');
}

const reinitializeProfileActivityChunk = (root = document) => {
    if (typeof window.initializeCommunityFeedChunk === 'function') {
        window.initializeCommunityFeedChunk(root);
    }

    if (typeof window.initializeMarketplaceChunk === 'function') {
        window.initializeMarketplaceChunk(root);
    }
};

const closeProfileTransientUi = () => {
    document.querySelectorAll('[data-marketplace-details-modal]').forEach((modal) => {
        modal.hidden = true;
    });
    document.querySelectorAll('[data-community-comments-modal]').forEach((modal) => {
        modal.hidden = true;
    });
    document.querySelectorAll('[data-marketplace-menu]').forEach((menu) => {
        const trigger = menu.querySelector('[data-marketplace-menu-trigger]');
        const dropdown = menu.querySelector('[data-marketplace-menu-dropdown]');
        if (trigger) {
            trigger.setAttribute('aria-expanded', 'false');
        }
        if (dropdown) {
            dropdown.hidden = true;
        }
    });
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

    document.addEventListener('submit', async (event) => {
        const target = event.target instanceof Element ? event.target : null;
        const form = target?.closest('form');
        if (!(form instanceof HTMLFormElement) || !form.closest('.profile-page')) {
            return;
        }

        if (!form.matches('[data-marketplace-save-form], [data-marketplace-report-form], [data-marketplace-delete-form]')) {
            return;
        }

        event.preventDefault();

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

            if (form.matches('[data-marketplace-save-form]')) {
                document.querySelectorAll(`[data-marketplace-save-form][data-marketplace-listing-id="${listingId}"]`).forEach((linkedForm) => {
                    const button = linkedForm.querySelector('[data-marketplace-save-button]');
                    const icon = linkedForm.querySelector('[data-marketplace-save-icon]');
                    if (!button || !icon) {
                        return;
                    }

                    const saved = Boolean(payload.saved_by_current_user);
                    button.classList.toggle('is-active', saved);
                    icon.innerHTML = saved
                        ? '<svg viewBox="0 0 24 24" class="marketplace-save-heart-svg is-filled"><path d="M12 21.35 10.55 20.03C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54Z"/></svg>'
                        : '<svg viewBox="0 0 24 24" class="marketplace-save-heart-svg is-outline"><path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09A5.964 5.964 0 0 0 7.5 3C4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.31C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3Zm-4.4 15.55-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5 18.5 5 20 6.5 20 8.5c0 2.89-3.14 5.74-7.9 10.05Z"/></svg>';
                });
                return;
            }

            if (form.matches('[data-marketplace-report-form]')) {
                if (typeof window.showAppToast === 'function') {
                    window.showAppToast(payload.message || 'Ogloszenie zostalo zgloszone.', 'success');
                }
                return;
            }

            if (form.matches('[data-marketplace-delete-form]')) {
                document.querySelectorAll(`#listing-${listingId}`).forEach((element) => element.remove());
                document.querySelectorAll(`#marketplace-details-modal-${listingId}`).forEach((element) => element.remove());
                if (typeof window.showAppToast === 'function') {
                    window.showAppToast(payload.message || 'Ogloszenie zostalo usuniete.', 'success');
                }
            }
        } catch {
            form.submit();
        }
    }, true);

    document.addEventListener('click', (event) => {
        const target = event.target instanceof Element ? event.target : null;
        if (!target) {
            return;
        }

        const profileActivityLink = target.closest('[data-profile-activity-link]');
        if (!(profileActivityLink instanceof HTMLAnchorElement)) {
            return;
        }

        event.preventDefault();
        loadProfileActivityChunk(profileActivityLink.href).catch(() => {
            window.location.href = profileActivityLink.href;
        });
    });
}
