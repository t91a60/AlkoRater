# AlkoRater: niezależna recenzja implementacji według Apple HIG

> Nota redakcyjna sesji implementacyjnej: poniżej zachowano pierwotne ustalenia. Oceniane zrzuty są w [archiwum review-initial](screenshots/apple/review-initial/after-overview.png), a ówczesne pomiary w [review-initial.json](measurements/apple/review-initial.json). Wykonane później poprawki i nieudane próby niezależnego recheck opisuje [raport końcowy](APPLE_DESIGN_OVERHAUL_PL.md). To nie jest ponowna akceptacja recenzenta.

Data: 21.10.2026. Gałąź: `design/apple-experience-overhaul`. HEAD/baza: `3898706b4f04d9ec165f70dabf5a16c4b7e95565`.

**Przedmiotem recenzji jest zmodyfikowany katalog roboczy po wdrożeniu, nie sam commit bazowy ani wcześniejsza propozycja.** Nie zmieniono źródeł, testów ani zrzutów. Ten dokument nie potwierdza późniejszych napraw.

## Podsumowanie

**Ocena: Critical issues.** Potwierdzono trzy lokalne defekty dostępności i jeden problem średniej wagi z historią arkusza. Krytyczność F1–F3 wynika z przyjętej skali recenzji HIG dla błędów dostępności, nie z twierdzenia, że cała aplikacja jest nieużywalna.

Teza interfejsu jest czytelna: szybko znaleźć produkt, zapisać własną ocenę i wrócić do notatki. Najbardziej charakterystycznym elementem jest bursztynowa, numerowana skala oceny na spokojnych, grupowanych listach. Jasny i ciemny wygląd są spójne, a poprawki nie wymagają zmiany tego kierunku.

## Metoda i zakres

- Najpierw obejrzano rzeczywiste zrzuty ówczesnego `docs/screenshots/apple/after-*` (obecnie w `docs/screenshots/apple/review-initial/`), w tym oba wyglądy, arkusz, menu, stany puste oraz warianty small/tablet/desktop i overview.
- Następnie uruchomiono własne, izolowane konteksty Playwright, Chromium **156.0.8078.4**, z `serviceWorkers: 'block'`, pod `http://127.0.0.1:4188/AlkoRater/`. Sprawdzono brak kontrolera SW. Użyto wyłącznie danych testowych utworzonych w tych kontekstach.
- Dodatkowy kontekst Chrome DevTools był osobno izolowany; rejestrację SW wyłączono przed uruchomieniem aplikacji. Z niego pochodzą snapshot drzewa dostępności i Lighthouse.
- Sprawdzono przebiegi klawiaturowe, Back/Forward, ochronę niezapisanej notatki, zapis, menu, usunięcie/cofnięcie, zmianę wyglądu, ustawienie przezroczystości i jego zachowanie po odświeżeniu.
- Własne próby obejmowały m.in. 320×568, 375×667, 393×852, 393×390, 760×640, 834×1112 i 1440×900. Powiększenie samego tekstu symulowano zmianą bazowego rozmiaru CSS z 16 do 32 px. To nie jest test natywnego Dynamic Type ani fizycznego powiększenia iOS.
- Kontrast obliczono metodą względnej luminancji WCAG z rzeczywistych stylów obliczonych. Zrzuty wykorzystano do potwierdzenia efektu, nie do zgadywania kolorów.

## Krytyczne

### F1. [Critical] Pojedynczy wynik wyszukiwania nie pokazuje fokusu klawiatury

**What:** Wyszukanie `Harnaś Mocne` daje jeden wynik. Po przejściu Tab z pola przez przycisk czyszczenia do wyniku element ma fokus i pasuje do `:focus-visible`, ale jego obrys jest całkowicie obcięty. Obrazy obszaru wyniku przed i po uzyskaniu fokusu były identyczne bajtowo. Oznacza to rzeczywisty brak wskaźnika, nie tylko zbyt delikatny kolor.

Dowód w kodzie: `src/css/style.css:133–135` ustawia zewnętrzny obrys 3 px z odstępem 3 px, a `src/css/style.css:694–699` przycina całą grupę przez `overflow: clip`. `.search-card` zajmuje pełną szerokość grupy (`src/css/style.css:714–724`).

**Why:** WCAG 2.4.7 wymaga widocznego fokusu. `accessibility.md › Speech`: „Let people use the keyboard alone to navigate and interact with your app.” Obecność poprawnego selektora CSS nie wystarcza, jeśli jego efekt nie jest widoczny.

