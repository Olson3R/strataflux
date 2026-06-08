import { BrowserWindow, ipcMain, shell } from 'electron';
import { store } from './store';
import { loadConfig, saveConfig } from './config';
import { hasCredentials, setAdoPat, setGithubPat } from './credentials';
import type { AppConfig } from '../shared/types';

const ALLOWED_URL_SCHEMES = new Set(['https:', 'http:']);

// Accepts a getter so the handler always uses the current window reference,
// even after window close-and-recreate in the single-instance flow.
export function registerIpcHandlers(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle('tray:get-data', () => store.getTrayData());

  ipcMain.handle('config:get', () => loadConfig());

  ipcMain.handle('config:has-credentials', () => hasCredentials());

  ipcMain.handle(
    'config:save',
    async (
      _event,
      payload: AppConfig & { adoPat?: string; githubPat?: string }
    ) => {
      try {
        const { adoPat, githubPat, ...config } = payload;
        saveConfig(config);
        if (adoPat) await setAdoPat(adoPat);
        if (githubPat) await setGithubPat(githubPat);
        return { ok: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, error: message };
      }
    }
  );

  ipcMain.handle('refresh:trigger', () => {
    getWindow()?.webContents.send('refresh:started');
    // PollEngine integration wired in a later unit
  });

  ipcMain.handle('items:mark-seen', () => {
    store.markAllSeen();
  });

  ipcMain.handle('shell:open-url', (_event, { url }: { url: string }) => {
    try {
      const parsed = new URL(url);
      if (!ALLOWED_URL_SCHEMES.has(parsed.protocol)) {
        console.warn(`[ipc] shell:open-url rejected disallowed scheme: ${parsed.protocol}`);
        return;
      }
      shell.openExternal(url);
    } catch {
      console.warn(`[ipc] shell:open-url rejected invalid URL: ${url}`);
    }
  });
}
