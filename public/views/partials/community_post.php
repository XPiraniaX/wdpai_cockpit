<?php
$isOwnPost = ((int) ($currentUser['id'] ?? 0)) === (int) $post['user_id'];
$isAdminProfileModeration = !empty($isAdminProfileView) && !$isOwnPost;
$commentsModalId = 'community-comments-modal-' . (int) $post['id'];
$editPostPayload = htmlspecialchars(json_encode([
    'id' => (int) $post['id'],
    'content' => (string) $post['content'],
    'brand_id' => $post['brand_id'] !== null ? (int) $post['brand_id'] : null,
    'model_id' => $post['model_id'] !== null ? (int) $post['model_id'] : null,
    'images' => array_map(static fn (array $image): array => [
        'id' => (int) ($image['id'] ?? 0),
        'path' => (string) ($image['path'] ?? ''),
    ], $post['images'] ?? []),
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), ENT_QUOTES, 'UTF-8');
$authorAvatarPath = trim((string) ($post['author_avatar_path'] ?? ''));
$postImages = array_values(array_filter(
    $post['images'] ?? [],
    static fn (array $image): bool => trim((string) ($image['path'] ?? '')) !== ''
));
?>
<article class="community-post card" id="post-<?= (int) $post['id']; ?>">
    <div class="community-post-top">
        <div class="community-post-author">
            <a href="<?= htmlspecialchars($post['profile_path'], ENT_QUOTES, 'UTF-8'); ?>" class="community-avatar<?= $authorAvatarPath !== '' ? ' has-image' : ''; ?>" aria-label="Profil użytkownika">
                <?php if ($authorAvatarPath !== ''): ?>
                    <img src="<?= htmlspecialchars($authorAvatarPath, ENT_QUOTES, 'UTF-8'); ?>" alt="<?= htmlspecialchars($post['author_name'], ENT_QUOTES, 'UTF-8'); ?>" class="community-avatar-image">
                <?php endif; ?>
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

        <div class="community-post-top-actions">
            <span class="community-post-category"><?= htmlspecialchars($post['category_label'], ENT_QUOTES, 'UTF-8'); ?></span>

            <div class="community-post-menu" data-community-post-menu>
                <button
                    type="button"
                    class="community-post-menu-trigger"
                    aria-label="Opcje posta"
                    aria-expanded="false"
                    data-community-post-menu-trigger
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>

                <div class="community-post-menu-dropdown" hidden data-community-post-menu-dropdown>
                    <?php if ($isOwnPost): ?>
                        <button
                            type="button"
                            class="community-post-menu-action is-primary"
                            data-community-edit-post-button
                            data-community-edit-post-payload="<?= $editPostPayload; ?>"
                        >
                            Edytuj post
                        </button>
                    <?php endif; ?>
                    <form
                        method="post"
                        class="community-inline-form<?= ($isOwnPost || $isAdminProfileModeration) ? '' : ' community-report-form'; ?>"
                        <?= ($isOwnPost || $isAdminProfileModeration) ? 'data-community-delete-post-form' : 'data-community-report-form' ?>
                    >
                        <input type="hidden" name="post_id" value="<?= (int) $post['id']; ?>">
                        <input type="hidden" name="redirect_to" value="<?= htmlspecialchars($_SERVER['REQUEST_URI'] ?? '/community', ENT_QUOTES, 'UTF-8'); ?>">
                        <input type="hidden" name="action" value="<?= ($isOwnPost || $isAdminProfileModeration) ? 'delete_post' : 'report_post'; ?>">
                        <button type="submit" class="community-post-menu-action is-danger">
                            <?= ($isOwnPost || $isAdminProfileModeration) ? 'Usuń post' : 'Zgłoś post'; ?>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <p class="community-post-content"><?= nl2br(htmlspecialchars($post['content'], ENT_QUOTES, 'UTF-8')); ?></p>

    <?php if ($postImages !== []): ?>
        <div class="community-post-carousel<?= count($postImages) > 1 ? ' has-controls' : ''; ?>" data-community-carousel>
            <?php if (count($postImages) > 1): ?>
                <button type="button" class="community-post-carousel-control is-prev" aria-label="Poprzednie zdjÄ™cie" data-community-carousel-prev></button>
            <?php endif; ?>

            <div class="community-post-carousel-viewport">
                <div class="community-post-carousel-track" data-community-carousel-track>
                    <?php foreach ($postImages as $image): ?>
                        <div class="community-post-carousel-slide">
                            <img
                                src="<?= htmlspecialchars($image['path'], ENT_QUOTES, 'UTF-8'); ?>"
                                alt="ZdjÄ™cie w poĹ›cie"
                                class="community-post-image"
                            >
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>

            <?php if (count($postImages) > 1): ?>
                <button type="button" class="community-post-carousel-control is-next" aria-label="NastÄ™pne zdjÄ™cie" data-community-carousel-next></button>
            <?php endif; ?>
        </div>
    <?php endif; ?>

    <div class="community-post-actions">
        <form method="post" class="community-inline-form" data-community-like-form>
            <input type="hidden" name="action" value="toggle_like">
            <input type="hidden" name="post_id" value="<?= (int) $post['id']; ?>">
            <input type="hidden" name="redirect_to" value="<?= htmlspecialchars($_SERVER['REQUEST_URI'] ?? '/community', ENT_QUOTES, 'UTF-8'); ?>">
            <button
                type="submit"
                class="community-post-action-icon community-post-action-like<?= $post['liked_by_current_user'] ? ' is-active' : ''; ?>"
                data-community-like-button
                aria-label="Polub post"
            >
                <span class="community-post-action-like-icon" aria-hidden="true" data-community-like-icon>
                    <?php if ($post['liked_by_current_user']): ?>
                        <svg viewBox="0 0 24 24" class="community-post-action-like-svg is-filled">
                            <path d="M12 21.35 10.55 20.03C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54Z"/>
                        </svg>
                    <?php else: ?>
                        <svg viewBox="0 0 24 24" class="community-post-action-like-svg is-outline">
                            <path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09A5.964 5.964 0 0 0 7.5 3C4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.31C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3Zm-4.4 15.55-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5 18.5 5 20 6.5 20 8.5c0 2.89-3.14 5.74-7.9 10.05Z"/>
                        </svg>
                    <?php endif; ?>
                </span>
                <span class="community-post-action-tooltip">Polub post</span>
                <span class="community-post-action-count" data-community-like-count><?= (int) $post['like_count']; ?></span>
            </button>
        </form>

        <button
            type="button"
            class="community-post-action-icon community-post-action-media<?= $post['commented_by_current_user'] ? ' is-active' : ''; ?>"
            aria-label="OtwĂłrz komentarze"
            data-open-comments-modal
            data-comments-modal-id="<?= htmlspecialchars($commentsModalId, ENT_QUOTES, 'UTF-8'); ?>"
            data-community-comment-button
        >
            <img
                src="<?= $post['commented_by_current_user'] ? '/public/assets/icons/comment_icon_full.svg' : '/public/assets/icons/comment_icon.svg'; ?>"
                alt=""
                class="community-post-action-media-icon"
                data-community-comment-icon
            >
            <span class="community-post-action-tooltip">Komentarze</span>
            <span class="community-post-action-count" data-community-comment-count><?= (int) $post['comment_count']; ?></span>
        </button>

        <form method="post" class="community-inline-form" data-community-save-form>
            <input type="hidden" name="action" value="toggle_save">
            <input type="hidden" name="post_id" value="<?= (int) $post['id']; ?>">
            <input type="hidden" name="redirect_to" value="<?= htmlspecialchars($_SERVER['REQUEST_URI'] ?? '/community', ENT_QUOTES, 'UTF-8'); ?>">
            <button
                type="submit"
                class="community-post-action-icon community-post-action-media<?= $post['saved_by_current_user'] ? ' is-active' : ''; ?>"
                data-community-save-button
                aria-label="Zapisz post"
            >
                <img
                    src="<?= $post['saved_by_current_user'] ? '/public/assets/icons/save_icon_full.svg' : '/public/assets/icons/save_icon.svg'; ?>"
                    alt=""
                    class="community-post-action-media-icon"
                    data-community-save-icon
                >
                <span class="community-post-action-tooltip">Zapisz post</span>
                <span class="community-post-action-count" data-community-save-count><?= (int) $post['save_count']; ?></span>
            </button>
        </form>
    </div>
</article>

<section class="community-comments-modal" id="<?= htmlspecialchars($commentsModalId, ENT_QUOTES, 'UTF-8'); ?>" hidden data-community-comments-modal>
    <div class="community-comments-modal-backdrop" data-close-comments-modal></div>

    <div class="community-comments-modal-panel">
        <header class="community-modal-header community-comments-modal-header">
            <h2 class="community-modal-title">Komentarze</h2>
            <button type="button" class="community-modal-close" aria-label="Zamknij" data-close-comments-modal>
                <img src="/public/assets/icons/close.svg" alt="">
            </button>
        </header>

        <div class="community-comments-modal-body">
            <article class="community-comments-preview card">
                <div class="community-post-top">
                    <div class="community-post-author">
                        <a href="<?= htmlspecialchars($post['profile_path'], ENT_QUOTES, 'UTF-8'); ?>" class="community-avatar<?= $authorAvatarPath !== '' ? ' has-image' : ''; ?>" aria-label="Profil użytkownika">
                            <?php if ($authorAvatarPath !== ''): ?>
                                <img src="<?= htmlspecialchars($authorAvatarPath, ENT_QUOTES, 'UTF-8'); ?>" alt="<?= htmlspecialchars($post['author_name'], ENT_QUOTES, 'UTF-8'); ?>" class="community-avatar-image">
                            <?php endif; ?>
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

                <?php if ($postImages !== []): ?>
                    <div class="community-post-carousel<?= count($postImages) > 1 ? ' has-controls' : ''; ?>" data-community-carousel>
                        <?php if (count($postImages) > 1): ?>
                            <button type="button" class="community-post-carousel-control is-prev" aria-label="Poprzednie zdjÄ™cie" data-community-carousel-prev></button>
                        <?php endif; ?>

                        <div class="community-post-carousel-viewport">
                            <div class="community-post-carousel-track" data-community-carousel-track>
                                <?php foreach ($postImages as $image): ?>
                                    <div class="community-post-carousel-slide">
                                        <img
                                            src="<?= htmlspecialchars($image['path'], ENT_QUOTES, 'UTF-8'); ?>"
                                            alt="ZdjÄ™cie w poĹ›cie"
                                            class="community-post-image"
                                        >
                                    </div>
                                <?php endforeach; ?>
                            </div>
                        </div>

                        <?php if (count($postImages) > 1): ?>
                            <button type="button" class="community-post-carousel-control is-next" aria-label="NastÄ™pne zdjÄ™cie" data-community-carousel-next></button>
                        <?php endif; ?>
                    </div>
                <?php endif; ?>
            </article>

            <div class="community-comments-modal-thread" data-community-comments-list>
                <?php if ($post['comments'] === []): ?>
                    <p class="community-comments-empty" data-community-comments-empty>Brak komentarzy. Bądź pierwszy.</p>
                <?php else: ?>
                <?php foreach ($post['comments'] as $comment): ?>
                    <?php $isOwnComment = ((int) ($currentUser['id'] ?? 0)) === (int) $comment['user_id']; ?>
                    <article class="community-comment" data-community-comment-id="<?= (int) $comment['id']; ?>" data-community-post-id="<?= (int) $post['id']; ?>">
                        <div class="community-comment-meta">
                            <div class="community-comment-meta-main">
                                <a href="<?= htmlspecialchars($comment['profile_path'], ENT_QUOTES, 'UTF-8'); ?>" class="community-comment-author">
                                    <?= htmlspecialchars($comment['author_name'], ENT_QUOTES, 'UTF-8'); ?>
                                </a>
                                <span><?= htmlspecialchars($comment['formatted_created_at'], ENT_QUOTES, 'UTF-8'); ?></span>
                            </div>

                            <div class="community-post-menu community-comment-menu" data-community-post-menu>
                                    <button
                                        type="button"
                                        class="community-post-menu-trigger"
                                        aria-label="Opcje komentarza"
                                        aria-expanded="false"
                                        data-community-post-menu-trigger
                                    >
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </button>

                                    <div class="community-post-menu-dropdown" hidden data-community-post-menu-dropdown>
                                        <?php if ($isOwnComment): ?>
                                            <button type="button" class="community-post-menu-action is-primary" data-community-edit-comment-open>
                                                Edytuj komentarz
                                            </button>
                                            <form method="post" class="community-inline-form community-comment-delete-form" data-community-comment-delete-form>
                                                <input type="hidden" name="comment_id" value="<?= (int) $comment['id']; ?>">
                                                <input type="hidden" name="post_id" value="<?= (int) $post['id']; ?>">
                                                <input type="hidden" name="redirect_to" value="<?= htmlspecialchars($_SERVER['REQUEST_URI'] ?? '/community', ENT_QUOTES, 'UTF-8'); ?>">
                                                <input type="hidden" name="action" value="delete_comment">
                                                <button type="submit" class="community-post-menu-action is-danger">
                                                    Usuń komentarz
                                                </button>
                                            </form>
                                        <?php else: ?>
                                        <form method="post" class="community-inline-form community-report-form" data-community-report-form>
                                            <input type="hidden" name="comment_id" value="<?= (int) $comment['id']; ?>">
                                            <input type="hidden" name="post_id" value="<?= (int) $post['id']; ?>">
                                            <input type="hidden" name="redirect_to" value="<?= htmlspecialchars($_SERVER['REQUEST_URI'] ?? '/community', ENT_QUOTES, 'UTF-8'); ?>">
                                            <input type="hidden" name="action" value="report_comment">
                                            <button type="submit" class="community-post-menu-action is-danger">
                                                Zgłoś komentarz
                                            </button>
                                        </form>
                                        <?php endif; ?>
                                    </div>
                                </div>
                        </div>
                        <p class="community-comment-content" data-community-comment-content><?= nl2br(htmlspecialchars($comment['content'], ENT_QUOTES, 'UTF-8')); ?></p>
                        <?php if ($isOwnComment): ?>
                            <form method="post" class="community-comment-edit-form" hidden data-community-comment-edit-form>
                                <input type="hidden" name="action" value="update_comment">
                                <input type="hidden" name="comment_id" value="<?= (int) $comment['id']; ?>">
                                <input type="hidden" name="post_id" value="<?= (int) $post['id']; ?>">
                                <input type="hidden" name="redirect_to" value="<?= htmlspecialchars($_SERVER['REQUEST_URI'] ?? '/community', ENT_QUOTES, 'UTF-8'); ?>">
                                <textarea name="comment_content" rows="4" class="community-textarea-small" required><?= htmlspecialchars($comment['content'], ENT_QUOTES, 'UTF-8'); ?></textarea>
                                <div class="community-comment-edit-actions">
                                    <button type="button" class="community-button community-button-muted" data-community-edit-comment-cancel>
                                        Anuluj
                                    </button>
                                    <button type="submit" class="community-button community-button-primary">
                                        Zapisz
                                    </button>
                                </div>
                            </form>
                        <?php endif; ?>
                    </article>
                <?php endforeach; ?>
                <?php endif; ?>
            </div>

            <form method="post" class="community-comments-form" data-community-comment-form>
                <input type="hidden" name="action" value="add_comment">
                <input type="hidden" name="post_id" value="<?= (int) $post['id']; ?>">
                <input type="hidden" name="redirect_to" value="<?= htmlspecialchars($_SERVER['REQUEST_URI'] ?? '/community', ENT_QUOTES, 'UTF-8'); ?>">

                <textarea
                    name="comment_content"
                    rows="4"
                    class="community-textarea-small"
                    placeholder="Dodaj komentarz..."
                    required
                ></textarea>

                <button type="submit" class="community-button community-button-primary community-comments-submit">
                    Dodaj komentarz
                </button>
            </form>
        </div>
    </div>
</section>

