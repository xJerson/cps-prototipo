"use strict";
Object.assign(ACC, {
   // cambiar servicio solo recalcula el precio, no rearma la lista
  repCambia: () => { S.repDim=val("repDim"); S.repMed=val("repMed"); render(); },
  repDiaCambia: () => { S.repDia=val("repDia"); render(); },
  /* Abrir un número del reporte: qué hay detrás y dónde está */
  repDetalle: d => {
    const D = DIMS[S.repDim||"semana"];
    const ws = S.wos.filter(w=>w.estado!=="Canceled" && D.f(w)===d.k && w.cat===d.c);
    const porZona = {};
    ws.forEach(w=>{ const z=P(w.prop).zona; (porZona[z]=porZona[z]||[]).push(w); });
    modal(`<div class="mh"><h3>${esc(d.c)} · ${esc(d.k)}</h3>
      <p>${ws.length} trabajo(s) en ${Object.keys(porZona).length} zona(s) — esto es lo que hay detrás del número</p></div>
    <div class="mb">
      ${Object.entries(porZona).sort((a,b)=>b[1].length-a[1].length).map(([z,arr])=>`
        <div style="margin-bottom:13px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <b>${esc(z)}</b><span class="pill a">${arr.length}</span>
            <span class="pill g">${[...new Set(arr.map(w=>w.prop))].length} propiedad(es)</span></div>
          <table style="border:1px solid var(--line);border-radius:8px;overflow:hidden">
            <thead><tr><th>WO</th><th>Propiedad · Unidad</th><th>Servicio</th><th>Fecha</th><th>Técnico</th></tr></thead>
            <tbody>${arr.map(w=>`<tr class="cl" data-a="woVer" data-id="${w.id}">
              <td class="mono" style="font-weight:700">WO-${w.id}</td>
              <td>${esc(P(w.prop).nombre)} · ${esc(U(w.unidad).num)}
                <div style="font-size:10.5px;color:var(--faint)">${esc(P(w.prop).dir)}</div></td>
              <td>${esc(w.serv)}</td><td class="mono">${w.fecha.slice(5)} ${esc(w.horaProg||"")}</td>
              <td>${w.tec?esc(tecN(w.tec)):'<span class="pill w">sin asignar</span>'}</td></tr>`).join("")}
            </tbody></table></div>`).join("")}
      <div class="tr">Claudia: «necesitamos saber pinturas, <b>pero en dónde están</b> para poder agendar».</div>
    </div>
    <div class="mf"><button class="btn" data-a="cm">Cerrar</button></div>`,true);
  },

  /* Lo que Claudia hace con un reporte de campo */
  repArchivar: d => { const r=by(S.reportes,d.id); r.estado="Archivado";
    r.accion = r.tipo==="previo" ? "Archivado en la unidad" : "Revisado y archivado";
    flash("rep:"+r.id);
    toast("Archivado",`Queda guardado en <b>${esc(P(r.prop).nombre)} · ${esc(U(r.unidad).num)}</b>, con su fecha y sus fotos.`,"v");
    render(); },
  repEstimado: d => { const r=by(S.reportes,d.id);
    r.estado="Procesado"; r.accion="Se generó un estimado con estas fotos";
    const csRep = contactosDe(r.prop);
    S.estHdr={prop:r.prop, contactos:csRep.length?[csRep[0].id]:[]};
    /* Aqui esta el pago del formulario 2: cada servicio que Gustavo escribio
       en campo baja como linea del estimado, con su tarifa ya resuelta.
       Nadie vuelve a teclear lo que ya se escribio parado en la unidad. */
    S.draftEst = [];
    let sinTarifa = 0;
    (r.items||[]).forEach(it=>{
      const u = U(r.unidad); if(!u) return;
      const sv = serviciosConTarifa(r.prop, it.cat, r.unidad)[0];
      const t  = sv ? tarifa(r.prop, it.cat, sv, u.rooms, u.pisos) : null;
      if(!t) sinTarifa++;
      S.draftEst.push({unidad:r.unidad, cat:it.cat, serv:sv||it.trabajo,
        precio:t?t.precio:null, pago:t?t.pago:null, nivel:t?t.nivel:null});
    });
    flash("rep:"+r.id);
    toast("Estimado en preparación",
      `Se abre con <b>${esc(P(r.prop).nombre)}</b> ya cargada y las ${fotosDe(r)} fotos adjuntas.`
      + ((r.items&&r.items.length)
        ? `<br><br>Los <b>${r.items.length} servicio(s)</b> que Gustavo escribió en campo bajaron como líneas del estimado.`
          + (sinTarifa?` <b>${sinTarifa}</b> sin tarifa: hay que definirla antes de enviar.`:"")
        : ""), "v");
    modalEst(); render(); },
  repWO: d => { const r=by(S.reportes,d.id);
    r.estado="Procesado"; r.accion="Se creó una Work Order desde este reporte";
    flash("rep:"+r.id);
    toast("Work Order en preparación",`Se abre con <b>${esc(P(r.prop).nombre)} · ${esc(U(r.unidad).num)}</b> ya puestas.`,"v");
    modalWO(); setTimeout(()=>{ const e=document.getElementById("wProp"); if(e){ e.value=r.prop; refWO();
      const u=document.getElementById("wUni"); if(u){ u.value=r.unidad; refTarifa(); } } },0);
    render(); },
  repMaterial: d => { const r=by(S.reportes,d.id);
    r.estado="Procesado"; r.accion="Pasó a compra de material";
    flash("rep:"+r.id);
    toast("Anotado para compra",`<b>${esc(r.material||"Material")}</b> para ${esc(P(r.prop).nombre)}. Queda en Inventario.`,"v");
    render(); },});

