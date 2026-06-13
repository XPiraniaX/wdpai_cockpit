const settingsRoot = document.querySelector('[data-settings-root]');

let activeSettingsConfirmResolver = null;
let activeSettingsConfirmKeyHandler = null;
let activeSettingsPasswordResolver = null;
let activeSettingsPasswordKeyHandler = null;

const showAppToast = (message, type = 'info') => {
    const existingToast = document.querySelector('[data-app-toast]');
    existingToast?.remove();

    const toast = document.createElement('div');
    toast.className = `app-toast app-toast-${type}`;
    toast.setAttribute('data-app-toast', '');
    toast.innerHTML = `
        <div class="app-toast-message"></div>
    `;

    const messageElement = toast.querySelector('.app-toast-message');
    if (messageElement) {
        messageElement.textContent = message;
    }

    document.body.appendChild(toast);

    window.setTimeout(() => {
        toast.classList.add('is-hiding');
        window.setTimeout(() => toast.remove(), 260);
    }, 5000);
};

window.showAppToast = showAppToast;

const ensureSettingsConfirmModal = () => {
    let modal = document.querySelector('[data-settings-confirm-modal]');
    if (modal instanceof HTMLElement) {
        return modal;
    }

    modal = document.createElement('div');
    modal.className = 'settings-confirm-backdrop';
    modal.setAttribute('data-settings-confirm-modal', '');
    modal.hidden = true;
    modal.innerHTML = `
        <div class="settings-confirm-scrim" data-settings-confirm-cancel></div>
        <div class="settings-confirm-shell">
            <section class="settings-confirm-panel">
                <div class="settings-confirm-head">
                    <div class="settings-confirm-title-wrap">
                        <div class="settings-confirm-kicker" data-settings-confirm-kicker></div>
                        <h3 class="settings-confirm-title" data-settings-confirm-title></h3>
                    </div>
                    <button type="button" class="community-modal-close" aria-label="Zamknij" data-settings-confirm-cancel>
                        <img src="/public/assets/icons/close.svg" alt="">
                    </button>
                </div>
                <div class="settings-confirm-copy">
                    <p class="settings-confirm-message" data-settings-confirm-message></p>
                </div>
                <div class="settings-confirm-actions">
                    <button type="button" class="settings-button settings-button-muted" data-settings-confirm-cancel>Anuluj</button>
                    <button type="button" class="settings-button settings-button-primary" data-settings-confirm-submit>Zapisz zmiany</button>
                </div>
            </section>
        </div>
    `;

    document.body.appendChild(modal);
    return modal;
};

const closeSettingsConfirmModal = (accepted = false) => {
    const modal = document.querySelector('[data-settings-confirm-modal]');
    if (!(modal instanceof HTMLElement)) {
        return;
    }

    modal.hidden = true;
    document.body.classList.remove('vehicle-modal-open');

    if (activeSettingsConfirmKeyHandler) {
        document.removeEventListener('keydown', activeSettingsConfirmKeyHandler);
        activeSettingsConfirmKeyHandler = null;
    }

    if (activeSettingsConfirmResolver) {
        const resolver = activeSettingsConfirmResolver;
        activeSettingsConfirmResolver = null;
        resolver(accepted);
    }
};

