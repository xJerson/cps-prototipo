"use strict";
VIEWS.tablero = () => {
  const sem = S.wos.filter(w=>w.semana===S.semana && w.estado!=="Canceled");
  const cnt = e => sem.filter(w=>w.estado===e).length;
  const porCat = {};
  sem.forEach(w=>porCat[w.cat]=(porCat[w.cat]||0)+1);
  const ing = sem.filter(w=>w.estado==="Completed")
                 .reduce((a,w)=>a+(ingresoWO(w)||0),0);
  return `
  <div class="ph"><div><h2>Tablero</h2><p>Semana ${S.semana} · lo mismo que hoy calculan a mano en la pestaña Dashboard.</p></div></div>
  <div class="kpis">
    <div class="kpi"><div class="l">Total semana</div><div class="v">${sem.length}</div></div>
    <div class="kpi"><div class="l">Sin técnico</div><div class="v ${sem.filter(w=>!w.tec).length?"w":"g"}">${sem.filter(w=>!w.tec).length}</div></div>
    <div class="kpi"><div class="l">Ya llegaron</div><div class="v g">${sem.filter(w=>asisDe(w.id)).length}</div></div>
    <div class="kpi"><div class="l">Esperando aprobación</div><div class="v ${cnt("Esperando aprobación")?"w":""}">${cnt("Esperando aprobación")}</div></div>
    <div class="kpi"><div class="l">En progreso</div><div class="v">${cnt("In progress")}</div></div>
    <div class="kpi"><div class="l">Terminadas</div><div class="v g">${cnt("Completed")}</div></div>
    <div class="kpi"><div class="l">Ingreso semana</div><div class="v mono">${money(ing)}</div></div>
  </div>

  ${vPendientes()}

  <div class="card">
    <div class="chd"><h3>Cuántas llevamos, por tipo de servicio</h3>
      <span class="s">semana ${S.semana}</span>
      <span class="r"><button class="btn sm" data-a="ir" data-m="reportes">Ver reporte completo →</button></span></div>
    <div class="cp" style="display:flex;flex-wrap:wrap;gap:9px">
    ${CAT.categorias.filter(c=>porCat[c]).map(c=>{
      const n=porCat[c], pct=Math.round(n/sem.length*100);
      return `<div style="flex:1;min-width:112px;border:1px solid var(--line);border-radius:9px;padding:10px 12px">
        <div style="font-size:11px;font-weight:700;color:var(--faint);text-transform:uppercase;letter-spacing:.04em">${esc(c)}</div>
        <div class="mono" style="font-size:22px;font-weight:750">${n}</div>
        <div style="background:var(--surface-3);border-radius:3px;height:4px;margin-top:5px">
          <div style="background:var(--azul);height:4px;border-radius:3px;width:${pct}%"></div></div></div>`;
    }).join("")||`<div class="empty" style="width:100%">Sin trabajos esta semana</div>`}
    </div>
    <div class="cp" style="border-top:1px solid var(--line)"><div class="tr" style="margin:0">Es el vistazo. Para ver <b>en dónde están</b> y desglosar por zona, técnico o propiedad, entra a <b>Reportes</b>.</div></div>
  </div>`;
};

/* Lo que el Tablero sí debe tener: lo que hay que atender hoy, con el camino para hacerlo */
function vPendientes(){
  const items = [
    {n:"Excepciones sin resolver", c:excPend().length, m:"excepciones",
     d:"Frenan el pago y la factura de la WO que tienen atada", k:"r"},
    {n:"Work Orders sin técnico",  c:S.wos.filter(w=>!w.tec&&esAgendada(w.estado)).length, m:"wo",
     d:"Agendadas pero sin nadie asignado", k:"w"},
    {n:"Asignadas sin marcar llegada", c:S.wos.filter(w=>w.tec&&esAgendada(w.estado)&&!asisDe(w.id)).length, m:"tecnicos",
     d:"Ya pasó su hora y el técnico no ha reportado", k:"w"},
    {n:"Terminadas por supervisar", c:S.wos.filter(w=>w.estado==="Completed"&&!w.supervisada).length, m:"supervision",
     d:"No se pueden facturar hasta que Gustavo las revise", k:"a"},
    {n:"Listas para facturar",     c:S.wos.filter(w=>w.estado==="Completed"&&w.supervisada&&!w.facturada).length, m:"facturacion",
     d:"Trabajo hecho que todavía no se cobra", k:"a"},
    {n:"Estimados esperando al cliente", c:S.estimados.filter(e=>e.estado==="Enviado").length, m:"estimados",
     d:"Enviados y sin respuesta", k:"g"},
    {n:"Permisos por aprobar",     c:S.disponibilidad.filter(d=>d.estado==="Pendiente").length, m:"despacho",
     d:"Técnicos esperando respuesta", k:"g"},
    {n:"Facturas vencidas",        c:S.facturas.filter(facVencida).length, m:"cobranza",
     d:"Más de 30 días sin pago", k:"r"},
    {n:"Productos con stock bajo", c:S.productos.filter(p=>stock(p.id)<p.min).length, m:"inventario",
     d:"Por debajo del mínimo", k:"w"}
  ].filter(x=>x.c>0 && puede(x.m));
  if(!items.length) return `<div class="card"><div class="cp"><div class="note v" style="margin:0">
    <b>Nada pendiente de tu parte.</b> Ninguna excepción abierta, todo asignado y nada esperando decisión.</div></div></div>`;
  return `
  <div class="card"><div class="chd"><h3>Lo que necesita tu atención</h3>
    <span class="s">${items.reduce((a,x)=>a+x.c,0)} cosas esperando · ordenadas por urgencia</span></div>
    <table><tbody>${items.sort((a,b)=>({r:0,w:1,a:2,g:3})[a.k]-({r:0,w:1,a:2,g:3})[b.k]).map(x=>`
      <tr class="cl" data-a="ir" data-m="${x.m}">
        <td style="width:52px"><span class="pill ${x.k}" style="font-size:13px;padding:4px 10px">${x.c}</span></td>
        <td><div style="font-weight:650">${esc(x.n)}</div>
          <div style="font-size:11px;color:var(--faint)">${esc(x.d)}</div></td>
        <td style="text-align:right;color:var(--azul);font-weight:650;font-size:12px">Ir →</td></tr>`).join("")}
    </tbody></table></div>`;
}

/* ── WORK ORDERS ── */
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
      ${woEditable(w)?`<button class="btn" data-a="woEditar" data-id="${w.id}">Corregir datos</button>`:""}
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
        <span class="s">trabajos que cuelgan de esta WO — planificados desde oficina o encontrados por el técnico en sitio</span>
        <span class="r"><button class="btn sm p" data-a="subwoNueva" data-id="${w.id}">+ Nueva Sub-Work Order</button></span></div>
        ${sols.length?`<table><thead><tr><th>Tipo</th><th>Origen</th><th>Ubicación</th><th class="num">Cant.</th><th class="num">P. unit.</th><th class="num">Importe</th><th>Estado</th><th>Fotos</th></tr></thead><tbody>
        ${sols.map(s=>`
          <tr><td colspan="8" style="background:var(--azul-cl);color:var(--azul-s)">
            <b>${s.origen==="Planificada"?"Sub-Work Order planificada":"Un solo aviso del técnico"}</b>${s.desc?" · "+esc(s.desc):""}</td></tr>
          ${s.lineas.map(a=>`<tr><td><b>${esc(a.concepto)}</b></td><td><span class="pill ${a.origen==="Planificada"?"a":"m"}">${esc(a.origen||"Técnico")}</span></td><td>${esc(a.ubic)}</td>
            <td class="num mono">${a.cant||1}</td>
            <td class="num mono">${a.precio?money(a.precio):"—"}</td>
            <td class="num mono">${a.precio?money(a.precio*(a.cant||1)):"—"}</td>
            <td><span class="pill ${a.estado==="Aprobado"?"v":a.estado==="Rechazado"?"r":"w"}">${a.estado}</span></td>
            <td><div style="display:flex;gap:4px"><button class="btn sm" title="Fotos de referencia" data-a="subwoFotoRef" data-id="${a.id}">📷 Ref ${a.fotosRef||0}</button>
              <button class="btn sm" title="Fotos de evidencia" data-a="subwoFotoEvid" data-id="${a.id}">📷 Evid ${a.fotosEvid||0}</button></div></td></tr>
            ${(a.specs&&Object.keys(a.specs).length)||a.tec||a.fecha?`<tr><td colspan="8" style="padding-top:0;padding-bottom:9px">
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                ${Object.entries(a.specs||{}).map(([k,v])=>`<span class="pill">${esc(k)}: ${esc(v)}</span>`).join("")}
                ${a.tec?`<span class="pill w">Técnico distinto: ${esc(tecN(a.tec))}</span>`:""}
                ${a.fecha?`<span class="pill w">Fecha distinta: ${esc(a.fecha)}</span>`:""}
              </div></td></tr>`:""}`).join("")}
          ${s.lineas.length>1?`<tr><td colspan="5" style="color:var(--faint)">Aprobado de esta solicitud</td>
            <td class="num mono" style="font-weight:750">${money(s.lineas.filter(l=>l.estado==="Aprobado").reduce((t,l)=>t+(l.precio||0)*(l.cant||1),0))}</td>
            <td colspan="2"></td></tr>`:""}`).join("")}
        </tbody></table>`:`<div class="cp"><div style="color:var(--faint);font-size:12px">Todavía no tiene ninguna Sub-Work Order.</div></div>`}</div>

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
        <div class="cp">${w.evid?`<div style="display:flex;gap:6px;flex-wrap:wrap">${Array.from({length:w.evid}).map(()=>`<div style="width:72px;height:54px;border-radius:7px;background:linear-gradient(135deg,#7fa8c9,#2d5a80)"></div>`).join("")}</div>`
          :`<div style="color:var(--faint);font-size:12px">Todavía sin fotos del trabajo.</div>`}</div></div>

      ${mv.length?`<div class="card"><div class="chd"><h3>Material usado</h3></div><table><tbody>
        ${mv.map(m=>`<tr><td>${esc(by(S.productos,m.prod).nombre)}</td><td class="mono">${m.cant}</td><td class="num mono">${money(m.costo)}</td></tr>`).join("")}
      </tbody></table></div>`:""}
    </div>
  </div>`;
}

/* ── REPORTES ── la Pivot Table 3, pero sin refrescarla a mano y pudiendo pivotear ── */
const DIMS = {
  semana:  {n:"Semana",           f:w=>"Semana "+w.semana},
  fecha:   {n:"Día",              f:w=>w.fecha},
  prop:    {n:"Propiedad",        f:w=>P(w.prop).nombre},
  tec:     {n:"Técnico",          f:w=>w.tec?tecN(w.tec):"— sin asignar —"},
  zona:    {n:"Zona",             f:w=>P(w.prop).zona},
  estado:  {n:"Estado",           f:w=>w.estado},
  cliente: {n:"Management",          f:w=>CLI(P(w.prop).cliente).nombre}
};
const MEDIDAS = {
  cant:  {n:"Cantidad de trabajos", f:()=>1,                     fmt:v=>v||""},
  ing:   {n:"Ingreso",              f:w=>ingresoWO(w)||0,        fmt:v=>v?money(v):""},
  egr:   {n:"Pago a técnicos",      f:w=>egresoWO(w)||0,         fmt:v=>v?money(v):""},
  util:  {n:"Utilidad",             f:w=>utilidadWO(w)||0,       fmt:v=>v?money(v):""}
};

VIEWS.reportes = () => {
  const dim = S.repDim||"semana";
  /* Si cambió de usuario con "Utilidad" seleccionado (queda en S.repMed,
     no se resetea solo al cambiar de rol), no se le queda mostrando ese
     número igual — cae de vuelta a la medida por defecto. */
  let med = S.repMed||"cant";
  if(med==="util" && !puedeVerUtilidad()) med = "cant";
  const D = DIMS[dim], M = MEDIDAS[med];
  const MEDIDAS_VISIBLES = Object.entries(MEDIDAS).filter(([k])=>k!=="util"||puedeVerUtilidad());
  const ws = S.wos.filter(w=>w.estado!=="Canceled");
  const cols = CAT.categorias.filter(c=>ws.some(w=>w.cat===c));   // incluye los de baja si hay historia
  const filas = {};
  ws.forEach(w=>{
    const k=D.f(w);
    filas[k] = filas[k] || {};
    filas[k][w.cat] = (filas[k][w.cat]||0) + M.f(w);
    filas[k].__tot = (filas[k].__tot||0) + M.f(w);
  });
  const claves = Object.keys(filas).sort();
  const totCol = c => claves.reduce((a,k)=>a+(filas[k][c]||0),0);
  const granTotal = claves.reduce((a,k)=>a+filas[k].__tot,0);
  const maxTot = Math.max(1,...claves.map(k=>filas[k].__tot));

  return `
  <div class="ph"><div><h2>Reportes</h2>
    <p>Es la <code>Pivot Table 3</code>: conteo por tipo de servicio. Aquí se recalcula sola y puedes cambiar por qué agrupar.</p></div></div>

  <div class="card"><div class="cp" style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-end">
    <div class="fld" style="margin:0;min-width:190px"><label>Agrupar por</label>
      <select id="repDim" data-a="repCambia">${Object.entries(DIMS).map(([k,v])=>`<option value="${k}" ${k===dim?"selected":""}>${esc(v.n)}</option>`).join("")}</select></div>
    <div class="fld" style="margin:0;min-width:190px"><label>Qué medir</label>
      <select id="repMed" data-a="repCambia">${MEDIDAS_VISIBLES.map(([k,v])=>`<option value="${k}" ${k===med?"selected":""}>${esc(v.n)}</option>`).join("")}</select></div>
    <div style="margin-left:auto;text-align:right">
      <div style="font-size:10.5px;color:var(--faint);text-transform:uppercase;letter-spacing:.05em">Gran total</div>
      <div class="mono" style="font-size:22px;font-weight:750">${med==="cant"?granTotal:money(granTotal)}</div></div>
  </div></div>

  <div class="card" style="overflow-x:auto"><div class="chd"><h3>${esc(M.n)} por ${esc(D.n.toLowerCase())} y tipo de servicio</h3>
    <span class="s">${claves.length} fila(s) · ${cols.length} tipos</span></div>
    <table><thead><tr><th style="position:sticky;left:0;background:var(--surface)">${esc(D.n)}</th>
      ${cols.map(c=>`<th class="num">${esc(c)}</th>`).join("")}
      <th class="num" style="border-left:2px solid var(--line)">Grand Total</th></tr></thead>
    <tbody>${claves.map(k=>`<tr>
      <td style="font-weight:650;position:sticky;left:0;background:var(--surface)">${esc(k)}</td>
      ${cols.map(c=>`<td class="num mono ${filas[k][c]?"celda":""}" ${filas[k][c]?`data-a="repDetalle" data-k="${esc(k)}" data-c="${esc(c)}"`:""} style="${filas[k][c]?"":"color:var(--faint)"}">${M.fmt(filas[k][c]||0)||"·"}</td>`).join("")}
      <td class="num mono" style="font-weight:700;border-left:2px solid var(--line)">
        ${M.fmt(filas[k].__tot)}
        <div style="background:var(--surface-3);border-radius:3px;height:4px;margin-top:3px">
          <div style="background:var(--azul);height:4px;border-radius:3px;width:${Math.round(filas[k].__tot/maxTot*100)}%"></div></div></td></tr>`).join("")}
      <tr style="background:var(--surface-2);font-weight:750">
        <td style="position:sticky;left:0;background:var(--surface-2)">Total</td>
        ${cols.map(c=>`<td class="num mono">${M.fmt(totCol(c))||"·"}</td>`).join("")}
        <td class="num mono" style="border-left:2px solid var(--line)">${M.fmt(granTotal)}</td></tr>
    </tbody></table></div>

  <div class="note"><b>Toca cualquier número y se abre.</b> Claudia: «nos sirve para contabilizar… para mañana tenemos 11 limpiezas y 18 pinturas.
    Es información general, pero <b>necesitamos un desglose mayor: saber pinturas, pero en dónde están para poder agendar</b>. Aquí yo no lo puedo ver, tengo que regresarme al otro archivito».</div>

  ${vPorZona()}

  <div class="tr" style="margin-top:8px">Hoy esto es una tabla dinámica de mil filas que alguien refresca a mano, y que solo da totales.</div>

  ${vSeguimiento()}`;
};

/* «Necesitamos saber pinturas, pero EN DÓNDE ESTÁN para poder agendar» — el desglose por zona */
function vPorZona(){
  const dia = S.repDia || "2026-08-12";
  const dias = [...new Set(S.wos.filter(w=>w.estado!=="Canceled").map(w=>w.fecha))].sort();
  const ws = S.wos.filter(w=>w.fecha===dia && w.estado!=="Canceled");
  const porZona = {};
  ws.forEach(w=>{ const z=P(w.prop).zona; (porZona[z]=porZona[z]||[]).push(w); });
  const zonas = Object.keys(porZona).sort((a,b)=>porZona[b].length-porZona[a].length);
  return `
  <div class="card"><div class="chd"><h3>Qué hay y dónde está — para poder agendar</h3>
    <span class="s">agrupado por zona, porque el traslado quita tiempo</span>
    <span class="r"><select id="repDia" data-a="repDiaCambia" style="font-family:inherit;font-size:12.5px;padding:5px 8px;border:1px solid var(--line);border-radius:7px;background:var(--surface);color:var(--ink)">
      ${dias.map(d=>`<option value="${d}" ${d===dia?"selected":""}>${d}</option>`).join("")}</select></span></div>
    ${zonas.length?`<div class="cp" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px">
      ${zonas.map(z=>{
        const arr=porZona[z];
        const porTipo={}; arr.forEach(w=>porTipo[w.cat]=(porTipo[w.cat]||0)+1);
        const props=[...new Set(arr.map(w=>w.prop))];
        return `<div style="border:1px solid var(--line);border-radius:9px;overflow:hidden">
          <div style="background:var(--azul-cl);padding:9px 12px;display:flex;align-items:center;gap:8px">
            <b style="color:var(--azul-s)">${esc(z)}</b>
            <span class="pill a" style="margin-left:auto">${arr.length} trabajo(s)</span>
            <span class="pill g">${props.length} propiedad(es)</span></div>
          <div style="padding:9px 12px;display:flex;flex-wrap:wrap;gap:5px;border-bottom:1px solid var(--line)">
            ${Object.entries(porTipo).map(([c,n])=>`<span class="pill ${c==="Paint"?"m":c==="Clean"?"v":"g"}">${n} ${esc(c)}</span>`).join("")}</div>
          <table><tbody>${props.map(pid=>{
            const suyas=arr.filter(w=>w.prop===pid);
            return `<tr><td style="padding:7px 12px">
              <div style="font-weight:650;font-size:12px">${esc(P(pid).nombre)}</div>
              <div style="font-size:10.5px;color:var(--faint)">${esc(P(pid).dir)}</div>
              <div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:4px">
                ${suyas.map(w=>`<span class="pill g" style="cursor:pointer" data-a="woVer" data-id="${w.id}">${esc(U(w.unidad).num)} · ${esc(w.serv)}${w.tec?"":" ⚠"}</span>`).join("")}</div>
            </td></tr>`;}).join("")}</tbody></table>
        </div>`;
      }).join("")}</div>`
    :`<div class="empty">Nada agendado ese día</div>`}
    <div class="cp" style="border-top:1px solid var(--line)"><div class="tr" style="margin:0">
      El <b>⚠</b> marca las que todavía no tienen técnico. Con esto se asigna por cercanía en vez de abrir otro archivo para ver dónde queda cada propiedad.</div></div>
  </div>`;
}

/* Lo que Claudia pidió y el conteo no da: QUÉ propiedad dejó de agendar, para ir por ella */
function vSeguimiento(){
  const META_MIN = 50, META_MAX = 60;
  const activas = new Set(S.wos.filter(w=>w.estado!=="Canceled").map(w=>w.prop));
  const sinMov  = S.propiedades.filter(p=>!activas.has(p.id));
  const conMov  = S.propiedades.filter(p=>activas.has(p.id));
  const pct = Math.min(100, Math.round(activas.size/META_MIN*100));
  return `
  <div class="card" style="margin-top:14px"><div class="chd">
    <h3>Seguimiento comercial — propiedades que están agendando</h3>
    <span class="s">Claudia: «cuando no veo una o dos, digo algo está pasando»</span></div>
    <div class="cp">
      <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:7px">
        <span class="mono" style="font-size:30px;font-weight:750">${activas.size}</span>
        <span style="color:var(--faint);font-size:12.5px">de ${META_MIN}–${META_MAX} esperadas al mes</span>
        ${activas.size<META_MIN
          ? `<span class="pill w" style="margin-left:auto"><span class="dot"></span>${META_MIN-activas.size} por debajo del mínimo</span>`
          : `<span class="pill v" style="margin-left:auto">en rango</span>`}
      </div>
      <div style="background:var(--surface-3);border-radius:5px;height:10px">
        <div style="background:${activas.size<META_MIN?"var(--ambar)":"var(--verde)"};height:10px;border-radius:5px;width:${pct}%"></div></div>
    </div>
    ${sinMov.length?`<table><thead><tr><th>Propiedad que dejó de agendar</th><th>Cliente</th><th>Zona</th><th>Última Work Order</th><th></th></tr></thead>
      <tbody>${sinMov.map(p=>`<tr>
        <td style="font-weight:650">${esc(p.nombre)}<div style="font-size:10.5px;color:var(--faint)">${esc(p.dir)}</div></td>
        <td>${esc(CLI(p.cliente).nombre)}</td><td>${esc(p.zona)}</td>
        <td style="color:var(--rojo)">sin trabajos registrados</td>
        <td style="text-align:right"><button class="btn sm" data-a="propVer" data-id="${p.id}">Ver ficha</button></td></tr>`).join("")}
      </tbody></table>
      <div class="cp" style="border-top:1px solid var(--line)"><div class="note w" style="margin:0">
        <b>Estas son las que hay que ir a buscar.</b> Claudia: «es cuando tendría que entrar con mi supervisor para darle seguimiento a esa propiedad que no está agendando conmigo».</div></div>`
    :`<div class="empty"><div class="b">✓</div>Todas las propiedades registradas tienen trabajo agendado</div>`}
  </div>

  <div class="card"><div class="chd"><h3>Detalle por propiedad</h3>
    <span class="s">cuántos trabajos y cuánto ingreso genera cada una</span></div>
    <table><thead><tr><th>Propiedad</th><th>Cliente</th><th class="num">Trabajos</th><th class="num">Ingreso</th>${puedeVerUtilidad()?`<th class="num">Utilidad</th>`:""}</tr></thead>
    <tbody>${conMov.map(p=>{
      const ws=S.wos.filter(w=>w.prop===p.id&&w.estado!=="Canceled");
      const ing=ws.reduce((a,w)=>a+(ingresoWO(w)||0),0);
      const uti=ws.reduce((a,w)=>a+(utilidadWO(w)||0),0);
      return `<tr class="cl${fl("prop:"+p.id)}" data-a="propVer" data-id="${p.id}">
        <td style="font-weight:650">${esc(p.nombre)}</td><td>${esc(CLI(p.cliente).nombre)}</td>
        <td class="num mono">${ws.length}</td><td class="num mono">${money(ing)}</td>
        ${puedeVerUtilidad()?`<td class="num mono" style="color:${uti>=0?"var(--verde)":"var(--rojo)"}">${money(uti)}</td>`:""}</tr>`;
    }).join("")}</tbody></table></div>`;
}

/* ── TRAZABILIDAD ── la cadena completa de una Work Order, de punta a punta ── */
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
const LUN_S33 = "2026-08-10";                       // la semana 33 arranca un lunes
const DIAS_SEM = ["LUNES","MARTES","MI\u00c9RCOLES","JUEVES","VIERNES","S\u00c1BADO"];
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto",
  "septiembre","octubre","noviembre","diciembre"];

/* \u2500\u2500 SELECTOR DE PER\u00cdODO \u2500\u2500 N\u00f3mina y Facturaci\u00f3n ya no miran solo "la
   semana actual": d\u00eda puntual, semana, rango de fechas o mes completo. */
function enPeriodo(fecha, per){
  if(!fecha || !per) return false;
  if(per.tipo==="dia")   return !!per.dia && fecha===per.dia;
  if(per.tipo==="rango") return !!per.desde && !!per.hasta && fecha>=per.desde && fecha<=per.hasta;
  if(per.tipo==="mes")   return !!per.mes && fecha.slice(0,7)===`${per.anio}-${String(per.mes).padStart(2,"0")}`;
  return semanaDe(fecha)===per.sem;   // "semana" \u2014 y cualquier per\u00edodo mal armado cae ac\u00e1
}
function periodoTexto(per){
  if(per.tipo==="dia")   return per.dia   ? per.dia                         : "\u2014 elige un d\u00eda \u2014";
  if(per.tipo==="rango") return (per.desde&&per.hasta) ? `${per.desde} al ${per.hasta}` : "\u2014 elige un rango \u2014";
  if(per.tipo==="mes")   return per.mes   ? `${MESES[per.mes-1]} de ${per.anio}`        : "\u2014 elige un mes \u2014";
  return `semana ${per.sem}`;
}
function renderSelectorPeriodo(){
  const per = S.periodo;
  const camposTipo = {
    semana: `<button class="btn sm" data-a="perNav" data-s="${per.sem-1}">\u2039</button>
      <span class="mono" style="padding:0 4px">Semana ${per.sem}</span>
      <button class="btn sm" data-a="perNav" data-s="${per.sem+1}">\u203a</button>`,
    dia:    `<input type="date" data-a="perDia" value="${esc(per.dia||"")}">`,
    rango:  `<input type="date" data-a="perDesde" value="${esc(per.desde||"")}">
      <span style="color:var(--faint)">al</span>
      <input type="date" data-a="perHasta" value="${esc(per.hasta||"")}">`,
    mes:    `<select data-a="perMes">${MESES.map((m,i)=>`<option value="${i+1}" ${per.mes===i+1?"selected":""}>${m}</option>`).join("")}</select>
      <input type="number" data-a="perAnio" value="${per.anio}" class="mono" style="width:70px">`
  };
  return `<div class="act" style="align-items:center;gap:7px;flex-wrap:wrap">
    <select data-a="perTipo">
      <option value="semana" ${per.tipo==="semana"?"selected":""}>Semana</option>
      <option value="dia" ${per.tipo==="dia"?"selected":""}>D\u00eda</option>
      <option value="rango" ${per.tipo==="rango"?"selected":""}>Rango de fechas</option>
      <option value="mes" ${per.tipo==="mes"?"selected":""}>Mes</option>
    </select>
    ${camposTipo[per.tipo]}
  </div>`;
}
function diasDeSemana(sem){
  const base = new Date(LUN_S33 + "T12:00:00");
  base.setDate(base.getDate() + (sem - 33) * 7);
  return DIAS_SEM.map((_, i) => {
    const d = new Date(base); d.setDate(base.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}
VIEWS.calendario = () => {
  const sem  = S.semCal || S.semana;
  const dias = diasDeSemana(sem);
  const anio = dias[0].slice(0, 4);
  /* Su hoja lista a todos, incluido Gustavo, tengan o no trabajo esa semana. */
  const tecs = S.tecnicos.filter(t => t.activo);
  const nDia = f => { const d = new Date(f + "T12:00:00"); return d.getDate(); };
  const enSemana = S.wos.filter(w => w.estado !== "Canceled" && dias.includes(w.fecha)).length;

  return `
  <div class="ph"><div><h2>Agenda semanal — Work Orders</h2>
    <p>Es su pestaña <code>Calendar</code>, con las mismas columnas. Hoy se rearma a mano cada semana;
    acá se llena sola al agendar.</p></div>
    <div class="act">
      <button class="btn sm" data-a="calSem" data-s="${sem - 1}">‹ Semana ${sem - 1}</button>
      <button class="btn sm" data-a="calSem" data-s="${sem + 1}">Semana ${sem + 1} ›</button>
      ${sem !== S.semana ? `<button class="btn sm p" data-a="calSem" data-s="${S.semana}">Volver a la ${S.semana}</button>` : ""}
    </div></div>

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
VIEWS.propiedades = () => {
  if(S.sub) return fichaProp(S.sub);
  return `
  <div class="ph"><div><h2>Propiedades</h2>
    <p>La pestaña <code>Propiedades</code>. Los tres contactos dejan de ser 9 columnas repetidas y las unidades dejan de vivir sueltas.</p></div>
    <div class="act"><button class="btn p" data-a="propNueva">+ Nueva propiedad</button></div></div>
  <div class="card"><table>
    <thead><tr><th>Propiedad</th><th>Zona</th><th>Cliente (Management)</th><th class="num">Unidades</th><th class="num">Contactos</th><th>COI</th><th>Estado</th></tr></thead>
    <tbody>${S.propiedades.map(p=>{
      const nu=S.unidades.filter(u=>u.prop===p.id).length, nc=S.contactos.filter(c=>c.prop===p.id).length;
      return `<tr class="cl${fl("prop:"+p.id)}" data-a="propVer" data-id="${p.id}">
        <td style="font-weight:650">${esc(p.nombre)}<div style="font-size:10.5px;color:var(--faint)">${esc(p.dir)}</div></td>
        <td>${esc(p.zona)}</td><td>${p.cliente?esc(CLI(p.cliente).nombre):'<span style="color:var(--faint)">—</span>'}<div style="font-size:10.5px;color:var(--faint)">${esc(p.estado||"")}</div></td>
        <td class="num mono">${nu}</td><td class="num mono">${nc}</td>
        <td>${p.polizas&&p.polizas.length?`<span class="pill ${coiVigente(p.id)?"v":"r"}">${esc(p.polizas.reduce((a,x)=>!a||x.vence<a?x.vence:a,null))}</span>`:`<span class="pill r"><span class="dot"></span>falta</span>`}</td>
        <td>${p.activa?'<span class="pill v">Activa</span>':'<span class="pill g">Sin movimiento</span>'}</td></tr>`;
    }).join("")}</tbody></table></div>
  <div class="tr">Hoy <code>Active?</code> está lleno en muy pocas propiedades, así que «¿sigue activa?» no se puede responder. Aquí es un campo con dos valores y nada más.</div>`;
};

