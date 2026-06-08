import { describe, it, expect } from 'vitest';
import { calculateWindowPosition } from '../tray';

const WIN = { width: 480, height: 640 };

describe('calculateWindowPosition', () => {
  it('positions window below the tray icon when tray is in the top half (macOS menu bar)', () => {
    // macOS: tray at y=0, work area starts at y=25 (menu bar height)
    const trayBounds = { x: 700, y: 0, width: 22, height: 22 };
    const workArea   = { x: 0,   y: 25, width: 1440, height: 875 };

    const pos = calculateWindowPosition(trayBounds, WIN, workArea);

    // Window top should be just below the tray icon (y + height + gap=4)
    expect(pos.y).toBe(26);
    // Window should be horizontally centred on the tray icon
    expect(pos.x).toBe(Math.round(700 + 11 - 240)); // 471
  });

  it('positions window above the tray icon when tray is in the bottom half (Windows taskbar)', () => {
    // Windows: tray at y=1040 (inside taskbar), work area height=1040
    const trayBounds = { x: 1600, y: 1040, width: 16, height: 16 };
    const workArea   = { x: 0,   y: 0,  width: 1920, height: 1040 };

    const pos = calculateWindowPosition(trayBounds, WIN, workArea);

    // Window bottom should be just above the tray icon (y - height - gap=4)
    expect(pos.y).toBe(1040 - 640 - 4); // 396
  });

  it('clamps window to the right edge of the work area when tray is near the right edge', () => {
    const trayBounds = { x: 1420, y: 0, width: 22, height: 22 };
    const workArea   = { x: 0,   y: 0, width: 1440, height: 900 };

    const pos = calculateWindowPosition(trayBounds, WIN, workArea);

    expect(pos.x + WIN.width).toBeLessThanOrEqual(workArea.x + workArea.width);
  });

  it('clamps window to the left edge of the work area when tray is near the left edge', () => {
    const trayBounds = { x: 0, y: 0, width: 22, height: 22 };
    const workArea   = { x: 0, y: 0, width: 1440, height: 900 };

    const pos = calculateWindowPosition(trayBounds, WIN, workArea);

    expect(pos.x).toBeGreaterThanOrEqual(workArea.x);
  });

  it('respects a custom gap value', () => {
    const trayBounds = { x: 500, y: 0, width: 22, height: 22 };
    const workArea   = { x: 0,   y: 0, width: 1440, height: 900 };

    const pos8  = calculateWindowPosition(trayBounds, WIN, workArea, 8);
    const pos4  = calculateWindowPosition(trayBounds, WIN, workArea, 4);

    expect(pos8.y - pos4.y).toBe(4);
  });
});
