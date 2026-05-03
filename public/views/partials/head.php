<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title><?= $title ?? "Cockpit" ?></title>

<?php
$styleFiles = $styleFiles ?? [
    'base.css',
    'layout.css',
    'navi.css',
    'header.css',
    'dashboard.css',
];
?>

<?php foreach ($styleFiles as $styleFile): ?>
    <?php $stylePath = 'public/styles/' . $styleFile; ?>
    <link rel="stylesheet" href="/<?= htmlspecialchars($stylePath, ENT_QUOTES, 'UTF-8'); ?>?v=<?= htmlspecialchars((string) filemtime($stylePath), ENT_QUOTES, 'UTF-8'); ?>">
<?php endforeach; ?>
