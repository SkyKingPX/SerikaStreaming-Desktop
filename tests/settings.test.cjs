const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
test('settings validate and persist without corrupting state on failure', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'serika-settings-'));
  t.after(() => fs.rmSync(dir, { force: true, recursive: true }));
  function load() {
    const module = { exports: {} };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/settings.js'), 'utf8'), { module, console, require: name => name === 'electron' ? { app: { getPath: () => dir } } : require(name) });
    return module.exports;
  }
  const store = load();
  store.set('zoomFactor', 1.25);
  store.set('closeToTray', false);
  assert.equal(load().get('zoomFactor'), 1.25);
  assert.equal(load().get('closeToTray'), false);
  for (const [key, value] of [['zoomFactor', 99], ['discordPresence', 'false'], ['injected', true], ['presencePort', 0]]) assert.throws(() => store.set(key, value));
  assert.equal(store.get('zoomFactor'), 1.25);
  fs.writeFileSync(path.join(dir, 'settings.json'), '{"zoomFactor":99,"discordPresence":false,"unknown":true}');
  assert.equal(load().get('zoomFactor'), 1);
  assert.equal(load().get('discordPresence'), false);
});
