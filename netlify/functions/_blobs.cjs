'use strict';

/**
 * Cliente REST para Netlify Blobs (sin @netlify/blobs).
 * Usa el Site ID en la URL: https://api.netlify.com/api/v1/sites/:site_id/blobs/:store
 * Requiere en runtime:
 *   - NETLIFY_SITE_ID  (o BLOBS_SITE_ID)  ✅ el de tu proyecto: e1587a7a-dbcb-42e5-9ccb-09ea880dae51
 *   - NETLIFY_API_TOKEN (o NETLIFY_TOKEN / BLOBS_TOKEN) con permisos de Blobs
 */

const API = 'https://api.netlify.com/api/v1';

function clean(v) { return typeof v === 'string' ? v.trim() : v; }

function getAuth() {
  const siteID =
    clean(process.env.BLOBS_SITE_ID) ||
    clean(process.env.NETLIFY_SITE_ID);

  const token =
    clean(process.env.BLOBS_TOKEN) ||
    clean(process.env.NETLIFY_API_TOKEN) ||
    clean(process.env.NETLIFY_TOKEN);

  if (!siteID || !token) {
    const miss = [];
    if (!siteID) miss.push('NETLIFY_SITE_ID/BLOBS_SITE_ID');
    if (!token)  miss.push('NETLIFY_API_TOKEN/NETLIFY_TOKEN/BLOBS_TOKEN');
    throw new Error(`Faltan credenciales de Blobs: ${miss.join(', ')}.`);
  }
  return { siteID, token };
}

function headersAuth(extra) {
  const { token } = getAuth();
  return {
    authorization: `Bearer ${token}`,
    ...(extra || {}),
  };
}

function encSeg(s) {
  // encodea cada segmento, preservando separadores
  return String(s).split('/').map(encodeURIComponent).join('/');
}

function makeStore(storeName) {
  const { siteID } = getAuth();
  const base = `${API}/sites/${encodeURIComponent(siteID)}/blobs/${encodeURIComponent(storeName)}`;

  return {
    /** Lee un blob. opts.type: 'text'|'json'|'arrayBuffer' (default 'text') */
    async get(key, opts = {}) {
      const url = `${base}/${encSeg(key)}`;
      const res = await fetch(url, { method: 'GET', headers: headersAuth() });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`GET ${res.status} ${await res.text()}`);
      const t = (opts.type || 'text').toLowerCase();
      if (t === 'json') return await res.json();
      if (t === 'arraybuffer' || t === 'buffer') return Buffer.from(await res.arrayBuffer());
      return await res.text();
    },

    /** Escribe un blob (string/Buffer/obj). */
    async set(key, value, opts = {}) {
      let body = value;
      let ct = opts.contentType;

      if (typeof value === 'string') {
        if (!ct && /^\s*[\[{]/.test(value.trim())) ct = 'application/json; charset=utf-8';
      } else if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
        if (!ct) ct = 'application/octet-stream';
      } else if (typeof value === 'object' && value !== null) {
        ct = ct || 'application/json; charset=utf-8';
        body = JSON.stringify(value);
      }

      const url = `${base}/${encSeg(key)}`;
      const res = await fetch(url, { method: 'PUT', headers: headersAuth(ct ? { 'content-type': ct } : {}), body });
      if (!res.ok) throw new Error(`PUT ${res.status} ${await res.text()}`);
      return true;
    },

    /** Lista claves con prefijo. Devuelve array o {items:[{key}...]} */
    async list({ prefix = '', limit = 1000 } = {}) {
      const u = new URL(base);
      if (prefix) u.searchParams.set('prefix', prefix);
      if (limit)  u.searchParams.set('limit', String(limit));
      const res = await fetch(u.toString(), { method: 'GET', headers: headersAuth() });
      if (!res.ok) throw new Error(`LIST ${res.status} ${await res.text()}`);
      const data = await res.json();
      if (Array.isArray(data)) return data;                 // [{ key, ... }]
      if (data && Array.isArray(data.items)) return data;   // { items: [...] }
      if (Array.isArray(data?.keys)) return { items: data.keys.map(k => ({ key: k })) };
      return { items: [] };
    },
  };
}

async function getBlobsStore(name) {
  // valida credenciales y construye store ligado al site
  getAuth();
  return makeStore(name);
}

module.exports = { getBlobsStore };
