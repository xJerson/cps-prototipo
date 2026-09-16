"use strict";
VIEWS.wo = () => {
  if(S.sub) return fichaWO(S.sub);
  const f = S.tab||"todas";
  let ws = S.wos.slice().sort((a,b)=>b.id-a.id);
  if(f==="semana") ws = ws.filter(w=>w.semana===S.semana);
  if(f==="sin") ws = ws.filter(w=>!w.tec);
  if(f==="curso") ws = ws.filter(w=>["In progress","Esperando aprobación"].includes(w.estado));
  if(f==="camino") ws = ws.filter(w=>w.tec && esAgendada(w.estado) && !asisDe(w.id));
  // «luego preguntan de unidades de hace dos meses, qué se hizo, qué pasó»
  // El identificador se compara también normalizado (sin guiones ni espacios)
  // para que "B102", "B 102" y "B-102" encuentren la misma unidad.
  if(S.busca){ const q=S.busca.toLowerCase(), qn=uNorm(S.busca);
    ws = ws.filter(w=>{
      const un=U(w.unidad);
      const txt=(un.num+" "+P(w.prop).nombre+" "+w.serv+" "+w.id).toLowerCase();
      return txt.includes(q) || (qn && uNorm(un.num).includes(qn)); }); }
  return `
  <div class="ph"><div><h2>Work Orders</h2><p>La pestaña <code>Schedule</code>, con los mismos campos — pero el técnico y la propiedad se eligen, no se escriben.</p></div>
    <div class="act">
      <input id="woBuscar" value="${esc(S.busca||"")}" placeholder="Buscar unidad, propiedad o WO…"
        style="font-family:inherit;font-size:12.5px;padding:7px 10px;border:1px solid var(--line);border-radius:7px;background:var(--surface);color:var(--ink);width:220px">
      <button class="btn" data-a="buscarUni">Buscar</button>
      <button class="btn p" data-a="woNueva">+ Nueva Work Order</button></div></div>
  ${S.busca?`<div class="note" style="margin-bottom:12px"><b>Buscando «${esc(S.busca)}»</b> — para cuando un manager pregunta qué se hizo en una unidad hace dos meses.
    <button class="btn sm" data-a="buscarLimpiar" style="margin-left:8px">Limpiar</button></div>`:""}

  ${S.solicitudes.filter(x=>x.estado==="Pendiente").length?`
  <div class="card" style="border-color:var(--azul)"><div class="chd" style="background:var(--azul-cl)">
    <h3 style="color:var(--azul-s)">Solicitudes que llegaron de Comercial</h3>
    <span class="s">llegaron con todo capturado — sin llamada y sin volver a escribir los datos</span></div>
    <table><thead><tr><th>Propiedad</th><th>Cliente</th><th>Quién la pasó</th><th>Nota</th><th></th></tr></thead><tbody>
    ${S.solicitudes.filter(x=>x.estado==="Pendiente").map(s=>`<tr class="${fl("sol:"+s.id)}">
      <td style="font-weight:650">${esc(P(s.prop).nombre)}<div style="font-size:10.5px;color:var(--faint)">${esc(P(s.prop).zona)} · ${esc(P(s.prop).dir)}</div></td>
      <td>${esc(CLI(s.cliente).nombre)}</td><td>${esc(s.quien)} · ${esc(s.hora)}</td>
      <td style="font-size:11.5px;color:var(--soft)">${esc(s.nota)||"—"}${s.lineas&&s.lineas.length?` <span class="pill m">${s.lineas.length} línea(s) ya cotizadas</span>`:""}</td>
      <td style="text-align:right"><button class="btn sm p" data-a="solProgramar" data-id="${s.id}">Programar</button></td></tr>`).join("")}
    </tbody></table></div>`:""}

  <div class="tabs">
    ${[["todas","Todas"],["semana","Semana "+S.semana],["sin","Sin técnico"],["camino","Asignadas sin llegar"],["curso","En curso"]].map(([k,n])=>
      `<button class="tab ${f===k?"on":""}" data-a="tab" data-t="${k}">${n}</button>`).join("")}
  </div>
  <div class="card"><table>
    <thead><tr><th>WO</th><th>Fecha</th><th>Hora</th><th>Sem</th><th>Propiedad · Unidad</th><th>Rooms</th><th>Tipo</th><th>Servicio</th><th>Técnico</th><th>Llegada</th><th>Estado</th><th class="num">Ingreso</th></tr></thead>
    <tbody>${ws.map(w=>{
      const t=tarifaWO(w);
      return `<tr class="cl${fl("wo:"+w.id)}" data-a="woVer" data-id="${w.id}">
        <td class="mono" style="font-weight:700">WO-${w.id}</td>
        <td class="mono">${w.fecha.slice(5)}</td><td class="mono">${esc(w.horaProg||"9:00")}</td><td class="mono">${w.semana}</td>
        <td>${esc(P(w.prop).nombre)} · ${esc(U(w.unidad).num)}</td>
        <td>${esc(U(w.unidad).rooms)}</td>
        <td><span class="pill g">${esc(w.cat)}</span></td>
        <td>${esc(w.serv)}</td>
        <td>${w.tec?esc(tecN(w.tec)):'<span class="pill w">sin asignar</span>'}</td>
        <td>${asisDe(w.id)?`<span class="pill ${asisDe(w.id).puntualidad==="Tarde"?"w":"v"}"><span class="dot"></span>${esc(asisDe(w.id).horaReal)}</span>`:'<span style="color:var(--faint)">—</span>'}</td>
        <td><div style="display:flex;flex-direction:column;align-items:flex-start;gap:3px">
          <span class="pill ${estP(w.estado)}"><span class="dot"></span>${w.estado}</span>
          ${w.reagendada?`<span class="pill w" title="${esc(w.motivoReag||"Se movió de fecha")}"><span class="dot"></span>Reagendada${w.reagendada>1?" · "+w.reagendada+"x":""}</span>`:""}
          ${fechaSinConfirmar(w)?`<span class="pill w" title="Se le propuso una fecha al cliente y todavía no la confirmó"><span class="dot"></span>Sin confirmar</span>`:""}
          ${bloqueadaPorDev(w)?`<span class="pill r" title="${esc(devAbiertaDeWO(w.id).area)}: ${esc(devAbiertaDeWO(w.id).desc)}"><span class="dot"></span>Devolución abierta</span>`:""}
        </div></td>
        <td class="num mono">${t?money(t.precio):'<span class="pill w">NA</span>'}</td></tr>`;
    }).join("")||`<tr><td colspan="12" class="empty">Nada aquí</td></tr>`}</tbody>
  </table></div>`;
};

