'use strict';

const { listIndex, getTicket, ensureIndexFromTicket } = require('./_store.cjs');
const ok  = (b, s=200)=>({ statusCode:s, headers:{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*'}, body:JSON.stringify(b) });

exports.handler = async () => {
  const idx = await listIndex();
  let updated = 0;
  for (const it of idx) {
    const t = await getTicket(it.folio);
    if (t) { await ensureIndexFromTicket(t); updated++; }
  }
  return ok({ ok:true, updated, total: idx.length });
};
