# AlkoRater: przebudowa doświadczenia inspirowana Apple

Data: 21 października 2026 r.

**Wynik: kandydat do przeglądu użytkownika, zaimplementowany i zapisany lokalnie.** Aplikacja zachowuje architekturę vanilla JavaScript, działanie offline i ukończoną modernizację. Końcowa weryfikacja: **166/166 testów jednostkowych i 144/144 E2E**. Nie jest to akceptacja projektu przez właściciela ani deklaracja stabilnego wydania.

Najważniejsza zmiana: spokojne, grupowane listy i przewidywalna nawigacja prowadzą do pojedynczego arkusza z numerowaną skalą 1–5. Granat i bursztyn pozostają tożsamością AlkoRater. Szkło nie obejmuje treści.

## 1. Baza i zakres

- Baza lokalna: `3898706b4f04d9ec165f70dabf5a16c4b7e95565`, nie starszy stan GitHub `main`.
- Zachowane commity modernizacji: `1e89abb` i `3898706`; raport wejściowy: [ALKORATER_OVERHAUL_REPORT_PL.md](ALKORATER_OVERHAUL_REPORT_PL.md).
- Gałąź wejściowa: `feature/alkorater-product-overhaul`. Gałąź prac: **`design/apple-experience-overhaul`**.
- Commit implementacji: **`3a56517`**, `feat: refine Apple-inspired appearance, navigation and rating sheet`.
- Wersja aplikacji pozostaje `2.14.0-rc.1`; identyfikator cache SW: `v8.1-apple-rc3`.
- Zastany nieśledzony katalog `.serena/` pozostawiono bez zmian i poza commitami.

Nie dodano frameworka, backendu, analityki, płatnej usługi, fontów z sieci ani nowych zależności. Nie zmieniono katalogu, stabilnych ID, rankingu, schematu kopii, migracji, repozytorium ocen ani mechanizmów zapisu. W service workerze zmieniono wyłącznie wersję cache. Lista porównanych plików: [verification.json](measurements/apple/verification.json).

## 2. Aktywacja skilli i wykorzystane odniesienia

`apple-design` był już zainstalowany i dostępny w OpenCode. Nie uruchamiano `npx skills add`, instalatora ani skryptu pobierającego całą bibliotekę. Oficjalny commit: **`914b6a377c22755597e4405e54911b996de822d7`**. Ponowne porównanie przypiętego `SKILL.md` z lokalnym plikiem potwierdziło zgodność po normalizacji CRLF/LF; SHA-256 znormalizowanej treści: `93ae61a7d61b1421a19aa2117b0a34db2d0fcd897306ecac8370ff50f2f6f670`.

Użyto także Anti-Slop **3.2.21**, tryb **DURING**, zgodnie z wyborem tej sesji. Pełny zapis pochodzenia: [skills.json](measurements/apple/skills.json).