const openSettingsConfirmModal = ({
    kicker = 'Potwierdzenie',
    title = 'Zapisać zmiany?',
    message = 'Czy na pewno chcesz zapisać zmiany?',
    confirmLabel = 'Zapisz zmiany',
    confirmButtonClass = 'settings-button-primary',
} = {}) => {
    const modal = ensureSettingsConfirmModal();
    const kickerElement = modal.querySelector('[data-settings-confirm-kicker]');
    const titleElement = modal.querySelector('[data-settings-confirm-title]');
    const messageElement = modal.querySelector('[data-settings-confirm-message]');
    const submitButton = modal.querySelector('[data-settings-confirm-submit]');

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
    submitButton.className = `settings-button ${confirmButtonClass}`;

    modal.querySelectorAll('[data-settings-confirm-cancel]').forEach((button) => {
        if (button instanceof HTMLElement && button.dataset.boundSettingsConfirmCancel !== 'true') {
            button.addEventListener('click', () => closeSettingsConfirmModal(false));
            button.dataset.boundSettingsConfirmCancel = 'true';
        }
    });

    if (submitButton.dataset.boundSettingsConfirmSubmit !== 'true') {
        submitButton.addEventListener('click', () => closeSettingsConfirmModal(true));
        submitButton.dataset.boundSettingsConfirmSubmit = 'true';
    }

    modal.hidden = false;
    document.body.classList.add('vehicle-modal-open');

    activeSettingsConfirmKeyHandler = (event) => {
        if (event.key === 'Escape') {
            closeSettingsConfirmModal(false);
        }
    };
    document.addEventListener('keydown', activeSettingsConfirmKeyHandler);

    return new Promise((resolve) => {
        activeSettingsConfirmResolver = resolve;
    });
};

const ensureSettingsPasswordModal = () => {
    let modal = document.querySelector('[data-settings-password-modal]');
    if (modal instanceof HTMLElement) {
        return modal;
    }

    modal = document.createElement('div');
    modal.className = 'settings-confirm-backdrop';
    modal.setAttribute('data-settings-password-modal', '');
    modal.hidden = true;
    modal.innerHTML = `
        <div class="settings-confirm-scrim" data-settings-password-cancel></div>
        <div class="settings-confirm-shell">
            <section class="settings-confirm-panel">
                <div class="settings-confirm-head">
                    <div class="settings-confirm-title-wrap">
                        <div class="settings-confirm-kicker">Ostateczne potwierdzenie</div>
                        <h3 class="settings-confirm-title">Podaj hasło</h3>
                    </div>
                    <button type="button" class="community-modal-close" aria-label="Zamknij" data-settings-password-cancel>
                        <img src="/public/assets/icons/close.svg" alt="">
                    </button>
                </div>
                <div class="settings-confirm-copy">
                    <p class="settings-confirm-message">Wpisz aktualne hasło, aby potwierdzić usunięcie konta.</p>
                </div>
                <label class="settings-confirm-password-field">
                    <span class="settings-confirm-password-label">Aktualne hasło</span>
                    <input type="password" class="settings-input" autocomplete="current-password" data-settings-password-input>
                    <span class="settings-field-error" hidden data-settings-password-error></span>
                </label>
                <div class="settings-confirm-actions">
                    <button type="button" class="settings-button settings-button-muted" data-settings-password-cancel>Anuluj</button>
                    <button type="button" class="settings-button settings-button-danger" data-settings-password-submit>Usuń konto</button>
                </div>
            </section>
        </div>
    `;

    document.body.appendChild(modal);
    return modal;
};

const closeSettingsPasswordModal = (result = null) => {
    const modal = document.querySelector('[data-settings-password-modal]');
    if (!(modal instanceof HTMLElement)) {
        return;
    }

    modal.hidden = true;
    document.body.classList.remove('vehicle-modal-open');

    if (activeSettingsPasswordKeyHandler) {
        document.removeEventListener('keydown', activeSettingsPasswordKeyHandler);
        activeSettingsPasswordKeyHandler = null;
    }

    const passwordInput = modal.querySelector('[data-settings-password-input]');
    const errorElement = modal.querySelector('[data-settings-password-error]');
    if (passwordInput instanceof HTMLInputElement) {
        passwordInput.value = '';
        passwordInput.classList.remove('is-invalid');
    }
    if (errorElement instanceof HTMLElement) {
        errorElement.textContent = '';
        errorElement.hidden = true;
    }

    if (activeSettingsPasswordResolver) {
        const resolver = activeSettingsPasswordResolver;
        activeSettingsPasswordResolver = null;
        resolver(result);
    }
};

