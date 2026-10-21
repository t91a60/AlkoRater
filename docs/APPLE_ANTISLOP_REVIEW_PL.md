# AlkoRater: niezależny przegląd Anti-Slop

> Nota redakcyjna sesji implementacyjnej: poniżej zachowano pierwotne ustalenia, a odnośniki AFTER skierowano do ocenianego wtedy [archiwum review-initial](screenshots/apple/review-initial/after-overview.png). Późniejsze poprawki i ograniczenie niezależnego recheck opisuje [raport końcowy](APPLE_DESIGN_OVERHAUL_PL.md). To nie jest ponowna akceptacja recenzenta.

Data: 21 października 2026. Tryb Anti-Slop: **DURING**, jawny wybór tej sesji. Przegląd bez zmian implementacji i testów.

## Werdykt

**Dobry, spokojny interfejs użytkowy, nie dekoracyjny pokaz „Apple”.** Największy postęp widać w wyszukiwaniu, kolekcji i arkuszu oceny. Granat, bursztyn i numerowany wybór gwiazdek dają wystarczająco dużo charakteru bez nowych zdjęć, fontów czy efektów. Nie zalecam kolejnego redesignu.

Najsłabszy pozostaje Start: podsumowanie własnych ocen nadal zajmuje miejsce przed wpisami, do których użytkownik ma wracać. Poniżej są dwa potwierdzone defekty prezentacji, jedna istotna uwaga o hierarchii i jedno opcjonalne uproszczenie. Nie stwierdziłem problemu P0/P1 **w zakresie tego przeglądu**; nie jest to potwierdzenie gotowości całej aplikacji do wydania.

## Przedmiot, materiał i metoda

- Gałąź: `design/apple-experience-overhaul`. HEAD podczas przeglądu: `3898706b4f04d9ec165f70dabf5a16c4b7e95565`. Oceniany AFTER to roboczy kandydat z niezacommitowanymi zmianami, nie sam ten commit.
- Kierunek odczytany z `DESIGN.md`: osobisty katalog ocen i notatek, vanilla PWA, **Operate; ENERGY 1 / RHYTHM 2 / MOTION 1**. Tak rozumiem zadanie: odnaleźć produkt lub własną notatkę, a potem krótko zapisać ocenę. Sygnaturą jest czytelna skala 1-5, nie samo szkło.
- Kontekst: `docs/APPLE_DESIGN_AUDIT_BEFORE_PL.md`. Kryteria główne: `antislop` i `antislop-ui`. Poniższe uwagi są samodzielnym osądem projektowym, nie nowym audytem zgodności z HIG.
- **Wszystkie dane na omawianych zrzutach są syntetyczne i służą wyłącznie scenariuszowi testowemu.** Nie są prawdziwymi wpisami użytkownika, rekomendacjami produktów ani dowodem popularności. Sposób przygotowania dokumentuje `scripts/capture-apple-experience.mjs`, w szczególności scenariusz dwóch ocen i notatek w wierszach 92-115; ówczesne metadane: `docs/measurements/apple/review-initial.json`.
- Obejrzałem obrazy, nie tylko ich nazwy: obie galerie oraz indywidualne ekrany Startu, odkrywania, wyników, kolekcji, arkusza, menu, komunikatu zapisu i pustego Startu. Sprawdziłem też odpowiadające im fragmenty HTML/CSS/JS.
- Nie uruchamiałem detektora mechanicznego. Jeden końcowy skaner pozostaje zadaniem sesji nadrzędnej. Nie wykonywałem dodatkowych testów dostępności, zestawów unit/E2E ani własnego pełnego klikania aplikacji. Nie otwierałem nowego kontekstu przeglądarki i nie korzystałem z danych użytkownika.

### Porównanie rzeczywistych zrzutów