function fichaWO(id){
  const w=W(id), p=P(w.prop), u=U(w.unidad), t=tarifaWO(w);
  const ads=S.adicionales.filter(a=>a.wo===id), sols=solsDe(id);
  const mv=S.movs.filter(m=>m.wo===id);
  return `
  <div class="ph"><div>
    <button class="btn sm" data-a="ir" data-m="wo" style="margin-bottom:7px">‹ Work Orders</button>
    <h2>WO-${w.id} · ${esc(p.nombre)} ${esc(u.num)}</h2>
    <p>${esc(w.cat)} → ${esc(w.serv)} · ${esc(u.rooms)} · ${w.fecha} ·
      <a href="#" data-a="verEnAgenda" data-id="${w.id}" style="color:var(--azul);font-weight:650">semana ${w.semana} — ver en la agenda</a></p></div>
    <div class="act">
      ${woEditable(w)?`<button class="btn" data-a="woEditar" data-id="${w.id}">Editar datos</button>`:""}
      ${!["Completed","Canceled","Invoiced","Paid"].includes(w.estado)
        ?`<button class="btn ${w.confirmCliente?"":"p"}" data-a="progCliente" data-id="${w.id}">
            ${w.confirmCliente?"Ver coordinación con el cliente":"Programar con el cliente"}</button>`:""}
      ${!w.tec?`<button class="btn ${w.confirmCliente?"p":""}" data-a="asigModal" data-id="${w.id}">Asignar técnico</button>`:""}
      ${w.estado==="Completed"&&!w.supervisada?`<button class="btn v" data-a="supervisar" data-id="${w.id}">Aprobar supervisión</button>`:""}
      ${w.tec && !["Canceled","Invoiced","Paid"].includes(w.estado)
        ?`<button class="btn" data-a="woReasignar" data-id="${w.id}">Reasignar técnico</button>`:""}
      ${w.tec && !["Canceled","Invoiced","Paid","Completed"].includes(w.estado)
        ?`<button class="btn ${((esAgendada(w.estado)&&!asisDe(w.id))||w.infoPedida)?"pulso p":""}" data-a="verWoEnCel" data-id="${w.id}">📱 Ver en el celular de ${esc(T(w.tec)?T(w.tec).nombre:"el técnico")}</button>`:""}
      ${["In progress","Esperando aprobación"].includes(w.estado)
        ?`<button class="btn" data-a="woAvance" data-id="${w.id}">Registrar avance${w.avance?` (${w.avance}%)`:""}</button>`:""}
      ${["In progress","Esperando aprobación"].includes(w.estado)
        ?`<button class="btn" data-a="woDetener" data-id="${w.id}">Detener trabajo</button>`:""}
      ${w.estado==="Detenido"
        ?`<button class="btn v" data-a="woReanudar" data-id="${w.id}">Reanudar trabajo</button>`:""}
    </div></div>
  <div style="display:grid;grid-template-columns:1fr 330px;gap:14px;align-items:start">
    <div>
      <div class="card"><div class="chd"><h3>Datos del trabajo</h3>
        <span class="r"><span class="pill ${estP(w.estado)}"><span class="dot"></span>${w.estado}</span>
          ${w.reagendada?`<span class="pill w" style="margin-left:5px" title="${esc(w.motivoReag||"")}">↻ reagendada${w.reagendada>1?" "+w.reagendada+"x":""}</span>`:""}
          ${fechaSinConfirmar(w)?`<span class="pill w" style="margin-left:5px" title="Se le propuso una fecha al cliente y todavía no la confirmó">⏳ fecha sin confirmar</span>`:""}
          ${bloqueadaPorDev(w)?`<span class="pill r" style="margin-left:5px">⚠ devolución abierta</span>`:""}</span></div>
        ${(()=>{ const d=devAbiertaDeWO(w.id); if(!d) return "";
          const tu=touchupDe(d.id);
          return `<div class="cp" style="border-top:1px solid var(--line)"><div class="note r" style="margin:0">
            <b>Esta Work Order tiene una devolución abierta</b> — ${esc(d.area)}: ${esc(d.desc)}.
            ${tu?`Ya tiene un touch-up de corrección: <b>WO-${tu.id}</b> con ${esc(tecN(tu.tec))}.`
                :`Todavía no se le creó un touch-up de corrección.`}
            No se puede facturar mientras siga así.
            <button class="btn sm" style="margin-top:6px" data-a="ir" data-m="supervision">Ver devolución</button></div></div>`;
        })()}
        <table><tbody>
          <tr><td style="color:var(--faint);width:170px">Propiedad</td><td>${esc(p.nombre)} · ${esc(p.zona)}</td></tr>
          <tr><td style="color:var(--faint)">Dirección</td><td>${esc(p.dir)}</td></tr>
          <tr><td style="color:var(--faint)">Unidad · Rooms · Pisos</td><td>${esc(u.num)} · ${esc(u.rooms)} · ${u.pisos}</td></tr>
          <tr><td style="color:var(--faint)">Ubicación del trabajo</td><td>${w.ubic?esc(w.ubic):'<span class="pill w">sin especificar</span>'}</td></tr>
          <tr><td style="color:var(--faint)">Código de puerta</td><td class="mono">${esc(p.door)}</td></tr>
          <tr><td style="color:var(--faint)">Técnico</td><td>${w.tec?esc(tecN(w.tec)):'<span class="pill w">sin asignar</span>'}</td></tr>
          <tr><td style="color:var(--faint)">Tiempo en sitio</td><td class="mono">${w.horas?w.horas+" h":"—"}<span style="color:var(--faint);font-weight:400"> · no afecta el pago</span></td></tr>
          <tr><td style="color:var(--faint)">Cantidad</td><td class="mono">${w.cant||1}${(w.cant||1)>1&&t?` × ${money(t.precio)} = ${money(ingresoWO(w))}`:""}</td></tr>
          <tr><td style="color:var(--faint)">PO</td><td class="mono">${esc(w.po)||"—"}</td></tr>
          <tr><td style="color:var(--faint)">Asistencia</td><td>${w.asistencia?'<span class="pill v">Sí</span>':'<span class="pill g">No registrada</span>'}</td></tr>
          <tr><td style="color:var(--faint)">Notas al técnico</td><td>${esc(w.notasTec)||"—"}</td></tr>
          <tr><td style="color:var(--faint)">Qué hizo el técnico</td><td>${esc(w.notas)||'<span style="color:var(--faint)">sin describir</span>'}</td></tr>
        </tbody></table></div>

      <div class="card"><div class="chd"><h3>Sub-Work Orders</h3>
        <span class="s">trabajos que cuelgan de esta WO — de oficina o encontrados en sitio</span></div>
        ${sols.length?`<table><thead><tr><th>Tipo</th><th>Origen</th><th>Ubicación</th><th class="num">Cant.</th><th class="num">P. unit.</th><th class="num">Importe</th><th>Estado</th><th>Fotos</th></tr></thead><tbody>
        ${sols.map(s=>`
          <tr><td colspan="8" style="background:var(--azul-cl);color:var(--azul-s)">
            <b>${s.origen==="Planificada"?"Sub-Work Order planificada":"Un solo aviso del técnico"}</b>${s.desc?" · "+esc(s.desc):""}</td></tr>
          ${s.lineas.map(a=>`<tr><td><b>${esc(a.concepto)}</b></td><td><span class="pill ${a.origen==="Planificada"?"a":"m"}">${esc(a.origen||"Técnico")}</span></td><td>${esc(a.ubic)}</td>
            <td class="num mono">${a.cant||1}</td>
            <td class="num mono">${a.precio?money(a.precio):"—"}</td>
            <td class="num mono">${a.precio?money(a.precio*(a.cant||1)):"—"}</td>
            <td><span class="pill ${a.estado==="Aprobado"?"v":a.estado==="Rechazado"?"r":"w"}">${a.estado}</span></td>
            <td><div style="display:flex;gap:4px"><button class="btn sm" title="Fotos de referencia" data-a="subwoFotoRef" data-id="${a.id}">📷 Ref ${(a.fotosRefArr||[]).length}</button>
              <button class="btn sm" title="Fotos de evidencia" data-a="subwoFotoEvid" data-id="${a.id}">📷 Evid ${(a.fotosEvidArr||[]).length}</button></div></td></tr>
            ${(a.specs&&Object.keys(a.specs).length)||a.tec||a.fecha||(a.aprob&&a.aprob.foto)?`<tr><td colspan="8" style="padding-top:0;padding-bottom:9px">
              <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
                ${Object.entries(a.specs||{}).map(([k,v])=>`<span class="pill">${esc(k)}: ${esc(v)}</span>`).join("")}
                ${a.tec?`<span class="pill w">Técnico distinto: ${esc(tecN(a.tec))}</span>`:""}
                ${a.fecha?`<span class="pill w">Fecha distinta: ${esc(a.fecha)}</span>`:""}
                ${a.aprob&&a.aprob.foto?`<a href="${a.aprob.foto}" target="_blank" style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--azul)">
                  <img src="${a.aprob.foto}" style="width:28px;height:28px;object-fit:cover;border-radius:5px">Comprobante de la aprobación</a>`:""}
              </div></td></tr>`:""}`).join("")}
          ${s.lineas.length>1?`<tr><td colspan="5" style="color:var(--faint)">Aprobado de esta solicitud</td>
            <td class="num mono" style="font-weight:750">${money(s.lineas.filter(l=>l.estado==="Aprobado").reduce((t,l)=>t+(l.precio||0)*(l.cant||1),0))}</td>
            <td colspan="2"></td></tr>`:""}`).join("")}
        </tbody></table>`:""}
        <div class="cp">
          ${sols.length?"":`<div style="color:var(--faint);font-size:12px;margin-bottom:8px">Todavía no tiene ninguna Sub-Work Order.</div>`}
          <button class="btn sm p" data-a="subwoNueva" data-id="${w.id}">+ Nueva Sub-Work Order</button>
        </div></div>

      ${trazaWO(w)}

      <div class="card"><div class="chd"><h3>Historial</h3><span class="s">quién hizo qué y cuándo</span></div>
        <table><tbody>${w.hist.map(h=>`<tr><td class="mono" style="width:60px;color:var(--faint)">${h[0]}</td><td>${esc(h[1])}</td><td style="color:var(--faint);width:110px">${esc(h[2])}</td></tr>`).join("")}</tbody></table></div>
    </div>

    <div>
      <div class="card"><div class="chd"><h3>Dinero</h3></div><div class="cp">
        ${t?`<div style="display:flex;justify-content:space-between;padding:5px 0"><span style="color:var(--soft)">Ingreso</span><span class="mono" style="font-weight:700">${money(t.precio)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:5px 0"><span style="color:var(--soft)">Egreso (técnico)</span><span class="mono">${money(t.pago)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:5px 0"><span style="color:var(--soft)">Material</span><span class="mono">${money(materialWO(w))}</span></div>
        ${puedeVerUtilidad()?`<div style="display:flex;justify-content:space-between;padding:9px 0 0;margin-top:6px;border-top:1px solid var(--line)">
          <span style="font-weight:700">Utilidad</span><span class="mono" style="font-weight:750;color:var(--verde)">${money(utilidadWO(w))}</span></div>`:""}
        <div class="tr">Tarifa nivel <b>${t.nivel}</b> para ${esc(u.rooms)}. No se teclea: sale del tarifario.</div>`
        :`<div class="note w"><b>Sin tarifa.</b> No hay precio para ${esc(w.serv)} · ${esc(u.rooms)}${w.prop?" en "+esc(p.nombre):""}. Hoy esto sale como «NA».</div>`}
      </div></div>

      <div class="card"><div class="chd"><h3>Evidencia</h3><span class="r"><span class="pill ${w.evid?"v":"w"}">${w.evid}</span></span></div>
        <div class="cp">${w.evid?`<div style="display:flex;gap:6px;flex-wrap:wrap">${fotosConRelleno(w.evidFotos,w.evid).map(f=>f.url
            ?`<a href="${f.url}" target="_blank"><img src="${f.url}" style="width:72px;height:54px;object-fit:cover;border-radius:7px;border:1px solid var(--line)"></a>`
            :`<div title="Foto de una versión anterior del prototipo, sin archivo real" style="width:72px;height:54px;border-radius:7px;background:linear-gradient(135deg,#7fa8c9,#2d5a80)"></div>`).join("")}</div>`
          :`<div style="color:var(--faint);font-size:12px">Todavía sin fotos del trabajo.</div>`}
          <button class="btn sm" style="margin-top:8px" data-a="fotoVer" data-tipo="woEvid" data-id="${w.id}">📷 ${w.evid?"Ver / agregar fotos":"Agregar foto"}</button></div></div>

      <div class="card"><div class="chd"><h3>Fotos de referencia</h3>
        <span class="s">estado inicial y trabajo solicitado — Work to Be Performed</span></div>
        <div class="cp">${(w.fotosPrevias||[]).length?`<div style="display:flex;gap:6px;flex-wrap:wrap">${w.fotosPrevias.map(f=>
            `<a href="${f.url}" target="_blank"><img src="${f.url}" style="width:72px;height:54px;object-fit:cover;border-radius:7px;border:1px solid var(--line)"></a>`).join("")}</div>`
          :`<div style="color:var(--faint);font-size:12px">Todavía no hay fotos de referencia.</div>`}
          <button class="btn sm" style="margin-top:8px" data-a="fotoVer" data-tipo="woPrevia" data-id="${w.id}">📷 ${(w.fotosPrevias||[]).length?"Ver / agregar fotos":"Agregar foto"}</button></div></div>

      ${(()=>{ const hallazgos=sols.flatMap(s=>s.lineas).filter(a=>a.hallazgoFoto);
        return `<div class="card"><div class="chd"><h3>Hallazgos iniciales</h3>
        <span class="s">problemas adicionales encontrados al llegar — Initial Findings</span></div>
        <div class="cp">${hallazgos.length?`<div style="display:flex;gap:6px;flex-wrap:wrap">${hallazgos.map(a=>
            `<a href="${a.hallazgoFoto.url}" target="_blank" title="${esc(a.concepto)}"><img src="${a.hallazgoFoto.url}" style="width:72px;height:54px;object-fit:cover;border-radius:7px;border:1px solid var(--line)"></a>`).join("")}</div>`
          :`<div style="color:var(--faint);font-size:12px">Todavía no hay hallazgos con foto reportados en sitio.</div>`}</div></div>`; })()}

      ${(()=>{ const aprobs=sols.flatMap(s=>s.lineas).filter(a=>a.aprob&&a.aprob.foto);
        return `<div class="card"><div class="chd"><h3>Aprobaciones</h3>
        <span class="s">evidencia de aprobación de trabajos adicionales — Approvals</span></div>
        <div class="cp">${aprobs.length?`<div style="display:flex;flex-direction:column;gap:6px">${aprobs.map(a=>
            `<a href="${a.aprob.foto}" target="_blank" style="display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--ink)">
              <img src="${a.aprob.foto}" style="width:44px;height:44px;object-fit:cover;border-radius:6px;flex:none">
              <span>${esc(a.concepto)}<br><span style="color:var(--faint)">${esc(a.aprob.quien||"")} · ${esc(a.aprob.hora||a.aprob.fecha||"")}</span></span></a>`).join("")}</div>`
          :`<div style="color:var(--faint);font-size:12px">Todavía no hay comprobantes de aprobación.</div>`}</div></div>`; })()}

      <div class="card"><div class="chd"><h3>Materials</h3>
        <span class="s">material, cantidad, costo, técnico/proveedor y comprobante de compra</span></div>
        <div class="cp">${mv.length?`<table><thead><tr><th>Material</th><th class="num">Qty</th><th class="num">Cost</th><th>Technician/vendor</th><th>Notes</th><th>Receipt</th></tr></thead><tbody>
          ${mv.map(m=>`<tr><td>${esc(by(S.productos,m.prod).nombre)}</td>
            <td class="num mono">${m.cant}</td>
            <td class="num mono">${money(m.costo)}</td>
            <td>${esc(m.quien)||"—"}</td>
            <td style="font-size:11.5px;color:var(--soft)">${esc(m.notas)||"—"}</td>
            <td>${m.recibo?`<a href="${m.recibo}" target="_blank">🧾 Ver</a>`:`<button type="button" class="btn sm" data-a="materialRecibo" data-id="${m.id}" data-wo="${w.id}">📎 Adjuntar</button>`}</td></tr>`).join("")}
        </tbody></table>`:`<div style="color:var(--faint);font-size:12px">Todavía no hay materiales registrados en esta WO.</div>`}
          <button class="btn sm p" style="margin-top:8px" data-a="materialAgregar" data-id="${w.id}">+ Agregar material</button></div></div>
    </div>
  </div>`;
}

