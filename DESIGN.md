# Kierunek interfejsu AlkoRater

Tryb pracy: Operate. Osobisty katalog ocen i notatek, bez śledzenia spożycia.

Kierunek właściciela: Apple-inspired mobile-first PWA, precyzyjna ergonomia iOS bez udawania UIKit. ENERGY 1 / RHYTHM 2 / MOTION 1. Faza Apple bazuje na ukończonej modernizacji `3898706`; nie zmienia zasad danych ani rankingu wyszukiwania.

- Korekta zastępuje granat grafitem `#18191b`, z grupami `#232426` i polami `#2e3032`. Jasny wygląd: `#f5f5f3`, białe grupy, tekst `#242522`. Wygląd odpowiada systemowemu `prefers-color-scheme`.
- Bursztyn wyróżnia zapis, wybraną ocenę i aktywną nawigację. Kolory nie oceniają gustu użytkownika jako dobrego lub złego.
- Systemowy krój bez plików fontów: treść 17 px, tytuł ekranu 24 px, nazwa w arkuszu 22 px, metadane 13–15 px. Rozmiary są w rem; to skalowalny web UI, nie implementacja Dynamic Type.
- Start prowadzi do wyszukania produktu i odzyskania wcześniejszych notatek. Statystyki są krótkim podsumowaniem prawdziwych ocen.
- Wyszukiwanie i kolekcja używają list: nazwa, marka lub styl, ocena i podgląd notatki. Karty nie opakowują innych kart.
- Rytm 8/12/16/24/32 px grupuje powiązane informacje. Treść przewija się zamiast dopasowywać do wysokości telefonu przez przycinanie.
- Listy, arkusz i nawigacja są nieprzezroczyste. Ograniczone rozmycie pozostaje tylko na przejściowym menu kontekstowym, z dostępną opcją pełnego tła.
- Na telefonie pasek zajmuje własne miejsce pod przewijaną treścią i uwzględnia safe area; nie ma pigułki ani animowanego zaznaczenia. Na szerokim ekranie nawigacja przechodzi do nagłówka. Zachowano historię i przewijanie.
- Formularz oceny pozostaje pojedynczym arkuszem z chronionym fokusem, przewijaną treścią i osobnym obszarem zapisu. Kolejność gwiazdek jest zgodna z DOM, 1–5 od lewej. Charakterystyczny detal: wybrany stopień ma czytelny numer i krótki ruch, bez zmiany znaczenia skali i bez oceny gustu użytkownika.
- Ruch służy informacji o zmianie stanu. Bez pływających pustych stanów, serii, celebracji 5 gwiazdek i animowanego wejścia każdego wiersza. Ograniczony ruch jest respektowany także przez JS.
- Wszystkie działania mają etykiety, widoczny fokus i obszar dotyku co najmniej 44 px. Niewiadome dane produktu pozostają niewiadome.

Zmiany nie obejmują nowego logo, zdjęć produktów, gamifikacji ani nowego frameworka.

Układ kompaktowy pusty: zwięzły tytuł, jeden komunikat i jedna akcja, zwinięte narzędzia. Z danymi: ostatnie wpisy przed podsumowaniem. Search: pole przed kategoriami, bez instrukcyjnego akapitu. Oceny ujawniają kontrolki dopiero przy danych. Układ szeroki zachowuje te same funkcje. Wybrano Native Minimal zamiast dwukolumnowej półki Premium Collection, bo katalog nie ma zdjęć, a nazwy, moc i notatki wymagają szerokości wiersza.

Podstawa decyzji: `typography.md › Ensuring legibility`, `layout.md › Visual hierarchy`, `dark-mode.md › Best practices`, `liquid-glass.md › Where the material belongs`, `search-fields.md › Search as a tab`, `sheets.md › Best practices`, `motion.md › Best practices`. Pełne uzasadnienia, odstępstwa webowe i wyniki: `docs/APPLE_DESIGN_OVERHAUL_PL.md`.
