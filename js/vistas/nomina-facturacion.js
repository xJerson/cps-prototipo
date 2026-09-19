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
      monto:null, pide:"Sistema", aprueba:"Gustavo", estado:"Pendiente", fecha:a.fecha, resol:null}));
  });
  S.wos.filter(w=>w.estado==="Completed" && !w.evid && !w.evidExcusada).forEach(w=>{
    out.push(conAsignacion({id:"AUTO-E"+w.id, tipo:"Cierre sin evidencia", wo:w.id, auto:true,
      motivo:`WO-${w.id} se cerró sin ninguna foto. No hay con qué sustentar el cobro si el cliente reclama.`,
      monto:null, pide:"Sistema", aprueba:"Gustavo", estado:"Pendiente", fecha:w.fecha, resol:null}));
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
      pide:esPlanificada?"Oficina":"Técnico", aprueba:"Claudia", estado:"Pendiente", fecha:"", resol:null}));
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
/* Toda Approval Request debe estar ligada a una WO. Por eso solo frena esa
   orden: las demás nóminas y facturas pueden continuar. */
const excBloqueaTodo = () => false;
const woBloqueada = wid => excPend().some(x=>x.wo===wid);
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
  <div class="ph"><div><h2>Approval Requests</h2>
    <p>Solicitudes que necesitan que <b>alguien de oficina</b> decida. Cada una frena el pago y la factura de su propia WO — no de las demás.</p></div>
    <div class="act"><button class="btn p" data-a="excNueva">+ New Approval Request</button></div></div>

  ${pend.length
    ? `<div class="note r" style="margin-bottom:14px"><b>${pend.length} Approval Request(s) pending.</b> Cada una frena solo el pago y la factura de su propia WO — el resto de la semana sigue su curso.</div>`
    : `<div class="note v" style="margin-bottom:14px"><b>No pending Approval Requests.</b> Nada frenado por este motivo.</div>`}

  ${pend.length?`<div class="kpis">${Object.entries(porTipo).map(([t,n])=>
    `<div class="kpi"><div class="l">${esc(t)}</div><div class="v w">${n}</div></div>`).join("")}</div>`:""}

  <div class="card"><div class="chd"><h3>Pending Approval Requests</h3><span class="s">assign an owner before anyone starts working it</span></div>
    <div class="act" style="margin:0 0 10px"><button class="btn sm ${filtro==="unassigned"?"p":""}" data-a="excFiltro" data-f="unassigned">Unassigned (${pend.filter(x=>!x.assignedTo).length})</button><button class="btn sm ${filtro==="mine"?"p":""}" data-a="excFiltro" data-f="mine">Mine (${pend.filter(x=>x.assignedTo===S.usuario).length})</button><button class="btn sm ${filtro==="all"?"p":""}" data-a="excFiltro" data-f="all">All (${pend.length})</button></div>
    ${visibles.length?`<table><thead><tr><th>Time</th><th>WO</th><th>Assigned to</th><th>Type</th><th>Reason</th><th>Requested by</th><th>Approve / Reject</th></tr></thead><tbody>
    ${visibles.map(x=>{ const sla=slaApprovalRequest(x); return `<tr class="${fl("exc:"+x.id)}">
      <td class="mono" style="color:${sla&&sla.nivel==="r"?"var(--rojo)":"var(--faint)"}">${x.creada?esc(x.creada.hora):"—"}${sla?`<div><span class="pill ${sla.nivel}" style="margin-top:3px">${esc(sla.texto)}</span></div>`:""}</td>
      <td class="mono">${x.wo?`<b style="cursor:pointer" data-a="woVer" data-id="${x.wo}">WO-${x.wo}</b>`:"—"}</td>
      <td>${x.assignedTo?`<b>${esc(x.assignedTo)}</b><div style="font-size:9.5px;color:var(--faint)">${x.assignedBy?`assigned by ${esc(x.assignedBy)} · ${esc(x.assignedAt||"")}`:""}</div>`:'<span class="pill w">Unassigned</span>'}</td>
      <td><span class="pill ${x.tipo==="Tarifa no encontrada"?"w":x.tipo==="Cierre sin evidencia"?"r":"m"}"><span class="dot"></span>${esc(x.tipo)}</span>
        ${x.auto?'<div style="font-size:9.5px;color:var(--faint);margin-top:2px">detectada por el sistema</div>':""}</td>
      <td style="max-width:340px">${esc(x.motivo)}${historialApproval(x)}</td>
      <td>${esc(x.pide)}</td>
      <td style="text-align:right;white-space:nowrap">
        ${x.assignedTo===S.usuario?"":`<button class="btn sm" data-a="excAsignarYo" data-id="${x.id}">Assign to me</button>`}
        <button class="btn sm" data-a="excAsignarModal" data-id="${x.id}">Assign</button>
        ${(x.assignedTo===S.usuario || x.aprueba===S.usuario) ? (x.tipo==="Unit data mismatch"
          ? `<button class="btn sm p" data-a="excUnidadRevisar" data-id="${x.id}">Review correction</button>`
          : x.tipo==="Tarifa no encontrada"
          ? `<button class="btn sm p" data-a="excTarifa" data-id="${x.id}" data-wo="${x.wo}">Definir tarifa</button>`
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
      <td><span class="pill ${x.estado==="Aprobada"?"v":"r"}">${x.estado}</span>${historialApproval(x)}</td>
      <td>${x.resol?esc(x.resol.quien):"—"}</td><td class="mono">${x.resol?esc(x.resol.hora):"—"}</td></tr>`).join("")}
    </tbody></table></div>`:""}

  <div class="tr">Cada Approval Request guarda quién la pidió y desde cuándo espera; al resolverse, también quién decidió y cuándo. Es lo que hoy se decide por WhatsApp y nadie puede reconstruir después.</div>`;
};

function modalExc(){
  modal(`<div class="mh"><h3>New Approval Request</h3><p>Algo que se sale de la regla y necesita que otra persona lo apruebe.</p></div>
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
        Lo aprobado con precio le queda pendiente de pago al técnico solo; tildá «Cobrar al cliente» aparte, por cada concepto, si además hay que facturárselo — a veces se hace de cortesía.</div>
      <table style="margin-top:6px"><tbody>
      <tr><td></td><td></td><td class="num">Precio</td><td style="text-align:center">Cobrar<br>al cliente</td></tr>
      ${pend.map(l=>`<tr>
        <td style="width:34px"><input type="checkbox" class="adchk" data-lid="${l.id}" checked style="width:16px;height:16px"></td>
        <td><b>${esc(l.concepto)}</b>${(l.cant||1)>1?` <span style="color:var(--faint)">× ${l.cant}</span>`:""}
          ${l.ubic?`<div style="font-size:11.5px;color:var(--faint)">${esc(l.ubic)}</div>`:""}</td>
        <td class="num mono">${l.precio?money(l.precio*(l.cant||1)):"—"}</td>
        <td style="text-align:center">${l.precio?`<input type="checkbox" class="adcobra" data-lid="${l.id}" style="width:16px;height:16px">`:"—"}</td></tr>`).join("")}
      <tr><td></td><td style="color:var(--faint)">Total pedido</td><td class="num mono" style="font-weight:750">${money(tot)}</td><td></td></tr>
      </tbody></table></div>`
    :`<div class="note" style="margin-bottom:12px"><b>${esc(pend[0].concepto)}</b>${(pend[0].cant||1)>1?` × ${pend[0].cant}`:""}
        ${pend[0].precio?` · ${money(pend[0].precio*(pend[0].cant||1))}`:""}${pend[0].ubic?` · ${esc(pend[0].ubic)}`:""}
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

/* ── SUB-WORK ORDERS ──────────────────────────────────────────────────
   Sección 5 del feedback: trabajo que cuelga de una WO principal sin
   perder la relación con ella (Main WO Full Paint → Sub-WO Door paint,
   Sub-WO Garage paint...). Oficina la crea acá ya aprobada — la que
   aprobar es la que descubre el técnico en sitio (fAdic / fAdicOK). */
VIEWS.nomina = () => {
  const ws = S.wos.filter(w=>enPeriodo(w.fecha,S.periodo) && w.estado==="Completed");
  const bloqSemana = ws.filter(w=>!w.pagadaTec && woBloqueada(w.id)).length;
  const pagables = ws.filter(w=>w.validada && !w.pagadaTec && !woBloqueada(w.id)).length;
  const porTec = {};
  ws.forEach(w=>{ if(!w.tec) return; (porTec[w.tec]=porTec[w.tec]||[]).push(w); });
  // Ya no hay "la nómina de la semana" única: se está pagada cuando no queda
  // nada pagable en el período que se está mirando.
  const yaPag = ws.length>0 && pagables===0 && bloqSemana===0;
  return `
  <div class="ph"><div><h2>Nómina — ${periodoTexto(S.periodo)}</h2>
    <p>La pestaña <code>Payroll</code>. Se arma sola con las Work Orders <b>validadas</b> — hoy se rearma a mano.</p></div></div>
  ${renderSelectorPeriodo()}
  ${S.periodo.tipo==="semana"?resumenDosSemanas(S.periodo.sem):""}

  ${S.nomina.length?`<div class="card" style="margin-bottom:14px"><div class="chd"><h3>Historial de nóminas</h3><span class="s">Registro de pagos ya aprobados</span></div>
    <table><thead><tr><th>Período</th><th>Fecha de pago</th><th>Registró</th><th class="num">WO</th><th class="num">Total</th></tr></thead><tbody>
      ${S.nomina.slice().reverse().map(n=>`<tr><td>${esc(periodoTexto(n.periodo||{tipo:"semana",sem:n.semana}))}</td>
        <td class="mono">${esc(n.fecha||"—")} ${esc(n.hora||"")}</td><td>${esc(n.quien||"—")}</td>
        <td class="num mono">${(n.wos||[]).length}</td><td class="num mono" style="font-weight:700">${money(n.total||0)}</td></tr>`).join("")}
    </tbody></table></div>`:""}

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
      <table><thead><tr><th>WO</th><th>Propiedad · Unidad</th><th>Técnico</th><th>Evidencia</th><th>Tiempo en sitio</th><th></th></tr></thead>
      <tbody>${porVal.map(w=>`<tr><td class="mono" style="font-weight:700">WO-${w.id}</td>
        <td>${esc(P(w.prop).nombre)} · ${esc(U(w.unidad).num)}</td><td>${esc(tecN(w.tec))}</td>
        <td>${w.evid?`<span class="pill v">${w.evid}</span>`:'<span class="pill r">falta</span>'}</td>
        <td class="mono" style="color:var(--faint)">${w.horas?w.horas+" h":"—"}</td>
        <td style="text-align:right"><button class="btn sm p" data-a="validarModal" data-id="${w.id}">Revisar y validar</button></td></tr>`).join("")}
      </tbody></table></div>`:"";})()}

  ${bloqSemana?`<div class="note r" style="margin-bottom:14px"><b>${bloqSemana} Work Order(s) with a pending Approval Request.</b>
    No se pagan hasta que se resuelva — un pago adicional o una tarifa sin definir cambian lo que se le debe al técnico. El resto del período se paga igual.
    <button class="btn sm" data-a="ir" data-m="excepciones" style="margin-left:8px">View Approval Requests</button></div>`
   :`<div class="note v" style="margin-bottom:14px"><b>Período listo para pagar.</b> Sin Work Orders frenadas por una Approval Request.</div>`}

  ${Object.keys(porTec).length?Object.entries(porTec).map(([tid,arr])=>{
    const ing=arr.reduce((a,w)=>a+(ingresoWO(w)||0),0);
    const egrBase=arr.reduce((a,w)=>a+(egresoWO(w)||0),0);
    const mat=arr.reduce((a,w)=>a+materialWO(w),0);
    // Punto 10: "se le paga" tiene que incluir los adicionales de Sub-Work
    // Order ya aprobados (S.excepciones) — si no, este número no coincide
    // con el comprobante real que se le da al técnico.
    const extras=extrasAprobadosDeWOs(arr);
    const egr=egrBase+extras.reduce((a,x)=>a+(x.monto||0),0);
    return `<div class="card"><div class="chd"><h3>${esc(tecN(tid))}</h3>
      <span class="s">${arr.length} trabajos</span>
      <span class="r"><span style="font-size:11px;color:var(--faint)">se le paga</span>
        <span class="mono" style="font-size:16px;font-weight:750">${money(egr)}</span>
        <button class="btn sm" data-a="comprobante" data-tec="${tid}">Ver comprobante</button></span></div>
      <table><thead><tr><th>WO</th><th>Propiedad · Unidad</th><th>Servicio</th><th>Rooms</th><th>Floors</th><th>Pagado</th><th class="num">Ingreso</th><th class="num">Egreso</th><th class="num">Material</th>${puedeVerUtilidad()?`<th class="num">Utilidad</th>`:""}</tr></thead>
      <tbody>${arr.map(w=>`<tr><td class="mono" style="font-weight:700">WO-${w.id}</td>
        <td>${esc(P(w.prop).nombre)} · ${esc(U(w.unidad).num)}</td><td>${esc(w.serv)}</td><td>${esc(U(w.unidad).rooms)}</td>
        <td class="num mono">${U(w.unidad).pisos||"—"}</td>
        <td>${w.pagadaTec?'<span class="pill v">✓ sí</span>':woBloqueada(w.id)?'<span class="pill r">approval pending</span>':'<span class="pill g">no</span>'}</td>
        <td class="num mono">${ingresoWO(w)!==null?money(ingresoWO(w)):'<span class="pill w">NA</span>'}</td>
        <td class="num mono">${egresoWO(w)!==null?money(egresoWO(w)):"—"}</td>
        <td class="num mono">${materialWO(w)?money(materialWO(w)):"—"}</td>
        ${puedeVerUtilidad()?`<td class="num mono" style="color:${utilidadWO(w)>=0?"var(--verde)":"var(--rojo)"}">${utilidadWO(w)!==null?money(utilidadWO(w)):"—"}</td>`:""}</tr>`).join("")}
      ${extras.map(x=>`<tr style="background:var(--ambar-cl)"><td colspan="7">Pago adicional aprobado · WO-${x.wo}
          <div style="font-size:10.5px;color:var(--ambar)">${esc((x.motivo||"").slice(0,70))}</div></td>
        <td class="num mono">${money(x.monto)}</td><td></td>${puedeVerUtilidad()?`<td></td>`:""}</tr>`).join("")}
      <tr style="background:var(--surface-2);font-weight:700"><td colspan="6">Totales</td>
        <td class="num mono">${money(ing)}</td><td class="num mono">${money(egr)}</td>
        <td class="num mono">${money(mat)}</td>${puedeVerUtilidad()?`<td class="num mono" style="color:var(--verde)">${money(ing-egr-mat)}</td>`:""}</tr>
      </tbody></table></div>`;
  }).join(""):`<div class="card"><div class="empty">Sin trabajos terminados en este período</div></div>`}

  ${(()=>{ /* Descuentos por devolucion: plata que sale del pago de alguien,
              asi que nunca va sola — siempre con su devolucion y sus fotos.
              Los descuentos se llevan por semana (no por fecha exacta), así
              que esta tarjeta solo tiene sentido mirando el período «Semana». */
    if(S.periodo.tipo!=="semana") return "";
    const ds = S.descuentos.filter(x=>x.semana===S.periodo.sem);
    if(!ds.length) return "";
    return `<div class="card" style="border-color:var(--rojo)">
      <div class="chd" style="background:var(--rojo-cl)"><h3 style="color:var(--rojo)">Descuentos por devolución</h3>
        <span class="s">${ds.length} línea(s) · se descuenta a quien hizo el trabajo que hubo que corregir</span></div>
      <table><thead><tr><th>Técnico</th><th>Motivo</th><th>Devolución</th><th>Touch-up</th>
        <th>Evidencia</th><th class="num">Monto</th></tr></thead>
      <tbody>${ds.map(x=>{ const dv=DV(x.dev);
        return `<tr><td style="font-weight:650">${esc(tecN(x.tec))}</td>
          <td>${esc(x.motivo)}</td>
          <td>${dv?`${esc(P(dv.prop).nombre)} ${U(dv.unidad)?esc(U(dv.unidad).num):""}
                <div style="font-size:10.5px;color:var(--faint)">${esc(dv.desc.slice(0,60))}</div>`:"—"}</td>
          <td class="mono">WO-${x.wo}</td>
          <td>${dv?`<span class="pill m">${(dv.lotesAntes||[]).reduce((t,l)=>t+l.n,0)} foto(s) del antes</span>`:"—"}</td>
          <td class="num mono" style="color:var(--rojo)">−${money(x.monto)}
            ${x.tope?`<div style="font-size:10px;color:var(--faint);font-weight:400">
              la corrección costó ${money(x.montoReal)}<br>se limitó a lo que ganó</div>`:""}</td></tr>`;}).join("")}
      </tbody></table>
      <div class="cp" style="border-top:1px solid var(--line)"><div class="tr" style="margin:0">
        Claudia: <i>«cada unidad tiene a su técnico responsable y él tiene que corregir su trabajo»</i>.
        Si no fue él a corregir, se le paga al que fue y se le descuenta a él el mismo monto.
        El descuento nunca aparece sin la devolución que lo origina.</div></div>
    </div>`;})()}

  ${Object.keys(porTec).length?`<div class="card"><div class="cp" style="display:flex;align-items:center;gap:12px">
    <div><div style="font-size:11px;color:var(--faint);text-transform:uppercase;letter-spacing:.05em">Total a pagar — ${periodoTexto(S.periodo)}</div>
      ${(()=>{ /* El neto se calcula POR TECNICO y nunca baja de cero: a nadie
             se le puede cobrar de vuelta, y el total no puede salir negativo.
             Los descuentos por devolución se llevan por semana — fuera del
             período «Semana» se muestra el bruto, sin netear. */
        const bruto=ws.reduce((a,w)=>a+(egresoWO(w)||0),0);
        if(S.periodo.tipo!=="semana") return `<div class="mono" style="font-size:24px;font-weight:750">${money(bruto)}</div>`;
        const tecs=[...new Set(ws.map(w=>w.tec).filter(Boolean))];
        let neto=0, aplicado=0;
        tecs.forEach(t=>{
          const b=ws.filter(w=>w.tec===t).reduce((a,w)=>a+(egresoWO(w)||0),0);
          const dd=totalDesc(t,S.periodo.sem);
          neto += Math.max(0, b-dd);
          aplicado += Math.min(b, dd);
        });
        const total=S.descuentos.filter(x=>x.semana===S.periodo.sem).reduce((a,x)=>a+x.monto,0);
        const sinAplicar = total - aplicado;
        return total
          ? `<div class="mono" style="font-size:24px;font-weight:750">${money(neto)}</div>
             <div style="font-size:11px;color:var(--faint)">${money(bruto)} menos ${money(aplicado)} de descuentos</div>
             ${sinAplicar>0.009?`<div style="font-size:11px;color:var(--rojo);margin-top:2px">
               ${money(sinAplicar)} no se pudo descontar: supera lo que ganó esta semana — queda como Approval Request</div>`:""}`
          : `<div class="mono" style="font-size:24px;font-weight:750">${money(bruto)}</div>`;})()}</div>
    <button class="btn ${!pagables||yaPag?"":"v"}" data-a="pagarSemana" style="margin-left:auto" ${!pagables||yaPag?"disabled":""}>
      ${yaPag?"Semana ya pagada":pagables?"Aprobar y marcar como pagada":"Nada pagable — todo frenado por Approval Requests"}</button>
  </div></div>`:""}
  <div class="tr">Erika: «todo lo que está en la semana 29 tiene que pagarse este viernes». El sistema agrupa por la misma semana con la que ya filtran.</div>`;
};

/* ── FACTURACIÓN ── */
VIEWS.facturacion = () => {
  /* Una unidad mandada a corregir no se le cobra al cliente hasta que
     Gustavo verifique. Y el touch-up jamas se factura: es costo de la casa.
     Reunión Claudia (feedback prototipo): mismo período que Nómina — antes
     esto mostraba TODO lo listo sin importar la fecha, ahora se puede acotar. */
  const candidatas = S.wos.filter(w=>enPeriodo(w.fecha,S.periodo) && w.estado==="Completed" && w.supervisada && w.validada
                                     && !w.facturada && puedeFacturar(w));
  const listas = candidatas.filter(w=>!woBloqueada(w.id));
  const frenadasExc = candidatas.filter(w=>woBloqueada(w.id));
  const frenadas = S.wos.filter(w=>enPeriodo(w.fecha,S.periodo) && w.estado==="Completed" && !w.facturada && bloqueadaPorDev(w));
  const porProp = {};
  listas.forEach(w=>(porProp[w.prop]=porProp[w.prop]||[]).push(w));
  return `
  <div class="ph"><div><h2>Facturación — ${periodoTexto(S.periodo)}</h2>
    <p>De Work Orders terminadas a factura, sin volver a escribir nada. El número y el vencimiento se calculan.</p></div></div>
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
    <b>${frenadasExc.length} Work Order(s) no se pueden facturar: tienen una Approval Request pendiente.</b><br>
    Facturar con una tarifa sin definir, o con un adicional todavía sin decidir, es facturar mal. El resto de cada propiedad se puede facturar igual.
    <div style="margin-top:6px;font-size:11.5px">
      ${frenadasExc.map(w=>`WO-${w.id} · ${esc(P(w.prop).nombre)} ${U(w.unidad)?esc(U(w.unidad).num):""}`).join("<br>")}</div>
    <button class="btn sm" data-a="ir" data-m="excepciones" style="margin-top:7px">View Approval Requests</button></div>`:""}

  ${Object.keys(porProp).length?Object.entries(porProp).map(([pid,arr])=>{
    const tot=arr.reduce((a,w)=>a+(ingresoWO(w)||0),0);
    const sinT=arr.filter(w=>ingresoWO(w)===null).length;
    return `<div class="card"><div class="chd"><h3>${esc(P(pid).nombre)}</h3><span class="s">${esc(CLI(P(pid).cliente).nombre)}</span>
      <span class="r"><span class="mono" style="font-size:16px;font-weight:750">${money(tot)}</span></span></div>
      <table><thead><tr><th>WO</th><th>Unidad</th><th>Servicio</th><th>Técnico</th><th>Evidencia</th><th class="num">Importe</th></tr></thead>
      <tbody>${arr.map(w=>`<tr><td class="mono" style="font-weight:700">WO-${w.id}</td><td>${esc(U(w.unidad).num)}</td>
        <td>${esc(w.serv)}</td><td>${w.tec?esc(tecN(w.tec)):"—"}</td>
        <td>${w.evid?`<span class="pill v">${w.evid} foto(s)</span>`:'<span class="pill r"><span class="dot"></span>sin evidencia</span>'}</td>
        <td class="num mono">${ingresoWO(w)!==null?money(ingresoWO(w)):'<span class="pill w">NA</span>'}</td></tr>`).join("")}
      </tbody></table>
      ${sinT?`<div class="cp" style="border-top:1px solid var(--line)"><div class="note w" style="margin:0"><b>${sinT} línea sin tarifa.</b> Resuélvela en Approval Requests antes de facturar.</div></div>`:""}
      <div class="mf" style="border-top:1px solid var(--line)">
        <button class="btn ${sinT?"":"p"}" data-a="facturar" data-prop="${pid}" ${sinT?"disabled":""}>Generar factura</button></div>
    </div>`;
  }).join(""):`<div class="card"><div class="empty">Nada por facturar</div></div>`}

  ${S.facturas.length?`<div class="card"><div class="chd"><h3>Facturas emitidas</h3></div>
    <table><thead><tr><th>Número</th><th>Propiedad</th><th class="num">Líneas</th><th>Emisión</th><th>Vence</th><th>Estado</th><th class="num">Total</th><th></th></tr></thead>
    <tbody>${S.facturas.map(f=>`<tr class="${fl("fac:"+f.id)}"><td class="mono" style="font-weight:700">${esc(f.num)}</td><td>${esc(P(f.prop).nombre)}</td>
      <td class="num mono">${f.lineas.length}</td><td class="mono">${f.emision}</td><td class="mono">${f.vence}</td>
      <td><span class="pill ${f.estado==="Pagada"?"v":facVencida(f)?"r":f.estado==="Emitida"?"g":"a"}">${esc(facEstadoTexto(f))}</span></td>
      <td class="num mono" style="font-weight:700">${money(f.total)}</td>
      <td style="text-align:right;white-space:nowrap">
        <button class="btn sm" data-a="facPDF" data-id="${f.id}">Ver PDF</button>
        <button class="btn sm" data-a="facDescargar" data-id="${f.id}">Descargar</button>
        ${f.estado==="Emitida"
          ? `<button class="btn sm p" data-a="facEnviar" data-id="${f.id}">Enviar al cliente</button>`
          : `<button class="btn sm" data-a="facVer" data-id="${f.id}">Detalle</button>`}
        ${f.pdf?`<div style="font-size:10px;color:var(--faint);margin-top:3px">📎 ${esc(f.pdf)} · guardado ${esc(f.pdfHora||"")}</div>`:""}
      </td></tr>`).join("")}
    </tbody></table></div>`:""}`;
};

