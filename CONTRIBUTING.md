# Wprowadzanie zmian

AlkoRater pozostaje statyczną aplikacją HTML, CSS i JavaScript bez zależności uruchomieniowych, kont i backendu. Zmiany interfejsu powinny wynikać z [DESIGN.md](DESIGN.md). Zasady trwałości i migracji opisuje [DATA_AND_PWA_PL.md](docs/DATA_AND_PWA_PL.md).

## Środowisko i sprawdzenie zmian

Użyj Node.js zgodnego z `package.json`: `^22.22.2 || ^24.15.0 || >=26.0.0`. Przy tych pracach użyto `24.20.0`, a CI korzysta z linii 24.

```bash
npm ci
npm run dev
```

Adres lokalny: `http://127.0.0.1:4173/AlkoRater/`. Nie używaj `file://`. Serwer nasłuchuje tylko lokalnie i nie udostępnia całego repozytorium. Service worker może nadal zwracać zainstalowaną wcześniej wersję, mimo nagłówka `no-store`. Do pracy nad kodem używaj odizolowanego profilu; testy instalacji i aktualizacji przeprowadzaj z włączonym service workerem.

Przed pull requestem:

```bash
npm test
npm run lint
npm run format:check
npm run build
npx playwright install chromium webkit firefox
npm run test:e2e -- --project=chromium
```

Przy zmianach interfejsu, zapisu lub PWA uruchom też pełną macierz przez `npm run test:e2e`. Projekty to `chromium`, `chromium-desktop`, `webkit` i `firefox`. Testy uruchamiają własny serwer na porcie 4175. WebKit z profilem iPhone'a jest emulacją, nie dowodem testu na iOS. W opisie zmian podaj rzeczywiście uruchomione projekty, system oraz niewykonane testy. Nie dopisuj deklaracji zgodności WCAG wyłącznie na podstawie automatycznego skanu.

`npm run format` formatuje pliki JS i CSS w `src/`; nie formatuje całego repozytorium. Nie używaj go do dołączania niezwiązanych zmian do pull requestu. Zatrzymaj `dev` przed `npm run preview`, bo oba domyślnie używają portu 4173. Podgląd wymaga wcześniejszego `npm run build`.

## Kontrakt katalogu

| Plik              | Stałe źródło |
| ----------------- | ------------ |
| `data/piwa.json`  | `beer`       |
| `data/wodki.json` | `vodka`      |
| `data/wina.json`  | `wine`       |

- Każda pozycja wymaga niepustej nazwy i stałego `id`, unikatowego w swoim źródle. Zachowuj istniejący typ i wartość ID. Nie numeruj rekordów ponownie po sortowaniu.
- Tożsamość produktu to źródło plus opublikowane ID, np. `beer:18` albo `vodka:vodka-66`. Nie wyliczaj jej z nazwy ani pozycji w tablicy. Nazwy mogą się powtarzać.
- Opublikowanego ID nie zmieniaj i nie używaj ponownie dla innego produktu, także po usunięciu pozycji. Przeniesienie produktu do innego źródła zmienia tożsamość i wymaga zaplanowanej migracji.
- Marka, kraj, styl i zdjęcie mogą być nieznane. Zachowuj braki danych zamiast dopisywać domysły. Brak procentu alkoholu nie oznacza `0%`; poprawna znana wartość mieści się w zakresie 0-100.
- Nie nadpisuj poprawnych danych brakującymi polami podczas aktualizacji katalogu. Nie usuwaj historycznych ocen, których produktu nie ma już w katalogu.
- Dopuszczalne zdjęcia to lokalne zasoby aplikacji. Brak zdjęcia ma korzystać z istniejącego symbolu. Nie dodawaj adresów do zewnętrznych generatorów placeholderów, hotlinków ani pobierania obrazów w tle.
- Nie pobieraj masowo danych i zdjęć ze sklepów ani komercyjnych katalogów. Przy dodawaniu danych podaj w pull requeście źródło, podstawę użycia i zakres weryfikacji. Nie kopiuj materiałów bez ustalonych praw.

Normalizacja jest w `src/js/data/product.js`. Testuj stałość kluczy po zmianie kolejności, powtarzające się nazwy, brakujące pola i lokalny fallback zdjęcia. Liczby produktów w README i plikach `llms` aktualizuj tylko po zmianie rzeczywistego katalogu.

## Oceny, migracje i kopie

Wpis oceny ma własne `id`, `productId`, migawkę `item`, `stars`, `tag`, `note`, `date` i `revision`. ID wpisu i ID produktu to różne pola. Migawka zachowuje nazwę i znane dane produktu nawet po jego usunięciu z katalogu.

