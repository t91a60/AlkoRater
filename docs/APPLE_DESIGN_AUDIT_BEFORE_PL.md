# AlkoRater: audyt przed fazą Apple

Baza: `3898706b4f04d9ec165f70dabf5a16c4b7e95565`, gałąź wejściowa `feature/alkorater-product-overhaul`, nowa gałąź `design/apple-experience-overhaul`. Jedyny zastany nieśledzony katalog: `.serena/`. Nie cofnięto ani nie zastąpiono wcześniejszej modernizacji. Bazowe 159 testów, 96 E2E, lint i formatowanie przechodzą.

`apple-design` dostępny dla OpenCode w `.agents/skills/apple-design`. Zapis instalatora i oficjalny GitHub wskazują commit `914b6a377c22755597e4405e54911b996de822d7` z 15 października 2026. SKILL.md zgadza się z tym commitem po normalizacji CRLF/LF. Nie uruchamiano instalatora ani skryptu pobierającego HIG. Biblioteka podaje generację referencji 15 października; jest źródłem użytych cytatów, nie deklaracją ponownego zweryfikowania całej witryny Apple.

Artefakt: działająca lokalna PWA, HTML/CSS/ES modules. Przegląd Chrome DevTools w izolowanym kontekście iPhone 15 Pro-sized 393 × 852, oraz izolowany Playwright: 375 × 667, 430 × 932, 834 × 1112, 1440 × 900. To nie fizyczny Safari. [Przegląd zrzutów](screenshots/apple/before-overview.png), [pomiary](measurements/apple/before.json).

## Co zachować

Jasne etykiety, trzy działające sekcje, poprawna skala 1–5, dostępne radia, widoczny fokus, inert i powrót do elementu otwierającego, ochrona niezapisanej notatki, Cofnij, prywatny zapis, kopie i odzyskiwanie. Katalog nie zawiera zdjęć; lokalny symbol jest uczciwszy niż wymyślona fotografia. Start już nie ma serii i zachęt do picia. To wartościowe elementy, a nie materiał do wymiany dla nowości.

## Ustalenia What / Why / Fix

### High: brak jasnego wyglądu (HIG i dostępność w różnych warunkach)

- What: `:root` i metadane wymuszają dark; preferencja light nie zmienia wyglądu. Brak `prefers-contrast`.
- Why: `dark-mode.md › Best practices`: „Ensure that your app looks good in both appearance modes”; `color.md › Best practices` wymaga wariantów i zwiększonego kontrastu. Nie jest to wymóg użycia natywnego API w PWA.
- Fix: semantyczne kolory dla obu wyglądów, systemowy wybór, osobne pomiary kontrastu i mocniejsze granice przy increased contrast.

### Medium: karty zapominają przewijanie (UX, zasada zachowania kontekstu)

- What: `src/js/ui/tabs.js` zawsze przewija wspólny obszar na 0; Back nie odtwarza karty ani nie zamyka arkusza.
- Why: `tab-bars.md › Best practices` opisuje zachowanie stanu sekcji; `design-principles.md › Flexibility`: „Preserve a person’s context”. To zalecenie interakcji webowej, nie obietnica natywnego gestu Safari.
- Fix: pozycja per karta, historia tylko rzeczywistych przejść, Back dla arkusza bez utraty tekstu, testy szybkich zmian.

### Medium: hierarchia i metadane (craft, nie udowodniony błąd kontrastu)

- What: tytuł ekranu 18 px konkuruje z treścią, część metadanych ma 12 px, obrysy pól są równie silne jak separatory. Zrzuty są czytelne, ale skanowanie nie ma wyraźnego rytmu.
- Why: `typography.md › Conveying hierarchy`, `layout.md › Visual hierarchy`. Domyślne 17 pt jest wskazówką natywną; w PWA używamy świadomie 17 CSS px i rem, nie utożsamiamy jednostek.
- Fix: większy tytuł ekranu, 13–15 px metadane, prostsze grupy i fokus wokół całego pola zamiast wewnętrznego prostokąta.

### Medium: materiały nie mają celu w obecnym układzie (craft i wydajność)

- What: header i dolny pasek są prawie nieprzezroczyste i oddzielone od przewijania, więc stałe rozmycie niewiele wnosi. Menu jest pełną powierzchnią.
- Why: `materials.md › Liquid Glass`: „Use Liquid Glass effects sparingly”; `liquid-glass.md › Review checklist` wymaga oddzielenia treści od funkcjonalnej warstwy.
- Fix: usunąć blur headera; mały, pływający pasek i menu mogą otrzymać kontrolowany materiał. Nie stosować go na liście ani na notatkach. Opaque fallback nie jest błędem webowym mimo natywnego zalecenia standardowego materiału.

### Medium: arkusz i animacje (UX i odporność)

- What: nazwa produktu ma 22 px, zapis jest częścią całego scrolera, dwa niezależne kontrolery otwarcia i lokalny spring cofnięcia gestu mogą konkurować. Promień jest przepisywany w klatkach. Brak testów klawiatury ekranowej na sprzęcie.
- Why: `sheets.md › Best practices`, `modality.md › Best practices`, `motion.md › Best practices`: „Let people cancel motion”.
- Fix: pojedynczy krótki formularz, osobna przewijana treść i stopka zapisu, jedno zarządzanie ruchem, drag wyłącznie z uchwytu, ochrona dirty state także przy Back. Testy visualViewport to test logiki, nie prawdziwej klawiatury iOS.

### Medium: czas na Cofnij (dostępność)

- What: przycisk Cofnij znika po 4 sekundach; użytkownik czytnika może nie zdążyć go dosięgnąć.
- Why: `accessibility.md › Cognitive`: „Minimize use of time-boxed interface elements”.
- Fix: komunikat z Cofnij pozostaje do cofnięcia, jawnego zamknięcia lub zastąpienia inną akcją; zwykły zapis może mieć krótki, nieinteraktywny komunikat.

### Low: sugestie i pola (ocena produktowa)

- What: sześć równych kafelków miesza kategorie i przykładowe style; brak wizualnego rozdzielenia tych celów. Poprawność wyszukiwarki jest już dobrze przetestowana.
- Why: `searching.md › Best practices`, `search-fields.md › Best practices`. Wybór list kategorii zamiast kafli jest decyzją projektową, nie bezwzględnym wymogiem Apple.
- Fix: trzy spokojne wiersze kategorii i osobne skróty 0.0%, IPA, Lager; nie zmieniać rankingu.

## Pokrycie i ograniczenia

Sprawdzono Start pusty i z ocenami, nagłówek, nawigację, sugestie i wyniki, metadane, arkusz i edycję, gwiazdki, kolekcję, menu, komunikat zapisu, offline i mniejsze/szersze układy. Początkowe ładowanie ma tekst i szkielety, ale nowy lokalny pomiar wykazał CLS 0,226; zbadać rezerwowanie miejsca zamiast porównywać z historycznym, innym eksperymentem. Instalacyjny splash jest zasobem systemowym, nie ekranem, który wolno udawać w przeglądarce. Update, błąd danych i naprawa są objęte istniejącymi E2E. Fizyczna klawiatura, VoiceOver, safe area sprzętu i instalacja iOS pozostają niezweryfikowane.
