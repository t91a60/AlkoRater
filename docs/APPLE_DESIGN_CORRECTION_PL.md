# AlkoRater: korekta projektu

Data: 23 października 2026. Gałąź `design/apple-experience-correction`, baza `bd88528`.

## Wynik

Zaimplementowano Native Minimal, spokojną bibliotekę ocen. Nie zmieniono katalogu, rankingu, identyfikatorów, migracji, formatu kopii ani zasad zapisu. Nie dodano zależności. To kandydat do oceny wizualnej właściciela, nie zatwierdzenie wyglądu na fizycznym iPhonie. Nie wykonano pushu, publikacji ani wdrożenia.

## Dowody i kierunek

Przeanalizowano wszystkie trzy obrazy przesłane w rozmowie: Przegląd, Szukaj i puste Oceny. Obrazy pokazują za duży udział instrukcji i nawigacji względem zadania. Ich proporcje odpowiadają w przybliżeniu 393 × 852 CSS px, ale skala urządzenia i ustawienia tekstu nie są znane. Nie przedstawiamy tej emulacji jako dokładnego odtworzenia iPhone'a. Oryginały pozostają załącznikami rozmowy, nie zostały skopiowane do repozytorium.

- [Plan przed CSS i przeczytane HIG](DESIGN_CORRECTION_PLAN_PL.md).
- [Dwa kierunki, pięć stanów każdego](screenshots/correction/exploration/overview.png). HTML to jawnie nieinteraktywne prototypy kompozycji z testowymi ocenami, nie produkcyjna aplikacja.
- [Przed](screenshots/correction/before/overview.png), [po](screenshots/correction/after/overview.png).
- Indywidualne zrzuty: `screenshots/correction/before/`, `after/`, `qa/`.

Wybrano A: pełna szerokość wiersza pomaga rozróżniać nazwy, moc, typ i notatki. Odrzucono B: dwukolumnową półkę. Wszystkie 336 produktów nie mają zdjęć, więc półka zwiększa liczbę pudełek, a skraca wartościowe metadane. Wstępny wariant B ujawnił także nadmiernie wysokie elementy pomocnicze. Nie poprawiano go dekoracjami tylko po to, by uzasadnić wybór.

## Zmiany ekran po ekranie

| Obszar | Zmiana i uzasadnienie |
|---|---|
| Nagłówek | Tytuł 24 zamiast 34 px, minimum 76 zamiast 100 px. To orientacja, nie hero. Nieinteraktywny zielony `logo.png` usunięty z wnętrza ekranów; ikony instalacyjne zachowane. |
| Start pusty | Jeden komunikat, jedno zdanie i jedna akcja. Brak pustej sekcji ostatnich wpisów i drugiej konkurującej akcji. Kopia, preferencje i informacje pozostają dostępne w disclosure. |
| Start z ocenami | Ostatnie wpisy od razu, przed rzeczywistą liczbą i średnią. Brak intro dla powracających osób. Zachowane kategorie i najwyżej oceniony produkt z metadanymi. |
| Search | Pole przed kategoriami, bez akapitu instrukcji. Kompaktowe wiersze, drugorzędne skróty i historia. Wyczyść pojawia się tylko z tekstem. Ranking i debounce bez zmian. Enter kończy wpisywanie, czyszczenie wraca do sugestii, karty zachowują zapytanie i scroll. |
| Oceny | Zero danych: bez filtrów, sortowania i pola wyszukiwania. Z danymi: lista, wyszukiwanie notatek, kategorie, sortowanie ostatnie/najwyższe/nazwa. Sortuje kopię listy, nie zmienia kolejności repozytorium. |
| Nawigacja | Bez pigułki, cienia i rozmycia. Normalny układ flex rezerwuje miejsce pod treścią. Aktywny stan: kolor, ciężar i podkreślenie etykiety. Na szerokim ekranie pozostaje u góry. |
| Arkusz | Nazwa 22 zamiast 28 px, krótsze metadane, mniejsza skala gwiazd bez zmniejszania celów poniżej 44 px. Zachowano numer, ochronę zmian, gest, Escape, Back/Forward, pułapkę fokusu, osobną stopkę i keyboard avoidance. |
| Fokus | Przed ustawieniem `aria-hidden` na wychodzącym panelu fokus CTA przechodzi do nowej karty. Po usunięciu ostatniej oceny trafia do widocznej akcji, nie ukrytego pola. |
| Offline | Informacje techniczne przeniesione do disclosure. Nie pozostaje nieskończone „sprawdzanie gotowości”. Wersja SW zmieniona na `v8.2-collection-rc1`, test wersji dostosowany. Mechanizm aktualizacji bez zmian. |

