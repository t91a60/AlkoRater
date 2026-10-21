# AlkoRater: raport przebudowy i weryfikacji

Data zamknięcia prac: 21 października 2026 r.

**Wynik: READY FOR CONTROLLED TESTING.** Zmiany są zaimplementowane i zapisane lokalnie na gałęzi `feature/alkorater-product-overhaul`. To kandydat do kontrolowanych testów, nie potwierdzenie gotowości stabilnego wydania ani publikacji.

- Stan wyjściowy: `e707724`, aplikacja `2.13.1`, service worker `v7.10`.
- Commit implementacji: `1e89abb` (`feat: overhaul local-first ratings, accessible UI and offline safety`).
- Kandydat: `2.14.0-rc.1`, service worker `v8.0-rc2`, format kopii `schemaVersion: 1`, IndexedDB v2.
- Nie wykonano pushu, merge do `main`, deploymentu, tagowania ani publikacji release'u. Publiczna strona może nadal przedstawiać wcześniejszą wersję.

## A. Cel, zakres i decyzja produktowa

AlkoRater pozostaje polskojęzycznym, osobistym katalogiem ocen i notatek dla dorosłych. Użytkownik wyszukuje produkt, zapisuje ocenę 1–5 i własny tekst, a później wraca do tych informacji. Aplikacja nie mierzy spożycia i nie ma zachęcać do regularnego picia.

Wykonano przebudowę produktu, interfejsu, zapisu lokalnego, wyszukiwania, działania offline, narzędzi i dokumentacji. Nie poprzestano na liście zaleceń.

| Decyzja                                            | Uzasadnienie i konsekwencja                                                               |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Statyczny HTML, CSS i natywne moduły ES            | Obecna skala nie uzasadnia frameworka, migracji ani zależności uruchomieniowych.          |
| Bez backendu, kont i automatycznej synchronizacji  | Oceny pozostają lokalne; przenoszenie odbywa się świadomie przez plik JSON.               |
| IndexedDB jako podstawowy magazyn                  | Bezpieczeństwo mutacji wymaga transakcji, nie zapisywania całej kopii stanu jednej karty. |
| Zachowana granatowo-bursztynowa tożsamość          | Uproszczono istniejący produkt, zamiast zastępować go szablonem lub nową marką.           |
| Braki katalogu pozostają brakami                   | Nie dopisano domniemanych marek, krajów, zdjęć ani danych producentów.                    |
| Brak serii dziennych, celebracji i zachęt do picia | Podsumowanie dotyczy zapisanych ocen, nie aktywności związanej ze spożyciem.              |

Nie dodano płatnych usług, analityki, reklam, zewnętrznych fontów, pobierania zdjęć ani usług generowania obrazów. Nie zmieniono logo. Katalog `.serena/`, nieśledzony już przed pracami, pozostawiono poza commitami produktu.

## B. Stan wyjściowy i rozwiązane problemy

Pełny zapis otwarcia prac: [BASELINE_PL.md](BASELINE_PL.md).

| Problem potwierdzony przed zmianami                                      | Rozwiązanie                                                                            |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Średnia 1–5 dzielona przez 10, progi kolorów 7/5                         | Pasek używa `średnia / 5`, a tekst jawnie pokazuje skalę.                              |
| Wybór i edycja produktu po nazwie                                        | Tożsamość to źródło katalogu i stałe ID; dwa produkty „Harnaś” działają niezależnie.   |
| Zapis całej kolekcji i ryzyko utraty równoległych zmian                  | Transakcyjne mutacje oraz porównanie ID wpisu i rewizji.                               |
| Ryzyko ponownej migracji usuniętych ocen                                 | Jednorazowa migracja z atomowym znacznikiem; stara kopia pozostaje do odzyskania.      |
| Klikalne `div`, odwrócone gwiazdki i niepełna obsługa fokusu             | Semantyczne przyciski, grupa radio 1–5, klawiatura i powrót fokusu.                    |
| Start zajęty dekoracyjnymi statystykami i seriami                        | Wyraźne wyszukiwanie, powrót do ocen, krótkie podsumowanie i kopia danych.             |
| Niekompletny precache mógł uchodzić za udaną instalację                  | Instalacja wymaga kompletnej powłoki i katalogu; błąd pozostawia wcześniejsze wydanie. |
| Zbyt szerokie czyszczenie cache i wymuszone odświeżanie kart             | Własna przestrzeń cache, ochrona trwających instalacji i aktualizacja za zgodą.        |
| Brak drogi odzyskania po utracie modułu lub uszkodzeniu katalogu         | Ekran odzyskiwania i naprawa cache bez kasowania ocen.                                 |
| Dokumentacja opisywała spożycie, `idb` i nieistniejący prompt instalacji | README, metadane i opis architektury odpowiadają rzeczywistej aplikacji.               |
| Skrypt standaryzujący mógł usuwać metadane i nadawać ID z kolejności     | Zastąpiono go audytem katalogu tylko do odczytu.                                       |

Przed zmianami przechodziło 35 testów w 7 plikach i lint. Kontrola formatowania zgłaszała 9 plików. Początkowy `npm ci` wykazał 20 zgłoszeń audytu zależności deweloperskich, w tym 2 `critical`.

## C. UX, interfejs i dostępność

Kierunek jest zapisany w [DESIGN.md](../DESIGN.md): tryb Operate, ENERGY 1 / RHYTHM 2 / MOTION 1. Celem jest odnalezienie produktu i wcześniejszej notatki, a nie ekspozycja dekoracyjnego dashboardu.

- **Start** ma jeden główny kierunek działania: wyszukanie produktu. Przy pustej kolekcji wyjaśnia następny krok; po zapisie pokazuje rzeczywistą liczbę ocen, średnią, ostatnie wpisy oraz najwyżej oceniony produkt.
- **Szukaj** używa czytelnej listy z nazwą, kategorią, znanymi metadanymi i dotychczasową oceną. Kategorie i ostatnie zapytania mają działanie, a nie dekoracyjny charakter.
- **Moje oceny** pozwala szukać także w treści notatki. Podgląd nie zastępuje pełnego tekstu. Filtrowanie po kategorii, edycja, usunięcie i cofnięcie pozostają oddzielnymi, jednoznacznymi czynnościami.
- Formularz ma etykiety, grupę wyboru oceny 1–5, widoczny błąd zapisu i ochronę niezapisanej treści. Tło jest nieaktywne podczas pracy w arkuszu. Escape nie odrzuca po cichu zmienionej notatki.
- Przywracany jest fokus elementu otwierającego formularz. Usunięto ukryty checkbox wykorzystywany do haptyki i przechwytujący fokus. Opcjonalne natywne wibracje nie wymagają takiego obejścia.
- Naprawiono wyścig szybkiego Escape z animacją otwierania. Ograniczenie ruchu jest respektowane w CSS i JS. Wskaźnik nawigacji animuje transformację, nie szerokość.