function fichaProp(id){
  const p=P(id), t=S.tab||"datos";
  const us=S.unidades.filter(u=>u.prop===id), cs=S.contactos.filter(c=>c.prop===id);
  const ws=S.wos.filter(w=>w.prop===id);
  const tf=S.tarifas.filter(x=>x.prop===id);
  const coms=S.comunicaciones.filter(m=>m.prop===id);
  return `
  <div class="ph"><div>
    <button class="btn sm" data-a="ir" data-m="propiedades" style="margin-bottom:7px">‹ Propiedades</button>
    <h2>${esc(p.nombre)} ${p.activa?"":'<span class="pill g" style="vertical-align:middle">Dada de baja</span>'}</h2>
    <p>${esc(p.zona)} · ${p.cliente?esc(CLI(p.cliente).nombre):'<span style="color:var(--faint)">sin management</span>'} · ${esc(p.dir)}</p></div>
    <div class="act"><button class="btn" data-a="propNueva" data-id="${id}">Corregir datos</button>
      <button class="btn ${p.activa?"":"v"}" data-a="propBaja" data-id="${id}">
      ${p.activa?"Dar de baja":"Reactivar"}</button></div></div>
  <div class="tabs">${[["datos","Datos"],["expediente",`Expediente ${expedienteOK(id)?"✓":"— incompleto"}`],["documentos","Documentos"],["unidades",`Unidades (${us.length})`],["contactos",`Contactos (${cs.length})`],["com",`Comunicación (${coms.length})`],["precios",`Price List (${tf.length})`],["previo",`Informes de campo (${S.reportes.filter(r=>r.prop===id).length})`],["hist",`Historial (${ws.length})`]]
    .map(([k,n])=>`<button class="tab ${t===k?"on":""}" data-a="tab" data-t="${k}">${n}</button>`).join("")}</div>

  ${t==="expediente"?(()=>{
    /* "Estimado aprobado" nace de una Solicitud Comercial — pero si ya hay
       una registrada para esta propiedad esperando convertirse, mandar a
       "crear otra" es un paso de más y confunde ("ya creé la solicitud,
       ¿y ahora?"). Si ya existe una lista, el botón va directo a armar el
       estimado desde ella; solo pide una nueva si de verdad no hay ninguna. */
    const solLista = S.solicitudesComerciales.find(sc=>sc.prop===id && sc.estado!=="Estimado creado" && sc.estado!=="Descartada");
    return `<div class="card"><div class="chd"><h3>Expediente de la propiedad</h3>
    <span class="s">Claudia: «tú no puedes pasar al siguiente paso si no tienes el primero»</span></div>
    <table><thead><tr><th style="width:40px"></th><th>Campo</th><th>Valor</th><th style="width:130px"></th></tr></thead><tbody>
    ${expedienteDe(id).map(c=>`<tr>
      <td>${c.ok?'<span class="pill v">✓</span>':'<span class="pill r">—</span>'}</td>
      <td style="font-weight:${c.ok?"500":"700"}">${esc(c.n)}</td>
      <td style="color:${c.ok?"var(--soft)":"var(--rojo)"}">${c.ok
        ? esc(c.k==="contacto" ? S.contactos.filter(x=>x.prop===id).length+" contacto(s)"
            : c.k==="coi" ? p.polizas.length+" póliza(s)"
            /* "precios" y "estimado" tampoco son campos de la propiedad
               (p[c.k] no existe ahí) — mostraban literal "undefined" en
               vez del dato real, apenas se resolvía este punto por primera
               vez. Mismo error de fondo que el botón "Completar" de la
               vez pasada: se trataron como si fueran campos de p. */
            : c.k==="precios" ? S.tarifas.filter(t=>t.prop===id).length+" precio(s)"
            : c.k==="estimado" ? (S.estimados.find(e=>e.prop===id && e.estado==="Aprobado")||{}).num+" aprobado"
            : String(p[c.k]))
        : "falta"}</td>
      <td style="text-align:right">${c.ok?"":(c.k==="contacto"
        ? `<button class="btn sm p" data-a="conNuevo" data-prop="${id}">+ Contacto</button>`
        : c.k==="coi" ? `<button class="btn sm p" data-a="coiDirecto" data-id="${id}">Registrar COI</button>`
        /* "Price List" y "Estimado aprobado" no son campos de la propiedad
           (nombre, dirección, etc.) — son datos de otras dos colecciones.
           "Completar" los mandaba al formulario de "Corregir propiedad",
           que no tiene ningún campo para eso: el botón parecía funcionar
           pero no había nada ahí que de verdad resolviera el punto. */
        : c.k==="precios" ? `<button class="btn sm p" data-a="tab" data-t="precios" title="Se agrega desde la pestaña Price List de esta propiedad">Ir a Price List</button>`
        : c.k==="estimado" ? (solLista
            ? `<button class="btn sm p" data-a="solComEstimado" data-id="${solLista.id}" title="Ya hay una Solicitud Comercial de esta propiedad esperando — arma el estimado desde ahí">Crear estimado</button>`
            : `<button class="btn sm p" data-a="ir" data-m="solicitudes" title="El estimado nace de una Solicitud Comercial — regístrala primero">Registrar Solicitud Comercial</button>`)
        : `<button class="btn sm p" data-a="propNueva" data-id="${id}" data-f="${c.k}">Completar</button>`)}</td></tr>`).join("")}
    <tr><td><span class="pill a">i</span></td>
      <td style="font-weight:500">Unidades registradas</td>
      <td style="color:var(--soft)">${us.length?us.length+" unidad(es)":"0 — no bloquea, se van agregando solas al crear Work Orders o Estimados"}</td>
      <td style="text-align:right"><button class="btn sm" data-a="uniNueva" data-prop="${id}">+ Unidad</button></td></tr>
    </tbody></table>
    <div class="cp" style="border-top:1px solid var(--line)">
      <div style="margin-bottom:10px"><button class="btn sm" data-a="inspPedirModal" data-prop="${id}">Pedir inspección en sitio</button></div>
      ${expedienteOK(id)
        ? `<div class="note v" style="margin:0"><b>Expediente completo.</b> Esta propiedad ya puede pasar a programación sin que nadie tenga que llamar a preguntar nada.</div>`
        : `<div class="note r" style="margin:0"><b>Expediente incompleto.</b> El sistema no deja transferir a programación hasta que estén los ${expedienteDe(id).filter(c=>!c.ok).length} campos que faltan. Es lo que hoy se descubre cuando el técnico ya está en la propiedad.</div>`}
    </div>
    <div class="mf" style="border-top:1px solid var(--line)">
      <button class="btn ${expedienteOK(id)?"p":""}" data-a="transferir" data-id="${id}" ${expedienteOK(id)?"":"disabled"}>Transferir a programación</button>
    </div></div>

  ${vAltaGuiada(id)}`;
  })():""}

  ${t==="documentos"?`<div class="card"><div class="chd"><h3>Documentos</h3>
    <span class="s">El seguro de esta propiedad — un mismo certificado (ACORD 25) trae varias pólizas</span></div>
    ${p.polizas&&p.polizas.length?`<table><thead><tr><th>Tipo</th><th>Aseguradora</th><th>Póliza</th><th>Vence</th></tr></thead>
    <tbody>${p.polizas.map(x=>`<tr><td>${esc(x.tipo)}</td><td>${esc(x.aseguradora)||"—"}</td>
      <td class="mono">${esc(x.poliza)||"—"}</td><td><span class="pill ${x.vence&&x.vence>=HOY_SUP?"v":"r"}">${esc(x.vence)||"—"}</span></td></tr>`).join("")}
    </tbody></table>`:`<div class="empty">Sin pólizas registradas</div>`}
    <div class="cp" style="border-top:1px solid var(--line);display:flex;align-items:center;gap:8px">
      <span style="font-size:11.5px;color:var(--faint)">Certificado en PDF</span>
      ${p.coiPdf?`<span class="pill m">📎 ${esc(p.coiPdf)}</span>`:`<span class="pill w">sin PDF adjunto</span>`}
    </div>
    ${(p.coiHist&&p.coiHist.length)?`<div class="cp" style="border-top:1px solid var(--line)">
      <div style="font-size:11px;font-weight:750;text-transform:uppercase;letter-spacing:.05em;color:var(--faint);margin-bottom:8px">Historial de renovaciones</div>
      <table><thead><tr><th>Fecha</th><th>Hora</th><th>Pólizas</th><th>Quién</th></tr></thead>
      <tbody>${p.coiHist.slice().reverse().map(h=>`<tr><td class="mono">${esc(h.fecha)}</td>
        <td class="mono">${esc(h.hora)}</td>
        <td>${(h.polizas||[]).length?`<div class="cambios">${(h.polizas||[]).map(x=>x.venceAntes
          ?`<div><span class="cc">${esc(x.tipo)}</span> <span class="de">vence ${esc(x.venceAntes)}</span> <span class="fl">→</span> <b>vence ${esc(x.vence)}</b></div>`
          :`<div>${esc(x.tipo)} · vence ${esc(x.vence)}</div>`).join("")}</div>`:"—"}</td>
        <td>${esc(h.quien)}</td></tr>`).join("")}</tbody></table>
    </div>`:""}
    <div class="mf" style="border-top:1px solid var(--line)">
      <button class="btn p" data-a="coiDirecto" data-id="${id}">Registrar / editar pólizas</button>
    </div></div>`:""}

  ${t==="datos"?`<div class="card"><table><tbody>
    <tr><td style="color:var(--faint);width:210px">Zona (Area)</td><td>${esc(p.zona)}</td></tr>
    <tr><td style="color:var(--faint)">Management</td><td>${p.cliente
      ?esc(CLI(p.cliente).nombre)
      :`<span style="color:var(--faint)">— sin management —</span> <button class="btn sm" data-a="cliNuevo" data-prop="${id}" style="margin-left:8px">+ Registrar management</button>`}</td></tr>
    <tr><td style="color:var(--faint)">Client Status</td><td><span class="pill ${ESTCOL[p.estado]||"w"}">${esc(p.estado||"—")}</span></td></tr>
    <tr><td style="color:var(--faint)">Client Source</td><td>${esc(p.origen||"—")}</td></tr>
    <tr><td style="color:var(--faint)">Dirección</td><td>${esc(p.dir)}</td></tr>
    <tr><td style="color:var(--faint)">Door code</td><td class="mono">${esc(p.door)}</td></tr>
    <tr><td style="color:var(--faint)">Default Contact Method</td><td>${esc(p.pref)}</td></tr>
    <tr><td style="color:var(--faint)">Approval Method</td><td>${esc(p.aprob)}</td></tr>
    <tr><td style="color:var(--faint)">Accounts Payable Email 1</td><td>${esc(p.mailAP1)||"—"}</td></tr>
    <tr><td style="color:var(--faint)">Accounts Payable Email 2</td><td>${esc(p.mailAP2)||"—"}</td></tr>
    <tr><td style="color:var(--faint)">Special Property Requirements</td><td>${p.notas?`<b>${esc(p.notas)}</b>`:"—"}</td></tr>
    <tr><td colspan="2" style="padding-top:14px"><b style="font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--faint)">Información para el técnico</b></td></tr>
    <tr><td style="color:var(--faint)">Dónde está el shop</td><td>${esc(p.shop)||"—"}</td></tr>
    <tr><td style="color:var(--faint)">Código del shop</td><td class="mono">${esc(p.shopCode)||"—"}</td></tr>
    <tr><td style="color:var(--faint)">Horario</td><td>${esc(p.horario)||"—"}</td></tr>
    <tr><td style="color:var(--faint)">Información de pintura</td><td>${p.notasPaint?esc(p.notasPaint):'<span style="color:var(--rojo)">— falta, bloquea el Expediente —</span>'}</td></tr>
    <tr><td style="color:var(--faint)">Al terminar</td><td>${esc(p.finalExp)||"—"}</td></tr>
    <tr><td style="color:var(--faint)">Ojo</td><td>${esc(p.notasTec)||"—"}</td></tr>
    <tr><td style="color:var(--faint)">Activa</td><td>${p.activa?'<span class="pill v">Sí</span>':'<span class="pill g">No</span>'}</td></tr>
  </tbody></table></div>`:""}

  ${t==="unidades"?`<div class="card"><div class="chd"><h3>Unidades</h3>
    <span class="s">catálogo de referencia — no bloquea agendar, se va llenando solo con cada WO/Estimado</span>
    <span class="r"><button class="btn sm p" data-a="uniNueva" data-prop="${id}">+ Unidad</button></span></div>
    ${us.length?`<table><thead><tr><th>Building</th><th>Unidad</th><th class="num">Floor</th><th>Rooms</th><th class="num">Bathrooms</th><th>Occupancy</th><th>Detail</th><th class="num">Work Orders</th><th></th></tr></thead><tbody>
    ${us.map(u=>`<tr class="${fl("uni:"+u.id)}"><td class="mono">${esc(u.building)||"—"}</td><td style="font-weight:650">${esc(u.unidadNum||u.num)}</td><td class="num mono">${u.pisos}</td>
      <td>${esc(u.rooms)||'<span class="pill w">sin definir</span>'}</td>
      <td class="num mono">${u.bathrooms||"—"}</td>
      <td>${u.ocupacion==="Vacant"?'<span class="pill w">Vacant</span>':'<span class="pill v">Occupied</span>'}</td>
      <td>${(u.detalle||[]).map(x=>`${x.cantidad} ${esc(x.tipo)}`).join(" / ")||"—"}</td>
      <td class="num mono">${S.wos.filter(w=>w.unidad===u.id).length}</td>
      <td style="text-align:right"><button class="btn sm" data-a="uniNueva" data-id="${u.id}">Corregir</button></td></tr>`).join("")}
    </tbody></table>`:`<div class="empty">Todavía no hay ninguna registrada — no hace falta crearla aquí primero: aparece sola la primera vez que la uses en una Work Order o un Estimado.</div>`}</div>`:""}

  ${t==="contactos"?`<div class="card"><div class="chd"><h3>Contactos</h3>
    <span class="s">Manager · Assistant · Maintenance</span>
    <span class="r"><button class="btn sm p" data-a="conNuevo" data-prop="${id}">+ Contacto</button></span></div>
    ${cs.length?`<table><thead><tr><th>Tipo</th><th>Nombre</th><th>Correo</th><th>Teléfono</th><th></th></tr></thead><tbody>
    ${cs.map(c=>`<tr class="${fl("con:"+c.id)}"><td><span class="pill a">${esc(c.tipo)}</span></td><td style="font-weight:650">${esc(c.nombre)}</td>
      <td>${esc(c.mail)}</td><td class="mono">${esc(c.tel)}</td>
      <td style="text-align:right"><button class="btn sm" data-a="conNuevo" data-id="${c.id}">Corregir</button></td></tr>`).join("")}
    </tbody></table>`:`<div class="empty">Sin contactos</div>`}
    <div class="cp" style="border-top:1px solid var(--line)"><div class="tr" style="margin:0">Hoy son 9 columnas fijas (Manager/Mail/Phone, Assistant/Mail/Phone, Maintenance/Mail/Phone). Si una propiedad tiene dos managers, no cabe.</div></div></div>`:""}

  ${t==="com"?`<div class="card"><div class="chd"><h3>Comunicación</h3>
    <span class="s">cada llamada o correo con esta propiedad — no cambios de datos, eso ya lo guarda la Bitácora aparte</span></div>
    ${coms.length?`<table><thead><tr><th>Fecha</th><th>Medio</th><th>Con quién</th><th>Registró</th><th>Nota</th></tr></thead>
    <tbody>${coms.slice().reverse().map(m=>`<tr><td class="mono">${esc(m.fecha)}</td><td>${esc(m.medio)}</td>
      <td>${esc(m.contacto)}</td><td>${esc(m.quien)}</td><td>${esc(m.nota)}</td></tr>`).join("")}</tbody></table>`
    :`<div class="empty">Sin comunicaciones registradas todavía</div>`}
    <div class="cp" style="border-top:1px solid var(--line)">
      <div style="font-size:11px;font-weight:750;text-transform:uppercase;letter-spacing:.05em;color:var(--faint);margin-bottom:8px">Registrar contacto</div>
      <div class="fg c2">
        <div class="fld" style="margin:0"><label>Medio</label><select id="cmM">${["Llamada","Correo","Mensaje","Visita"].map(x=>`<option>${x}</option>`).join("")}</select></div>
        <div class="fld" style="margin:0"><label>Con quién</label><input id="cmC" value=""></div></div>
      <div class="fld" style="margin-top:9px"><label>Nota <span class="req">*</span></label>
        <input id="cmN" placeholder="Qué se dijo o acordó"></div>
      <button class="btn p sm" style="margin-top:9px" data-a="propComAdd" data-id="${id}">+ Agregar</button>
    </div></div>`:""}

  ${t==="previo"?vPrevio(id):""}

  ${t==="precios"?`<div class="card"><div class="chd"><h3>Price List</h3>
    <span class="s">exclusivos de esta propiedad — mandan sobre la tarifa general</span>
    ${puede("tarifario")?`<span class="r"><button class="btn sm p" data-a="tarNueva" data-prop="${id}">+ Nuevo precio</button></span>`:""}</div>
    ${tf.length?`<table><thead><tr><th>Tipo</th><th>Servicio</th><th>Detail</th><th>Piso</th><th>Baños</th><th>Description</th><th class="num">Price</th>${puede("tarifario")?"<th></th>":""}</tr></thead><tbody>
    ${tf.map(x=>`<tr class="${fl("tar:"+x.id)}"><td>${esc(x.cat)||"—"}</td><td>${esc(x.serv)||"—"}</td><td>${esc(x.variante)||"—"}</td>
      <td>${x.pisos!=null?"Floor "+x.pisos:'<span class="pill g">cualquiera</span>'}</td>
      <td>${x.banos!=null?x.banos:'<span class="pill g">—</span>'}</td><td>${esc(x.desc)||"—"}</td>
      <td class="num mono">${money(x.precio)}</td>
      ${puede("tarifario")?`<td style="text-align:right"><button class="btn sm" data-a="tarNueva" data-id="${x.id}">Corregir</button></td>`:""}</tr>`).join("")}
    </tbody></table>`:`<div class="empty">Sin precios propios — usa la tarifa general</div>`}</div>`:""}

  ${t==="hist"?`<div class="card"><div class="chd"><h3>Historial de la propiedad</h3>
    <span class="s">lo que Lydia necesita para atender sin transferir la llamada</span></div>
    ${ws.length?`<table><thead><tr><th>WO</th><th>Fecha</th><th>Unidad</th><th>Servicio</th><th>Técnico</th><th>Estado</th></tr></thead><tbody>
    ${ws.map(w=>`<tr class="cl${fl("wo:"+w.id)}" data-a="woVer" data-id="${w.id}"><td class="mono" style="font-weight:700">WO-${w.id}</td><td class="mono">${w.fecha.slice(5)}</td>
      <td>${esc(U(w.unidad).num)}</td><td>${esc(w.serv)}</td><td>${w.tec?esc(tecN(w.tec)):"—"}</td>
      <td><span class="pill ${estP(w.estado)}">${w.estado}</span></td></tr>`).join("")}
    </tbody></table>`:`<div class="empty">Sin trabajos registrados</div>`}</div>`:""}`;
}

