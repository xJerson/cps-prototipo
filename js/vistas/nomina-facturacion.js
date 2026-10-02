"use strict";
function excAuto(){
  const out=[];
  const asignaciones = S.excAsignaciones || (S.excAsignaciones={});
  const conAsignacion = x => ({...x, ...(asignaciones[x.id]||{}),
    assignedTo:(asignaciones[x.id]||{}).assignedTo||null,
    workStatus:(asignaciones[x.id]||{}).assignedTo ? "In progress" : "Unassigned"});
  // Una excepción automática ya decidida no vuelve a aparecer:
  // queda su registro en S.excepciones con quién la resolvió.
  const resueltas = new Set(S.excepciones.filter(x=>x.estado!=="Pendiente").map(x=>x.tipo+"|"+x.wo));
  const viva = x => !resueltas.has(x.tipo+"|"+x.wo);
  S.wos.filter(w=>w.semana===S.semana && !["Canceled"].includes(w.estado) && !tarifaWO(w)).forEach(w=>{
    /* Reunión 2026-09-09: Erika detecta el "NA" al facturar, pero no es
       quien define el precio — eso depende de si el manager preguntó
       cuánto costaba antes de aprobar. Si no preguntó, Thalia lo cierra
       ella misma (ella habla con los managers). Si sí preguntó, le toca
       a Claudia, porque es quien ajusta el precio caso por caso para que
       la unidad entre en el presupuesto (ver w.pidioPrecio / modalTarifaExc). */
    out.push(conAsignacion({id:"AUTO-T"+w.id, tipo:"Tarifa no encontrada", wo:w.id, auto:true,
      motivo:`No hay precio para ${w.serv} · ${U(w.unidad).rooms} en ${P(w.prop).nombre}. Hoy saldría "NA".`,
      monto:null, pide:"Sistema", aprueba: w.pidioPrecio?"Claudia":"Thalia", estado:"Pendiente", fecha:w.fecha, resol:null}));
  });
  S.asistencias.filter(a=>a.declarada).forEach(a=>{
    out.push(conAsignacion({id:"AUTO-D"+a.wo, tipo:"Llegada declarada", wo:a.wo, auto:true,
      motivo:`${tecN(a.tec)} cerró WO-${a.wo} sin haber marcado llegada; declaró las ${a.horaReal}. No está verificada.`,
      monto:null, pide:"Sistema", aprueba:"Thalia", estado:"Pendiente", fecha:a.fecha, resol:null}));
  });
  S.wos.filter(w=>w.estado==="Completed" && !w.evid && !w.evidExcusada).forEach(w=>{
    out.push(conAsignacion({id:"AUTO-E"+w.id, tipo:"Cierre sin evidencia", wo:w.id, auto:true,
      motivo:`WO-${w.id} se cerró sin ninguna foto. No hay con qué sustentar el cobro si el cliente reclama.`,
      monto:null, pide:"Sistema", aprueba:"Thalia", estado:"Pendiente", fecha:w.fecha, resol:null}));
  });
  // Una excepción por SOLICITUD, no por concepto: el técnico mandó un aviso,
  // no tres. Claudia lo abre una vez y adentro decide línea por línea.
  // Sección 5 del feedback: una Sub-Work Order planificada con costo entra
  // por el mismo camino (S.adicionales) que un hallazgo del técnico — acá
  // solo se distingue el rótulo y quién la pidió, según origen.
  solTodas().filter(solPend).forEach(s=>{
    const p = s.lineas.filter(l=>l.estado==="Pendiente");
    const esPlanificada = s.origen==="Planificada";
    out.push(conAsignacion({id:"AUTO-A"+s.sol, tipo:esPlanificada?"Sub-Work Order pendiente":"Adicional en sitio", wo:s.wo, auto:true,
      motivo:`${s.desc} — ${p.length} concepto(s): ${p.map(l=>l.concepto+((l.cant||1)>1?` ×${l.cant}`:"")).join(", ")}`,
      monto:p.reduce((t,l)=>t+(l.precio||0)*(l.cant||1),0),
      pide:esPlanificada?"Oficina":"Técnico", aprueba:s.aprobador||"Thalia", estado:"Pendiente", fecha:"", resol:null}));
  });
  // Aprobar el adicional y ponerle precio son decisiones distintas (Claudia):
  // Thalia puede aprobarlo hablando con la propiedad sin dar precio. Mientras
  // quede precioPend no entra a nómina ni a factura, así que frena su WO
  // igual que cualquier otra Request — por línea, no por solicitud.
  solTodas().forEach(s=>{
    s.lineas.filter(l=>l.estado==="Aprobado" && l.precioPend).forEach(l=>{
      out.push(conAsignacion({id:"AUTO-P"+l.id, tipo:"Definir precio del adicional", wo:s.wo, auto:true,
        motivo:`${l.concepto}${(l.cant||1)>1?` ×${l.cant}`:""} · WO-${s.wo} — aprobado ${l.aprob?`por ${l.aprob.medio.toLowerCase()} (${l.aprob.quien})`:"sin registro"} sin precio.`,
        monto:null, pide:"Sistema", aprueba:"Erika", estado:"Pendiente", fecha:"", resol:null}));
    });
  });
  // La primera vez que el sistema detecta cada una queda su hora — así se ve
  // desde cuándo está esperando, no solo cuándo se resolvió.
  out.forEach(x=>{
    if(!S.excCreadas[x.id]) S.excCreadas[x.id]={hora:hora(),minuto:S.reloj,fecha:HOY_SUP};
    /* Compatibilidad con los registros del prototipo anterior, que guardaban
       solo la hora. Los nuevos conservan minuto y fecha para medir el SLA. */
    const creada=S.excCreadas[x.id];
    x.creada={quien:x.pide,hora:typeof creada==="string"?creada:creada.hora,
      minuto:typeof creada==="string"?S.reloj:creada.minuto,
      fecha:typeof creada==="string"?HOY_SUP:creada.fecha};
    const registro=asignaciones[x.id] || (asignaciones[x.id]={});
    if(!registro.historial) registro.historial=[{evento:"Created",quien:x.pide,hora:x.creada.hora,fecha:x.creada.fecha}];
    // Estos objetos nacen de nuevo en cada render; completar con el registro
    // persistente evita que una solicitud tomada vuelva a quedar sin dueño.
    Object.assign(x, registro);
  });
  return out.filter(viva);
}
const excTodas = () => S.excepciones.concat(excAuto());
const excPend  = () => excTodas().filter(x=>x.estado==="Pendiente");
const excAsignadaA = x => x.assignedTo || null;
const excEstadoTrabajo = x => excAsignadaA(x) ? "In progress" : "Unassigned";
function proximoMiercoles(fecha){
  const d=new Date((fecha||HOY_SUP)+"T00:00:00");
  const dias=(3-d.getDay()+7)%7 || 7;
  d.setDate(d.getDate()+dias);
  return d.toISOString().slice(0,10);
}
/* SLA visible y real del prototipo: las aprobaciones del técnico se vuelven
   urgentes a los 20 min; definir una tarifa avisa a las 24 h y vence el
   miércoles siguiente. La misma función alimenta la tabla y las alertas. */
function slaApprovalRequest(x){
  if(x.estado!=="Pendiente") return null;
  const creada=x.creada||{};
  const minutos=Math.max(0,S.reloj-(creada.minuto==null?S.reloj:creada.minuto));
  const tecnica=x.pide==="Técnico" || x.tipo==="Adicional en sitio";
  if(tecnica && minutos>=20)
    return {nivel:"r",texto:`URGENT · ${minutos} min`,alerta:true};
  const tarifa=x.tipo==="Tarifa no encontrada" || x.tipo==="Trabajo fuera de tarifa";
  if(!tarifa) return null;
  const vence=proximoMiercoles(creada.fecha||x.fecha||HOY_SUP);
  if(HOY_SUP>vence) return {nivel:"r",texto:`OVERDUE · due ${vence}`,alerta:true};
  if(minutos>=1440) return {nivel:"w",texto:`TARIFF ALERT · ${Math.floor(minutos/60)} h · due ${vence}`,alerta:true};
  return null;
}
/* Toda Request debe estar ligada a una WO. Por eso solo frena esa
   orden: las demás nóminas y facturas pueden continuar. */
const excBloqueaTodo = () => false;
// «Ayuda en sitio» (el técnico pide una mano) no frena pago ni factura de la WO.
const woBloqueada = wid => excPend().some(x=>x.wo===wid && x.tipo!=="Ayuda en sitio");
function historialApproval(x){
  const hs=x.historial||[];
  return hs.length?`<div style="font-size:9.5px;color:var(--faint);margin-top:5px">${hs.map(h=>
    `${esc(h.hora||"")} · ${esc(h.evento)} · ${esc(h.quien)}${h.detalle?` · ${esc(h.detalle)}`:""}`).join("<br>")}</div>`:"";
}

VIEWS.excepciones = () => {
  const todas = excTodas();
  const pend = todas.filter(x=>x.estado==="Pendiente");
  const res  = todas.filter(x=>x.estado!=="Pendiente");
  const filtro = S.excFiltro||"unassigned";
  const visibles = pend.filter(x=>filtro==="all" || (filtro==="mine" ? x.assignedTo===S.usuario : !x.assignedTo));
  const porTipo = {};
  pend.forEach(x=>porTipo[x.tipo]=(porTipo[x.tipo]||0)+1);
  return `
  <div class="ph"><div><h2>Requests</h2>
    <p>Solicitudes que necesitan que <b>alguien de oficina</b> decida. Cada una frena el pago y la factura de su propia WO — no de las demás. Las de «Ayuda en sitio» (técnico pidiendo una mano) no frenan nada.</p></div>
    <div class="act"><button class="btn p" data-a="excNueva">+ New Request</button></div></div>

  ${pend.length
    ? `<div class="note r" style="margin-bottom:14px"><b>${pend.length} Request(s) pending.</b> Cada una frena solo el pago y la factura de su propia WO — el resto de la semana sigue su curso.</div>`
    : `<div class="note v" style="margin-bottom:14px"><b>No pending Requests.</b> Nada frenado por este motivo.</div>`}

  ${pend.length?`<div class="kpis">${Object.entries(porTipo).map(([t,n])=>
    `<div class="kpi"><div class="l">${esc(t)}</div><div class="v w">${n}</div></div>`).join("")}</div>`:""}

  <div class="card"><div class="chd"><h3>Pending Requests</h3><span class="s">assign an owner before anyone starts working it</span></div>
    <div class="act" style="margin:0 0 10px"><button class="btn sm ${filtro==="unassigned"?"p":""}" data-a="excFiltro" data-f="unassigned">Unassigned (${pend.filter(x=>!x.assignedTo).length})</button><button class="btn sm ${filtro==="mine"?"p":""}" data-a="excFiltro" data-f="mine">Mine (${pend.filter(x=>x.assignedTo===S.usuario).length})</button><button class="btn sm ${filtro==="all"?"p":""}" data-a="excFiltro" data-f="all">All (${pend.length})</button></div>
    ${visibles.length?`<table><thead><tr><th>Time</th><th>WO</th><th>Assigned to</th><th>Type</th><th>Reason</th><th>Requested by</th><th>Approve / Reject</th></tr></thead><tbody>
    ${visibles.map(x=>{ const sla=slaApprovalRequest(x); return `<tr class="${fl("exc:"+x.id)}">
      <td class="mono" style="color:${sla&&sla.nivel==="r"?"var(--rojo)":"var(--faint)"}">${x.creada?esc(x.creada.hora):"—"}${sla?`<div><span class="pill ${sla.nivel}" style="margin-top:3px">${esc(sla.texto)}</span></div>`:""}</td>
      <td class="mono">${x.wo?`<b style="cursor:pointer" data-a="woVer" data-id="${x.wo}">WO-${x.wo}</b>`:"—"}</td>
      <td>${x.assignedTo?`<b>${esc(x.assignedTo)}</b><div style="font-size:9.5px;color:var(--faint)">${x.assignedBy?`assigned by ${esc(x.assignedBy)} · ${esc(x.assignedAt||"")}`:""}</div>`:'<span class="pill w">Unassigned</span>'}${x.aprueba?`<div style="font-size:9.5px;color:var(--faint);margin-top:2px">approver: ${esc(x.aprueba)}</div>`:""}</td>
      <td><span class="pill ${x.tipo==="Tarifa no encontrada"?"w":(x.tipo==="Cierre sin evidencia"||x.tipo==="Ayuda en sitio")?"r":"m"}"><span class="dot"></span>${esc(x.tipo)}</span>
        ${x.auto?'<div style="font-size:9.5px;color:var(--faint);margin-top:2px">detectada por el sistema</div>':""}</td>
      <td style="max-width:340px">${esc(x.motivo)}${x.foto?` ${miniRecibo(x.foto)}`:""}${historialApproval(x)}</td>
      <td>${esc(x.pide)}</td>
      <td style="text-align:right;white-space:nowrap">
        ${x.assignedTo===S.usuario?"":`<button class="btn sm" data-a="excAsignarYo" data-id="${x.id}">Assign to me</button>`}
        <button class="btn sm" data-a="excAsignarModal" data-id="${x.id}">Assign</button>
        ${(x.assignedTo===S.usuario || x.aprueba===S.usuario) ? (x.tipo==="Ayuda en sitio"
          ? `<button class="btn sm v" data-a="excAyudaResolver" data-id="${x.id}">Resolver</button>`
          : x.tipo==="Unit data mismatch"
          ? `<button class="btn sm p" data-a="excUnidadRevisar" data-id="${x.id}">Review correction</button>`
          : x.tipo==="Tarifa no encontrada"
          ? `<button class="btn sm p" data-a="excTarifa" data-id="${x.id}" data-wo="${x.wo}">Definir tarifa</button>`
          : x.tipo==="Definir precio del adicional"
          ? `<button class="btn sm p" data-a="excDefinirPrecio" data-id="${x.id}">Definir precio</button>`
          : `<button class="btn sm" data-a="excRech" data-id="${x.id}">Rechazar</button>
             <button class="btn sm v" data-a="excAprob" data-id="${x.id}">Aprobar</button>`) : '<span style="font-size:10px;color:var(--faint)">Assigned owner or approver resolves</span>'}
      </td></tr>`; }).join("")}
    </tbody></table>`:`<div class="empty"><div class="b">✓</div>No requests in this filter</div>`}
  </div>

  ${res.length?`<div class="card"><div class="chd"><h3>Resueltas</h3></div>
    <table><thead><tr><th>Tipo</th><th>WO</th><th>Quién la pidió</th><th>Creada</th><th>Resultado</th><th>Quién decidió</th><th>Cuándo</th></tr></thead><tbody>
    ${res.map(x=>`<tr class="${fl("exc:"+x.id)}"><td>${esc(x.tipo)}</td><td class="mono">${x.wo?"WO-"+x.wo:"—"}</td>
      <td>${x.creada?esc(x.creada.quien):esc(x.pide)}</td>
      <td class="mono" style="color:var(--faint)">${x.creada?esc(x.creada.hora):"—"}</td>
      <td><span class="pill ${x.estado==="Aprobada"||x.estado==="Resuelta"?"v":"r"}">${x.estado}</span>${x.resol&&x.resol.nota?`<div style="font-size:10.5px;margin-top:3px">${esc(x.resol.nota)}</div>`:""}${historialApproval(x)}</td>
      <td>${x.resol?esc(x.resol.quien):"—"}</td><td class="mono">${x.resol?esc(x.resol.hora):"—"}</td></tr>`).join("")}
    </tbody></table></div>`:""}

  <div class="tr">Cada Request guarda quién la pidió y desde cuándo espera; al resolverse, también quién decidió y cuándo. Es lo que hoy se decide por WhatsApp y nadie puede reconstruir después.</div>`;
};

