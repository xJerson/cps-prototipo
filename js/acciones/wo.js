"use strict";
Object.assign(ACC, {


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
  woServ: () => refTarifa(),

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
    if(!(cantN>0)) faltan.push("cantidad");
    if(EXIGE_UBIC.includes(cat) && !ubic) faltan.push("ubicación dentro de la unidad");
    if(faltan.length){
      marcaFalta(["wProp","wUni","wCat","wServ","wCant"].concat(esNueva?["wUniNum","wUniBedrooms"]:[]).concat(EXIGE_UBIC.includes(cat)?["wUbic"]:[]));
      toast("🚫 No se puede guardar", `Falta: <b>${faltan.join(", ")}</b>.${EXIGE_UBIC.includes(cat)&&!ubic?" Una reparación sin ubicación hace que el técnico la busque por toda la unidad.":""}`,"r");
      return;
    }
    const yo = d&&d.id ? W(+d.id) : null;
    S._woPendienteGuardar = null;   // cualquier confirmación pendiente de un intento anterior queda descartada

    const procederGuardado = () => {
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
        const bedrooms=(tipoNueva==="Residencial"&&!sinBed)?parseInt(val("wUniBedrooms"))||0:null;
        uNueva = {id:"U"+nid("u"), prop:pid, building:bld, unidadNum:uNumR, num:uNumComp(bld,uNumR),
          tipo:tipoNueva, bedrooms, bathrooms:parseInt(val("wUniBathrooms"))||null,
          rooms:sinBed?null:roomsDesde(tipoNueva,bedrooms), pisos:parseInt(val("wUniPisos"))||null, detalle:[]};
        S.unidades.push(uNueva); flash("uni:"+uNueva.id);
        uid = uNueva.id;
      }
      if(yo){
        if(!woEditable(yo)){ toast("🚫 Ya no se puede corregir","Se facturó o se pagó mientras tenías el formulario abierto.","r"); return; }
        return guardarEdicion(yo,
          {prop:pid, unidad:uid, cat, serv, ubic, fecha, semana:fecha?semanaDe(fecha):null,
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
        semana:fecha?semanaDe(fecha):null, fecha, po:val("wPO"), asistencia:false, evid:0, mats:[],
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
    };

    // Punto 2 del feedback, ajustado después de hablar con Claudia: esto no
    // bloquea — avisa. A veces sí piden el mismo trabajo meses después (una
    // limpieza, por ejemplo), así que la decisión de si es un duplicado de
    // verdad queda en manos de quien está cargando la WO: abrir la que ya
    // existe, o seguir y crear la nueva igual.
    if(!esNueva){
      const dup = S.wos.find(w2 => w2.unidad===uid && w2.serv===serv && w2.fecha===fecha
        && w2.estado!=="Canceled" && (!yo || w2.id!==yo.id)
        && (!EXIGE_UBIC.includes(cat) || w2.ubic===ubic));
      if(dup){
        S._woPendienteGuardar = procederGuardado;
        modalDupWO(dup);
        return;
      }
    }
    procederGuardado();
  },
  woContinuarDuplicado: () => {
    const fn = S._woPendienteGuardar; S._woPendienteGuardar = null;
    if(fn) fn();
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
      <div class="fld"><label>Foto de la observación <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— opcional</span></label>
        ${S._dvFoto?`<img src="${S._dvFoto}" style="width:100%;height:96px;object-fit:cover;border-radius:9px;margin:0 0 6px">`:""}
        <button type="button" class="btn" style="width:100%" data-a="devFoto" data-id="${w.id}">📷 ${S._dvFoto?"Cambiar foto":"Adjuntar foto"}</button></div>
      <div class="note w">Le llega a <b>Thalia</b> para corrección o reagendamiento, y queda contado como devolución de <b>${esc(tecN(w.tec))}</b>.</div>
    </div>
    <div class="mf"><button class="btn" data-a="cm">Cancelar</button>
      <button class="btn" style="border-color:var(--rojo);color:var(--rojo)" data-a="devolverOK" data-id="${w.id}">Devolver el trabajo</button></div>`);
  },
  devFoto: d => {
    // Adjuntar la foto reabre el modal (para mostrarla), así que primero
    // hay que rescatar lo que ya se tecleó — si no, se pierde al reabrir.
    const previo = {m:val("dvM"), a:val("dvA"), c:val("dvC"), p:val("dvP"), l:val("dvL")};
    capturarFoto(url=>{
      S._dvFoto=url; ACC.devolverModal({id:d.id});
      const set=(id,v)=>{ const e=document.getElementById(id); if(e && v) e.value=v; };
      set("dvM",previo.m); set("dvA",previo.a); set("dvC",previo.c); set("dvP",previo.p); set("dvL",previo.l);
      ACC.devCausaRef();
    });
  },
  devolverOK: d => {
    const w=W(+d.id), m=val("dvM"), area=val("dvA"), causa=val("dvC");
    if(!m){ marcaFalta(["dvM"]); toast("Falta el motivo","Sin decir qué está mal, el técnico no sabe qué corregir.","r"); return; }
    w.estado="Returned"; w.devuelta=(w.devuelta||0)+1; w.motivoDev=m;
    (w.evidFotos=w.evidFotos||[]).push(fotoNueva(S._dvFoto||null, S.usuario));
    w.evid=w.evidFotos.length; S._dvFoto=null; flash("wo:"+w.id);
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
  /* Desde el detalle web de una WO: abrir esa orden en el celular del técnico
     que la tiene asignada (así no hay que buscar a mano de quién es). */
  verWoEnCel: d => { const w=W(+d.id); if(!w||!w.tec) return;
    S.phTec=w.tec; S.phRol="tecnico"; S.phWO=w.id; S.phView="wo"; S.phone=true; S.gRep=null; render(); },
  /* Saltar de una WO a la agenda semanal, en la semana que le toca */
  verEnAgenda: d => { const w=W(+d.id); S.mod="calendario";
    S.periodoCal.tipo="semana"; S.periodoCal.sem=w?w.semana:S.semana; S.sub=null; S.tab=null; render(); },

  woCorrobora: d => {
    const w=W(+d.id);
    w.corroborado=true;
    w.hist.push([hora(),"Corroboró la unidad antes de empezar",T(w.tec).nombre]);
    render();
  },
  woCorroboraNo: d => { S.phSheet={t:"corrobNo", wo:+d.id}; render(); },
  woCorroboraNoOK: d => {
    const w=W(+d.id), u=U(w.unidad), txt=val("cnTxt"), pisos=parseInt(val("cnPisos"));
    if(!pisos || pisos<1){ toast("Falta el dato","Indica cuántos pisos ves en la unidad.","r"); return; }
    if(pisos===u.pisos){ toast("Sin cambio","El número de pisos observado coincide con el sistema.","w"); return; }
    const abierta=S.excepciones.find(x=>x.estado==="Pendiente" && x.tipo==="Unit data mismatch" && x.wo===w.id
      && x.datosUnidad && x.datosUnidad.campo==="pisos");
    if(!abierta){
      const quien=T(w.tec).nombre;
      const x={id:"X"+Date.now(), tipo:"Unit data mismatch", wo:w.id,
        motivo:`Floors: system says ${u.pisos}; technician observed ${pisos}.${txt?` ${txt}`:""}`,
        monto:null, pide:quien, aprueba:"Thalia", estado:"Pendiente",
        assignedTo:null, assignedBy:null, assignedAt:null, workStatus:"Unassigned",
        fecha:HOY_SUP, creada:{quien,hora:hora(),minuto:S.reloj,fecha:HOY_SUP},
        datosUnidad:{unidad:u.id,campo:"pisos",anterior:u.pisos,propuesto:pisos,nota:txt||""},
        historial:[{evento:"Created",quien,hora:hora(),fecha:HOY_SUP}], resol:null};
      S.excepciones.push(x);
      avisar("Thalia","Unit data mismatch needs review",
        `WO-${w.id} · ${esc(P(w.prop).nombre)} ${esc(u.num)} — Floors: ${u.pisos} → ${pisos}.`,"w");
    }
    w.corroborado=true; w.corroboradoNota=`Floors: ${u.pisos} → ${pisos}${txt?` · ${txt}`:""}`; S.phSheet=null;
    w.hist.push([hora(),`Reported unit data mismatch: ${w.corroboradoNota}`,T(w.tec).nombre]);
    toast("Enviado para revisión","Podés seguir trabajando. Oficina debe revisar el cambio antes de actualizar la unidad.","v");
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
    const monto = (precio||0)*(cant||1);
    /* Sección 5 del feedback: "Approval, if required" — con costo, la Sub-WO
       no queda aprobada de una: se guarda como un adicional más (mismo
       S.adicionales que usa el técnico), así excAuto() ya la espeja sola en
       Excepciones y se aprueba con el mismo modal de "¿cómo aprobó el
       cliente?" (medioOK), que ahí mismo decide nómina y si se factura.
       Sin costo no hay nada que aprobar, queda directo como antes. */
    const na={id:nid("ad"), sol:"SOL"+Date.now(), wo:w.id, desc:notas, ubic, concepto:tipo,
      cant, precio, estado: monto>0 ? "Pendiente" : "Aprobado",
      aprob: monto>0 ? null : {medio:"Directo",quien:S.usuario,fecha:hora()},
      origen:"Planificada", fotosRefArr:[], fotosEvidArr:[], specs,
      tec:tecOverride, fecha:fechaOverride,
      hist:[[hora(), `Sub-Work Order planificada creada: ${tipo}`, S.usuario]]};
    S.adicionales.push(na);
    w.hist.push([hora(), `Sub-Work Order planificada: ${tipo}`, S.usuario]);
    cm();
    toast("✓ Sub-Work Order creada",
      monto>0
        ? `${esc(tipo)} agregada a WO-${w.id}. Como tiene costo (${money(monto)}), queda <b>pendiente de aprobación</b> — la vas a encontrar en Excepciones para confirmar cómo la aprobó el cliente.`
        : `${esc(tipo)} agregada a WO-${w.id}.`,
      "v");
    render();
  },
  subwoFotoRef: d => {
    const a=S.adicionales.find(x=>x.id===+d.id); if(!a) return;
    ultimoSubwoTocado = a.wo;
    S.fotoModal={tipo:"subwoRef", id:a.id};
    modalFotos();
  },
  subwoFotoEvid: d => {
    const a=S.adicionales.find(x=>x.id===+d.id); if(!a) return;
    ultimoSubwoTocado = a.wo;
    S.fotoModal={tipo:"subwoEvid", id:a.id};
    modalFotos();
  },
  materialAgregar: d => modalMaterial(+d.id),
  materialOrigen: () => refMaterial(),
  materialClienteRef: () => refMaterial(),
  materialGuardar: d => {
    const w=W(+d.id), cliente=val("mtOrigen")==="cliente", cant=parseFloat(val("mtC"));
    if(!cant||cant<=0){ marcaFalta(["mtC"]); toast("Falta cantidad","Indica cuánto material se usó en la WO.","r"); return; }
    let prod, p;
    if(!cliente){
      if(marcaFalta(["mtC","mtT"])){ toast("Faltan datos","Cantidad y costo.","r"); return; }
      prod=val("mtP");
      if(cant>stock(prod)){ toast("🚫 No hay tanto stock",`Solo quedan ${stock(prod)}.`,"r"); return; }
      const nm={id:"M"+nid("mv"), prod, tipo:"salida", cant, fecha:w.fecha, wo:w.id,
        costo:parseFloat(val("mtT")), tienda:"", quien:val("mtQ")||S.usuario,
        notas:val("mtN")||"", recibo:null, evid:false};
      S.movs.push(nm);
      p=by(S.productos,prod);
    }else{
      prod=val("mtPCliente");
      const compra=parseFloat(val("mtCompra"))||0;
      if(!prod){
        if(marcaFalta(["mtNombre"])){ toast("Falta el material","Escribe el nombre del material comprado por el cliente.","r"); return; }
        prod="PC"+Date.now();
        p={id:prod,nombre:val("mtNombre"),um:val("mtUM")||"unidad",min:0,cliente:true,clienteProp:w.prop};
        S.productos.push(p);
      }else p=by(S.productos,prod);
      if(cant>stockCliente(prod,w.prop)+compra){ toast("🚫 No alcanza el material del cliente",`Hay ${stockCliente(prod,w.prop)} disponible(s) en esta propiedad y se compraron ${compra}.`,"r"); return; }
      if(compra>0) S.movs.push({id:"MC"+nid("mv"),prod,tipo:"entrada",cant:compra,fecha:w.fecha,prop:w.prop,cliente:true,costo:0,tienda:"",quien:val("mtQ")||"Cliente",notas:val("mtN")||"",recibo:null,evid:false});
      S.movs.push({id:"MC"+nid("mv"),prod,tipo:"salida",cant,fecha:w.fecha,prop:w.prop,wo:w.id,cliente:true,costo:0,tienda:"",quien:val("mtQ")||"Cliente",notas:val("mtN")||"",recibo:null,evid:false});
    }
    w.hist.push([hora(), `Material ${cliente?"del cliente":"registrado"}: ${p.nombre} × ${cant}`, S.usuario]);
    cm(); flash("wo:"+w.id);
    toast("✓ Material agregado", `${esc(p.nombre)} agregado a WO-${w.id}${cliente?" como material del cliente":""}.`, "v");
    render();
  },
  materialRecibo: d => {
    const m=S.movs.find(x=>x.id===d.id); if(!m) return;
    capturarFoto(url=>{ m.recibo=url; m.evid=true; render(); });
  },});