/* Alta guiada — la secuencia que describe Claudia:
   «la creación de la propiedad, y ahí es cuando yo me encargo de los seguros
    de toda la introducción a la propiedad, y luego es que yo creo la lista de
    precios de la propiedad y los estimados correspondientes» */
function vAltaGuiada(id){
  const p=P(id);
  const us=S.unidades.filter(u=>u.prop===id).length;
  const cs=S.contactos.filter(c=>c.prop===id).length;
  const tf=S.tarifas.filter(t=>t.prop===id).length;
  const es=S.estimados.filter(e=>e.prop===id).length;
  const pasos=[
    {n:"Datos de la propiedad", ok:!!(p.nombre&&p.dir&&p.zona), det:`${esc(p.zona)} · ${esc(CLI(p.cliente).nombre)}`, tab:"datos", accion:null},
    {n:"Unidades",             ok:us>0,  det:us?`${us} unidad(es)`:"Sin unidades no se puede agendar", tab:"unidades", accion:null},
    {n:"Contactos",            ok:cs>0,  det:cs?`${cs} contacto(s)`:"Manager, assistant o mantenimiento", tab:"contactos", accion:null},
    {n:"Seguro (COI)",         ok:coiVigente(id), det:(p.polizas&&p.polizas.length)?`${p.polizas.length} póliza(s) · vence antes ${esc(p.polizas.reduce((a,x)=>!a||x.vence<a?x.vence:a,null))}`:"Lo emite la aseguradora, no Cordova", tab:"documentos",
     accion:coiVigente(id)?null:{a:"coiDirecto",t:"Registrar COI"}},
    {n:"Lista de precios de la propiedad", ok:tf>0, det:tf?`${tf} precio(s) negociado(s)`:"Si no tiene, usa la tarifa general", tab:"precios",
     accion:tf?null:{a:"preciosDesdeGeneral",t:"Partir de la general"}},
    {n:"Estimados",            ok:es>0,  det:es?`${es} estimado(s)`:"Cotizar las unidades que pidan", tab:null,
     accion:es?null:{a:"irEstimados",t:"Hacer un estimado"}}
  ];
  const listos=pasos.filter(x=>x.ok).length;
  return `
  <div class="card"><div class="chd"><h3>Alta de la propiedad</h3>
    <span class="s">la secuencia completa desde que se gana la cuenta</span>
    <span class="r"><span class="pill ${listos===pasos.length?"v":"w"}">${listos} de ${pasos.length}</span></span></div>
    <div class="cp"><ul class="traza">
    ${pasos.map(x=>`<li class="${x.ok?"hecho":"pend"}">
      <span class="mk">${x.ok?"✓":"○"}</span>
      <div style="flex:1;min-width:0"><div class="tt">${esc(x.n)}</div>
        <div class="dd">${x.det}</div></div>
      ${x.accion?`<button class="btn sm p" style="flex:none;align-self:center" data-a="${x.accion.a}" data-id="${id}">${x.accion.t}</button>`
        :x.tab?`<button class="btn sm" style="flex:none;align-self:center" data-a="tab" data-t="${x.tab}">Ver</button>`:""}</li>`).join("")}
    </ul>
    <div class="tr" style="margin-top:10px">Claudia: «todo parte de las ventas, de conseguir una propiedad. Ahí es cuando yo me encargo de los seguros
      de toda la introducción a la propiedad, y luego creo la lista de precios de la propiedad y los estimados correspondientes».</div>
    </div></div>`;
}

/* ── TÉCNICOS ── */
const asisDe = woId => S.asistencias.find(a=>a.wo===woId) || null;
const ultUbic = tecId => {
  const a = S.asistencias.filter(x=>x.tec===tecId).slice(-1)[0];
  return a ? a.ubicacion : null;
};

VIEWS.tecnicos = () => {
  const t = S.tab || "campo";
  return `
  <div class="ph"><div><h2>Técnicos</h2>
    <p>La pestaña <code>Tecnicos</code>, más lo que hoy se resuelve llamando por teléfono.</p></div>
    <div class="act"><button class="btn p" data-a="tecNuevo">+ Nuevo técnico</button></div></div>
  <div class="tabs">${[["campo","Hoy en campo"],["lista","Lista de técnicos"],["asis","Historial de asistencia"]]
    .map(([k,n])=>`<button class="tab ${t===k?"on":""}" data-a="tab" data-t="${k}">${n}</button>`).join("")}</div>
  ${t==="campo"?vCampo():t==="asis"?vAsis():vTecLista()}`;
};

function vCampo(){
  const hoy = S.wos.filter(w=>w.tec && ["Scheduled","Confirmed","In progress","Esperando aprobación","Completed"].includes(w.estado));
  const llegaron = hoy.filter(w=>asisDe(w.id)).length;
  const sinLlegar = hoy.filter(w=>!asisDe(w.id) && esAgendada(w.estado)).length;
  const tarde = S.asistencias.filter(a=>a.puntualidad==="Tarde").length;
  return `
  <div class="kpis">
    <div class="kpi"><div class="l">Trabajos asignados</div><div class="v">${hoy.length}</div></div>
    <div class="kpi"><div class="l">Ya llegaron</div><div class="v g">${llegaron}</div></div>
    <div class="kpi"><div class="l">Sin marcar llegada</div><div class="v ${sinLlegar?"w":""}">${sinLlegar}</div></div>
    <div class="kpi"><div class="l">Llegaron tarde</div><div class="v ${tarde?"b":""}">${tarde}</div></div>
  </div>
  <div class="card"><div class="chd"><h3>Quién llegó, cuándo y dónde está</h3>
    <span class="s">Erika: «está muy manual, tenemos que llamarles a ver dónde están»</span></div>
    ${hoy.length?`<table>
      <thead><tr><th>Técnico</th><th>WO</th><th>Propiedad · Unidad</th><th>Programada</th><th>Llegada real</th><th>Puntualidad</th><th>Estado</th><th>Última ubicación</th></tr></thead>
      <tbody>${hoy.map(w=>{
        const a=asisDe(w.id);
        return `<tr class="cl${fl("wo:"+w.id)}" data-a="woVer" data-id="${w.id}">
          <td style="font-weight:650">${esc(tecN(w.tec))}</td>
          <td class="mono" style="font-weight:700">WO-${w.id}</td>
          <td>${esc(P(w.prop).nombre)} · ${esc(U(w.unidad).num)}</td>
          <td class="mono">${esc(w.horaProg||"9:00")}</td>
          <td class="mono">${a?`<b>${esc(a.horaReal)}</b>`:'<span style="color:var(--faint)">—</span>'}</td>
          <td>${a?`<span class="pill ${a.puntualidad==="Tarde"?"w":"v"}"><span class="dot"></span>${esc(a.puntualidad)}</span>`
                 :'<span class="pill g">sin marcar</span>'}</td>
          <td><span class="pill ${estP(w.estado)}"><span class="dot"></span>${esc(w.estado)}</span></td>
          <td style="font-size:11.5px;color:var(--soft)">${a?esc(a.ubicacion):'<span style="color:var(--faint)">sin dato</span>'}</td></tr>`;
      }).join("")}</tbody></table>`:`<div class="empty">Nada asignado todavía</div>`}
  </div>
  <div class="tr">La llegada la marca el técnico desde su celular. Hoy la columna <code>Asistencia</code> de <code>Schedule</code> es un Sí/No que pone alguien de oficina, sin hora y sin respaldo.</div>`;
}

function vAsis(){
  return `<div class="card"><div class="chd"><h3>Historial de asistencia</h3>
    <span class="s">${S.asistencias.length} registros</span></div>
    ${S.asistencias.length?`<table><thead><tr><th>Fecha</th><th>Técnico</th><th>WO</th><th>Programada</th><th>Llegó</th><th>Puntualidad</th><th>Ubicación</th></tr></thead>
    <tbody>${S.asistencias.slice().reverse().map(a=>`<tr>
      <td class="mono">${esc(a.fecha)}</td><td style="font-weight:650">${esc(tecN(a.tec))}</td>
      <td class="mono">WO-${a.wo}</td><td class="mono">${esc(a.horaProg)}</td><td class="mono"><b>${esc(a.horaReal)}</b></td>
      <td><span class="pill ${a.puntualidad==="Tarde"?"w":"v"}">${esc(a.puntualidad)}</span></td>
      <td style="font-size:11.5px;color:var(--soft)">${esc(a.ubicacion)}</td></tr>`).join("")}
    </tbody></table>`:`<div class="empty">Todavía nadie ha marcado llegada.<br><span style="font-size:12px">Abre el celular del técnico y toca «Ya llegué».</span></div>`}
  </div>`;
}

const vTecLista = () => `
  <div class="card"><table>
    <thead><tr><th>Técnico</th><th>Especialidad</th><th>Zona</th><th>Teléfono</th><th class="num">WO semana</th><th>Última ubicación</th><th>Estado</th><th></th></tr></thead>
    <tbody>${S.tecnicos.map(t=>{
      const n=S.wos.filter(w=>w.tec===t.id&&w.semana===S.semana).length;
      const b=S.disponibilidad.find(d=>d.tec===t.id&&d.estado==="Aprobado");
      const u=ultUbic(t.id);
      return `<tr class="${fl("tec:"+t.id)}"><td style="font-weight:650">${esc(tecN(t.id))}
        <div style="font-size:10.5px;color:var(--faint)">${esc(t.dir)}</div></td>
        <td>${t.esp.map(e=>`<span class="pill g">${esc(e)}</span>`).join(" ")}</td>
        <td>${esc(t.zona)}</td><td class="mono">${esc(t.tel)}</td>
        <td class="num mono">${n}</td>
        <td style="font-size:11.5px;color:var(--soft)">${u?esc(u):'<span style="color:var(--faint)">base: '+esc(t.zona)+'</span>'}</td>
        <td>${!t.activo?'<span class="pill g">Dado de baja</span>'
             :b?`<span class="pill r"><span class="dot"></span>${esc(b.motivo)} ${b.desde.slice(5)}–${b.hasta.slice(5)}</span>`
               :'<span class="pill v">Disponible</span>'}</td>
        <td style="text-align:right;white-space:nowrap"><button class="btn sm" data-a="tecNuevo" data-id="${t.id}">Corregir</button>
          <button class="btn sm ${t.activo?"":"v"}" data-a="tecBaja" data-id="${t.id}">${t.activo?"Dar de baja":"Reactivar"}</button></td></tr>`;
    }).join("")}</tbody></table></div>
  <div class="tr">La «última ubicación» es lo que UC-09 usa para sugerir al técnico más cercano. Sale sola de la llegada que él marca.</div>`;

/* ── TARIFARIO ── Ingreso Fijo + Ingreso Variable, juntos ── */
VIEWS.tarifario = () => {
  const ts=S.tarifas.filter(t=>!t.prop);
  return `
  <div class="ph"><div><h2>Tarifario</h2>
    <p>Precios generales, de <code>Ingreso Fijo</code> — aplican a toda propiedad que no tenga una negociada aparte.</p></div>
    <div class="act"><button class="btn p" data-a="tarNueva">+ Nueva tarifa</button></div></div>
  <div class="card"><table>
    <thead><tr><th>Tipo</th><th>Servicio</th><th>Detail</th><th>Piso</th><th>Baños</th><th>Description</th><th class="num">Price</th><th></th></tr></thead>
    <tbody>${ts.map(t=>{
      return `<tr class="${fl('tar:'+t.id)}">
      <td>${esc(t.cat)||"—"}</td><td>${esc(t.serv)||"—"}</td><td>${esc(t.variante)||"—"}</td>
      <td>${t.pisos!=null?"Floor "+t.pisos:'<span class="pill g">cualquiera</span>'}</td>
      <td>${t.banos!=null?t.banos:'<span class="pill g">—</span>'}</td><td>${esc(t.desc)||"—"}</td>
      <td class="num mono">${money(t.precio)}</td>
      <td style="text-align:right"><button class="btn sm" data-a="tarNueva" data-id="${t.id}">Corregir</button></td></tr>`;
    }).join("")}</tbody></table></div>
  <div class="note"><b>Cómo resuelve el precio</b> — la misma llave de su Tabla Maestra (Rooms + Pisos + Servicio), en cuatro pasos:
    primero la tarifa negociada de esa propiedad para esos pisos; si no, la de la propiedad para cualquier piso;
    si no, la general para esos pisos; si no, la general para cualquier piso. Si no hay ninguna, levanta una
    <b>excepción</b> en vez de inventar un número.</div>
  <div class="note w" style="margin-top:9px"><b>Para evitar vueltas:</b> dejar los pisos en <i>«cualquiera»</i> cuando el precio no cambia por pisos.
    Así se carga una fila por servicio en vez de tres. Solo se especifica el piso donde de verdad cambia el precio, como en Studio.</div>
  <div class="tr" style="margin-top:8px">El técnico solo ve la columna <b>«se paga»</b> — nunca el precio al cliente.</div>`;
};

/* ── CATÁLOGOS ── cada lista es una tabla, no una constante del código ── */
/* ── RENOMBRAR UN VALOR DE CATÁLOGO ───────────────────────────────────────
   En el sistema construido cada valor de catálogo es una fila con su id, y la
   Work Order guarda ESE id. Renombrar «Navarre» a «Navarre Beach» es cambiar
   una etiqueta: nadie guardó el texto, así que no hay nada que migrar.

   Este prototipo guarda el texto porque lo copié tal cual de la celda del Excel
   —que es lo que hace su archivo hoy— y ahí sí quedaría desincronizado. Para
   que se comporte igual que el sistema real, renombrar recorre las referencias
   y las actualiza en el mismo paso. Efecto idéntico: el nombre cambia en todas
   partes, incluido el histórico, y no se pierde ni un registro. */
const lineasEst = () => S.estimados.reduce((a,e)=>a.concat(e.lineas),[]);
const REFS = {
  zonas:         [{a:()=>S.propiedades,c:"zona",    n:"propiedad(es)"},
                  {a:()=>S.tecnicos,   c:"zona",    n:"técnico(s)"}],
  categorias:    [{a:()=>S.wos,        c:"cat",     n:"Work Order(s)"},
                  {a:()=>S.tarifas,    c:"cat",     n:"tarifa(s)"},
                  {a:()=>CAT.servicios,c:"tipo",    n:"servicio(s)"},
                  {a:()=>lineasEst(),  c:"cat",     n:"línea(s) de estimado"}],
  adicionales:   [{a:()=>S.adicionales,c:"concepto",n:"adicional(es)"}],
  ubicaciones:   [{a:()=>S.wos,        c:"ubic",    n:"Work Order(s)"},
                  {a:()=>S.adicionales,c:"ubic",    n:"adicional(es)"}],
  rooms:         [{a:()=>S.unidades,   c:"rooms",   n:"unidad(es)"},
                  {a:()=>S.tarifas,    c:"variante",n:"tarifa(s)"}],
  especialidades:[{a:()=>S.tecnicos,   c:"esp",     n:"técnico(s)", lista:true}],
  tiendas:       [{a:()=>S.movs,       c:"tienda",  n:"movimiento(s) de inventario"}],
  pisos:         [{a:()=>S.unidades,   c:"pisos",   n:"unidad(es)"},
                  {a:()=>S.tarifas,    c:"pisos",   n:"tarifa(s)"}],
  folder:        [],
  servicios:     [{a:()=>S.wos,        c:"serv",    n:"Work Order(s)"},
                  {a:()=>S.tarifas,    c:"serv",    n:"tarifa(s)"},
                  {a:()=>lineasEst(),  c:"serv",    n:"línea(s) de estimado"}]
};
const usosDe = (k,v) => (REFS[k]||[])
  .map(r=>({n:r.n, c:r.a().filter(o => r.lista
      ? (o[r.c]||[]).includes(v) : String(o[r.c])===String(v)).length}))
  .filter(x=>x.c>0);
function renombrarCat(k, viejo, nuevo){
  let tocados=0;
  (REFS[k]||[]).forEach(r=>r.a().forEach(o=>{
    if(r.lista){ const i=(o[r.c]||[]).indexOf(viejo); if(i>-1){ o[r.c][i]=nuevo; tocados++; } }
    else if(String(o[r.c])===String(viejo)){ o[r.c]=nuevo; tocados++; }
  }));
  if(S.bajas[k]) S.bajas[k]=S.bajas[k].map(x=>x===viejo?nuevo:x);
  return tocados;
}
/* Hay valores que el propio sistema usa por su nombre para decidir. Renombrarlos
   se permite, pero avisando: en el sistema construido esto se ata al id y deja
   de ser un riesgo — aquí conviene que se vea que existe. */
const OJO_LOGICA = {
  especialidades:{Supervisor:"El sistema usa «Supervisor» para saber quién puede supervisar y para excluirlo de las asignaciones."},
  categorias:{Repair:"Los tipos que exigen ubicación dentro de la unidad están atados a este nombre.",
              Cabinet:"Los tipos que exigen ubicación dentro de la unidad están atados a este nombre.",
              Resurface:"Los tipos que exigen ubicación dentro de la unidad están atados a este nombre.",
              Installation:"Los tipos que exigen ubicación dentro de la unidad están atados a este nombre.",
              Ceramica:"Los tipos que exigen ubicación dentro de la unidad están atados a este nombre."}
};

const LISTAS = [
  {k:"zonas",        n:"Zonas (Area)",              col:"Schedule.Location", ojo:"Hoy NO tiene desplegable: se escribe libre. De ahí salen «Navarre» y «navarre»."},
  {k:"categorias",   n:"Tipos de servicio",         col:"Catalogo!H → Kind of Service"},
  {k:"adicionales",  n:"Conceptos de adicional",    col:"Catalogo!P → Aditional", ojo:"Es una lista distinta de los servicios: son trabajos extra, no servicios que se venden."},
  {k:"ubicaciones",  n:"Ubicaciones (Where)",       col:"Catalogo!Q"},
  {k:"rooms",        n:"Rooms",                     col:"Catalogo!F", ojo:"Define la tarifa junto con los pisos."},
  {k:"pisos",        n:"Pisos",                     col:"Catalogo!G"},
  {k:"especialidades",n:"Especialidades",           col:"Tecnicos.Specialist", ojo:"Hoy está escrita dentro de la validación, no en una tabla."},
  {k:"folder",       n:"Estado de la carpeta",      col:"Catalogo!W → Final mail"},
  {k:"tiendas",      n:"Tiendas / proveedores",     col:"Sheet13"}
];

VIEWS.catalogos = () => {
  const t = S.tab || "listas";
  return `
  <div class="ph"><div><h2>Catálogos</h2>
    <p>Las listas que alimentan cada desplegable. Son datos del sistema: se agregan y se quitan aquí, sin tocar nada más.</p></div></div>
  <div class="tabs">${[["listas","Listas simples"],["servicios","Servicios por tipo"],["estados","Estados de la Work Order"]]
    .map(([k,n])=>`<button class="tab ${t===k?"on":""}" data-a="tab" data-t="${k}">${n}</button>`).join("")}</div>

  ${t==="listas"?`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:14px">
    ${LISTAS.map(L=>{ const nBaja=(S.bajas[L.k]||[]).length; return `<div class="card" style="margin:0">
      <div class="chd"><h3>${esc(L.n)}</h3><span class="r"><span class="pill g">${activos(L.k).length} activos</span>
        ${nBaja?`<span class="pill w">${nBaja} de baja</span>`:""}
        <button class="btn sm p" data-a="catAdd" data-k="${L.k}" data-n="${esc(L.n)}">+</button></span></div>
      <div class="cp" style="display:flex;flex-wrap:wrap;gap:5px">
        ${CAT[L.k].map((v,i)=>debaja(L.k,v)
          ? `<span class="pill g" style="padding-right:4px;opacity:.5;text-decoration:line-through">${esc(v)}
              <button data-a="catAlta" data-k="${L.k}" data-i="${i}" title="Reactivar"
                style="background:none;border:none;color:var(--verde);padding:0 3px;font-size:12px;line-height:1;text-decoration:none">↺</button></span>`
          : `<span class="pill g${fl("cat:"+L.k+":"+v)}" style="padding-right:4px">${esc(v)}
              <button data-a="catRen" data-k="${L.k}" data-i="${i}" title="Renombrar"
                style="background:none;border:none;color:var(--azul);padding:0 3px;font-size:11px;line-height:1">✎</button>
              <button data-a="catDel" data-k="${L.k}" data-i="${i}" title="Dar de baja"
                style="background:none;border:none;color:var(--faint);padding:0 3px;font-size:13px;line-height:1">×</button></span>`).join("")}
      </div>
      <div class="cp" style="border-top:1px solid var(--line);padding-top:8px">
        <div style="font-size:10.5px;color:var(--faint)">Hoy en: <code style="font-family:Consolas,monospace">${esc(L.col)}</code></div>
        ${L.ojo?`<div style="font-size:10.5px;color:var(--ambar);margin-top:3px">${esc(L.ojo)}</div>`:""}</div>
    </div>`;}).join("")}</div>
    <div class="note" style="margin-top:14px"><b>Aquí nada se borra.</b> Un valor dado de baja deja de ofrecerse para registros nuevos,
      pero sigue mostrándose en todo lo que ya lo usaba — y se puede reactivar con <b>↺</b>. Así ningún registro queda huérfano.<br>
      Y si el nombre está mal escrito, <b>✎</b> lo <b>renombra</b>: es el mismo valor con otra etiqueta, así que todo lo que ya lo usaba pasa a decir el nombre nuevo. No hay que dar de baja y volver a crear.</div>`:""}

  ${t==="servicios"?`<div class="card"><div class="chd"><h3>Servicios, colgando de su tipo</h3>
    <span class="s">hoy <code>Catalogo!I</code> es una lista plana; por eso <code>Paint_services</code> y <code>Repair_services</code> quedaron vacías</span>
    <span class="r"><button class="btn sm p" data-a="servAdd">+ Nuevo servicio</button></span></div>
    <table><thead><tr><th style="width:190px">Tipo de servicio</th><th>Servicios (subservicios)</th></tr></thead><tbody>
    ${CAT.categorias.map(c=>{
      const ss=servTodos(c);
      return `<tr><td style="font-weight:650">${esc(c)}<div style="font-size:10.5px;color:var(--faint)">${ss.filter(s=>!s.baja).length} activo(s)${ss.some(s=>s.baja)?" · "+ss.filter(s=>s.baja).length+" de baja":""}</div></td>
      <td style="padding:8px 12px"><div style="display:flex;flex-wrap:wrap;gap:5px">
        ${ss.map(s=>s.baja
          ? `<span class="pill g" style="padding-right:4px;opacity:.5;text-decoration:line-through">${esc(s.nombre)}
              <button data-a="servAlta" data-id="${s.id}" title="Reactivar"
                style="background:none;border:none;color:var(--verde);padding:0 3px;font-size:12px;line-height:1;text-decoration:none">↺</button></span>`
          : `<span class="pill a${fl("serv:"+s.id)}" style="padding-right:4px">${esc(s.nombre)}
              <button data-a="servRen" data-id="${s.id}" title="Renombrar"
                style="background:none;border:none;color:inherit;opacity:.7;padding:0 3px;font-size:11px;line-height:1">✎</button>
              <button data-a="servDel" data-id="${s.id}" title="Dar de baja"
                style="background:none;border:none;color:inherit;opacity:.6;padding:0 3px;font-size:13px;line-height:1">×</button></span>`).join("")
          ||'<span style="color:var(--faint);font-size:11.5px">sin servicios — no se puede agendar este tipo</span>'}</div></td></tr>`;
    }).join("")}</tbody></table>
    <div class="cp" style="border-top:1px solid var(--line)"><div class="tr" style="margin:0">Al elegir el tipo en una Work Order, el desplegable de servicio se filtra solo. Es lo que intentaron con las columnas <code>Clean_services</code> y compañía.</div></div></div>`:""}

  ${t==="estados"?`<div class="card"><div class="chd"><h3>Completion Status</h3>
    <span class="s">los 10 que ya usan, más el único que su Dashboard mide y no existe</span></div>
    <table><thead><tr><th>Estado</th><th>Origen</th><th>Qué significa</th></tr></thead><tbody>
    ${CAT.estados.map(e=>`<tr><td><span class="pill ${e.p}"><span class="dot"></span>${esc(e.n)}</span></td>
      <td>${e.nuevo?'<span style="color:var(--ambar);font-size:11.5px">nuevo</span>':'<span style="color:var(--faint);font-size:11.5px">ya lo usan</span>'}</td>
      <td style="font-size:11.5px;color:var(--soft)">${esc({
        "Scheduled":"Agendada, sin técnico todavía","Confirmed":"Con técnico asignado y confirmado",
        "In progress":"El técnico está en la propiedad","Esperando aprobación":"Frenada por un adicional sin decidir",
        "Detenido":"Empezó pero está frenado por algo externo","Completed":"Trabajo terminado","Pending":"En espera de algo externo","Rescheduled":"Se movió de fecha",
        "Returned":"El cliente la devolvió","Corrected":"Se corrigió una devolución","Canceled":"Cancelada",
        "Inspeccion":"Visita de inspección, no es trabajo"}[e.n]||"")}</td></tr>`).join("")}
    </tbody></table>
    <div class="cp" style="border-top:1px solid var(--line)"><div class="note w" style="margin:0">
      <b>Facturado y pagado no son estados.</b> Van como marca aparte, igual que las columnas <code>Invoice</code> y <code>Pagado</code> de su Payroll — así una Work Order puede estar <i>Completed</i> y facturada al mismo tiempo sin perder su estado real.</div></div></div>`:""}`;
};

