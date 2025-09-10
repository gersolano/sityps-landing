'use strict';

const { makeStore, STORE_NAME } = require('./_store.cjs');

exports.handler = async () => {
  try {
    const store = await makeStore();
    const key = `diag/${Date.now()}.json`;
    await store.setJSON(key, { ok: true, when: new Date().toISOString() });

    // Intentamos listar el prefijo diag/
    const items = [];
    for await (const e of store.list({ prefix: 'diag/' })) items.push(e.key);

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, store: STORE_NAME, wrote: key, listed: items.slice(-5) }),
      headers: { 'content-type': 'application/json' }
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, name: e.name, message: e.message }),
      headers: { 'content-type': 'application/json' }
    };
  }
};
