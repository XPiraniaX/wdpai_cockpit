# Architektura

```mermaid
flowchart TD
    Browser[Przegladarka / Uzytkownik]
    Nginx[Nginx]
    Router[Routing.php]
    Controllers[Kontrolery PHP]
    Repositories[Repozytoria]
    DB[(PostgreSQL)]
    Views[Widoki PHP / HTML]
    Assets[CSS / JS / SVG]

    Browser --> Nginx
    Nginx --> Router
    Router --> Controllers
    Controllers --> Repositories
    Repositories --> DB
    Controllers --> Views
    Views --> Assets
    Assets --> Browser
```

Warstwy:
- `Routing.php` mapuje trasy na kontrolery.
- `src/controllers` obsluguje logike HTTP, autoryzacje, walidacje i renderowanie widokow.
- `src/repositories` odpowiada za dostep do danych i zapytania SQL.
- `public/views` zawiera widoki i partiale.
- `public/scripts` i `public/styles` odpowiadaja za frontend i interakcje AJAX/FETCH.
- `docker/db/init/init.sql` zawiera czysty schemat bazy.
- `docker/db/seeds` zawiera dane startowe i seed demo.
