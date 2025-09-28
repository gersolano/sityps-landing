// src/lib/ticketsApi.js
const BASE = '/.netlify/functions';

async function callFn(name, { method='GET', body=null, params=null, asBlob=false } = {}) {
  let url = `${BASE}/${name}`;
  if (params && typeof params === 'object') {
    const qs = new URLSearchParams(params);
    url += `?${qs.toString()}`;
  }
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try { const j = await res.json(); if (j?.error) msg = j.error; } catch {}
    throw new Error(msg);
  }
  return asBlob ? res.blob() : res.json();
}

export async function listTickets(filters = {}) {
  const data = await callFn('tickets-list', { params: filters });
  return data.items || [];
}

export async function getTicket(folio) {
  const data = await callFn('tickets-get', { params: { folio } });
  return data.ticket;
}

export async function updateTicket(patch) {
  const data = await callFn('tickets-update', { method: 'POST', body: patch });
  return data.ticket;
}

export async function downloadTicketsCSV() {
  const blob = await callFn('tickets-export', { asBlob: true });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'tickets.csv'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function fmtDate(s) {
  if (!s) return '—';
  try { return new Date(s).toLocaleString(); } catch { return s; }
}