/* ── UC-06 ── Expediente de la propiedad: 9 campos que bloquean el paso a programación ── */
/* Qué campo del formulario corresponde a cada fila del expediente: la fila que
   dice «falta» tiene que llevarte al campo, no dejarte buscándolo. */
/* El Management no bloquea el expediente: Claudia crea la propiedad sin saberlo
   todavia — "es abstracto, podrian demorar en conseguirlo" — y se vincula despues. */
const CAMPO_INPUT = {nombre:"nP", dir:"nD", zona:"nZ",
                     door:"nDC", pref:"nPR", aprob:"nAP", notas:"nNT", notasPaint:"nPaint"};
const EXPEDIENTE = [
  {k:"nombre",  n:"Nombre de la propiedad"},
  {k:"dir",     n:"Dirección"},
  {k:"zona",    n:"Zona (Area)"},
  {k:"door",    n:"Código de puerta"},
  {k:"pref",    n:"Default Contact Method"},
  {k:"precios", n:"Price List"},
  {k:"coi",     n:"COI vigente"},
  {k:"contacto",n:"Al menos un contacto"},
  {k:"estimado",n:"Estimado aprobado"},
  {k:"notas",   n:"Notas del proyecto"},
  /* Del flujograma de Estimados: el expediente son 9 elementos, y este era
     el único que el checklist no contaba — el dato ya existía en la
     propiedad (notasPaint) pero no tenía campo para verlo ni editarlo, así
     que nunca podía marcarse completo. */
  {k:"notasPaint", n:"Información de pintura"}
];
function expedienteDe(pid){
  const p=P(pid);
  return EXPEDIENTE.map(c=>({
    ...c,
    ok: c.k==="contacto" ? S.contactos.some(x=>x.prop===pid)
      : c.k==="coi" ? coiVigente(pid)
      : c.k==="precios" ? S.tarifas.some(t=>t.prop===pid)
      : c.k==="estimado" ? S.estimados.some(e=>e.prop===pid && e.estado==="Aprobado")
      : !!String(p[c.k]||"").trim()
  }));
}
/* "Servicio directo" (la visita que salta la llamada de negociar) exigía
   igual un Estimado aprobado antes de dejar pasar la propiedad — pero esa
   es justo la llamada que "Servicio directo" promete que no hace falta.
   sinEstimado=true se usa SOLO en ese camino: el resto del Expediente
   (COI, contacto, Price List...) sigue exigiéndose igual — y el camino
   normal ("Requiere estimado", Transferir a programación) no cambia. */
/* Reunión 2026-09-09: las Unidades dejaron de ser requisito para el
   Expediente. No es un bloqueo antes — es un catálogo que se va llenando
   solo conforme se crean Work Orders y Estimados (ver "+ Nueva unidad…"
   en esos formularios), nunca algo que haya que precargar a mano primero. */
const expedienteOK = (pid, opts) => {
  const sinEstimado = opts && opts.sinEstimado;
  return expedienteDe(pid).every(c=>c.ok || (sinEstimado && c.k==="estimado"));
};

/* ── EXCEPCIONES ── la compuerta antes de cerrar la semana ── */
function excAuto(){
  const out=[];
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
    out.push({id:"AUTO-T"+w.id, tipo:"Tarifa no encontrada", wo:w.id, auto:true,
      motivo:`No hay precio para ${w.serv} · ${U(w.unidad).rooms} en ${P(w.prop).nombre}. Hoy saldría "NA".`,
      monto:null, pide:"Sistema", aprueba: w.pidioPrecio?"Claudia":"Thalia", estado:"Pendiente", fecha:w.fecha, resol:null});
  });
  S.asistencias.filter(a=>a.declarada).forEach(a=>{
    out.push({id:"AUTO-D"+a.wo, tipo:"Llegada declarada", wo:a.wo, auto:true,
      motivo:`${tecN(a.tec)} cerró WO-${a.wo} sin haber marcado llegada; declaró las ${a.horaReal}. No está verificada.`,
      monto:null, pide:"Sistema", aprueba:"Gustavo", estado:"Pendiente", fecha:a.fecha, resol:null});
  });
  S.wos.filter(w=>w.estado==="Completed" && !w.evid && !w.evidExcusada).forEach(w=>{
    out.push({id:"AUTO-E"+w.id, tipo:"Cierre sin evidencia", wo:w.id, auto:true,
      motivo:`WO-${w.id} se cerró sin ninguna foto. No hay con qué sustentar el cobro si el cliente reclama.`,
      monto:null, pide:"Sistema", aprueba:"Gustavo", estado:"Pendiente", fecha:w.fecha, resol:null});
  });
  // Una excepción por SOLICITUD, no por concepto: el técnico mandó un aviso,
  // no tres. Claudia lo abre una vez y adentro decide línea por línea.
  solTodas().filter(solPend).forEach(s=>{
    const p = s.lineas.filter(l=>l.estado==="Pendiente");
    out.push({id:"AUTO-A"+s.sol, tipo:"Adicional en sitio", wo:s.wo, auto:true,
      motivo:`${s.desc} — ${p.length} concepto(s): ${p.map(l=>l.concepto+((l.cant||1)>1?` ×${l.cant}`:"")).join(", ")}`,
      monto:p.reduce((t,l)=>t+(l.precio||0)*(l.cant||1),0),
      pide:"Técnico", aprueba:"Claudia", estado:"Pendiente", fecha:"", resol:null});
  });
  // La primera vez que el sistema detecta cada una queda su hora — así se ve
  // desde cuándo está esperando, no solo cuándo se resolvió.
  out.forEach(x=>{ if(!S.excCreadas[x.id]) S.excCreadas[x.id]=hora(); x.creada={quien:x.pide,hora:S.excCreadas[x.id]}; });
  return out.filter(viva);
}
const excTodas = () => S.excepciones.concat(excAuto());
const excPend  = () => excTodas().filter(x=>x.estado==="Pendiente");
/* Reunión Claudia (feedback prototipo): una excepción sin resolver ya no
   frena TODA la nómina/facturación — frena solo la WO a la que está atada.
   Una excepción sin WO (se levantó suelta, sin elegir ninguna) sigue frenando
   todo, porque no hay forma de saber a cuál limitar el freno. */
const excBloqueaTodo = () => excPend().some(x=>!x.wo);
const woBloqueada = wid => excBloqueaTodo() || excPend().some(x=>x.wo===wid);

VIEWS.excepciones = () => {
  const todas = excTodas();
  const pend = todas.filter(x=>x.estado==="Pendiente");
  const res  = todas.filter(x=>x.estado!=="Pendiente");
  const porTipo = {};
  pend.forEach(x=>porTipo[x.tipo]=(porTipo[x.tipo]||0)+1);
  return `
  <div class="ph"><div><h2>Excepciones</h2>
    <p>Todo lo que se sale de la regla y necesita que <b>alguien más</b> decida. Cada una frena el pago y la factura de su propia WO — no de las demás.</p></div>
    <div class="act"><button class="btn p" data-a="excNueva">+ Levantar excepción</button></div></div>

  ${pend.length
    ? `<div class="note r" style="margin-bottom:14px"><b>${pend.length} excepción(es) sin resolver.</b> ${excBloqueaTodo()?`Hay al menos una sin WO puntual — esa frena <b>toda</b> la nómina y facturación.`:`Cada una frena solo el pago y la factura de su propia WO — el resto de la semana sigue su curso.`}</div>`
    : `<div class="note v" style="margin-bottom:14px"><b>Sin excepciones pendientes.</b> Nada frenado por este motivo.</div>`}

  ${pend.length?`<div class="kpis">${Object.entries(porTipo).map(([t,n])=>
    `<div class="kpi"><div class="l">${esc(t)}</div><div class="v w">${n}</div></div>`).join("")}</div>`:""}

  <div class="card"><div class="chd"><h3>Pendientes de decisión</h3><span class="s">cada una espera a una persona concreta</span></div>
    ${pend.length?`<table><thead><tr><th>Tipo</th><th>WO</th><th>Motivo</th><th>Quién lo pide</th><th>Desde</th><th>Quién decide</th><th class="num">Monto</th><th></th></tr></thead><tbody>
    ${pend.map(x=>`<tr class="${fl("exc:"+x.id)}">
      <td><span class="pill ${x.tipo==="Tarifa no encontrada"?"w":x.tipo==="Cierre sin evidencia"?"r":"m"}"><span class="dot"></span>${esc(x.tipo)}</span>
        ${x.auto?'<div style="font-size:9.5px;color:var(--faint);margin-top:2px">detectada por el sistema</div>':""}</td>
      <td class="mono">${x.wo?`<b style="cursor:pointer" data-a="woVer" data-id="${x.wo}">WO-${x.wo}</b>`:"—"}</td>
      <td style="max-width:340px">${esc(x.motivo)}</td>
      <td>${esc(x.pide)}</td>
      <td class="mono" style="color:var(--faint)">${x.creada?esc(x.creada.hora):"—"}</td>
      <td><span class="pill a">${esc(x.aprueba)}</span></td>
      <td class="num mono">${x.monto?money(x.monto):"—"}</td>
      <td style="text-align:right;white-space:nowrap">
        ${x.tipo==="Tarifa no encontrada"
          ? `<button class="btn sm p" data-a="excTarifa" data-id="${x.id}" data-wo="${x.wo}">Definir tarifa</button>`
          : `<button class="btn sm" data-a="excRech" data-id="${x.id}">Rechazar</button>
             <button class="btn sm v" data-a="excAprob" data-id="${x.id}">Aprobar</button>`}
      </td></tr>`).join("")}
    </tbody></table>`:`<div class="empty"><div class="b">✓</div>Nada pendiente</div>`}
  </div>

  ${res.length?`<div class="card"><div class="chd"><h3>Resueltas</h3></div>
    <table><thead><tr><th>Tipo</th><th>WO</th><th>Quién la pidió</th><th>Creada</th><th>Resultado</th><th>Quién decidió</th><th>Cuándo</th><th class="num">Monto</th></tr></thead><tbody>
    ${res.map(x=>`<tr class="${fl("exc:"+x.id)}"><td>${esc(x.tipo)}</td><td class="mono">${x.wo?"WO-"+x.wo:"—"}</td>
      <td>${x.creada?esc(x.creada.quien):esc(x.pide)}</td>
      <td class="mono" style="color:var(--faint)">${x.creada?esc(x.creada.hora):"—"}</td>
      <td><span class="pill ${x.estado==="Aprobada"?"v":"r"}">${x.estado}</span></td>
      <td>${x.resol?esc(x.resol.quien):"—"}</td><td class="mono">${x.resol?esc(x.resol.hora):"—"}</td>
      <td class="num mono">${x.monto?money(x.monto):"—"}</td></tr>`).join("")}
    </tbody></table></div>`:""}

  <div class="tr">Cada excepción queda con quién la pidió y desde cuándo está — y al resolverse, con quién decidió y cuándo. Es lo que hoy se decide por WhatsApp y nadie puede reconstruir después.</div>`;
};

function modalExc(){
  modal(`<div class="mh"><h3>Levantar una excepción</h3><p>Algo que se sale de la regla y necesita que otra persona lo apruebe.</p></div>
  <div class="mb">
    <div class="fld"><label>Tipo <span class="req">*</span></label><select id="xT">
      ${["Pago adicional al técnico","Ajuste de precio al cliente","Descuento especial","Cierre sin evidencia","Trabajo fuera de tarifa","Otro"].map(t=>`<option>${t}</option>`).join("")}</select></div>
    <div class="fg c2">
      <div class="fld"><label>Work Order</label><select id="xW"><option value="">— ninguna —</option>
        ${S.wos.map(w=>`<option value="${w.id}">WO-${w.id} · ${esc(P(w.prop).nombre)} ${esc(U(w.unidad).num)}</option>`).join("")}</select></div>
      <div class="fld"><label>Monto</label><input id="xM" placeholder="opcional" class="mono"></div></div>
    <div class="fld"><label>Quién debe aprobarla <span class="req">*</span></label>
      <select id="xA">${Object.keys(ROLES).map(r=>`<option ${r==="Claudia"?"selected":""}>${r}</option>`).join("")}</select></div>
    <div class="fld"><label>Motivo <span class="req">*</span></label><textarea id="xMo" placeholder="Por qué se sale de lo normal"></textarea></div>
  </div>
  <div class="mf"><button class="btn" data-a="cm">Cancelar</button><button class="btn p" data-a="excGuardar">Levantar</button></div>`);
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
function emailBodyDefaultEst(e){
  const p = P(e.prop);
  return `Buenos días,

Adjunto encontrarás el estimado para ${p.nombre}.

Si el estimado es aprobado, por favor háznoslo saber y estaremos encantados de programar el trabajo en el momento que te sea conveniente.

¡Gracias, y esperamos tu aprobación!

Claudia S. Cordova
CEO | Cordova Property Services LLC
Pensacola, FL | Sirviendo al Noroeste de Florida, Sur de Alabama y Mississippi
Tel: (469) 219-6869
Correo: scheduling@cordovaps.com | www.cordovapropertyservices.com`;
}
function modalEnviarEst(eid){
  const e=by(S.estimados,eid), p=P(e.prop), cons=contactosEst(e);
  modal(`<div class="mh"><h3>Enviar ${esc(e.label||"Estimate")} ${esc(e.num)}</h3><p>Revisa o edita el correo antes de mandarlo — igual que lo hace Claudia.</p></div>
  <div class="mb">
    <div class="fld"><label>Para</label>
      <div class="hint">${cons.map(c=>esc(c.nombre)+" &lt;"+(esc(c.mail)||"sin correo")+"&gt;").join(", ")||"— sin contactos —"}</div></div>
    <div class="fld"><label>Asunto</label><input id="envAsunto" value="${esc(e.envAsunto||(esc(e.label||"Estimate")+" "+e.num+" — "+p.nombre))}"></div>
    <div class="fld" style="margin-bottom:0"><label>Cuerpo del correo</label>
      <textarea id="envCuerpo" rows="12">${esc(e.correoTexto||emailBodyDefaultEst(e))}</textarea></div>
    <div class="hint" style="margin-top:8px">📎 Adjunto: ${esc(e.num)} — Invoice.pdf</div>
    ${!cons.length?`<div class="note r" style="margin-top:10px">No hay contactos con correo para esta propiedad — agrega uno en su pestaña Contactos.</div>`:""}
  </div>
  <div class="mf"><button class="btn" data-a="cm">Cancelar</button>
    <button class="btn p" data-a="estEnviarOK" data-id="${eid}" ${cons.length?"":"disabled"}>Enviar</button></div>`,true);
}

/* Igual que modalMedio (trabajo adicional de Work Orders): antes de dar por
   buena una aprobacion de estimado, se pregunta por que canal fue. */
function modalMedioEst(id, tipo){
  const e = by(S.estimados, id);
  const etiqueta = tipo==="todo" ? "Aprobó todo" : tipo==="parcial" ? "Aprobó parcialmente" : "No aprobó";
  modal(`<div class="mh"><h3>¿Por qué canal aprobó el cliente?</h3><p>${esc(e.num)} · ${etiqueta}</p></div>
  <div class="mb">
    <div class="note w" style="margin-bottom:12px">Erika: «a veces las aprobaciones nos las dan por llamada, por mensaje, de diferentes maneras. Solo tener ese <b>sustento</b> de que sí se dio una aprobación». Lo que elijas define qué tan sólido queda si después lo discuten.</div>
    ${activos("medios").filter(m=>m!=="Enlace digital").map(m=>`
    <button class="btn" style="width:100%;justify-content:flex-start;margin-bottom:8px;padding:11px 13px"
      data-a="estMedioOK" data-id="${id}" data-tipo="${tipo}" data-medio="${m}">
      <div style="flex:1;text-align:left"><div style="font-weight:700">${m}</div></div></button>`).join("")}
  </div>
  <div class="mf"><button class="btn" data-a="cm">Cancelar</button></div>`);
}

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
      <div class="hint">Destilda lo que el cliente no aprobó. Al técnico le llega el detalle: qué sí hace y qué no.</div>
      <table style="margin-top:6px"><tbody>
      ${pend.map(l=>`<tr>
        <td style="width:34px"><input type="checkbox" class="adchk" data-lid="${l.id}" checked style="width:16px;height:16px"></td>
        <td><b>${esc(l.concepto)}</b>${(l.cant||1)>1?` <span style="color:var(--faint)">× ${l.cant}</span>`:""}
          ${l.ubic?`<div style="font-size:11.5px;color:var(--faint)">${esc(l.ubic)}</div>`:""}</td>
        <td class="num mono">${l.precio?money(l.precio*(l.cant||1)):"—"}</td></tr>`).join("")}
      <tr><td></td><td style="color:var(--faint)">Total pedido</td><td class="num mono" style="font-weight:750">${money(tot)}</td></tr>
      </tbody></table></div>`
    :`<div class="note" style="margin-bottom:12px"><b>${esc(pend[0].concepto)}</b>${(pend[0].cant||1)>1?` × ${pend[0].cant}`:""}
        ${pend[0].precio?` · ${money(pend[0].precio*(pend[0].cant||1))}`:""}${pend[0].ubic?` · ${esc(pend[0].ubic)}`:""}</div>`}

    ${p.aprob?`<div class="note" style="margin-bottom:12px"><b>Nota de ${esc(p.nombre)}:</b> ${esc(p.aprob)}</div>`:""}
    <div class="note w" style="margin-bottom:12px">Erika: «a veces las aprobaciones nos las dan por llamada, por mensaje, de diferentes maneras.
      Solo tener ese <b>sustento</b> de que sí se dio una aprobación». Lo que elijas define qué tan sólido queda si después lo discuten.</div>
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
    <div id="swSpecs"></div>
    <div class="fld"><label>Notas (Notes)</label><textarea id="swNotas" placeholder="Cualquier detalle que no entre en los campos de arriba…"></textarea></div>

    <div class="fg c2" style="margin-top:4px">
      <div class="fld"><label>Técnico <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— opcional, si es distinto al de la WO</span></label>
        <select id="swTec"><option value="">— mismo técnico que WO-${w.id} —</option>${S.tecnicos.filter(t=>t.activo).map(t=>`<option value="${t.id}">${esc(t.nombre)} ${esc(t.apellido)}</option>`).join("")}</select></div>
      <div class="fld"><label>Fecha <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— opcional, si es otro día</span></label>
        <input type="date" id="swFecha" value=""></div>
    </div>
    <div class="note">Técnico y fecha quedan documentados en la Sub-Work Order, pero todavía no mueven la agenda ni la nómina — eso depende de cómo se resuelva la relación WO → Nómina → Facturación (punto 10 del feedback, todavía abierto).</div>
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

/* ── NÓMINA ── la pestaña Payroll, armada sola ── */
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

  ${bloqSemana?`<div class="note r" style="margin-bottom:14px"><b>${bloqSemana} Work Order(s) con excepción sin resolver.</b>
    No se pagan hasta que se resuelva — un pago adicional o una tarifa sin definir cambian lo que se le debe al técnico. El resto del período se paga igual.
    <button class="btn sm" data-a="ir" data-m="excepciones" style="margin-left:8px">Ver excepciones</button></div>`
   :`<div class="note v" style="margin-bottom:14px"><b>Período listo para pagar.</b> Sin Work Orders frenadas por excepción.</div>`}

  ${Object.keys(porTec).length?Object.entries(porTec).map(([tid,arr])=>{
    const ing=arr.reduce((a,w)=>a+(ingresoWO(w)||0),0);
    const egr=arr.reduce((a,w)=>a+(egresoWO(w)||0),0);
    const mat=arr.reduce((a,w)=>a+materialWO(w),0);
    return `<div class="card"><div class="chd"><h3>${esc(tecN(tid))}</h3>
      <span class="s">${arr.length} trabajos</span>
      <span class="r"><span style="font-size:11px;color:var(--faint)">se le paga</span>
        <span class="mono" style="font-size:16px;font-weight:750">${money(egr)}</span>
        <button class="btn sm" data-a="comprobante" data-tec="${tid}">Ver comprobante</button></span></div>
      <table><thead><tr><th>WO</th><th>Propiedad · Unidad</th><th>Servicio</th><th>Rooms</th><th>Floors</th><th>Pagado</th><th class="num">Ingreso</th><th class="num">Egreso</th><th class="num">Material</th>${puedeVerUtilidad()?`<th class="num">Utilidad</th>`:""}</tr></thead>
      <tbody>${arr.map(w=>`<tr><td class="mono" style="font-weight:700">WO-${w.id}</td>
        <td>${esc(P(w.prop).nombre)} · ${esc(U(w.unidad).num)}</td><td>${esc(w.serv)}</td><td>${esc(U(w.unidad).rooms)}</td>
        <td class="num mono">${U(w.unidad).pisos||"—"}</td>
        <td>${w.pagadaTec?'<span class="pill v">✓ sí</span>':woBloqueada(w.id)?'<span class="pill r">excepción</span>':'<span class="pill g">no</span>'}</td>
        <td class="num mono">${ingresoWO(w)!==null?money(ingresoWO(w)):'<span class="pill w">NA</span>'}</td>
        <td class="num mono">${egresoWO(w)!==null?money(egresoWO(w)):"—"}</td>
        <td class="num mono">${materialWO(w)?money(materialWO(w)):"—"}</td>
        ${puedeVerUtilidad()?`<td class="num mono" style="color:${utilidadWO(w)>=0?"var(--verde)":"var(--rojo)"}">${utilidadWO(w)!==null?money(utilidadWO(w)):"—"}</td>`:""}</tr>`).join("")}
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
               ${money(sinAplicar)} no se pudo descontar: supera lo que ganó esta semana — queda como excepción</div>`:""}`
          : `<div class="mono" style="font-size:24px;font-weight:750">${money(bruto)}</div>`;})()}</div>
    <button class="btn ${!pagables||yaPag?"":"v"}" data-a="pagarSemana" style="margin-left:auto" ${!pagables||yaPag?"disabled":""}>
      ${yaPag?"Semana ya pagada":pagables?"Aprobar y marcar como pagada":"Nada pagable — todo frenado por excepción"}</button>
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
  ${frenadas.length?`<div class="note w" style="margin-bottom:14px">
    <b>${frenadas.length} Work Order(s) no se pueden facturar: tienen una devolución abierta.</b><br>
    Se mandaron a corregir, así que no se le cobran al cliente hasta que Gustavo verifique que quedaron bien.
    <div style="margin-top:6px;font-size:11.5px">
      ${frenadas.map(w=>{ const d=devAbiertaDeWO(w.id);
        return `WO-${w.id} · ${esc(P(w.prop).nombre)} ${U(w.unidad)?esc(U(w.unidad).num):""}
                — ${esc(d.area)}, ${diasAbierta(d)} día(s) abierta`;}).join("<br>")}</div>
    <button class="btn sm" data-a="ir" data-m="supervision" style="margin-top:7px">Ver devoluciones</button></div>`:""}
  ${frenadasExc.length?`<div class="note r" style="margin-bottom:14px">
    <b>${frenadasExc.length} Work Order(s) no se pueden facturar: tienen una excepción sin resolver.</b><br>
    Facturar con una tarifa sin definir, o con un adicional todavía sin decidir, es facturar mal. El resto de cada propiedad se puede facturar igual.
    <div style="margin-top:6px;font-size:11.5px">
      ${frenadasExc.map(w=>`WO-${w.id} · ${esc(P(w.prop).nombre)} ${U(w.unidad)?esc(U(w.unidad).num):""}`).join("<br>")}</div>
    <button class="btn sm" data-a="ir" data-m="excepciones" style="margin-top:7px">Ver excepciones</button></div>`:""}

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
      ${sinT?`<div class="cp" style="border-top:1px solid var(--line)"><div class="note w" style="margin:0"><b>${sinT} línea sin tarifa.</b> Resuélvela en Excepciones antes de facturar.</div></div>`:""}
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
VIEWS.supervision = () => {
  const t = S.tab || "campo";
  const rev = S.wos.filter(w=>w.estado==="Completed" && !w.supervisada);
  const insp = S.visitas.filter(v=>v.tipo==="Inspección" && v.estado==="Pendiente");
  return `
  <div class="ph"><div><h2>Supervisión</h2>
    <p>La jornada de Gustavo: a dónde ir, qué revisar y qué quedó acordado con cada propiedad.</p></div>
    <div class="act"><button class="btn" data-a="verGustavoCel">Ver su celular</button></div></div>
  <div class="tabs">${[["campo",`De campo (${repPend().length})`],["ruta","Ruta del día"],
      ["devs",`Devoluciones (${devAbiertas().length})`],["diario","Reporte diario"],
      ["revisar",`Por revisar (${rev.length})`],
      ["insp",`Inspecciones (${insp.length})`],["calidad","Calidad por técnico"],["reporte","Resumen del día"]]
    .map(([k,n])=>`<button class="tab ${t===k?"on":""}" data-a="tab" data-t="${k}">${n}</button>`).join("")}</div>
  ${t==="campo"?vCampoRep():t==="ruta"?vRuta():t==="devs"?vDevoluciones():t==="diario"?vDiarioWeb()
    :t==="revisar"?vRevisar(rev):t==="insp"?vInsp():t==="calidad"?vCalidad():vReporteDia()}`;
};