**Fix:** Dla przycinanych wierszy rysować wskaźnik wewnątrz przycisku, np. obrys z ujemnym `outline-offset` albo wewnętrzny cień o odpowiednim kontraście. Alternatywnie oddzielić dekoracyjne przycinanie grupy od jej elementów interaktywnych. Dodać kontrolę wizualną pojedynczego wyniku, nie tylko asercję `:focus-visible`; sprawdzić też analogiczne grupy ostatnio zapisanych produktów.

### F2. [Critical] Filtry kolekcji nakładają się przy tekście 200%

**What:** Przy 393 px szerokości i bazowym foncie 32 px etykiety `Wszystkie` i `Piwo` nachodzą na siebie; `Wódka` i `Wino` również tracą odstęp. `Wszystkie` ma `scrollWidth = 139 px` przy `clientWidth = 79 px`. Przy 320 px szerokości przycisk ma tylko 65 px przestrzeni wewnętrznej. Można kliknąć filtr, ale nie można wiarygodnie odczytać granic i nazw opcji.

Dowód: `src/css/style.css:847–864`. Kontener pozwala zawijać wiersze, lecz przyciski z `flex: 1` i `min-width: 0` kurczą się poniżej szerokości własnego tekstu. Same jednostki `rem` nie zapewniają odporności układu.

**Why:** WCAG 1.4.4: powiększenie tekstu do 200% nie powinno powodować utraty treści lub funkcji. `typography.md › Supporting Dynamic Type`: „Make sure your app’s layout adapts to all font sizes.” `layout.md › Adaptability`: „Be prepared for text-size changes.” Dla tej PWA zasadę stosujemy do powiększenia tekstu w przeglądarce, nie do API UIKit.

**Fix:** Pozwolić filtrom zachować szerokość wynikającą z etykiety i przechodzić do kolejnego wiersza, np. `flex: 1 1 auto` z minimalną szerokością opartą na `max-content`, zamiast `min-width: 0`. Nie zmniejszać fontu, żeby zamaskować problem. Powtórzyć pomiar przy 320 i 393 px, font 32 px, dla wszystkich czterech etykiet.

### F3. [Critical] Zaznaczony tekst w jasnym wyglądzie ma kontrast 2,55:1

**What:** W jasnym arkuszu zaznaczenie notatki przez Ctrl+A daje tekst `#21190c` na tle `#81500d`: **2,55:1** przy zwykłym tekście 17 px. Wymagane jest 4,5:1. Ten sam problem dotyczy globalnego zaznaczania tekstu, ponieważ reguła nie jest ograniczona do formularza. Wariant ciemny ma 9,28:1 i nie wykazał tego błędu.

Dowód: `src/css/style.css:11`, `src/css/style.css:18–19` i `src/css/style.css:128–130`. `::selection` łączy token przeznaczony dla ciemnego tekstu akcentowego w jasnym wyglądzie z ciemnym kolorem tekstu głównej akcji.

**Why:** WCAG 1.4.3 oraz `accessibility.md › Vision`: „Strive to meet color contrast minimum standards.” `color.md › Best practices`: „Make sure all your app’s colors work well in light, dark, and increased contrast contexts.” Zaznaczenie tekstu jest stanem interfejsu, który też wymaga sprawdzenia.

**Fix:** Dla zaznaczenia zastosować zgodną parę tokenów, np. `background: var(--action-fill)` i `color: var(--action-text)`. Obecne wartości tej pary dają **9,28:1** w obu wyglądach. Można też usunąć własną regułę i pozostawić dobór kolorów przeglądarce. Zweryfikować faktycznie zaznaczony tekst, nie tylko normalny stan pola.

## Usprawnienia

### F4. [Medium] Dalej przywraca znacznik arkusza, ale nie sam arkusz

**What:** Przebieg `Szukaj → produkt → Back → Forward` kończy się ukrytym formularzem mimo `history.state = { alkoraterTab: 'search', alkoraterSheet: true }`. `.app-container.inert` pozostaje `false`. Powstaje wpis historii, którego stan nie odpowiada widokowi. Nie stwierdzono utraty zapisanej oceny w tej próbie, dlatego nie podnoszę priorytetu do High.

Dowód: `src/js/ui/modal.js:172–174` zapisuje tylko znacznik arkusza, bez identyfikatora produktu. `src/js/main.js:229–242` obsługuje zamknięcie przy Back i zmianę karty, lecz nie odtwarza arkusza przy wejściu na jego wpis. Dla tej samej karty `src/js/ui/tabs.js:71–74` kończy obsługę od razu.

**Why:** `accessibility.md › Cognitive`: „Keep actions simple and intuitive.” `layout.md › Adaptability` podkreśla znajome, spójne zachowanie. Szczegółowa diagnoza rozjazdu History API jest oceną implementacji webowej; HIG nie narzuca API historii przeglądarki.