function modalExc(){
  modal(`<div class="mh"><h3>New Request</h3><p>Algo que se sale de la regla y necesita que otra persona lo apruebe.</p></div>
  <div class="mb">
    <details class="note" style="margin-bottom:12px">
      <summary style="cursor:pointer;font-weight:700">? What will the system do after this request is created?</summary>
      <div style="margin-top:8px;font-size:12px;line-height:1.5">
        It will start <b>Unassigned</b>, so the team can assign one owner and avoid duplicate work. The related Work Order will remain on hold for payment and invoicing until the request is approved or rejected.<br><br>
        <b>Alert rules:</b> technician approvals become urgent after 20 minutes and show in red; tariff-definition requests warn after 24 hours and become overdue on Wednesday of the following week. The system shows them in this table and in the app alerts; it never approves, rejects, or reassigns work automatically.
      </div>
    </details>
    <div class="fld"><label>Tipo <span class="req">*</span></label><select id="xT">
      ${["Pago adicional al técnico","Ajuste de precio al cliente","Descuento especial","Cierre sin evidencia","Trabajo fuera de tarifa","Otro"].map(t=>`<option>${t}</option>`).join("")}</select></div>
    <div class="fld"><label>Work Order <span class="req">*</span></label><select id="xW"><option value="">— selecciona —</option>
      ${S.wos.map(w=>`<option value="${w.id}">WO-${w.id} · ${esc(P(w.prop).nombre)} ${esc(U(w.unidad).num)}</option>`).join("")}</select></div>
    <div class="fld"><label>Quién debe aprobarla <span class="req">*</span></label>
      <select id="xA">${Object.keys(ROLES).map(r=>`<option ${r==="Claudia"?"selected":""}>${r}</option>`).join("")}</select></div>
    <div class="fld"><label>Motivo <span class="req">*</span></label><textarea id="xMo" placeholder="Por qué se sale de lo normal"></textarea></div>
  </div>
  <div class="mf"><button class="btn" data-a="cm">Cancelar</button><button class="btn p" data-a="excGuardar">Levantar</button></div>`);
}

function modalCorregirUnidad(id){
  const x=by(S.excepciones,id), d=x&&x.datosUnidad, u=d&&U(d.unidad);
  if(!x||!d||!u) return;
  modal(`<div class="mh"><h3>Review unit data correction</h3><p>WO-${x.wo} · ${esc(P(W(x.wo).prop).nombre)} · ${esc(u.num)}</p></div>
    <div class="mb">
      <div class="note w" style="margin-bottom:12px"><b>Reported by ${esc(x.pide)}:</b> ${esc(x.motivo)}<br>Confirm the observed value before changing the master unit data.</div>
      <div class="fg c2"><div class="fld"><label>Current floors</label><input value="${esc(String(d.anterior))}" disabled></div>
        <div class="fld"><label>Approved floors <span class="req">*</span></label><input id="corrPisos" type="number" min="1" value="${esc(String(d.propuesto))}"></div></div>
      ${d.nota?`<div class="fld"><label>Technician note</label><div class="note" style="margin:0">${esc(d.nota)}</div></div>`:""}
    </div>
    <div class="mf"><button class="btn" data-a="cm">Cancel</button><button class="btn p" data-a="excUnidadAplicar" data-id="${x.id}">Apply correction</button></div>`);
}

/* Lo que le llega al cliente por correo (UC-05) */
function modalCorreo(eid){
  const e=by(S.estimados,eid), p=P(e.prop), cons=contactosEst(e);
  modal(`<div class="mh"><h3>${esc(e.label||"Estimate")} ${esc(e.num)}</h3><p>${billToDe(e.prop)} · ${money(totalEst(e))}</p></div>
  <div class="mb">
    ${e.estado==="Borrador"?`<div class="note w" style="margin-bottom:10px"><b>Save draft:</b> todavía no se envió. No hay Contacto ni correo hasta que se mande.</div>`:""}
    <div style="border:1px solid var(--line);border-radius:10px;overflow:hidden;margin-bottom:13px">
      <div style="background:var(--surface-2);padding:9px 13px;border-bottom:1px solid var(--line);font-size:11.5px;color:var(--soft)">
        <div><b>Para:</b> ${cons.map(c=>esc(c.mail)||"(sin correo registrado)").join(", ")}</div>
        <div><b>Asunto:</b> ${esc(e.label||"Estimate")} ${esc(e.num)} — ${esc(p.nombre)}</div></div>
      <div style="padding:15px 16px;text-align:center">
        <div style="width:34px;height:34px;border-radius:8px;background:var(--azul);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;margin:0 auto 10px">CPS</div>
        <p style="font-size:13px;margin-bottom:5px">Hola ${cons.map(c=>esc(c.nombre)).join(", ")},</p>
        <p style="font-size:12.5px;color:var(--soft);margin-bottom:12px;white-space:pre-line;text-align:left">${esc(e.correoTexto||"")}</p>
        <div style="font-size:10.5px;color:var(--faint)">📎 Adjunto: ${esc(e.num)} — Invoice.pdf</div>
      </div></div>
    <div class="note"><b>Esto es lo que le llegó al contacto.</b> No es un enlace para hacer clic — el cliente solo recibe el correo con el Invoice adjunto. La aprobación se registra a mano con los botones <b>Aprobar</b> / <b>Rechazar</b> de la lista, cuando avisen por llamada, mensaje o correo.</div>
    ${e.aprob?`<div class="note v" style="margin-top:10px"><b>Ya respondió:</b> ${esc(e.estado)} por ${esc(e.aprob.medio)} · ${esc(e.aprob.quien)} · ${esc(e.aprob.fecha)}${e.aprob.ip?" · IP "+e.aprob.ip:""}</div>`:""}
  </div>
  <div class="mf"><button class="btn" data-a="cm">Cerrar</button></div>`);
}

/* El PDF/Invoice del estimado — solo para ver, igual al formato real
   (EJEMPLO.pdf): From, Bill To, Amount, Date of Issue, Expiration Date,
   tabla Item/Rate/Tax/Total, Subtotal/Total y las Notes. Sin botones de
   aprobar — eso es lo que ve el cliente, esto es solo para consultar. */
function modalInvoice(eid){
  const e=by(S.estimados,eid), p=P(e.prop);
  modal(`<div class="mh"><h3>${esc(e.label||"Estimate")} ${esc(e.num)}</h3><p>${billToDe(e.prop)} · ${money(totalEst(e))}</p></div>
  <div class="mb">
    <div style="font-size:12px;color:var(--soft);margin-bottom:12px">
      <div><b>From:</b> Cordova Property Services LLC</div>
      <div><b>Bill To:</b> ${billToDe(e.prop)}</div></div>
    <div class="fg c3" style="margin-bottom:13px">
      <div><div style="font-size:10.5px;color:var(--faint);text-transform:uppercase;letter-spacing:.04em">Amount</div><div class="mono" style="font-weight:700">${money(totalEst(e))}</div></div>
      <div><div style="font-size:10.5px;color:var(--faint);text-transform:uppercase;letter-spacing:.04em">Date of Issue</div><div class="mono">${esc(e.fecha||"")}</div></div>
      <div><div style="font-size:10.5px;color:var(--faint);text-transform:uppercase;letter-spacing:.04em">Expiration Date</div><div class="mono">${esc(e.vence||"—")}</div></div></div>
    <table style="border:1px solid var(--line);border-radius:9px;overflow:hidden">
      <thead><tr><th>Item</th><th class="num">Rate (excl. tax)</th><th class="num">Tax</th><th class="num">Total</th></tr></thead>
      <tbody>${e.lineas.map(l=>`<tr>
        <td>${esc(l.serv)}<div style="font-size:10.5px;color:var(--faint)">${esc(U(l.unidad).num)}</div></td>
        <td class="num mono">${money(precioLinea(e,l))}</td>
        <td class="num mono">${tasaLinea(l)?tasaLinea(l)+"%":"—"}</td>
        <td class="num mono" style="font-weight:700">${money(totalLinea(e,l))}</td></tr>`).join("")}
      <tr><td colspan="3" style="text-align:right;color:var(--faint)">Subtotal</td>
        <td class="num mono">${money(subtotalEst(e))}</td></tr>
      <tr style="background:var(--surface-2)"><td colspan="3" style="font-weight:750">Total</td>
        <td class="num mono" style="font-weight:750;font-size:16px">${money(totalEst(e))}</td></tr></tbody></table>
    ${e.nota?`<div class="note" style="margin-top:13px;white-space:pre-line"><b>Notes:</b><br>${esc(e.nota)}</div>`:""}
    ${e.estado==="Borrador"?`<div class="note w" style="margin-top:13px"><b>DRAFT</b> — todavía no se le mandó al contacto.</div>`:""}
  </div>
  <div class="mf"><button class="btn" data-a="cm">Cerrar</button></div>`,true);
}

/* El formato real que usa Cordova para mandar un estimado: no es un enlace
   automatico y listo — Claudia (o Itzel) revisa y edita el texto antes de
   mandarlo, tomando como base su propio formato de correo (formatocorreo.txt).
   Aqui se arma editable, jalando los correos de los contactos elegidos y
   con el Invoice como adjunto simulado. */
function modalMedio(sol){
  const s = solTodas().find(x=>x.sol===sol), w = W(s.wo), p = P(w.prop);
  const pend = s.lineas.filter(l=>l.estado==="Pendiente");
  const tot = pend.reduce((t,l)=>t+(l.precio||0)*(l.cant||1),0);
  modal(`<div class="mh"><h3>¿Cómo aprobó el cliente?</h3>
    <p>WO-${w.id} · ${esc(p.nombre)} ${esc(U(w.unidad).num)} · ${esc(s.desc.length>70?s.desc.slice(0,70)+"…":s.desc)}</p></div>
  <div class="mb">
    ${p.notas?`<div class="note v" style="margin-bottom:10px"><b>Regla de ${esc(p.nombre)}:</b> ${esc(p.notas)}</div>`:""}

    ${pend.length>1?`<div class="fld" style="margin-bottom:12px">
      <label>¿Qué le autorizas?</label>
      <div class="hint">Destilda lo que el cliente no aprobó. Al técnico le llega el detalle: qué sí hace y qué no.
        Lo aprobado con precio le queda pendiente de pago al técnico solo; tildá «Cobrar al cliente» aparte, por cada concepto, si además hay que facturárselo — a veces se hace de cortesía.
        El precio es opcional: si Thalia ya aprobó pero el cliente no dijo cuánto, déjalo en blanco — queda una Request para que Erika o Claudia lo definan antes de que entre a nómina y factura.</div>
      <table style="margin-top:6px"><tbody>
      <tr><td></td><td></td><td class="num">Precio</td><td style="text-align:center">Cobrar<br>al cliente</td></tr>
      ${pend.map(l=>`<tr>
        <td style="width:34px"><input type="checkbox" class="adchk" data-lid="${l.id}" checked style="width:16px;height:16px"></td>
        <td><b>${esc(l.concepto)}</b>${(l.cant||1)>1?` <span style="color:var(--faint)">× ${l.cant}</span>`:""}
          ${l.ubic?`<div style="font-size:11.5px;color:var(--faint)">${esc(l.ubic)}</div>`:""}</td>
        <td class="num mono">${l.precio?money(l.precio*(l.cant||1)):`<input class="adprecio mono" data-lid="${l.id}" placeholder="Precio — opcional" style="width:92px">`}</td>
        <td style="text-align:center">${l.precio?`<input type="checkbox" class="adcobra" data-lid="${l.id}" style="width:16px;height:16px">`:"—"}</td></tr>`).join("")}
      <tr><td></td><td style="color:var(--faint)">Total pedido</td><td class="num mono" style="font-weight:750">${money(tot)}</td><td></td></tr>
      </tbody></table></div>`
    :`<div class="note" style="margin-bottom:12px"><b>${esc(pend[0].concepto)}</b>${(pend[0].cant||1)>1?` × ${pend[0].cant}`:""}
        ${pend[0].precio?` · ${money(pend[0].precio*(pend[0].cant||1))}`:` · <input class="adprecio mono" data-lid="${pend[0].id}" placeholder="Precio — opcional, si el cliente lo dio" style="width:200px">`}${pend[0].ubic?` · ${esc(pend[0].ubic)}`:""}
        ${pend[0].precio?`<label style="display:flex;align-items:center;gap:6px;margin-top:8px;font-weight:500">
          <input type="checkbox" class="adcobra" data-lid="${pend[0].id}" style="width:16px;height:16px"> Cobrar esto al cliente (además de pagárselo al técnico)</label>`:""}</div>`}

    ${p.aprob?`<div class="note" style="margin-bottom:12px"><b>Nota de ${esc(p.nombre)}:</b> ${esc(p.aprob)}</div>`:""}
    <div class="note w" style="margin-bottom:12px">Erika: «a veces las aprobaciones nos las dan por llamada, por mensaje, de diferentes maneras.
      Solo tener ese <b>sustento</b> de que sí se dio una aprobación». Lo que elijas define qué tan sólido queda si después lo discuten.</div>
    ${S._aprobFoto
      ?`<div class="note" style="margin-bottom:10px"><img src="${S._aprobFoto}" style="width:100%;max-height:130px;object-fit:cover;border-radius:9px;display:block;margin-bottom:6px">
          <button type="button" class="btn sm" data-a="aprobFoto" data-sol="${sol}">Cambiar comprobante</button></div>`
      :`<button type="button" class="btn" style="width:100%;justify-content:center;margin-bottom:10px" data-a="aprobFoto" data-sol="${sol}">📷 Adjuntar comprobante — opcional (captura del mensaje, correo, etc.)</button>`}
    <button class="btn" style="width:100%;justify-content:flex-start;margin-bottom:8px;padding:11px 13px;border-color:var(--verde)"
      data-a="medioOK" data-sol="${sol}" data-wo="${w.id}" data-medio="Enlace digital">
      <div style="flex:1;text-align:left">
        <div style="font-weight:750;color:var(--verde)">Enlace digital · clic real del cliente</div>
        <div style="font-size:11.5px;color:var(--faint)">Se guarda fecha, hora e IP del dispositivo. Es el sustento más fuerte.</div></div></button>
    ${activos("medios").filter(m=>m!=="Enlace digital").map(m=>`
    <button class="btn" style="width:100%;justify-content:flex-start;margin-bottom:8px;padding:11px 13px"
      data-a="medioOK" data-sol="${sol}" data-wo="${w.id}" data-medio="${m}">
      <div style="flex:1;text-align:left"><div style="font-weight:700">${m}</div>
        <div style="font-size:11.5px;color:var(--faint)">Queda quién y cuándo, pero es tu palabra.</div></div></button>`).join("")}
    <div class="tr">Al decidir, el técnico recibe el aviso al instante y la Work Order se destraba para que pueda seguir.
      <b>Mientras no elijas, WO-${w.id} sigue frenada y ${esc(tecN(w.tec))} no puede avanzar.</b></div>
  </div>
  <div class="mf"><button class="btn" data-a="medioNo" data-wo="${w.id}">Todavía no sé</button></div>`);
}

