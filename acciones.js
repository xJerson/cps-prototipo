"use strict";
const ACC = {
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

  woVer: d => { S.mod="wo"; S.sub=+d.id; render(); },
  woVerDesdeModal: d => { cm(); S.mod="wo"; S.sub=+d.id; render(); },
  woNueva: () => modalWO(),
  woCat: () => refWO(),
  /* Reunión Claudia (feedback prototipo): Propiedad y Unidad se ESCRIBEN,
     con sugerencias en vivo — no se eligen de una lista precargada. */
  woPropBuscar: () => {
    document.getElementById("wProp").value = "";
    document.getElementById("wUni").value = "";
    const q = val("wPropTxt").toLowerCase();
    const sug = document.getElementById("wPropSug");
    if(!q){ sug.innerHTML=""; refWO(); return; }
    const ms = S.propiedades.filter(p=>p.activa && p.nombre.toLowerCase().includes(q)).slice(0,6);
    sug.innerHTML = ms.length
      ? ms.map(p=>`<div class="sugrow" data-a="woPropElegir" data-id="${p.id}"><b>${esc(p.nombre)}</b><span class="sugsub">${esc(p.zona)}</span></div>`).join("")
      : `<div class="sugrow sugvacio">Sin propiedades que coincidan</div>`;
    refWO();
  },
  woPropElegir: d => {
    const p = by(S.propiedades, d.id);
    document.getElementById("wPropTxt").value = p.nombre;
    document.getElementById("wProp").value = p.id;
    document.getElementById("wPropSug").innerHTML = "";
    document.getElementById("wUniTxt").value = "";
    document.getElementById("wUni").value = "";
    document.getElementById("wUniSug").innerHTML = "";
    refWO();
  },
  woUniBuscar: () => {
    const pid = val("wProp");
    if(!pid) return;
    document.getElementById("wUni").value = "";
    const q = val("wUniTxt"), qn = uNorm(q);
    const us = S.unidades.filter(u=>u.prop===pid);
    const ms = qn ? us.filter(u=>uNorm(u.num).includes(qn)) : us;
    const filas = ms.slice(0,6).map(u=>`<div class="sugrow" data-a="woUniElegir" data-id="${u.id}"><b>${esc(u.num)}</b><span class="sugsub">${esc(u.rooms)}</span></div>`).join("");
    const nueva = `<div class="sugrow sugnueva" data-a="woUniElegirNueva">+ Crear unidad nueva${q?` «${esc(q)}»`:""}</div>`;
    document.getElementById("wUniSug").innerHTML = (ms.length?filas:`<div class="sugrow sugvacio">Sin unidades que coincidan</div>`) + nueva;
    refWO();
  },
  woUniElegir: d => {
    const u = by(S.unidades, d.id);
    document.getElementById("wUniTxt").value = u.num;
    document.getElementById("wUni").value = u.id;
    document.getElementById("wUniSug").innerHTML = "";
    refWO();
  },
  woUniElegirNueva: () => {
    const q = val("wUniTxt");
    document.getElementById("wUni").value = "__new__";
    document.getElementById("wUniSug").innerHTML = "";
    refWO();
    const n=document.getElementById("wUniNum"); if(n) n.value = q;
  },
  // Cambiar el Tipo muestra u oculta Bedrooms/Bathrooms, así que rearma
  // el bloque entero (refWO ya preserva lo tecleado); lo demás solo
  // recalcula el precio de vista previa, adentro de refWO.
  woUniCampo: () => refWO(),
  woServ: () => refTarifa(),   // cambiar servicio solo recalcula el precio, no rearma la lista
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

  woEditar: d => { const w=W(+d.id);
    if(!woEditable(w)){
      toast("🚫 Ya no se puede corregir","Esta orden ya se facturó o ya se pagó. Cambiarla descuadraría lo cobrado. Levanta una <b>excepción</b> para que quede quién autorizó el ajuste.","r"); return; }
    modalWO(w); },
  woGuardar: d => {
    const pid=val("wProp"), cat=val("wCat"), serv=val("wServ"), ubic=val("wUbic"), fecha=val("wFecha");
    const horaProg=val("wHora"), cantN=parseFloat(val("wCant"));
    let uid=val("wUni");
    const esNueva = uid==="__new__";
    const faltan=[];
    if(!pid) faltan.push("propiedad");
    const tipoNueva = val("wUniTipo")||"Residencial";
    if(esNueva){
      if(!val("wUniNum")) faltan.push("número de unidad");
      if(tipoNueva==="Residencial" && !SIN_BEDROOMS.includes(cat) && val("wUniBedrooms")==="") faltan.push("bedrooms de la unidad");
    } else if(!uid) faltan.push("unidad");
    const u = esNueva ? null : by(S.unidades,uid);
    if(!esNueva && u && !u.rooms) faltan.push("número de cuartos de la unidad");
    if(!cat) faltan.push("tipo de servicio");
    if(!serv) faltan.push("servicio");
    if(!fecha) faltan.push("fecha");
    if(!horaProg) faltan.push("hora");
    if(!(cantN>0)) faltan.push("cantidad");
    if(EXIGE_UBIC.includes(cat) && !ubic) faltan.push("ubicación dentro de la unidad");
    if(faltan.length){
      marcaFalta(["wProp","wUni","wCat","wServ","wFecha","wHora","wCant"].concat(esNueva?["wUniNum","wUniBedrooms"]:[]).concat(EXIGE_UBIC.includes(cat)?["wUbic"]:[]));
      toast("🚫 No se puede guardar", `Falta: <b>${faltan.join(", ")}</b>.${EXIGE_UBIC.includes(cat)&&!ubic?" Una reparación sin ubicación hace que el técnico la busque por toda la unidad.":""}`,"r");
      return;
    }
    /* "+ Nueva unidad…" no manda a otra pantalla a crearla antes — se
       registra en S.unidades en este mismo guardado (reunión 2026-09-09:
       la Unidad no es un bloqueo, se va llenando sola con el uso). */
    let uNueva = u;
    if(esNueva){
      const bld=val("wUniBld"), uNumR=val("wUniNum");
      // Reunión Claudia: para Repair/Resurface/etc. no se pidió Bedrooms —
      // la unidad queda "sin definir" en eso hasta que alguien la complete
      // desde una WO que sí lo necesite (Clean, Paint...).
      const sinBed = SIN_BEDROOMS.includes(cat);
      const bedrooms=(tipoNueva==="Residencial"&&!sinBed)?parseInt(val("wUniBedrooms"))||0:null,
            estudio=sinBed?false:chk("wUniEstudio"), livingRoom=sinBed?false:chk("wUniLivingRoom");
      uNueva = {id:"U"+nid("u"), prop:pid, building:bld, unidadNum:uNumR, num:uNumComp(bld,uNumR),
        tipo:tipoNueva, bedrooms, estudio, livingRoom, bathrooms:parseInt(val("wUniBathrooms"))||null,
        rooms:sinBed?null:roomsDesde(tipoNueva,bedrooms,estudio,livingRoom), pisos:parseInt(val("wUniPisos"))||1, detalle:[]};
      S.unidades.push(uNueva); flash("uni:"+uNueva.id);
      uid = uNueva.id;
    }
    const yo = d&&d.id ? W(+d.id) : null;
    if(yo){
      if(!woEditable(yo)){ toast("🚫 Ya no se puede corregir","Se facturó o se pagó mientras tenías el formulario abierto.","r"); return; }
      return guardarEdicion(yo,
        {prop:pid, unidad:uid, cat, serv, ubic, fecha, semana:semanaDe(fecha),
         horaProg, cant:cantN,
         po:val("wPO"), notasTec:val("wNotas")},
        "Work Orders", "WO-"+yo.id,
        (o,cambios)=>{
          flash("wo:"+o.id);
          o.hist.push([hora(), "Datos corregidos: "+cambios.map(c=>c.campo).join(", "), S.usuario]);
          // Si ya hay técnico, el cambio le llega: si no, se entera al llegar
          if(o.tec) noti("Tu trabajo cambió",
            `WO-${o.id}: ${cambios.map(c=>`${c.campo} ahora es ${c.a}`).join(". ")}. Revísalo antes de salir.`, false);
        });
    }
    const id = nid("w");
    flash("wo:"+id);
    const nueva = {id, prop:pid, unidad:uid, cat, serv, ubic, tec:null, estado:"Scheduled", horaProg, cant:cantN,
      semana:semanaDe(fecha), fecha, po:val("wPO"), asistencia:false, evid:0, mats:[],
      notas:"", notasTec:val("wNotas"), hist:[[hora(),"Creada",S.usuario]]};
    S.wos.push(nueva);
    /* Si esta WO nace de "Programar" en una Solicitud, recién AHORA que de
       verdad se guardó algo se marca la solicitud "Programada" y se liga
       una con la otra — no al abrir el modal (ver solProgramar). */
    if(S.progSolId){
      const s = by(S.solicitudes, S.progSolId);
      if(s){ s.estado="Programada"; nueva.origen={tipo:"Solicitud", id:s.id}; }
      S.progSolId = null;
    }
    cm();
    const t = tarifa(pid,cat,serv,uNueva.rooms,uNueva.pisos);
    toast("✓ Work Order creada", `<b>WO-${id}</b> · ${esc(P(pid).nombre)} ${esc(uNueva.num)}. ${t?"Ingreso "+money(t.precio)+" ya calculado.":"Sin tarifa: quedará como NA."}${esNueva?" Unidad "+esc(uNueva.num)+" agregada al catálogo.":""}`,"v");
    S.mod="wo"; S.sub=id; render();
  },

  /* ── COORDINAR LA FECHA CON EL CLIENTE ──────────────────────── */
  progCliente: d => { S.progF = null; modalProg(+d.id); },
  /* Cambiar la fecha sin salir del modal: antes habia que ir a corregir la
     Work Order y volver a entrar. */
  asigFecha: d => {
    const w = W(+d.id), f = val("asF");
    if(!f || f===w.fecha) return;
    const antes = w.fecha;
    w.fecha = f;
    w.semana = S.semana;
    w.hist.push([hora(), `Fecha movida del ${antes} al ${f}`, S.usuario]);
    if(w.confirmCliente && w.confirmCliente.fecha!==f){
      w.confirmCliente = null;
      if(w.estado==="Confirmed") w.estado = "Scheduled";
    }
    modalAsig(w.id);
    toast("Fecha cambiada",
      `Del ${antes} al ${f}. La disponibilidad se recalculó.`
      + (antes && !w.confirmCliente?` <b>Vuelve a confirmarla con el cliente.</b>`:""), "w");
  },

  /* Al cambiar la fecha hay que recalcular quien esta libre. Se rescata lo ya
     elegido para no borrarselo. */
  progFecha: d => {
    const v = id => { const e=document.getElementById(id); return e? e.value : null; };
    S.progF = v("pgF");
    S.progTmp = {m:v("pgM"), c:v("pgC"), r:v("pgR"), n:v("pgN"), mo:v("pgMotivo")};
    const wid = +document.querySelector('[data-a="progOK"]').dataset.id;
    modalProg(wid);
    /* devolver lo que ya habia puesto */
    const t = S.progTmp || {};
    ["pgM","pgC","pgR","pgN","pgMotivo"].forEach((k,i)=>{
      const e = document.getElementById(k), val = [t.m,t.c,t.r,t.n,t.mo][i];
      if(e && val!=null) e.value = val;
    });
  },

  /* "Programar con el cliente" y "Reagendar" eran dos botones distintos que
     hacían casi lo mismo (mover w.fecha, avisar, confirmar) pero por caminos
     separados: uno guardaba el historial de propuestas y no revisaba cupo del
     técnico, el otro revisaba cupo pero no dejaba rastro en "Fechas
     anteriores" — para quien lo usaba parecían dos herramientas distintas sin
     relación. Ahora es un solo modal (modalProg) y un solo handler: el motivo
     "¿Qué pasó?" es opcional y solo aparece cuando ya hay técnico asignado. */
  progOK: d => {
    const w = W(+d.id);
    const f = val("pgF"), medio = val("pgM"), contacto = val("pgC"), nota = val("pgN");
    const motivo = document.getElementById("pgMotivo") ? val("pgMotivo") : "";
    const pendiente = chk("pgP");
    const resp = pendiente ? "Quedó en confirmar después" : "Fecha acordada";
    if(!f){ marcaFalta(["pgF"]); toast("Falta la fecha","Pon la fecha que quedaron.","r"); return; }

    /* Si ya hay técnico asignado, mover la fecha le puede quitar el cupo a
       otro día lleno — antes esto solo se revisaba en "Reagendar". */
    if(!pendiente && w.tec){
      const libres = S.tecnicos.filter(t=>t.activo&&!t.esp.includes("Supervisor")&&!bloqueo(t.id,f));
      const cupo = libres.length*CAP - S.wos.filter(x=>x.fecha===f&&x.tec&&x.id!==w.id).length;
      if(cupo<=0){ toast("🚫 Ese día no tiene cupo",`El ${f} ya está lleno. Claudia: «se debería pasar al otro día».`,"r"); return; }
    }

    w.propuestas = (w.propuestas||[]).concat([{fecha:f, medio, contacto, respuesta:resp,
      nota:nota||"", motivo:motivo||"", quien:S.usuario, hora:hora(), dia:HOY_SUP}]);
    w.hist.push([hora(), motivo
      ? `Reagendada de ${w.fecha} a ${f} · ${motivo} · confirmado con ${contacto} por ${medio.toLowerCase()}`
      : `${resp} — ${f} (${medio}, ${contacto})`, S.usuario]);

    if(!pendiente){
      const cambio = w.fecha !== f;
      const antes = w.fecha;
      w.fechaSolicitada = w.fechaSolicitada || antes;
      w.fecha = f;
      w.confirmCliente = {fecha:f, medio, contacto, quien:S.usuario, hora:hora(), dia:HOY_SUP};
      if(w.estado==="Scheduled") w.estado = "Confirmed";
      if(motivo){ w.reagendada = (w.reagendada||0)+1; w.motivoReag = motivo; }
      S.progF = null; S.progTmp = null;
      flash("wo:"+w.id);
      cm();
      if(motivo){
        toast("✓ Reagendada",`WO-${w.id} pasó al ${f}. Se liberó el cupo del ${antes}. <b>${esc(contacto)}</b> confirmó por ${esc(medio.toLowerCase())}, y se le avisó a <b>${esc(tecN(w.tec))}</b>.`,"v");
      } else {
        toast("✓ Fecha confirmada con el cliente",
          `<b>${esc(contacto)}</b> confirmó el <b>${f}</b> por ${esc(medio.toLowerCase())}.`
          + (cambio?`<br><br>Se movió del ${antes} al ${f}.`:"")
          + (w.tec?"":`<br><br>La orden queda en <b>Confirmed</b> y ya se le puede asignar técnico.`), "v");
      }
      /* Si ya tenia tecnico y la fecha se movio, hay que avisarle: hoy se
         enteraria abriendo la app, o no se entera. */
      if(cambio && w.tec){
        w.nueva = true;
        noti(motivo?"Trabajo reagendado":"Te movieron una fecha",
          motivo
            ? `${P(w.prop).nombre} · ${U(w.unidad).num} se movió al ${f} ${w.horaProg}. Motivo: ${motivo.toLowerCase()}.`
            : `${P(w.prop).nombre} ${U(w.unidad)?U(w.unidad).num:""} — ahora es el ${f}, no el ${antes}.`);
        if(!motivo) avisar("Thalia","Se movió una fecha con técnico asignado",
          `WO-${w.id} pasó del ${antes} al ${f}. Se le avisó a ${esc(tecN(w.tec))}.`,"w");
      }
      render(); return;
    }

    /* Quedó en confirmar después: se anota la fecha tentativa, pero la orden
       no pasa a Confirmed y se ve así al momento de asignar. */
    S.progF = null; S.progTmp = null;
    cm();
    toast("Anotado — falta que confirme",
      `Quedó tentativo el <b>${f}</b> con <b>${esc(contacto)}</b>. La orden sigue <b>sin confirmar</b>.`,"w");
    render();
  },

  calSem: d => { S.semCal = +d.s; render(); },

  /* ── Selector de período (Nómina / Facturación) ── */
  perTipo:  () => { S.periodo.tipo = document.querySelector('[data-a="perTipo"]').value; render(); },
  perNav:   d => { S.periodo.sem = +d.s; render(); },
  perDia:   () => { S.periodo.dia = document.querySelector('[data-a="perDia"]').value; render(); },
  perDesde: () => { S.periodo.desde = document.querySelector('[data-a="perDesde"]').value; render(); },
  perHasta: () => { S.periodo.hasta = document.querySelector('[data-a="perHasta"]').value; render(); },
  perMes:   () => { S.periodo.mes = +document.querySelector('[data-a="perMes"]').value; render(); },
  perAnio:  () => { S.periodo.anio = +document.querySelector('[data-a="perAnio"]').value; render(); },

  asigModal: d => modalAsig(+d.id),
  asigNo: d => {
    const w=W(+d.id), t=T(d.tec), b=bloqueo(d.tec,w.fecha);
    toast("🚫 No se puede asignar", b
      ? `<b>${esc(tecN(d.tec))}</b> tiene ${esc(b.motivo.toLowerCase())} del ${b.desde} al ${b.hasta}.`
      : `<b>${esc(tecN(d.tec))}</b> ya tiene ${CAP} propiedades ese día. Claudia: «se debería pasar al otro día».`,"r");
  },
  asigSi: d => {
    const w=W(+d.id);
    // En su Excel, Assigned y Completion Status son columnas distintas:
    // asignar NO cambia el estado, solo llena el técnico.
    w.tec=d.tec; w.nueva=true;
    w.hist.push([hora(),"Asignada a "+tecN(d.tec),S.usuario]);
    cm();
    toast("✓ Asignada",`WO-${w.id} → <b>${esc(tecN(d.tec))}</b>. Le salió el aviso a su app. La orden sigue en <b>${w.estado}</b>: asignar no cambia el estado.`,"v");
    noti("Nueva Work Order",`${P(w.prop).nombre} · ${U(w.unidad).num} — ${w.serv} · ${w.fecha} ${w.horaProg||"9:00"}`);
    flash("wo:"+w.id);
    S.phTec=d.tec; S.phView="agenda"; render();
  },

  supervisar: d => {
    const w=W(+d.id);
    if(!w.evid){ toast("🚫 No se puede aprobar","Esta Work Order no tiene ninguna evidencia cargada. Claudia: «no me consta lo que me estás diciendo».","r"); return; }
    w.supervisada=true; w.hist.push([hora(),"Supervisión aprobada",S.usuario]); flash("wo:"+w.id);
    toast("✓ Supervisada",`WO-${w.id} aprobada por ${S.usuario}. Queda lista para facturar.`,"v"); render();
  },

  permisoModal: () => modalPermiso(),
  permisoGuardar: () => {
    if(marcaFalta(["pT","pD","pH","pM"])){ toast("Faltan datos","Completa técnico, fechas y motivo.","r"); return; }
    const nd={id:"D"+Date.now(),tec:val("pT"),desde:val("pD"),hasta:val("pH"),motivo:val("pM"),estado:"Pendiente"};
    S.disponibilidad.push(nd); flash("dis:"+nd.id);
    cm(); toast("Permiso registrado","Queda pendiente de que Gustavo lo apruebe.","v"); render();
  },
  apruebaPermiso: d => {
    const p = by(S.disponibilidad,d.id); p.estado="Aprobado"; flash("dis:"+p.id);
    toast("✓ Permiso aprobado",`${esc(tecN(p.tec))} sale de las sugerencias de asignación del ${p.desde} al ${p.hasta}.`,"v");
    render();
  },

  propVer: d => { S.mod="propiedades"; S.sub=d.id; S.tab="datos"; render(); },
  propNueva: d => { const p = d&&d.id ? P(d.id) : null;
    const op = (a,v) => a.map(x=>`<option ${x===v?"selected":""}>${esc(x)}</option>`).join("");
    modal(`<div class="mh"><h3>${p?"Corregir "+esc(p.nombre):"Nueva propiedad"}</h3>
      <p>${p?"Cada campo que cambies queda en la Bitácora con el valor anterior.":"Lo que Lydia registra al conseguir la cuenta. Claudia después le carga el seguro y la lista de precios."}</p></div>
    <div class="mb">
      <div class="fld"><label>Property Name <span class="req">*</span></label><input id="nP" value="${p?esc(p.nombre):""}"></div>
      <div class="fld"><label>Property Address <span class="req">*</span></label><input id="nD" value="${p?esc(p.dir):""}"></div>
      <div class="fg c3">
        <div class="fld"><label>City</label><input id="nCiudad" value="${p?esc(p.ciudad):""}"></div>
        <div class="fld"><label>State</label><input id="nEstadoUS" value="${p?esc(p.estadoUS):""}"></div>
        <div class="fld"><label>ZIP Code</label><input id="nZip" class="mono" value="${p?esc(p.zip):""}"></div></div>
      <div class="fg c2">
        <div class="fld"><label>Client Status</label><select id="nEst">${op(["Prospect","Onboarding","Active","On Hold","Inactive"], p?p.estado:"Prospect")}</select></div>
        <div class="fld"><label>Client Source</label><select id="nOrig">${op(["Llamada","Formulario web","Referido","Visita comercial","Correo"], p?p.origen:"")}</select></div></div>
      <div class="fld"><label>Property Phone Number</label><input id="nTel" class="mono" value="${p?esc(p.tel):""}"></div>
      <div class="fg c2">
        <div class="fld"><label>Accounts Payable Email 1 <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— opcional</span></label><input id="nAP1" value="${p?esc(p.mailAP1):""}"></div>
        <div class="fld"><label>Accounts Payable Email 2 <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— opcional</span></label><input id="nAP2" value="${p?esc(p.mailAP2):""}"></div></div>
      <div class="hint" style="margin:-6px 0 10px">A dónde se manda la factura de esta propiedad, si es distinto del contacto que coordina el trabajo.</div>
      <div class="fld"><label>Special Property Requirements</label><input id="nNT" value="${p?esc(p.notas):""}" placeholder="lo que siempre se olvida y genera reclamos"></div>
      <div class="fld"><label>Zona (Area) — interno de Cordova <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— si todavía no se sabe, se deja sin asignar</span></label>
        <select id="nZ"><option value="">— sin asignar —</option>${op(zonasN(), p?p.zona:"")}</select></div>
      <div class="fg c3">
        <div class="fld"><label>Door code</label><input id="nDC" class="mono" value="${p?esc(p.door):""}"></div>
        <div class="fld"><label>Default Contact Method</label><input id="nPR" placeholder="Email, Text…" value="${p?esc(p.pref):""}"></div></div>
      <div class="fld"><label>Approval Method <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— optional</span></label>
        <input id="nAP" value="${p?esc(p.aprob):""}" placeholder="e.g., text Danielle, not email">
        <div class="hint">Just a note for whoever needs to request authorization. It doesn\u2019t require anything: whoever approves picks the channel actually used. Erika: \u00absometimes approvals come by call, by text, in different ways\u00bb.</div></div>

      <div style="border:1px solid var(--line);border-radius:9px;padding:11px;margin:4px 0 12px;background:var(--surface-2)">
        <div style="font-size:11px;font-weight:750;text-transform:uppercase;letter-spacing:.05em;color:var(--faint);margin-bottom:8px">Información para el técnico</div>
        <div class="hint" style="margin:0 0 9px">Esto es lo que el técnico ve en su celular al abrir una Work Order de esta propiedad — se carga una vez aquí, no hay que repetírselo cada vez.</div>
        <div class="fg c2">
          <div class="fld"><label>Dónde está el shop <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— opcional</span></label><input id="nShop" value="${p?esc(p.shop):""}" placeholder="Edificio de mantenimiento, detrás de la alberca"></div>
          <div class="fld"><label>Código del shop <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— opcional</span></label><input id="nShopCode" class="mono" value="${p?esc(p.shopCode):""}"></div></div>
        <div class="fld"><label>Horario <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— opcional</span></label><input id="nHorario" value="${p?esc(p.horario):""}" placeholder="Oficina abre 8:00 · unidades disponibles desde 8:30"></div>
        <div class="fld"><label>Información de pintura <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— parte del Expediente, sin esto no se puede transferir a programación</span></label><input id="nPaint" value="${p?esc(p.notasPaint):""}" placeholder="Sherwin ProMar 200, eggshell. Techos blanco plano."></div>
        <div class="fld"><label>Al terminar <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— opcional</span></label><input id="nFinalExp" value="${p?esc(p.finalExp):""}" placeholder="Ventanas por dentro y por fuera. Filtros de A/C cambiados."></div>
        <div class="fld" style="margin-bottom:0"><label>Ojo <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— opcional, advertencias</span></label><input id="nOjo" value="${p?esc(p.notasTec):""}" placeholder="Estacionarse en visitas, no en la entrada principal"></div>
      </div>
      ${p?"":`<div class="note">Las unidades no hace falta cargarlas aquí: se van registrando solas cuando crees Work Orders o Estimados de esta propiedad.</div>`}
    </div>
    <div class="mf"><button class="btn" data-a="propCancelar">Cancelar</button>
      <button class="btn p" data-a="propGuardar" data-id="${p?p.id:""}">${p?"Guardar corrección":"Guardar"}</button></div>`,true);
    // Cuando se entra desde una fila del expediente, el cursor cae en ese campo
    if(d&&d.f && CAMPO_INPUT[d.f]){
      const e=document.getElementById(CAMPO_INPUT[d.f]);
      if(e){ e.focus(); e.parentElement.classList.add("bad"); }
    } },
  propGuardar: d => {
    if(marcaFalta(["nP","nD"])){ toast("Faltan datos","Nombre y dirección son obligatorios.","r"); return; }
    const yo = d&&d.id ? P(d.id) : null;
    if(yo) return guardarEdicion(yo, {nombre:val("nP"),zona:val("nZ"),cliente:val("nC"),dir:val("nD"),
      ciudad:val("nCiudad"),estadoUS:val("nEstadoUS"),zip:val("nZip"),tel:val("nTel"),
      estado:val("nEst"),origen:val("nOrig"),
      door:val("nDC"),pref:val("nPR"),aprob:val("nAP"),
      mailAP1:val("nAP1"),mailAP2:val("nAP2"),
      notas:val("nNT"),
      shop:val("nShop"),shopCode:val("nShopCode"),horario:val("nHorario"),notasPaint:val("nPaint"),
      finalExp:val("nFinalExp"),notasTec:val("nOjo")}, "Propiedades", yo.nombre, null, "prop:"+yo.id);
    const id="P"+nid("p");
    flash("prop:"+id);
    S.propiedades.push({id,nombre:val("nP"),zona:val("nZ"),cliente:val("nC"),dir:val("nD"),
      ciudad:val("nCiudad"),estadoUS:val("nEstadoUS"),zip:val("nZip"),tel:val("nTel"),notas:val("nNT"),
      estado:val("nEst"),origen:val("nOrig"),
      activa:true,door:val("nDC"),aprob:val("nAP"),pref:val("nPR"),
      mailAP1:val("nAP1"),mailAP2:val("nAP2"),polizas:[],
      shop:val("nShop"),shopCode:val("nShopCode"),horario:val("nHorario"),notasPaint:val("nPaint"),
      finalExp:val("nFinalExp"),notasTec:val("nOjo")});
    const np = P(id);
    /* Antes, "propiedad nueva" en Solicitud Comercial y Visita Comercial era
       solo un nombre escrito a mano — nunca una Propiedad real, y siempre
       terminaba bloqueada más adelante ("Falta registrar la propiedad")
       porque nada la había creado de verdad. Si se llegó aquí desde una de
       esas dos, se crea la Propiedad real y se vuelve con su id ya puesto,
       sin perder lo que ya se llevaba escrito. */
    if(S.visitaDraft){
      const dr = S.visitaDraft; S.visitaDraft = null; dr.prop = id;
      volverAVisitaDraft(dr);
      toast("✓ Propiedad creada",`<b>${esc(np.nombre)}</b> ya está en la visita.`,"v");
      return;
    }
    if(S.solComDraft){
      const dr = S.solComDraft; S.solComDraft = null; dr.prop = id;
      volverASolComDraft(dr);
      toast("✓ Propiedad creada",`<b>${esc(np.nombre)}</b> ya está en la solicitud.`,"v");
      return;
    }
    cm(); toast("✓ Propiedad creada",`<b>${esc(np.nombre)}</b>. Ojo: sin COI registrado, ya te quedó una alerta.`,"v");
    S.mod="propiedades"; S.sub=id; S.tab="unidades"; render();
  },
  propCancelar: () => {
    // Cancelar la Propiedad tampoco debe perder lo que ya se llevaba
    // escrito en la Solicitud o la Visita desde donde se abrió.
    if(S.visitaDraft){ const dr=S.visitaDraft; S.visitaDraft=null; volverAVisitaDraft(dr); return; }
    if(S.solComDraft){ const dr=S.solComDraft; S.solComDraft=null; volverASolComDraft(dr); return; }
    cm();
  },
  /* Reunión Claudia (feedback prototipo): antes acá faltaba directamente el
     campo que arma el precio (rooms quedaba vacío en silencio). Ahora se
     compone solo desde Tipo + Bedrooms + "tiene estudio aparte" — el mismo
     texto exacto que sigue usando tarifa(), cero cambios ahí. El "Detail"
     de abajo queda para lo que no entra en eso (closets, garages, etc). */
  uniNueva: d => { const u = d&&d.id ? by(S.unidades,d.id) : null;
    const pid = u ? u.prop : d.prop;
    const op = (a,v) => a.map(x=>`<option ${String(x)===String(v)?"selected":""}>${esc(String(x))}</option>`).join("");
    if(!d||!d.keep){ S.uniDetalle = u ? (u.detalle||[]).map(x=>({...x})) : []; S.uniDraft = null; }
    const dr = S.uniDraft;
    const v = campo => dr&&dr[campo]!==undefined ? dr[campo] : (u?u[campo]:undefined);
    const tipoU = val("uTipo")||v("tipo")||"Residencial";
    modal(`<div class="mh"><h3>${u?"Corregir unidad "+esc(u.num):"Nueva unidad"}</h3><p>${esc(P(pid).nombre)}</p></div>
    <div class="mb">
      <div class="note" style="margin-bottom:12px"><b>Location:</b> ${P(pid).zona?esc(P(pid).zona):'<span style="color:var(--faint)">sin definir en la propiedad</span>'}
        <span style="font-size:10.5px;color:var(--faint)"> — viene de la propiedad, no se repite acá</span></div>
      <div class="fg c3">
        <div class="fld" style="margin-bottom:0"><label>Building <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— si aplica</span></label>
          <input id="uBld" placeholder="A, B…" value="${dr?esc(dr.building||""):(u?esc(u.building||""):"")}"></div>
        <div class="fld" style="margin-bottom:0;grid-column:span 2"><label>Unidad <span class="req">*</span></label>
          <input id="uN" placeholder="204, 27, 8…" value="${dr?esc(dr.unidadNum||dr.num||""):(u?esc(u.unidadNum||u.num||""):"")}"></div>
      </div>
      <div class="fg c3" style="margin-top:11px">
        <div class="fld" style="margin-bottom:0"><label>Floor</label><select id="uP">${op(activos("pisos"), dr?dr.pisos:(u?u.pisos:""))}</select></div>
        <div class="fld" style="margin-bottom:0"><label>Tipo <span class="req">*</span></label>
          <select id="uTipo" data-a="uniCampoTipo" data-prop="${pid}" data-id="${u?u.id:""}">
            <option ${tipoU==="Residencial"?"selected":""}>Residencial</option>
            <option ${tipoU==="Oficina"?"selected":""}>Oficina</option></select></div>
        <div class="fld" style="margin-bottom:0"><label>Unit Occupancy</label>
          <select id="uOcup">
            <option ${(dr?dr.ocupacion:(u?u.ocupacion:""))!=="Vacant"?"selected":""}>Occupied</option>
            <option ${(dr?dr.ocupacion:(u?u.ocupacion:""))==="Vacant"?"selected":""}>Vacant</option></select></div>
      </div>
      ${tipoU==="Residencial"?`<div class="fg c4">
        <div class="fld" style="margin-bottom:0"><label>Bedrooms <span class="req">*</span></label>
          <input id="uBedrooms" type="number" min="0" class="mono" placeholder="0 = Studio" value="${dr&&dr.bedrooms!=null?dr.bedrooms:(u&&u.bedrooms!=null?u.bedrooms:"")}"></div>
        <div class="fld" style="margin-bottom:0"><label>Bathrooms <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— informativo</span></label>
          <input id="uBathrooms" type="number" min="0" class="mono" placeholder="opcional" value="${dr&&dr.bathrooms!=null?dr.bathrooms:(u&&u.bathrooms!=null?u.bathrooms:"")}"></div>
        <div class="fld" style="margin-bottom:0;display:flex;align-items:flex-end;padding-bottom:9px">
          <label style="display:flex;align-items:center;gap:6px;font-weight:500;text-transform:none;font-size:12px">
            <input type="checkbox" id="uEstudio" ${(dr?dr.estudio:(u?u.estudio:false))?"checked":""} style="width:auto"> + estudio aparte</label></div>
        <div class="fld" style="margin-bottom:0;display:flex;align-items:flex-end;padding-bottom:9px">
          <label style="display:flex;align-items:center;gap:6px;font-weight:500;text-transform:none;font-size:12px">
            <input type="checkbox" id="uLivingRoom" ${(dr?dr.livingRoom:(u?u.livingRoom:false))?"checked":""} style="width:auto"> + living room aparte</label></div>
      </div>`:""}
      <div class="fld"><label>Detail <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— opcional, solo informativo (closets, garage, etc.)</span></label>
        ${S.uniDetalle.length?`<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">${S.uniDetalle.map((x,i)=>
          `<span class="pill a">${x.cantidad} ${esc(x.tipo)} <a href="#" data-a="uniDetQuitar" data-i="${i}" data-prop="${pid}" data-id="${u?u.id:""}" style="margin-left:5px;color:inherit">✕</a></span>`).join("")}</div>`:""}
        <div class="fg c3">
          <div class="fld" style="margin-bottom:0"><select id="uDetTipo">${["Bedroom","Bathroom","Living Room","Studio","Office"].map(t=>`<option>${t}</option>`).join("")}</select></div>
          <div class="fld" style="margin-bottom:0"><input id="uDetCant" type="number" class="mono" min="1" value="1"></div>
          <button type="button" class="btn sm" data-a="uniDetAgregar" data-prop="${pid}" data-id="${u?u.id:""}">+ Agregar</button>
        </div></div>
      ${u&&S.wos.some(w=>w.unidad===u.id)?`<div class="note w">Esta unidad ya tiene ${S.wos.filter(w=>w.unidad===u.id).length} Work Order(s). Cambiar Bedrooms/Tipo puede cambiar la tarifa que les aplica.</div>`:""}
    </div>
    <div class="mf"><button class="btn" data-a="uniCancelar">Cancelar</button>
      <button class="btn p" data-a="uniGuardar" data-prop="${pid}" data-id="${u?u.id:""}">${u?"Guardar corrección":"Guardar"}</button></div>`,true); },
  uniCancelar: () => { S.uniDetalle=[]; S.uniDraft=null; cm(); },
  // Cambiar Tipo muestra/oculta Bedrooms — rearma el modal preservando lo tecleado.
  uniCampoTipo: d => {
    S.uniDraft = {building:val("uBld"), unidadNum:val("uN"), pisos:val("uP"), tipo:val("uTipo"),
      bedrooms:val("uTipo")==="Residencial"?parseInt(val("uBedrooms"))||0:null, estudio:chk("uEstudio"), livingRoom:chk("uLivingRoom"),
      bathrooms:parseInt(val("uBathrooms"))||null, ocupacion:val("uOcup")};
    ACC.uniNueva({id:d.id||"", prop:d.prop, keep:true});
  },
  uniDetAgregar: d => {
    S.uniDraft = {building:val("uBld"), unidadNum:val("uN"), pisos:val("uP"), tipo:val("uTipo"),
      bedrooms:val("uTipo")==="Residencial"?parseInt(val("uBedrooms"))||0:null, estudio:chk("uEstudio"), livingRoom:chk("uLivingRoom"),
      bathrooms:parseInt(val("uBathrooms"))||null, ocupacion:val("uOcup")};
    S.uniDetalle.push({tipo:val("uDetTipo"), cantidad:parseInt(val("uDetCant"))||1});
    ACC.uniNueva({id:d.id||"", prop:d.prop, keep:true});
  },
  uniDetQuitar: d => {
    S.uniDraft = {building:val("uBld"), unidadNum:val("uN"), pisos:val("uP"), tipo:val("uTipo"),
      bedrooms:val("uTipo")==="Residencial"?parseInt(val("uBedrooms"))||0:null, estudio:chk("uEstudio"), livingRoom:chk("uLivingRoom"),
      bathrooms:parseInt(val("uBathrooms"))||null, ocupacion:val("uOcup")};
    S.uniDetalle.splice(+d.i,1);
    ACC.uniNueva({id:d.id||"", prop:d.prop, keep:true});
  },
  uniGuardar: d => {
    const tipoU = val("uTipo")||"Residencial";
    const faltanU = ["uN"].concat(tipoU==="Residencial"&&val("uBedrooms")===""?["uBedrooms"]:[]);
    if(marcaFalta(faltanU)){ toast("Falta un dato","Sin número de unidad y Bedrooms no se puede armar ni identificar ni cotizar.","r"); return; }
    const yo = d&&d.id ? by(S.unidades,d.id) : null;
    const bld=val("uBld"), uNumR=val("uN");
    const bedroomsU = tipoU==="Residencial"?parseInt(val("uBedrooms"))||0:null, estudioU = chk("uEstudio"), livingRoomU = chk("uLivingRoom");
    const datos = {building:bld, unidadNum:uNumR, num:uNumComp(bld,uNumR),
      tipo:tipoU, bedrooms:bedroomsU, estudio:estudioU, livingRoom:livingRoomU, bathrooms:parseInt(val("uBathrooms"))||null, ocupacion:val("uOcup")||"Occupied",
      rooms:roomsDesde(tipoU,bedroomsU,estudioU,livingRoomU),pisos:parseInt(val("uP"))||1,detalle:S.uniDetalle.slice()};
    S.uniDetalle=[]; S.uniDraft=null;
    if(yo) return guardarEdicion(yo, datos, "Propiedades", P(yo.prop).nombre+" · unidad "+yo.num, null, "uni:"+yo.id);
    const nu = {id:"U"+nid("u"),prop:d.prop, ...datos};
    S.unidades.push(nu); flash("uni:"+nu.id);
    cm(); toast("✓ Unidad creada",`${esc(nu.num)} · ${esc(nu.rooms)} — ya se puede agendar.`,"v"); render();
  },
  conNuevo: d => { const c = d&&d.id ? by(S.contactos,d.id) : null;
    const pid = c ? c.prop : d.prop;
    modal(`<div class="mh"><h3>${c?"Corregir contacto":"Nuevo contacto"}</h3><p>${esc(P(pid).nombre)}</p></div>
    <div class="mb">
      <div class="fld"><label>Contact Type <span class="req">*</span></label><select id="cT">
        ${["Property Manager","Assistant Manager","Maintenance Supervisor","Accounts Payable","Regional Manager","Other"].map(t=>`<option ${c&&c.tipo===t?"selected":""}>${t}</option>`).join("")}</select></div>
      <div class="fld"><label>Full Name <span class="req">*</span></label><input id="cN" value="${c?esc(c.nombre):""}"></div>
      <div class="fld"><label>Position</label><input id="cPos" value="${c?esc(c.cargo):""}"></div>
      <div class="fg c2"><div class="fld"><label>Email Address <span class="req">*</span></label><input id="cM" value="${c?esc(c.mail):""}"></div>
        <div class="fld"><label>Phone Number</label><input id="cP" class="mono" value="${c?esc(c.tel):""}"></div></div>
      <div class="fg c2">
        <div class="fld"><label>Preferred Contact Method</label><select id="cPref">${activos("medios").filter(m=>m!=="Enlace digital").map(m=>`<option ${c&&c.pref===m?"selected":""}>${m}</option>`).join("")}</select></div>
        <div class="fld"><label>Primary Contact</label><select id="cPrim">${["Yes","No"].map(y=>`<option ${c&&c.primario===y?"selected":""}>${y}</option>`).join("")}</select></div></div>
    </div>
    <div class="mf"><button class="btn" data-a="conCancelar">Cancelar</button>
      <button class="btn p" data-a="conGuardar" data-prop="${pid}" data-id="${c?c.id:""}">${c?"Guardar corrección":"Guardar"}</button></div>`); },
  // Igual que propCancelar: si se llegó aquí desde Solicitud o Visita
  // Comercial, cancelar no debe perder lo que ya se llevaba escrito ahí.
  conCancelar: () => {
    if(S.visitaDraft){ const dr=S.visitaDraft; S.visitaDraft=null; volverAVisitaDraft(dr); return; }
    if(S.solComDraft){ const dr=S.solComDraft; S.solComDraft=null; volverASolComDraft(dr); return; }
    cm();
  },
  conGuardar: d => {
    if(marcaFalta(["cN","cM"])){ toast("Faltan datos","El nombre y el correo son obligatorios — sin correo no se le puede mandar nada.","r"); return; }
    const yo = d&&d.id ? by(S.contactos,d.id) : null;
    const datos = {tipo:val("cT"),nombre:val("cN"),mail:val("cM"),tel:val("cP"),
      cargo:val("cPos"),pref:val("cPref"),primario:val("cPrim")};
    if(yo) return guardarEdicion(yo, datos, "Propiedades", P(yo.prop).nombre+" · "+yo.nombre, null, "con:"+yo.id);
    const nk = {id:"C"+nid("c"),prop:d.prop, ...datos};
    S.contactos.push(nk); flash("con:"+nk.id);
    // Mismo mecanismo que propGuardar: si el contacto se creó desde adentro
    // de Solicitud o Visita Comercial porque la propiedad no tenía ninguno,
    // se vuelve con este ya elegido — sin perder lo demás que ya llevaba
    // escrito, y sin que quede un contactoId suelto que no calce con el
    // nombre que se ve en el formulario.
    if(S.visitaDraft){
      const dr = S.visitaDraft; S.visitaDraft = null;
      dr.contactoId = nk.id; dr.contacto = nk.nombre; dr.correo = nk.mail;
      volverAVisitaDraft(dr);
      toast("✓ Contacto agregado",`<b>${esc(nk.nombre)}</b> ya está en la visita.`,"v");
      return;
    }
    if(S.solComDraft){
      const dr = S.solComDraft; S.solComDraft = null;
      dr.contactoId = nk.id; dr.contacto = nk.nombre; dr.correo = nk.mail;
      volverASolComDraft(dr);
      toast("✓ Contacto agregado",`<b>${esc(nk.nombre)}</b> ya está en la solicitud.`,"v");
      return;
    }
    cm(); toast("✓ Contacto agregado",`${esc(nk.tipo)}: ${esc(nk.nombre)}`,"v"); render();
  },

  tecNuevo: d => { const t = d&&d.id ? T(d.id) : null;
    modal(`<div class="mh"><h3>${t?"Corregir "+esc(tecN(t.id)):"Nuevo técnico"}</h3>
      <p>${t?"Cada campo que cambies queda en la Bitácora con el valor anterior.":"La pestaña <code>Tecnicos</code>, con los mismos campos."}</p></div>
    <div class="mb">
      <div class="fg c2"><div class="fld"><label>Nombre <span class="req">*</span></label><input id="tN" value="${t?esc(t.nombre):""}"></div>
        <div class="fld"><label>Apellido <span class="req">*</span></label><input id="tA" value="${t?esc(t.apellido):""}"></div></div>
      <div class="fld"><label>Especialidad (Specialist) <span class="req">*</span></label>
        <div style="display:flex;flex-wrap:wrap;gap:9px;padding:4px 0">
        ${activos("especialidades").map((e,i)=>`<label style="display:flex;gap:5px;align-items:center;font-size:12.5px;font-weight:500">
          <input type="checkbox" id="te${i}" value="${esc(e)}" style="width:auto" ${t&&t.esp.includes(e)?"checked":""}>${esc(e)}</label>`).join("")}</div></div>
      <div class="fg c2">
        <div class="fld"><label>Ubicación (zona) <span class="req">*</span></label><select id="tZ">${zonasN().map(z=>`<option ${t&&t.zona===z?"selected":""}>${esc(z)}</option>`).join("")}</select></div>
        <div class="fld"><label>Teléfono</label><input id="tT" class="mono" value="${t?esc(t.tel):""}"></div></div>
      <div class="fg c2">
        <div class="fld"><label>Dirección</label><input id="tD" value="${t?esc(t.dir):""}"></div>
        <div class="fld"><label>Movimiento</label><select id="tMv">
          <option value="1" ${t&&t.movimiento?"selected":""}>Sí, se puede mover de zona</option>
          <option value="0" ${t&&!t.movimiento?"selected":""}>No</option></select></div></div>
    </div>
    <div class="mf"><button class="btn" data-a="cm">Cancelar</button>
      <button class="btn p" data-a="tecGuardar" data-id="${t?t.id:""}">${t?"Guardar corrección":"Guardar"}</button></div>`,true); },
  tecGuardar: d => {
    if(marcaFalta(["tN","tA"])){ toast("Faltan datos","Nombre y apellido.","r"); return; }
    const esp = activos("especialidades").filter((e,i)=>chk("te"+i));
    if(!esp.length){ toast("Falta la especialidad","Sin especialidad el sistema no puede sugerirlo para asignar.","r"); return; }
    const yo = d&&d.id ? T(d.id) : null;
    const datos = {nombre:val("tN"),apellido:val("tA"),esp,zona:val("tZ"),
      tel:val("tT"),dir:val("tD"),movimiento:val("tMv")==="1"};
    if(yo) return guardarEdicion(yo, datos, "Técnicos", tecN(yo.id), null, "tec:"+yo.id);
    const nt = {id:"T"+nid("t"), ...datos, nac:"", activo:true};
    S.tecnicos.push(nt); flash("tec:"+nt.id);
    cm(); toast("✓ Técnico dado de alta",`${esc(nt.nombre)} ${esc(nt.apellido)} — ${esc(esp.join(", "))}. Ya aparece al asignar.`,"v"); render();
  },

  tarNueva: d => { const t = d&&d.id ? by(S.tarifas,d.id) : null;
    const op = (a,v) => a.map(x=>`<option ${String(x)===String(v)?"selected":""}>${esc(String(x))}</option>`).join("");
    /* Si venimos de "+ Add new tax", se recupera lo que ya se había escrito
       en vez de perderlo — igual que con las pólizas del COI. */
    const dr = d&&(d.fromTax||d.fromtax) ? S.tarDraft : null;
    const v = k => dr ? dr[k] : (t ? t[k] : "");
    /* El contexto (general o de una propiedad puntual) lo decide de dónde se abre
       el formulario — desde Tarifario (general) o desde el Price List de una
       propiedad (esa propiedad) — ya no se elige con un selector. */
    const propId = dr ? dr.prop : (t ? t.prop : (d&&d.prop ? d.prop : null));
    modal(`<div class="mh"><h3>${t?"Corregir precio":"Add Item"}</h3>
      <p>${t?"Un precio mal tecleado se arrastra a cada Work Order. Corrígelo aquí; el cambio queda en la Bitácora.":"Los mismos campos con los que ella registra un precio."}</p></div>
    <div class="mb">
      <div class="note" style="margin:0 0 12px">${propId?`Precio exclusivo de <b>${esc(P(propId).nombre)}</b>`:"<b>General</b> — aplica a todas las propiedades"}</div>
      ${propId?`<div class="fld"><label>Unidad de referencia <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— para ver su composición real y no adivinar el Detail/Piso</span></label>
        <select id="rUnidad" data-a="tarUnidadDetalle">
          <option value="">— sin unidad de referencia —</option>
          ${S.unidades.filter(u=>u.prop===propId).map(u=>`<option value="${u.id}">${esc(u.num)}</option>`).join("")}
        </select>
        <div id="rUnidadDetalle"></div></div>`:""}
      <div class="fld"><label>Name <span class="req">*</span> <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— se arma solo abajo</span></label>
        <input id="rNom" readonly style="background:var(--surface-2)" value="${esc(v("nombre")||(propId?`${P(propId).nombre} - `:"")+((v("serv")||"")+" "+(v("variante")||"")).trim())}">
        <label style="display:flex;align-items:center;gap:6px;margin:6px 0 0;text-transform:none;font-weight:500;font-size:11.5px;color:var(--soft)">
          <input type="checkbox" id="rNomEdit" data-a="tarNomLock" style="width:auto"> Editar el Name a mano</label></div>
      <div class="fld"><label>Description <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— opcional</span></label><input id="rD" value="${esc(v("desc")||"")}"></div>
      <div class="fg c2">
        <div class="fld"><label>Tipo de servicio <span class="req">*</span></label><select id="rC" data-a="tarCat">${op(activos("categorias"), v("cat"))}</select></div>
        <div class="fld"><label>Servicio <span class="req">*</span></label><select id="rS" data-a="tarNomBuild">${op(servDe(v("cat")||"Clean"), v("serv"))}</select></div></div>
      <div class="fld"><label>Detail <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— ej. «2 bedroom», o «Per trailer» si no aplica por tamaño</span></label>
        <input id="rDet" data-a="tarNomBuild" list="rDetList" value="${esc(v("variante")||"")}">
        <datalist id="rDetList">${activos("rooms").map(r=>`<option value="${esc(r)}">`).join("")}</datalist>
        <div class="hint">Sugiere los tipos de unidad reales (Rooms) para que calce con las unidades — pero puedes escribir otra cosa si el servicio no se cobra por tamaño de unidad.</div></div>
      <div class="fg c2">
        <div class="fld"><label>Piso <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— solo si el precio cambia según el piso</span></label>
          <select id="rPiso">
            <option value="" ${!v("pisos")?"selected":""}>— cualquier piso —</option>
            ${activos("pisos").map(p=>`<option value="${p}" ${String(v("pisos"))===String(p)?"selected":""}>Floor ${p}</option>`).join("")}
          </select></div>
        <div class="fld"><label>Baños <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— opcional, de referencia</span></label>
          <input id="rBanos" type="number" min="0" class="mono" placeholder="ej. 2" value="${esc(v("banos")??"")}">
          <div class="hint">Solo para verlo aquí y en el Detail de la unidad — hoy el precio no cambia por baños, solo por Rooms/Piso.</div></div></div>
      <div class="fg c2">
        <div class="fld"><label>Price (excl. tax) <span class="req">*</span></label><input id="rP" class="mono" placeholder="0.00" value="${esc(v("precio")??"")}"></div>
        <div class="fld"><label>Tax</label><select id="rTax">
          <option value="">— no tax —</option>
          ${S.impuestos.map(x=>`<option value="${x.id}" ${v("tax")===x.id?"selected":""}>${esc(x.nombre)} (${x.tasa}%)</option>`).join("")}
          </select>
          <div class="hint"><a href="#" data-a="impAgregar" data-id="${t?t.id:""}" data-prop="${propId||""}" style="color:var(--azul)">+ Add new tax</a></div></div></div>
      <div class="fg c2">
        <div class="fld"><label>Quantity</label><input id="rCant" type="number" class="mono" min="1" value="${v("cantidad")||"1"}"></div>
        <div class="fld"><label>Total Discount <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— optional</span></label>
          <div style="display:flex;gap:6px">
            <input id="rDesc" class="mono" style="flex:1" value="${esc(v("descuento")||"")}" placeholder="0.00">
            <input type="hidden" id="rDescTipo" value="${v("descuentoTipo")||"%"}">
            <button type="button" class="btn sm ${(v("descuentoTipo")||"%")==="$"?"p":""}" id="rDescBtnS" data-a="tarDescTipo" data-t="$" style="min-width:34px">$</button>
            <button type="button" class="btn sm ${(v("descuentoTipo")||"%")==="%"?"p":""}" id="rDescBtnP" data-a="tarDescTipo" data-t="%" style="min-width:34px">%</button>
          </div></div></div>
      ${t?`<div class="note w">Cambiar el precio no toca lo ya facturado: las Work Orders cerradas conservan lo que se cobró. Aplica de aquí en adelante.</div>`:""}
    </div>
    <div class="mf"><button class="btn" data-a="tarCancelar">Cancel</button>
      <button class="btn p" data-a="tarGuardar" data-id="${t?t.id:""}" data-prop="${propId||""}">${t?"Guardar corrección":"Add"}</button></div>`,true); },
  tarCancelar: () => { S.tarDraft=null; cm(); },
  tarCat: () => { document.getElementById("rS").innerHTML=servDe(val("rC")).map(s=>`<option>${esc(s)}</option>`).join(""); ACC.tarNomBuild(); },
  tarUnidadDetalle: () => {
    const el = document.getElementById("rUnidadDetalle"); if(!el) return;
    const u = by(S.unidades, val("rUnidad"));
    if(!u){ el.innerHTML=""; return; }
    /* La composición real (cuántos baños, salas, etc.) es la guía para decidir
       el número — el precio sigue siendo UNO solo por unidad, esto no suma
       nada automático. Detail y Piso sí se autocompletan con los datos reales
       de la unidad elegida, en vez de que alguien los reescriba a mano. */
    el.innerHTML = `<div class="fld" style="margin:9px 0 12px">${unidadCardHTML(u)}</div>`;
    const selDet = document.getElementById("rDet");
    if(selDet) selDet.value = u.rooms;
    const selPiso = document.getElementById("rPiso");
    if(selPiso && [...selPiso.options].some(o=>o.value===String(u.pisos))) selPiso.value = String(u.pisos);
    ACC.tarNomBuild();
  },
  /* Igual que en el Price List: al elegir la unidad en el Estimado, se ve su
     composición real (cuartos, baños, piso) — para cotizar viendo lo que la
     unidad de verdad tiene, en vez de solo un texto plano en el dropdown. */
  estUniDetalle: () => {
    const el = document.getElementById("eUniDetalle"); if(!el) return;
    const uid = val("eUni"), esNueva = uid==="__new__";
    const u = esNueva ? null : by(S.unidades, uid);
    el.innerHTML = u ? unidadCardHTML(u) : "";
    const cajaNueva = document.getElementById("eUniNueva");
    const tipoN = val("eUniTipo")||"Residencial";
    const pE = S.estHdr ? P(S.estHdr.prop) : null;
    if(cajaNueva) cajaNueva.innerHTML = esNueva ? `
      <div class="note" style="margin:0 0 10px"><b>Location:</b> ${pE&&pE.zona?esc(pE.zona):'<span style="color:var(--faint)">sin definir en la propiedad</span>'}</div>
      <div class="fg c4" style="margin-top:6px">
        <div class="fld" style="margin-bottom:0"><label>Building</label>
          <input id="eUniBld" value="${esc(val("eUniBld"))}" placeholder="A, B…"></div>
        <div class="fld" style="margin-bottom:0"><label>Unidad <span class="req">*</span></label>
          <input id="eUniNum" value="${esc(val("eUniNum"))}" placeholder="204, 27, 8…"></div>
        <div class="fld" style="margin-bottom:0"><label>Floor</label>
          <select id="eUniPisos">${activos("pisos").map(pi=>`<option ${String(pi)===val("eUniPisos")?"selected":""}>${pi}</option>`).join("")}</select></div>
        <div class="fld" style="margin-bottom:0"><label>Tipo</label>
          <select id="eUniTipo" data-a="estUniDetalle">
            <option ${tipoN==="Residencial"?"selected":""}>Residencial</option>
            <option ${tipoN==="Oficina"?"selected":""}>Oficina</option></select></div>
      </div>
      ${tipoN==="Residencial"?`<div class="fg c4" style="margin:6px 0 0">
        <div class="fld" style="margin-bottom:0"><label>Bedrooms</label>
          <input id="eUniBedrooms" type="number" min="0" class="mono" placeholder="0 = Studio" value="${esc(val("eUniBedrooms"))}"></div>
        <div class="fld" style="margin-bottom:0"><label>Bathrooms <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— informativo</span></label>
          <input id="eUniBathrooms" type="number" min="0" class="mono" placeholder="opcional" value="${esc(val("eUniBathrooms"))}"></div>
        <div class="fld" style="margin-bottom:0;display:flex;align-items:flex-end;padding-bottom:9px">
          <label style="display:flex;align-items:center;gap:6px;font-weight:500;text-transform:none;font-size:12px">
            <input type="checkbox" id="eUniEstudio" ${chk("eUniEstudio")?"checked":""} style="width:auto"> + estudio aparte</label></div>
        <div class="fld" style="margin-bottom:0;display:flex;align-items:flex-end;padding-bottom:9px">
          <label style="display:flex;align-items:center;gap:6px;font-weight:500;text-transform:none;font-size:12px">
            <input type="checkbox" id="eUniLivingRoom" ${chk("eUniLivingRoom")?"checked":""} style="width:auto"> + living room aparte</label></div>
      </div>`:""}` : "";
  },
  /* Su ejemplo real de Price List (vCita) nombra los ítems así:
     "Angel Landing - Full Paint 2 Bedroom" — nombre de la propiedad primero,
     guion, servicio y detail. El Name se arma exactamente en ese formato
     cuando hay una propiedad de contexto; sigue editable igual que antes. */
  tarNomBuild: () => {
    const nom = document.getElementById("rNom");
    if(!nom) return;
    /* Con "Editar el Name a mano" marcado, tocar Servicio/Detail no debe
       pisarle lo que ya escribió — el candado es justamente para eso. */
    const chk = document.getElementById("rNomEdit");
    if(chk && chk.checked) return;
    const btn = document.querySelector('[data-a="tarGuardar"]');
    const propId = btn ? btn.dataset.prop : "";
    const base = ((val("rS")||"")+" "+(val("rDet")||"")).trim();
    nom.value = propId ? `${P(propId).nombre} - ${base}` : base;
  },
  /* Name bloqueado por defecto (se arma solo); el check lo desbloquea para
     escribir algo distinto, y al volver a tildarlo se resincroniza solo. */
  tarNomLock: () => {
    const chk = document.getElementById("rNomEdit"), nom = document.getElementById("rNom");
    if(!chk || !nom) return;
    nom.readOnly = !chk.checked;
    nom.style.background = chk.checked ? "" : "var(--surface-2)";
    if(!chk.checked) ACC.tarNomBuild();
  },
  tarDescTipo: d => {
    document.getElementById("rDescTipo").value = d.t;
    document.getElementById("rDescBtnS").classList.toggle("p", d.t==="$");
    document.getElementById("rDescBtnP").classList.toggle("p", d.t==="%");
  },
  impAgregar: d => {
    S.tarDraft = {id:d.id, prop:d.prop||null, nombre:val("rNom"), cat:val("rC"), serv:val("rS"), variante:val("rDet"),
      pisos: val("rPiso") ? parseInt(val("rPiso")) : null, desc:val("rD"),
      precio:val("rP"), pago:val("rG"), tax:val("rTax"), descuento:val("rDesc"), descuentoTipo:val("rDescTipo"), cantidad:val("rCant")};
    modal(`<div class="mh"><h3>Add Tax</h3></div>
    <div class="mb">
      <div class="fld"><label>Tax Name <span class="req">*</span></label><input id="impN"></div>
      <div class="fld"><label>Tax Rate <span class="req">*</span></label><input id="impT" class="mono" placeholder="0" style="max-width:110px"> %</div>
    </div>
    <div class="mf"><button class="btn" data-a="tarNueva" data-fromtax="1">Volver</button>
      <button class="btn p" data-a="impGuardar">Add</button></div>`,true);
  },
  impGuardar: () => {
    if(marcaFalta(["impN","impT"])){ toast("Faltan datos","Nombre y tasa del impuesto son obligatorios.","r"); return; }
    const ni = {id:"IMP"+Date.now(), nombre:val("impN"), tasa:parseFloat(val("impT"))||0};
    S.impuestos.push(ni);
    if(S.tarDraft) S.tarDraft.tax = ni.id;
    ACC.tarNueva({id:S.tarDraft?S.tarDraft.id:"", prop:S.tarDraft?S.tarDraft.prop:null, fromTax:true});
  },
  tarGuardar: d => {
    if(marcaFalta(["rNom","rP"])){ toast("Faltan datos","Name y Price son obligatorios.","r"); return; }
    const yo = d&&d.id ? by(S.tarifas,d.id) : null;
    const datos = {prop:d.prop||null,nombre:val("rNom"),cat:val("rC"),serv:val("rS"),variante:val("rDet"),
      pisos: val("rPiso") ? parseInt(val("rPiso")) : null,
      banos: val("rBanos") ? parseInt(val("rBanos")) : null,
      precio:parseFloat(val("rP")),pago:parseFloat(val("rG"))||0,
      desc:val("rD"),tax:val("rTax"),descuento:val("rDesc"),descuentoTipo:val("rDescTipo"),cantidad:parseInt(val("rCant"))||1};
    if(yo) return guardarEdicion(yo, datos, "Tarifario", `${yo.nombre}${yo.prop?" · "+P(yo.prop).nombre:" · general"}`, null, "tar:"+yo.id);
    const nr = {id:"TR"+Date.now(), ...datos};
    S.tarifas.push(nr); flash("tar:"+nr.id);
    cm(); toast("✓ Item agregado",`${esc(nr.nombre)} — ${nr.prop?"solo para "+esc(P(nr.prop).nombre):"general"}.`,"v"); render();
  },

  catAdd: d => modal(`<div class="mh"><h3>Agregar a ${esc(d.n)}</h3><p>Aparecerá de inmediato en todos los desplegables que usan esta lista.</p></div>
    <div class="mb"><div class="fld"><label>Valor nuevo <span class="req">*</span></label><input id="cv" autofocus></div>
    <div class="note">Ojo con las mayúsculas y los espacios: <b>«Navarre»</b> y <b>«navarre»</b> son dos valores distintos, y así es como hoy se rompen los conteos.</div></div>
    <div class="mf"><button class="btn" data-a="cm">Cancelar</button><button class="btn p" data-a="catSave" data-k="${d.k}">Agregar</button></div>`),
  catSave: d => {
    const v = val("cv");
    if(!v){ marcaFalta(["cv"]); toast("Falta el valor","","r"); return; }
    const lista = CAT[d.k];
    const yaEsta = lista.some(x=>String(x).toLowerCase().trim()===v.toLowerCase());
    if(yaEsta){ toast("⚠ Ya existe",`«${esc(v)}» ya está en la lista (o una variante con otras mayúsculas). No lo duplico.`,"w"); return; }
    lista.push(d.k==="pisos" ? (parseInt(v)||v) : v); flash("cat:"+d.k+":"+v);
    cm(); toast("✓ Agregado",`«${esc(v)}» ya aparece en los desplegables.`,"v"); render();
  },
  /* No borra: da de baja. El valor sigue existiendo para lo ya registrado. */
  catDel: d => {
    const v = String(CAT[d.k][+d.i]);
    S.bajas[d.k] = (S.bajas[d.k]||[]).concat([v]);
    const uso = d.k==="zonas" ? S.propiedades.filter(p=>p.zona===v).length : 0;
    toast("Dado de baja",`«${esc(v)}» deja de ofrecerse para registros nuevos.`
      + (uso?` Los ${uso} registros que ya lo usan lo conservan.`:` Nada se borró.`),"w");
    render();
  },
  catAlta: d => {
    const v = String(CAT[d.k][+d.i]);
    S.bajas[d.k] = (S.bajas[d.k]||[]).filter(x=>x!==v);
    toast("Reactivado",`«${esc(v)}» vuelve a estar disponible.`,"v"); render();
  },
  /* Renombrar no es dar de baja y crear otro: es el mismo valor con otro
     nombre, y todo lo que ya lo usaba lo sigue usando. */
  catRen: d => {
    const v = String(CAT[d.k][+d.i]);
    const L = LISTAS.find(x=>x.k===d.k), usos = usosDe(d.k, v);
    const ojo = (OJO_LOGICA[d.k]||{})[v];
    modal(`<div class="mh"><h3>Renombrar «${esc(v)}»</h3><p>${esc(L?L.n:d.k)}</p></div>
    <div class="mb">
      <div class="fld"><label>Nombre nuevo <span class="req">*</span></label>
        <input id="cr" value="${esc(v)}" autofocus></div>
      ${usos.length
        ? `<div class="note"><b>Se usa en ${usos.map(u=>`${u.c} ${u.n}`).join(", ")}.</b>
             Todos van a decir el nombre nuevo, incluido el histórico. No se pierde ningún registro:
             es el mismo valor, con otra etiqueta.</div>`
        : `<div class="note">Todavía no lo usa ningún registro.</div>`}
      ${ojo?`<div class="note w" style="margin-top:10px"><b>Ojo:</b> ${esc(ojo)} Si lo renombras, hay que ajustar esa regla.</div>`:""}
    </div>
    <div class="mf"><button class="btn" data-a="cm">Cancelar</button>
      <button class="btn p" data-a="catRenOK" data-k="${d.k}" data-i="${d.i}">Renombrar</button></div>`);
  },
  catRenOK: d => {
    const viejo = String(CAT[d.k][+d.i]), nuevo = val("cr");
    if(!nuevo){ marcaFalta(["cr"]); toast("Falta el nombre","","r"); return; }
    if(nuevo===viejo){ S.audOmitir=true; cm(); toast("Sin cambios","El nombre es el mismo.",""); return; }
    if(CAT[d.k].some((x,i)=>i!==+d.i && String(x).toLowerCase().trim()===nuevo.toLowerCase())){
      toast("⚠ Ya existe",`«${esc(nuevo)}» ya está en la lista. Renombrar no puede fusionar dos valores en uno: eso sí tendría que decidirse aparte.`,"w"); return; }
    CAT[d.k][+d.i] = d.k==="pisos" ? (parseInt(nuevo)||nuevo) : nuevo;
    const tocados = renombrarCat(d.k, viejo, CAT[d.k][+d.i]); flash("cat:"+d.k+":"+CAT[d.k][+d.i]);
    S.bitacora.unshift({ n:++S.audSeq, fecha:"2026-08-11", hora:hora(),
      usuario:S.usuario, rol:ROLES[S.usuario].r, accion:"Renombró un valor de catálogo",
      modulo:"Catálogos", ref:(LISTAS.find(x=>x.k===d.k)||{}).n||d.k,
      cambios:[{campo:"Nombre", de:viejo, a:nuevo}] });
    cm();
    toast("✓ Renombrado",`«${esc(viejo)}» ahora es <b>${esc(nuevo)}</b>`
      + (tocados?`, y los <b>${tocados} registro(s)</b> que lo usaban ya lo dicen así.`:". Todavía no lo usaba ningún registro.")
      ,"v");
    render();
  },
  servRen: d => {
    const s = CAT.servicios.find(x=>x.id===d.id); if(!s) return;
    const usos = usosDe("servicios", s.nombre);
    modal(`<div class="mh"><h3>Renombrar «${esc(s.nombre)}»</h3><p>Servicio de ${esc(s.tipo)}</p></div>
    <div class="mb">
      <div class="fld"><label>Nombre nuevo <span class="req">*</span></label><input id="cr" value="${esc(s.nombre)}" autofocus></div>
      ${usos.length
        ? `<div class="note"><b>Se usa en ${usos.map(u=>`${u.c} ${u.n}`).join(", ")}.</b>
             Todos van a decir el nombre nuevo. La tarifa lo sigue encontrando: es el mismo servicio.</div>`
        : `<div class="note">Todavía no lo usa ningún registro.</div>`}
    </div>
    <div class="mf"><button class="btn" data-a="cm">Cancelar</button>
      <button class="btn p" data-a="servRenOK" data-id="${s.id}">Renombrar</button></div>`);
  },
  servRenOK: d => {
    const s = CAT.servicios.find(x=>x.id===d.id); if(!s) return;
    const nuevo = val("cr"), viejo = s.nombre;
    if(!nuevo){ marcaFalta(["cr"]); toast("Falta el nombre","","r"); return; }
    if(nuevo===viejo){ S.audOmitir=true; cm(); toast("Sin cambios","El nombre es el mismo.",""); return; }
    if(CAT.servicios.some(x=>x.id!==s.id && x.tipo===s.tipo && x.nombre.toLowerCase()===nuevo.toLowerCase())){
      toast("⚠ Ya existe",`«${esc(nuevo)}» ya está en ${esc(s.tipo)}.`,"w"); return; }
    s.nombre = nuevo;
    const tocados = renombrarCat("servicios", viejo, nuevo); flash("serv:"+s.id);
    S.bitacora.unshift({ n:++S.audSeq, fecha:"2026-08-11", hora:hora(),
      usuario:S.usuario, rol:ROLES[S.usuario].r, accion:"Renombró un servicio",
      modulo:"Catálogos", ref:s.tipo, cambios:[{campo:"Nombre", de:viejo, a:nuevo}] });
    cm();
    toast("✓ Renombrado",`«${esc(viejo)}» ahora es <b>${esc(nuevo)}</b>`
      + (tocados?`, y los <b>${tocados} registro(s)</b> que lo usaban ya lo dicen así.`:"."),"v");
    render();
  },
  servAdd: () => modal(`<div class="mh"><h3>Nuevo servicio</h3><p>Cada servicio cuelga de un tipo. Así el desplegable se filtra solo al agendar.</p></div>
    <div class="mb">
      <div class="fld"><label>Tipo de servicio <span class="req">*</span></label>
        <select id="sT">${activos("categorias").map(c=>`<option>${esc(c)}</option>`).join("")}</select></div>
      <div class="fld"><label>Nombre del servicio <span class="req">*</span></label><input id="sN" placeholder="Full paint, Deep clean…"></div>
      <div class="note">Después hay que darle tarifa en el Tarifario, si no saldrá como «NA» y levantará una excepción.</div></div>
    <div class="mf"><button class="btn" data-a="cm">Cancelar</button><button class="btn p" data-a="servSave">Agregar</button></div>`),
  servSave: () => {
    const n = val("sN"), t = val("sT");
    if(!n){ marcaFalta(["sN"]); toast("Falta el nombre","","r"); return; }
    if(CAT.servicios.some(s=>s.tipo===t && s.nombre.toLowerCase()===n.toLowerCase())){
      toast("⚠ Ya existe",`«${esc(n)}» ya está en ${esc(t)}.`,"w"); return; }
    const ns={id:"S"+Date.now(), tipo:t, nombre:n};
    CAT.servicios.push(ns); flash("serv:"+ns.id);
    cm(); toast("✓ Servicio agregado",`${esc(n)} dentro de ${esc(t)}.`,"v"); render();
  },
  servDel: d => {
    const s = CAT.servicios.find(x=>x.id===d.id);
    if(!s) return;
    s.baja = true;
    const uso = S.wos.filter(w=>w.serv===s.nombre).length;
    toast("Servicio dado de baja", uso? `«${esc(s.nombre)}» ya no se puede elegir. Las ${uso} Work Orders que lo usan lo conservan.`
                                      : `«${esc(s.nombre)}» deja de ofrecerse. Nada se borró.`,"w");
    render();
  },
  servAlta: d => {
    const s = CAT.servicios.find(x=>x.id===d.id);
    if(s){ s.baja=false; toast("Reactivado",`«${esc(s.nombre)}» vuelve a estar disponible.`,"v"); }
    render();
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
  solProgramar: d => {
    const s = by(S.solicitudes,d.id);
    /* Si la solicitud viene de un estimado aprobado, ya trae las líneas con
       precio y unidad definidos — se crean las Work Orders directo, sin que
       Thalia tenga que volver a teclear lo que ya se cotizó y se aprobó.
       Esto es atómico (todo o nada en el mismo clic), así que aquí sí es
       seguro marcarla "Programada" de una vez. */
    if(s.lineas && s.lineas.length){
      s.estado="Programada";
      let n=0; const nuevas=[];
      s.lineas.forEach(l=>{
        const id=nid("w"); nuevas.push("wo:"+id);
        S.wos.push({id,prop:s.prop,unidad:l.unidad,cat:l.cat,serv:l.serv,ubic:"",tec:null,
          estado:"Scheduled",semana:S.semana,fecha:"2026-08-14",horaProg:"9:00",po:"",asistencia:false,
          precio:l.precio,pago:l.pago||0,cant:l.cantidad||1,
          origen:{tipo:"Estimado",id:s.estimadoId,num:s.estimadoNum},
          evid:0,mats:[],notas:"",notasTec:"",hist:[[hora(),`Creada desde el estimado ${s.estimadoNum}`,S.usuario]]});
        n++;
      });
      flash(nuevas);
      toast("✓ Programada",`Se crearon <b>${n} Work Orders</b> desde ${esc(s.estimadoNum)}, sin volver a escribir nada. Ya las puedes asignar.`,"v");
      S.mod="wo"; S.sub=null; S.tab="todas"; render();
      return;
    }
    /* Este otro camino sí requiere que Thalia arme la Work Order a mano
       (elegir unidad, servicio, técnico...) — abre el modal y ahí puede
       cancelar sin haber hecho nada. Antes "Programada" se marcaba aquí
       mismo, apenas se abría el modal: cancelarlo sin guardar igual hacía
       desaparecer la solicitud de la lista, sin ninguna Work Order creada.
       Ahora solo se marca cuando de verdad se guarda algo (ver woGuardar). */
    S.progSolId = s.id;
    S.estHdr={cli:s.cliente,prop:s.prop,cat:"Clean"};
    toast("Solicitud tomada",`Abre la Work Order con la propiedad ya cargada.`,"v");
    modalWO();
    setTimeout(()=>{ const e=document.getElementById("wProp"); if(e){ e.value=s.prop; refWO(); } },0);
    render();
  },

  /* ---- UC-09b: reagendar cuando no asistió o quedó incompleto ----
     Antes esto era un botón y un modal aparte ("Reagendar", con sus propios
     campos rgM/rgF/rgH/rgMedio/rgContacto) que no compartía nada con
     "Programar con el cliente" — dos caminos separados para casi lo mismo,
     y confundía cuál usar. Ahora reagendar ES coordinar una fecha nueva: se
     hace desde el mismo botón/modal ("Programar con el cliente" / "Ver
     coordinación con el cliente"), con el campo opcional "¿Qué pasó?" que
     aparece solo si ya hay técnico asignado. Ver progOK. */

  /* ---- SOLICITUDES COMERCIALES: lo que Lydia recibe antes de armar el estimado ---- */
  solComNueva: d => modalSolCom(d&&d.id),
  /* "Propiedades" sí está en los módulos de Lydia — crear la propiedad es
     suyo. Antes "propiedad nueva" era solo un nombre escrito a mano que
     nunca se convertía en una Propiedad real, y siempre terminaba bloqueada
     más adelante ("Falta registrar la propiedad") al armar el estimado. */
  solPropNueva: d => { S.solComDraft = leerSolComDraft(); ACC.propNueva({}); },
  /* La propiedad ya existe pero no tiene a quién se le habló registrado —
     antes esto era un callejón sin salida: solo un aviso que mandaba a ir
     al Expediente de la propiedad, perdiendo lo que ya se llevaba escrito
     acá. Mismo mecanismo que "+ Crear propiedad". */
  solConNuevo: d => { S.solComDraft = leerSolComDraft(); ACC.conNuevo({prop:val("scProp")}); },
  solComGuardar: d => {
    if(marcaFalta(["scProp","scContacto","scCorreo","scAlcance"])){ toast("Faltan datos","Propiedad, contacto, correo y alcance son obligatorios.","r"); return; }
    const propSel = val("scProp");
    const inspeccion = val("scInspeccion")==="si";
    // El id del contacto elegido queda guardado — así, si esto se convierte en
    // Estimado, es el mismo contacto el que sale marcado ahí (ver estInicializarBorrador).
    const selEl = document.getElementById("scContactoSel");
    const datos = {prop:propSel, propNombre:"", contactoId: (selEl && selEl.value) ? selEl.value : null,
      contacto:val("scContacto"), correo:val("scCorreo"), alcance:val("scAlcance"),
      inspeccion, fechaObjetivo:val("scFecha"), notas:val("scNotas")};
    const yo = d&&d.id ? by(S.solicitudesComerciales,d.id) : null;
    if(yo){
      Object.assign(yo, datos);
      if(yo.estado!=="Estimado creado" && yo.estado!=="Descartada"){
        yo.estado = inspeccion ? (solInspeccionLista(yo)?"Lista para estimado":"Esperando inspección") : "Lista para estimado";
      }
      flash("solcom:"+yo.id); cm();
      toast("✓ Solicitud actualizada","","v"); render();
      return;
    }
    const ns = {id:"SC"+Date.now(), fecha:"2026-08-11", quien:S.usuario, estimadoId:null,
      estado: inspeccion?"Esperando inspección":"Lista para estimado", ...datos};
    S.solicitudesComerciales.unshift(ns); flash("solcom:"+ns.id);
    cm();
    toast("✓ Solicitud registrada",`Lydia registró el pedido de <b>${esc(ns.contacto)}</b>.`
      + (inspeccion?" Falta asignar inspección a Gustavo.":" Ya se puede armar el estimado."),"v"); render();
  },
  solComInspeccion: d => {
    const s = by(S.solicitudesComerciales,d.id);
    s.inspAsignada = true;
    toast("Inspección asignada a Gustavo",`Cuando Gustavo entregue su reporte de campo de esta propiedad, la solicitud queda lista para armar el estimado.`,"v");
    render();
  },
  solComDescartar: d => { const s=by(S.solicitudesComerciales,d.id); s.estado="Descartada"; toast("Solicitud descartada","","w"); render(); },
  /* Convierte la solicitud en un estimado — el mismo formulario de vCita,
     ya con la propiedad y el contacto cargados. */
  solComEstimado: d => {
    const s = by(S.solicitudesComerciales,d.id);
    if(!s.prop){ toast("🚫 Falta registrar la propiedad","Crea primero la Propiedad (con al menos un Contacto) antes de armar el estimado.","r"); return; }
    if(s.inspeccion && !solInspeccionLista(s)){ toast("🚫 Falta el reporte de inspección","Gustavo todavía no entrega el reporte de campo de esta propiedad.","r"); return; }
    estInicializarBorrador(s.prop, s.id);
    toast("Estimado en preparación",`Se abre con <b>${esc(P(s.prop).nombre)}</b> ya cargada. Alcance pedido: «${esc(s.alcance)}».`,"v");
    modalEst();
  },

  /* ---- VISITA COMERCIAL (UC-01b) ---- */
  visitaComNueva: d => modalVisitaCom(d&&d.id),
  visitaComEditar: d => modalVisitaCom(d.id),
  /* "Servicio directo" pasaba a Thalia sin llamada — pero si la propiedad
     no tenía el Expediente completo, ramificarVisita() solo avisaba con un
     toast que se iba solo, y la visita se quedaba «Cerrada» con pastilla
     verde sin dejar ningún rastro de que en realidad nunca llegó. Mismo
     camino que ya existe en Estimados (estIrExpediente/estAgendar): ir a
     completar el Expediente, y reintentar sin tener que repetir la visita. */
  visitaIrExpediente: d => { const v=by(S.visitas,d.id); S.mod="propiedades"; S.sub=v.prop; S.tab="expediente"; render(); },
  visitaReintentarDirecto: d => {
    const v=by(S.visitas,d.id);
    if(!expedienteOK(v.prop,{sinEstimado:true})){ toast("🚫 Expediente incompleto",`<b>${esc(P(v.prop).nombre)}</b> todavía no tiene el Expediente completo.`,"r"); return; }
    ramificarVisita(v); render();
  },
  /* "Propiedades" sí está en los módulos de Lydia — crear la propiedad es
     suyo, a diferencia de cargarle precios. Antes esto era un campo de
     texto libre que nunca se convertía en una Propiedad real, y siempre
     terminaba bloqueada más adelante ("Falta registrar la propiedad"). */
  visitaPropNueva: d => { S.visitaDraft = leerVisitaDraft(); ACC.propNueva({}); },
  visitaConNuevo: d => { S.visitaDraft = leerVisitaDraft(); ACC.conNuevo({prop:val("vcProp")}); },
  visitaComGuardar: d => {
    const resultado = val("vcResultado");
    if(!resultado){ toast("Falta el resultado","Elige qué resultó de la visita.","r"); return; }
    if(resultado==="Sigue en seguimiento" && !val("vcProxima")){
      toast("Falta la próxima acción","Sin fecha, este seguimiento se pierde igual que se perdía antes.","r"); return; }

    const yo = d&&d.id ? by(S.visitas,d.id) : null;
    if(yo){
      if(marcaFalta(["vcNotas"])){ toast("Falta la nota","Escribe qué pasó ahora.","r"); return; }
      yo.notas = `${yo.notas} · ${val("vcNotas").trim()}`;
      yo.hist.push([hora(), val("vcNotas").trim(), S.usuario]);
      yo.resultado = resultado;
      yo.proximaAccion = resultado==="Sigue en seguimiento" ? val("vcProxima") : null;
      yo.estado = resultado==="Sigue en seguimiento" ? "En seguimiento" : "Cerrada";
      flash("visita:"+yo.id); cm();
      ramificarVisita(yo); render();
      return;
    }

    if(marcaFalta(["vcProp","vcContacto","vcNotas"])){ toast("Faltan datos","Propiedad, contacto y notas de la visita son obligatorios.","r"); return; }
    const propSel = val("vcProp");
    const selEl = document.getElementById("vcContactoSel");
    const nv = {id:"VC"+Date.now(), tipo:"Comercial", prop:propSel, propNombre:"", contactoId: (selEl && selEl.value) ? selEl.value : null,
      fecha:"2026-08-11", hora:hora(), contacto:val("vcContacto"), correo:val("vcCorreo"), quien:S.usuario,
      notas:val("vcNotas"), resultado, proximaAccion: resultado==="Sigue en seguimiento"?val("vcProxima"):null,
      estado: resultado==="Sigue en seguimiento"?"En seguimiento":"Cerrada",
      hist:[[hora(),"Visita comercial registrada",S.usuario]]};
    S.visitas.push(nv); flash("visita:"+nv.id);
    cm();
    ramificarVisita(nv); render();
  },

  /* ---- ESTIMADOS: armar, enviar por correo, y que el cliente apruebe con un clic (UC-04 / UC-05) ---- */
  estHdr: () => {
    estSnap();
    const prop=val("eProp");
    if(prop!==S.estHdr.prop){ S.estHdr.prop=prop;   // cambiar de propiedad reinicia los contactos marcados
      const cs = contactosDe(prop);
      S.estHdr.contactos = cs.length? [cs[0].id] : [];
    }
    modalEst();
  },
  estConToggle: () => {
    estSnap();
    S.estHdr.contactos = Array.from(document.querySelectorAll("input.eCon:checked")).map(el=>el.value);
    modalEst();
  },
  estTarModo: d => { estSnap(); S.estHdr.tarModo=d.m; modalEst(); },
  estDepositoToggle: () => { estSnap(); modalEst(); },
  estDocAgregar: () => {
    estSnap();
    const nombre=val("eDocNombre"); if(!nombre) return;
    S.estHdr.docs=(S.estHdr.docs||[]).concat([nombre]);
    modalEst();
  },
  estDocQuitar: d => { estSnap(); S.estHdr.docs.splice(+d.i,1); modalEst(); },
  estAddLinea: () => {
    estSnap();
    let uid=val("eUni");
    if(uid==="__new__"){
      const numR = val("eUniNum"), bld = val("eUniBld");
      if(!numR){ toast("Falta el número","Escribe el número de la unidad nueva, o elige «— sin unidad específica —» si no aplica.","r"); return; }
      const tipoE = val("eUniTipo")||"Residencial";
      const bedroomsE = tipoE==="Residencial"?parseInt(val("eUniBedrooms"))||0:null, estudioE = chk("eUniEstudio"), livingRoomE = chk("eUniLivingRoom");
      const nueva = {id:"U"+nid("u"), prop:S.estHdr.prop, building:bld, unidadNum:numR, num:uNumComp(bld,numR),
        tipo:tipoE, bedrooms:bedroomsE, estudio:estudioE, livingRoom:livingRoomE, bathrooms:parseInt(val("eUniBathrooms"))||null,
        rooms:roomsDesde(tipoE,bedroomsE,estudioE,livingRoomE), pisos:parseInt(val("eUniPisos"))||1, detalle:[]};
      S.unidades.push(nueva); flash("uni:"+nueva.id);
      uid = nueva.id;
    }
    const tid = S.estHdr.tarModo==="propia" ? val("eTarProp") : val("eTarGen");
    const t=by(S.tarifas,tid);
    S.draftEst.push({unidad:uid||null,cat:t.cat||"",serv:t.serv||t.nombre,tarifa:tid,
      precio:t.precio,pago:t.pago||0,nivel:t.prop?"Propiedad":"General",cantidad:1,tax:t.tax||null});
    modalEst();
  },
  estDelLinea: d => { estSnap(); S.draftEst.splice(+d.i,1); modalEst(); },
  /* "Save draft" y "Send" hacen lo mismo: solo guardan. Mandar el correo de
     verdad es un paso aparte — el boton "Enviar" de la lista, con el
     composer editable — no algo que pasa solo al crear el estimado. */
  estGuardarBorrador: () => { estCrearEst(); },
  estGuardar: () => { estCrearEst(); },
  estVer: d => modalCorreo(d.id),
  estInvoice: d => modalInvoice(d.id),
  estEnviar: d => modalEnviarEst(d.id),
  /* Flujograma: "¿Cliente aprobó? NO → Modificar propuesta y reenviar al
     cliente" — reabre el mismo formulario cargado con lo que ya tenía. */
  estModificar: d => {
    const e = by(S.estimados, d.id);
    S.draftEst = e.lineas.map(l=>({...l}));
    S.estHdr = {editId:e.id, prop:e.prop, contactos:(e.contactos||[]).slice(),
      label:e.label, num:e.num, issueDate:e.fecha, expDate:e.vence, po:e.po||"",
      docs:(e.docs||[]).slice(), deposito:!!e.deposito, depositoMonto:e.depositoMonto||"",
      firma:!!e.firma, terminos:e.terminos||"", nota:e.nota||""};
    modalEst();
  },
  estEnviarOK: d => {
    const e=by(S.estimados,d.id);
    e.envAsunto=val("envAsunto");
    e.correoTexto=val("envCuerpo");
    e.estado="Enviado";
    cm();
    toast("✓ Estimado enviado",`<b>${esc(e.num)}</b> se mandó a ${contactosEst(e).map(c=>esc(c.nombre)).join(", ")}, con el Invoice adjunto.`,"v");
    render();
  },
  /* UC-05 — pedir y registrar el COI a la aseguradora */
  estCOI: d => {
    const e=by(S.estimados,d.id);
    ACC.coiDirecto({id:e.prop, est:e.num});
  },
  /* La aprobación ya no depende de que el cliente haga clic en nada — solo
     recibe el correo con el Invoice adjunto. Aprobar/Rechazar lo registra
     Cordova a mano cuando el contacto avisa, y siempre se pregunta el canal
     (modalMedioEst), igual que ya se hace con el trabajo adicional de WO. */
  estClienteOK: d => { modalMedioEst(d.id,"todo"); },
  estClienteNo: d => { modalMedioEst(d.id,"no"); },
  estMedioOK: d => {
    const e=by(S.estimados,d.id);
    ultimoEstTocado = e.num;
    const sello = () => ({medio:d.medio, quien:contactosEst(e).map(c=>c.nombre).join(", "), fecha:"2026-08-11 "+hora(), ip:null});
    if(d.tipo==="todo"){
      e.estado="Aprobado";
      e.aprob=sello();
      const p=P(e.prop); const era=p.estado;
      if(p.estado==="Prospect"){ p.estado="Active"; }
      toast("✓ El cliente aprobó",`<b>${esc(e.num)}</b> · ${esc(d.medio)}.`
        + (era==="Prospect"?` <b>${esc(p.nombre)}</b> dejó de ser prospecto y ya es cliente.`:""),"v");
      /* Flujograma: apenas aprueba, se pide el COI — no queda como boton
         suelto que alguien tiene que acordarse de tocar. */
      if(!coiVigente(e.prop)){ render(); ACC.coiDirecto({id:e.prop, est:e.num}); return; }
      cm();
    } else {
      e.estado="Rechazado";
      e.aprob=sello();
      cm();
      toast("Estimado rechazado",`${esc(e.num)} · el cliente no lo aprobó (${esc(d.medio)}). Queda registrado para el seguimiento comercial.`,"w");
    }
    render();
  },
  estIrExpediente: d => { const e=by(S.estimados,d.id); S.mod="propiedades"; S.sub=e.prop; S.tab="expediente"; render(); },
  /* Flujograma: «Enviar COI → Completar Expediente → ¿completo? → Transferir a
     Thalia» es UN solo camino a programación — antes esto creaba las Work
     Orders directo, sin pasar por el Expediente ni por Thalia, mientras que
     Propiedades tenía su propio camino aparte (transferir). Ahora los dos
     terminan en la misma solicitud que Thalia programa (solProgramar). */
  estAgendar: d => {
    const e=by(S.estimados,d.id);
    if(!expedienteOK(e.prop)){
      toast("🚫 Expediente incompleto",`<b>${esc(P(e.prop).nombre)}</b> todavía no tiene el Expediente completo (COI, Price List, contacto, etc). Complétalo antes de transferir a programación.`,"r"); return; }
    const nsol={id:"SOL"+Date.now(),prop:e.prop,cliente:P(e.prop).cliente,quien:S.usuario,hora:hora(),
      nota:`Desde el estimado ${e.num} — líneas ya aprobadas`,estado:"Pendiente",
      estimadoId:e.id, estimadoNum:e.num, lineas:lineasAprobDe(e).map(i=>e.lineas[i])};
    S.solicitudes.push(nsol); flash("sol:"+nsol.id);
    e.estado="Transferido";
    toast("✓ Transferido a programación",`<b>${esc(e.num)}</b> le llegó a Thalia con las líneas ya aprobadas — no hay que volver a escribir nada.`,"v");
    render();
  },

  propBaja: d => {
    const p=P(d.id); p.activa=!p.activa;
    const n=S.wos.filter(w=>w.prop===d.id).length;
    toast(p.activa?"Propiedad reactivada":"Propiedad dada de baja",
      p.activa?`<b>${esc(p.nombre)}</b> vuelve a estar disponible para agendar.`
              :`<b>${esc(p.nombre)}</b> deja de ofrecerse para trabajos nuevos. Sus ${n} Work Orders y su historial se conservan intactos.`,
      p.activa?"v":"w");
    render();
  },
  tecBaja: d => {
    const t=T(d.id); t.activo=!t.activo;
    const n=S.wos.filter(w=>w.tec===d.id).length;
    toast(t.activo?"Técnico reactivado":"Técnico dado de baja",
      t.activo?`<b>${esc(tecN(d.id))}</b> vuelve a aparecer al asignar.`
              :`<b>${esc(tecN(d.id))}</b> deja de aparecer al asignar. Sus ${n} trabajos, su asistencia y sus pagos se conservan.`,
      t.activo?"v":"w");
    render();
  },

  /* ═══ GUSTAVO — sigue su flujograma de Supervisión ═══ */
  /* «Reunirse con Mantenimiento: revisar prioridades, confirmar unidades, resolver dudas» */
  visitaModal: d => {
    const p=P(d.prop);
    const ws=S.wos.filter(w=>w.prop===d.prop && ["In progress","Esperando aprobación","Completed"].includes(w.estado));
    modal(`<div class="mh"><h3>Visita a ${esc(p.nombre)}</h3><p>${esc(p.zona)} · ${esc(p.dir)}</p></div>
    <div class="mb">
      <div style="font-size:11px;font-weight:750;text-transform:uppercase;letter-spacing:.05em;color:var(--faint);margin-bottom:7px">Supervisar los trabajos</div>
      ${ws.length?ws.map(w=>`<div style="display:flex;align-items:center;gap:9px;padding:8px 0;border-bottom:1px solid var(--line)">
        <input type="checkbox" id="sv${w.id}" checked style="width:16px;height:16px">
        <div style="flex:1;min-width:0"><div style="font-weight:650;font-size:12.5px">${esc(U(w.unidad).num)} · ${esc(w.serv)}</div>
          <div style="font-size:10.5px;color:var(--faint)">${esc(w.cat)} · ${esc(tecN(w.tec))} · ${w.evid} foto(s)</div></div>
        <span class="pill ${estP(w.estado)}">${esc(w.estado)}</span></div>`).join("")
      :`<div class="empty" style="padding:16px">Sin trabajos en curso en esta propiedad</div>`}

      <div class="fld" style="margin-top:14px"><label>Lo acordado con mantenimiento <span class="req">*</span></label>
        <textarea id="vAc" placeholder="Prioridades, unidades confirmadas, dudas resueltas…"></textarea>
        <div class="hint">Esto hoy vive solo en tu memoria. Aquí queda contra la propiedad, para quien atienda después.</div></div>
      <div class="fld"><label>¿Falta material o pintura?</label>
        <input id="vMat" placeholder="Déjalo vacío si no falta nada"></div>
    </div>
    <div class="mf"><button class="btn" data-a="cm">Cancelar</button>
      <button class="btn p" data-a="visitaOK" data-prop="${d.prop}">Registrar visita</button></div>`,true);
  },
  visitaOK: d => {
    const ac=val("vAc");
    if(!ac){ marcaFalta(["vAc"]); toast("Falta lo acordado","Sin eso la visita no sirve de registro.","r"); return; }
    const p=P(d.prop);
    S.visitas.push({id:"V"+Date.now(),tipo:"Supervisión",prop:d.prop,fecha:"2026-08-11",hora:hora(),
      quien:S.usuario,acuerdos:ac,material:val("vMat"),estado:"Cerrada"});
    if(val("vMat")){
      S.excepciones.push({id:"X"+Date.now(),tipo:"Falta de material en sitio",wo:null,
        motivo:`${p.nombre}: ${val("vMat")} — reportado por ${S.usuario} en visita`,
        monto:null,pide:S.usuario,aprueba:"Erika",estado:"Pendiente",fecha:"2026-08-11",resol:null});
    }
    cm();
    toast("✓ Visita registrada",`<b>${esc(p.nombre)}</b> · lo acordado con mantenimiento queda en el expediente.`
      + (val("vMat")?` Y el faltante de material entró como excepción para Operaciones.`:""),"v");
    render();
  },

  /* «Crear devolución (Fotos + observaciones) → Enviar reporte a THALIA»
     Esta era la mitad del hueco H-10: solo pedía el motivo y nunca creaba
     el registro real en S.devoluciones — así que el descuento en la nómina,
     el bloqueo de facturación y el touch-up nunca se disparaban si Gustavo
     devolvía el trabajo desde aquí (el camino de escritorio, el más a
     mano) en vez de desde su celular. Ahora pide lo mismo que el celular
     y crea la misma devolución real — un solo resultado, dos puertas. */
  devolverModal: d => {
    const w=W(+d.id);
    modal(`<div class="mh"><h3>Devolver WO-${w.id}</h3>
      <p>${esc(P(w.prop).nombre)} · ${esc(U(w.unidad).num)} · ${esc(tecN(w.tec))}</p></div>
    <div class="mb">
      <div class="fld"><label>¿Qué no cumple? <span class="req">*</span></label>
        <textarea id="dvM" placeholder="Qué quedó mal y qué hay que corregir"></textarea></div>
      <div class="fg c2">
        <div class="fld"><label>¿Dónde? <span class="req">*</span></label>
          <select id="dvA">${activos("ubicaciones").map(u=>`<option>${esc(u)}</option>`).join("")}</select></div>
        <div class="fld"><label>Causa <span class="req">*</span></label>
          <select id="dvC" data-a="devCausaRef">
            ${Object.keys(CAUSAS_DEV).map(c=>`<option>${esc(c)}</option>`).join("")}</select></div></div>
      <div class="note w" id="dvExp">${causaDe(Object.keys(CAUSAS_DEV)[0]).ex}</div>
      <div class="fg c2">
        <div class="fld"><label>Prioridad</label><select id="dvP">${PRIOR_DEV.map(p=>`<option ${p==="Alta"?"selected":""}>${esc(p)}</option>`).join("")}</select></div>
        <div class="fld"><label>Fecha límite</label><input type="date" id="dvL" value="2026-08-14"></div></div>
      <div class="fld"><label>Foto de la observación</label>
        <div class="dph" style="height:96px;margin:0">📷 foto tomada en sitio · se adjunta sola</div></div>
      <div class="note w">Le llega a <b>Thalia</b> para corrección o reagendamiento, y queda contado como devolución de <b>${esc(tecN(w.tec))}</b>.</div>
    </div>
    <div class="mf"><button class="btn" data-a="cm">Cancelar</button>
      <button class="btn" style="border-color:var(--rojo);color:var(--rojo)" data-a="devolverOK" data-id="${w.id}">Devolver el trabajo</button></div>`);
  },
  devolverOK: d => {
    const w=W(+d.id), m=val("dvM"), area=val("dvA"), causa=val("dvC");
    if(!m){ marcaFalta(["dvM"]); toast("Falta el motivo","Sin decir qué está mal, el técnico no sabe qué corregir.","r"); return; }
    w.estado="Returned"; w.devuelta=(w.devuelta||0)+1; w.motivoDev=m; w.evid++; flash("wo:"+w.id);
    w.hist.push([hora(),`Devuelta por supervisión: ${m}`,S.usuario]);
    // El registro real — el mismo que crea gDevOK desde el celular — para que
    // el descuento, el bloqueo de facturación y el touch-up sí se disparen.
    const dv = {id:"DV"+Date.now(), prop:w.prop, unidad:w.unidad, wo:w.id, area,
      desc:m, causa, responsable:w.tec, prioridad:val("dvP")||"Alta",
      fechaRep:HOY_SUP, fechaLimite:val("dvL")||"2026-08-14", estado:"Abierta",
      lotesAntes:[{amb:area,n:1}], lotesDespues:[], verifica:null, quien:S.usuario,
      hist:[[hora(),"Devolución creada desde revisión de supervisión",S.usuario]]};
    S.devoluciones.push(dv); flash("dv:"+dv.id);
    cm();
    toast("Trabajo devuelto",`WO-${w.id} le llegó a <b>Thalia</b> para corregir o reagendar. Va como devolución ${w.devuelta} de <b>${esc(tecN(w.tec))}</b>. ${causaDe(causa).ex}`,"w");
    noti("Trabajo devuelto",`${P(w.prop).nombre} · ${U(w.unidad).num}: ${m}`);
    render();
  },

  /* «Tomar fotografías, medidas y notas → Enviar a CLAUDIA para el estimado» */
  inspPedirModal: d => modal(`<div class="mh"><h3>Pedir inspección en sitio</h3>
      <p>${esc(P(d.prop).nombre)} — para poder cotizar hay que ir a medir</p></div>
    <div class="mb"><div class="fld"><label>¿Qué hay que relevar? <span class="req">*</span></label>
      <textarea id="ipQ">Medir los ambientes a pintar y fotografiar el estado actual.</textarea></div>
      <div class="note">Le entra a Gustavo en su agenda por el mismo canal que el resto de su trabajo, no por un mensaje aparte.</div></div>
    <div class="mf"><button class="btn" data-a="cm">Cancelar</button>
      <button class="btn p" data-a="inspPedir" data-prop="${d.prop}">Solicitar</button></div>`),
  inspPedir: d => {
    const p=P(d.prop);
    S.visitas.push({id:"I"+Date.now(),tipo:"Inspección",prop:d.prop,fecha:"2026-08-11",hora:hora(),
      quien:S.usuario,pide:val("ipQ")||"Medir y fotografiar antes de cotizar",estado:"Pendiente",ambientes:null});
    cm(); toast("✓ Inspección solicitada",`<b>${esc(p.nombre)}</b> le entró a Gustavo en su agenda, por el mismo canal que el resto de su trabajo.`,"v");
    render();
  },
  inspModal: d => {
    const v=S.visitas.find(x=>x.id===d.id), p=P(v.prop);
    modal(`<div class="mh"><h3>Inspección en ${esc(p.nombre)}</h3><p>${esc(v.pide)}</p></div>
    <div class="mb">
      <div class="note">Registra por ambiente. Claudia cotiza con esto ya cargado, sin pedirlo ni transcribirlo.</div>
      ${["Sala","Bano","Cocina","Room"].map((amb,i)=>`
        <div style="border:1px solid var(--line);border-radius:9px;padding:10px 12px;margin-top:10px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:7px">
            <input type="checkbox" id="ia${i}" ${i<2?"checked":""} style="width:16px;height:16px">
            <b style="font-size:12.5px">${amb}</b></div>
          <div class="fg c2">
            <div class="fld" style="margin:0"><label>Medidas</label><input id="im${i}" placeholder="ej. 3.2 × 4.1 m"></div>
            <div class="fld" style="margin:0"><label>Nota</label><input id="in${i}" placeholder="qué se necesita"></div></div>
          <div class="dph s" style="margin-top:8px">📷 foto del ambiente</div>
        </div>`).join("")}
    </div>
    <div class="mf"><button class="btn" data-a="cm">Cancelar</button>
      <button class="btn p" data-a="inspOK" data-id="${d.id}">Cerrar inspección y avisar a Claudia</button></div>`,true);
  },
  inspOK: d => {
    const v=S.visitas.find(x=>x.id===d.id);
    const ambs=["Sala","Bano","Cocina","Room"].map((a,i)=>chk("ia"+i)?{amb:a,med:val("im"+i),nota:val("in"+i)}:null).filter(Boolean);
    if(!ambs.length){ toast("Marca al menos un ambiente","","r"); return; }
    v.ambientes=ambs; v.estado="Cerrada"; v.cierre=hora();
    cm();
    toast("✓ Inspección cerrada",`${ambs.length} ambiente(s) con medidas y fotos, guardados contra <b>${esc(P(v.prop).nombre)}</b>. Claudia ya puede cotizar.`,"v");
    render();
  },
  inspVer: d => {
    const v=S.visitas.find(x=>x.id===d.id);
    modal(`<div class="mh"><h3>Inspección · ${esc(P(v.prop).nombre)}</h3><p>Cerrada ${esc(v.cierre||v.hora)} por ${esc(v.quien)}</p></div>
    <div class="mb"><table><thead><tr><th>Ambiente</th><th>Medidas</th><th>Nota</th><th>Foto</th></tr></thead>
      <tbody>${(v.ambientes||[]).map(a=>`<tr><td style="font-weight:650">${esc(a.amb)}</td>
        <td class="mono">${esc(a.med)||"—"}</td><td>${esc(a.nota)||"—"}</td>
        <td><span class="pill v">📷</span></td></tr>`).join("")}</tbody></table>
      <div class="tr">Queda contra la propiedad, disponible para cotizar y para cualquier consulta después.</div></div>
    <div class="mf"><button class="btn" data-a="cm">Cerrar</button></div>`);
  },

  /* «Elaborar Reporte Diario → Entregar a CLAUDIA» */
  reporteEnviar: () => {
    const hoy="2026-08-11";
    const vis=S.visitas.filter(v=>v.fecha===hoy);
    const dev=S.wos.filter(w=>w.devuelta).length;
    const apro=S.wos.filter(w=>w.supervisada).length;
    toast("✓ Reporte diario enviado a Claudia",
      `${vis.filter(v=>v.tipo==="Supervisión").length} visita(s), ${apro} aprobados, ${dev} devuelto(s), `
      + `${vis.filter(v=>v.tipo==="Inspección"&&v.estado==="Cerrada").length} inspección(es). `
      + `Con fotos, observaciones y materiales requeridos.`,"v");
    render();
  },

  /* «yo creo la lista de precios de la propiedad» — se parte de la general y se ajusta */
  preciosDesdeGeneral: d => {
    const gen = S.tarifas.filter(t=>!t.prop);
    if(!gen.length){ toast("No hay tarifa general","Carga primero el tarifario general.","r"); return; }
    gen.forEach(t=>S.tarifas.push({...t, id:"TR"+Date.now()+Math.random().toString(36).slice(2,6), prop:d.id}));
    toast("✓ Lista de precios creada",
      `<b>${esc(P(d.id).nombre)}</b> arrancó con ${gen.length} precios copiados de la general. Ajusta los que negociaron distinto — los que dejes igual dan lo mismo.`,"v");
    S.tab="precios"; render();
  },
  /* Un certificado (ACORD 25) trae varias pólizas — se editan como lista, igual
     que las líneas de un estimado: se arma en S.draftPolizas y se guarda todo junto.
     S.coiTocados guarda qué tipos se agregaron/editaron en esta sesión, para que el
     historial cuente solo lo que de verdad cambió — no todas las pólizas de golpe. */
  coiDirecto: d => { const p=P(d.id);
    S.coiPropId=d.id; S.coiEst=d.est||"";
    if(!d.keep){ S.draftPolizas=(p.polizas||[]).map(x=>({...x})); S.coiTocados=new Set(); }
    /* El select de Tipo siempre abre en la primera opcion: si esa ya existe en el
       borrador, se precarga para no dejarla en blanco sin haber tocado nada. */
    const pre = S.draftPolizas.find(x=>x.tipo===POLIZA_TIPOS[0]);
    modal(`<div class="mh"><h3>Registrar / editar pólizas</h3><p>${esc(p.nombre)} — las emite la aseguradora, no Cordova</p></div>
    <div class="mb">
      ${d.est?`<div class="note r"><b>Esta propiedad no tiene COI vigente.</b> Mientras falte, el estimado <b>${esc(d.est)}</b> no puede pasar a programación.</div>`:""}
      ${S.draftPolizas.length?`<table style="border:1px solid var(--line);border-radius:9px;overflow:hidden">
        <thead><tr><th>Tipo</th><th>Aseguradora</th><th>Póliza</th><th>Vence</th><th></th></tr></thead>
        <tbody>${S.draftPolizas.map((x,i)=>`<tr>
          <td>${esc(x.tipo)}</td><td>${esc(x.aseguradora)||"—"}</td><td class="mono">${esc(x.poliza)||"—"}</td>
          <td><span class="pill ${x.vence&&x.vence>=HOY_SUP?"v":"r"}">${esc(x.vence)||"—"}</span></td>
          <td style="text-align:right;white-space:nowrap"><button class="btn sm" data-a="coiEditPoliza" data-i="${i}">Corregir</button>
          <button class="btn sm" data-a="coiDelPoliza" data-i="${i}">Quitar</button></td></tr>`).join("")}
        </tbody></table>`:`<div class="empty" style="border:1px dashed var(--line);border-radius:9px">Todavía sin pólizas. Agrega la primera abajo.</div>`}
      <div style="border:1px solid var(--line);border-radius:9px;padding:11px;margin-top:12px;background:var(--surface-2)">
        <div style="font-size:11px;font-weight:750;text-transform:uppercase;letter-spacing:.05em;color:var(--faint);margin-bottom:8px" id="coiFormTitulo">${pre?"Corregir "+esc(pre.tipo):"Agregar póliza"}</div>
        <div class="fg c2">
          <div class="fld" style="margin-bottom:0"><label>Tipo</label><select id="coiT" data-a="coiTipoCambio">${POLIZA_TIPOS.map(t=>`<option ${pre&&t===pre.tipo?"selected":""}>${t}</option>`).join("")}</select></div>
          <div class="fld" style="margin-bottom:0"><label>Vence <span class="req">*</span></label><input type="date" id="coiV" value="${pre?esc(pre.vence):"2026-12-31"}"></div></div>
        <div class="fg c2" style="margin-top:9px">
          <div class="fld" style="margin-bottom:0"><label>Aseguradora</label><input id="coiA" placeholder="nombre" value="${pre?esc(pre.aseguradora):""}"></div>
          <div class="fld" style="margin-bottom:0"><label>Póliza</label><input id="coiP" class="mono" value="${pre?esc(pre.poliza):""}"></div></div>
        <button class="btn p sm" style="margin-top:9px" data-a="coiAddPoliza">+ Agregar / guardar cambio</button>
      </div>
      <div class="fld" style="margin-top:12px"><label>Certificado en PDF <span style="text-transform:none;font-weight:500;color:var(--faint)">— opcional, uno solo para todas las pólizas</span></label>
        <div style="display:flex;align-items:center;gap:9px">
          <button class="btn sm" data-a="coiAdj">Adjuntar certificado</button>
          <span id="coiPdfN" style="font-size:11.5px;color:${S.coiPdf?"var(--verde)":"var(--faint)"}">${S.coiPdf?"📎 "+esc(S.coiPdf):(p.coiPdf?"📎 "+esc(p.coiPdf)+" (ya adjunto)":"sin archivo")}</span></div></div>
      <div class="note">Sin que todas las pólizas estén vigentes, el sistema no deja mandar a nadie a trabajar a esta propiedad.</div></div>
    <div class="mf"><button class="btn" data-a="cm">Cancelar</button>
      <button class="btn p" data-a="coiOK" ${S.draftPolizas.length?"":"disabled"}>Guardar</button></div>`,true); },
  /* Clic en "Corregir" de una fila carga esa póliza en el formulario de abajo. */
  coiEditPoliza: d => {
    const x = S.draftPolizas[+d.i]; if(!x) return;
    document.getElementById("coiT").value = x.tipo;
    document.getElementById("coiA").value = x.aseguradora||"";
    document.getElementById("coiP").value = x.poliza||"";
    document.getElementById("coiV").value = x.vence||"";
    const t = document.getElementById("coiFormTitulo"); if(t) t.textContent = "Corregir "+x.tipo;
  },
  /* Elegir en el select un tipo que ya está en el borrador también lo precarga —
     así cambiar solo la fecha no borra aseguradora ni póliza por accidente. */
  coiTipoCambio: () => {
    const ex = S.draftPolizas.find(x=>x.tipo===val("coiT"));
    const a=document.getElementById("coiA"), pol=document.getElementById("coiP"), v=document.getElementById("coiV");
    if(ex){ a.value=ex.aseguradora||""; pol.value=ex.poliza||""; v.value=ex.vence||""; }
    else { a.value=""; pol.value=""; v.value="2026-12-31"; }
    const t = document.getElementById("coiFormTitulo"); if(t) t.textContent = ex?"Corregir "+val("coiT"):"Agregar póliza";
  },
  coiAddPoliza: () => {
    if(!val("coiV")){ marcaFalta(["coiV"]); toast("Falta la fecha","Sin vencimiento la póliza no sirve.","r"); return; }
    const nueva = {tipo:val("coiT"),aseguradora:val("coiA"),poliza:val("coiP"),vence:val("coiV")};
    const i = S.draftPolizas.findIndex(x=>x.tipo===nueva.tipo);
    if(i>-1) S.draftPolizas[i]=nueva; else S.draftPolizas.push(nueva);
    S.coiTocados.add(nueva.tipo);
    ACC.coiDirecto({id:S.coiPropId, est:S.coiEst, keep:true});
  },
  coiDelPoliza: d => { S.draftPolizas.splice(+d.i,1); ACC.coiDirecto({id:S.coiPropId, est:S.coiEst, keep:true}); },
  /* No llama a render(): reconstruir el modal borraría lo que ya se escribió. Solo cambia la etiqueta. */
  coiAdj: () => {
    S.coiPdf = S.coiPdf ? null : "COI_Cordova_Property_Services.pdf";
    const e = document.getElementById("coiPdfN");
    if(e){
      e.textContent = S.coiPdf ? "📎 " + S.coiPdf : "sin archivo";
      e.style.color = S.coiPdf ? "var(--verde)" : "var(--faint)";
    }
  },

  coiOK: () => {
    /* Si el usuario corrigió el mini-formulario y le dio directo a Guardar, sin pasar
       por "+ Agregar", eso no puede perderse en silencio: se aplica igual aquí. */
    if(document.getElementById("coiT") && val("coiV")){
      const pend = {tipo:val("coiT"),aseguradora:val("coiA"),poliza:val("coiP"),vence:val("coiV")};
      const igual = S.draftPolizas.find(x=>x.tipo===pend.tipo && x.aseguradora===pend.aseguradora
        && x.poliza===pend.poliza && x.vence===pend.vence);
      if(!igual){
        const i = S.draftPolizas.findIndex(x=>x.tipo===pend.tipo);
        if(i>-1) S.draftPolizas[i]=pend; else S.draftPolizas.push(pend);
        S.coiTocados.add(pend.tipo);
      }
    }
    if(!S.draftPolizas.length){ toast("Sin pólizas","Agrega al menos una antes de guardar.","r"); return; }
    const p=P(S.coiPropId);
    /* Solo es "renovación" si ya había algo guardado antes Y de verdad se tocó algo.
       El primer registro no tiene nada que renovar, y si solo quitaste una fila sin
       agregar ni corregir ninguna, tampoco hay nada que "renovar" que contar. */
    const habiaAntes = !!(p.polizas && p.polizas.length);
    const tocadas = S.coiTocados || new Set();
    const esRenovacion = habiaAntes && tocadas.size>0;
    const previas = p.polizas || [];  // el "antes" de cada tocada, antes de pisarlo
    p.polizas=S.draftPolizas.slice();
    if(S.coiPdf) p.coiPdf=S.coiPdf;
    if(esRenovacion){
      /* Igual que la Bitácora en el resto del sistema: se guarda el valor de antes
         de cada póliza tocada, no solo el resultado final. */
      const conAntes = p.polizas.filter(x=>tocadas.has(x.tipo)).map(x=>{
        const antes = previas.find(y=>y.tipo===x.tipo);
        return {...x, venceAntes: (antes && antes.vence!==x.vence) ? antes.vence : null};
      });
      p.coiHist=(p.coiHist||[]).concat([{polizas:conAntes,
        pdf:p.coiPdf||null, quien:S.usuario, hora:hora(), fecha:HOY_SUP}]);
    }
    S.coiPdf=null; S.draftPolizas=[]; S.coiTocados=new Set();
    flash("prop:"+p.id);
    cm(); toast(esRenovacion?"✓ Pólizas renovadas":"✓ Pólizas registradas",
      `<b>${esc(p.nombre)}</b> · ${p.polizas.length} póliza(s). Registrado por ${S.usuario}.`
      + (p.coiPdf?` Con el certificado adjunto: se le puede mandar al manager sin buscarlo en el correo.`
                 :` <b>Sin PDF adjunto</b> — se puede agregar después.`),"v"); render();
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

  excNueva: () => modalExc(),
  excGuardar: () => {
    if(marcaFalta(["xMo"])){ toast("Falta el motivo","Sin motivo nadie puede decidir.","r"); return; }
    const nx={id:"X"+Date.now(), tipo:val("xT"), wo:val("xW")?+val("xW"):null,
      motivo:val("xMo"), monto:parseFloat(val("xM"))||null, pide:S.usuario, aprueba:val("xA"),
      estado:"Pendiente", fecha:"2026-08-11", creada:{quien:S.usuario,hora:hora()}, resol:null};
    S.excepciones.push(nx); flash("exc:"+nx.id);
    cm(); toast("Excepción levantada",`Le quedó a <b>${esc(nx.aprueba)}</b> para decidir. ${nx.wo?`WO-${nx.wo} no se paga ni se factura hasta resolverla.`:"No es de una WO puntual, así que frena toda la nómina y facturación hasta resolverla."}`,"w"); render();
  },
  excAprob: d => {
    const x = by(S.excepciones,d.id);
    if(x){ x.estado="Aprobada"; x.resol={quien:S.usuario,hora:hora()}; flash("exc:"+x.id);
      toast("✓ Excepción aprobada",`${esc(x.tipo)} — autorizada por ${S.usuario}. Queda registrado quién y cuándo.`,"v");
      render(); return; }
    const sa = solTodas().find(z=>"AUTO-A"+z.sol===d.id);
    if(sa){ modalMedio(sa.sol); return; }         // el adicional pregunta CÓMO aprobó el cliente
    const a = excAuto().find(y=>y.id===d.id);
    if(a){
      S.excepciones.push({...a, id:"X"+Date.now(), auto:false, estado:"Aprobada", resol:{quien:S.usuario,hora:hora()}});
      if(a.tipo==="Cierre sin evidencia"){ const w=W(a.wo); if(w) w.evidExcusada=true; }
    }
    toast("✓ Excepción resuelta","Queda el registro de quién la autorizó.","v");
    render();
  },
  /* Salir de aquí sin decidir deja al técnico parado en la propiedad. Antes se
     cerraba en silencio y no había forma de saber por qué seguía frenada. */
  medioNo: d => { const w=W(+d.wo); cm();
    toast("⚠ Quedó sin decidir",
      `WO-${w.id} sigue en <b>Esperando aprobación</b> y <b>${esc(tecN(w.tec))}</b> no puede avanzar hasta que alguien decida.
       La tienes en <b>Excepciones</b>.`,"w");
    render(); },
  medioOK: d => {
    const s = solTodas().find(z=>z.sol===d.sol), w = W(s.wo);
    const pend = s.lineas.filter(l=>l.estado==="Pendiente");
    // Con un solo concepto no hay tildes que leer: se aprueba entero.
    const chks = Array.from(document.querySelectorAll(".adchk"));
    const marc = new Set(chks.filter(c=>c.checked).map(c=>+c.dataset.lid));
    const ok = chks.length ? pend.filter(l=>marc.has(l.id)) : pend;
    const no = chks.length ? pend.filter(l=>!marc.has(l.id)) : [];
    const sello = ip => ({medio:d.medio, quien:S.usuario, hora:hora(), ip});
    ok.forEach(l=>{ l.estado="Aprobado"; l.aprob=sello(d.medio==="Enlace digital"?"72.14.201.38":null);
      (l.hist=l.hist||[]).push([hora(), `Aprobada por ${d.medio.toLowerCase()}`, S.usuario]); });
    no.forEach(l=>{ l.estado="Rechazado"; l.aprob=sello(null);
      (l.hist=l.hist||[]).push([hora(), "Rechazada", S.usuario]); });
    // Se destraba solo si NO queda ninguna otra solicitud sin decidir: si el
    // técnico mandó dos y se aprueba una, la orden sigue frenada por la otra.
    const quedan = S.adicionales.filter(a=>a.wo===w.id && a.estado==="Pendiente").length;
    if(w.estado==="Esperando aprobación" && !quedan) w.estado="In progress";
    flash("wo:"+w.id);
    const nom = a => a.map(l=>l.concepto).join(", ");
    if(ok.length) w.hist.push([hora(), `Adicional aprobado por ${d.medio.toLowerCase()} · ${nom(ok)}`, S.usuario]);
    if(no.length) w.hist.push([hora(), `Adicional NO aprobado · ${nom(no)}`, S.usuario]);
    cm();
    const sustento = d.medio==="Enlace digital"
      ? "Queda el clic real del cliente con hora e IP."
      : `Registrado como <b>${esc(d.medio)}</b>: queda quién y cuándo, pero sin clic del cliente.`;
    toast(no.length ? (ok.length?"Adicional aprobado en parte":"Adicional no aprobado") : "✓ Adicional aprobado",
      `${ok.length?`Sí: <b>${esc(nom(ok))}</b>. `:""}${no.length?`No: <b>${esc(nom(no))}</b>. `:""}${sustento} `
      + (quedan
          ? `<b>Ojo: WO-${w.id} sigue frenada</b> — hay otra solicitud del técnico sin decidir.`
          : `<b>${esc(tecN(w.tec))}</b> ya fue avisado y puede seguir.`),
      (no.length||quedan)?"w":"v");
    noti(no.length ? (ok.length?"Adicional aprobado en parte":"Adicional NO aprobado") : "Adicional aprobado",
      `${ok.length?`Haz: ${nom(ok)}. `:""}${no.length?`NO hagas: ${nom(no)}. `:""}Lo decidió ${S.usuario} (${d.medio.toLowerCase()}).`, false);
    if(!quedan) avisar("Thalia","WO destrabada",
      `WO-${w.id} · ${esc(P(w.prop).nombre)} ${esc(U(w.unidad).num)} ya se decidió. <b>${esc(tecN(w.tec))}</b> puede seguir.`,"v");
    render();
  },
  excRech: d => {
    const x = by(S.excepciones,d.id);
    if(x){ x.estado="Rechazada"; x.resol={quien:S.usuario,hora:hora()}; flash("exc:"+x.id);
      toast("Excepción rechazada","Queda registrado que no se autorizó.","w"); render(); return; }
    const sa = solTodas().find(z=>"AUTO-A"+z.sol===d.id);
    if(sa){
      const w = W(sa.wo);
      const pend = sa.lineas.filter(l=>l.estado==="Pendiente");
      pend.forEach(l=>{ l.estado="Rechazado"; l.aprob={medio:"—",quien:S.usuario,hora:hora(),ip:null};
        (l.hist=l.hist||[]).push([hora(), "Rechazada", S.usuario]); });
      if(w.estado==="Esperando aprobación"
         && !S.adicionales.some(a=>a.wo===w.id && a.estado==="Pendiente")) w.estado="In progress";
      flash("wo:"+w.id);
      const nom = pend.map(l=>l.concepto).join(", ");
      w.hist.push([hora(),`Adicional no aprobado · ${nom}`,S.usuario]);
      toast("Adicional rechazado",`No se autorizó <b>${esc(nom)}</b>. <b>${esc(tecN(w.tec))}</b> ya fue avisado de que no lo ejecute; puede seguir con el trabajo original.`,"w");
      noti("Adicional NO aprobado",`${S.usuario} no autorizó ${nom}. No lo ejecutes, sigue con lo original.`,false);
      render(); return;
    }
    const a=excAuto().find(y=>y.id===d.id);
    if(a) S.excepciones.push({...a,id:"X"+Date.now(),auto:false,estado:"Rechazada",resol:{quien:S.usuario,hora:hora()}});
    toast("Excepción rechazada","Queda registrado que no se autorizó.","w"); render();
  },
  /* «arrojar un documento de: esto es todo lo que hiciste y se te va a pagar tanto» */
  comprobante: d => {
    const t = T(d.tec);
    const ws = S.wos.filter(w=>w.tec===d.tec && w.semana===S.semana && w.estado==="Completed");
    const tot = ws.reduce((a,w)=>a+(egresoWO(w)||0),0);
    const extra = S.excepciones.filter(x=>x.estado==="Aprobada" && x.tipo==="Pago adicional al técnico"
                  && ws.some(w=>w.id===x.wo));
    const totExtra = extra.reduce((a,x)=>a+(x.monto||0),0);
    modal(`<div class="mh"><h3>Comprobante de pago</h3>
      <p>${esc(tecN(d.tec))} · semana ${S.semana} de 2026</p></div>
    <div class="mb">
      <div style="border:1px solid var(--line);border-radius:10px;overflow:hidden">
        <div style="background:var(--azul);color:#fff;padding:13px 15px;display:flex;align-items:center;gap:10px">
          <div style="width:30px;height:30px;border-radius:7px;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px">CPS</div>
          <div><div style="font-weight:750">Cordova Property Services</div>
            <div style="font-size:11px;opacity:.85">Resumen de trabajo · semana ${S.semana}</div></div>
          <div style="margin-left:auto;text-align:right">
            <div style="font-size:10.5px;opacity:.85">Total a pagar</div>
            <div class="mono" style="font-size:20px;font-weight:750">${money(tot+totExtra)}</div></div></div>
        <table><thead><tr><th>Fecha</th><th>Propiedad · Unidad</th><th>Servicio</th><th class="num">Pago</th></tr></thead>
        <tbody>${ws.map(w=>`<tr><td class="mono">${w.fecha.slice(5)}</td>
          <td>${esc(P(w.prop).nombre)} · ${esc(U(w.unidad).num)}</td>
          <td>${esc(w.serv)}<div style="font-size:10.5px;color:var(--faint)">${esc(U(w.unidad).rooms)}</div></td>
          <td class="num mono">${egresoWO(w)!==null?money(egresoWO(w)):'<span class="pill w">NA</span>'}</td></tr>`).join("")
          ||`<tr><td colspan="4" class="empty">Sin trabajos terminados esta semana</td></tr>`}
        ${extra.map(x=>`<tr style="background:var(--ambar-cl)"><td class="mono">—</td>
          <td colspan="2">Pago adicional aprobado · WO-${x.wo}<div style="font-size:10.5px;color:var(--ambar)">${esc(x.motivo.slice(0,70))}</div></td>
          <td class="num mono">${money(x.monto)}</td></tr>`).join("")}
        <tr style="background:var(--surface-2);font-weight:750"><td colspan="3">Total semana ${S.semana}</td>
          <td class="num mono" style="font-size:15px">${money(tot+totExtra)}</td></tr></tbody></table>
      </div>
      <div class="note" style="margin-top:12px">Solo para uso interno de oficina — el técnico no ve montos en su celular.</div>
    </div>
    <div class="mf"><button class="btn p" data-a="cm">Cerrar</button></div>`,true);
  },

  pagarSemana: () => {
    // Reunión Claudia (feedback prototipo): una excepción ya no frena a todo
    // el mundo — solo a la WO que tiene la excepción. El resto del período
    // se paga igual. Y el período mismo ya no es solo "la semana actual".
    const todas=S.wos.filter(w=>enPeriodo(w.fecha,S.periodo)&&w.estado==="Completed"&&w.validada&&!w.pagadaTec);
    const bloqueadas=todas.filter(w=>woBloqueada(w.id));
    const ws=todas.filter(w=>!woBloqueada(w.id));
    if(!ws.length){ toast("🚫 Nada para pagar",
      bloqueadas.length?`${bloqueadas.length} Work Order(s) con excepción sin resolver — es todo lo que hay pendiente en este período.`:"No hay Work Orders listas para pagar.","r"); return; }
    const tot=ws.reduce((a,w)=>a+(egresoWO(w)||0),0);
    S.nomina.push({semana:S.semana, periodo:{...S.periodo}, wos:ws.map(w=>w.id), total:tot, quien:S.usuario, hora:hora()});
    ws.forEach(w=>{w.pagadaTec=true; w.hist.push([hora(),`Pagada al técnico en nómina — ${periodoTexto(S.periodo)}`,S.usuario]);});
    toast("✓ Nómina aprobada",
      `${periodoTexto(S.periodo)} · ${money(tot)} a ${new Set(ws.map(w=>w.tec)).size} técnicos.`
      + (bloqueadas.length?` <b>${bloqueadas.length} WO(s) quedaron afuera</b> por excepción sin resolver — se pagan cuando se resuelva.`:""),"v"); render();
  },
  facturar: d => {
    const todas=S.wos.filter(w=>enPeriodo(w.fecha,S.periodo)&&w.estado==="Completed"&&w.supervisada&&w.validada&&!w.facturada&&w.prop===d.prop);
    const bloqueadas=todas.filter(w=>woBloqueada(w.id));
    const ws=todas.filter(w=>!woBloqueada(w.id));
    if(!ws.length){ toast("🚫 No se puede facturar",
      bloqueadas.length?"Todas las WO listas de esta propiedad tienen una excepción sin resolver.":"No hay Work Orders listas para facturar.","r"); return; }
    if(ws.some(w=>ingresoWO(w)===null)){ toast("🚫 Hay líneas sin tarifa","No se factura con «NA».","r"); return; }
    const tot=ws.reduce((a,w)=>a+ingresoWO(w),0);
    const num="INV-2026-"+String(1040+(++ID.f-600)).padStart(4,"0");
    /* El PDF se genera y queda guardado con la factura. Enviarlo al cliente
       es otra cosa, y es opcional: puede quedarse archivada sin enviar. */
    S.facturas.unshift({id:"F"+ID.f,num,prop:d.prop,lineas:ws.map(w=>w.id),total:tot,
      emision:"2026-08-11",vence:"2026-09-10",estado:"Emitida",
      pdf:num+".pdf", pdfHora:hora(), pdfQuien:S.usuario, seguimiento:[]});
    flash("fac:F"+ID.f);
    ws.forEach(w=>{ w.facturada=true; w.hist.push([hora(),"Facturada en "+num,S.usuario]); });
    toast("✓ Factura generada y guardada",
      `<b>${num}</b> · ${esc(P(d.prop).nombre)} · ${ws.length} líneas · ${money(tot)}.<br><br>`
      + `El <b>PDF quedó guardado</b> con la factura. Puedes verlo, descargarlo o enviarlo al cliente `
      + `cuando quieras — enviarlo es opcional.`
      + (bloqueadas.length?`<br><br><b>${bloqueadas.length} WO(s) de esta propiedad quedaron afuera</b> por excepción sin resolver — se facturan aparte cuando se resuelva.`:""),"v"); render();
  },
  /* «Revisar Work Order y verificar: servicios realizados, adicionales, materiales, observaciones»
     Erika valida antes de que se pueda facturar o pagar (Proceso de Facturación y Nómina) */
  validarModal: d => {
    const w=W(+d.id), ads=S.adicionales.filter(a=>a.wo===w.id), mv=S.movs.filter(m=>m.wo===w.id);
    /* Reunión 2026-09-09: las horas NO bloquean — al técnico se le paga por
       trabajo (pago del tarifario × cantidad), nunca por hora, así que exigir
       "horas trabajadas" para validar no correspondía. Solo evidencia y
       tarifa son requisito real. El tiempo en sitio se sigue guardando solo
       (llegada → término), pero como dato de operación, no de nómina. */
    const falta = [];
    if(!w.evid) falta.push("evidencia del trabajo");
    if(ingresoWO(w)===null) falta.push("tarifa");
    modal(`<div class="mh"><h3>Validar WO-${w.id}</h3>
      <p>${esc(P(w.prop).nombre)} · ${esc(U(w.unidad).num)} · ${esc(tecN(w.tec))}</p></div>
    <div class="mb">
      <table><tbody>
        <tr><td style="width:40px">${w.serv?'<span class="pill v">✓</span>':'<span class="pill r">—</span>'}</td>
          <td><b>Servicios realizados</b><div style="font-size:11.5px;color:var(--soft)">${esc(w.serv)} × ${w.cant||1}</div></td></tr>
        <tr><td>${ads.length?'<span class="pill v">✓</span>':'<span class="pill g">·</span>'}</td>
          <td><b>Servicios adicionales</b><div style="font-size:11.5px;color:var(--soft)">${ads.length?ads.map(a=>esc(a.concepto||a.desc.slice(0,40))+" ("+a.estado+")").join(", "):"ninguno"}</div></td></tr>
        <tr><td>${mv.length?'<span class="pill v">✓</span>':'<span class="pill g">·</span>'}</td>
          <td><b>Materiales</b><div style="font-size:11.5px;color:var(--soft)">${mv.length?mv.map(m=>esc(by(S.productos,m.prod).nombre)+" ×"+m.cant).join(", ")+" · "+money(materialWO(w)):"ninguno"}</div></td></tr>
        <tr><td><span class="pill g">·</span></td>
          <td><b>Tiempo en sitio</b><div style="font-size:11.5px;color:var(--soft)">${w.horas?w.horas+" h (de la llegada al término)":"—"} · informativo, no cambia el pago (es por trabajo)</div></td></tr>
        <tr><td>${w.evid?'<span class="pill v">✓</span>':'<span class="pill r">—</span>'}</td>
          <td><b>Evidencia y observaciones</b><div style="font-size:11.5px;color:var(--soft)">${w.evid} foto(s)${w.notas?" · "+esc(w.notas):""}</div></td></tr>
      </tbody></table>
      ${falta.length?`<div class="note r" style="margin-top:12px"><b>Falta: ${esc(falta.join(", "))}.</b>
        Su flujograma dice «solicitar información al técnico» antes de validar.</div>`
       :`<div class="note v" style="margin-top:12px"><b>Todo completo.</b> Al validar entra a nómina y a facturación.</div>`}
    </div>
    <div class="mf"><button class="btn" data-a="cm">Cerrar</button>
      ${falta.length?`<button class="btn" data-a="pedirInfo" data-id="${w.id}">Solicitar info al técnico</button>`:""}
      <button class="btn ${falta.length?"":"v"}" data-a="validarOK" data-id="${w.id}" ${falta.length?"disabled":""}>Validar Work Order</button></div>`,true);
  },
  validarOK: d => {
    const w=W(+d.id); w.validada=true;
    w.hist.push([hora(),"Work Order validada para facturación y nómina",S.usuario]);
    toast("✓ Work Order validada",`WO-${w.id} pasa a nómina y facturación. Validada por ${S.usuario}.`,"v"); render();
  },
  pedirInfo: d => {
    const w=W(+d.id);
    /* Sin esta marca, la solicitud vivía solo en un aviso de texto: Erika no
       tenía lista de lo pedido y el técnico no tenía dónde responder. */
    const falta = [];
    if(!w.evid)  falta.push("evidencia");
    if(ingresoWO(w)===null) falta.push("tarifa");
    w.infoPedida = {falta, quien:S.usuario, hora:hora(), fecha:HOY_SUP};
    w.hist.push([hora(),"Se pidió al técnico: "+falta.join(", "),S.usuario]);
    cm();
    toast("Información solicitada",
      `<b>${esc(tecN(w.tec))}</b> tiene que completar <b>${esc(falta.join(" y "))}</b>.<br><br>`
      + `Le aparece en su celular con solo lo que falta. Cuando lo complete, te avisa.`,"w");
    noti("Te falta completar un trabajo",
      `WO-${w.id} · ${P(w.prop).nombre}: ${falta.join(" y ")}. Sin eso no entra a tu pago.`);
    render();
  },

  /* El técnico completa lo que le pidieron, desde el celular. No se le
     reabre el trabajo: solo lo que falta. */
  fCompletaInfo: d => {
    const w = W(+d.id);
    if(!w.infoPedida) return;
    const f = w.infoPedida.falta;
    if(f.includes("evidencia") && !w.evid){
      toast("Falta la foto","Toca <b>Agregar foto</b> antes de enviarlo.","r"); return; }
    const quien = w.infoPedida.quien;
    w.infoPedida = null;
    w.hist.push([hora(),"El técnico completó lo que faltaba",tecN(w.tec)]);
    S.reloj += 4;
    toast("✓ Enviado",`Ya quedó completo. <b>${esc(quien)}</b> lo va a revisar y entra a tu pago.`,"v");
    avisar(quien,"Un técnico completó lo que faltaba",
      `WO-${w.id} · ${esc(P(w.prop).nombre)} — ${esc(tecN(w.tec))} ya subió lo pedido. Se puede validar.`,"v");
    render();
  },
  facVer: d => modalFactura(d.id,false),
  facPDF: d => { abrirPDF(d.id, false);
    toast("PDF abierto","Se abri\u00f3 en otra pesta\u00f1a. Con <b>Guardar como PDF</b> lo descargas.",""); },
  facDescargar: d => { abrirPDF(d.id, true); },
  facEnviar: d => modalFactura(d.id,true),
  facEnviarOK: d => {
    const f=by(S.facturas,d.id), p=P(f.prop), c=CLI(p.cliente);
    f.estado="Enviada"; f.envio="2026-08-11"; f.mail=val("facMail")||c.mail;
    f.lineas.forEach(id=>{const w=W(id); if(w) w.hist.push([hora(),`Factura ${f.num} enviada al cliente`,S.usuario]);});
    cm();
    toast("✓ Factura enviada",`<b>${esc(f.num)}</b> · ${money(f.total)} a ${esc(f.mail||"—")}. El plazo de cobranza corre desde hoy: vence ${esc(f.vence)}.`,"v");
    render();
  },
  cobrar: d => {
    const f=by(S.facturas,d.id); f.estado="Pagada"; flash("fac:"+f.id);
    f.seguimiento=f.seguimiento||[];
    f.seguimiento.push({tipo:"pago",fecha:HOY_SUP,hora:hora(),quien:S.usuario});
    f.seguimiento.push({tipo:"cierre",fecha:HOY_SUP,hora:hora(),quien:S.usuario});
    f.lineas.forEach(id=>{const w=W(id); if(w){w.cobrada=true; w.hist.push([hora(),"Cobrada",S.usuario]);}});
    cm();
    toast("✓ Pago registrado",`${esc(f.num)} · ${money(f.total)}. Las Work Orders pasaron a «Paid» — Invoice y Work Orders quedaron cerrados.`,"v"); render();
  },
  cobGestionar: d => modalCobranza(d.id),
  /* Escalera de cobranza del flujograma: Reminder → Correo Overdue → Llamada.
     Cada paso solo se habilita cuando ya pasó el anterior (ver modalCobranza). */
  cobRecordatorio: d => {
    const f=by(S.facturas,d.id);
    f.seguimiento=f.seguimiento||[];
    f.seguimiento.push({tipo:"reminder",fecha:HOY_SUP,hora:hora(),quien:S.usuario});
    flash("fac:"+f.id);
    toast("✓ Reminder enviado",`Se envió el recordatorio de pago de <b>${esc(f.num)}</b> a ${esc(P(f.prop).nombre)}.`,"v");
    modalCobranza(f.id);
  },
  cobOverdue: d => {
    const f=by(S.facturas,d.id);
    f.seguimiento=f.seguimiento||[];
    f.seguimiento.push({tipo:"overdue",fecha:HOY_SUP,hora:hora(),quien:S.usuario});
    flash("fac:"+f.id);
    toast("✓ Correo overdue enviado",`Se avisó a <b>${esc(P(f.prop).nombre)}</b> que ${esc(f.num)} sigue vencida.`,"v");
    modalCobranza(f.id);
  },
  cobLlamadaModal: d => modalCobLlamada(d.id),
  cobLlamadaGuardar: d => {
    const f=by(S.facturas,d.id), nota=val("clNota"), prom=val("clProm");
    if(!nota){ toast("Falta la respuesta","Anota qué dijo el cliente.","r"); return; }
    f.seguimiento=f.seguimiento||[];
    f.seguimiento.push({tipo:"llamada",fecha:HOY_SUP,hora:hora(),quien:S.usuario,nota,promesa:prom||null});
    flash("fac:"+f.id);
    toast("✓ Llamada registrada",`Respuesta de ${esc(P(f.prop).nombre)} guardada.`,"v");
    modalCobranza(f.id);
  },
  movEntrada: () => modal(`<div class="mh"><h3>Registrar compra de material</h3><p>El stock se recalcula solo — nunca se edita a mano.</p></div>
    <div class="mb">
      <div class="fld"><label>Producto <span class="req">*</span></label><select id="mP">${S.productos.map(p=>`<option value="${p.id}">${esc(p.nombre)} (${esc(p.um)})</option>`).join("")}</select></div>
      <div class="fg c3">
        <div class="fld"><label>Cantidad <span class="req">*</span></label><input id="mC" class="mono"></div>
        <div class="fld"><label>Costo total <span class="req">*</span></label><input id="mT" class="mono"></div>
        <div class="fld"><label>Tienda</label><select id="mS">${activos("tiendas").map(t=>`<option>${esc(t)}</option>`).join("")}</select></div></div>
      <div class="note">Se guarda con quién lo registró y la evidencia del recibo.</div></div>
    <div class="mf"><button class="btn" data-a="cm">Cancelar</button><button class="btn p" data-a="movGuardar" data-tipo="entrada">Registrar</button></div>`),
  movSalida: () => modal(`<div class="mh"><h3>Registrar salida a una Work Order</h3><p>Así se sabe cuánto material cuesta cada servicio.</p></div>
    <div class="mb">
      <div class="fld"><label>Producto <span class="req">*</span></label><select id="mP">${S.productos.map(p=>`<option value="${p.id}">${esc(p.nombre)} — quedan ${stock(p.id)}</option>`).join("")}</select></div>
      <div class="fld"><label>Work Order <span class="req">*</span></label><select id="mW">${S.wos.map(w=>`<option value="${w.id}">WO-${w.id} · ${esc(P(w.prop).nombre)} ${esc(U(w.unidad).num)}</option>`).join("")}</select></div>
      <div class="fg c2">
        <div class="fld"><label>Cantidad <span class="req">*</span></label><input id="mC" class="mono"></div>
        <div class="fld"><label>Costo <span class="req">*</span></label><input id="mT" class="mono"></div></div></div>
    <div class="mf"><button class="btn" data-a="cm">Cancelar</button><button class="btn p" data-a="movGuardar" data-tipo="salida">Registrar</button></div>`),
  movGuardar: d => {
    if(marcaFalta(["mC","mT"])){ toast("Faltan datos","Cantidad y costo.","r"); return; }
    const prod=val("mP"), cant=parseFloat(val("mC"));
    if(d.tipo==="salida" && cant>stock(prod)){ toast("🚫 No hay tanto stock",`Solo quedan ${stock(prod)}.`,"r"); return; }
    const nm={id:"M"+nid("mv"),prod,tipo:d.tipo,cant,fecha:"2026-08-11",
      wo:d.tipo==="salida"?+val("mW"):null,costo:parseFloat(val("mT")),tienda:d.tipo==="entrada"?val("mS"):"",quien:S.usuario,evid:d.tipo==="entrada"};
    S.movs.push(nm); flash("mov:"+nm.id);
    cm();
    const p=by(S.productos,prod), s=stock(prod);
    toast("✓ Movimiento registrado",`${esc(p.nombre)}: quedan <b>${s}</b> ${esc(p.um)}.${s<p.min?" <b>Stock bajo</b> — ya salió la alerta.":""}`, s<p.min?"w":"v");
    render();
  },
  /* Un mismo formulario sirve para dar de alta y para corregir: si viene con
     id, llega con los datos puestos y guarda encima en vez de duplicar. */
  /* El management es abstracto — Claudia: "podrian demorar en conseguir o saber quien es".
     Por eso no se crea suelto: se registra sobre una propiedad que ya existe, y esa
     propiedad es la que queda vinculada. Si administra más, se vinculan luego desde cada una. */
  cliNuevo: d => { const c = d&&d.id ? by(S.clientes,d.id) : null;
    const propId = d&&d.prop ? d.prop : "";
    modal(`<div class="mh"><h3>${c?"Corregir "+esc(c.nombre):"Nuevo management"}</h3>
      <p>${c?"Cambia lo que esté mal. Cada campo que toques queda en la Bitácora con el valor anterior.":"Se registra cuando ya se sabe quién administra una propiedad dada de alta."}</p></div>
    <div class="mb">
      <div class="fld"><label>Management Company Name <span class="req">*</span></label><input id="kN" value="${c?esc(c.nombre):""}"></div>
      ${c?"":`<div class="fld"><label>Propiedad <span class="req">*</span></label>
        <select id="kProp">${S.propiedades.map(p=>`<option value="${p.id}" ${p.id===propId?"selected":""}>${esc(p.nombre)}${p.cliente?" — ya tiene management":""}</option>`).join("")}</select>
        <div class="hint">La propiedad que administra este management.</div></div>`}
      <div class="fld"><label>Vendor Compliance Platform</label><select id="kVP">${["NetVendor","VendorCafe","RealPage","Email","Otro"].map(x=>`<option ${c&&c.vendorPlat===x?"selected":""}>${x}</option>`).join("")}</select></div>
      <div class="fld"><label>Contacto</label><input id="kC" value="${c?esc(c.contacto):""}"></div>
      <div class="fg c2"><div class="fld"><label>Teléfono</label><input id="kP" class="mono" value="${c?esc(c.tel):""}"></div>
        <div class="fld"><label>Correo</label><input id="kM" value="${c?esc(c.mail):""}"></div></div>
      <div class="fld"><label>Internal Notes</label><input id="kNotas" value="${c?esc(c.notas):""}"></div>
      ${c?`<div class="fld"><label>Date Added</label><div class="mono" style="padding:8px 0">${esc(c.fechaAlta)}</div></div>`:""}
    </div>
    <div class="mf"><button class="btn" data-a="cm">Cancelar</button>
      <button class="btn p" data-a="cliGuardar" data-id="${c?c.id:""}">${c?"Guardar corrección":"Guardar"}</button></div>`,true); },
  cliDocsModal: d => {
    const c = by(S.clientes, d.id);
    modal(`<div class="mh"><h3>Documentos de ${esc(c.nombre)}</h3>
      <p>Vendor Packet y W-9 no vencen: se marcan recibidos una sola vez y se adjunta el archivo.</p></div>
    <div class="mb">
      <div class="fld"><label>Vendor Packet</label><select id="docVP">${["Pendiente","Recibido"].map(x=>`<option ${x===(c.vendorPacket||"Pendiente")?"selected":""}>${x}</option>`).join("")}</select>
        <div style="display:flex;align-items:center;gap:9px;margin-top:7px">
          <button class="btn sm" data-a="cliDocsVPAdj">Adjuntar archivo</button>
          <span id="docVPN" style="font-size:11.5px;color:${c.vendorPacketPdf?"var(--verde)":"var(--faint)"}">${c.vendorPacketPdf?"📎 "+esc(c.vendorPacketPdf):"sin archivo"}</span></div></div>
      <div class="fld"><label>W-9</label><select id="docW9">${["Pendiente","Recibido"].map(x=>`<option ${x===(c.w9||"Pendiente")?"selected":""}>${x}</option>`).join("")}</select>
        <div style="display:flex;align-items:center;gap:9px;margin-top:7px">
          <button class="btn sm" data-a="cliDocsW9Adj">Adjuntar archivo</button>
          <span id="docW9N" style="font-size:11.5px;color:${c.w9Pdf?"var(--verde)":"var(--faint)"}">${c.w9Pdf?"📎 "+esc(c.w9Pdf):"sin archivo"}</span></div></div>
      <div class="note">Sirve para validar rápido si esta empresa ya está habilitada como proveedor, sin salir de Management.</div>
    </div>
    <div class="mf"><button class="btn" data-a="cm">Cancelar</button>
      <button class="btn p" data-a="cliDocsOK" data-id="${c.id}">Guardar</button></div>`);
  },
  /* Igual que coiAdj: no llama a render(), para no perder lo que ya se eligió en los selects */
  cliDocsVPAdj: () => {
    S.docVPPdf = S.docVPPdf ? null : "VendorPacket_Cordova_Property_Services.pdf";
    const e = document.getElementById("docVPN");
    if(e){ e.textContent = S.docVPPdf ? "📎 " + S.docVPPdf : "sin archivo";
      e.style.color = S.docVPPdf ? "var(--verde)" : "var(--faint)"; }
  },
  cliDocsW9Adj: () => {
    S.docW9Pdf = S.docW9Pdf ? null : "W9_Cordova_Property_Services.pdf";
    const e = document.getElementById("docW9N");
    if(e){ e.textContent = S.docW9Pdf ? "📎 " + S.docW9Pdf : "sin archivo";
      e.style.color = S.docW9Pdf ? "var(--verde)" : "var(--faint)"; }
  },
  cliDocsOK: d => {
    const c = by(S.clientes, d.id);
    c.vendorPacket = val("docVP"); c.w9 = val("docW9");
    if(S.docVPPdf!==undefined) c.vendorPacketPdf = S.docVPPdf || c.vendorPacketPdf || null;
    if(S.docW9Pdf!==undefined) c.w9Pdf = S.docW9Pdf || c.w9Pdf || null;
    S.docVPPdf = undefined; S.docW9Pdf = undefined;
    flash("cli:"+c.id); cm();
    toast("✓ Documentos actualizados",
      `Vendor Packet: <b>${esc(c.vendorPacket)}</b> · W-9: <b>${esc(c.w9)}</b>.`,"v");
    render();
  },
  /* La comunicación vive en la Propiedad, no en el Management — ver pestaña "Comunicación" de fichaProp. */
  propComAdd: d => {
    if(marcaFalta(["cmN"])){ toast("Falta la nota","Sin decir qué se habló, no sirve de registro.","r"); return; }
    S.comunicaciones.push({id:"CM"+nid("cm"),prop:d.id,fecha:"2026-08-21",
      medio:val("cmM"),contacto:val("cmC"),quien:S.usuario,nota:val("cmN")});
    toast("✓ Comunicación registrada","Queda en el historial de esta propiedad.","v");
    render();
  },
  cliGuardar: d => {
    const yo = d&&d.id ? by(S.clientes,d.id) : null;
    if(marcaFalta(yo?["kN"]:["kN","kProp"])){ toast("Faltan datos",yo?"Falta el nombre.":"Nombre y propiedad son obligatorios.","r"); return; }
    const tel=val("kP");
    // El aviso de duplicado no debe dispararse contra uno mismo al corregir
    if(tel && S.clientes.some(c=>c.tel===tel && c!==yo)){
      toast("⚠ Teléfono repetido",`Ya existe un registro con ese teléfono. El sistema evita el duplicado en vez de crear otro.`,"w"); return; }
    const datos = {nombre:val("kN"),contacto:val("kC"),tel,mail:val("kM"),
      vendorPlat:val("kVP"),notas:val("kNotas")};
    if(yo) return guardarEdicion(yo, datos, "Comercial", yo.nombre, null, "cli:"+yo.id);
    const nc = {id:"CL"+nid("cl"), ...datos, fechaAlta:"2026-08-11",
      vendorPacket:"Pendiente", vendorPacketPdf:null, w9:"Pendiente", w9Pdf:null};
    S.clientes.push(nc); flash("cli:"+nc.id);
    const prop = by(S.propiedades, val("kProp"));
    prop.cliente = nc.id; flash("prop:"+prop.id);
    cm(); toast("✓ Registrado",`<b>${esc(nc.nombre)}</b> vinculado a <b>${esc(prop.nombre)}</b>.`,"v"); render();
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
    render(); },

  /* ── AGENDA DE SUPERVISIÓN: Claudia arma el día de Gustavo ── */
  agSupNueva: () => modal(`<div class="mh"><h3>Agregar parada a la ruta de Gustavo</h3>
      <p>Lo que hoy se le dice por teléfono cada mañana</p></div>
    <div class="mb">
      <div class="fld"><label>Propiedad <span class="req">*</span></label>
        <select id="asP">${S.propiedades.filter(p=>p.activa).map(p=>
          `<option value="${p.id}">${esc(p.nombre)} — ${esc(p.zona)}</option>`).join("")}</select></div>
      <div class="fld"><label>Motivo de la visita <span class="req">*</span></label>
        <select id="asM">${MOTIVOS_SUP.map(m=>`<option>${esc(m)}</option>`).join("")}</select></div>
      <div class="fld"><label>Nota para Gustavo</label>
        <input id="asN" placeholder="Qué mirar, con quién hablar, qué confirmar"></div>
      <div class="note">La parada le aparece en <b>Mi ruta</b> apenas la guardes. El sistema la ordena por zona junto con las demás.</div>
    </div>
    <div class="mf"><button class="btn" data-a="cm">Cancelar</button>
      <button class="btn p" data-a="agSupOK">Agregar a su ruta</button></div>`),
  agSupOK: () => {
    const pid=val("asP");
    if(agendaHoy().some(a=>a.prop===pid)){
      toast("Ya está en su ruta",`<b>${esc(P(pid).nombre)}</b> ya figura hoy. Si cambió el motivo, quita la parada y vuelve a agregarla.`,"w"); return; }
    const a={id:"AS"+Date.now(), fecha:HOY_SUP, prop:pid, motivo:val("asM"), nota:val("asN"),
             estado:"Pendiente", hora:null, quien:S.usuario};
    S.agendaSup.push(a); flash("ags:"+a.id);
    cm();
    toast("✓ Agregada a su ruta",`<b>${esc(P(pid).nombre)}</b> · ${esc(a.motivo)}. Le aparece en el celular al instante.`,"v");
    noti("Nueva parada en tu ruta", `${P(pid).nombre} — ${a.motivo}${a.nota?": "+a.nota:""}`);
    render();
  },
  agSupQuita: d => { const a=by(S.agendaSup,d.id);
    S.agendaSup.splice(S.agendaSup.indexOf(a),1);
    toast("Parada quitada",`<b>${esc(P(a.prop).nombre)}</b> ya no está en su ruta de hoy.`,"w"); render(); },

  /* Gustavo marca llegada. No es para vigilarlo: es para que Claudia sepa si
     la ruta que le armó era realista o le puso siete paradas imposibles. */
  gLlegue: d => {
    const a=by(S.agendaSup,d.id);
    S.reloj += 18;
    a.estado="Visitada"; a.hora=hora();
    /* Entra solo al reporte del día: es un dato que el sistema ya tiene. */
    anotarDia("llegada", `Llegu\u00e9 a ${esc(P(a.prop).nombre)} — ${esc(a.motivo)}`, a.id, {prop:a.prop});
    flash("ags:"+a.id);
    toast("📍 Llegada registrada",`<b>${esc(tecN(GUSTAVO))}</b> llegó a ${esc(P(a.prop).nombre)} a las <b>${a.hora}</b>. Claudia lo ve en su agenda.`,"v");
    avisar("Claudia","Gustavo llegó a una propiedad",
      `${esc(P(a.prop).nombre)} · ${esc(a.motivo)} — ${a.hora}.`,"v");
    render();
  },

  /* ── REPORTE DIARIO ───────────────────────────────── */
  gDiaAbrir: () => {
    const r = abrirDiario();
    S.phView="dia"; S.phDiaId=null;
    toast("Reporte del d\u00eda abierto",
      `Se registr\u00f3 la hora de inicio: <b>${r.horaInicio}</b>. Todo lo que hagas hoy se va guardando ac\u00e1 solo.`,"v");
    render();
  },
  gDiaVer: d => { S.phDiaId=d.id; S.phView="dia"; render(); },

  gDiaNueva: d => {
    const pa = agendaHoy().find(a=>a.estado==="Visitada");
    const pr = pa ? pa.prop : S.propiedades.filter(x=>x.activa)[0].id;
    S.gDia = {tipo:d.t, prop:pr, unidad:null, texto:"", fotos:0};
    render();
  },
  gDiaNo:   () => { S.gDia=null; render(); },
  gDiaProp: () => { leerDia(); S.gDia.prop=val("dnP"); S.gDia.unidad=null; render(); },
  gDiaFoto: () => { leerDia(); S.gDia.fotos++; S.reloj+=1; render(); },
  gDiaOK: () => {
    leerDia(); const g=S.gDia;
    if(!g.texto || !g.texto.trim()){ toast("Falta el detalle","Escribe qu\u00e9 pas\u00f3 antes de agregarlo.","r"); return; }
    const e = anotarDia(g.tipo, g.texto.trim(), null, {prop:g.prop, unidad:g.unidad, fotos:g.fotos});
    if(!e){ toast("Reporte cerrado","El reporte de hoy ya se envi\u00f3. Agrega una nota en su lugar.","w"); S.gDia=null; render(); return; }
    S.gDia=null; S.phView="dia"; S.reloj+=3;
    toast("✓ Agregado a tu reporte",
      `<b>${ENTRADAS_DIA[e.tipo].n}</b> · ${e.hora}. Se guard\u00f3 solo: si cierras la app no se pierde.`,"v");
    render();
  },
  gDiaQuita: d => {
    const r = diarioHoy(); if(!r) return;
    const i = r.entradas.findIndex(e=>e.id===d.id);
    if(i>-1) r.entradas.splice(i,1);
    toast("Entrada quitada","Se puede editar y quitar mientras el reporte no est\u00e9 finalizado.","w");
    render();
  },

  /* Finalizar: avisa si algo quedó incompleto, pero la decisión es de él.
     Nunca se cierra solo — un reporte autocerrado e incompleto es un dato falso. */
  gDiaFin: () => {
    const r = diarioHoy();
    if(!r) return;
    if(!r.entradas.length){
      toast("El reporte est\u00e1 vac\u00edo","No registraste ninguna actividad hoy. Agrega al menos una antes de enviarlo.","r");
      return;
    }
    const sinVisitar = agendaHoy().filter(a=>a.estado!=="Visitada");
    const pend = pendDia();
    const devs = devAbiertas().filter(devVencida);
    if((sinVisitar.length || devs.length) && !r.avisado){
      r.avisado = true;
      toast("Antes de cerrar, ojo con esto",
        [sinVisitar.length?`Te quedan <b>${sinVisitar.length} parada(s) sin visitar</b>.`:"",
         devs.length?`Hay <b>${devs.length} devoluci\u00f3n(es) pasada(s) de fecha</b>.`:""].filter(Boolean).join("<br>")
        + `<br><br>Si igual quieres cerrarlo, vuelve a tocar <b>Finalizar</b>.`,"w");
      render(); return;
    }
    const cf = document.getElementById("dnCF");
    if(cf) r.comentarioFinal = cf.value;
    S.reloj += 40;
    r.horaFin = hora();
    r.estado = "Completado";
    r.hist.push([r.horaFin,"Reporte finalizado y enviado",tecN(GUSTAVO)]);
    flash("rd:"+r.id);
    toast("✓ Reporte del d\u00eda enviado",
      `${r.entradas.length} actividad(es) · de ${r.horaInicio} a ${r.horaFin}. Le lleg\u00f3 a <b>Claudia</b> para que lo revise.<br><br>`
      + `Desde ahora <b>no se puede editar</b>: si falta algo, se agrega una nota y queda el historial.`,"v");
    avisar("Claudia","Gustavo cerr\u00f3 su reporte del d\u00eda",
      `${r.entradas.length} actividad(es) entre ${r.horaInicio} y ${r.horaFin}.`,"v");
    render();
  },
  gDiaNota: () => modal(`<div class="mh"><h3>Agregar una nota al reporte</h3>
      <p>El reporte ya se envi\u00f3, as\u00ed que la nota va aparte y no toca el original</p></div>
    <div class="mb"><div class="fld"><label>Nota <span class="req">*</span></label>
      <textarea id="rdN" rows="3" placeholder="Me olvid\u00e9 anotar que dej\u00e9 la llave de la A-211 con el manager"></textarea></div>
      <div class="note">Queda con su hora y a nombre tuyo. El reporte original no se modifica — as\u00ed nadie puede cambiar
      lo que ya declar\u00f3.</div></div>
    <div class="mf"><button class="btn" data-a="cm">Cancelar</button>
      <button class="btn p" data-a="gDiaNotaOK">Agregar nota</button></div>`),
  gDiaNotaOK: () => {
    const r = S.phDiaId ? S.repDiario.find(x=>x.id===S.phDiaId) : diarioHoy();
    const t = val("rdN");
    if(!t || !t.trim()){ toast("Falta la nota","Escribe algo antes de agregarla.","r"); return; }
    r.notasPost.push([hora(), t.trim()]);
    r.hist.push([hora(),"Nota agregada despu\u00e9s del cierre",tecN(GUSTAVO)]);
    cm();
    toast("✓ Nota agregada","Queda aparte del reporte original, con su hora.","v");
    render();
  },

  /* ── DEVOLUCIONES ────────────────────────────────── */
  /* "En camino" no es control: sirve para que Claudia sepa si la ruta que
     armo era realista, y para que el manager sepa a que hora esperarlo. */
  gEnCamino: d => {
    const a=by(S.agendaSup,d.id);
    S.reloj += 6;
    a.estado="En camino"; a.horaCamino=hora();
    flash("ags:"+a.id);
    toast("En camino",`Claudia ve que vas hacia <b>${esc(P(a.prop).nombre)}</b>.`,"");
    avisar("Claudia","Gustavo va en camino",`${esc(P(a.prop).nombre)} — sali\u00f3 ${a.horaCamino}.`,"");
    render();
  },
  gNoCompleta: d => modal(`<div class="mh"><h3>No se pudo completar la parada</h3>
      <p>${esc(P(by(S.agendaSup,d.id).prop).nombre)}</p></div>
    <div class="mb"><div class="fld"><label>¿Qu\u00e9 pas\u00f3? <span class="req">*</span></label>
      <select id="ncM"><option>No hab\u00eda quien abriera</option><option>La unidad estaba ocupada</option>
        <option>No lleg\u00f3 el t\u00e9cnico</option><option>Falta de tiempo en la ruta</option>
        <option>Problema en la propiedad</option><option>Otro</option></select></div>
      <div class="fld"><label>Detalle</label><input id="ncD" placeholder="Lo que Claudia necesita saber"></div>
      <div class="note">Queda registrado que fuiste. Es distinto de no haber ido, y Claudia decide si se reagenda.</div></div>
    <div class="mf"><button class="btn" data-a="cm">Cancelar</button>
      <button class="btn p" data-a="gNoCompletaOK" data-id="${d.id}">Registrar</button></div>`),
  gNoCompletaOK: d => {
    const a=by(S.agendaSup,d.id);
    a.estado="No completada"; a.hora=hora();
    a.motivoNo = val("ncM") + (val("ncD")?" — "+val("ncD"):"");
    anotarDia("problema", `No se pudo completar ${esc(P(a.prop).nombre)}: ${esc(a.motivoNo)}`, a.id, {prop:a.prop});
    flash("ags:"+a.id);
    cm();
    toast("Registrado","Queda constancia de que fuiste y por qu\u00e9 no se pudo.","w");
    avisar("Claudia","Una parada no se pudo completar",
      `${esc(P(a.prop).nombre)} — ${esc(a.motivoNo)}`,"w");
    render();
  },

  /* % de avance: lo pidio Claudia en su modulo 5. Con foto, porque un
     porcentaje sin evidencia es una opinion. */
  /* Detener no es cancelar: el trabajo sigue vivo pero no avanza, y la
     razon casi nunca es del tecnico (no hay agua, no abrieron, falta material).
     Sin este estado, una unidad trabada tres dias se ve igual que una que
     esta avanzando. */
  woDetener: d => { const w=W(+d.id);
    modal(`<div class="mh"><h3>Detener WO-${w.id}</h3>
        <p>${esc(P(w.prop).nombre)} · ${U(w.unidad)?esc(U(w.unidad).num):""} — ${esc(w.serv)}</p></div>
      <div class="mb">
        <div class="fld"><label>¿Por qu\u00e9 se detuvo? <span class="req">*</span></label>
          <select id="dtM"><option>Falta material</option><option>No hay agua o luz en la propiedad</option>
            <option>No se pudo ingresar a la unidad</option><option>El inquilino sigue adentro</option>
            <option>Esperando decisi\u00f3n del cliente</option><option>Clima</option><option>Otro</option></select></div>
        <div class="fld"><label>Detalle</label><input id="dtD" placeholder="Lo que hace falta para reanudar"></div>
        <div class="note">Queda detenida, no cancelada: el trabajo sigue vivo y aparece aparte
          para que no se pierda de vista.</div></div>
      <div class="mf"><button class="btn" data-a="cm">Cancelar</button>
        <button class="btn p" data-a="woDetenerOK" data-id="${w.id}">Detener</button></div>`); },
  woDetenerOK: d => { const w=W(+d.id);
    w.estadoPrevio = w.estado;
    w.estado = "Detenido";
    w.motivoDet = val("dtM") + (val("dtD")?" — "+val("dtD"):"");
    w.desdeDet = HOY_SUP;
    w.hist.push([hora(), "Detenida: "+w.motivoDet, S.usuario]);
    flash("wo:"+w.id); cm();
    toast("Trabajo detenido",
      `<b>WO-${w.id}</b> queda detenida: ${esc(w.motivoDet)}.<br><br>No se cancela — sigue viva y visible
       hasta que se pueda reanudar.`,"w");
    avisar("Thalia","Un trabajo se detuvo",
      `${esc(P(w.prop).nombre)} ${U(w.unidad)?esc(U(w.unidad).num):""} — ${esc(w.motivoDet)}`,"w");
    render(); },
  woReanudar: d => { const w=W(+d.id);
    w.estado = w.estadoPrevio || "In progress";
    w.hist.push([hora(), "Reanudada tras: "+(w.motivoDet||"detenci\u00f3n"), S.usuario]);
    w.motivoDet = null; w.desdeDet = null; w.estadoPrevio = null;
    flash("wo:"+w.id);
    toast("Trabajo reanudado", `<b>WO-${w.id}</b> vuelve a <b>${esc(w.estado)}</b>.`,"v");
    render(); },

  woAvance: d => { const w=W(+d.id);
    modal(`<div class="mh"><h3>Avance de WO-${w.id}</h3>
        <p>${esc(P(w.prop).nombre)} · ${U(w.unidad)?esc(U(w.unidad).num):""} — ${esc(w.serv)}</p></div>
      <div class="mb">
        <div class="fld"><label>Porcentaje aproximado</label>
          <select id="avP">${[0,10,25,50,75,90,100].map(n=>
            `<option value="${n}" ${n===(w.avance||0)?"selected":""}>${n}%</option>`).join("")}</select></div>
        <div class="fld"><label>Problemas o retrasos</label>
          <input id="avN" value="${esc(w.avanceNota||"")}" placeholder="Lo que est\u00e1 frenando el trabajo"></div>
        <div class="note">El avance lo carga quien lo ve: Gustavo en campo. Sirve para saber si la unidad
          llega a la fecha de entrega, no para vigilar a nadie.</div></div>
      <div class="mf"><button class="btn" data-a="cm">Cancelar</button>
        <button class="btn p" data-a="woAvanceOK" data-id="${w.id}">Guardar avance</button></div>`); },
  woAvanceOK: d => { const w=W(+d.id);
    w.avance = +val("avP"); w.avanceNota = val("avN");
    w.avanceFotos = (w.avanceFotos||0) + 1;
    w.hist.push([hora(), "Avance registrado: "+w.avance+"%"+(w.avanceNota?" — "+w.avanceNota:""), S.usuario]);
    flash("wo:"+w.id); cm();
    toast("Avance registrado", `<b>WO-${w.id}</b> al <b>${w.avance}%</b>.`
      + (w.avanceNota?`<br>${esc(w.avanceNota)}`:""), "v");
    render(); },

  gDevVer: d => { S.phDev=d.id; S.phView="dev"; render(); },

  gDevNueva: d => {
    const pr = d.prop || S.propiedades.filter(x=>x.activa)[0].id;
    const un = d.unidad || (S.unidades.filter(u=>u.prop===pr)[0]||{}).id || null;
    const wo = S.wos.filter(w=>w.unidad===un && w.estado!=="Canceled").slice(-1)[0];
    S.gDev = {modo:"crear", prop:pr, unidad:un, wo:wo?wo.id:null,
              area:activos("ubicaciones")[0], desc:d.desc||"",
              causa:Object.keys(CAUSAS_DEV)[0],
              responsable:(wo&&wo.tec)||S.tecnicos.filter(t=>t.id!==GUSTAVO)[0].id,
              prioridad:"Alta", fechaLimite:"2026-08-14",
              amb:activos("ubicaciones")[0], lotes:[]};
    render();
  },
  gDevNo:    () => { S.gDev=null; render(); },
  gDevProp:  () => { leerDev(); const pr=val("dvP"); S.gDev.prop=pr;
    S.gDev.unidad=(S.unidades.filter(u=>u.prop===pr)[0]||{}).id||null; render(); },
  gDevCausa: d => { leerDev(); S.gDev.causa=d.c; render(); },
  gDevPrio:  d => { leerDev(); S.gDev.prioridad=d.p; render(); },
  gDevAmb:   d => { leerDev(); S.gDev.amb=d.u; render(); },
  gDevFoto:  () => { leerDev(); const g=S.gDev;
    const l=g.lotes.find(x=>x.amb===g.amb); if(l) l.n++; else g.lotes.push({amb:g.amb,n:1});
    S.reloj+=1; render(); },
  gDevQuita: d => { leerDev(); S.gDev.lotes.splice(+d.i,1); render(); },

  gDevOK: () => {
    leerDev(); const g=S.gDev;
    if(!g.desc || !g.desc.trim()){ toast("Falta la descripci\u00f3n","Escribe qu\u00e9 est\u00e1 mal.","r"); return; }
    if(!g.lotes.length){ toast("Sin fotos","Una devoluci\u00f3n sin foto de lo que est\u00e1 mal no se puede sostener.","r"); return; }
    if(!g.unidad){ toast("Falta la unidad","Esta propiedad no tiene unidades registradas.","r"); return; }
    const c = causaDe(g.causa);
    const d = {id:"DV"+Date.now(), prop:g.prop, unidad:g.unidad, wo:g.wo, area:g.area,
      desc:g.desc.trim(), causa:g.causa, responsable:g.responsable, prioridad:g.prioridad,
      fechaRep:HOY_SUP, fechaLimite:g.fechaLimite||"2026-08-14", estado:"Abierta",
      lotesAntes:g.lotes.slice(), lotesDespues:[], verifica:null, quien:GUSTAVO,
      hist:[[hora(),"Devoluci\u00f3n creada en campo",tecN(GUSTAVO)]]};
    S.devoluciones.push(d);
    anotarDia("devolucion",
      `${esc(P(d.prop).nombre)} ${U(d.unidad)?esc(U(d.unidad).num):""} — ${esc(d.area)}: ${d.desc.slice(0,60)}`,
      d.id, {prop:d.prop, unidad:d.unidad, fotos:d.lotesAntes.reduce((t,l)=>t+l.n,0)});
    S.gDev=null; S.phDev=d.id; S.phView="dev"; S.reloj+=6;
    flash("dv:"+d.id);
    toast("Devoluci\u00f3n abierta",
      `<b>${esc(tecN(d.responsable))}</b> tiene que corregir <b>${esc(d.area)}</b> antes del <b>${esc(d.fechaLimite)}</b>.<br><br>`
      + `Causa: ${esc(d.causa)} — ${c.ex}<br><br>`
      + `Sigue contando abierta hasta que t\u00fa la verifiques con fotos.`,"w");
    avisar("Claudia","Gustavo abri\u00f3 una devoluci\u00f3n",
      `${esc(P(d.prop).nombre)} ${U(d.unidad)?esc(U(d.unidad).num):""} · ${esc(d.area)} · ${esc(d.prioridad)} · ${esc(tecN(d.responsable))}.`,"w");
    avisar("Thalia","Devoluci\u00f3n por reagendar",
      `${esc(P(d.prop).nombre)} ${U(d.unidad)?esc(U(d.unidad).num):""} — ${esc(tecN(d.responsable))} debe corregir ${esc(d.area)} antes del ${esc(d.fechaLimite)}.`,"w");
    render();
  },

  gDevVerif: d => {
    S.gDev = {modo:"verif", id:d.id, amb:activos("ubicaciones")[0], lotes:[], nota:""};
    render();
  },
  gDevVerifOK: () => {
    leerDev(); const g=S.gDev, d=DV(g.id);
    if(!g.lotes.length){ toast("Faltan las fotos del despu\u00e9s","Sin ellas no se puede dar por corregida.","r"); return; }
    S.reloj += 12;
    d.lotesDespues = g.lotes.slice();
    d.estado = "Corregida";
    d.notaVerif = g.nota||"";
    d.hist.push([hora(),"Verificada en campo — fotos del despu\u00e9s cargadas",tecN(GUSTAVO)]);
    anotarDia("devolucion",
      `Verificada la correcci\u00f3n en ${esc(P(d.prop).nombre)} ${U(d.unidad)?esc(U(d.unidad).num):""} — ${esc(d.area)}`,
      d.id, {prop:d.prop, unidad:d.unidad, fotos:g.lotes.reduce((t,l)=>t+l.n,0)});
    S.gDev=null; flash("dv:"+d.id);
    toast("✓ Corregida",
      `${g.lotes.reduce((t,l)=>t+l.n,0)} foto(s) del despu\u00e9s. Ya puedes cerrarla para que deje de contar.`,"v");
    render();
  },
  gDevCerrar: d => {
    const dv = DV(d.id);
    S.reloj += 3;
    dv.estado = "Cerrada";
    dv.verifica = GUSTAVO;
    dv.fechaCierre = HOY_SUP;
    dv.hist.push([hora(),"Cerrada por el supervisor",tecN(GUSTAVO)]);
    const c = causaDe(dv.causa);
    flash("dv:"+dv.id);
    toast("Devoluci\u00f3n cerrada",
      `Qued\u00f3 el historial completo: ${dv.lotesAntes.reduce((t,l)=>t+l.n,0)} foto(s) de antes y `
      + `${dv.lotesDespues.reduce((t,l)=>t+l.n,0)} del despu\u00e9s.<br><br>`
      + `Por la causa registrada, la correcci\u00f3n <b>${c.paga?"s\u00ed":"no"}</b> se le paga a ${esc(tecN(dv.responsable))}.`,"v");
    avisar("Claudia","Devoluci\u00f3n cerrada",
      `${esc(P(dv.prop).nombre)} ${U(dv.unidad)?esc(U(dv.unidad).num):""} · ${esc(dv.area)} — verificada por Gustavo.`,"v");
    avisar("Erika","Devoluci\u00f3n cerrada — ya se puede facturar",
      `${esc(P(dv.prop).nombre)} ${U(dv.unidad)?esc(U(dv.unidad).num):""}. Correcci\u00f3n ${c.paga?"pagada":"no pagada"} al t\u00e9cnico.`,"v");
    render();
  },

  /* ── TOUCH-UP ───────────────────────────────────────
     Claudia: "cada unidad tiene a su tecnico responsable y el tiene que
     corregir su trabajo; si no va por x motivo se crea una nueva work order
     de un touch up, se le paga al nuevo tecnico y se descuenta al que hizo
     mal el trabajo". Eso es exactamente lo que hace esto. */
  devTouchup: d => {
    const dv = DV(d.id);
    if(touchupDe(dv.id)){ toast("Ya tiene touch-up","Esta devoluci\u00f3n ya gener\u00f3 su Work Order de correcci\u00f3n.","w"); return; }
    const orig = W(dv.wo);
    modal(`<div class="mh"><h3>Crear touch-up de correcci\u00f3n</h3>
        <p>${esc(P(dv.prop).nombre)} · ${U(dv.unidad)?esc(U(dv.unidad).num):""} — ${esc(dv.area)}</p></div>
      <div class="mb">
        <div class="note w" style="margin:0 0 12px"><b>Lo que hay que corregir:</b> ${esc(dv.desc)}</div>
        <div class="fld"><label>¿Qui\u00e9n lo corrige? <span class="req">*</span></label>
          <select id="tuT">
            <option value="${dv.responsable}">${esc(tecN(dv.responsable))} — el responsable, corrige su propio trabajo</option>
            ${S.tecnicos.filter(t=>t.activo!==false && t.id!==dv.responsable && t.id!==GUSTAVO).map(t=>
              `<option value="${t.id}">${esc(tecN(t.id))}</option>`).join("")}
          </select></div>
        ${(()=>{ const cat = orig?orig.cat:activos("categorias")[0];
          const conT = serviciosConTarifa(dv.prop, cat, dv.unidad);
          const sug  = servTouchup(dv.prop, cat, dv.unidad, orig?orig.serv:"");
          return conT.length
            ? `<div class="fld"><label>Servicio</label>
                 <select id="tuS">${conT.map(x=>
                   `<option ${x===sug?"selected":""}>${esc(x)}</option>`).join("")}</select>
                 <div class="hint">Solo los que tienen tarifa para ${esc(U(dv.unidad)?U(dv.unidad).rooms:"")} en esta propiedad.</div></div>`
            : `<div class="fld"><label>Servicio</label>
                 <input id="tuS" value="${esc(orig?orig.serv:"")}">
                 </div>
               <div class="note w">No hay tarifa cargada para <b>${esc(cat)}</b> en
                 <b>${esc(U(dv.unidad)?U(dv.unidad).rooms:"")}</b>. El touch-up se crea igual, pero
                 <b>queda como excepci\u00f3n</b> hasta que se defina la tarifa — si no, el descuento
                 al t\u00e9cnico se perder\u00eda sin que nadie se entere.</div>`;})()}
        <div class="fld"><label>Fecha</label><input id="tuF" value="2026-08-13"></div>
        <div class="note"><b>C\u00f3mo queda la plata seg\u00fan a qui\u00e9n asignes:</b><br>
          · Si va <b>${esc(tecN(dv.responsable))}</b> — rehace su trabajo, <b>no se le paga</b> y no se descuenta nada.<br>
          · Si va <b>otro</b> — se le paga a ese, y <b>se le descuenta a ${esc(tecN(dv.responsable))}</b> el mismo monto.<br>
          En los dos casos, <b>al cliente no se le cobra</b>: la correcci\u00f3n es responsabilidad de la empresa.</div>
      </div>
      <div class="mf"><button class="btn" data-a="cm">Cancelar</button>
        <button class="btn p" data-a="devTouchupOK" data-id="${dv.id}">Crear touch-up</button></div>`);
  },

  devTouchupOK: d => {
    const dv = DV(d.id), tec = val("tuT"), orig = W(dv.wo);
    const w = {id: Math.max(...S.wos.map(x=>x.id))+1, prop:dv.prop, unidad:dv.unidad,
      cat: orig?orig.cat:activos("categorias")[0], serv: val("tuS"), tec,
      estado:"Scheduled", semana:S.semana, fecha:val("tuF"), horaProg:"9:00", po:"",
      asistencia:false, evid:0, mats:[], notas:"", notasTec:"",
      /* marcas propias del touch-up */
      touchup:true, facturable:false, devOrigen:dv.id, woOrigen:dv.wo,
      tecOriginal:dv.responsable, avance:0,
      hist:[[hora(), "Touch-up creado desde la devoluci\u00f3n — no facturable", S.usuario],
            [hora(), "Asignado a "+tecN(tec), S.usuario]]};
    S.wos.push(w);
    dv.touchup = w.id;
    dv.hist.push([hora(), "Se cre\u00f3 el touch-up WO-"+w.id+" para "+tecN(tec), S.usuario]);
    aplicarDescuento(dv, w);
    flash(["wo:"+w.id, "dv:"+dv.id]);
    cm();
    const propio = tec===dv.responsable;
    toast("Touch-up creado",
      `<b>WO-${w.id}</b> · ${esc(P(w.prop).nombre)} ${U(w.unidad)?esc(U(w.unidad).num):""}.<br><br>`
      + (propio
        ? `Lo corrige <b>${esc(tecN(tec))}</b>, que es el responsable: <b>no se le paga</b> — est\u00e1 rehaciendo su trabajo.`
        : `Lo corrige <b>${esc(tecN(tec))}</b> y <b>s\u00ed se le paga</b>. Ese mismo monto se le <b>descuenta a ${esc(tecN(dv.responsable))}</b>, que fue quien lo hizo mal.`)
      + `<br><br>Al cliente <b>no se le cobra</b>.`, "v");
    noti("Tienes un touch-up asignado",
      `${P(w.prop).nombre} ${U(w.unidad)?U(w.unidad).num:""} — ${dv.area}: ${dv.desc}`);
    render();
  },

  /* Reasignar: la WO pasa al nuevo tecnico y el anterior deja de verla.
     El descuento siempre apunta al que hizo mal el trabajo, no al que corrige. */
  woReasignar: d => {
    const w = W(+d.id);
    modal(`<div class="mh"><h3>Reasignar WO-${w.id}</h3>
        <p>${esc(P(w.prop).nombre)} · ${U(w.unidad)?esc(U(w.unidad).num):""}${w.touchup?" — touch-up de correcci\u00f3n":""}</p></div>
      <div class="mb">
        <div class="fld"><label>Nuevo t\u00e9cnico <span class="req">*</span></label>
          <select id="raT">${S.tecnicos.filter(t=>t.activo!==false && t.id!==GUSTAVO).map(t=>
            `<option value="${t.id}" ${t.id===w.tec?"selected":""}>${esc(tecN(t.id))}${
              w.touchup&&t.id===w.tecOriginal?" — el responsable, la corrige gratis":""}</option>`).join("")}</select></div>
        ${w.touchup?`<div class="note w">Al cambiar de t\u00e9cnico, la Work Order pasa a ser de \u00e9l:
          <b>${esc(tecN(w.tec))} deja de verla en su celular</b>.<br><br>
          Y el descuento se recalcula solo: si la corrige el propio
          <b>${esc(tecN(w.tecOriginal))}</b> no se paga ni se descuenta; si va otro, se le paga a ese
          y se le descuenta a <b>${esc(tecN(w.tecOriginal))}</b>.</div>`:""}
      </div>
      <div class="mf"><button class="btn" data-a="cm">Cancelar</button>
        <button class="btn p" data-a="woReasignarOK" data-id="${w.id}">Reasignar</button></div>`);
  },

  woReasignarOK: d => {
    const w = W(+d.id), antes = w.tec, nuevo = val("raT");
    if(antes===nuevo){ cm(); toast("Sin cambios","Es el mismo t\u00e9cnico.",""); return; }
    w.tec = nuevo;
    w.hist.push([hora(), "Reasignada de "+tecN(antes)+" a "+tecN(nuevo), S.usuario]);
    if(w.touchup){
      const dv = DV(w.devOrigen);
      quitarDescuento(dv);
      aplicarDescuento(dv, w);
      dv.hist.push([hora(), "Touch-up reasignado a "+tecN(nuevo), S.usuario]);
    }
    flash("wo:"+w.id);
    cm();
    toast("✓ Reasignada",
      `<b>WO-${w.id}</b> ahora es de <b>${esc(tecN(nuevo))}</b>. `
      + `<b>${esc(tecN(antes))}</b> ya no la ve en su celular ni puede tocarla.`
      + (w.touchup
        ? (nuevo===w.tecOriginal
          ? `<br><br>Como la corrige el propio responsable, <b>se retir\u00f3 el descuento</b> y no se le paga.`
          : `<br><br>Se le paga a ${esc(tecN(nuevo))} y se le descuenta a <b>${esc(tecN(w.tecOriginal))}</b>.`)
        : ""), "v");
    noti("Te reasignaron un trabajo", `${P(w.prop).nombre} ${U(w.unidad)?U(w.unidad).num:""} — WO-${w.id}`);
    render();
  },

  /* ── APP DE GUSTAVO ─────────────────────────────────────────────────── */
  verGustavoCel: () => { S.phRol="supervisor"; S.phView="panel"; S.phone=true; S.gRep=null; render(); },
  verTecnicoCel: () => { S.phRol="tecnico"; S.phView=S.phWO?"wo":"agenda"; S.phone=true; S.gRep=null; render(); },
  /* Elegir de qué técnico se ve el celular */
  phTecPick: () => { const s=document.getElementById("phTecSel");
    if(s){ S.phTec=s.value; S.phRol="tecnico"; S.phWO=null; S.phView="agenda"; render(); } },
  /* Desde el detalle web de una WO: abrir esa orden en el celular del técnico
     que la tiene asignada (así no hay que buscar a mano de quién es). */
  verWoEnCel: d => { const w=W(+d.id); if(!w||!w.tec) return;
    S.phTec=w.tec; S.phRol="tecnico"; S.phWO=w.id; S.phView="wo"; S.phone=true; S.gRep=null; render(); },
  /* Saltar de una WO a la agenda semanal, en la semana que le toca */
  verEnAgenda: d => { const w=W(+d.id); S.mod="calendario"; S.semCal=w?w.semana:S.semana; S.sub=null; S.tab=null; render(); },

  gRepNuevo: d => {
    const pr = S.propiedades.filter(x=>x.activa)[0];
    S.gRep = {tipo:d.t, prop:pr.id, unidad:(S.unidades.filter(u=>u.prop===pr.id)[0]||{}).id||null,
              amb:activos("ubicaciones")[0], cond:d.t==="previo"?activos("condiciones")[0]:null,
              antesDe:activos("categorias")[0], servicios:[], lotes:[], nota:"", medidas:"", material:"",
              tipoVisita:TIPO_VISITA[1], estadoTrabajo:EST_TRABAJO[1],
              condUnidad:COND_UNIDAD[0], condGeneral:COND_GENERAL[0],
              etapa:ETAPAS[0], servSup:"", problemas:"", adicional:"",
              conMant:false, mantNombre:"", mantFirma:false,
              items:[itemVacio()], recom:"", copiaThalia:false, copiaCliente:false};
    render();
  },
  /* Desde la ruta: la propiedad ya viene puesta, que es como se usa de verdad */
  gRepPro: d => {
    S.phView="reportar";
    /* El motivo por el que Claudia lo mandó define qué va a reportar.
       Si va a inspeccionar para estimado, no tiene sentido abrirle «revisión». */
    const pa = paradaDe(d.prop);
    const tipo = pa && pa.motivo==="Inspección para estimado" ? "relevamiento"
               : pa && pa.motivo==="Supervisar" ? "revision" : "relevamiento";
    S.gRep = {tipo, prop:d.prop, desdeRuta:true, unidad:(S.unidades.filter(u=>u.prop===d.prop)[0]||{}).id||null,
              amb:activos("ubicaciones")[0], cond:tipo==="previo"?activos("condiciones")[0]:null,
              antesDe:activos("categorias")[0],
              servicios:[], lotes:[], nota:"", medidas:"", material:"",
              tipoVisita:TIPO_VISITA[1], estadoTrabajo:EST_TRABAJO[1],
              condUnidad:COND_UNIDAD[0], condGeneral:COND_GENERAL[0],
              etapa:ETAPAS[0], servSup:"", problemas:"", adicional:"",
              conMant:false, mantNombre:"", mantFirma:false,
              items:[itemVacio()], recom:"", copiaThalia:false, copiaCliente:false};
    render();
  },
  gRepNo: () => { S.gRep=null; render(); },

  /* Antes de repintar hay que rescatar lo escrito: render() rehace la hoja entera */
  gRepProp: () => { leerSup(); const pr=val("gP"); S.gRep.prop=pr;
    S.gRep.unidad=(S.unidades.filter(u=>u.prop===pr)[0]||{}).id||null; render(); },
  /* Sin esto, elegir Unidad no quedaba guardado: la siguiente vez que algo
     volvia a pintar la hoja (elegir Ambiente, por ejemplo), el select volvia
     solo a la primera unidad de la propiedad — Gustavo elegia una y "se le
     iba para otro lado" sin que él tocara nada más. */
  gRepUnidad: () => { leerSup(); S.gRep.unidad=val("gU"); render(); },
  /* El select "Estado del trabajo" tenía data-a="gRepEst" en el HTML pero
     nunca existió el handler — elegir "Requiere corrección" no mostraba el
     aviso rojo hasta que Gustavo tocaba otro campo cualquiera (leerSup() lo
     terminaba leyendo de rebote). Botón/select suelto sin camino propio. */
  gRepEst: () => { leerSup(); render(); },
  gRepAmb:  d => { leerSup(); S.gRep.amb=d.u;  render(); },
  gRepCond: d => { leerSup(); S.gRep.cond=d.c; render(); },
  gRepEtapa: d => { leerSup(); S.gRep.etapa=d.e; render(); },
  gRepMant:  () => { leerSup(); const g=S.gRep; g.conMant=!g.conMant;
    if(!g.conMant){ g.mantNombre=""; g.mantFirma=false; } render(); },
  gRepMantFirma: () => { leerSup(); S.gRep.mantFirma=!S.gRep.mantFirma; render(); },
  /* Claudia pidió poder "enviar copia a Claudia, scheduling o al cliente" —
     antes el informe SIEMPRE le llegaba solo a ella. */
  gRepCopiaThalia:  () => { leerSup(); S.gRep.copiaThalia=!S.gRep.copiaThalia; render(); },
  gRepCopiaCliente: () => { leerSup(); S.gRep.copiaCliente=!S.gRep.copiaCliente; render(); },

  /* Borrador: se guarda tal cual y se retoma. Nada se envia a Claudia. */
  gRepBorrador: () => {
    leerSup(); const g=S.gRep;
    const b = {...g, id:"BR"+Date.now(), guardado:hora(), fecha:HOY_SUP};
    S.borradores.push(b);
    S.gRep=null; S.phView="dia";
    toast("Borrador guardado",
      `Lo tienes en <b>Mi d\u00eda</b> para seguir cuando quieras. No se le mand\u00f3 nada a Claudia todav\u00eda.`,"v");
    render();
  },
  gRepRetomar: d => {
    const i = S.borradores.findIndex(b=>b.id===d.id);
    if(i<0) return;
    const b = S.borradores.splice(i,1)[0];
    delete b.id; delete b.guardado;
    S.gRep = b; S.phView="reportar";
    toast("Borrador retomado","Segu\u00ed donde lo dejaste.","");
    render();
  },
  gRepBorrarBorrador: d => {
    const i = S.borradores.findIndex(b=>b.id===d.id);
    if(i>-1) S.borradores.splice(i,1);
    toast("Borrador descartado","","w"); render();
  },

  gRepCondU: d => { leerSup(); S.gRep.condUnidad=d.c; render(); },
  gRepCondG: d => { leerSup(); S.gRep.condGeneral=d.c; render(); },
  gRepItemMas:   () => { leerSup(); S.gRep.items.push(itemVacio()); render(); },
  gRepItemMenos: d => { leerSup(); S.gRep.items.splice(+d.i,1); render(); },
  gRepItemMat:   d => { leerSup(); const it=S.gRep.items[+d.i]; it.mat=!it.mat; if(!it.mat) it.materiales=""; render(); },
  gRepItemFoto:  d => { leerSup(); S.gRep.items[+d.i].fotos++; S.reloj+=1; render(); },

  gRepServ: d => { leerSup(); const i=S.gRep.servicios.indexOf(d.c);
    if(i>-1) S.gRep.servicios.splice(i,1); else S.gRep.servicios.push(d.c); render(); },

  /* Disparar: se acumula en el lote del ambiente activo. Cien fotos sueltas
     no sirven; agrupadas por ambiente, Claudia las puede revisar. */
  gRepFoto: () => {
    leerSup(); const g=S.gRep;
    /* El lote agrupa por ambiente + condicion + etapa: asi el antes y el
       despues del mismo bano no terminan en la misma pila. */
    const l = g.lotes.find(x=>x.amb===g.amb && (x.cond||null)===(g.cond||null)
                              && (x.etapa||null)===(g.etapa||null));
    if(l) l.n++; else g.lotes.push({amb:g.amb, cond:g.cond||null, etapa:g.etapa||null, desc:"", n:1});
    S.reloj += 1;
    render();
  },
  gRepQuita: d => { leerSup(); S.gRep.lotes.splice(+d.i,1); render(); },

  gRepOK: () => {
    leerSup(); const g=S.gRep;
    /* Si no se pudo entrar, no se le piden fotos ni servicios: no habia nada
       que ver. Igual queda el registro de que fue. */
    const noEntro = g.tipo==="relevamiento" && g.condUnidad==="No se pudo ingresar";
    if(g.tipo==="relevamiento" && !noEntro){
      const conT = (g.items||[]).filter(it=>it.trabajo && it.trabajo.trim());
      if(!conT.length){ toast("Falta el trabajo","Escribe al menos un servicio con lo que hay que hacer.","r"); return; }
    }
    if(!g.lotes.length && !noEntro){ toast("Sin fotos","Toma al menos una antes de enviar.","r"); return; }
    if(!g.unidad){ toast("Falta la unidad","Esta propiedad no tiene unidades registradas.","r"); return; }
    const n = g.lotes.reduce((t,l)=>t+l.n,0);
    const r = {id:"R"+Date.now(), tipo:g.tipo, prop:g.prop, unidad:g.unidad, wo:null,
      fecha:"2026-08-11", hora:hora(), quien:GUSTAVO,
      antesDe:g.tipo==="previo"?g.antesDe:"",
      servicios: g.tipo==="relevamiento"
        ? [...new Set((g.items||[]).filter(it=>it.trabajo&&it.trabajo.trim()).map(it=>it.cat))]
        : g.servicios.slice(),
      lotes:g.lotes.slice(), nota:g.nota, medidas:g.medidas, material:g.material,
      /* Lo del formulario 2 viaja entero: Claudia arma el estimado sin
         volver a escribir nada de lo que Gustavo ya escribio en campo. */
      condUnidad:g.condUnidad||"", condGeneral:g.condGeneral||"", recom:g.recom||"",
      servSup:g.servSup||"", problemas:g.problemas||"", adicional:g.adicional||"",
      firmaGustavo:{quien:GUSTAVO, hora:hora()},
      firmaMant: g.conMant ? {nombre:g.mantNombre||"", firmada:!!g.mantFirma, hora:hora()} : null,
      copiaThalia:!!g.copiaThalia, copiaCliente:!!g.copiaCliente,
      items:(g.items||[]).filter(it=>it.trabajo && it.trabajo.trim()).map(it=>({...it})),
      estado:"Nuevo", accion:null};
    S.reportes.push(r);
    /* El estado previo no espera decisión de nadie: se archiva en la unidad */
    if(g.tipo==="previo"){ r.estado="Archivado"; r.accion="Archivado en la unidad"; }
    /* El informe se engancha solo al reporte del día */
    anotarDia(g.tipo==="relevamiento"?"estimado":"supervision",
      `${REP[r.tipo].n}: ${esc(P(r.prop).nombre)} ${esc(U(r.unidad).num)}`
      + (g.estadoTrabajo?` — ${esc(g.estadoTrabajo)}`:""),
      r.id, {prop:r.prop, unidad:r.unidad, fotos:n});
    r.tipoVisita = g.tipoVisita||""; r.estadoTrabajo = g.estadoTrabajo||"";
    const pideDev = g.tipo==="revision" && g.estadoTrabajo==="Requiere correcci\u00f3n";
    S.gRep=null; S.phView=pideDev?S.phView:"dia"; S.reloj+=4;
    const et = REP[r.tipo].n;
    toast(`📷 ${et} enviado`,
      `${esc(P(r.prop).nombre)} · ${esc(U(r.unidad).num)} — <b>${n} foto(s)</b> en ${r.lotes.length} ambiente(s).`
      + (g.tipo==="previo"
         ? ` Queda <b>pegado a la unidad</b>: si algún día reclaman un daño, está la foto con su fecha.`
         : ` Le llegó a <b>Claudia</b> para que decida.`), "v");
    /* Claudia pidió poder mandar copia a scheduling o al cliente, no solo a
       ella — antes el informe SIEMPRE se quedaba solo con ella. */
    if(r.copiaThalia){
      avisar("Thalia","Copia de informe de "+esc(tecN(GUSTAVO)),
        `${et} · ${esc(P(r.prop).nombre)} ${esc(U(r.unidad).num)}.`,"");
    }
    if(r.copiaCliente){
      const ctc = contactosDe(r.prop)[0];
      if(ctc) toast("✓ Copia enviada al cliente",
        `${esc(ctc.nombre)} (${esc(ctc.mail)}) recibió copia del informe por correo.`,"");
    }
    /* Si marcó «requiere corrección», la devolución se abre en el acto: si se
       deja para después, no se crea nunca y el trabajo malo queda facturado. */
    /* El trabajo adicional recomendado no se entierra en el informe: antes
       solo avisaba a Claudia y ella tenía que crear la Solicitud Comercial
       a mano. Claudia pidió "crear solicitud de trabajo adicional" — ahora
       la solicitud nace sola, ya con el alcance que Gustavo escribió en
       campo. Sin inspección: él ya la vio, es la suya. */
    if(r.adicional && r.adicional.trim()){
      const ctc = contactosDe(r.prop)[0];
      const sc = {id:"SC"+Date.now(), fecha:"2026-08-11", quien:tecN(GUSTAVO), estimadoId:null,
        estado:"Lista para estimado", prop:r.prop, propNombre:"",
        contacto:ctc?ctc.nombre:"— por confirmar —", correo:ctc?ctc.mail:"",
        alcance:r.adicional.trim(), inspeccion:false, fechaObjetivo:"",
        notas:`Trabajo adicional recomendado por ${tecN(GUSTAVO)} durante la supervisión de ${esc(U(r.unidad).num)} (informe ${r.id}).`};
      S.solicitudesComerciales.unshift(sc); flash("solcom:"+sc.id);
      avisar("Claudia","Gustavo recomienda trabajo adicional",
        `${esc(P(r.prop).nombre)} ${U(r.unidad)?esc(U(r.unidad).num):""} — ${esc(r.adicional.slice(0,90))}. Ya quedó como Solicitud Comercial, lista para armar el estimado.`,"a");
    }
    if(pideDev){ ACC.gDevNueva({prop:r.prop, unidad:r.unidad, desc:g.problemas||g.nota||""}); return; }
    render();
  },

  /* celular */
  fView: d => { S.phView=d.v; if(d.v==="avisos") S.notis.forEach(n=>n.leido=true); if(S.gRep) S.gRep=null;
    /* La vista web de Gustavo (VIEWS.gustavoweb) comparte esta misma pantalla
       de contenido; si un enlace interno salta de pestaña (p.ej. "Visitas
       programadas" → Mi ruta), que salte en las dos, no solo en el celular. */
    if(["panel","ruta","dia","reportar","devs"].includes(d.v)) S.gvTab=d.v;
    render(); },
  fAbrir: d => { S.phView="wo"; S.phWO=+d.id; render(); },
  fLlegue: d => {
    const w=W(+d.id), p=P(w.prop);
    S.reloj += 23;
    const prog = w.horaProg || "9:00";
    const [ph,pm] = prog.split(":").map(Number);
    const tarde = S.reloj > (ph*60+pm) + 10;   // 10 min de tolerancia
    S.asistencias.push({id:"A"+Date.now(), wo:w.id, tec:w.tec, fecha:w.fecha,
      horaProg:prog, horaReal:hora(),
      puntualidad: tarde ? "Tarde" : "A tiempo",
      ubicacion: p.dir + " · " + p.zona});
    w.estado="In progress"; w.asistencia=true; w.nueva=false;
    w.hist.push([hora(),`Llegó a la propiedad (${tarde?"tarde":"a tiempo"})`,T(w.tec).nombre]);
    toast("📍 El técnico llegó",
      `<b>${esc(tecN(w.tec))}</b> marcó llegada a las <b>${hora()}</b> en ${esc(p.nombre)} ${esc(U(w.unidad).num)}${tarde?" — <b>tarde</b>":""}.
       Míralo en <b>Técnicos › Hoy en campo</b>.`, tarde?"w":"v");
    render();
  },
  fFoto: d => { const w=W(+d.id); S.reloj+=5; w.evid++;
    w.hist.push([hora(),"Cargó evidencia",T(w.tec).nombre]);
    toast("📷 Evidencia recibida",`WO-${w.id} ya tiene ${w.evid} foto(s).`,"v"); render(); },
  fAdic: d => { S.phSheet={t:"adic", wo:+d.id,
    desc:"Hueco en el sheetrock del bano. Hay que poner masa y pintar antes del clean.",
    ubic:"Bano", filas:[{c:"Sheetrock",q:"1",p:"120"}]}; render(); },
  fAdicMas: () => { leerAdic();
    // El renglón nuevo arranca en un concepto que todavía no usó: nadie quiere
    // «Sheetrock, Sheetrock» y tener que corregirlo a mano en el celular.
    const cs=activos("adicionales"), ya=S.phSheet.filas.map(f=>f.c);
    S.phSheet.filas.push({c: cs.find(c=>!ya.includes(c)) || cs[0], q:"1", p:""});
    render(); },
  fAdicMenos: d => { leerAdic(); S.phSheet.filas.splice(+d.i,1); render(); },

  /* ---- MATERIALES (lo que el técnico gastó) — flujograma de Técnicos: se
     sube junto con la evidencia, no aparte y no lo anota otra persona. ---- */
  /* Reunión 2026-09-09: faltaba dónde escribir qué reparación se hizo de
     verdad — el campo (w.notas) ya existía en el dato y hasta se mostraba
     en la validación de nómina, pero nunca hubo un cuadro para llenarlo.
     Se guarda directo, sin abrir una hoja aparte — es solo texto libre. */
  fNotaTrabajo: d => { const w=W(+d.id);
    w.notas = document.querySelector(`textarea[data-a="fNotaTrabajo"][data-id="${d.id}"]`).value;
  },
  fMaterial: d => { const w=W(+d.id);
    S.phSheet={t:"material", wo:+d.id, obs:w.obsTec||"",
      filas:[{prod:S.productos[0]?S.productos[0].id:"", cant:"1"}]}; render(); },
  fMaterialMas: () => { leerMaterial();
    const ya=S.phSheet.filas.map(f=>f.prod);
    S.phSheet.filas.push({prod:S.productos.find(p=>!ya.includes(p.id))?.id || S.productos[0]?.id || "", cant:"1"});
    render(); },
  fMaterialMenos: d => { leerMaterial(); S.phSheet.filas.splice(+d.i,1); render(); },
  fMaterialOK: d => {
    leerMaterial();
    const w=W(+d.id), sh=S.phSheet, tec=T(w.tec);
    let n=0;
    sh.filas.forEach(f=>{
      const cant=parseFloat(f.cant); const p=by(S.productos,f.prod);
      if(!p || !cant || cant<=0) return;
      S.movs.push({id:"M"+Date.now()+"_"+n, prod:f.prod, tipo:"salida", cant,
        fecha:w.fecha, wo:w.id, costo:+(p.costo*cant).toFixed(2), tienda:"", quien:tec?tec.nombre:S.usuario, evid:false});
      n++;
    });
    w.obsTec = (sh.obs||"").trim();
    if(n) w.hist.push([hora(), `Registró ${n} material(es) usado(s)${w.obsTec?" · con observaciones":""}`, tec?tec.nombre:S.usuario]);
    else if(w.obsTec) w.hist.push([hora(), "Agregó observaciones al cierre", tec?tec.nombre:S.usuario]);
    S.phSheet=null; flash("wo:"+w.id);
    toast(n?"✓ Materiales registrados":"✓ Guardado",
      n?`${n} línea(s) — quedaron en el costo de WO-${w.id}.`:"Se guardaron las observaciones.","v");
    render();
  },
  fSheetNo: () => { S.phSheet=null; render(); },
  fPermiso: () => { S.phSheet={t:"permiso"}; render(); },
  fPermisoOK: () => {
    const m=val("ppM");
    if(!m){ toast("Falta el motivo","Escribe por qué pides el permiso.","r"); return; }
    S.disponibilidad.push({id:"D"+Date.now(),tec:S.phTec,desde:val("ppD"),hasta:val("ppH"),motivo:m,estado:"Pendiente"});
    S.phSheet=null;
    toast("Permiso solicitado",`<b>${esc(tecN(S.phTec))}</b> pidió ${esc(m.toLowerCase())} del ${esc(val("ppD"))} al ${esc(val("ppH"))}. Le quedó a Gustavo en <b>Disponibilidad</b>.`,"w");
    render();
  },
  fAdicOK: d => {
    leerAdic();
    const w=W(+d.id), sh=S.phSheet;
    if(!sh.desc.trim()){ toast("Falta decir qué encontraste","Con la foto sola oficina no puede decidir.","r"); return; }
    const ya=new Set();
    for(const f of sh.filas){
      if(ya.has(f.c)){ toast("Concepto repetido",
        `<b>${esc(f.c)}</b> está dos veces. Súbele la cantidad en vez de repetir el renglón.`,"r"); return; }
      ya.add(f.c);
    }
    S.reloj+=8;
    // Un solo envío para el técnico; N líneas para el sistema, unidas por `sol`.
    const sol="SOL"+Date.now(), lista=sh.filas.map(f=>f.c).join(", ");
    sh.filas.forEach(f=>S.adicionales.push({
      id:nid("ad"), sol, wo:w.id, desc:sh.desc.trim(), ubic:sh.ubic,
      concepto:f.c, cant:parseFloat(f.q)||1, precio:parseFloat(f.p)||null,
      estado:"Pendiente", aprob:null, origen:"Técnico",
      fotosRef:0, fotosEvid:1, specs:{}, tec:null, fecha:null,
      hist:[[hora(),`Creada por el técnico en sitio: ${f.c}`,T(w.tec).nombre]]}));
    w.estado="Esperando aprobación";
    w.hist.push([hora(),`Pidió aprobación de un adicional · ${lista}`,T(w.tec).nombre]);
    S.phSheet=null;
    toast("⚠ Adicional enviado a oficina",
      `WO-${w.id} · ${sh.filas.length} concepto(s): ${esc(lista)}. Entró como <b>excepción</b>: esa WO no se paga ni se factura hasta que Claudia decida.`,"w");
    /* Decide Claudia, pero a Thalia le acaba de quedar una orden frenada:
       si se entera al final del día, ya reorganizó la agenda dos veces. */
    avisar("Thalia","Una orden quedó frenada",
      `WO-${w.id} · ${esc(P(w.prop).nombre)} ${esc(U(w.unidad).num)} — <b>${esc(tecN(w.tec))}</b> pidió aprobación de un adicional (${esc(lista)}).
       Decide Claudia; tú solo tenlo en cuenta para la agenda.`,"w");
    render(); },
  fTermine: d => {
    const w=W(+d.id);
    if(S.adicionales.some(a=>a.wo===w.id&&a.estado==="Pendiente")){
      toast("🚫 Todavía no puedes cerrar","Hay un adicional esperando aprobación de oficina.","r"); return; }
    if(!asisDe(w.id)){ S.phSheet={t:"llegada",wo:w.id}; render(); return; }
    if(!w.evid){
      toast("🚫 Falta la evidencia","Claudia: «no hay ni un registro, no me consta lo que me estás diciendo». Toma al menos una foto.","r"); return; }
    S.reloj+=28; w.estado="Completed";
    const a=asisDe(w.id);
    if(a){ const [h1,m1]=a.horaReal.split(":").map(Number);
      w.horas = Math.max(0.5, Math.round(((S.reloj-(h1*60+m1))/60)*10)/10); }
    w.hist.push([hora(),`Terminó · ${w.evid} evidencia(s)${w.horas?` · ${w.horas} h en sitio`:""}`,T(w.tec).nombre]);
    // Hoy Erika revisa a mano porque los reportes le llegan en papel.
    // Aquí el dato ya está: si está completo, se valida solo. A ella solo le llega lo que falla.
    if(w.evid>0 && ingresoWO(w)!==null){
      w.validada=true;
      w.hist.push([hora(),"Validada automáticamente: evidencia y tarifa completas","Sistema"]);
    }
    toast("✓ Work Order terminada",`WO-${w.id} quedó lista. Pasa a supervisión de Gustavo.`,"v"); render(); },
  fLlegadaDecl: d => {
    const w=W(+d.id), p=P(w.prop);
    S.asistencias.push({id:"A"+Date.now(), wo:w.id, tec:w.tec, fecha:w.fecha,
      horaProg:w.horaProg||"9:00", horaReal:val("plH")||w.horaProg||"9:00",
      puntualidad:"Declarada", declarada:true, ubicacion:p.dir+" · "+p.zona});
    const hDecl = val("plH");
    w.estado="In progress"; w.asistencia=true; w.nueva=false; S.phSheet=null;
    w.hist.push([hora(),`Llegada declarada a las ${hDecl} (no verificada)`,T(w.tec).nombre]);
    toast("Llegada declarada",`<b>${esc(tecN(w.tec))}</b> dice que llegó ${esc(hDecl)} a WO-${w.id}. Queda marcada como <b>no verificada</b> y levanta una excepción para Gustavo.`,"w");
    // El botón dice «Registrar y cerrar»: hay que cerrar. Si no, el técnico
    // toca cerrar, le piden la hora, la da… y sigue sin cerrar.
    S.bitacora.unshift({ n:++S.audSeq, fecha:"2026-08-11", hora:hora(),
      usuario:S.usuario, rol:ROLES[S.usuario].r,
      accion:"Declaró llegada sin verificar", modulo:"Campo", ref:"WO-"+w.id });
    ACC.fTermine({id:String(w.id)});
  },

  woCorrobora: d => {
    const w=W(+d.id);
    w.corroborado=true;
    w.hist.push([hora(),"Corroboró la unidad antes de empezar",T(w.tec).nombre]);
    render();
  },
  woCorroboraNo: d => { S.phSheet={t:"corrobNo", wo:+d.id}; render(); },
  woCorroboraNoOK: d => {
    const w=W(+d.id), u=U(w.unidad), txt=val("cnTxt");
    if(!txt || !txt.trim()){ toast("Falta el detalle","Decí qué no coincide.","r"); return; }
    w.corroborado=true; w.corroboradoNota=txt.trim(); S.phSheet=null;
    w.hist.push([hora(),`Reportó que la unidad no coincide: ${txt.trim()}`,T(w.tec).nombre]);
    avisar("Thalia","La unidad no coincide con el sistema",
      `WO-${w.id} · ${esc(P(w.prop).nombre)} ${esc(u.num)} — ${esc(tecN(w.tec))}: ${esc(txt.trim())}`,"w");
    toast("Avisado a oficina","Podés seguir trabajando — Thalia ya lo tiene en cuenta.","v");
    render();
  },

  excTarifa: d => modalTarifaExc(+d.wo, d.id),
  tarifaPidio: d => { const w=W(+d.wo); w.pidioPrecio = d.v==="1"; modalTarifaExc(+d.wo, d.x); },
  tarifaAvisarClaudia: d => { const w=W(+d.wo);
    avisar("Claudia","Falta definir una tarifa",
      `${esc(w.serv)} · ${esc(U(w.unidad).rooms)} en ${esc(P(w.prop).nombre)} — el manager preguntó el precio antes de aprobar.`,"w");
    cm(); toast("Avisado a Claudia","Le queda a ella definir el precio — la excepción se le queda a su nombre.","w"); render(); },
  tarifaGuardar: d => {
    if(marcaFalta(["tP","tG"])){ toast("Faltan los importes","Hay que decir cuánto se cobra y cuánto se paga.","r"); return; }
    const w=W(+d.wo), u=U(w.unidad);
    const ntr={id:"TR"+Date.now(), prop: val("tN")==="prop"? w.prop : null,
      cat:w.cat, serv:w.serv, variante:u.rooms,
      pisos: val("tPi")? parseInt(val("tPi")) : null,
      precio:parseFloat(val("tP")), pago:parseFloat(val("tG"))};
    S.tarifas.push(ntr); flash("tar:"+ntr.id);
    cm();
    toast("✓ Tarifa creada",`${esc(w.serv)} · ${esc(u.rooms)} ya tiene precio. Las Work Orders que decían «NA» se recalcularon solas.`,"v");
    render();
  },

  /* ── SUB-WORK ORDERS ── trabajo que cuelga de una WO principal.
     Dos orígenes: "Planificada" (oficina la agrega directo, ya queda
     Aprobada — no frena la WO) o "Técnico" (la crea fAdicOK, en sitio,
     y sí frena la WO como excepción hasta que Claudia decide). */
  /* Reemplazan onchange inline detectados por revisión (regla: toda mutación
     de estado / DOM entra por data-a, no por atributos onchange en el HTML). */
  solConSel: () => {
    const c = by(S.contactos, val("scContactoSel"));
    if(c){ document.getElementById("scContacto").value=c.nombre; document.getElementById("scCorreo").value=c.mail||""; }
  },
  refSolCom: () => refSolCom(),
  visitaConSel: () => {
    const c = by(S.contactos, val("vcContactoSel"));
    if(c){ document.getElementById("vcContacto").value=c.nombre; document.getElementById("vcCorreo").value=c.mail||""; }
  },
  refVisitaCom: () => refVisitaCom(),
  visitaResultadoRef: () => {
    const el = document.getElementById("vcProxRow");
    if(el) el.style.display = val("vcResultado")==="Sigue en seguimiento" ? "" : "none";
  },
  devCausaRef: () => {
    const el = document.getElementById("dvExp");
    if(el) el.innerHTML = causaDe(val("dvC")).ex;
  },

  subwoNueva: d => modalSubWO(+d.id),
  subwoTipoRef: () => refSubWO(),
  subwoGuardar: d => {
    if(marcaFalta(["swTipo","swUbic","swCant"])){ toast("Faltan datos","Elegí el tipo, la ubicación y la cantidad.","r"); return; }
    const w=W(+val("swWo"));
    const tipo=val("swTipo"), ubic=val("swUbic"), cant=parseFloat(val("swCant"))||1,
      precio=parseFloat(val("swPrecio"))||null, notas=val("swNotas")||"";
    const specsDef = SUBWO_SPECS[tipo]||[];
    const specs={};
    specsDef.forEach((c,i)=>{ const v=val("swSpec"+i); if(v && v.trim()) specs[c]=v.trim(); });
    const tecOverride=val("swTec")||null, fechaOverride=val("swFecha")||null;
    const na={id:nid("ad"), sol:"SOL"+Date.now(), wo:w.id, desc:notas, ubic, concepto:tipo,
      cant, precio, estado:"Aprobado", aprob:{medio:"Directo",quien:S.usuario,fecha:hora()},
      origen:"Planificada", fotosRef:0, fotosEvid:0, specs,
      tec:tecOverride, fecha:fechaOverride,
      hist:[[hora(), `Sub-Work Order planificada creada: ${tipo}`, S.usuario]]};
    S.adicionales.push(na);
    w.hist.push([hora(), `Sub-Work Order planificada: ${tipo}`, S.usuario]);
    cm();
    toast("✓ Sub-Work Order creada", `${esc(tipo)} agregada a WO-${w.id}.`, "v");
    render();
  },
  subwoFotoRef: d => {
    const a=S.adicionales.find(x=>x.id===+d.id); if(!a) return;
    a.fotosRef=(a.fotosRef||0)+1;
    ultimoSubwoTocado = a.wo;
    (a.hist=a.hist||[]).push([hora(), "Foto de referencia agregada", S.usuario]);
    const w=W(a.wo);
    if(w) w.hist.push([hora(), `Foto de referencia agregada a Sub-Work Order · ${a.concepto}`, S.usuario]);
    render();
  },
  subwoFotoEvid: d => {
    const a=S.adicionales.find(x=>x.id===+d.id); if(!a) return;
    a.fotosEvid=(a.fotosEvid||0)+1;
    ultimoSubwoTocado = a.wo;
    (a.hist=a.hist||[]).push([hora(), "Foto de evidencia agregada", S.usuario]);
    const w=W(a.wo);
    if(w) w.hist.push([hora(), `Foto de evidencia agregada a Sub-Work Order · ${a.concepto}`, S.usuario]);
    render();
  }
};
