<?php
$communityModalRedirectTo = $communityModalRedirectTo ?? ($_SERVER['REQUEST_URI'] ?? '/community');
$communityComposerUserName = $composerUserName
    ?? ($currentUser['display_name'] ?? ($currentUser['full_name'] ?? 'Użytkownik'));
?>
<div class="community-modal-backdrop" hidden data-community-modal-backdrop></div>
<section class="community-modal" hidden data-community-modal>
    <form method="post" enctype="multipart/form-data" class="community-modal-panel" data-community-create-form>
        <input type="hidden" name="action" value="create_post" data-community-modal-action>
        <input type="hidden" name="post_id" value="" data-community-modal-post-id>
        <input type="hidden" name="removed_image_ids" value="" data-community-removed-image-ids>
        <input type="hidden" name="redirect_to" value="<?= htmlspecialchars((string) $communityModalRedirectTo, ENT_QUOTES, 'UTF-8'); ?>">

        <header class="community-modal-header">
            <h2 class="community-modal-title">Utwórz post</h2>
            <button type="button" class="community-modal-close" aria-label="Zamknij" data-close-community-modal>
                <img src="/public/assets/icons/close.svg" alt="">
            </button>
        </header>

        <div class="community-modal-author">
            <div class="community-avatar" aria-hidden="true">
                <span class="community-avatar-ring"></span>
            </div>
            <div class="community-modal-author-meta">
                <span class="community-modal-author-name"><?= htmlspecialchars((string) $communityComposerUserName, ENT_QUOTES, 'UTF-8'); ?></span>
            </div>
        </div>

        <textarea name="content"
                  rows="8"
                  class="community-modal-textarea"
                  placeholder="O czym chcesz dziś napisać?"
                  required></textarea>

        <div class="community-modal-media-block">
            <div class="community-post-images-edit-gallery" data-community-images-gallery></div>
        </div>
        <input type="file" name="post_images[]" accept="image/*" multiple class="community-post-images-input" data-community-images-input>

        <div class="community-modal-photo-row">
            <button type="button" class="community-modal-photo-button" data-community-images-trigger>
                <img src="/public/assets/icons/photo_icon.svg" alt="" class="community-button-photo-icon">
                Dodaj zdjęcie
            </button>
        </div>

        <div class="community-modal-category-wrap">
            <details class="community-modal-category">
                <summary class="community-modal-category-summary">Kategoria</summary>
                <div class="community-modal-category-body">
                    <label class="community-field">
                        <span class="community-field-label">Marka</span>
                        <select name="brand_id" class="community-select community-brand-select" data-target-model="composer-model-modal">
                            <option value="">Bez kategorii</option>
                            <?php foreach ($brands as $brand): ?>
                                <option value="<?= (int) $brand['id']; ?>"><?= htmlspecialchars($brand['name'], ENT_QUOTES, 'UTF-8'); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </label>

                    <label class="community-field">
                        <span class="community-field-label">Model</span>
                        <select name="model_id" class="community-select community-model-select" id="composer-model-modal">
                            <option value="">Bez modelu</option>
                            <?php foreach ($brands as $brand): ?>
                                <?php foreach ($brand['models'] as $model): ?>
                                    <option value="<?= (int) $model['id']; ?>" data-brand-id="<?= (int) $brand['id']; ?>">
                                        <?= htmlspecialchars($model['name'], ENT_QUOTES, 'UTF-8'); ?>
                                    </option>
                                <?php endforeach; ?>
                            <?php endforeach; ?>
                        </select>
                    </label>
                </div>
            </details>
        </div>

        <button type="submit" class="community-button community-button-primary community-modal-submit">Opublikuj</button>
    </form>
</section>