/* Reunión 2026-09-09: "definir tarifa" no siempre le toca a la misma
   persona — depende de si el manager preguntó el precio antes de aprobar.
   Si no preguntó, Thalia lo cierra ahí mismo (ella habla con los
   managers). Si preguntó, le toca a Claudia — ella es quien mueve un poco
   los números para que la unidad entre en el presupuesto. w.pidioPrecio
   guarda esa respuesta en la propia Work Order, así excAuto() sabe a
   quién asignarle la excepción incluso antes de abrir este modal. */
function modalTarifaExc(woId, xid){
  const w=W(woId), u=U(w.unidad);
  const pidioPrecio = !!w.pidioPrecio;
  const puedeDefinir = !pidioPrecio || S.usuario==="Claudia";
  modal(`<div class="mh"><h3>Definir tarifa faltante</h3><p>${esc(w.serv)} · ${esc(u.rooms)} · ${u.pisos} piso(s) · ${esc(P(w.prop).nombre)}</p></div>
  <div class="mb">
    <div class="note w"><b>Erika:</b> «que salga NA, que no se sabe, porque son cosas súper atípicas». Aquí se decide una vez y deja de ser atípica.</div>

    <div class="fld" style="margin-top:12px"><label>¿El manager pidió saber el precio antes de aprobar?</label>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button type="button" class="gchip ${!pidioPrecio?"on":""}" data-a="tarifaPidio" data-wo="${woId}" data-x="${xid}" data-v="0">No — ya aprobó</button>
        <button type="button" class="gchip ${pidioPrecio?"on":""}" data-a="tarifaPidio" data-wo="${woId}" data-x="${xid}" data-v="1">Sí, preguntó cuánto costaba</button>
      </div>
      <div class="hint">Si no preguntó, Thalia lo cierra aquí mismo. Si preguntó, le toca a Claudia — es ella quien ajusta el precio según el presupuesto de la unidad.</div></div>

    ${puedeDefinir ? `
    <div class="fg c2" style="margin-top:12px">
      <div class="fld"><label>Se le cobra al cliente <span class="req">*</span></label><input id="tP" class="mono" placeholder="0.00"></div>
      <div class="fld"><label>Se le paga al técnico <span class="req">*</span></label><input id="tG" class="mono" placeholder="0.00"></div></div>
    <div class="fg c2">
      <div class="fld"><label>¿Para quién aplica?</label><select id="tN">
        <option value="gen">Tarifa general — todas las propiedades</option>
        <option value="prop">Solo para ${esc(P(w.prop).nombre)}</option></select>
        <div class="hint">La de la propiedad manda sobre la general.</div></div>
      <div class="fld"><label>¿Y los pisos?</label><select id="tPi">
        <option value="">Cualquier piso — una sola fila</option>
        <option value="${u.pisos}">Solo ${u.pisos} piso(s)</option></select>
        <div class="hint">Deja «cualquiera» salvo que el precio cambie por pisos.</div></div></div>`
    : `<div class="note r" style="margin-top:12px"><b>Esto le toca definir a Claudia.</b> El manager preguntó el precio antes de aprobar, y es ella quien lo ajusta caso por caso — a veces mueve los números para que la unidad entre en el presupuesto. Avísale para que lo cierre desde su sesión.</div>`}
  </div>
  <div class="mf"><button class="btn" data-a="cm">Cancelar</button>
    ${puedeDefinir
      ? `<button class="btn p" data-a="tarifaGuardar" data-wo="${woId}" data-x="${xid}">Guardar tarifa</button>`
      : `<button class="btn p" data-a="tarifaAvisarClaudia" data-wo="${woId}" data-x="${xid}">Avisarle a Claudia</button>`}
  </div>`);
}

/* Aprobar el adicional y ponerle precio son decisiones distintas (Claudia):
   Thalia puede aprobar hablando con la propiedad sin dar precio. Este es el
   segundo paso — Erika lo sabe, o si no, lo escala a Claudia (reasignando
   esta misma Request), que es quien estima el precio caso por caso. */
function modalDefinirPrecio(id){
  const lid = +String(id).slice(6);
  const l = by(S.adicionales,lid), w = l&&W(l.wo), s = l&&solTodas().find(x=>x.sol===l.sol);
  if(!l||!w||!s) return;
  const p = P(w.prop), u = U(w.unidad);
  modal(`<div class="mh"><h3>Definir precio del adicional</h3>
    <p>WO-${w.id} · ${esc(p.nombre)} ${esc(u.num)} · ${esc(l.concepto)}${(l.cant||1)>1?` × ${l.cant}`:""}</p></div>
  <div class="mb">
    ${l.ubic?`<div class="note" style="margin-bottom:10px"><b>Ubicación:</b> ${esc(l.ubic)}</div>`:""}
    ${l.aprob?`<div class="note v" style="margin-bottom:10px"><b>Ya aprobado por ${esc((l.aprob.medio||"—").toLowerCase())}:</b> ${esc(l.aprob.quien)} · ${esc(l.aprob.hora)}. Solo falta el precio.</div>`:""}
    ${l.hallazgoFoto?`<div class="note" style="margin-bottom:10px"><img src="${l.hallazgoFoto.url}" style="width:100%;max-height:130px;object-fit:cover;border-radius:9px;display:block"></div>`:""}
    <div class="fld"><label>Precio al cliente <span class="req">*</span></label><input id="dpP" class="mono" placeholder="0.00"></div>
    <label style="display:flex;align-items:center;gap:6px;margin-top:8px;font-weight:500">
      <input type="checkbox" id="dpCobra" style="width:16px;height:16px"> Cobrar esto al cliente (además de pagárselo al técnico)</label>
    <div class="hint" style="margin-top:8px">Este es el mismo precio que se le paga al técnico — igual que cuando se aprueba con precio desde el inicio.</div>
  </div>
  <div class="mf"><button class="btn" data-a="cm">Cancelar</button><button class="btn p" data-a="precioDefGuardar" data-id="${id}">Guardar precio</button></div>`);
}

/* ── SUB-WORK ORDERS ──────────────────────────────────────────────────
   Sección 5 del feedback: trabajo que cuelga de una WO principal sin
   perder la relación con ella (Main WO Full Paint → Sub-WO Door paint,
   Sub-WO Garage paint...). Oficina la crea acá ya aprobada — la que
   aprobar es la que descubre el técnico en sitio (fAdic / fAdicOK). */