Granat `#071019` zachowuje istniejącą tożsamość. Bursztyn oznacza wybór i ważne działanie, nie „dobry” gust użytkownika. Systemowy font nie wymaga pobrania. Rozmycie ograniczono do nagłówka i dolnej nawigacji. Rytm odstępów grupuje treść, która przewija się zamiast być przycinana do wysokości telefonu. Istniejące lokalne ikony oznaczają konkretne czynności; gwiazdka jest tu skalą oceny, nie dekoracją.

Automatyczne testy obejmują start, wyszukiwanie, formularz, kolekcję i formularz wina. Sprawdzono też szerokość 320 px, długą notatkę bez spacji i tekst powiększony przez `font-size: 200%`. To nie jest pełny test systemowego zoomu, wszystkich ustawień dostępności ani fizycznej klawiatury ekranowej.

### Zrzuty rzeczywistej aplikacji

| Widok           | Przed                                              | Po                                               |
| --------------- | -------------------------------------------------- | ------------------------------------------------ |
| Pusty Start     | [before-home.png](screenshots/before-home.png)     | [after-home.png](screenshots/after-home.png)     |
| Wyszukiwanie    | [before-search.png](screenshots/before-search.png) | [after-search.png](screenshots/after-search.png) |
| Formularz oceny | [before-rating.png](screenshots/before-rating.png) | [after-rating.png](screenshots/after-rating.png) |

Pozostałe: [Start z ocenami](screenshots/after-home-collection.png), [Moje oceny](screenshots/after-collection.png), [desktop 1366 × 900](screenshots/after-desktop.png). Mobilne zrzuty mają 390 × 844. Są to lokalne sesje z danymi testowymi; nie przedstawiają prawdziwych ocen użytkowników. Zrzuty „przed” i „po” dokumentują widoki, nie identyczne zapytanie i identyczny stan danych. Ostatni zapis zrzutów zgłosił pustą listę błędów `pageerror`.

## D. Katalog, tożsamość i wyszukiwanie

Audyt objął wszystkie trzy pliki. Nie zmieniono istniejących identyfikatorów ani liczby produktów.

| Źródło                | Produkty | Nieznany styl/typ | Nieznana marka | Nieznany kraj | Bez rzeczywistego zdjęcia |
| --------------------- | -------: | ----------------: | -------------: | ------------: | ------------------------: |
| `beer`, `piwa.json`   |       57 |                 1 |             57 |            57 |                        57 |
| `vodka`, `wodki.json` |      184 |               184 |            184 |           184 |                       184 |
| `wine`, `wina.json`   |       95 |                95 |             95 |            95 |                        95 |
| Razem                 |      336 |               280 |            336 |           336 |                       336 |

Kategorie wynikają ze źródła pliku. Niezwykła pozycja w katalogu nie uprawnia do samodzielnego zgadywania jej poprawnej klasyfikacji. Marka zawarta w nazwie nie staje się automatycznie zweryfikowanym polem `brand`.

Potwierdzono wspólną nazwę „Harnaś” dla `beer:8` i `vodka:vodka-152`. Otwieranie, zapis, filtrowanie i edycja nie mieszają tych wpisów. ID nie wynika z nazwy ani aktualnej kolejności tablicy. Reguła utrzymania: opublikowanego ID nie wolno ponownie użyć dla innego produktu.

W Karmi Classic usunięto sprzeczne `type: "0.0%"`, zachowując istniejące `alcohol: "0.5%"`. Jest to usunięcie wewnętrznej sprzeczności, nie zewnętrzna weryfikacja specyfikacji producenta. Nie pobierano nowych danych handlowych. Historyczne odnośniki `dummyimage.com` nie są pobierane; brak zdjęcia daje lokalny, jawny symbol zastępczy.

Wyszukiwanie:

1. Normalizuje wielkość liter, polskie znaki i zapis procentu z przecinkiem lub kropką.
2. Preferuje dokładną nazwę, następnie prefiks i zgodność pozostałych znanych pól; rozstrzyga remisy stabilnie, niezależnie od kolejności katalogu.
3. Traktuje wiele słów łącznie, ogranicza liczbę wyników do 50 i koszt dopasowania przy literówkach.
4. Nie miesza słabych dopasowań przybliżonych z dostępnymi wynikami bezpośrednimi. Fuzzy jest drogą awaryjną, nie źródłem dodatkowego szumu.
5. Procenty dopasowuje jako wartości liczbowe; zapytanie `0.0%` nie oznacza dowolnej liczby zawierającej zero.

`npm run check:data` potwierdził 336 stałych kluczy i 0 błędów kontraktu. `node scripts/eval-search.mjs` sprawdza rzeczywistą implementację, nie jej kopię: 43/43 warunki. Testy syntetyczne marki i kraju sprawdzają obsługę przyszłych prawidłowych metadanych, a nie twierdzą, że obecny katalog je zawiera.

## E. Trwałość, migracje i kopie danych

Szczegółowa architektura i zasady przed implementacją: [DATA_AND_PWA_PL.md](DATA_AND_PWA_PL.md).

Ocena ma własne `id`, `productId`, migawkę `item`, `stars`, `tag`, `note`, `date` i `revision`. ID oceny nie jest ID produktu. Migawka zachowuje historyczny produkt także po jego usunięciu z katalogu. Dla starych migawek bez ID istnieje jawny klucz legacy; nie zgaduje się niejednoznacznego przypisania.

| Gwarancja implementacji w sprawdzonym zakresie                | Zabezpieczenie                                                                                  |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Dwie karty dodają różne oceny bez wzajemnego wymazania        | Odczyt aktualnych danych i zapis mutacji w jednej transakcji `readwrite`.                       |
| Stary formularz nie nadpisuje nowszego wpisu                  | Sprawdzenie ID oceny i rewizji, także po usunięciu i ponownym dodaniu produktu.                 |
| Udany `put` nie jest przedwczesnym sukcesem                   | Zmiana stanu interfejsu dopiero po `transaction.oncomplete`; abort pozostaje błędem.            |
| Usunięcie nie zależy od długości toastu                       | Natychmiastowa mutacja; Cofnij jest osobną operacją i nie zastępuje nowszego wpisu.             |
| Migracja nie wskrzesza usuniętej oceny                        | Atomowy znacznik migracji i pierwszeństwo niepustego IndexedDB.                                 |
| Błąd zapisu nie przełącza po cichu magazynu                   | Jawny, zapamiętany wybór backendu; brak automatycznego fallbacku po błędzie transakcji.         |
| localStorage nie udaje bezpiecznego zapisu bez synchronizacji | Zapisy w trybie awaryjnym wymagają Web Locks; brak obsługi oznacza blokadę zapisu z informacją. |
| Uszkodzona kolekcja nie staje się pustą                       | Walidacja blokuje mutacje i udostępnia surową kopię odzyskiwania.                               |
| Dawne liczbowe klucze IndexedDB nie tworzą duplikatów         | Aktualizacja i usuwanie respektują rzeczywiste klucze magazynu.                                 |

