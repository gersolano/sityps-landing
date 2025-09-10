'use strict';

// Store por defecto (puedes cambiarlo con BLOBS_STORE_NAME)
const STORE_NAME = process.env.BLOBS_STORE_NAME || 'tickets';

// Carga @netlify/blobs como ESM (esbuild lo empaqueta)
async function loadBlobs() {
  return await import('@netlify/blobs');
}

// Crea el store "raw". Si falla el autoconfig, usa fallback con SITE_ID + TOKEN.
async function _createRawStore() {
  const { getStore } = await loadBlobs();

  // 1) Intento normal (cuando Netlify autoconfigura el runtime)
  try {
    return getStore({ name: STORE_NAME });
  } catch (err) {
    // 2) Fallback manual
    const siteID =
      process.env.NETLIFY_SITE_ID ||
      process.env.BLOBS_SITE_ID ||
      process.env.SITE_ID;

    const token =
      process.env.NETLIFY_API_TOKEN ||
      process.env.NETLIFY_AUTH_TOKEN || // usado por la CLI
      process.env.BLOBS_TOKEN;

    if (!siteID || !token) throw err;
    return getStore({ name: STORE_NAME, siteID, token });
  }
}

/** Alias de compatibilidad:
 *  - makeStore(): retorna el store "raw"
 *  - getTicketStore(): igual que makeStore (para código que use ese nombre)
 */
async function makeStore() {
  return _createRawStore();
}
const getTicketStore = makeStore;

// Helpers comunes
async function readIndex(store) {
  try {
    return (await store.getJSON('index.json')) || { last: 0, folios: [] };
  } catch {
    return { last: 0, folios: [] };
  }
}

async function writeIndex(store, data) {
  await store.setJSON('index.json', data || { last: 0, folios: [] });
}

/** Listado por prefijo (compatibilidad con listByPrefix antigua) */
async function listByPrefix(store, prefix) {
  const out = [];
  for await (const entry of store.list({ prefix })) out.push(entry);
  return out;
}

module.exports = {
  // API pública (con alias)
  makeStore,
  getTicketStore,
  readIndex,
  writeIndex,
  listByPrefix,
  // útil para logs
  STORE_NAME,
};
