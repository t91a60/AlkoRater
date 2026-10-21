# Stan wyjściowy

Pomiar przed zmianami funkcjonalnymi, gałąź `feature/alkorater-product-overhaul`.

- Commit: `e707724` (`Fix tab crossfade and modal spring conflicts`).
- Wersja: `2.13.1`, service worker `v7.10`.
- Repozytorium przed pracą: `main` zgodne z `origin/main`; katalog `.serena/` nieśledzony, pozostawiony poza zmianami produktu.
- Runtime: statyczny HTML, CSS, natywne moduły ES. Bez zależności produkcyjnych, bez serwera API.
- Dane: trzy JSON-y, IndexedDB v2 oraz localStorage, GitHub Pages pod `/AlkoRater/`.
- `npm ci`: zakończone, 312 dodanych pakietów; audyt 20 podatności zależności deweloperskich (4 moderate, 14 high, 2 critical). To nie są zależności ładowane przez aplikację.
- `npm test`: 7 plików, 35/35 testów, 10,60 s.
- `npm run lint`: ESLint i Stylelint przechodzą.
- `npm run format:check`: kod wyjścia 1, 9 plików: favorite-repo, data-loader, search, sw-service, context-menu, favorites, haptics, icons, toast.
- `gh issue list --repo t91a60/AlkoRater --state open --limit 50`: brak otwartych zgłoszeń.
- Licencja w `LICENSE`: Apache License 2.0; README zgodne, `package.json` błędnie deklaruje MIT.

## Przeglądarka

Chromium przez Chrome DevTools MCP, odizolowany kontekst `alkorater-overhaul-baseline`, `http://localhost:4173/`, ekran 390 × 844, emulowany dotyk. Nie użyto profilu osobistego ani prawdziwych ocen.

- Pierwsze otwarcie: 336 produktów; start, wyszukiwarka i kategorie dostępne.
- Zapytanie `Żywiec`: 3 wyniki.
- `Żywiec Jasne Pełne`: zapis 4 gwiazdek i testowej notatki.
- Przełączenie sieci na Offline i przeładowanie: start oraz katalog działają, zapis 4 gwiazdek zachowany.
- Konsola: informacja o rejestracji SW, bez błędów podczas tego scenariusza.
- Pojedynczy lokalny pomiar zimnej nawigacji: DOMContentLoaded 60,5 ms, load 60,7 ms, FCP 44 ms. Bez throttlingu, nie jest to pomiar terenowy ani reprezentatywna wydajność telefonu.
- Zrzuty przed zmianami: start, wyniki i formularz oceny, zapisane do katalogu tymczasowego, reprezentatywne pliki zostaną dołączone do raportu.

Nie wykonano fizycznych testów iPhone'a, instalacji iOS ani restartu urządzenia.

## Potwierdzone priorytety

1. Pasek średniej dzieli wynik 1–5 przez 10; progi kolorów 7/5 nie pasują do skali.
2. Wybór produktu i edycja oceny używają nazw zamiast identyfikatorów.
3. Instalacja SW ignoruje błąd precache, czyszczenie cache obejmuje obce nazwy zawierające wersję, ścieżka danych zakłada katalog główny domeny.
4. Aktualizacja kontrolera bezwarunkowo przeładowuje karty.
5. Wyniki i ostatnie pozycje są klikalnymi `div`, gwiazdki nie ogłaszają wyboru i są wizualnie odwrócone względem DOM.
6. Start zawiera serie dzienne i zachęty do picia; puste podsumowanie zajmuje miejsce, a treść jest przycinana na małych wysokościach.
7. Dokumentacja publiczna myli katalogowanie z pomiarem spożycia i opisuje nieistniejącą bibliotekę `idb` oraz instalacyjny prompt.

Szczegółowa analiza trwałości, katalogów i wyniki końcowe: `ALKORATER_OVERHAUL_REPORT_PL.md`.
