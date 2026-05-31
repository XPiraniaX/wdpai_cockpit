<?php

class CommunityController extends AppController
{
    public function index(): void
    {
        $this->requireAuthentication();

        $repository = new CommunityRepository(Database::getConnection());
        $userId = $this->getCurrentUserId();

        if ($this->isPost()) {
            $this->handlePostAction($repository, $userId);
            return;
        }

        $filters = $this->resolveFilters();
        $feedPage = $repository->getFeedPage(
            $userId,
            $filters,
            CommunityRepository::DEFAULT_FEED_PAGE_SIZE,
            $this->resolveCursorCreatedAt(),
            $this->resolveCursorId()
        );
        $mappedPosts = $this->mapPosts($feedPage['posts']);

        if ($this->isAjaxRequest() && $this->isFeedPageRequest()) {
            $this->jsonResponse([
                'success' => true,
                'html' => $this->renderCommunityPostsHtml($mappedPosts),
                'has_more' => $feedPage['has_more'],
                'next_cursor_created_at' => $feedPage['next_cursor_created_at'],
                'next_cursor_id' => $feedPage['next_cursor_id'],
            ]);
        }

        $this->render('community', [
            'title' => 'Społeczność',
            'scope' => $filters['scope'],
            'brandId' => $filters['brand_id'],
            'modelId' => $filters['model_id'],
            'brands' => $repository->getAvailableCategories(),
            'posts' => $mappedPosts,
            'hasMorePosts' => $feedPage['has_more'],
            'nextCursorCreatedAt' => $feedPage['next_cursor_created_at'],
            'nextCursorId' => $feedPage['next_cursor_id'],
            'scriptFiles' => ['community.js'],
        ]);
    }

    public function profile(): void
    {
        $this->requireAuthentication();

        $repository = new CommunityRepository(Database::getConnection());
        $currentUserId = $this->getCurrentUserId();
        $requestedPseudonym = trim((string) ($_GET['pseudonym'] ?? ''));
        $requestedId = isset($_GET['id']) ? (int) $_GET['id'] : null;
        $profileUserId = $requestedId ?? $currentUserId;

        if ($requestedPseudonym === '' && $profileUserId <= 0) {
            $this->redirect('/profile');
        }

        if ($this->isPost()) {
            $this->handlePostAction($repository, $currentUserId);
            return;
        }

        if ($requestedPseudonym !== '') {
            $profile = $repository->getProfileByPseudonym($requestedPseudonym);

            if ($profile !== null && (int) $profile['id'] === $currentUserId) {
                $this->redirect('/profile');
            }
        } else {
            if ($requestedId !== null && $profileUserId === $currentUserId) {
                $this->redirect('/profile');
            }

            $profile = $repository->getProfile($profileUserId);
            if ($profile !== null && $requestedId !== null && trim((string) ($profile['pseudonym'] ?? '')) !== '') {
                $this->redirect('/profile/' . rawurlencode((string) $profile['pseudonym']));
            }
        }

        if ($profile === null) {
            http_response_code(404);
            $this->render('404', [
                'title' => '404 - Profil nie istnieje',
            ]);
            return;
        }

        $profileUserId = (int) $profile['id'];

        $posts = $repository->getFeed($currentUserId, [
            'scope' => 'all',
            'brand_id' => null,
            'model_id' => null,
        ]);
        $posts = array_values(array_filter($posts, static fn (array $post): bool => $post['user_id'] === $profileUserId));

        $this->render('community_profile', [
            'title' => $profile['display_name'],
            'profile' => $profile,
            'posts' => $this->mapPosts($posts),
            'scriptFiles' => ['community.js'],
        ]);
    }

