import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI, AppConfig, SerializedTrayData } from '../shared/types';

// Helper: register a single listener on a channel and return a cleanup fn.
// Clears all prior listeners on the channel before registering so React
// StrictMode double-invocation doesn't stack duplicates.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function onChannel(channel: string, handler: (...args: any[]) => void): () => void {
  ipcRenderer.removeAllListeners(channel);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

const api: ElectronAPI = {
  getData: (): Promise<SerializedTrayData> =>
    ipcRenderer.invoke('tray:get-data'),

  getConfig: (): Promise<AppConfig> =>
    ipcRenderer.invoke('config:get'),

  hasCredentials: (): Promise<{ ado: boolean; github: boolean }> =>
    ipcRenderer.invoke('config:has-credentials'),

  saveConfig: (
    data: AppConfig & { adoPat?: string; githubPat?: string }
  ): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('config:save', data),

  triggerRefresh: (): Promise<void> =>
    ipcRenderer.invoke('refresh:trigger'),

  markSeen: (): Promise<void> =>
    ipcRenderer.invoke('items:mark-seen'),

  openUrl: (url: string): Promise<void> =>
    ipcRenderer.invoke('shell:open-url', { url }),

  onDataUpdated: (callback: (data: SerializedTrayData) => void): () => void =>
    onChannel('data:updated', (_event, data: SerializedTrayData) => callback(data)),

  onRefreshStarted: (callback: () => void): () => void =>
    onChannel('refresh:started', () => callback()),

  onRefreshError: (
    callback: (error: { message: string; at: string }) => void
  ): () => void =>
    onChannel(
      'refresh:error',
      (_event, error: { message: string; at: string }) => callback(error)
    ),

  onNavigateSettings: (callback: () => void): () => void =>
    onChannel('navigate:settings', () => callback()),

  onArrowOffset: (callback: (x: number) => void): () => void =>
    onChannel('popup:arrow-offset', (_event, x: number) => callback(x)),
};

contextBridge.exposeInMainWorld('electronAPI', api);
