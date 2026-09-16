"use strict";
Object.assign(ACC, {


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

  /* ── APP DE GUSTAVO ─────────────────────────────────────────────────── */
  verGustavoCel: () => { S.phRol="supervisor"; S.phView="panel"; S.phone=true; S.gRep=null; render(); },

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
  },});