    private function handlePostAction(CommunityRepository $repository, int $userId): void
    {
        $action = (string) ($_POST['action'] ?? '');
        $redirectTo = $this->sanitizeRedirectPath((string) ($_POST['redirect_to'] ?? '/community'));

        switch ($action) {
            case 'create_post':
                $content = trim((string) ($_POST['content'] ?? ''));

                if ($content === '') {
                    $this->setFlash('error', 'Treść posta nie może być pusta.');
                    $this->redirect($redirectTo);
                }

                $brandId = $this->normalizeNullableInt($_POST['brand_id'] ?? null);
                $modelId = $this->normalizeNullableInt($_POST['model_id'] ?? null);

                if ($modelId !== null && $brandId === null) {
                    $this->setFlash('error', 'Model można wybrać dopiero po wskazaniu marki.');
                    $this->redirect($redirectTo);
                }

                if ($modelId !== null && $brandId !== null && !$repository->modelBelongsToBrand($modelId, $brandId)) {
                    $this->setFlash('error', 'Wybrany model nie pasuje do wskazanej marki.');
                    $this->redirect($redirectTo);
                }

                $imagePaths = $this->handlePostImageUploads($userId);

                try {
                    $repository->createPost($userId, [
                        'brand_id' => $brandId,
                        'model_id' => $modelId,
                        'content' => $content,
                        'image_paths' => $imagePaths,
                    ]);
                } catch (Throwable $exception) {
                    $this->deleteUploadedFiles($imagePaths);
                    throw $exception;
                }

                $this->setFlash('success', 'Post został opublikowany.');
                $this->redirect($redirectTo);
                return;

            case 'update_post':
                $postId = (int) ($_POST['post_id'] ?? 0);
                $content = trim((string) ($_POST['content'] ?? ''));

                if ($postId <= 0 || $content === '') {
                    $this->setFlash('error', 'Treść posta nie może być pusta.');
                    $this->redirect($redirectTo);
                    return;
                }

                $brandId = $this->normalizeNullableInt($_POST['brand_id'] ?? null);
                $modelId = $this->normalizeNullableInt($_POST['model_id'] ?? null);

                if ($modelId !== null && $brandId === null) {
                    $this->setFlash('error', 'Najpierw wybierz markę.');
                    $this->redirect($redirectTo);
                    return;
                }

                if ($brandId !== null && $modelId !== null && !$repository->modelBelongsToBrand($modelId, $brandId)) {
                    $this->setFlash('error', 'Wybrany model nie pasuje do marki.');
                    $this->redirect($redirectTo);
                    return;
                }

                $removedImageIds = $this->normalizeIntegerList($_POST['removed_image_ids'] ?? '');
                $imagePaths = $this->handlePostImageUploads($userId);

                try {
                    $result = $repository->updatePostByOwner($userId, $postId, [
                        'brand_id' => $brandId,
                        'model_id' => $modelId,
                        'content' => $content,
                        'image_paths' => $imagePaths,
                        'removed_image_ids' => $removedImageIds,
                    ]);
                } catch (Throwable $exception) {
                    $this->deleteUploadedFiles($imagePaths);
                    throw $exception;
                }

                if ($result === null) {
                    $this->deleteUploadedFiles($imagePaths);
                    $this->setFlash('error', 'Nie udało się zaktualizować posta.');
                    $this->redirect($redirectTo);
                    return;
                }

                if (!empty($result['removed_image_paths'])) {
                    $this->deleteUploadedFiles($result['removed_image_paths']);
                }
                if (count($imagePaths) > count($result['kept_new_image_paths'] ?? [])) {
                    $discarded = array_slice($imagePaths, count($result['kept_new_image_paths'] ?? []));
                    if ($discarded !== []) {
                        $this->deleteUploadedFiles($discarded);
                    }
                }

                $this->setFlash('success', 'Post został zaktualizowany.');
                $this->redirect($redirectTo);
                return;

            case 'toggle_like':
                $postId = (int) ($_POST['post_id'] ?? 0);
                if ($postId > 0) {
                    $repository->toggleLike($userId, $postId);

                    if ($this->isAjaxRequest()) {
                        $state = $repository->getLikeState($userId, $postId);
                        $this->jsonResponse([
                            'success' => true,
                            'post_id' => $postId,
                            'liked_by_current_user' => $state['liked_by_current_user'],
                            'like_count' => $state['like_count'],
                        ]);
                    }
                }
                $this->redirect($redirectTo);
                return;

            case 'toggle_save':
                $postId = (int) ($_POST['post_id'] ?? 0);
                if ($postId > 0) {
                    $repository->toggleSave($userId, $postId);

                    if ($this->isAjaxRequest()) {
                        $state = $repository->getSaveState($userId, $postId);
                        $this->jsonResponse([
                            'success' => true,
                            'post_id' => $postId,
                            'saved_by_current_user' => $state['saved_by_current_user'],
                            'save_count' => $state['save_count'],
                        ]);
                    }
                }
                $this->redirect($redirectTo);
                return;

            case 'add_comment':
                $postId = (int) ($_POST['post_id'] ?? 0);
                $content = trim((string) ($_POST['comment_content'] ?? ''));

                if ($postId > 0 && $content !== '') {
                    $comment = $repository->addComment($userId, $postId, $content);

                    if ($this->isAjaxRequest()) {
                        $state = $repository->getCommentState($userId, $postId);
                        $comment['formatted_created_at'] = $this->formatDateTime($comment['created_at']);
                        $this->jsonResponse([
                            'success' => true,
                            'post_id' => $postId,
                            'commented_by_current_user' => $state['commented_by_current_user'],
                            'comment_count' => $state['comment_count'],
                            'comment' => $comment,
                        ]);
                    }
                }

                $this->redirect($redirectTo . '#post-' . $postId);
                return;

            case 'update_comment':
                $commentId = (int) ($_POST['comment_id'] ?? 0);
                $content = trim((string) ($_POST['comment_content'] ?? ''));

                if ($commentId > 0 && $content !== '') {
                    $comment = $repository->updateCommentByOwner($userId, $commentId, $content);

                    if ($comment !== null && $this->isAjaxRequest()) {
                        $comment['formatted_created_at'] = $this->formatDateTime($comment['created_at']);
                        $state = $repository->getCommentState($userId, (int) $comment['post_id']);
                        $this->jsonResponse([
                            'success' => true,
                            'post_id' => (int) $comment['post_id'],
                            'comment_id' => $commentId,
                            'commented_by_current_user' => $state['commented_by_current_user'],
                            'comment_count' => $state['comment_count'],
                            'comment' => $comment,
                            'message' => 'Komentarz został zaktualizowany.',
                        ]);
                    }
                }

                $this->redirect($redirectTo);
                return;

            case 'delete_comment':
                $commentId = (int) ($_POST['comment_id'] ?? 0);

                if ($commentId > 0) {
                    $postId = $repository->deleteCommentByOwner($userId, $commentId);

                    if ($postId !== null && $this->isAjaxRequest()) {
                        $state = $repository->getCommentState($userId, $postId);
                        $this->jsonResponse([
                            'success' => true,
                            'post_id' => $postId,
                            'comment_id' => $commentId,
                            'commented_by_current_user' => $state['commented_by_current_user'],
                            'comment_count' => $state['comment_count'],
                            'message' => 'Komentarz został usunięty.',
                        ]);
                    }
                }

                $this->redirect($redirectTo);
                return;

            case 'delete_post':
                $postId = (int) ($_POST['post_id'] ?? 0);

                if ($postId > 0) {
                    $imagePaths = $repository->deletePostByOwner($userId, $postId);
                    if ($imagePaths !== []) {
                        $this->deleteUploadedFiles($imagePaths);
                        $this->setFlash('success', 'Post został usunięty.');
                    } else {
                        $this->setFlash('error', 'Nie udało się usunąć posta.');
                    }
                }

                $this->redirect($redirectTo);
                return;

            case 'report_post':
                $postId = (int) ($_POST['post_id'] ?? 0);

                if ($postId > 0) {
                    if ($this->isAjaxRequest()) {
                        $this->jsonResponse([
                            'success' => true,
                            'message' => 'Post został zgłoszony.',
                        ]);
                    }

                    $this->setFlash('success', 'Post został zgłoszony.');
                }

                $this->redirect($redirectTo);
                return;

            case 'report_comment':
                $commentId = (int) ($_POST['comment_id'] ?? 0);

                if ($commentId > 0) {
                    if ($this->isAjaxRequest()) {
                        $this->jsonResponse([
                            'success' => true,
                            'message' => 'Komentarz został zgłoszony.',
                        ]);
                    }

                    $this->setFlash('success', 'Komentarz został zgłoszony.');
                }

                $this->redirect($redirectTo);
                return;
        }

        $this->redirect($redirectTo);
    }

