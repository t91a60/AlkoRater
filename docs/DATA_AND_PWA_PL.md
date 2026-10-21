# Dane, migracja i odzyskiwanie

## Decyzja architektoniczna

Pozostaje aplikacja statyczna. Konta i synchronizacja nie są potrzebne do osobistego katalogu na jednym urządzeniu. Nie dodajemy serwera ani biblioteki do IndexedDB.

Ocena ma osobny identyfikator wpisu `id`, `productId`, migawkę `item`, `stars` (liczba całkowita 1–5), `tag`, `note`, `date` i `revision`. Produkt identyfikuje para źródło katalogu + istniejące ID. Nazwa nie jest identyfikatorem. Migawka pozwala zachować produkt usunięty z katalogu. Zmiana kolejności katalogu nie zmienia ID; opublikowanych ID nie wolno zmieniać ani ponownie używać.

Dla starych migawek bez ID używamy jawnego klucza legacy (kategoria, marka, nazwa). Nie zgadujemy powiązania przy wielu kandydatach. Zmiana nazwy takiej pozycji wymaga ręcznego rozstrzygnięcia; nie kasujemy starego wpisu.

## Zasady zapisu przed implementacją

1. IndexedDB jest źródłem prawdy. Mutacja odczytuje aktualne wpisy i zapisuje zmianę w jednej transakcji `readwrite`, zamiast zastępować bazę kopią stanu karty.
2. Oczekiwane ID wpisu wraz z rewizją chronią przed nadpisaniem równoległej edycji, także po usunięciu i ponownym dodaniu produktu. Konflikt zatrzymuje zapis i zachowuje tekst formularza.
3. Stan interfejsu zmienia się dopiero po `transaction.oncomplete`. Abort, limit miejsca i błąd odczytu nie oznaczają sukcesu ani pustej kolekcji.
4. Migracja z klucza localStorage `favorites` odbywa się tylko raz, w transakcji z metadanymi. Niepusta baza IndexedDB ma pierwszeństwo. Oryginalna kopia localStorage zostaje do odzyskania, nie jest usuwana ani synchronizowana w obie strony.
5. Awaryjny backend localStorage jest wybierany jawnie i zapamiętany; nie przełączamy backendów po błędzie transakcji. Zapisy wymagają Web Locks, by dwie karty nie nadpisywały wzajemnie zmian. Gdy bezpieczny zapis nie jest dostępny, aplikacja informuje o ograniczeniu.
6. Usunięcie jest zapisywane od razu, nie po czasie trwania toastu. Cofnięcie to osobna bezpieczna mutacja, która nie zastępuje nowszej oceny.
7. Import waliduje cały plik przed zapisem i tylko dodaje brakujące wpisy. Konflikty i duplikaty są pomijane, istniejące oceny nie są zastępowane. Cały import jest jedną transakcją.
8. Uszkodzone dane nie są naprawiane przez wyczyszczenie bazy. Zapis zostaje zablokowany; dostępny jest eksport surowej kopii do ręcznego odzyskania.

To nie jest gwarancja zachowania danych przez przeglądarkę: czyszczenie witryny, prywatny profil, ewikcja, zmiana domeny lub urządzenia mogą usunąć lokalne dane. Regularna kopia JSON jest jedyną kopią niezależną od pamięci witryny. `navigator.storage.persist()` jest prośbą, nie gwarancją.

## Kontrakt katalogu

Obsługiwane źródła to `beer`, `wine`, `vodka`. ID pozostaje nadanym przez katalog ID, nie numerem aktualnej pozycji. Nazwa jest wymagana. Marka, kraj, styl i obraz mogą być nieznane. Procent alkoholu normalizujemy do zakresu 0–100, nie przypisujemy brakującej wartości. Wyszukiwanie usuwa różnice wielkości liter i polskich znaków, lecz tekst wyświetlany zachowuje oryginalną pisownię.

Zdjęcia są dopuszczone tylko z zasobów tej samej aplikacji. Brak zdjęcia używa istniejącego neutralnego symbolu. Nie pobieramy zdjęć ani nie dopisujemy danych handlowych z zewnętrznych katalogów.

## Kopia JSON

Format: `app: "AlkoRater"`, `schemaVersion: 1`, `exportedAt` i `records`. Plik może zawierać prywatne notatki. Trzymaj go w zaufanym miejscu. Import nie uruchamia HTML ani adresów z pliku.

Edytor ogranicza nowy tekst do 10 000 znaków, ale wczytanie starszej, dłuższej notatki jej nie odrzuca ani nie skraca. Podgląd na liście jest krótki; pełny tekst pozostaje w formularzu i kopii. Duże pliki (ponad 5 MB) wymagają dodatkowego potwierdzenia. Eksport i import obsługują ten sam kontrakt, bez limitu rozmiaru odrzucającego własną poprawną kopię. Faktycznym ograniczeniem pozostaje pamięć urządzenia; walidacja kolekcji dopuszcza najwyżej 20 000 wpisów.

## Offline i aktualizacja

Identyfikatory wpisów w jednym pliku muszą być unikalne. Powtórzone ID odrzucają całą kopię, zamiast zgadywać, którą notatkę zachować. Import pomija ID i produkty już obecne w kolekcji; nie zastępuje wcześniejszych ocen.

Pełna pierwsza instalacja wymaga internetu. Gotowy katalog i powłoka tworzą spójny, wersjonowany zestaw. Zmiana wersji wymaga zmiany wersji cache w service workerze. Nie należy kasować IndexedDB ani localStorage w celu naprawienia cache.

Nieudana instalacja czeka na zakończenie obu pobrań i usuwa wyłącznie własne niedokończone zestawy. Aktywacja zachowuje bieżącą i poprzednio aktywną generację. Porządkowanie nie dotyka obcych, historycznych bezprzestrzennych cache ani zestawów utworzonych później, które mogą należeć do trwającej instalacji nowszego wydania.

Nawigacja sprawdza obecność plików powłoki. Gdy któregoś brakuje, wyświetla prosty, dostępny bez JavaScript ekran odzyskiwania. Błąd katalogu daje link do tej samej naprawy. Naprawa najpierw sprawdza realny dostęp do pliku workera przez sieć, wymaga zamknięcia innych kart, usuwa tylko własny znacznik aktywnego wydania i wyrejestrowuje workera. Następna nawigacja pobiera świeżą aplikację i rejestruje ją ponownie. Nie kasuje zapisanych ocen, notatek ani starej kopii localStorage.

Zablokowanie sieci przez Playwright w Firefox nie zawsze obejmuje żądania workera. Test niedostępnej sieci podczas naprawy dodatkowo wymusza odpowiedź HTTP 503 na serwerze testowym. Testy nie zastępują odłączenia sieci na fizycznym telefonie.

Testowanie: użyj osobnego profilu przeglądarki, otwórz aplikację online, poczekaj na potwierdzenie gotowości offline, przeładuj, włącz Offline i przeładuj ponownie. Testuj również pod `/AlkoRater/`, a nie wyłącznie pod `/`.