/* ── DEVOLUCIONES ──────────────────────────────────────────
   Antes una devolución era un estado de la Work Order que rebotaba a Thalia y
   se perdía de vista. Ahora vive hasta que Gustavo la verifica, y la CAUSA
   deja resuelto de entrada si se le paga al técnico y si se le cobra al
   cliente — en lugar de discutirlo el viernes al armar la nómina. */
function vDevoluciones(){
  const ab = devAbiertas(), venc = ab.filter(devVencida);
  const ce = S.devoluciones.filter(d=>d.estado==="Cerrada");
  const noPaga = S.devoluciones.filter(d=>!causaDe(d.causa).paga);
  const fila = d => {
    const c = causaDe(d.causa), dias = diasAbierta(d), v = devVencida(d);
    return `<tr class="${fl("dv:"+d.id)}">
      <td style="font-weight:650">${esc(P(d.prop).nombre)}
        <div style="font-size:10.5px;color:var(--faint)">${U(d.unidad)?esc(U(d.unidad).num):"—"}${d.wo?` · WO-${d.wo}`:""}</div></td>
      <td>${esc(d.area)}
        <div style="font-size:10.5px;color:var(--soft);max-width:230px">${esc(d.desc)}</div></td>
      <td><span class="pill ${c.paga?"g":"b"}">${esc(d.causa)}</span>
        <div style="font-size:10px;color:var(--faint);margin-top:2px">
          ${c.paga?"se le paga":"<b>no se le paga</b>"} · ${c.cobra?"cobrable":"no cobrable"}</div></td>
      <td>${esc(tecN(d.responsable))}</td>
      <td><span class="pill ${d.prioridad==="Alta"?"b":"g"}">${esc(d.prioridad)}</span></td>
      <td>${esc(d.fechaRep)}<div style="font-size:10.5px;color:${v?"var(--rojo)":"var(--faint)"}">límite ${esc(d.fechaLimite)}</div></td>
      <td class="num">${d.estado==="Cerrada"?"—":`<b style="color:${v?"var(--rojo)":"var(--tinta)"}">${dias}</b>`}</td>
      <td>${(d.lotesAntes||[]).reduce((t,l)=>t+l.n,0)} / ${(d.lotesDespues||[]).reduce((t,l)=>t+l.n,0)}</td>
      <td><span class="pill ${d.estado==="Cerrada"?"v":d.estado==="Corregida"?"a":"b"}">${esc(d.estado)}</span>
        ${d.verifica?`<div style="font-size:10px;color:var(--verde)">✓ ${esc(tecN(d.verifica))}</div>`:""}</td>
      <td style="text-align:right">${(()=>{ const tu=touchupDe(d.id);
        if(tu) return `<span class="pill m">WO-${tu.id}</span>
          <div style="font-size:10px;color:var(--faint);margin-top:2px">${esc(tecN(tu.tec))}${
            tu.tec===tu.tecOriginal?" · sin pago":" · se le paga"}</div>`;
        return d.estado==="Cerrada" ? "—"
          : `<button class="btn sm p" data-a="devTouchup" data-id="${d.id}">Crear touch-up</button>`;})()}</td>
    </tr>`;};
  return `
  <div class="kpis">
    <div class="kpi"><div class="l">Abiertas</div><div class="v ${ab.length?"b":""}">${ab.length}</div></div>
    <div class="kpi"><div class="l">Pasadas de fecha</div><div class="v ${venc.length?"b":""}">${venc.length}</div></div>
    <div class="kpi"><div class="l">Cerradas</div><div class="v g">${ce.length}</div></div>
    <div class="kpi"><div class="l">Que no se pagan</div><div class="v">${noPaga.length}</div></div>
  </div>

  <div class="card"><div class="chd"><h3>Devoluciones abiertas</h3>
    <span class="s">siguen contando hasta que Gustavo verifica la corrección con fotos</span></div>
    ${ab.length?`<table><thead><tr><th>Propiedad</th><th>Área y problema</th><th>Causa</th>
      <th>Corrige</th><th>Prior.</th><th>Fechas</th><th class="num">Días</th><th>Fotos a/d</th><th>Estado</th><th>Corrección</th></tr></thead>
      <tbody>${ab.map(fila).join("")}</tbody></table>`
    :`<div class="empty">Ninguna devolución abierta. Todo lo corregido está verificado.</div>`}
    <div class="cp" style="border-top:1px solid var(--line)"><div class="tr" style="margin:0">
      La columna <b>Causa</b> es la que decide la plata. Se pregunta en campo, cuando Gustavo está mirando
      el problema — no el viernes, cuando ya nadie se acuerda de quién tuvo la culpa.</div></div>
  </div>

  ${ce.length?`<div class="card"><div class="chd"><h3>Cerradas</h3>
    <span class="s">con el historial completo de fotos de antes y después</span></div>
    <table><thead><tr><th>Propiedad</th><th>Área y problema</th><th>Causa</th>
      <th>Corrigió</th><th>Prior.</th><th>Fechas</th><th class="num">Días</th><th>Fotos a/d</th><th>Estado</th><th>Corrección</th></tr></thead>
      <tbody>${ce.map(fila).join("")}</tbody></table></div>`:""}`;
}

/* ── EL REPORTE DIARIO DE GUSTAVO ────────────────────────────
   Un solo reporte por día. Lo que el sistema ya sabe entra solo; Gustavo
   escribe únicamente lo que nadie más puede saber. Una vez cerrado no se
   edita: las correcciones van como nota aparte y queda el historial. */
function vDiarioWeb(){
  const rs = S.repDiario.slice().reverse();
  if(!rs.length) return `<div class="card"><div class="chd"><h3>Reporte diario de Gustavo</h3>
    <span class="s">un solo reporte por día, que se va llenando solo</span></div>
    <div class="empty">Gustavo todavía no abrió su reporte de hoy.<br>
      <span style="font-size:12px">Entra a <b>Ver su celular</b> y ábrelo desde ahí para ver cómo funciona.</span></div>
    <div class="cp" style="border-top:1px solid var(--line)"><div class="tr" style="margin:0">
      Hoy esto es un mensaje de WhatsApp al final del día, si le alcanza el tiempo.</div></div></div>`;
  return rs.map(r=>{
    const col = r.estado==="Completado"?"var(--verde)":diaEstadoTexto(r)==="Pendiente de finalizar"?"var(--ambar)":"var(--azul)";
    const auto = r.entradas.filter(e=>e.auto).length;
    return `<div class="card ${fl("rd:"+r.id)}"><div class="chd">
      <h3>Reporte del ${r.fecha} — ${esc(tecN(r.quien))}</h3>
      <span class="s">abierto ${esc(r.horaInicio)}${r.horaFin?` · cerrado ${esc(r.horaFin)}`:" · todavía abierto"}
        · ${r.entradas.length} actividad(es), ${auto} automática(s)</span>
      <span class="r"><span class="pill ${r.estado==="Completado"?"v":diaEstadoTexto(r)==="Pendiente de finalizar"?"w":"a"}">${esc(diaEstadoTexto(r))}</span></span></div>
      ${r.entradas.length?`<table><thead><tr><th style="width:62px">Hora</th><th style="width:150px">Tipo</th>
        <th>Qué pasó</th><th style="width:150px">Dónde</th><th style="width:62px">Fotos</th></tr></thead>
        <tbody>${r.entradas.map(e=>{ const t=ENTRADAS_DIA[e.tipo]||{n:e.tipo,c:"#8a97a4"};
          return `<tr><td>${esc(e.hora)}</td>
            <td><span class="pill" style="background:${t.c}1a;color:${t.c}">${t.n}</span>
              ${e.auto?`<div style="font-size:9.5px;color:var(--faint)">automática</div>`:""}</td>
            <td>${esc(e.texto)}</td>
            <td>${e.prop?esc(P(e.prop).nombre):"—"}${e.unidad&&U(e.unidad)?`<div style="font-size:10.5px;color:var(--faint)">${esc(U(e.unidad).num)}</div>`:""}</td>
            <td class="num">${e.fotos||"—"}</td></tr>`;}).join("")}</tbody></table>`
        :`<div class="empty">Sin actividades todavía.</div>`}
      <div class="cp">
        ${r.comentarioFinal?`<div class="note" style="margin:0 0 9px"><b>Comentario final:</b> ${esc(r.comentarioFinal)}</div>`:""}
        ${r.notasPost.length?`<div class="note w" style="margin:0 0 9px"><b>Notas agregadas después del cierre</b><br>
          ${r.notasPost.map(n=>`<span style="color:var(--faint)">${esc(n[0])}</span> — ${esc(n[1])}`).join("<br>")}
          <div style="font-size:10.5px;color:var(--faint);margin-top:4px">El reporte original no se modificó.</div></div>`:""}
        <div class="tr" style="margin:0">${r.estado==="Completado"
          ? "Cerrado: Gustavo ya no puede editarlo. Si algo falta, va como nota aparte y queda el historial."
          : diaEstadoTexto(r)==="Pendiente de finalizar"
          ? "Pendiente de finalizar: quedó abierto de un día anterior y nunca se cerró — Gustavo lo tiene que terminar."
          : "Abierto: se sigue llenando y se guarda solo. Si cierra la app, no se pierde nada."}</div>
      </div></div>`;}).join("");
}

/* ── LO QUE LLEGA DEL CAMPO ───────────────────────────────────────────────
   La bandeja de Claudia. Gustavo reporta, ella decide: de aquí sale un
   estimado, una Work Order o una devolución. El estado previo no sale a
   ningún lado — se queda pegado a la unidad esperando el día del reclamo. */
function vCampoRep(){
  const nuevos = S.reportes.filter(r=>r.estado==="Nuevo").slice().reverse();
  const resto  = S.reportes.filter(r=>r.estado!=="Nuevo").slice().reverse();
  const tarjeta = r => {
    const rr = REP[r.tipo] || {n:r.tipo, c:"#8a97a4"};
    const u = U(r.unidad);
    return `<div class="card" style="margin:0 0 12px;border-left:4px solid ${rr.c}">
      <div class="chd">
        <h3>${esc(P(r.prop).nombre)} · ${u?esc(u.num):"—"}</h3>
        <span class="s">${rr.n} · ${r.fecha} ${esc(r.hora)} · ${esc(tecN(r.quien))}</span>
        <span class="r"><span class="pill ${r.estado==="Nuevo"?"a":"g"}">${esc(r.estado)}</span>
          <span class="pill m">${fotosDe(r)} fotos</span></span></div>
      <div class="cp">
        ${r.antesDe?`<div class="note w" style="margin:0 0 10px"><b>Antes de:</b> ${esc(r.antesDe)} — estas fotos documentan cómo estaba la unidad <b>antes</b> de que entrara nadie.</div>`:""}
        ${r.condUnidad?`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:9px">
          <span class="pill ${r.condUnidad==="No se pudo ingresar"?"b":"g"}">Unidad ${esc(r.condUnidad.toLowerCase())}</span>
          ${U(r.unidad)?`<span class="pill g">${esc(U(r.unidad).rooms)}</span>`:""}
          ${r.condGeneral?`<span class="pill ${r.condGeneral==="Mala"?"b":r.condGeneral==="Regular"?"a":"v"}">Condición ${esc(r.condGeneral.toLowerCase())}</span>`:""}
        </div>`:""}

        ${r.condUnidad==="No se pudo ingresar"?`<div class="note w" style="margin:0 0 10px">
          <b>No se pudo ingresar.</b> Gustavo fue a la propiedad pero no logró entrar a la unidad.
          Queda el registro con su hora; decide si se reagenda.</div>`:""}

        ${(r.items&&r.items.length)?`<div style="margin-bottom:10px">
          <b style="font-size:11px;color:var(--faint);text-transform:uppercase">Lo que hay que hacer — ${r.items.length} servicio(s)</b>
          <table style="margin:6px 0 0"><thead><tr><th>Categoría</th><th>Trabajo</th><th>Dónde</th>
            <th class="num">Cant.</th><th>Medidas</th><th>Materiales</th><th class="num">Fotos</th></tr></thead>
          <tbody>${r.items.map(it=>`<tr>
            <td><span class="pill a">${esc(it.cat)}</span></td>
            <td>${esc(it.trabajo)}${it.coment?`<div style="font-size:10.5px;color:var(--faint)">${esc(it.coment)}</div>`:""}</td>
            <td>${esc(it.ubic)}</td>
            <td class="num mono">${esc(String(it.cant||"1"))}</td>
            <td>${esc(it.medidas)||"—"}</td>
            <td>${it.mat?`<span class="pill w">${esc(it.materiales)||"sí"}</span>`:"—"}</td>
            <td class="num">${it.fotos||"—"}</td></tr>`).join("")}
          </tbody></table>
          <div class="tr" style="margin:6px 0 0">Cada renglón se convierte en una línea del estimado sin volver a escribirlo.</div>
        </div>`:""}

        ${r.recom?`<div class="note" style="margin:0 0 10px"><b>Recomendaciones de Gustavo:</b> ${esc(r.recom)}</div>`:""}

        ${r.servSup?`<div style="margin-bottom:9px"><b style="font-size:11px;color:var(--faint);text-transform:uppercase">Servicio supervisado</b><br>
          <span class="pill a">${esc(r.servSup)}</span>
          ${r.tipoVisita?`<span class="pill g">${esc(r.tipoVisita)}</span>`:""}
          ${r.estadoTrabajo?`<span class="pill ${r.estadoTrabajo==="Requiere corrección"?"b":r.estadoTrabajo==="Terminado"?"v":"a"}">${esc(r.estadoTrabajo)}</span>`:""}</div>`:""}

        ${r.problemas?`<div class="note w" style="margin:0 0 10px"><b>Problemas encontrados:</b> ${esc(r.problemas)}</div>`:""}

        ${r.adicional?`<div class="note v" style="margin:0 0 10px">
          <b>Trabajo adicional recomendado:</b> ${esc(r.adicional)}
          <div style="font-size:10.5px;color:var(--faint);margin-top:4px">
            Esto es una oportunidad de estimado, no una observación. Sale del informe como propuesta aparte.</div></div>`:""}

        ${(r.firmaGustavo||r.firmaMant)?`<div style="margin-bottom:10px;padding:8px 11px;background:#f7f9fb;border-radius:6px">
          <b style="font-size:11px;color:var(--faint);text-transform:uppercase">Firmas</b>
          ${r.firmaGustavo?`<div style="font-size:11.5px;margin-top:3px">
            <b>${esc(tecN(r.firmaGustavo.quien))}</b> — firmado con su usuario a las ${esc(r.firmaGustavo.hora)}</div>`:""}
          ${r.firmaMant?`<div style="font-size:11.5px;margin-top:2px">
            <b>${esc(r.firmaMant.nombre)||"Mantenimiento"}</b> — ${r.firmaMant.firmada?"firmó en pantalla":"sin firmar"} a las ${esc(r.firmaMant.hora)}
            <span style="color:var(--faint)">· inspeccionó la unidad junto a Gustavo</span></div>`:""}
        </div>`:""}

        ${r.servicios&&r.servicios.length?`<div style="margin-bottom:9px"><b style="font-size:11px;color:var(--faint);text-transform:uppercase">Hay que hacer</b><br>
          ${r.servicios.map(x=>`<span class="pill a" style="margin:3px 3px 0 0">${esc(x)}</span>`).join("")}</div>`:""}

        <div class="galeria">
        ${(r.lotes||[]).map(l=>`<div class="glot">
          <div class="glot-h"><b>${esc(l.amb)}</b>${l.etapa?` <span class="pill ${l.etapa==="Antes"?"a":l.etapa==="Final"?"v":"m"}" style="margin-left:4px">${esc(l.etapa)}</span>`:""}${l.cond?` <span style="color:var(--faint)">· ${esc(l.cond)}</span>`:""}
            <span class="pill g" style="float:right">${l.n}</span>
            ${l.desc?`<div style="font-size:10.5px;color:var(--soft);font-weight:400;margin-top:3px">${esc(l.desc)}</div>`:""}</div>
          <div class="glot-f">${Array.from({length:Math.min(l.n,6)}).map(()=>`<div class="fmini">📷</div>`).join("")}
            ${l.n>6?`<div class="fmini mas">+${l.n-6}</div>`:""}</div>
        </div>`).join("")}
        </div>

        ${r.medidas?`<div style="margin-top:9px;font-size:12px"><b>Medidas:</b> ${esc(r.medidas)}</div>`:""}
        ${r.material?`<div style="margin-top:9px;font-size:12px"><b>Falta:</b> ${esc(r.material)}</div>`:""}
        ${r.nota?`<div class="tr" style="margin-top:9px">«${esc(r.nota)}»</div>`:""}
        ${r.accion?`<div class="note v" style="margin:10px 0 0"><b>✓ ${esc(r.accion)}</b></div>`:""}
      </div>
      ${r.estado==="Nuevo"?`<div class="mf" style="border-top:1px solid var(--line)">
        <button class="btn" data-a="repArchivar" data-id="${r.id}">Solo archivar</button>
        ${r.tipo==="material"?`<button class="btn p" data-a="repMaterial" data-id="${r.id}">Registrar compra</button>`:""}
        ${r.tipo==="relevamiento"?`<button class="btn" data-a="repWO" data-id="${r.id}">Crear Work Order</button>
          <button class="btn p" data-a="repEstimado" data-id="${r.id}">Crear estimado</button>`:""}
        ${r.tipo==="revision"?`<button class="btn p" data-a="repArchivar" data-id="${r.id}">Dar por revisado</button>`:""}
      </div>`:""}
    </div>`;
  };
  return `
  ${nuevos.length
    ? `<div class="note" style="margin-bottom:14px"><b>${nuevos.length} reporte(s) esperando tu decisión.</b>
       Gustavo los mandó desde el campo con las fotos ya ordenadas por ambiente — no hay que pedírselas por WhatsApp.</div>`
    : `<div class="note v" style="margin-bottom:14px"><b>Nada pendiente del campo.</b> Todo lo que mandó Gustavo ya está resuelto.</div>`}
  ${nuevos.map(tarjeta).join("")}
  ${resto.length?`<h3 style="margin:18px 0 10px;font-size:12.5px;color:var(--faint);text-transform:uppercase;letter-spacing:.05em">Ya resueltos</h3>
    ${resto.map(tarjeta).join("")}`:""}
  <div class="tr">Su flujograma termina en «entregar reporte a Claudia con fotografías, observaciones, devoluciones,
    inspecciones realizadas, materiales requeridos y avances». Esto es eso — pero sin que él tenga que escribirlo.</div>`;
}


/* ── ESTADO PREVIO ────────────────────────────────────────────────────────
   Lo que Gustavo fotografió antes de que entrara nadie. No genera ninguna
   acción: se guarda y se olvida, hasta el día que el manager diga «ustedes
   me dañaron esto». Ese día se abre la unidad y ahí está, con su fecha.   */
function vPrevio(pid){
  /* Todos los informes de esa propiedad, no solo los previos: el informe de
     supervision tambien tiene que poder encontrarse POR UNIDAD anos despues. */
  const rs = S.reportes.filter(r=>r.prop===pid).slice().reverse();
  const us = S.unidades.filter(u=>u.prop===pid);
  return `
  <div class="note w" style="margin-bottom:14px"><b>Para qué sirve esto.</b>
    Todo lo que Gustavo reportó de esta propiedad queda aquí, <b>pegado a la unidad</b>: el estado previo
    antes de empezar, las supervisiones con sus fotos de antes, durante y final, y las inspecciones para
    estimado. Si dentro de dos años el manager reclama un daño, la foto está con su fecha, su hora y
    quién la tomó — sin tener que recordar qué día fue. <b>Nunca se borra.</b></div>

  ${(()=>{ const dv = S.devoluciones.filter(d=>d.prop===pid);
    return dv.length?`<div class="card"><div class="chd"><h3>Devoluciones de esta propiedad</h3>
      <span class="s">${dv.filter(d=>d.estado!=="Cerrada").length} abierta(s) de ${dv.length}</span></div>
      <table><thead><tr><th>Unidad</th><th>Área y problema</th><th>Causa</th><th>Corrige</th>
        <th>Reportada</th><th>Estado</th></tr></thead>
      <tbody>${dv.map(d=>`<tr>
        <td>${U(d.unidad)?esc(U(d.unidad).num):"—"}</td>
        <td><b>${esc(d.area)}</b><div style="font-size:10.5px;color:var(--soft)">${esc(d.desc)}</div></td>
        <td><span class="pill ${causaDe(d.causa).paga?"g":"b"}">${esc(d.causa)}</span></td>
        <td>${esc(tecN(d.responsable))}</td>
        <td>${d.fechaRep}</td>
        <td><span class="pill ${d.estado==="Cerrada"?"v":"b"}">${esc(d.estado)}</span></td></tr>`).join("")}
      </tbody></table></div>`:"";})()}

  ${us.map(u=>{
    const propias = rs.filter(r=>r.unidad===u.id);
    if(!propias.length) return "";
    return `<div class="card"><div class="chd"><h3>Unidad ${esc(u.num)}</h3>
      <span class="s">${esc(u.rooms)} · ${u.pisos} piso(s)</span>
      <span class="r"><span class="pill m">${propias.reduce((t,r)=>t+fotosDe(r),0)} fotos en ${propias.length} registro(s)</span></span></div>
      ${propias.map(r=>`<div class="cp" style="border-top:1px solid var(--line)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px">
          <div><b>Antes de: ${esc(r.antesDe||"—")}</b>
            <span style="color:var(--faint);font-size:11.5px">· ${r.fecha} ${esc(r.hora)} · ${esc(tecN(r.quien))}</span></div>
          <span class="pill v">${fotosDe(r)} fotos</span></div>
        <div class="galeria">
        ${(r.lotes||[]).map(l=>`<div class="glot">
          <div class="glot-h"><b>${esc(l.amb)}</b>${l.etapa?` <span class="pill ${l.etapa==="Antes"?"a":l.etapa==="Final"?"v":"m"}" style="margin-left:4px">${esc(l.etapa)}</span>`:""}${l.cond?` <span style="color:var(--faint)">· ${esc(l.cond)}</span>`:""}
            <span class="pill g" style="float:right">${l.n}</span>
            ${l.desc?`<div style="font-size:10.5px;color:var(--soft);font-weight:400;margin-top:3px">${esc(l.desc)}</div>`:""}</div>
          <div class="glot-f">${Array.from({length:Math.min(l.n,6)}).map(()=>`<div class="fmini">📷</div>`).join("")}
            ${l.n>6?`<div class="fmini mas">+${l.n-6}</div>`:""}</div></div>`).join("")}
        </div>
        ${r.nota?`<div class="tr" style="margin-top:9px">«${esc(r.nota)}»</div>`:""}
      </div>`).join("")}
    </div>`;}).join("")
    || `<div class="empty"><div class="b">·</div>Sin registros de estado previo en esta propiedad.<br>
        <span style="font-size:12px">Gustavo los toma desde su celular antes de que arranque un trabajo.</span></div>`}

  <div class="tr">Claudia: «a veces toman captura de todo, porque el dueño puede decir <i>eso no estuvo así, ustedes lo hicieron</i>».
    Es el mismo problema de «no me consta lo que me estás diciendo», pero al revés.</div>`;
}

