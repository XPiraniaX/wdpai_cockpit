document.body.classList.add('is-community-page');

document.querySelectorAll('.community-brand-select').forEach((brandSelect) => {
    const targetModelId = brandSelect.getAttribute('data-target-model');
    const modelSelect = targetModelId ? document.getElementById(targetModelId) : null;

    if (!modelSelect) {
        return;
    }

    const syncModelOptions = () => {
        const selectedBrandId = brandSelect.value;
        const currentModelValue = modelSelect.value;
        let currentModelStillVisible = false;

        Array.from(modelSelect.options).forEach((option, index) => {
            if (index === 0) {
                option.hidden = false;
                return;
            }

            const optionBrandId = option.getAttribute('data-brand-id');
            const shouldShow = !selectedBrandId || optionBrandId === selectedBrandId;

            option.hidden = !shouldShow;

            if (shouldShow && option.value === currentModelValue) {
                currentModelStillVisible = true;
            }
        });

        if (!currentModelStillVisible) {
            modelSelect.value = '';
        }

        modelSelect.disabled = !selectedBrandId;
    };

    brandSelect.addEventListener('change', syncModelOptions);
    syncModelOptions();
});

const modal = document.querySelector('[data-community-modal]');
const modalBackdrop = document.querySelector('[data-community-modal-backdrop]');
const openModalButtons = document.querySelectorAll('[data-open-community-modal]');
const closeModalButton = document.querySelector('[data-close-community-modal]');
const modalTextarea = modal?.querySelector('.community-modal-textarea') ?? null;

const openModal = () => {
    if (!modal || !modalBackdrop) {
        return;
    }

    modal.hidden = false;
    modalBackdrop.hidden = false;
    document.body.style.overflow = 'hidden';

    if (modalTextarea) {
        window.setTimeout(() => modalTextarea.focus(), 30);
    }
};

const closeModal = () => {
    if (!modal || !modalBackdrop) {
        return;
    }

    modal.hidden = true;
    modalBackdrop.hidden = true;
    document.body.style.overflow = '';
};

openModalButtons.forEach((button) => {
    button.addEventListener('click', openModal);
});

closeModalButton?.addEventListener('click', closeModal);
modalBackdrop?.addEventListener('click', closeModal);

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal && !modal.hidden) {
        closeModal();
    }
});
