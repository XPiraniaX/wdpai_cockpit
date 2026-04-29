# PROJECT VISION

Ten dokument opisuje docelowy kierunek rozwoju aplikacji COCKPIT.

Nie jest to specyfikacja koncowa. To roboczy opis tego:
- czym aplikacja ma byc,
- jakie problemy ma rozwiazywac,
- czego oczekiwac od glownych paneli,
- co powinno wejsc do MVP,
- jakie obiekty domenowe sa naprawde najwazniejsze.

Dokument ma pomagac podejmowac decyzje przy dalszym rozwoju projektu.

## 1. Glowna idea aplikacji

COCKPIT ma byc osobistym panelem kierowcy i wlasciciela samochodu.

Aplikacja ma laczyc w jednym miejscu:
- podstawowe informacje o pojazdach uzytkownika,
- terminy i przypomnienia,
- historie tankowan i kosztow,
- historie serwisowa,
- stan techniczny pojazdu,
- rzeczy do zrobienia przy aucie,
- podstawowe ustawienia konta i powiadomien.

Docelowo aplikacja nie ma byc tylko lista samochodow, ale centrum zarzadzania cala relacja uzytkownika z autem.

## 2. Typ uzytkownika

Glowne grupy docelowe:
- osoby prywatne posiadajace 1 lub kilka samochodow,
- pasjonaci motoryzacji,
- uzytkownicy, ktorzy chca kontrolowac koszty utrzymania auta,
- osoby chcace miec przeglady, ubezpieczenia i serwis w jednym miejscu.

Na teraz najwazniejszy jest pierwszy typ uzytkownika:
- wlasciciel 1-3 aut, ktory chce miec porzadek w danych, terminach i kosztach.

## 3. Glowna wartosc aplikacji

Uzytkownik po zalogowaniu powinien od razu widziec:
- co dzieje sie z jego samochodami,
- co wymaga uwagi,
- jakie sa najblizsze terminy,
- jakie byly ostatnie wydatki i aktywnosci,
- do jakich akcji powinien przejsc jednym kliknieciem.

To oznacza, ze aplikacja powinna byc:
- czytelna,
- szybka do przeskanowania wzrokiem,
- praktyczna,
- nastawiona na dane i akcje,
- zorganizowana wokol realnych potrzeb wlasciciela auta.

## 4. Priorytet produktowy na teraz

Na teraz rdzen produktu to:
- logowanie i rejestracja,
- nawigacja i header,
- dashboard,
- my cars,
- vehicle details,
- settings.

Community i marketplace sa dodatkami na pozniej. Moga byc sygnalizowane w projekcie, ale nie powinny teraz sterowac architektura aplikacji.

## 5. Oczekiwania wobec paneli i podstron

### Login

Cel:
- umozliwic bezpieczne wejscie do aplikacji.

Dane:
- email lub login,
- haslo,
- komunikaty bledu.

Akcje uzytkownika:
- logowanie,
- przejscie do rejestracji.

MVP:
- formularz logowania,
- walidacja,
- sesja,
- przekierowanie do dashboardu po sukcesie.

Pozniej:
- przypomnienie hasla,
- logowanie przez Google lub inne konto zewnetrzne.

### Register

Cel:
- umozliwic utworzenie nowego konta.

Dane:
- username,
- email,
- haslo,
- podstawowe dane profilu.

Akcje uzytkownika:
- rejestracja,
- przejscie do logowania.

MVP:
- formularz,
- walidacja,
- zapis do bazy,
- automatyczne logowanie albo przekierowanie do logowania.

Pozniej:
- potwierdzenie maila,
- rozbudowane ustawienia profilu przy rejestracji.

### Nawigacja i Header

Cel:
- zapewnic latwa orientacje w aplikacji i szybki dostep do glownych sekcji.

Dane:
- podglad aktualnej strony,
- podglad glownej sekcji i podstrony,
- logo aplikacji,
- nazwa uzytkownika,
- status membera lub planu,
- powiadomienia.

Akcje uzytkownika:
- przejscie po stronach,
- wejscie do ustawien,
- otwarcie powiadomien,
- otwarcie opcji konta.

MVP:
- aktywna nawigacja,
- breadcrumbs lub prosty podglad aktualnej sekcji,
- dane zalogowanego uzytkownika w headerze,
- podstawowy entry point do ustawien.

