# AlkoRater

Osobisty katalog ocen i notatek o piwach, winach i wódkach. Polskojęzyczna aplikacja webowa dla dorosłych, bez konta, synchronizacji i własnego backendu. Nie służy do pomiaru ani śledzenia spożycia alkoholu.

[Otwórz aplikację](https://t91a60.github.io/AlkoRater/) · [Zgłoś problem](https://github.com/t91a60/AlkoRater/issues) · [Apache-2.0](LICENSE)

Wersja kandydująca w repozytorium: `2.14.0-rc.1`. Publiczna strona odzwierciedla ostatnie wdrożenie z `main`, niekoniecznie tę gałąź.

## Korzystanie z aplikacji

- **Start** pokazuje podsumowanie ocen, ostatnio zapisane produkty oraz sekcję kopii danych.
- **Szukaj** przeszukuje katalog po nazwie, marce, stylu, kategorii, kraju i zawartości alkoholu, o ile te dane są znane. Polskie znaki i wielkość liter nie muszą być zgodne. Otwórz wynik, wybierz ocenę od 1 do 5 i opcjonalnie dopisz notatkę.
- **Moje oceny** pozwala filtrować zapisane pozycje według kategorii i szukać po nazwie, marce oraz treści notatki. Wpis można edytować lub usunąć. Po usunięciu dostępne jest cofnięcie.

### Katalog

| Plik              | Kategoria | Liczba produktów |
| ----------------- | --------- | ---------------: |
| `data/piwa.json`  | Piwo      |               57 |
| `data/wodki.json` | Wódka     |              184 |
| `data/wina.json`  | Wino      |               95 |
| Razem             |           |              336 |

To lokalny, niepełny katalog, nie baza cen, dostępności ani ofert sklepów. Część pozycji nie ma marki, kraju lub stylu. Obecny zestaw nie zawiera rzeczywistych zdjęć produktów. Interfejs używa lokalnego symbolu zastępczego; historyczne adresy `dummyimage.com` w JSON-ach nie są pobierane.

### Zrzuty ekranu

Widoki wersji kandydującej:

Oceny i notatki na zrzutach są danymi testowymi z odizolowanego profilu, nie ocenami użytkowników.

| Start                                                                                           | Formularz oceny                                                                  |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| ![Start: podsumowanie i ostatnio zapisane produkty](docs/screenshots/after-home-collection.png) | ![Formularz z wyborem oceny i własną notatką](docs/screenshots/after-rating.png) |

Pozostałe widoki: [wyszukiwanie](docs/screenshots/after-search.png), [Moje oceny](docs/screenshots/after-collection.png), [Start przed zmianami](docs/screenshots/before-home.png).

## Prywatność i trwałość danych

Oceny i notatki są zapisywane w pamięci tej przeglądarki. Aplikacja nie wysyła ich na serwer, nie zawiera analityki ani reklam, nie pobiera zewnętrznych zdjęć ani fontów. Pierwsze pobranie i sprawdzanie aktualizacji wymagają połączenia z hostingiem GitHub Pages, który ma własne zasady przetwarzania ruchu.

Podstawowy zapis korzysta z natywnego IndexedDB, baza ma wersję 2. Dawny zapis z klucza `favorites` w localStorage jest migrowany jednorazowo; niepusta baza IndexedDB ma pierwszeństwo. Stara kopia pozostaje do odzyskania, nie jest dalej synchronizowana.

Przy niedostępnym IndexedDB może zostać wybrany i zapamiętany tryb awaryjny localStorage. Bez Web Locks bezpieczny zapis w tym trybie jest zablokowany. Błąd zwykłej transakcji nie powoduje cichego przełączenia na drugi magazyn ani zastąpienia danych pustą kolekcją.

Pamięć przeglądarki nie jest gwarantowanym archiwum. Czyszczenie danych witryny, tryb prywatny, zwolnienie miejsca przez przeglądarkę lub utrata urządzenia mogą usunąć wpisy. Inna przeglądarka, domena lub urządzenie nie otrzyma ich automatycznie. Prośba o trwałą pamięć (`navigator.storage.persist()`) też nie jest gwarancją. Rób kopie JSON.

## Kopia i przenoszenie ocen

Na ekranie **Start** rozwiń **Kopia i przenoszenie danych**:

1. **Pobierz kopię JSON** zapisuje plik ocen i notatek. Przechowuj go poza danymi witryny, w zaufanym miejscu. To czytelny, nieszyfrowany JSON, który może zawierać prywatne notatki.
2. Na drugim urządzeniu lub po utracie danych wybierz **Wczytaj kopię** i potwierdź import.

Obsługiwany format ma `app: "AlkoRater"`, `schemaVersion: 1`, `exportedAt` i `records`. Plik powyżej 5 MB wymaga dodatkowego potwierdzenia, ale aplikacja nie odrzuca własnej dużej kopii. Nowy tekst w edytorze ma limit 10 000 znaków; dłuższe notatki ze starszych wersji pozostają zachowane. Cały plik jest walidowany przed zapisem. Import dodaje brakujące wpisy; duplikaty i konflikty pomija. Nie zastępuje istniejących ocen, więc nie służy do synchronizacji nowszych zmian między urządzeniami.

Jeśli odczyt danych się nie powiedzie, nie czyść pamięci witryny. Użyj dostępnego wtedy przycisku **Pobierz kopię odzyskiwania**. To surowy zapis do ręcznej analizy i naprawy, w innym formacie niż zwykła kopia. Nie można go po prostu wczytać przez import. Aplikacja nie importuje automatycznie uszkodzonych danych.

Szczegóły: [dane, migracja i PWA](docs/DATA_AND_PWA_PL.md).

Powtórzone ID wpisów wewnątrz pliku oznaczają niejednoznaczną kopię i odrzucają cały import. Pomijanie duplikatów dotyczy konfliktów z już zapisaną kolekcją oraz powtórzonych produktów o różnych ID wpisu.

## Offline, instalacja i aktualizacje

Pierwsze uruchomienie wymaga internetu. Poczekaj na wczytanie pełnego katalogu i zakończenie instalacji service workera, a następnie przeładuj stronę jeszcze online. Na ekranie Start powinien pojawić się komunikat **Aplikacja obsługiwana przez pamięć offline**. Dopiero wtedy odłącz sieć i sprawdź ponowne otwarcie.

Service worker zapisuje powłokę aplikacji i katalog jako spójny zestaw dla danej wersji. Niekompletne pobranie odrzuca instalację nowej wersji. Brak połączenia podczas pierwszej wizyty lub usunięcie cache przez przeglądarkę może uniemożliwić uruchomienie offline.

Jeśli brakuje plików powłoki, aplikacja wyświetla ekran odzyskiwania zamiast pustej strony. Błąd katalogu udostępnia tę samą naprawę w komunikacie błędu. **Napraw pamięć offline** wymaga internetu i zamknięcia pozostałych kart. Ponownie rejestruje service workera i pobiera pliki aplikacji; nie usuwa IndexedDB ani localStorage z ocenami. Nie zastępuj tej operacji czyszczeniem danych witryny.

| Platforma               | Instalacja i ograniczenia                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| iPhone / iPad, Safari   | Użyj menu udostępniania i opcji **Dodaj do ekranu początkowego**. Instalacja jest ręczna.        |
| Android, Chrome / Edge  | Użyj opcji instalacji lub dodania do ekranu głównego w menu przeglądarki, jeśli jest dostępna.   |
| Komputer, Chrome / Edge | Instalacja zależy od przeglądarki. Można też korzystać ze zwykłej karty.                         |
| Inne przeglądarki       | Można korzystać ze strony; obsługa instalacji i pamięci offline zależy od silnika oraz ustawień. |

Aplikacja nie ma własnego przycisku instalacji opartego na `beforeinstallprompt`. Instalacja nie zapewnia kopii danych ani synchronizacji między ikoną PWA, profilami i przeglądarkami.

Przed odinstalowaniem PWA pobierz kopię. Zachowanie lokalnej pamięci po odinstalowaniu i ponownej instalacji zależy od systemu i przeglądarki.

W otwartej aplikacji nowa wersja czeka na zatwierdzenie w banerze aktualizacji. Najpierw zapisz lub zamknij formularz oceny i zamknij pozostałe karty AlkoRater. Aktualizacja nie wymusza przeładowania innych kart. Katalog nie jest podmieniany w tle niezależnie od wersji aplikacji.

## Uruchomienie lokalne

Kod aplikacji to HTML, CSS i natywne moduły JavaScript. Nie ma frameworka, biblioteki `idb` ani zależności uruchomieniowych. Node.js jest potrzebny do narzędzi deweloperskich.

Wymaganie z `package.json`: Node.js `^22.22.2 || ^24.15.0 || >=26.0.0`. Środowisko użyte przy tych pracach: Node.js `24.20.0`; CI używa linii 24. Nie oznacza to przetestowania każdej dopuszczonej wersji.

```bash
git clone https://github.com/t91a60/AlkoRater.git
cd AlkoRater
npm ci
npm run dev
```

Otwórz `http://127.0.0.1:4173/AlkoRater/`. Serwer udostępnia tylko pliki aplikacji, domyślnie z `Cache-Control: no-store`. Inny port: `npm run dev -- --port 4174`. Do pracy nad cache jest `npm run dev:cache`; działający service worker nadal może obsługiwać wcześniejszą wersję plików. Do zmian kodu używaj osobnego profilu, a instalację i aktualizacje testuj osobno.

Nie otwieraj `index.html` przez `file://`. Service worker wymaga bezpiecznego kontekstu: HTTPS albo lokalnego adresu obsługiwanego przez przeglądarkę, takiego jak `localhost` lub `127.0.0.1`. Dostarczony serwer nasłuchuje tylko na `127.0.0.1`, nie udostępnia aplikacji telefonowi w sieci LAN.

### Build i podgląd

Po zatrzymaniu serwera `dev`:

```bash
npm run build
npm run preview
```

`build` odtwarza `dist/` i kopiuje do niego dozwolone pliki produkcyjne. Nie bundluje ani nie transpiluje kodu. Nie publikuje testów, `node_modules`, konfiguracji ani dokumentacji repozytorium. `preview` udostępnia `dist/` pod tym samym adresem i domyślnym portem co `dev`.

## Testy i kontrola jakości

```bash
npm test
npm run check:data
npm run lint
npm run format:check
npm run build
npx playwright install chromium webkit firefox
npm run test:e2e -- --project=chromium
```

`npm test` uruchamia Vitest. Testy przeglądarkowe same uruchamiają serwer pod `http://127.0.0.1:4175/AlkoRater/`. Pełna macierz: `npm run test:e2e`, projekty `chromium` (mobilny), `chromium-desktop`, `webkit` (profil iPhone 13) i `firefox`. Na Linuksie instalacja przeglądarek może wymagać zależności systemowych; CI instaluje Chromium z `--with-deps`.

Scenariusze obejmują oceny i notatki, klawiaturę, kopie JSON, migrację, konflikty między kartami, błędy zapisu, offline i aktualizacje. WebKit z profilem telefonu nie jest fizycznym iPhone'em. Instalacja iOS, restart urządzenia oraz zachowanie pamięci na rzeczywistym telefonie wymagają osobnej weryfikacji. Automatyczne sprawdzenie dostępności nie zastępuje testu z czytnikiem ekranu.

`check:data` jest audytem tylko do odczytu: sprawdza stałe ID, zakres procentów i sprzeczne etykiety oraz raportuje nieznane pola. Nie przepisuje katalogu i nie pobiera danych z sieci. Zastępuje dawny `standardize-data.mjs`, który usuwał metadane i nadawał brakujące ID na podstawie kolejności.

Do ręcznego testu użyj oddzielnego profilu i testowych notatek. Sprawdź zapis po przeładowaniu, import bez nadpisania istniejącej oceny, konflikt dwóch kart i ponowne otwarcie offline. Nie czyść prawdziwych danych użytkownika w celu testowania cache.

Wyniki i ograniczenia weryfikacji: [raport prac](docs/ALKORATER_OVERHAUL_REPORT_PL.md). Znane nierozwiązane ryzyko narzędzi: 7 zgłoszeń `high` w deweloperskim łańcuchu zależności Stylelint. Te pakiety nie trafiają do aplikacji w przeglądarce, ale pozostają ryzykiem środowiska pracy. Nie jest to deklaracja braku innych zagrożeń.

## Struktura i wdrożenie

```text
data/                 lokalne katalogi produktów
src/js/app/           stan i stałe aplikacji
src/js/data/          identyfikacja produktów i repozytorium ocen
src/js/services/      zapis, kopie, wyszukiwanie i service worker
src/js/ui/            widoki oraz interakcje
src/css/              style
scripts/              serwer statyczny i przygotowanie dist/
tests/e2e/            testy przeglądarkowe
docs/                 decyzje, raport i zrzuty
service-worker.js     wersjonowane zestawy zasobów offline
manifest.json         metadane instalacji PWA
```

Istniejący workflow GitHub Pages publikuje `dist/` po pushu do `main` lub ręcznym uruchomieniu dla `main`, po lintowaniu, sprawdzeniu formatu, testach jednostkowych i buildzie. CI pull requestów dodatkowo uruchamia projekt Chromium. Gałąź robocza nie jest automatycznie wdrażana.

GitHub Pages udostępnia pliki statyczne pod `/AlkoRater/`, bez API i serwerowego magazynu ocen. Nagłówki HTTP i cache hostingu nie są dowolnie konfigurowalne przez kod aplikacji. `robots.txt` umieszczony pod `/AlkoRater/` nie zastępuje pliku `/robots.txt` domeny. Sitemap zawiera jedyny publiczny adres aplikacji, nie osobne strony produktów czy prywatne oceny.

Zasady zmian danych i przygotowania pull requestu: [CONTRIBUTING.md](CONTRIBUTING.md). Historia: [CHANGELOG.md](CHANGELOG.md). Licencja: [Apache License 2.0](LICENSE).
