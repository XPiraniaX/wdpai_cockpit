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
        $this->render('community', [
            'title' => 'Społeczność',
            'scope' => $filters['scope'],
            'brandId' => $filters['brand_id'],
            'modelId' => $filters['model_id'],
            'brands' => $repository->getAvailableCategories(),
            'posts' => $this->mapPosts($repository->getFeed($userId, $filters)),
            'scriptFiles' => ['community.js'],
        ]);
    }

    public function profile(): void
    {
        $this->requireAuthentication();

        $repository = new CommunityRepository(Database::getConnection());
        $currentUserId = $this->getCurrentUserId();
        $profileUserId = (int) ($_GET['id'] ?? 0);

        if ($profileUserId <= 0) {
            $this->redirect('/community');
        }

        if ($this->isPost()) {
            $this->handlePostAction($repository, $currentUserId);
            return;
        }

        $profile = $repository->getProfile($profileUserId);

        if ($profile === null) {
            http_response_code(404);
            $this->render('404', [
                'title' => '404 - Profil nie istnieje',
            ]);
            return;
        }

        $posts = $repository->getFeed($currentUserId, [
            'scope' => 'all',
            'brand_id' => null,
            'model_id' => null,
        ]);
        $posts = array_values(array_filter($posts, static fn (array $post): bool => $post['user_id'] === $profileUserId));

        $this->render('community_profile', [
            'title' => $profile['full_name'],
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

            case 'toggle_like':
                $postId = (int) ($_POST['post_id'] ?? 0);
                if ($postId > 0) {
                    $repository->toggleLike($userId, $postId);
                }
                $this->redirect($redirectTo);
                return;

            case 'toggle_save':
                $postId = (int) ($_POST['post_id'] ?? 0);
                if ($postId > 0) {
                    $repository->toggleSave($userId, $postId);
                }
                $this->redirect($redirectTo);
                return;

            case 'add_comment':
                $postId = (int) ($_POST['post_id'] ?? 0);
                $content = trim((string) ($_POST['comment_content'] ?? ''));

                if ($postId > 0 && $content !== '') {
                    $repository->addComment($userId, $postId, $content);
                }

                $this->redirect($redirectTo . '#post-' . $postId);
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

    private function formatDateTime(string $value): string
    {
        return (new DateTimeImmutable($value))->format('d.m.Y • H:i');
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
}
