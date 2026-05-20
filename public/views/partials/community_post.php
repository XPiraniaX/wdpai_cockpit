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
                    <span class="community-dot">•</span>
                    <span><?= htmlspecialchars($post['author_tier'], ENT_QUOTES, 'UTF-8'); ?></span>
                </div>
            </div>
        </div>
        <span class="community-post-category"><?= htmlspecialchars($post['category_label'], ENT_QUOTES, 'UTF-8'); ?></span>
    </div>

    <p class="community-post-content"><?= nl2br(htmlspecialchars($post['content'], ENT_QUOTES, 'UTF-8')); ?></p>

    <div class="community-post-stats">
        <span><?= (int) $post['like_count']; ?> polubień</span>
        <span><?= (int) $post['comment_count']; ?> komentarzy</span>
        <span><?= (int) $post['save_count']; ?> zapisów</span>
    </div>

    <div class="community-post-actions">
        <form method="post" class="community-inline-form">
            <input type="hidden" name="action" value="toggle_like">
            <input type="hidden" name="post_id" value="<?= (int) $post['id']; ?>">
            <input type="hidden" name="redirect_to" value="<?= htmlspecialchars($_SERVER['REQUEST_URI'] ?? '/community', ENT_QUOTES, 'UTF-8'); ?>">
            <button type="submit" class="community-post-action<?= $post['liked_by_current_user'] ? ' is-active' : ''; ?>">
                Lubię to
            </button>
        </form>

        <a href="#comment-form-<?= (int) $post['id']; ?>" class="community-post-action">Komentuj</a>

        <form method="post" class="community-inline-form">
            <input type="hidden" name="action" value="toggle_save">
            <input type="hidden" name="post_id" value="<?= (int) $post['id']; ?>">
            <input type="hidden" name="redirect_to" value="<?= htmlspecialchars($_SERVER['REQUEST_URI'] ?? '/community', ENT_QUOTES, 'UTF-8'); ?>">
            <button type="submit" class="community-post-action<?= $post['saved_by_current_user'] ? ' is-active' : ''; ?>">
                Zapisz
            </button>
        </form>
    </div>

    <?php if ($post['comments'] !== []): ?>
        <div class="community-comments">
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

    <form method="post" class="community-comment-form" id="comment-form-<?= (int) $post['id']; ?>">
        <input type="hidden" name="action" value="add_comment">
        <input type="hidden" name="post_id" value="<?= (int) $post['id']; ?>">
        <input type="hidden" name="redirect_to" value="<?= htmlspecialchars($_SERVER['REQUEST_URI'] ?? '/community', ENT_QUOTES, 'UTF-8'); ?>">
        <textarea name="comment_content"
                  rows="2"
                  class="community-textarea community-textarea-small"
                  placeholder="Dodaj komentarz..."
                  required></textarea>
        <button type="submit" class="community-button community-button-primary">Dodaj komentarz</button>
    </form>
</article>
