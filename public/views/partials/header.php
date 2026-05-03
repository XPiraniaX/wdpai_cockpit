<?php
$currentPath = trim(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH), '/');
$pageMap = [
    'dashboard' => ['title' => 'Dashboard', 'subtitle' => 'Przeglad'],
    'my-cars' => ['title' => 'Moje samochody', 'subtitle' => 'Garaz'],
    'marketplace' => ['title' => 'Marketplace', 'subtitle' => 'Oferty'],
    'community' => ['title' => 'Spolecznosc', 'subtitle' => 'Aktywnosc'],
    'settings' => ['title' => 'Settings', 'subtitle' => 'Preferencje'],
];
$pageMeta = $pageMap[$currentPath] ?? ['title' => 'Cockpit', 'subtitle' => 'Panel'];
$headerUserName = $currentUser['full_name'] ?? 'Uzytkownik testowy';
$headerUserRole = strtoupper((string) ($currentUser['membership_tier'] ?? 'free')) . ' MEMBER';
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

        <div class="user-card">
            <div class="user-meta">
                <span class="user-name"><?= htmlspecialchars($headerUserName, ENT_QUOTES, 'UTF-8'); ?></span>
                <span class="user-role"><?= htmlspecialchars($headerUserRole, ENT_QUOTES, 'UTF-8'); ?></span>
            </div>
            <div class="avatar">
                <span class="avatar-ring"></span>
            </div>
        </div>
    </div>
</header>
