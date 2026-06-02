<article class="marketplace-listing card marketplace-listing-profile" id="profile-listing-<?= (int) $listing['id']; ?>">
    <a href="<?= htmlspecialchars($listing['details_path'], ENT_QUOTES, 'UTF-8'); ?>" class="marketplace-listing-open">
        <?php if (!empty($listing['images'])): ?>
            <div class="marketplace-listing-carousel">
                <div class="marketplace-listing-carousel-viewport">
                    <div class="marketplace-listing-carousel-track is-no-transition">
                        <div class="marketplace-listing-carousel-slide">
                            <img
                                src="<?= htmlspecialchars((string) $listing['images'][0]['path'], ENT_QUOTES, 'UTF-8'); ?>"
                                alt="<?= htmlspecialchars($listing['title'], ENT_QUOTES, 'UTF-8'); ?>"
                                class="marketplace-listing-image"
                            >
                        </div>
                    </div>
                </div>
            </div>
        <?php endif; ?>

        <div class="marketplace-listing-body">
            <div class="marketplace-listing-top">
                <div class="marketplace-listing-price"><?= htmlspecialchars($listing['formatted_price'], ENT_QUOTES, 'UTF-8'); ?></div>
                <div class="community-profile-activity-badge<?= !empty($listing['is_active']) ? '' : ' is-ended'; ?>">
                    <?= !empty($listing['is_active']) ? 'Ogłoszenie' : 'Zakończone'; ?>
                </div>
            </div>

            <h2 class="marketplace-listing-title"><?= htmlspecialchars($listing['title'], ENT_QUOTES, 'UTF-8'); ?></h2>

            <div class="marketplace-listing-meta-row">
                <div class="marketplace-listing-meta">
                    <span><?= htmlspecialchars((string) $listing['production_year'], ENT_QUOTES, 'UTF-8'); ?></span>
                    <span>•</span>
                    <span><?= htmlspecialchars($listing['formatted_mileage'], ENT_QUOTES, 'UTF-8'); ?></span>
                    <span>•</span>
                    <span><?= htmlspecialchars($listing['formatted_fuel_type'], ENT_QUOTES, 'UTF-8'); ?></span>
                </div>

                <div class="marketplace-listing-bottom">
                    <span class="marketplace-listing-category"><?= htmlspecialchars($listing['category_label'], ENT_QUOTES, 'UTF-8'); ?></span>
                </div>
            </div>

            <div class="community-profile-listing-foot">
                <span class="community-profile-listing-date"><?= htmlspecialchars($listing['formatted_created_at'], ENT_QUOTES, 'UTF-8'); ?></span>
                <span class="community-profile-listing-link">Przejdź do ogłoszenia</span>
            </div>
        </div>
    </a>
</article>
