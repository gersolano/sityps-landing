/* eslint-disable */
const { getStore } = require("@netlify/blobs");

exports.handler = async () => {
  try{
    const opts = process.env.BLOBS_STORE_NAME ? { name: process.env.BLOBS_STORE_NAME } : undefined;
    const store = getStore(opts);

    const items = [];
    let cursor;
    do{
      const page = await store.list({ prefix:"tickets/", cursor });
      for(const b of page.blobs || []){
        if(!b.key.endsWith(".json")) continue;
        const t = await store.get(b.key, { type:"json" });
        if(t && t.folio){
          items.push({
            folio: t.folio,
            submittedAt: t.submittedAt,
            modulo: t.modulo,
            moduloDestino: t.moduloDestino,
            tipo: t.tipo,
            nombre: t.nombre,
            correo: t.correo,
            unidadAdscripcion: t.unidadAdscripcion,
            telefono: t.telefono,
            estado: t.estado,
            prioridad: t.prioridad,
            lastMail: t.lastMail || null,
          });
        }
      }
      cursor = page.cursor;
    } while(cursor);

    items.sort((a,b)=> String(b.submittedAt||"").localeCompare(String(a.submittedAt||"")));
    return { statusCode:200, headers:{ "content-type":"application/json" }, body: JSON.stringify({ ok:true, items }) };
  }catch(e){
    return { statusCode:500, headers:{ "content-type":"application/json" }, body: JSON.stringify({ ok:false, error:String(e.message||e) }) };
  }
};
