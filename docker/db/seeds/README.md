# Seeds

## 001_starting_seed.sql

Minimalny stan startowy aplikacji:
- jedno konto administratora: `admin / admin`
- wszystkie zatwierdzone marki z live DB
- wszystkie zatwierdzone modele z live DB

Uruchomienie:

```bash
cmd /c "docker compose -p cockpit_verify exec -T db psql -U docker -d db < docker\db\seeds\001_starting_seed.sql"```
```

## 002_demo_seed.sql

Pelny seed demonstracyjny zrobiony jako snapshot aktualnej live DB.

Ten plik sluzy do pokazania:
- relacji miedzy userami,
- aut,
- postow,
- komentarzy,
- ogloszen,
- powiadomien,
- historii moderacji i relacji z adminem.

Logowanie w seedzie demo:
- administrator: `admin / admin`
- zwykli uzytkownicy: `password`

Uruchomienie:

```bash
cmd /c "docker compose -p cockpit_verify exec -T db psql -U docker -d db < docker\db\seeds\002_demo_seed.sql"```
```

## Wazne

- `init.sql` zawiera tylko schemat bazy: tabele, indeksy, widoki, funkcje i triggery.
- seedy zakladaja pusta baze po samym `init.sql`.
- nie odpalaj `001` i `002` jeden po drugim na tej samej bazie bez czyszczenia danych.
- `001` jest seedem minimalnym.
- `002` jest seedem pokazowym / demo.