/* Buscar: filtros guardados en S.busq (sobreviven a los render y a abrir una WO y volver). */
Object.assign(ACC, {
  busqCambia: () => {
    const b=busq(), prop=val("bqProp");
    Object.assign(b,{desde:val("bqDesde"),hasta:val("bqHasta"),q:val("bqQ"),serv:val("bqServ"),tec:val("bqTec"),estado:val("bqEst"),agr:val("bqAgr")});
    b.unidad = prop!==b.prop ? "" : val("bqUni");   // otra propiedad = otras unidades
    b.prop = prop;
    render();
  },
  /* Semana = domingo a sábado, igual que semanaDe(); «hoy» es la fecha del prototipo. */
  busqRango: d => {
    const b=busq(), hoy=HOY_SUP, dow=new Date(hoy+"T12:00:00").getDay();
    if(d.r==="todo"){ b.desde=""; b.hasta=""; }
    else if(d.r==="mes"){
      const [y,m]=hoy.split("-").map(Number), mm=String(m).padStart(2,"0");
      b.desde=`${y}-${mm}-01`; b.hasta=`${y}-${mm}-${String(new Date(y,m,0).getDate()).padStart(2,"0")}`;
    } else {
      const ini=fechaMover(hoy,-dow-(d.r==="pasada"?7:0));
      b.desde=ini; b.hasta=fechaMover(ini,6);
    }
    render();
  },
  buscarCSV: () => {
    const q=v=>`"${String(v==null?"":v).replace(/"/g,'""')}"`;   // texto siempre entre comillas
    const n=v=>v===null||v===undefined?"":Math.round(v*100)/100;
    const rows=busqWOs(busq()).map(busqFila);
    const csv=["WO,Date,Property,Unit,Service,Technician,Billed,Paid,Material,Profit",
      ...rows.map(f=>[f.w.id,f.w.fecha||"",q(P(f.w.prop).nombre),q(U(f.w.unidad).num),q(f.w.serv),q(f.w.tec?tecN(f.w.tec):""),n(f.cobro),n(f.pago),n(f.mat),n(f.uti)].join(","))].join("\n");
    const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download="cps-search.csv"; a.click(); URL.revokeObjectURL(a.href);
    toast("✓ Archivo preparado",`${rows.length} Work Order(s) exportadas.`,"v");
  }
});