    private function resolveFilters(): array
    {
        return [
            'scope' => (string) ($_GET['scope'] ?? 'all'),
            'brand_id' => $this->normalizeNullableInt($_GET['brand_id'] ?? null),
            'model_id' => $this->normalizeNullableInt($_GET['model_id'] ?? null),
        ];
    }

    private function resolveCursorCreatedAt(): ?string
    {
        $cursorCreatedAt = trim((string) ($_GET['cursor_created_at'] ?? ''));

        return $cursorCreatedAt !== '' ? $cursorCreatedAt : null;
    }

    private function resolveCursorId(): ?int
    {
        return $this->normalizeNullableInt($_GET['cursor_id'] ?? null);
    }

    private function isFeedPageRequest(): bool
    {
        return (string) ($_GET['feed_page'] ?? '') === '1';
    }

    private function mapPosts(array $posts): array
    {
        return array_map(function (array $post): array {
            $post['formatted_created_at'] = $this->formatDateTime($post['created_at']);
            $post['comments'] = array_map(function (array $comment): array {
                $comment['formatted_created_at'] = $this->formatDateTime($comment['created_at']);
                return $comment;
            }, $post['comments']);

            return $post;
        }, $posts);
    }

    private function renderCommunityPostsHtml(array $posts): string
    {
        if ($posts === []) {
            return '';
        }

        $currentUser = $this->resolveCommunityRenderUser($this->getCurrentUserId());

        ob_start();
        foreach ($posts as $post) {
            include 'public/views/partials/community_post.php';
        }

        return (string) ob_get_clean();
    }