const woPagable = w => aprobPagoOK(w) && !w.pagadaTec && !woBloqueada(w.id) && !subWOsPendientesDeWO(w.id).length && !clienteRevisionPendienteDeWO(w.id);
/* Arrastre: lo pagable de semanas anteriores que sigue sin pagarse entra a la nómina de la semana que se mira. */
const woPendAnteriores = (tec,sem) => S.wos.filter(w=>w.estado==="Completed" && w.fecha && w.tec && (!tec||w.tec===tec) && semanaDe(w.fecha)<sem && woPagable(w));
const nomTecs = n => n.tec ? [n.tec] : [...new Set((n.wos||[]).map(id=>W(id)&&W(id).tec).filter(Boolean))];
const nomId = n => n.id || (n.id="NM"+(S.nomina.indexOf(n)+1));
const filtroNom = () => S.filtroNom||(S.filtroNom={ptec:"",tec:"",desde:"",hasta:"",q:""});
/* Lo que se le pagó por una WO dentro de un registro de nómina (los registros viejos no guardaban el desglose). */
const nomPagoWO = (n,w) => { const e=(w.pagosTec||[]).filter(p=>p.nomina===nomId(n)); return e.length ? e.reduce((a,p)=>a+p.monto,0) : (n.tipo==="Parcial" ? 0 : egresoWO(w)||0); };
VIEWS.nomina = () => {
  const ws = S.wos.filter(w=>enPeriodo(w.fecha,S.periodo) && w.estado==="Completed");
  const semP = S.periodo.tipo==="semana";
  const prevAll = semP ? woPendAnteriores(null,S.periodo.sem) : [];
  const extrasPrev = extrasAprobadosDeWOs(prevAll);
  const bloqSemana = ws.filter(w=>!w.pagadaTec && woBloqueada(w.id)).length;
  const pagables = ws.filter(woPagable).length + prevAll.length;
  const extrasPeriodo=extrasAprobadosDeWOs(ws);
  const porTec = {};
  ws.forEach(w=>{ if(!w.tec) return; (porTec[w.tec]=porTec[w.tec]||[]).push(w); });
  extrasPeriodo.forEach(x=>{ const tid=tecExtra(x); if(tid && !porTec[tid]) porTec[tid]=[]; });
  prevAll.forEach(w=>{ if(!porTec[w.tec]) porTec[w.tec]=[]; });
  const fN = filtroNom();
  const filaNom = (w,ant) => { const e=egresoWO(w), pg=pagadoTecWO(w), parc=!w.pagadaTec && pg>0;
    return `<tr><td class="mono" style="font-weight:700">WO-${w.id}${ant?`<div style="font-size:10.5px;color:var(--ambar);font-weight:400">${esc(w.fecha)}</div>`:""}</td>
      <td>${esc(P(w.prop).nombre)} · ${esc(U(w.unidad).num)}</td><td>${esc(w.serv)}</td><td>${esc(U(w.unidad).rooms)}</td>
      <td class="num mono">${U(w.unidad).pisos||"—"}</td>
      <td style="white-space:nowrap">${w.pagadaTec?'<span class="pill v">✓ sí</span>':woBloqueada(w.id)?'<span class="pill r">approval pending</span>':parc?`<span class="pill a">Parcial ${money(pg)}</span>`:'<span class="pill g">no</span>'}
        ${woPagable(w)&&saldoTecWO(w)>0.009?`<button class="btn sm" data-a="parcialModal" data-id="${w.id}">Parcial</button>`:""}</td>
      <td style="white-space:nowrap">${pillsAprob(w)}</td>
      <td class="num mono">${ingresoWO(w)!==null?money(ingresoWO(w)):'<span class="pill w">NA</span>'}</td>
      <td class="num mono">${e!==null?(parc?`${money(saldoTecWO(w))}<div style="font-size:10px;color:var(--faint)">de ${money(e)}</div>`:money(e)):"—"}</td>
      <td class="num mono">${materialWO(w)?money(materialWO(w)):"—"}</td>
      ${puedeVerUtilidad()?`<td class="num mono" style="color:${utilidadWO(w)>=0?"var(--verde)":"var(--rojo)"}">${utilidadWO(w)!==null?money(utilidadWO(w)):"—"}</td>`:""}</tr>`; };
  // Ya no hay "la nómina de la semana" única: se está pagada cuando no queda
  // nada pagable en el período que se está mirando.
  const yaPag = ws.length>0 && pagables===0 && bloqSemana===0;
  return `
  <div class="ph"><div><h2>Nómina — ${periodoTexto(S.periodo)}</h2>
    <p>La pestaña <code>Payroll</code>. Se arma sola con las Work Orders <b>validadas</b> — hoy se rearma a mano.</p></div></div>
  ${renderSelectorPeriodo()}
  ${S.periodo.tipo==="semana"?resumenDosSemanas(S.periodo.sem):""}

  ${S.nomina.length?(()=>{ /* Historial por técnico: Erika busca pagos de meses pasados por técnico, fechas o palabra clave. */
    const q=normBusca(fN.q).split(/\s+/).filter(Boolean);
    const hist=S.nomina.slice().reverse().filter(n=>{
      if(fN.tec && !nomTecs(n).includes(fN.tec)) return false;
      if(fN.desde && (n.fecha||"")<fN.desde) return false;
      if(fN.hasta && (n.fecha||"")>fN.hasta) return false;
      if(!q.length) return true;
      const txt=normBusca([n.cheque,nomTecs(n).map(tecN).join(" "),...(n.wos||[]).flatMap(id=>{ const w=W(id); return ["WO-"+id,id,w?P(w.prop).nombre:"",w&&U(w.unidad)?U(w.unidad).num:""]; })].join(" "));
      return q.every(x=>txt.includes(x)); });
    const totH=hist.reduce((a,n)=>a+(n.total||0),0), abiertos=S.nomAbiertos||[];
    const lbl="font-size:11px;color:var(--faint);font-weight:700;text-transform:uppercase";
    return `<div class="card" style="margin-bottom:14px"><div class="chd"><h3>Historial de nóminas</h3><span class="s">${hist.length} de ${S.nomina.length} · pagado <b class="mono">${money(totH)}</b></span></div>
    <div class="cp" style="display:flex;gap:7px;align-items:center;flex-wrap:wrap;border-bottom:1px solid var(--line)">
      <span style="${lbl}">Técnico</span>
      <select id="nhTec" data-a="nomFiltro"><option value="">Todos</option>${[...new Set(S.nomina.flatMap(nomTecs))].map(t=>`<option value="${t}" ${fN.tec===t?"selected":""}>${esc(tecN(t))}</option>`).join("")}</select>
      <span style="${lbl};margin-left:5px">Pago</span>
      <input id="nhDesde" data-a="nomFiltro" type="date" value="${esc(fN.desde)}"><span style="color:var(--faint)">al</span><input id="nhHasta" data-a="nomFiltro" type="date" value="${esc(fN.hasta)}">
      <input id="nhQ" value="${esc(fN.q)}" placeholder="WO, propiedad, cheque…" autocomplete="off" style="font-family:inherit;font-size:12.5px;padding:7px 10px;border:1px solid var(--line);border-radius:7px;background:var(--surface);color:var(--ink);width:190px">
      <button class="btn" data-a="nomFiltro">Buscar</button>
      ${fN.tec||fN.desde||fN.hasta||fN.q?`<button class="btn sm" data-a="nomLimpiar">Limpiar</button>`:""}</div>
    <table><thead><tr><th>Período</th><th>Técnico</th><th>Fecha de pago</th><th>Registró</th><th class="num">WO</th><th>Cheque</th><th>Comprobante</th><th class="num">Total</th><th></th></tr></thead><tbody>
      ${hist.map(n=>{ const id=nomId(n), ab=abiertos.includes(id);
        return `<tr><td>${esc(periodoTexto(n.periodo||{tipo:"semana",sem:n.semana}))}</td>
        <td>${esc(nomTecs(n).map(tecN).join(", ")||"Todos")}${n.tipo==="Parcial"?' <span class="pill a">Parcial</span>':""}</td>
        <td class="mono">${esc(n.fecha||"—")} ${esc(n.hora||"")}</td><td>${esc(n.quien||"—")}</td>
        <td class="num mono">${(n.wos||[]).length}</td><td class="mono">${esc(n.cheque||"—")}</td>
        <td>${n.foto?miniRecibo(n.foto):`<button class="btn sm" data-a="nomAdjuntar" data-id="${id}">Adjuntar</button>`}</td>
        <td class="num mono" style="font-weight:700">${money(n.total||0)}</td>
        <td style="text-align:right"><button class="btn sm" data-a="nomVer" data-id="${id}">${ab?"Ocultar":"Ver"}</button></td></tr>
        ${ab?`<tr><td colspan="9" style="background:var(--surface-2)">${(n.wos||[]).map(wid=>{ const w=W(wid); return w?`<div style="display:flex;gap:10px;padding:3px 0"><span class="mono" style="font-weight:700">WO-${w.id}</span><span>${esc(P(w.prop).nombre)} · ${U(w.unidad)?esc(U(w.unidad).num):""}</span><span style="margin-left:auto" class="mono">${money(nomPagoWO(n,w))}</span></div>`:""; }).join("")||'<span style="color:var(--faint)">Sin WO</span>'}
          ${n.desc>0.004?`<div style="display:flex;padding:3px 0;color:var(--rojo)"><span>Descuentos</span><span style="margin-left:auto" class="mono">−${money(n.desc)}</span></div>`:""}
          ${n.nota?`<div style="font-size:11px;color:var(--faint)">${esc(n.nota)}</div>`:""}</td></tr>`:""}`; }).join("")||`<tr><td colspan="9" class="empty">Sin resultados</td></tr>`}
    </tbody></table></div>`;})():""}

  ${(()=>{ /* Lo que se le pidió al técnico y todavía no contesta. Sin esta lista
              la solicitud se perdía: no había dónde ver quién debía qué. */
    const ped = S.wos.filter(w=>w.infoPedida);
    if(!ped.length) return "";
    return `<div class="card" style="border-color:var(--rojo)">
      <div class="chd" style="background:var(--rojo-cl)"><h3 style="color:var(--rojo)">Esperando al técnico</h3>
        <span class="s">${ped.length} trabajo(s) con información pedida y sin responder</span></div>
      <table><thead><tr><th>WO</th><th>Propiedad · Unidad</th><th>Técnico</th><th>Qué le falta</th>
        <th>Pedido</th><th class="num">Días</th></tr></thead>
      <tbody>${ped.map(w=>{
        const dias = Math.max(0, Math.round((new Date(HOY_SUP)-new Date(w.infoPedida.fecha))/86400000));
        return `<tr class="${fl("wo:"+w.id)}"><td class="mono" style="font-weight:700">WO-${w.id}</td>
          <td>${esc(P(w.prop).nombre)} · ${U(w.unidad)?esc(U(w.unidad).num):""}</td>
          <td>${esc(tecN(w.tec))}</td>
          <td>${w.infoPedida.falta.map(x=>`<span class="pill r">${esc(x)}</span>`).join(" ")}</td>
          <td>${w.infoPedida.fecha}<div style="font-size:10.5px;color:var(--faint)">${esc(w.infoPedida.quien)} ${esc(w.infoPedida.hora)}</div></td>
          <td class="num"><b style="color:${dias>2?"var(--rojo)":"var(--tinta)"}">${dias}</b></td></tr>`;}).join("")}
      </tbody></table>
      <div class="cp" style="border-top:1px solid var(--line)"><div class="tr" style="margin:0">
        Su flujograma dice «Solicitar información al Técnico» y vuelve a «Información validada».
        Acá le aparece en el celular con solo lo que falta, y al completarlo te avisa.</div></div>
    </div>`;})()}

  ${(()=>{ // El reporte del técnico le llega a Erika directo: no espera a la supervisión de Gustavo
    const porVal=S.wos.filter(w=>w.estado==="Completed"&&!w.validada);
    return porVal.length?`<div class="card" style="border-color:var(--ambar)">
      <div class="chd" style="background:var(--ambar-cl)"><h3 style="color:var(--ambar)">Solo estas necesitan tu revisión</h3>
        <span class="s">${porVal.length} de ${S.wos.filter(w=>w.estado==="Completed").length} terminadas · las completas se validaron solas</span></div>
      <table><thead><tr><th>WO</th><th>Propiedad · Unidad</th><th>Técnico</th><th>Evidencia</th><th>Tiempo en sitio</th><th>Aprobado</th><th></th></tr></thead>
      <tbody>${porVal.map(w=>`<tr><td class="mono" style="font-weight:700">WO-${w.id}</td>
        <td>${esc(P(w.prop).nombre)} · ${esc(U(w.unidad).num)}</td><td>${esc(tecN(w.tec))}</td>
        <td>${w.evid?`<span class="pill v">${w.evid}</span>`:'<span class="pill r">falta</span>'}</td>
        <td class="mono" style="color:var(--faint)">${w.horas?w.horas+" h":"—"}</td>
        <td>${pillsAprob(w)}</td>
        <td style="text-align:right"><button class="btn sm p" data-a="validarModal" data-id="${w.id}">Revisar y validar</button></td></tr>`).join("")}
      </tbody></table></div>`:"";})()}

  ${bloqSemana?`<div class="note r" style="margin-bottom:14px"><b>${bloqSemana} Work Order(s) with a pending Request.</b>
    No se pagan hasta que se resuelva — un pago adicional o una tarifa sin definir cambian lo que se le debe al técnico. El resto del período se paga igual.
    <button class="btn sm" data-a="ir" data-m="excepciones" style="margin-left:8px">View Requests</button></div>`
   :`<div class="note v" style="margin-bottom:14px"><b>Período listo para pagar.</b> Sin Work Orders frenadas por una Request.</div>`}

  ${Object.keys(porTec).length>1?`<div class="act" style="align-items:center;gap:7px;margin-bottom:10px"><span style="font-size:11px;color:var(--faint);font-weight:700;text-transform:uppercase">Técnico</span>
    <select id="nhPTec" data-a="nomFiltro"><option value="">Todos</option>${Object.keys(porTec).map(t=>`<option value="${t}" ${fN.ptec===t?"selected":""}>${esc(tecN(t))}</option>`).join("")}</select></div>`:""}
  ${Object.keys(porTec).length?Object.entries(porTec).filter(([tid])=>!fN.ptec||tid===fN.ptec).map(([tid,arr])=>{
    const prev=prevAll.filter(w=>w.tec===tid), todo=arr.concat(prev);
    const ing=todo.reduce((a,w)=>a+(ingresoWO(w)||0),0);
    const egrBase=todo.reduce((a,w)=>a+montoNomWO(w),0);
    const mat=todo.reduce((a,w)=>a+materialWO(w),0);
    // Punto 10: "se le paga" tiene que incluir los adicionales de Sub-Work
    // Order ya aprobados (S.excepciones) — si no, este número no coincide
    // con el comprobante real que se le da al técnico.
    const extras=extrasPeriodo.concat(extrasPrev).filter(x=>tecExtra(x)===tid);
    const totExtra=extras.reduce((a,x)=>a+(x.monto||0),0);
    const egr=egrBase+totExtra;
    const egrFull=todo.reduce((a,w)=>a+(egresoWO(w)||0),0)+totExtra;
    const dm=semP?S.descuentos.filter(x=>x.tipo==="Manual"&&x.tec===tid&&x.semana===S.periodo.sem):[];
    const pagTec=todo.filter(woPagable).length, pendTec=arr.filter(w=>!w.pagadaTec && !woPagable(w)).length;
    return `<div class="card"><div class="chd"><h3>${esc(tecN(tid))}</h3>
      <span class="s">${arr.length} WO${extras.length?` + ${extras.length} Sub-WO`:""}${prev.length?` + ${prev.length} anterior(es)`:""}${pendTec?` · <b style="color:var(--ambar)">${pendTec} pendiente(s) — se pagan después</b>`:""}</span>
      <span class="r"><span style="font-size:11px;color:var(--faint)">se le paga</span>
        <span class="mono" style="font-size:16px;font-weight:750">${money(egr)}</span>
        ${semP?`<button class="btn sm" data-a="descManualModal" data-tec="${tid}">Descuento</button>`:""}
        <button class="btn sm" data-a="comprobante" data-tec="${tid}">Ver comprobante</button>
        ${pagTec?`<button class="btn sm v" data-a="pagarTec" data-tec="${tid}">Marcar pagado (${pagTec})</button>`
          :todo.length&&!pendTec?`<span class="pill v">✓ Pagado</span>`:""}</span></div>
      <table><thead><tr><th>WO</th><th>Propiedad · Unidad</th><th>Servicio</th><th>Rooms</th><th>Floors</th><th>Pagado</th><th>Aprobado</th><th class="num">Ingreso</th><th class="num">Egreso</th><th class="num">Material</th>${puedeVerUtilidad()?`<th class="num">Utilidad</th>`:""}</tr></thead>
      <tbody>${arr.map(w=>filaNom(w,false)).join("")}
      ${prev.length?`<tr style="background:var(--ambar-cl)"><td colspan="${puedeVerUtilidad()?11:10}" style="font-weight:700;color:var(--ambar)">Pendientes anteriores · sin pagar de semanas pasadas</td></tr>${prev.map(w=>filaNom(w,true)).join("")}`:""}
      ${extras.map(x=>`<tr style="background:var(--ambar-cl)"><td colspan="8">Pago adicional aprobado · WO-${x.wo}
          <div style="font-size:10.5px;color:var(--ambar)">${esc((x.motivo||"").slice(0,70))}</div></td>
        <td class="num mono">${money(x.monto)}</td><td></td>${puedeVerUtilidad()?`<td></td>`:""}</tr>`).join("")}
      ${dm.map(x=>`<tr style="background:var(--rojo-cl)"><td colspan="8">Descuento · ${esc(x.concepto)}${x.wo?` · WO-${esc(x.wo)}`:""}
          ${x.desc?`<div style="font-size:10.5px;color:var(--rojo)">${esc(x.desc)}</div>`:""}</td>
        <td class="num mono" style="color:var(--rojo)">−${money(x.monto)}</td>
        <td>${x.nomina?"":`<button class="btn sm" data-a="descQuitar" data-id="${x.id}">×</button>`}</td>${puedeVerUtilidad()?`<td></td>`:""}</tr>`).join("")}
      <tr style="background:var(--surface-2);font-weight:700"><td colspan="7">Totales</td>
        <td class="num mono">${money(ing)}</td><td class="num mono">${money(egr)}</td>
        <td class="num mono">${money(mat)}</td>${puedeVerUtilidad()?`<td class="num mono" style="color:var(--verde)">${money(ing-egrFull-mat)}</td>`:""}</tr>
      </tbody></table></div>`;
  }).join(""):`<div class="card"><div class="empty">Sin trabajos terminados en este período</div></div>`}

  ${(()=>{ /* Descuentos por devolucion: plata que sale del pago de alguien,
              asi que nunca va sola — siempre con su devolucion y sus fotos.
              Los descuentos se llevan por semana (no por fecha exacta), así
              que esta tarjeta solo tiene sentido mirando el período «Semana». */
    if(S.periodo.tipo!=="semana") return "";
    const ds = S.descuentos.filter(x=>x.semana===S.periodo.sem && x.tipo!=="Manual");
    if(!ds.length) return "";
    return `<div class="card" style="border-color:var(--rojo)">
      <div class="chd" style="background:var(--rojo-cl)"><h3 style="color:var(--rojo)">Descuentos por devolución</h3>
        <span class="s">${ds.length} línea(s)${ds.some(x=>x.estado==="Por decidir")?` · <b>${ds.filter(x=>x.estado==="Por decidir").length} por decidir</b>`:""} · los pendientes no se descuentan hasta que se decida</span></div>
      <table><thead><tr><th>Técnico</th><th>Motivo</th><th>Devolución</th><th>Touch-up</th>
        <th>Evidencia</th><th class="num">Monto</th><th>Decisión</th></tr></thead>
      <tbody>${ds.map(x=>{ const dv=DV(x.dev);
        return `<tr class="${fl("desc:"+x.id)}"><td style="font-weight:650">${esc(tecN(x.tec))}</td>
          <td>${esc(x.motivo)}</td>
          <td>${dv?`${esc(P(dv.prop).nombre)} ${U(dv.unidad)?esc(U(dv.unidad).num):""}
                <div style="font-size:10.5px;color:var(--faint)">${esc(dv.desc.slice(0,60))}</div>`:"—"}</td>
          <td class="mono">WO-${x.wo}</td>
          <td>${dv?`<span class="pill m">${(dv.lotesAntes||[]).reduce((t,l)=>t+l.n,0)} foto(s) del antes</span>`:"—"}</td>
          <td class="num mono" style="color:${x.estado==="Aplicado"?"var(--rojo)":"var(--faint)"}${x.estado==="No aplicado"?";text-decoration:line-through":""}">−${money(x.monto)}
            ${x.tope?`<div style="font-size:10px;color:var(--faint);font-weight:400">
              la corrección costó ${money(x.montoReal)}<br>se limitó a lo que ganó</div>`:""}</td>
          <td>${x.estado==="Por decidir"
              ?`<span class="pill w">Por decidir</span>
                <div style="display:flex;gap:6px;margin-top:6px">
                  <button class="btn sm v" data-a="descAplicar" data-id="${x.id}">Aplicar descuento</button>
                  <button class="btn sm" data-a="descNoAplicar" data-id="${x.id}">No aplicar</button></div>`
              :`<span class="pill ${x.estado==="Aplicado"?"v":"g"}">${esc(x.estado)}</span>
                ${x.decidio?`<div style="font-size:10.5px;color:var(--faint);margin-top:3px">${esc(x.decidio)} · ${esc(x.fechaDecision||"")} ${esc(x.horaDecision||"")}</div>`:""}
                ${x.motivoDecision?`<div style="font-size:10.5px;color:var(--faint)">${esc(x.motivoDecision)}</div>`:""}`}</td></tr>`;}).join("")}
      </tbody></table>
      <div class="cp" style="border-top:1px solid var(--line)"><div class="tr" style="margin:0">
        Claudia: <i>«cada unidad tiene a su técnico responsable y él tiene que corregir su trabajo»</i>.
        Si no fue él a corregir, se le paga al que fue y se le descuenta a él el mismo monto.
        El descuento nunca aparece sin la devolución que lo origina.
        Solo los «Aplicado» restan del pago; «Por decidir» y «No aplicado» no.</div></div>
    </div>`;})()}

  ${Object.keys(porTec).length?`<div class="card"><div class="cp" style="display:flex;align-items:center;gap:12px">
    <div><div style="font-size:11px;color:var(--faint);text-transform:uppercase;letter-spacing:.05em">Total a pagar — ${periodoTexto(S.periodo)}</div>
      ${(()=>{ /* El neto se calcula POR TECNICO y nunca baja de cero: a nadie
             se le puede cobrar de vuelta, y el total no puede salir negativo.
             Los descuentos por devolución se llevan por semana — fuera del
             período «Semana» se muestra el bruto, sin netear. */
        const bruto=ws.reduce((a,w)=>a+montoNomWO(w),0)+extrasPeriodo.reduce((a,x)=>a+(x.monto||0),0)
          +prevAll.reduce((a,w)=>a+montoNomWO(w),0)+extrasPrev.reduce((a,x)=>a+(x.monto||0),0);
        if(S.periodo.tipo!=="semana") return `<div class="mono" style="font-size:24px;font-weight:750">${money(bruto)}</div>`;
        const todos=ws.concat(prevAll), extT=extrasPeriodo.concat(extrasPrev);
        const tecs=[...new Set(todos.map(w=>w.tec).filter(Boolean).concat(extT.map(tecExtra).filter(Boolean)))];
        let neto=0, aplicado=0;
        tecs.forEach(t=>{
          const b=todos.filter(w=>w.tec===t).reduce((a,w)=>a+montoNomWO(w),0)
            + extT.filter(x=>tecExtra(x)===t).reduce((a,x)=>a+(x.monto||0),0);
          const dd=totalDesc(t,S.periodo.sem);
          neto += Math.max(0, b-dd);
          aplicado += Math.min(b, dd);
        });
        const total=S.descuentos.filter(x=>x.semana===S.periodo.sem && x.estado==="Aplicado").reduce((a,x)=>a+x.monto,0);
        const sinAplicar = total - aplicado;
        return total
          ? `<div class="mono" style="font-size:24px;font-weight:750">${money(neto)}</div>
             <div style="font-size:11px;color:var(--faint)">${money(bruto)} menos ${money(aplicado)} de descuentos</div>
             ${sinAplicar>0.009?`<div style="font-size:11px;color:var(--rojo);margin-top:2px">
               ${money(sinAplicar)} no se pudo descontar: supera lo que ganó esta semana — queda como Request</div>`:""}`
          : `<div class="mono" style="font-size:24px;font-weight:750">${money(bruto)}</div>`;})()}</div>
    <button class="btn ${!pagables||yaPag?"":"v"}" data-a="pagarSemana" style="margin-left:auto" ${!pagables||yaPag?"disabled":""}>
      ${yaPag?"Semana ya pagada":pagables?"Marcar pagados a todos":"Nada pagable — todo frenado por Requests"}</button>
  </div></div>`:""}
  <div class="tr">Erika: «todo lo que está en la semana 29 tiene que pagarse este viernes». El sistema agrupa por la misma semana con la que ya filtran.</div>`;
};