/* ── REPORTES ── la Pivot Table 3, pero sin refrescarla a mano y pudiendo pivotear ── */
function trazaWO(w){
  const p=P(w.prop), c=CLI(p.cliente), a=asisDe(w.id);
  const est = w.origen ? by(S.estimados,w.origen.id) : null;
  const fac = S.facturas.find(f=>f.lineas.includes(w.id));
  const nom = w.pagadaTec ? S.nomina.find(n=>n.wos && n.wos.includes(w.id)) : null;
  const paso = (ok,tit,det,quien) => `<li class="${ok?"hecho":"pend"}">
    <span class="mk">${ok?"✓":"○"}</span>
    <div style="min-width:0"><div class="tt">${tit}</div>
      ${det?`<div class="dd">${det}</div>`:""}
      ${quien?`<div class="qq">${esc(quien)}</div>`:""}</div></li>`;

  return `<div class="card"><div class="chd"><h3>Trazabilidad</h3>
    <span class="s">de dónde vino este trabajo y a dónde fue a parar el dinero</span></div>
    <div class="cp"><ul class="traza">
    ${paso(true,"Propiedad",
      `<b>${esc(p.nombre)}</b> · ${esc(p.estado||"—")} · entró por ${esc(p.origen||"—")}${p.cliente?` · management: ${esc(c.nombre)}`:""}`, null)}
    ${paso(!!est, est?`Estimado ${esc(est.num)}`:"Sin estimado previo",
      est ? `${money(totalEst(est))} · ${est.lineas.length} línea(s)` : "Se agendó directo, sin cotización",
      est&&est.aprob ? `Aprobado por ${esc(est.aprob.quien)} vía ${esc(est.aprob.medio)}${est.aprob.ip?" · IP "+est.aprob.ip:""} · ${esc(est.aprob.fecha)}` : null)}
    ${paso(true,`Work Order WO-${w.id} creada`,
      `${esc(p.nombre)} · ${esc(U(w.unidad).num)} · ${esc(w.serv)}`,
      `${esc(w.hist[0]?w.hist[0][2]:"")} · ${esc(w.hist[0]?w.hist[0][0]:"")}`)}
    ${paso(!!w.tec,"Técnico asignado",
      w.tec?`<b>${esc(tecN(w.tec))}</b> · ${w.fecha} ${esc(w.horaProg||"9:00")}`:"Todavía sin asignar",
      w.tec?esc((w.hist.find(h=>h[1].includes("Asignada"))||[])[2]||""):null)}
    ${paso(!!a,"Llegada a la propiedad",
      a?`Programada ${esc(a.horaProg)} · llegó <b>${esc(a.horaReal)}</b> · ${esc(a.puntualidad)}`:"Sin marcar",
      a?esc(a.ubicacion):null)}
    ${paso(w.evid>0,"Evidencia del trabajo",
      w.evid?`${w.evid} foto(s) cargadas por el técnico`:"Sin evidencia",null)}
    ${solsDe(w.id).map(s=>{
      const e=solEstado(s), a=s.lineas.find(l=>l.aprob);
      return paso(e==="Aprobado"||e==="Parcial",
        `Adicional · ${s.lineas.length} concepto(s)`,
        `${esc(s.desc.length>80?s.desc.slice(0,80)+"…":s.desc)}<div style="margin-top:3px">${s.lineas.map(l=>
          `${l.estado==="Aprobado"?"✓":l.estado==="Rechazado"?"✗":"○"} ${esc(l.concepto)}${(l.cant||1)>1?` ×${l.cant}`:""}`).join(" · ")}</div>`,
        a?`${e==="Parcial"?"Aprobado en parte":esc(e)} por ${esc(a.aprob.quien)} vía ${esc(a.aprob.medio)}${a.aprob.ip?" · IP "+a.aprob.ip:""}`:"esperando decisión");
    }).join("")}
    ${paso(!!w.supervisada,"Supervisión",
      w.supervisada?"Revisada y aprobada":"Pendiente de que Gustavo la revise",
      w.supervisada?esc((w.hist.find(h=>h[1].includes("Supervisión"))||[])[2]||""):null)}
    ${paso(!!fac, fac?`Facturada en ${esc(fac.num)}`:"Sin facturar",
      fac?`${money(ingresoWO(w)||0)} de ${money(fac.total)} · vence ${esc(fac.vence)}`:"Todavía no entra a ninguna factura",null)}
    ${paso(!!w.cobrada,"Cobrada", w.cobrada?`Pago registrado`:"Pendiente de cobro",null)}
    ${paso(!!w.pagadaTec,"Pagada al técnico",
      w.pagadaTec?`${money(egresoWO(w)||0)} en la nómina de la semana ${w.semana}`:"No ha entrado a nómina",
      nom?`Aprobada por ${esc(nom.quien)} · ${esc(nom.hora)}`:null)}
    </ul>
    <div class="tr" style="margin-top:10px">Cada eslabón guarda quién y cuándo. Hoy, si el cliente reclama un cobro, reconstruir esto depende de que alguien se acuerde y busque en su WhatsApp.</div>
    </div></div>`;
}

