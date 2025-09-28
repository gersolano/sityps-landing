'use strict';
const { getBlobsStore } = require('./_blobs.cjs');

exports.handler = async (event) => {
  try {
    const url = new URL(event.rawUrl || `http://x${event.path}`);
    const storeName = (url.searchParams.get('store') || process.env.BLOBS_STORE_NAME || 'tickets').trim();
    const prefix    = (url.searchParams.get('prefix') || process.env.BLOBS_PREFIX || 'tickets/').trim();

    const store = await getBlobsStore(storeName);

    // listar máx 20 para muestra
    const res = await store.list({ prefix, limit: 20 });
    let sample = [];
    if (Array.isArray(res)) sample = res.map(e => e?.key || e?.name || e?.path).filter(Boolean);
    else if (res && Array.isArray(res.items)) sample = res.items.map(e => e?.key || e?.name || e?.path).filter(Boolean);

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ ok: true, store: storeName, prefix, count: sample.length, sample }, null, 2),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ ok: false, error: String(e && e.message || e) }, null, 2),
    };
  }
};
