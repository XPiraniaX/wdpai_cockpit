(() => {
    const registerForm = document.querySelector('[data-auth-register-form]');
    if (!(registerForm instanceof HTMLFormElement)) {
        return;
    }

    const passwordInput = registerForm.querySelector('[data-auth-new-password]');
    const confirmationInput = registerForm.querySelector('[data-auth-password-confirmation]');
    const mismatchWarning = registerForm.querySelector('[data-auth-password-match-error]');

    if (!(passwordInput instanceof HTMLInputElement)
        || !(confirmationInput instanceof HTMLInputElement)
        || !(mismatchWarning instanceof HTMLElement)) {
        return;
    }

    const syncPasswordConfirmationWarning = () => {
        const shouldShow = confirmationInput.value !== ''
            && passwordInput.value !== confirmationInput.value;

        mismatchWarning.hidden = !shouldShow;
        confirmationInput.classList.toggle('is-invalid', shouldShow);
    };

    passwordInput.addEventListener('input', syncPasswordConfirmationWarning);
    confirmationInput.addEventListener('input', syncPasswordConfirmationWarning);
    syncPasswordConfirmationWarning();
})();
