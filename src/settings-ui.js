// Load current settings and bind controls

const toggles = document.querySelectorAll('.toggle');
const zoom = document.getElementById('zoom');
const zoomValue = document.getElementById('zoom-value');
const presenceStatus = document.getElementById('presence-status');

async function init() {
  const settings = await window.serika.getSettings();

  toggles.forEach((el) => {
    const key = el.dataset.key;
    el.checked = !!settings[key];
    el.addEventListener('change', async () => {
      const previous = !el.checked;
      el.disabled = true;
      try {
        await window.serika.setSetting(key, el.checked);
        document.getElementById('save-status').textContent = key === 'hardwareAcceleration' ? 'Saved. Restart Serika to apply.' : 'Saved';
        if (key === 'discordPresence') refreshStatus();
      } catch (error) {
        el.checked = previous;
        document.getElementById('save-status').textContent = 'Could not save: ' + error.message;
      } finally { el.disabled = false; }
    });
  });

  if (zoom) {
    zoom.value = settings.zoomFactor || 1;
    updateZoomLabel(zoom.value);
    zoom.addEventListener('input', () => updateZoomLabel(zoom.value));
    zoom.addEventListener('change', async () => {
      try {
        await window.serika.setSetting('zoomFactor', parseFloat(zoom.value));
        document.getElementById('save-status').textContent = 'Saved';
      } catch (error) {
        zoom.value = (await window.serika.getSettings()).zoomFactor;
        updateZoomLabel(zoom.value);
        document.getElementById('save-status').textContent = 'Could not save: ' + error.message;
      }
    });
  }

  refreshStatus();
  setInterval(refreshStatus, 4000);
}

function updateZoomLabel(val) {
  if (zoomValue) zoomValue.textContent = Math.round(parseFloat(val) * 100) + '%';
}

async function refreshStatus() {
  try {
    const status = await window.serika.getStatus();
    if (!status.presenceActive) {
      presenceStatus.textContent = 'Disabled';
      presenceStatus.className = 'badge';
    } else if (status.discordConnected) {
      presenceStatus.textContent = 'Connected';
      presenceStatus.className = 'badge connected';
    } else {
      presenceStatus.textContent = 'Waiting for Discord';
      presenceStatus.className = 'badge active';
    }
  } catch {
    presenceStatus.textContent = 'Unknown';
    presenceStatus.className = 'badge';
  }
}

document.getElementById('restart').addEventListener('click', () => window.serika.restart());
init().catch(error => { document.getElementById('save-status').textContent = 'Unable to load settings: ' + error.message; });
