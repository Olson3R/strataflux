import { BrowserWindow, Menu, MenuItem, Tray, nativeImage, app, screen } from 'electron';
import path from 'path';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Pure function: given the tray icon's screen bounds, the popup window's
 * dimensions, and the display's work area, returns the {x, y} the window
 * should be moved to so it appears just above or below the tray icon.
 *
 * "Above" is used when the tray is in the bottom half of the screen (Windows
 * taskbar); "below" is used when it's in the top half (macOS menu bar).
 */
export function calculateWindowPosition(
  trayBounds: Rect,
  windowSize: { width: number; height: number },
  workArea: Rect,
  gap = 4,
): { x: number; y: number } {
  // Horizontally centre the window on the tray icon.
  let x = Math.round(trayBounds.x + trayBounds.width / 2 - windowSize.width / 2);

  const trayCenter = trayBounds.y + trayBounds.height / 2;
  const screenCenter = workArea.y + workArea.height / 2;

  let y: number;
  if (trayCenter < screenCenter) {
    // Tray is in top half (macOS menu bar) — open window below it.
    y = trayBounds.y + trayBounds.height + gap;
  } else {
    // Tray is in bottom half (Windows taskbar) — open window above it.
    y = trayBounds.y - windowSize.height - gap;
  }

  // Clamp to work area so the window never goes off-screen.
  x = Math.max(workArea.x, Math.min(x, workArea.x + workArea.width - windowSize.width));
  y = Math.max(workArea.y, Math.min(y, workArea.y + workArea.height - windowSize.height));

  return { x: Math.round(x), y: Math.round(y) };
}

export class TrayManager {
  private tray: Tray;
  private browserWindow: BrowserWindow;
  private onRefreshNow: () => void;
  private lastRefreshed: Date | undefined;
  private lastBlurAt = 0;

  constructor(browserWindow: BrowserWindow, onRefreshNow: () => void = () => {}) {
    this.browserWindow = browserWindow;
    this.onRefreshNow = onRefreshNow;
    this.tray = this.createTray();
    this.attachWindowListeners();
  }

  // Hide on blur so clicking elsewhere dismisses the popup, like a native menu-bar
  // popover. Re-attached whenever the window is replaced via updateWindow().
  private attachWindowListeners(): void {
    this.browserWindow.on('blur', () => {
      if (this.browserWindow.isVisible()) {
        this.browserWindow.hide();
        this.lastBlurAt = Date.now();
      }
    });
  }

  private loadIcon(name: string): Electron.NativeImage {
    const iconPath = path.join(__dirname, `../../assets/${name}.png`);
    const icon = nativeImage.createFromPath(iconPath);
    // On macOS, mark the base idle icon as a template so the OS adapts it to
    // light/dark menu bar automatically.
    if (process.platform === 'darwin' && name === 'icon') {
      icon.setTemplateImage(true);
    }
    return icon;
  }

  private createTray(): Tray {
    const tray = new Tray(this.loadIcon('icon'));
    tray.setToolTip('StrataFlux');
    tray.on('click', () => this.toggleWindow());
    tray.on('right-click', () => tray.popUpContextMenu(this.buildContextMenu(this.lastRefreshed)));
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
          this.showWindow();
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

  private positionWindowNearTray(): void {
    const trayBounds = this.tray.getBounds();
    const [winWidth, winHeight] = this.browserWindow.getSize();
    const display = screen.getDisplayNearestPoint({ x: trayBounds.x, y: trayBounds.y });
    const { x, y } = calculateWindowPosition(
      trayBounds,
      { width: winWidth, height: winHeight },
      display.workArea,
      0,
    );
    this.browserWindow.setPosition(x, y, false);

    const trayCenterX = trayBounds.x + trayBounds.width / 2;
    const arrowX = Math.round(trayCenterX - x);
    this.browserWindow.webContents.send('popup:arrow-offset', arrowX);
  }

  private showWindow(): void {
    this.positionWindowNearTray();
    this.browserWindow.show();
    this.browserWindow.focus();
  }

  private toggleWindow(): void {
    if (this.browserWindow.isVisible()) {
      this.browserWindow.hide();
      return;
    }
    // Clicking the tray icon while the popup is focused fires blur first
    // (which hides the window), then click — without this guard the click
    // would immediately re-open the window the user just dismissed.
    if (Date.now() - this.lastBlurAt < 200) {
      return;
    }
    this.showWindow();
  }

  setIdleState(): void {
    this.tray.setImage(this.loadIcon('icon'));
  }

  setAttentionState(): void {
    this.tray.setImage(this.loadIcon('icon-badge'));
  }

  setErrorState(): void {
    this.tray.setImage(this.loadIcon('icon-error'));
  }

  updateLastRefreshed(timestamp: Date): void {
    this.lastRefreshed = timestamp;
  }

  updateWindow(window: BrowserWindow): void {
    this.browserWindow = window;
    this.attachWindowListeners();
  }

  destroy(): void {
    this.tray.destroy();
  }
}
