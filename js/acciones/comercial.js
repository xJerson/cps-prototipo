"use strict";
Object.assign(ACC, {

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
  },});
