<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/wine.svg" width="80" height="80" alt="AlkoRater Logo" />
  <h1>AlkoRater</h1>
  <p><strong>Twoja osobista kolekcja i oceny trunków. Zawsze pod ręką, zawsze offline.</strong></p>

  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![PWA](https://img.shields.io/badge/PWA-Ready-blue?logo=pwa)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
  [![Vanilla JS](https://img.shields.io/badge/Vanilla-JS-f7df1e?logo=javascript&logoColor=black)]()
  [![CI/CD](https://github.com/t91a60/AlkoRater/actions/workflows/ci.yml/badge.svg)](https://github.com/t91a60/AlkoRater/actions)
</div>

---

**AlkoRater** to nowoczesna, w pełni responsywna aplikacja typu **Progressive Web App (PWA)**, zaprojektowana z myślą o użytkownikach mobilnych. Oferuje interfejs inspirowany stylem iOS (szkło, płynne animacje, haptyka), pozwalając na szybkie wyszukiwanie i ocenianie ulubionych alkoholi.

Aplikacja działa **w 100% offline**, przechowując wszystkie Twoje oceny i notatki lokalnie na urządzeniu. Żadnych serwerów, żadnych reklam, pełna prywatność.

## ✨ Kluczowe Funkcje

- 📱 **Zainstaluj jako aplikację (PWA):** Dodaj do ekranu głównego i używaj jak natywnej aplikacji bez pobierania ze sklepu.
- ⚡ **Działa bez internetu:** Baza produktów i Twoje oceny są dostępne zawsze i wszędzie dzięki IndexedDB i Service Workers.
- 🎨 **Wygląd Premium:** Głęboki tryb ciemny (Dark Mode), rozmycia (Glassmorphism), dynamiczne tła i płynne mikro-animacje.
- 🔍 **Błyskawiczna wyszukiwarka:** Optymalizowane filtrowanie produktów bez opóźnień.
- ⭐ **System ocen:** Skala 1-5 gwiazdek z możliwością dodawania własnych notatek do każdego trunku.
- 📊 **Inteligentny Dashboard:** Statystyki Twoich ocen, ulubione kategorie, najnowsze odkrycia i dynamiczne powitania zależne od pory dnia.
- 🔄 **Undo (Cofnij):** Bezpieczne usuwanie ocen z 4-sekundowym czasem na cofnięcie operacji (Undo pattern).

## 🛠️ Technologie

Projekt zbudowany celowo **bez ciężkich frameworków (No-Framework)**, stawiając na szybkość, bliskość platformy webowej i nowoczesne API przeglądarek.

- **Frontend:** Vanilla HTML5, CSS3 (zmienne CSS, flexbox, CSS Grid), Vanilla JavaScript (ES6+).
- **Storage:** `IndexedDB` (przechowywanie ocen użytkownika z transakcjami), `localStorage`.
- **Offline & Cache:** Service Worker API, Web App Manifest.
- **Ikony:** [Lucide Icons](https://lucide.dev/).
- **Narzędzia developerskie:** ESLint, Stylelint, Prettier, Vite (jako dev-server), Vitest (do testów jednostkowych).

## 🚀 Uruchomienie lokalne (Development)

AlkoRater jest aplikacją statyczną. Do pracy nad kodem używamy Node.js w celu zapewnienia lintingu i lokalnego serwera deweloperskiego.

1. **Sklonuj repozytorium:**
   ```bash
   git clone https://github.com/t91a60/AlkoRater.git
   cd AlkoRater
   ```

2. **Zainstaluj zależności narzędziowe:**
   ```bash
   npm install
   ```

3. **Uruchom serwer developerski (Vite):**
   ```bash
   npm run dev
   ```

4. **Lintowanie i Testowanie:**
   ```bash
   npm run lint  # Sprawdza JS i CSS
   npm run test  # Uruchamia testy jednostkowe (Vitest)
   ```

## 🌐 Alternatywne serwowanie

Ponieważ aplikacja nie wymaga procesu budowy (build step), możesz ją zaserwować dowolnym statycznym serwerem HTTP, np.:

```bash
npx serve . -p 3000
# lub
python3 -m http.server 3000
```

## 📄 Licencja

Ten projekt jest objęty licencją MIT. Szczegóły znajdują się w pliku `LICENSE`.
