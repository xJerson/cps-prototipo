"use strict";
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
