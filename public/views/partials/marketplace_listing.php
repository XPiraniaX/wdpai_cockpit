<?php
$detailsModalId = 'marketplace-details-modal-' . (int) $listing['id'];
$hasImages = !empty($listing['images']);
$isOwnListing = ((int) ($currentUser['id'] ?? 0)) === (int) $listing['user_id'];
?>
<article class="marketplace-listing card" id="listing-<?= (int) $listing['id']; ?>">
    <div class="marketplace-listing-top">
        <div class="marketplace-listing-author">
            <a href="<?= htmlspecialchars($listing['profile_path'], ENT_QUOTES, 'UTF-8'); ?>" class="community-avatar" aria-label="Profil sprzedającego">
                <span class="community-avatar-ring"></span>
            </a>
            <div class="marketplace-listing-author-meta">
                <a href="<?= htmlspecialchars($listing['profile_path'], ENT_QUOTES, 'UTF-8'); ?>" class="marketplace-listing-author-name">
                    <?= htmlspecialchars($listing['author_name'], ENT_QUOTES, 'UTF-8'); ?>
                </a>
                <div class="marketplace-listing-author-subline">
                    <span><?= htmlspecialchars($listing['formatted_created_at'], ENT_QUOTES, 'UTF-8'); ?></span>
                    <span>•</span>
                    <span><?= htmlspecialchars($listing['city'], ENT_QUOTES, 'UTF-8'); ?></span>
                </div>
            </div>
        </div>

        <div class="marketplace-listing-top-actions">
            <span class="marketplace-listing-category"><?= htmlspecialchars($listing['category_label'], ENT_QUOTES, 'UTF-8'); ?></span>

            <form method="post" class="marketplace-inline-form" data-marketplace-save-form>
                <input type="hidden" name="action" value="toggle_save">
                <input type="hidden" name="listing_id" value="<?= (int) $listing['id']; ?>">
                <input type="hidden" name="redirect_to" value="<?= htmlspecialchars($_SERVER['REQUEST_URI'] ?? '/marketplace', ENT_QUOTES, 'UTF-8'); ?>">
                <button type="submit" class="marketplace-save-button<?= $listing['saved_by_current_user'] ? ' is-active' : ''; ?>" data-marketplace-save-button aria-label="Zapisz ogłoszenie">
                    <span class="marketplace-save-heart" aria-hidden="true" data-marketplace-save-icon>
                        <?php if ($listing['saved_by_current_user']): ?>
                            <svg viewBox="0 0 24 24" class="marketplace-save-heart-svg is-filled">
                                <path d="M12 21.35 10.55 20.03C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54Z"/>
                            </svg>
                        <?php else: ?>
                            <svg viewBox="0 0 24 24" class="marketplace-save-heart-svg is-outline">
                                <path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09A5.964 5.964 0 0 0 7.5 3C4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.31C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3Zm-4.4 15.55-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5 18.5 5 20 6.5 20 8.5c0 2.89-3.14 5.74-7.9 10.05Z"/>
                            </svg>
                        <?php endif; ?>
                    </span>
                </button>
            </form>
        </div>
    </div>

    <div
        class="marketplace-listing-open"
        role="button"
        tabindex="0"
        data-open-marketplace-details
        data-marketplace-details-id="<?= htmlspecialchars($detailsModalId, ENT_QUOTES, 'UTF-8'); ?>"
    >
        <?php if ($hasImages): ?>
            <div class="marketplace-listing-carousel<?= count($listing['images']) > 1 ? ' has-controls' : ''; ?>" data-marketplace-carousel>
                <?php if (count($listing['images']) > 1): ?>
                    <span class="marketplace-listing-carousel-control is-prev" data-marketplace-carousel-prev></span>
                <?php endif; ?>

                <div class="marketplace-listing-carousel-viewport">
                    <div class="marketplace-listing-carousel-track" data-marketplace-carousel-track>
                        <?php foreach ($listing['images'] as $image): ?>
                            <div class="marketplace-listing-carousel-slide">
                                <img src="<?= htmlspecialchars($image['path'], ENT_QUOTES, 'UTF-8'); ?>" alt="<?= htmlspecialchars($listing['title'], ENT_QUOTES, 'UTF-8'); ?>" class="marketplace-listing-image">
                            </div>
                        <?php endforeach; ?>
                    </div>
                </div>

                <?php if (count($listing['images']) > 1): ?>
                    <span class="marketplace-listing-carousel-control is-next" data-marketplace-carousel-next></span>
                <?php endif; ?>
            </div>
        <?php endif; ?>

        <div class="marketplace-listing-body">
            <div class="marketplace-listing-price"><?= htmlspecialchars($listing['formatted_price'], ENT_QUOTES, 'UTF-8'); ?></div>
            <h2 class="marketplace-listing-title"><?= htmlspecialchars($listing['title'], ENT_QUOTES, 'UTF-8'); ?></h2>
            <div class="marketplace-listing-meta">
                <span><?= htmlspecialchars((string) $listing['production_year'], ENT_QUOTES, 'UTF-8'); ?></span>
                <span>•</span>
                <span><?= htmlspecialchars($listing['formatted_mileage'], ENT_QUOTES, 'UTF-8'); ?></span>
                <span>•</span>
                <span><?= htmlspecialchars($listing['formatted_fuel_type'], ENT_QUOTES, 'UTF-8'); ?></span>
            </div>
        </div>
    </div>
</article>

