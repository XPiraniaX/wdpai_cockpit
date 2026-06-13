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

<?php if (!empty($requiresAdminWarningLock ?? false)): ?>
    <div class="pseudonym-lock" data-admin-warning-lock>
        <div class="pseudonym-lock-backdrop"></div>
        <section class="pseudonym-lock-modal account-warning-lock-modal<?= (($currentUser['pending_admin_notice_type'] ?? 'warning') !== 'warning') ? ' is-restriction' : ''; ?>">
            <div class="account-warning-lock-copy">
                <div class="account-warning-lock-kicker">Ostrzeżenie administratora</div>
                <h2 class="account-warning-lock-title">Wymagane potwierdzenie komunikatu</h2>
            </div>
            <div class="account-warning-lock-body">
                <p class="account-warning-lock-copy-text">
                    Otrzymałeś komunikat od administratora. Potwierdź jego przeczytanie, aby kontynuować korzystanie z aplikacji.
                </p>
                <div class="account-warning-lock-block">
                    <div class="account-warning-lock-label">Komunikat:</div>
                    <div class="account-warning-lock-value"><?= htmlspecialchars((string) ($currentUser['admin_warning_message'] ?? 'Brak treści komunikatu.'), ENT_QUOTES, 'UTF-8'); ?></div>
                </div>
            </div>
            <div class="account-warning-lock-actions">
                <form method="post" action="<?= htmlspecialchars((string) ($_SERVER['REQUEST_URI'] ?? '/dashboard'), ENT_QUOTES, 'UTF-8'); ?>" class="account-warning-lock-form">
                    <input type="hidden" name="action" value="acknowledge_admin_warning">
                    <input type="hidden" name="redirect_to" value="<?= htmlspecialchars((string) ($_SERVER['REQUEST_URI'] ?? '/dashboard'), ENT_QUOTES, 'UTF-8'); ?>">
                    <button type="submit" class="pseudonym-lock-submit">Potwierdź</button>
                </form>
            </div>
        </section>
    </div>
<?php endif; ?>

<?php if (!empty($requiresBanLock ?? false)): ?>
    <div class="pseudonym-lock" data-account-ban-lock>
        <div class="pseudonym-lock-backdrop"></div>
        <section class="pseudonym-lock-modal account-ban-lock-modal">
            <div class="account-ban-lock-copy">
                <div class="account-ban-lock-kicker">Konto zablokowane</div>
                <h2 class="account-ban-lock-title">Dostęp do konta został ograniczony</h2>
            </div>
            <div class="account-ban-lock-body">
                <p class="account-ban-lock-copy-text">
                Twoje konto jest obecnie zablokowane.
                </p>
                <div class="account-ban-lock-block">
                    <div class="account-ban-lock-label">Powód:</div>
                    <div class="account-ban-lock-value"><?= htmlspecialchars((string) ($currentUser['blocked_reason'] ?? 'Brak informacji'), ENT_QUOTES, 'UTF-8'); ?></div>
                </div>
                <div class="account-ban-lock-block">
                    <div class="account-ban-lock-label">Blokada do:</div>
                    <div class="account-ban-lock-value"><?= htmlspecialchars((string) ($currentUser['blocked_until_label'] ?? 'na stałe'), ENT_QUOTES, 'UTF-8'); ?></div>
                </div>
            </div>
            <div class="account-ban-lock-actions">
                <a href="/logout" class="pseudonym-lock-submit" style="text-decoration: none; text-align: center;">Wyloguj się</a>
            </div>
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

        const bindLogoutLinks = (root = document) => {
            root.querySelectorAll('a[href="/logout"]').forEach((link) => {
                if (link.dataset.logoutBound === '1') {
                    return;
                }

                link.dataset.logoutBound = '1';
                link.addEventListener('click', (event) => {
                    event.preventDefault();

                    const form = document.createElement('form');
                    form.method = 'post';
                    form.action = '/logout';
                    form.hidden = true;
                    document.body.appendChild(form);
                    applyCsrfToken(form);
                    form.submit();
                });
            });
        };

        const boot = () => {
            applyCsrfToken();
            bindLogoutLinks();
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (!(node instanceof HTMLElement)) {
                            return;
                        }

                        if (node.matches('form')) {
                            applyCsrfToken(node.parentElement ?? node);
                            bindLogoutLinks(node.parentElement ?? node);
                            return;
                        }

                        applyCsrfToken(node);
                        bindLogoutLinks(node);
                    });
                });
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true,
            });
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', boot, { once: true });
        } else {
            boot();
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

</body>
</html>
