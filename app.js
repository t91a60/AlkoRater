const CONSTANTS = {
    MAX_RECENT_ITEMS: 10,
    SEARCH_DEBOUNCE_MS: 300,
    ANIMATION_DELAY_MS: 300
};

const app = {
    appData: [],
    favorites: [],
    currentTab: 'start',
    currentItem: null,
    ratingConfig: { stars: 0, tag: '', note: '' },

    escapeHTML: (str) => {
        if (str === null || str === undefined || str === '') return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    debounce: (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func(...args), delay);
        };
    },

    el: {
        headerTitle: document.getElementById('headerTitle'),
        tabs: {
            start: document.getElementById('tab-start'),
            search: document.getElementById('tab-search'),
            favorites: document.getElementById('tab-favorites')
        },
        navItems: document.querySelectorAll('.nav-item'),
        searchInput: document.getElementById('searchInput'),
        searchResults: document.getElementById('searchResults'),
        favoritesList: document.getElementById('favoritesList'),
        dashboardGrid: document.getElementById('dashboardGrid'),
        recentlyRated: document.getElementById('recentlyRated'),
        skeletons: document.getElementById('searchSkeletons'),
        noResults: document.getElementById('noResults'),
        modal: document.getElementById('modal-wrapper')
    },

    init: async () => {
        app.loadFavorites();
        app.setupListeners();
        app.toggleSkeletons(true);
        await app.loadAllData();
        app.toggleSkeletons(false);
        app.updateDashboard();

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('action') === 'search') {
            app.switchTab('search');
            // Optionally clear the URL without reloading to prevent stuck state on refresh
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    },

    loadAllData: async () => {
        try {
            const [beerData, vodkaData, wineData] = await Promise.all([
                fetch('./data/piwa.json').then(r => r.ok ? r.json() : []).catch(err => { console.error('Error fetching piwa:', err); return []; }),
                fetch('./data/wodki.json').then(r => r.ok ? r.json() : []).catch(err => { console.error('Error fetching wodki:', err); return []; }),
                fetch('./data/wina.json').then(r => r.ok ? r.json() : []).catch(err => { console.error('Error fetching wina:', err); return []; })
            ]);

            app.appData = [
                ...beerData.map(item => ({ ...item, category: 'Piwo' })),
                ...vodkaData.map(item => ({ ...item, category: 'Wódka' })),
                ...wineData.map(item => ({ ...item, category: 'Wino' }))
            ];

            document.getElementById('dbCount').textContent = app.appData.length;
        } catch (error) {
            app.showToast('Błąd ładowania bazy danych');
        }
    },

    updateDashboard: () => {
        const total = app.favorites.length;
        const categoryCount = {};
        let totalScore = 0;

        app.favorites.forEach(fav => {
            categoryCount[fav.tag] = (categoryCount[fav.tag] || 0) + 1;
            totalScore += parseInt(fav.stars, 10);
        });

        const avgScore = total ? (totalScore / total).toFixed(1) : '0.0';
        const topCategory = Object.keys(categoryCount).length > 0 
            ? Object.keys(categoryCount).reduce((a, b) => categoryCount[a] > categoryCount[b] ? a : b) 
            : '-';
        const lastItem = app.favorites[0] ? app.favorites[0].item.name : 'Brak';

        app.el.dashboardGrid.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon">⭐</div>
        <div class="stat-value">${app.escapeHTML(avgScore)}</div>
        <div class="stat-label">Średnia Ocena</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📝</div>
        <div class="stat-value">${app.escapeHTML(total)}</div>
        <div class="stat-label">Oceniono</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🏆</div>
        <div class="stat-value" style="text-transform:capitalize">${app.escapeHTML(topCategory)}</div>
        <div class="stat-label">Ulubiony Typ</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🕒</div>
        <div class="stat-value" style="font-size:16px; line-height:1.3; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">${app.escapeHTML(lastItem)}</div>
        <div class="stat-label">Ostatnio</div>
      </div>
    `;

        app.updateRecentlyRated();
    },

    updateRecentlyRated: () => {
        const container = app.el.recentlyRated;
        const recent = app.favorites.slice(0, CONSTANTS.MAX_RECENT_ITEMS);

        if (recent.length === 0) {
            container.innerHTML = '<p style="opacity:0.4; font-size:13px; padding:10px;">Brak ocenionych produktów</p>';
            return;
        }

        container.innerHTML = recent.map(fav => `
            <div class="recent-card" data-item-name="${app.escapeHTML(fav.item.name)}">
                <img src="${app.escapeHTML(fav.item.image_url)}" loading="lazy" onerror="this.src='./icons/icon-60.png'" alt="img">
                <div class="recent-name">${app.escapeHTML(fav.item.name)}</div>
                <div class="recent-stars">${app.escapeHTML(fav.stars)} ★</div>
            </div>
        `).join('');
    },

    switchTab: (tabName) => {
        if (app.currentTab === tabName) return;
        app.haptics.light();

        const currentEl = app.el.tabs[app.currentTab];
        const nextEl = app.el.tabs[tabName];

        app.el.navItems.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        const titles = { start: 'Start', search: 'Szukaj', favorites: 'Ulubione' };
        app.el.headerTitle.textContent = titles[tabName];

        if (currentEl) {
            currentEl.classList.remove('active', 'tab-enter');
            currentEl.classList.add('tab-exit');
            setTimeout(() => {
                currentEl.classList.remove('tab-exit');
                currentEl.style.display = 'none';
            }, 300);
        }

        if (nextEl) {
            nextEl.style.display = 'block';
            nextEl.classList.remove('tab-exit');
            nextEl.classList.add('active', 'tab-enter');
            setTimeout(() => nextEl.classList.remove('tab-enter'), 350);
        }

        app.currentTab = tabName;
        document.querySelector('.content-area').scrollTo({ top: 0, behavior: 'smooth' });

        if (tabName === 'favorites') {
            app.renderFavorites(document.querySelector('.filter-chip.active')?.dataset.filter);
        }
        if (tabName === 'start') {
            app.updateDashboard();
        }
    },

    loadFavorites: () => {
        const stored = localStorage.getItem('favorites');
        app.favorites = stored ? JSON.parse(stored) : [];
    },

    renderFavorites: (filter = 'wszystkie') => {
        const container = app.el.favoritesList;
        container.innerHTML = '';
        const activeFilter = filter.toLowerCase();
        let list = app.favorites;

        if (activeFilter !== 'wszystkie') {
            list = list.filter(f => f.tag.toLowerCase() === activeFilter);
        }

        if (list.length === 0) {
            container.innerHTML = `
        <div class="empty-state-animated">
          <div class="floating-ghost">
            <svg class="ghost-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"></path>
              <circle cx="9" cy="10" r="1.2" fill="currentColor"></circle>
              <circle cx="15" cy="10" r="1.2" fill="currentColor"></circle>
            </svg>
          </div>
          <p style="opacity: 0.6; font-weight: 500;">Brak ulubionych</p>
        </div>`;
            return;
        }

        const trashIcon = `
        <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" fill="none">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      `;

        container.innerHTML = list.map(fav => {
            const alcVal = fav.item.alcohol ? (fav.item.alcohol.includes('%') ? fav.item.alcohol : fav.item.alcohol + '%') : null;
            const alcoholBadge = alcVal ? `<span class="separator">·</span><span class="alcohol-badge">${app.escapeHTML(alcVal)}</span>` : '';

            return `
            <div id="fav-${fav.id}" class="favorite-card" data-item-name="${app.escapeHTML(fav.item.name)}">
                <img src="${app.escapeHTML(fav.item.image_url)}" loading="lazy" onerror="this.src='./icons/icon-60.png'" alt="${app.escapeHTML(fav.item.name)}">
                <div class="item-info">
                <div class="item-name">${app.escapeHTML(fav.item.name)}${alcoholBadge}</div>
                <div class="item-meta">${app.escapeHTML(fav.tag)}</div>
                </div>
                <div class="item-stars">
                ${app.escapeHTML(fav.stars)} <span style="font-size:12px; margin-left:1px;">★</span>
                </div>
                <button class="delete-btn" data-delete-id="${fav.id}">
                ${trashIcon}
                </button>
            </div>
            `;
        }).join('');
    },

    filterFavorites: (type) => {
        app.haptics.light();
        document.querySelectorAll('.filter-chip').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === type);
        });
        app.renderFavorites(type);
    },

    deleteFavorite: (id) => {
        app.haptics.light();
        const el = document.getElementById(`fav-${id}`);
        if (el) el.classList.add('slide-out-left');

        setTimeout(() => {
            app.favorites = app.favorites.filter(f => f.id !== id);
            localStorage.setItem('favorites', JSON.stringify(app.favorites));
            const activeFilter = document.querySelector('.filter-chip.active')?.dataset.filter || 'wszystkie';
            app.renderFavorites(activeFilter);
            app.updateDashboard();
            app.showToast('Usunięto z ulubionych');
            app.haptics.warning();
        }, 300);
    },

    cleanQuery: (raw) => {
        const stopWords = ['piwo', 'wódka', 'wino', 'vodka', 'beer', 'wine'];
        const words = raw.toLowerCase().split(/\s+/);
        const cleaned = words.filter(w => !stopWords.includes(w));
        return cleaned.join(' ');
    },

    handleSearch: (e) => {
        const raw = e.target.value.trim();
        const clearBtn = document.getElementById('clearSearch');
        if (clearBtn) clearBtn.style.display = raw ? 'flex' : 'none';

        if (raw.length < 2) {
            app.el.searchResults.innerHTML = '';
            app.el.noResults.style.display = 'none';
            return;
        }

        const effectiveQuery = app.cleanQuery(raw) || raw.toLowerCase();
        const results = app.appData.filter(item => {
            const name = item.name.toLowerCase();
            return name.includes(effectiveQuery);
        }).slice(0, 50);

        app.renderResults(results);
    },

    renderResults: (list) => {
        const container = app.el.searchResults;
        container.innerHTML = '';

        if (list.length === 0) {
            app.el.noResults.style.display = 'block';
            return;
        }
        app.el.noResults.style.display = 'none';

        container.innerHTML = list.map(item => {
            const alcVal = item.alcohol ? (item.alcohol.includes('%') ? item.alcohol : item.alcohol + '%') : null;
            const alcoholBadge = alcVal ? `<span class="separator">·</span><span class="alcohol-badge">${app.escapeHTML(alcVal)}</span>` : '';
            return `
            <div class="search-item" data-item-name="${app.escapeHTML(item.name)}">
                <img src="${app.escapeHTML(item.image_url)}" loading="lazy" onerror="this.src='./icons/icon-60.png'" alt="img">
                <div class="item-info">
                <div class="item-name">${app.escapeHTML(item.name)}${alcoholBadge}</div>
                <div class="item-meta">${app.escapeHTML(item.category)}</div>
                </div>
            </div>
            `;
        }).join('');
    },

    openRateModal: (item) => {
        app.haptics.light();
        app.currentItem = item;
        const strictCategory = item.category || 'Nieznane';
        const existing = app.favorites.find(f => f.item.name === item.name);

        if (existing) {
            app.ratingConfig = {
                stars: existing.stars,
                tag: strictCategory,
                note: existing.note || ''
            };
            document.getElementById('saveButton').textContent = 'Zaktualizuj';
        } else {
            app.ratingConfig = { stars: 0, tag: strictCategory, note: '' };
            document.getElementById('saveButton').textContent = 'Zapisz Ocenę';
        }

        const alcVal = item.alcohol ? (item.alcohol.includes('%') ? item.alcohol : item.alcohol + '%') : null;
        const alcoholBadge = alcVal ? `<span class="separator">·</span><span class="alcohol-badge">${app.escapeHTML(alcVal)}</span>` : '';
        document.getElementById('modalTitle').innerHTML = `${app.escapeHTML(item.name)}${alcoholBadge}`;
        document.getElementById('modalCategoryTag').textContent = `Kategoria: ${strictCategory}`;
        document.getElementById('noteInput').value = app.ratingConfig.note;

        document.querySelector('.app-container').classList.add('scale-back');
        document.querySelector('.bottom-nav').classList.add('tab-bar-hidden');

        app.el.modal.style.display = 'block';
        setTimeout(() => app.el.modal.classList.add('active'), 10);

        app.renderModalState();
    },

    renderModalState: () => {
        document.querySelectorAll('.star').forEach(s => {
            const val = parseInt(s.dataset.value);
            s.classList.toggle('active', val <= app.ratingConfig.stars);
        });

        if (app.ratingConfig.stars === 5) {
            document.querySelectorAll('.star').forEach((s, idx) => {
                setTimeout(() => s.classList.add('star-pop'), idx * 50);
            });
            setTimeout(() => {
                document.querySelectorAll('.star').forEach(s => s.classList.remove('star-pop'));
            }, 800);
        }

        app.validateSave();
    },

    setRating: (val) => {
        app.ratingConfig.stars = val;
        app.haptics.light();
        if (val === 5) app.haptics.success();
        app.renderModalState();
    },

    validateSave: () => {
        const valid = app.ratingConfig.stars > 0;
        document.getElementById('saveButton').disabled = !valid;
    },

    closeModal: () => {
        document.querySelector('.app-container').classList.remove('scale-back');
        document.querySelector('.bottom-nav').classList.remove('tab-bar-hidden');
        app.el.modal.classList.remove('active');
        setTimeout(() => app.el.modal.style.display = 'none', 400);
    },

    saveRating: () => {
        if (!app.currentItem) return;

        app.ratingConfig.note = document.getElementById('noteInput').value;
        const record = {
            id: Date.now(),
            item: app.currentItem,
            ...app.ratingConfig,
            date: new Date().toISOString()
        };

        const existingIndex = app.favorites.findIndex(f => f.item.name === app.currentItem.name);

        if (existingIndex >= 0) {
            app.favorites = app.favorites.map((f, i) => i === existingIndex ? record : f);
            app.showToast('Zaktualizowano ocenę!');
        } else {
            app.favorites = [record, ...app.favorites];
            app.showToast('Zapisano ocenę!');
        }

        localStorage.setItem('favorites', JSON.stringify(app.favorites));

        app.updateDashboard();
        if (app.currentTab === 'favorites') {
            app.renderFavorites(document.querySelector('.filter-chip.active')?.dataset.filter);
        }

        app.haptics.success();
        app.closeModal();
    },

    haptics: {
        light: () => { if (navigator.vibrate) navigator.vibrate(10); },
        success: () => { if (navigator.vibrate) navigator.vibrate([10, 30, 10]); },
        warning: () => { if (navigator.vibrate) navigator.vibrate([50, 50, 50, 50]); }
    },

    toggleSkeletons: (show) => {
        const container = app.el.skeletons;
        if (show) {
            container.style.display = 'block';
            container.innerHTML = Array(6).fill('<div class="skeleton-row"></div>').join('');
        } else {
            container.style.display = 'none';
        }
    },

    showToast: (msg) => {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const t = document.createElement('div');
        t.className = 'toast';
        t.innerHTML = `<span>${msg}</span>`;
        document.body.appendChild(t);

        setTimeout(() => {
            t.style.animation = 'dynamicIslandPop 0.5s var(--spring-bounce) reverse forwards';
            setTimeout(() => t.remove(), 500);
        }, 2000);
    },

    shareCurrentItem: async () => {
        app.haptics.light();
        if (!app.currentItem) return;
        const itemName = app.currentItem.name;
        const ratingText = app.ratingConfig.stars > 0 ? `Oceniłem to na ${app.ratingConfig.stars}★ w Alko-Rater! Polecam!` : 'Sprawdź ten alkohol w Alko-Rater!';
        
        const shareData = {
            title: `Alko Rater: ${itemName}`,
            text: `${itemName} - ${ratingText}`,
            url: window.location.origin + window.location.pathname
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                app.showToast('Udostępnianie niedostępne na tym urządzeniu.');
            }
        } catch (err) {
            console.log('Share failed:', err);
        }
    },

    exportBackup: () => {
        app.haptics.light();
        if (app.favorites.length === 0) {
            app.showToast('Baza jest pusta!');
            return;
        }
        const dataStr = JSON.stringify(app.favorites, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        try {
            if (navigator.share && navigator.canShare) {
                const file = new File([blob], 'alko-rater-backup.json', { type: 'application/json' });
                if (navigator.canShare({ files: [file] })) {
                    navigator.share({
                        files: [file],
                        title: 'Backup Alko-Rater',
                        text: 'Mój backup ulubionych alkoholi'
                    }).then(() => URL.revokeObjectURL(url)).catch(e => {
                        console.log('Share failed/cancelled', e);
                        app.downloadBlob(url);
                    });
                    return;
                }
            }
        } catch (e) {
            console.error(e);
        }
        app.downloadBlob(url);
    },

    downloadBlob: (url) => {
        const a = document.createElement('a');
        a.href = url;
        a.download = `alko-rater-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        app.showToast('Wyeksportowano!');
    },

    importBackup: (e) => {
        app.haptics.light();
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (Array.isArray(data)) {
                    const valid = data.every(f => f.id && f.item && f.item.name);
                    if (!valid) throw new Error("Invalid format");
                    
                    app.favorites = data;
                    localStorage.setItem('favorites', JSON.stringify(app.favorites));
                    app.showToast(`Zimportowano ${data.length} ocen!`);
                    app.haptics.success();
                    
                    app.updateDashboard();
                    if (app.currentTab === 'favorites') {
                        app.renderFavorites(document.querySelector('.filter-chip.active')?.dataset.filter);
                    }
                } else {
                    throw new Error("Not array");
                }
            } catch (err) {
                app.showToast('Błąd parsowania pliku.');
                app.haptics.warning();
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    },

    setupListeners: () => {
        // Event delegation for recently rated
        app.el.recentlyRated.addEventListener('click', (e) => {
            const card = e.target.closest('.recent-card');
            if (!card) return;
            const name = card.dataset.itemName;
            const fav = app.favorites.find(f => f.item.name === name);
            if (fav) app.openRateModal(fav.item);
        });

        // Event delegation for search results
        app.el.searchResults.addEventListener('click', (e) => {
            const card = e.target.closest('.search-item');
            if (!card) return;
            const name = card.dataset.itemName;
            const item = app.appData.find(i => i.name === name);
            if (item) app.openRateModal(item);
        });

        // Event delegation for favorites list
        app.el.favoritesList.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.delete-btn');
            if (deleteBtn) {
                e.stopPropagation();
                app.deleteFavorite(parseInt(deleteBtn.dataset.deleteId, 10));
                return;
            }
            const card = e.target.closest('.favorite-card');
            if (card) {
                const name = card.dataset.itemName;
                const fav = app.favorites.find(f => f.item.name === name);
                if (fav) app.openRateModal(fav.item);
            }
        });

        const btnExport = document.getElementById('btnExport');
        const btnImport = document.getElementById('btnImport');
        const fileImport = document.getElementById('fileImport');
        const modalShare = document.getElementById('modalShare');

        if (btnExport) btnExport.addEventListener('click', app.exportBackup);
        if (btnImport) btnImport.addEventListener('click', () => fileImport?.click());
        if (fileImport) fileImport.addEventListener('change', app.importBackup);
        if (modalShare) modalShare.addEventListener('click', app.shareCurrentItem);

        const inputs = document.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            input.addEventListener('focus', () => document.body.classList.add('keyboard-open'));
            input.addEventListener('blur', () => document.body.classList.remove('keyboard-open'));
        });

        app.el.navItems.forEach(btn =>
            btn.addEventListener('click', () => app.switchTab(btn.dataset.tab))
        );

        app.el.searchInput.addEventListener('input', app.debounce(app.handleSearch, CONSTANTS.SEARCH_DEBOUNCE_MS));
        const clearBtn = document.getElementById('clearSearch');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                app.el.searchInput.value = '';
                app.handleSearch({ target: { value: '' } });
                app.el.searchInput.focus();
            });
        }

        document.getElementById('modalClose').addEventListener('click', app.closeModal);
        app.el.modal.addEventListener('click', (e) => {
            if (e.target === app.el.modal || e.target.classList.contains('modal-overlay')) {
                app.closeModal();
            }
        });

        document.getElementById('saveButton').addEventListener('click', app.saveRating);

        document.querySelector('.stars-container').addEventListener('click', (e) => {
            if (e.target.classList.contains('star')) {
                app.setRating(parseInt(e.target.dataset.value));
            }
        });

        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', () => app.filterFavorites(chip.dataset.filter));
        });
    }
};

document.addEventListener('DOMContentLoaded', app.init);