**Fix:** Ustalić jeden kontrakt dla historii arkusza. Jeżeli wpis jest odtwarzalny, przechowywać w nim klucz produktu i otwierać formularz bez dokładania kolejnego wpisu przy `popstate`. Jeżeli arkusz jest celowo jednorazowy, jawnie normalizować nieodtwarzalne wpisy zamiast pozostawiać `alkoraterSheet: true` przy zamkniętym widoku. Nie odtwarzać po cichu wcześniej odrzuconej notatki. Testować również anulowanie potwierdzenia i ponowne Back/Forward.

## Co działa i warto zachować

| Przebieg lub wariant                      | Zaobserwowany wynik                                                                                                                                                                                                                       |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Zmiana light/dark w działającej aplikacji | Kolory treści, powierzchni, zaznaczenia i aktywnej karty zmieniają się zgodnie z preferencją. Brak konieczności ponownego wczytania.                                                                                                      |
| Trzy sekcje nawigacji                     | Rozpoznawalne etykiety i aktywny stan; przy 834 i 1440 px pasek jest u góry (`top: 24 px`), na małych szerokościach u dołu. Bez poziomego przepełnienia obszaru treści w sprawdzonych podstawowych układach.                              |
| Czysty arkusz → Back                      | Arkusz się zamyka, tło przestaje być inert, fokus wraca do produktu.                                                                                                                                                                      |
| Zmieniona notatka → Back → anulowanie     | Jest potwierdzenie; notatka i otwarty formularz zostają zachowane. Akceptacja odrzucenia zamyka arkusz.                                                                                                                                   |
| Wybór oceny i zapis                       | Radio zgłasza wybraną wartość, przycisk zapisu działa; nowa ocena pojawia się w kolekcji. Drzewo dostępności ma nazwany dialog, radiogroup i textarea.                                                                                    |
| Menu produktu                             | Rzeczywiste role `menu`/`menuitem`; strzałka przechodzi do `Usuń`, Escape zamyka menu i przywraca fokus. Edycja i usunięcie są też dostępne bez ukrytego menu.                                                                            |
| Usuń → Cofnij                             | Cofnięcie nadal było dostępne po 3 sekundach i przywróciło testową ocenę.                                                                                                                                                                 |
| Przezroczystość                           | Wyłączenie opcji daje pełne tło i przeżywa reload. Wymuszone `prefers-reduced-transparency: reduce` oraz zwiększony kontrast dają `backdrop-filter: none`. Jawny wariant bez ograniczeń ma `blur(20px) saturate(1.25)` i tło o alfa 0,92. |
| Krótki arkusz i większy tekst             | W czystych, osobnych próbach 393×390 oraz 320×568 z tekstem 200% przejście Tab odsłoniło pole notatki wewnętrznym przewijaniem; zapis pozostawał dostępny.                                                                                |

Zachowanie trzech stałych sekcji odpowiada zasadzie `tab-bars.md › Best practices`: „Use a tab bar to support navigation, not to provide actions.” Pojedynczy, ograniczony formularz z możliwością zamknięcia realizuje sens `sheets.md › Best practices`. Dodatkowe dostępne przyciski edycji i usunięcia są zgodne z `context-menus.md › Best practices`: „Always make context menu items available in the main interface, too.”

### Wybrane kontrasty rzeczywistych stanów

| Stan                      | Tekst     | Tło       |   Kontrast |
| ------------------------- | --------- | --------- | ---------: |
| Treść, light              | `#152536` | `#f2f4f7` |    14,12:1 |
| Treść, dark               | `#f1f5fa` | `#071019` |    17,48:1 |
| Aktywna karta, light      | `#81500d` | `#e4eaf1` |     5,62:1 |
| Aktywna karta, dark       | `#f1b24f` | `#263b50` |     6,15:1 |
| Zaznaczenie tekstu, light | `#21190c` | `#81500d` | **2,55:1** |
| Zaznaczenie tekstu, dark  | `#21190c` | `#f1b24f` |     9,28:1 |

Tło aktywnej karty jest nieprzezroczystą pigułką, nie oszacowaniem koloru szkła. Powyższa próbka nie jest deklaracją sprawdzenia każdej możliwej pary kolorów.

## Craft, a nie preferencja

Ocena projektowa recenzenta: systemowy krój jest uzasadniony dla krótkich formularzy i list, bursztyn ma rolę w ocenie oraz zapisie, a różne promienie odróżniają grupy od przycisków i arkusza. To konsekwentny kierunek `ENERGY 1 / RHYTHM 2 / MOTION 1` z `DESIGN.md`, nie powód do wymiany typografii lub dodawania ozdób. Nie zgłaszam jako błędów braku nowego logo, bocznego panelu dla trzech sekcji ani odmiennej od natywnego iOS pozycji przycisku zamknięcia.

