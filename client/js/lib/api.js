const API_BASE = '/api';

async function request(path, options = {}) {
  const url = API_BASE + path;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  // Connection
  connection: () => request('/connection'),
  connect: (host, port) => request('/connection', { method: 'POST', body: { host, port } }),

  // Routing
  getRoutes: () => request('/routes'),
  setVideoRoute: (input, output) => request('/route/video', { method: 'POST', body: { input, output } }),
  setAudioRoute: (input, output) => request('/route/audio', { method: 'POST', body: { input, output } }),
  setUsbRoute: (input, output) => request('/route/usb', { method: 'POST', body: { input, output } }),
  setAvRoute: (input, output) => request('/route/av', { method: 'POST', body: { input, output } }),
  setAvuRoute: (input, output) => request('/route/avu', { method: 'POST', body: { input, output } }),

  // Status
  getCards: () => request('/cards'),
  getEdid: () => request('/edid'),
  getEdidInput: (port) => request(`/edid/input/${port}`),
  getEdidOutput: (port) => request(`/edid/output/${port}`),
  copyTxEdid: (source, destination) => request('/edid/copy-tx', { method: 'POST', body: { source, destination } }),
  forceEdid: (port) => request('/edid/force', { method: 'POST', body: { port } }),
  forceDefaultEdid: (port) => request('/edid/force-default', { method: 'POST', body: { port } }),
  getEdidLockout: () => request('/edid/lockout'),
  setEdidLockout: (state) => request('/edid/lockout', { method: 'POST', body: { state } }),
  getHdcp: () => request('/hdcp'),

  // Network
  getNetwork: () => request('/network'),

  // System
  getVersion: () => request('/version'),
  getUptime: () => request('/uptime'),
  getErrors: () => request('/errors'),
  clearErrors: () => request('/errors/clear', { method: 'POST' }),
  getMemory: () => request('/system/memory'),
  getTop: () => request('/system/top'),
  reboot: () => request('/system/reboot', { method: 'POST', body: { confirm: true } }),
  getFpLockout: () => request('/fp-lockout'),
  setFpLockout: (state) => request('/fp-lockout', { method: 'POST', body: { state } }),

  // DM Info
  getTopology: () => request('/dm/topology'),
  getEndpoints: () => request('/dm/endpoints'),
  getStreams: () => request('/dm/streams'),

  // Raw command
  command: (command, timeout) => request('/command', { method: 'POST', body: { command, timeout } }),
};