Oryginalny `localStorage.favorites` pozostaje do odzyskania po migracji. Nie jest stale synchronizowany z IndexedDB. Użytkownik może więc widzieć historyczną kopię podczas ręcznej analizy, ale aplikacja nie traktuje jej jako nowszego źródła prawdy.

### Eksport i import

Zwykła kopia JSON zawiera `app: "AlkoRater"`, `schemaVersion: 1`, `exportedAt` i `records`. Walidowany jest cały plik przed mutacją. Nieprawidłowy rekord lub powtórzone ID wpisu w pliku odrzuca całość. Import dodaje brakujące wpisy w jednej transakcji; konflikty z istniejącą kolekcją i powtórzone produkty o różnych ID pomija. Nie zastępuje ocen i nie jest mechanizmem synchronizacji nowszych zmian między urządzeniami.

Nowy tekst w edytorze ma limit 10 000 znaków. Starsza dłuższa notatka nie jest odrzucana ani skracana przy wczytaniu lub zmianie liczby gwiazdek. Kopia powyżej 5 MiB wymaga dodatkowego potwierdzenia, zamiast być nieimportowalnym własnym eksportem. Test round-trip obejmuje 300 długich polskich notatek przekraczających dawny limit rozmiaru. Walidacja kolekcji dopuszcza do 20 000 wpisów; pamięć urządzenia nadal jest praktycznym ograniczeniem.

Surowy eksport odzyskiwania ma inny format (`AlkoRater-recovery`). Zachowuje dostępne oryginalne wiersze i tekst legacy do ręcznej naprawy; zwykły import go nie przyjmuje. To nie jest automatyczna obietnica naprawy dowolnego uszkodzenia.

Kopie są czytelnym, nieszyfrowanym JSON-em i mogą zawierać prywatne notatki. Czyszczenie danych witryny, prywatny profil, ewikcja, utrata urządzenia lub zmiana domeny mogą pozbawić użytkownika lokalnej kolekcji. `navigator.storage.persist()` jest prośbą do przeglądarki, nie gwarancją. Kopia poza pamięcią witryny pozostaje konieczna.

## F. Offline, aktualizacje i odzyskiwanie PWA

Service worker zapisuje niezmienną powłokę i katalog dla jednego wydania. Kod i dane nie są odświeżane niezależnie w tle. Przestrzeń nazw obejmuje ścieżkę aplikacji, więc `/AlkoRater/` i katalog główny nie zakładają tego samego miejsca wdrożenia.

- Instalacja wymaga zakończenia obu zestawów pobrań. Niepełny precache odrzuca nowe wydanie, a nie usuwa poprzedniego.
- Po nieudanej instalacji oczekuje się na zakończenie operacji i usuwa wyłącznie jej własne niedokończone zestawy.
- Aktywacja zachowuje bieżącą oraz poprzednio aktywną generację. Nie usuwa obcych cache ani zestawu utworzonego później przez trwającą instalację nowszego wydania.
- Pierwsza instalacja nie wymusza przeładowania. W otwartej aplikacji aktualizacja wymaga zgody. Otwarty formularz lub druga karta blokują jej przyjęcie; zgoda nie odświeża pozostałych kart.
- Brak pliku powłoki daje ekran odzyskiwania działający bez modułów aplikacji. Uszkodzony katalog wskazuje tę samą drogę naprawy.
- Naprawa sprawdza rzeczywistą odpowiedź sieciową pliku workera i wymaga zamknięcia innych kart. Wyrejestrowuje własnego workera i usuwa znacznik aktywnego wydania, a następne otwarcie pobiera świeże pliki. Nie czyści IndexedDB ani localStorage z ocenami.

Przetestowano aktualizację z rzeczywistym kodem `e707724`, a nie tylko zmianą numeru bieżącego workera. Zachowano ID oceny, gwiazdki i notatkę. Osobne testy obejmują nakładanie instalacji wydań 2 i 3, odrzuconą aktualizację, brak modułu, uszkodzony katalog, odmowę naprawy bez sieci i ponowne użycie offline.

Pierwsza pełna instalacja nadal wymaga internetu i przeładowania online po gotowości workera. Przeglądarka może usunąć cache. Uszkodzonego lub nieobecnego zestawu nie da się naprawić bez sieci. Nie obiecuje się działania przy pierwszej wizycie offline.

Instalacja na iOS pozostaje ręczna przez Safari i „Dodaj do ekranu początkowego”. Aplikacja nie ma własnego przycisku `beforeinstallprompt`. Instalacja nie zapewnia backupu ani współdzielenia danych między profilami. Fizycznych scenariuszy instalacji iOS/Android nie potwierdzono.

## G. Inżynieria, bezpieczeństwo, metadane i utrzymanie

Dodano deterministyczny serwer statyczny i build oparty na liście dozwolonych zasobów. `npm run build` przygotowuje 59 plików produkcyjnych w `dist/`, bez bundlowania i transpilacji. Testy, dokumentacja, konfiguracja, `node_modules`, pliki ukryte i raporty przeglądarkowe nie trafiają do publikowanego zestawu. Serwer lokalny nasłuchuje na `127.0.0.1`, nie wystawia całego repozytorium i domyślnie używa `no-store`.

Zaktualizowano zależności narzędziowe, lockfile, konfigurację ESLint i Vitest oraz dodano Playwright i axe. Brak zależności uruchomieniowych pozostaje decyzją, nie pominiętym etapem migracji. Wymaganie Node.js to `^22.22.2 || ^24.15.0 || >=26.0.0`; rzeczywiście użyto `24.20.0` na Windows. Dopuszczenie wersji w `engines` nie oznacza testu każdej z nich.

Workflow CI ma uprawnienie odczytu, sprawdza lint, format, testy jednostkowe, katalog, build oraz Chromium. Akcje przypięto do zweryfikowanych SHA. Deployment istniejącego GitHub Pages przygotowuje `dist/` i jest ograniczony do `main`, także przy ręcznym uruchomieniu. Zmiana workflow nie jest jego wykonaniem; zdalnego CI ani wdrożenia dla tej gałęzi nie uruchamiano.

