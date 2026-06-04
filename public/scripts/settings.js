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
    message = 'Czy na pewno chcesz zapisać zmiany w danych konta?',
    confirmLabel = 'Zapisz zmiany',
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

    const resetButton = settingsRoot.querySelector('[data-settings-reset-defaults]');
    const accountForm = settingsRoot.querySelector('[data-settings-account-form]');
    const securityForm = settingsRoot.querySelector('[data-settings-security-form]');

    if (accountForm instanceof HTMLFormElement) {
        accountForm.addEventListener('submit', async (event) => {
            if (accountForm.dataset.settingsConfirmed === 'true') {
                accountForm.dataset.settingsConfirmed = 'false';
                return;
            }

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

            accountForm.dataset.settingsConfirmed = 'true';
            accountForm.submit();
        });
    }

    if (securityForm instanceof HTMLFormElement) {
        securityForm.addEventListener('submit', async (event) => {
            if (securityForm.dataset.settingsConfirmed === 'true') {
                securityForm.dataset.settingsConfirmed = 'false';
                return;
            }

            event.preventDefault();

            const confirmed = await openSettingsConfirmModal({
                kicker: 'Zmiana hasła',
                title: 'Zmień hasło?',
                message: 'Czy na pewno chcesz ustawić nowe hasło do konta? Po zapisaniu będziesz używać już tylko nowego hasła.',
                confirmLabel: 'Zmień hasło',
            });

            if (!confirmed) {
                return;
            }

            securityForm.dataset.settingsConfirmed = 'true';
            securityForm.submit();
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

            if (typeof window.showAppToast === 'function') {
                window.showAppToast('Ustawienia zostały przywrócone do wartości domyślnych.', 'success');
            }
        });
    }
}