/* UC-12b — «el sistema le arma la ruta del día, ordenadas por zona» */
function vRuta(){
  const ag = agendaHoy();
  const hechas = ag.filter(a=>a.estado==="Visitada");
  const ruta = rutaGustavo();
  return `
  <div class="card"><div class="chd"><h3>Agenda de Gustavo — ${HOY_SUP}</h3>
    <span class="s">«Recibir agendamiento diario de Claudia» — el primer paso de su flujograma</span>
    <span class="r"><span class="pill ${hechas.length===ag.length&&ag.length?"v":"a"}">${hechas.length} de ${ag.length} visitadas</span>
      <button class="btn sm p" data-a="agSupNueva">+ Agregar parada</button></span></div>
    ${ag.length?`<table>
      <thead><tr><th style="width:44px">#</th><th>Propiedad</th><th>Zona</th><th>Motivo</th><th>Nota</th><th>Estado</th><th></th></tr></thead>
      <tbody>${ruta.flatMap((z,i)=>z.paradas.map((pa,j)=>{
        /* Los cuatro estados que Gustavo puede marcar desde el celular.
           Antes esto era binario y «en camino» o «no completada» se veían
           igual que «pendiente»: él marcaba y Claudia no se enteraba. */
        const pil = {"Visitada":"v","En camino":"a","No completada":"w","Pendiente":"g"}[pa.estado]||"g";
        return `<tr class="${fl("ags:"+pa.id)}">
        <td><span class="pill ${pil}">${i+1}.${j+1}</span></td>
        <td style="font-weight:650">${esc(P(pa.prop).nombre)}
          <div style="font-size:10.5px;color:var(--faint)">${esc(P(pa.prop).dir)}</div></td>
        <td>${esc(z.zona)}</td>
        <td><span class="pill a">${esc(pa.motivo)}</span></td>
        <td style="max-width:250px;font-size:11.5px;color:var(--soft)">${esc(pa.nota)||"—"}</td>
        <td><span class="pill ${pil}">${pa.estado==="Visitada"?`<span class="dot"></span>llegó ${esc(pa.hora)}`
              :pa.estado==="En camino"?`en camino desde ${esc(pa.horaCamino||"")}`
              :pa.estado==="No completada"?`no se pudo`:`pendiente`}</span>
          ${pa.estado==="No completada"&&pa.motivoNo?`<div style="font-size:10.5px;color:var(--ambar);margin-top:2px">${esc(pa.motivoNo)}</div>`:""}</td>
        <td style="text-align:right">${!["Visitada","No completada"].includes(pa.estado)?`<button class="btn sm" data-a="agSupQuita" data-id="${pa.id}">Quitar</button>`:""}</td>
      </tr>`;})).join("")}</tbody></table>`
    :`<div class="empty">Hoy no le has armado ruta a Gustavo.<br>
       <span style="font-size:12px">Agrega las propiedades que tiene que visitar y el motivo de cada una.</span></div>`}
    <div class="cp" style="border-top:1px solid var(--line)"><div class="tr" style="margin:0">
      Tú decides <b>a dónde va</b>; el sistema ordena las paradas <b>por zona</b> para que no dé vueltas.
      Es la misma razón por la que los técnicos se asignan por cercanía.</div></div>
  </div>

  ${ag.length?`<div class="card"><div class="chd"><h3>Cómo va su día</h3>
    <span class="s">se actualiza solo con lo que él marca desde el celular: en camino, llegó o no se pudo</span>
    <span class="r">${(()=>{const c={};ag.forEach(a=>c[a.estado]=(c[a.estado]||0)+1);
      return Object.entries(c).map(([e,n])=>`<span class="pill ${
        {"Visitada":"v","En camino":"a","No completada":"w"}[e]||"g"}">${n} ${esc(e.toLowerCase())}</span>`).join(" ");})()}</span></div>
    <div class="cp" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px">
    ${ag.map(pa=>{
      const col = {"Visitada":"var(--verde)","En camino":"var(--azul)","No completada":"var(--ambar)"}[pa.estado]||"var(--line)";
      return `<div style="border:1px solid ${col};border-radius:9px;padding:11px 13px">
      <div style="font-weight:700;font-size:12.5px">${esc(P(pa.prop).nombre)}</div>
      <div style="font-size:11px;color:var(--faint);margin-bottom:5px">${esc(pa.motivo)}</div>
      ${pa.estado==="Visitada"
        ? `<div style="font-size:11.5px;color:var(--verde)"><b>✓ Llegó ${esc(pa.hora)}</b></div>
           ${S.reportes.filter(r=>r.prop===pa.prop && r.fecha===HOY_SUP).length
             ? `<div style="font-size:11px;color:var(--soft);margin-top:2px">${S.reportes.filter(r=>r.prop===pa.prop&&r.fecha===HOY_SUP).length} reporte(s) enviado(s)</div>`
             : `<div style="font-size:11px;color:var(--faint);margin-top:2px">todavía sin reportar nada</div>`}`
        : pa.estado==="En camino"
        ? `<div style="font-size:11.5px;color:var(--azul)"><b>En camino</b> desde ${esc(pa.horaCamino||"")}</div>
           <div style="font-size:11px;color:var(--faint);margin-top:2px">salió pero todavía no llega</div>`
        : pa.estado==="No completada"
        ? `<div style="font-size:11.5px;color:var(--ambar)"><b>No se pudo completar</b></div>
           <div style="font-size:11px;color:var(--soft);margin-top:2px">${esc(pa.motivoNo||"")}</div>
           <div style="font-size:10.5px;color:var(--faint);margin-top:3px">Fue, pero no pudo. Decide si se reagenda.</div>`
        : `<div style="font-size:11.5px;color:var(--faint)">Pendiente — todavía no sale</div>`}
    </div>`;}).join("")}
    </div></div>`:""}

  ${vRutaCalc()}`;
}

/* La ruta calculada a partir de los trabajos activos: sigue sirviendo como
   sugerencia de a dónde convendría mandarlo, pero ya no ES su agenda. */
function vRutaCalc(){
  const hoy = "2026-08-11";
  const enCurso = S.wos.filter(w=>["In progress","Esperando aprobación","Completed"].includes(w.estado) && !w.supervisada);
  const porZona = {};
  enCurso.forEach(w=>{ const z=P(w.prop).zona; (porZona[z]=porZona[z]||[]).push(w); });
  const zonas = Object.keys(porZona).sort((a,b)=>porZona[b].length-porZona[a].length);
  return `
  ${zonas.length?`<div class="card" style="margin-top:14px"><div class="chd"><h3>Dónde hay trabajo esta semana</h3>
    <span class="s">${enCurso.length} trabajo(s) en ${zonas.length} zona(s) — sugerencia de a dónde conviene mandarlo</span></div>
    <div class="cp" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:12px">
    ${zonas.map((z,i)=>{
      const arr=porZona[z], props=[...new Set(arr.map(w=>w.prop))];
      return `<div style="border:1px solid var(--line);border-radius:9px;overflow:hidden">
        <div style="background:var(--azul-cl);padding:9px 12px;display:flex;align-items:center;gap:8px">
          <span class="pill a" style="font-weight:800">${i+1}</span>
          <b style="color:var(--azul-s)">${esc(z)}</b>
          <span class="pill g" style="margin-left:auto">${props.length} propiedad(es)</span></div>
        ${props.map(pid=>{
          const suyas=arr.filter(w=>w.prop===pid);
          const vis=S.visitas.find(v=>v.prop===pid && v.fecha===hoy && v.tipo==="Supervisión");
          return `<div style="padding:10px 12px;border-bottom:1px solid var(--line)">
            <div style="display:flex;align-items:center;gap:8px">
              <div style="min-width:0"><div style="font-weight:650;font-size:12.5px">${esc(P(pid).nombre)}</div>
                <div style="font-size:10.5px;color:var(--faint)">${esc(P(pid).dir)}</div></div>
              ${vis?`<span class="pill v" style="margin-left:auto">visitada ${esc(vis.hora)}</span>`
                   :`<button class="btn sm p" style="margin-left:auto" data-a="visitaModal" data-prop="${pid}">Registrar visita</button>`}</div>
            <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px">
              ${suyas.map(w=>`<span class="pill ${w.estado==="Completed"?"v":"m"}" style="cursor:pointer" data-a="woVer" data-id="${w.id}">
                ${esc(U(w.unidad).num)} · ${esc(w.serv)} · ${esc(tecN(w.tec))}</span>`).join("")}</div>
            ${vis&&vis.acuerdos?`<div class="note v" style="margin-top:7px;font-size:11.5px"><b>Acordado:</b> ${esc(vis.acuerdos)}</div>`:""}
          </div>`;}).join("")}
      </div>`;}).join("")}</div></div>`
  :`<div class="card"><div class="empty"><div class="b">✓</div>Sin trabajo en curso — no hay ruta que armar hoy</div></div>`}
  <div class="tr">Ordenada por zona porque el traslado quita tiempo. Es la misma razón por la que se asigna por cercanía.</div>`;
}

/* UC-12 — aprobar O DEVOLVER, con la devolución medida por técnico (H-10) */
function vRevisar(rev){
  return `
  <div class="card"><div class="chd"><h3>Terminadas, esperando tu revisión</h3>
    <span class="s">hasta que las apruebes no se pueden facturar</span></div>
    ${rev.length?`<table><thead><tr><th>WO</th><th>Propiedad · Unidad</th><th>Servicio</th><th>Técnico</th><th>Evidencia</th><th></th></tr></thead>
    <tbody>${rev.map(w=>`<tr class="${fl("wo:"+w.id)}"><td class="mono" style="font-weight:700">WO-${w.id}</td>
      <td>${esc(P(w.prop).nombre)} · ${esc(U(w.unidad).num)}<div style="font-size:10.5px;color:var(--faint)">${esc(P(w.prop).zona)}</div></td>
      <td>${esc(w.serv)}</td><td>${esc(tecN(w.tec))}</td>
      <td>${w.evid?`<span class="pill v">${w.evid} foto(s)</span>`:'<span class="pill r"><span class="dot"></span>sin evidencia</span>'}
        ${w.devuelta?`<div><span class="pill w">devuelta ${w.devuelta}×</span></div>`:""}</td>
      <td style="text-align:right;white-space:nowrap">
        <button class="btn sm" data-a="devolverModal" data-id="${w.id}">Devolver</button>
        <button class="btn sm ${w.evid?"v":""}" data-a="supervisar" data-id="${w.id}">Aprobar</button></td></tr>`).join("")}
    </tbody></table>`:`<div class="empty"><div class="b">✓</div>Nada pendiente de revisar</div>`}
  </div>
  <div class="tr">Devolver no es castigo: es lo que hoy no tiene tratamiento. Cada devolución queda contada por técnico y con su motivo.</div>`;
}

/* UC-04b — inspecciones que le manda Claudia */
function vInsp(){
  const todas = S.visitas.filter(v=>v.tipo==="Inspección");
  return `
  <div class="card"><div class="chd"><h3>Inspecciones asignadas</h3>
    <span class="s">Claudia no puede cotizar hasta que alguien vaya a medir</span></div>
    ${todas.length?`<table><thead><tr><th>Propiedad</th><th>Qué relevar</th><th>Pedida por</th><th>Estado</th><th></th></tr></thead>
    <tbody>${todas.map(v=>`<tr>
      <td style="font-weight:650">${esc(P(v.prop).nombre)}<div style="font-size:10.5px;color:var(--faint)">${esc(P(v.prop).zona)} · ${esc(P(v.prop).dir)}</div></td>
      <td style="max-width:280px">${esc(v.pide)}</td>
      <td>${esc(v.quien)} · ${esc(v.hora)}</td>
      <td><span class="pill ${v.estado==="Cerrada"?"v":"w"}">${esc(v.estado)}</span>
        ${v.ambientes?`<div style="font-size:10.5px;color:var(--faint)">${v.ambientes.length} ambiente(s)</div>`:""}</td>
      <td style="text-align:right">${v.estado==="Pendiente"
        ? `<button class="btn sm p" data-a="inspModal" data-id="${v.id}">Registrar en sitio</button>`
        : `<button class="btn sm" data-a="inspVer" data-id="${v.id}">Ver</button>`}</td></tr>`).join("")}
    </tbody></table>`:`<div class="empty">Sin inspecciones. Claudia las pide desde una solicitud que necesita medirse antes de cotizar.</div>`}
  </div>
  <div class="tr">Las medidas y fotos quedan contra la propiedad, no en el mensaje de alguien. Claudia cotiza con eso ya cargado.</div>`;
}

/* H-10 — devoluciones medidas por técnico */
function vCalidad(){
  const tecs = S.tecnicos.filter(t=>!t.esp.includes("Supervisor"));
  const filas = tecs.map(t=>{
    const ws = S.wos.filter(w=>w.tec===t.id);
    const sup = ws.filter(w=>w.supervisada).length;
    const dev = ws.reduce((a,w)=>a+(w.devuelta||0),0);
    const sinEvid = ws.filter(w=>w.estado==="Completed"&&!w.evid).length;
    const asis = S.asistencias.filter(a=>a.tec===t.id);
    const tarde = asis.filter(a=>a.puntualidad==="Tarde"||a.puntualidad==="Declarada").length;
    return {t,ws:ws.length,sup,dev,sinEvid,tarde,asis:asis.length};
  }).filter(f=>f.ws>0);
  return `
  <div class="card"><div class="chd"><h3>Calidad por técnico</h3>
    <span class="s">lo que hoy no se mide: quién genera retrabajo</span></div>
    ${filas.length?`<table><thead><tr><th>Técnico</th><th class="num">Trabajos</th><th class="num">Aprobados</th>
      <th class="num">Devueltos</th><th class="num">Sin evidencia</th><th class="num">Llegadas tarde</th><th>Señal</th></tr></thead>
    <tbody>${filas.map(f=>{
      const mal = f.dev + f.sinEvid + f.tarde;
      return `<tr><td style="font-weight:650">${esc(tecN(f.t.id))}<div style="font-size:10.5px;color:var(--faint)">${f.t.esp.join(", ")}</div></td>
        <td class="num mono">${f.ws}</td><td class="num mono" style="color:var(--verde)">${f.sup}</td>
        <td class="num mono" style="${f.dev?"color:var(--rojo);font-weight:700":""}">${f.dev||"—"}</td>
        <td class="num mono" style="${f.sinEvid?"color:var(--ambar)":""}">${f.sinEvid||"—"}</td>
        <td class="num mono" style="${f.tarde?"color:var(--ambar)":""}">${f.tarde||"—"}</td>
        <td>${mal===0?'<span class="pill v">Sin observaciones</span>'
             :mal<=1?'<span class="pill w">Revisar</span>'
                   :'<span class="pill r"><span class="dot"></span>Atención</span>'}</td></tr>`;
    }).join("")}</tbody></table>`:`<div class="empty">Todavía sin datos suficientes</div>`}
  </div>
  <div class="tr">Hallazgo H-10 del informe: hoy las devoluciones no tienen tratamiento y nadie sabe de quién vienen.</div>`;
}

/* UC-12b — «todo lo registrado durante la jornada arma solo el reporte diario» */
function vReporteDia(){
  const hoy="2026-08-11";
  const vis = S.visitas.filter(v=>v.fecha===hoy);
  const apro = S.wos.filter(w=>w.supervisada && w.hist.some(h=>h[1].includes("Supervisión")));
  const dev = S.wos.filter(w=>w.devuelta);
  const mats = S.movs.filter(m=>m.fecha===hoy && m.quien===S.usuario);
  const nada = !vis.length && !apro.length && !dev.length && !mats.length;
  return `
  <div class="card"><div class="chd"><h3>Reporte del ${hoy}</h3>
    <span class="s">se arma solo con lo que fuiste haciendo — no se escribe</span></div>
    ${nada?`<div class="empty">Todavía no hay actividad hoy. Registra una visita o revisa un trabajo y aparecerá aquí.</div>`:`
    <div class="cp">
      <div class="kpis" style="margin:0 0 14px">
        <div class="kpi"><div class="l">Propiedades visitadas</div><div class="v">${vis.filter(v=>v.tipo==="Supervisión").length}</div></div>
        <div class="kpi"><div class="l">Trabajos aprobados</div><div class="v g">${apro.length}</div></div>
        <div class="kpi"><div class="l">Devueltos</div><div class="v ${dev.length?"b":""}">${dev.length}</div></div>
        <div class="kpi"><div class="l">Inspecciones</div><div class="v">${vis.filter(v=>v.tipo==="Inspección"&&v.estado==="Cerrada").length}</div></div>
      </div>
      <ul class="traza">
      ${vis.map(v=>`<li class="hecho"><span class="mk">✓</span><div>
        <div class="tt">${esc(v.tipo)} en ${esc(P(v.prop).nombre)}</div>
        ${v.acuerdos?`<div class="dd">Acordado: ${esc(v.acuerdos)}</div>`:""}
        <div class="qq">${esc(v.hora)}</div></div></li>`).join("")}
      ${apro.map(w=>`<li class="hecho"><span class="mk">✓</span><div>
        <div class="tt">Aprobó WO-${w.id} · ${esc(P(w.prop).nombre)} ${esc(U(w.unidad).num)}</div>
        <div class="dd">${esc(w.serv)} · ${esc(tecN(w.tec))} · ${w.evid} evidencia(s)</div></div></li>`).join("")}
      ${dev.map(w=>`<li class="pend"><span class="mk">↩</span><div>
        <div class="tt">Devolvió WO-${w.id} · ${esc(P(w.prop).nombre)}</div>
        <div class="dd">${esc(w.motivoDev||"")}</div><div class="qq">${esc(tecN(w.tec))}</div></div></li>`).join("")}
      ${mats.map(m=>`<li class="hecho"><span class="mk">✓</span><div>
        <div class="tt">Registró material · ${esc(by(S.productos,m.prod).nombre)}</div>
        <div class="dd">${m.tipo} de ${m.cant}</div></div></li>`).join("")}
      </ul>
    </div>`}
  </div>
  ${nada?"":`<div class="card"><div class="cp" style="display:flex;align-items:center;gap:12px">
    <div><div style="font-weight:650">Entregar el reporte a Claudia</div>
      <div style="font-size:11.5px;color:var(--faint)">Con fotografías, observaciones, devoluciones, inspecciones y materiales requeridos</div></div>
    <button class="btn p" style="margin-left:auto" data-a="reporteEnviar">Enviar reporte diario</button></div></div>`}
  <div class="tr">Es la contraparte presencial de la supervisión por evidencia: revisar fotos no reemplaza ir, la complementa.</div>`;
}

/* ── CLIENTES ── */
VIEWS.clientes = () => `
  <div class="ph"><div><h2>Management</h2><p>El punto de entrada. Hoy esto no existe: se salta directo a la propiedad.</p></div>
    <div class="act"><button class="btn p" data-a="cliNuevo">+ Nuevo</button></div></div>
  <div class="card"><table>
    <thead><tr><th>Nombre</th><th>Contacto</th><th>Teléfono</th><th>Correo</th><th class="num">Propiedades</th><th>Documentos</th><th></th></tr></thead>
    <tbody>${S.clientes.map(c=>`<tr class="${fl("cli:"+c.id)}"><td style="font-weight:650">${esc(c.nombre)}</td>
      <td>${esc(c.contacto)}</td><td class="mono">${esc(c.tel)}</td><td>${esc(c.mail)}</td>
      <td class="num mono">${S.propiedades.filter(p=>p.cliente===c.id).length}</td>
      <td><button class="btn sm" data-a="cliDocsModal" data-id="${c.id}">${(c.vendorPacket==="Recibido"?1:0)+(c.w9==="Recibido"?1:0)}/2${c.vendorPacketPdf||c.w9Pdf?` 📎`:""}</button></td>
      <td style="text-align:right"><button class="btn sm" data-a="cliNuevo" data-id="${c.id}">Corregir</button></td></tr>`).join("")}</tbody></table></div>
  <div class="tr">El sistema avisa si el teléfono ya existe, para no duplicar el mismo management dos veces. Y si algo se tecleó mal, <b>Corregir</b> lo arregla: el valor anterior queda en la Bitácora. Client Status, Client Source e historial de comunicación se registran en cada <b>Propiedad</b>, no aquí — un mismo management puede tener varias, cada una con su propio estado.</div>`;

/* UC-05 — el COI lo emite la aseguradora, no Cordova. Sin COI vigente no se manda a nadie a trabajar.
   Un mismo certificado (ACORD 25) trae varias pólizas — General Liability, Auto, Workers Comp, a
   veces Umbrella — cada una con su propio vencimiento. Solo está vigente si TODAS lo están. */
const POLIZA_TIPOS = ["General Liability","Auto Liability","Umbrella/Excess Liability","Workers Compensation","Other"];
const coiVigente = pid => { const p=P(pid);
  return !!(p.polizas && p.polizas.length && p.polizas.every(x=>x.vence && x.vence>=HOY_SUP)); };

/* ── ESTIMADOS ── el sistema lo arma jalando el tarifario (UC-04) ── */
/* Una sola fuente de verdad para el precio de una linea de estimado.
   Si la linea trae precio guardado, ese manda — es el que el cliente vio
   cuando se le envio. Si no lo trae, se resuelve del tarifario.
   Antes habia dos calculos distintos y el correo al cliente mostraba 0. */
function precioLinea(e, l){
  if(l.precio!=null) return l.precio;
  const u = U(l.unidad); if(!u) return 0;
  const t = tarifa(e.prop, l.cat, l.serv, u.rooms, u.pisos);
  return t ? t.precio : 0;
}
/* El documento real (formulario de vCita) cobra Rate x Quantity y le suma el
   Tax de la linea — antes el total ignoraba la Cantidad, y el correo mostraba
   un monto que no cuadraba con lo que la tabla del estimado ya sumaba. */
const tasaLinea = l => l.tax ? ((by(S.impuestos,l.tax)||{}).tasa||0) : 0;
const totalLinea = (e,l) => precioLinea(e,l)*(l.cantidad||1)*(1+tasaLinea(l)/100);
const subtotalEst = e => e.lineas.reduce((a,l)=>a+precioLinea(e,l)*(l.cantidad||1),0);
const totalEst = e => e.lineas.reduce((a,l)=>a+totalLinea(e,l),0);
/* Total de lo que el cliente realmente aceptó (puede haber marcado solo algunas líneas) */
const lineasAprobDe = e => e.lineasAprob || e.lineas.map((_,i)=>i);
const totalEstAprob = e => lineasAprobDe(e)
  .reduce((a,i)=> a + (e.lineas[i] ? totalLinea(e, e.lineas[i]) : 0), 0);
/* Numero, Bill To y vigencia — igual que el Estimate real de vCita */
const estSiguienteNum = () => "EST-2026-"+String(20+S.estimados.length).padStart(3,"0");
const sumarDias = (iso,n) => { const d=new Date(iso+"T00:00:00"); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };
const billToDe = pid => { const p=P(pid); return p.cliente ? esc(CLI(p.cliente).nombre)+" - "+esc(p.nombre) : esc(p.nombre); };
const NOTA_ESTIMADO_DEFAULT = "Please note that cleaning services requiring extra materials or additional time will incur an extra charge per item or supply used.\nWe also offer trash-out services, carpet cleaning, and more.\nFor painting, we can handle sheen changes (matte, satin, semi-gloss) and color changes — not just same-color refreshes.\nAdditionally, if you need repairs, we do it all: from the smallest fixes to more complex projects!\nIf you need a customized estimate, don't hesitate to contact us — we'll get it to you within 24 hours!";
/* Solo cuenta como "inspeccion recibida" un reporte de campo tipo "previo"
   de esa propiedad, creado el mismo dia de la solicitud o despues. */
const solInspeccionLista = s => !!s.prop && S.reportes.some(r=>r.tipo==="previo" && r.prop===s.prop && r.fecha>=s.fecha);
/* No hay "+ Nuevo estimado" suelto: todo estimado nace de una Solicitud
   Comercial ya registrada (solComEstimado). Esta funcion arma el borrador
   en blanco que usa ese unico punto de entrada. */
