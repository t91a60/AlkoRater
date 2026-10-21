# Kierunek interfejsu AlkoRater

Tryb pracy: Operate. Osobisty katalog ocen i notatek, bez śledzenia spożycia.

Kierunek właściciela: mobile-first PWA, powściągliwe dopracowanie inspirowane ergonomią iOS, zachowanie użytecznej tożsamości produktu. ENERGY 1 / RHYTHM 2 / MOTION 1.

- Granat `#071019` pozostaje rozpoznawalnym tłem istniejącej aplikacji. Nie zastępujemy marki nowym szablonem ani nie dodajemy obrazów z sieci.
- Bursztyn wyróżnia zapis, wybraną ocenę i aktywną nawigację. Kolory nie oceniają gustu użytkownika jako dobrego lub złego.
- Systemowy krój zapewnia natywną czytelność i brak pobierania fontów. Nagłówki różnią się wielkością, nie dekoracją.
- Start prowadzi do wyszukania produktu i odzyskania wcześniejszych notatek. Statystyki są krótkim podsumowaniem prawdziwych ocen.
- Wyszukiwanie i kolekcja używają list: nazwa, marka lub styl, ocena i podgląd notatki. Karty nie opakowują innych kart.
- Rytm 8/12/16/24/32 px grupuje powiązane informacje. Treść przewija się zamiast dopasowywać do wysokości telefonu przez przycinanie.
- Powierzchnie są przeważnie jednolite. Rozmycie jest zarezerwowane dla nagłówka i dolnej nawigacji, które oddzielają przewijaną treść.
- Formularz oceny pozostaje arkuszem z chronionym fokusem, przewijaniem i bezpiecznym obszarem dolnym. Kolejność gwiazdek jest zgodna z DOM, 1–5 od lewej.
- Ruch służy informacji o zmianie stanu. Bez pływających pustych stanów, serii, celebracji 5 gwiazdek i animowanego wejścia każdego wiersza. Ograniczony ruch jest respektowany także przez JS.
- Wszystkie działania mają etykiety, widoczny fokus i obszar dotyku co najmniej 44 px. Niewiadome dane produktu pozostają niewiadome.

Zmiany nie obejmują nowego logo, zdjęć produktów, gamifikacji ani nowego frameworka.
