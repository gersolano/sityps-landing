// netlify/functions/tickets-list.js
import { getStore } from '@netlify/blobs';

export async function handler(event) {
  try {
    const storeName = process.env.BLOBS_STORE_NAME || 'sityps-tickets';
    const opts = { name: storeName };
    if (process.env.NETLIFY_SITE_ID && process.env.NETLIFY_API_TOKEN) {
      opts.siteID = process.env.NETLIFY_SITE_ID;
      opts.token  = process.env.NETLIFY_API_TOKEN;
    }
    const store = getStore(opts);

    const { items: list } = await store.list({ prefix: 'tickets/' });
    const keys = (list || []).map(x => x.key);
    const tickets = [];
    for (const k of keys) {
      const t = await store.getJSON(k);
      if (t) tickets.push(t);
    }
    tickets.sort((a,b) => String(b.creadoEn).localeCompare(String(a.creadoEn)));

    return { statusCode: 200, body: JSON.stringify({ ok: true, items: tickets }) };
  } catch (err) {
    console.error('tickets-list error:', err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: String(err?.message || err) }) };
  }
}
