const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { buildDiscordActivity } = require('../src/presence');

test('playing activity reports stable elapsed and remaining time', () => {
  const activity = buildDiscordActivity({
    details: 'Series', state: 'Episode 3', posterUrl: 'https://serika.moe/poster.jpg',
    progressSeconds: 120, durationSeconds: 1440, isPaused: false,
  }, 10_000);
  assert.deepEqual(activity.timestamps, { start: 9_880, end: 11_320 });
  assert.equal(activity.state, 'Episode 3');
  assert.equal(activity.assets.small_text, '2:00 / 24:00');
});

test('paused activity keeps the episode context and clamps invalid progress', () => {
  const activity = buildDiscordActivity({
    details: 'Series', state: 'Episode 3', progressSeconds: 9_999,
    durationSeconds: 1440, isPaused: true,
  });
  assert.equal(activity.state, 'Paused · Episode 3');
  assert.equal(activity.assets.small_text, 'Paused at 24:00 / 24:00');
  assert.equal(activity.timestamps, undefined);
});

test('empty activity clears Discord instead of publishing a browsing status', () => {
  assert.equal(buildDiscordActivity(null), null);
});

test('remote Serika window only receives the narrow presence bridge', async () => {
  let bridge;
  const calls = [];
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/presence-preload.js'), 'utf8'), {
    require: () => ({
      contextBridge: { exposeInMainWorld: (name, value) => { assert.equal(name, 'serikaDesktop'); bridge = value; } },
      ipcRenderer: { invoke: (...args) => { calls.push(args); return Promise.resolve(true); } },
    }),
  });
  assert.deepEqual(Object.keys(bridge).sort(), ['clearPresence', 'updatePresence']);
  await bridge.updatePresence({ details: 'Series' });
  await bridge.clearPresence();
  assert.deepEqual(calls.map((call) => call[0]), ['presence:update', 'presence:clear']);
  const main = fs.readFileSync(path.join(__dirname, '../src/main.js'), 'utf8');
  assert.match(main, /preload: path\.join\(__dirname, 'presence-preload\.js'\)/);
  assert.match(main, /channel === 'presence:update' \|\| channel === 'presence:clear'/);
  assert.match(main, /new URL\(event\.senderFrame\.url\)\.origin === BASE_URL/);
});
