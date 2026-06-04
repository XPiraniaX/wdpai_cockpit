<?php
$currentPath = trim(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH), '/');
$isProfileRoute = $currentPath === 'profile'
    || $currentPath === 'community/profile'
    || str_starts_with($currentPath, 'profile/');
$isVehicleDetailsRoute = $currentPath === 'my-cars/details' || str_starts_with($currentPath, 'my-cars/');
$isOwnProfile = isset($profile['id'], $currentUser['id']) && (int) $profile['id'] === (int) $currentUser['id'];
$profileSubtitle = $isOwnProfile
    ? 'Mój profil'
    : (string) ($profile['display_name'] ?? ($title ?? 'Profil użytkownika'));

$pageMap = [
    'dashboard' => ['title' => 'Dashboard', 'subtitle' => 'Przegląd'],
    'my-cars' => ['title' => 'Moje samochody', 'subtitle' => 'Garaż'],
    'my-cars/details' => ['title' => 'Moje samochody', 'subtitle' => $vehicle['title'] ?? ($title ?? 'Szczegóły pojazdu')],
    'marketplace' => ['title' => 'Marketplace', 'subtitle' => 'Oferty'],
    'community' => ['title' => 'Społeczność', 'subtitle' => 'Feed'],
    'settings' => ['title' => 'Ustawienia', 'subtitle' => 'Preferencje'],
];

$pageMeta = $pageMap[$currentPath] ?? ['title' => 'Cockpit', 'subtitle' => 'Panel'];
if ($isVehicleDetailsRoute) {
    $pageMeta = ['title' => 'Moje samochody', 'subtitle' => $vehicle['title'] ?? ($title ?? 'Szczegóły pojazdu')];
}
if ($isProfileRoute) {
    $pageMeta = ['title' => 'Profil', 'subtitle' => $profileSubtitle];
}

$headerUserName = trim((string) ($currentUser['pseudonym'] ?? '')) !== ''
    ? (string) $currentUser['pseudonym']
    : (string) ($currentUser['full_name'] ?? 'Użytkownik testowy');
$headerUserRole = strtoupper((string) ($currentUser['membership_tier'] ?? 'free')) . ' MEMBER';
$ownProfilePath = trim((string) ($currentUser['pseudonym'] ?? '')) !== ''
    ? '/profile/' . rawurlencode((string) $currentUser['pseudonym'])
    : '/profile';
$headerAvatarPath = trim((string) ($currentUser['avatar_path'] ?? ''));
?>
<header class="topbar">
    <div class="breadcrumbs">
        <span class="breadcrumbs-current"><?= htmlspecialchars($pageMeta['title'], ENT_QUOTES, 'UTF-8'); ?></span>
        <span class="breadcrumbs-separator">/</span>
        <span class="breadcrumbs-parent"><?= htmlspecialchars($pageMeta['subtitle'], ENT_QUOTES, 'UTF-8'); ?></span>
    </div>

    <div class="topbar-actions">
        <button class="icon-button" type="button" aria-label="Powiadomienia">
            <img src="/public/assets/icons/bell_icon.svg" alt="" class="bell-icon">
        </button>

        <a href="<?= htmlspecialchars($ownProfilePath, ENT_QUOTES, 'UTF-8'); ?>" class="user-card user-card-link" aria-label="Przejdź do swojego profilu">
            <div class="user-meta">
                <span class="user-name"><?= htmlspecialchars($headerUserName, ENT_QUOTES, 'UTF-8'); ?></span>
                <span class="user-role"><?= htmlspecialchars($headerUserRole, ENT_QUOTES, 'UTF-8'); ?></span>
            </div>
            <div class="avatar<?= $headerAvatarPath !== '' ? ' has-image' : ''; ?>">
                <?php if ($headerAvatarPath !== ''): ?>
                    <img src="<?= htmlspecialchars($headerAvatarPath, ENT_QUOTES, 'UTF-8'); ?>" alt="<?= htmlspecialchars($headerUserName, ENT_QUOTES, 'UTF-8'); ?>" class="avatar-image">
                <?php endif; ?>
                <span class="avatar-ring"></span>
            </div>
        </a>
    </div>
</header>