/* ── FACTURACIÓN ── */
/* Erika no conoce la agrupación al agendar. Estas líneas viven hasta que ella
   arma el borrador por propiedad; una WO o Sub-WO no se pierde por quedar
   fuera de la factura de esta semana. */
function lineasFacturablesFactura(prop, excluirFactura){
  const reservadas=new Set(S.facturas.filter(f=>f.estado==="Borrador"&&f.id!==excluirFactura)
    .flatMap(f=>(f.conceptos||[]).map(c=>c.clave)).filter(Boolean));
  const lineas=[];
  S.wos.filter(w=>w.prop===prop&&w.estado==="Completed"&&aprobFacturaOK(w)&&!w.facturada
      &&!subWOsPendientesDeWO(w.id).length&&!clienteRevisionPendienteDeWO(w.id)
      &&puedeFacturar(w)&&!woBloqueada(w.id)&&!w.facRetenida&&ingresoBaseWO(w)!==null)
    .forEach(w=>{
      lineas.push({clave:"wo:"+w.id,tipo:"WO",wo:w.id,subwo:null,unidad:U(w.unidad).num,
        nombre:w.serv,descripcion:"",precio:ingresoBaseWO(w)/(w.cant||1),cantidad:w.cant||1,
        importe:ingresoBaseWO(w)||0,evidencia:w.evid||0,fecha:w.fecha,seleccionada:enPeriodo(w.fecha,S.periodo)});
      // Ajustes de validación al cliente: línea propia, el concepto sale tal cual se escribió
      ajustesValDe(w,"cobro").forEach(a=>lineas.push({clave:"aj:"+a.id,tipo:"Ajuste",wo:w.id,subwo:null,unidad:U(w.unidad).num,
        nombre:a.concepto,descripcion:"",precio:ajusteMonto(a),cantidad:1,importe:ajusteMonto(a),evidencia:0,
        fecha:w.fecha,seleccionada:enPeriodo(w.fecha,S.periodo)}));
    });
  S.adicionales.filter(a=>a.estado==="Aprobado"&&a.facturable&&!a.facturada&&W(a.wo)
      &&W(a.wo).prop===prop&&aprobFacturaOK(W(a.wo))&&a.estadoTrabajo!=="Canceled")
    .forEach(a=>{
      const cant=cantSubWO(a), total=a.montoFactura!=null?a.montoFactura*(cant/(a.cant||1)):(a.precio||0)*cant;
      lineas.push({clave:"sub:"+a.id,tipo:"Sub-WO",wo:a.wo,subwo:a.id,unidad:U(W(a.wo).unidad).num,
        nombre:a.concepto,descripcion:a.ubic||"",precio:cant?total/cant:total,cantidad:cant,
        importe:total,evidencia:(a.fotosEvidArr||[]).length,fecha:fechaSubWO(a),seleccionada:enPeriodo(fechaSubWO(a),S.periodo)});
    });
  return lineas.filter(l=>!reservadas.has(l.clave));
}
/* Descuento de una línea: monto fijo ($) o % del bruto. Nunca pasa del bruto,
   así el importe no baja de 0; una línea negativa (ajuste al cliente) no lleva descuento. */
function descuentoLinea(l){
  const bruto=(+l.precio||0)*(+l.cantidad||0); if(bruto<=0) return 0;
  const d=Math.max(0,+l.desc||0);
  return Math.min(bruto, l.descTipo==="%"?bruto*Math.min(d,100)/100:d);
}
const importeLinea = l => Math.round(((+l.precio||0)*(+l.cantidad||0)-descuentoLinea(l))*100)/100;
const textoDescLinea = l => { const d=+l.desc||0; return d>0&&descuentoLinea(l)>0 ? (l.descTipo==="%"?`−${d}%`:`−${money(d)}`) : "—"; };
/* Una sola fuente para los totales por factura del borrador: la vista y el guardado leen lo mismo.
   Cada grupo (Factura 1..6) es una factura; el crédito de la propiedad cae en un solo grupo y
   se limita al subtotal de ese grupo. */
function resumenBorrador(b){
  const sel=(b.lineas||[]).filter(l=>l.seleccionada);
  const grupos=[...new Set(sel.map(l=>+l.grupo||1))].sort((x,y)=>x-y).map(g=>{
    const ls=sel.filter(l=>(+l.grupo||1)===g);
    return {g,lineas:ls,subtotal:ls.reduce((n,l)=>n+importeLinea(l),0),cred:0,total:0};});
  const usoPrev=b.id?(S.creditosProp||[]).filter(c=>c.factura===b.id&&c.tipo==="Uso").reduce((n,c)=>n+c.monto,0):0;
  const disp=Math.max(0,saldoCredito(b.prop)+usoPrev);   // lo que este mismo borrador ya usó cuenta como disponible
  const gc=grupos.find(x=>x.g===(+b.creditoGrupo||1))||grupos[0];
  const maxCred=gc?Math.max(0,Math.min(disp,gc.subtotal)):0;
  const cred=Math.min(Math.max(0,+b.credito||0),maxCred);
  if(gc) gc.cred=cred;
  grupos.forEach(x=>{x.total=x.subtotal-x.cred;});
  return {grupos,disp,maxCred,cred,credG:gc?gc.g:1,total:grupos.reduce((n,x)=>n+x.total,0)};
}
function abrirBorradorFactura(prop, facturaId){
  const existente=facturaId&&by(S.facturas,facturaId);
  // Borradores viejos pueden no traer precio unitario: se deduce del importe
  const actuales=existente?(existente.conceptos||[]).filter(c=>c.tipo!=="Credito").map(c=>({...c,seleccionada:true,grupo:1,
    precio:c.precio!=null?c.precio:(c.importe||0)/(c.cantidad||1)})):[];
  const credPrev=existente?(existente.conceptos||[]).filter(c=>c.tipo==="Credito").reduce((n,c)=>n-(c.importe||0),0):0;
  const porClave=new Map(actuales.map(l=>[l.clave,l]));
  lineasFacturablesFactura(prop,facturaId).forEach(l=>{if(!porClave.has(l.clave)) porClave.set(l.clave,{...l,grupo:1});});
  S.facturaBorrador={id:existente?existente.id:null,prop,lineas:[...porClave.values()],limite:existente?existente.limite||"":"",credito:credPrev||0,creditoGrupo:1,
    lote:{desde:"",hasta:"",tipo:"",factura:1}};
  modalBorradorFactura();
}
function idLineaBorrador(clave){ return "fb_"+String(clave).replace(/[^a-z0-9]/gi,"_"); }
/* Tipo de lote para el compositor: las WO se agrupan por su categoría real y
   todas las líneas extra se pueden tomar juntas. Así Erika decide el corte al facturar,
   no cuando se agenda el trabajo. */
