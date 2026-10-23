# Kompozycja przed implementacją

Trzy dostarczone zrzuty pokazują Start, Szukaj i puste Oceny. Podglądy mają proporcje 923 × 2000; 393 × 852 CSS px odpowiada proporcjom, ale nie potwierdza modelu telefonu, skali ani ustawień tekstu. Pasek ma wspólne położenie na trzech obrazach. Zdjęcia nie dowodzą błędu pozycjonowania.

Kod: nagłówek minimum 100 px plus safe area, tytuł 34 px, pasek 74 px plus odstęp. Start ma dwie akcje i powtórzony pusty stan. Zielony znak jest nieinteraktywnym `logo.png`, z blaskiem w grafice.

## Kierunek

Osobista biblioteka ocen i notatek. ENERGY 1 / RHYTHM 2 / MOTION 1. Charakter: bursztynowa skala ocen, zwięzłe metadane, systemowe liternictwo. Bez nowych ilustracji, dekoracji i animacji.

**A: Native Minimal.** Nagłówek 24 px; pusty stan jako jedna grupa z jedną akcją; narzędzia danych zwinięte pod nim. Z danymi: ostatnie wpisy przed rzeczywistym podsumowaniem. Search: pole, trzy zwarte wiersze kategorii, zapytania pomocnicze. Oceny: wyszukiwanie i filtry tylko z danymi. Arkusz: nazwa 22 px, metadane, numerowana skala, notatka, osobny Zapisz.

**B: Premium Collection.** Otwarty pusty stan, mocniejsza hierarchia tytułów. Kategorie obok siebie. Zapisane produkty jako dwukolumnowa półka z nazwą i notatką. Większa nazwa produktu w arkuszu. Różnica struktury, nie tylko palety.

```
A / kompaktowy              A / szeroki
Kolekcja    AlkoRater        Kolekcja        Start Szukaj Oceny
[Pusty stan + akcja]         [Ostatnie wpisy, szeroka lista]
Kopia danych        ›       [Podsumowanie rzeczywistych ocen]
Wygląd              ›       [Narzędzia danych]
Informacje          ›
Start  Szukaj  Oceny
```

Wybór po porównaniu pięciu renderów. Lista ma przewagę przy brakujących zdjęciach, podobnych nazwach i notatkach. Wariant półki musi uzasadnić większą powierzchnię każdego produktu.

## Tokeny planowane

Tło #f5f5f3 / #18191b; grupa #fff / #232426; pole #edeeeb / #2e3032; tekst #242522 / #f3f2ed; pomocniczy #62645f / #b7b9b3; akcent #805009 / #e9b45e. Promienie 10/14/22 px. Typografia 24/20/17/15/13 px, w rem. Cele minimum 44 CSS px. Kontrast do pomiaru na renderze.

## Przeczytane odniesienia Apple

- `design-principles.md › Simplicity`: “Include just what's necessary”; `Craft`: “Experiment and iterate”.
- `layout.md › Visual hierarchy`: “Order content by relative importance”, grupowanie i progressive disclosure; `Adaptability`, `Guides and safe areas`.
- `typography.md › Conveying hierarchy`, `Supporting Dynamic Type`; `accessibility.md › Vision`, `Mobility`, `Cognitive`; `color.md › Best practices`, `Inclusive color`.
- `designing-for-ios.md`: Ergonomics; `cross-platform.md`: CSS tokens, zoom, ARIA zamiast natywnych API.
- `search-fields.md › Best practices`: “If possible, start search immediately when a person types”; `searching.md`: główne miejsce i historia.
- `tab-bars.md › Best practices`: stałe sekcje i etykiety; `sheets.md › Best practices`, `Mobile`: zamknięcie i ochrona szkicu.
- `lists-and-tables.md › Content`, `Style`: czytelne tekstowe wiersze; `writing.md › Best practices`: jasny następny krok pustego ekranu.
- `motion.md › Best practices`; `materials.md › Liquid Glass`; `liquid-glass.md › Where the material belongs`: powściągliwość.

To zasady przeniesione do PWA, nie UIKit, natywne Liquid Glass ani Dynamic Type. Pełny pasek w układzie flex zapewnia miejsce dla treści bez symulowania refrakcji.
