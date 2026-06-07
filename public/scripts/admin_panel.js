(() => {
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
    const modalRoot = document.querySelector('[data-admin-user-modal-root]');
    const modalAvatar = document.querySelector('[data-admin-user-modal-avatar]');
    const modalPseudonym = document.querySelector('[data-admin-user-modal-pseudonym]');
    const modalFullName = document.querySelector('[data-admin-user-modal-full-name]');
    const modalMembershipTier = document.querySelector('[data-admin-user-modal-membership-tier]');
    const modalEmail = document.querySelector('[data-admin-user-modal-email]');
    const modalVehicleCount = document.querySelector('[data-admin-user-modal-vehicle-count]');
    const modalPostCount = document.querySelector('[data-admin-user-modal-post-count]');
    const modalListingCount = document.querySelector('[data-admin-user-modal-listing-count]');
    const modalProfileLink = document.querySelector('[data-admin-user-modal-profile-link]');

    const tabLabelMap = {
        dashboard: 'Dashboard',
        users: 'Użytkownicy',
        cars: 'Samochody',
        reports: 'Zgłoszenia',
    };

    const catalogState = {
        page: Number(catalogRoot?.getAttribute('data-admin-catalog-page') || 1),
        totalPages: Number(catalogRoot?.getAttribute('data-admin-catalog-total-pages') || 1),
        totalUsers: Number(catalogRoot?.getAttribute('data-admin-catalog-total-users') || 0),
        isLoading: false,
    };

    const resolveActiveTab = () => {
        const rawHash = (window.location.hash || '').replace(/^#/, '').trim();
        if (allowedTabs.has(rawHash)) {
            return rawHash;
        }

        return 'dashboard';
    };

    const openUserModal = (user) => {
        if (!(modalRoot instanceof HTMLElement) || !(modalPseudonym instanceof HTMLElement)) {
            return;
        }

        const pseudonym = String(user.pseudonym || '').trim() || 'Użytkownik';
        const fullName = String(user.fullName || '').trim() || 'Użytkownik';
        const email = String(user.email || '').trim() || 'Brak adresu e-mail';
        const membershipTier = String(user.membershipTier || '').trim() || 'FREE MEMBER';
        const avatarPath = String(user.avatarPath || '').trim();
        const adminProfilePath = String(user.adminProfilePath || '').trim() || '/admin';

        modalPseudonym.textContent = pseudonym;
        if (modalFullName instanceof HTMLElement) {
            modalFullName.textContent = fullName;
        }
        if (modalMembershipTier instanceof HTMLElement) {
            modalMembershipTier.textContent = membershipTier;
        }
        if (modalEmail instanceof HTMLElement) {
            modalEmail.textContent = email;
        }
        if (modalVehicleCount instanceof HTMLElement) {
            modalVehicleCount.textContent = String(Number(user.vehicleCount || 0));
        }
        if (modalPostCount instanceof HTMLElement) {
            modalPostCount.textContent = String(Number(user.postCount || 0));
        }
        if (modalListingCount instanceof HTMLElement) {
            modalListingCount.textContent = String(Number(user.listingCount || 0));
        }
        if (modalProfileLink instanceof HTMLAnchorElement) {
            modalProfileLink.href = adminProfilePath;
        }
        if (modalAvatar instanceof HTMLElement) {
            modalAvatar.classList.toggle('has-image', avatarPath !== '');
            modalAvatar.querySelectorAll('.admin-profile-modal-avatar-image').forEach((node) => node.remove());
            if (avatarPath !== '') {
                const image = document.createElement('img');
                image.src = avatarPath;
                image.alt = pseudonym;
                image.className = 'admin-profile-modal-avatar-image';
                modalAvatar.prepend(image);
            }
        }

        modalRoot.hidden = false;
        document.body.classList.add('admin-modal-open');
    };

    const closeUserModal = () => {
        if (!(modalRoot instanceof HTMLElement)) {
            return;
        }

        modalRoot.hidden = true;
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
                if (pageNumber === catalogState.page) {
                    return;
                }

                loadCatalogPage(pageNumber);
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

        catalogRowsRoot.innerHTML = rows.map((row) => {
            const avatarPath = String(row.avatar_path || '');
            const hasImage = avatarPath.trim() !== '';
            const pseudonym = escapeHtml(String(row.pseudonym || ''));
            const fullName = escapeHtml(String(row.full_name || ''));
            const email = escapeHtml(String(row.email || ''));

            return `
                <button
                    type="button"
                    class="admin-catalog-table admin-catalog-table-row"
                    data-admin-user-row
                    data-admin-user-pseudonym="${pseudonym}"
                    data-admin-user-full-name="${fullName}"
                    data-admin-user-email="${email}"
                    data-admin-user-avatar-path="${escapeAttribute(avatarPath)}"
                    data-admin-user-membership-tier="${escapeHtml(String(row.membership_tier || 'FREE MEMBER'))}"
                    data-admin-user-vehicle-count="${Number(row.vehicle_count || 0)}"
                    data-admin-user-listing-count="${Number(row.listing_count || 0)}"
                    data-admin-user-post-count="${Number(row.post_count || 0)}"
                    data-admin-user-admin-profile-path="${escapeAttribute(String(row.admin_profile_path || '/admin'))}"
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
                    <span class="admin-catalog-metric">
                        <span class="admin-catalog-metric-icon" style="--icon-url: url('/public/assets/icons/my_cars.svg');"></span>
                        <span class="admin-catalog-metric-value">${Number(row.vehicle_count || 0)}</span>
                    </span>
                    <span class="admin-catalog-metric">
                        <span class="admin-catalog-metric-icon" style="--icon-url: url('/public/assets/icons/marketplace.svg');"></span>
                        <span class="admin-catalog-metric-value">${Number(row.listing_count || 0)}</span>
                    </span>
                    <span class="admin-catalog-metric">
                        <span class="admin-catalog-metric-icon" style="--icon-url: url('/public/assets/icons/community.svg');"></span>
                        <span class="admin-catalog-metric-value">${Number(row.post_count || 0)}</span>
                    </span>
                </button>
            `;
        }).join('');
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
        } catch (error) {
            if (typeof window.showAppToast === 'function') {
                window.showAppToast('Nie udało się załadować katalogu użytkowników.', 'error');
            }
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

    const syncFromHash = () => {
        activateTab(resolveActiveTab());
    };

    const escapeHtml = (value) => value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

    const escapeAttribute = (value) => escapeHtml(String(value || ''));

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

        openUserModal({
            pseudonym: trigger.getAttribute('data-admin-user-pseudonym') || '',
            fullName: trigger.getAttribute('data-admin-user-full-name') || '',
            email: trigger.getAttribute('data-admin-user-email') || '',
            avatarPath: trigger.getAttribute('data-admin-user-avatar-path') || '',
            membershipTier: trigger.getAttribute('data-admin-user-membership-tier') || '',
            vehicleCount: trigger.getAttribute('data-admin-user-vehicle-count') || '0',
            listingCount: trigger.getAttribute('data-admin-user-listing-count') || '0',
            postCount: trigger.getAttribute('data-admin-user-post-count') || '0',
            adminProfilePath: trigger.getAttribute('data-admin-user-admin-profile-path') || '/admin',
        });
    });

    document.addEventListener('click', (event) => {
        const actionTrigger = event.target instanceof HTMLElement
            ? event.target.closest('[data-admin-user-modal-action]')
            : null;
        if (!(actionTrigger instanceof HTMLElement)) {
            return;
        }

        const action = String(actionTrigger.getAttribute('data-admin-user-modal-action') || '');
        const labels = {
            warning: 'Wysyłanie ostrzeżenia będzie dostępne w kolejnym kroku.',
            ban: 'Blokowanie konta będzie dostępne w kolejnym kroku.',
            marketplace: 'Blokada funkcji marketplace będzie dostępna w kolejnym kroku.',
            community: 'Blokada funkcji społeczności będzie dostępna w kolejnym kroku.',
        };

        if (typeof window.showAppToast === 'function') {
            window.showAppToast(labels[action] || 'Ta akcja jest jeszcze w przygotowaniu.', 'info');
        }
    });

    document.addEventListener('click', (event) => {
        const closeTrigger = event.target instanceof HTMLElement
            ? event.target.closest('[data-admin-user-modal-close]')
            : null;
        if (closeTrigger) {
            closeUserModal();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeUserModal();
        }
    });

    window.addEventListener('hashchange', syncFromHash);

    renderCatalogPagination();
    syncFromHash();
})();