Teksty notatek i plików nie są wykonywane jako HTML. Walidacja kopii nie ufa podanemu `productId` ani dowolnym polom. Zdjęcia mogą pochodzić tylko z dozwolonych lokalnych ścieżek. CSP ogranicza skrypty i połączenia do własnego źródła, lecz pozostawia `style-src 'unsafe-inline'` dla istniejącego sposobu stylowania. To ograniczenie, nie deklaracja pełnego audytu bezpieczeństwa. GitHub Pages nie daje kodowi aplikacji dowolnej kontroli nagłówków HTTP.

Aktualny `npm audit --json` kończy się kodem 1: 7 zgłoszeń `high`, 0 `critical`. Dotyczy łańcucha `braces` → `micromatch` → `fast-glob`/`globby` → Stylelint i jego konfiguracji. Są to dotknięte pakiety w audycie, nie siedem niezależnych dowodów ataku na aplikację. Bazowy advisory to [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). Ryzyko obejmuje m.in. wyczerpanie stosu podczas przetwarzania złośliwych wzorców w środowisku deweloperskim. Pakiety nie trafiają do przeglądarki, ale problem pozostaje otwarty. Proponowany przez npm wymuszony downgrade do Stylelint 7.7.0 nie został zastosowany. `npm audit --omit=dev` zgłosił 0 podatności w swoim zakresie; nie jest to gwarancja braku innych zagrożeń.

Tytuł, opisy, Open Graph, manifest, `llms.txt` i `llms-full.txt` opisują katalog ocen, nie śledzenie spożycia. Canonical i sitemap wskazują rzeczywisty publiczny adres aplikacji. Prywatnych ocen nie przedstawia się jako publicznych stron produktów ani ocen społeczności. Plik `robots.txt` pod `/AlkoRater/` nie zastępuje domenowego `/robots.txt`.

Licencja `LICENSE` od początku repozytorium pozostaje Apache-2.0. Poprawiono błędne MIT w `package.json`, bez zmiany treści licencji projektu. Zachowano lokalne ikony i atrybucję ISC podzbioru Lucide.

## H. Wyniki testów i pomiary

### Bramka techniczna

| Kontrola                             | Rzeczywisty wynik                                                                                           |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Ostatni pełny `npm ci`               | Udany; 246 dodanych pakietów, 247 audytowanych w tym uruchomieniu.                                          |
| `npm test`                           | 159/159 testów, 13 plików.                                                                                  |
| `npm run test:e2e`                   | 96/96 wykonań: 24 scenariusze × 4 projekty, około 1,5 minuty.                                               |
| Testy po ostatniej korekcie CSS      | 8/8: pierwsze otwarcie/nawigacja oraz wąski ekran/200% w czterech projektach.                               |
| Uzupełniający przegląd kontrolek     | 12/12 sprawdzeń w izolowanym Chromium z włączonym ruchem; brak błędów i ostrzeżeń konsoli oraz `pageerror`. |
| `npm run lint`                       | ESLint i Stylelint: sukces.                                                                                 |
| `npm run format:check`               | Sukces dla JS/CSS w `src/`, zgodnie z zakresem skryptu.                                                     |
| `npm run check:data`                 | 336 stałych ID, 0 błędów kontraktu.                                                                         |
| `node scripts/eval-search.mjs`       | 43/43 warunki rzeczywistej wyszukiwarki.                                                                    |
| `npm run build`                      | Sukces, 59 dozwolonych plików produkcyjnych.                                                                |
| `git diff --check`, kontrola indeksu | Bez błędów białych znaków.                                                                                  |
| `npm audit --json`                   | Kod 1, 7 `high` w narzędziach; otwarte ryzyko, nie sukces audytu.                                           |
| `npm audit --omit=dev`               | 0 zgłoszeń w zakresie zależności produkcyjnych.                                                             |

Pełne 159 testów i 96 wykonań obejmuje końcową zmianę filtrowania fuzzy oraz poprawkę fixture Firefox. Po pełnej macierzy usunięto tylko animowanie szerokości w CSS i uzupełniono dokumentację, pomiary oraz zrzuty. Dla tej korekty CSS ponownie wykonano 8 adekwatnych testów, lint i formatowanie. Nie przedstawia się ich jako kolejnych 96 scenariuszy.

Uzupełniający [control-check.json](measurements/control-check.json) dotyczy commita `1e89abb`: przycisku zamknięcia i tła arkusza, kategorii pustego wyszukiwania, ponowienia ostatniego zapytania, Home/End i strzałek gwiazdek, pętli Tab/Shift+Tab, ochrony tekstu, filtrów Wino/Wszystkie oraz błędnego i anulowanego importu. Pierwsza próba skryptu wysyłała klawisze przed ustawieniem początkowego fokusu arkusza i nie przeszła asercji. Po zsynchronizowaniu skryptu z fokusem przycisku Zamknij przeszło 12/12 sprawdzeń, bez zmiany kodu aplikacji. Jest to dodatkowa kontrola Chromium, nie nowa pełna macierz ani test sprzętowy.

Projekty: mobilny Chromium 390 × 844 z emulowanym dotykiem, desktop Chromium 1366 × 900, WebKit z profilem iPhone 13 oraz Firefox z widokiem 390 × 844. Są to izolowane konteksty Playwright, nie osobisty profil przeglądarki ani fizyczne telefony. W testach naprawy Firefox ustawienie Offline nie zawsze blokuje żądania workera; dodatkowo wymuszono HTTP 503 po stronie serwera fixture. To test odmowy sieci, nie dowód zachowania po odłączeniu telefonu od internetu.

### Pokrycie 24 scenariuszy przeglądarkowych

1. Pierwsze otwarcie, puste stany, przyciski Startu i klawiatura dolnej nawigacji.
2. Ocena, notatka, edycja, wyszukanie po notatce, średnia i zapis po reloadzie.
3. Dwa produkty o tej samej nazwie w różnych katalogach.
4. Kierunek gwiazdek, Space/strzałki, fokus i ochrona niezapisanego tekstu.
5. Natychmiastowe usunięcie, Cofnij i reload po usunięciu.
6. Pełna instalacja i zapis/edycja po ponownym otwarciu offline pod `/AlkoRater/`.
7. Równoległe karty: niezależne dodawanie i konflikt tej samej oceny.
8. Jednorazowa migracja localStorage bez odtworzenia usuniętego wpisu.
9. Uszkodzony zapis: blokada zapisu i pobranie kopii odzyskiwania.
10. Pobranie JSON, import do osobnego kontekstu, brak nadpisania i tekst przypominający HTML.
11. Starsza notatka ponad 10 000 znaków, zachowana po zmianie oceny i reloadzie.
12. Zapamiętany fallback localStorage po otwarciu drugiej karty.
13. Każda sugestia wyszukiwania, ostatnie zapytania i menu kontekstowe.
14. axe w głównych widokach oraz formularzu wina.
15. Szerokość 320 px, długi tekst, powiększenie tekstu do 200% i dostępność przycisku zapisu.
16. Symulowany błąd zapisu, zachowany formularz i skuteczne ponowienie.
17. Błąd jednego katalogu, dostęp do własnych ocen i skuteczne ponowienie pobrania.
18. Instalacja i użycie offline także w katalogu głównym.
19. Aktywacja wydania 2 bez usunięcia cache równolegle instalowanego wydania 3.
20. Naprawa brakującego modułu bez usunięcia ocen.
21. Naprawa uszkodzonego katalogu bez usunięcia ocen.
22. Aktualizacja, która nie przeładowuje innej karty, i zachowanie ocen offline.
23. Rzeczywista aktualizacja z aplikacji `2.13.1`, zachowująca ID, ocenę i notatkę.
24. Odrzucenie niepełnego precache przy dalszym działaniu poprzedniego wydania offline.