/* ── CALENDARIO ── se arma solo al asignar ── */
/* ── CALENDARIO ─────────────────────────────────────────
   Copia su pestaña `Calendar`: AGENDA SEMANAL, con el año y la semana arriba,
   los técnicos en filas y de LUNES a SÁBADO en columnas. En la celda va la
   propiedad con su dirección y la unidad, como lo escriben ellos.
   La diferencia es que acá se arma sola al agendar. */
/* Punto 9 del feedback: Weekly View (grilla técnico×día, de siempre) y
   Daily View (lista de lo agendado ese día) — más el mismo selector de
   período de Nómina/Facturación (Día, Semana, Rango, Mes), así se puede
   pedir por ejemplo September 1–30 y ver todas las WO de ese período. */
function filaWOAgenda(w){
  const pr=P(w.prop), un=U(w.unidad);
  return `<tr class="cl" data-a="woVer" data-id="${w.id}">
    <td class="mono">${esc(w.horaProg||"9:00")}</td>
    <td>${esc(pr.nombre)} · ${esc(un.num)}</td>
    <td>${esc(w.serv)}</td>
    <td>${w.tec?esc(tecN(w.tec)):'<span class="pill w">sin asignar</span>'}</td>
    <td><span class="pill ${estP(w.estado)}"><span class="dot"></span>${w.estado}</span></td>
    <td class="mono">WO-${w.id}</td></tr>`;
}

function vistaSemanal(sem){
  const dias = diasDeSemana(sem);
  const anio = dias[0].slice(0, 4);
  /* Su hoja lista a todos, incluido Gustavo, tengan o no trabajo esa semana. */
  const tecs = S.tecnicos.filter(t => t.activo);
  const nDia = f => { const d = new Date(f + "T12:00:00"); return d.getDate(); };
  const enSemana = S.wos.filter(w => w.estado !== "Canceled" && dias.includes(w.fecha)).length;

  return `
  <div class="card">
    <div class="chd"><h3>Año ${anio} · Semana ${sem}</h3>
      <span class="s">${dias[0]} al ${dias[5]}</span>
      <span class="r"><span class="pill ${enSemana ? "a" : "g"}">${enSemana} trabajo(s)</span></span></div>
    <table>
    <thead><tr><th style="width:160px">TÉCNICO</th>
      ${dias.map((d, i) => `<th>${DIAS_SEM[i]}<div style="font-weight:400;text-transform:none;opacity:.75">${nDia(d)}</div></th>`).join("")}</tr></thead>
    <tbody>
      ${(()=>{ /* Fila de arriba: las Work Orders que ya tienen fecha pero
                  todavía nadie asignó. Así ninguna orden queda invisible en
                  la agenda por no tener técnico — se ve, y se entra a asignar. */
        const sinT = d => S.wos.filter(w=>!w.tec && w.fecha===d && w.estado!=="Canceled");
        if(!dias.some(d=>sinT(d).length)) return "";
        return `<tr style="background:var(--ambar-cl)">
          <td><div style="font-weight:700;color:var(--ambar)">⚠ Sin asignar</div>
            <div style="font-size:10.5px;color:var(--faint)">tienen fecha, falta el técnico</div></td>
          ${dias.map(d=>`<td>${sinT(d).map(w=>{ const pr=P(w.prop), un=U(w.unidad);
            return `<div style="font-size:11px;margin-bottom:5px;cursor:pointer" data-a="woVer" data-id="${w.id}">
              <div style="font-weight:700">🏢 ${esc(pr.nombre.toUpperCase())}</div>
              <div style="color:var(--faint)">${un?`Unit ${esc(un.num)} · `:""}${esc(w.serv)}</div>
              <div class="mono" style="color:var(--ambar);font-size:10px">WO-${w.id} · asignar</div></div>`;
          }).join("")||'<span style="color:var(--faint);font-size:11px">—</span>'}</td>`).join("")}
        </tr>`;
      })()}
      ${tecs.map(t => `<tr>
      <td><div style="font-weight:650">${esc(t.nombre)} ${esc(t.apellido)}</div>
        <div style="font-size:10.5px;color:var(--faint)">${esc(t.zona)} · ${t.esp.join(", ")}</div></td>
      ${dias.map(d => {
        const b = bloqueo(t.id, d);
        if (b) return `<td style="background:var(--rojo-cl)"><span class="pill r"><span class="dot"></span>${esc(b.motivo)}</span></td>`;
        const ws = S.wos.filter(w => w.tec === t.id && w.fecha === d && w.estado !== "Canceled");
        const lleno = ws.length >= CAP;
        return `<td style="${lleno ? "background:var(--ambar-cl)" : ""}">${ws.map(w => {
          const pr = P(w.prop), un = U(w.unidad);
          return `<div style="font-size:11px;margin-bottom:5px;cursor:pointer" data-a="woVer" data-id="${w.id}">
            <div style="font-weight:700">\ud83c\udfe2 ${esc(pr.nombre.toUpperCase())}</div>
            <div style="color:var(--faint)">${esc(pr.dir)}</div>
            ${un ? `<div style="color:var(--faint)">Unit: ${esc(un.num)} · ${esc(w.serv)}</div>` : ""}
            <div class="mono" style="color:var(--azul);font-size:10px">WO-${w.id}</div></div>`;
        }).join("") || '<span style="color:var(--faint);font-size:11px">—</span>'}
          ${lleno ? '<div style="font-size:9.5px;font-weight:750;color:var(--ambar)">CUPO LLENO</div>' : ""}</td>`;
      }).join("")}</tr>`).join("")}
    </tbody></table></div>

  <div class="tr">Capacidad: <b>${CAP} propiedades por técnico y día</b> — Claudia: «cada técnico puede hacer
    dos propiedades; si ya tenemos diez, se debería pasar al otro día».<br>
    Al acordar una fecha nueva con el cliente, la orden <b>se mueve sola</b> a la semana que corresponda.</div>`;
}

function vistaDiaria(dia){
  const ws = S.wos.filter(w=>w.fecha===dia && w.estado!=="Canceled").sort((a,b)=>(a.horaProg||"9:00").localeCompare(b.horaProg||"9:00"));
  return `
  <div class="card">
    <div class="chd"><h3>${dia||"— elegí un día —"}</h3>
      <span class="r"><span class="pill ${ws.length?"a":"g"}">${ws.length} trabajo(s)</span></span></div>
    ${ws.length?`<table><thead><tr><th>Hora</th><th>Propiedad · Unidad</th><th>Servicio</th><th>Técnico</th><th>Estado</th><th>WO</th></tr></thead>
      <tbody>${ws.map(filaWOAgenda).join("")}</tbody></table>`
      :`<div class="cp" style="color:var(--faint);font-size:12px">${dia?"Nada agendado para este día.":"Elegí una fecha arriba para ver qué está agendado."}</div>`}
  </div>`;
}

function vistaRango(per){
  const ws = S.wos.filter(w=>w.estado!=="Canceled" && enPeriodo(w.fecha, per)).sort((a,b)=>a.fecha.localeCompare(b.fecha)||(a.horaProg||"9:00").localeCompare(b.horaProg||"9:00"));
  const porFecha = {};
  ws.forEach(w=>{ (porFecha[w.fecha]=porFecha[w.fecha]||[]).push(w); });
  const fechas = Object.keys(porFecha).sort();
  return `
  <div class="card">
    <div class="chd"><h3>${periodoTexto(per)}</h3>
      <span class="r"><span class="pill ${ws.length?"a":"g"}">${ws.length} trabajo(s)</span></span></div>
    ${fechas.length?fechas.map(f=>`<div class="cp" style="border-top:1px solid var(--line)">
      <div class="dl" style="margin:0 0 6px">${f}</div>
      <table><tbody>${porFecha[f].map(filaWOAgenda).join("")}</tbody></table></div>`).join("")
      :`<div class="cp" style="color:var(--faint);font-size:12px">Nada agendado en este período.</div>`}
  </div>`;
}

VIEWS.calendario = () => {
  const per = S.periodoCal;
  return `
  <div class="ph"><div><h2>Agenda — Work Orders</h2>
    <p>Es su pestaña <code>Calendar</code>. <b>Semana</b> es la Weekly View (planificación general, técnico por día);
    <b>Día</b> es la Daily View (qué está agendado exactamente ese día). Rango y Mes muestran lo agendado en ese período.</p></div>
  </div>
  <div class="card" style="margin-bottom:14px"><div class="cp">${renderSelectorPeriodo(per, "cal")}</div></div>
  ${per.tipo==="semana"?vistaSemanal(per.sem):per.tipo==="dia"?vistaDiaria(per.dia):vistaRango(per)}`;
};

/* ── DISPONIBILIDAD ──
   Objetivo único: antes de prometerle una fecha a un cliente, ver si el
   equipo tiene lugar ese día. La regla es una sola — 2 trabajos por técnico
   y por día — y todo lo demás sale de ahí. */
