const { app, BrowserWindow, Menu } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert/strict');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'serika-electron-'));
app.setPath('userData', dir);
global.fetch = async url => {
  if (String(url).includes('/tv-link/status')) return new Response(JSON.stringify({ status: 'linked' }), { headers: { 'Set-Cookie': 'serika_session=synthetic-test-session; Path=/; HttpOnly; Secure; Max-Age=3600' } });
  if (String(url).endsWith('/api/auth/login')) return new Response(JSON.stringify({ code: 'INVALID_CREDENTIALS', message: 'Synthetic rejected login' }), { status: 401 });
  throw new Error('Unexpected network request in smoke test');
};
require('../src/main');
const timer = setTimeout(() => { console.error('Desktop smoke test timed out'); app.exit(1); }, 30000);
app.whenReady().then(async () => {
  try {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const menu = Menu.getApplicationMenu();
    const settings = menu.items.flatMap(item => item.submenu?.items || []).find(item => item.label === 'Settings…');
    assert.ok(settings, 'native Settings menu exists');
    settings.click();
    const win = BrowserWindow.getAllWindows().find(win => win.getTitle().includes('Settings'));
    assert.ok(win);
    await new Promise(resolve => win.webContents.once('did-finish-load', resolve));
    const result = await win.webContents.executeJavaScript(`(async () => {
      const before = await window.serika.getSettings();
      await window.serika.setSetting('zoomFactor', 1.2);
      const after = await window.serika.getSettings();
      return { before: before.zoomFactor, after: after.zoomFactor, controls: document.querySelectorAll('.toggle').length };
    })()`);
    assert.equal(result.before, 1); assert.equal(result.after, 1.2); assert.ok(result.controls >= 6);
    const auth = await win.webContents.executeJavaScript(`(async () => {
      const rejected = await window.serika.login('test@example.invalid', 'fake', false);
      const qr = await window.serika.pollQR('TEST123');
      return { rejected: rejected.success, qr: qr.status };
    })()`);
    assert.equal(auth.rejected, false); assert.equal(auth.qr, 'linked');
    const cookies = await require('electron').session.defaultSession.cookies.get({ url: 'https://serika.moe' });
    assert.equal(cookies.find(cookie => cookie.name === 'serika_session').value, 'synthetic-test-session');
    console.log('PASS: QR cookie handoff and rejected login handling');
    console.log('PASS: actual Electron settings window, preload IPC, native menu and disk persistence');
    const opened = [];
    const navigationWindow = new BrowserWindow({ show: false });
    require('../src/navigation').installNavigationPolicy(navigationWindow.webContents, {
      origin: 'https://serika.moe', openExternal: url => opened.push(url),
      navigate: url => navigationWindow.loadURL(url),
    });
    await navigationWindow.loadURL('data:text/html,<a href="https://issues.serika.dev/issues/new">Report</a>');
    await navigationWindow.webContents.executeJavaScript(`document.querySelector('a').click()`);
    await new Promise(resolve => setTimeout(resolve, 200));
    assert.deepEqual(opened, ['https://issues.serika.dev/issues/new']);
    assert.ok(navigationWindow.webContents.getURL().startsWith('data:'));
    await navigationWindow.webContents.executeJavaScript(`window.open('https://issues.serika.dev/projects/serika-streaming', '_blank')`);
    await new Promise(resolve => setTimeout(resolve, 200));
    assert.equal(opened.length, 2);
    navigationWindow.destroy();
    console.log('PASS: actual Electron external anchor and popup routing');

    const presenceWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        preload: path.join(__dirname, '../src/presence-preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    await presenceWindow.loadURL('data:text/html,<p>Presence bridge</p>');
    const presenceBridge = await presenceWindow.webContents.executeJavaScript(`(async () => ({
      methods: Object.keys(window.serikaDesktop).sort(),
      rejectedOutsideSerika: await window.serikaDesktop.updatePresence({ details: 'Untrusted' }).then(() => false, () => true)
    }))()`);
    assert.deepEqual(presenceBridge.methods, ['clearPresence', 'updatePresence']);
    assert.equal(presenceBridge.rejectedOutsideSerika, true);
    presenceWindow.destroy();
    console.log('PASS: isolated presence bridge and origin enforcement');
    clearTimeout(timer); app.exit(0);
  } catch (error) { console.error(error); clearTimeout(timer); app.exit(1); }
});
