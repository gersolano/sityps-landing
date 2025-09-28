'use strict';

const { getBlobsStore } = require('./_blobs.cjs');
const { STORE_NAME, TICKETS_PREFIX } = require('./_cfg.cjs');

function csvEscape(v){ if(v==null)return ''; const s=String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s; }
function csvFromRows(rows){ const bom='\uFEFF'; return bom + rows.map(r=>r.map(csvEscape).join(',')).join('\r\n') + '\r\n'; }
function okCSV(body, filename='tickets.csv'){ return { statusCode:200, headers:{ 'content-type':'text/csv; charset=utf-8', 'content-disposition':`attachment; filename="${filename}"` }, body }; }
function fail(e){ return { statusCode:500, headers:{'content-type':'application/json; charset=utf-8'}, body: JSON.stringify({ ok:false, error:String((e&&e.message)||e) }) }; }

async function listKeys(store, prefix, limit=1000){
  const res=await store.list({prefix,limit}); const out=[]; const push=(e)=>{const k=e?.key||e?.name||e?.path;if(k)out.push(k);};
  if(Array.isArray(res)) res.forEach(push); else if(res && Array.isArray(res.items)) res.items.forEach(push);
  return out;
}
async function readJSON(store,key){ const raw=await store.get(key,{type:'text'}); if(!raw)return null; try{return JSON.parse(raw);}catch{return null;} }
async function loadTickets(storeName,prefix){
  const store=await getBlobsStore(storeName); const keys=await listKeys(store,prefix,1000); const items=[];
  for(const k of keys){ const t=await readJSON(store,k); if(!t||!t.folio)continue; items.push(t); }
  return items;
}

exports.handler = async (event)=>{
  try{
    const url = new URL(event.rawUrl || `http://x${event.path}`);
    const extended = url.searchParams.get('extended') === '1';

    const altStore = STORE_NAME === 'tikects' ? 'tickets' : 'tikects';
    let items = await loadTickets(STORE_NAME, TICKETS_PREFIX);
    if(items.length===0){ items = await loadTickets(altStore, TICKETS_PREFIX); }
    if(items.length===0){ items = await loadTickets(STORE_NAME, ''); }
    if(items.length===0){ items = await loadTickets(altStore, ''); }

    items.sort((a,b)=>Date.parse(b.createdAt||b.updatedAt||0)-Date.parse(a.createdAt||a.updatedAt||0));

    if(!extended){
      const rows=[['Folio','Fecha','Módulo','Tipo','Solicitante','Prioridad','Estado','Último correo']];
      for(const t of items){
        rows.push([ t.folio, t.createdAt||t.updatedAt||'', t.modulo||'', t.tipo||'', t.nombre||t.solicitante||'', t.prioridad||'Normal', t.estado||'Nuevo', t.ultimoCorreo||'' ]);
      }
      return okCSV(csvFromRows(rows), 'tickets.csv');
    }

    const rows=[['Folio','Fecha','Módulo','Tipo','Solicitante','Correo','Teléfono','Prioridad','Estado','Último correo','Secretaría','Notas','Adjuntos','JSON']];
    for(const t of items){
      const adj = Array.isArray(t.attachments) ? t.attachments.map(a=>a?.name||a?.filename||a?.url||'').filter(Boolean).join(' | ') : '';
      rows.push([ t.folio, t.createdAt||t.updatedAt||'', t.modulo||'', t.tipo||'',
        t.nombre||t.solicitante||'', t.correo||t.email||'', t.telefono||t.tel||'',
        t.prioridad||'Normal', t.estado||'Nuevo', t.ultimoCorreo||'',
        t.secretaria||t.responsable?.nombre||'', (t.notas||t.nota||'').toString().slice(0,500), adj,
        JSON.stringify(t).slice(0,2000) ]);
    }
    return okCSV(csvFromRows(rows), 'tickets-extendido.csv');
  }catch(e){ return fail(e); }
};