## Automatyzacja i ograniczenia dowodu

- Lighthouse Accessibility: **100**, snapshot pustego Startu. Axe: bez naruszeń w pięciu sprawdzonych stanach domyślnych: pusty Start light, discovery light, arkusz light, kolekcja light, arkusz dark. To nie oznacza zgodności WCAG: F1–F3 wykryto dodatkowymi próbami.
- Axe w wymuszonych kolorach zgłosił kontrast elementów `mark`; na rzeczywistym zrzucie przeglądarka malowała je jako czarny tekst na żółtym tle. Nie traktuję alarmu opartego na innych kolorach obliczonych jako potwierdzonego defektu.
- W zakończonym przebiegu Playwright nie odnotowano `pageerror`; osobna konsola Chrome DevTools nie wykazała błędów ani ostrzeżeń. Nie jest to wynik pełnej suity regresyjnej. Nie uruchamiano ponownie wszystkich testów jednostkowych/E2E ani lintowania.
- **Brak fizycznego iPhone’a/iPada, Safari z systemową klawiaturą i VoiceOver.** Nie potwierdzono czytania komunikatów przez VoiceOver, zachowania pod Dynamic Island/home indicator ani natywnego Dynamic Type. Drzewo ARIA nie zastępuje testu czytnika.
- Syntetyczna zmiana samego `visualViewport.height` po ustawieniu fokusu zmniejszyła arkusz, ale nie odsłoniła od razu już aktywnej notatki. Wymaga to dalszej próby na rzeczywistej klawiaturze Safari według `virtual-keyboards.md › Mobile (iOS, iPadOS)`: „keep important parts of your interface visible”. Nie klasyfikuję syntetycznej obserwacji jako potwierdzonej awarii iOS. Próby krótkiego okna z normalnym przejściem Tab były poprawne.
- SW był blokowany dla niezależnej inspekcji. Dostarczone zrzuty offline oceniono wizualnie; nie są one dowodem własnego ponownego audytu działania offline. Import/eksport, awarie pamięci i spójność danych nie były przedmiotem tej recenzji.
- Jest to **vanilla web PWA**, nie UIKit. Stosuję zasady czytelności, dostępności i spójności interakcji; nie wymagam natywnego menu macOS, SF Symbols, komponentów UIKit ani automatycznych adaptacji urządzeń Apple, których HTML nie zapewnia.

## Przeczytane odniesienia

Łącznie 12 plików ze skilla `apple-design`, bez wczytywania całej biblioteki:

1. `accessibility.md` (`Vision`, `Mobility`, `Speech`, `Cognitive`).
2. `layout.md` (`Visual hierarchy`, `Adaptability`, `Guides and safe areas`).
3. `typography.md` (`Ensuring legibility`, `Conveying hierarchy`, `Supporting Dynamic Type`).
4. `color.md` (`Best practices`, `Inclusive color`, `System colors`).
5. `designing-for-ios.md` (`Best practices`).
6. `tab-bars.md` (`Best practices`, `Phone (iOS)`, `Tablet (iPadOS)`).
7. `sheets.md` (`Anatomy`, `Best practices`, `Mobile (iOS, iPadOS)`).
8. `context-menus.md` (`Best practices`, `Content`).
9. `dark-mode.md` (`Best practices`, `Dark Mode colors`).
10. `virtual-keyboards.md` (`Best practices`, `Mobile (iOS, iPadOS)`).
11. `cross-platform.md` (`Vocabulary`, `Conventions to check`), tłumaczenie zasad na warstwę webową.
12. `code-audit.md` (`How to run it`), odróżnienie dopasowania w kodzie od potwierdzonego problemu.

## Status końcowy

- **PASS, niezależność recenzji:** osobne konteksty, brak profilu osobistego, brak edycji implementacji.
- **PASS, dowody:** uruchomiona aplikacja, zapisane odtworzenia i pomiary; preferencje odróżnione od usterek, ograniczenia jawne.
- **Nie jest to akceptacja wydania UI:** F1–F3 wymagają korekty i osobnego ponownego sprawdzenia. F4 pozostaje problemem średnim. Żadnej poprawki tych usterek nie oznaczono tutaj jako zweryfikowanej.

Lokalne skrypty i surowe dowody znajdują się wyłącznie w `C:/Users/sellb/AppData/Local/Temp/opencode/`: `apple-hig-independent-review.mjs`, `apple-hig-focus-probes.mjs`, `apple-hig-appearance-probes.mjs` oraz katalog `apple-hig-review/`. Reprodukcje i kluczowe liczby są celowo zapisane także w tym dokumencie, ponieważ pliki tymczasowe nie są częścią repozytorium.
