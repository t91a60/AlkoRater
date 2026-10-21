import { state } from '../app/state.js';
import { exportBackup, parseBackup, importBackup, LARGE_BACKUP_BYTES } from '../services/backup.js';
import { recoverySnapshot } from '../services/storage.js';
import { updateDashboard } from './dashboard.js';
import { renderFavorites } from './favorites.js';

function download(text, name) {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export function setupBackup() {
    const status = document.getElementById('backupStatus');
    const file = document.getElementById('backupFile');
    const restore = document.getElementById('importBackup');
    document.getElementById('exportBackup').addEventListener('click', async () => {
        try {
            download(
                await exportBackup(),
                `alkorater-${new Date().toISOString().slice(0, 10)}.json`,
            );
            status.textContent = 'Pobrano kopię ocen i notatek. Przechowuj ją w zaufanym miejscu.';
        } catch {
            status.textContent =
                'Nie można odczytać ocen. Pobierz kopię odzyskiwania zamiast czyścić dane.';
            document.getElementById('recoveryBackup').hidden = false;
        }
    });
    document.getElementById('recoveryBackup').addEventListener('click', async () => {
        download(JSON.stringify(await recoverySnapshot(), null, 2), 'alkorater-odzyskiwanie.json');
        status.textContent =
            'Pobrano surowe dane do ręcznego odzyskania. To nie jest plik do zwykłego importu.';
    });
    restore.addEventListener('click', () => file.click());
    file.addEventListener('change', async () => {
        const selected = file.files[0];
        if (!selected) {
            return;
        }
        restore.disabled = true;
        try {
            if (!state.storageReady) {
                throw new Error('Najpierw przywróć odczyt zapisanych ocen.');
            }
            if (
                selected.size > LARGE_BACKUP_BYTES &&
                !window.confirm(
                    'Ta kopia ma ponad 5 MB. Wczytanie dużego pliku może potrwać i wymaga wolnej pamięci urządzenia. Kontynuować?',
                )
            ) {
                return;
            }
            const records = parseBackup(await selected.text());
            if (
                !window.confirm(
                    `Wczytać kopię zawierającą ${records.length} wpisów? Istniejące oceny pozostaną bez zmian. Duplikaty zostaną pominięte.`,
                )
            ) {
                return;
            }
            const summary = await importBackup(records);
            status.textContent = `Dodano: ${summary.added}. Pominięto duplikaty lub konflikty: ${summary.skipped}. Istniejących ocen nie zmieniono.`;
            updateDashboard();
            renderFavorites(document.querySelector('.filter-chip.active')?.dataset.filter);
        } catch (error) {
            status.textContent = `Nie wczytano kopii. ${error.message}`;
        } finally {
            file.value = '';
            restore.disabled = false;
        }
    });
}