function estInicializarBorrador(prop, solicitudId){
  S.draftEst=[];
  const cs=contactosDe(prop), hoy="2026-08-11";
  // Si la Solicitud ya dice con quién habló Lydia, es ese contacto el que
  // sale marcado — Claudia no tiene que volver a elegir con quién fue.
  const sol = solicitudId ? by(S.solicitudesComerciales,solicitudId) : null;
  const preferido = sol && cs.some(c=>c.id===sol.contactoId) ? sol.contactoId : (cs[0]&&cs[0].id);
  S.estHdr={prop,contactos:preferido?[preferido]:[], solicitudId:solicitudId||null,
    label:"Estimate", num:estSiguienteNum(), issueDate:hoy, expDate:sumarDias(hoy,30),
    po:"", docs:[], deposito:false, depositoMonto:"", firma:false, terminos:"",
    nota:NOTA_ESTIMADO_DEFAULT};
}

/* ── SOLICITUDES COMERCIALES ── paso 1 del flujograma «Gestión de Propuestas
   y Estimados»: lo que Lydia recibe antes de que exista cualquier estimado.
   Sin esto, el sistema arrancaba a medir a partir de la mitad del proceso. */
VIEWS.solicitudes = () => `
  <div class="ph"><div><h2>Solicitudes Comerciales</h2>
    <p>Lo que Lydia recibe cuando alguien pide un precio — antes de que exista cualquier estimado.</p></div>
    <div class="act"><button class="btn p" data-a="solComNueva">+ Nueva solicitud</button></div></div>

  ${(()=>{ /* UC-01b — la visita comercial en sí: antes el sistema saltaba
      directo del registro del prospecto a la Solicitud Comercial. Si en la
      visita el cliente no se decidía, esa visita no quedaba en ningún lado
      y el seguimiento dependía de que alguien se acordara. */
    const vs = S.visitas.filter(v=>v.tipo==="Comercial");
    return `<div class="card" style="margin-bottom:14px">
    <div class="chd"><h3>Visitas comerciales</h3>
      <span class="s">con quién habló, qué pidió, y qué resultó después de cada visita</span>
      <span class="r"><button class="btn sm p" data-a="visitaComNueva">+ Registrar visita</button></span></div>
    <table><thead><tr><th>Fecha</th><th>Propiedad</th><th>Contacto</th><th>Notas de la visita</th>
      <th>Resultado</th><th>Próxima acción</th><th></th></tr></thead>
    <tbody>${vs.map(v=>{
      const vencido = v.estado==="En seguimiento" && v.proximaAccion && v.proximaAccion<HOY_SUP;
      /* "Servicio directo" se ve resuelto (pastilla verde) aunque nunca haya
         llegado a Thalia — pasa cuando la propiedad todavía no tiene el
         Expediente completo: ramificarVisita() lo avisa con un toast que se
         va solo, y la visita se queda «Cerrada» sin dejar ningún rastro.
         Un prospecto real diciendo «sí, mándenlo» se perdía sin que nadie
         se enterara por qué. Ahora, mientras siga sin llegar, la fila lo
         dice y ofrece el mismo camino que ya existe en Estimados. */
      const atascada = v.resultado==="Servicio directo" && !v.solicitudDirectaId;
      return `<tr class="${fl("visita:"+v.id)}">
        <td class="mono">${esc(v.fecha)}</td>
        <td>${v.prop?esc(P(v.prop).nombre):`${esc(v.propNombre)} <span class="pill w">nueva</span>`}</td>
        <td>${esc(v.contacto)}</td>
        <td>${esc(v.notas.length>55?v.notas.slice(0,55)+"…":v.notas)}</td>
        <td><span class="pill ${atascada?"w":v.resultado==="Requiere estimado"?"a":v.resultado==="Servicio directo"?"v":vencido?"r":"w"}">${esc(v.resultado)}</span>
          ${atascada?`<div style="font-size:10px;color:var(--ambar);margin-top:2px">⏳ no llegó a Thalia — falta el Expediente</div>`:""}</td>
        <td>${v.proximaAccion?`<span class="mono" style="${vencido?"color:var(--rojo);font-weight:700":""}">${esc(v.proximaAccion)}${vencido?" ⚠":""}</span>`:"—"}</td>
        <td style="text-align:right">${v.estado==="En seguimiento"?`<button class="btn sm" data-a="visitaComEditar" data-id="${v.id}">Actualizar</button>`
          :atascada?(expedienteOK(v.prop,{sinEstimado:true})
            ?`<button class="btn sm p" data-a="visitaReintentarDirecto" data-id="${v.id}">Reintentar</button>`
            :`<button class="btn sm" data-a="visitaIrExpediente" data-id="${v.id}">Completar Expediente</button>`)
          :""}</td></tr>`;
    }).join("")||`<tr><td colspan="7" class="empty">Sin visitas comerciales todavía</td></tr>`}
    </tbody></table>
    <div class="cp" style="border-top:1px solid var(--line)"><div class="tr" style="margin:0">
      Un prospecto que «sigue en seguimiento» no se pierde: si se pasa la fecha de la próxima acción,
      sale en Alertas hasta que alguien lo retome y cierre el resultado.</div></div>
    </div>`;})()}

  <div class="card"><table>
    <thead><tr><th>Fecha</th><th>Propiedad</th><th>Contacto</th><th>Alcance</th><th>Inspección</th><th>Estado</th><th></th></tr></thead>
    <tbody>${S.solicitudesComerciales.map(s=>`<tr class="${fl("solcom:"+s.id)}">
      <td class="mono">${esc(s.fecha)}</td>
      <td>${s.prop?esc(P(s.prop).nombre):`${esc(s.propNombre)} <span class="pill w">nueva</span>`}</td>
      <td>${esc(s.contacto)}<div style="font-size:10.5px;color:var(--faint)">${esc(s.correo)}</div></td>
      <td>${esc(s.alcance.length>60?s.alcance.slice(0,60)+"…":s.alcance)}</td>
      <td>${s.inspeccion?`<span class="pill ${solInspeccionLista(s)?"v":"w"}">${solInspeccionLista(s)?"Recibida":"Pendiente"}</span>`:'<span style="color:var(--faint)">No requiere</span>'}</td>
      <td><span class="pill ${s.estado==="Estimado creado"?"v":s.estado==="Descartada"?"r":"a"}">${esc(s.estado)}</span></td>
      <td style="text-align:right;white-space:nowrap">
        ${s.estado==="Esperando inspección"&&!solInspeccionLista(s)?`<button class="btn sm" data-a="solComInspeccion" data-id="${s.id}">Asignar inspección a Gustavo</button>`:""}
        ${s.estado!=="Estimado creado"&&s.estado!=="Descartada"?`<button class="btn sm p" data-a="solComEstimado" data-id="${s.id}">Crear estimado</button>
          <button class="btn sm" data-a="solComNueva" data-id="${s.id}">Corregir</button>
          <button class="btn sm" data-a="solComDescartar" data-id="${s.id}">Descartar</button>`:""}
        ${s.estado==="Estimado creado"?`<button class="btn sm" data-a="estInvoice" data-id="${s.estimadoId}">Ver estimado</button>`:""}
      </td></tr>`).join("")||`<tr><td colspan="7" class="empty">Sin solicitudes todavía</td></tr>`}
    </tbody></table></div>
  <div class="note">El embudo comercial completo se ve aquí: cuántos pedidos entran, cuántos requieren inspección de Gustavo, cuántos terminan convertidos en un estimado — y cuántos se caen antes de llegar a eso.</div>`;

/* Una propiedad puede tener más de un contacto (Manager, Maintenance…) —
   tomar siempre "el primero" a ciegas no es correcto. Un select simple que
   liste los contactos reales, y que llene contacto+correo con el elegido.
   El id elegido queda guardado (scContactoId) para que, si esta Solicitud
   se convierte en Estimado, sea el MISMO contacto el que salga marcado —
   sin que Claudia tenga que volver a elegir con quién habló Lydia. */
function refSolCom(preselectId, preservarTexto){
  const pid = val("scProp");
  const box = document.getElementById("scContactoBox");
  if(!box) return;
  const cs = pid ? contactosDe(pid) : [];
  if(cs.length){
    // Al abrir para corregir una solicitud vieja, "preservarTexto" evita que
    // se pise en silencio lo que ya tenía escrito — antes, una solicitud con
    // contactoId vacío (dato de antes de que existiera este campo) se topaba
    // con la propiedad y el select agarraba "el primero de la lista" sin
    // avisar, cambiando el contacto sin que nadie lo pidiera.
    const autofill = !preselectId && !preservarTexto;
    const matched = cs.some(c=>c.id===preselectId) ? preselectId : "";
    const chosen = matched || (autofill ? cs[0].id : "");
    // Si hay un contacto guardado (o se está corrigiendo) que no calza con
    // ninguno de los registrados de esta propiedad — como pasaba con SC1,
    // que traía "Rick Halloway" pero ese contacto está anotado bajo OTRA
    // propiedad — no se fuerza a elegir uno: se deja explícito que ninguno
    // de la lista es el que está escrito abajo.
    const sinMatch = !autofill && !matched;
    box.innerHTML = `<div class="fld"><label>¿Con quién habló? <span class="req">*</span></label>
      <select id="scContactoSel" data-a="solConSel">
        ${sinMatch?`<option value="" selected>— ninguno de estos, dejar lo escrito abajo —</option>`:""}
        ${cs.map(c=>`<option value="${c.id}" ${c.id===chosen?"selected":""}>${esc(c.nombre)} — ${esc(c.tipo)}</option>`).join("")}
      </select></div>`;
    if(autofill){
      document.getElementById("scContacto").value = cs[0].nombre;
      document.getElementById("scCorreo").value = cs[0].mail||"";
    }
  } else {
    box.innerHTML = pid
      ? `<div class="note w" style="margin:0 0 12px">Esta propiedad todavía no tiene ningún contacto registrado.
          <div style="margin-top:6px"><button type="button" class="btn sm" data-a="solConNuevo">+ Agregar contacto</button></div></div>`
      : "";
  }
}
function modalSolCom(id){
  const s = id ? by(S.solicitudesComerciales,id) : null;
  modal(`<div class="mh"><h3>${s?"Corregir solicitud":"Nueva Solicitud Comercial"}</h3><p>Lo mismo que Lydia anota cuando alguien pide un precio.</p></div>
  <div class="mb">
    <div class="fld"><label>Propiedad <span class="req">*</span></label>
      <select id="scProp" data-a="refSolCom">
        <option value="">— Propiedad nueva, aún no registrada —</option>
        ${S.propiedades.map(p=>`<option value="${p.id}" ${s&&s.prop===p.id?"selected":""}>${esc(p.nombre)} — ${esc(p.zona)}</option>`).join("")}
      </select>
      <div style="margin-top:8px"><button type="button" class="btn sm" data-a="solPropNueva">+ Crear propiedad</button>
        <span style="font-size:11px;color:var(--faint);margin-left:6px">si todavía no existe</span></div></div>
    <div id="scContactoBox"></div>
    <div class="fg c2">
      <div class="fld"><label>Persona de contacto <span class="req">*</span></label><input id="scContacto" value="${s?esc(s.contacto):""}"></div>
      <div class="fld"><label>Correo <span class="req">*</span></label><input id="scCorreo" value="${s?esc(s.correo):""}"></div></div>
    <div class="fld"><label>Alcance del trabajo solicitado <span class="req">*</span></label><textarea id="scAlcance" rows="3">${s?esc(s.alcance):""}</textarea></div>
    <div class="fg c2">
      <div class="fld"><label>¿Requiere inspección en sitio? <span class="req">*</span></label>
        <select id="scInspeccion"><option value="no" ${!(s&&s.inspeccion)?"selected":""}>No</option><option value="si" ${s&&s.inspeccion?"selected":""}>Sí</option></select></div>
      <div class="fld"><label>Fecha objetivo <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— opcional</span></label><input type="date" id="scFecha" value="${s?esc(s.fechaObjetivo||""):""}"></div></div>
    <div class="fld" style="margin-bottom:0"><label>Notas o requerimientos especiales</label><textarea id="scNotas" rows="2">${s?esc(s.notas||""):""}</textarea></div>
  </div>
  <div class="mf"><button class="btn" data-a="cm">Cancelar</button>
    <button class="btn p" data-a="solComGuardar" data-id="${s?s.id:""}">Guardar</button></div>`);
  // true = no pisar lo que ya tenía escrito solo porque no tiene contactoId
  if(s && s.prop) refSolCom(s.contactoId, true);
}

/* ── VISITA COMERCIAL (UC-01b) ── el paso que faltaba antes de la Solicitud
   Comercial: Lydia registra con quién habló y qué resultó después de la
   visita (el Price List se consulta aparte, en Propiedades, antes de salir
   — para cuando se llena este formulario la visita ya pasó).
   Si el prospecto no se decide, "Sigue en seguimiento" con su próxima acción —
   no se cierra el modal sin esa fecha, para no repetir el mismo hueco que
   tenían las WO reagendadas sin retorno. */
/* Lo que sigue después de la visita — las dos salidas que ya existían
   (Solicitud Comercial vía A, transferir sin llamada vía B) más la que
   faltaba (seguimiento). No duplica el trabajo si ya se ramificó antes. */
function ramificarVisita(v){
  if(v.resultado==="Requiere estimado"){
    if(!v.solicitudId){
      const sc = {id:"SC"+Date.now(), fecha:"2026-08-11", prop:v.prop, propNombre:v.propNombre||"", contactoId:v.contactoId||null,
        contacto:v.contacto, correo:v.correo||"", alcance:v.notas, inspeccion:false, fechaObjetivo:"",
        notas:`Generada desde la visita comercial de ${v.quien||S.usuario} el ${v.fecha}.`,
        quien:S.usuario, estado:"Lista para estimado", estimadoId:null};
      S.solicitudesComerciales.unshift(sc); v.solicitudId = sc.id;
    }
    toast("✓ Pasa a Solicitud Comercial",`Se creó la solicitud de <b>${esc(v.contacto)}</b> — ya se puede armar el estimado.`,"v");
  } else if(v.resultado==="Servicio directo"){
    if(!v.prop){ toast("Falta registrar la propiedad","Crea primero la Propiedad antes de transferir a Thalia sin llamada.","w"); }
    /* "Servicio directo" no exige Estimado aprobado: esa es justo la
       llamada de negociar que este camino promete saltarse — pedirlo
       igual lo volvía imposible de cerrar la primera vez que se usaba una
       propiedad nueva. El resto del Expediente (COI, contacto, Price
       List...) sigue exigiéndose igual. */
    else if(!expedienteOK(v.prop,{sinEstimado:true})){ toast("Expediente incompleto",`Completa el expediente de <b>${esc(P(v.prop).nombre)}</b> antes de transferir a Thalia.`,"w"); }
    else if(!v.solicitudDirectaId){
      const p=P(v.prop);
      const nsol={id:"SOL"+Date.now(),prop:v.prop,cliente:p.cliente,quien:S.usuario,hora:hora(),
        nota:"Desde visita comercial · lista para agendar",estado:"Pendiente"};
      S.solicitudes.push(nsol); v.solicitudDirectaId = nsol.id;
      toast("✓ Transferida a Thalia",`<b>${esc(p.nombre)}</b> le llegó sin llamada, con todo lo que se habló en la visita.`,"v");
    }
  } else {
    toast("✓ Seguimiento guardado",`Si se pasa el ${esc(v.proximaAccion)} sin retomarlo, sale en Alertas.`,"a");
  }
}
/* El Price List no va aquí: cuando Lydia llena este formulario la visita ya
   pasó — es un registro de lo que ocurrió, no una herramienta de antes de
   salir. Si necesita el precio antes de la visita, lo consulta aparte en
   Propiedades → Price List (mismo dato, en el momento en que sí sirve). */
function refVisitaCom(preselectId, preservarTexto){
  const pid = val("vcProp");
  const box = document.getElementById("vcContactoBox");
  if(!box) return;
  const cs = pid ? contactosDe(pid) : [];
  if(cs.length){
    const autofill = !preselectId && !preservarTexto;
    const matched = cs.some(c=>c.id===preselectId) ? preselectId : "";
    const chosen = matched || (autofill ? cs[0].id : "");
    const sinMatch = !autofill && !matched;
    box.innerHTML = `<div class="fld"><label>¿Con quién habló? <span class="req">*</span></label>
      <select id="vcContactoSel" data-a="visitaConSel">
        ${sinMatch?`<option value="" selected>— ninguno de estos, dejar lo escrito abajo —</option>`:""}
        ${cs.map(c=>`<option value="${c.id}" ${c.id===chosen?"selected":""}>${esc(c.nombre)} — ${esc(c.tipo)}</option>`).join("")}
      </select></div>`;
    if(autofill){
      document.getElementById("vcContacto").value = cs[0].nombre;
      document.getElementById("vcCorreo").value = cs[0].mail||"";
    }
  } else {
    box.innerHTML = pid
      ? `<div class="note w" style="margin:0 0 12px">Esta propiedad todavía no tiene ningún contacto registrado.
          <div style="margin-top:6px"><button type="button" class="btn sm" data-a="visitaConNuevo">+ Agregar contacto</button></div></div>`
      : "";
  }
}
/* Lo que ya llevaba escrito en la visita, para no perderlo al saltar a
   crear la Propiedad y volver. Mismo criterio que S.tarDraft con
   "+ Add new tax" — nada se pisa por ir a completar un dato que faltaba. */
function leerVisitaDraft(){
  const get = id => { const e=document.getElementById(id); return e?e.value:""; };
  const btn = document.querySelector('[data-a="visitaComGuardar"]');
  const sel = document.getElementById("vcContactoSel");
  return {id: btn?btn.dataset.id:"", prop:get("vcProp"), propNombre:get("vcPropNombre"),
    contactoId: sel?sel.value:null, contacto:get("vcContacto"), correo:get("vcCorreo"), notas:get("vcNotas"),
    resultado:get("vcResultado"), proxima:get("vcProxima")};
}
/* Vuelve al modal de visita comercial con lo que ya llevaba escrito, después
   de crear la Propiedad (o cancelar) — nunca se pierde. */
function volverAVisitaDraft(dr){
  cm(); modalVisitaCom(dr.id||null);
  // modal() ya dejó el HTML en el DOM — se restaura de una, igual que progFecha
  const set=(id,v)=>{ const e=document.getElementById(id); if(e && v) e.value=v; };
  if(dr.prop){ set("vcProp",dr.prop); refVisitaCom(dr.contactoId); }
  set("vcPropNombre",dr.propNombre); set("vcContacto",dr.contacto); set("vcCorreo",dr.correo);
  set("vcNotas",dr.notas); set("vcResultado",dr.resultado);
  if(dr.resultado==="Sigue en seguimiento"){ const pr=document.getElementById("vcProxRow");
    if(pr){ pr.style.display=""; set("vcProxima",dr.proxima); } }
}
/* Mismo mecanismo para la Solicitud Comercial: "propiedad nueva" tampoco
   puede seguir siendo un nombre suelto que nunca se convierte en Propiedad
   real — al final del flujo (armar el estimado) siempre terminaba bloqueada
   pidiendo justo eso. */
function leerSolComDraft(){
  const get = id => { const e=document.getElementById(id); return e?e.value:""; };
  const btn = document.querySelector('[data-a="solComGuardar"]');
  const sel = document.getElementById("scContactoSel");
  return {id: btn?btn.dataset.id:"", prop:get("scProp"),
    contactoId: sel?sel.value:null, contacto:get("scContacto"), correo:get("scCorreo"), alcance:get("scAlcance"),
    inspeccion:get("scInspeccion"), fecha:get("scFecha"), notas:get("scNotas")};
}
function volverASolComDraft(dr){
  cm(); modalSolCom(dr.id||null);
  const set=(id,v)=>{ const e=document.getElementById(id); if(e && v) e.value=v; };
  set("scProp",dr.prop);
  // Antes esta función nunca volvía a pintar el bloque de contacto — al
  // volver de "+ Crear propiedad" (o de "+ Agregar contacto"), esa caja
  // quedaba vacía sin selector ni aviso, aunque la propiedad ya estuviera
  // puesta. Mismo mecanismo que en Visita Comercial.
  if(dr.prop) refSolCom(dr.contactoId);
  set("scContacto",dr.contacto); set("scCorreo",dr.correo);
  set("scAlcance",dr.alcance); set("scInspeccion",dr.inspeccion); set("scFecha",dr.fecha); set("scNotas",dr.notas);
}
function modalVisitaCom(id){
  const v = id ? by(S.visitas, id) : null;
  const editando = v && v.resultado==="Sigue en seguimiento";
  modal(`<div class="mh"><h3>${editando?"Actualizar seguimiento":"Registrar visita comercial"}</h3>
    <p>Lo que quedó después de la visita: con quién habló, qué pidió, y qué sigue.</p></div>
  <div class="mb">
    ${editando?`
      <div class="note" style="margin-bottom:12px"><b>${v.prop?esc(P(v.prop).nombre):esc(v.propNombre)}</b> · visitada el ${esc(v.fecha)}
        <div style="margin-top:4px">${esc(v.notas)}</div></div>
      <input type="hidden" id="vcProp" value="${v.prop||""}"><input type="hidden" id="vcPropNombre" value="${esc(v.propNombre||"")}">
      <input type="hidden" id="vcContacto" value="${esc(v.contacto)}"><input type="hidden" id="vcCorreo" value="${esc(v.correo||"")}">
      <div class="fld"><label>Qué pasó ahora <span class="req">*</span></label><textarea id="vcNotas" rows="2" placeholder="Ej: llamó de vuelta, ya tiene aprobado el presupuesto">${""}</textarea></div>
    `:`
      <div class="fld"><label>Propiedad <span class="req">*</span></label>
        <select id="vcProp" data-a="refVisitaCom">
          <option value="">— elige una propiedad —</option>
          ${S.propiedades.map(p=>`<option value="${p.id}">${esc(p.nombre)} — ${esc(p.zona)}</option>`).join("")}
        </select>
        <input type="hidden" id="vcPropNombre" value="">
        <div style="margin-top:8px"><button type="button" class="btn sm" data-a="visitaPropNueva">+ Crear propiedad</button>
          <span style="font-size:11px;color:var(--faint);margin-left:6px">si todavía no existe</span></div></div>
      <div id="vcContactoBox"></div>
      <div class="fg c2">
        <div class="fld"><label>Persona de contacto <span class="req">*</span></label><input id="vcContacto"></div>
        <div class="fld"><label>Correo</label><input id="vcCorreo"></div></div>
      <div class="fld"><label>Notas de la visita <span class="req">*</span></label>
        <textarea id="vcNotas" rows="3" placeholder="Qué se habló, qué observó, qué pidió">${""}</textarea></div>
    `}
    <div class="fld"><label>Resultado <span class="req">*</span></label>
      <select id="vcResultado" data-a="visitaResultadoRef">
        <option value="">— elige —</option>
        <option value="Requiere estimado">Requiere estimado — pasa a Solicitud Comercial</option>
        <option value="Servicio directo">Servicio directo — pasa a Thalia sin llamada</option>
        <option value="Sigue en seguimiento">Sigue en seguimiento — todavía no se decide</option>
      </select></div>
    <div id="vcProxRow" class="fld" style="display:none;margin-bottom:0">
      <label>Próxima acción <span class="req">*</span></label>
      <input type="date" id="vcProxima">
      <div class="hint">Mientras no se cierre con otro resultado, si se pasa esta fecha sale en Alertas.</div></div>
  </div>
  <div class="mf"><button class="btn" data-a="cm">Cancelar</button>
    <button class="btn p" data-a="visitaComGuardar" data-id="${v?v.id:""}">Guardar</button></div>`);
}