VIEWS.despacho = () => {
  const sem = S.semCal || S.semana;
  const dias = diasDeSemana(sem);
  const anio = dias[0].slice(0,4);
  const tecs = S.tecnicos.filter(t=>t.activo && !t.esp.includes("Supervisor"));
  const nDia = f => new Date(f+"T12:00:00").getDate();
  return `
  <div class="ph"><div><h2>Disponibilidad del equipo</h2>
    <p>Antes de prometerle una fecha a un cliente, mirá si el equipo tiene lugar ese día. La regla:
    <b>${CAP} trabajos por técnico y por día</b>.</p></div>
    <div class="act">
      <button class="btn sm" data-a="calSem" data-s="${sem-1}">‹ Semana ${sem-1}</button>
      <button class="btn sm" data-a="calSem" data-s="${sem+1}">Semana ${sem+1} ›</button>
      ${sem!==S.semana?`<button class="btn sm p" data-a="calSem" data-s="${S.semana}">Volver a la ${S.semana}</button>`:""}
      <button class="btn" data-a="permisoModal">+ Registrar permiso</button></div></div>

  <div class="card"><div class="chd"><h3>Semana ${sem} · ${anio}</h3>
    <span class="s">${dias[0]} al ${dias[5]}</span></div>
    <table>
    <thead><tr><th>Día</th>
      <th class="num">Trabajos<br>del día</th>
      <th class="num">Cupo del<br>equipo</th>
      <th>Ocupación del cupo</th>
      <th class="num">Falta<br>asignar</th>
      <th>Agendamiento</th><th></th></tr></thead>
    <tbody>${dias.map((d,i)=>{
      const ws  = S.wos.filter(w=>w.fecha===d && w.estado!=="Canceled");
      const conT = ws.filter(w=>w.tec).length;
      const sinT = ws.length - conT;
      const libres = tecs.filter(t=>!bloqueo(t.id,d)).length;
      const conPermiso = tecs.length - libres;
      const cupo = libres*CAP;
      const over = ws.length > cupo;                    // más trabajos que capacidad
      const usoPct = cupo? Math.min(100, Math.round(conT/cupo*100)) : 0;
      const cerrado = S.diasCerrados.includes(d);
      return `<tr ${over?'style="background:var(--rojo-cl)"':""}>
        <td style="font-weight:650">${DIAS_SEM[i].slice(0,3)} ${nDia(d)}
          <div style="font-size:10px;color:var(--faint)">${conPermiso?conPermiso+" con permiso":"equipo completo"}</div></td>
        <td class="num mono" style="font-weight:700">${ws.length||"—"}</td>
        <td class="num mono">${cupo}<span style="color:var(--faint);font-weight:400"> · ${libres}×${CAP}</span></td>
        <td style="min-width:150px">
          <div style="background:var(--surface-3);border-radius:4px;height:8px;overflow:hidden">
            <div style="height:8px;width:${usoPct}%;background:${over?"var(--rojo)":usoPct>=100?"var(--ambar)":"var(--verde)"}"></div></div>
          <div style="font-size:10px;color:var(--faint);margin-top:2px">${conT} en uso · ${Math.max(0,cupo-conT)} libre${over?` · <b style="color:var(--rojo)">${ws.length-cupo} sin lugar</b>`:""}</div></td>
        <td class="num mono" style="${sinT?"color:var(--ambar);font-weight:700":""}">${sinT||"—"}</td>
        <td>${over
              ? '<span class="pill r"><span class="dot"></span>Pasa el cupo</span>'
              : cerrado
                ? '<span class="pill v"><span class="dot"></span>Cerrado · a asignar</span>'
                : '<span class="pill g">Juntando trabajos</span>'}</td>
        <td style="text-align:right">${cerrado
          ? `<button class="btn sm" data-a="reabrirDia" data-d="${d}">Reabrir</button>`
          : `<button class="btn sm p" data-a="cerrarDia" data-d="${d}" ${ws.length?"":"disabled"}>Cerrar el día</button>`}</td></tr>`;
    }).join("")}</tbody></table>
    <div class="cp" style="border-top:1px solid var(--line)"><div class="tr" style="margin:0">
      <b>Cupo del equipo</b> = técnicos disponibles ese día × ${CAP}. Un técnico con permiso aprobado no cuenta.<br>
      <b>Trabajos del día</b> = todas las Work Orders con esa fecha (tengan técnico o no).
      Si pasan el cupo, hay que mover alguna a otro día antes de asignar.<br>
      <b>Cerrar el día</b> es el momento en que se deja de juntar trabajos y se empiezan a repartir a los
      técnicos (Claudia: «una vez cerrado el agendamiento, ahí sí las empezamos a asignar»).</div></div>
  </div>

  <div class="card"><div class="chd"><h3>Permisos y vacaciones</h3>
    <span class="s">un técnico con permiso aprobado baja el cupo del equipo esos días y no aparece al asignar</span></div>
    ${S.disponibilidad.length?`<table><thead><tr><th>Técnico</th><th>Desde</th><th>Hasta</th><th>Motivo</th><th>Estado</th><th></th></tr></thead><tbody>
    ${S.disponibilidad.map(d=>`<tr class="${fl("dis:"+d.id)}"><td style="font-weight:650">${esc(tecN(d.tec))}</td><td class="mono">${d.desde}</td><td class="mono">${d.hasta}</td>
      <td>${esc(d.motivo)}</td><td><span class="pill ${d.estado==="Aprobado"?"v":"w"}">${d.estado}</span></td>
      <td style="text-align:right">${d.estado==="Pendiente"?`<button class="btn sm v" data-a="apruebaPermiso" data-id="${d.id}">Aprobar</button>`:""}</td></tr>`).join("")}
    </tbody></table>`:`<div class="empty">Sin permisos registrados. «+ Registrar permiso» arriba a la derecha.</div>`}
  </div>`;
};

/* ── PROPIEDADES ── una ficha, no 27 columnas ── */
function modalSubWO(woId){
  const w=W(woId), u=U(w.unidad);
  modal(`<div class="mh"><h3>Nueva Sub-Work Order</h3><p>WO-${w.id} · ${esc(P(w.prop).nombre)} ${esc(u.num)} — se agrega ya aprobada, sin frenar esta WO.</p></div>
  <div class="mb">
    <input type="hidden" id="swWo" value="${w.id}">
    <div class="fg c2">
      <div class="fld"><label>Tipo de trabajo <span class="req">*</span></label>
        <select id="swTipo" data-a="subwoTipoRef">${activos("adicionales").map(c=>`<option>${esc(c)}</option>`).join("")}</select></div>
      <div class="fld"><label>Ubicación (Location) <span class="req">*</span></label>
        <select id="swUbic">${activos("ubicaciones").map(u2=>`<option>${esc(u2)}</option>`).join("")}</select></div>
    </div>
    <div class="fg c2">
      <div class="fld"><label>Cantidad (Quantity) <span class="req">*</span></label><input id="swCant" value="1" class="mono"></div>
      <div class="fld"><label>Precio <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— opcional</span></label><input id="swPrecio" class="mono" placeholder="0.00"></div>
    </div>
    <label style="display:flex;align-items:center;gap:6px;margin:-6px 0 12px;font-weight:500;font-size:12.5px">
      <input type="checkbox" id="swCobra" style="width:16px;height:16px"> Cobrar este precio a la propiedad (si no, el técnico igual cobra el suyo, pero es costo interno)</label>
    <div id="swSpecs"></div>
    <div class="fld"><label>Notas (Notes)</label><textarea id="swNotas" placeholder="Cualquier detalle que no entre en los campos de arriba…"></textarea></div>

    <div class="fg c2" style="margin-top:4px">
      <div class="fld"><label>Técnico <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— opcional, si es distinto al de la WO</span></label>
        <select id="swTec"><option value="">— mismo técnico que WO-${w.id} —</option>${S.tecnicos.filter(t=>t.activo).map(t=>`<option value="${t.id}">${esc(t.nombre)} ${esc(t.apellido)}</option>`).join("")}</select></div>
      <div class="fld"><label>Fecha <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— opcional, si es otro día</span></label>
        <input type="date" id="swFecha" value=""></div>
    </div>
    <div class="note">Técnico y fecha quedan documentados en la Sub-Work Order, pero todavía no mueven la agenda — es solo para saber quién y cuándo, la asignación real sigue siendo la de WO-${w.id}. Si le pusiste precio, sí entra a la nómina del técnico apenas guardás, y a la factura de la propiedad si tildaste «Cobrar».</div>
    <div class="note">Las fotos (Photos) se agregan después, desde la tarjeta «Sub-Work Orders» de esta WO — hay dos tipos: de referencia (para que el técnico vea con anticipación) y de evidencia (el resultado, para returns).</div>
  </div>
  <div class="mf"><button class="btn" data-a="cm">Cancelar</button>
    <button class="btn p" data-a="subwoGuardar" data-id="${w.id}">Crear Sub-Work Order</button></div>`);
  refSubWO();
}
/* Specs propias según el tipo elegido — SUBWO_SPECS. Sin tipo con specs
   definidas, no se agrega nada (el campo Notas alcanza). */
function refSubWO(){
  const caja=document.getElementById("swSpecs"); if(!caja) return;
  const campos = SUBWO_SPECS[val("swTipo")] || [];
  caja.innerHTML = campos.length ? `<div class="fg c${Math.min(campos.length,3)}" style="margin:-4px 0 12px">
    ${campos.map((c,i)=>`<div class="fld" style="margin-bottom:0"><label>${esc(c)}</label>
      <input id="swSpec${i}" data-spec="${esc(c)}" placeholder="${esc(c)}"></div>`).join("")}
  </div>` : "";
}

