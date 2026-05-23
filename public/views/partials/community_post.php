<article class="community-post card" id="post-<?= (int) $post['id']; ?>">
    <div class="community-post-top">
        <div class="community-post-author">
            <a href="<?= htmlspecialchars($post['profile_path'], ENT_QUOTES, 'UTF-8'); ?>" class="community-avatar" aria-label="Profil użytkownika">
                <span class="community-avatar-ring"></span>
            </a>
            <div class="community-post-author-meta">
                <a href="<?= htmlspecialchars($post['profile_path'], ENT_QUOTES, 'UTF-8'); ?>" class="community-post-author-name">
                    <?= htmlspecialchars($post['author_name'], ENT_QUOTES, 'UTF-8'); ?>
                </a>
                <div class="community-post-author-subline">
                    <span><?= htmlspecialchars($post['formatted_created_at'], ENT_QUOTES, 'UTF-8'); ?></span>
                </div>
            </div>
        </div>
        <span class="community-post-category"><?= htmlspecialchars($post['category_label'], ENT_QUOTES, 'UTF-8'); ?></span>
    </div>

    <p class="community-post-content"><?= nl2br(htmlspecialchars($post['content'], ENT_QUOTES, 'UTF-8')); ?></p>

    <?php if (!empty($post['images'])): ?>
        <div class="community-post-carousel<?= count($post['images']) > 1 ? ' has-controls' : ''; ?>" data-community-carousel>
            <?php if (count($post['images']) > 1): ?>
                <button type="button" class="community-post-carousel-control is-prev" aria-label="Poprzednie zdjęcie" data-community-carousel-prev></button>
            <?php endif; ?>

            <div class="community-post-carousel-viewport">
                <div class="community-post-carousel-track" data-community-carousel-track>
                    <?php foreach ($post['images'] as $image): ?>
                        <div class="community-post-carousel-slide">
                            <img
                                src="<?= htmlspecialchars($image['path'], ENT_QUOTES, 'UTF-8'); ?>"
                                alt="Zdjęcie w poście"
                                class="community-post-image"
                            >
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>

            <?php if (count($post['images']) > 1): ?>
                <button type="button" class="community-post-carousel-control is-next" aria-label="Następne zdjęcie" data-community-carousel-next></button>
            <?php endif; ?>
        </div>
    <?php endif; ?>

    <div class="community-post-actions">
        <form method="post" class="community-inline-form">
            <input type="hidden" name="action" value="toggle_like">
            <input type="hidden" name="post_id" value="<?= (int) $post['id']; ?>">
            <input type="hidden" name="redirect_to" value="<?= htmlspecialchars($_SERVER['REQUEST_URI'] ?? '/community', ENT_QUOTES, 'UTF-8'); ?>">
            <button
                type="submit"
                class="community-post-action-icon community-post-action-like<?= $post['liked_by_current_user'] ? ' is-active' : ''; ?>"
                aria-label="Polub post"
                title="Polub post"
            >
                <span class="community-post-action-like-icon"><?= $post['liked_by_current_user'] ? '&#9829;' : '&#9825;'; ?></span>
                <span class="community-post-action-count"><?= (int) $post['like_count']; ?></span>
            </button>
        </form>

        <a
            href="#comments-<?= (int) $post['id']; ?>"
            class="community-post-action-icon community-post-action-media"
            aria-label="Przejdź do komentarzy"
            title="Komentarze"
        >
            <img src="/public/assets/icons/comment_icon.svg" alt="" class="community-post-action-media-icon">
            <span class="community-post-action-count"><?= (int) $post['comment_count']; ?></span>
        </a>

        <form method="post" class="community-inline-form">
            <input type="hidden" name="action" value="toggle_save">
            <input type="hidden" name="post_id" value="<?= (int) $post['id']; ?>">
            <input type="hidden" name="redirect_to" value="<?= htmlspecialchars($_SERVER['REQUEST_URI'] ?? '/community', ENT_QUOTES, 'UTF-8'); ?>">
            <button
                type="submit"
                class="community-post-action-icon community-post-action-media<?= $post['saved_by_current_user'] ? ' is-active' : ''; ?>"
                aria-label="Zapisz post"
                title="Zapisz post"
            >
                <img src="/public/assets/icons/save_icon.svg" alt="" class="community-post-action-media-icon">
                <span class="community-post-action-count"><?= (int) $post['save_count']; ?></span>
            </button>
        </form>
    </div>

    <?php if ($post['comments'] !== []): ?>
        <div class="community-comments" id="comments-<?= (int) $post['id']; ?>">
            <?php foreach ($post['comments'] as $comment): ?>
                <article class="community-comment">
                    <div class="community-comment-meta">
                        <a href="<?= htmlspecialchars($comment['profile_path'], ENT_QUOTES, 'UTF-8'); ?>" class="community-comment-author">
                            <?= htmlspecialchars($comment['author_name'], ENT_QUOTES, 'UTF-8'); ?>
                        </a>
                        <span><?= htmlspecialchars($comment['formatted_created_at'], ENT_QUOTES, 'UTF-8'); ?></span>
                    </div>
                    <p class="community-comment-content"><?= nl2br(htmlspecialchars($comment['content'], ENT_QUOTES, 'UTF-8')); ?></p>
                </article>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>
</article>