VIEWS.estimados = () => `
  <div class="ph"><div><h2>Estimados</h2>
    <p>Eliges propiedad, unidad y servicio; el sistema pone el precio desde el tarifario. Nadie teclea montos.</p></div>
    <div class="act"><button class="btn" data-a="ir" data-m="solicitudes">Ir a Solicitudes</button></div></div>
  <div class="note" style="margin-bottom:12px">No hay un «+ Nuevo estimado» suelto: todo estimado nace de una <b>Solicitud Comercial</b> ya registrada — así el embudo completo queda siempre completo, sin atajos que lo salteen.</div>
  <div class="card"><table>
    <thead><tr><th>Número</th><th>Propiedad</th><th>Contacto</th><th>Fecha</th><th class="num">Líneas</th><th class="num">Monto</th><th>Estado</th><th>Aprobación</th><th></th></tr></thead>
    <tbody>${S.estimados.map(e=>`<tr class="${fl("est:"+e.id)}">
      <td class="mono" style="font-weight:700">${esc(e.num)}</td>
      <td>${esc(P(e.prop).nombre)}</td><td>${esc(contactosEst(e).map(c=>c.nombre).join(", "))}</td><td class="mono">${e.fecha.slice(5)}</td><td class="num mono">${e.lineas.length}</td>
      <td class="num mono" style="font-weight:700">${money(totalEst(e))}</td>
      <td><span class="pill ${e.estado==="Aprobado"?"v":e.estado==="Rechazado"?"r":"a"}">${esc(e.estado)}</span></td>
      <td>${e.aprob?`<span class="pill m">${esc(e.aprob.medio)}</span><div style="font-size:10px;color:var(--faint)">${esc(e.aprob.quien)} · ${esc(e.aprob.fecha)}${e.aprob.ip?" · IP "+e.aprob.ip:""}</div>`:'<span style="color:var(--faint)">esperando</span>'}</td>
      <td style="text-align:right;white-space:nowrap">
        <button class="btn sm" data-a="estInvoice" data-id="${e.id}">Invoice</button>
        ${e.estado==="Borrador"?`<button class="btn sm p" data-a="estEnviar" data-id="${e.id}">Enviar</button>`:""}
        ${e.estado!=="Borrador"?`<button class="btn sm" data-a="estVer" data-id="${e.id}">Ver</button>`:""}
        ${e.estado==="Enviado"?`<button class="btn sm" data-a="estClienteNo" data-id="${e.id}">Rechazar</button>
          <button class="btn sm v" data-a="estClienteOK" data-id="${e.id}">Aprobar</button>`:""}
        ${e.estado==="Rechazado"?`<button class="btn sm p" data-a="estModificar" data-id="${e.id}">Modificar propuesta y reenviar</button>`:""}
        ${e.estado==="Aprobado"&&!coiVigente(e.prop)?`<button class="btn sm" style="border-color:var(--rojo);color:var(--rojo)" data-a="estCOI" data-id="${e.id}">Solicitar COI</button>`:""}
        ${e.estado==="Aprobado"&&!expedienteOK(e.prop)?`<button class="btn sm" data-a="estIrExpediente" data-id="${e.id}">Completar Expediente</button>`:""}
        ${e.estado==="Aprobado"?`<button class="btn sm ${expedienteOK(e.prop)?"p":""}" data-a="estAgendar" data-id="${e.id}" ${expedienteOK(e.prop)?"":"disabled"}>Transferir a programación</button>`:""}
        ${e.estado==="Transferido"?`<span class="pill v" style="margin-left:6px">Con Thalia</span>`:""}
      </td></tr>`).join("")||`<tr><td colspan="9" class="empty">Sin estimados todavía</td></tr>`}
    </tbody></table></div>
  <div class="note">El cliente solo recibe el correo con el Invoice adjunto — no hace clic en nada. <b>Aprobar</b> / <b>Rechazar</b> se registra a mano, siempre pidiendo el canal por el que avisó.</div>
  <div class="tr" style="margin-top:8px">Al aprobarse, un <b>prospecto</b> pasa a ser <b>cliente</b>: ahí es cuando deja de ser alguien que preguntó y empieza a generar trabajo.</div>`;

function modalEst(){
  const h = S.estHdr;
  const us = S.unidades.filter(u=>u.prop===h.prop);
  const lineas = S.draftEst;
  const subtotal = lineas.reduce((a,l)=>a+(l.precio||0)*(l.cantidad||1),0);
  const total = lineas.reduce((a,l)=>a+totalLinea({prop:h.prop},l),0);
  /* Agregar/quitar una línea reconstruye el modal entero (modalEst() se
     vuelve a llamar) — el nodo .mb es uno nuevo y su scroll arranca en 0,
     así que cada "+ Agregar al estimado" mandaba de vuelta arriba del
     formulario, aunque estuvieras abajo armando varias líneas seguidas.
     Mismo criterio que ya se usaba en las hojas del celular del técnico. */
  const mbAntes = document.querySelector("#mroot .mb");
  const scrollAntes = mbAntes ? mbAntes.scrollTop : 0;
  modal(`<div class="mh"><h3>${h.editId?"Modificar propuesta":"Estimate"} ${esc(h.num||"")}</h3><p>${h.editId?"El cliente no la aprobó — ajusta lo que haga falta antes de reenviarla.":"Los mismos campos con los que ella arma un Estimate en vCita."}</p></div>
  <div class="mb">
    <details style="margin-bottom:10px"><summary style="cursor:pointer;font-weight:650;font-size:13px"><b>From:</b> Cordova Property Services LLC</summary>
      <div class="hint" style="margin-top:6px">922 Brookside Pl. · Pensacola, FL, 32503</div></details>

    <div class="fld"><label>Bill To <span class="req">*</span> <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— la propiedad y su Management</span></label>
      ${S.propiedades.length
        ? `<select id="eProp" data-a="estHdr">${S.propiedades.map(p=>`<option value="${p.id}" ${p.id===h.prop?"selected":""}>${esc(p.nombre)} — ${esc(p.zona)}</option>`).join("")}</select>
           <div class="hint">${billToDe(h.prop)}</div>`
        : `<select id="eProp" disabled><option>— sin propiedades —</option></select>
           <div class="hint" style="color:var(--rojo)">Todavía no hay ninguna propiedad. Créala primero en <b>Propiedades</b>.</div>`}</div>

    <div class="fld"><label>Contacto <span class="req">*</span> <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— marca a todos los que deben recibirlo</span></label>
      ${(()=>{ const cs=contactosDe(h.prop);
        return cs.length
          ? `<div style="display:flex;flex-direction:column;gap:7px">${cs.map(c=>`
              <label style="display:flex;align-items:center;gap:7px;font-weight:500;font-size:12.5px;cursor:pointer">
                <input type="checkbox" class="eCon" value="${c.id}" data-a="estConToggle" ${(h.contactos||[]).includes(c.id)?"checked":""} style="width:15px;height:15px">
                ${esc(c.nombre)} — ${esc(c.tipo)}</label>`).join("")}</div>`
          : `<div class="note r" style="margin:0">Esta propiedad no tiene contactos. Crea uno en su pestaña <b>Contactos</b> antes de enviar.</div>`;
      })()}</div>

    <div style="border:1px solid var(--line);border-radius:9px;padding:11px;margin-bottom:12px;background:var(--surface-2)">
      <div style="font-size:11px;font-weight:750;text-transform:uppercase;letter-spacing:.05em;color:var(--faint);margin-bottom:8px">Estimate Details</div>
      <div class="fg c2">
        <div class="fld" style="margin-bottom:8px"><label>Estimate Label</label><input id="eLabel" maxlength="100" value="${esc(h.label||"Estimate")}"></div>
        <div class="fld" style="margin-bottom:8px"><label>Estimate Number</label><input id="eNum" class="mono" value="${esc(h.num||"")}"></div></div>
      <div class="fg c3">
        <div class="fld" style="margin-bottom:0"><label>Issue Date</label><input type="date" id="eIssue" value="${h.issueDate||""}"></div>
        <div class="fld" style="margin-bottom:0"><label>Expiration Date</label><input type="date" id="eExp" value="${h.expDate||""}"></div>
        <div class="fld" style="margin-bottom:0"><label>Currency</label><select disabled><option>USD</option></select></div></div>
      <div class="fld" style="margin-top:9px;margin-bottom:0"><label>Purchase Order <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— optional</span></label><input id="ePO" value="${esc(h.po||"")}"></div>
    </div>

    <div style="border:1px solid var(--line);border-radius:9px;padding:11px;margin-bottom:12px;background:var(--surface-2)">
      <div style="font-size:11px;font-weight:750;text-transform:uppercase;letter-spacing:.05em;color:var(--faint);margin-bottom:8px">Agregar Item</div>
      ${(()=>{ const generales = S.tarifas.filter(t=>!t.prop), propias = S.tarifas.filter(t=>t.prop===h.prop);
        if(!generales.length && !propias.length) return `<div class="note r" style="margin:0"><b>No hay tarifas disponibles.</b> Crea una general en <b>Tarifario</b> o una propia en el Price List de esta propiedad.</div>`;
        const modo = (h.tarModo==="propia" && propias.length) ? "propia" : (generales.length ? "general" : "propia");
        const opt = t => `<option value="${t.id}">${esc(t.nombre||((t.serv||"")+" "+(t.variante||"")).trim())} — ${money(t.precio)}</option>`;
        /* Reunión 2026-09-09: "si no quiere agregarlo dentro de unidad, no
           hay problema" — un estimado suele ser por floor plan de toda la
           propiedad, no por unidad puntual. La Unidad queda opcional, y
           "+ Nueva unidad…" registra una al vuelo sin mandar a otra pantalla. */
        return `<div class="fg c2">
        <div class="fld" style="margin-bottom:0"><label>Unidad <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— opcional</span></label>
          <select id="eUni" data-a="estUniDetalle">
            <option value="" ${us.length?"":"selected"}>— sin unidad específica —</option>
            ${us.map((u,i)=>`<option value="${u.id}" ${i===0?"selected":""}>${esc(u.num)}</option>`).join("")}
            <option value="__new__">+ Nueva unidad…</option>
          </select>
          <div id="eUniDetalle"></div><div id="eUniNueva"></div></div>
        <div class="fld" style="margin-bottom:0"><label>Item (Add custom item)</label>
          <div style="display:flex;gap:6px;margin-bottom:6px">
            <button type="button" class="btn sm ${modo==="general"?"p":""}" data-a="estTarModo" data-m="general" ${generales.length?"":"disabled"}>General</button>
            <button type="button" class="btn sm ${modo==="propia"?"p":""}" data-a="estTarModo" data-m="propia" ${propias.length?"":"disabled"}>Propia</button>
          </div>
          <select id="eTarGen" ${modo!=="general"?"disabled":""}>${generales.length?generales.map(opt).join(""):`<option>— sin tarifas generales —</option>`}</select>
          <select id="eTarProp" style="margin-top:6px" ${modo!=="propia"?"disabled":""}>${propias.length?propias.map(opt).join(""):`<option>— sin tarifas propias —</option>`}</select></div></div>
      <button class="btn p sm" style="margin-top:9px" data-a="estAddLinea">+ Agregar al estimado</button>`;
      })()}
    </div>

    ${lineas.length?`<table style="border:1px solid var(--line);border-radius:9px;overflow:hidden">
      <thead><tr><th>Item</th><th class="num">Price</th><th class="num">Tax</th><th class="num">Total</th><th></th></tr></thead>
      <tbody>${lineas.map((l,i)=>`<tr>
        <td>${esc(l.serv)}<div style="font-size:10.5px;color:var(--faint)">${esc(U(l.unidad).num)} · ${esc(l.cat)}</div></td>
        <td class="num mono">${money(l.precio||0)}</td>
        <td class="num mono">${tasaLinea(l)?tasaLinea(l)+"%":"—"}</td>
        <td class="num mono" style="font-weight:700">${money(totalLinea({prop:h.prop},l))}</td>
        <td style="text-align:right"><button class="btn sm" data-a="estDelLinea" data-i="${i}">Quitar</button></td></tr>`).join("")}
      <tr><td colspan="3" style="text-align:right;color:var(--faint)">Subtotal</td>
        <td class="num mono">${money(subtotal)}</td><td></td></tr>
      <tr style="background:var(--surface-2)"><td colspan="3" style="font-weight:750">Total Amount</td>
        <td class="num mono" style="font-weight:750;font-size:15px">${money(total)}</td><td></td></tr>
      </tbody></table>`
      :`<div class="empty" style="border:1px dashed var(--line);border-radius:9px">Todavía sin líneas. Agrega la primera arriba.</div>`}

    <div class="fld" style="margin-top:12px"><label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-weight:500;text-transform:none;letter-spacing:0;font-size:12.5px">
      <input type="checkbox" id="eDepositoChk" data-a="estDepositoToggle" ${h.deposito?"checked":""} style="width:15px;height:15px"> Request Deposit</label>
      ${h.deposito?`<input id="eDepositoMonto" class="mono" style="margin-top:6px" placeholder="0.00" value="${esc(h.depositoMonto||"")}">`:""}</div>

    <details style="margin-top:12px"><summary style="cursor:pointer;font-weight:650;font-size:13px">Attached Documents (${(h.docs||[]).length})</summary>
      <div style="margin-top:8px">
        ${(h.docs||[]).length?`<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">${h.docs.map((d,i)=>
          `<span class="pill a">${esc(d)} <a href="#" data-a="estDocQuitar" data-i="${i}" style="margin-left:5px;color:inherit">✕</a></span>`).join("")}</div>`:""}
        <div style="display:flex;gap:6px"><input id="eDocNombre" placeholder="nombre-del-archivo.pdf" style="flex:1">
        <button type="button" class="btn sm" data-a="estDocAgregar">+ Add Document</button></div>
      </div></details>

    <details open style="margin-top:12px"><summary style="cursor:pointer;font-weight:650;font-size:13px">Terms, notes & signature</summary>
      <div style="margin-top:8px">
        <label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-weight:500;font-size:12.5px;margin-bottom:9px">
          <input type="checkbox" id="eFirma" ${h.firma?"checked":""} style="width:15px;height:15px"> Client signature is required</label>
        <div class="fld"><label>Terms & conditions <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— optional</span></label>
          <textarea id="eTerminos" rows="2">${esc(h.terminos||"")}</textarea></div>
        <div class="fld" style="margin-bottom:0"><label>Note to client</label>
          <textarea id="eNota" rows="4">${esc(h.nota||"")}</textarea></div>
      </div></details>
  </div>
  <div class="mf"><button class="btn" data-a="cm">Cancel</button>
    <button class="btn" data-a="estGuardarBorrador">Save draft</button>
    <button class="btn p" data-a="estGuardar">Send</button></div>`,true);
  ACC.estUniDetalle();
  const mbDespues = document.querySelector("#mroot .mb");
  if(mbDespues && scrollAntes) mbDespues.scrollTop = scrollAntes;
}
/* "Save draft" y "Send" del formulario hacen exactamente lo mismo: guardar.
   Mandar el correo de verdad es un paso aparte (ver estEnviar/modalEnviarEst) —
   asi que ambos botones caen en esta misma funcion. */
function estCrearEst(){
  estSnap();
  const h=S.estHdr;
  const datos = {num:h.num||estSiguienteNum(),label:h.label||"Estimate",prop:h.prop,
    contactos:(h.contactos||[]).slice(),fecha:h.issueDate,vence:h.expDate,po:h.po||"",
    docs:(h.docs||[]).slice(),deposito:!!h.deposito,depositoMonto:h.depositoMonto||"",
    firma:!!h.firma,terminos:h.terminos||"",nota:h.nota||"",lineas:S.draftEst.slice()};
  /* "Modificar propuesta y reenviar" (flujograma de Propuestas y Estimados:
     cliente rechazó → modificar propuesta → reenviar) reusa este mismo
     formulario, pero actualiza el estimado existente en vez de crear otro. */
  if(h.editId){
    const e = by(S.estimados, h.editId);
    Object.assign(e, datos, {estado:"Borrador", aprob:null, correoTexto:"", envAsunto:""});
    flash("est:"+e.id);
    S.draftEst=[]; cm();
    toast("✓ Propuesta modificada",`<b>${esc(e.num)}</b> queda lista — dale <b>Enviar</b> desde la lista para mandarla de nuevo.`,"v"); render();
    return;
  }
  const e={id:"E"+Date.now(),...datos,estado:"Borrador",aprob:null,correoTexto:"",token:"ap-"+Math.random().toString(36).slice(2,10)};
  S.estimados.unshift(e); S.draftEst=[]; flash("est:"+e.id);
  /* Cierra el ciclo con la Solicitud Comercial que le dio origen (paso 1 del
     flujograma) — sin esto, el sistema seguia arrancando desde la mitad. */
  if(h.solicitudId){
    const sc = by(S.solicitudesComerciales, h.solicitudId);
    if(sc){ sc.estado="Estimado creado"; sc.estimadoId=e.id; }
  }
  cm();
  toast("✓ Estimado guardado",`<b>${esc(e.num)}</b> queda sin enviar hasta que le des <b>Enviar</b> desde la lista.`,"v"); render();
}
/* Cualquier accion que vuelva a pintar el modal (marcar un contacto, cambiar
   de modo General/Propia, agregar una linea o un documento) reconstruye el
   formulario desde S.estHdr — si no se captura antes lo que ya se escribio
   en los campos sueltos (Label, fechas, PO, Terms, Note...), se pierde. */
function estSnap(){
  const h = S.estHdr; if(!h) return;
  const campos = {eLabel:"label", eNum:"num", eIssue:"issueDate", eExp:"expDate", ePO:"po", eTerminos:"terminos", eNota:"nota", eDepositoMonto:"depositoMonto"};
  Object.keys(campos).forEach(id=>{ const el=document.getElementById(id); if(el) h[campos[id]]=el.value; });
  const chkF=document.getElementById("eFirma"); if(chkF) h.firma=chkF.checked;
  const chkD=document.getElementById("eDepositoChk"); if(chkD) h.deposito=chkD.checked;
}

/* ── ALERTAS ── */
VIEWS.alertas = () => {
  const A=alertas(); const o={r:0,w:1,a:2,g:3}; A.sort((a,b)=>o[a.n]-o[b.n]);
  return `
  <div class="ph"><div><h2>Alertas</h2><p>Se recalculan solas. Ninguna es genérica: cada una sale de un problema real del archivo.</p></div></div>
  <div class="card">${A.length?`<table><thead><tr><th>Alerta</th><th>Detalle</th><th>Para quién</th></tr></thead>
    <tbody>${A.map(a=>`<tr><td><span class="pill ${a.n}"><span class="dot"></span>${esc(a.t)}</span></td>
      <td>${esc(a.d)}</td><td>${esc(a.q)}</td></tr>`).join("")}</tbody></table>`
    :`<div class="empty"><div class="b">✓</div>Sin alertas activas</div>`}</div>`;
};

/* ══════════ MODALES ══════════ */
function modal(html,wide){ $("#mroot").innerHTML=`<div class="scrim" data-a="cm"><div class="modal ${wide?"wide":""}" data-stop>${html}</div></div>`;
  /* Diferido: deja que corra primero el código que a veces sigue a modal()
     — foco en un campo, marcarlo, refWO(), etc. — y recién ahí la ayuda
     mira el formulario ya en su estado final. */
  if(typeof renderCoach==="function") setTimeout(renderCoach,0); }
/* S.progSolId sobrevive mientras el modal de "Nueva Work Order" sigue
   abierto, disparado desde "Programar" en una Solicitud (ver solProgramar
   / woGuardar). Cerrar CUALQUIER modal — cancelado o no — apaga esa marca:
   así, si el usuario abre otra cosa sin guardar, no queda una Solicitud
   vieja esperando pegarse a una Work Order que no tiene nada que ver. */
function cm(){ $("#mroot").innerHTML=""; S.progSolId=null; if(typeof renderCoach==="function") renderCoach(); }
const val = id => { const e=document.getElementById(id); return e? e.value.trim() : ""; };
const chk = id => { const e=document.getElementById(id); return e? e.checked : false; };
function marcaFalta(ids){ let bad=false; ids.forEach(i=>{ const e=document.getElementById(i);
  if(e && !e.value.trim()){ e.parentElement.classList.add("bad"); bad=true; } else if(e) e.parentElement.classList.remove("bad"); }); return bad; }

/* Categorías donde la ubicación es obligatoria (Claudia: «que no poner solamente Repair») */
const EXIGE_UBIC = ["Repair","Cabinet","Resurface","Installation","Ceramica"];
/* Reunión Claudia (feedback prototipo): "Repair no necesita habitaciones, baños
   ni floors. Tampoco resurfacing" — son las mismas categorías que ya cobran
   por arreglo puntual (Tub only, Per trailer…), no por tamaño del apartamento. */
const SIN_BEDROOMS = ["Repair","Cabinet","Resurface","Installation","Ceramica","Trash out","Pressure washing"];

/* Sección 5 del feedback: cada Sub-Work Order trae specs propias según su tipo
   — el ejemplo del doc es "Sub-WO: Door Paint" con Door/Current color/New color
   además de Location, Quantity y Notes (que ya son campos genéricos). Se arma
   como catálogo para poder sumar tipos nuevos sin tocar el formulario. */
const SUBWO_SPECS = {
  "Door":            ["Door","Current color","New color"],
  "Cambio de color": ["Current color","New color"],
  "Garage":          ["Current color","New color"]
};

function modalWO(w){
  const opts = (a,v) => a.map(x=>`<option ${x===v?"selected":""}>${esc(x)}</option>`).join("");
  modal(`
  <div class="mh"><h3>${w?`Corregir WO-${w.id}`:"Nueva Work Order"}</h3><p>${w?"Lo que se tecleó mal se arregla aquí. Cada campo que cambies queda en la Bitácora y en el historial de la orden.":"El sistema no deja guardar si falta un dato. Es lo que pidió Claudia: «no puedes pasar al siguiente paso si no tienes el primero»."}</p></div>
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
const CAMPOS = {
  nombre:"Nombre", apellido:"Apellido", tipo:"Tipo", contacto:"Contacto",
  tel:"Teléfono", mail:"Correo", origen:"Origen", estado:"Estado",
  zona:"Zona (Area)", cliente:"Management", dir:"Dirección",
  door:"Door code", coi:"COI vence", pref:"Default Contact Method",
  aprob:"Approval Method", notas:"Special Property Requirements",
  mailAP1:"Accounts Payable Email 1", mailAP2:"Accounts Payable Email 2",
  num:"Número de unidad", rooms:"Rooms", pisos:"Floor", detalle:"Detail",
  esp:"Especialidad", movimiento:"Se mueve de zona",
  prop:"Propiedad", cat:"Tipo de servicio", serv:"Servicio", variante:"Rooms",
  precio:"Se cobra al cliente", pago:"Se paga al técnico",
  desc:"Description", tax:"Tax", descuento:"Total Discount", cantidad:"Quantity",
  unidad:"Unidad", fecha:"Fecha", horaProg:"Hora", semana:"Semana",
  cant:"Cantidad", po:"PO", notasTec:"Notas al técnico",
  ubic:"Ubicación del trabajo"
};
/* Un id crudo («P3», «T2») no le dice nada a nadie leyendo la bitácora */
function legible(k,v){
  if(v===null||v===undefined||v==="") return "—";
  // Ordenado: que el técnico tenga las mismas especialidades en otro orden no
  // es una corrección, y no tiene por qué ensuciar la bitácora.
  if(Array.isArray(v)) return v.slice().sort().join(", ")||"—";
  if(v===true) return "Sí";
  if(v===false) return "No";
  if(k==="prop")    return P(v)?P(v).nombre:String(v);
  if(k==="cliente") return CLI(v)?CLI(v).nombre:String(v);
  if(k==="unidad")  return U(v)?U(v).num:String(v);
  if(k==="sup"||k==="tec") return tecN(v)||String(v);
  if(k==="precio"||k==="pago") return money(v);
  return String(v);
}
function diffCampos(antes, despues){
  const out=[];
  Object.keys(despues).forEach(k=>{
    const a=legible(k,antes[k]), b=legible(k,despues[k]);
    if(a!==b) out.push({campo:CAMPOS[k]||k, de:a, a:b});
  });
  return out;
}
/* Aplica la corrección y la deja escrita. `extra` corre con el objeto ya
   modificado, para lo que cada módulo necesite (el historial de la WO). */
function guardarEdicion(obj, nuevos, modulo, ref, extra, marca){
  const cambios = diffCampos(obj, nuevos);
  if(!cambios.length){
    // Sin esto la bitácora registraría un alta: el mismo Guardar sirve para
    // crear y para corregir, y el auditor no sabe distinguirlos solo.
    S.audOmitir = true;
    cm(); toast("Sin cambios","No modificaste ningún dato, así que no hay nada que registrar.","");
    return 0;
  }
  Object.assign(obj, nuevos);
  if(marca) flash(marca);
  if(extra) extra(obj, cambios);
  S.bitacora.unshift({ n:++S.audSeq, fecha:"2026-08-11", hora:hora(),
    usuario:S.usuario, rol:ROLES[S.usuario].r,
    accion:"Corrigió datos", modulo, ref, cambios });
  cm();
  toast("✓ Corregido",
    `${cambios.length} campo(s) en <b>${esc(ref)}</b>: ${esc(cambios.map(c=>c.campo).join(", "))}.
     Quedó en la <b>Bitácora</b> con el valor anterior — la corrección no borra el error, lo deja explicado.`,"v");
  render();
  return cambios.length;
}
/* Corregir una WO deja de ser inocente en cuanto el dinero ya salió */
const woEditable = w => w.estado!=="Canceled" && !w.pagadaTec
  && !S.facturas.some(f=>f.lineas.includes(w.id));

