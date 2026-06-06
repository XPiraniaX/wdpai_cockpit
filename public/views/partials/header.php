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
$notificationBellIconIdlePath = '/public/assets/icons/bell_icon.svg?v=' . rawurlencode((string) filemtime('public/assets/icons/bell_icon.svg'));
$notificationBellIconActivePath = '/public/assets/icons/bell_icon_active.svg?v=' . rawurlencode((string) filemtime('public/assets/icons/bell_icon_active.svg'));
?>
<header class="topbar">
    <div class="breadcrumbs">
        <span class="breadcrumbs-current"><?= htmlspecialchars($pageMeta['title'], ENT_QUOTES, 'UTF-8'); ?></span>
        <span class="breadcrumbs-separator">/</span>
        <span class="breadcrumbs-parent"><?= htmlspecialchars($pageMeta['subtitle'], ENT_QUOTES, 'UTF-8'); ?></span>
    </div>

    <div class="topbar-actions">
        <div class="notification-shell" data-notification-shell>
            <button
                class="icon-button notification-trigger"
                type="button"
                aria-label="Powiadomienia"
                aria-expanded="false"
                data-notification-trigger
                data-notification-bell-idle="<?= htmlspecialchars($notificationBellIconIdlePath, ENT_QUOTES, 'UTF-8'); ?>"
                data-notification-bell-active="<?= htmlspecialchars($notificationBellIconActivePath, ENT_QUOTES, 'UTF-8'); ?>"
            >
                <img
                    src="<?= htmlspecialchars($notificationBellIconIdlePath, ENT_QUOTES, 'UTF-8'); ?>"
                    alt=""
                    class="bell-icon"
                    data-notification-bell-icon
                >
            </button>

            <section class="notification-panel" hidden data-notification-panel>
                <div class="notification-panel-body" data-notification-body>
                    <div class="notification-panel-empty">Ładowanie powiadomień...</div>
                </div>
            </section>
        </div>

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