| Materiał                                                                                                                                                                                                                                | Obserwacja BEFORE → AFTER                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [BEFORE](screenshots/apple/before-overview.png), [AFTER](screenshots/apple/review-initial/after-overview.png)                                                                                                                           | Mały wspólny nagłówek ustępuje wyraźnym tytułom; sześć jednakowych skrótów wyszukiwania rozdzielono na kategorie i osobne zapytania. Arkusz ma bardziej czytelną nazwę, numerowaną skalę i odseparowany zapis.             |
| [Mały BEFORE](screenshots/apple/before-small.png), [mały AFTER](screenshots/apple/review-initial/after-small.png), 375 × 667                                                                                                            | W obu wersjach ostatnie produkty wymagają przewinięcia. AFTER dodatkowo spycha nagłówek „Ostatnio zapisane” na sam dół pierwszego widoku. To koszt hierarchii, nie dowód trwałego zasłonięcia treści.                      |
| [Start BEFORE](screenshots/apple/before-dark-home.png), [Start AFTER](screenshots/apple/review-initial/after-dark-home.png), 393 × 852                                                                                                  | BEFORE pokazuje dwa ostatnie produkty w całości nad paskiem. AFTER pokazuje pierwszy wiersz tuż nad pływającą nawigacją, a kolejny jest pod nią. Lista jest lepszym formatem, ale podsumowanie zabiera jej pierwszy ekran. |
| [Tablet BEFORE](screenshots/apple/before-tablet.png), [tablet AFTER](screenshots/apple/review-initial/after-tablet.png)                                                                                                                 | Lista wpisów lepiej wykorzystuje szerokość niż dwa małe kafelki. Przeniesienie trzech kart na górę nie wymaga sztucznego sidebara.                                                                                         |
| [Desktop BEFORE](screenshots/apple/before-desktop.png), [desktop AFTER](screenshots/apple/review-initial/after-desktop.png)                                                                                                             | Treść zachowuje ograniczoną szerokość. Nie dodano wykresów ani paneli wyłącznie po to, żeby zapełnić przestrzeń. Start nadal wizualnie rozpoczyna się od statystyk.                                                        |
| [Jasne wyszukiwanie](screenshots/apple/review-initial/after-light-discovery.png), [jasna kolekcja](screenshots/apple/review-initial/after-light-collection.png), [jasny arkusz](screenshots/apple/review-initial/after-light-sheet.png) | To spójny wariant tej samej aplikacji, nie osobny zestaw przypadkowo białych kart. Ocena dotyczy wyglądu, nie zmierzonych współczynników kontrastu.                                                                        |

## Ustalenia według priorytetu

P2 oznacza istotną poprawę czytelności zadania; P3 oznacza dopracowanie lub uproszczenie. Same odwołania do reguł nie oznaczają automatycznie naruszenia całej bramki.

### AS-01 · P2 · Start przedkłada podsumowanie nad powrót do wpisów

**Rodzaj:** ocena hierarchii z udokumentowanym kosztem miejsca, nie błąd działania.

- **Dowód:** porównanie Startu 393 × 852 oraz `after-small.png` w tabeli powyżej. Przed ostatnimi wpisami znajdują się tytuł, wprowadzenie, dwa skróty, duży blok dwóch liczb i osobny wyróżniony produkt. Kolejność wynika z `src/js/ui/dashboard.js:29-69` oraz `index.html:149-165`; rozbudowany blok podsumowania: `src/css/style.css:339-407`.
- **Dlaczego:** „Wróć do zapisanych smaków i własnych notatek” obiecuje odzyskanie treści, a pierwszy ekran jest przede wszystkim panelem podsumowania. Sam Start po podmianie nazwy produktu byłby dość wymienialnym szablonem osobistej biblioteki. To lokalna słabość kompozycji, nie ocena całego przepływu jako generycznego. Odniesienia: **C-3, R-05, R-20**.
- **Zalecenie:** dla niepustej kolekcji przenieść ostatnie wpisy przed rozbudowane podsumowanie albo zamienić podsumowanie na krótki wiersz liczby ocen i średniej. Nie odzyskiwać miejsca przez zmniejszenie tekstu czy pól dotyku. Zachować pomoc i główne działanie wyszukiwania przy pierwszym uruchomieniu.
- **Granica wniosku:** karta „Moje oceny” nadal daje krótką drogę do notatek. Nie twierdzę, że dane są niedostępne ani że wszystko musi mieścić się bez przewijania. Potwierdzenie poprawki wymaga nowego zrzutu; na 393 × 852 warto odzyskać co najmniej jeden pełny wiersz ostatniego wpisu nad nawigacją.

### AS-02 · P2 · Wyróżniony produkt traci informację odróżniającą wariant

**Rodzaj:** potwierdzony defekt prezentacji informacji, zastany również w BEFORE.

- **Dowód:** na Startach AFTER w obu wyglądach „Najwyżej ocenione” pokazuje tylko „Harnaś” i `4/5`, mimo że scenariusz zawiera dwa produkty o tej samej nazwie, ale innej kategorii i zawartości alkoholu. Ostatnie wpisy oraz kolekcja pokazują te różnice. W `src/js/ui/dashboard.js:56-59` wyróżniony przycisk renderuje nazwę i ocenę, bez kategorii, stylu lub procentu.
- **Dlaczego:** szczególnie wyeksponowany skrót wymaga rozpoznania produktu przed otwarciem. Sama nazwa nie identyfikuje wariantu; trzeba pamiętać własne oceny lub otworzyć arkusz. To nie jest błąd identyfikatora danych: przycisk korzysta z `productKey`, a obsługa otwarcia jest w `src/js/main.js:145-147`. Odniesienia: **C-3, R-20, R-31**.
- **Zalecenie:** użyć jednej krótkiej linii istniejących metadanych, tak jak w pozostałych listach. W tym scenariuszu wystarczy kategoria/styl oraz znana zawartość alkoholu. Nie uzupełniać brakujących danych domysłami i nie dodawać zdjęcia.
- **Potwierdzenie poprawki:** dwa identyczne tytuły muszą być rozróżnialne również w wyróżnieniu, bez otwierania arkusza, w obu wyglądach.