Najpierw przeczytano `SKILL.md`, routing `references/hig-lookup.md`, tłumaczenie `references/cross-platform.md` i `references/code-audit.md`. Następnie dobierano pliki do ekranów, zamiast wczytywać całą bibliotekę. [Przypięte źródła referencji](https://github.com/dickwu/apple-design-skill/tree/914b6a377c22755597e4405e54911b996de822d7/references) pochodzą z biblioteki wygenerowanej 15 października 2026; nie oznacza to ponownego sprawdzenia całej witryny Apple.

| Decyzja                                                                | Faktycznie użyta referencja i sekcja                                                                                                                  |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cel użytkowy, zachowanie kontekstu, powściągliwość                     | `design-principles.md`, zasady Purpose, Flexibility, Craft i Delight; `designing-for-ios.md`, akapity Ergonomics i Inputs                             |
| Kontrast, cele dotyku, alternatywy dla gestów, czas na Cofnij          | `accessibility.md › Vision`, `Mobility`, `Speech`, `Cognitive`                                                                                        |
| Kolejność treści, grupowanie i dopasowanie do miejsca                  | `layout.md › Visual hierarchy`, `Adaptability`, `Guides and safe areas`                                                                               |
| Hierarchia tekstu i skalowanie                                         | `typography.md › Ensuring legibility`, `Conveying hierarchy`, `Supporting Dynamic Type`                                                               |
| Semantyczne kolory i oba wyglądy                                       | `color.md › Best practices`; `dark-mode.md › Best practices`, `Dark Mode colors`                                                                      |
| Trzy sekcje i nawigacja szerokiego układu                              | `tab-bars.md › Best practices`, `Phone (iOS)`, `Tablet (iPadOS)`; `toolbars.md › Best practices`                                                      |
| Pojedynczy, ograniczony formularz                                      | `sheets.md › Anatomy`, `Best practices`, `Mobile (iOS, iPadOS)`; `modality.md › Best practices`                                                       |
| Wyszukiwanie z sugestiami zamiast automatycznego otwierania klawiatury | `searching.md › Best practices`; `search-fields.md › Best practices`, `Search as a tab`, `Search as an inline field`                                  |
| Materiał wyłącznie na warstwie funkcjonalnej                           | `liquid-glass.md › Where the material belongs`, `Review checklist`, `Cross-platform translation`; `materials.md › Liquid Glass`, `Standard materials` |
| Krótki, opcjonalny ruch i informacja zwrotna                           | `motion.md › Best practices`, `Providing feedback`; `playing-haptics.md › Best practices`; `feedback.md`                                              |
| Etykiety i zachowanie pól przy klawiaturze                             | `writing.md › Getting started`; `virtual-keyboards.md › Best practices`, `Mobile (iOS, iPadOS)`                                                       |
| Działania nieukryte wyłącznie w menu                                   | `context-menus.md › Best practices`, `Content`, również w niezależnej recenzji                                                                        |

Kluczowe zastosowania: „Order content by relative importance” (`layout.md › Visual hierarchy`) uzasadnia wpisy nad statystykami; „Use a tab bar to support navigation, not to provide actions” (`tab-bars.md › Best practices`) uzasadnia trzy stałe sekcje; „Minimize use of time-boxed interface elements” (`accessibility.md › Cognitive`) uzasadnia trwałe Cofnij.

**Granica platformy:** to HTML/CSS/JavaScript PWA. Zastosowano zasady czytelności, kontekstu i ergonomii, nie udawane komponenty UIKit. CSS px nie są natywnymi pt; skalowanie tekstu nie jest implementacją Dynamic Type. Nie wykorzystano SF Symbols ani plików fontów Apple.

## 3. Ocena zastanego interfejsu

Pełny audyt What / Why / Fix: [APPLE_DESIGN_AUDIT_BEFORE_PL.md](APPLE_DESIGN_AUDIT_BEFORE_PL.md).

Zachowano działającą skalę ocen, etykiety, inert i pułapkę fokusu, ochronę szkicu, odrębność produktów, kopie i odzyskiwanie oraz brak gamifikacji spożycia. Nie wymieniano tych elementów dla samej nowości.

| What: słabość bazy                       | Why: rodzaj problemu                                      | Fix: wykonana zmiana                                  |
| ---------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------- |
| Wymuszony ciemny wygląd                  | HIG i dostępność w różnych warunkach                      | Dwa zestawy tokenów i wybór systemowy                 |
| Każda zmiana karty przewija na początek  | UX, utrata kontekstu                                      | Zapamiętanie przewijania i historia przeglądarki      |
| Mały tytuł, konkurujące obrysy           | Hierarchia i craft, nie samodzielny dowód błędu kontrastu | Większe tytuły, łagodniejsze grupy, fokus całego pola |
| Rozmycie nagłówka bez wartości użytkowej | Craft i koszt renderowania                                | Pełny nagłówek, dwa ograniczone miejsca materiału     |
| Zapis w jednym scrollerze z notatką      | Ergonomia formularza                                      | Osobna stopka i przewijana treść arkusza              |
| Kilka konkurujących kontrolerów sprężyny | Odporność interakcji                                      | Wspólne zatrzymywanie i porządkowanie animacji        |
| Cofnij znika po czterech sekundach       | Dostępność poznawcza                                      | Brak timera dla komunikatu z akcją                    |
| Sześć jednakowych kafelków sugestii      | Ocena produktowa, nie zakaz HIG                           | Lista kategorii oraz osobne skróty zapytań            |

## 4. Kierunek i uzasadnienie projektu

Kierunek zapisano w [DESIGN.md](../DESIGN.md): **Operate, ENERGY 1 / RHYTHM 2 / MOTION 1**. Minimalny ruch oznacza tu krótkie przejścia stanu, nie dosłowny brak każdej animacji. Nie dodano wejść każdego wiersza ani animacji przewijania.

- **Kolor:** granat zachowuje rozpoznawalność, bursztyn wskazuje wybór i zapis, a nie „dobry” gust.
- **Układ:** wyszukanie produktu i odzyskanie notatki są ważniejsze od statystycznego panelu. Na Start ostatnie wpisy poprzedzają podsumowanie.
- **Typografia:** systemowy krój wspiera krótkie listy i formularze bez pobierania plików; hierarchię budują rozmiar i ciężar.
- **Odstępy:** rytm 8/12/16/24/32 px rozdziela sekcje, a mniejsze odstępy łączą nazwę z metadanymi.
- **Grupy:** wspólna powierzchnia łączy porównywalne wiersze; nie są to dekoracyjne karty funkcji ani bento.
- **Ikony:** zachowano lokalny, spójny podzbiór Lucide i istniejący znak aplikacji. Lupa oznacza wyszukiwanie, kosz usunięcie, gwiazda faktyczną ocenę. Usunięto zbędne ikony skrótów na wąskim ekranie.
- **Sygnatura:** numerowane gwiazdy pokazują stopień i wybrany punkt skali. Reszta interfejsu pozostaje spokojna; nie ma confetti, serii ani zachęt do picia.

Nie dodano ilustracji, zdjęć katalogowych, fikcyjnych marek ani nowego logo. Nieznane metadane pozostają nieznane. Świadomie nie skopiowano kompozycji Notes, Music ani Health.

## 5. System tokenów

Implementacja: [src/css/style.css](../src/css/style.css). Istniejące nazwy tokenów zachowano tam, gdzie ogranicza to zmianę zależnych komponentów.

| Rola / token                                           | Jasny                 | Ciemny               |
| ------------------------------------------------------ | --------------------- | -------------------- |
| Tło `--bg`                                             | `#f2f4f7`             | `#071019`            |
| Grupy i arkusz `--surface-1`                           | `#ffffff`             | `#101d2b`            |
| Pola i powierzchnia pomocnicza `--surface-2`           | `#e9edf2`             | `#1b2b3c`            |
| Wyższy poziom `--surface-3`                            | `#dce3eb`             | `#2b4054`            |
| Tekst `--fg`                                           | `#152536`             | `#f1f5fa`            |
| Tekst drugorzędny `--fg-secondary`                     | `#4b5a69`             | `#bac7d5`            |
| Metadane `--fg-tertiary`                               | `#566677`             | `#a4b4c5`            |
| Akcent, ocena, fokus `--accent` / `--gold` / `--focus` | `#81500d`             | `#f1b24f`            |
| Główna akcja `--action-fill` / `--action-text`         | `#f1b24f` / `#21190c` | Ta sama para         |
| Aktywny element `--selection`                          | `#e4eaf1`             | `#263b50`            |
| Podświetlone dopasowanie `--highlight`                 | `#f4dfb8`             | `#5c4525`            |
| Separator `--separator`                                | `#c8d1db`             | `#344759`            |
| Granica kontrolki `--control-border`                   | `#738194`             | `#72869a`            |
| Usunięcie `--accent-red`                               | `#b52b38`             | `#ff9b9b`            |
| Sukces `--success`                                     | `#246848`             | `#8bd6a5`            |
| Ostrzeżenie `--warning`                                | `#81500d`             | `#f1b24f`            |
| Materiał `--glass-fill`                                | Biel, alfa 0,92       | `#101d2b`, alfa 0,92 |

Promienie: kontrolka 14 px, grupa 20 px, arkusz i nawigacja 28 px. Cienie `--shadow-floating` i `--shadow-sheet` oznaczają realne nałożenie, nie unoszą każdego wiersza. Typografia w rem: tytuł 2,125; nazwa produktu w arkuszu 1,75; nagłówek 1,25; treść 1,0625; szczegół 0,9375; podpis 0,8125. Przy bazie 16 px daje to odpowiednio 34/28/20/17/15/13 px. Mała etykieta nawigacji pozostaje pomocnicza.

Czasy: naciśnięcie 120 ms, zmiana stanu 180 ms, przejście panelu 140 ms. Krzywa `cubic-bezier(0.22, 1, 0.36, 1)`. Nie utworzono osobnego tokenu dla każdego selektora.

## 6. Zmiany ekran po ekranie

| Obszar                 | Wdrożenie                                                                                                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Uruchomienie           | Zachowane szybkie ładowanie, tekst stanu i szkielety; rezerwacja miejsca ogranicza przesunięcie Startu. Nie dodano sztucznego ekranu powitalnego. Istniejący splash instalacyjny nie był emulowany jako ekran aplikacji. |
| Nagłówek               | Duży tytuł bieżącej sekcji, mały istniejący znak na telefonie, brak filtra tła.                                                                                                                                          |
| Start                  | Ostatnie wpisy jako lista nad statystykami; średnia i liczebności pozostają rzeczywistym podsumowaniem.                                                                                                                  |
| Wyróżnienie            | Nazwa wraz z kategorią, znanym stylem i procentem pozwala rozpoznać wariant przed otwarciem.                                                                                                                             |
| Odkrywanie             | Trzy wiersze kategorii, osobne skróty 0.0%, IPA i Lager; zachowane ostatnie zapytania.                                                                                                                                   |
| Wyszukiwanie           | Fokus całego pola, jawne czyszczenie, przewidywalny Enter; istniejący ranking bez zmian.                                                                                                                                 |
| Wyniki                 | Grupowane wiersze, metadane, ocena; wewnętrzny wskaźnik fokusu nie jest przycinany.                                                                                                                                      |
| Szczegóły i ocena      | Jedna nazwa produktu w arkuszu, oddzielona linia metadanych, pięć numerowanych radio-buttonów.                                                                                                                           |
| Notatka                | Czytelna etykieta, własny obszar przewijania, ochrona zmian przy zamknięciu, Escape, Back i geście.                                                                                                                      |
| Kolekcja               | Pole wyszukiwania własnych notatek, filtry zawijające się przy większym tekście, wspólna powierzchnia wpisów. Nie dodawano sortowania ani gestów bez uzasadnionej potrzeby.                                              |
| Menu                   | Semantyczne `menu`/`menuitem`, Home/End i strzałki, Escape oraz powrót fokusu. Te same działania są też w głównym interfejsie.                                                                                           |
| Komunikaty             | Ikony korzystają z semantycznych kolorów. Cofnij pozostaje do użycia, jawnego zamknięcia albo zastąpienia nową akcją; zwykły zapis może zniknąć po 2,2 s.                                                                |
| Puste i błędne stany   | Zachowano konkretne komunikaty oraz przyciski ponowienia/odzyskiwania; pusty wiersz ma poprawne wewnętrzne odstępy.                                                                                                      |
| Offline i aktualizacja | Zachowane lokalne katalogi, kopie, naprawa bez usunięcia ocen i kontrolowana aktualizacja. Brak wymuszonego przeładowania innych kart.                                                                                   |
| Preferencje            | Przezroczystość można wyłączyć niezależnie od wsparcia media query. Wibracje wymagają świadomego włączenia i dostępnej funkcji przeglądarki.                                                                             |

## 7. Nawigacja i arkusz

**Nawigacja:** trzy karty Start / Szukaj / Oceny; dostępna nazwa ostatniej pozostaje „Moje oceny”. Na telefonie pasek unosi się u dołu, od 760 px jest u góry. Zmierzona wysokość paska określa zapas przewijania; użyto `env(safe-area-inset-*)`. Nie dodano bocznego panelu dla zaledwie trzech sekcji.

Karty zachowują zapytanie i własną pozycję przewijania w działającej sesji. Popstate nie dokłada nowych wpisów historii. Historia arkusza przechowuje **stabilny klucz produktu, nie tekst szkicu**. Back chroni niezapisane zmiany; Forward otwiera właściwy produkt, ale nie wskrzesza świadomie odrzuconej notatki. Odtworzenie po pełnym przeładowaniu nie jest obietnicą trwałego przechowywania szkicu.

**Arkusz:** nieprzezroczysty, pojedynczy formularz z przewijaną `.sheet-body` i osobną `.sheet-actions`. Przycisk Zamknij jest zawsze alternatywą dla zapisu i gestu. Fokus trafia do kontrolki zamknięcia, tło jest inert, Tab pozostaje w formularzu, a zamknięcie przywraca fokus. Podczas kończenia animacji tło nadal jest odizolowane.

Drag zaczyna się tylko w górnej strefie uchwytu, nie podczas przewijania notatki. Wszystkie kontrolery otwarcia, zamknięcia i cofnięcia gestu mają wspólne sprzątanie. Nie ma zagnieżdżonych arkuszy ani detentów udających natywne API. Ochrona szkicu zachowuje przeglądarkowy `confirm`; nie zmieniano jej dla dekoracyjnego dialogu.

**Klawiatura:** `visualViewport` aktualizuje wysokość i offset arkusza, a aktywne pole jest w razie potrzeby odsłaniane wewnętrznym przewijaniem. Heurystyka klawiatury wymaga edycji, zmniejszenia wysokości o ponad 150 px i skali bliskiej 1; powiększenie nie jest traktowane jak klawiatura. Pasek kart znika na czas ograniczonego widoku edycji. To świadome odstępstwo webowe od stałej widoczności kart, mające uniknąć zasłaniania formularza. Nie jest to dowód poprawnej pracy fizycznej klawiatury Safari.

Odstępstwa od natywnych reguł są jawne: zapis jest w stopce zamiast po prawej w pasku systemowym, X pozostaje po prawej, a przeglądarkowe Back może zamykać formularz. HIG nie narzuca PWA użycia UIKit ani natywnego przycisku Back do tego celu.

## 8. Aproksymacja Liquid Glass i fallbacks

Materiał ma wyłącznie **`.bottom-nav` i `.context-menu`**, maksymalnie dwie równoczesne powierzchnie. Header, listy, notatki i arkusz są pełne. Nie ma rozmycia pełnoekranowego scrimu ani animowania blur w każdej klatce.

Wariant bazowy jest nieprzezroczysty. Dopiero `@supports` włącza `backdrop-filter: blur(20px) saturate(1.25)` i alfa 0,92. Tak wysoka nieprzezroczystość jest celowym kompromisem dla tekstowych list, nie próbą dokładnego odtworzenia natywnej optyki.

Drogi powrotu do pełnego tła:

1. Brak wsparcia `backdrop-filter`.
2. `prefers-reduced-transparency: reduce`.
3. `prefers-contrast: more`, również mocniejsze granice i tekst.
4. Trwała opcja „Przezroczyste elementy” wyłączona przez użytkownika.

Wybór użytkownika nie wymaga, żeby Safari przekazywało systemowe Reduce Transparency do CSS. Nie implementowano refrakcji, dynamicznego próbkowania luminancji ani systemowej vibrancy. To **materiał inspirowany Apple w CSS, nie natywne Liquid Glass**.

Jasny/ciemny wygląd odpowiada `prefers-color-scheme`, także w trakcie działania. Świadomie zachowano przyjętą decyzję o braku osobnego przełącznika wyglądu: `dark-mode.md › Best practices` mówi „Avoid offering an app-specific appearance setting”. To udokumentowane odstępstwo od literalnego wymagania przełącznika w Anti-Slop R-21, nie pominięcie jasnego wariantu.

## 9. Ruch i wibracje

Ruch wyjaśnia zmianę karty, otwarcie/zamknięcie arkusza, naciśnięcie, wybraną ocenę, menu i komunikat. Numer, stan ARIA i tekst niosą znaczenie również bez animacji. `prefers-reduced-motion` wyłącza animacje i przejścia CSS; logika JS sprawdza tę preferencję przed ruchem panelu i arkusza.

Pełna macierz ujawniła realny problem WebKit: pojedynczy duży krok symulacji powodował niestabilność mocniej tłumionej sprężyny. Zamiast pomijać ten silnik lub osłabiać asercje, integrację podzielono na podkroki nie większe niż **1/120 s**. Testy klatek **50 i 64 ms** potwierdzają wygaszenie; normalny ruch i odrzucenie gestu przechodzą teraz także w WebKit. Arkusz animuje transformację, nie promień w każdej klatce.

Vibration API to opcjonalne ulepszenie: domyślnie wyłączone, po opt-in i tylko przy dostępnej funkcji. Preferencja przeżywa reload, można ją wyłączyć. Brak API albo odmowa wywołania nie blokuje zapisu. **Nie deklaruje się wibracji w iOS Safari ani fizycznego działania silnika haptycznego.** Obecność `navigator.vibrate` też nie gwarantuje odczuwalnego sygnału. Wzorce pozostały krótką informacją o wyborze/zapisie, nie nagrodą za ocenę.

## 10. Dostępność: wyniki i granice

Obliczenia wykonano metodą względnej luminancji sRGB WCAG na końcowych kolorach obliczonych, nie z oceny zrzutów. [contrast.json](measurements/apple/contrast.json) zawiera pary i metodę. Dla zwykłego tekstu używano progu 4,5:1, dla granicy kontrolki 3:1.

| Stan                                         |   Jasny |  Ciemny |
| -------------------------------------------- | ------: | ------: |
| Treść na tle strony                          | 14,12:1 | 17,48:1 |
| Tekst drugorzędny na stronie                 |  6,43:1 | 11,14:1 |
| Metadane na powierzchni grupy                |  5,89:1 |  8,04:1 |
| Tekst głównej akcji                          |  9,28:1 |  9,28:1 |
| Zaznaczony tekst notatki                     |  9,28:1 |  9,28:1 |
| Aktywna karta na nieprzezroczystym wskaźniku |  5,62:1 |  6,15:1 |
| Tekst usunięcia na grupie                    |  6,24:1 |  8,45:1 |
| Granica kontrolki na polu                    |  3,37:1 |  3,84:1 |

Dla drugorzędnych etykiet na szkle sprawdzono także graniczne kompozycje tła czarnego i białego przy alfa 0,92: minimum **5,92:1** w jasnym i **7,91:1** w ciemnym wariancie. Nie jest to pomiar natywnej vibrancy.

Zweryfikowano:

- Klawiaturę, semantyczne taby i menu, radio 1–5, Escape, przywracanie fokusu i ochronę tekstu.
- Widoczny 3-pikselowy fokus pojedynczego wyniku, również zmianę rzeczywistych pikseli zrzutu po uzyskaniu fokusu.
- Tekst powiększony do 200%, zawijanie filtrów przy 320 i 393 px, długą nazwę i mały arkusz.
- Ograniczony ruch, zwiększony kontrast, systemowy sygnał ograniczenia przezroczystości w kontrolowanej próbie oraz trwały wariant pełnego tła.
- axe dla ścieżek aplikacji i obu wyglądów arkusza; brak zgłoszeń w sprawdzonych stanach. `role=status`/`alert`, nazwany dialog i radiogroup pozostają w DOM.
- Co najmniej 44 CSS px dla głównych interaktywnych obszarów; checkbox ma mniejszy widoczny znak wewnątrz większej etykiety.

Świeży Lighthouse **13.4.1**, snapshot pustego jasnego Startu 393×852: Accessibility **100**, Best Practices **100**, SEO **100**, Agentic Browsing **100**. Konsola: **0 błędów, 0 ostrzeżeń**. [Zapis wyniku](measurements/apple/lighthouse-final.json).

**To nie certyfikat WCAG.** Wcześniejszy Lighthouse również pokazywał 100, mimo usterek odkrytych niezależnie. Nie sprawdzono VoiceOver, Voice Control, Switch Control, fizycznego Dynamic Type ani klawiatury ekranowej iOS. ARIA i test silnika WebKit nie zastępują tych prób.

## 11. Niezależne recenzje i poprawki

Pierwotne raporty są zachowane jako zapis ustaleń, nie nadpisane nową oceną:

- [Apple HIG: APPLE_HIG_REVIEW_PL.md](APPLE_HIG_REVIEW_PL.md).
- [Anti-Slop: APPLE_ANTISLOP_REVIEW_PL.md](APPLE_ANTISLOP_REVIEW_PL.md).
- Oceniany wtedy kandydat: [archiwalna galeria](screenshots/apple/review-initial/after-overview.png), [pomiary pierwotnego kandydata](measurements/apple/review-initial.json). Bieżące pliki `after-*` przedstawiają już poprawiony wariant.

| Ustalenie                                     | Wykonana korekta                                                              | Końcowy dowód sesji implementacyjnej                                                     |
| --------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| F1, Critical: przycięty fokus wyniku          | Wewnętrzny obrys 3 px i brak przycinania grupy                                | Regresja HIG sprawdza fokus oraz różnicę pikseli; przechodzi w czterech projektach E2E   |
| F2, Critical: nakładanie filtrów 200%         | Szerokość wynikająca z etykiety, zawijanie zamiast kurczenia tekstu           | Geometria wszystkich filtrów przy 320/393 px i 200%; cztery projekty                     |
| F3, Critical: zaznaczenie light 2,55:1        | Zgodna para `--action-fill` / `--action-text`                                 | 9,28:1 w obu wyglądach, E2E zaznacza tekst                                               |
| F4, Medium: Forward odtwarza tylko marker     | Historia zawiera klucz produktu, popstate odtwarza formularz bez nowego wpisu | Właściwa kategoria Wódka, brak odrzuconej notatki i wzrostu długości historii            |
| AS-01, P2: statystyki wypierają wpisy         | Ostatnie wpisy przeniesiono nad podsumowanie                                  | Nowe zrzuty 375/393 px i test położenia pierwszego wpisu nad nawigacją                   |
| AS-02, P2: nieodróżnialny wariant wyróżnienia | Dodano istniejące metadane                                                    | Zrzut desktop i test nazwy kategorii/procentu                                            |
| AS-03, P3: pusty wiersz bez odstępów          | Lokalny padding 16 px pustego akapitu                                         | Końcowy pusty Start w obu wyglądach                                                      |
| AS-04, P3: niejasny pasek średniej            | Zachowano go wyłącznie wewnątrz pola średniej, obok skali /5                  | Obejrzane końcowe zrzuty; to decyzja projektowa, nie wymóg usunięcia ani nowa statystyka |

Dodatkowo poprawiono odsłanianie aktywnego pola po zmianie `visualViewport` i stabilność sprężyny w wolnych klatkach. Poprawki potwierdzają testy oraz końcowa inspekcja sesji implementacyjnej, **nie ponowna niezależna akceptacja**.

Obie próby niezależnego corrective recheck zakończyły się komunikatem **„The usage limit has been reached”**. Nie powstał skuteczny drugi sign-off; nie przedstawia się go jako wykonanego. Nie ma nowych raportów recheck udających taką recenzję. Ograniczenie pozostaje otwarte przy przekazaniu kandydata.

## 12. Zrzuty i porównanie przed/po

Wszystkie oceny i notatki na zrzutach są **syntetycznymi danymi testowymi**, utworzonymi w izolowanych kontekstach. Nie są rekomendacjami, prawdziwymi ocenami użytkownika ani przykładem preinstalowanej kolekcji.

| Ekran                | Przed                                                   | Po                                                                                                           | Różnica                                             |
| -------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| Przegląd ekranów     | [Galeria BEFORE](screenshots/apple/before-overview.png) | [Galeria AFTER](screenshots/apple/after-overview.png)                                                        | Hierarchia, grupy, numerowana skala, oba wyglądy    |
| Start                | [Ciemny](screenshots/apple/before-dark-home.png)        | [Ciemny](screenshots/apple/after-dark-home.png), [jasny](screenshots/apple/after-light-home.png)             | Wpisy przed statystykami                            |
| Odkrywanie           | [Przed](screenshots/apple/before-dark-discovery.png)    | [Ciemne](screenshots/apple/after-dark-discovery.png), [jasne](screenshots/apple/after-light-discovery.png)   | Kategorie oddzielone od przykładów                  |
| Wyniki               | [Przed](screenshots/apple/before-dark-search.png)       | [Ciemne](screenshots/apple/after-dark-search.png), [jasne](screenshots/apple/after-light-search.png)         | Spokojne grupy i fokus pola                         |
| Arkusz               | [Przed](screenshots/apple/before-dark-sheet.png)        | [Ciemny](screenshots/apple/after-dark-sheet.png), [jasny](screenshots/apple/after-light-sheet.png)           | Nazwa, skala, osobna stopka                         |
| Kolekcja             | [Przed](screenshots/apple/before-dark-collection.png)   | [Ciemna](screenshots/apple/after-dark-collection.png), [jasna](screenshots/apple/after-light-collection.png) | Filtry i grupowane wpisy                            |
| Menu                 | [Przed](screenshots/apple/before-dark-context.png)      | [Ciemne](screenshots/apple/after-dark-context.png), [jasne](screenshots/apple/after-light-context.png)       | Właściwe symbole, lżejsza warstwa funkcjonalna      |
| Mały telefon 375×667 | [Przed](screenshots/apple/before-small.png)             | [Po](screenshots/apple/after-small.png)                                                                      | Dwa ostatnie wpisy widoczne nad paskiem             |
| Duży telefon 430×932 | [Przed](screenshots/apple/before-large.png)             | [Po](screenshots/apple/after-large.png)                                                                      | Ten sam rytm i pełne wiersze na większej szerokości |
| Tablet 834×1112      | [Przed](screenshots/apple/before-tablet.png)            | [Po](screenshots/apple/after-tablet.png)                                                                     | Górna nawigacja i pełne wiersze                     |
| Desktop 1440×900     | [Przed](screenshots/apple/before-desktop.png)           | [Po](screenshots/apple/after-desktop.png)                                                                    | Ograniczona szerokość, brak pustego sidebara        |
| Pusty Start          | [Przed](screenshots/apple/before-dark-empty.png)        | [Ciemny](screenshots/apple/after-dark-empty.png), [jasny](screenshots/apple/after-light-empty.png)           | Konkretna pomoc i odstępy pustej listy              |
| Komunikat zapisu     | [Przed](screenshots/apple/before-dark-toast.png)        | [Ciemny](screenshots/apple/after-dark-toast.png), [jasny](screenshots/apple/after-light-toast.png)           | Semantyczny kolor i odsunięcie od nawigacji         |
| Offline              | Sprawdzone w scenariuszu BEFORE                         | [Ciemny](screenshots/apple/after-dark-offline.png), [jasny](screenshots/apple/after-light-offline.png)       | Zachowane dwie syntetyczne oceny po reload offline  |

Główne zrzuty telefonu mają 393×852, rozmiar odpowiadający iPhone 15 Pro. Dodatkowo testy obejmują 320 px i tekst 200%. Obejrzano rzeczywiste obrazy, nie tylko procent różnicy zrzutów: granice grup, stopkę arkusza, tekst, warstwy i położenie nawigacji. Treść pod pływającym paskiem można przewinąć ponad niego; nie wymaga się zmieszczenia całego Startu w jednym ekranie.

Reprodukcja: `node scripts/capture-apple-experience.mjs after`. Skrypt tworzy własny serwer i konteksty; nie korzysta z osobistego profilu. Wariant `before` należy uruchamiać wyłącznie na bazie, inaczej nadpisałby dowód innym stanem. Końcowy capture: 22 obrazy ekranów plus galeria, bez `pageerror`.

**README i jego wcześniejsze zrzuty pozostają bez zmian.** Aktualizacja nastąpi dopiero po akceptacji projektu, nie dlatego, że powstał kandydat.

## 13. Testy i ochrona funkcjonalności

| Kontrola                           | Baza                  | Końcowy wynik                                                              |
| ---------------------------------- | --------------------- | -------------------------------------------------------------------------- |
| Vitest                             | 159/159, 13 plików    | **166/166, 15 plików**                                                     |
| Playwright                         | 96/96                 | **144/144**, 36 scenariuszy × 4 projekty                                   |
| Chromium mobile / desktop          | Przechodziły          | Po 36/36                                                                   |
| WebKit / Firefox                   | Przechodziły          | Po 36/36                                                                   |
| Pominięte / flaky / unexpected E2E | Nie dotyczy           | **0 / 0 / 0**                                                              |
| ESLint i Stylelint                 | Sukces                | Sukces, `npm run lint`                                                     |
| Prettier                           | Sukces                | Sukces, `npm run format:check`; dodatkowo HTML, skrypt capture i pliki E2E |
| Build                              | Zastana statyczna PWA | **59 plików produkcyjnych** w `dist/`                                      |
| Audyt katalogu                     | 336 stabilnych ID     | **336 ID, 0 błędów kontraktu**                                             |
| Ewaluacja wyszukiwania runtime     | Zachowana             | **43/43**, 336 produktów                                                   |

[verification.json](measurements/apple/verification.json) zachowuje wynik każdego projektu oraz hash surowych raportów. Końcowe E2E trwało **134,4 s**, około 2,2 min. Dodano 12 scenariuszy doświadczenia Apple, wykonywanych w czterech projektach; nowe jednostkowe obejmują opt-in wibracji i przerywalny/stabilny ruch arkusza.

Zachowane scenariusze obejmują: zapis/edycję/usunięcie/cofnięcie, identyczne nazwy o różnych ID, migrację localStorage, IndexedDB i fallback, błąd zapisu bez utraty formularza, długie historyczne notatki, równoległe karty i konflikty, kopie i walidowany import, błąd katalogu i ponowienie, offline pod katalogiem GitHub Pages i w root, naprawę cache oraz kontrolowane aktualizacje z poprzednich wydań.

Przerwane przebiegi nie są wynikiem końcowym. Fixture importu jawnie wybiera Start, ponieważ po zachowaniu historii może odziedziczyć `#favorites`. Ta zmiana usuwa niepoprawne założenie testu; nie pomija importu ani nie osłabia jego asercji. Dwie rzeczywiste usterki WebKit naprawiono w sprężynie, nie przez skip.

## 14. Wydajność i koszt zmian

Źródła: [before.json](measurements/apple/before.json) i **końcowy** [after.json](measurements/apple/after.json). `review-initial.json` jest archiwum pośredniego kandydata i nie jest wynikiem końcowym.

Metoda: mediana pięciu nowych kontekstów Chromium 156.0.8078.4, 393×852, CPU 4×, localhost bez ograniczania sieci; Windows, Node 24.20.0, i7-11700KF. SW zablokowano tylko dla tych zimnych próbek. Capture i próby offline używają SW. Gotowość oznacza pojawienie się stanu „336 produktów”, nie uniwersalny wskaźnik interaktywności.

| Metryka           |     Przed |        Po | Interpretacja                |
| ----------------- | --------: | --------: | ---------------------------- |
| FCP               |    140 ms |    132 ms | O 8 ms mniej w tej próbie    |
| Gotowość katalogu |  286,1 ms |  289,0 ms | O 2,9 ms więcej              |
| LCP               |    344 ms |    352 ms | O 8 ms więcej                |
| CLS               | 0,2260408 | 0,0889546 | Mniejsze przesunięcie układu |

Nie każdy wskaźnik się poprawił. To mała lokalna próba, nie benchmark fizycznego telefonu ani dane terenowe; nie mierzono INP. Lighthouse snapshot nie zawiera kategorii Performance. Nie wyciąga się z tych danych twierdzenia „aplikacja jest szybsza na iPhonie”.

Źródła runtime po normalizacji LF: **177 182 → 198 469 bajtów**, przyrost **21 287 bajtów** nieskompresowanego UTF-8. Sam CSS: 22 427 → 32 244 bajty. Zakres obejmuje HTML, manifest, SW, CSS i JS uruchomieniowy, bez danych, obrazów i testów. To nie rozmiar transferu, cache ani gzip. Szczegóły i hashe: [source-size.json](measurements/apple/source-size.json).

Koszt ograniczają: brak nowych zależności i fontów, brak `will-change`, tylko dwa małe filtry materiału, transformacje zamiast zmian promienia w klatkach i brak animacji każdego wyniku. Nie wykonywano pomiaru zużycia baterii ani profilowania na sprzęcie.

## 15. Rejestr faktycznego sprawdzenia kontrolek

Wyniki poniżej dotyczą wykonanych prób przeglądarkowych, nie samych obecnych handlerów. Źródła: trzy pliki [tests/e2e](../tests/e2e), pełna macierz w `verification.json` oraz [controls-final.json](measurements/apple/controls-final.json), dodatkowe przejście light/dark na commicie implementacji. Dane są wyłącznie testowe. Dodatkowe przejście nie zgłosiło błędów strony ani ostrzeżeń/błędów konsoli.

| Kontrolka / akcja                                            | Zaobserwowane działanie                                                                                   |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Start, Szukaj, Moje oceny, strzałki i Home/End               | Właściwy panel, aktywny stan, fokus i odtworzenie przewijania                                             |
| Szukaj produktu, Moje oceny, Wszystkie oceny                 | Otwierają istniejące sekcje, również z pustego Startu                                                     |
| Pole katalogu i Enter                                        | Wyniki właściwego zapytania; Enter kończy edycję                                                          |
| Wyczyść, sześć sugestii, ostatnie zapytanie i jego usunięcie | Zapytanie/rezultaty zmieniają się lub znikają zgodnie z akcją                                             |
| Wynik, ostatni wpis, najwyżej ocenione, wpis kolekcji        | Otwierają właściwy produkt i istniejącą ocenę                                                             |
| Gwiazdy 1, 2, 3, 4, 5; strzałki i Space                      | Zmieniają dokładny stopień, fokus i `aria-checked`                                                        |
| Pole notatki i Zapisz / Zapisz zmiany                        | Zapis i odczyt własnego tekstu; błąd zachowuje formularz, ponowienie zapisuje                             |
| Zamknij, Escape, Back, gest uchwytu                          | Zamykają czysty formularz; odmowa odrzucenia zachowuje zmiany; gest notatki nie uruchamia drag            |
| Wyszukiwanie kolekcji i Enter                                | Znajduje tekst notatki i kończy edycję                                                                    |
| Wszystkie, Piwo, Wódka, Wino                                 | Każdy filtr zmienia wyniki i `aria-pressed`, także na pustą listę                                         |
| Menu Oceń / Usuń, strzałki, Escape                           | Odpowiednio otwiera formularz, usuwa, przechodzi po opcjach i wraca z fokusem                             |
| Kosz, Cofnij, Zamknij powiadomienie                          | Usuwa zapisaną ocenę, cofa ją także po ponad 4 s, jawnie zamyka komunikat                                 |
| Kopia i przenoszenie danych                                  | Rozwija/zamyka istniejący panel                                                                           |
| Pobierz kopię JSON                                           | Rzeczywiste pobranie zawiera zapisaną ocenę i notatkę                                                     |
| Wczytaj kopię                                                | Otwiera file chooser; import jest walidowany, duplikaty nie nadpisują ocen; anulowanie nie zmienia danych |
| Pobierz kopię odzyskiwania                                   | Pobiera dane w scenariuszu uszkodzonego zapisu, nie zastępuje go pustą kolekcją                           |
| Spróbuj ponownie                                             | Przywraca komplet katalogu po usunięciu kontrolowanej awarii                                              |
| Napraw pamięć offline                                        | Odtwarza cache bez utraty syntetycznej oceny                                                              |
| Aktualizuj                                                   | Stosuje kompletne wydanie bez utraty danych; respektuje edycję i inne karty                               |
| Zamknij baner aktualizacji                                   | Ukrywa prawdziwy baner czekającego workera, nie stosuje aktualizacji i zachowuje ocenę                    |
| Wygląd i reakcje, Przezroczyste elementy                     | Panel się rozwija, wybór pełnego tła zmienia filtr i przeżywa reload                                      |
| Wibracje przy wyborze i zapisie                              | Domyślnie off, można włączyć/wyłączyć, opt-in przeżywa reload; nie mierzono fizycznego sygnału            |

## 16. Końcowa bramka Anti-Slop

**PASS w zbadanym zakresie kandydata webowego**, na podstawie poniższych dowodów sesji implementacyjnej. To nie zastępuje nieudanego niezależnego recheck ani prób sprzętowych. Bramkę wykonała sesja implementacyjna, nie delegowano jej recenzentom.

Mechaniczny skan read-only: [mechanical-scan.json](measurements/apple/mechanical-scan.json), 40 dopasowań wraz z regułami i oceną kontekstu. Zainstalowany Anti-Slop nie zawiera wykonywalnego detektora; użyto jawnych lokalnych reguł regex, nie reklamowanego „certyfikatora”. Zastane komentarze, gradienty małych miniatur kategorii, bezpieczne przypisania handlerów JS i złośliwe ciągi testów nie są nowymi defektami UI. Nie usuwano użytecznych testów, aby wyciszyć skaner. `outline: none` pola ma zastępczy fokus całego kontenera; pozostałe trafienia filtrów obejmują również ich wyłączanie.

### Hard Gate

- R-02 PASS: nowa kopia interfejsu i raport nie dodają długiej pauzy; trafienia skanera to zastane komentarze/nazwy testów.
- R-03 PASS: obejrzane 375/393/430/834/1440 px i regresje 320 px/200% nie wykazały utraty funkcji ani poziomego przepełnienia.
- R-17 PASS: statystyki wylicza istniejące `collectionStats`; źródła metryk zapisano, dane zrzutów oznaczono jako syntetyczne.
- R-18 PASS: brak testimoniali, awatarów i wymyślonych użytkowników.
- R-23 PASS: brak nowych logo, ilustracji lub fotografii; przebudowa nawigacji wynika z jawnego zlecenia.
- R-24 PASS: wszystkie trzy sekcje istnieją; kliknięcia potwierdza macierz i rejestr kontrolek.
- R-25 PASS: końcowe pary kontrastu, zaznaczenie i granice kontrolek spełniają progi w badanej próbce obu wyglądów; axe bez zgłoszeń w sprawdzonych stanach.
- R-26 PASS: działania kontrolek zapisano element po elemencie w sekcji 15, bez martwych atrap.
- R-27 PASS: pusty Start/kolekcja, ładowanie katalogu i rzeczywiste kontrolowane błędy zapisu/katalogu mają obsłużone stany oraz testy.
- R-28 PASS: aplikacja nie zawiera dodanej generycznej sekcji FAQ.
- R-32 PASS: Tab, strzałki, Home/End, Space, Enter i Escape mają testy; F1 potwierdzono też zmianą pikseli fokusu.
- R-33 PASS: cechy UI wpisano bezpośrednio w źródła; narzędzia capture/raportowania nie dopisują funkcji przez przepisywanie CSS.
- R-34 PASS: oba systemowe wyglądy przeszły rendering, axe i scenariusze formularza; nie ma niedziałającego przełącznika.
- R-35 PASS: wykonano build, rzeczywisty click-through z sekcji 15, macierz 144 E2E i końcową kontrolę konsoli.
- R-36 PASS: brak twierdzeń o pełnej zgodności, natywności lub wydajności bez pomiarów; ograniczenia pozostają jawne.
- R-37 PASS: kierunek, dials i uzasadnienia były zapisane przed wdrożeniem; nie jest to projekt bez briefu.
- R-38 PASS: nie dodano pozornie prawdziwych metadanych, opinii ani treści produktowych; testowe wpisy istnieją tylko w izolowanych kontekstach.

### Purpose-Gate

- R-01 PASS: granat/bursztyn zachowują markę i hierarchię; nowe tło nie ma gradientu ani glow.
- R-04 PASS: istniejący zestaw ma spójny ciężar i funkcjonalne znaczenia; gwiazda służy rzeczywistej ocenie.
- R-06 PASS: systemowy krój uzasadnia czytelność formularzy i brak kosztu fontów; nie dodano ozdobnego monospace.
- R-07 PASS: brak siatek, orbów i faktur dekoracyjnych.
- R-08 PASS: brak ozdobnych strzałek na każdym przycisku; strzałki w dokumentacji opisują przebiegi.
- R-09 PASS: etykiety kategorii i procentu opisują rzeczywiste dane, bez marketingowych kapsuł i redundantnego badge nad H1.
- R-10 PASS: szkło ograniczone do nawigacji i menu, z pełnymi fallbackami; listy i arkusz są pełne.
- R-12 PASS: cienie oznaczają jedynie nałożenie arkusza, nawigacji, menu i komunikatu; brak cienia każdego wiersza.
- R-13 PASS: brak dodanych glow, neonów i pulsujących lampek statusu.
- R-14 PASS: powtarzalne wiersze odzwierciedlają porównywalne produkty, nie zestaw identycznych kart funkcji.
- R-19 PASS: ruch ma zapisany cel, jest krótki i opcjonalny; testy obejmują przerwanie, gest i wolne klatki.
- R-22 PASS: brak generycznych ilustracji.

### Liveliness

- Dials PASS: ENERGY 1 / RHYTHM 2 / MOTION 1 są jawne w DESIGN.md.
- Spójność dials PASS: spokojne listy z różną hierarchią i minimalnymi przejściami, potwierdzone końcowymi zrzutami i próbami ruchu.
- Fokalny punkt PASS: Start prowadzi do wyszukania/powrotu do wpisu, Szukaj do pola, arkusz do wyboru i zapisu.
- Whitespace PASS: odstępy rozdzielają sekcje i grupują metadane; poprawiono pusty wiersz i priorytet ostatnich wpisów.
- Akcent PASS: bursztyn oznacza wybór i główne działanie, nie każdą powierzchnię.
- Motyw PASS: numerowany, bursztynowy wybór 1–5 łączy produkt z jego główną czynnością.
- Design Read PASS: osobisty katalog ocen i notatek, mobilna użyteczność inspirowana iOS; zapis przed wdrożeniem w audycie i DESIGN.md.

### Craftsmanship i Quality Locks

- C-1 PASS: powody koloru, tekstu, układu, odstępów, ikon i materiału zapisano w sekcjach 4–9.
- C-2 PASS: faktyczne działanie kontrolek potwierdza sekcja 15, nie tylko inspekcja handlerów.
- C-3 PASS: wpisy poprzedzają podsumowanie; brak sekcji wypełniających szablon.
- C-4 PASS: w przebadanych pustych/błędnych stanach, obu wyglądach i szerokościach funkcje pozostają dostępne; sprzętowe granice w sekcji 17.
- C-5 PASS: liczby mają pochodzenie, syntetyczne wpisy są jawne, brak wymyślonych referencji klientów.
- R-05 PASS: listy, arkusz i podsumowanie wynikają z pracy z oceną, nie schematu hero + karty + wykres.
- R-11 PASS: promienie 14/20/28 px różnicują kontrolkę, grupę i warstwę, nie wszystko jest kapsułą.
- R-15 PASS: konkretne etykiety: Szukaj produktu, Zapisz ocenę, Wczytaj kopię, Cofnij.
- R-16 PASS: brak nowego marketingowego żargonu i dekoracyjnych emoji; pojedyncze trafienie skanera to zastany komentarz splash.
- R-20 PASS: zachowano markę i charakterystyczną skalę zamiast wymiennej makiety dashboardu; jest to ocena projektowa, nie test statystyczny oryginalności.
- R-21 PASS z udokumentowaną decyzją: oba wyglądy działają, wybór należy do systemu; brak osobnego toggle zgodnie z przyjętym kierunkiem i HIG, nie z odroczenia pracy.
- R-29 PASS: granatowa baza, neutralne powierzchnie i jeden bursztynowy akcent; barwy błędów/sukcesu mają znaczenie semantyczne.
- R-30 PASS: zamówiona inspiracja Apple dotyczy ergonomii, nie klonu konkretnej aplikacji ani cudzych zasobów.
- R-31 PASS: każda główna decyzja ma krótkie uzasadnienie w raporcie i DESIGN.md.

Uzupełniająca lista `antislop-ui`: paleta i akcent, brak dekoracyjnych emoji/badge/świateł, różne kompozycje, brak szablonowego dashboardu, realne dane, kompletne kontrolki/stany, ograniczone efekty i odporność wariantów mają powyższe dowody. Nie dodano nowych wyjątków poza jawną decyzją o wyglądzie systemowym.

## 17. Ograniczenia, Git i dalszy przegląd

Pozostaje do sprawdzenia przez człowieka na sprzęcie:

1. Instalacja PWA na fizycznym iPhonie i Androidzie, start z ekranu początkowego i rzeczywisty splash.
2. Klawiatura Safari z paskami przeglądarki, przełączanie aplikacji, orientacja oraz safe areas pod Dynamic Island/home indicator.
3. VoiceOver i pozostałe technologie asystujące, faktyczne odczyty komunikatów, większy tekst i ustawienia systemowe.
4. Odczuwalność opcjonalnych wibracji tam, gdzie platforma je rzeczywiście zapewnia.
5. Ponowne niezależne potwierdzenie korekt F1–F4 i AS-01–04 po ustąpieniu limitu recenzentów.

WebKit Playwright nie jest fizycznym Safari, a symulacja `visualViewport` ani dispatch dotyku nie są dowodem poprawnej klawiatury/gestu na iOS. Manifest i istniejące obrazy startowe zachowują granat; nie deklaruje się automatycznie jasnego systemowego splash ani płynności jego przejścia na sprzęcie. Cache i lokalne oceny pozostają zależne od zasad trwałości pamięci przeglądarki; kopia JSON jest nadal potrzebna do przenoszenia i zabezpieczania danych.

Zastane ryzyko zależności narzędziowych pozostaje jawne: poprzedni raport zapisał 7 zgłoszeń `high` w łańcuchu Stylelint. W tej fazie nie zmieniano zależności ani nie wykonywano wymuszonego downgrade'u; nie przedstawia się historycznego audytu jako nowego wyniku.

**Przekazanie Git:** implementacja w `3a56517`; raport, pierwotne recenzje, zrzuty i pomiary w osobnym commicie zawierającym ten plik. Jego identyfikator wskazuje `git log -1 --format=%h -- docs/APPLE_DESIGN_OVERHAUL_PL.md`. Hashe źródeł runtime w `source-size.json` identyfikują dokładnie zweryfikowany stan implementacji; stare `head: 3898706` w pomiarach dokumentuje pomiar ówczesnego working tree, a nie wykonanie nowych pomiarów na starej aplikacji.

Pliki zadania są zacommitowane; jedynym pozostawionym nieśledzonym katalogiem jest zastany `.serena/`. `dist/`, zależności, raporty Playwright i osobiste dane nie należą do commitów. Nie zmieniono `main`, nie wykonano pushu, merge, deploymentu GitHub Pages, tagowania ani GitHub Release.

Do przeglądu lokalnego: `npm run dev -- --port 4188`, następnie `http://127.0.0.1:4188/AlkoRater/`. Po akceptacji można osobno zaktualizować README i zaplanować kontrolowane wydanie. Ten etap nie zawiera zgody ani wykonania publikacji.