const tipoLoteLinea = l => l.tipo==="WO" ? `wo:${(W(l.wo)&&W(l.wo).cat)||"—"}` : "extra";
function opcionesTipoLote(lineas){
  const vistos=new Set(), opciones=[];
  const agregar=(valor,texto)=>{
    if(vistos.has(valor)) return;
    vistos.add(valor);
    opciones.push({valor,texto});
  };
  lineas.filter(l=>l.tipo==="WO").forEach(l=>{
    const valor=tipoLoteLinea(l); agregar(valor,valor.slice(3));
  });
  if(lineas.some(l=>l.tipo!=="WO")) agregar("extra","Extras");
  return opciones;
}
function modalBorradorFactura(){
  const b=S.facturaBorrador, p=P(b.prop);
  const lineas=b.lineas||[], r=resumenBorrador(b), limite=parseFloat(b.limite);
  const nG=Math.min(6,Math.max(0,...lineas.map(l=>+l.grupo||1))+1);   // 1..(mayor usado + 1), tope 6
  const lote={desde:"",hasta:"",tipo:"",factura:1,...(b.lote||{})};
  const tiposLote=opcionesTipoLote(lineas);
  const excede=g=>limite>0&&g.total>limite+.004, nExc=r.grupos.filter(excede).length;
  const paraDespues=lineas.filter(l=>!l.seleccionada).length;
  modal(`<div class="mh"><h3>${b.id?"Editar borrador":"Preparar factura"}</h3><p>${esc(p.nombre)} · normalmente todo va en Factura 1.</p></div>
  <div class="mb">
    <div class="note" style="margin-bottom:12px"><b>Regla normal:</b> Clean, Paint, Carpet y extras de esta propiedad van juntos en Factura 1. Agrupa por lote solo si la propiedad lo pidió; Erika lo decide ahora al facturar. Las líneas sin marcar quedan para después.</div>
    <div class="fg c2"><div class="fld"><label>Límite por factura <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— opcional</span></label>
      <input id="fbLimite" data-a="facBorradorCambiar" type="number" min="0" step="0.01" value="${esc(b.limite||"")}" placeholder="Ej. 2500.00"></div>
      <div class="fld"><label>Total</label><div class="note ${nExc?"w":"v"}" style="margin:0"><b class="mono">${money(r.total)}</b>${limite>0?` · ${nExc?nExc+" supera(n)":"todas dentro de"} ${money(limite)}`:""}</div></div></div>
    ${r.disp>0.004?`<div class="fg c3"><div class="fld"><label>Crédito disponible</label><div class="note v" style="margin:0"><b class="mono">${money(r.disp)}</b></div></div>
      <div class="fld"><label>Usar</label><input id="fbCredito" data-a="facBorradorCambiar" type="number" min="0" max="${r.maxCred}" step="0.01" value="${r.cred||""}" placeholder="0.00"></div>
      <div class="fld"><label>Crédito en</label><select id="fbCredG" data-a="facBorradorCambiar">${(r.grupos.length?r.grupos.map(x=>x.g):[1]).map(g=>`<option value="${g}" ${g===r.credG?"selected":""}>Factura ${g}</option>`).join("")}</select></div></div>`:""}
    ${lineas.length?`<div class="note" style="margin-bottom:8px"><b>Lote manual (solo excepción):</b> selecciona y asigna únicamente las líneas que coincidan. No quita ni mueve las demás.</div>
      <div class="fg c2"><div class="fld"><label>Desde</label><input id="fbLoteDesde" type="date" value="${esc(lote.desde)}"></div>
        <div class="fld"><label>Hasta</label><input id="fbLoteHasta" type="date" value="${esc(lote.hasta)}"></div></div>
      <div class="fg c2" style="align-items:end"><div class="fld"><label>Tipo de trabajo</label><select id="fbLoteTipo"><option value="">— todos los tipos —</option>${tiposLote.map(t=>`<option value="${esc(t.valor)}" ${t.valor===lote.tipo?"selected":""}>${esc(t.texto)}</option>`).join("")}</select></div>
        <div class="fld"><label>Factura destino</label><select id="fbLoteFactura">${Array.from({length:6},(_,i)=>i+1).map(n=>`<option value="${n}" ${n===+lote.factura?"selected":""}>Factura ${n}</option>`).join("")}</select></div></div>
      <button class="btn" data-a="facAsignarLote">Seleccionar y asignar lote</button>`:""}
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
      ${r.grupos.map(g=>`<span class="pill ${excede(g)?"w":"v"}">Factura ${g.g} · ${money(g.total)} · ${g.lineas.length} ${g.lineas.length===1?"línea":"líneas"}${excede(g)?" · supera el límite":""}</span>`).join("")}
      ${paraDespues?`<span class="pill g">${paraDespues} para después</span>`:""}</div>
    ${lineas.length?`<table style="font-size:11.5px"><thead><tr><th></th><th>Factura</th><th>Origen</th><th>Nombre</th><th class="num">Precio</th><th class="num">Cant.</th><th class="num">Desc.</th><th class="num">Importe</th><th></th></tr></thead><tbody>
      ${lineas.map(l=>{const id=idLineaBorrador(l.clave), g=+l.grupo||1; return `<tr style="${l.seleccionada?"":"opacity:.55"}">
        <td><input id="${id}_sel" data-a="facBorradorCambiar" type="checkbox" ${l.seleccionada?"checked":""}></td>
        <td><select id="${id}_grp" data-a="facBorradorCambiar" ${l.seleccionada?"":"disabled"}>${Array.from({length:Math.max(nG,g)},(_,i)=>i+1).map(n=>`<option value="${n}" ${n===g?"selected":""}>${n}</option>`).join("")}</select></td>
        <td class="mono">${l.tipo==="Manual"?"Manual adjustment":`WO-${l.wo}${l.tipo==="Sub-WO"?" · Sub-WO":l.tipo==="Ajuste"?" · Adjustment":""}`}<div style="color:var(--faint)">${esc(l.fecha||"—")}</div></td>
        <td>${esc(l.nombre||"—")}${l.descripcion?`<div style="color:var(--faint)">${esc(l.descripcion)}</div>`:""}</td>
        <td class="num mono">${money(+l.precio||0)}</td>
        <td class="num mono">${+l.cantidad||0}</td>
        <td class="num mono">${textoDescLinea(l)}</td>
        <td class="num mono">${money(importeLinea(l))}</td>
        <td><button class="btn sm" data-a="facLineaEditar" data-k="${esc(l.clave)}">Editar</button></td></tr>`;}).join("")}
    </tbody></table>`:`<div class="empty">No hay conceptos disponibles para esta propiedad.</div>`}
    <button class="btn sm" data-a="facBorradorAgregarLinea">+ Agregar línea manual</button>
  </div><div class="mf"><button class="btn" data-a="cm">Cancelar</button><button class="btn p" data-a="facBorradorGuardar" ${r.grupos.length?"":"disabled"}>Guardar</button></div>`,true);
}
/* Editor de una línea, como en cualquier app de facturas: nombre, descripción, precio, cantidad y descuento ($ o %). */
function modalLineaFactura(clave){
  const b=S.facturaBorrador, l=b&&(b.lineas||[]).find(x=>x.clave===clave); if(!l) return modalBorradorFactura();
  modal(`<div class="mh"><h3>Editar línea</h3><p>${l.tipo==="Manual"?"Manual adjustment":`WO-${l.wo}${l.tipo==="Sub-WO"?" · Sub-WO":l.tipo==="Ajuste"?" · Adjustment":""}`}</p></div>
  <div class="mb">
    <div class="fld"><label>Nombre</label><input id="fleNom" value="${esc(l.nombre||"")}"></div>
    <div class="fld"><label>Descripción</label><input id="fleDes" value="${esc(l.descripcion||"")}"></div>
    <div class="fg c2"><div class="fld"><label>Precio</label><input id="fleP" type="number" step="0.01" value="${esc(+l.precio||0)}"></div>
      <div class="fld"><label>Cantidad</label><input id="fleC" type="number" min="0" step="0.01" value="${esc(+l.cantidad||0)}"></div></div>
    <div class="fg c2"><div class="fld"><label>Descuento</label><input id="fleD" type="number" min="0" step="0.01" value="${esc(+l.desc||"")}" placeholder="0"></div>
      <div class="fld"><label>Tipo</label><select id="fleT"><option value="$" ${l.descTipo==="%"?"":"selected"}>$ monto</option><option value="%" ${l.descTipo==="%"?"selected":""}>% del subtotal</option></select></div></div>
  </div><div class="mf"><button class="btn" data-a="facLineaVolver">Cancelar</button><button class="btn p" data-a="facLineaGuardar" data-k="${esc(l.clave)}">Guardar</button></div>`);
}
/* Filtros de facturas: Facturación y Cobranza comparten S.filtroFac. El texto se aplica con «Buscar» o Enter. */
const filtroFac = () => S.filtroFac||(S.filtroFac={q:"",prop:"",estado:"",desde:"",hasta:""});
const FAC_ESTADOS = ["Borrador","Emitida","Enviada","Vencida","Pagada"];
function facFiltradas(){
  const f=filtroFac(), q=normBusca(f.q).split(/\s+/).filter(Boolean);
  return S.facturas.filter(x=>{
    if(f.prop && x.prop!==f.prop) return false;
    if(f.estado && facEstadoTexto(x)!==f.estado) return false;
    if(f.desde && (x.emision||"")<f.desde) return false;
    if(f.hasta && (x.emision||"")>f.hasta) return false;
    if(!q.length) return true;
    const cl=CLI(P(x.prop).cliente);
    const txt=normBusca([x.num,P(x.prop).nombre,cl&&cl.nombre,...(x.conceptos||[]).flatMap(c=>[c.wo?"WO-"+c.wo:"",c.wo,c.nombre,c.descripcion,c.unidad]),...(x.lineas||[]).map(id=>"WO-"+id)].filter(Boolean).join(" "));
    return q.every(t=>txt.includes(t)); });
}
function barraFiltroFac(n){
  const f=filtroFac(), lbl="font-size:11px;color:var(--faint);font-weight:700;text-transform:uppercase";
  return `<div class="cp" style="display:flex;gap:7px;align-items:center;flex-wrap:wrap;border-bottom:1px solid var(--line)">
    <input id="fcQ" value="${esc(f.q)}" placeholder="Buscar" autocomplete="off" style="font-family:inherit;font-size:12.5px;padding:7px 10px;border:1px solid var(--line);border-radius:7px;background:var(--surface);color:var(--ink);width:170px">
    <button class="btn" data-a="facFiltro">Buscar</button>
    <select id="fcProp" data-a="facFiltro"><option value="">Propiedad</option>${[...new Set(S.facturas.map(x=>x.prop))].map(id=>`<option value="${esc(id)}" ${f.prop===id?"selected":""}>${esc(P(id).nombre)}</option>`).join("")}</select>
    <select id="fcEst" data-a="facFiltro"><option value="">Estado</option>${FAC_ESTADOS.map(e=>`<option ${f.estado===e?"selected":""}>${e}</option>`).join("")}</select>
    <span style="${lbl}">Emisión</span>
    <input id="fcDesde" data-a="facFiltro" type="date" value="${esc(f.desde)}"><span style="color:var(--faint)">al</span><input id="fcHasta" data-a="facFiltro" type="date" value="${esc(f.hasta)}">
    ${f.q||f.prop||f.estado||f.desde||f.hasta?`<button class="btn sm" data-a="facFiltroLimpiar">Limpiar</button>`:""}
    <span class="mono" style="margin-left:auto;font-size:12px;color:var(--faint)">${n} de ${S.facturas.length}</span></div>`;
}
VIEWS.facturacion = () => {
  /* Erika valida el expediente final. La revisión de calidad puede ocurrir
     después y nunca frena una nómina o una factura ya correctamente validada.
     El touch-up de corrección sigue sin ser facturable. */
  const candidatas = S.wos.filter(w=>enPeriodo(w.fecha,S.periodo) && w.estado==="Completed" && aprobFacturaOK(w) && !subWOsPendientesDeWO(w.id).length && !clienteRevisionPendienteDeWO(w.id)
                                     && !w.facturada && puedeFacturar(w));
  const listas = candidatas.filter(w=>!woBloqueada(w.id) && !w.facRetenida);
  // Retenidas: validadas y sin facturar que Erika frenó a mano; se ven aunque cambie el período para poder liberarlas
  const retenidas = S.wos.filter(w=>w.facRetenida && w.estado==="Completed" && aprobFacturaOK(w) && !w.facturada);
  const frenadasExc = candidatas.filter(w=>woBloqueada(w.id));
  const frenadas = [];
  const porProp = {};
  listas.forEach(w=>(porProp[w.prop]=porProp[w.prop]||[]).push(w));
  const pendientes = S.wos.filter(w=>enPeriodo(w.fecha,S.periodo) && w.estado==="Completed" && !w.facturada).map(w=>{
    const razones=[];
    if(!aprobFacturaOK(w)) razones.push("factura sin aprobar");
    if(subWOsPendientesDeWO(w.id).length) razones.push("tiene una Sub-WO pendiente");
    if(clienteRevisionPendienteDeWO(w.id)) razones.push("falta confirmación o corrección del cliente");
    if(woBloqueada(w.id)) razones.push("tiene una Request pendiente");
    if(bloqueadaPorDev(w)) razones.push("tiene una devolución abierta");
    if(!ingresoWO(w)) razones.push("no tiene tarifa o importe definido");
    return {w,razones};
  }).filter(x=>x.razones.length);
  return `
  <div class="ph"><div><h2>Facturación — ${periodoTexto(S.periodo)}</h2>
    <p>De Work Orders terminadas a factura, sin volver a escribir nada. El número y el vencimiento se calculan.</p></div></div>
  <div class="card" style="margin-bottom:14px"><div class="cp" style="display:flex;gap:10px;flex-wrap:wrap;align-items:stretch">
    <div style="font-weight:750;align-self:center;min-width:110px">Qué hacer aquí</div>
    ${[["1","Elige la semana","Con el selector de abajo o las flechas ‹ ›."],
       ["2","Revisa las propiedades","Cada tarjeta junta los trabajos listos para cobrar."],
       ["3","Toca «Preparar factura»","Elige las WO y Sub-WO que irán juntas; el total se recalcula."],
       ["4","Guarda el borrador y envíalo","Las líneas restantes pueden ir en otra factura o una semana posterior."]]
      .map(([n,t,d])=>`<div style="flex:1;min-width:150px;display:flex;gap:8px">
        <div style="width:22px;height:22px;border-radius:99px;background:var(--azul);color:#fff;font-weight:800;font-size:11px;display:flex;align-items:center;justify-content:center;flex:none">${n}</div>
        <div><div style="font-weight:700;font-size:12.5px">${t}</div><div style="font-size:11px;color:var(--faint)">${d}</div></div></div>`).join("")}
  </div></div>
  ${renderSelectorPeriodo()}
  ${S.periodo.tipo==="semana"?resumenDosSemanas(S.periodo.sem):""}
  ${frenadas.length?`<div class="note w" style="margin-bottom:14px">
    <b>${frenadas.length} Work Order(s) no se pueden facturar: tienen una devolución abierta.</b><br>
    Se mandaron a corregir, así que no se le cobran al cliente hasta que Gustavo verifique que quedaron bien.
    <div style="margin-top:6px;font-size:11.5px">
      ${frenadas.map(w=>{ const d=devAbiertaDeWO(w.id);
        return `WO-${w.id} · ${esc(P(w.prop).nombre)} ${U(w.unidad)?esc(U(w.unidad).num):""}
                — ${esc(d.area)}, ${diasAbierta(d)} día(s) abierta`;}).join("<br>")}</div>
    <button class="btn sm" data-a="ir" data-m="supervision" style="margin-top:7px">Ver devoluciones</button></div>`:""}
  ${frenadasExc.length?`<div class="note r" style="margin-bottom:14px">
    <b>${frenadasExc.length} Work Order(s) no se pueden facturar: tienen una Request pendiente.</b><br>
    Facturar con una tarifa sin definir, o con un adicional todavía sin decidir, es facturar mal. El resto de cada propiedad se puede facturar igual.
    <div style="margin-top:6px;font-size:11.5px">
      ${frenadasExc.map(w=>`WO-${w.id} · ${esc(P(w.prop).nombre)} ${U(w.unidad)?esc(U(w.unidad).num):""}`).join("<br>")}</div>
    <button class="btn sm" data-a="ir" data-m="excepciones" style="margin-top:7px">View Requests</button></div>`:""}

  ${pendientes.length?`<div class="card" style="border-color:var(--ambar);margin-bottom:14px"><div class="chd" style="background:var(--ambar-cl)"><h3 style="color:var(--ambar)">Por qué todavía no aparecen algunas WO</h3><span class="s">${pendientes.length} terminada(s) fuera de la lista de facturación</span></div>
    <table><thead><tr><th>WO</th><th>Propiedad · Unidad</th><th>Motivo</th></tr></thead><tbody>
      ${pendientes.map(x=>`<tr><td class="mono">WO-${x.w.id}</td><td>${esc(P(x.w.prop).nombre)} · ${esc(U(x.w.unidad).num)}</td><td>${x.razones.map(r=>`<span class="pill w" style="margin:0 4px 4px 0">${esc(r)}</span>`).join("")}</td></tr>`).join("")}
    </tbody></table><div class="cp"><div class="tr" style="margin:0">Una WO solo aparece para generar factura cuando está terminada, validada por Erika, sin pendientes que afecten el importe y con tarifa definida. La revisión de calidad se registra aparte.</div></div></div>`:""}

  ${retenidas.length?`<div class="card" style="border-color:var(--ambar);margin-bottom:14px"><div class="chd" style="background:var(--ambar-cl)"><h3 style="color:var(--ambar)">Retenidas</h3><span class="s">${retenidas.length} fuera del borrador · la nómina sigue igual</span></div>
    <table><thead><tr><th>WO</th><th>Propiedad · Unidad</th><th>Servicio</th><th>Motivo</th><th></th></tr></thead><tbody>
      ${retenidas.map(w=>`<tr><td class="mono" style="font-weight:700">WO-${w.id}</td><td>${esc(P(w.prop).nombre)} · ${esc(U(w.unidad).num)}</td><td>${esc(w.serv)}</td>
        <td><span class="pill w" title="${esc(w.facRetenida.motivo)}">Retenida</span> ${esc(w.facRetenida.motivo)}<div style="font-size:10.5px;color:var(--faint)">${esc(w.facRetenida.quien)} · ${esc(w.facRetenida.fecha)} ${esc(w.facRetenida.hora)}</div></td>
        <td style="text-align:right"><button class="btn sm" data-a="facLiberar" data-id="${w.id}">Liberar</button></td></tr>`).join("")}
    </tbody></table></div>`:""}

  ${Object.keys(porProp).length?Object.entries(porProp).map(([pid,arr])=>{
    const tot=arr.reduce((a,w)=>a+(ingresoWO(w)||0),0);
    const sinT=arr.filter(w=>ingresoWO(w)===null).length;
    return `<div class="card"><div class="chd"><h3>${esc(P(pid).nombre)}</h3><span class="s">${esc(CLI(P(pid).cliente).nombre)}</span>
      <span class="r"><span class="mono" style="font-size:16px;font-weight:750">${money(tot)}</span></span></div>
      <table><thead><tr><th>WO</th><th>Unidad</th><th>Servicio</th><th>Técnico</th><th>Evidencia</th><th class="num">Importe</th><th></th></tr></thead>
      <tbody>${arr.map(w=>`<tr><td class="mono" style="font-weight:700">WO-${w.id}</td><td>${esc(U(w.unidad).num)}</td>
        <td>${esc(w.serv)}</td><td>${w.tec?esc(tecN(w.tec)):"—"}</td>
        <td>${w.evid?`<span class="pill v">${w.evid} foto(s)</span>`:'<span class="pill r"><span class="dot"></span>sin evidencia</span>'}</td>
        <td class="num mono">${ingresoBaseWO(w)!==null?money(ingresoBaseWO(w)):'<span class="pill w">NA</span>'}</td>
        <td style="text-align:right"><button class="btn sm" data-a="facRetener" data-id="${w.id}">Retener</button></td></tr>
        ${ajustesValDe(w,"cobro").map(a=>`<tr style="background:var(--azul-cl)"><td class="mono">↳ Adjustment</td><td>${esc(U(w.unidad).num)}</td><td>${esc(a.concepto)}</td><td>—</td><td>—</td>
          <td class="num mono">${money(ajusteMonto(a))}<div style="font-size:10px;color:var(--faint)">se elige en el borrador</div></td><td></td></tr>`).join("")}
        ${S.adicionales.filter(a=>a.wo===w.id&&a.estado==="Aprobado"&&a.facturable&&!a.facturada).map(a=>`<tr style="background:var(--azul-cl)">
          <td class="mono">↳ Sub-WO</td><td>${esc(U(w.unidad).num)}</td><td>${esc(a.concepto)}${a.ubic?` · ${esc(a.ubic)}`:""}</td>
          <td>${esc(tecN(tecSubWO(a)))}</td><td><span class="pill ${a.fotosEvidArr&&a.fotosEvidArr.length?"v":"w"}">${(a.fotosEvidArr||[]).length} foto(s)</span></td>
          <td class="num mono">${money(a.montoFactura!=null?a.montoFactura*(cantSubWO(a)/(a.cant||1)):(a.precio||0)*cantSubWO(a))}<div style="font-size:10px;color:var(--faint)">se elige en el borrador</div></td><td></td></tr>`).join("")}`).join("")}
      </tbody></table>
      ${sinT?`<div class="cp" style="border-top:1px solid var(--line)"><div class="note w" style="margin:0"><b>${sinT} línea sin tarifa.</b> Resuélvela en Requests antes de facturar.</div></div>`:""}
      <div class="mf" style="border-top:1px solid var(--line)">
        <button class="btn ${sinT?"":"p"}" data-a="facturar" data-prop="${pid}" ${sinT?"disabled":""}>Preparar factura</button></div>
    </div>`;
  }).join(""):(()=>{
    const terminadas=S.wos.filter(w=>enPeriodo(w.fecha,S.periodo) && w.estado==="Completed");
    const motivo = !terminadas.length
      ? `No hay trabajos terminados en ${esc(periodoTexto(S.periodo))}. Prueba otra semana con las flechas ‹ › del selector.`
      : pendientes.length||frenadas.length
        ? `Hay ${terminadas.filter(w=>!w.facturada).length} trabajo(s) terminado(s), pero todavía no se pueden cobrar. Arriba, en «Por qué todavía no aparecen algunas WO», está el motivo de cada uno y qué hay que resolver.`
        : `Todos los trabajos terminados de ${esc(periodoTexto(S.periodo))} ya están facturados. Míralos en «Facturas emitidas».`;
    return `<div class="card"><div class="cp" style="text-align:center;padding:26px 18px">
      <div style="font-weight:750;margin-bottom:4px">No hay nada listo para facturar en este período</div>
      <div style="font-size:12px;color:var(--soft);max-width:520px;margin:0 auto">${motivo}</div></div></div>`;
  })()}

  ${S.facturas.length?(()=>{ const fl2=facFiltradas(); return `<div class="card"><div class="chd"><h3>Borradores y facturas emitidas</h3></div>
    ${barraFiltroFac(fl2.length)}
    <table><thead><tr><th>Número</th><th>Propiedad</th><th class="num">Líneas</th><th>Emisión</th><th>Vence</th><th>Estado</th><th class="num">Total</th><th></th></tr></thead>
    <tbody>${fl2.map(f=>`<tr class="${fl("fac:"+f.id)}"><td class="mono" style="font-weight:700">${esc(f.num)}</td><td>${esc(P(f.prop).nombre)}</td>
      <td class="num mono">${(f.conceptos||f.lineas).length}</td><td class="mono">${f.emision}</td><td class="mono">${esc(facVenceTxt(f))}</td>
      <td><span class="pill ${f.estado==="Pagada"?"v":facVencida(f)?"r":f.estado==="Emitida"?"g":"a"}">${esc(facEstadoTexto(f))}</span></td>
      <td class="num mono" style="font-weight:700">${money(f.total)}</td>
      <td style="text-align:right;white-space:nowrap">
        ${f.estado==="Borrador"?`<button class="btn sm p" data-a="facEditarBorrador" data-id="${f.id}">Editar borrador</button>`:`<button class="btn sm" data-a="facPDF" data-id="${f.id}">Ver PDF</button>
        <button class="btn sm" data-a="facDescargar" data-id="${f.id}">Descargar</button>`}
        ${["Emitida","Borrador"].includes(f.estado)
          ? `<button class="btn sm p" data-a="facEnviar" data-id="${f.id}">Enviar al cliente</button>`
          : `<button class="btn sm" data-a="facVer" data-id="${f.id}">Detalle</button>`}
        ${f.pdf?`<div style="font-size:10px;color:var(--faint);margin-top:3px">📎 ${esc(f.pdf)} · guardado ${esc(f.pdfHora||"")}</div>`:""}
      </td></tr>`).join("")||`<tr><td colspan="8" class="empty">Sin resultados</td></tr>`}
    </tbody></table></div>`;})():""}`;
};

