const BASE = '/api';

export async function parseText(text) {
  const res = await fetch(`${BASE}/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`Parse failed: ${res.statusText}`);
  return res.json();
}

export async function startSearch(specs) {
  const res = await fetch(`${BASE}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ specs }),
  });
  if (!res.ok) throw new Error(`Search failed: ${res.statusText}`);
  return res.json();
}

export async function getSearchStatus(searchId) {
  const res = await fetch(`${BASE}/search/${searchId}/status`);
  if (!res.ok) throw new Error(`Status check failed: ${res.statusText}`);
  return res.json();
}

export async function getSearchResults(searchId) {
  const res = await fetch(`${BASE}/search/${searchId}/results`);
  if (!res.ok) throw new Error(`Results fetch failed: ${res.statusText}`);
  return res.json();
}

export async function getSettings() {
  const res = await fetch(`${BASE}/settings`);
  if (!res.ok) throw new Error(`Settings fetch failed: ${res.statusText}`);
  return res.json();
}

export async function updateSettings(settings) {
  const res = await fetch(`${BASE}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error(`Settings update failed: ${res.statusText}`);
  return res.json();
}

export async function testSupplierConnection(supplierId) {
  const res = await fetch(`${BASE}/settings/test/${supplierId}`, { method: 'POST' });
  if (!res.ok) throw new Error(`Test failed: ${res.statusText}`);
  return res.json();
}

export function createProgressWebSocket(searchId, onMessage) {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsHost = window.location.hostname;
  const wsPort = process.env.NODE_ENV === 'development' ? '3001' : window.location.port;
  const ws = new WebSocket(`${wsProtocol}//${wsHost}:${wsPort}/ws?searchId=${searchId}`);
  ws.onmessage = (event) => {
    try {
      onMessage(JSON.parse(event.data));
    } catch (e) { /* ignore parse errors */ }
  };
  return ws;
}
