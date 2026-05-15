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
    const heroMenu = document.querySelector('[data-hero-menu]');
    const heroMenuTrigger = document.querySelector('[data-hero-menu-trigger]');
    const heroMenuDropdown = document.querySelector('[data-hero-menu-dropdown]');
    const heroCarousel = document.querySelector('[data-hero-carousel]');
    const heroCarouselTrack = document.querySelector('[data-hero-carousel-track]');
    const heroCarouselPrev = document.querySelector('[data-hero-carousel-prev]');
    const heroCarouselNext = document.querySelector('[data-hero-carousel-next]');
    let activePanel = null;

    const closeHeroMenu = () => {
        if (!heroMenuTrigger || !heroMenuDropdown) {
            return;
        }

        heroMenuTrigger.setAttribute('aria-expanded', 'false');
        heroMenuDropdown.hidden = true;
    };

    const toggleHeroMenu = () => {
        if (!heroMenuTrigger || !heroMenuDropdown) {
            return;
        }

        const isOpen = heroMenuTrigger.getAttribute('aria-expanded') === 'true';
        heroMenuTrigger.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
        heroMenuDropdown.hidden = isOpen;
    };

    const initializeHeroCarousel = () => {
        if (!heroCarousel || !heroCarouselTrack) {
            return;
        }

        const initialSlides = Array.from(heroCarouselTrack.children);
        if (initialSlides.length <= 1) {
            return;
        }

        const firstClone = initialSlides[0].cloneNode(true);
        const lastClone = initialSlides[initialSlides.length - 1].cloneNode(true);
        heroCarouselTrack.insertBefore(lastClone, initialSlides[0]);
        heroCarouselTrack.appendChild(firstClone);
        const allSlides = Array.from(heroCarouselTrack.children);

        let currentIndex = 1;
        let isAnimating = false;
        let slideWidth = heroCarousel.getBoundingClientRect().width;

        const applySlideWidths = () => {
            slideWidth = heroCarousel.getBoundingClientRect().width;
            heroCarouselTrack.style.width = `${slideWidth * allSlides.length}px`;

            allSlides.forEach((slide) => {
                slide.style.width = `${slideWidth}px`;
                slide.style.minWidth = `${slideWidth}px`;
                slide.style.maxWidth = `${slideWidth}px`;
                slide.style.flex = `0 0 ${slideWidth}px`;
            });
        };

        const syncPosition = () => {
            heroCarouselTrack.style.transform = `translateX(-${currentIndex * slideWidth}px)`;
        };

        const moveToIndex = (nextIndex) => {
            if (isAnimating) {
                return;
            }

            isAnimating = true;
            currentIndex = nextIndex;
            syncPosition();
        };

        heroCarouselTrack.addEventListener('transitionend', () => {
            const totalSlides = initialSlides.length;

            if (currentIndex === 0) {
                heroCarouselTrack.classList.add('is-no-transition');
                currentIndex = totalSlides;
                syncPosition();
                heroCarouselTrack.offsetHeight;
                heroCarouselTrack.classList.remove('is-no-transition');
            } else if (currentIndex === totalSlides + 1) {
                heroCarouselTrack.classList.add('is-no-transition');
                currentIndex = 1;
                syncPosition();
                heroCarouselTrack.offsetHeight;
                heroCarouselTrack.classList.remove('is-no-transition');
            }

            isAnimating = false;
        });

        if (heroCarouselPrev) {
            heroCarouselPrev.addEventListener('click', () => {
                moveToIndex(currentIndex - 1);
            });
        }

        if (heroCarouselNext) {
            heroCarouselNext.addEventListener('click', () => {
                moveToIndex(currentIndex + 1);
            });
        }

        window.addEventListener('resize', () => {
            applySlideWidths();
            heroCarouselTrack.classList.add('is-no-transition');
            syncPosition();
            heroCarouselTrack.offsetHeight;
            heroCarouselTrack.classList.remove('is-no-transition');
        });

        requestAnimationFrame(() => {
            applySlideWidths();
            syncPosition();
        });
    };

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

        closeHeroMenu();

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

    if (heroMenuTrigger) {
        heroMenuTrigger.addEventListener('click', (event) => {
            event.stopPropagation();
            toggleHeroMenu();
        });
    }

    if (heroMenuDropdown) {
        heroMenuDropdown.addEventListener('click', (event) => {
            event.stopPropagation();
        });
    }

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
            closeHeroMenu();
            return;
        }

        if (event.key === 'Escape') {
            closeHeroMenu();
        }
    });

    document.addEventListener('click', (event) => {
        if (!heroMenu || heroMenu.contains(event.target)) {
            return;
        }

        closeHeroMenu();
    });

    enhanceNumberInputs();
    initializeHeroCarousel();

    const openModalFromQuery = () => {
        const params = new URLSearchParams(window.location.search);
        const modalName = params.get('open_modal');

        if (!modalName) {
            return;
        }

        const hasPanel = panels.some((panel) => panel.dataset.modalPanel === modalName);

        if (hasPanel) {
            openModal(modalName);
        }
    };

    openModalFromQuery();
});
