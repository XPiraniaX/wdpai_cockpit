# Test Accounts

Plik dotyczy `docker/db/seeds/002_demo_seed.sql`.

## Hasla

- `admin` dla konta administratora `admin`
- `password` dla wszystkich zwyklych kont uzytkownikow

## Konto administratora

### `admin`
- Email: `admin@cockpit.local`
- Haslo: `admin`
- Imie i nazwisko: `Panel Administratora`
- Pseudonim: `Admin1`
- Typ konta: `free`
- Rola: `admin`
- Zawartosc:
  - samochody: `1`
  - posty: `0`
  - komentarze: `0`
  - ogloszenia: `0`
  - powiadomienia: `1`

## Glowne konta demo

### `alexrivera`
- Email: `alex.rivera@example.com`
- Haslo: `password`
- Imie i nazwisko: `Alex Rivera`
- Pseudonim: `Alexio`
- Typ konta: `pro`
- Zawartosc:
  - samochody: `3`
  - posty: `18`
  - komentarze: `10`
  - ogloszenia: `5`
  - powiadomienia: `2`
  - zgloszenia przeciw kontu: `10`

### `martazero`
- Email: `marta.zero@example.com`
- Haslo: `password`
- Imie i nazwisko: `Marta Nowak`
- Pseudonim: `MartaZero`
- Typ konta: `free`
- Zawartosc:
  - samochody: `0`
  - posty: `17`
  - komentarze: `1`
  - ogloszenia: `5`
  - powiadomienia: `0`
  - zgloszenia przeciw kontu: `3`

### `kacperone`
- Email: `kacper.one@example.com`
- Haslo: `password`
- Imie i nazwisko: `Kacper Wojcik`
- Pseudonim: `KacperOne`
- Typ konta: `pro`
- Zawartosc:
  - samochody: `1`
  - posty: `18`
  - komentarze: `11`
  - ogloszenia: `4`
  - powiadomienia: `1`
  - zgloszenia przeciw kontu: `8`

### `lenatwo2`
- Email: `lena.two@example.com`
- Haslo: `password`
- Imie i nazwisko: `Lena Krawczyk`
- Pseudonim: `LenaTwo`
- Typ konta: `business`
- Zawartosc:
  - samochody: `6`
  - posty: `20`
  - komentarze: `4`
  - ogloszenia: `19`
  - powiadomienia: `29`
  - zgloszenia przeciw kontu: `2`

### `oskarfour`
- Email: `oskar.four@example.com`
- Haslo: `password`
- Imie i nazwisko: `Oskar Mazur`
- Pseudonim: `OskarFour`
- Typ konta: `pro`
- Zawartosc:
  - samochody: `4`
  - posty: `17`
  - komentarze: `14`
  - ogloszenia: `4`
  - powiadomienia: `4`
  - zgloszenia przeciw kontu: `6`

### `ninafive`
- Email: `nina.five@example.com`
- Haslo: `password`
- Imie i nazwisko: `Nina Zielinska`
- Pseudonim: `brak`
- Typ konta: `business`
- Zawartosc:
  - samochody: `5`
  - posty: `17`
  - komentarze: `2`
  - ogloszenia: `4`
  - powiadomienia: `0`
  - zgloszenia przeciw kontu: `3`

## Pozostale konta z demo seeda

W `002_demo_seed.sql` sa tez dodatkowe konta pomocnicze z haslem `password`, glownie do pokazania:
- relacji miedzy userami,
- pseudonimow i prywatnosci profilu,
- zgloszen,
- list i katalogow uzytkownikow,
- pustych stanow poczatkowych bez aut i bez postow.

Przykladowe loginy dodatkowe:
- `adam_malysz`
- `kamil_nowak`
- `julia_kowalska`
- `michal_zielinski`
- `natalia_wisniewska`
- `bartosz_wojcik`

## Uwagi

- Ten plik opisuje seed demo, nie minimalny seed startowy.
- `001_starting_seed.sql` tworzy tylko konto `admin / admin` oraz zatwierdzone marki i modele.