    private function formatDateTime(string $value): string
    {
        return (new DateTimeImmutable($value))->format('d.m.Y • H:i');
    }

    private function normalizeIntegerList(string|array|null $value): array
    {
        if (is_array($value)) {
            return array_values(array_unique(array_filter(array_map('intval', $value), static fn (int $item): bool => $item > 0)));
        }

        if (!is_string($value) || trim($value) === '') {
            return [];
        }

        return array_values(array_unique(array_filter(
            array_map('intval', preg_split('/\s*,\s*/', trim($value)) ?: []),
            static fn (int $item): bool => $item > 0
        )));
    }

    private function normalizeNullableInt(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        return filter_var($value, FILTER_VALIDATE_INT) !== false ? (int) $value : null;
    }

    private function sanitizeRedirectPath(string $redirectTo): string
    {
        if ($redirectTo === '' || $redirectTo[0] !== '/') {
            return '/community';
        }

        return $redirectTo;
    }

    private function handlePostImageUploads(int $userId, string $fieldName = 'post_images'): array
    {
        if (empty($_FILES[$fieldName]) || !is_array($_FILES[$fieldName]['error'] ?? null)) {
            return [];
        }

        $userRepository = new UserRepository(Database::getConnection());
        $user = $userRepository->getById($userId);
        $username = $user['username'] ?? ('user-' . $userId);
        $uploadDirectory = getcwd() . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'posts';

        if (!is_dir($uploadDirectory)) {
            mkdir($uploadDirectory, 0775, true);
        }

        $files = $this->normalizeImageUploads($_FILES[$fieldName]);
        if ($files === []) {
            return [];
        }

        $uploadedPaths = [];
        $slugBase = $this->slugify($username . '-community-post');
        $timestamp = date('Ymd-His');
        $requestToken = bin2hex(random_bytes(3));

        foreach (array_slice($files, 0, 8) as $index => $file) {
            if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
                continue;
            }

            $extension = strtolower(pathinfo((string) ($file['name'] ?? ''), PATHINFO_EXTENSION));
            $safeExtension = in_array($extension, ['jpg', 'jpeg', 'png', 'webp'], true) ? $extension : 'jpg';
            $filename = $slugBase . '-' . $timestamp . '-' . $requestToken . '-' . ($index + 1) . '.' . $safeExtension;
            $targetPath = $uploadDirectory . DIRECTORY_SEPARATOR . $filename;

            if (!move_uploaded_file((string) ($file['tmp_name'] ?? ''), $targetPath)) {
                continue;
            }

            $uploadedPaths[] = '/public/uploads/posts/' . $filename;
        }

        return $uploadedPaths;
    }

    private function normalizeImageUploads(array $upload): array
    {
        $names = $upload['name'] ?? [];
        $tmpNames = $upload['tmp_name'] ?? [];
        $errors = $upload['error'] ?? [];

        if (!is_array($names) || !is_array($tmpNames) || !is_array($errors)) {
            return [];
        }

        $normalized = [];
        foreach ($names as $index => $name) {
            $normalized[] = [
                'name' => $name,
                'tmp_name' => $tmpNames[$index] ?? null,
                'error' => $errors[$index] ?? UPLOAD_ERR_NO_FILE,
            ];
        }

        return $normalized;
    }

    private function slugify(string $value): string
    {
        $normalized = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
        $normalized = $normalized === false ? $value : $normalized;
        $normalized = strtolower($normalized);
        $normalized = preg_replace('/[^a-z0-9]+/', '-', $normalized) ?? '';

        return trim($normalized, '-') ?: 'post';
    }

    private function deleteUploadedFiles(array $imagePaths): void
    {
        foreach ($imagePaths as $imagePath) {
            if (!is_string($imagePath) || $imagePath === '') {
                continue;
            }

            $localPath = $this->resolvePublicPathToFilesystem($imagePath);
            if ($localPath !== null && is_file($localPath)) {
                @unlink($localPath);
            }
        }
    }

    private function resolvePublicPathToFilesystem(string $publicPath): ?string
    {
        $normalized = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, ltrim($publicPath, '/\\'));
        if ($normalized === '') {
            return null;
        }

        return getcwd() . DIRECTORY_SEPARATOR . $normalized;
    }

    private function resolveCommunityRenderUser(int $userId): array
    {
        $fallbackUser = [
            'id' => $userId,
            'full_name' => 'Użytkownik testowy',
            'membership_tier' => 'free',
        ];

        try {
            $repository = new UserRepository(Database::getConnection());
            $user = $repository->getById($userId);

            return $user ?: $fallbackUser;
        } catch (Throwable) {
            return $fallbackUser;
        }
    }
}
