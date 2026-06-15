# COCKPIT

Aplikacja webowa do zarzadzania samochodami, historii eksploatacji, aktywnoscia spolecznosciowa oraz ogloszeniami motoryzacyjnymi. Projekt zostal zbudowany bez frameworka, w PHP OOP, z PostgreSQL, JavaScript `FETCH API` i Dockerem.

## Stack

- PHP OOP
- PostgreSQL
- HTML5
- CSS
- JavaScript
- FETCH API
- Docker
- Git

## Uruchomienie

### 1. Start kontenerow

```bash
docker compose up --build
```

Aplikacja:
- `http://localhost:8080`

PgAdmin:
- `http://localhost:5050`

### 2. Konfiguracja zmiennych

Przyklad:
- [.env.example](.env.example)

Domyslne wartosci w aplikacji:
- `DB_HOST=db`
- `DB_PORT=5432`
- `DB_NAME=db`
- `DB_USER=docker`
- `DB_PASSWORD=docker`

### 3. Inicjalizacja bazy

Przy pustym volume PostgreSQL wykona automatycznie:
- [docker/db/init/init.sql](docker/db/init/init.sql)

Ten plik zawiera tylko:
- tabele
- constraints
- indeksy
- widoki
- funkcje
- triggery

### 4. Seedy

Minimalny seed startowy:

```bash
Get-Content docker/db/seeds/001_starting_seed.sql | docker compose exec -T db psql -U docker -d db
```

Seed demonstracyjny:

```bash
Get-Content docker/db/seeds/002_demo_seed.sql | docker compose exec -T db psql -U docker -d db
```

Opis seedow:
- [docker/db/seeds/README.md](docker/db/seeds/README.md)

Konta testowe do seeda demo:
- [TEST_ACCOUNTS.md](TEST_ACCOUNTS.md)

## Architektura

Diagram warstwowy:
- [docs/architecture.md](docs/architecture.md)

Uklad aplikacji:
- `Routing.php` - routing
- `src/controllers` - obsluga HTTP, autoryzacja, walidacja, renderowanie
- `src/repositories` - logika dostepu do danych
- `public/views` - widoki
- `public/scripts` - frontend JS
- `public/styles` - frontend CSS

## ERD

Podglad:

![ERD](docs/erd.png)

Zrodlo modelu:
- [docker/db/schema.dbml](docker/db/schema.dbml)

## Funkcje aplikacji

### Uzytkownik
- logowanie, rejestracja, utrzymanie sesji, wylogowanie
- zarzadzanie profilem i ustawieniami
- dodawanie i edycja samochodow
- historia tankowan, serwisu, przegladow i polis
- community: posty, komentarze, polubienia, zapisy
- marketplace: ogloszenia, zapisy, filtrowanie, moderacja
- powiadomienia
- zgloszenia tresci

### Administrator
- katalog uzytkownikow
- bany i blokady modulowe
- ostrzezenia
- moderacja postow i ogloszen
- akceptacja samochodow
- akceptacja marek i modeli
- obsluga zgloszen

## Baza danych

Spelnione elementy:
- relacje `1:1`
- relacje `1:N`
- relacje `N:M`
- widoki:
  - `vw_vehicle_overview`
  - `vw_community_feed`
  - `vw_marketplace_feed`
- funkcje:
  - `calculate_vehicle_average_consumption`
  - `sync_vehicle_mileage_from_fuel_logs`
- trigger:
  - `trg_sync_vehicle_mileage_from_fuel_logs`
- transakcje i prepared statements w repozytoriach

Pliki bazy:
- [docker/db/init/init.sql](docker/db/init/init.sql)
- [docker/db/migrations](docker/db/migrations)
- [docker/db/schema.dbml](docker/db/schema.dbml)

## Bezpieczenstwo

Zaimplementowane:
- prepared statements
- CSRF dla formularzy `POST`
- hashowanie hasel
- regeneracja ID sesji
- `HttpOnly`, `SameSite`
- `Secure` przy HTTPS
- rate limiting logowania
- audit nieudanych logowan
- walidacja uploadow obrazow
- kontrola dostepu rolami i ukrywanie czesci zasobow przez `404`
- strony bledow `400`, `403`, `404`, `500`
- wylogowanie jako bezpieczny `POST`
- potwierdzenie haslem przy usuwaniu konta

Smoke test bezpieczenstwa:
- [tests/security_smoke.sh](tests/security_smoke.sh)

## Testy

### PHPUnit

Uruchomienie:

```bash
docker compose exec php php /app/tests/phpunit/phpunit.phar -c /app/phpunit.xml
```

Zakres:
- [tests/Unit/UserRepositoryTest.php](tests/Unit/UserRepositoryTest.php)
- [tests/Unit/ReportsRepositoryTest.php](tests/Unit/ReportsRepositoryTest.php)

### Test integracyjny

Uruchomienie:

```bash
bash tests/security_smoke.sh
```

Sprawdza m.in.:
- security headers
- `404`
- brak dostepu goscia do `/admin`
- `GET /logout` nie jest destrukcyjny
- odrzucenie `POST /login` bez CSRF

## Scenariusz testowy

1. Uruchom kontenery `docker compose up --build`.
2. Zainicjalizuj baze i uruchom `002_demo_seed.sql`.
3. Zaloguj sie jako `admin / admin`.
4. Wejdz do panelu administratora i sprawdz:
   - katalog uzytkownikow
   - samochody do potwierdzenia
   - marki i modele do potwierdzenia
   - zgloszenia
5. Wyloguj sie i zaloguj jako zwykly user, np. `alexrivera / password`.
6. Sprawdz dashboard, moje samochody i szczegoly pojazdu.
7. Dodaj lub edytuj post w community.
8. Dodaj lub edytuj ogloszenie w marketplace.
9. Wyslij zgloszenie tresci jako zwykly user i sprawdz obsluge po stronie admina.
10. Sprawdz ustawienia, zmiane hasla i flow usuwania konta.
11. Wejdz na nieistniejaca trase i sprawdz `404`.
12. Uruchom testy PHPUnit i smoke test bezpieczenstwa.

## Screenshoty

Katalog na screenshoty:
- [docs/screenshots](docs/screenshots)

Do uzupelnienia przed oddaniem:
- screenshoty wersji webowej
- screenshoty wersji mobilnej

## Checklista

- [x] Docker
- [x] Git
- [x] HTML / CSS / JavaScript / FETCH API
- [x] PHP OOP bez frameworka
- [x] PostgreSQL
- [x] MVC / podzial warstw
- [x] logowanie, sesja, wylogowanie
- [x] role i uprawnienia
- [x] panel administratora
- [x] relacje `1:1`, `1:N`, `N:M`
- [x] minimum 2 widoki
- [x] minimum 1 funkcja
- [x] minimum 1 trigger
- [x] migracje
- [x] seed startowy
- [x] seed demonstracyjny
- [x] ERD
- [x] testy symboliczne
- [x] globalne strony bledow
- [x] responsywnosc czesci uzytkownika
- [ ] screenshoty web
- [ ] screenshoty mobile

## Uwagi koncowe

- `001_starting_seed.sql` sluzy do minimalnego startu projektu.
- `002_demo_seed.sql` sluzy do prezentacji wszystkich glownych funkcji aplikacji.
- `init.sql` zostal rozdzielony od danych startowych, zeby schemat bazy i seedy byly utrzymywane osobno.