/* UC-17 — «eso también para saber hacer las facturas y enviarlas» */
function conceptosFactura(f){
  if(f.conceptos) return f.conceptos;
  return f.lineas.map(id=>W(id)).filter(Boolean).map(w=>({tipo:"WO",wo:w.id,unidad:U(w.unidad).num,
    nombre:w.serv,descripcion:"",cantidad:w.cant||1,importe:ingresoWO(w)||0,evidencia:w.evid||0}));
}
function textoConceptoFactura(x){
  const nombre=x.nombre||x.descripcion||"—", detalle=x.nombre&&x.descripcion&&x.descripcion!==x.nombre?x.descripcion:"";
  // El descuento se ve en la línea (cliente en inglés); el importe ya viene descontado
  const dsc=x.tipo!=="Credito"&&descuentoLinea(x)>0?`Discount ${x.descTipo==="%"?(+x.desc)+"% ":""}(\u2212${money(descuentoLinea(x))})`:"";
  return `${esc(nombre)}${detalle?`<div class="s">${esc(detalle)}</div>`:""}${dsc?`<div class="s">${dsc}</div>`:""}`;
}
/* ── EL PDF DE LA FACTURA ─────────────────────────────────
   Abre el documento en una ventana aparte y lanza la impresión: el navegador
   lo guarda como PDF de verdad. No es una simulación — el archivo que sale es
   el que se le manda al manager. */
function abrirPDF(fid, imprimir){
  const f = by(S.facturas, fid); if(!f) return;
  const p = P(f.prop), c = CLI(p.cliente);
  const conceptos=conceptosFactura(f);
  const filas = conceptos.map(x => `<tr>
      <td class="m">${x.tipo==="Manual"?"Manual":x.tipo==="Credito"?"Credit":`WO-${x.wo}${x.tipo==="Sub-WO"?" · Sub-WO":x.tipo==="Ajuste"?" · Adjustment":""}`}</td>
      <td>${esc(x.unidad||"\u2014")}</td>
      <td>${textoConceptoFactura(x)}<div class="s">${esc(x.tipo||"WO")}${x.cantidad>1?` · Cantidad ${x.cantidad}`:""}</div></td>
      <td class="n m">${money(x.importe||0)}</td></tr>`).join("");

  const doc = `<!doctype html><html lang="es"><head><meta charset="utf-8">
    <title>${esc(f.num)}</title>
    <script>/* El navegador nombra el PDF con el título: número de factura + fecha y hora de la descarga (sin ":", que Windows no acepta). */
      window.onbeforeprint=()=>{const d=new Date(),p=n=>String(n).padStart(2,"0");
        document.title=${JSON.stringify(String(f.num))}+" "+d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())+" "+p(d.getHours())+"-"+p(d.getMinutes());};<\/script>
    <style>
      @page { size:Letter portrait; margin:18mm 16mm; }
      *{box-sizing:border-box}
      body{font-family:"Segoe UI",Arial,sans-serif;font-size:10.5pt;color:#16202b;margin:0}
      .hd{display:flex;align-items:flex-start;gap:14px;border-bottom:3px solid #1f4e79;padding-bottom:14px}
      .lg{width:44px;height:44px;border-radius:9px;background:#1f4e79;color:#fff;display:flex;
          align-items:center;justify-content:center;font-weight:800;font-size:14px;flex:none}
      h1{margin:0;font-size:17pt;color:#1f4e79}
      .sub{font-size:9pt;color:#5b6875;margin-top:2px}
      .inv{margin-left:auto;text-align:right}
      .inv b{font-size:15pt;color:#1f4e79}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:18px 0}
      .lbl{font-size:8pt;text-transform:uppercase;letter-spacing:.08em;color:#5b6875;margin-bottom:3px}
      table{width:100%;border-collapse:collapse;margin-top:6px;font-size:9.5pt}
      th{background:#1f4e79;color:#fff;text-align:left;padding:7px 9px;font-size:8.2pt;
         text-transform:uppercase;letter-spacing:.03em}
      td{border-bottom:1px solid #d8dee5;padding:7px 9px;vertical-align:top}
      .n{text-align:right} .m{font-family:Consolas,monospace}
      .s{font-size:8.4pt;color:#5b6875}
      .tot{background:#eaf1f8;font-weight:700;font-size:12pt}
      .pie{margin-top:26px;padding-top:12px;border-top:1px solid #d8dee5;font-size:8.6pt;color:#5b6875}
      @media print{ .noprint{display:none} }
      .noprint{position:fixed;top:10px;right:10px;background:#1f4e79;color:#fff;border:none;
               padding:9px 16px;border-radius:8px;font-size:13px;cursor:pointer;font-family:inherit}
    </style></head><body>
    <button class="noprint" onclick="window.print()">Guardar como PDF</button>
    <div class="hd">
      <div class="lg">CPS</div>
      <div><h1>Cordova Property Services LLC</h1>
        <div class="sub">Pensacola, Florida \u00b7 customer@cordovaps.com \u00b7 448-219-6669</div></div>
      <div class="inv"><div class="lbl">Invoice</div><b>${esc(f.num)}</b>
        <div class="sub">Emitida ${esc(f.emision)}<br>Vence ${esc(f.vence||sumarDias(f.emision,diasCreditoProp(f.prop)))}</div></div>
    </div>

    <div class="grid">
      <div><div class="lbl">Facturar a</div>
        <b>${esc(c.nombre)}</b><br>${esc(c.contacto || "")}<br>${esc(c.mail || "")}</div>
      <div><div class="lbl">Propiedad</div>
        <b>${esc(p.nombre)}</b><br>${esc(p.dir)}<br>${esc(p.zona)}</div>
    </div>

    <table>
      <thead><tr><th>Work Order</th><th>Unidad</th><th>Servicio</th><th class="n">Importe</th></tr></thead>
      <tbody>${filas}
        <tr class="tot"><td colspan="3">TOTAL</td><td class="n m">${money(f.total)}</td></tr></tbody>
    </table>

    <div class="pie">
      Cada l\u00ednea corresponde a un concepto de Work Order o Sub-Work Order con su evidencia archivada.<br>
      Generada el ${esc(f.emision)} a las ${esc(f.pdfHora || "")} por ${esc(f.pdfQuien || "")}.
    </div>
    ${imprimir ? "<script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script>" : ""}
    </body></html>`;

  const v = window.open("", "_blank", "width=860,height=1000");
  if(!v){ toast("El navegador bloque\u00f3 la ventana","Permite las ventanas emergentes para ver el PDF.","r"); return; }
  v.document.write(doc);
  v.document.close();
}

function modalFactura(fid, enviando){
  const f=by(S.facturas,fid), p=P(f.prop), c=CLI(p.cliente);
  const conceptos=conceptosFactura(f);
  const expediente = resumenExpedienteFactura(f);
  modal(`<div class="mh"><h3>Factura ${esc(f.num)}</h3><p>${esc(p.nombre)} · ${esc(c.nombre)}</p></div>
  <div class="mb">
    <div style="border:1px solid var(--line);border-radius:10px;overflow:hidden">
      <div style="background:var(--azul);color:#fff;padding:13px 15px;display:flex;align-items:center;gap:10px">
        <div style="width:30px;height:30px;border-radius:7px;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px">CPS</div>
        <div><div style="font-weight:750">Cordova Property Services</div>
          <div style="font-size:11px;opacity:.85">${esc(f.num)} · emitida ${esc(f.emision)} · vence ${esc(facVenceTxt(f))}</div></div>
        <div style="margin-left:auto;text-align:right"><div style="font-size:10.5px;opacity:.85">Total</div>
          <div class="mono" style="font-size:20px;font-weight:750">${money(f.total)}</div></div></div>
      <table><thead><tr><th>WO</th><th>Unidad</th><th>Servicio</th><th>Evidencia</th><th class="num">Importe</th></tr></thead>
      <tbody>${conceptos.map(x=>`<tr><td class="mono">${x.tipo==="Manual"?"Manual":x.tipo==="Credito"?"Credit":`WO-${x.wo}${x.tipo==="Sub-WO"?" · Sub-WO":x.tipo==="Ajuste"?" · Adjustment":""}`}</td><td>${esc(x.unidad||"—")}</td>
        <td>${textoConceptoFactura(x)}</td>
        <td>${x.evidencia?`<span class="pill v">${x.evidencia} foto(s)</span>`:'<span class="pill w">—</span>'}</td>
        <td class="num mono">${money(x.importe||0)}</td></tr>`).join("")}
      <tr style="background:var(--surface-2);font-weight:750"><td colspan="4">Total</td>
        <td class="num mono" style="font-size:15px">${money(f.total)}</td></tr></tbody></table></div>
    ${enviando?`<div class="note v" style="margin-top:13px"><b>Expediente incluido con la factura:</b> ${expediente.antes} foto(s) de referencia/antes, ${expediente.despues} foto(s) post-work y ${expediente.aprobaciones} validación(es) o aprobación(es) registrada(s).<br><span style="font-size:11px">El PDF de la factura y estos respaldos quedan asociados a cada WO enviada.</span></div>
      <div class="fg c2" style="margin-top:13px"><div class="fld"><label>Se envía a</label>
      <input id="facMail" value="${esc(c.mail||"")}"></div>
      <div class="fld"><label>Vence</label><input id="facVence" type="date" value="${f.venceManual&&f.vence?f.vence:sumarDias(HOY_SUP,diasCreditoProp(f.prop))}"></div></div>
      <div class="hint">Vence a ${diasCreditoProp(f.prop)} días de hoy, según el crédito de la propiedad. Puedes cambiar la fecha.</div>
      <div class="note">Va con el PDF, fotos antes/después y aprobaciones registradas. Si el cliente reclama una línea, cada una conserva su evidencia.</div>`
     :`<div class="note" style="margin-top:12px"><b>Enviada el ${esc(f.envio||f.emision)}</b> a ${esc(c.mail||"—")}. Vence ${esc(facVenceTxt(f))}. ${facCambiaVence(f)?`<button class="btn sm" data-a="facVenceCambiar" data-id="${f.id}">Cambiar</button>`:""}</div>`}
  </div>
  <div class="mf"><button class="btn" data-a="cm">Cerrar</button>
    ${enviando?`<button class="btn p" data-a="facEnviarOK" data-id="${fid}">Enviar factura</button>`:""}</div>`,true);
}

function resumenExpedienteFactura(f){
  const ws=(f.lineas||[]).map(W).filter(Boolean);
  const antes=ws.reduce((n,w)=>n+(w.antesFotos||w.fotosRef||[]).length,0);
  const despues=ws.reduce((n,w)=>n+(w.evidFotos||[]).length,0)
    +(f.conceptos||[]).filter(x=>x.tipo==="Sub-WO").reduce((n,x)=>{
      const a=by(S.adicionales,x.subwo); return n+((a&&a.fotosEvidArr)||[]).length;
    },0);
  const aprobaciones=ws.reduce((n,w)=>n+(aprobFacturaOK(w)?1:0)
    +solsDe(w.id).flatMap(s=>s.lineas).filter(a=>a.estado==="Aprobado").length,0);
  return {antes,despues,aprobaciones};
}

/* ── COBRANZA ──────────────────────────────────────────────
   Su flujograma "Proceso de Cobranza y Cierre de Proyectos" pide una escalera:
   ¿pagada? → ¿+30 días? → Enviar Reminder → ¿sigue vencida? → Correo Overdue →
   Llamada → Registrar Respuesta → ¿pago recibido? → Cerrar Invoice/WO/Proyecto.
   Antes solo existía el extremo final (Registrar pago) y el estado "Vencida"
   nunca se calculaba de verdad — quedaba escrito en los filtros pero nada lo
   encendía. facVencida() lo calcula en vivo, igual que devVencida(). */
/* Un borrador no tiene fecha de vencimiento: nace al enviarse (emisión + días de crédito de la propiedad). */
const facVenceTxt = f => f.vence || (f.estado==="Borrador"?"Al enviar":"—");
const facCambiaVence = f => !["Pagada","Borrador"].includes(f.estado) && f.vence;
const facVencida = f => !["Pagada","Borrador"].includes(f.estado) && !!f.vence && f.vence < HOY_SUP;
const facEstadoTexto = f => f.estado==="Pagada" ? "Pagada" : facVencida(f) ? "Vencida" : f.estado;
const SEG_LABEL = {vence:"Cambio de vencimiento", reminder:"Reminder enviado", overdue:"Correo overdue enviado",
  agrupado:"Recordatorio agrupado enviado", llamada:"Llamada de cobranza", pago:"Pago registrado", cierre:"Invoice y Work Orders cerrados"};
/* Vencidas agrupadas por cliente (dueño de las propiedades): un solo correo con todas sus facturas vencidas. */
const clienteFac = f => P(f.prop).cliente || "—";
const vencidasPorCliente = () => {
  const m=new Map();
  S.facturas.filter(facVencida).forEach(f=>{ const k=clienteFac(f); if(!m.has(k)) m.set(k,[]); m.get(k).push(f); });
  return [...m.entries()].map(([cli,fs])=>({cli, fs:fs.sort((a,b)=>a.vence<b.vence?-1:1), total:fs.reduce((a,f)=>a+f.total,0),
    ultimo:fs.flatMap(f=>(f.seguimiento||[]).filter(s=>s.tipo==="agrupado").map(s=>s.fecha)).sort().pop()||null}));
};
const diasVencida = f => Math.round((new Date(HOY_SUP)-new Date(f.vence))/864e5);

