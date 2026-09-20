const { test } = require('node:test');
const assert = require('node:assert/strict');
const { installNavigationPolicy } = require('../src/navigation');
test('same-window links, redirects and popups leave external sites to the browser', async () => {
  const handlers = {}, external = [], internal = [];
  installNavigationPolicy({ on: (event, fn) => handlers[event] = fn, setWindowOpenHandler: fn => handlers.popup = fn }, {
    origin: 'https://serika.moe', openExternal: url => external.push(url), navigate: url => internal.push(url),
  });
  for (const kind of ['will-navigate', 'will-redirect']) {
    let prevented = false;
    handlers[kind]({ preventDefault: () => prevented = true }, 'https://issues.serika.dev/issues/new');
    assert.equal(prevented, true);
    prevented = false;
    handlers[kind]({ preventDefault: () => prevented = true }, 'https://serika.moe/browse');
    assert.equal(prevented, false);
  }
  assert.deepEqual(handlers.popup({ url: 'https://issues.serika.dev/' }), { action: 'deny' });
  handlers.popup({ url: 'https://serika.moe/browse' });
  for (const url of ['javascript:alert(1)', 'file:///etc/passwd', 'invalid']) handlers.popup({ url });
  handlers.popup({ url: 'https://serika.moe.attacker.invalid/' });
  await new Promise(setImmediate);
  assert.equal(external.length, 4);
  assert.deepEqual(internal, ['https://serika.moe/browse']);
});