Pozniej:
- dropdown konta,
- centrum powiadomien,
- szybkie akcje globalne.

### Dashboard

Cel:
- pokazac najwazniejsze informacje po zalogowaniu i umozliwic szybkie przejscie do najczestszych akcji.

Dane:
- liczba pojazdow,
- najblizszy przeglad,
- najblizsze ubezpieczenie,
- ostatnie tankowanie,
- skrocona lista samochodow,
- najwazniejsze informacje wymagajace reakcji.

Akcje uzytkownika:
- szybka aktualizacja przegladu,
- szybka aktualizacja ubezpieczenia,
- szybkie dodanie tankowania,
- szybkie dodanie samochodu,
- szybkie wejscie w konkretny samochod z podstawowymi danymi.

MVP:
- dane pobierane z bazy,
- karty statystyk,
- lista samochodow,
- sensowne puste stany, gdy uzytkownik nie ma jeszcze danych,
- dashboard zorientowany na akcje, a nie tylko prezentacje.

Pozniej:
- alerty i przypomnienia,
- przekroj kosztow,
- aktywnosc z ostatnich dni.

### My Cars

Cel:
- byc glownym miejscem zarzadzania pojazdami uzytkownika.

Dane:
- jeden samochod wyswietlany jako glowny,
- przy nim aktualne statystyki i ostatnie informacje serwisowe,
- lista pozostalych pojazdow, jesli uzytkownik ma ich wiecej,
- widoczne miejsce do dodania nowego pojazdu.

Akcje uzytkownika:
- dodanie pojazdu,
- wejscie w konkretny pojazd,
- ustawienie glownego pojazdu,
- archiwizacja lub oznaczenie jako sprzedany.

MVP:
- lista pojazdow,
- formularz dodawania,
- oznaczenie jednego pojazdu jako glownego,
- widok szczegolow pojedynczego pojazdu.

Pozniej:
- galerie zdjec,
- sortowanie i filtrowanie,
- ulubione pojazdy,
- bardziej rozbudowany profil auta.

### Vehicle Details

Cel:
- pokazac pelny profil jednego samochodu i jego aktualny stan.

Dane:
- zdjecie dodane przez uzytkownika,
- pelna nazwa: marka, model, wersja,
- aktualny przebieg,
- przeglad,
- ubezpieczenie,
- ostatnie tankowanie,
- ostatni serwis: data, opis, cena,
- rzeczy do zrobienia: opis, przewidywana cena, priorytet,
- pelna historia stanu pojazdu: serwisy i rzeczy do zrobienia,
- rozwiniecie szczegolow technicznych: marka, model, rocznik, silnik, moc, srednie spalanie i inne istotne dane.

Akcje uzytkownika:
- dodanie wpisu serwisowego,
- dodanie wpisu do zrobienia,
- dodanie tankowania,
- aktualizacja przebiegu przez zwiekszenie,
- dodanie lub edycja ubezpieczenia,
- dodanie lub edycja przegladu,
- sprawdzenie szczegolow pojazdu,
- sprawdzenie historii pojazdu.

MVP:
- jedna strona szczegolow pojazdu z sekcjami danych,
- podstawowe dane techniczne,
- sekcja terminow,
- sekcja historii,
- sekcja rzeczy do zrobienia.

Pozniej:
- os czasu zmian,
- wykres kosztow dla konkretnego pojazdu,
- eksport historii pojazdu.

### Settings

Cel:
- dac uzytkownikowi kontrole nad kontem i preferencjami.

Dane:
- dane profilu,
- ustawienia konta,
- opcje powiadomien,
- ustawienia prywatnosci.

Akcje uzytkownika:
- edycja profilu,
- zmiana hasla,
- ustawienie preferencji,
- zarzadzanie powiadomieniami.

MVP:
- podstawowa edycja profilu,
- zmiana hasla,
- ustawienia podstawowych preferencji.

Pozniej:
- zarzadzanie planem konta,
- eksport danych,
- usuniecie konta.

## 6. Co wynika z tej wizji

Z opisu paneli wynika, ze aplikacja nie opiera sie tylko na `user` i `vehicle`.

Rdzen produktu musi obsluzyc:
- konto i sesje uzytkownika,
- wiele pojazdow przypisanych do uzytkownika,
- wybor pojazdu glownego,
- stan biezacy pojazdu,
- historie zdarzen zwiazanych z pojazdem,
- terminy i przypomnienia,
- wpisy "do zrobienia",
- podstawowe dane profilowe i ustawienia.