Testy jednostkowe i integracyjne uzupełniają to o rollback po udanym żądaniu zapisu, abort odczytu, liczbowe klucze IndexedDB, odmowę fallbacku bez Web Locks, konflikt po usunięciu i odtworzeniu produktu oraz duże kopie i porządkowanie nieudanej instalacji. Scenariusze są w [tests/e2e](../tests/e2e), a testy modułów obok implementacji.

### Pomiar zimnego otwarcia w przeglądarce

Źródło: [browser-lab.json](measurements/browser-lab.json). Porównano kod `e707724` i kandydata w pięciu nowych kontekstach na wersję: Chromium 156.0.8078.4, Windows, i7-11700KF, Node 24.20.0, 390 × 844, CPU slowdown 4×, localhost bez throttlingu sieci. Service workery zablokowano tylko na potrzeby porównywalnego zimnego startu; osobne testy PWA mają je włączone.

Ten pomiar poprzedza ostatnie usunięcie przejścia `width` w CSS. Po nim odświeżono zrzuty i adekwatne testy, nie powtarzano zakończonego eksperymentu zimnego startu. Nie jest to nowy pomiar finalnego commita.

| Mediana z 5 prób                   |                     Przed |       Po |
| ---------------------------------- | ------------------------: | -------: |
| First Contentful Paint             |                    164 ms |   124 ms |
| Gotowość widoku i pełnego katalogu |                  392,7 ms | 267,7 ms |
| DOMContentLoaded                   |                  187,2 ms | 189,1 ms |
| CLS obserwowanego otwarcia         |                         0 |        0 |
| LCP                                | Brak wiarygodnego odczytu |   328 ms |

W pliku bazowym `lcp: 0` oznacza brak wpisu obserwatora, nie rzeczywisty LCP równy zero. Nie wyciąga się z tego porównania LCP. To lokalny eksperyment laboratoryjny, nie pomiar telefonu, sieci mobilnej, INP ani danych terenowych. W pierwszej próbie bazowej wystąpił wyraźny odstający czas; zachowano wszystkie próbki zamiast wybierać najlepszą.

### Benchmark wyszukiwania

Źródło: [search-benchmark.json](measurements/search-benchmark.json). Obie implementacje dostały ten sam zamrożony, znormalizowany katalog bazowy 336 produktów; hash wejścia zapisano w JSON. 40 zapytań, 25 rund rozgrzewki, 5 batchy po 200 rund, czyli 40 000 mierzonych wywołań na implementację. Kandydat zmierzony ponownie po końcowej zmianie fuzzy przez eksportowaną funkcję `benchmarkSearch()`.

| Miara                                       |       Przed |          Po |
| ------------------------------------------- | ----------: | ----------: |
| Mediana średnich czasów batcha na zapytanie | 0,443416 ms | 0,178018 ms |
| Mediana wartości p95 z pięciu batchy        |   0,6208 ms |   0,2713 ms |

Nie są to czasy renderowania, opóźnienie klawiatury ani INP. Różnica liczby wyników może być zamierzona, ponieważ fuzzy nie dokleja już słabych trafień do bezpośrednich wyników. Jakość sprawdzają osobne asercje, nie sam czas. Plik zamrożonego wejścia i pomocniczy skrypt przechwytywania pozostały w katalogu tymczasowym sesji; repozytorium zawiera wyniki, hash i opis metody, nie kompletny samodzielny pakiet reprodukcji historycznego eksperymentu.

### Rozmiary źródeł

Źródło: [source-sizes.json](measurements/source-sizes.json). Rozmiary plików źródłowych, gzip liczony osobno dla każdego pliku i sumowany. To nie jest zapis transferu HTTP ani rozmiar bundla.

| Grupa                                    |  Bajty przed → po | Gzip przed → po |
| ---------------------------------------- | ----------------: | --------------: |
| CSS                                      |   72 264 → 22 427 |  14 120 → 4 623 |
| JS aplikacji wraz z workerem, bez testów | 117 783 → 129 609 | 37 995 → 43 381 |
| HTML                                     |   20 326 → 23 568 |   3 839 → 4 602 |
| Trzy katalogi JSON                       |   61 762 → 61 758 |   7 057 → 7 057 |

CSS jest znacznie mniejszy. JavaScript i HTML wzrosły z powodu zabezpieczeń zapisu, kopii, odzyskiwania i stanów błędu. Nie deklaruje się zmniejszenia każdej warstwy aplikacji.

### Migawka Lighthouse z niezależnego przeglądu

[lighthouse-summary.json](measurements/lighthouse-summary.json) zapisuje skrót zachowanego raportu, jego hash i listę kontroli ręcznych. Lighthouse 13.4.1, 20 października 2026 r., lokalny profil mobilny: Accessibility 100, Best Practices 100, SEO 100 i Agentic Browsing 100. Nie mierzono tu kategorii Performance. Migawka poprzedza ostatnie korekty wyszukiwania i przejścia CSS; nie jest ponownym skanem finalnego commita. Pełny plik raportu pozostał w katalogu tymczasowym sesji.

Wynik 100 nie oznacza zgodności WCAG ani zaliczenia 11 kontroli oznaczonych w raporcie jako ręczne. Testy axe również nie zastępują VoiceOver, TalkBack, NVDA i testu z użytkownikiem.

## I. Niezależne przeglądy i usunięte regresje

Przeglądy przeprowadzili niezależni agenci, oddzielnie od implementacji. Nie były to badania z użytkownikami ani audyt certyfikacyjny.

### Przegląd inżynierski

