const settingsRoot = document.querySelector('[data-settings-root]');

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
