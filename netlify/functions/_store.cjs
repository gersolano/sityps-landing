'use strict';

const STORE_NAME = process.env.BLOBS_STORE_NAME || 'tickets';

async function loadBlobs() {
  return await import('@netlify/blobs');
}

async function _createRawStore() {
  const { getStore } = await loadBlobs();

  try {
    const s = getStore({ name: STORE_NAME });
    console.log('[blobs] usando auto-config, store =', STORE_NAME);
    return s;
  } catch (err) {
    const siteID =
      process.env.NETLIFY_SITE_ID ||
      process.env.BLOBS_SITE_ID ||
      process.env.SITE_ID;

    const token =
      process.env.NETLIFY_API_TOKEN ||
      process.env.NETLIFY_AUTH_TOKEN ||
      process.env.BLOBS_TOKEN;

    const masked =
      token ? token.slice(0, 4) + '...' + token.slice(-4) : '(vacío)';

    console.log('[blobs] fallback manual. siteID =', siteID, ' store =', STORE_NAME, ' token =', masked);

    if (!siteID || !token) throw err;
    return getStore({ name: STORE_NAME, siteID, token });
  }
}

async function makeStore() { return _createRawStore(); }
const getTicketStore = makeStore;

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
async function listByPrefix(store, prefix) {
  const out = [];
  for await (const e of store.list({ prefix })) out.push(e);
  return out;
}

module.exports = { makeStore, getTicketStore, readIndex, writeIndex, listByPrefix, STORE_NAME };
