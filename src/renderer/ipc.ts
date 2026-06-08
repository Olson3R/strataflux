// Type augmentation: declares window.electronAPI shape for all renderer code.
// Populated by src/main/preload.ts via contextBridge.
import type { ElectronAPI } from '@shared/types';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
