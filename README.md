# COCKPIT

Aplikacja webowa do zarządzania samochodami, historii eksploatacji, aktywności społecznościowej oraz ogłoszeniami motoryzacyjnymi. Projekt został zbudowany w PHP, z PostgreSQL, JavaScript i Dockerem.

## Spis treści

1. [O projekcie](#1-o-projekcie)
2. [Stack technologiczny](#2-stack-technologiczny)
3. [Architektura](#3-architektura)
4. [Funkcjonalności](#4-funkcjonalności)
5. [Baza danych](#5-baza-danych)
6. [ERD](#6-erd)
7. [Bezpieczeństwo](#7-bezpieczeństwo)
8. [Uruchomienie projektu](#9-uruchomienie-projektu)
9. [Seedy i konta testowe](#9-seedy-i-konta-testowe)
10. [Testy](#10-testy)
11. [Scenariusz testowy](#11-scenariusz-testowy)
12. [Screenshoty](#12-screenshoty)
13. [Checklista wymagań](#13-checklista-wymagań)
14. [Podsumowanie](#14-podsumowanie)

## 1. O projekcie

### 1.1 Nazwa projektu

`COCKPIT`

### 1.2 Cel aplikacji

Celem projektu jest stworzenie aplikacji webowej wspierającej kierowcę w codziennym zarządzaniu samochodami i ich eksploatacją. System łączy w jednym miejscu:
- garaż użytkownika,
- dane techniczne pojazdów,
- historię tankowań, przeglądów, polis i serwisów,
- moduł społecznościowy,
- moduł marketplace,
- panel administracyjny do moderacji użytkowników i treści.

### 1.3 Role użytkowników

W systemie występują dwie główne role:

- `user`
  - zarządza własnymi pojazdami,
  - korzysta z community i marketplace,
  - odbiera powiadomienia,
  - zgłasza treści.

- `admin`
  - moderuje użytkowników,
  - obsługuje zgłoszenia,
  - zatwierdza pojazdy,
  - zatwierdza marki i modele,
  - usuwa lub blokuje treści.

## 2. Stack technologiczny

### 2.1 Backend

- PHP

### 2.2 Frontend

- HTML5
- CSS
- JavaScript

### 2.3 Baza danych

- PostgreSQL

### 2.4 Środowisko uruchomieniowe

- Docker
- Docker Compose

### 2.5 Kontrola wersji

- Git

## 3. Architektura

### 3.1 Ogólny podział aplikacji

Projekt składa się z trzech głównych warstw:
- frontend,
- backend,
- baza danych.

### 3.2 Zastosowany wzorzec

W projekcie zastosowano podejście `MVC`:
- `Routing.php` odpowiada za mapowanie tras,
- `controllers` obsługują logikę HTTP i przepływ żądań,
- `repositories` odpowiadają za dostęp do danych,
- `views` renderują interfejs użytkownika.

### 3.3 Przepływ żądania

Typowy przepływ wygląda następująco:
1. użytkownik wykonuje akcję w przeglądarce,
2. żądanie trafia przez `nginx` do aplikacji PHP,
3. `Routing.php` wybiera odpowiedni kontroler,
4. kontroler wykonuje walidację i autoryzację,
5. repozytorium pobiera lub zapisuje dane w PostgreSQL,
6. kontroler renderuje widok albo zwraca odpowiedź AJAX.

### 3.4 Struktura katalogów

Najważniejsze katalogi projektu:
- `src/controllers` - kontrolery
- `src/repositories` - repozytoria
- `src/config` - konfiguracja połączenia z bazą
- `public/views` - widoki i partiale
- `public/scripts` - logika frontendowa
- `public/styles` - style CSS
- `docker/db/init` - czysty schemat bazy
- `docker/db/migrations` - migracje
- `docker/db/seeds` - dane startowe i demo

### 3.5 Diagram architektury

Diagram warstwowy znajduje się w pliku:
- [docs/architecture.md](docs/architecture.md)

## 4. Funkcjonalności

### 4.1 Konto użytkownika

- rejestracja,
- logowanie,
- utrzymanie sesji,
- wylogowanie,
- edycja ustawień,
- zmiana hasła,
- usunięcie konta z potwierdzeniem hasłem.

### 4.2 Moduł pojazdów

- dodawanie pojazdu,
- edycja pojazdu,
- lista pojazdów,
- oznaczanie pojazdu głównego,
- status akceptacji pojazdu,
- widok szczegółów pojazdu.

### 4.3 Eksploatacja pojazdu

- tankowania,
- historia tankowań,
- przeglądy techniczne,
- ubezpieczenia,
- historia serwisowa,
- zadania serwisowe,
- obliczanie średniego spalania.

### 4.4 Community

- dodawanie postów,
- edycja postów,
- komentarze,
- polubienia,
- zapisywanie postów,
- filtrowanie treści,
- zgłaszanie postów i komentarzy.

### 4.5 Marketplace

- dodawanie ogłoszeń,
- edycja ogłoszeń,
- filtrowanie ogłoszeń,
- zapisywanie ogłoszeń,
- import danych pojazdu do ogłoszenia,
- zgłaszanie ogłoszeń.

### 4.6 Powiadomienia

- powiadomienia aplikacyjne,
- przejścia do odpowiednich zasobów,
- powiadomienia związane z moderacją,
- powiadomienia związane z pojazdami i zgłoszeniami.

### 4.7 Panel administratora

- katalog użytkowników,
- bany globalne,
- blokady community,
- blokady marketplace,
- ostrzeżenia dla użytkowników,
- akceptacja pojazdów,
- akceptacja marek i modeli,
- obsługa zgłoszeń,
- usuwanie postów, komentarzy i ogłoszeń.

## 5. Baza danych

### 5.1 Model danych

Baza danych została zaprojektowana w sposób modułowy. Główne obszary modelu:
- użytkownicy i ustawienia,
- pojazdy i ich historia eksploatacji,
- community,
- marketplace

### 5.2 Relacje

W projekcie występują wszystkie wymagane typy relacji:

- `1:1`
  - `users` -> `user_settings`

- `1:N`
  - `users` -> `vehicles`
  - `users` -> `community_posts`
  - `users` -> `marketplace_listings`

- `N:M`
  - `community_post_likes`
  - `community_post_saves`
  - `marketplace_listing_saves`

### 5.3 Widoki

W bazie znajdują się widoki:
- `vw_vehicle_overview`
- `vw_community_feed`
- `vw_marketplace_feed`

Widoki służą do agregowania danych z wielu tabel i uproszczenia warstwy odczytu po stronie aplikacji.

### 5.4 Funkcje

W bazie użyto funkcji:
- `calculate_vehicle_average_consumption`
- `sync_vehicle_mileage_from_fuel_logs`

### 5.5 Triggery

W bazie użyto triggera:
- `trg_sync_vehicle_mileage_from_fuel_logs`

Trigger aktualizuje przebieg pojazdu po dodaniu wpisu tankowania.

### 5.6 Klucze obce i integralność danych

Model wykorzystuje:
- klucze główne,
- klucze obce,
- relacje z `ON DELETE CASCADE`,
- relacje z `ON DELETE RESTRICT`,
- relacje z `ON DELETE SET NULL`.

Pozwala to utrzymać spójność danych w modułach użytkowników, pojazdów, community i marketplace.

### 5.7 Transakcje

Transakcje są używane tam, gdzie jedna operacja aplikacyjna obejmuje wiele zmian w bazie, np.:
- akceptacja lub odrzucenie pojazdu,
- operacje administracyjne,
- usuwanie obiektów powiązanych z marką lub modelem,
- część operacji moderacyjnych.

### 5.8 Normalizacja i brak redundancji

Model został zaprojektowany w taki sposób, aby:
- ograniczać redundancję danych,
- minimalizować anomalie modyfikacji,
- minimalizować anomalie usuwania,
- zachować czytelny podział odpowiedzialności między tabelami.

### 5.9 Inicjalizacja i seedy

Schemat bazy:
- [docker/db/init/init.sql](docker/db/init/init.sql)

Migracje:
- [docker/db/migrations](docker/db/migrations)

Seedy:
- [docker/db/seeds](docker/db/seeds)

## 6. ERD

### 6.1 Diagram ERD

![ERD](docs/erd.png)

Wyszczególniony moduł Użytkownika

![ERD_USERS](docs/erd_users.png)

Wyszczególniony moduł Pojazdu

![ERD_VEHICLES](docs/erd_vehicles.png)

Wyszczególniony moduł Marketplace

![ERD_MARKETPLACE](docs/erd_marketplace.png)

Wyszczególniony moduł Społeczności

![ERD_COMMUNITY](docs/erd_community.png)

## 7. Bezpieczeństwo

### 7.1 Security Bingo

![Security Bingo](docs/BINGO.JPG)

Pola wymagające deployu zostały zrealizowane z założeniem działania poza localhost
np. HTTPS poza localhost, Secure przy HTTPS

### 7.2 Logowanie i sesje

- logowanie użytkownika,
- utrzymywanie sesji,
- regeneracja ID sesji,
- bezpieczne wylogowanie przez `POST`,
- pełne niszczenie sesji przy logout.

### 7.3 Role i autoryzacja

- rozdzielenie ról `user` i `admin`,
- ochrona tras i akcji administracyjnych,
- ukrywanie części zasobów przez `404`.

### 7.4 Ochrona formularzy

- tokeny CSRF,
- walidacja CSRF po stronie backendu,
- zabezpieczenie formularzy `POST`.

### 7.5 Ochrona przed SQL Injection

- prepared statements,
- brak konkatenacji surowych danych użytkownika w zapytaniach.

### 7.6 Hasła

- hashowanie haseł,
- `password_verify`,
- brak logowania haseł do systemu.

### 7.7 Upload plików

- sprawdzanie typu MIME,
- ograniczenie formatów obrazów,
- ograniczenie rozmiaru plików,
- walidacja uploadów po stronie backendu.

### 7.8 Ograniczanie nadużyć

- rate limiting logowania,
- logowanie nieudanych prób logowania do audytu.

### 7.9 Obsługa błędów

- strona `400`
- strona `403`
- strona `404`
- strona `500`

### 7.10 Dodatkowe zabezpieczenia

- `HttpOnly`
- `SameSite`
- `Secure` przy HTTPS
- nagłówki bezpieczeństwa:
  - `X-Frame-Options`
  - `X-Content-Type-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`

## 8. Uruchomienie projektu

### 8.1 Wymagania

- Docker
- Docker Compose

### 8.2 Start aplikacji

```bash
docker compose up --build
```

### 8.3 Dostępne porty

- aplikacja: `http://localhost:8080`
- pgAdmin: `http://localhost:5050`
- PostgreSQL: `localhost:5433`

### 8.4 Zmienne środowiskowe

Przykładowy plik:
- [.env.example](.env.example)

Aktualnie aplikacja korzysta z:
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`

### 8.5 Inicjalizacja bazy

Przy pustym volume PostgreSQL automatycznie wykona:
- [docker/db/init/init.sql](docker/db/init/init.sql)

### 8.6 Migracje

Przykładowe uruchomienie migracji:

```bash
docker compose exec db psql -U docker -d db -f /migrations/NAZWA_MIGRACJI
```

### 8.7 Seedy

Minimalny seed startowy (do startu pustej aplikacji):

```bash
Get-Content docker/db/seeds/001_starting_seed.sql | docker compose exec -T db psql -U docker -d db
```

Seed demonstracyjny (aby móc przetestować apliakcje uruchamiamy tylko ten):

```bash
Get-Content docker/db/seeds/002_demo_seed.sql | docker compose exec -T db psql -U docker -d db
```

### 8.8 Web

http://localhost:8080/

### 8.9 Logowanie

Punkt 9.3

## 9. Seedy i konta testowe

### 9.1 Seed startowy

Plik:
- [docker/db/seeds/001_starting_seed.sql](docker/db/seeds/001_starting_seed.sql)

Zakres:
- jedno konto administratora `admin / admin`
- wszystkie zatwierdzone marki
- wszystkie zatwierdzone modele

### 9.2 Seed demonstracyjny

Plik:
- [docker/db/seeds/002_demo_seed.sql](docker/db/seeds/002_demo_seed.sql)

Zakres:
- pełny stan demonstracyjny aplikacji,
- użytkownicy,
- pojazdy,
- posty,
- komentarze,
- ogłoszenia,
- powiadomienia,
- zgłoszenia,
- relacje z panelem administratora.

### 9.3 Konta testowe

Lista kont:
- [TEST_ACCOUNTS.md](TEST_ACCOUNTS.md)

Hasła:
- administrator: `admin`
- zwykli użytkownicy: `password`

## 10. Testy

### 10.1 Testy jednostkowe

Pliki:
- [tests/Unit/UserRepositoryTest.php](tests/Unit/UserRepositoryTest.php)
- [tests/Unit/ReportsRepositoryTest.php](tests/Unit/ReportsRepositoryTest.php)

### 10.2 Test integracyjny / smoke test

Plik:
- [tests/security_smoke.sh](tests/security_smoke.sh)

### 10.3 Zakres testów

Testy obejmują m.in.:
- zapis audytowy nieudanych prób logowania,
- odrzucenie niepoprawnego zgłoszenia własnego profilu,
- obecność nagłówków bezpieczeństwa,
- brak dostępu gościa do `/admin`,
- `404`,
- odrzucenie `POST /login` bez CSRF.

### 10.4 Sposób uruchomienia

PHPUnit:

```bash
docker compose exec php php /app/tests/phpunit/phpunit.phar -c /app/phpunit.xml
```

Smoke test:

```bash
bash tests/security_smoke.sh
```

## 11. Scenariusz testowy

### 11.1 Logowanie i role

1. uruchomić aplikację,
2. zainicjalizować bazę,
3. załadować `002_demo_seed.sql`,
4. zalogować się jako `admin / admin`,
5. zalogować się jako zwykły użytkownik, np. `alexrivera / password`.

### 11.2 Test modułu pojazdów

1. przejść do dashboardu,
2. wejść w `My Cars`,
3. dodać lub edytować pojazd,
4. przejść do `Vehicle Details`,
5. sprawdzić tankowania, serwis, przeglądy i polisy.

### 11.3 Test community

1. dodać post,
2. edytować post,
3. skomentować post,
4. polubić i zapisać post,
5. zgłosić post lub komentarz.

### 11.4 Test marketplace

1. dodać ogłoszenie,
2. edytować ogłoszenie,
3. zapisać ogłoszenie,
4. zgłosić ogłoszenie,
5. wejść w szczegóły ogłoszenia.

### 11.5 Test panelu administratora

1. otworzyć katalog użytkowników,
2. sprawdzić blokady i ostrzeżenia,
3. przejść do zakładki samochody,
4. zatwierdzić lub odrzucić pojazd,
5. przejść do zgłoszeń,
6. obsłużyć zgłoszoną treść.

### 11.6 Test błędów i bezpieczeństwa

1. wejść na nieistniejącą trasę,
2. sprawdzić `404`,
3. uruchomić smoke test,
4. sprawdzić wylogowanie,
5. sprawdzić odrzucenie formularza bez CSRF.

## 12. Screenshoty

Zrzuty pokazują w większości tylko ogólne widoki aplikacji, aby zobaczyć wszystkie funkcje zachęcam do uruchomienia aplikacji. 

### 12.1 Logowanie

![desktop-login](docs/screenshots/desktop-login.png)

![mobile-login](docs/screenshots/mobile-login.png)

### 12.2 Rejestracja

![desktop-register](docs/screenshots/desktop-register.png)

![mobile-register](docs/screenshots/mobile-register.png)

### 12.3 Dashboard

![desktop-dashboard-1](docs/screenshots/desktop-dashboard-1.png)

![desktop-dashboard-2](docs/screenshots/desktop-dashboard-2.png)

![mobile-dashboard-1](docs/screenshots/mobile-dashboard-1.png)

![mobile-dashboard-2](docs/screenshots/mobile-dashboard-2.png)

### 12.4 My Cars

![desktop-my-cars-1](docs/screenshots/desktop-my-cars-1.png)

![desktop-my-cars-2](docs/screenshots/desktop-my-cars-2.png)

![desktop-my-cars-modal-1](docs/screenshots/desktop-my-cars-modal-1.png)

![mobile-my_cars-1](docs/screenshots/mobile-my_cars-1.png)

![mobile-my_cars-2](docs/screenshots/mobile-my_cars-2.png)

### 12.5 Vehicle Details

![desktop-vehicle-details-1](docs/screenshots/desktop-vehicle-details-1.png)

![desktop-vehicle-details-2](docs/screenshots/desktop-vehicle-details-2.png)

![desktop-vehicle-details-3](docs/screenshots/desktop-vehicle-details-3.png)

![desktop-vehicle-details-modal-1](docs/screenshots/desktop-vehicle-details-modal-1.png)

![desktop-vehicle-details-modeal-2](docs/screenshots/desktop-vehicle-details-modeal-2.png)

![mobile-vehicle-details-1](docs/screenshots/mobile-vehicle-details-1.png)

![mobile-vehicle-details-2](docs/screenshots/mobile-vehicle-details-2.png)

### 12.6 Marketplace

![desktop-marketplace-1](docs/screenshots/desktop-marketplace-1.png)

![desktop-marketplace-2](docs/screenshots/desktop-marketplace-2.png)

![desktop-marketplace-3](docs/screenshots/desktop-marketplace-3.png)

![desktop-marketplace-4](docs/screenshots/desktop-marketplace-4.png)

![desktop-marketplace-modal-1](docs/screenshots/desktop-marketplace-modal-1.png)

![desktop-marketplace-modal-2](docs/screenshots/desktop-marketplace-modal-2.png)

![mobile-marketplace-1](docs/screenshots/mobile-marketplace-1.png)

![mobile-marketplace-2](docs/screenshots/mobile-marketplace-2.png)

### 12.7 Community

![desktop-community-1](docs/screenshots/desktop-community-1.png)

![desktop-community-2](docs/screenshots/desktop-community-2.png)

![desktop-community-3](docs/screenshots/desktop-community-3.png)

![desktop-community-modal-1](docs/screenshots/desktop-community-modal-1.png)

![desktop-community-modal-2](docs/screenshots/desktop-community-modal-2.png)

![mobile-community-1](docs/screenshots/mobile-community-1.png)

![mobile-community-2](docs/screenshots/mobile-community-2.png)

### 12.8 Notifications

![desktop-notifications](docs/screenshots/desktop-notifications.png)

![mobile-notifications](docs/screenshots/mobile-notifications.png)

### 12.9 Profile

![desktop-profile-my](docs/screenshots/desktop-profile-my.png)

![desktop-profile-other](docs/screenshots/desktop-profile-other.png)

![mobile-profile-1](docs/screenshots/mobile-profile-1.png)

### 12.10 Settings

![desktop-settings-1](docs/screenshots/desktop-settings-1.png)

![desktop-settings-2](docs/screenshots/desktop-settings-2.png)

![desktop-setting-3](docs/screenshots/desktop-setting-3.png)

![mobile-settings-1](docs/screenshots/mobile-settings-1.png)

![mobile-settings-2](docs/screenshots/mobile-settings-2.png)

### 12.11 Administration

![desktop-admin-users-1](docs/screenshots/desktop-admin-users-1.png)

![desktop-admin-users-2](docs/screenshots/desktop-admin-users-2.png)

![desktop-admin-users-3](docs/screenshots/desktop-admin-users-3.png)

![desktop-admin-cars-1](docs/screenshots/desktop-admin-cars-1.png)

![desktop-admin-cars-2](docs/screenshots/desktop-admin-cars-2.png)

![desktop-admin-reports-1](docs/screenshots/desktop-admin-reports-1.png)

![desktop-admin-reports-2](docs/screenshots/desktop-admin-reports-2.png)



## 13. Checklista wymagań

### 13.1 Wymagania technologiczne

- [x] Docker
- [x] Git
- [x] HTML5
- [x] CSS
- [x] JavaScript
- [x] FETCH API
- [x] PHP obiektowy
- [x] PostgreSQL
- [x] brak frameworka

### 13.2 Wymagania architektoniczne

- [x] architektura MVC / podział warstw
- [x] podział frontend / backend / baza
- [x] role użytkowników
- [x] zarządzanie użytkownikami

### 13.3 Wymagania bazodanowe

- [x] relacje `1:1`
- [x] relacje `1:N`
- [x] relacje `N:M`
- [x] minimum 2 widoki
- [x] minimum 1 funkcja
- [x] minimum 1 trigger
- [x] transakcje
- [x] eksport bazy do SQL
- [x] ERD

### 13.4 Wymagania bezpieczeństwa

- [x] logowanie
- [x] sesja
- [x] wylogowanie
- [x] autoryzacja i role
- [x] CSRF
- [x] prepared statements
- [x] hashowanie haseł
- [x] walidacja uploadów
- [x] rate limiting logowania
- [x] strony błędów `400/403/404/500`

### 13.5 Testy i dokumentacja

- [x] testy PHPUnit
- [x] test integracyjny / smoke test
- [x] README
- [x] diagram architektury
- [x] `.env.example`
- [x] screenshoty desktop
- [x] screenshoty mobile

## 14. Podsumowanie

### 14.1 Co zostało zrealizowane

Projekt `COCKPIT` realizuje wymagania funkcjonalne, bazodanowe i bezpieczeństwa dla aplikacji webowej, z pełnym backendem PHP i bazą PostgreSQL.

### 14.2 Najważniejsze elementy projektu

Najważniejsze elementy projektu to:
- rozbudowany moduł pojazdów,
- community,
- marketplace,
- panel administratora,
- relacyjna baza danych z widokami, funkcjami i triggerami,
- seedy startowe i demonstracyjne,
- podstawowy pakiet testów i dokumentacji technicznej.

### 14.3 Plany na przyszłość

- rozbudowa systemu member
- dodanie czatu między użytkownikami
- dodatkowe statusy pojazdu (zależnie czy np. samochód jest wystawiony)
- integracja zewnętrznej bazy plików
