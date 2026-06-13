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
    const catalogSearchRoot = root.querySelector('[data-admin-catalog-search]');
    const catalogSearchInput = root.querySelector('[data-admin-catalog-search-input]');
    const catalogSearchResults = root.querySelector('[data-admin-catalog-search-results]');
    const pendingVehiclesRoot = root.querySelector('[data-admin-pending-vehicles]');
    const pendingVehicleRowsRoot = root.querySelector('[data-admin-pending-vehicle-rows]');
    const pendingVehiclePageStatus = root.querySelector('[data-admin-pending-vehicle-page-status]');
    const pendingVehiclePageList = root.querySelector('[data-admin-pending-vehicle-page-list]');
    const pendingVehiclePrevButton = root.querySelector('[data-admin-pending-vehicle-prev]');
    const pendingVehicleNextButton = root.querySelector('[data-admin-pending-vehicle-next]');
    const pendingBrandsRoot = root.querySelector('[data-admin-pending-brands]');
    const pendingBrandRowsRoot = root.querySelector('[data-admin-pending-brand-rows]');
    const pendingBrandPageStatus = root.querySelector('[data-admin-pending-brand-page-status]');
    const pendingBrandPageList = root.querySelector('[data-admin-pending-brand-page-list]');
    const pendingBrandPrevButton = root.querySelector('[data-admin-pending-brand-prev]');
    const pendingBrandNextButton = root.querySelector('[data-admin-pending-brand-next]');
    const pendingModelsRoot = root.querySelector('[data-admin-pending-models]');
    const pendingModelRowsRoot = root.querySelector('[data-admin-pending-model-rows]');
    const pendingModelPageStatus = root.querySelector('[data-admin-pending-model-page-status]');
    const pendingModelPageList = root.querySelector('[data-admin-pending-model-page-list]');
    const pendingModelPrevButton = root.querySelector('[data-admin-pending-model-prev]');
    const pendingModelNextButton = root.querySelector('[data-admin-pending-model-next]');
    const reportsRoot = root.querySelector('[data-admin-reports]');
    const reportRowsRoot = root.querySelector('[data-admin-report-rows]');
    const reportPageStatus = root.querySelector('[data-admin-report-page-status]');
    const reportPageList = root.querySelector('[data-admin-report-page-list]');
    const reportPrevButton = root.querySelector('[data-admin-report-prev]');
    const reportNextButton = root.querySelector('[data-admin-report-next]');
    const reportStatsRoot = root.querySelector('[data-admin-report-stats]');

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
    const userModalWarningButton = document.querySelector('[data-admin-user-modal-action="warning"]');
    const userModalMarketplaceButton = document.querySelector('[data-admin-user-modal-action="marketplace"]');
    const userModalCommunityButton = document.querySelector('[data-admin-user-modal-action="community"]');
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
    const pendingVehicleModalRoot = document.querySelector('[data-admin-pending-vehicle-modal-root]');
    const pendingVehicleTrack = document.querySelector('[data-admin-pending-vehicle-track]');
    const pendingVehiclePrevImageButton = document.querySelector('[data-admin-pending-vehicle-prev-image]');
    const pendingVehicleNextImageButton = document.querySelector('[data-admin-pending-vehicle-next-image]');
    const pendingVehicleBrand = document.querySelector('[data-admin-pending-vehicle-brand]');
    const pendingVehicleModel = document.querySelector('[data-admin-pending-vehicle-model]');
    const pendingVehicleTrim = document.querySelector('[data-admin-pending-vehicle-trim]');
    const pendingVehicleYear = document.querySelector('[data-admin-pending-vehicle-year]');
    const pendingVehicleMileage = document.querySelector('[data-admin-pending-vehicle-mileage]');
    const pendingVehicleLicensePlate = document.querySelector('[data-admin-pending-vehicle-license-plate]');
    const pendingVehicleVin = document.querySelector('[data-admin-pending-vehicle-vin]');
    const pendingVehicleColor = document.querySelector('[data-admin-pending-vehicle-color]');
    const pendingVehicleRejectionCount = document.querySelector('[data-admin-pending-vehicle-rejection-count]');
    const pendingVehicleApproveButton = document.querySelector('[data-admin-pending-vehicle-approve]');
    const pendingVehicleRejectButton = document.querySelector('[data-admin-pending-vehicle-reject]');
    const pendingVehicleDeleteButton = document.querySelector('[data-admin-pending-vehicle-delete]');
    const vehicleRejectModalRoot = document.querySelector('[data-admin-vehicle-reject-modal-root]');
    const vehicleRejectFieldsRoot = document.querySelector('[data-admin-vehicle-reject-fields]');
    const vehicleRejectReasonInput = document.querySelector('[data-admin-vehicle-reject-reason]');
    const vehicleRejectConfirmButton = document.querySelector('[data-admin-vehicle-reject-confirm]');
    const vehicleDeleteModalRoot = document.querySelector('[data-admin-vehicle-delete-modal-root]');
    const vehicleDeleteModalCopy = document.querySelector('[data-admin-vehicle-delete-modal-copy]');
    const vehicleDeleteConfirmButton = document.querySelector('[data-admin-vehicle-delete-confirm]');
    const reportModalRoot = document.querySelector('[data-admin-report-modal-root]');
    const reportModalType = document.querySelector('[data-admin-report-modal-type]');
    const reportModalSubject = document.querySelector('[data-admin-report-modal-subject]');
    const reportModalCreatedAt = document.querySelector('[data-admin-report-modal-created-at]');
    const reportModalReasonLabel = document.querySelector('[data-admin-report-modal-reason-label]');
    const reportModalReasonText = document.querySelector('[data-admin-report-modal-reason-text]');
    const reportModalContentLink = document.querySelector('[data-admin-report-modal-content-link]');
    const reportModalProfileLink = document.querySelector('[data-admin-report-modal-profile-link]');
    const reportModalReportedUserName = document.querySelector('[data-admin-report-modal-reported-user-name]');
    const reportModalModerateButton = document.querySelector('[data-admin-report-modal-moderate]');
    const reportModalBanButton = document.querySelector('[data-admin-report-modal-ban]');
    const reportModalCloseReportButton = document.querySelector('[data-admin-report-modal-close-report]');
    const reportModerationModalRoot = document.querySelector('[data-admin-report-moderation-modal-root]');
    const reportModerationModalTitle = document.querySelector('[data-admin-report-moderation-modal-title]');
    const reportModerationModalCopy = document.querySelector('[data-admin-report-moderation-modal-copy]');
    const reportModerationModalOptions = document.querySelector('[data-admin-report-moderation-modal-options]');
    const reportModerationModalOther = document.querySelector('[data-admin-report-moderation-modal-other]');
    const reportModerationModalOtherInput = document.querySelector('[data-admin-report-moderation-modal-other-input]');
    const reportModerationModalConfirm = document.querySelector('[data-admin-report-moderation-modal-confirm]');

    const tabLabelMap = {
        dashboard: 'Użytkownicy',
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

    const communityReasonOptions = [
        'Naruszenie zasad publikacji postów',
        'Nadużywanie komentarzy lub treści w społeczności',
        'Spam lub flood w społeczności',
        'Toksyczne zachowanie wobec innych użytkowników',
        'Omijanie wcześniejszych ograniczeń społeczności',
        'Inny powód',
    ];

    const marketplaceReasonOptions = [
        'Naruszenie zasad publikacji ogłoszeń',
        'Powtarzające się wprowadzające w błąd oferty',
        'Spam lub masowe dodawanie ogłoszeń',
        'Nadużycia w kontakcie ze sprzedającymi lub kupującymi',
        'Omijanie wcześniejszych ograniczeń marketplace',
        'Inny powód',
    ];

    const catalogState = {
        page: Number(catalogRoot?.getAttribute('data-admin-catalog-page') || 1),
        perPage: Number(catalogRoot?.getAttribute('data-admin-catalog-per-page') || 7),
        totalPages: Number(catalogRoot?.getAttribute('data-admin-catalog-total-pages') || 1),
        totalUsers: Number(catalogRoot?.getAttribute('data-admin-catalog-total-users') || 0),
        openUserId: Number(catalogRoot?.getAttribute('data-admin-open-user-id') || 0),
        highlightUserId: Number(catalogRoot?.getAttribute('data-admin-open-user-id') || 0),
        isLoading: false,
        searchRequestId: 0,
        searchDebounceId: 0,
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

    const pendingVehiclesState = {
        page: Number(pendingVehiclesRoot?.getAttribute('data-admin-pending-vehicles-page') || 1),
        perPage: Number(pendingVehiclesRoot?.getAttribute('data-admin-pending-vehicles-per-page') || 9),
        totalPages: Number(pendingVehiclesRoot?.getAttribute('data-admin-pending-vehicles-total-pages') || 1),
        totalItems: Number(pendingVehiclesRoot?.getAttribute('data-admin-pending-vehicles-total-items') || 0),
        isLoading: false,
        selectedVehicleId: 0,
        selectedVehicle: null,
        imageIndex: 0,
        rejectSubmitting: false,
        approveSubmitting: false,
        deleteSubmitting: false,
    };

    const pendingBrandsState = {
        page: Number(pendingBrandsRoot?.getAttribute('data-admin-pending-brands-page') || 1),
        perPage: Number(pendingBrandsRoot?.getAttribute('data-admin-pending-brands-per-page') || 4),
        totalPages: Number(pendingBrandsRoot?.getAttribute('data-admin-pending-brands-total-pages') || 1),
        totalItems: Number(pendingBrandsRoot?.getAttribute('data-admin-pending-brands-total-items') || 0),
        isLoading: false,
        actionSubmittingId: 0,
    };

    const pendingModelsState = {
        page: Number(pendingModelsRoot?.getAttribute('data-admin-pending-models-page') || 1),
        perPage: Number(pendingModelsRoot?.getAttribute('data-admin-pending-models-per-page') || 4),
        totalPages: Number(pendingModelsRoot?.getAttribute('data-admin-pending-models-total-pages') || 1),
        totalItems: Number(pendingModelsRoot?.getAttribute('data-admin-pending-models-total-items') || 0),
        isLoading: false,
        actionSubmittingId: 0,
    };

    const reportsState = {
        page: Number(reportsRoot?.getAttribute('data-admin-reports-page') || 1),
        perPage: Number(reportsRoot?.getAttribute('data-admin-reports-per-page') || 7),
        totalPages: Number(reportsRoot?.getAttribute('data-admin-reports-total-pages') || 1),
        totalItems: Number(reportsRoot?.getAttribute('data-admin-reports-total-items') || 0),
        isLoading: false,
        selectedReportId: 0,
        selectedReport: null,
        closeSubmitting: false,
    };

    const reportModerationState = {
        selectedReason: '',
        customReason: '',
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

    const getRestrictionStatusLabel = (user) => {
        return String(user.restrictionStatusLabel || '').trim();
    };

    const getReasonOptionsForMode = (mode) => {
        if (mode === 'community_block') {
            return communityReasonOptions;
        }

        if (mode === 'marketplace_block') {
            return marketplaceReasonOptions;
        }

        return banReasonOptions;
    };

    const getLastSummaryForMode = (user, mode) => {
        if (!user) {
            return '';
        }

        if (mode === 'community_block') {
            return String(user.lastCommunityBlockSummary || '').trim();
        }

        if (mode === 'marketplace_block') {
            return String(user.lastMarketplaceBlockSummary || '').trim();
        }

        return String(user.lastBanSummary || '').trim();
    };

    const getModerationModeConfig = (mode) => {
        if (mode === 'community_block') {
            return {
                title: 'Ogranicz funkcje społeczności',
                copy: 'Wybierz powód ograniczenia funkcji społeczności dla konta {pseudonym}.',
                durationTitle: 'Czas ograniczenia społeczności',
                durationCopy: 'Wybierz czas ograniczenia funkcji społeczności dla konta {pseudonym}.',
                confirmTitle: 'Potwierdź ograniczenie społeczności',
                confirmCopy: 'Czy na pewno chcesz ograniczyć funkcje społeczności dla konta {pseudonym}?',
                confirmLabel: 'Ogranicz funkcje społeczności',
                progressLabel: 'Trwa ograniczanie...',
                action: 'block_community_functions',
                successFallback: 'Funkcje społeczności zostały ograniczone.',
                emptyReasonMessage: 'Wybierz powód ograniczenia społeczności.',
                emptyDurationMessage: 'Wybierz czas ograniczenia społeczności.',
            };
        }

        if (mode === 'community_unblock') {
            return {
                title: 'Odblokuj funkcje społeczności',
                copy: 'Czy na pewno chcesz odblokować funkcje społeczności dla konta {pseudonym}?',
                confirmLabel: 'Odblokuj funkcje społeczności',
                progressLabel: 'Trwa odblokowywanie...',
                action: 'unblock_community_functions',
                successFallback: 'Funkcje społeczności zostały odblokowane.',
                isUnblock: true,
            };
        }

        if (mode === 'marketplace_block') {
            return {
                title: 'Ogranicz funkcje marketplace',
                copy: 'Wybierz powód ograniczenia funkcji marketplace dla konta {pseudonym}.',
                durationTitle: 'Czas ograniczenia marketplace',
                durationCopy: 'Wybierz czas ograniczenia funkcji marketplace dla konta {pseudonym}.',
                confirmTitle: 'Potwierdź ograniczenie marketplace',
                confirmCopy: 'Czy na pewno chcesz ograniczyć funkcje marketplace dla konta {pseudonym}?',
                confirmLabel: 'Ogranicz funkcje marketplace',
                progressLabel: 'Trwa ograniczanie...',
                action: 'block_marketplace_functions',
                successFallback: 'Funkcje marketplace zostały ograniczone.',
                emptyReasonMessage: 'Wybierz powód ograniczenia marketplace.',
                emptyDurationMessage: 'Wybierz czas ograniczenia marketplace.',
            };
        }

        if (mode === 'marketplace_unblock') {
            return {
                title: 'Odblokuj funkcje marketplace',
                copy: 'Czy na pewno chcesz odblokować funkcje marketplace dla konta {pseudonym}?',
                confirmLabel: 'Odblokuj funkcje marketplace',
                progressLabel: 'Trwa odblokowywanie...',
                action: 'unblock_marketplace_functions',
                successFallback: 'Funkcje marketplace zostały odblokowane.',
                isUnblock: true,
            };
        }

        if (mode === 'unban') {
            return {
                title: 'Odblokuj użytkownika',
                copy: 'Czy na pewno chcesz odblokować konto {pseudonym}?',
                confirmLabel: 'Odblokuj konto',
                progressLabel: 'Trwa odblokowywanie...',
                action: 'unban_user',
                successFallback: 'Użytkownik został odblokowany.',
                isUnblock: true,
            };
        }

        return {
            title: 'Zablokuj użytkownika',
            copy: 'Wybierz powód blokady dla konta {pseudonym}.',
            durationTitle: 'Czas blokady',
            durationCopy: 'Wybierz czas blokady dla konta {pseudonym}.',
            confirmTitle: 'Potwierdź blokadę',
            confirmCopy: 'Czy na pewno chcesz zablokować konto {pseudonym}?',
            confirmLabel: 'Zablokuj konto',
            progressLabel: 'Trwa blokowanie...',
            action: 'ban_user',
            successFallback: 'Użytkownik został zablokowany.',
            emptyReasonMessage: 'Wybierz powód blokady.',
            emptyDurationMessage: 'Wybierz czas blokady.',
        };
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
        isCommunityBlocked: parseBoolean(trigger.getAttribute('data-admin-user-is-community-blocked')),
        communityBlockedUntilLabel: String(trigger.getAttribute('data-admin-user-community-blocked-until-label') || '').trim(),
        communityBlockedReason: String(trigger.getAttribute('data-admin-user-community-blocked-reason') || '').trim(),
        lastCommunityBlockSummary: String(trigger.getAttribute('data-admin-user-last-community-block-summary') || '').trim(),
        isMarketplaceBlocked: parseBoolean(trigger.getAttribute('data-admin-user-is-marketplace-blocked')),
        marketplaceBlockedUntilLabel: String(trigger.getAttribute('data-admin-user-marketplace-blocked-until-label') || '').trim(),
        marketplaceBlockedReason: String(trigger.getAttribute('data-admin-user-marketplace-blocked-reason') || '').trim(),
        lastMarketplaceBlockSummary: String(trigger.getAttribute('data-admin-user-last-marketplace-block-summary') || '').trim(),
        restrictionStatusLabel: String(trigger.getAttribute('data-admin-user-restriction-status-label') || '').trim(),
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
        const restrictionStatusLabel = String(row.restriction_status_label || '').trim();
        const statusMarkup = restrictionStatusLabel !== ''
            ? `<span class="admin-catalog-status-text">${escapeHtml(restrictionStatusLabel)}</span>`
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
                data-admin-user-is-community-blocked="${row.is_community_blocked ? '1' : '0'}"
                data-admin-user-community-blocked-until-label="${escapeAttribute(String(row.community_blocked_until_label || ''))}"
                data-admin-user-community-blocked-reason="${escapeAttribute(String(row.community_blocked_reason || ''))}"
                data-admin-user-last-community-block-summary="${escapeAttribute(String(row.last_community_block_summary || ''))}"
                data-admin-user-is-marketplace-blocked="${row.is_marketplace_blocked ? '1' : '0'}"
                data-admin-user-marketplace-blocked-until-label="${escapeAttribute(String(row.marketplace_blocked_until_label || ''))}"
                data-admin-user-marketplace-blocked-reason="${escapeAttribute(String(row.marketplace_blocked_reason || ''))}"
                data-admin-user-last-marketplace-block-summary="${escapeAttribute(String(row.last_marketplace_block_summary || ''))}"
                data-admin-user-restriction-status-label="${escapeAttribute(String(row.restriction_status_label || ''))}"
                data-admin-user-presence-label="${escapeAttribute(String(row.presence_label || ''))}"
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

    const buildSearchSuggestionMarkup = (suggestion, index) => {
        const avatarPath = String(suggestion.avatar_path || '');
        const hasImage = avatarPath.trim() !== '';
        const pseudonym = escapeHtml(String(suggestion.pseudonym || ''));
        const fullName = escapeHtml(String(suggestion.full_name || ''));
        const email = escapeHtml(String(suggestion.email || ''));

        return `
            <button
                type="button"
                class="admin-catalog-search-option${index === 0 ? ' is-active' : ''}"
                data-admin-search-option
                data-admin-search-user-id="${Number(suggestion.id || 0)}"
                data-admin-search-page="${Number(suggestion.page || 1)}"
                data-admin-search-pseudonym="${escapeAttribute(String(suggestion.pseudonym || ''))}"
                data-admin-search-full-name="${escapeAttribute(String(suggestion.full_name || ''))}"
                data-admin-search-email="${escapeAttribute(String(suggestion.email || ''))}"
            >
                <span class="admin-catalog-avatar${hasImage ? ' has-image' : ''}">
                    ${hasImage ? `<img src="${escapeAttribute(avatarPath)}" alt="${pseudonym}" class="admin-catalog-avatar-image">` : ''}
                    <span class="admin-catalog-avatar-ring"></span>
                </span>
                <span class="admin-catalog-search-copy">
                    <span class="admin-catalog-search-primary">${pseudonym}${fullName !== '' ? ` • ${fullName}` : ''}</span>
                    <span class="admin-catalog-search-secondary">${email}</span>
                </span>
            </button>
        `;
    };

    const buildPendingVehicleRowMarkup = (row) => {
        const imagePath = String(row.image_path || '');
        const hasImage = imagePath.trim() !== '';
        const title = String(row.brand_name || '').trim() !== '' || String(row.model_name || '').trim() !== ''
            ? `${String(row.brand_name || '').trim()} ${String(row.model_name || '').trim()}`.trim()
            : String(row.title || 'Pojazd');

        return `
            <button
                type="button"
                class="admin-catalog-table admin-catalog-table-row admin-pending-vehicles-table"
                data-admin-pending-vehicle-row
                data-admin-pending-vehicle-id="${Number(row.id || 0)}"
            >
                <span class="admin-pending-vehicle-identity">
                    <span class="admin-pending-vehicle-thumb${hasImage ? ' has-image' : ''}">
                        ${hasImage ? `<img src="${escapeAttribute(imagePath)}" alt="${escapeAttribute(title)}" class="admin-pending-vehicle-thumb-image">` : ''}
                    </span>
                    <span class="admin-pending-vehicle-copy">
                        <span class="admin-pending-vehicle-title">${escapeHtml(title)}</span>
                        <span class="admin-pending-vehicle-subtitle">${escapeHtml(String(row.trim_name || 'Brak wersji'))}</span>
                    </span>
                </span>
                <span class="admin-pending-vehicle-year">${escapeHtml(String(row.production_year || '—'))}</span>
                <span class="admin-pending-vehicle-mileage">${escapeHtml(String(row.current_mileage_km || '—'))}</span>
                <span class="admin-pending-vehicle-meta">${escapeHtml(String(row.license_plate || '—'))}</span>
                <span class="admin-pending-vehicle-meta">${escapeHtml(String(row.vin || '—'))}</span>
                <span class="admin-pending-vehicle-meta">${escapeHtml(String(row.exterior_color || '—'))}</span>
            </button>
        `;
    };

    const buildPendingVehiclePlaceholderMarkup = () => `
        <div class="admin-catalog-table admin-catalog-table-row admin-pending-vehicles-table is-placeholder" aria-hidden="true"></div>
    `;

    const buildPendingBrandRowMarkup = (row) => `
        <div class="admin-catalog-table admin-catalog-table-row admin-pending-brands-table">
            <span class="admin-pending-catalog-name">${escapeHtml(String(row.name || 'Brak marki'))}</span>
            <span class="admin-pending-catalog-actions">
                <button type="button" class="admin-inline-action-button" data-admin-pending-brand-approve data-admin-pending-brand-id="${Number(row.id || 0)}">Potwierdź</button>
                <button type="button" class="admin-inline-action-button is-danger" data-admin-pending-brand-delete data-admin-pending-brand-id="${Number(row.id || 0)}">Usuń</button>
            </span>
        </div>
    `;

    const buildPendingBrandPlaceholderMarkup = () => `
        <div class="admin-catalog-table admin-catalog-table-row admin-pending-brands-table is-placeholder" aria-hidden="true"></div>
    `;

    const buildPendingModelRowMarkup = (row) => `
        <div class="admin-catalog-table admin-catalog-table-row admin-pending-models-table">
            <span class="admin-pending-catalog-name">${escapeHtml(String(row.model_name || 'Brak modelu'))}</span>
            <span class="admin-pending-catalog-brand">${escapeHtml(String(row.brand_name || 'Brak marki'))}</span>
            <span class="admin-pending-catalog-actions">
                ${row.brand_is_approved ? `
                    <button type="button" class="admin-inline-action-button" data-admin-pending-model-approve data-admin-pending-model-id="${Number(row.id || 0)}">Potwierdź</button>
                    <button type="button" class="admin-inline-action-button is-danger" data-admin-pending-model-delete data-admin-pending-model-id="${Number(row.id || 0)}">Usuń</button>
                ` : ''}
            </span>
        </div>
    `;

    const buildPendingModelPlaceholderMarkup = () => `
        <div class="admin-catalog-table admin-catalog-table-row admin-pending-models-table is-placeholder" aria-hidden="true"></div>
    `;

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
            const restrictionStatusLabel = getRestrictionStatusLabel(user);
            if (restrictionStatusLabel !== '') {
                userModalBanStatus.hidden = false;
                userModalBanStatus.textContent = restrictionStatusLabel;
            } else {
                userModalBanStatus.hidden = true;
                userModalBanStatus.textContent = '';
            }
        }

        if (userModalWarningButton instanceof HTMLButtonElement) {
            userModalWarningButton.textContent = 'Wyślij ostrzeżenie';
            userModalWarningButton.setAttribute('data-admin-user-modal-action', 'warning');
        }
        if (userModalMarketplaceButton instanceof HTMLButtonElement) {
            userModalMarketplaceButton.textContent = user.isMarketplaceBlocked
                ? 'Odblokuj funkcje marketplace'
                : 'Zablokuj funkcje marketplace';
            userModalMarketplaceButton.setAttribute(
                'data-admin-user-modal-action',
                user.isMarketplaceBlocked ? 'marketplace_unblock' : 'marketplace'
            );
        }
        if (userModalCommunityButton instanceof HTMLButtonElement) {
            userModalCommunityButton.textContent = user.isCommunityBlocked
                ? 'Odblokuj funkcje społeczności'
                : 'Zablokuj funkcje społeczności';
            userModalCommunityButton.setAttribute(
                'data-admin-user-modal-action',
                user.isCommunityBlocked ? 'community_unblock' : 'community'
            );
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

    const tryOpenRequestedUserModal = () => {
        if (!(catalogRowsRoot instanceof HTMLElement) || catalogState.openUserId <= 0) {
            return;
        }

        const row = catalogRowsRoot.querySelector(`[data-admin-user-row][data-admin-user-id="${String(catalogState.openUserId)}"]`);
        if (!(row instanceof HTMLElement)) {
            return;
        }

        openUserModal(parseUserFromRow(row));
        catalogState.openUserId = 0;
        if (catalogRoot instanceof HTMLElement) {
            catalogRoot.setAttribute('data-admin-open-user-id', '0');
        }
    };

    const clearCatalogHighlight = () => {
        if (!(catalogRowsRoot instanceof HTMLElement)) {
            return;
        }

        catalogRowsRoot.querySelectorAll('.admin-catalog-table-row.is-highlighted').forEach((row) => {
            row.classList.remove('is-highlighted');
        });
        catalogState.highlightUserId = 0;
    };

    const highlightCatalogRow = (userId, shouldScroll = false) => {
        if (!(catalogRowsRoot instanceof HTMLElement) || userId <= 0) {
            clearCatalogHighlight();
            return;
        }

        clearCatalogHighlight();
        const row = catalogRowsRoot.querySelector(`[data-admin-user-row][data-admin-user-id="${String(userId)}"]`);
        if (!(row instanceof HTMLElement)) {
            return;
        }

        row.classList.add('is-highlighted');
        if (shouldScroll) {
            row.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    };

    const closeCatalogSearchSuggestions = () => {
        if (catalogSearchResults instanceof HTMLElement) {
            catalogSearchResults.hidden = true;
            catalogSearchResults.innerHTML = '';
        }
    };

    const renderCatalogSearchSuggestions = (suggestions) => {
        if (!(catalogSearchResults instanceof HTMLElement)) {
            return;
        }

        if (!Array.isArray(suggestions) || suggestions.length === 0) {
            catalogSearchResults.innerHTML = '<div class="admin-catalog-search-empty">Brak dopasowań.</div>';
            catalogSearchResults.hidden = false;
            return;
        }

        catalogSearchResults.innerHTML = suggestions
            .map((suggestion, index) => buildSearchSuggestionMarkup(suggestion, index))
            .join('');
        catalogSearchResults.hidden = false;
    };

    const openCatalogSearchSuggestion = async (suggestion) => {
        const userId = Number(suggestion.id || 0);
        const targetPage = Math.max(1, Number(suggestion.page || 1));
        if (userId <= 0) {
            return;
        }

        catalogState.openUserId = userId;
        catalogState.highlightUserId = userId;
        if (catalogRoot instanceof HTMLElement) {
            catalogRoot.setAttribute('data-admin-open-user-id', String(userId));
        }

        if (catalogSearchInput instanceof HTMLInputElement) {
            const fullName = String(suggestion.full_name || '').trim();
            catalogSearchInput.value = fullName !== ''
                ? `${String(suggestion.pseudonym || '').trim()} • ${fullName}`
                : String(suggestion.pseudonym || '').trim();
        }
        closeCatalogSearchSuggestions();

        if (catalogState.page === targetPage) {
            highlightCatalogRow(userId, true);
            tryOpenRequestedUserModal();
            return;
        }

        await loadCatalogPage(targetPage);
    };

    const fetchCatalogSearchSuggestions = async (query) => {
        const normalizedQuery = String(query || '').trim();
        if (normalizedQuery === '') {
            closeCatalogSearchSuggestions();
            return;
        }

        const requestId = ++catalogState.searchRequestId;

        try {
            const url = new URL(window.location.href);
            url.hash = '#dashboard';
            url.searchParams.delete('catalog_page');
            url.searchParams.set('catalog_search', normalizedQuery);

            const response = await window.fetch(url.toString(), {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                },
                credentials: 'same-origin',
            });
            const payload = await response.json().catch(() => null);
            if (requestId !== catalogState.searchRequestId) {
                return;
            }
            if (!response.ok || !payload?.success) {
                throw new Error('catalog_search_failed');
            }

            renderCatalogSearchSuggestions(Array.isArray(payload.suggestions) ? payload.suggestions : []);
        } catch {
            if (requestId !== catalogState.searchRequestId) {
                return;
            }

            if (catalogSearchResults instanceof HTMLElement) {
                catalogSearchResults.innerHTML = '<div class="admin-catalog-search-empty">Nie udało się pobrać podpowiedzi.</div>';
                catalogSearchResults.hidden = false;
            }
        }
    };

    const closeUserModal = () => {
        if (!(userModalRoot instanceof HTMLElement)) {
            return;
        }

        userModalRoot.hidden = true;
        document.body.classList.remove('admin-modal-open');
    };

    const buildPageSequence = (totalPages, currentPage) => {
        if (totalPages <= 4) {
            return Array.from({ length: totalPages }, (_, index) => index + 1);
        }

        if (currentPage <= 2) {
            return [1, 'spacer', 2, 'ellipsis', totalPages];
        }

        if (currentPage >= totalPages - 1) {
            return [1, 'ellipsis', totalPages - 1, 'spacer', totalPages];
        }

        return [1, 'ellipsis', currentPage, 'ellipsis', totalPages];
    };

    const renderCatalogPagination = () => {
        if (!(catalogPageList instanceof HTMLElement)) {
            return;
        }

        catalogPageList.innerHTML = '';

        buildPageSequence(catalogState.totalPages, catalogState.page).forEach((item) => {
            if (item === 'ellipsis') {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'admin-catalog-page-ellipsis';
                ellipsis.textContent = '...';
                catalogPageList.appendChild(ellipsis);
                return;
            }

            if (item === 'spacer') {
                const spacer = document.createElement('span');
                spacer.className = 'admin-catalog-page-spacer';
                spacer.setAttribute('aria-hidden', 'true');
                catalogPageList.appendChild(spacer);
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

        const safeRows = Array.isArray(rows) ? rows : [];
        catalogRowsRoot.innerHTML = safeRows.map((row) => buildRowMarkup(row)).join('');
    };

    const syncCatalogRowsHeight = () => {
        if (!(catalogRowsRoot instanceof HTMLElement)) {
            return;
        }

        const rows = Array.from(catalogRowsRoot.querySelectorAll('.admin-catalog-table-row:not(.is-placeholder)'));
        const elementRows = rows.filter((row) => row instanceof HTMLElement);
        if (elementRows.length === 0) {
            catalogRowsRoot.style.minHeight = '';
            return;
        }

        const totalVisibleHeight = elementRows.reduce((sum, row) => sum + row.getBoundingClientRect().height, 0);
        if (totalVisibleHeight <= 0) {
            return;
        }

        const averageRowHeight = totalVisibleHeight / elementRows.length;
        const targetHeight = Math.max(0, Math.ceil(averageRowHeight * Math.max(1, catalogState.perPage)));
        catalogRowsRoot.style.minHeight = `${targetHeight}px`;
    };

    const syncPendingVehicleRowsHeight = () => {
        if (!(pendingVehicleRowsRoot instanceof HTMLElement)) {
            return;
        }

        pendingVehicleRowsRoot.style.height = '';
        pendingVehicleRowsRoot.style.minHeight = '';
    };

    const applyCatalogPayload = (catalog) => {
        catalogState.page = Number(catalog.page || 1);
        catalogState.totalPages = Math.max(1, Number(catalog.total_pages || 1));
        catalogState.totalUsers = Math.max(0, Number(catalog.total_users || 0));

        if (catalogRoot instanceof HTMLElement) {
            catalogRoot.setAttribute('data-admin-catalog-page', String(catalogState.page));
            catalogRoot.setAttribute('data-admin-catalog-per-page', String(catalogState.perPage));
            catalogRoot.setAttribute('data-admin-catalog-total-pages', String(catalogState.totalPages));
            catalogRoot.setAttribute('data-admin-catalog-total-users', String(catalogState.totalUsers));
        }

        renderCatalogRows(Array.isArray(catalog.rows) ? catalog.rows : []);
        syncCatalogRowsHeight();
        renderCatalogPagination();
        highlightCatalogRow(catalogState.highlightUserId, true);
        tryOpenRequestedUserModal();
    };

    const closePendingVehicleModal = () => {
        if (!(pendingVehicleModalRoot instanceof HTMLElement)) {
            return;
        }

        pendingVehicleModalRoot.hidden = true;
        pendingVehiclesState.selectedVehicle = null;
        pendingVehiclesState.selectedVehicleId = 0;
        pendingVehiclesState.imageIndex = 0;
    };

    const closeVehicleDeleteModal = () => {
        if (!(vehicleDeleteModalRoot instanceof HTMLElement)) {
            return;
        }

        vehicleDeleteModalRoot.hidden = true;
        pendingVehiclesState.deleteSubmitting = false;
        if (vehicleDeleteConfirmButton instanceof HTMLButtonElement) {
            vehicleDeleteConfirmButton.disabled = false;
            vehicleDeleteConfirmButton.textContent = 'Usuń pojazd';
        }
    };

    const closeVehicleRejectModal = () => {
        if (!(vehicleRejectModalRoot instanceof HTMLElement)) {
            return;
        }

        vehicleRejectModalRoot.hidden = true;
        pendingVehiclesState.rejectSubmitting = false;
        if (vehicleRejectReasonInput instanceof HTMLTextAreaElement) {
            vehicleRejectReasonInput.value = '';
        }
        if (vehicleRejectFieldsRoot instanceof HTMLElement) {
            vehicleRejectFieldsRoot.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
                if (checkbox instanceof HTMLInputElement) {
                    checkbox.checked = false;
                }
            });
        }
        if (vehicleRejectConfirmButton instanceof HTMLButtonElement) {
            vehicleRejectConfirmButton.disabled = false;
            vehicleRejectConfirmButton.textContent = 'Zatwierdź';
        }
    };

    const renderPendingVehicleCarousel = () => {
        if (!(pendingVehicleTrack instanceof HTMLElement)) {
            return;
        }

        const vehicle = pendingVehiclesState.selectedVehicle;
        const images = Array.isArray(vehicle?.images) ? vehicle.images : [];
        if (images.length === 0) {
            pendingVehicleTrack.innerHTML = '<div class="admin-pending-vehicle-empty-media">Brak zdjęć pojazdu.</div>';
            if (pendingVehiclePrevImageButton instanceof HTMLButtonElement) {
                pendingVehiclePrevImageButton.hidden = true;
            }
            if (pendingVehicleNextImageButton instanceof HTMLButtonElement) {
                pendingVehicleNextImageButton.hidden = true;
            }
            pendingVehicleTrack.style.transform = 'translateX(0)';
            return;
        }

        pendingVehiclesState.imageIndex = Math.max(0, Math.min(pendingVehiclesState.imageIndex, images.length - 1));
        pendingVehicleTrack.innerHTML = images.map((image) => `
            <div class="vehicle-hero-carousel-slide admin-pending-vehicle-slide">
                <img src="${escapeAttribute(String(image.path || ''))}" alt="" class="vehicle-hero-photo">
            </div>
        `).join('');
        pendingVehicleTrack.style.transform = `translateX(-${pendingVehiclesState.imageIndex * 100}%)`;

        if (pendingVehiclePrevImageButton instanceof HTMLButtonElement) {
            pendingVehiclePrevImageButton.hidden = images.length <= 1;
        }
        if (pendingVehicleNextImageButton instanceof HTMLButtonElement) {
            pendingVehicleNextImageButton.hidden = images.length <= 1;
        }
    };

    const applyPendingVehicleDetails = (vehicle) => {
        pendingVehiclesState.selectedVehicle = vehicle;
        pendingVehiclesState.selectedVehicleId = Number(vehicle.id || 0);
        pendingVehiclesState.imageIndex = 0;

        if (pendingVehicleBrand instanceof HTMLElement) {
            pendingVehicleBrand.textContent = String(vehicle.brand_name || '—');
        }
        if (pendingVehicleModel instanceof HTMLElement) {
            pendingVehicleModel.textContent = String(vehicle.model_name || '—');
        }
        if (pendingVehicleTrim instanceof HTMLElement) {
            pendingVehicleTrim.textContent = String(vehicle.trim_name || '—');
        }
        if (pendingVehicleYear instanceof HTMLElement) {
            pendingVehicleYear.textContent = String(vehicle.production_year || '—');
        }
        if (pendingVehicleMileage instanceof HTMLElement) {
            pendingVehicleMileage.textContent = String(vehicle.current_mileage_km || '—');
        }
        if (pendingVehicleLicensePlate instanceof HTMLElement) {
            pendingVehicleLicensePlate.textContent = String(vehicle.license_plate || '—');
        }
        if (pendingVehicleVin instanceof HTMLElement) {
            pendingVehicleVin.textContent = String(vehicle.vin || '—');
        }
        if (pendingVehicleColor instanceof HTMLElement) {
            pendingVehicleColor.textContent = String(vehicle.exterior_color || '—');
        }
        if (pendingVehicleRejectionCount instanceof HTMLElement) {
            pendingVehicleRejectionCount.textContent = String(Number(vehicle.approval_rejection_count || 0));
        }

        renderPendingVehicleCarousel();
    };

    const openPendingVehicleModal = () => {
        if (!(pendingVehicleModalRoot instanceof HTMLElement)) {
            return;
        }

        pendingVehicleModalRoot.hidden = false;
        document.body.classList.add('admin-modal-open');
    };

    const openVehicleDeleteModal = () => {
        if (!(vehicleDeleteModalRoot instanceof HTMLElement) || !pendingVehiclesState.selectedVehicle) {
            return;
        }

        if (vehicleDeleteModalCopy instanceof HTMLElement) {
            const brand = String(pendingVehiclesState.selectedVehicle.brand_name || '').trim();
            const model = String(pendingVehiclesState.selectedVehicle.model_name || '').trim();
            const fallbackTitle = String(pendingVehiclesState.selectedVehicle.title || 'ten pojazd').trim();
            const vehicleTitle = `${brand} ${model}`.trim() || fallbackTitle;
            vehicleDeleteModalCopy.textContent = `Czy na pewno chcesz trwale usunąć pojazd ${vehicleTitle}?`;
        }

        vehicleDeleteModalRoot.hidden = false;
        document.body.classList.add('admin-modal-open');
    };

    const renderPendingVehiclesPagination = () => {
        if (!(pendingVehiclePageList instanceof HTMLElement)) {
            return;
        }

        pendingVehiclePageList.innerHTML = '';
        buildPageSequence(pendingVehiclesState.totalPages, pendingVehiclesState.page).forEach((item) => {
            if (item === 'ellipsis') {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'admin-catalog-page-ellipsis';
                ellipsis.textContent = '...';
                pendingVehiclePageList.appendChild(ellipsis);
                return;
            }

            if (item === 'spacer') {
                const spacer = document.createElement('span');
                spacer.className = 'admin-catalog-page-spacer';
                spacer.setAttribute('aria-hidden', 'true');
                pendingVehiclePageList.appendChild(spacer);
                return;
            }

            const pageNumber = Number(item);
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'admin-catalog-page-button';
            button.textContent = String(pageNumber);
            button.disabled = pendingVehiclesState.isLoading;
            if (pageNumber === pendingVehiclesState.page) {
                button.classList.add('is-active');
            }
            button.addEventListener('click', () => {
                if (pageNumber !== pendingVehiclesState.page) {
                    void loadPendingVehiclesPage(pageNumber);
                }
            });
            pendingVehiclePageList.appendChild(button);
        });

        if (pendingVehiclePrevButton instanceof HTMLButtonElement) {
            pendingVehiclePrevButton.disabled = pendingVehiclesState.isLoading || pendingVehiclesState.page <= 1;
        }
        if (pendingVehicleNextButton instanceof HTMLButtonElement) {
            pendingVehicleNextButton.disabled = pendingVehiclesState.isLoading || pendingVehiclesState.page >= pendingVehiclesState.totalPages;
        }
        if (pendingVehiclePageStatus instanceof HTMLElement) {
            pendingVehiclePageStatus.textContent = `Strona ${pendingVehiclesState.page} z ${pendingVehiclesState.totalPages}`;
        }
    };

    const renderPendingVehicleRows = (rows) => {
        if (!(pendingVehicleRowsRoot instanceof HTMLElement)) {
            return;
        }

        if (!Array.isArray(rows) || rows.length === 0) {
            pendingVehicleRowsRoot.innerHTML = '<div class="admin-catalog-empty">Brak pojazdów oczekujących na potwierdzenie.</div>';
            return;
        }

        const safeRows = Array.isArray(rows) ? rows : [];
        const placeholderCount = Math.max(0, pendingVehiclesState.perPage - safeRows.length);
        pendingVehicleRowsRoot.innerHTML = [
            ...safeRows.map((row) => buildPendingVehicleRowMarkup(row)),
            ...Array.from({ length: placeholderCount }, () => buildPendingVehiclePlaceholderMarkup()),
        ].join('');
    };

    const applyPendingVehiclesPayload = (payload) => {
        pendingVehiclesState.page = Number(payload.page || 1);
        pendingVehiclesState.totalPages = Math.max(1, Number(payload.total_pages || 1));
        pendingVehiclesState.totalItems = Math.max(0, Number(payload.total_items || 0));

        if (pendingVehiclesRoot instanceof HTMLElement) {
            pendingVehiclesRoot.setAttribute('data-admin-pending-vehicles-page', String(pendingVehiclesState.page));
            pendingVehiclesRoot.setAttribute('data-admin-pending-vehicles-per-page', String(pendingVehiclesState.perPage));
            pendingVehiclesRoot.setAttribute('data-admin-pending-vehicles-total-pages', String(pendingVehiclesState.totalPages));
            pendingVehiclesRoot.setAttribute('data-admin-pending-vehicles-total-items', String(pendingVehiclesState.totalItems));
        }

        renderPendingVehicleRows(Array.isArray(payload.rows) ? payload.rows : []);
        syncPendingVehicleRowsHeight();
        renderPendingVehiclesPagination();
    };

    const renderPendingBrandsPagination = () => {
        if (!(pendingBrandPageList instanceof HTMLElement)) {
            return;
        }

        pendingBrandPageList.innerHTML = '';
        buildPageSequence(pendingBrandsState.totalPages, pendingBrandsState.page).forEach((item) => {
            if (item === 'ellipsis') {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'admin-catalog-page-ellipsis';
                ellipsis.textContent = '...';
                pendingBrandPageList.appendChild(ellipsis);
                return;
            }

            if (item === 'spacer') {
                const spacer = document.createElement('span');
                spacer.className = 'admin-catalog-page-spacer';
                spacer.setAttribute('aria-hidden', 'true');
                pendingBrandPageList.appendChild(spacer);
                return;
            }

            const pageNumber = Number(item);
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'admin-catalog-page-button';
            button.textContent = String(pageNumber);
            button.disabled = pendingBrandsState.isLoading;
            if (pageNumber === pendingBrandsState.page) {
                button.classList.add('is-active');
            }

            button.addEventListener('click', () => {
                if (pageNumber !== pendingBrandsState.page) {
                    void loadPendingBrandsPage(pageNumber);
                }
            });

            pendingBrandPageList.appendChild(button);
        });

        if (pendingBrandPrevButton instanceof HTMLButtonElement) {
            pendingBrandPrevButton.disabled = pendingBrandsState.isLoading || pendingBrandsState.page <= 1;
        }
        if (pendingBrandNextButton instanceof HTMLButtonElement) {
            pendingBrandNextButton.disabled = pendingBrandsState.isLoading || pendingBrandsState.page >= pendingBrandsState.totalPages;
        }
        if (pendingBrandPageStatus instanceof HTMLElement) {
            pendingBrandPageStatus.textContent = `Strona ${pendingBrandsState.page} z ${pendingBrandsState.totalPages}`;
        }
    };

    const renderPendingBrandRows = (rows) => {
        if (!(pendingBrandRowsRoot instanceof HTMLElement)) {
            return;
        }

        if (!Array.isArray(rows) || rows.length === 0) {
            pendingBrandRowsRoot.innerHTML = '<div class="admin-catalog-empty">Brak marek oczekujących na potwierdzenie.</div>';
            return;
        }

        const safeRows = Array.isArray(rows) ? rows : [];
        const placeholderCount = Math.max(0, pendingBrandsState.perPage - safeRows.length);
        pendingBrandRowsRoot.innerHTML = [
            ...safeRows.map((row) => buildPendingBrandRowMarkup(row)),
            ...Array.from({ length: placeholderCount }, () => buildPendingBrandPlaceholderMarkup()),
        ].join('');
    };

    const applyPendingBrandsPayload = (payload) => {
        pendingBrandsState.page = Number(payload.page || 1);
        pendingBrandsState.totalPages = Math.max(1, Number(payload.total_pages || 1));
        pendingBrandsState.totalItems = Math.max(0, Number(payload.total_items || 0));

        if (pendingBrandsRoot instanceof HTMLElement) {
            pendingBrandsRoot.setAttribute('data-admin-pending-brands-page', String(pendingBrandsState.page));
            pendingBrandsRoot.setAttribute('data-admin-pending-brands-per-page', String(pendingBrandsState.perPage));
            pendingBrandsRoot.setAttribute('data-admin-pending-brands-total-pages', String(pendingBrandsState.totalPages));
            pendingBrandsRoot.setAttribute('data-admin-pending-brands-total-items', String(pendingBrandsState.totalItems));
        }

        renderPendingBrandRows(Array.isArray(payload.rows) ? payload.rows : []);
        renderPendingBrandsPagination();
    };

    const renderPendingModelsPagination = () => {
        if (!(pendingModelPageList instanceof HTMLElement)) {
            return;
        }

        pendingModelPageList.innerHTML = '';
        buildPageSequence(pendingModelsState.totalPages, pendingModelsState.page).forEach((item) => {
            if (item === 'ellipsis') {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'admin-catalog-page-ellipsis';
                ellipsis.textContent = '...';
                pendingModelPageList.appendChild(ellipsis);
                return;
            }

            if (item === 'spacer') {
                const spacer = document.createElement('span');
                spacer.className = 'admin-catalog-page-spacer';
                spacer.setAttribute('aria-hidden', 'true');
                pendingModelPageList.appendChild(spacer);
                return;
            }

            const pageNumber = Number(item);
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'admin-catalog-page-button';
            button.textContent = String(pageNumber);
            button.disabled = pendingModelsState.isLoading;
            if (pageNumber === pendingModelsState.page) {
                button.classList.add('is-active');
            }

            button.addEventListener('click', () => {
                if (pageNumber !== pendingModelsState.page) {
                    void loadPendingModelsPage(pageNumber);
                }
            });

            pendingModelPageList.appendChild(button);
        });

        if (pendingModelPrevButton instanceof HTMLButtonElement) {
            pendingModelPrevButton.disabled = pendingModelsState.isLoading || pendingModelsState.page <= 1;
        }
        if (pendingModelNextButton instanceof HTMLButtonElement) {
            pendingModelNextButton.disabled = pendingModelsState.isLoading || pendingModelsState.page >= pendingModelsState.totalPages;
        }
        if (pendingModelPageStatus instanceof HTMLElement) {
            pendingModelPageStatus.textContent = `Strona ${pendingModelsState.page} z ${pendingModelsState.totalPages}`;
        }
    };

    const renderPendingModelRows = (rows) => {
        if (!(pendingModelRowsRoot instanceof HTMLElement)) {
            return;
        }

        if (!Array.isArray(rows) || rows.length === 0) {
            pendingModelRowsRoot.innerHTML = '<div class="admin-catalog-empty">Brak modeli oczekujących na potwierdzenie.</div>';
            return;
        }

        const safeRows = Array.isArray(rows) ? rows : [];
        const placeholderCount = Math.max(0, pendingModelsState.perPage - safeRows.length);
        pendingModelRowsRoot.innerHTML = [
            ...safeRows.map((row) => buildPendingModelRowMarkup(row)),
            ...Array.from({ length: placeholderCount }, () => buildPendingModelPlaceholderMarkup()),
        ].join('');
    };

    const applyPendingModelsPayload = (payload) => {
        pendingModelsState.page = Number(payload.page || 1);
        pendingModelsState.totalPages = Math.max(1, Number(payload.total_pages || 1));
        pendingModelsState.totalItems = Math.max(0, Number(payload.total_items || 0));

        if (pendingModelsRoot instanceof HTMLElement) {
            pendingModelsRoot.setAttribute('data-admin-pending-models-page', String(pendingModelsState.page));
            pendingModelsRoot.setAttribute('data-admin-pending-models-per-page', String(pendingModelsState.perPage));
            pendingModelsRoot.setAttribute('data-admin-pending-models-total-pages', String(pendingModelsState.totalPages));
            pendingModelsRoot.setAttribute('data-admin-pending-models-total-items', String(pendingModelsState.totalItems));
        }

        renderPendingModelRows(Array.isArray(payload.rows) ? payload.rows : []);
        renderPendingModelsPagination();
    };

    const loadPendingVehiclesPage = async (page) => {
        if (!(pendingVehiclesRoot instanceof HTMLElement) || pendingVehiclesState.isLoading) {
            return;
        }

        pendingVehiclesState.isLoading = true;
        renderPendingVehiclesPagination();

        try {
            const url = new URL(window.location.href);
            url.hash = '#cars';
            url.searchParams.set('pending_vehicle_page', String(page));
            const response = await window.fetch(url.toString(), {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                },
                credentials: 'same-origin',
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok || !payload?.success || !payload.pending_vehicles) {
                throw new Error('pending_vehicles_fetch_failed');
            }

            applyPendingVehiclesPayload(payload.pending_vehicles);
        } catch {
            showToast('Nie udało się załadować kolejki pojazdów.', 'error');
        } finally {
            pendingVehiclesState.isLoading = false;
            renderPendingVehiclesPagination();
        }
    };

    const loadPendingBrandsPage = async (page) => {
        if (!(pendingBrandsRoot instanceof HTMLElement) || pendingBrandsState.isLoading) {
            return;
        }

        pendingBrandsState.isLoading = true;
        renderPendingBrandsPagination();

        try {
            const url = new URL(window.location.href);
            url.hash = '#cars';
            url.searchParams.set('pending_brand_page', String(page));
            const response = await window.fetch(url.toString(), {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                },
                credentials: 'same-origin',
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok || !payload?.success || !payload.pending_brands) {
                throw new Error('pending_brands_fetch_failed');
            }

            applyPendingBrandsPayload(payload.pending_brands);
        } catch {
            showToast('Nie udało się załadować listy marek.', 'error');
        } finally {
            pendingBrandsState.isLoading = false;
            renderPendingBrandsPagination();
        }
    };

    const loadPendingModelsPage = async (page) => {
        if (!(pendingModelsRoot instanceof HTMLElement) || pendingModelsState.isLoading) {
            return;
        }

        pendingModelsState.isLoading = true;
        renderPendingModelsPagination();

        try {
            const url = new URL(window.location.href);
            url.hash = '#cars';
            url.searchParams.set('pending_model_page', String(page));
            const response = await window.fetch(url.toString(), {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                },
                credentials: 'same-origin',
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok || !payload?.success || !payload.pending_models) {
                throw new Error('pending_models_fetch_failed');
            }

            applyPendingModelsPayload(payload.pending_models);
        } catch {
            showToast('Nie udało się załadować listy modeli.', 'error');
        } finally {
            pendingModelsState.isLoading = false;
            renderPendingModelsPagination();
        }
    };

    const loadPendingVehicleDetails = async (vehicleId) => {
        if (vehicleId <= 0) {
            return;
        }

        try {
            const url = new URL(window.location.href);
            url.hash = '#cars';
            url.searchParams.set('pending_vehicle_details', String(vehicleId));
            const response = await window.fetch(url.toString(), {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                },
                credentials: 'same-origin',
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok || !payload?.success || !payload.vehicle) {
                throw new Error(String(payload?.message || 'pending_vehicle_details_failed'));
            }

            applyPendingVehicleDetails(payload.vehicle);
            openPendingVehicleModal();
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Nie udało się pobrać danych pojazdu.', 'error');
        }
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
            breadcrumbSubtitle.textContent = tabLabelMap[tabName] || 'Użytkownicy';
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
            || !(warningModalRoot instanceof HTMLElement && warningModalRoot.hidden)
            || !(pendingVehicleModalRoot instanceof HTMLElement && pendingVehicleModalRoot.hidden)
            || !(vehicleRejectModalRoot instanceof HTMLElement && vehicleRejectModalRoot.hidden)
            || !(vehicleDeleteModalRoot instanceof HTMLElement && vehicleDeleteModalRoot.hidden)
            || !(reportModalRoot instanceof HTMLElement && reportModalRoot.hidden)
            || !(reportModerationModalRoot instanceof HTMLElement && reportModerationModalRoot.hidden);
        document.body.classList.toggle('admin-modal-open', anyOpen);
    };

    const getReportTypeLabel = (contentType) => ({
        listing: 'Ogłoszenie',
        post: 'Post',
        comment: 'Komentarz',
        profile: 'Profil',
    }[String(contentType || '').trim()] || 'Zgłoszenie');

    const getReportModerationOptions = (contentType) => {
        if (contentType === 'listing') {
            return [
                'Ogłoszenie narusza regulamin serwisu.',
                'To spam lub duplikat ogłoszenia.',
                'Ogłoszenie zawiera wprowadzające w błąd informacje.',
                'Ogłoszenie zawiera niedozwoloną treść.',
                'Ogłoszenie narusza prywatność lub dane osobowe.',
                'Inny powód',
            ];
        }

        if (contentType === 'comment') {
            return [
                'Komentarz narusza regulamin serwisu.',
                'Komentarz ma charakter obraźliwy lub nękający.',
                'To spam lub flood.',
                'Komentarz narusza prywatność lub dane osobowe.',
                'Inny powód',
            ];
        }

        return [
            'Treść narusza regulamin serwisu.',
            'Treść ma charakter obraźliwy lub nękający.',
            'To spam lub niedozwolona promocja.',
            'Treść narusza prywatność lub dane osobowe.',
            'Treść jest niezgodna z tematyką serwisu.',
            'Inny powód',
        ];
    };

    const buildReportRowMarkup = (row) => `
        <button
            type="button"
            class="admin-catalog-table admin-catalog-table-row admin-reports-table"
            data-admin-report-row
            data-admin-report-id="${Number(row.id || 0)}"
        >
            <span class="admin-report-subject">
                <span class="admin-report-type">${escapeHtml(getReportTypeLabel(row.content_type))}</span>
                <span class="admin-report-title">${escapeHtml(String(row.reported_subject || 'Zgłoszenie'))}</span>
            </span>
            <span class="admin-report-user">${escapeHtml(String(row.reported_user_name || 'Użytkownik'))}</span>
            <span class="admin-report-reason">${escapeHtml(String(row.reason_label || 'Brak powodu'))}</span>
        </button>
    `;

    const buildReportPlaceholderMarkup = () => '<div class="admin-catalog-table admin-catalog-table-row admin-reports-table is-placeholder" aria-hidden="true"></div>';

    const renderReportRows = (rows) => {
        if (!(reportRowsRoot instanceof HTMLElement)) {
            return;
        }

        const safeRows = Array.isArray(rows) ? rows : [];
        if (safeRows.length === 0) {
            reportRowsRoot.innerHTML = '<div class="admin-catalog-empty">Brak otwartych zgłoszeń.</div>';
            return;
        }

        const placeholderCount = Math.max(0, reportsState.perPage - safeRows.length);
        reportRowsRoot.innerHTML = [
            ...safeRows.map((row) => buildReportRowMarkup(row)),
            ...Array.from({ length: placeholderCount }, () => buildReportPlaceholderMarkup()),
        ].join('');
    };

    const renderReportStats = (stats = {}) => {
        if (!(reportStatsRoot instanceof HTMLElement)) {
            return;
        }

        reportStatsRoot.querySelectorAll('[data-admin-report-stat]').forEach((element) => {
            if (!(element instanceof HTMLElement)) {
                return;
            }

            const key = String(element.getAttribute('data-admin-report-stat') || '');
            element.textContent = String(Number(stats[key] || 0));
        });
    };

    const renderReportsPagination = () => {
        if (!(reportPageList instanceof HTMLElement)) {
            return;
        }

        reportPageList.innerHTML = '';
        buildPageSequence(reportsState.totalPages, reportsState.page).forEach((item) => {
            if (item === 'ellipsis') {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'admin-catalog-page-ellipsis';
                ellipsis.textContent = '...';
                reportPageList.appendChild(ellipsis);
                return;
            }

            if (item === 'spacer') {
                const spacer = document.createElement('span');
                spacer.className = 'admin-catalog-page-spacer';
                spacer.setAttribute('aria-hidden', 'true');
                reportPageList.appendChild(spacer);
                return;
            }

            const pageNumber = Number(item);
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'admin-catalog-page-button';
            button.textContent = String(pageNumber);
            button.disabled = reportsState.isLoading;
            if (pageNumber === reportsState.page) {
                button.classList.add('is-active');
            }
            button.addEventListener('click', () => {
                if (pageNumber !== reportsState.page) {
                    void loadReportsPage(pageNumber);
                }
            });
            reportPageList.appendChild(button);
        });

        if (reportPrevButton instanceof HTMLButtonElement) {
            reportPrevButton.disabled = reportsState.isLoading || reportsState.page <= 1;
        }
        if (reportNextButton instanceof HTMLButtonElement) {
            reportNextButton.disabled = reportsState.isLoading || reportsState.page >= reportsState.totalPages;
        }
        if (reportPageStatus instanceof HTMLElement) {
            reportPageStatus.textContent = `Strona ${reportsState.page} z ${reportsState.totalPages}`;
        }
    };

    const applyReportsPayload = (payload, stats = null) => {
        reportsState.page = Number(payload.page || 1);
        reportsState.totalPages = Math.max(1, Number(payload.total_pages || 1));
        reportsState.totalItems = Math.max(0, Number(payload.total_items || 0));
        if (reportsRoot instanceof HTMLElement) {
            reportsRoot.setAttribute('data-admin-reports-page', String(reportsState.page));
            reportsRoot.setAttribute('data-admin-reports-total-pages', String(reportsState.totalPages));
            reportsRoot.setAttribute('data-admin-reports-total-items', String(reportsState.totalItems));
        }

        renderReportRows(Array.isArray(payload.rows) ? payload.rows : []);
        renderReportsPagination();
        if (stats) {
            renderReportStats(stats);
        }
    };

    const loadReportsPage = async (page) => {
        if (!(reportsRoot instanceof HTMLElement) || reportsState.isLoading) {
            return;
        }

        reportsState.isLoading = true;
        renderReportsPagination();

        try {
            const url = new URL(window.location.href);
            url.searchParams.set('report_page', String(page));
            const response = await fetch(url.toString(), {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            const payload = await response.json();
            if (!response.ok || !payload.success || !payload.reports) {
                throw new Error(String(payload?.message || 'Nie udało się załadować zgłoszeń.'));
            }

            applyReportsPayload(payload.reports, payload.report_stats || null);
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Nie udało się załadować zgłoszeń.', 'error');
        } finally {
            reportsState.isLoading = false;
            renderReportsPagination();
        }
    };

    const closeReportModal = () => {
        if (reportModalRoot instanceof HTMLElement) {
            reportModalRoot.hidden = true;
        }
        reportsState.selectedReport = null;
        reportsState.selectedReportId = 0;
        ensureBodyLockState();
    };

    const openReportModal = () => {
        if (!(reportModalRoot instanceof HTMLElement)) {
            return;
        }

        reportModalRoot.hidden = false;
        ensureBodyLockState();
    };

    const closeReportModerationModal = () => {
        if (reportModerationModalRoot instanceof HTMLElement) {
            reportModerationModalRoot.hidden = true;
        }
        reportModerationState.selectedReason = '';
        reportModerationState.customReason = '';
        reportModerationState.isSubmitting = false;
        if (reportModerationModalOtherInput instanceof HTMLTextAreaElement) {
            reportModerationModalOtherInput.value = '';
        }
        ensureBodyLockState();
    };

    const openReportModerationModal = () => {
        if (!(reportModerationModalRoot instanceof HTMLElement) || !reportsState.selectedReport) {
            return;
        }

        const report = reportsState.selectedReport;
        const options = getReportModerationOptions(String(report.content_type || ''));
        if (reportModerationModalTitle instanceof HTMLElement) {
            reportModerationModalTitle.textContent = String(report.content_type || '') === 'listing'
                ? 'Usuń zgłoszone ogłoszenie'
                : String(report.content_type || '') === 'comment'
                    ? 'Usuń zgłoszony komentarz'
                    : 'Usuń zgłoszony post';
        }
        if (reportModerationModalCopy instanceof HTMLElement) {
            reportModerationModalCopy.textContent = `Wybierz powód usunięcia: ${String(report.reported_subject || 'zgłoszonej treści')}.`;
        }
        if (reportModerationModalOptions instanceof HTMLElement) {
            reportModerationModalOptions.innerHTML = options.map((option, index) => {
                const value = option === 'Inny powód' ? 'other' : `preset_${index}`;
                const checked = reportModerationState.selectedReason === value || (reportModerationState.selectedReason === '' && index === 0)
                    ? ' checked'
                    : '';
                return `
                    <label class="admin-action-option">
                        <input type="radio" name="admin_report_reason" value="${value}"${checked}>
                        <span>${escapeHtml(option)}</span>
                    </label>
                `;
            }).join('');
            reportModerationState.selectedReason = reportModerationState.selectedReason || 'preset_0';
        }
        if (reportModerationModalOther instanceof HTMLElement) {
            reportModerationModalOther.hidden = reportModerationState.selectedReason !== 'other';
        }
        if (reportModerationModalOtherInput instanceof HTMLTextAreaElement) {
            reportModerationModalOtherInput.value = reportModerationState.customReason;
        }

        reportModerationModalRoot.hidden = false;
        ensureBodyLockState();
    };

    const getResolvedReportModerationReason = () => {
        if (!reportsState.selectedReport) {
            return '';
        }

        if (reportModerationState.selectedReason === 'other') {
            return reportModerationState.customReason.trim();
        }

        const options = getReportModerationOptions(String(reportsState.selectedReport.content_type || ''));
        const index = Number(String(reportModerationState.selectedReason || '').replace('preset_', ''));
        return Number.isInteger(index) && index >= 0 && options[index] ? options[index] : '';
    };

    const openReportDetails = async (reportId) => {
        if (reportsState.isLoading) {
            return;
        }

        try {
            const url = new URL(window.location.href);
            url.searchParams.set('report_details', String(reportId));
            const response = await fetch(url.toString(), {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            const payload = await response.json();
            if (!response.ok || !payload.success || !payload.report) {
                throw new Error(String(payload?.message || 'Nie udało się pobrać szczegółów zgłoszenia.'));
            }

            const report = payload.report;
            reportsState.selectedReportId = Number(report.id || 0);
            reportsState.selectedReport = report;

            if (reportModalType instanceof HTMLElement) {
                reportModalType.textContent = getReportTypeLabel(report.content_type);
            }
            if (reportModalSubject instanceof HTMLElement) {
                reportModalSubject.textContent = String(report.reported_subject || 'Zgłoszenie');
            }
            if (reportModalCreatedAt instanceof HTMLElement) {
                reportModalCreatedAt.textContent = String(report.created_at_label || '');
            }
            if (reportModalReasonLabel instanceof HTMLElement) {
                reportModalReasonLabel.textContent = String(report.reason_label || 'Brak powodu');
            }
            if (reportModalReasonText instanceof HTMLElement) {
                const customReason = String(report.reason_text || '').trim();
                reportModalReasonText.hidden = customReason === '';
                reportModalReasonText.textContent = customReason;
            }
            if (reportModalContentLink instanceof HTMLAnchorElement) {
                reportModalContentLink.href = String(report.target_path || '/dashboard');
            }
            if (reportModalProfileLink instanceof HTMLAnchorElement) {
                reportModalProfileLink.href = String(report.reported_user?.admin_profile_path || '/admin');
            }
            if (reportModalReportedUserName instanceof HTMLElement) {
                reportModalReportedUserName.textContent = String(report.reported_user?.pseudonym || report.reported_user_name || 'Użytkownik');
            }
            if (reportModalModerateButton instanceof HTMLButtonElement) {
                const canModerateContent = ['listing', 'post', 'comment'].includes(String(report.content_type || ''));
                reportModalModerateButton.hidden = !canModerateContent;
                reportModalModerateButton.textContent = String(report.content_type || '') === 'listing'
                    ? 'Usuń ogłoszenie'
                    : String(report.content_type || '') === 'comment'
                        ? 'Usuń komentarz'
                        : 'Usuń post';
            }
            if (reportModalBanButton instanceof HTMLButtonElement) {
                reportModalBanButton.hidden = String(report.content_type || '') !== 'profile';
            }

            openReportModal();
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Nie udało się pobrać szczegółów zgłoszenia.', 'error');
        }
    };

    const submitReportModeration = async () => {
        if (!reportsState.selectedReport || reportModerationState.isSubmitting) {
            return;
        }

        const reason = getResolvedReportModerationReason();
        if (reason === '') {
            showToast('Wybierz powód usunięcia treści.', 'error');
            return;
        }

        const report = reportsState.selectedReport;
        reportModerationState.isSubmitting = true;
        if (reportModerationModalConfirm instanceof HTMLButtonElement) {
            reportModerationModalConfirm.disabled = true;
            reportModerationModalConfirm.textContent = 'Trwa przetwarzanie...';
        }

        try {
            const action = String(report.content_type || '') === 'listing'
                ? 'remove_reported_listing'
                : String(report.content_type || '') === 'comment'
                    ? 'remove_reported_comment'
                    : 'remove_reported_post';
            const payload = {
                action,
                report_id: Number(report.id || 0),
                reason,
            };

            if (action === 'remove_reported_listing') {
                payload.listing_id = Number(report.content_id || 0);
            } else if (action === 'remove_reported_comment') {
                payload.comment_id = Number(report.content_id || 0);
            } else {
                payload.post_id = Number(report.content_id || 0);
            }

            const result = await submitAdminAction(payload);
            closeReportModerationModal();
            closeReportModal();
            await loadReportsPage(reportsState.page);
            showToast(String(result.message || 'Treść została usunięta.'), 'success');
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Nie udało się usunąć zgłoszonej treści.', 'error');
        } finally {
            reportModerationState.isSubmitting = false;
            if (reportModerationModalConfirm instanceof HTMLButtonElement) {
                reportModerationModalConfirm.disabled = false;
                reportModerationModalConfirm.textContent = 'Zatwierdź';
            }
        }
    };

    const renderReasonOptions = () => {
        if (!(moderationModalOptions instanceof HTMLElement)) {
            return;
        }

        const reasonOptions = getReasonOptionsForMode(moderationState.mode);
        moderationModalOptions.innerHTML = reasonOptions.map((option, index) => {
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
        const reasonOptions = getReasonOptionsForMode(moderationState.mode);
        return Number.isInteger(index) && index >= 0 && reasonOptions[index] ? reasonOptions[index] : '';
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

    const renderModerationModalState = () => {
        if (
            !(moderationModalTitle instanceof HTMLElement)
            || !(moderationModalCopy instanceof HTMLElement)
            || !(moderationModalConfirm instanceof HTMLButtonElement)
            || !(moderationModalBack instanceof HTMLButtonElement)
            || !(moderationModalSummary instanceof HTMLElement)
            || !(moderationModalLastSummary instanceof HTMLElement)
            || !(moderationModalOptions instanceof HTMLElement)
        ) {
            return;
        }

        const user = moderationState.user;
        if (!user) {
            return;
        }

        const config = getModerationModeConfig(moderationState.mode);
        if (moderationModalRoot instanceof HTMLElement) {
            moderationModalRoot.querySelector('.admin-action-modal-panel')?.classList.toggle('is-unban', Boolean(config.isUnblock));
        }

        moderationModalSummary.hidden = true;
        moderationModalSummary.innerHTML = '';
        moderationModalLastSummary.hidden = true;
        moderationModalLastSummary.textContent = '';
        moderationModalBack.hidden = true;
        moderationModalConfirm.disabled = moderationState.isSubmitting;
        moderationModalBack.disabled = moderationState.isSubmitting;

        if (config.isUnblock) {
            moderationModalTitle.textContent = config.title;
            moderationModalCopy.textContent = config.copy.replace('{pseudonym}', user.pseudonym);
            moderationModalOptions.innerHTML = '';
            if (moderationModalOther instanceof HTMLElement) {
                moderationModalOther.hidden = true;
            }
            moderationModalConfirm.textContent = moderationState.isSubmitting ? config.progressLabel : config.confirmLabel;
            moderationModalConfirm.classList.add('is-primary');
            moderationModalConfirm.classList.remove('is-danger');
            return;
        }

        moderationModalConfirm.classList.add('is-danger');
        moderationModalConfirm.classList.remove('is-primary');

        if (moderationState.step === 'reason') {
            moderationModalTitle.textContent = config.title;
            moderationModalCopy.textContent = config.copy.replace('{pseudonym}', user.pseudonym);
            moderationModalConfirm.textContent = 'Dalej';
            renderReasonOptions();
            return;
        }

        if (moderationState.step === 'duration') {
            moderationModalTitle.textContent = config.durationTitle;
            moderationModalCopy.textContent = config.durationCopy.replace('{pseudonym}', user.pseudonym);
            moderationModalBack.hidden = false;
            moderationModalConfirm.textContent = 'Dalej';
            renderDurationOptions();
            const lastSummary = getLastSummaryForMode(user, moderationState.mode);
            if (lastSummary !== '') {
                moderationModalLastSummary.hidden = false;
                moderationModalLastSummary.textContent = lastSummary;
            }
            if (moderationModalOther instanceof HTMLElement) {
                moderationModalOther.hidden = true;
            }
            return;
        }

        moderationModalTitle.textContent = config.confirmTitle;
        moderationModalCopy.textContent = config.confirmCopy.replace('{pseudonym}', user.pseudonym);
        moderationModalBack.hidden = false;
        moderationModalConfirm.textContent = moderationState.isSubmitting ? config.progressLabel : config.confirmLabel;
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

    const openRestrictionFlow = (user, mode) => {
        moderationState.mode = mode;
        moderationState.step = getModerationModeConfig(mode).isUnblock ? 'confirm' : 'reason';
        moderationState.user = user;
        moderationState.reasonChoice = '';
        moderationState.customReason = '';
        moderationState.durationCode = '';
        moderationState.durationLabel = '';
        moderationState.isSubmitting = false;
        renderModerationModalState();
        openModerationModal();
    };

    const openBanFlow = (user) => openRestrictionFlow(user, 'ban');
    const openUnbanFlow = (user) => openRestrictionFlow(user, 'unban');
    const openCommunityBlockFlow = (user) => openRestrictionFlow(user, 'community_block');
    const openCommunityUnblockFlow = (user) => openRestrictionFlow(user, 'community_unblock');
    const openMarketplaceBlockFlow = (user) => openRestrictionFlow(user, 'marketplace_block');
    const openMarketplaceUnblockFlow = (user) => openRestrictionFlow(user, 'marketplace_unblock');

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
            is_community_blocked: user.is_community_blocked ?? user.isCommunityBlocked ?? false,
            community_blocked_until_label: user.community_blocked_until_label ?? user.communityBlockedUntilLabel ?? '',
            community_blocked_reason: user.community_blocked_reason ?? user.communityBlockedReason ?? '',
            last_community_block_summary: user.last_community_block_summary ?? user.lastCommunityBlockSummary ?? '',
            is_marketplace_blocked: user.is_marketplace_blocked ?? user.isMarketplaceBlocked ?? false,
            marketplace_blocked_until_label: user.marketplace_blocked_until_label ?? user.marketplaceBlockedUntilLabel ?? '',
            marketplace_blocked_reason: user.marketplace_blocked_reason ?? user.marketplaceBlockedReason ?? '',
            last_marketplace_block_summary: user.last_marketplace_block_summary ?? user.lastMarketplaceBlockSummary ?? '',
            restriction_status_label: user.restriction_status_label ?? user.restrictionStatusLabel ?? '',
            presence_label: user.presence_label ?? user.presenceLabel ?? '',
            blocked_reason: user.blocked_reason ?? user.blockedReason ?? '',
            last_ban_summary: user.last_ban_summary ?? user.lastBanSummary ?? '',
        });
        const nextRow = wrapper.firstElementChild;
        if (nextRow instanceof HTMLElement) {
            nextRow.classList.toggle('is-highlighted', Number(user.id || 0) === catalogState.highlightUserId);
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
        isCommunityBlocked: Boolean(user.is_community_blocked),
        communityBlockedUntilLabel: String(user.community_blocked_until_label || '').trim(),
        communityBlockedReason: String(user.community_blocked_reason || '').trim(),
        lastCommunityBlockSummary: String(user.last_community_block_summary || '').trim(),
        isMarketplaceBlocked: Boolean(user.is_marketplace_blocked),
        marketplaceBlockedUntilLabel: String(user.marketplace_blocked_until_label || '').trim(),
        marketplaceBlockedReason: String(user.marketplace_blocked_reason || '').trim(),
        lastMarketplaceBlockSummary: String(user.last_marketplace_block_summary || '').trim(),
        restrictionStatusLabel: String(user.restriction_status_label || '').trim(),
        presenceLabel: String(user.presence_label || '').trim(),
        blockedReason: String(user.blocked_reason || '').trim(),
        lastBanSummary: String(user.last_ban_summary || '').trim(),
    });

    const submitAdminAction = async (payload) => {
        const body = new URLSearchParams();
        Object.entries(payload).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                value.forEach((item) => body.append(`${key}[]`, String(item)));
                return;
            }

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

    const applyPendingCatalogPayloadsFromResult = (result) => {
        if (result.pending_brands) {
            applyPendingBrandsPayload(result.pending_brands);
        }
        if (result.pending_models) {
            applyPendingModelsPayload(result.pending_models);
        }
    };

    const submitPendingBrandAction = async (action, brandId, button) => {
        if (brandId <= 0 || pendingBrandsState.actionSubmittingId > 0) {
            return;
        }

        pendingBrandsState.actionSubmittingId = brandId;
        const originalLabel = button instanceof HTMLButtonElement ? button.textContent : '';
        if (button instanceof HTMLButtonElement) {
            button.disabled = true;
        }

        try {
            const result = await submitAdminAction({
                action,
                brand_id: brandId,
                brand_page: pendingBrandsState.page,
                model_page: pendingModelsState.page,
            });
            applyPendingCatalogPayloadsFromResult(result);
            showToast(String(result.message || 'Zapisano zmianę marki.'), 'success');
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Nie udało się zapisać zmiany marki.', 'error');
        } finally {
            pendingBrandsState.actionSubmittingId = 0;
            if (button instanceof HTMLButtonElement) {
                button.disabled = false;
                if (originalLabel !== null) {
                    button.textContent = originalLabel;
                }
            }
        }
    };

    const submitPendingModelAction = async (action, modelId, button) => {
        if (modelId <= 0 || pendingModelsState.actionSubmittingId > 0) {
            return;
        }

        pendingModelsState.actionSubmittingId = modelId;
        const originalLabel = button instanceof HTMLButtonElement ? button.textContent : '';
        if (button instanceof HTMLButtonElement) {
            button.disabled = true;
        }

        try {
            const result = await submitAdminAction({
                action,
                model_id: modelId,
                brand_page: pendingBrandsState.page,
                model_page: pendingModelsState.page,
            });
            applyPendingCatalogPayloadsFromResult(result);
            showToast(String(result.message || 'Zapisano zmianę modelu.'), 'success');
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Nie udało się zapisać zmiany modelu.', 'error');
        } finally {
            pendingModelsState.actionSubmittingId = 0;
            if (button instanceof HTMLButtonElement) {
                button.disabled = false;
                if (originalLabel !== null) {
                    button.textContent = originalLabel;
                }
            }
        }
    };

    const confirmPendingVehicleApprove = async () => {
        if (!pendingVehiclesState.selectedVehicle || pendingVehiclesState.approveSubmitting) {
            return;
        }

        pendingVehiclesState.approveSubmitting = true;
        if (pendingVehicleApproveButton instanceof HTMLButtonElement) {
            pendingVehicleApproveButton.disabled = true;
            pendingVehicleApproveButton.textContent = 'Trwa zatwierdzanie...';
        }

        try {
            const result = await submitAdminAction({
                action: 'approve_vehicle',
                vehicle_id: pendingVehiclesState.selectedVehicle.id,
                page: pendingVehiclesState.page,
            });
            closePendingVehicleModal();
            if (result.pending_vehicles) {
                applyPendingVehiclesPayload(result.pending_vehicles);
            }
            showToast(String(result.message || 'Pojazd został zatwierdzony.'), 'success');
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Nie udało się zatwierdzić pojazdu.', 'error');
        } finally {
            pendingVehiclesState.approveSubmitting = false;
            if (pendingVehicleApproveButton instanceof HTMLButtonElement) {
                pendingVehicleApproveButton.disabled = false;
                pendingVehicleApproveButton.textContent = 'Potwierdź';
            }
            ensureBodyLockState();
        }
    };

    const openVehicleRejectModal = () => {
        if (!(vehicleRejectModalRoot instanceof HTMLElement)) {
            return;
        }

        vehicleRejectModalRoot.hidden = false;
        document.body.classList.add('admin-modal-open');
    };

    const confirmPendingVehicleReject = async () => {
        if (!pendingVehiclesState.selectedVehicle || pendingVehiclesState.rejectSubmitting) {
            return;
        }

        const selectedFields = vehicleRejectFieldsRoot instanceof HTMLElement
            ? Array.from(vehicleRejectFieldsRoot.querySelectorAll('input[type="checkbox"]:checked'))
                .map((input) => input instanceof HTMLInputElement ? input.value : '')
                .filter((value) => value !== '')
            : [];
        const reason = String(vehicleRejectReasonInput?.value || '').trim();

        if (selectedFields.length === 0 && reason === '') {
            showToast('Wskaż błędne pola albo wpisz powód odrzucenia.', 'error');
            return;
        }

        pendingVehiclesState.rejectSubmitting = true;
        if (vehicleRejectConfirmButton instanceof HTMLButtonElement) {
            vehicleRejectConfirmButton.disabled = true;
            vehicleRejectConfirmButton.textContent = 'Trwa odrzucanie...';
        }

        try {
            const result = await submitAdminAction({
                action: 'reject_vehicle',
                vehicle_id: pendingVehiclesState.selectedVehicle.id,
                page: pendingVehiclesState.page,
                reason,
                fields: selectedFields,
            });
            closeVehicleRejectModal();
            closePendingVehicleModal();
            if (result.pending_vehicles) {
                applyPendingVehiclesPayload(result.pending_vehicles);
            }
            showToast(String(result.message || 'Pojazd został odrzucony.'), 'success');
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Nie udało się odrzucić pojazdu.', 'error');
        } finally {
            pendingVehiclesState.rejectSubmitting = false;
            if (vehicleRejectConfirmButton instanceof HTMLButtonElement) {
                vehicleRejectConfirmButton.disabled = false;
                vehicleRejectConfirmButton.textContent = 'Zatwierdź';
            }
            ensureBodyLockState();
        }
    };

    const confirmPendingVehicleDelete = async () => {
        if (!pendingVehiclesState.selectedVehicle || pendingVehiclesState.deleteSubmitting) {
            return;
        }

        pendingVehiclesState.deleteSubmitting = true;
        if (vehicleDeleteConfirmButton instanceof HTMLButtonElement) {
            vehicleDeleteConfirmButton.disabled = true;
            vehicleDeleteConfirmButton.textContent = 'Trwa usuwanie...';
        }

        try {
            const result = await submitAdminAction({
                action: 'delete_vehicle',
                vehicle_id: pendingVehiclesState.selectedVehicle.id,
                page: pendingVehiclesState.page,
            });
            closeVehicleDeleteModal();
            closePendingVehicleModal();
            if (result.pending_vehicles) {
                applyPendingVehiclesPayload(result.pending_vehicles);
            }
            showToast(String(result.message || 'Pojazd został usunięty.'), 'success');
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Nie udało się usunąć pojazdu.', 'error');
        } finally {
            pendingVehiclesState.deleteSubmitting = false;
            if (vehicleDeleteConfirmButton instanceof HTMLButtonElement) {
                vehicleDeleteConfirmButton.disabled = false;
                vehicleDeleteConfirmButton.textContent = 'Usuń pojazd';
            }
            ensureBodyLockState();
        }
    };

    const confirmModerationFlow = async () => {
        if (!moderationState.user || moderationState.isSubmitting) {
            return;
        }

        const config = getModerationModeConfig(moderationState.mode);
        moderationState.isSubmitting = true;
        renderModerationModalState();

        try {
            const payload = {
                action: config.action,
                user_id: moderationState.user.id,
            };

            if (!config.isUnblock) {
                payload.reason = getResolvedReason();
                payload.duration_code = moderationState.durationCode;
            }

            const result = await submitAdminAction(payload);
            const user = normalizeApiUser(result.user || {});
            updateCatalogRow(result.user || {});
            applyUserToModal(user);
            moderationState.user = user;
            closeModerationModal();
            ensureBodyLockState();
            showToast(String(result.message || config.successFallback), 'success');
        } catch (error) {
            moderationState.isSubmitting = false;
            renderModerationModalState();
            showToast(error instanceof Error ? error.message : 'Nie udało się wykonać akcji administratora.', 'error');
        }
    };

    const confirmWarningFlow = async () => {
        if (!warningState.user || warningState.isSubmitting) {
            return;
        }

        const message = String(warningState.message || '').trim();
        if (message === '') {
            showToast('Wpisz treść ostrzeżenia przed wysłaniem.', 'error');
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
            showToast(String(result.message || 'Ostrzeżenie zostało wysłane.'), 'success');
        } catch (error) {
            warningState.isSubmitting = false;
            renderWarningModal();
            showToast(error instanceof Error ? error.message : 'Nie udało się wysłać ostrzeżenia.', 'error');
        }
    };

    const proceedModerationModal = () => {
        const config = getModerationModeConfig(moderationState.mode);
        if (config.isUnblock) {
            void confirmModerationFlow();
            return;
        }

        if (moderationState.step === 'reason') {
            const reason = getResolvedReason();
            if (reason === '') {
                showToast('Wybierz powód blokady.', 'error');
                return;
            }

            moderationState.step = 'duration';
            renderModerationModalState();
            return;
        }

        if (moderationState.step === 'duration') {
            moderationState.durationLabel = getResolvedDurationLabel();
            if (moderationState.durationLabel === '') {
                showToast('Wybierz czas blokady.', 'error');
                return;
            }

            moderationState.step = 'confirm';
            renderModerationModalState();
            return;
        }

        void confirmModerationFlow();
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

    if (pendingVehiclePrevButton instanceof HTMLButtonElement) {
        pendingVehiclePrevButton.addEventListener('click', () => {
            if (pendingVehiclesState.page > 1) {
                void loadPendingVehiclesPage(pendingVehiclesState.page - 1);
            }
        });
    }

    if (pendingVehicleNextButton instanceof HTMLButtonElement) {
        pendingVehicleNextButton.addEventListener('click', () => {
            if (pendingVehiclesState.page < pendingVehiclesState.totalPages) {
                void loadPendingVehiclesPage(pendingVehiclesState.page + 1);
            }
        });
    }

    if (pendingBrandPrevButton instanceof HTMLButtonElement) {
        pendingBrandPrevButton.addEventListener('click', () => {
            if (pendingBrandsState.page > 1) {
                void loadPendingBrandsPage(pendingBrandsState.page - 1);
            }
        });
    }

    if (pendingBrandNextButton instanceof HTMLButtonElement) {
        pendingBrandNextButton.addEventListener('click', () => {
            if (pendingBrandsState.page < pendingBrandsState.totalPages) {
                void loadPendingBrandsPage(pendingBrandsState.page + 1);
            }
        });
    }

    if (pendingModelPrevButton instanceof HTMLButtonElement) {
        pendingModelPrevButton.addEventListener('click', () => {
            if (pendingModelsState.page > 1) {
                void loadPendingModelsPage(pendingModelsState.page - 1);
            }
        });
    }

    if (pendingModelNextButton instanceof HTMLButtonElement) {
        pendingModelNextButton.addEventListener('click', () => {
            if (pendingModelsState.page < pendingModelsState.totalPages) {
                void loadPendingModelsPage(pendingModelsState.page + 1);
            }
        });
    }

    if (reportPrevButton instanceof HTMLButtonElement) {
        reportPrevButton.addEventListener('click', () => {
            if (reportsState.page > 1) {
                void loadReportsPage(reportsState.page - 1);
            }
        });
    }

    if (reportNextButton instanceof HTMLButtonElement) {
        reportNextButton.addEventListener('click', () => {
            if (reportsState.page < reportsState.totalPages) {
                void loadReportsPage(reportsState.page + 1);
            }
        });
    }

    if (catalogSearchInput instanceof HTMLInputElement) {
        catalogSearchInput.addEventListener('input', () => {
            const query = catalogSearchInput.value;
            clearCatalogHighlight();
            window.clearTimeout(catalogState.searchDebounceId);

            if (String(query || '').trim() === '') {
                closeCatalogSearchSuggestions();
                return;
            }

            catalogState.searchDebounceId = window.setTimeout(() => {
                void fetchCatalogSearchSuggestions(query);
            }, 180);
        });

        catalogSearchInput.addEventListener('focus', () => {
            if (String(catalogSearchInput.value || '').trim() !== '' && catalogSearchResults instanceof HTMLElement && catalogSearchResults.innerHTML.trim() !== '') {
                catalogSearchResults.hidden = false;
            }
        });
    }

    window.addEventListener('scroll', () => {
        if (catalogState.highlightUserId > 0) {
            clearCatalogHighlight();
        }
    }, { passive: true });

    renderReportsPagination();

    tryOpenRequestedUserModal();

    root.addEventListener('click', (event) => {
        const suggestionTrigger = event.target instanceof HTMLElement
            ? event.target.closest('[data-admin-search-option]')
            : null;
        if (suggestionTrigger instanceof HTMLElement) {
            event.preventDefault();
            void openCatalogSearchSuggestion({
                id: Number(suggestionTrigger.getAttribute('data-admin-search-user-id') || 0),
                page: Number(suggestionTrigger.getAttribute('data-admin-search-page') || 1),
                pseudonym: String(suggestionTrigger.getAttribute('data-admin-search-pseudonym') || ''),
                full_name: String(suggestionTrigger.getAttribute('data-admin-search-full-name') || ''),
                email: String(suggestionTrigger.getAttribute('data-admin-search-email') || ''),
            });
            return;
        }

        const trigger = event.target instanceof HTMLElement
            ? event.target.closest('[data-admin-user-row]')
            : null;
        if (trigger instanceof HTMLElement) {
            const selectedUserId = Number(trigger.getAttribute('data-admin-user-id') || 0);
            catalogState.highlightUserId = selectedUserId;
            highlightCatalogRow(selectedUserId);
            openUserModal(parseUserFromRow(trigger));
            return;
        }

        const pendingVehicleTrigger = event.target instanceof HTMLElement
            ? event.target.closest('[data-admin-pending-vehicle-row]')
            : null;
        if (pendingVehicleTrigger instanceof HTMLElement) {
            const vehicleId = Number(pendingVehicleTrigger.getAttribute('data-admin-pending-vehicle-id') || 0);
            void loadPendingVehicleDetails(vehicleId);
            return;
        }

        const reportTrigger = event.target instanceof HTMLElement
            ? event.target.closest('[data-admin-report-row]')
            : null;
        if (reportTrigger instanceof HTMLElement) {
            const reportId = Number(reportTrigger.getAttribute('data-admin-report-id') || 0);
            void openReportDetails(reportId);
            return;
        }

        const pendingBrandApproveTrigger = event.target instanceof HTMLElement
            ? event.target.closest('[data-admin-pending-brand-approve]')
            : null;
        if (pendingBrandApproveTrigger instanceof HTMLButtonElement) {
            const brandId = Number(pendingBrandApproveTrigger.getAttribute('data-admin-pending-brand-id') || 0);
            void submitPendingBrandAction('approve_brand', brandId, pendingBrandApproveTrigger);
            return;
        }

        const pendingBrandDeleteTrigger = event.target instanceof HTMLElement
            ? event.target.closest('[data-admin-pending-brand-delete]')
            : null;
        if (pendingBrandDeleteTrigger instanceof HTMLButtonElement) {
            const brandId = Number(pendingBrandDeleteTrigger.getAttribute('data-admin-pending-brand-id') || 0);
            void submitPendingBrandAction('delete_brand', brandId, pendingBrandDeleteTrigger);
            return;
        }

        const pendingModelApproveTrigger = event.target instanceof HTMLElement
            ? event.target.closest('[data-admin-pending-model-approve]')
            : null;
        if (pendingModelApproveTrigger instanceof HTMLButtonElement) {
            const modelId = Number(pendingModelApproveTrigger.getAttribute('data-admin-pending-model-id') || 0);
            void submitPendingModelAction('approve_model', modelId, pendingModelApproveTrigger);
            return;
        }

        const pendingModelDeleteTrigger = event.target instanceof HTMLElement
            ? event.target.closest('[data-admin-pending-model-delete]')
            : null;
        if (pendingModelDeleteTrigger instanceof HTMLButtonElement) {
            const modelId = Number(pendingModelDeleteTrigger.getAttribute('data-admin-pending-model-id') || 0);
            void submitPendingModelAction('delete_model', modelId, pendingModelDeleteTrigger);
        }
    });

    if (reportModalModerateButton instanceof HTMLButtonElement) {
        reportModalModerateButton.addEventListener('click', () => {
            openReportModerationModal();
        });
    }

    if (reportModalBanButton instanceof HTMLButtonElement) {
        reportModalBanButton.addEventListener('click', () => {
            const reportedUser = reportsState.selectedReport?.reported_user;
            if (!reportedUser) {
                showToast('Nie udało się otworzyć blokady dla zgłoszonego profilu.', 'error');
                return;
            }

            closeReportModal();
            openBanFlow(normalizeApiUser(reportedUser));
        });
    }

    if (reportModalCloseReportButton instanceof HTMLButtonElement) {
        reportModalCloseReportButton.addEventListener('click', async () => {
            if (!reportsState.selectedReportId) {
                return;
            }

            try {
                const result = await submitAdminAction({
                    action: 'close_report',
                    report_id: reportsState.selectedReportId,
                    page: reportsState.page,
                });
                closeReportModal();
                if (result.reports) {
                    applyReportsPayload(result.reports, result.report_stats || null);
                } else {
                    await loadReportsPage(reportsState.page);
                }
                showToast(String(result.message || 'Zgłoszenie zostało zamknięte.'), 'success');
            } catch (error) {
                showToast(error instanceof Error ? error.message : 'Nie udało się zamknąć zgłoszenia.', 'error');
            }
        });
    }

    document.addEventListener('click', (event) => {
        if (!(catalogSearchRoot instanceof HTMLElement)) {
            return;
        }

        const target = event.target;
        if (target instanceof Node && catalogSearchRoot.contains(target)) {
            return;
        }

        closeCatalogSearchSuggestions();
    });

    document.addEventListener('click', (event) => {
        const closeTrigger = event.target instanceof HTMLElement
            ? event.target.closest('[data-admin-user-modal-close], [data-admin-ban-modal-close], [data-admin-warning-modal-close], [data-admin-pending-vehicle-modal-close], [data-admin-vehicle-reject-modal-close], [data-admin-vehicle-delete-modal-close], [data-admin-report-modal-close], [data-admin-report-moderation-modal-close]')
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

        if (closeTrigger.hasAttribute('data-admin-pending-vehicle-modal-close')) {
            closePendingVehicleModal();
            ensureBodyLockState();
            return;
        }

        if (closeTrigger.hasAttribute('data-admin-vehicle-reject-modal-close')) {
            closeVehicleRejectModal();
            ensureBodyLockState();
            return;
        }

        if (closeTrigger.hasAttribute('data-admin-vehicle-delete-modal-close')) {
            closeVehicleDeleteModal();
            ensureBodyLockState();
            return;
        }

        if (closeTrigger.hasAttribute('data-admin-report-modal-close')) {
            closeReportModal();
            ensureBodyLockState();
            return;
        }

        if (closeTrigger.hasAttribute('data-admin-report-moderation-modal-close')) {
            closeReportModerationModal();
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
        const userId = Number(userModalRoot.getAttribute('data-admin-user-id') || 0);
        const matchingRow = catalogRowsRoot?.querySelector(`[data-admin-user-row][data-admin-user-id="${String(userId)}"]`);
        const user = matchingRow instanceof HTMLElement
            ? parseUserFromRow(matchingRow)
            : {
                id: userId,
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
                isCommunityBlocked: false,
                communityBlockedUntilLabel: '',
                communityBlockedReason: '',
                lastCommunityBlockSummary: '',
                isMarketplaceBlocked: false,
                marketplaceBlockedUntilLabel: '',
                marketplaceBlockedReason: '',
                lastMarketplaceBlockSummary: '',
                restrictionStatusLabel: String(userModalBanStatus?.textContent || '').trim(),
                presenceLabel: '',
                blockedReason: '',
                lastBanSummary: '',
            };

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

        if (action === 'community') {
            openCommunityBlockFlow(user);
            return;
        }

        if (action === 'community_unblock') {
            openCommunityUnblockFlow(user);
            return;
        }

        if (action === 'marketplace') {
            openMarketplaceBlockFlow(user);
            return;
        }

        if (action === 'marketplace_unblock') {
            openMarketplaceUnblockFlow(user);
            return;
        }
    });

    if (moderationModalOptions instanceof HTMLElement) {
        moderationModalOptions.addEventListener('change', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLInputElement)) {
                return;
            }

            if (target.name === 'admin_ban_reason') {
                moderationState.reasonChoice = target.value;
                renderModerationModalState();
                return;
            }

            if (target.name === 'admin_ban_duration') {
                moderationState.durationCode = target.value;
            }
        });
    }

    if (reportModerationModalOptions instanceof HTMLElement) {
        reportModerationModalOptions.addEventListener('change', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLInputElement) || target.name !== 'admin_report_reason') {
                return;
            }

            reportModerationState.selectedReason = target.value;
            if (reportModerationModalOther instanceof HTMLElement) {
                reportModerationModalOther.hidden = reportModerationState.selectedReason !== 'other';
            }
        });
    }

    if (reportModerationModalOtherInput instanceof HTMLTextAreaElement) {
        reportModerationModalOtherInput.addEventListener('input', () => {
            reportModerationState.customReason = reportModerationModalOtherInput.value;
        });
    }

    if (reportModerationModalConfirm instanceof HTMLButtonElement) {
        reportModerationModalConfirm.addEventListener('click', () => {
            void submitReportModeration();
        });
    }

    if (moderationModalOtherInput instanceof HTMLTextAreaElement) {
        moderationModalOtherInput.addEventListener('input', () => {
            moderationState.customReason = moderationModalOtherInput.value;
        });
    }

    if (moderationModalBack instanceof HTMLButtonElement) {
        moderationModalBack.addEventListener('click', () => {
            if (getModerationModeConfig(moderationState.mode).isUnblock) {
                return;
            }

            moderationState.step = moderationState.step === 'confirm' ? 'duration' : 'reason';
            moderationState.isSubmitting = false;
            renderModerationModalState();
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

    if (pendingVehicleApproveButton instanceof HTMLButtonElement) {
        pendingVehicleApproveButton.addEventListener('click', () => {
            void confirmPendingVehicleApprove();
        });
    }

    if (pendingVehicleRejectButton instanceof HTMLButtonElement) {
        pendingVehicleRejectButton.addEventListener('click', () => {
            openVehicleRejectModal();
        });
    }

    if (pendingVehicleDeleteButton instanceof HTMLButtonElement) {
        pendingVehicleDeleteButton.addEventListener('click', () => {
            openVehicleDeleteModal();
        });
    }

    if (vehicleRejectConfirmButton instanceof HTMLButtonElement) {
        vehicleRejectConfirmButton.addEventListener('click', () => {
            void confirmPendingVehicleReject();
        });
    }

    if (vehicleDeleteConfirmButton instanceof HTMLButtonElement) {
        vehicleDeleteConfirmButton.addEventListener('click', () => {
            void confirmPendingVehicleDelete();
        });
    }

    if (pendingVehiclePrevImageButton instanceof HTMLButtonElement) {
        pendingVehiclePrevImageButton.addEventListener('click', () => {
            const images = Array.isArray(pendingVehiclesState.selectedVehicle?.images) ? pendingVehiclesState.selectedVehicle.images : [];
            if (images.length <= 1) {
                return;
            }

            pendingVehiclesState.imageIndex = pendingVehiclesState.imageIndex <= 0
                ? images.length - 1
                : pendingVehiclesState.imageIndex - 1;
            renderPendingVehicleCarousel();
        });
    }

    if (pendingVehicleNextImageButton instanceof HTMLButtonElement) {
        pendingVehicleNextImageButton.addEventListener('click', () => {
            const images = Array.isArray(pendingVehiclesState.selectedVehicle?.images) ? pendingVehiclesState.selectedVehicle.images : [];
            if (images.length <= 1) {
                return;
            }

            pendingVehiclesState.imageIndex = pendingVehiclesState.imageIndex >= images.length - 1
                ? 0
                : pendingVehiclesState.imageIndex + 1;
            renderPendingVehicleCarousel();
        });
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && catalogSearchResults instanceof HTMLElement && !catalogSearchResults.hidden) {
            closeCatalogSearchSuggestions();
            return;
        }

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

        if (vehicleRejectModalRoot instanceof HTMLElement && !vehicleRejectModalRoot.hidden) {
            closeVehicleRejectModal();
            ensureBodyLockState();
            return;
        }

        if (vehicleDeleteModalRoot instanceof HTMLElement && !vehicleDeleteModalRoot.hidden) {
            closeVehicleDeleteModal();
            ensureBodyLockState();
            return;
        }

        if (pendingVehicleModalRoot instanceof HTMLElement && !pendingVehicleModalRoot.hidden) {
            closePendingVehicleModal();
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
    renderPendingVehiclesPagination();
    renderPendingBrandsPagination();
    renderPendingModelsPagination();
    syncFromHash();
})();