### AS-03 · P3 · Pusty stan odziedziczył opakowanie listy, ale nie jej odstępy

**Rodzaj:** potwierdzony defekt wykończenia wariantu pustego, widoczny w AFTER.

- **Dowód:** [pusty ciemny Start](screenshots/apple/review-initial/after-dark-empty.png) i [pusty jasny Start](screenshots/apple/review-initial/after-light-empty.png). Tekst „Zapisane produkty pojawią się tutaj…” zaczyna się przy lewej krawędzi zaokrąglonej powierzchni, zamiast wewnątrz niej. `updateRecentlyRated` w `src/js/ui/dashboard.js:71-77` wstawia sam akapit `.empty-copy`; kontener `.recent-scroll` ma `padding: 0`, podczas gdy rzeczywiste wiersze dostają `16px` (`src/css/style.css:442-458`). `.empty-copy` nie uzupełnia tego odstępu (`:492-496`).
- **Dlaczego:** po wprowadzeniu grupowanej listy pusty wariant wygląda jak przypadkowo obcięty komponent. Komunikat sam w sobie jest konkretny i pomocny; problem nie wymaga nowej ilustracji ani zmiany tekstu. Odniesienia: **C-4, R-27, R-31**; istnienie pustego stanu nie jest kwestionowane.
- **Zalecenie:** dać akapitowi wewnętrzny odstęp zgodny z wierszem listy albo zrezygnować z powierzchni listy w tym stanie. Nie stosować globalnego paddingu do wszystkich `.empty-copy`, bo występują także poza tą grupą.
- **Potwierdzenie poprawki:** osobny zrzut pustego Startu w obu wyglądach, z widocznym odstępem tekstu od zaokrąglonych boków.

### AS-04 · P3 · Pasek średniej jest pierwszym dodatkiem do usunięcia

**Rodzaj:** opcjonalne uproszczenie i ryzyko interpretacyjne, nie potwierdzony błąd danych ani gamifikacja.

- **Dowód:** na Startach pasek leży pod dwiema liczbami i nad liczebnościami kategorii. W `src/js/ui/dashboard.js:51` wypełnienie wynika z `average / 5`, a nie udziałów kategorii. Źródło liczb jest prawidłowo określone w `collectionStats` (`:12-27`).
- **Dlaczego:** powtarza średnią widoczną tuż wyżej, zajmuje dodatkową warstwę uwagi i bez własnego opisu może zostać odczytany jako udział kategorii lub postęp. Nie ma tu podstaw do zarzutu wymyślonych statystyk ani zachęcania do większego spożycia. Odniesienia: **C-3, R-01, R-31**, nie R-17.
- **Zalecenie:** usunąć pasek przy upraszczaniu AS-01. Jeżeli zostaje, połączyć go jednoznacznie ze średnią i skalą 1-5, nie z podziałem kategorii. To preferencja redukcji szumu, nie warunek działania aplikacji.

## Co zachować i czego nie „poprawiać” dla samej estetyki