## System wizualny

| Rola | Jasny | Ciemny |
|---|---|---|
| Tło | `#f5f5f3` | `#18191b` |
| Grupa / arkusz | `#ffffff` | `#232426` |
| Pole | `#edeeeb` | `#2e3032` |
| Wyższa powierzchnia | `#dfe1dc` | `#3b3e3f` |
| Tekst | `#242522` | `#f3f2ed` |
| Pomocniczy / metadane | `#62645f` | `#b7b9b3` |
| Akcent / fokus / ocena | `#805009` | `#e9b45e` |
| Akcja | `#e9b45e` z `#21190c` | ta sama para |
| Separator | `#d7d9d3` | `#3c3e3d` |
| Obramowanie kontrolki | `#7d8078` | `#858981` |

Powody: grafit oddziela warstwy bez granatowej dominanty; bursztyn wskazuje zapis i subiektywną skalę; systemowy krój oszczędza pobieranie i wspiera familiarność. Typografia w rem: 24/22/20/17/15/13 px przy bazie 16 px. Promienie: kontrolki 10, grupy 14, arkusz 22 px. Odstępy 8/12/16/20/24/32. Listy mają separatory zamiast cieni; cień pozostaje na rzeczywiście nakładanym arkuszu i menu. Rozmycie tylko istniejącego menu kontekstowego, zmniejszone do 12 px. Bez nowych animacji. ENERGY 1 / RHYTHM 2 / MOTION 1.

Zmierzono 24 pary tekst/powierzchnia w obu wyglądach: minimalnie **4,54494:1**. Szczegóły: [verification.json](screenshots/correction/qa/verification.json). Testy osobno sprawdzają zapis, zaznaczenie tekstu i metadane. Nie szacowano kontrastu z fotografii.

## Przegląd HIG i Anti-Slop

Przegląd autora objął galerię wszystkich stanów oraz indywidualne rendery pustego Startu, list, arkusza, 200%, małego i szerokiego widoku. Główne odniesienia i cytaty są w planie. Zastosowano przede wszystkim `layout.md › Visual hierarchy`, `writing.md › Best practices`, `search-fields.md › Best practices`, `tab-bars.md › Best practices`, `sheets.md › Best practices`, `accessibility.md › Vision/Mobility/Cognitive`. Źródło oficjalne: `https://developer.apple.com/design/human-interface-guidelines/` plus ścieżka danego tematu. Referencje przeczytano z zainstalowanej biblioteki Apple Design Skill, nie odtworzono z pamięci.

Wnioski autora: kompozycja nie powtarza już struktury landing page; nawigacja nie rywalizuje z zawartością; puste stany dają jeden następny krok. Puste Oceny celowo nie mają fikcyjnego materiału wypełniającego wolną przestrzeń. Charakter pozostaje spokojny, oparty na skali ocen i metadanych, nie na nowym logo. Pozostaje kompromis: przy 200% mniej treści mieści się na ekranie, a wiersze rosną; treść i zapis są nadal dostępne przez przewijanie.

**Niezależna recenzja niedostępna:** uruchomiono osobno Apple HIG (`ses_e9d2019c7ffe3e8vLoCW9H5dM5`) i Anti-Slop (`ses_e9d1fcffaffehkWc0L3fADsMM2`). Obie sesje zwróciły “The usage limit has been reached”, bez recenzji. Nie ma niezależnego sign-off. Tryb DURING był stosowany w implementacji; te próby go nie zastępowały.

## Weryfikacja

- Jednostkowe: **166/166, 15 plików**. Po zmianie cache ujawniono cztery testy z zahardkodowaną poprzednią wersją; dostosowano oczekiwaną wersję bez osłabiania asercji. Ponowny przebieg: 166 PASS.
- Pierwszy przebieg istniejących E2E po korekcie: **144/144** na Chromium mobile/desktop, WebKit i Firefox.
- Rozszerzony E2E: pierwszy przebieg 163 PASS / 1 FAIL. WebKit nie nadaje zawsze fokusu przyciskowi po dotknięciu, a dotyk może też odebrać jawnie nadany fokus. Nowy test ścieżki klawiaturowej ustawia fokus i aktywuje CTA przez Enter, bez usuwania asercji przekazania fokusu. Wykrył następnie ostrzeżenie WebKit o ignorowanym `interactive-widget`. Usunięto nieobsługiwany klucz meta viewport; obsługa klawiatury pozostaje oparta na istniejącym visualViewport. Osobny retest tego scenariusza WebKit: 1 PASS. Końcowy pełny wynik poniżej.
- ESLint i Stylelint: PASS. Prettier: PASS po normalizacji lokalnych CRLF przez istniejące `npm run format`; nie powstały merytoryczne zmiany w 26 nietkniętych plikach.
- Build: **59 plików**. Katalog: **336 stałych ID, 0 błędów kontraktu**.
- Osobny click-through obu wyglądów: CTA → Search, zapytanie → cztery wyniki, clear → puste aktywne pole, Piwo → 50 wyników, wynik → arkusz, gwiazdy → aktywny Zapisz, zapis 200%, zachowany query po nawigacji. **0 ostrzeżeń i błędów konsoli**.
- Syntetyczny visualViewport 430 px: notatka i Zapisz w dostępnym obszarze. To nie klawiatura iOS.
- Capture: 0/1/10/100 ocen, oba wyglądy, 320 × 568, 393 × 852, 1280 × 900, tekst 200%, reload offline. Pomiary i lista plików: `after/evidence.json`.

