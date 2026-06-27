# AlkoRater

AlkoRater to offline-first Progressive Web App (PWA) do oceniania i śledzenia alkoholi. Działa w pełni offline, oferuje iOS-owy interfejs i jest dostępna z poziomu przeglądarki na każdym urządzeniu mobilnym.

[GitHub repository](https://github.com/t91a60/AlkoRater) — otwarte źródło, zero reklam, dane na urządzeniu.

---

## Features

- **Offline-first** — wszystkie dane przechowywane lokalnie w IndexedDB, aplikacja działa bez dostępu do internetu
- **Ocenianie alkoholi** — gwiazdki, notatki, kategoryzacja (piwo, wódka, wino)
- **Baza danych** — setki produktów z kategorii piwo, wódka, wino (dane offline)
- **Wyszukiwarka** — błyskawiczne filtrowanie z debounce
- **Dashboard** — statystyki, ostatnio oceniane, ulubione
- **Progressive Web App** — instalacja na ekran główny, działanie jak natywna aplikacja
- **Service Worker** — cache-first dla zasobów, stale-while-revalidate dla danych
- **Ciemny motyw** — iOS-style dark mode z glassmorphismem
- **Responsywność** — mobile-first, dostosowana do każdego ekranu

---

## Installation

Wymagany [Node.js](https://nodejs.org/) (do developmentu).

```bash
# sklonuj repozytorium
git clone https://github.com/t91a60/AlkoRater.git
cd AlkoRater

# zainstaluj zależności (linting)
npm install

# uruchom serwer deweloperski
npm run dev

# sprawdź kod
npm run lint
```

Aplikacja jest w pełni statyczna — wystarczy uruchomić dowolny serwer HTTP w katalogu głównym.

```bash
npx serve . -p 3000 --single
```

---

## Technologies

- **HTML / CSS / JavaScript** (vanilla, zero frameworków)
- **IndexedDB** — lokalne przechowywanie ocen i ulubionych
- **Service Worker API** — cache'owanie offline i aktualizacje
- **Web App Manifest** — instalacja PWA na urządzeniu
- **ESLint + Stylelint + Prettier** — jakość kodu
- **GitHub Pages** — hosting i deployment

---

## Keywords

- AlkoRater — aplikacja do oceny alkoholi
- GitHub — otwarte repozytorium kodu źródłowego
- PWA — Progressive Web App z pełnym wsparciem offline
- offline app — działa bez internetu
- alcohol tracker — śledź i oceniaj swoje trunki

---

## License

MIT