| Zgłoszenie                                                                              | Naprawa i dowód regresyjny                                                                                                            |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Stary edytor może nadpisać ocenę po usunięciu i ponownym dodaniu przy tej samej rewizji | Porównanie ID wpisu razem z rewizją; test `rejects a stale editor after the product was deleted and re-created at the same revision`. |
| Aktywacja usuwa cache nowszej, równoległej instalacji                                   | Porządkowanie tylko starszych własnych zestawów; test jednostkowy i rzeczywisty scenariusz wydań 2/3 w czterech projektach.           |
| Nowy limit notatki unieważnia historyczne dane                                          | Rozdzielenie limitu edytora od walidacji historycznej; test modułu i przeglądarkowy round-trip notatki 10 001 znaków.                 |
| Własny eksport powyżej 5 MiB nie daje się zaimportować                                  | Dodatkowe potwierdzenie dużego pliku zamiast asymetrycznego odrzucenia; test kopii 300 długich polskich notatek.                      |
| Błąd instalacji pozostawia własne osierocone cache                                      | Oczekiwanie na zakończenie obu precache i usuwanie wyłącznie własnych nieudanych zestawów; test odrzuconej instalacji.                |

Wszystkie pięć zgłoszeń naprawiono i objęto regresjami. Próba ponownego niezależnego potwierdzenia inżynierskiego napraw natrafiła na limit użycia agenta. Zastąpiono ją bezpośrednią weryfikacją regresji i pełną macierzą przeglądarkową; nie deklaruje się drugiej niezależnej akceptacji inżynierskiej.

### Przegląd UX i ponowne sprawdzenie

| Zgłoszenie                                              | Naprawa i wynik niezależnego rechecku                                                               |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Przycisk usuwania nie pokazuje ikony                    | Przywrócono lokalny glyph; widoczność potwierdzona, także w teście przeglądarkowym.                 |
| Ukryty checkbox haptyki przejmuje fokus                 | Usunięto obejście; potwierdzono Space → ArrowRight w gwiazdkach i powrót do elementu otwierającego. |
| Nazwa przycisku kolekcji pomija ważną kategorię/notatkę | Uzupełniono dostępne opisy; rozróżnienie produktów potwierdzone w drzewie dostępności.              |
| Przycisk zapisu wina nie ma wystarczającego kontrastu   | Poprawiono kolor tekstu na aktywnej powierzchni; recheck podał 10,23:1.                             |

Niezależny recheck potwierdził zamknięcie czterech zgłoszeń UX. Własne testy i zrzuty nie zastępują tego przeglądu, ale utrwalają jego najważniejsze regresje w repozytorium.

## J. Anti-Slop DURING: bramka dostarczenia

Tryb DURING wynika z wyboru użytkownika w tej sesji. Poniższy PASS dotyczy znanych, sprawdzonych stanów aplikacji w opisanej macierzy przeglądarek. Nie jest rozszerzeniem zakresu na nieprzetestowane urządzenia i czytniki ekranu.

### Hard Gate

- R-02 PASS: nowe teksty interfejsu i raport nie używają pauzy em; historyczne komentarze i zrzuty bazowe nie są nową treścią UI.
- R-03 PASS: test 320 px, długi tekst i 200% nie wykazał poziomego overflow; główne cele dotyku mają minimum 44 px.
- R-17 PASS: statystyki wynikają wyłącznie z rzeczywistych lokalnych ocen; liczby katalogu potwierdza audyt 336 pozycji.
- R-18 PASS: brak testimoniali, wymyślonych użytkowników i awatarów.
- R-23 PASS: zachowano istniejące logo i lokalne symbole; nie tworzono nieuzgodnionych zdjęć lub nowej marki.
- R-24 PASS: Start, Szukaj i Moje oceny prowadzą do zaimplementowanych widoków, co sprawdza test nawigacji.
- R-25 PASS: axe w głównych stanach bez zgłoszonych naruszeń; kontrast przycisku wina po niezależnej poprawce 10,23:1.
- R-26 PASS: działania mają zarejestrowane skutki; szczegółowa lista poniżej oraz 24 scenariusze w sekcji H.
- R-27 PASS: są osobne stany pustej kolekcji, ładowania, błędu katalogu, błędu zapisu i odzyskiwania; awarie mają drogę ponowienia lub eksportu.
- R-28 PASS: nie dodano szablonowego FAQ.
- R-32 PASS: testy klawiatury obejmują nawigację, gwiazdki, Escape, niezapisany tekst i powrót fokusu; fokus ma widoczną ramkę.
- R-33 PASS: funkcje zmieniono bezpośrednio w źródłach; pomocniczy skrypt sesji zapisuje pomiary i zrzuty, nie przepisuje CSS ani funkcji UI.
- R-34 PASS: nie ma niedziałającego przełącznika motywu; dostarczany jest zachowany, jeden motyw produktu.
- R-35 PASS: aplikację uruchomiono i zbudowano; przejścia kontrolowane w prawdziwych silnikach są zapisane poniżej, zrzuty nie wykazały błędów `pageerror`.
- R-36 PASS: pomiary mają pliki źródłowe i ograniczenia, audyt `high` nie jest ukryty, nie deklaruje się pełnej zgodności ani gotowości stabilnego release'u.
- R-37 PASS: kierunek i diale zapisano przed przebudową w DESIGN.md; zachowano zatwierdzoną tożsamość.
- R-38 PASS: katalog pochodzi z istniejących plików, a notatki na zrzutach są jawnie testowe; brakujące metadane pozostają nieznane.

### Purpose-Gate

- R-01 PASS: granat zachowuje markę, bursztyn wskazuje wybór i zapis; brak domyślnego niebiesko-fioletowego gradientu.
- R-04 PASS: gwiazdki oznaczają skalę, lupka wyszukiwanie, kosz usunięcie, a lokalny symbol zastępuje nieobecne zdjęcie; zachowano spójny istniejący zestaw ikon i licencję.
- R-06 PASS: font systemowy służy czytelności i pracy offline bez zewnętrznego pobrania; brak monospace jako dekoracyjnej stylistyki.
- R-07 PASS: jednolite tło nie udaje siatki technicznej ani diagramu.
- R-08 PASS: brak ozdobnych strzałek na każdym przycisku; sterowanie nawigacją ma rzeczywistą funkcję.
- R-09 PASS: kategorie, oceny i komunikaty offline oznaczają rzeczywiste dane lub stan, bez dekoracyjnych badge'y nad tytułem.
- R-10 PASS: rozmycie ograniczone do nagłówka i dolnej nawigacji rozdziela przewijaną treść.
- R-12 PASS: powierzchnie list nie unoszą się dzięki powielanym cieniom; hierarchię tworzą odstępy i kontrast powierzchni.
- R-13 PASS: brak stałych świecących obramowań i dekoracyjnych pulsów; akcent fokusu pomaga obsłudze.
- R-14 PASS: listy przedstawiają produkty, a ostatnie wpisy są skrótami do ocen; nie dodano siatki fikcyjnych funkcji marketingowych.
- R-19 PASS: ruch informuje o zmianie widoku/arkusza; bez animowanego wejścia każdego wiersza, celebracji i pętli, z obsługą reduced motion.
- R-22 PASS: nie dodano generycznych ilustracji; dokumentacja pokazuje rzeczywiste zrzuty aplikacji.

