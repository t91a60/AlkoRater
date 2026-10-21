# Kierunek interfejsu AlkoRater

Tryb pracy: Operate. Osobisty katalog ocen i notatek, bez śledzenia spożycia.

Kierunek właściciela: Apple-inspired mobile-first PWA, precyzyjna ergonomia iOS bez udawania UIKit. ENERGY 1 / RHYTHM 2 / MOTION 1. Faza Apple bazuje na ukończonej modernizacji `3898706`; nie zmienia zasad danych ani rankingu wyszukiwania.

- Granat `#071019` pozostaje tłem ciemnego wyglądu. Jasny wygląd używa chłodnej porcelany `#f2f4f7`, białych powierzchni i granatowego tekstu. Wygląd odpowiada `prefers-color-scheme`, bez osobnego przełącznika ignorującego system.
- Bursztyn wyróżnia zapis, wybraną ocenę i aktywną nawigację. Kolory nie oceniają gustu użytkownika jako dobrego lub złego.
- Systemowy krój bez plików fontów: treść 17 px, tytuł ekranu 34 px, nazwa w arkuszu 28 px, metadane 13–15 px. Rozmiary są w rem; to skalowalny web UI, nie implementacja Dynamic Type.
- Start prowadzi do wyszukania produktu i odzyskania wcześniejszych notatek. Statystyki są krótkim podsumowaniem prawdziwych ocen.
- Wyszukiwanie i kolekcja używają list: nazwa, marka lub styl, ocena i podgląd notatki. Karty nie opakowują innych kart.
- Rytm 8/12/16/24/32 px grupuje powiązane informacje. Treść przewija się zamiast dopasowywać do wysokości telefonu przez przycinanie.
- Listy i arkusz są nieprzezroczyste. Aproksymacja materiału szkła występuje tylko na pływającej nawigacji i menu kontekstowym. `@supports`, zwiększony kontrast, ograniczenie przezroczystości oraz opcja „Przezroczyste elementy” zapewniają drogę do pełnych powierzchni także bez sygnału systemowego Safari.
- Na telefonie pasek kart unosi się nad treścią z zapasem na safe area; na szerokim ekranie przechodzi do górnej części interfejsu. Karty zachowują pozycje przewijania i reagują na historię przeglądarki. Nie dodajemy zbędnego sidebara dla trzech sekcji.
- Formularz oceny pozostaje pojedynczym arkuszem z chronionym fokusem, przewijaną treścią i osobnym obszarem zapisu. Kolejność gwiazdek jest zgodna z DOM, 1–5 od lewej. Charakterystyczny detal: wybrany stopień ma czytelny numer i krótki ruch, bez zmiany znaczenia skali i bez oceny gustu użytkownika.
- Ruch służy informacji o zmianie stanu. Bez pływających pustych stanów, serii, celebracji 5 gwiazdek i animowanego wejścia każdego wiersza. Ograniczony ruch jest respektowany także przez JS.
- Wszystkie działania mają etykiety, widoczny fokus i obszar dotyku co najmniej 44 px. Niewiadome dane produktu pozostają niewiadome.

Zmiany nie obejmują nowego logo, zdjęć produktów, gamifikacji ani nowego frameworka.

Układ kompaktowy: duży tytuł → główne działanie → ostatnie wpisy → podsumowanie, z pływającymi trzema kartami. Układ szeroki: tytuł i nawigacja u góry → ograniczona szerokość treści → te same funkcje. Bursztyn rozdzielamy na czytelny kolor tekstu i wypełnienie głównego działania, by jasny wygląd nie obniżył kontrastu.

Podstawa decyzji: `typography.md › Ensuring legibility`, `layout.md › Visual hierarchy`, `dark-mode.md › Best practices`, `liquid-glass.md › Where the material belongs`, `search-fields.md › Search as a tab`, `sheets.md › Best practices`, `motion.md › Best practices`. Pełne uzasadnienia, odstępstwa webowe i wyniki: `docs/APPLE_DESIGN_OVERHAUL_PL.md`.
