<!DOCTYPE html>
<html lang="pl">
<head>
    <?php include __DIR__ . '/head.php'; ?>
</head>
<body>

<div class="app">

    <?php include __DIR__ . '/navi.php'; ?>

    <div class="main">
        <?php include __DIR__ . '/header.php'; ?>

        <div class="content">
            <?= $content ?>
        </div>
    </div>

</div>

<?php foreach (($scriptFiles ?? []) as $scriptFile): ?>
    <?php $scriptPath = 'public/scripts/' . $scriptFile; ?>
    <script src="/<?= htmlspecialchars($scriptPath, ENT_QUOTES, 'UTF-8'); ?>?v=<?= htmlspecialchars((string) filemtime($scriptPath), ENT_QUOTES, 'UTF-8'); ?>"></script>
<?php endforeach; ?>

</body>
</html>
