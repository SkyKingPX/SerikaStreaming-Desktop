const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const DEFAULTS = {
  launchAtStartup: false,
  startMinimized: false,
  closeToTray: true,
  minimizeToTray: false,
  discordPresence: true,
  presencePort: 6464,
  hardwareAcceleration: true,
  zoomFactor: 1,
};

let cache = null;

function getConfigPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function load() {
  if (cache) return cache;
  try {
    const raw = fs.readFileSync(getConfigPath(), 'utf8');
    cache = { ...DEFAULTS };
    for (const [key, value] of Object.entries(JSON.parse(raw))) {
      try { cache[key] = validate(key, value); } catch { /* Ignore obsolete/corrupt values. */ }
    }
  } catch {
    cache = { ...DEFAULTS };
  }
  return cache;
}

function validate(key, value) {
  if (!Object.hasOwn(DEFAULTS, key)) throw new Error('Unknown setting');
  if (typeof DEFAULTS[key] === 'boolean' && typeof value !== 'boolean') throw new Error('Expected a toggle value');
  if (key === 'zoomFactor' && (!Number.isFinite(value) || value < 0.7 || value > 1.5)) throw new Error('Zoom must be between 70% and 150%');
  if (key === 'presencePort' && (!Number.isInteger(value) || value < 1024 || value > 65535)) throw new Error('Invalid presence port');
  return value;
}

function save(settings) {
  const next = { ...DEFAULTS };
  for (const [key, value] of Object.entries(settings)) next[key] = validate(key, value);
  fs.mkdirSync(app.getPath('userData'), { recursive: true });
  const temp = getConfigPath() + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(next, null, 2), { mode: 0o600 });
  fs.renameSync(temp, getConfigPath());
  cache = next;
  return { ...cache };
}

function get(key) {
  return load()[key];
}

function set(key, value) {
  validate(key, value);
  return save({ ...load(), [key]: value });
}

module.exports = { DEFAULTS, load, save, get, set, getConfigPath, validate };