const openSettingsPasswordModal = () => {
    const modal = ensureSettingsPasswordModal();
    const passwordInput = modal.querySelector('[data-settings-password-input]');
    const errorElement = modal.querySelector('[data-settings-password-error]');
    const submitButton = modal.querySelector('[data-settings-password-submit]');

    if (!(passwordInput instanceof HTMLInputElement)
        || !(errorElement instanceof HTMLElement)
        || !(submitButton instanceof HTMLButtonElement)) {
        return Promise.resolve(window.prompt('Podaj aktualne hasło, aby usunąć konto:') || null);
    }

    modal.querySelectorAll('[data-settings-password-cancel]').forEach((button) => {
        if (button instanceof HTMLElement && button.dataset.boundSettingsPasswordCancel !== 'true') {
            button.addEventListener('click', () => closeSettingsPasswordModal(null));
            button.dataset.boundSettingsPasswordCancel = 'true';
        }
    });

    if (submitButton.dataset.boundSettingsPasswordSubmit !== 'true') {
        submitButton.addEventListener('click', () => {
            const password = passwordInput.value.trim();
            if (password === '') {
                errorElement.textContent = 'Podaj aktualne hasło.';
                errorElement.hidden = false;
                passwordInput.classList.add('is-invalid');
                passwordInput.focus();
                return;
            }

            closeSettingsPasswordModal(password);
        });
        submitButton.dataset.boundSettingsPasswordSubmit = 'true';
    }

    if (passwordInput.dataset.boundSettingsPasswordInput !== 'true') {
        passwordInput.addEventListener('input', () => {
            passwordInput.classList.remove('is-invalid');
            errorElement.textContent = '';
            errorElement.hidden = true;
        });
        passwordInput.dataset.boundSettingsPasswordInput = 'true';
    }

    modal.hidden = false;
    document.body.classList.add('vehicle-modal-open');
    window.setTimeout(() => passwordInput.focus(), 0);

    activeSettingsPasswordKeyHandler = (event) => {
        if (event.key === 'Escape') {
            closeSettingsPasswordModal(null);
        }
    };
    document.addEventListener('keydown', activeSettingsPasswordKeyHandler);

    return new Promise((resolve) => {
        activeSettingsPasswordResolver = resolve;
    });
};

