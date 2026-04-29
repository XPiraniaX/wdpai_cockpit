# COCKPIT

COCKPIT to webowa aplikacja PHP do zarzadzania garazem i danymi o samochodach: przegladami, ubezpieczeniami, tankowaniami i historia serwisowa.

Ten README pelni role roboczej przypominajki. Ma pomagac szybko sprawdzic:
- co juz jest zrobione,
- co jest jeszcze tylko szkieletem,
- co robic dalej w sensownej kolejnosci.

## Aktualny stan projektu

Projekt ma juz przygotowany:
- prosty routing oparty o kontrolery PHP,
- layout aplikacji z nawigacja i headerem,
- osobny layout dla ekranow auth,
- widoki dla `dashboard`, `my-cars`, `marketplace`, `community`, `settings`, `login`, `register`,
- kontenery Docker dla `nginx`, `php`, `postgres`, `pgadmin`,
- inicjalizacje bazy danych z tabelami i przykladowymi danymi.

Na ten moment najwiecej pracy jest wykonane w warstwie:
- UI / layout,
- schemat bazy danych.

Najmniej pracy jest wykonane w warstwie:
- logika backendowa,
- polaczenie PHP z baza,
- autoryzacja i sesja,
- realne pobieranie danych do widokow.

## Co dziala

- routing adresow do kontrolerow,
- renderowanie widokow przez wspolny layout,
- podstawowa nawigacja miedzy ekranami,
- seed bazy z przykladowym uzytkownikiem, markami, modelami, pojazdami, przegladami, polisami, tankowaniami i serwisami,
- przygotowane rozszerzenia `pgsql` i `pdo_pgsql` w kontenerze PHP.

## Co jest jeszcze mockiem albo szkieletem

- `dashboard` korzysta obecnie z recznie wpisanych danych w kontrolerze zamiast z bazy,
- `login` i `register` sa tylko widokami bez obslugi formularzy,
- `my-cars`, `marketplace`, `community`, `settings` nie maja jeszcze realnej logiki biznesowej,
- header pokazuje sztywne dane uzytkownika,
- brak warstwy dostepu do danych: polaczenia z baza, repozytoriow, modeli domenowych,
- brak sesji i kontroli dostepu,
- brak CRUD-ow dla pojazdow i wpisow powiazanych,
- widac problemy z kodowaniem znakow w czesci plikow.

## Priorytet na teraz

Nie dokladac kolejnych stron i nie rozbudowywac dalej bazy bez potrzeby.

Najbardziej oplacalny krok to pierwszy dzialajacy vertical slice, czyli jeden fragment aplikacji spiety od bazy do UI.

Najlepszy kandydat:
- dashboard oparty o prawdziwe dane z PostgreSQL.

## Najblizszy plan prac

### Etap 1 - polaczenie aplikacji z baza

Do zrobienia:
- dodac konfiguracje polaczenia do PostgreSQL,
- przygotowac klase do obslugi `PDO`,
- oddzielic dostep do danych od kontrolerow.

Efekt:
- aplikacja bedzie mogla pobierac dane z rzeczywistej bazy zamiast z tablic testowych.

### Etap 2 - prawdziwy dashboard

Do zrobienia:
- pobrac liczbe pojazdow uzytkownika,
- pobrac najblizszy przeglad,
- pobrac najblizsze ubezpieczenie,
- pobrac ostatnie tankowanie,
- pobrac liste pojazdow do sekcji garazu.

Efekt:
- pierwszy widok zacznie byc realna funkcja produktu, a nie tylko mockiem.

### Etap 3 - logowanie i sesja

Do zrobienia:
- dodac formularz logowania,
- zweryfikowac uzytkownika z bazy,
- uruchomic `session`,
- zapisac zalogowanego uzytkownika,
- ograniczyc dostep do widokow aplikacji dla niezalogowanych.

Efekt:
- aplikacja zacznie miec podstawowy przeplyw uzytkownika.

### Etap 4 - pierwszy CRUD

Najlepiej zaczac od `my-cars`.

Do zrobienia:
- lista pojazdow uzytkownika,
- formularz dodawania pojazdu,
- podglad szczegolow pojazdu,
- edycja podstawowych danych,
- ewentualnie usuwanie lub archiwizacja.

Efekt:
- pierwszy pelny obszar aplikacji z realna wartoscia.

## Kolejnosc prac, ktorej warto sie trzymac

1. Backend i baza.
2. Dashboard na prawdziwych danych.
3. Logowanie i sesje.
4. `My Cars` jako pierwszy CRUD.
5. Dopiero potem dalsze widoki i funkcje poboczne.

## Struktura projektu

```text
.
|-- docker/
|   |-- db/
|   |   `-- init/init.sql
|   |-- nginx/
|   `-- php/
|-- public/
|   |-- assets/
|   |-- styles/
|   `-- views/
|       `-- partials/
|-- src/
|   `-- controllers/
|-- index.php
`-- Routing.php
```

## Kluczowe miejsca w repo

- `index.php` - punkt startowy aplikacji
- `Routing.php` - mapa tras i uruchamianie kontrolerow
- `src/controllers/` - obecna logika aplikacji
- `public/views/` - widoki
- `public/views/partials/` - layout, head, header, nawigacja
- `docker/db/init/init.sql` - schemat bazy i dane startowe
- `docker-compose.yaml` - lokalne uruchomienie uslug

## Baza danych

Obecny schemat obejmuje:
- `users`,
- `car_brands`,
- `car_models`,
- `vehicles`,
- `vehicle_images`,
- `technical_inspections`,
- `insurance_policies`,
- `fuel_logs`,
- `service_records`.

To wystarcza, zeby postawic pierwszy dzialajacy dashboard i pierwszy CRUD dla pojazdow.

Na teraz nie trzeba dodawac wielu nowych tabel. Bardziej brakuje wykorzystania tych, ktore juz sa.

## Dane startowe

Seed zawiera:
- 1 uzytkownika,
- 3 marki,
- 3 modele,
- 3 pojazdy,
- przykladowe przeglady,
- przykladowe ubezpieczenia,
- przykladowe tankowania,
- przykladowe wpisy serwisowe.

Dzieki temu mozna od razu budowac odczyt danych bez wymyslania tymczasowych struktur.

## Jak uruchomic

Przykladowy lokalny setup:

```bash
docker-compose up --build
```

Po uruchomieniu:
- aplikacja: `http://localhost:8080`
- pgAdmin: `http://localhost:5050`

## Techniczny dlug do ogarniecia po drodze

- dodac warstwe `Repository` lub podobna warstwe danych,
- wydzielic konfiguracje aplikacji i bazy,
- poprawic kodowanie znakow do spojnego UTF-8,
- przemyslec autoloading lepszy niz reczne ladowanie samych kontrolerow,
- dodac podstawowa walidacje formularzy,
- dodac sensowna obsluge bledow i komunikaty dla uzytkownika.

## Najblizszy konkretny cel

Cel na teraz:

"Po odpaleniu aplikacji dashboard ma pokazac prawdziwe dane uzytkownika z PostgreSQL zamiast wartosci wpisanych na sztywno."

Jesli nie wiadomo, co robic dalej, wracamy do tego celu i sprawdzamy, co jeszcze blokuje jego realizacje.