<section class="marketplace-details-modal" id="<?= htmlspecialchars($detailsModalId, ENT_QUOTES, 'UTF-8'); ?>" hidden data-marketplace-details-modal>
    <div class="marketplace-details-modal-backdrop" data-close-marketplace-details></div>

    <div class="marketplace-details-modal-panel">
        <header class="community-modal-header marketplace-details-modal-header">
            <h2 class="community-modal-title">Szczegóły ogłoszenia</h2>
            <button type="button" class="community-modal-close" aria-label="Zamknij" data-close-marketplace-details>
                <img src="/public/assets/icons/close.svg" alt="">
            </button>
        </header>

        <div class="marketplace-details-modal-body">
            <?php if ($hasImages): ?>
                <div class="marketplace-details-gallery<?= count($listing['images']) > 1 ? ' has-controls' : ''; ?>" data-marketplace-carousel>
                    <?php if (count($listing['images']) > 1): ?>
                        <button type="button" class="marketplace-listing-carousel-control is-prev" aria-label="Poprzednie zdjęcie" data-marketplace-carousel-prev></button>
                    <?php endif; ?>

                    <div class="marketplace-listing-carousel-viewport">
                        <div class="marketplace-listing-carousel-track" data-marketplace-carousel-track>
                            <?php foreach ($listing['images'] as $image): ?>
                                <div class="marketplace-listing-carousel-slide">
                                    <img src="<?= htmlspecialchars($image['path'], ENT_QUOTES, 'UTF-8'); ?>" alt="<?= htmlspecialchars($listing['title'], ENT_QUOTES, 'UTF-8'); ?>" class="marketplace-listing-image marketplace-details-image">
                                </div>
                            <?php endforeach; ?>
                        </div>
                    </div>

                    <?php if (count($listing['images']) > 1): ?>
                        <button type="button" class="marketplace-listing-carousel-control is-next" aria-label="Następne zdjęcie" data-marketplace-carousel-next></button>
                    <?php endif; ?>
                </div>
            <?php endif; ?>

            <div class="marketplace-details-copy">
                <div class="marketplace-details-price"><?= htmlspecialchars($listing['formatted_price'], ENT_QUOTES, 'UTF-8'); ?></div>
                <h3 class="marketplace-details-title"><?= htmlspecialchars($listing['title'], ENT_QUOTES, 'UTF-8'); ?></h3>
                <div class="marketplace-details-subtitle">
                    <?= htmlspecialchars($listing['category_label'], ENT_QUOTES, 'UTF-8'); ?>
                    <?php if (!$isOwnListing): ?>
                        <span>•</span>
                        <span><?= htmlspecialchars($listing['author_name'], ENT_QUOTES, 'UTF-8'); ?></span>
                    <?php endif; ?>
                </div>
                <p class="marketplace-details-description"><?= nl2br(htmlspecialchars($listing['description'], ENT_QUOTES, 'UTF-8')); ?></p>

                <div class="marketplace-details-grid">
                    <div class="marketplace-details-row"><span>Rocznik</span><strong><?= htmlspecialchars((string) $listing['production_year'], ENT_QUOTES, 'UTF-8'); ?></strong></div>
                    <div class="marketplace-details-row"><span>Przebieg</span><strong><?= htmlspecialchars($listing['formatted_mileage'], ENT_QUOTES, 'UTF-8'); ?></strong></div>
                    <div class="marketplace-details-row"><span>Paliwo</span><strong><?= htmlspecialchars($listing['formatted_fuel_type'], ENT_QUOTES, 'UTF-8'); ?></strong></div>
                    <div class="marketplace-details-row"><span>Skrzynia</span><strong><?= htmlspecialchars($listing['formatted_transmission'], ENT_QUOTES, 'UTF-8'); ?></strong></div>
                    <div class="marketplace-details-row"><span>Nadwozie</span><strong><?= htmlspecialchars($listing['body_type'] ?: 'Brak danych', ENT_QUOTES, 'UTF-8'); ?></strong></div>
                    <div class="marketplace-details-row"><span>Napęd</span><strong><?= htmlspecialchars($listing['drivetrain'] ?: 'Brak danych', ENT_QUOTES, 'UTF-8'); ?></strong></div>
                    <div class="marketplace-details-row"><span>Silnik</span><strong><?= htmlspecialchars($listing['formatted_engine'], ENT_QUOTES, 'UTF-8'); ?></strong></div>
                    <div class="marketplace-details-row"><span>Moc</span><strong><?= htmlspecialchars($listing['formatted_power'], ENT_QUOTES, 'UTF-8'); ?></strong></div>
                    <div class="marketplace-details-row"><span>Kolor</span><strong><?= htmlspecialchars($listing['exterior_color'] ?: 'Brak danych', ENT_QUOTES, 'UTF-8'); ?></strong></div>
                    <div class="marketplace-details-row"><span>Miasto</span><strong><?= htmlspecialchars($listing['city'], ENT_QUOTES, 'UTF-8'); ?></strong></div>
                </div>

                <div class="marketplace-details-contact">
                    <button type="button" class="marketplace-contact-button" data-marketplace-contact-toggle>Sprawdź dane kontaktowe</button>
                    <div class="marketplace-contact-card" hidden data-marketplace-contact-card>
                        <div class="marketplace-details-row"><span>Sprzedający</span><strong><?= htmlspecialchars($listing['contact_name'], ENT_QUOTES, 'UTF-8'); ?></strong></div>
                        <div class="marketplace-details-row"><span>Telefon</span><strong><?= htmlspecialchars($listing['contact_phone'], ENT_QUOTES, 'UTF-8'); ?></strong></div>
                        <div class="marketplace-details-row"><span>E-mail</span><strong><?= htmlspecialchars($listing['contact_email'], ENT_QUOTES, 'UTF-8'); ?></strong></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

