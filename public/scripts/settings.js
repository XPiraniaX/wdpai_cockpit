const settingsRoot = document.querySelector('[data-settings-root]');

let activeSettingsConfirmResolver = null;
let activeSettingsConfirmKeyHandler = null;

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
    const logoutForm = settingsRoot.querySelector('[data-settings-logout-form]');
    const deleteAccountForm = settingsRoot.querySelector('[data-settings-delete-account-form]');
    const deleteAccountButton = settingsRoot.querySelector('.settings-panel-danger .settings-button-ghost-danger');

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

    if (resetButton instanceof HTMLButtonElement) {
        resetButton.addEventListener('click', () => {
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

    const submitDeleteAccount = () => {
        if (deleteAccountForm instanceof HTMLFormElement) {
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

        submitDeleteAccount();
    };

    if (deleteAccountForm instanceof HTMLFormElement) {
        deleteAccountForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            await handleDeleteAccountRequest();
        });
    } else if (deleteAccountButton instanceof HTMLButtonElement) {
        deleteAccountButton.addEventListener('click', async () => {
            await handleDeleteAccountRequest();
        });
    }
}
