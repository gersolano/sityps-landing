/* eslint-disable */
const { getStore } = require("@netlify/blobs");
const nodemailer = require("nodemailer");

function uniq(a){ return [...new Set((a||[]).filter(Boolean))]; }
function isEmail(x){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(x||"").trim()); }
function splitEmails(v){ return String(v||"").split(/[;,]/g).map(s=>s.trim()).filter(isEmail); }
function nowISO(){ return new Date().toISOString(); }
function preview(t,n=240){ const s=String(t||""); return s.length>n?s.slice(0,n)+"…":s; }
function safe(x){ return String(x??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"); }

const MOD_TO_ENV=[
  {match:/afiliaci|organizaci|actas|acuerdos/i,env:"TO_AFILIACION"},
  {match:/laborales|asuntos/i,env:"TO_LABORALES"},
  {match:/finanzas/i,env:"TO_FINANZAS"},
  {match:/formaci|capacitaci/i,env:"TO_FORMACION"},
  {match:/escalaf/i,env:"TO_ESCALAFON"},
  {match:/cr[eé]dit|prestacion|vivienda/i,env:"TO_PRESTACIONES"},
  {match:/prensa|propaganda|relacion/i,env:"TO_PRENSA"},
  {match:/cultura|deport/i,env:"TO_CULTURA"},
  {match:/mujer|equidad/i,env:"TO_EQUIDAD"},
  {match:/honor|justicia/i,env:"TO_HONOR_JUSTICIA"},
  {match:/electoral/i,env:"TO_ELECTORAL"},
  {match:/consultorio/i,env:"TO_CONSULTORIOS"},
  {match:/soporte|t[eé]cnico/i,env:"TO_SOPORTE"},
];

function computeRecipients(ticket){
  const dest=[];
  if (process.env.TICKETS_TO_DEFAULT) dest.push(...splitEmails(process.env.TICKETS_TO_DEFAULT));
  if (isEmail(ticket.correo)) dest.push(ticket.correo);
  const modulo=(ticket.moduloDestino||ticket.modulo||"").toLowerCase();
  for(const rule of MOD_TO_ENV){
    if(rule.match.test(modulo)){
      const envVal = process.env[rule.env];
      if (envVal) dest.push(...splitEmails(envVal));
      break;
    }
  }
  const asignado=ticket.asignadoA;
  if (isEmail(asignado)) dest.push(asignado);
  return uniq(dest);
}

function makeTransport(){
  const host=process.env.SMTP_HOST, port=Number(process.env.SMTP_PORT||465);
  const user=process.env.SMTP_USER, pass=process.env.SMTP_PASS;
  if(!host||!user||!pass) throw new Error("Faltan SMTP_HOST/SMTP_USER/SMTP_PASS");
  return nodemailer.createTransport({host,port,secure:port===465,auth:{user,pass}});
}

function baseStyles(){ return `
  .wrap{max-width:640px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb}
  .hdr{background:#7a0c0c;color:#fff;padding:16px 20px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,'Helvetica Neue',Arial}
  .title{font-size:18px;font-weight:700;margin:0}
  .body{padding:20px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,'Helvetica Neue',Arial;color:#111827}
  .kv{width:100%;border-collapse:collapse;margin:8px 0 16px}
  .kv th{text-align:left;font-weight:600;color:#374151;padding:6px 0;white-space:nowrap;vertical-align:top;width:190px}
  .kv td{color:#111827;padding:6px 0}
  .pill{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;background:#fee2e2;color:#991b1b;border:1px solid #fecaca}
  .foot{margin-top:18px;font-size:12px;color:#6b7280}
`; }
function htmlTicket(ticket){
  return `
    <table class="kv">
      <tr><th>Folio</th><td><span class="pill">${safe(ticket.folio)}</span></td></tr>
      <tr><th>Fecha</th><td>${safe(new Date(ticket.submittedAt).toLocaleString("es-MX"))}</td></tr>
      <tr><th>Módulo</th><td>${safe(ticket.moduloDestino||ticket.modulo||"—")}</td></tr>
      <tr><th>Tipo</th><td>${safe(ticket.tipo||"—")}</td></tr>
      <tr><th>Solicitante</th><td>${safe(ticket.nombre||"—")} &lt;${safe(ticket.correo||"—")}&gt;</td></tr>
      <tr><th>Unidad</th><td>${safe(ticket.unidadAdscripcion||"—")}</td></tr>
      <tr><th>Descripción</th><td>${safe(preview(ticket.descripcion||"—"))}</td></tr>
    </table>`;
}
function html({title,intro,ticket,footerNote}){
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<style>${baseStyles()}</style></head><body>
<div class="wrap"><div class="hdr"><h1 class="title">${safe(title)}</h1></div>
<div class="body">
  <p>${safe(intro)}</p>
  ${htmlTicket(ticket)}
  <div class="foot">${safe(footerNote||"Este es un aviso automático del sistema SITYPS.")}</div>
</div></div></body></html>`;
}

exports.handler = async (event)=>{
  if(event.httpMethod!=="POST") return { statusCode:405, body:"Method Not Allowed" };
  try{
    const body = JSON.parse(event.body||"{}");
    const folio = String(body.folio||"").trim();
    const reason = String(body.reason||"Recordatorio").trim();
    if(!folio) return { statusCode:400, body:JSON.stringify({ok:false,error:"Falta folio"}) };

    const opts = process.env.BLOBS_STORE_NAME ? { name: process.env.BLOBS_STORE_NAME } : undefined;
    const store = getStore(opts);

    const keyDirect = `tickets/${folio}.json`;
    let ticket = await store.get(keyDirect, { type: "json" });
    let key = keyDirect;
    if(!ticket){
      let cursor;
      do{
        const page = await store.list({ prefix:"tickets/", cursor });
        for(const b of page.blobs||[]){
          if(!b.key.endsWith(".json")) continue;
          const t = await store.get(b.key, { type:"json" });
          if(t?.folio===folio){ ticket=t; key=b.key; break; }
        }
        cursor = page.cursor;
      } while(!ticket && cursor);
      if(!ticket) return { statusCode:404, body:JSON.stringify({ok:false,error:"Ticket no encontrado"}) };
    }

    const toList = computeRecipients(ticket);
    if(toList.length===0) return { statusCode:500, body:JSON.stringify({ok:false,error:"Sin destinatarios (revisa TICKETS_TO_DEFAULT)"}) };

    const transport = makeTransport();
    const pref = process.env.SUBJECT_PREFIX || "SITYPS";
    const subject = `${pref} · Ticket ${ticket.folio} — ${ticket.nombre || "Solicitante"} — Notificación`;
    const text =
      `Folio: ${ticket.folio}\nMódulo: ${ticket.moduloDestino}\nTipo: ${ticket.tipo}\n` +
      `Solicitante: ${ticket.nombre} <${ticket.correo}>\nDesc: ${preview(ticket.descripcion)}\n\n` +
      `${reason}`;

    const htmlBody = html({
      title: "Notificación de ticket",
      intro: `${reason}.`,
      ticket,
    });

    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: toList.join(", "),
      subject,
      text,
      html: htmlBody,
    });

    ticket.lastMail = { ok: true, at: nowISO(), subject, to: toList };
    await store.set(key, JSON.stringify(ticket, null, 2), { contentType:"application/json" });

    return { statusCode:200, headers:{ "content-type":"application/json" }, body: JSON.stringify({ ok:true }) };
  }catch(e){
    return { statusCode:500, headers:{ "content-type":"application/json" }, body: JSON.stringify({ ok:false, error:String(e.message||e) }) };
  }
};