VIEWS.cobranza = () => {
  const abiertas=S.facturas.filter(f=>!["Pagada","Borrador"].includes(f.estado));
  const vencidas=S.facturas.filter(facVencida), grupos=vencidasPorCliente(), filtradas=facFiltradas();
  return `
  <div class="ph"><div><h2>Cobranza</h2><p>Al pasar su vencimiento sin pago, queda «Vencida» y arranca la escalera: reminder → correo overdue → llamada.</p></div></div>
  <div class="note" style="margin-bottom:14px"><b>Cómo leer esta vista:</b> «Emitida» todavía está dentro del plazo; «Vencida» ya requiere seguimiento; «Pagada» quedó cerrada. Abre <b>Gestionar cobranza</b> para ver el historial y el siguiente paso de cada factura.</div>
  <div class="kpis">
    <div class="kpi"><div class="l">Por cobrar</div><div class="v mono">${money(abiertas.reduce((a,f)=>a+f.total,0))}</div></div>
    <div class="kpi"><div class="l">Facturas abiertas</div><div class="v">${abiertas.length}</div></div>
    <div class="kpi"><div class="l">Vencidas</div><div class="v ${vencidas.length?"b":""}">${vencidas.length}</div></div>
    <div class="kpi"><div class="l">Cobrado</div><div class="v g mono">${money(S.facturas.filter(f=>f.estado==="Pagada").reduce((a,f)=>a+f.total,0))}</div></div>
  </div>
  ${grupos.length?`<div class="card" style="margin-bottom:14px"><div class="chd"><h3>Vencidas por cliente</h3></div><table>
    <thead><tr><th>Cliente</th><th>Facturas</th><th class="num">Vencido</th><th>Último recordatorio</th><th></th></tr></thead>
    <tbody>${grupos.map(g=>`<tr><td style="font-weight:700">${esc(CLI(g.cli).nombre)}</td>
      <td class="mono" style="font-size:12px">${g.fs.map(f=>esc(f.num)).join(", ")}</td>
      <td class="num mono">${money(g.total)}</td><td class="mono">${g.ultimo||"—"}</td>
      <td style="text-align:right"><button class="btn sm p" data-a="cobAgrupadoModal" data-cli="${esc(g.cli)}">Enviar recordatorio</button></td></tr>`).join("")}
    </tbody></table></div>`:""}
  <div class="card">${S.facturas.length?`${barraFiltroFac(filtradas.length)}<table>
    <thead><tr><th>Número</th><th>Propiedad</th><th>Emisión</th><th>Vence</th><th>Estado</th><th class="num">Total</th><th></th></tr></thead>
    <tbody>${filtradas.map(f=>`<tr class="${fl("fac:"+f.id)}"><td class="mono" style="font-weight:700">${esc(f.num)}</td><td>${esc(P(f.prop).nombre)}</td>
      <td class="mono">${f.emision}</td><td class="mono">${esc(facVenceTxt(f))}</td>
      <td><span class="pill ${f.estado==="Pagada"?"v":facVencida(f)?"r":"a"}">${esc(facEstadoTexto(f))}</span></td>
      <td class="num mono">${money(f.total)}</td>
      <td style="text-align:right;white-space:nowrap">
        <button class="btn sm" data-a="facPDF" data-id="${f.id}">Ver PDF</button>
        ${f.estado!=="Pagada"?`<button class="btn sm" data-a="cobGestionar" data-id="${f.id}">Gestionar cobranza</button>`:""}</td></tr>`).join("")||`<tr><td colspan="7" class="empty">Sin resultados</td></tr>`}
    </tbody></table>`:`<div class="empty">Todavía no hay facturas emitidas</div>`}</div>`;
};

/* Modal de seguimiento — reemplaza el botón suelto "Registrar pago": ahora
   cada paso de la escalera queda en S.facturas[].seguimiento, con quién y
   cuándo, igual que el resto de historiales de la app. */
function modalCobranza(fid){
  const f=by(S.facturas,fid), p=P(f.prop);
  const seg=f.seguimiento||[];
  const venc=facVencida(f);
  const tieneReminder=seg.some(s=>s.tipo==="reminder"||s.tipo==="agrupado");   // el agrupado cuenta como reminder
  const tieneOverdue =seg.some(s=>s.tipo==="overdue");
  modal(`<div class="mh"><h3>Cobranza — ${esc(f.num)}</h3><p>${esc(p.nombre)} · ${money(f.total)} · vence ${esc(facVenceTxt(f))} ${facCambiaVence(f)?`<button class="btn sm" data-a="facVenceCambiar" data-id="${f.id}">Cambiar</button>`:""}</p></div>
  <div class="mb">
    ${f.estado==="Pagada"?`<div class="note v" style="margin-bottom:14px"><b>Pagada.</b> Invoice y Work Orders quedaron cerrados.</div>`
      :venc?`<div class="note r" style="margin-bottom:14px"><b>Vencida.</b> Pasó su fecha de vencimiento (${esc(f.vence)}) sin pago registrado.</div>`
      :`<div class="note" style="margin-bottom:14px">Todavía no vence — nada que hacer hasta el ${esc(f.vence)}.</div>`}
    <div style="font-size:11px;color:var(--faint);text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px">Seguimiento</div>
    ${seg.length?seg.map(s=>`<div style="padding:8px 0;border-bottom:1px solid var(--line)">
        <b>${esc(SEG_LABEL[s.tipo]||s.tipo)}</b>
        <span style="color:var(--faint);font-size:11.5px"> — ${esc(s.fecha)} ${esc(s.hora)} · ${esc(s.quien)}</span>
        ${s.nota?`<div style="font-size:12px;color:var(--soft);margin-top:3px">${esc(s.nota)}</div>`:""}
        ${s.promesa?`<div style="font-size:11px;color:var(--faint)">Prometió pagar para el ${esc(s.promesa)}</div>`:""}
        ${s.foto?`<div style="margin-top:4px">${miniRecibo(s.foto)} <span style="font-size:11px;color:var(--faint)">comprobante</span></div>`:""}
      </div>`).join(""):`<div class="empty" style="padding:14px 0">Todavía no hay seguimiento en esta factura.</div>`}
  </div>
  <div class="mf" style="flex-wrap:wrap;gap:7px">
    <button class="btn" data-a="cm">Cerrar</button>
    ${f.estado!=="Pagada"?`
    ${venc&&!tieneReminder?`<button class="btn" data-a="cobRecordatorio" data-id="${f.id}">Enviar reminder</button>`:""}
    ${venc&&tieneReminder&&!tieneOverdue?`<button class="btn" style="border-color:var(--rojo);color:var(--rojo)" data-a="cobOverdue" data-id="${f.id}">Enviar correo overdue</button>`:""}
    ${venc&&tieneOverdue?`<button class="btn" data-a="cobLlamadaModal" data-id="${f.id}">Registrar llamada</button>`:""}
    <button class="btn p" data-a="cobrar" data-id="${f.id}">Registrar pago</button>`:""}
  </div>`);
}

/* Un correo por cliente con todas sus vencidas; Erika puede quitar alguna antes de enviar. */
function modalCobAgrupado(cli){
  const g=vencidasPorCliente().find(x=>x.cli===cli); if(!g) return;
  const c=CLI(cli);
  modal(`<div class="mh"><h3>Recordatorio de pago — ${esc(c.nombre)}</h3><p>Un solo correo con sus facturas vencidas.</p></div>
  <div class="mb">
    <div class="fld"><label>Para <span class="req">*</span></label><input id="caMail" value="${esc(c.mail||"")}"></div>
    <table><thead><tr><th></th><th>Factura</th><th>Propiedad</th><th>Vence</th><th class="num">Días</th><th class="num">Total</th></tr></thead>
    <tbody>${g.fs.map(f=>`<tr><td><input type="checkbox" class="caFac" value="${f.id}" checked></td><td class="mono">${esc(f.num)}</td><td>${esc(P(f.prop).nombre)}</td>
      <td class="mono">${esc(f.vence)}</td><td class="num">${diasVencida(f)}</td><td class="num mono">${money(f.total)}</td></tr>`).join("")}</tbody></table>
    <div class="fld" style="margin-top:10px;margin-bottom:0"><label>Nota <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— opcional</span></label><textarea id="caNota" rows="2"></textarea></div>
  </div>
  <div class="mf"><button class="btn" data-a="cm">Cancelar</button><button class="btn p" data-a="cobAgrupadoEnviar" data-cli="${esc(cli)}">Enviar</button></div>`);
}

function modalCobLlamada(fid){
  modal(`<div class="mh"><h3>Registrar llamada de cobranza</h3><p>Lo que respondió el cliente cuando lo llamaste.</p></div>
  <div class="mb">
    <div class="fld"><label>Qué respondió el cliente <span class="req">*</span></label><textarea id="clNota" rows="3"></textarea></div>
    <div class="fld" style="margin-bottom:0"><label>¿Prometió pagar para una fecha? <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— opcional</span></label>
      <input type="date" id="clProm"></div>
  </div>
  <div class="mf"><button class="btn" data-a="cobGestionar" data-id="${fid}">Cancelar</button>
    <button class="btn p" data-a="cobLlamadaGuardar" data-id="${fid}">Guardar</button></div>`);
}
function modalRegistrarPago(fid){
  S._recibo=null;   // el comprobante es de este pago, no del anterior
  const f=by(S.facturas,fid), recibido=(S.pagos||[]).filter(p=>p.factura===fid).reduce((n,p)=>n+(+p.monto||0),0), pendiente=Math.max(0,(f.total||0)-recibido);
  modal(`<div class="mh"><h3>Registrar pago — ${esc(f.num)}</h3><p>Total ${money(f.total)} · recibido ${money(recibido)} · pendiente ${money(pendiente)}</p></div><div class="mb"><div class="fg c2"><div class="fld"><label>Monto recibido <span class="req">*</span></label><input id="cpMonto" type="number" min="0.01" max="${pendiente}" step="0.01" value="${pendiente}"></div><div class="fld"><label>Fecha <span class="req">*</span></label><input id="cpFecha" type="date" value="${HOY_SUP}"></div></div><div class="fg c2"><div class="fld"><label>Medio <span class="req">*</span></label><select id="cpMedio"><option>Check</option><option>ACH</option><option>Card</option><option>Cash</option><option>Other</option></select></div><div class="fld"><label>Cheque / referencia</label><input id="cpRef" placeholder="Ej. CHK-10488"></div></div><div class="fld"><label>Comprobante</label><div style="display:flex;align-items:center;gap:8px"><button type="button" class="btn sm" data-a="reciboFoto">📷 Foto</button><span id="recPrev">${miniRecibo(S._recibo)}</span></div></div><div class="fld"><label>Nota</label><input id="cpNota"></div><div class="note">Puedes registrar pagos parciales. La factura solo se cierra cuando el total recibido la cubre.</div></div><div class="mf"><button class="btn" data-a="cobGestionar" data-id="${fid}">Cancelar</button><button class="btn p" data-a="cobrarGuardar" data-id="${fid}">Guardar pago</button></div>`);
}

/* ── INVENTARIO ── */
/* Activos no consumibles (se registran y editan a mano) y material reservado para una WO. */
const INV_ACTIVOS = ["Herramientas y equipos","Muebles / activos"];
const INV_ESTADOS = ["Operativa","En reparación","Baja"];
const reservaTxt = p => { const id=p.reservadoWO||((/WO-(\d+)/.exec(p.reservadoPara||"")||[])[1]), w=id&&W(+id);
  return w ? `WO-${w.id} · ${P(w.prop).nombre} · ${U(w.unidad).num}` : (p.reservadoPara||""); };
const puedeEditarInv = p => !soloLectura() && (INV_ACTIVOS.includes(p.cat) || p.cat==="Material para instalación");
VIEWS.inventario = () => `
  <div class="ph"><div><h2>Inventario</h2>
    <p>Consumibles, herramientas, activos, material para instalación y suministros de oficina. El stock de consumibles se calcula con entradas y salidas.</p></div>
    ${soloLectura()?"":`<div class="act"><button class="btn" data-a="invNuevo">Nuevo</button><button class="btn" data-a="movSalida">Registrar salida</button><button class="btn p" data-a="movEntrada">+ Registrar compra</button></div>`}</div>
  <div class="card"><div class="chd"><h3>Productos y activos</h3></div><table>
    <thead><tr><th>Producto</th><th>Categoría</th><th>Unidad</th><th class="num">Stock</th><th>Responsable / ubicación</th><th>Estado</th><th class="num">Costo ref.</th><th></th></tr></thead>
    <tbody>${S.productos.map(p=>{const s=stock(p.id);return `<tr>
      <td style="font-weight:650">${esc(p.nombre)}</td><td>${esc(p.cat)}</td><td>${esc(p.um)}</td>
      <td class="num mono" style="font-weight:700">${p.consumible===false?"—":s}</td><td>${p.consumible===false?esc(respN(p.responsable)):esc(reservaTxt(p)||"—")}<div class="s">${esc(p.ubicacion||"")}</div></td>
      <td>${p.consumible===false?`<span class="pill ${p.estado==="Baja"?"r":p.estado==="En reparación"?"w":"a"}">${esc(p.estado||"Activo")}</span>`:(s<p.min?'<span class="pill r"><span class="dot"></span>Stock bajo</span>':'<span class="pill v">OK</span>')}</td>
      <td class="num mono">${money(p.costo)}</td>
      <td style="text-align:right">${puedeEditarInv(p)?`<button class="btn sm" data-a="invEditar" data-id="${esc(p.id)}">Editar</button>`:""}</td></tr>`;}).join("")}</tbody></table></div>
  ${(()=>{ const nPend=S.movs.filter(m=>m.costoPend).length; return nPend?`
  <div class="card" style="border-color:var(--ambar)"><div class="chd"><h3>Compras sin costo</h3></div>
    <div class="cp"><span class="pill w">Falta costo</span> ${nPend} compra(s) de técnicos en tienda están esperando el costo del ticket.</div></div>`:""; })()}
  <div class="card"><div class="chd"><h3>Movimientos</h3><span class="s">cada uno con quién lo registró</span></div>
    <table><thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th class="num">Cant.</th><th>Work Order</th><th>Tienda</th><th>Quién</th><th class="num">Costo</th></tr></thead>
    <tbody>${S.movs.slice().reverse().map(m=>`<tr class="${fl("mov:"+m.id)}"><td class="mono">${m.fecha.slice(5)}</td>
      <td>${esc(by(S.productos,m.prod).nombre)}</td>
      <td><span class="pill ${m.tipo==="entrada"?"v":"w"}">${m.tipo}</span>${m.costoPend?' <span class="pill w">Falta costo</span>':""}</td>
      <td class="num mono">${m.cant}</td><td class="mono">${m.wo?`WO-${m.wo}`:m.compraWo?`WO-${m.compraWo} (compra)`:"—"}</td>
      <td>${esc(m.tienda)||"—"}</td><td>${esc(m.quien)}</td>
      <td class="num mono">${m.costoPend?(soloLectura()?'<span class="pill w">Falta costo</span>':`<button type="button" class="btn sm" data-a="movCosto" data-id="${m.id}">Cargar costo del ticket</button>`):money(m.costo)}</td></tr>`).join("")}
    </tbody></table></div>`;

/* ── SUPERVISIÓN — el panel de Gustavo (UC-12, UC-12b, UC-04b) ── */