if (settingsRoot) {
    const settingsControls = Array.from(
        settingsRoot.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea')
    );

    const defaultSnapshot = settingsControls.map((control) => {
        if (control instanceof HTMLInputElement) {
            return {
                element: control,
                type: control.type,
                value: control.value,
                checked: control.checked,
            };
        }

        if (control instanceof HTMLSelectElement) {
            return {
                element: control,
                type: 'select-one',
                selectedIndex: control.selectedIndex,
                value: control.value,
            };
        }

        return {
            element: control,
            type: 'textarea',
            value: control.value,
        };
    });

    const syncDefaultSnapshot = () => {
        defaultSnapshot.forEach((item) => {
            const control = item.element;

            if (control instanceof HTMLInputElement) {
                item.value = control.value;
                item.checked = control.checked;
                return;
            }

            if (control instanceof HTMLSelectElement) {
                item.selectedIndex = control.selectedIndex;
                item.value = control.value;
                return;
            }

            if (control instanceof HTMLTextAreaElement) {
                item.value = control.value;
            }
        });
    };

    const parseJsonResponse = async (response) => {
        const text = await response.text();
        const normalized = String(text || '').trim();

        if (normalized === '') {
            return {};
        }

        try {
            return JSON.parse(normalized);
        } catch {
            const firstBrace = normalized.indexOf('{');
            const lastBrace = normalized.lastIndexOf('}');
            if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
                throw new Error('Invalid JSON response');
            }

            return JSON.parse(normalized.slice(firstBrace, lastBrace + 1));
        }
    };

    const clearFormErrors = (form) => {
        form.querySelectorAll('[data-settings-error-for]').forEach((element) => {
            if (!(element instanceof HTMLElement)) {
                return;
            }

            element.textContent = '';
            element.hidden = true;
        });

        form.querySelectorAll('.settings-input.is-invalid, .settings-select.is-invalid').forEach((field) => {
            field.classList.remove('is-invalid');
        });

        const formError = form.querySelector('[data-settings-form-error]');
        if (formError instanceof HTMLElement) {
            formError.textContent = '';
            formError.hidden = true;
        }
    };

    const applyFormErrors = (form, errors = {}) => {
        clearFormErrors(form);

        Object.entries(errors).forEach(([key, value]) => {
            const message = String(value || '');
            if (message === '') {
                return;
            }

            if (key === 'form') {
                const formError = form.querySelector('[data-settings-form-error]');
                if (formError instanceof HTMLElement) {
                    formError.textContent = message;
                    formError.hidden = false;
                }
                return;
            }

            const field = form.querySelector(`[name="${key}"]`);
            if (field instanceof HTMLElement) {
                field.classList.add('is-invalid');
            }

            const errorElement = form.querySelector(`[data-settings-error-for="${key}"]`);
            if (errorElement instanceof HTMLElement) {
                errorElement.textContent = message;
                errorElement.hidden = false;
            }
        });
    };

    const updateHeaderUser = ({ headerUserName = '', profilePath = '' } = {}) => {
        if (headerUserName !== '') {
            document.querySelectorAll('.user-name').forEach((element) => {
                element.textContent = headerUserName;
            });
        }

        if (profilePath !== '') {
            document.querySelectorAll('.user-card-link').forEach((element) => {
                if (element instanceof HTMLAnchorElement) {
                    element.href = profilePath;
                }
            });
        }
    };

    const submitSettingsForm = async (form) => {
        try {
            const response = await fetch(form.getAttribute('action') || window.location.pathname + window.location.search, {
                method: 'POST',
                body: new FormData(form),
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                },
            });

            const payload = await parseJsonResponse(response);
            if (!response.ok || !payload.success) {
                applyFormErrors(form, payload.errors || {
                    form: 'Nie udało się zapisać zmian. Spróbuj ponownie.',
                });
                return { success: false, payload };
            }

            clearFormErrors(form);
            return { success: true, payload };
        } catch {
            applyFormErrors(form, {
                form: 'Nie udało się zapisać zmian. Sprawdź połączenie i spróbuj ponownie.',
            });
            return { success: false, payload: null };
        }
    };

    const resetButton = settingsRoot.querySelector('[data-settings-reset-defaults]');
    const accountForm = settingsRoot.querySelector('[data-settings-account-form]');
    const securityForm = settingsRoot.querySelector('[data-settings-security-form]');
    const privacyForm = settingsRoot.querySelector('[data-settings-privacy-form]');
    const applicationForm = settingsRoot.querySelector('[data-settings-application-form]');
    const communityForm = settingsRoot.querySelector('[data-settings-community-form]');
    const marketplaceForm = settingsRoot.querySelector('[data-settings-marketplace-form]');
    const notificationForm = settingsRoot.querySelector('[data-settings-notification-form]');
    const logoutForm = settingsRoot.querySelector('[data-settings-logout-form]');
    const deleteAccountForm = settingsRoot.querySelector('[data-settings-delete-account-form]');
    const deleteAccountButton = settingsRoot.querySelector('.settings-panel-danger .settings-button-ghost-danger');
    const deleteAccountPasswordInput = deleteAccountForm?.querySelector('[data-settings-delete-account-password]') || null;

    const syncPasswordConfirmationWarning = () => {
        if (!(securityForm instanceof HTMLFormElement)) {
            return;
        }

        const newPasswordInput = securityForm.querySelector('[data-settings-new-password]');
        const confirmationInput = securityForm.querySelector('[data-settings-password-confirmation]');
        const mismatchWarning = securityForm.querySelector('[data-settings-password-match-error]');

        if (!(newPasswordInput instanceof HTMLInputElement)
            || !(confirmationInput instanceof HTMLInputElement)
            || !(mismatchWarning instanceof HTMLElement)) {
            return;
        }

        const shouldShow = confirmationInput.value !== ''
            && newPasswordInput.value !== confirmationInput.value;

        mismatchWarning.hidden = !shouldShow;
        confirmationInput.classList.toggle('is-invalid', shouldShow);
    };

    if (accountForm instanceof HTMLFormElement) {
        accountForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const confirmed = await openSettingsConfirmModal({
                kicker: 'Zmiana danych konta',
                title: 'Zapisać zmiany?',
                message: 'Czy na pewno chcesz zaktualizować dane konta? Zmiana pseudonimu, e-maila lub loginu zacznie obowiązywać od razu po zapisie.',
                confirmLabel: 'Zapisz zmiany',
            });

            if (!confirmed) {
                return;
            }

            const { success, payload } = await submitSettingsForm(accountForm);
            if (!success) {
                return;
            }

            if (payload.form && typeof payload.form === 'object') {
                Object.entries(payload.form).forEach(([key, value]) => {
                    const field = accountForm.querySelector(`[name="${key}"]`);
                    if (field instanceof HTMLInputElement) {
                        field.value = String(value ?? '');
                    }
                });
            }

            syncDefaultSnapshot();
            updateHeaderUser({
                headerUserName: String(payload.header_user_name || ''),
                profilePath: String(payload.profile_path || ''),
            });

            if (typeof window.showAppToast === 'function') {
                window.showAppToast(payload.message || 'Dane konta zostały zaktualizowane.', 'success');
            }
        });
    }

    if (securityForm instanceof HTMLFormElement) {
        const newPasswordInput = securityForm.querySelector('[data-settings-new-password]');
        const confirmationInput = securityForm.querySelector('[data-settings-password-confirmation]');

        if (newPasswordInput instanceof HTMLInputElement) {
            newPasswordInput.addEventListener('input', syncPasswordConfirmationWarning);
        }

        if (confirmationInput instanceof HTMLInputElement) {
            confirmationInput.addEventListener('input', syncPasswordConfirmationWarning);
        }

        syncPasswordConfirmationWarning();

        securityForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const confirmed = await openSettingsConfirmModal({
                kicker: 'Zmiana hasła',
                title: 'Zmienić hasło?',
                message: 'Czy na pewno chcesz ustawić nowe hasło do konta? Po zapisaniu będziesz używać już tylko nowego hasła.',
                confirmLabel: 'Zmień hasło',
            });

            if (!confirmed) {
                return;
            }

            const { success, payload } = await submitSettingsForm(securityForm);
            if (!success) {
                syncPasswordConfirmationWarning();
                return;
            }

            securityForm.reset();
            syncPasswordConfirmationWarning();
            syncDefaultSnapshot();

            if (typeof window.showAppToast === 'function') {
                window.showAppToast(payload.message || 'Hasło zostało zmienione.', 'success');
            }
        });
    }

    if (privacyForm instanceof HTMLFormElement) {
        privacyForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const confirmed = await openSettingsConfirmModal({
                kicker: 'Zmiana prywatności',
                title: 'Zapisać ustawienia prywatności?',
                message: 'Czy na pewno chcesz zaktualizować ustawienia widoczności profilu? Zmiany zaczną działać od razu po zapisie.',
                confirmLabel: 'Zapisz prywatność',
            });

            if (!confirmed) {
                return;
            }

            const { success, payload } = await submitSettingsForm(privacyForm);
            if (!success) {
                return;
            }

            if (payload.form && typeof payload.form === 'object') {
                Object.entries(payload.form).forEach(([key, value]) => {
                    const field = privacyForm.querySelector(`[name="${key}"]`);
                    if (field instanceof HTMLSelectElement) {
                        field.value = String(value ?? '');
                    }
                });
            }

            syncDefaultSnapshot();

            if (typeof window.showAppToast === 'function') {
                window.showAppToast(payload.message || 'Ustawienia prywatności zostały zaktualizowane.', 'success');
            }
        });
    }

    if (applicationForm instanceof HTMLFormElement) {
        applicationForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const confirmed = await openSettingsConfirmModal({
                kicker: 'Zmiana ustawień aplikacji',
                title: 'Zapisać ustawienia aplikacji?',
                message: 'Czy na pewno chcesz zaktualizować format spalania? Zmiana zacznie działać od razu w szczegółach pojazdu.',
                confirmLabel: 'Zapisz aplikację',
            });

            if (!confirmed) {
                return;
            }

            const { success, payload } = await submitSettingsForm(applicationForm);
            if (!success) {
                return;
            }

            if (payload.form && typeof payload.form === 'object') {
                Object.entries(payload.form).forEach(([key, value]) => {
                    const field = applicationForm.querySelector(`[name="${key}"]`);
                    if (field instanceof HTMLSelectElement || field instanceof HTMLInputElement) {
                        field.value = String(value ?? '');
                    }
                });
            }

            syncDefaultSnapshot();

            if (typeof window.showAppToast === 'function') {
                window.showAppToast(payload.message || 'Ustawienia aplikacji zostały zaktualizowane.', 'success');
            }
        });
    }

    if (communityForm instanceof HTMLFormElement) {
        communityForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const confirmed = await openSettingsConfirmModal({
                kicker: 'Zmiana ustawień społeczności',
                title: 'Zapisać ustawienia społeczności?',
                message: 'Czy na pewno chcesz zaktualizować domyślny widok feedu w społeczności?',
                confirmLabel: 'Zapisz społeczność',
            });

            if (!confirmed) {
                return;
            }

            const { success, payload } = await submitSettingsForm(communityForm);
            if (!success) {
                return;
            }

            if (payload.form && typeof payload.form === 'object') {
                Object.entries(payload.form).forEach(([key, value]) => {
                    const field = communityForm.querySelector(`[name="${key}"]`);
                    if (field instanceof HTMLSelectElement || field instanceof HTMLInputElement) {
                        field.value = String(value ?? '');
                    }
                });
            }

            syncDefaultSnapshot();

            if (typeof window.showAppToast === 'function') {
                window.showAppToast(payload.message || 'Ustawienia społeczności zostały zaktualizowane.', 'success');
            }
        });
    }

    if (marketplaceForm instanceof HTMLFormElement) {
        marketplaceForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const confirmed = await openSettingsConfirmModal({
                kicker: 'Zmiana ustawień marketplace',
                title: 'Zapisać ustawienia marketplace?',
                message: 'Czy na pewno chcesz zaktualizować domyślny zakres ogłoszeń, domyślne sortowanie i preferowany kanał kontaktu?',
                confirmLabel: 'Zapisz marketplace',
            });

            if (!confirmed) {
                return;
            }

            const { success, payload } = await submitSettingsForm(marketplaceForm);
            if (!success) {
                return;
            }

            if (payload.form && typeof payload.form === 'object') {
                Object.entries(payload.form).forEach(([key, value]) => {
                    const field = marketplaceForm.querySelector(`[name="${key}"]`);
                    if (field instanceof HTMLSelectElement || field instanceof HTMLInputElement) {
                        field.value = String(value ?? '');
                    }
                });
            }

            syncDefaultSnapshot();

            if (typeof window.showAppToast === 'function') {
                window.showAppToast(payload.message || 'Ustawienia marketplace zostały zaktualizowane.', 'success');
            }
        });
    }

    if (notificationForm instanceof HTMLFormElement) {
        const disableAllToggle = notificationForm.querySelector('[data-settings-notifications-disable-all]');
        const notificationToggles = Array.from(notificationForm.querySelectorAll('[data-settings-notification-toggle]'));
        const previousNotificationState = new Map();

        const syncNotificationDisabledState = () => {
            const disableAll = disableAllToggle instanceof HTMLInputElement && disableAllToggle.checked;

            notificationToggles.forEach((toggle) => {
                if (!(toggle instanceof HTMLInputElement)) {
                    return;
                }

                if (disableAll) {
                    previousNotificationState.set(toggle.name, toggle.checked);
                    toggle.checked = false;
                    toggle.disabled = true;
                } else {
                    toggle.disabled = false;
                    toggle.removeAttribute('disabled');
                    if (previousNotificationState.has(toggle.name)) {
                        toggle.checked = Boolean(previousNotificationState.get(toggle.name));
                    }
                }
            });

            if (!disableAll) {
                previousNotificationState.clear();
            }
        };

        const syncDisableAllFromToggles = () => {
            if (!(disableAllToggle instanceof HTMLInputElement)) {
                return;
            }

            const anyEnabled = notificationToggles.some((toggle) => toggle instanceof HTMLInputElement && toggle.checked);
            const disableAll = !anyEnabled;
            disableAllToggle.checked = disableAll;

            notificationToggles.forEach((toggle) => {
                if (!(toggle instanceof HTMLInputElement)) {
                    return;
                }

                toggle.disabled = disableAll;
                if (!disableAll) {
                    toggle.removeAttribute('disabled');
                }
            });
        };

        if (disableAllToggle instanceof HTMLInputElement) {
            disableAllToggle.addEventListener('change', syncNotificationDisabledState);
        }

        notificationToggles.forEach((toggle) => {
            if (toggle instanceof HTMLInputElement) {
                toggle.addEventListener('change', syncDisableAllFromToggles);
            }
        });

        syncDisableAllFromToggles();

        notificationForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const confirmed = await openSettingsConfirmModal({
                kicker: 'Zmiana ustawień powiadomień',
                title: 'Zapisać ustawienia powiadomień?',
                message: 'Czy na pewno chcesz zaktualizować preferencje powiadomień w aplikacji?',
                confirmLabel: 'Zapisz powiadomienia',
            });

            if (!confirmed) {
                return;
            }

            const { success, payload } = await submitSettingsForm(notificationForm);
            if (!success) {
                return;
            }

            if (payload.form && typeof payload.form === 'object') {
                Object.entries(payload.form).forEach(([key, value]) => {
                    const field = notificationForm.querySelector(`[name="${key}"]`);
                    if (field instanceof HTMLInputElement && field.type === 'checkbox') {
                        field.checked = Boolean(value);
                    }
                });
            }

            syncDisableAllFromToggles();

            syncDefaultSnapshot();

            if (typeof window.showAppToast === 'function') {
                window.showAppToast(payload.message || 'Ustawienia powiadomień zostały zaktualizowane.', 'success');
            }
        });
    }

    if (resetButton instanceof HTMLButtonElement) {
        resetButton.addEventListener('click', async () => {
            const confirmed = await openSettingsConfirmModal({
                kicker: 'Potwierdzenie przywracania',
                title: 'Potwierdź przywrócenie',
                message: 'Ta operacja cofnie wszystkie bieżące zmiany w formularzach na tej stronie. Kontynuować?',
                confirmLabel: 'Przywróć ustawienia',
                confirmButtonClass: 'settings-button-primary',
            });

            if (!confirmed) {
                return;
            }

            defaultSnapshot.forEach((item) => {
                const control = item.element;

                if (control instanceof HTMLInputElement) {
                    if (item.type === 'checkbox' || item.type === 'radio') {
                        control.checked = Boolean(item.checked);
                    } else {
                        control.value = String(item.value ?? '');
                    }

                    control.dispatchEvent(new Event('input', { bubbles: true }));
                    control.dispatchEvent(new Event('change', { bubbles: true }));
                    return;
                }

                if (control instanceof HTMLSelectElement) {
                    control.selectedIndex = Number(item.selectedIndex ?? 0);
                    control.dispatchEvent(new Event('change', { bubbles: true }));
                    return;
                }

                if (control instanceof HTMLTextAreaElement) {
                    control.value = String(item.value ?? '');
                    control.dispatchEvent(new Event('input', { bubbles: true }));
                    control.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });

            if (accountForm instanceof HTMLFormElement) {
                clearFormErrors(accountForm);
            }

            if (securityForm instanceof HTMLFormElement) {
                clearFormErrors(securityForm);
                syncPasswordConfirmationWarning();
            }

            if (privacyForm instanceof HTMLFormElement) {
                clearFormErrors(privacyForm);
            }

            if (applicationForm instanceof HTMLFormElement) {
                clearFormErrors(applicationForm);
            }

            if (communityForm instanceof HTMLFormElement) {
                clearFormErrors(communityForm);
            }

            if (marketplaceForm instanceof HTMLFormElement) {
                clearFormErrors(marketplaceForm);
            }

            if (notificationForm instanceof HTMLFormElement) {
                clearFormErrors(notificationForm);
            }

            if (typeof window.showAppToast === 'function') {
                window.showAppToast('Ustawienia zostały przywrócone do wartości domyślnych.', 'success');
            }
        });
    }

    if (logoutForm instanceof HTMLFormElement) {
        logoutForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const confirmed = await openSettingsConfirmModal({
                kicker: 'Sesja',
                title: 'Wylogować się?',
                message: 'Czy na pewno chcesz zakończyć bieżącą sesję?',
                confirmLabel: 'Wyloguj się',
                confirmButtonClass: 'settings-button-muted',
            });

            if (!confirmed) {
                return;
            }

            HTMLFormElement.prototype.submit.call(logoutForm);
        });
    }

    const submitDeleteAccount = (currentPassword) => {
        if (deleteAccountForm instanceof HTMLFormElement) {
            if (deleteAccountPasswordInput instanceof HTMLInputElement) {
                deleteAccountPasswordInput.value = String(currentPassword || '');
            }
            HTMLFormElement.prototype.submit.call(deleteAccountForm);
            return;
        }

        const fallbackForm = document.createElement('form');
        fallbackForm.method = 'post';
        fallbackForm.action = window.location.pathname + window.location.search;
        fallbackForm.hidden = true;

        const actionInput = document.createElement('input');
        actionInput.type = 'hidden';
        actionInput.name = 'action';
        actionInput.value = 'delete_account';
        fallbackForm.appendChild(actionInput);

        const passwordInput = document.createElement('input');
        passwordInput.type = 'hidden';
        passwordInput.name = 'current_password';
        passwordInput.value = String(currentPassword || '');
        fallbackForm.appendChild(passwordInput);

        document.body.appendChild(fallbackForm);
        HTMLFormElement.prototype.submit.call(fallbackForm);
    };

    const handleDeleteAccountRequest = async () => {
        const firstConfirmed = await openSettingsConfirmModal({
            kicker: 'Usuwanie konta',
            title: 'Usunąć konto?',
            message: 'Czy na pewno chcesz usunąć konto? Operacja wyloguje Cię i ukryje Twoje aktywne treści w aplikacji. Tego kroku nie da się cofnąć.',
            confirmLabel: 'Dalej',
            confirmButtonClass: 'settings-button-muted',
        });

        if (!firstConfirmed) {
            return;
        }

        const secondConfirmed = await openSettingsConfirmModal({
            kicker: 'Ostateczne potwierdzenie',
            title: 'Potwierdź usunięcie konta',
            message: 'To jest ostatni krok. Po zatwierdzeniu konto zostanie wyłączone, sesja zakończona, a aktywne treści ukryte w aplikacji.',
            confirmLabel: 'Usuń konto',
            confirmButtonClass: 'settings-button-danger',
        });

        if (!secondConfirmed) {
            return;
        }

        const currentPassword = await openSettingsPasswordModal();
        if (!currentPassword) {
            return;
        }

        submitDeleteAccount(currentPassword);
    };

    if (deleteAccountForm instanceof HTMLFormElement) {
        deleteAccountForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            await handleDeleteAccountRequest();
        });
    }

    if (deleteAccountButton instanceof HTMLButtonElement) {
        deleteAccountButton.addEventListener('click', async () => {
            await handleDeleteAccountRequest();
        });
    }
}
