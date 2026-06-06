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

<div class="auth">
    <?= $content ?>
</div>

<script>
    window.APP_CSRF_TOKEN = <?= json_encode((string) ($csrfToken ?? ''), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>;

    (() => {
        const applyCsrfToken = (root = document) => {
            root.querySelectorAll('form').forEach((form) => {
                const method = String(form.getAttribute('method') || 'get').toLowerCase();
                if (method !== 'post') {
                    return;
                }

                let tokenInput = form.querySelector('input[name="_csrf"]');
                if (!(tokenInput instanceof HTMLInputElement)) {
                    tokenInput = document.createElement('input');
                    tokenInput.type = 'hidden';
                    tokenInput.name = '_csrf';
                    form.appendChild(tokenInput);
                }

                tokenInput.value = window.APP_CSRF_TOKEN || '';
            });
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => applyCsrfToken(), { once: true });
        } else {
            applyCsrfToken();
        }
    })();

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

<?php foreach (($scriptFiles ?? []) as $scriptFile): ?>
    <script src="/public/scripts/<?= htmlspecialchars($scriptFile, ENT_QUOTES, 'UTF-8'); ?>"></script>
<?php endforeach; ?>

</body>
</html>