### Liveliness

- Diale PASS: ENERGY 1 / RHYTHM 2 / MOTION 1 są jawne w DESIGN.md.
- Zgodność diali PASS: spokojne listy i formularz, z odmienną hierarchią Startu, bez marketingowej choreografii.
- Punkt skupienia PASS: Start prowadzi do wyszukania, wyniki do produktu, a arkusz do wyboru i zapisu oceny; widać to na zrzutach.
- Odstępy PASS: rytm 8/12/16/24/32 px grupuje etykiety, pola i sekcje; treść nie jest wypełniaczem wysokości ekranu.
- Akcent PASS: bursztyn wspiera aktywny wybór i główne działanie, nie koloruje wszystkich powierzchni.
- Motyw tożsamości PASS: granat, bursztynowe oceny i dolna nawigacja kontynuują język tej aplikacji.
- Design Read PASS: zakres odczytano jako osobisty, mobile-first katalog ocen i notatek w trybie Operate; kierunek utrwalono w DESIGN.md.

### Craftsmanship i Quality Locks

- C-1 PASS: kolor, font, odstępy, listy, arkusz i ikony mają podane wyżej funkcjonalne uzasadnienie.
- C-2 PASS: istniejące działania mają skutki, a ograniczenia zapisu/aktualizacji są jawne, nie udają sukcesu.
- C-3 PASS: Start, wyszukiwanie, oceny i kopia danych odpowiadają zadaniom użytkownika; usunięto sekcje aktywności i zachęty do picia.
- C-4 PASS: sprawdzono puste, błędne, długie i offline stany oraz klawiaturę w opisanym zakresie; ograniczenia urządzeń są jawne w sekcji K.
- C-5 PASS: nie dodano nieudokumentowanych statystyk, referencji ani obietnic bezpieczeństwa.
- R-05 PASS: układ wynika z trzech zadań aplikacji, nie z szablonu hero/karty/opinie/FAQ.
- R-11 PASS: listy, pola, arkusz i nawigacja nie mają jednakowego dekoracyjnego kształtu kapsuły.
- R-15 PASS: „Szukaj produktu”, „Zapisz ocenę”, „Pobierz kopię JSON” i „Napraw pamięć offline” nazywają działanie.
- R-16 PASS: nowe teksty opisują funkcje i ograniczenia zamiast marketingowych superlatywów.
- R-20 PASS: zachowana paleta, skala ocen i kompozycja osobistego katalogu mają własny kontekst, bez generycznego dashboardu KPI.
- R-21 PASS: jeden ciemny motyw zachowuje istniejącą markę w uzgodnionym zakresie przebudowy; nie dodano pozornego wyboru motywu.
- R-29 PASS: granatowe powierzchnie, bursztynowy akcent i semantyczny kolor błędu tworzą ograniczoną paletę.
- R-30 PASS: ergonomia mobile-first nie została zamieniona w klon obcego produktu.
- R-31 PASS: powody głównych decyzji znajdują się w DESIGN.md oraz sekcjach A, C i J.

### Rejestr działań interfejsu

| Kontrolka / czynność                                      | Zaobserwowany skutek i dowód                                                                                                        |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Start / Szukaj / Moje oceny, strzałki i End               | Zmiana aktywnego panelu i fokusu; test pierwszego otwarcia.                                                                         |
| Szukaj produktu / Moje oceny / Wszystkie oceny na Starcie | Otwierają właściwy widok, również przy pustej kolekcji; test pierwszego otwarcia.                                                   |
| Najwyżej ocenione / ostatnia ocena                        | Otwierają właściwy formularz, Escape przywraca fokus; test oceny i notatki.                                                         |
| Pole wyszukiwania / wyczyszczenie                         | Lista zmienia się, a wyczyszczenie przywraca pusty widok wyszukiwania; test sugestii.                                               |
| Sugestie Piwo, Wódka, Wino, 0.0%, IPA, Lager              | Każda daje co najmniej jeden wynik; test każdej sugestii.                                                                           |
| Ostatnie zapytanie / jego usunięcie                       | Historia zapisuje użyte zapytanie, kliknięcie ponawia wyszukanie, a usunięcie usuwa je z listy; test historii i control-check.json. |
| Kategorie przy braku wyników                              | Każdy z trzech przycisków przywraca rzeczywiste wyniki właściwej kategorii; control-check.json.                                     |
| Wynik / menu kontekstowe Oceń / Escape w menu             | Otwiera ocenę konkretnego produktu; Escape usuwa menu; test menu i duplikatów nazw.                                                 |
| Gwiazdki klikane, Space i strzałki                        | Aktualizują wybraną wartość i stan radio, fokus pozostaje poprawny; test gwiazdek i niezależny recheck.                             |
| Zapis oceny / edycji                                      | Po zakończonej transakcji wpis i notatka są widoczne także po reloadzie; test zapisu.                                               |
| Escape ze zmienioną notatką                               | Odmowa odrzucenia zachowuje tekst i arkusz, zgoda go zamyka; test niezapisanych zmian.                                              |
| Zamknij / kliknięcie tła / Tab i Shift+Tab                | Zamykają niezmieniony arkusz, przycisk chroni zmieniony tekst, Tab nie wychodzi w nieaktywne tło; control-check.json.               |
| Filtry kolekcji / wyszukanie notatki                      | Widoczne tylko pasujące wpisy, bez mieszania identycznych nazw; test duplikatów i notatki.                                          |
| Kosz / Cofnij                                             | Usunięcie trwałe przed reloadem, cofnięcie przywraca osobną mutacją; test usuwania.                                                 |
| Kopia i przenoszenie danych                               | Natywne rozwinięcie udostępnia rzeczywiste przyciski kopii; test kopii JSON.                                                        |
| Pobierz kopię JSON / Wczytaj kopię                        | Plik pobiera się i odtwarza wpis w oddzielnym kontekście; konflikt nie nadpisuje oceny; test eksport/import.                        |
| Błędny plik / anulowanie importu                          | Błąd jest widoczny, przycisk pozostaje dostępny, anulowanie nie zmienia kolekcji; control-check.json.                               |
| Pobierz kopię odzyskiwania                                | Pobiera surowy, zachowany błędny tekst zamiast pustej kopii; test uszkodzonego zapisu.                                              |
| Spróbuj ponownie po błędzie katalogu                      | Po przywróceniu odpowiedzi wraca komplet 336 produktów; test awarii katalogu.                                                       |
| Ponowienie zapisu po błędzie                              | Formularz zachowuje treść; po usunięciu symulowanej awarii zapis jest trwały; test błędu zapisu.                                    |
| Aktualizacja i zamknięcie banera                          | Zgoda kontroluje aktywację; odrzucenie nie aktywuje wydania, druga karta nie jest przeładowana; testy modułu i aktualizacji.        |
| Napraw pamięć offline                                     | Odmawia bez sieci lub przy innych kartach, po poprawnej naprawie zachowuje oceny; testy brakującego modułu i katalogu.              |