1. **Skala gwiazdek z numerami.** W [ciemnym arkuszu](screenshots/apple/review-initial/after-dark-sheet.png) i jasnym odpowiedniku zaznaczony stopień ma własny kontur oraz liczbę. Gwiazdka oznacza rzeczywistą ocenę, nie ozdobną „magię AI” (R-04). To najmocniejszy detal tożsamości, bez celebracji wysokiego wyniku.
2. **Lista jako format treści.** Kategorie wyszukiwania, wyniki i kolekcja mają powtarzalne wiersze dlatego, że dane są porównywalne. Nie jest to problem „identycznych kart funkcji”. Rozdzielenie kategorii od skrótów `0.0%`, `IPA`, `Lager` usuwa arbitralną sześciokafelkową kompozycję.
3. **Dyscyplina szkła.** W sprawdzonych regułach szkło obejmuje tylko `.bottom-nav` i `.context-menu`, czyli maksymalnie dwie równoczesne powierzchnie (`src/css/style.css:1335-1360`). Listy i arkusz pozostają pełne. Menu widać na zrzutach `after-dark-context.png` i `after-light-context.png`. Brak rozmytego nagłówka jest zaletą, nie brakującym efektem (R-10).
4. **Jawna kontrola przezroczystości.** „Przezroczyste elementy” ma opis zakresu (`index.html:200-209`); kod zapisuje wybór i ustawia `data-opaque-surfaces` (`src/js/main.js:328-350`), a CSS wyłącza filtr (`:1345-1351`). To konkretna droga do pełnego tła niezależna od otrzymania sygnału systemowego. Potwierdziłem powiązanie w źródłach, nie zachowanie Safari na urządzeniu.
5. **Systemowy krój i stonowana paleta.** Większy tytuł oraz nazwa w arkuszu budują hierarchię bez importowania modnego fontu. Jasny wariant zachowuje granatowy tekst i ciemniejszy bursztyn ocen. Nie ma powodu dodawać serifów, gradientów, faktur lub zdjęć wyłącznie dla „oryginalności” (R-01, R-06, R-20).
6. **Nieliczne, uzasadnione elementy sterujące.** Dolne trzy karty i zapis na dole arkusza sprzyjają obsłudze jedną ręką. To ocena rozmieszczenia, nie test fizycznego zasięgu kciuka. Duże „Szukaj produktu” ma cel przy pustej kolekcji. „Moje oceny”, „Wszystkie oceny” i karta nawigacji powtarzają kierunek, ale mają rzeczywiste handlery (`src/js/main.js:137-148, 185-187`); nie nazywam ich martwymi kontrolkami. Przy upraszczaniu niepustego Startu można usunąć jeden powtórzony skrót, zamiast dodawać kolejne menu.
7. **Uczciwy charakter aplikacji.** W obejrzanym przepływie nie ma fikcyjnych opinii klientów, marketingowych liczb ani serii spożycia. Statystyki są obliczane z zapisanych ocen, a syntetyczna zawartość zrzutów nie jest dowodem fabrykowania treści przez aplikację. Komunikaty o lokalnym zapisie i kopii JSON są konkretniejsze niż ogólne obietnice „bezpieczeństwa”.

## Stan bramki i ograniczenia

**Końcowa bramka Anti-Slop pozostaje OTWARTA.** Oddaję raport przeglądu, nie projekt z deklaracją PASS. Propozycje powyżej nie są wykonanymi poprawkami.

| Obszar bramki                                                                        | Stan dowodu w tym raporcie                                                                                                                                                                              |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hard Gate: uczciwość zawartości                                                      | Brak rozpoznanego naruszenia w obejrzanych ekranach; dane zrzutów jawnie syntetyczne, logika podsumowania sprawdzona w źródle. Nie jest to skan wszystkich tekstów.                                     |
| Hard Gate: responsywność, kontrast, klawiatura, kompletność działania i stanów, R-35 | **Nie zamknięto.** Zrzuty nie potwierdzają wszystkich zachowań, kontrastu, powiększenia tekstu ani przejść pusty/loading/error. Nie nadaję tym pozycjom PASS na podstawie wyglądu lub samych handlerów. |
| Purpose-Gate: paleta, typografia, ikony, szkło, cienie                               | Uzasadnione przez `DESIGN.md` i zgodne z obejrzanymi ekranami; pasek średniej jest kandydatem do uproszczenia, nie automatycznie zakazanym efektem.                                                     |
| Charakter i rytm                                                                     | Wyszukiwanie i arkusz mają własny, spokojny charakter. Start wymaga decyzji o hierarchii AS-01. Z nieruchomych zrzutów nie potwierdzam jakości ani przerywalności ruchu.                                |
| Wykończenie i odporność wariantów                                                    | Otwarte defekty prezentacji AS-02 i AS-03. Sprawdzenie po korekcie pozostaje do wykonania.                                                                                                              |
| Końcowy detektor i testy nowego UX                                                   | Poza wykonaniem tej recenzji; sesja nadrzędna dopisuje własne wyniki i zamyka bramkę dopiero po weryfikacji.                                                                                            |

Nie badano fizycznego iPhone'a/iPada, Safari, klawiatury ekranowej, VoiceOver, instalacji ani rzeczywistych safe areas. Nie wyliczałem kontrastu i nie przypisuję zrzutom zgodności z WCAG. Nie wymagam natywnego Liquid Glass, SF Symbols ani natywnych API od aplikacji HTML/CSS/JS. Brak prawdziwych fotografii katalogowych jest założeniem produktu, nie luką do wypełnienia wygenerowanymi obrazami.

To zapis **pierwotnych ustaleń** dla ocenionego kandydata. Ewentualne korekty, nowe zrzuty i wyniki sesji nadrzędnej należy dokumentować oddzielnie, bez przedstawiania tych rekomendacji jako już sprawdzonych napraw.