Geometria 393 × 852 bez fizycznych safe areas: przed pasek 74 px, y=766, dół=840; po 59 px, y=793, dół=852; treść kończy się na y=793, więc nie jest przykrywana. Na przesłanych zdjęciach nie stwierdzono technicznej przyczyny innego położenia; nie przypisano jej bez dowodu.

## Bramka Anti-Slop autora

- R-03/R-32 PASS: E2E klawiatury, 200%, focus i geometrii; dodatkowe rendery 320 px.
- R-17/R-18/R-36/R-38 PASS: liczby z kolekcji i katalogu; syntetyczne rekordy tylko w izolowanych testach; brak fikcyjnych opinii i claims.
- R-23/R-24/R-26 PASS: brak nowych assetów; trzy istniejące cele nawigacji; interakcje i działania kopii sprawdzane E2E, dodatkowy click-through w JSON.
- R-25/R-34 PASS: rzeczywiste kolory obu wyglądów, minimalna para 4,54494:1; axe w E2E.
- R-27/R-35 PASS: zachowano testy stanów pustych, błędów odczytu/zapisu/katalogu i ładowania; uruchomiono build, browser captures i interakcje.
- R-01/R-05/R-10/R-11/R-19/R-20/R-31/R-37 PASS: plan przed CSS, dwa rendery kierunków, uzasadniona lista, ograniczone promienie i materiał, brak nowych animacji; właściciel podał kierunek i wybrał DURING.
- R-02/R-15/R-16 PASS: nowe copy krótkie, konkretne; bez marketingowych sloganów i ozdobnych znaków.

To bramka autora oparta na dowodach, nie niezależny audyt ani gwarancja akceptacji wizualnej.

## Ograniczenia platformy

Brak fizycznego Safari/iPhone, VoiceOver, instalacji z ekranu początkowego i systemowej klawiatury. WebKit Playwright nie jest urządzeniem iOS. CSS px i rem nie są UIKit pt ani Dynamic Type. `env(safe-area-inset-*)` pozostaje zaimplementowane, ale rzeczywiste insets i przywracanie aplikacji wymagają urządzenia. Starsze grafiki launch/splash zachowano bez przerabiania logo; mogą dać przejście kolorystyczne z poprzedniego granatu do grafitu. Nie deklarujemy natywnego Liquid Glass.

## Zakres Git

Zmiany UI: `index.html`, `src/css/style.css`, `src/js/main.js`, `src/js/ui/{dashboard,favorites,search-ui,tabs,index,modal}.js`. PWA: `manifest.json`, wersja `service-worker.js`. Testy: testy tabs/SW, dwa dotychczasowe specy E2E i nowy `design-correction.spec.mjs`. Dowody: trzy nowe skrypty oraz dokumentacja i zrzuty. `DESIGN.md` zaktualizowano.

Zastane dodatkowe zmiany `README.md` i `.gitignore` nie należą do korekty i nie są dołączane. Katalog `.serena` pozostaje nietknięty. Ponieważ dodatkowy `.gitignore` ignoruje `/docs`, nowe dowody dodawane są jawnie, bez zmiany cudzych reguł ignorowania.

Commit implementacji: `9159d93`, `feat: correct collection composition, compact navigation and rating flow`.

**Końcowy pełny E2E: 164/164 PASS, 2,4 minuty**, cztery projekty przeglądarek, bez pominięć. Dwa wcześniejsze ponowienia przerwał restart serwera narzędzi; nie zaliczano ich jako PASS. Ostatni przebieg foreground zakończył się kodem 0. Kontrole lint, format, build, katalog i 166 testów jednostkowych również zakończyły się poprawnie.
