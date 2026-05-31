<!DOCTYPE html>
<html lang="pl">
<head>
    <?php include __DIR__ . '/head.php'; ?>
</head>
<body>

<?php if (!empty($flash ?? null)): ?>
    <div class="app-toast app-toast-<?= htmlspecialchars((string) ($flash['type'] ?? 'info'), ENT_QUOTES, 'UTF-8'); ?>" data-app-toast>
        <div class="app-toast-message">
            <?= htmlspecialchars((string) ($flash['message'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>
        </div>
    </div>
<?php endif; ?>

<?php if (!empty($requiresPseudonymSetup ?? false)): ?>
    <div class="pseudonym-lock" data-pseudonym-lock>
        <div class="pseudonym-lock-backdrop"></div>
        <section class="pseudonym-lock-modal">
            <div class="pseudonym-lock-kicker">Pierwsze logowanie</div>
            <h2 class="pseudonym-lock-title">Wpisz swój pseudonim</h2>
            <p class="pseudonym-lock-copy">
                Zanim przejdziesz dalej, ustaw pseudonim widoczny dla innych użytkowników.
            </p>

            <form method="post" action="/complete-pseudonym" class="pseudonym-lock-form">
                <input type="hidden" name="redirect_to" value="<?= htmlspecialchars((string) ($_SERVER['REQUEST_URI'] ?? '/dashboard'), ENT_QUOTES, 'UTF-8'); ?>">
                <label class="pseudonym-lock-field">
                    <span>Pseudonim</span>
                    <input type="text" name="pseudonym" maxlength="80" required autofocus>
                </label>
                <button type="submit" class="pseudonym-lock-submit">Zapisz pseudonim</button>
            </form>
        </section>
    </div>
<?php endif; ?>

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

<script>
    (() => {
        const toast = document.querySelector('[data-app-toast]');
        if (!toast) {
            return;
        }

        window.setTimeout(() => {
            toast.classList.add('is-hiding');
            window.setTimeout(() => toast.remove(), 260);
        }, 5000);
    })();

    (() => {
        const disableAutocomplete = (root = document) => {
            root.querySelectorAll('form').forEach((form) => {
                form.setAttribute('autocomplete', 'off');
            });

            root.querySelectorAll('input, textarea, select').forEach((field) => {
                if (!(field instanceof HTMLElement)) {
                    return;
                }

                const tagName = field.tagName.toLowerCase();
                const inputType = tagName === 'input'
                    ? String(field.getAttribute('type') || 'text').toLowerCase()
                    : '';

                if (['hidden', 'submit', 'button', 'reset', 'checkbox', 'radio', 'file'].includes(inputType)) {
                    return;
                }

                field.setAttribute('autocomplete', 'off');
            });
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => disableAutocomplete(), { once: true });
        } else {
            disableAutocomplete();
        }
    })();
</script>

</body>
</html>