To oznacza, ze backend i baza powinny byc projektowane wokol realnych obiektow produktu, a nie tylko wokol ekranow.

## 7. Najwazniejsze obiekty domenowe

Na podstawie oczekiwan wobec paneli najwazniejsze obiekty domenowe to:
- `User`
- `UserSession`
- `UserProfile`
- `Notification`
- `Vehicle`
- `PrimaryVehicle`
- `VehicleDetails`
- `VehicleImage`
- `VehicleStatus`
- `Inspection`
- `InsurancePolicy`
- `FuelLog`
- `ServiceRecord`
- `MaintenanceTask`

Krotko, co one reprezentuja:
- `User` - konto aplikacyjne i tozsamosc uzytkownika.
- `UserSession` - zalogowanie i dostep do panelu.
- `UserProfile` - dane wyswietlane w headerze i ustawieniach.
- `Notification` - rzeczy, ktore wymagaja uwagi lub maja byc pokazane w headerze.
- `Vehicle` - glowny byt biznesowy aplikacji.
- `PrimaryVehicle` - wybrany samochod glowny w sekcji `my-cars`.
- `VehicleDetails` - pelny profil samochodu z danymi rozszerzonymi.
- `VehicleImage` - zdjecia dodawane do pojazdu.
- `VehicleStatus` - aktualny stan pojazdu widoczny w panelach.
- `Inspection` - przeglady i ich terminy.
- `InsurancePolicy` - ubezpieczenia i ich waznosc.
- `FuelLog` - historia tankowan i koszty.
- `ServiceRecord` - wykonane serwisy i naprawy.
- `MaintenanceTask` - rzeczy do zrobienia przy aucie wraz z priorytetem i szacowanym kosztem.

Jesli trzeba uproscic MVP, to absolutne minimum domenowe to:
- `User`
- `Vehicle`
- `Inspection`
- `InsurancePolicy`
- `FuelLog`
- `ServiceRecord`
- `MaintenanceTask`

## 8. MVP aplikacji

Za sensowne MVP mozna uznac wersje, w ktorej dziala:
- rejestracja i logowanie,
- sesja uzytkownika,
- header z danymi zalogowanego uzytkownika,
- dashboard z prawdziwymi danymi,
- lista pojazdow,
- wybor pojazdu glownego,
- widok szczegolow pojazdu,
- podstawowe wpisy: przeglad, ubezpieczenie, tankowanie, serwis, do zrobienia,
- podstawowe ustawienia konta.

Jesli to dziala, aplikacja zaczyna miec realna wartosc praktyczna.

## 9. Poza MVP

Rzeczy, ktore sa cenne, ale nie powinny teraz blokowac rdzenia:
- rozbudowany marketplace,
- rozbudowana spolecznosc,
- rekomendacje produktowe,
- integracje z API zewnetrznymi,
- rozbudowane statystyki i wykresy,
- powiadomienia push lub mailowe,
- poziomy kont premium z dodatkowymi funkcjami.

## 10. Zasady rozwoju projektu

Przy dalszym rozwoju warto trzymac sie kilku zasad:
- najpierw konczyc pionowe fragmenty funkcji, nie rozkladac szkielletow wszedzie naraz,
- nie budowac nowych widokow bez jasnego celu produktowego,
- nie dodawac nowych tabel bez konkretnej potrzeby z funkcji,
- preferowac dzialajace MVP nad szeroka, ale pusta strukture,
- pilnowac spojnosci danych miedzy backendem, baza i UI.

## 11. Najblizsza decyzja wykonawcza

Najblizszy sensowny krok:

"Zrobic dashboard oparty o prawdziwe dane z bazy, przygotowac logowanie i sesje, a potem rozwinac `my-cars` oraz `vehicle details` jako glowny rdzen aplikacji."

Jesli pojawia sie watpliwosc, co robic dalej, trzeba sprawdzic:
- czy to przybliza projekt do dzialajacego MVP,
- czy rozwija rdzen aplikacji,
- czy nie jest tylko kolejnym szkieletem bez logiki.


dobra to teraz poracujmy nad bazą, zaktualizuj baze pod moje aktualne oczekiwania wychodzące z opisu, mozesz podesłać mi diagram bazy do dbdiagram i potem powiem ci czy coś powinniśmy zmieniać czy jest git 