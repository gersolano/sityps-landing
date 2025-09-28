'use strict';
const { getBlobsStore } = require('./_blobs.cjs');

const STORES   = ['tickets', 'tikects'];
const PREFIXES = ['tickets/', '', 'sityps/', 'sityps/tickets/'];

async function listSample(store, prefix) {
  try {
    const s = await getBlobsStore(store);
    const res = await s.list({ prefix, limit: 10 });
    const keys = Array.isArray(res) ? res : (res && Array.isArray(res.items) ? res.items : []);
    const sample = keys.map(e => e?.key || e?.name || e?.path).filter(Boolean);
    return { ok: true, count: sample.length, sample };
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) };
  }
}

exports.handler = async () => {
  const matrix = [];
  for (const store of STORES) {
    for (const prefix of PREFIXES) {
      // eslint-disable-next-line no-await-in-loop
      const r = await listSample(store, prefix);
      matrix.push({ store, prefix, ...r });
    }
  }
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ ok: true, scan: matrix }, null, 2),
  };
};