/* Punto 8 del feedback: en vez de mostrar más dinero en el costado de la
   WO, esta sección deja registrar el material con sus datos completos
   (Material, Quantity, Cost, Technician/vendor, Notes) — el comprobante
   se adjunta aparte, con el mismo patrón que las otras fotos de evidencia. */
function modalMaterial(woId){
  const w=W(woId), tec=w.tec?T(w.tec):null;
  modal(`<div class="mh"><h3>Agregar material</h3><p>WO-${w.id} · ${esc(P(w.prop).nombre)} ${esc(U(w.unidad).num)}</p></div>
  <div class="mb">
    <div class="fld"><label>Material <span class="req">*</span></label>
      <select id="mtP">${S.productos.map(p=>`<option value="${p.id}">${esc(p.nombre)} — quedan ${stock(p.id)}</option>`).join("")}</select></div>
    <div class="fg c2">
      <div class="fld"><label>Quantity <span class="req">*</span></label><input id="mtC" class="mono" value="1"></div>
      <div class="fld"><label>Cost <span class="req">*</span></label><input id="mtT" class="mono" placeholder="0.00"></div>
    </div>
    <div class="fld"><label>Technician/vendor</label>
      <input id="mtQ" value="${tec?esc(tec.nombre+" "+tec.apellido):""}" placeholder="Técnico o proveedor que lo compró"></div>
    <div class="fld"><label>Notes</label><textarea id="mtN" placeholder="Detalle, por qué se compró, dónde…"></textarea></div>
    <div class="note">El comprobante (Attach Receipt / Voucher) se adjunta después, desde la tarjeta «Materials» de esta WO — cuando corresponda.</div>
  </div>
  <div class="mf"><button class="btn" data-a="cm">Cancelar</button>
    <button class="btn p" data-a="materialGuardar" data-id="${w.id}">Agregar material</button></div>`);
}

/* ── NÓMINA ── la pestaña Payroll, armada sola ── */
const SUBWO_SPECS = {
  "Door":            ["Door","Current color","New color"],
  "Cambio de color": ["Current color","New color"],
  "Garage":          ["Current color","New color"]
};

function modalWO(w){
  const opts = (a,v) => a.map(x=>`<option ${x===v?"selected":""}>${esc(x)}</option>`).join("");
  modal(`
  <div class="mh"><h3>${w?`Editar WO-${w.id}`:"Nueva Work Order"}</h3><p>${w?"Lo que se tecleó mal se arregla aquí. Cada campo que cambies queda en la Bitácora y en el historial de la orden.":"El sistema no deja guardar si falta un dato. Es lo que pidió Claudia: «no puedes pasar al siguiente paso si no tienes el primero»."}</p></div>
  <div class="mb">
    ${w&&w.tec?`<div class="note w" style="margin-bottom:12px"><b>Ya está asignada a ${esc(tecN(w.tec))}.</b> Si cambias la unidad o el servicio, a él le cambia el trabajo — el sistema se lo avisa al celular.</div>`:""}
    <div class="fg c2">
      <div class="fld" style="position:relative">
        <label>Propiedad <span class="req">*</span></label>
        <input id="wPropTxt" data-a="woPropBuscar" autocomplete="off" placeholder="Escribe para buscar…" value="${w?esc(P(w.prop).nombre):""}">
        <input type="hidden" id="wProp" value="${w?w.prop:""}">
        <div id="wPropSug" class="sugbox"></div>
      </div>
      <div class="fld" style="position:relative">
        <label>Unidad <span class="req">*</span></label>
        <input id="wUniTxt" data-a="woUniBuscar" autocomplete="off" ${w?"":"disabled"} placeholder="${w?"Escribe para buscar…":"Elige una propiedad primero"}" value="${w&&U(w.unidad)?esc(U(w.unidad).num):""}">
        <input type="hidden" id="wUni" value="${w?w.unidad:""}">
        <div id="wUniSug" class="sugbox"></div>
      </div>
    </div>
    <div class="fg c2">
      <div class="fld"><label>Tipo de servicio <span class="req">*</span></label>
        <select id="wCat" data-a="woCat"><option value="" ${w?"":"selected"}>— selecciona —</option>${opts(activos("categorias"), w?w.cat:undefined)}</select></div>
      <div class="fld"><label>Servicio <span class="req">*</span></label><select id="wServ" data-a="woServ"></select></div>
    </div>
    <div id="wUniNueva"></div>
    <div id="wDeriv"></div>
    <div id="wSugerencia"></div>
    <div class="fg c2">
      <div class="fld"><label>Ubicación dentro de la unidad <span id="wUbicReq"></span></label>
        <select id="wUbic"><option value="">— sin especificar —</option>${opts(activos("ubicaciones"), w?w.ubic:"")}</select>
        <div class="hint" id="wUbicHint"></div></div>
      <div class="fld"><label>Fecha y hora <span class="req">*</span></label><div style="display:flex;gap:7px"><input type="date" id="wFecha" value="${w?esc(w.fecha):""}" style="flex:2"><input id="wHora" value="${w?esc(w.horaProg||"9:00"):""}" class="mono" style="flex:1" placeholder="9:00"></div></div>
    </div>
    <div class="fg c2">
      <div class="fld"><label>Cantidad <span class="req">*</span></label><input id="wCant" value="${w?(w.cant||1):""}" placeholder="1" class="mono"><div class="hint">El importe es precio unitario × cantidad.</div></div>
      <div class="fld"><label>PO</label><input id="wPO" placeholder="opcional" value="${w?esc(w.po||""):""}"></div>
    </div>
    <div class="fld"><label>Notas al técnico</label><textarea id="wNotas" placeholder="lo que el técnico necesita saber antes de llegar">${w?esc(w.notasTec||""):""}</textarea></div>
    <div id="wTarifa"></div>
  </div>
  <div class="mf"><button class="btn" data-a="cm">Cancelar</button>
    <button class="btn p" data-a="woGuardar" data-id="${w?w.id:""}">${w?"Guardar corrección":"Guardar Work Order"}</button></div>`,true);
  // Se siembra el servicio para que refWO() lo respete al reconstruir su
  // lista — en blanco caería en el placeholder en vez de lo que ya elegiste.
  if(w) document.getElementById("wServ").innerHTML = `<option selected>${esc(w.serv)}</option>`;
  refWO();
}
function refWO(){
  const pid=val("wProp"), cat=val("wCat");
  const uid=val("wUni"), esNueva=uid==="__new__";
  const uniTxt=document.getElementById("wUniTxt");
  /* Reunión Claudia (feedback prototipo): nada viene elegido de entrada —
     el usuario tiene que ESCRIBIR y elegir de una sugerencia en vivo, no
     de una lista precargada. Si todavía no hay propiedad, ni se puede
     buscar la unidad. */
  if(!pid){
    if(uniTxt){ uniTxt.disabled=true; uniTxt.value=""; uniTxt.placeholder="Elige una propiedad primero"; }
    document.getElementById("wUni").value="";
    document.getElementById("wUniSug").innerHTML="";
    const caja=document.getElementById("wUniNueva"); if(caja) caja.innerHTML="";
    document.getElementById("wDeriv").innerHTML = `<div class="note r" style="margin-bottom:12px"><b>Elige una propiedad primero.</b></div>`;
    document.getElementById("wSugerencia").innerHTML = "";
    const selS0=document.getElementById("wServ"); selS0.innerHTML = `<option value="">— elige un servicio primero —</option>`;
    refTarifa(); return;
  }
  if(uniTxt){ uniTxt.disabled=false; uniTxt.placeholder="Escribe para buscar…"; }
  const u = (esNueva || !uid) ? null : by(S.unidades, uid), p = P(pid);
  const cajaNueva = document.getElementById("wUniNueva");
  if(cajaNueva) cajaNueva.innerHTML = esNueva ? (()=>{
    const tipoN = val("wUniTipo")||"Residencial";
    return `
    <div class="note" style="margin:-4px 0 10px"><b>Location:</b> ${p.zona?esc(p.zona):'<span style="color:var(--faint)">sin definir en la propiedad</span>'}</div>
    <div class="fg c4" style="margin:-4px 0 12px">
      <div class="fld" style="margin-bottom:0"><label>Building</label>
        <input id="wUniBld" data-a="woUniCampo" placeholder="A, B…" value="${esc(val("wUniBld"))}"></div>
      <div class="fld" style="margin-bottom:0"><label>Unidad <span class="req">*</span></label>
        <input id="wUniNum" data-a="woUniCampo" placeholder="204, 27, 8…" value="${esc(val("wUniNum"))}"></div>
      <div class="fld" style="margin-bottom:0"><label>Floor</label>
        <select id="wUniPisos" data-a="woUniCampo">${activos("pisos").map(pi=>`<option ${String(pi)===val("wUniPisos")?"selected":""}>${pi}</option>`).join("")}</select></div>
      <div class="fld" style="margin-bottom:0"><label>Tipo <span class="req">*</span></label>
        <select id="wUniTipo" data-a="woUniCampo">
          <option ${tipoN==="Residencial"?"selected":""}>Residencial</option>
          <option ${tipoN==="Oficina"?"selected":""}>Oficina</option></select></div>
    </div>
    ${(tipoN==="Residencial" && !SIN_BEDROOMS.includes(cat))?`<div class="fg c4" style="margin:-4px 0 12px">
      <div class="fld" style="margin-bottom:0"><label>Bedrooms <span class="req">*</span></label>
        <input id="wUniBedrooms" data-a="woUniCampo" type="number" min="0" class="mono" placeholder="0 = Studio" value="${esc(val("wUniBedrooms"))}"></div>
      <div class="fld" style="margin-bottom:0"><label>Bathrooms <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— informativo</span></label>
        <input id="wUniBathrooms" data-a="woUniCampo" type="number" min="0" class="mono" placeholder="opcional" value="${esc(val("wUniBathrooms"))}"></div>
      <div class="fld" style="margin-bottom:0;display:flex;align-items:flex-end;padding-bottom:9px">
        <label style="display:flex;align-items:center;gap:6px;font-weight:500;text-transform:none;font-size:12px">
          <input type="checkbox" id="wUniEstudio" data-a="woUniCampo" ${chk("wUniEstudio")?"checked":""} style="width:auto"> + estudio aparte</label></div>
      <div class="fld" style="margin-bottom:0;display:flex;align-items:flex-end;padding-bottom:9px">
        <label style="display:flex;align-items:center;gap:6px;font-weight:500;text-transform:none;font-size:12px">
          <input type="checkbox" id="wUniLivingRoom" data-a="woUniCampo" ${chk("wUniLivingRoom")?"checked":""} style="width:auto"> + living room aparte</label></div>
    </div>`:(tipoN==="Residencial"&&cat?`<div class="tr" style="margin:-6px 0 12px">«${esc(cat)}» se cobra por el trabajo puntual, no por el tamaño de la unidad — no hace falta Bedrooms/Bathrooms.</div>`:"")}`;
  })() : "";
  // Lo que hoy se reescribe en cada fila de Schedule y aquí sale solo
  document.getElementById("wDeriv").innerHTML = u
    ? `<div class="note" style="margin-bottom:12px"><b>Se llenan solos desde la propiedad y la unidad:</b>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">
          <span class="pill a">Zona: ${esc(p.zona)}</span>
          <span class="pill a">Dirección: ${esc(p.dir)}</span>
          <span class="pill a">Rooms: ${esc(u.rooms)}</span>
          <span class="pill a">Pisos: ${u.pisos}</span>
          <span class="pill a">Door code: ${esc(p.door)}</span>
        </div>
        <div style="font-size:11px;margin-top:6px;opacity:.85">Hoy estos cinco se vuelven a escribir en cada fila de <code>Schedule</code>.</div></div>`
    : esNueva
      ? `<div class="note" style="margin-bottom:12px"><b>Esta unidad todavía no está en el catálogo de esta propiedad.</b> Se crea junto con la Work Order — la próxima vez que la busques ya va a estar en la lista, con estos mismos datos.</div>`
      : `<div class="note w" style="margin-bottom:12px"><b>Elige una unidad.</b></div>`;
  /* Reunión Claudia (feedback prototipo): antes de crear una WO nueva, mostrar
     si ya hay otras en esta misma unidad — así no se duplica sin querer. Se
     excluye la propia WO cuando se está corrigiendo una existente. */
  const sug = document.getElementById("wSugerencia");
  if(sug){
    const idEdicion = +(document.querySelector('[data-a="woGuardar"]')?.dataset.id||0);
    const previas = u ? S.wos.filter(x=>x.unidad===u.id && x.estado!=="Canceled" && x.id!==idEdicion)
      .sort((a,b)=>b.fecha.localeCompare(a.fecha)).slice(0,4) : [];
    sug.innerHTML = previas.length
      ? `<div class="note w" style="margin-bottom:12px"><b>Esta unidad ya tiene ${previas.length===1?"otra Work Order":previas.length+" Work Orders"} registrada${previas.length===1?"":"s"}:</b>
          <table style="margin-top:6px"><tbody>${previas.map(x=>`<tr>
            <td class="mono" style="width:70px">WO-${x.id}</td><td>${esc(x.serv)}</td>
            <td class="mono" style="width:90px">${esc(x.fecha)}</td>
            <td style="width:110px"><span class="pill">${esc(x.estado)}</span></td>
            <td style="text-align:right"><span style="cursor:pointer;color:var(--azul);font-size:11.5px" data-a="woVerDesdeModal" data-id="${x.id}">ver</span></td></tr>`).join("")}
          </tbody></table>
          <div style="font-size:11px;margin-top:6px;opacity:.85">Revisa que no sea la misma antes de seguir.</div></div>`
      : "";
  }
  // El servicio no viene elegido de entrada: hay que tocarlo a propósito
  const selS = document.getElementById("wServ");
  const prevS = selS.value;
  if(!cat){
    selS.innerHTML = `<option value="">— elige un tipo de servicio primero —</option>`;
  } else {
    const lista = servDe(cat);
    selS.innerHTML = `<option value="" ${prevS?"":"selected"}>— selecciona un servicio —</option>`
      + lista.map(s=>`<option ${s===prevS?"selected":""}>${esc(s)}</option>`).join("");
    if(lista.includes(prevS)) selS.value = prevS;
  }
  const exige = EXIGE_UBIC.includes(cat);
  document.getElementById("wUbicReq").innerHTML = exige? '<span class="req">*</span>' : '';
  document.getElementById("wUbicHint").innerHTML = exige
    ? `<span style="color:var(--ambar)">Obligatoria para ${esc(cat)}: «imagínate que la reparación está en el closet y el técnico no la encuentra».</span>`
    : "opcional para este tipo de servicio";
  refTarifa();
}

