import { BrowserWindow, Menu, MenuItem, Tray, nativeImage, app } from 'electron';
import path from 'path';

export class TrayManager {
  private tray: Tray;
  private browserWindow: BrowserWindow;
  private onRefreshNow: () => void;
  private lastRefreshed: Date | undefined;

  constructor(browserWindow: BrowserWindow, onRefreshNow: () => void = () => {}) {
    this.browserWindow = browserWindow;
    this.onRefreshNow = onRefreshNow;
    this.tray = this.createTray();
  }

  private createTray(): Tray {
    const iconPath = path.join(__dirname, '../../assets/icon.png');
    const icon = nativeImage.createFromPath(iconPath);

    const tray = new Tray(icon);
    tray.setToolTip('StrataFlux');
    tray.setContextMenu(this.buildContextMenu());

    tray.on('click', () => this.toggleWindow());

    return tray;
  }

  private buildContextMenu(lastRefreshed?: Date): Menu {
    const lastRefreshedLabel = lastRefreshed
      ? `Last refreshed: ${lastRefreshed.toLocaleTimeString()}`
      : 'Last refreshed: never';

    return Menu.buildFromTemplate([
      {
        label: 'Open StrataFlux',
        click: () => this.toggleWindow(),
      },
      {
        label: 'Refresh Now',
        click: () => this.onRefreshNow(),
      },
      {
        label: 'Settings…',
        click: () => {
          this.browserWindow.show();
          this.browserWindow.webContents.send('navigate:settings');
        },
      },
      { type: 'separator' },
      new MenuItem({ label: lastRefreshedLabel, enabled: false }),
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => app.quit(),
      },
    ]);
  }

  private toggleWindow(): void {
    if (this.browserWindow.isVisible()) {
      this.browserWindow.hide();
    } else {
      this.browserWindow.show();
      this.browserWindow.focus();
    }
  }

  setIdleState(): void {
    const iconPath = path.join(__dirname, '../../assets/icon.png');
    this.tray.setImage(nativeImage.createFromPath(iconPath));
    this.tray.setContextMenu(this.buildContextMenu(this.lastRefreshed));
  }

  setAttentionState(): void {
    const iconPath = path.join(__dirname, '../../assets/icon-badge.png');
    this.tray.setImage(nativeImage.createFromPath(iconPath));
  }

  setErrorState(): void {
    const iconPath = path.join(__dirname, '../../assets/icon-error.png');
    this.tray.setImage(nativeImage.createFromPath(iconPath));
  }

  updateLastRefreshed(timestamp: Date): void {
    this.lastRefreshed = timestamp;
    this.tray.setContextMenu(this.buildContextMenu(timestamp));
  }

  // After calling updateWindow, callers must also call setIdleState() or
  // updateLastRefreshed() to rebuild the context menu against the new window reference.
  updateWindow(window: BrowserWindow): void {
    this.browserWindow = window;
  }

  destroy(): void {
    this.tray.destroy();
  }
}
