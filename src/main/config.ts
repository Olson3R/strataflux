import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import type { AppConfig } from '../shared/types';

const CONFIG_FILE = path.join(app.getPath('userData'), 'config.json');

const DEFAULTS: AppConfig = {
  adoOrgUrl: '',
  adoProject: '',
  githubRepos: [],
  pollIntervalMinutes: 5,
};

export function loadConfig(): AppConfig {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return { ...DEFAULTS };
    }
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<AppConfig>;
    return {
      ...DEFAULTS,
      ...parsed,
      pollIntervalMinutes: clampPollInterval(
        parsed.pollIntervalMinutes ?? DEFAULTS.pollIntervalMinutes
      ),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveConfig(config: AppConfig): void {
  const dir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), {
    mode: 0o600,
  });
}

function clampPollInterval(minutes: number): number {
  return Math.max(5, Math.min(15, minutes));
}
