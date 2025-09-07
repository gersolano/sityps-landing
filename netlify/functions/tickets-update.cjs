/* eslint-disable */
const { getStore } = require("@netlify/blobs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

/* ===== Utils ===== */
function nowISO() { return new Date().toISOString(); }
function mapEstado(e) {
  if (!e) return "nuevo";
  const v = String(e).toLowerCase().replace(/\s+/g, "_");
  return ["nuevo","en_proceso","resuelto","cerrado"].includes(v) ? v : "nuevo";
}
function isEmail(x){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(x||"").trim()); }
function uniq(a){ return [...new Set((a||[]).filter(Boolean))]; }
function splitEmails(v){ return String(v||"").split(/[;,]/g).map(s=>s.trim()).filter(isEmail); }
function preview(t,n=240){ const s=String(t||""); return s.length>n?s.slice(0,n)+"…":s; }
function safe(x){ return String(x??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"); }
function ucFirst(str){ return String(str||"").replace(/_/g," ").replace(/\b\w/g, c=>c.toUpperCase()); }

/* Normalizar ticket */
function normalizeTicketForSave(t){
  t.folio = t.folio || t.id || `T-${Date.now()}`;
  t.submittedAt = t.submittedAt || t.fechaISO || nowISO();
  t.estado = mapEstado(t.estado || "nuevo");
  t.prioridad = t.prioridad || "Media";
  t.historico = Array.isArray(t.historico) ? t.historico : [];
  return t;
}

/* Auth opcional */
function readClaims(event){
  try{
    const auth = event.headers?.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if(!token || !process.env.JWT_SECRET) return {};
    return jwt.verify(token, process.env.JWT_SECRET) || {};
  }catch{ return {}; }
}
function actorFromClaims(c){ return c.name || c.nombre || c.email || c.user || "backoffice"; }
function canEdit(ticket, claims){
  const role = String((claims.role||claims.rol||"")).toLowerCase();
  if (role==="admin"||role==="soporte") return true;
  const moduloUsuario = (claims.dept||claims.modulo||claims.puesto||"").toLowerCase();
  const modTicket = (ticket.moduloDestino||ticket.modulo||"").toLowerCase();
  return moduloUsuario && modTicket.includes(moduloUsuario);
}

/* Correo */
function makeTransport(){
  const host=process.env.SMTP_HOST, port=Number(process.env.SMTP_PORT||465);
  const user=process.env.SMTP_USER, pass=process.env.SMTP_PASS;
  if(!host||!user||!pass) throw new Error("Faltan SMTP_HOST/SMTP_USER/SMTP_PASS");
  return nodemailer.createTransport({host,port,secure:port===465,auth:{user,pass}});
}
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

/* ===== Plantilla HTML ===== */
function baseStyles(){ return `
  .wrap{max-width:640px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb}
  .hdr{background:#7a0c0c;color:#fff;padding:16px 20px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,'Helvetica Neue',Arial}
  .title{font-size:18px;font-weight:700;margin:0}
  .body{padding:20px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,'Helvetica Neue',Arial;color:#111827}
  .kv{width:100%;border-collapse:collapse;margin:8px 0 16px}
  .kv th{text-align:left;font-weight:600;color:#374151;padding:6px 0;white-space:nowrap;vertical-align:top;width:190px}
  .kv td{color:#111827;padding:6px 0}
  .pill{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;background:#fee2e2;color:#991b1b;border:1px solid #fecaca}
  .muted{color:#6b7280}
  .section{margin-top:16px;padding-top:12px;border-top:1px solid #e5e7eb}
  .changes li{margin:4px 0}
  .foot{margin-top:18px;font-size:12px;color:#6b7280}
  @media (prefers-color-scheme: dark){
    body{background:#0b0b0b}
    .wrap{background:#111827;border-color:#374151}
    .body{color:#e5e7eb}
    .kv th{color:#9ca3af}
    .kv td{color:#e5e7eb}
    .muted{color:#9ca3af}
    .foot{color:#9ca3af}
  }`; }
function htmlTicketBlock(t){
  const facil = t.facilidades ? `
    <div class="section">
      <div class="muted" style="font-weight:600;margin-bottom:6px">Facilidades administrativas</div>
      <table class="kv">
        <tr><th>Institución</th><td>${safe(t.facilidades.institucion||"—")}</td></tr>
        <tr><th>Evento / Incidencia</th><td>${safe(t.facilidades.tipoEvento||"—")}</td></tr>
        <tr><th>Solicitantes</th><td>${safe(t.facilidades.cantidadSolicitantes||1)}</td></tr>
        <tr><th>Fechas solicitadas</th><td>${safe(t.facilidades.fechasSolicitadas||"—")}</td></tr>
      </table>
    </div>` : "";
  return `
    <table class="kv">
      <tr><th>Folio</th><td><span class="pill">${safe(t.folio)}</span></td></tr>
      <tr><th>Fecha</th><td>${safe(new Date(t.submittedAt).toLocaleString("es-MX"))}</td></tr>
      <tr><th>Módulo</th><td>${safe(t.moduloDestino||t.modulo||"—")}</td></tr>
      <tr><th>Tipo</th><td>${safe(t.tipo||"—")}</td></tr>
      <tr><th>Solicitante</th><td>${safe(t.nombre||"—")} &lt;${safe(t.correo||"—")}&gt;</td></tr>
      <tr><th>Unidad</th><td>${safe(t.unidadAdscripcion||"—")}</td></tr>
      <tr><th>Teléfono</th><td>${safe(t.telefono||"—")}</td></tr>
      <tr><th>Descripción</th><td>${safe(preview(t.descripcion||"—"))}</td></tr>
    </table>${facil}`;
}
function htmlChangesList(c){
  const items = Object.entries(c||{}).map(([k,v])=>`<li><strong>${safe(k)}:</strong> ${safe(v)}</li>`).join("") || "<li>—</li>";
  return `<ul class="changes">${items}</ul>`;
}
function buildHtmlEmail({title,intro,ticket,changesHtml,footerNote}){
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<style>${baseStyles()}</style></head><body>
<div class="wrap">
  <div class="hdr"><h1 class="title">${safe(title)}</h1></div>
  <div class="body">
    <p>${safe(intro)}</p>
    ${htmlTicketBlock(ticket)}
    ${changesHtml? `<div class="section"><div class="muted" style="font-weight:600;margin-bottom:6px">Cambios aplicados</div>${changesHtml}</div>`:""}
    <div class="foot">${safe(footerNote || "Este es un aviso automático del sistema SITYPS.")}</div>
  </div>
</div></body></html>`;
}

/* Destinatarios */
function computeRecipientsOnUpdate(ticket, cambios){
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
  const asignado=cambios?.asignadoA || ticket.asignadoA;
  if (isEmail(asignado)) dest.push(asignado);
  return uniq(dest);
}

/* ===== Handler ===== */
exports.handler = async (event) => {
  if (event.httpMethod !== "POST" && event.httpMethod !== "PATCH")
    return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const body = JSON.parse(event.body || "{}");
    const folio = body.folio || "";
    const cambios = body.cambios || {};
    if (!folio) return { statusCode:400, body:JSON.stringify({ok:false, error:"Falta el folio"}) };
    if (!cambios || typeof cambios !== "object")
      return { statusCode:400, body:JSON.stringify({ok:false, error:"Faltan cambios"}) };

    const opts = process.env.BLOBS_STORE_NAME ? { name: process.env.BLOBS_STORE_NAME } : undefined;
    const store = getStore(opts);

    // Cargar ticket (key directo y fallback)
    const keyDirect = `tickets/${folio}.json`;
    let ticket = await store.get(keyDirect, { type: "json" });
    let realKey = keyDirect;

    if (!ticket) {
      let cursor;
      do {
        const page = await store.list({ prefix: "tickets/", cursor });
        for (const b of page.blobs || []) {
          if (!b.key.endsWith(".json")) continue;
          const t = await store.get(b.key, { type: "json" });
          if (t?.folio === folio) { ticket = t; realKey = b.key; break; }
        }
        cursor = page.cursor;
      } while (!ticket && cursor);
      if (!ticket) return { statusCode:404, body:JSON.stringify({ok:false, error:"Ticket no encontrado"}) };
    }

    ticket = normalizeTicketForSave(ticket);

    // Permisos (si usas JWT; si no, edita igual)
    const claims = readClaims(event);
    if (!canEdit(ticket, claims))
      return { statusCode:403, body:JSON.stringify({ok:false, error:"No autorizado"}) };

    const hist = Array.isArray(ticket.historico) ? ticket.historico : (ticket.historico = []);
    const by = actorFromClaims(claims);

    const cambiosAplicados = {};
    if ("estado" in cambios && cambios.estado) {
      const prev = ticket.estado;
      ticket.estado = mapEstado(cambios.estado);
      if (ticket.estado !== prev) {
        hist.push({ at: nowISO(), by, action: "estado", value: ticket.estado });
        cambiosAplicados.estado = `${ucFirst(prev)} → ${ucFirst(ticket.estado)}`;
      }
    }
    if ("prioridad" in cambios && cambios.prioridad) {
      const prev = ticket.prioridad;
      ticket.prioridad = String(cambios.prioridad);
      if (ticket.prioridad !== prev) {
        hist.push({ at: nowISO(), by, action: "prioridad", value: ticket.prioridad });
        cambiosAplicados.prioridad = `${prev} → ${ticket.prioridad}`;
      }
    }
    if ("asignadoA" in cambios) {
      const prev = ticket.asignadoA || "—";
      ticket.asignadoA = String(cambios.asignadoA || "");
      if (ticket.asignadoA !== prev) {
        hist.push({ at: nowISO(), by, action: "asignacion", value: ticket.asignadoA });
        cambiosAplicados.asignacion = `${prev} → ${ticket.asignadoA || "—"}`;
      }
    }
    if (cambios.nota) {
      const texto = String(cambios.nota || "").trim();
      if (texto) {
        hist.push({ at: nowISO(), by, action: "nota", notes: texto });
        cambiosAplicados.nota = preview(texto, 120);
      }
    }

    await store.set(realKey, JSON.stringify(ticket, null, 2), { contentType: "application/json" });

    // Correo (no bloqueante)
    let mailOk=false, mailError="";
    try{
      if (Object.keys(cambiosAplicados).length > 0) {
        const toList = computeRecipientsOnUpdate(ticket, cambios);
        if (toList.length > 0) {
          const transport = makeTransport();
          const pref = process.env.SUBJECT_PREFIX || "SITYPS";
          const main = cambiosAplicados.estado ? `Estado: ${ucFirst(ticket.estado)}` :
                       cambiosAplicados.prioridad ? `Prioridad: ${ticket.prioridad}` :
                       cambiosAplicados.asignacion ? `Asignación` : `Actualización`;
          const subject = `${pref} · Ticket ${ticket.folio} actualizado — ${ticket.nombre} — ${main}`;

          const text =
            `Folio: ${ticket.folio}\nFecha: ${new Date(ticket.submittedAt).toLocaleString("es-MX")}\n` +
            `Módulo: ${ticket.moduloDestino}\nTipo: ${ticket.tipo}\n` +
            `Solicitante: ${ticket.nombre} <${ticket.correo}>\nUnidad: ${ticket.unidadAdscripcion}\n` +
            `Desc: ${preview(ticket.descripcion)}\n\n` +
            `Cambios:\n${Object.entries(cambiosAplicados).map(([k,v])=>`- ${k}: ${v}`).join("\n") || "—"}\n`;

          const html = buildHtmlEmail({
            title: "Ticket actualizado",
            intro: "Se registraron cambios en tu ticket.",
            ticket,
            changesHtml: (function(c){ 
              const items = Object.entries(c||{}).map(([k,v])=>`<li><strong>${safe(k)}:</strong> ${safe(v)}</li>`).join("") || "<li>—</li>";
              return `<ul class="changes">${items}</ul>`;
            })(cambiosAplicados),
            footerNote: "Puedes dar seguimiento desde el backoffice.",
          });

          await transport.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: toList.join(", "),
            subject, text, html
          });
          mailOk=true;
        } else {
          mailError="Sin destinatarios (revisa TICKETS_TO_DEFAULT o correos por módulo)";
        }
      }
    }catch(e){ mailError=String(e.message||e); }

    return {
      statusCode: 200,
      headers: { "content-type":"application/json" },
      body: JSON.stringify({ ok:true, ticket, mailOk, ...(mailOk?{}:{mailError}) }),
    };
  } catch (err) {
    return { statusCode:500, headers:{ "content-type":"application/json" }, body: JSON.stringify({ ok:false, error:String(err.message||err) }) };
  }
};
