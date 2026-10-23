# Doprecyzowanie Startu po przeglądzie Apple Design Skill

## Zakres

Prace wyłącznie na `design/apple-experience-correction`. Nie zmieniono cudzych modyfikacji `README.md` i `.gitignore`. Bez pushu i wdrożenia.

## Kompozycja i uzasadnienie

Przed implementacją ustalono hierarchię: tytuł → ostatnie wpisy (lub jeden pusty stan) → zwięzłe podsumowanie → jedno drugorzędne wejście do narzędzi. Nie dodano dekoracji dla wypełnienia wolnej przestrzeni.

- **Jedna ocena:** produkt występuje raz, w ostatnich wpisach; nie ma ponownej karty „Najwyżej ocenione”. Liczba i średnia nadal pochodzą z zapisanych danych. Przy większej kolekcji wyróżnienie pozostaje dostępne.
- **Podsumowanie:** padding 16 px, bez poprzedniego dodatkowego pionowego odstępu nad kategoriami. Mniej powierzchni dla liczb, więcej uwagi dla zapisanych produktów.
- **Narzędzia:** jedno disclosure „Ustawienia i dane” zamiast trzech równorzędnych sekcji technicznych. Wewnątrz zachowano kopię/import/odzyskiwanie, preferencje i informacje. Przy błędzie odczytu zewnętrzna sekcja otwiera się automatycznie, aby nie ukrywać pomocy.
- **Nagłówki:** usunięto powtarzany wordmark. Nazwa ekranu ma pełną szerokość także przy dużym tekście. Ikona instalacyjna i nazwa aplikacji pozostają bez zmian.

## Referencje przeczytane podczas przeglądu

- `layout.md › Visual hierarchy`: “Order content by relative importance”, “Use progressive disclosure to make layouts cleaner and easier to interact with”. Grupowanie narzędzi jest przekładem tej zasady na HTML `details`, nie natywny ekran Settings.
- `typography.md › Conveying hierarchy`: “Adjust font weight, size, and color as needed to emphasize important information”. Mniejsze znaczenie narzędzi wyrażono kolorem i położeniem, nie zmniejszaniem celów dotyku.
- `lists-and-tables.md › Content`: “Keep item text succinct so row content is comfortable to read”. Usunięcie powtórzenia pojedynczej oceny jest oceną kompozycji autora zgodną z tą zasadą, nie dosłownym nakazem HIG.
- `writing.md › Best practices`: “Consider each screen's purpose”. Start służy powrotowi do ocen, nie obsłudze technicznej aplikacji.
- Dodatkowo przeczytano: `accessibility.md`, `color.md`, `designing-for-ios.md`, `cross-platform.md`, `tab-bars.md`, `search-fields.md`, `sheets.md`.

## Dowody wizualne

Poprzednia iteracja: [Start z oceną](screenshots/correction/after/light-home-populated.png), [Start pusty](screenshots/correction/after/dark-home-empty.png).

Nowa iteracja: [Start z oceną](screenshots/correction/refined/light-home-populated.png), [Start pusty](screenshots/correction/refined/dark-home-empty.png), [galeria](screenshots/correction/refined/overview.png).

Przejrzano rzeczywiste rendery Chromium dla jasnego i ciemnego wyglądu, 0/1/10/100 ocen, małego i szerokiego ekranu, 200% tekstu, arkusza, wyszukiwania i offline. Capture zakończył się bez błędów JS. Oryginalne dowody poprzedniej iteracji zachowano. Nie jest to test fizycznego iPhone'a ani niezależna recenzja.

## Weryfikacja

- Jednostkowe: 166/166 PASS, 15 plików.
- ESLint i Stylelint: PASS.
- Nowe asercje przeglądarkowe obejmują brak wordmarku, jednego wyróżnienia przy 0/1 ocen, ukryte narzędzia i ich automatyczne ujawnienie przy awarii danych. Test kopii nadal wykonuje faktyczne pobranie/import.
- Service worker: wyłącznie wersja cache `v8.2-collection-rc2`, z dopasowaną oczekiwaną wersją w testach. Nie zmieniono schematu danych ani mechanizmu aktualizacji.

Pierwszy pełny E2E: 160 PASS / 4 FAIL. Ten sam stary scenariusz w czterech przeglądarkach próbował otworzyć wyróżnienie przy jednej ocenie. Test teraz sprawdza jego brak, a otwieranie wyróżnienia i powrót fokusu sprawdzane są dla 10 i 100 ocen. Drugi pełny przebieg: 163 PASS / 1 FAIL; wszystkie scenariusze nowego układu przeszły. Niepowodzenie dotyczyło wejścia w Search w historycznej aplikacji 2.13.1 w Firefox, przed instalacją bieżącej wersji. Uruchomiono osobny retest, bez zmiany asercji ani implementacji.

Build: 59 plików; katalog: 336 ID, zero błędów; format: PASS. Commit implementacji tej iteracji: `5d8bfa1`.

**Końcowa weryfikacja: 164/164 E2E PASS (2,4 minuty), bez pominięć.** Osobny retest pierwotnie potwierdził błąd Firefox. Źródło historycznego `sw-service.js` ujawniło automatyczny reload przy pierwszym `controllerchange`. Test klikał pomiędzy przejęciem kontroli a reloadem. Dodano oczekiwanie na typ nawigacji `reload` i ponowne wczytanie 336 produktów, bez zmiany historycznego kodu ani asercji migracji. Retest Firefox 1/1 PASS, następnie cały zestaw 164/164 PASS. Nie zwiększano timeoutów i nie pomijano scenariusza.

Anti-Slop DURING: bez dodatkowych assetów, animacji, szkła i wymyślonych statystyk; cel każdej zmiany opisany powyżej. Granice: nadal PWA, bez natywnych komponentów UIKit i Dynamic Type.
