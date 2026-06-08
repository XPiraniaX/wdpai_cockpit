(() => {
    const fallbackShowAppToast = (message, type = 'info') => {
        const existingToast = document.querySelector('[data-app-toast]');
        existingToast?.remove();

        const toast = document.createElement('div');
        toast.className = `app-toast app-toast-${type}`;
        toast.setAttribute('data-app-toast', '');

        const content = document.createElement('div');
        content.className = 'app-toast-message';
        content.textContent = String(message || '');
        toast.appendChild(content);

        document.body.appendChild(toast);

        window.setTimeout(() => {
            toast.classList.add('is-hiding');
            window.setTimeout(() => toast.remove(), 260);
        }, 5000);
    };

    if (typeof window.showAppToast !== 'function') {
        window.showAppToast = fallbackShowAppToast;
    }

    const root = document.querySelector('.admin-panel-page');
    if (!(root instanceof HTMLElement)) {
        return;
    }

    const tabLinks = Array.from(root.querySelectorAll('[data-admin-tab-link]'));
    const tabPanels = Array.from(root.querySelectorAll('[data-admin-tab-panel]'));
    const allowedTabs = new Set(tabLinks.map((link) => String(link.getAttribute('data-admin-tab') || '')));
    const breadcrumbTitle = document.querySelector('[data-admin-breadcrumb-title]');
    const breadcrumbSubtitle = document.querySelector('[data-admin-breadcrumb-subtitle]');

    const catalogRoot = root.querySelector('[data-admin-user-catalog]');
    const catalogRowsRoot = root.querySelector('[data-admin-catalog-rows]');
    const catalogPageStatus = root.querySelector('[data-admin-catalog-page-status]');
    const catalogPageList = root.querySelector('[data-admin-catalog-page-list]');
    const catalogPrevButton = root.querySelector('[data-admin-catalog-prev]');
    const catalogNextButton = root.querySelector('[data-admin-catalog-next]');

    const userModalRoot = document.querySelector('[data-admin-user-modal-root]');
    const userModalAvatar = document.querySelector('[data-admin-user-modal-avatar]');
    const userModalPseudonym = document.querySelector('[data-admin-user-modal-pseudonym]');
    const userModalFullName = document.querySelector('[data-admin-user-modal-full-name]');
    const userModalMembershipTier = document.querySelector('[data-admin-user-modal-membership-tier]');
    const userModalEmail = document.querySelector('[data-admin-user-modal-email]');
    const userModalBanStatus = document.querySelector('[data-admin-user-modal-ban-status]');
    const userModalVehicleCount = document.querySelector('[data-admin-user-modal-vehicle-count]');
    const userModalPostCount = document.querySelector('[data-admin-user-modal-post-count]');
    const userModalListingCount = document.querySelector('[data-admin-user-modal-listing-count]');
    const userModalRemovedPostCount = document.querySelector('[data-admin-user-modal-removed-post-count]');
    const userModalRemovedListingCount = document.querySelector('[data-admin-user-modal-removed-listing-count]');
    const userModalProfileLink = document.querySelector('[data-admin-user-modal-profile-link]');
    const userModalBanButton = document.querySelector('[data-admin-user-modal-ban-button]');

    const moderationModalRoot = document.querySelector('[data-admin-ban-modal-root]');
    const moderationModalTitle = document.querySelector('[data-admin-ban-modal-title]');
    const moderationModalCopy = document.querySelector('[data-admin-ban-modal-copy]');
    const moderationModalLastSummary = document.querySelector('[data-admin-ban-modal-last-summary]');
    const moderationModalOptions = document.querySelector('[data-admin-ban-modal-options]');
    const moderationModalOther = document.querySelector('[data-admin-ban-modal-other]');
    const moderationModalOtherInput = document.querySelector('[data-admin-ban-modal-other-input]');
    const moderationModalSummary = document.querySelector('[data-admin-ban-modal-summary]');
    const moderationModalBack = document.querySelector('[data-admin-ban-modal-back]');
    const moderationModalConfirm = document.querySelector('[data-admin-ban-modal-confirm]');
    const warningModalRoot = document.querySelector('[data-admin-warning-modal-root]');
    const warningModalCopy = document.querySelector('[data-admin-warning-modal-copy]');
    const warningModalInput = document.querySelector('[data-admin-warning-modal-input]');
    const warningModalConfirm = document.querySelector('[data-admin-warning-modal-confirm]');

    const tabLabelMap = {
        dashboard: 'Dashboard',
        users: 'Użytkownicy',
        cars: 'Samochody',
        reports: 'Zgłoszenia',
    };

    const placeholderMessages = {
        warning: 'Wysyłanie ostrzeżenia będzie dostępne w kolejnym kroku.',
        marketplace: 'Blokada funkcji marketplace będzie dostępna w kolejnym kroku.',
        community: 'Blokada funkcji społeczności będzie dostępna w kolejnym kroku.',
    };

    const banReasonOptions = [
        'Mowa nienawiści lub groźby wobec innych użytkowników',
        'Spam lub masowe nadużycia w serwisie',
        'Podszywanie się pod inną osobę lub markę',
        'Publikowanie niedozwolonych treści',
        'Omijanie wcześniejszych kar lub blokad',
        'Inny powód',
    ];

    const banDurationOptions = [
        { value: '1h', label: 'Godzina' },
        { value: '24h', label: '24h' },
        { value: '3d', label: '3 dni' },
        { value: '7d', label: '7 dni' },
        { value: '14d', label: '14 dni' },
        { value: '1m', label: 'Miesiąc' },
        { value: '3m', label: '3 miesiące' },
        { value: 'permanent', label: 'Na stałe' },
    ];

    const catalogState = {
        page: Number(catalogRoot?.getAttribute('data-admin-catalog-page') || 1),
        totalPages: Number(catalogRoot?.getAttribute('data-admin-catalog-total-pages') || 1),
        totalUsers: Number(catalogRoot?.getAttribute('data-admin-catalog-total-users') || 0),
        isLoading: false,
    };

    const moderationState = {
        mode: null,
        step: null,
        user: null,
        reasonChoice: '',
        customReason: '',
        durationCode: '',
        durationLabel: '',
        isSubmitting: false,
    };

    const warningState = {
        user: null,
        message: '',
        isSubmitting: false,
    };

    const showToast = (message, type = 'info') => {
        if (typeof window.showAppToast === 'function') {
            window.showAppToast(message, type);
        }
    };

    const csrfHeaders = () => {
        const token = String(window.APP_CSRF_TOKEN || '');
        return token !== '' ? { 'X-CSRF-Token': token } : {};
    };

    const resolveActiveTab = () => {
        const rawHash = (window.location.hash || '').replace(/^#/, '').trim();
        return allowedTabs.has(rawHash) ? rawHash : 'dashboard';
    };

    const escapeHtml = (value) => String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

    const escapeAttribute = (value) => escapeHtml(String(value || ''));

    const parseBoolean = (value) => String(value || '') === '1' || String(value || '').toLowerCase() === 'true';

    const getBlockedStatusLabel = (user) => {
        return String(user.blockedUntilLabel || '').trim();
    };

    const parseUserFromRow = (trigger) => ({
        id: Number(trigger.getAttribute('data-admin-user-id') || 0),
        pseudonym: String(trigger.getAttribute('data-admin-user-pseudonym') || '').trim(),
        fullName: String(trigger.getAttribute('data-admin-user-full-name') || '').trim(),
        email: String(trigger.getAttribute('data-admin-user-email') || '').trim(),
        avatarPath: String(trigger.getAttribute('data-admin-user-avatar-path') || '').trim(),
        membershipTier: String(trigger.getAttribute('data-admin-user-membership-tier') || '').trim(),
        vehicleCount: Number(trigger.getAttribute('data-admin-user-vehicle-count') || 0),
        listingCount: Number(trigger.getAttribute('data-admin-user-listing-count') || 0),
        postCount: Number(trigger.getAttribute('data-admin-user-post-count') || 0),
        removedListingCount: Number(trigger.getAttribute('data-admin-user-removed-listing-count') || 0),
        removedPostCount: Number(trigger.getAttribute('data-admin-user-removed-post-count') || 0),
        adminProfilePath: String(trigger.getAttribute('data-admin-user-admin-profile-path') || '/admin'),
        isBlocked: parseBoolean(trigger.getAttribute('data-admin-user-is-blocked')),
        blockedUntilLabel: String(trigger.getAttribute('data-admin-user-blocked-until-label') || '').trim(),
        presenceLabel: String(trigger.getAttribute('data-admin-user-presence-label') || '').trim(),
        blockedReason: String(trigger.getAttribute('data-admin-user-blocked-reason') || '').trim(),
        lastBanSummary: String(trigger.getAttribute('data-admin-user-last-ban-summary') || '').trim(),
    });

    const buildRowMarkup = (row) => {
        const avatarPath = String(row.avatar_path || '');
        const hasImage = avatarPath.trim() !== '';
        const pseudonym = escapeHtml(String(row.pseudonym || ''));
        const fullName = escapeHtml(String(row.full_name || ''));
        const email = escapeHtml(String(row.email || ''));
        const statusMarkup = row.is_blocked && row.blocked_until_label
            ? `<span class="admin-catalog-status-text">${escapeHtml(String(row.blocked_until_label || ''))}</span>`
            : (String(row.presence_label || '').trim() !== ''
                ? `<span class="admin-catalog-status-text is-neutral${String(row.presence_label || '') === 'Online' ? ' is-online' : ''}">${escapeHtml(String(row.presence_label || ''))}</span>`
                : '');

        return `
            <button
                type="button"
                class="admin-catalog-table admin-catalog-table-row"
                data-admin-user-row
                data-admin-user-id="${Number(row.id || 0)}"
                data-admin-user-pseudonym="${escapeAttribute(String(row.pseudonym || ''))}"
                data-admin-user-full-name="${escapeAttribute(String(row.full_name || ''))}"
                data-admin-user-email="${escapeAttribute(String(row.email || ''))}"
                data-admin-user-avatar-path="${escapeAttribute(avatarPath)}"
                data-admin-user-membership-tier="${escapeAttribute(String(row.membership_tier || 'FREE MEMBER'))}"
                data-admin-user-vehicle-count="${Number(row.vehicle_count || 0)}"
                data-admin-user-listing-count="${Number(row.listing_count || 0)}"
                data-admin-user-post-count="${Number(row.post_count || 0)}"
                data-admin-user-removed-listing-count="${Number(row.admin_removed_listing_count || 0)}"
                data-admin-user-removed-post-count="${Number(row.admin_removed_post_count || 0)}"
                data-admin-user-admin-profile-path="${escapeAttribute(String(row.admin_profile_path || '/admin'))}"
                data-admin-user-is-blocked="${row.is_blocked ? '1' : '0'}"
                data-admin-user-blocked-until-label="${escapeAttribute(String(row.blocked_until_label || ''))}"
                data-admin-user-blocked-reason="${escapeAttribute(String(row.blocked_reason || ''))}"
                data-admin-user-last-ban-summary="${escapeAttribute(String(row.last_ban_summary || ''))}"
            >
                <span class="admin-catalog-identity">
                    <span class="admin-catalog-avatar${hasImage ? ' has-image' : ''}">
                        ${hasImage ? `<img src="${escapeAttribute(avatarPath)}" alt="${pseudonym}" class="admin-catalog-avatar-image">` : ''}
                        <span class="admin-catalog-avatar-ring"></span>
                    </span>
                    <span class="admin-catalog-identity-copy">
                        <span class="admin-catalog-primary-line">
                            <span class="admin-catalog-pseudonym">${pseudonym}</span>
                            <span class="admin-catalog-separator">•</span>
                            <span class="admin-catalog-full-name">${fullName}</span>
                        </span>
                        <span class="admin-catalog-email">${email}</span>
                    </span>
                </span>
                <span class="admin-catalog-status">${statusMarkup}</span>
                <span class="admin-catalog-metric">
                    <span class="admin-catalog-metric-icon" style="--icon-url: url('/public/assets/icons/my_cars.svg');"></span>
                    <span class="admin-catalog-metric-value">${Number(row.vehicle_count || 0)}</span>
                </span>
                <span class="admin-catalog-metric">
                    <span class="admin-catalog-metric-icon" style="--icon-url: url('/public/assets/icons/marketplace.svg');"></span>
                    <span class="admin-catalog-metric-stack">
                        <span class="admin-catalog-metric-value">${Number(row.listing_count || 0)}</span>
                        ${Number(row.admin_removed_listing_count || 0) > 0 ? `<span class="admin-catalog-metric-removed">${Number(row.admin_removed_listing_count || 0)}</span>` : ''}
                    </span>
                </span>
                <span class="admin-catalog-metric">
                    <span class="admin-catalog-metric-icon" style="--icon-url: url('/public/assets/icons/community.svg');"></span>
                    <span class="admin-catalog-metric-stack">
                        <span class="admin-catalog-metric-value">${Number(row.post_count || 0)}</span>
                        ${Number(row.admin_removed_post_count || 0) > 0 ? `<span class="admin-catalog-metric-removed">${Number(row.admin_removed_post_count || 0)}</span>` : ''}
                    </span>
                </span>
            </button>
        `;
    };

    const ensureAvatar = (container, avatarPath, pseudonym, imageClass) => {
        if (!(container instanceof HTMLElement)) {
            return;
        }

        container.classList.toggle('has-image', avatarPath !== '');
        container.querySelectorAll(`.${imageClass}`).forEach((node) => node.remove());
        if (avatarPath === '') {
            return;
        }

        const image = document.createElement('img');
        image.src = avatarPath;
        image.alt = pseudonym;
        image.className = imageClass;
        container.prepend(image);
    };

    const applyUserToModal = (user) => {
        if (!(userModalRoot instanceof HTMLElement)) {
            return;
        }

        userModalRoot.setAttribute('data-admin-user-id', String(user.id || 0));
        userModalRoot.setAttribute('data-admin-user-is-blocked', user.isBlocked ? '1' : '0');

        if (userModalPseudonym instanceof HTMLElement) {
            userModalPseudonym.textContent = user.pseudonym || 'Użytkownik';
        }
        if (userModalFullName instanceof HTMLElement) {
            userModalFullName.textContent = user.fullName || 'Użytkownik';
        }
        if (userModalMembershipTier instanceof HTMLElement) {
            userModalMembershipTier.textContent = user.membershipTier || 'FREE MEMBER';
        }
        if (userModalEmail instanceof HTMLElement) {
            userModalEmail.textContent = user.email || 'Brak adresu e-mail';
        }
        if (userModalVehicleCount instanceof HTMLElement) {
            userModalVehicleCount.textContent = String(Number(user.vehicleCount || 0));
        }
        if (userModalPostCount instanceof HTMLElement) {
            userModalPostCount.textContent = String(Number(user.postCount || 0));
        }
        if (userModalListingCount instanceof HTMLElement) {
            userModalListingCount.textContent = String(Number(user.listingCount || 0));
        }
        if (userModalRemovedPostCount instanceof HTMLElement) {
            userModalRemovedPostCount.textContent = String(Number(user.removedPostCount || 0));
        }
        if (userModalRemovedListingCount instanceof HTMLElement) {
            userModalRemovedListingCount.textContent = String(Number(user.removedListingCount || 0));
        }
        if (userModalProfileLink instanceof HTMLAnchorElement) {
            userModalProfileLink.href = user.adminProfilePath || '/admin';
        }

        ensureAvatar(userModalAvatar, user.avatarPath || '', user.pseudonym || 'Użytkownik', 'admin-profile-modal-avatar-image');

        if (userModalBanStatus instanceof HTMLElement) {
            const blockedLabel = getBlockedStatusLabel(user);
            if (user.isBlocked && blockedLabel !== '') {
                userModalBanStatus.hidden = false;
                userModalBanStatus.textContent = blockedLabel;
            } else {
                userModalBanStatus.hidden = true;
                userModalBanStatus.textContent = '';
            }
        }

        if (userModalBanButton instanceof HTMLButtonElement) {
            userModalBanButton.textContent = user.isBlocked ? 'Odblokuj' : 'Zablokuj';
            userModalBanButton.setAttribute('data-admin-user-modal-action', user.isBlocked ? 'unban' : 'ban');
            userModalBanButton.classList.toggle('is-muted', user.isBlocked);
            userModalBanButton.classList.toggle('is-danger', !user.isBlocked);
        }
    };

    const openUserModal = (user) => {
        if (!(userModalRoot instanceof HTMLElement)) {
            return;
        }

        applyUserToModal(user);
        userModalRoot.hidden = false;
        document.body.classList.add('admin-modal-open');
    };

    const closeUserModal = () => {
        if (!(userModalRoot instanceof HTMLElement)) {
            return;
        }

        userModalRoot.hidden = true;
        document.body.classList.remove('admin-modal-open');
    };

    const buildPageSequence = (totalPages) => {
        if (totalPages <= 4) {
            return Array.from({ length: totalPages }, (_, index) => index + 1);
        }

        return [1, 2, 'ellipsis', totalPages];
    };

    const renderCatalogPagination = () => {
        if (!(catalogPageList instanceof HTMLElement)) {
            return;
        }

        catalogPageList.innerHTML = '';

        buildPageSequence(catalogState.totalPages).forEach((item) => {
            if (item === 'ellipsis') {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'admin-catalog-page-ellipsis';
                ellipsis.textContent = '...';
                catalogPageList.appendChild(ellipsis);
                return;
            }

            const pageNumber = Number(item);
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'admin-catalog-page-button';
            button.textContent = String(pageNumber);
            button.disabled = catalogState.isLoading;
            if (pageNumber === catalogState.page) {
                button.classList.add('is-active');
            }

            button.addEventListener('click', () => {
                if (pageNumber !== catalogState.page) {
                    loadCatalogPage(pageNumber);
                }
            });

            catalogPageList.appendChild(button);
        });

        if (catalogPrevButton instanceof HTMLButtonElement) {
            catalogPrevButton.disabled = catalogState.isLoading || catalogState.page <= 1;
        }
        if (catalogNextButton instanceof HTMLButtonElement) {
            catalogNextButton.disabled = catalogState.isLoading || catalogState.page >= catalogState.totalPages;
        }
        if (catalogPageStatus instanceof HTMLElement) {
            catalogPageStatus.textContent = `Strona ${catalogState.page} z ${catalogState.totalPages}`;
        }
    };

    const renderCatalogRows = (rows) => {
        if (!(catalogRowsRoot instanceof HTMLElement)) {
            return;
        }

        if (!Array.isArray(rows) || rows.length === 0) {
            catalogRowsRoot.innerHTML = '<div class="admin-catalog-empty">Brak aktywnych użytkowników do wyświetlenia.</div>';
            return;
        }

        catalogRowsRoot.innerHTML = rows.map((row) => buildRowMarkup(row)).join('');
    };

    const applyCatalogPayload = (catalog) => {
        catalogState.page = Number(catalog.page || 1);
        catalogState.totalPages = Math.max(1, Number(catalog.total_pages || 1));
        catalogState.totalUsers = Math.max(0, Number(catalog.total_users || 0));

        if (catalogRoot instanceof HTMLElement) {
            catalogRoot.setAttribute('data-admin-catalog-page', String(catalogState.page));
            catalogRoot.setAttribute('data-admin-catalog-total-pages', String(catalogState.totalPages));
            catalogRoot.setAttribute('data-admin-catalog-total-users', String(catalogState.totalUsers));
        }

        renderCatalogRows(Array.isArray(catalog.rows) ? catalog.rows : []);
        renderCatalogPagination();
    };

    const loadCatalogPage = async (page) => {
        if (!(catalogRoot instanceof HTMLElement) || catalogState.isLoading) {
            return;
        }

        catalogState.isLoading = true;
        renderCatalogPagination();

        try {
            const url = new URL(window.location.href);
            url.hash = '#dashboard';
            url.searchParams.set('catalog_page', String(page));

            const response = await window.fetch(url.toString(), {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                },
                credentials: 'same-origin',
            });
            const payload = await response.json();
            if (!response.ok || !payload?.success || !payload.catalog) {
                throw new Error('catalog_fetch_failed');
            }

            applyCatalogPayload(payload.catalog);
        } catch {
            showToast('Nie udało się załadować katalogu użytkowników.', 'error');
        } finally {
            catalogState.isLoading = false;
            renderCatalogPagination();
        }
    };

    const activateTab = (tabName) => {
        tabLinks.forEach((link) => {
            const isActive = String(link.getAttribute('data-admin-tab')) === tabName;
            link.classList.toggle('is-active', isActive);
            link.setAttribute('aria-current', isActive ? 'page' : 'false');
        });

        tabPanels.forEach((panel) => {
            panel.hidden = String(panel.getAttribute('data-admin-tab-panel')) !== tabName;
        });

        if (breadcrumbTitle instanceof HTMLElement) {
            breadcrumbTitle.textContent = 'Panel zarządzania';
        }
        if (breadcrumbSubtitle instanceof HTMLElement) {
            breadcrumbSubtitle.textContent = tabLabelMap[tabName] || 'Dashboard';
        }
    };

    const syncFromHash = () => activateTab(resolveActiveTab());

    const closeModerationModal = () => {
        if (!(moderationModalRoot instanceof HTMLElement)) {
            return;
        }

        moderationModalRoot.hidden = true;
        moderationState.mode = null;
        moderationState.step = null;
        moderationState.user = null;
        moderationState.reasonChoice = '';
        moderationState.customReason = '';
        moderationState.durationCode = '';
        moderationState.durationLabel = '';
        moderationState.isSubmitting = false;
        if (moderationModalOtherInput instanceof HTMLTextAreaElement) {
            moderationModalOtherInput.value = '';
        }
    };

    const openModerationModal = () => {
        if (!(moderationModalRoot instanceof HTMLElement)) {
            return;
        }

        moderationModalRoot.hidden = false;
        document.body.classList.add('admin-modal-open');
    };

    const closeWarningModal = () => {
        if (!(warningModalRoot instanceof HTMLElement)) {
            return;
        }

        warningModalRoot.hidden = true;
        warningState.user = null;
        warningState.message = '';
        warningState.isSubmitting = false;
        if (warningModalInput instanceof HTMLTextAreaElement) {
            warningModalInput.value = '';
        }
        if (warningModalConfirm instanceof HTMLButtonElement) {
            warningModalConfirm.textContent = 'Wyślij';
            warningModalConfirm.disabled = false;
        }
    };

    const openWarningModal = () => {
        if (!(warningModalRoot instanceof HTMLElement)) {
            return;
        }

        warningModalRoot.hidden = false;
        document.body.classList.add('admin-modal-open');
    };

    const ensureBodyLockState = () => {
        const anyOpen = !(userModalRoot instanceof HTMLElement && userModalRoot.hidden)
            || !(moderationModalRoot instanceof HTMLElement && moderationModalRoot.hidden)
            || !(warningModalRoot instanceof HTMLElement && warningModalRoot.hidden);
        document.body.classList.toggle('admin-modal-open', anyOpen);
    };

    const renderReasonOptions = () => {
        if (!(moderationModalOptions instanceof HTMLElement)) {
            return;
        }

        moderationModalOptions.innerHTML = banReasonOptions.map((option, index) => {
            const value = option === 'Inny powód' ? 'other' : `preset_${index}`;
            const checked = moderationState.reasonChoice === value ? ' checked' : '';
            return `
                <label class="admin-action-option">
                    <input type="radio" name="admin_ban_reason" value="${value}"${checked}>
                    <span>${escapeHtml(option)}</span>
                </label>
            `;
        }).join('');

        const isOther = moderationState.reasonChoice === 'other';
        if (moderationModalOther instanceof HTMLElement) {
            moderationModalOther.hidden = !isOther;
        }
        if (moderationModalOtherInput instanceof HTMLTextAreaElement) {
            moderationModalOtherInput.value = moderationState.customReason;
        }
    };

    const renderDurationOptions = () => {
        if (!(moderationModalOptions instanceof HTMLElement)) {
            return;
        }

        moderationModalOptions.innerHTML = banDurationOptions.map((option) => `
            <label class="admin-action-option">
                <input type="radio" name="admin_ban_duration" value="${option.value}"${moderationState.durationCode === option.value ? ' checked' : ''}>
                <span>${escapeHtml(option.label)}</span>
            </label>
        `).join('');
    };

    const getResolvedReason = () => {
        if (moderationState.reasonChoice === 'other') {
            return moderationState.customReason.trim();
        }

        const rawValue = String(moderationState.reasonChoice || '');
        if (!rawValue.startsWith('preset_')) {
            return '';
        }

        const index = Number(rawValue.replace('preset_', ''));
        return Number.isInteger(index) && index >= 0 && banReasonOptions[index] ? banReasonOptions[index] : '';
    };

    const getResolvedDurationLabel = () => {
        const match = banDurationOptions.find((option) => option.value === moderationState.durationCode);
        return match ? match.label : '';
    };

    const renderModerationModal = () => {
        if (
            !(moderationModalTitle instanceof HTMLElement)
            || !(moderationModalCopy instanceof HTMLElement)
            || !(moderationModalConfirm instanceof HTMLButtonElement)
            || !(moderationModalBack instanceof HTMLButtonElement)
            || !(moderationModalSummary instanceof HTMLElement)
            || !(moderationModalLastSummary instanceof HTMLElement)
        ) {
            return;
        }

        const user = moderationState.user;
        if (!user) {
            return;
        }

        if (moderationModalRoot instanceof HTMLElement) {
            moderationModalRoot.querySelector('.admin-action-modal-panel')?.classList.toggle('is-unban', moderationState.mode === 'unban');
        }

        moderationModalSummary.hidden = true;
        moderationModalSummary.innerHTML = '';
        moderationModalLastSummary.hidden = true;
        moderationModalLastSummary.textContent = '';
        moderationModalBack.hidden = true;
        moderationModalConfirm.disabled = moderationState.isSubmitting;
        moderationModalBack.disabled = moderationState.isSubmitting;

        if (moderationState.mode === 'unban') {
            moderationModalTitle.textContent = 'Odblokuj użytkownika';
            moderationModalCopy.textContent = `Czy na pewno chcesz odblokować konto ${user.pseudonym}?`;
            moderationModalOptions.innerHTML = '';
            if (moderationModalOther instanceof HTMLElement) {
                moderationModalOther.hidden = true;
            }
            moderationModalConfirm.textContent = moderationState.isSubmitting ? 'Trwa odblokowywanie...' : 'Odblokuj konto';
            moderationModalConfirm.classList.add('is-primary');
            moderationModalConfirm.classList.remove('is-danger');
            return;
        }

        moderationModalConfirm.classList.add('is-danger');
        moderationModalConfirm.classList.remove('is-primary');

        if (moderationState.step === 'reason') {
            moderationModalTitle.textContent = 'Zablokuj użytkownika';
            moderationModalCopy.textContent = `Wybierz powód blokady dla konta ${user.pseudonym}.`;
            moderationModalConfirm.textContent = 'Dalej';
            renderReasonOptions();
            return;
        }

        if (moderationState.step === 'duration') {
            moderationModalTitle.textContent = 'Czas blokady';
            moderationModalCopy.textContent = `Wybierz czas blokady dla konta ${user.pseudonym}.`;
            moderationModalBack.hidden = false;
            moderationModalConfirm.textContent = 'Dalej';
            renderDurationOptions();
            if (user.lastBanSummary) {
                moderationModalLastSummary.hidden = false;
                moderationModalLastSummary.textContent = user.lastBanSummary;
            }
            if (moderationModalOther instanceof HTMLElement) {
                moderationModalOther.hidden = true;
            }
            return;
        }

        moderationModalTitle.textContent = 'Potwierdź blokadę';
        moderationModalCopy.textContent = `Czy na pewno chcesz zablokować konto ${user.pseudonym}?`;
        moderationModalBack.hidden = false;
        moderationModalConfirm.textContent = moderationState.isSubmitting ? 'Trwa blokowanie...' : 'Zablokuj konto';
        moderationModalOptions.innerHTML = '';
        if (moderationModalOther instanceof HTMLElement) {
            moderationModalOther.hidden = true;
        }
        moderationModalSummary.hidden = false;
        moderationModalSummary.innerHTML = `
            <div><strong>Powód:</strong> ${escapeHtml(getResolvedReason())}</div>
            <div><strong>Czas blokady:</strong> ${escapeHtml(getResolvedDurationLabel())}</div>
        `;
    };

    const openBanFlow = (user) => {
        moderationState.mode = 'ban';
        moderationState.step = 'reason';
        moderationState.user = user;
        moderationState.reasonChoice = '';
        moderationState.customReason = '';
        moderationState.durationCode = '';
        moderationState.durationLabel = '';
        moderationState.isSubmitting = false;
        renderModerationModal();
        openModerationModal();
    };

    const openUnbanFlow = (user) => {
        moderationState.mode = 'unban';
        moderationState.step = 'confirm';
        moderationState.user = user;
        moderationState.isSubmitting = false;
        renderModerationModal();
        openModerationModal();
    };

    const renderWarningModal = () => {
        if (
            !(warningModalInput instanceof HTMLTextAreaElement)
            || !(warningModalConfirm instanceof HTMLButtonElement)
        ) {
            return;
        }

        const user = warningState.user;
        if (!user) {
            return;
        }

        warningModalCopy.textContent = `Wpisz treść ostrzeżenia dla konta ${user.pseudonym}. Użytkownik zobaczy ten komunikat po zalogowaniu i nie wykona żadnej akcji, dopóki go nie potwierdzi.`;
        warningModalInput.value = warningState.message;
        warningModalConfirm.textContent = warningState.isSubmitting ? 'Trwa wysyłanie...' : 'Wyślij';
        warningModalConfirm.disabled = warningState.isSubmitting;
    };

    const openWarningFlow = (user) => {
        warningState.user = user;
        warningState.message = '';
        warningState.isSubmitting = false;
        renderWarningModal();
        openWarningModal();
    };

    const updateCatalogRow = (user) => {
        if (!(catalogRowsRoot instanceof HTMLElement) || !user || !user.id) {
            return;
        }

        const row = catalogRowsRoot.querySelector(`[data-admin-user-row][data-admin-user-id="${String(user.id)}"]`);
        if (!(row instanceof HTMLElement)) {
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.innerHTML = buildRowMarkup({
            id: user.id,
            pseudonym: user.pseudonym,
            full_name: user.full_name ?? user.fullName ?? user.full_name,
            email: user.email,
            avatar_path: user.avatar_path ?? user.avatarPath ?? '',
            membership_tier: user.membership_tier ?? user.membershipTier ?? '',
            vehicle_count: user.vehicle_count ?? user.vehicleCount ?? 0,
            listing_count: user.listing_count ?? user.listingCount ?? 0,
            post_count: user.post_count ?? user.postCount ?? 0,
            admin_removed_listing_count: user.admin_removed_listing_count ?? user.removedListingCount ?? 0,
            admin_removed_post_count: user.admin_removed_post_count ?? user.removedPostCount ?? 0,
            admin_profile_path: user.admin_profile_path ?? user.adminProfilePath ?? '/admin',
            is_blocked: user.is_blocked ?? user.isBlocked ?? false,
            blocked_until_label: user.blocked_until_label ?? user.blockedUntilLabel ?? '',
            presence_label: user.presence_label ?? user.presenceLabel ?? '',
            blocked_reason: user.blocked_reason ?? user.blockedReason ?? '',
            last_ban_summary: user.last_ban_summary ?? user.lastBanSummary ?? '',
        });
        const nextRow = wrapper.firstElementChild;
        if (nextRow instanceof HTMLElement) {
            row.replaceWith(nextRow);
        }
    };

    const normalizeApiUser = (user) => ({
        id: Number(user.id || 0),
        pseudonym: String(user.pseudonym || '').trim(),
        fullName: String(user.full_name || '').trim(),
        email: String(user.email || '').trim(),
        avatarPath: String(user.avatar_path || '').trim(),
        membershipTier: String(user.membership_tier || '').trim(),
        vehicleCount: Number(user.vehicle_count || 0),
        listingCount: Number(user.listing_count || 0),
        postCount: Number(user.post_count || 0),
        removedListingCount: Number(user.admin_removed_listing_count || 0),
        removedPostCount: Number(user.admin_removed_post_count || 0),
        adminProfilePath: String(user.admin_profile_path || '/admin'),
        isBlocked: Boolean(user.is_blocked),
        blockedUntilLabel: String(user.blocked_until_label || '').trim(),
        presenceLabel: String(user.presence_label || '').trim(),
        blockedReason: String(user.blocked_reason || '').trim(),
        lastBanSummary: String(user.last_ban_summary || '').trim(),
    });

    const submitAdminAction = async (payload) => {
        const body = new URLSearchParams();
        Object.entries(payload).forEach(([key, value]) => {
            body.set(key, String(value));
        });
        body.set('_csrf', String(window.APP_CSRF_TOKEN || ''));

        const response = await window.fetch(window.location.pathname, {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                ...csrfHeaders(),
            },
            body: body.toString(),
            credentials: 'same-origin',
        });

        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.success) {
            throw new Error(String(result?.message || 'request_failed'));
        }

        return result;
    };

    const confirmBanFlow = async () => {
        if (!moderationState.user || moderationState.isSubmitting) {
            return;
        }

        moderationState.isSubmitting = true;
        renderModerationModal();

        try {
            const result = await submitAdminAction({
                action: 'ban_user',
                user_id: moderationState.user.id,
                reason: getResolvedReason(),
                duration_code: moderationState.durationCode,
            });
            const user = normalizeApiUser(result.user || {});
            updateCatalogRow(result.user || {});
            applyUserToModal(user);
            moderationState.user = user;
            closeModerationModal();
            ensureBodyLockState();
            showToast(String(result.message || 'Użytkownik został zablokowany.'), 'success');
        } catch (error) {
            moderationState.isSubmitting = false;
            renderModerationModal();
            showToast(error instanceof Error ? error.message : 'Nie udało się zablokować użytkownika.', 'error');
        }
    };

    const confirmUnbanFlow = async () => {
        if (!moderationState.user || moderationState.isSubmitting) {
            return;
        }

        moderationState.isSubmitting = true;
        renderModerationModal();

        try {
            const result = await submitAdminAction({
                action: 'unban_user',
                user_id: moderationState.user.id,
            });
            const user = normalizeApiUser(result.user || {});
            updateCatalogRow(result.user || {});
            applyUserToModal(user);
            moderationState.user = user;
            closeModerationModal();
            ensureBodyLockState();
            showToast(String(result.message || 'Użytkownik został odblokowany.'), 'success');
        } catch (error) {
            moderationState.isSubmitting = false;
            renderModerationModal();
            showToast(error instanceof Error ? error.message : 'Nie udało się odblokować użytkownika.', 'error');
        }
    };

    const confirmWarningFlow = async () => {
        if (!warningState.user || warningState.isSubmitting) {
            return;
        }

        const message = String(warningState.message || '').trim();
        if (message === '') {
            showToast('Wpisz treĹ›Ä‡ ostrzeĹĽenia przed wysĹ‚aniem.', 'error');
            return;
        }

        warningState.isSubmitting = true;
        renderWarningModal();

        try {
            const result = await submitAdminAction({
                action: 'send_user_warning',
                user_id: warningState.user.id,
                message,
            });
            closeWarningModal();
            ensureBodyLockState();
            showToast(String(result.message || 'OstrzeĹĽenie zostaĹ‚o wysĹ‚ane.'), 'success');
        } catch (error) {
            warningState.isSubmitting = false;
            renderWarningModal();
            showToast(error instanceof Error ? error.message : 'Nie udaĹ‚o siÄ™ wysĹ‚aÄ‡ ostrzeĹĽenia.', 'error');
        }
    };

    const proceedModerationModal = () => {
        if (moderationState.mode === 'unban') {
            void confirmUnbanFlow();
            return;
        }

        if (moderationState.step === 'reason') {
            const reason = getResolvedReason();
            if (reason === '') {
                showToast('Wybierz powód blokady.', 'error');
                return;
            }

            moderationState.step = 'duration';
            renderModerationModal();
            return;
        }

        if (moderationState.step === 'duration') {
            moderationState.durationLabel = getResolvedDurationLabel();
            if (moderationState.durationLabel === '') {
                showToast('Wybierz czas blokady.', 'error');
                return;
            }

            moderationState.step = 'confirm';
            renderModerationModal();
            return;
        }

        void confirmBanFlow();
    };

    if (catalogPrevButton instanceof HTMLButtonElement) {
        catalogPrevButton.addEventListener('click', () => {
            if (catalogState.page > 1) {
                loadCatalogPage(catalogState.page - 1);
            }
        });
    }

    if (catalogNextButton instanceof HTMLButtonElement) {
        catalogNextButton.addEventListener('click', () => {
            if (catalogState.page < catalogState.totalPages) {
                loadCatalogPage(catalogState.page + 1);
            }
        });
    }

    root.addEventListener('click', (event) => {
        const trigger = event.target instanceof HTMLElement
            ? event.target.closest('[data-admin-user-row]')
            : null;
        if (!(trigger instanceof HTMLElement)) {
            return;
        }

        openUserModal(parseUserFromRow(trigger));
    });

    document.addEventListener('click', (event) => {
        const closeTrigger = event.target instanceof HTMLElement
            ? event.target.closest('[data-admin-user-modal-close], [data-admin-ban-modal-close], [data-admin-warning-modal-close]')
            : null;
        if (!(closeTrigger instanceof HTMLElement)) {
            return;
        }

        if (closeTrigger.hasAttribute('data-admin-user-modal-close')) {
            closeUserModal();
            ensureBodyLockState();
            return;
        }

        if (closeTrigger.hasAttribute('data-admin-warning-modal-close')) {
            closeWarningModal();
            ensureBodyLockState();
            return;
        }

        closeModerationModal();
        ensureBodyLockState();
    });

    document.addEventListener('click', (event) => {
        const actionTrigger = event.target instanceof HTMLElement
            ? event.target.closest('[data-admin-user-modal-action]')
            : null;
        if (!(actionTrigger instanceof HTMLElement) || !(userModalRoot instanceof HTMLElement)) {
            return;
        }

        const action = String(actionTrigger.getAttribute('data-admin-user-modal-action') || '');
        const user = {
            id: Number(userModalRoot.getAttribute('data-admin-user-id') || 0),
            pseudonym: String(userModalPseudonym?.textContent || '').trim(),
            fullName: String(userModalFullName?.textContent || '').trim(),
            email: String(userModalEmail?.textContent || '').trim(),
            avatarPath: String(userModalAvatar?.querySelector('img')?.getAttribute('src') || '').trim(),
            membershipTier: String(userModalMembershipTier?.textContent || '').trim(),
            vehicleCount: Number(userModalVehicleCount?.textContent || 0),
            listingCount: Number(userModalListingCount?.textContent || 0),
            postCount: Number(userModalPostCount?.textContent || 0),
            removedListingCount: Number(userModalRemovedListingCount?.textContent || 0),
            removedPostCount: Number(userModalRemovedPostCount?.textContent || 0),
            adminProfilePath: String(userModalProfileLink?.getAttribute('href') || '/admin'),
            isBlocked: parseBoolean(userModalRoot.getAttribute('data-admin-user-is-blocked')),
            blockedUntilLabel: String(userModalBanStatus?.textContent || '').trim(),
            blockedReason: '',
            lastBanSummary: '',
        };

        const matchingRow = catalogRowsRoot?.querySelector(`[data-admin-user-row][data-admin-user-id="${String(user.id)}"]`);
        if (matchingRow instanceof HTMLElement) {
            const rowUser = parseUserFromRow(matchingRow);
            user.blockedReason = rowUser.blockedReason;
            user.lastBanSummary = rowUser.lastBanSummary;
        }

        if (action === 'ban') {
            openBanFlow(user);
            return;
        }

        if (action === 'unban') {
            openUnbanFlow(user);
            return;
        }

        if (action === 'warning') {
            openWarningFlow(user);
            return;
        }

        showToast(placeholderMessages[action] || 'Ta akcja jest jeszcze w przygotowaniu.', 'info');
    });

    if (moderationModalOptions instanceof HTMLElement) {
        moderationModalOptions.addEventListener('change', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLInputElement)) {
                return;
            }

            if (target.name === 'admin_ban_reason') {
                moderationState.reasonChoice = target.value;
                renderModerationModal();
                return;
            }

            if (target.name === 'admin_ban_duration') {
                moderationState.durationCode = target.value;
            }
        });
    }

    if (moderationModalOtherInput instanceof HTMLTextAreaElement) {
        moderationModalOtherInput.addEventListener('input', () => {
            moderationState.customReason = moderationModalOtherInput.value;
        });
    }

    if (moderationModalBack instanceof HTMLButtonElement) {
        moderationModalBack.addEventListener('click', () => {
            if (moderationState.mode !== 'ban') {
                return;
            }

            moderationState.step = moderationState.step === 'confirm' ? 'duration' : 'reason';
            moderationState.isSubmitting = false;
            renderModerationModal();
        });
    }

    if (moderationModalConfirm instanceof HTMLButtonElement) {
        moderationModalConfirm.addEventListener('click', () => {
            proceedModerationModal();
        });
    }

    if (warningModalInput instanceof HTMLTextAreaElement) {
        warningModalInput.addEventListener('input', () => {
            warningState.message = warningModalInput.value;
        });
    }

    if (warningModalConfirm instanceof HTMLButtonElement) {
        warningModalConfirm.addEventListener('click', () => {
            void confirmWarningFlow();
        });
    }

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') {
            return;
        }

        if (warningModalRoot instanceof HTMLElement && !warningModalRoot.hidden) {
            closeWarningModal();
            ensureBodyLockState();
            return;
        }

        if (moderationModalRoot instanceof HTMLElement && !moderationModalRoot.hidden) {
            closeModerationModal();
            ensureBodyLockState();
            return;
        }

        if (userModalRoot instanceof HTMLElement && !userModalRoot.hidden) {
            closeUserModal();
            ensureBodyLockState();
        }
    });

    window.addEventListener('hashchange', syncFromHash);

    renderCatalogPagination();
    syncFromHash();
})();
