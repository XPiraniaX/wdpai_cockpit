document.addEventListener('DOMContentLoaded', () => {
    const modalRoot = document.querySelector('[data-vehicle-modal-root]');

    if (!modalRoot) {
        return;
    }

    const panels = Array.from(modalRoot.querySelectorAll('[data-modal-panel]'));
    const openButtons = document.querySelectorAll('[data-modal-open]');
    const closeButtons = modalRoot.querySelectorAll('[data-vehicle-modal-close]');
    const scrim = modalRoot.querySelector('[data-vehicle-modal-scrim]');
    const serviceForm = modalRoot.querySelector('[data-modal-panel="modal-service-add"] form');
    let activePanel = null;

    const enhanceNumberInputs = () => {
        const numberInputs = modalRoot.querySelectorAll('.vehicle-modal-field input[type="number"]:not([readonly])');

        numberInputs.forEach((input) => {
            if (input.parentElement?.classList.contains('vehicle-number-input')) {
                return;
            }

            const wrapper = document.createElement('div');
            wrapper.className = 'vehicle-number-input';
            input.parentNode.insertBefore(wrapper, input);
            wrapper.appendChild(input);

            const stepper = document.createElement('div');
            stepper.className = 'vehicle-number-stepper';

            const increaseButton = document.createElement('button');
            increaseButton.type = 'button';
            increaseButton.className = 'vehicle-number-stepper-button';
            increaseButton.setAttribute('aria-label', 'Zwieksz wartosc');
            increaseButton.textContent = '+';

            const decreaseButton = document.createElement('button');
            decreaseButton.type = 'button';
            decreaseButton.className = 'vehicle-number-stepper-button';
            decreaseButton.setAttribute('aria-label', 'Zmniejsz wartosc');
            decreaseButton.textContent = '-';

            const dispatchInputEvents = () => {
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            };

            increaseButton.addEventListener('click', () => {
                input.stepUp();
                dispatchInputEvents();
            });

            decreaseButton.addEventListener('click', () => {
                input.stepDown();
                dispatchInputEvents();
            });

            stepper.appendChild(increaseButton);
            stepper.appendChild(decreaseButton);
            wrapper.appendChild(stepper);
        });
    };

    const closeModal = () => {
        modalRoot.hidden = true;
        document.body.classList.remove('vehicle-modal-open');

        if (activePanel) {
            activePanel.hidden = true;
            activePanel = null;
        }
    };

    const openModal = (panelName) => {
        const nextPanel = panels.find((panel) => panel.dataset.modalPanel === panelName);

        if (!nextPanel) {
            return;
        }

        panels.forEach((panel) => {
            panel.hidden = true;
        });

        activePanel = nextPanel;
        activePanel.hidden = false;
        modalRoot.hidden = false;
        document.body.classList.add('vehicle-modal-open');
    };

    openButtons.forEach((button) => {
        button.addEventListener('click', () => {
            if (button.dataset.modalOpen === 'modal-service-add' && serviceForm) {
                serviceForm.reset();

                const sourceTaskInput = serviceForm.querySelector('input[name="source_task_id"]');
                const dateInput = serviceForm.querySelector('input[name="service_date"]');

                if (sourceTaskInput) {
                    sourceTaskInput.value = '';
                }

                if (dateInput) {
                    dateInput.value = new Date().toISOString().slice(0, 10);
                }
            }

            openModal(button.dataset.modalOpen);
        });
    });

    modalRoot.querySelectorAll('[data-task-realize]').forEach((button) => {
        button.addEventListener('click', () => {
            if (!serviceForm) {
                return;
            }

            const titleInput = serviceForm.querySelector('input[name="title"]');
            const descriptionInput = serviceForm.querySelector('textarea[name="description"]');
            const costInput = serviceForm.querySelector('input[name="cost_amount"]');
            const dateInput = serviceForm.querySelector('input[name="service_date"]');
            const sourceTaskInput = serviceForm.querySelector('input[name="source_task_id"]');

            if (titleInput) {
                titleInput.value = button.dataset.taskTitle ?? '';
            }

            if (descriptionInput) {
                descriptionInput.value = button.dataset.taskDescription ?? '';
            }

            if (costInput) {
                costInput.value = button.dataset.taskCost ?? '';
            }

            if (dateInput) {
                dateInput.value = new Date().toISOString().slice(0, 10);
            }

            if (sourceTaskInput) {
                sourceTaskInput.value = button.dataset.taskId ?? '';
            }

            openModal('modal-service-add');
        });
    });

    closeButtons.forEach((button) => {
        button.addEventListener('click', closeModal);
    });

    if (scrim) {
        scrim.addEventListener('click', closeModal);
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !modalRoot.hidden) {
            closeModal();
        }
    });

    enhanceNumberInputs();
});