/* Solo el precio: se llama al cambiar el servicio, sin tocar los desplegables */
function refTarifa(){
  const caja = document.getElementById("wTarifa");
  if(!caja) return;
  const uid = val("wUni"), serv = val("wServ");
  if(!uid || !serv){ caja.innerHTML = ""; return; }   // todavía no eligió todo — no hay nada que avisar
  // Con "+ Nueva unidad…" todavía no hay registro en S.unidades: se arma
  // uno al vuelo solo para poder previsualizar el precio con lo que ya
  // se escribió (rooms/pisos), sin esperar a que la WO se guarde.
  const tipoT = val("wUniTipo")||"Residencial";
  const u = uid==="__new__" ? {rooms: SIN_BEDROOMS.includes(val("wCat")) ? null : roomsDesde(tipoT, val("wUniBedrooms"), chk("wUniEstudio"), chk("wUniLivingRoom")), pisos: parseInt(val("wUniPisos"))||1} : by(S.unidades, uid);
  const t = u ? tarifa(val("wProp"), val("wCat"), serv, u.rooms, u.pisos) : null;
  caja.innerHTML = t
    ? `<div class="note v"><b>Tarifa ${t.nivel} (${esc(t.detalle)}):</b> se cobra ${money(t.precio)} y se le paga ${money(t.pago)} al técnico.${puedeVerUtilidad()?` Utilidad ${money(t.precio-t.pago)}.`:""}</div>`
    : `<div class="note w"><b>Sin tarifa para esta combinación.</b> Se puede guardar, pero saldrá «NA» y quedará una <b>excepción</b> para que Erika la defina.</div>`;
}

/* ── PROGRAMAR CON EL CLIENTE ────────────────────────────────
   El sistema no llama por Thalia — eso lo sigue haciendo ella. Lo que hace es
   mostrarle quien esta libre mientras habla, y guardar la fecha que quedaron. */
