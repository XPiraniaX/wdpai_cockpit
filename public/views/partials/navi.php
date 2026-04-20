<?php
$currentPath = trim(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH), '/');
$menuItems = [
    ['href' => '/dashboard', 'path' => 'dashboard', 'label' => 'Dashboard', 'icon' => '/public/assets/icons/dashboard.svg'],
    ['href' => '/my-cars', 'path' => 'my-cars', 'label' => 'Moje samochody', 'icon' => '/public/assets/icons/my_cars.svg'],
    ['href' => '/marketplace', 'path' => 'marketplace', 'label' => 'Marketplace', 'icon' => '/public/assets/icons/marketplace.svg'],
    ['href' => '/community', 'path' => 'community', 'label' => 'Społeczność', 'icon' => '/public/assets/icons/community.svg'],
];
?>
<aside class="navi">
    <div class="navi-top">
        <a href="/dashboard" class="brand">
            <img src="/public/assets/icons/logo.svg" alt="Cockpit" class="brand-logo">
        </a>

        <nav class="menu" aria-label="Main navigation">
            <?php foreach ($menuItems as $item): ?>
                <?php $isActive = $currentPath === $item['path']; ?>
                <a href="<?= htmlspecialchars($item['href'], ENT_QUOTES, 'UTF-8'); ?>"
                   class="menu-item<?= $isActive ? ' active' : ''; ?>">
                    <span class="menu-icon"
                          style="--icon-url: url('<?= htmlspecialchars($item['icon'], ENT_QUOTES, 'UTF-8'); ?>');"></span>
                    <span class="menu-label"><?= htmlspecialchars($item['label'], ENT_QUOTES, 'UTF-8'); ?></span>
                </a>
            <?php endforeach; ?>
        </nav>
    </div>

    <div class="bottom">
        <a href="/settings" class="menu-item<?= $currentPath === 'settings' ? ' active' : ''; ?>">
            <span class="menu-icon"
                  style="--icon-url: url('/public/assets/icons/settings.svg');"></span>
            <span class="menu-label">Settings</span>
        </a>
    </div>
</aside>