- IndexedDB v2 jest podstawowym magazynem. Mutacja odczytuje aktualny stan i zapisuje zmianę w jednej transakcji. Sukces w interfejsie może nastąpić dopiero po jej zakończeniu.
- Rewizja chroni przed nadpisaniem równoległej edycji. Konflikt ma zachować formularz i tekst użytkownika. Nie zastępuj całej bazy kopią stanu jednej karty.
- Dawny klucz localStorage `favorites` jest migrowany jednorazowo. Niepusta baza IndexedDB ma pierwszeństwo; oryginalna kopia pozostaje do odzyskania. Nie przywracaj usuniętych ocen przy każdym starcie.
- Tryb awaryjny localStorage jest jawnie wybrany i zapamiętany. Wymaga Web Locks do zapisu. Nie przełączaj magazynu po dowolnym błędzie transakcji.
- Stare migawki bez ID używają klucza legacy z kategorii, marki i nazwy. Nie zgaduj powiązania przy wielu kandydatach i nie kasuj nierozpoznanych wpisów.
- Błąd odczytu lub walidacji nie oznacza pustej kolekcji. Nie czyść bazy automatycznie. Zachowaj możliwość pobrania surowej kopii do ręcznego odzyskania.

Zwykła kopia ma `app: "AlkoRater"`, `schemaVersion: 1`, `exportedAt` i `records`. Import powyżej 5 MB wymaga dodatkowego potwierdzenia, nie ma asymetrycznego limitu odrzucającego własny eksport. Edytor ogranicza nowy tekst do 10 000 znaków, lecz walidacja zachowuje dłuższe historyczne notatki. Cały plik jest sprawdzany przed zapisem, a import tylko dodaje brakujące wpisy. Powtórzone ID wpisów wewnątrz pliku odrzucają cały import. Konflikty ID lub produktu z istniejącą kolekcją oraz powtórzone produkty o różnych ID wpisu są pomijane, nigdy nie zastępują istniejącej oceny. Eksport odzyskiwania ma inny format i nie jest obsługiwany przez zwykły import.

Zmiana formatu kopii, wersji bazy i wersji cache to trzy osobne decyzje. Każda wymaga testu zgodności z poprzednimi danymi. Nie uruchamiaj HTML ani adresów URL pochodzących z kopii. Do testów używaj wyłącznie sztucznych notatek, bez prywatnych eksportów.

## PWA i wdrożenie

`npm run build` odtwarza `dist/` na podstawie listy dozwolonych plików w `scripts/build.mjs`; nie bundluje kodu. Nie publikuj całego katalogu repozytorium, `node_modules`, testów ani raportów testowych.

Powłoka i katalog są niezmiennymi zestawami dla wersji service workera. Przy zmianie zasobu objętego precache zmień wersję cache w `service-worker.js`; nowy moduł lub zasób dodaj również do właściwej listy precache. Nie wprowadzaj niezależnego od wersji odświeżania JSON-ów w tle. Instalacja z brakującym zasobem ma się nie udać, pozostawiając poprzednią wersję do użycia.

Aktualizacja otwartej aplikacji wymaga zgody. Nie wymuszaj przeładowania pozostałych kart, nie aktywuj aktualizacji podczas otwartego formularza i zachowuj poprzedni zestaw dla żądań w toku. Czyszczenie własnego cache nie może usuwać danych ocen ani cache należących do innych aplikacji.

Testuj zarówno `/AlkoRater/`, jak i katalog główny. Pierwsza instalacja wymaga sieci; przed próbą offline poczekaj na jej zakończenie i przeładuj stronę online. Używaj oddzielnego profilu, nie danych użytkownika. Sprawdź też dwie karty, oczekującą aktualizację, nieudany precache i zachowanie niezapisanej notatki.

GitHub Pages ma ograniczenia hostingu statycznego, w tym brak dowolnej konfiguracji nagłówków HTTP. Istniejący workflow publikuje tylko `main`, po przejściu jego kontroli. Sam pull request ani gałąź robocza nie wdraża aplikacji. Nie rozszerzaj zakresu automatycznej publikacji, uprawnień lub sekretów bez osobnego uzgodnienia.

## Opis pull requestu i zgłoszenia

Podaj problem, zakres zmian i sposób odtworzenia. Dla UI dołącz zrzuty z testowymi danymi oraz rozmiar widoku. Wskaż wpływ na stare oceny, kopie, działanie offline i istniejące ID. Zapisz komendy testów, ich faktyczne wyniki i pozostałe ograniczenia, zamiast ogólnego stwierdzenia, że wszystko działa.

Przy problemie z danymi nie dołączaj publicznie własnej kopii JSON, notatek ani pełnego zrzutu pamięci przeglądarki. Przygotuj zanonimizowany przykład. Podaj przeglądarkę, system, adres uruchomienia, wersję aplikacji oraz tryb online/offline.

Zależności służą wyłącznie pracy nad projektem, ale ich podatności nadal mają znaczenie. Znane 7 zgłoszeń `high` w łańcuchu Stylelint pozostaje opisane w [raporcie prac](docs/ALKORATER_OVERHAUL_REPORT_PL.md). Nie stosuj bez sprawdzenia `npm audit fix --force`; oceniaj wpływ aktualizacji na konfigurację i testy. Wkład podlega licencji [Apache-2.0](LICENSE).
