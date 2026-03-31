# AlkoRater PWA

> **Profesjonalna aplikacja do oceniania alkoholi** — zbudowana jako Progressive Web App z natywnym iOS feel.

## ✨ Funkcjonalności

- **🔍 Wyszukiwarka** — błyskawiczne wyszukiwanie po nazwie i typie alkoholu
- **⭐ System ocen** — 1-5 gwiazdek z notatką i animowanymi gwiazdkami
- **❤️ Ulubione** — zapisuj i filtruj ocenione produkty (Piwo / Wódka / Wino)
- **📊 Dashboard** — statystyki: średnia ocena, ilość ocen, ulubiony typ, ostatnio oceniony
- **📤 Eksport/Import** — backup danych w formacie JSON z Web Share API
- **📴 Offline-first** — działa bez internetu dzięki Service Worker (Stale-While-Revalidate)

## 🍎 iOS Feel

Aplikacja została zaprojektowana od podstaw z myślą o natywnym odczuciu iOS:

### Animacje
| Element | Animacja |
|---------|----------|
| Przyciski i karty | `scale(0.95)` + lift na tap (0.2s, iOS cubic-bezier) |
| Lista produktów | Fade-in + slide-up z staggered animation (30ms delay) |
| Pole wyszukiwania | Smooth focus ring + X button z scale transition |
| Gwiazdki oceny | Animowane wypełnianie z delay + pop efekt przy 5★ |
| Bottom navigation | Active tab z scale + color transition |
| Toasty | Slide-in from bottom z spring easing |
| Modal | iOS sheet animation z backdrop blur |
| Glassmorphism | `backdrop-filter: blur(20px)` z lekkim fade |

### Layout
- **Bottom nav** — przyklejony do dołu ekranu z `env(safe-area-inset-bottom)` — nie skacze przy scrollowaniu
- **100dvh** — pełna wysokość viewportu z obsługą dynamicznego paska adresu
- **viewport-fit=cover** — obsługa notch i safe area na iPhone
- **system-ui font** — SF Pro na iOS, Segoe UI na Windows, Roboto na Android

### Interakcje
- **Haptic feedback** — wibracje przy tap (jeśli urządzenie wspiera)
- **Keyboard handling** — bottom nav chowa się przy klawiaturze
- **Touch optimization** — `-webkit-tap-highlight-color: transparent`
- **Reduced motion** — respektuje `prefers-reduced-motion`

## 🏗 Architektura

```
AlkoRater/
├── index.html              # Główny plik HTML
├── manifest.json           # PWA manifest
├── service-worker.js       # Service Worker (v2.1)
├── package.json            # Package config
├── README.md               # Dokumentacja
├── src/
│   ├── js/
│   │   ├── main.js         # Entry point + event listeners
│   │   ├── state.js        # Centralny stan aplikacji
│   │   ├── data.js         # Ładowanie JSON + kategoryzacja
│   │   ├── ui.js           # Rendering, animacje, modal
│   │   └── storage.js      # localStorage wrapper
│   └── css/
│       └── style.css       # iOS-style stylesheet
├── data/
│   ├── piwa.json           # Baza piw
│   ├── wodki.json          # Baza wódek
│   └── wina.json           # Baza win
└── icons/
    ├── icon-60.png
    ├── icon-180.png
    ├── icon-192.png
    └── icon-512.png
```

## 🚀 Uruchomienie

### Wymagania
- Node.js (opcjonalnie — do serwera dev)
- Lub dowolny statyczny serwer HTTP

### Development
```bash
# Opcja 1: npm script (wymaga Node.js)
npm run dev

# Opcja 2: Python
python3 -m http.server 3000

# Opcja 3: PHP
php -S localhost:3000
```

### Produkcja
Wgraj wszystkie pliki na dowolny serwer statyczny (GitHub Pages, Netlify, Vercel, itp.).

## 📱 Instalacja jako PWA

1. Otwórz aplikację w Safari (iOS) lub Chrome (Android)
2. Tap **Udostępnij** → **Dodaj do ekranu głównego**
3. Aplikacja uruchomi się w trybie standalone (bez paska adresu)

## 🔧 Service Worker

| Strategia | Zasoby |
|-----------|--------|
| Cache-First | HTML, CSS, JS, ikony, logo |
| Stale-While-Revalidate | Pliki JSON z bazą produktów |

Wersja cache: `v2.1` — automatyczne czyszczenie starych wersji przy aktualizacji.

## 🎨 Dark Mode

Aplikacja automatycznie dostosowuje się do preferencji systemowych:
- **Light mode**: `#F2F2F7` background, `#FFFFFF` karty
- **Dark mode**: `#000000` background, `#1C1C1E` karty

## 📄 Licencja

MIT

---

> Zbudowane z ❤️ jako czysta, statyczna PWA — zero backendu, zero frameworków.