"use strict";
Object.assign(ACC, {

  ir: d => { S.mod=d.m; S.sub=null; S.tab=null; render(); },
  /* Ayuda guiada — se prende/apaga desde su propia tarjeta */
  coachOff: () => { S.coach=false; render(); },
  coachOn: () => { S.coach=true; render(); },
  ayudaVistaToggle: () => { S.ayudaVista=!S.ayudaVista; render(); },
  cm: () => cm(),
  tab: d => { S.tab=d.t; render(); },
  gvTab: d => { S.gvTab=d.v; render(); },
  /* La pestaña del borde abre el celular tal como se dejó. Para cambiar de
     dueño está el selector de la cabecera — antes se entraba al de Gustavo
     y no había forma de volver. */
  pop: () => { S.phone=true; render(); },
  pcl: () => { S.phone=false; render(); },
  campana: () => { S.campana=!S.campana; if(S.campana) avisosDe(S.usuario).forEach(a=>a.leido=true); render(); },
  avLeidos: () => { avisosDe(S.usuario).forEach(a=>a.leido=true); render(); },

  calSem: d => { S.semCal = +d.s; render(); },

  /* ── Selector de período (Nómina / Facturación) ── */
  perTipo:  () => { S.periodo.tipo = document.querySelector('[data-a="perTipo"]').value; render(); },
  perNav:   d => { S.periodo.sem = +d.s; render(); },
  perDia:   () => { S.periodo.dia = document.querySelector('[data-a="perDia"]').value; render(); },
  perDesde: () => { S.periodo.desde = document.querySelector('[data-a="perDesde"]').value; render(); },
  perHasta: () => { S.periodo.hasta = document.querySelector('[data-a="perHasta"]').value; render(); },
  perMes:   () => { S.periodo.mes = +document.querySelector('[data-a="perMes"]').value; render(); },
  perAnio:  () => { S.periodo.anio = +document.querySelector('[data-a="perAnio"]').value; render(); },

  /* ── Selector de período (Calendario) — mismo mecanismo, estado propio
     (S.periodoCal) para no pisarle el período a Nómina/Facturación.
     Nombres en minúscula ("calper...") porque renderSelectorPeriodo arma
     el data-a pegando el prefijo directo antes de "perTipo", etc. ── */
  calperTipo:  () => { S.periodoCal.tipo = document.querySelector('[data-a="calperTipo"]').value; render(); },
  calperNav:   d => { S.periodoCal.sem = +d.s; render(); },
  calperDia:   () => { S.periodoCal.dia = document.querySelector('[data-a="calperDia"]').value; render(); },
  calperDesde: () => { S.periodoCal.desde = document.querySelector('[data-a="calperDesde"]').value; render(); },
  calperHasta: () => { S.periodoCal.hasta = document.querySelector('[data-a="calperHasta"]').value; render(); },
  calperMes:   () => { S.periodoCal.mes = +document.querySelector('[data-a="calperMes"]').value; render(); },
  calperAnio:  () => { S.periodoCal.anio = +document.querySelector('[data-a="calperAnio"]').value; render(); },

  /* ── Búsqueda de Work Orders: texto y fecha se combinan, no se reemplazan. */
  woFiltroRapido: d => {
    const f=S.filtroWO||(S.filtroWO={modo:"todos",sem:S.semana,desde:"",hasta:""});
    f.modo=d.m; render();
  },
  woFiltroSemana: () => {
    const f=S.filtroWO||(S.filtroWO={modo:"semana",sem:S.semana,desde:"",hasta:""});
    f.modo="semana"; f.sem=+document.getElementById("woFsem").value||S.semana; render();
  },
  woFiltroDesde: () => {
    const f=S.filtroWO||(S.filtroWO={modo:"rango",sem:S.semana,desde:"",hasta:""});
    f.modo="rango"; f.desde=document.getElementById("woFdesde").value; render();
  },
  woFiltroHasta: () => {
    const f=S.filtroWO||(S.filtroWO={modo:"rango",sem:S.semana,desde:"",hasta:""});
    f.modo="rango"; f.hasta=document.getElementById("woFhasta").value; render();
  },

  /* ---- UC-02: Lydia pasa la solicitud a Thalia sin llamada ---- */
  transferir: d => {
    if(!expedienteOK(d.id)){ toast("🚫 Expediente incompleto","Faltan campos obligatorios.","r"); return; }
    const p=P(d.id);
    const nsol={id:"SOL"+Date.now(),prop:d.id,cliente:p.cliente,quien:S.usuario,hora:hora(),
      nota:"Expediente completo · lista para agendar",estado:"Pendiente"};
    S.solicitudes.push(nsol); flash("sol:"+nsol.id);
    toast("✓ Transferida a programación",`<b>${esc(p.nombre)}</b> le llegó a Thalia con todo capturado. No hace falta llamarla ni volver a escribir los datos.`,"v");
    render();
  },

  irEstimados: () => { S.mod="estimados"; S.sub=null; S.tab=null; render(); },

  cerrarDia: d => {
    S.diasCerrados.push(d.d);
    const ws=S.wos.filter(w=>w.fecha===d.d&&w.estado!=="Canceled");
    const sin=ws.filter(w=>!w.tec).length;
    const libres=S.tecnicos.filter(t=>t.activo&&!t.esp.includes("Supervisor")&&!bloqueo(t.id,d.d)).length;
    const cupo=libres*CAP, over=ws.length-cupo;
    toast("✓ Agendamiento cerrado",`El ${d.d} ya no admite trabajos nuevos.`
      + (over>0?` <b>Ojo:</b> hay ${ws.length} trabajos y el cupo del equipo es ${cupo} (${libres} téc. × ${CAP}) — <b>${over} de más</b>. Habría que mover alguno a otro día.`
              : sin?` Quedan <b>${sin} sin técnico</b> — es el momento de asignar.`:` Todo asignado.`),
      (over>0||sin)?"w":"v");
    render();
  },
  reabrirDia: d => {
    S.diasCerrados = S.diasCerrados.filter(x=>x!==d.d);
    toast("Agendamiento reabierto",`El ${d.d} vuelve a admitir propiedades.`,"w"); render();
  },
  buscarUni: () => { S.busca = val("woBuscar"); render(); },
  buscarLimpiar: () => { S.busca = ""; render(); },
  /* «arrojar un documento de: esto es todo lo que hiciste y se te va a pagar tanto» */
  comprobante: d => {
    const t = T(d.tec);
    // Punto 10: antes miraba siempre "la semana actual" (S.semana), sin
    // importar qué período estuviera eligiendo Erika arriba en Nómina
    // (Día/Semana/Rango/Mes) — ahora mira ese mismo período.
    const per = S.periodo, perTxt = periodoTexto(per);
    const todas = S.wos.filter(w=>enPeriodo(w.fecha,per) && w.estado==="Completed");
    const ws = todas.filter(w=>w.tec===d.tec);
    const tot = ws.reduce((a,w)=>a+(egresoWO(w)||0),0);
    const extra = extrasAprobadosDeWOs(todas).filter(x=>tecExtra(x)===d.tec);
    const totExtra = extra.reduce((a,x)=>a+(x.monto||0),0);
    modal(`<div class="mh"><h3>Comprobante de pago</h3>
      <p>${esc(tecN(d.tec))} · ${esc(perTxt)}</p></div>
    <div class="mb">
      <div style="border:1px solid var(--line);border-radius:10px;overflow:hidden">
        <div style="background:var(--azul);color:#fff;padding:13px 15px;display:flex;align-items:center;gap:10px">
          <div style="width:30px;height:30px;border-radius:7px;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px">CPS</div>
          <div><div style="font-weight:750">Cordova Property Services</div>
            <div style="font-size:11px;opacity:.85">Resumen de trabajo · ${esc(perTxt)}</div></div>
          <div style="margin-left:auto;text-align:right">
            <div style="font-size:10.5px;opacity:.85">Total a pagar</div>
            <div class="mono" style="font-size:20px;font-weight:750">${money(tot+totExtra)}</div></div></div>
        <table><thead><tr><th>Fecha</th><th>Propiedad · Unidad</th><th>Servicio</th><th class="num">Pago</th></tr></thead>
        <tbody>${ws.map(w=>`<tr><td class="mono">${w.fecha.slice(5)}</td>
          <td>${esc(P(w.prop).nombre)} · ${esc(U(w.unidad).num)}</td>
          <td>${esc(w.serv)}<div style="font-size:10.5px;color:var(--faint)">${esc(U(w.unidad).rooms)}</div></td>
          <td class="num mono">${egresoWO(w)!==null?money(egresoWO(w)):'<span class="pill w">NA</span>'}</td></tr>`).join("")
          ||`<tr><td colspan="4" class="empty">Sin trabajos terminados en este período</td></tr>`}
        ${extra.map(x=>`<tr style="background:var(--ambar-cl)"><td class="mono">—</td>
          <td colspan="2">Pago adicional aprobado · WO-${x.wo}<div style="font-size:10.5px;color:var(--ambar)">${esc(x.motivo.slice(0,70))}</div></td>
          <td class="num mono">${money(x.monto)}</td></tr>`).join("")}
        <tr style="background:var(--surface-2);font-weight:750"><td colspan="3">Total ${esc(perTxt)}</td>
          <td class="num mono" style="font-size:15px">${money(tot+totExtra)}</td></tr></tbody></table>
      </div>
      <div class="note" style="margin-top:12px">El técnico ve este mismo desglose en su celular, en «Mi pago». Nunca ve lo que se le factura al cliente.</div>
    </div>
    <div class="mf"><button class="btn p" data-a="cm">Cerrar</button></div>`,true);
  },
  // Punto 7 del feedback: galería real — reemplaza los contadores de
  // "fotos" repartidos por toda la app (Work Completed, Work to Be
  // Performed y las Sub-Work Order Ref/Evid). fotoVer abre; esto agrega.
  fotoVer: d => { S.fotoModal={tipo:d.tipo, id:+d.id}; modalFotos(); },
  fotoModalAgregar: () => {
    const m=S.fotoModal; if(!m) return;
    capturarFoto(url=>{
      if(m.tipo==="woEvid"){
        const w=W(m.id);
        (w.evidFotos=w.evidFotos||[]).push(fotoNueva(url, w.tec?T(w.tec).nombre:S.usuario));
        w.evid=w.evidFotos.length;
      } else if(m.tipo==="woPrevia"){
        const w=W(m.id);
        (w.fotosPrevias=w.fotosPrevias||[]).push(fotoNueva(url, w.tec?T(w.tec).nombre:S.usuario));
      } else if(m.tipo==="woAntes"){
        const w=W(m.id);
        (w.antesFotos=w.antesFotos||[]).push(fotoNueva(url, w.tec?T(w.tec).nombre:S.usuario));
      } else if(m.tipo==="subwoRef" || m.tipo==="subwoEvid"){
        const a=S.adicionales.find(x=>x.id===m.id); if(!a) return;
        const campo = m.tipo==="subwoRef" ? "fotosRefArr" : "fotosEvidArr";
        const etiqueta = m.tipo==="subwoRef" ? "referencia" : "evidencia";
        (a[campo]=a[campo]||[]).push(fotoNueva(url, S.usuario));
        (a.hist=a.hist||[]).push([hora(), `Foto de ${etiqueta} agregada`, S.usuario]);
        const w=W(a.wo);
        if(w) w.hist.push([hora(), `Foto de ${etiqueta} agregada a Sub-Work Order · ${a.concepto}`, S.usuario]);
      } else if(m.tipo==="subwoHallazgo"){
        /* Es una sola foto (no una galería) — si el técnico no pudo cargarla
           desde el celular, oficina la sube acá con el mismo dato final. */
        const a=S.adicionales.find(x=>x.id===m.id); if(!a) return;
        a.hallazgoFoto=fotoNueva(url, S.usuario);
        (a.hist=a.hist||[]).push([hora(), "Initial finding cargado desde oficina", S.usuario]);
        const w=W(a.wo);
        if(w) w.hist.push([hora(), `Initial finding agregado a Sub-Work Order · ${a.concepto} (desde oficina)`, S.usuario]);
      }
      modalFotos();
    });
  },
});