/* UC-17 — «eso también para saber hacer las facturas y enviarlas» */
/* ── EL PDF DE LA FACTURA ─────────────────────────────────
   Abre el documento en una ventana aparte y lanza la impresión: el navegador
   lo guarda como PDF de verdad. No es una simulación — el archivo que sale es
   el que se le manda al manager. */
function abrirPDF(fid, imprimir){
  const f = by(S.facturas, fid); if(!f) return;
  const p = P(f.prop), c = CLI(p.cliente);
  const ws = f.lineas.map(id => W(id)).filter(Boolean);
  const filas = ws.map(w => `<tr>
      <td class="m">WO-${w.id}</td>
      <td>${esc(U(w.unidad) ? U(w.unidad).num : "\u2014")}</td>
      <td>${esc(w.serv)}<div class="s">${esc(w.cat)} \u00b7 ${esc(w.fecha)}</div></td>
      <td class="n m">${money(ingresoWO(w) || 0)}</td></tr>`).join("");

  const doc = `<!doctype html><html lang="es"><head><meta charset="utf-8">
    <title>${esc(f.num)}</title>
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
        <div class="sub">Emitida ${esc(f.emision)}<br>Vence ${esc(f.vence)}</div></div>
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
      Cada l\u00ednea corresponde a una Work Order con su evidencia fotogr\u00e1fica archivada.<br>
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
  const ws=f.lineas.map(id=>W(id)).filter(Boolean);
  modal(`<div class="mh"><h3>Factura ${esc(f.num)}</h3><p>${esc(p.nombre)} · ${esc(c.nombre)}</p></div>
  <div class="mb">
    <div style="border:1px solid var(--line);border-radius:10px;overflow:hidden">
      <div style="background:var(--azul);color:#fff;padding:13px 15px;display:flex;align-items:center;gap:10px">
        <div style="width:30px;height:30px;border-radius:7px;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px">CPS</div>
        <div><div style="font-weight:750">Cordova Property Services</div>
          <div style="font-size:11px;opacity:.85">${esc(f.num)} · emitida ${esc(f.emision)} · vence ${esc(f.vence)}</div></div>
        <div style="margin-left:auto;text-align:right"><div style="font-size:10.5px;opacity:.85">Total</div>
          <div class="mono" style="font-size:20px;font-weight:750">${money(f.total)}</div></div></div>
      <table><thead><tr><th>WO</th><th>Unidad</th><th>Servicio</th><th>Evidencia</th><th class="num">Importe</th></tr></thead>
      <tbody>${ws.map(w=>`<tr><td class="mono">WO-${w.id}</td><td>${esc(U(w.unidad).num)}</td>
        <td>${esc(w.serv)}</td>
        <td>${w.evid?`<span class="pill v">${w.evid} foto(s)</span>`:'<span class="pill w">—</span>'}</td>
        <td class="num mono">${money(ingresoWO(w)||0)}</td></tr>`).join("")}
      <tr style="background:var(--surface-2);font-weight:750"><td colspan="4">Total</td>
        <td class="num mono" style="font-size:15px">${money(f.total)}</td></tr></tbody></table></div>
    ${enviando?`<div class="fld" style="margin-top:13px"><label>Se envía a</label>
      <input id="facMail" value="${esc(c.mail||"")}"></div>
      <div class="note">Va con el PDF y el detalle por Work Order. Si el cliente reclama una línea, cada una tiene su evidencia detrás.</div>`
     :`<div class="note" style="margin-top:12px"><b>Enviada el ${esc(f.envio||f.emision)}</b> a ${esc(c.mail||"—")}.</div>`}
  </div>
  <div class="mf"><button class="btn" data-a="cm">Cerrar</button>
    ${enviando?`<button class="btn p" data-a="facEnviarOK" data-id="${fid}">Enviar factura</button>`:""}</div>`,true);
}

/* ── COBRANZA ──────────────────────────────────────────────
   Su flujograma "Proceso de Cobranza y Cierre de Proyectos" pide una escalera:
   ¿pagada? → ¿+30 días? → Enviar Reminder → ¿sigue vencida? → Correo Overdue →
   Llamada → Registrar Respuesta → ¿pago recibido? → Cerrar Invoice/WO/Proyecto.
   Antes solo existía el extremo final (Registrar pago) y el estado "Vencida"
   nunca se calculaba de verdad — quedaba escrito en los filtros pero nada lo
   encendía. facVencida() lo calcula en vivo, igual que devVencida(). */
const facVencida = f => f.estado!=="Pagada" && f.vence < HOY_SUP;
const facEstadoTexto = f => f.estado==="Pagada" ? "Pagada" : facVencida(f) ? "Vencida" : f.estado;
const SEG_LABEL = {reminder:"Reminder enviado", overdue:"Correo overdue enviado",
  llamada:"Llamada de cobranza", pago:"Pago registrado", cierre:"Invoice y Work Orders cerrados"};

VIEWS.cobranza = () => {
  const abiertas=S.facturas.filter(f=>f.estado!=="Pagada");
  const vencidas=S.facturas.filter(facVencida);
  return `
  <div class="ph"><div><h2>Cobranza</h2><p>Pasados 30 días sin pago, queda «Vencida» y arranca la escalera: reminder → correo overdue → llamada.</p></div></div>
  <div class="kpis">
    <div class="kpi"><div class="l">Por cobrar</div><div class="v mono">${money(abiertas.reduce((a,f)=>a+f.total,0))}</div></div>
    <div class="kpi"><div class="l">Facturas abiertas</div><div class="v">${abiertas.length}</div></div>
    <div class="kpi"><div class="l">Vencidas</div><div class="v ${vencidas.length?"b":""}">${vencidas.length}</div></div>
    <div class="kpi"><div class="l">Cobrado</div><div class="v g mono">${money(S.facturas.filter(f=>f.estado==="Pagada").reduce((a,f)=>a+f.total,0))}</div></div>
  </div>
  <div class="card">${S.facturas.length?`<table>
    <thead><tr><th>Número</th><th>Propiedad</th><th>Emisión</th><th>Vence</th><th>Estado</th><th class="num">Total</th><th></th></tr></thead>
    <tbody>${S.facturas.map(f=>`<tr class="${fl("fac:"+f.id)}"><td class="mono" style="font-weight:700">${esc(f.num)}</td><td>${esc(P(f.prop).nombre)}</td>
      <td class="mono">${f.emision}</td><td class="mono">${f.vence}</td>
      <td><span class="pill ${f.estado==="Pagada"?"v":facVencida(f)?"r":"a"}">${esc(facEstadoTexto(f))}</span></td>
      <td class="num mono">${money(f.total)}</td>
      <td style="text-align:right;white-space:nowrap">
        <button class="btn sm" data-a="facPDF" data-id="${f.id}">Ver PDF</button>
        ${f.estado!=="Pagada"?`<button class="btn sm" data-a="cobGestionar" data-id="${f.id}">Gestionar cobranza</button>`:""}</td></tr>`).join("")}
    </tbody></table>`:`<div class="empty">Todavía no hay facturas emitidas</div>`}</div>`;
};

/* Modal de seguimiento — reemplaza el botón suelto "Registrar pago": ahora
   cada paso de la escalera queda en S.facturas[].seguimiento, con quién y
   cuándo, igual que el resto de historiales de la app. */
function modalCobranza(fid){
  const f=by(S.facturas,fid), p=P(f.prop);
  const seg=f.seguimiento||[];
  const venc=facVencida(f);
  const tieneReminder=seg.some(s=>s.tipo==="reminder");
  const tieneOverdue =seg.some(s=>s.tipo==="overdue");
  modal(`<div class="mh"><h3>Cobranza — ${esc(f.num)}</h3><p>${esc(p.nombre)} · ${money(f.total)} · vence ${esc(f.vence)}</p></div>
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

/* ── INVENTARIO ── */
VIEWS.inventario = () => `
  <div class="ph"><div><h2>Inventario de materiales</h2>
    <p>Hoy solo existe <code>Sheet13</code> con dos filas sueltas. El stock nunca se edita: es la suma de entradas menos salidas.</p></div>
    <div class="act"><button class="btn" data-a="movSalida">Registrar salida</button><button class="btn p" data-a="movEntrada">+ Registrar compra</button></div></div>
  <div class="card"><div class="chd"><h3>Productos</h3></div><table>
    <thead><tr><th>Producto</th><th>Categoría</th><th>Unidad</th><th class="num">Stock</th><th class="num">Mínimo</th><th>Estado</th><th class="num">Costo ref.</th></tr></thead>
    <tbody>${S.productos.map(p=>{const s=stock(p.id);return `<tr>
      <td style="font-weight:650">${esc(p.nombre)}</td><td>${esc(p.cat)}</td><td>${esc(p.um)}</td>
      <td class="num mono" style="font-weight:700">${s}</td><td class="num mono">${p.min}</td>
      <td>${s<p.min?'<span class="pill r"><span class="dot"></span>Stock bajo</span>':'<span class="pill v">OK</span>'}</td>
      <td class="num mono">${money(p.costo)}</td></tr>`;}).join("")}</tbody></table></div>
  <div class="card"><div class="chd"><h3>Movimientos</h3><span class="s">cada uno con quién lo registró</span></div>
    <table><thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th class="num">Cant.</th><th>Work Order</th><th>Tienda</th><th>Quién</th><th class="num">Costo</th></tr></thead>
    <tbody>${S.movs.slice().reverse().map(m=>`<tr class="${fl("mov:"+m.id)}"><td class="mono">${m.fecha.slice(5)}</td>
      <td>${esc(by(S.productos,m.prod).nombre)}</td>
      <td><span class="pill ${m.tipo==="entrada"?"v":"w"}">${m.tipo}</span></td>
      <td class="num mono">${m.cant}</td><td class="mono">${m.wo?`WO-${m.wo}`:"—"}</td>
      <td>${esc(m.tienda)||"—"}</td><td>${esc(m.quien)}</td><td class="num mono">${money(m.costo)}</td></tr>`).join("")}
    </tbody></table></div>`;

/* ── SUPERVISIÓN — el panel de Gustavo (UC-12, UC-12b, UC-04b) ── */
