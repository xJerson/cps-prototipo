"use strict";
Object.assign(ACC, {

  verTecnicoCel: () => { S.phRol="tecnico"; S.phView=S.phWO?"wo":"agenda"; S.phone=true; S.gRep=null; render(); },
  /* Elegir de qué técnico se ve el celular */
  phTecPick: () => { const s=document.getElementById("phTecSel");
    if(s){ S.phTec=s.value; S.phRol="tecnico"; S.phWO=null; S.phSub=null; S.phView="agenda"; render(); } },

  /* celular */
  fView: d => { S.phView=d.v; if(d.v==="avisos") S.notis.forEach(n=>n.leido=true); if(S.gRep) S.gRep=null;
    /* La vista web de Gustavo (VIEWS.gustavoweb) comparte esta misma pantalla
       de contenido; si un enlace interno salta de pestaña (p.ej. "Visitas
       programadas" → Mi ruta), que salte en las dos, no solo en el celular. */
    if(["panel","ruta","dia","reportar","devs"].includes(d.v)) S.gvTab=d.v;
    render(); },
  fAbrir: d => { S.phView="wo"; S.phWO=+d.id; render(); },
  fSubAbrir: d => { S.phView="subwo"; S.phSub=+d.id; render(); },
  fSubIniciar: d => {
    const a=S.adicionales.find(x=>x.id===+d.id); if(!a) return;
    if(tecSubWO(a)!==S.phTec){ toast("Sub-WO reasignada","Esta tarea ya no está asignada a este técnico.","w"); S.phView="agenda"; render(); return; }
    a.estadoTrabajo="In progress";
    (a.hist=a.hist||[]).push([hora(),"Trabajo iniciado",tecN(S.phTec)]);
    const w=W(a.wo); if(w) w.hist.push([hora(),`Sub-WO iniciada · ${a.concepto}`,tecN(S.phTec)]);
    toast("Sub-WO iniciada",`Ya puedes cargar la evidencia de <b>${esc(a.concepto)}</b>.`,"v"); render();
  },
  fSubFoto: d => {
    const a=S.adicionales.find(x=>x.id===+d.id); if(!a) return;
    capturarFoto(url=>{
      (a.fotosEvidArr=a.fotosEvidArr||[]).push(fotoNueva(url,tecN(S.phTec)));
      (a.hist=a.hist||[]).push([hora(),"Evidencia cargada",tecN(S.phTec)]);
      const w=W(a.wo); if(w) w.hist.push([hora(),`Evidencia agregada a Sub-WO · ${a.concepto}`,tecN(S.phTec)]);
      toast("📷 Evidencia recibida",`${a.fotosEvidArr.length} foto(s) en esta Sub-WO.`,"v"); render();
    });
  },
  fSubHallazgo: d => {
    const a=S.adicionales.find(x=>x.id===+d.id); if(!a) return;
    capturarFoto(url=>{
      a.hallazgoFoto=fotoNueva(url,tecN(S.phTec));
      (a.hist=a.hist||[]).push([hora(),"Initial finding cargado",tecN(S.phTec)]);
      const w=W(a.wo); if(w) w.hist.push([hora(),`Initial finding agregado a Sub-WO · ${a.concepto}`,tecN(S.phTec)]);
      toast("📷 Initial finding guardado","La foto quedó separada de la evidencia final.","v"); render();
    });
  },
  fSubTerminar: d => {
    const a=S.adicionales.find(x=>x.id===+d.id); if(!a) return;
    if(!(a.fotosEvidArr||[]).length){ toast("🚫 Falta la evidencia","Agrega al menos una foto antes de terminar la Sub-WO.","r"); return; }
    a.estadoTrabajo="Completed";
    (a.hist=a.hist||[]).push([hora(),"Sub-WO terminada",tecN(S.phTec)]);
    const w=W(a.wo);
    if(w){
      w.hist.push([hora(),`Sub-WO terminada · ${a.concepto} · ${(a.fotosEvidArr||[]).length} evidencia(s)`,tecN(S.phTec)]);
      const pendientes=subWOsOperativas().some(x=>x.wo===w.id && x.estadoTrabajo!=="Canceled" && (x.estadoTrabajo!=="Completed" || !(x.fotosEvidArr||[]).length));
      if(w.estado==="Completed" && w.evid>0 && ingresoWO(w)!==null && !pendientes){
        w.validada=true; w.hist.push([hora(),"Validada automáticamente: WO y Sub-WO completas","Sistema"]);
      }
    }
    avisar("Erika","Sub-WO terminada",`WO-${a.wo} · ${a.concepto} quedó completa con evidencia.`,"v");
    toast("✓ Sub-WO terminada","Oficina ya recibió el cierre y la evidencia.","v"); render();
  },
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
  fFoto: d => { const w=W(+d.id); S.reloj+=5;
    capturarFoto(url=>{
      (w.evidFotos=w.evidFotos||[]).push(fotoNueva(url, T(w.tec).nombre));
      w.evid=w.evidFotos.length;
      w.hist.push([hora(),"Cargó evidencia",T(w.tec).nombre]);
      toast("📷 Evidencia recibida",`WO-${w.id} ya tiene ${w.evid} foto(s).`,"v"); render();
    });
  },
  fAdic: d => { S.phSheet={t:"adic", wo:+d.id,
    desc:"Hueco en el sheetrock del bano. Hay que poner masa y pintar antes del clean.",
    ubic:"Bano", filas:[{c:"Sheetrock",q:"1"}]}; render(); },
  fAdicFoto: d => { leerAdic();
    capturarFoto(url=>{ S.phSheet.filas[+d.i].foto=url; render(); }); },
  fAdicMas: () => { leerAdic();
    // El renglón nuevo arranca en un concepto que todavía no usó: nadie quiere
    // «Sheetrock, Sheetrock» y tener que corregirlo a mano en el celular.
    const cs=activos("adicionales"), ya=S.phSheet.filas.map(f=>f.c);
    S.phSheet.filas.push({c: cs.find(c=>!ya.includes(c)) || cs[0], q:"1"});
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
      concepto:f.c, cant:parseFloat(f.q)||1,
      estado:"Pendiente", aprob:null, origen:"Técnico",
      // Punto 7 del feedback: antes era una sola foto fija para todo el
      // aviso — ahora cada hallazgo trae la suya propia (f.foto, opcional,
      // se carga renglón por renglón desde el celular con fAdicFoto).
      // hallazgoFoto queda separada de fotosEvidArr: es la foto del
      // problema al encontrarlo (Initial Findings), no evidencia de que
      // ya se resolvió — si se mezclan no se puede armar el historial
      // visual por etapas que pidió Claudia.
      fotosRefArr:[], fotosEvidArr:[], hallazgoFoto:f.foto?fotoNueva(f.foto,T(w.tec).nombre):null,
      specs:{}, tec:null, fecha:null,
      hist:[[hora(),`Creada por el técnico en sitio: ${f.c}`,T(w.tec).nombre]]}));
    /* El técnico sigue con lo que tenía programado — el adicional no frena
       la WO. Lo que sí queda frenado es el pago/factura de ESA WO puntual:
       la excepción en vivo que arma excAuto() ("Adicional en sitio") ya se
       encarga de eso a través de woBloqueada(), sin necesidad de congelar
       el estado de la WO ni la agenda del técnico. */
    w.hist.push([hora(),`Pidió aprobación de un adicional · ${lista}`,T(w.tec).nombre]);
    S.phSheet=null;
    toast("⚠ Adicional enviado a oficina",
      `${sh.filas.length} concepto(s): ${esc(lista)}. Entró como <b>excepción</b>: WO-${w.id} no se paga ni se factura hasta que Claudia decida — pero podés seguir con lo que sigue programado.`,"w");
    render(); },
  fTermine: d => {
    const w=W(+d.id);
    /* Un adicional pendiente ya NO frena que el técnico cierre lo que tenía
       programado — el pago/factura de esta WO igual queda frenado por la
       excepción en vivo que arma excAuto() (ver woBloqueada), así que no
       hace falta bloquear también el cierre del trabajo en sí. */
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
    const subsPend=subWOsOperativas().some(a=>a.wo===w.id && a.estadoTrabajo!=="Canceled" && (a.estadoTrabajo!=="Completed" || !(a.fotosEvidArr||[]).length));
    if(w.evid>0 && ingresoWO(w)!==null && !subsPend){
      w.validada=true;
      w.hist.push([hora(),"Validada automáticamente: evidencia y tarifa completas","Sistema"]);
    } else if(subsPend){
      w.hist.push([hora(),"Validación pendiente: hay Sub-WO sin terminar o sin evidencia","Sistema"]);
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
  },});
