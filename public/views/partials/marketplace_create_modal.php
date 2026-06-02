<?php
$steeringSideLabels = [
    'left' => 'Lewa',
    'right' => 'Prawa',
];

$technicalConditionLabels = [
    'undamaged' => 'Nieuszkodzony',
    'damaged' => 'Uszkodzony',
];
?>
<div class="vehicle-modal-backdrop marketplace-create-backdrop" data-marketplace-create-backdrop hidden>
    <div class="vehicle-modal-scrim" data-close-marketplace-create></div>
    <div class="vehicle-modal-shell">
        <section class="vehicle-modal-panel cars-add-modal marketplace-create-modal marketplace-create-wizard" hidden data-marketplace-create-modal>
            <div class="vehicle-modal-head">
                <div class="vehicle-modal-title-wrap">
                    <div class="vehicle-modal-kicker" data-marketplace-create-kicker>Nowe ogłoszenie</div>
                    <h3 class="vehicle-modal-title" data-marketplace-create-title>Dodaj ogłoszenie</h3>
                </div>
                <button type="button" class="vehicle-modal-close" aria-label="Zamknij" data-close-marketplace-create><span class="vehicle-modal-close-icon" aria-hidden="true"></span></button>
            </div>

            <section class="marketplace-create-entry" data-marketplace-create-entry>
                <div class="marketplace-create-mode-choice" data-marketplace-create-mode-choice>
                    <button type="button" class="marketplace-button" data-marketplace-open-import-choice>Dodaj ogłoszenie istniejącego samochodu</button>
                    <button type="button" class="marketplace-button marketplace-button-secondary" data-marketplace-open-new-choice>Dodaj nowe ogłoszenie</button>
                </div>

                <div class="marketplace-create-vehicle-choice" data-marketplace-create-vehicle-choice hidden>
                    <div class="marketplace-create-vehicle-choice-head">
                        <h4>Wybierz pojazd z garażu</h4>
                        <button type="button" class="vehicle-modal-secondary" data-marketplace-back-to-mode-choice>Wstecz</button>
                    </div>

                    <?php if (($importVehicles ?? []) === []): ?>
                        <div class="marketplace-create-empty-import">
                            <p>Nie masz jeszcze żadnego pojazdu w garażu.</p>
                            <button type="button" class="marketplace-button marketplace-button-secondary" data-marketplace-open-new-choice>Dodaj nowe ogłoszenie</button>
                        </div>
                    <?php else: ?>
                        <div class="marketplace-create-vehicle-list">
                            <?php foreach (($importVehicles ?? []) as $vehicle): ?>
                                <button
                                    type="button"
                                    class="marketplace-create-vehicle-card"
                                    data-marketplace-import-vehicle
                                    data-marketplace-import-payload="<?= htmlspecialchars(json_encode($vehicle['payload'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), ENT_QUOTES, 'UTF-8'); ?>"
                                >
                                    <?php if (!empty($vehicle['image_path'])): ?>
                                        <img src="<?= htmlspecialchars($vehicle['image_path'], ENT_QUOTES, 'UTF-8'); ?>" alt="<?= htmlspecialchars($vehicle['display_name'], ENT_QUOTES, 'UTF-8'); ?>" class="marketplace-create-vehicle-image">
                                    <?php else: ?>
                                        <div class="marketplace-create-vehicle-image is-placeholder"></div>
                                    <?php endif; ?>
                                    <div class="marketplace-create-vehicle-copy">
                                        <strong><?= htmlspecialchars($vehicle['display_name'], ENT_QUOTES, 'UTF-8'); ?></strong>
                                        <span><?= htmlspecialchars((string) ($vehicle['production_year'] ?? '—'), ENT_QUOTES, 'UTF-8'); ?> • <?= htmlspecialchars(isset($vehicle['current_mileage_km']) ? number_format((int) $vehicle['current_mileage_km'], 0, ',', ' ') . ' km' : '—', ENT_QUOTES, 'UTF-8'); ?></span>
                                    </div>
                                </button>
                            <?php endforeach; ?>
                        </div>
                    <?php endif; ?>
                </div>
            </section>

            <form method="post" action="/marketplace" enctype="multipart/form-data" class="vehicle-modal-form cars-add-form marketplace-create-form" data-marketplace-create-form hidden>
                <input type="hidden" name="action" value="create_listing" data-marketplace-create-action>
                <input type="hidden" name="listing_id" value="" data-marketplace-edit-id>
                <input type="hidden" name="source_vehicle_id" value="" data-marketplace-source-vehicle-id>
                <input type="hidden" name="brand_name" value="" data-marketplace-brand-hidden>
                <input type="hidden" name="model_name" value="" data-marketplace-model-hidden>
                <input type="hidden" name="redirect_to" value="<?= htmlspecialchars((string) ($_SERVER['REQUEST_URI'] ?? '/marketplace'), ENT_QUOTES, 'UTF-8'); ?>">
                <div data-marketplace-removed-images-inputs hidden></div>

                <div class="cars-add-form-shell marketplace-create-shell">
                    <aside class="cars-add-media-column marketplace-create-media-column">
                        <div class="cars-add-media-stack">
                            <input
                                type="file"
                                name="listing_images[]"
                                accept=".jpg,.jpeg,.png,.webp"
                                class="cars-add-image-input"
                                data-marketplace-image-input
                                multiple
                                required
                            >
                            <div class="cars-add-media-note">Zdjęcia ogłoszenia, maks. 12</div>
                            <div class="cars-add-media-note" data-marketplace-existing-images-note hidden>Obecne zdjęcia zostaną zachowane. Nowe zdjęcia zostaną dodane do istniejących.</div>
                            <div class="cars-add-gallery" data-marketplace-gallery></div>
                        </div>
                    </aside>

                    <div class="cars-add-content-column marketplace-create-content-column">
                        <section class="marketplace-create-step" data-marketplace-create-step="1">
                            <div class="vehicle-modal-grid vehicle-modal-grid-single marketplace-create-step-grid">
                                <label class="vehicle-modal-field">
                                    <span>Nazwa ogłoszenia</span>
                                    <input type="text" name="title" placeholder="Np. Seat Leon II 1P 2.0 TFSI" required>
                                </label>
                                <label class="vehicle-modal-field">
                                    <span>Cena</span>
                                    <div class="vehicle-currency-field">
                                        <input type="text" inputmode="numeric" name="price_amount" data-marketplace-number min="0" step="1" required>
                                        <span class="vehicle-currency-suffix">PLN</span>
                                    </div>
                                </label>
                                <label class="vehicle-modal-field">
                                    <span>Opis</span>
                                    <textarea name="description" rows="8" placeholder="Opisz stan auta, wyposażenie i historię." required></textarea>
                                </label>
                                <label class="vehicle-modal-field">
                                    <span>Stan techniczny</span>
                                    <select name="technical_condition" class="marketplace-select" required>
                                        <option value="">Wybierz stan</option>
                                        <?php foreach ($technicalConditionLabels as $value => $label): ?>
                                            <option value="<?= htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); ?>"><?= htmlspecialchars($label, ENT_QUOTES, 'UTF-8'); ?></option>
                                        <?php endforeach; ?>
                                    </select>
                                </label>
                            </div>

                            <div class="vehicle-modal-footer marketplace-create-actions marketplace-create-actions-center">
                                <button type="button" class="vehicle-modal-submit" data-marketplace-step-next>Dalej</button>
                            </div>
                        </section>

                        <section class="marketplace-create-step" data-marketplace-create-step="2" hidden>
                            <div class="vehicle-modal-grid vehicle-modal-grid-single marketplace-create-step-grid marketplace-create-step-grid-compact">
                                <label class="vehicle-modal-field">
                                    <span>Marka</span>
                                    <select
                                        name="brand_id"
                                        class="marketplace-select marketplace-brand-select"
                                        data-target-model="marketplace-create-model"
                                        data-marketplace-create-brand-select
                                        required
                                    >
                                        <option value="">Wybierz markę</option>
                                        <?php foreach (($brands ?? []) as $brand): ?>
                                            <option value="<?= (int) $brand['id']; ?>"><?= htmlspecialchars($brand['name'], ENT_QUOTES, 'UTF-8'); ?></option>
                                        <?php endforeach; ?>
                                    </select>
                                </label>
                                <label class="vehicle-modal-field">
                                    <span>Model</span>
                                    <select
                                        name="model_id"
                                        class="marketplace-select marketplace-model-select"
                                        id="marketplace-create-model"
                                        data-marketplace-create-model-select
                                        required
                                    >
                                        <option value="">Najpierw wybierz markę</option>
                                        <?php foreach (($brands ?? []) as $brand): ?>
                                            <?php foreach (($brand['models'] ?? []) as $model): ?>
                                                <option value="<?= (int) $model['id']; ?>" data-brand-id="<?= (int) $brand['id']; ?>">
                                                    <?= htmlspecialchars($model['name'], ENT_QUOTES, 'UTF-8'); ?>
                                                </option>
                                            <?php endforeach; ?>
                                        <?php endforeach; ?>
                                    </select>
                                </label>
                                <label class="vehicle-modal-field" data-marketplace-custom-brand-field hidden>
                                    <span>Wpisz markę</span>
                                    <input type="text" value="" placeholder="Np. Saab" data-marketplace-brand-custom>
                                </label>
                                <label class="vehicle-modal-field" data-marketplace-custom-model-field hidden>
                                    <span>Wpisz model</span>
                                    <input type="text" value="" placeholder="Np. 9-3 II" data-marketplace-model-custom>
                                </label>
                                <label class="vehicle-modal-field">
                                    <span>Wersja</span>
                                    <input type="text" name="trim_name" placeholder="Np. FR" required>
                                </label>
                                <label class="vehicle-modal-field">
                                    <span>Rocznik</span>
                                    <input type="text" inputmode="numeric" name="production_year" data-marketplace-number min="1886" max="2100" required>
                                </label>
                                <label class="vehicle-modal-field">
                                    <span>Przebieg</span>
                                    <div class="vehicle-currency-field">
                                        <input type="text" inputmode="numeric" name="mileage_km" data-marketplace-number min="0" required>
                                        <span class="vehicle-currency-suffix">km</span>
                                    </div>
                                </label>
                                <label class="vehicle-modal-field">
                                    <span>Rodzaj nadwozia</span>
                                    <select name="body_type" class="marketplace-select" required>
                                        <option value="">Wybierz nadwozie</option>
                                        <?php foreach (($bodyTypeOptions ?? []) as $value => $label): ?>
                                            <option value="<?= htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); ?>"><?= htmlspecialchars($label, ENT_QUOTES, 'UTF-8'); ?></option>
                                        <?php endforeach; ?>
                                    </select>
                                </label>
                                <label class="vehicle-modal-field">
                                    <span>Kolor</span>
                                    <input type="text" name="exterior_color" placeholder="Np. czarny" required>
                                </label>
                            </div>

                            <div class="vehicle-modal-footer marketplace-create-actions">
                                <button type="button" class="vehicle-modal-secondary" data-marketplace-step-prev>Wstecz</button>
                                <button type="button" class="vehicle-modal-submit" data-marketplace-step-next>Dalej</button>
                            </div>
                        </section>

                        <section class="marketplace-create-step" data-marketplace-create-step="3" hidden>
                            <div class="vehicle-modal-grid vehicle-modal-grid-single marketplace-create-step-grid">
                                <label class="vehicle-modal-field">
                                    <span>Pojemność silnika</span>
                                    <div class="vehicle-currency-field">
                                        <input type="text" inputmode="numeric" name="engine_capacity_cc" data-marketplace-number min="0" required>
                                        <span class="vehicle-currency-suffix">cm3</span>
                                    </div>
                                </label>
                                <label class="vehicle-modal-field">
                                    <span>Moc</span>
                                    <div class="vehicle-currency-field">
                                        <input type="text" inputmode="numeric" name="power_hp" data-marketplace-number min="0" required>
                                        <span class="vehicle-currency-suffix">KM</span>
                                    </div>
                                </label>
                                <label class="vehicle-modal-field">
                                    <span>Rodzaj paliwa</span>
                                    <select name="fuel_type" class="marketplace-select" required>
                                        <option value="">Wybierz paliwo</option>
                                        <?php foreach (($fuelTypeOptions ?? []) as $value => $label): ?>
                                            <option value="<?= htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); ?>"><?= htmlspecialchars($label, ENT_QUOTES, 'UTF-8'); ?></option>
                                        <?php endforeach; ?>
                                    </select>
                                </label>
                                <label class="vehicle-modal-field">
                                    <span>Rodzaj napędu</span>
                                    <select name="drivetrain" class="marketplace-select" required>
                                        <option value="">Wybierz napęd</option>
                                        <?php foreach (($drivetrainOptions ?? []) as $value => $label): ?>
                                            <option value="<?= htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); ?>"><?= htmlspecialchars($label, ENT_QUOTES, 'UTF-8'); ?></option>
                                        <?php endforeach; ?>
                                    </select>
                                </label>
                                <label class="vehicle-modal-field">
                                    <span>Skrzynia biegów</span>
                                    <select name="transmission" class="marketplace-select" required>
                                        <option value="">Wybierz skrzynię</option>
                                        <?php foreach (($transmissionOptions ?? []) as $value => $label): ?>
                                            <option value="<?= htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); ?>"><?= htmlspecialchars($label, ENT_QUOTES, 'UTF-8'); ?></option>
                                        <?php endforeach; ?>
                                    </select>
                                </label>
                                <label class="vehicle-modal-field">
                                    <span>Kierownica</span>
                                    <select name="steering_side" class="marketplace-select" required>
                                        <option value="">Wybierz stronę</option>
                                        <?php foreach ($steeringSideLabels as $value => $label): ?>
                                            <option value="<?= htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); ?>"><?= htmlspecialchars($label, ENT_QUOTES, 'UTF-8'); ?></option>
                                        <?php endforeach; ?>
                                    </select>
                                </label>
                            </div>

                            <div class="vehicle-modal-footer marketplace-create-actions">
                                <button type="button" class="vehicle-modal-secondary" data-marketplace-step-prev>Wstecz</button>
                                <button type="button" class="vehicle-modal-submit" data-marketplace-step-next>Dalej</button>
                            </div>
                        </section>

                        <section class="marketplace-create-step" data-marketplace-create-step="4" hidden>
                            <div class="vehicle-modal-grid vehicle-modal-grid-single marketplace-create-step-grid marketplace-create-step-grid-contact">
                                <label class="vehicle-modal-field">
                                    <span>Imię i nazwisko</span>
                                    <input type="text" name="contact_name" value="<?= htmlspecialchars($currentUser['full_name'] ?? '', ENT_QUOTES, 'UTF-8'); ?>" required>
                                </label>
                                <label class="vehicle-modal-field">
                                    <span>Telefon</span>
                                    <input type="text" name="contact_phone" inputmode="numeric" maxlength="11" placeholder="123 456 789" required>
                                </label>
                                <label class="vehicle-modal-field">
                                    <span>E-mail</span>
                                    <input type="email" name="contact_email" value="<?= htmlspecialchars($currentUser['email'] ?? '', ENT_QUOTES, 'UTF-8'); ?>" required>
                                </label>
                                <label class="vehicle-modal-field">
                                    <span>Lokalizacja</span>
                                    <input type="text" name="city" placeholder="Np. Poznań" required>
                                </label>
                            </div>

                            <div class="vehicle-modal-footer marketplace-create-actions">
                                <button type="button" class="vehicle-modal-secondary" data-marketplace-step-prev>Wstecz</button>
                                <button type="button" class="vehicle-modal-submit" data-marketplace-step-next>Dalej</button>
                            </div>
                        </section>

                        <section class="marketplace-create-step" data-marketplace-create-step="5" hidden>
                            <div class="marketplace-create-summary">
                                <div class="marketplace-create-summary-list">
                                    <div class="marketplace-create-summary-row"><span>Nazwa ogłoszenia</span><strong data-marketplace-summary="title"></strong></div>
                                    <div class="marketplace-create-summary-row"><span>Cena</span><strong data-marketplace-summary="price_amount"></strong></div>
                                    <div class="marketplace-create-summary-row"><span>Opis</span><strong data-marketplace-summary="description"></strong></div>
                                    <div class="marketplace-create-summary-row"><span>Stan techniczny</span><strong data-marketplace-summary="technical_condition"></strong></div>
                                    <div class="marketplace-create-summary-row"><span>Marka</span><strong data-marketplace-summary="brand_name"></strong></div>
                                    <div class="marketplace-create-summary-row"><span>Model</span><strong data-marketplace-summary="model_name"></strong></div>
                                    <div class="marketplace-create-summary-row"><span>Wersja</span><strong data-marketplace-summary="trim_name"></strong></div>
                                    <div class="marketplace-create-summary-row"><span>Rocznik</span><strong data-marketplace-summary="production_year"></strong></div>
                                    <div class="marketplace-create-summary-row"><span>Przebieg</span><strong data-marketplace-summary="mileage_km"></strong></div>
                                    <div class="marketplace-create-summary-row"><span>Rodzaj nadwozia</span><strong data-marketplace-summary="body_type"></strong></div>
                                    <div class="marketplace-create-summary-row"><span>Kolor</span><strong data-marketplace-summary="exterior_color"></strong></div>
                                    <div class="marketplace-create-summary-row"><span>Pojemność silnika</span><strong data-marketplace-summary="engine_capacity_cc"></strong></div>
                                    <div class="marketplace-create-summary-row"><span>Moc</span><strong data-marketplace-summary="power_hp"></strong></div>
                                    <div class="marketplace-create-summary-row"><span>Rodzaj paliwa</span><strong data-marketplace-summary="fuel_type"></strong></div>
                                    <div class="marketplace-create-summary-row"><span>Rodzaj napędu</span><strong data-marketplace-summary="drivetrain"></strong></div>
                                    <div class="marketplace-create-summary-row"><span>Skrzynia biegów</span><strong data-marketplace-summary="transmission"></strong></div>
                                    <div class="marketplace-create-summary-row"><span>Kierownica</span><strong data-marketplace-summary="steering_side"></strong></div>
                                    <div class="marketplace-create-summary-row"><span>Imię i nazwisko</span><strong data-marketplace-summary="contact_name"></strong></div>
                                    <div class="marketplace-create-summary-row"><span>Telefon</span><strong data-marketplace-summary="contact_phone"></strong></div>
                                    <div class="marketplace-create-summary-row"><span>E-mail</span><strong data-marketplace-summary="contact_email"></strong></div>
                                    <div class="marketplace-create-summary-row"><span>Lokalizacja</span><strong data-marketplace-summary="city"></strong></div>
                                </div>
                            </div>

                            <div class="vehicle-modal-footer marketplace-create-actions">
                                <button type="button" class="vehicle-modal-secondary" data-marketplace-step-prev>Wstecz</button>
                                <button type="submit" class="vehicle-modal-submit" data-marketplace-create-submit>Dodaj ogłoszenie</button>
                            </div>
                        </section>
                    </div>
                </div>
            </form>
        </section>
    </div>
</div>