function modalProg(id){
  const w = W(id), p = P(w.prop);
  const f = S.progF || w.fecha;
  const libres = libresEse(f, w.prop);
  const ok = libres.filter(x=>x.libre);
  const cs = contactosDe(w.prop);
  const prev = w.propuestas || [];
  modal(`
  <div class="mh"><h3>Programar WO-${id} con el cliente</h3>
    <p>${esc(p.nombre)} · ${esc(U(w.unidad).num)} · ${esc(w.serv)}</p></div>
  <div class="mb">
    <div class="fld"><label>Fecha acordada <span class="req">*</span></label>
      <input type="date" id="pgF" value="${esc(f)}" data-a="progFecha"></div>

    <div style="margin:0 0 12px">
      <b style="font-size:11px;color:var(--faint);text-transform:uppercase;letter-spacing:.03em">Quién puede ese día</b>
      <div class="ds" style="margin-top:2px">Es para que sepas a quién ofrecerle mientras hablas con el cliente — clic no hace nada aquí. Para asignarlo, usa el botón de abajo.</div>
      <div style="margin-top:6px;display:flex;flex-direction:column;gap:6px">
        ${libres.slice().sort((a,b)=>(a.libre===b.libre)?0:a.libre?-1:1).map(x=>{
          const otraZona = x.libre && x.nota==="otra zona";
          return `<div class="dc" style="display:flex;align-items:center;gap:9px;padding:8px 10px;margin:0;${x.libre?"":"opacity:.6"}">
            <div class="av" style="${x.libre?"":"background:var(--surface-3);color:var(--soft)"}">${esc(x.t.nombre[0]+x.t.apellido[0])}</div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:12.5px">${esc(tecN(x.t.id))}</div>
              <div style="font-size:11px;color:var(--faint)">${x.libre?`${x.carga}/${CAP} ese día${otraZona?" · vive en "+esc(x.t.zona):""}`:esc(x.nota)}</div>
            </div>
            <span class="pill ${x.libre?(otraZona?"w":"v"):"r"}"><span class="dot"></span>${x.libre?(otraZona?"Otra zona":"Disponible"):"No puede"}</span>
          </div>`;}).join("")}
      </div>
      ${ok.length?"":`<div class="note w" style="margin-top:8px"><b>Nadie libre ese día</b> — todos bloqueados o con el cupo lleno.</div>`}
      <button type="button" class="btn sm" style="margin-top:8px" data-a="${w.tec?"woReasignar":"asigModal"}" data-id="${w.id}">${w.tec?"Reasignar técnico":"Asignar técnico"}</button>
    </div>

    ${prev.length?`<div style="margin:0 0 12px">
      <b style="font-size:11px;color:var(--faint);text-transform:uppercase">Fechas anteriores</b>
      <table style="margin:5px 0 0"><thead><tr><th>Fecha</th><th>Medio</th><th>Con quién</th><th>Cómo quedó</th></tr></thead>
      <tbody>${prev.map(x=>`<tr><td>${esc(x.fecha)}</td><td>${esc(x.medio)}</td>
        <td>${esc(x.contacto)}</td>
        <td><span class="pill ${x.respuesta.startsWith("Fecha")?"v":"a"}">${esc(x.respuesta)}</span>
          ${x.motivo?`<div style="font-size:10px;color:var(--faint)">${esc(x.motivo)}</div>`:""}
          <div style="font-size:10px;color:var(--faint)">${esc(x.quien)} · ${esc(x.hora)}</div></td></tr>`).join("")}
      </tbody></table></div>`:""}

    ${w.tec?`<div class="fld"><label>¿Qué pasó? <span style="text-transform:none;font-weight:500;color:var(--faint)">— opcional, solo si estás moviendo una fecha ya tomada</span></label>
      <select id="pgMotivo"><option value="">— es la primera coordinación, nada que reportar —</option>
        <option>Se volvió a coordinar con el cliente</option>
        <option>No asistió el técnico</option><option>Trabajo incompleto</option>
        <option>El cliente pidió moverla</option><option>No había acceso a la unidad</option></select></div>`:""}

    <div class="fg c2">
      <div class="fld"><label>Cómo lo coordinaste <span class="req">*</span></label>
        <select id="pgM">${activos("medios").map(m=>`<option>${esc(m)}</option>`).join("")}</select></div>
      <div class="fld"><label>Con quién hablaste <span class="req">*</span></label>
        <select id="pgC">${cs.length?cs.map(c=>`<option>${esc(c.nombre)} — ${esc(c.tipo)}</option>`).join("")
          :`<option>${esc(CLI(p.cliente).contacto||CLI(p.cliente).nombre)}</option>`}</select></div></div>

    <div class="fld"><label>Nota <span style="text-transform:none;font-weight:500;color:var(--faint)">— opcional</span></label>
      <input id="pgN" placeholder="Lo que quedó acordado en la llamada"></div>

    <label style="display:flex;align-items:flex-start;gap:8px;margin:4px 0 0;cursor:pointer">
      <input type="checkbox" id="pgP" style="width:16px;height:16px;margin-top:2px">
      <span style="font-size:12px">Quedó en confirmarme después
        <span style="color:var(--faint)">— la fecha no es firme todavía</span></span></label>

    <div class="note" style="margin-top:11px">La llamada la sigues haciendo tú. Lo que cambia es que
      <b>queda registrado</b> qué fecha quedaron, con quién hablaste y por qué medio.
      ${w.tec?` Como ya tiene técnico asignado, también se revisa que <b>${tecN(w.tec)}</b> tenga cupo ese día antes de moverla.`:""}</div>
  </div>
  <div class="mf"><button class="btn" data-a="cm">Cancelar</button>
    <button class="btn p" data-a="progOK" data-id="${id}">Guardar</button></div>`);
}

function modalAsig(id){
  const w=W(id), p=P(w.prop);
  const espReq = ESP_REQ[w.cat] || "Tecnico";
  const cand = S.tecnicos.filter(t=>t.activo && !t.esp.includes("Supervisor")).map(t=>{
    const b=bloqueo(t.id,w.fecha), carga=capacidadDia(t.id,w.fecha);
    let est="ok", m=`${carga}/${CAP} el ${w.fecha.slice(5)} · ${t.zona}`;
    if(b){ est="bloq"; m=`${b.motivo} · ${b.desde} al ${b.hasta}`; }
    else if(carga>=CAP){ est="lleno"; m=`Ya tiene ${carga} propiedades ese día`; }
    else {
      /* Distinta zona no es igual de grave si el técnico "se mueve de zona"
         (t.movimiento) — ese campo ya existía en su ficha pero no se cruzaba
         con nada. Al que sí se mueve no se le avisa por zona. */
      const distinta = t.zona!==p.zona;
      const zonaOk = !distinta || t.movimiento;
      if(distinta) m = t.movimiento
        ? `${carga}/${CAP} el ${w.fecha.slice(5)} · ${t.zona} — se mueve de zona`
        : `${carga}/${CAP} el ${w.fecha.slice(5)} — vive en ${t.zona} y no se mueve de zona, la propiedad está en ${p.zona}`;
      if(!zonaOk || !especialidadOk(t,w.cat)) est="warn";
    }
    return {t,est,m};
  }).sort((a,b)=>({ok:0,warn:1,lleno:2,bloq:3})[a.est]-({ok:0,warn:1,lleno:2,bloq:3})[b.est]);
  modal(`
  <div class="mh"><h3>Asignar WO-${id}</h3><p>${esc(p.nombre)} · ${esc(U(w.unidad).num)} · ${esc(w.serv)}</p></div>
  <div class="mb">
    <div class="fld"><label>Fecha del trabajo</label>
      <input type="date" id="asF" value="${esc(w.fecha)}" data-a="asigFecha" data-id="${id}"></div>
    ${w.confirmCliente
      ? `<div class="note v" style="margin:0 0 12px"><b>Confirmada con el cliente.</b>
          ${esc(w.confirmCliente.contacto)} confirmó el ${esc(w.confirmCliente.fecha)} por
          ${esc(w.confirmCliente.medio.toLowerCase())} · ${esc(w.confirmCliente.quien)} ${esc(w.confirmCliente.hora)}.</div>`
      : `<div class="note w" style="margin:0 0 12px"><b>Esta fecha todavía no la confirmó el cliente.</b>
          Puedes asignar igual, pero si después la mueven, el técnico ya tenía el día tomado.
          <button class="btn sm" data-a="progCliente" data-id="${id}" style="margin-left:7px">Coordinar ahora</button></div>`}
    ${cand.map(c=>{
    const dis = c.est==="bloq"||c.est==="lleno";
    const col = c.est==="bloq"||c.est==="lleno"?"r":c.est==="warn"?"w":"v";
    return `<button class="btn" style="width:100%;justify-content:flex-start;margin-bottom:7px;padding:10px 12px;${dis?"opacity:.6":""}"
      data-a="${dis?"asigNo":"asigSi"}" data-id="${id}" data-tec="${c.t.id}">
      <div class="av" style="background:var(--surface-3);color:var(--soft)">${esc(c.t.nombre[0]+c.t.apellido[0])}</div>
      <div style="flex:1;text-align:left;min-width:0">
        <div style="font-weight:700">${esc(tecN(c.t.id))}</div>
        <div style="font-size:11px;color:var(--faint)">${esc(c.m)}</div>
        <div style="margin-top:4px">${c.t.esp.map(e=>`<span class="pill ${e===espReq?"v":"g"}" style="margin:0 3px 3px 0">${e===espReq?"★ ":""}${esc(e)}</span>`).join("")}</div></div>
      <span class="pill ${col}"><span class="dot"></span>${c.est==="bloq"?"No disponible":c.est==="lleno"?"Cupo lleno":c.est==="warn"?"Revisar":"Disponible"}</span>
    </button>`;}).join("")}
    <div class="tr">Necesita <span class="pill v">★ ${esc(espReq)}</span> para este trabajo — se resalta en verde en quien la tenga. También cruza zona, carga del día y permisos antes de dejarte asignar.</div></div>
  <div class="mf"><button class="btn" data-a="cm">Cancelar</button></div>`);
}

function modalPermiso(){
  modal(`<div class="mh"><h3>Registrar permiso o vacaciones</h3><p>Lo que hoy se avisa por WhatsApp y no queda en ningún lado.</p></div>
  <div class="mb">
    <div class="fld"><label>Técnico <span class="req">*</span></label><select id="pT">${S.tecnicos.filter(t=>t.activo).map(t=>`<option value="${t.id}">${esc(tecN(t.id))}</option>`).join("")}</select></div>
    <div class="fg c2">
      <div class="fld"><label>Desde <span class="req">*</span></label><input type="date" id="pD" value="2026-08-18"></div>
      <div class="fld"><label>Hasta <span class="req">*</span></label><input type="date" id="pH" value="2026-08-20"></div></div>
    <div class="fld"><label>Motivo <span class="req">*</span></label><input id="pM" placeholder="Vacaciones, permiso personal, incapacidad…"></div>
    <div class="note">Al aprobarlo, el técnico deja de aparecer como opción para asignar en esas fechas.</div>
  </div>
  <div class="mf"><button class="btn" data-a="cm">Cancelar</button><button class="btn p" data-a="permisoGuardar">Registrar</button></div>`);
}

/* ── CORREGIR ─────────────────────────────────────────────────────────────
   Aquí nada se borra, pero equivocarse tecleando es normal y hasta ahora no
   había cómo arreglarlo: quedaba el error para siempre. Se puede corregir
   cualquier dato. Lo que NO se puede es que la corrección pase sin dejar
   rastro: cada campo tocado queda en la Bitácora con el valor de antes y el
   de después, con quién lo hizo y a qué hora. Claudia lo ve completo. */