Prośba o trwałą pamięć i opcjonalna wibracja zależą od API przeglądarki. Kod ma obsługę odmowy/braku wsparcia; nie zalicza się tego jako potwierdzonej trwałości ani odczuwalnej haptyki na fizycznym urządzeniu.

### Wynik detektora mechanicznego

Wykonany skan zgłosił trzy ostrzeżenia i kod wyjścia 1. Jedno było zasadne: niepotrzebne `width 180ms var(--ease-out)` w `.nav-pill`. Usunięto je, pozostawiając `transform`; lint, format i 8 testów po korekcie przeszły. Dwa pozostałe to fałszywe alarmy od literalnych ciągów `<img>` w nazwach testów `src/js/ui/__tests__/badges.test.js:11` i `:19`. Nie są obrazami UI, a sam plik jest wyłączony z builda. Nie usuwano użytecznych testów ani nie dodawano szerokich wyłączeń dla uciszenia skanera. Nie deklaruje się czystego wyniku pierwotnego skanu ani niewykonanego powtórnego pełnego skanu.

## K. Ograniczenia, ryzyka i prace pozostające do decyzji

| Priorytet                  | Pozostałe ograniczenie / ryzyko                                        | Następny krok i kryterium                                                                                                 |
| -------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Przed stabilnym wydaniem   | Brak fizycznego iPhone'a i zainstalowanej PWA iOS                      | Safari → instalacja → zapis → zamknięcie → ponowne otwarcie offline → restart telefonu; zachowane ID, gwiazdki i notatki. |
| Przed stabilnym wydaniem   | Brak fizycznego Androida i instalacji Chrome                           | Powtórzyć zapis, backup, offline i aktualizację w zainstalowanej aplikacji.                                               |
| Przed stabilnym wydaniem   | Brak rzeczywistej klawiatury ekranowej i safe-area w sprzęcie          | Mały ekran, orientacje, otwarta klawiatura, długi tekst; zapis i zamknięcie pozostają osiągalne.                          |
| Przed stabilnym wydaniem   | Brak VoiceOver, TalkBack i NVDA                                        | Odczyt etykiet, stanu gwiazdek, błędów, opisów produktów, porządek fokusu i powrót po zamknięciu.                         |
| Przed stabilnym wydaniem   | Brak długotrwałego testu presji pamięci, ewikcji i reinstalacji        | Najpierw kopia; sprawdzić odzyskanie danych i uczciwe komunikaty po usunięciu cache/danych przez system.                  |
| Przed stabilnym wydaniem   | Poprawki inżynierskie nie mają drugiego niezależnego sign-off          | Reviewer potwierdza pięć napraw z sekcji I na commicie implementacji lub jego następcy.                                   |
| Otwarte ryzyko narzędzi    | 7 `high` w łańcuchu Stylelint                                          | Sprawdzić poprawione wydanie zależności lub zgodną alternatywę; ponowić audit i lint bez wymuszonego downgrade'u.         |
| Trwała cecha architektury  | Brak synchronizacji i gwarancji zachowania pamięci                     | Użytkownik otrzymuje jasną informację i wykonuje kopie JSON; eksport/import nie zastępuje synchronizacji.                 |
| Trwałe ograniczenie danych | Nieznane marki/kraje/style i brak zdjęć                                | Uzupełniać tylko ze źródłem i prawem użycia, zachowując ID. Nie blokuje kontrolowanych testów.                            |
| Zakres pomiarów            | Localhost, emulacja, brak terenowego INP i porównywalnego bazowego LCP | Nie używać danych laboratoryjnych jako gwarancji wydajności telefonu; brak analityki nie jest pretekstem do jej dodania.  |
| Zakres dostarczenia        | Nie wykonano zdalnego CI ani publicznego wdrożenia                     | Osobna zgoda na push/PR, następnie sprawdzenie CI i przygotowanie kontrolowanego wdrożenia.                               |

Nie ma zgody na samodzielne dodanie synchronizacji, kont, backendu, analityki lub zewnętrznego katalogu w celu rozwiązania tych ograniczeń.

## L. Klasyfikacja wydania i przekazanie

**READY FOR CONTROLLED TESTING**, z powodzeniem lokalnej bramki technicznej i otwartymi ograniczeniami wymienionymi wyżej. Nie klasyfikuję kandydata jako stabilnego wydania produkcyjnego. Główne powody: brak testu zainstalowanych PWA na fizycznym iOS/Android, rzeczywistych technologii asystujących i drugiego niezależnego potwierdzenia poprawek inżynierskich. Ryzyko narzędzi Stylelint pozostaje jawne.

Warunki przed stabilnym wydaniem:

1. Reviewer odtwarza pięć regresji inżynierskich i potwierdza ich zamknięcie.
2. Zostaje wypełniona fizyczna macierz z sekcji K, z wersjami OS/przeglądarki i rzeczywistym wynikiem, także odmowy uprawnień i błędu sieci.
3. W osobnym profilu zostaje potwierdzony backup/restore rzeczywistego formatu, aktualizacja poprzedniej aplikacji i zachowanie niezapisanej notatki. Nie używa się prywatnych danych w publicznych artefaktach testowych.
4. Dla niezmienionego kandydata przechodzi CI po uzgodnionym pushu/PR. Przy dalszych zmianach kodu ponawiane są odpowiednie testy; każda nowa wersja zasobów precache wymaga nowej wersji cache.
5. Właściciel rozstrzyga otwarte ryzyko narzędzi, zatwierdza wydanie i osobno autoryzuje publikację. Bez tej decyzji nie wykonuje się deploymentu ani tagu stabilnego release'u.

Implementacja jest w `1e89abb`. Dokumentacja, zrzuty, pomiary i ten raport tworzą kolejny lokalny commit na tej samej gałęzi. Zawierający raport commit można wskazać przez `git log -1 -- docs/ALKORATER_OVERHAUL_REPORT_PL.md`. Brak zmian w danych użytkownika; `.serena/` nie jest częścią dostawy. `dist/`, `node_modules` i raporty narzędziowe pozostają poza commitami.

Przekazane dokumenty: [README](../README.md), [CONTRIBUTING](../CONTRIBUTING.md), [CHANGELOG](../CHANGELOG.md), [DESIGN](../DESIGN.md), [baseline](BASELINE_PL.md), [architektura danych i PWA](DATA_AND_PWA_PL.md), ten raport i podlinkowane dowody. Niczego nie wysłano do zdalnego repozytorium ani nie wdrożono.
