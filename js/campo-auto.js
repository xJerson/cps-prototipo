"use strict";
/* ══════════ CAMPO AUTOMÁTICO ══════════
   Quien prueba el prototipo solo no tiene a un técnico real que conteste. Este
   módulo mira el estado después de cada acción de oficina, detecta qué está
   esperando hacer el técnico y lo contesta llamando las MISMAS acciones del
   celular (ACC.*), con datos al azar pero creíbles.

   Lo que el técnico responde depende de dos cosas, nunca de «qué tan rápido o
   cuidadoso» sea:
     · su oficio (especialidad: Housekeeper, Carpeter, Tecnico, Resurface, Make Ready)
     · el servicio de la WO (categoría y servicio)
   Si el oficio no cubre el servicio (una housekeeper en una pintura) se usa un
   paquete genérico y, solo en el perfil «Mixto», sube la probabilidad de problemas.

   Para agregar una respuesta nueva (fase 2: Gustavo, eventos que inicia el
   técnico) basta con empujar un objeto a CAMPO_MANEJADORES:
     {id, detect(): [{k, h:id, wo?, tec?}], responder(item): texto | null}
   Todo lo que se guarda en S.campoAuto es local del navegador (no está en
   NUBE_TABLAS ni NUBE_CONFIG). */

/* ── Estado ── */
const CAMPO_DEFECTO = {on:false, perfil:"todo-bien", demora:2, pausa:0.8, dispPedida:false};
let _campoInicio = false, _campoCorriendo = false, _campoEnMotor = false, _campoTimer = null, _campoRepetir = false;
const CAMPO_MAX_PASOS = 40;
const _campoPlanes = new Map();      // plan al azar por WO / Sub-WO (en memoria)
function CA(){
  S.campoAuto = Object.assign({}, CAMPO_DEFECTO, S.campoAuto || {});
  if(!_campoInicio){ _campoInicio = true; S.campoAuto.on = false; }   // cada vez que se abre la página arranca apagado
  return S.campoAuto;
}

/* ── Utilidades ── */
const cRnd = (a,b) => a + Math.floor(Math.random()*(b-a+1));
const cPick = arr => arr[Math.floor(Math.random()*arr.length)];
const cChance = p => Math.random() < p;
const cSleep = ms => new Promise(r => setTimeout(r, ms));
const cMuestra = (arr,n) => { const c=arr.slice(), o=[]; while(c.length && o.length<n) o.push(c.splice(Math.floor(Math.random()*c.length),1)[0]); return o; };
const cModalAbierto = () => { const m=document.getElementById("mroot"); return !!(m && m.innerHTML.trim()); };
const cMixto = () => CA().perfil === "mixto";
const cTecOk = id => { const t=T(id); return !!t && t.activo!==false && !(t.esp||[]).includes("Supervisor"); };

/* Foto de relleno: un SVG chiquito con color y etiqueta distintos cada vez */
function cFotoURL(w, etiqueta){
  const c = cPick(["#8fa8b8","#b8a98f","#9bb89f","#b89fa8","#a8a8b8","#c4b48a"]);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='240'><rect width='320' height='240' fill='${c}'/>`
    + `<rect x='20' y='20' width='280' height='200' fill='none' stroke='#fff' stroke-width='3' stroke-dasharray='10 6'/>`
    + `<text x='160' y='110' font-family='sans-serif' font-size='24' font-weight='700' text-anchor='middle' fill='#fff'>WO-${w.id}</text>`
    + `<text x='160' y='146' font-family='sans-serif' font-size='16' text-anchor='middle' fill='#fff'>${etiqueta} · simulada</text></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
/* Arma el gancho de pruebas de capturarFoto antes de CADA acción de foto */
function cFoto(w, etiqueta, fn){
  window.__fotoTest = cFotoURL(w, etiqueta);
  try{ fn(); } finally { window.__fotoTest = undefined; }
}
/* Varias acciones leen su dato del DOM con val()/getElementById. Si el campo no
   está (celular cerrado), se crea escondido, se llama la acción y se quita. */
function cConCampos(campos, fn){
  const creados = [], previos = [];
  Object.keys(campos).forEach(id=>{
    const c = campos[id]; let el = document.getElementById(id);
    if(el){ previos.push([el, el.value, el.checked]); }
    else { el = document.createElement(c.tag || "input"); if(c.type) el.type = c.type; el.id = id; el.style.display = "none"; document.body.appendChild(el); creados.push(el); }
    if("value" in c) el.value = c.value;
    if("checked" in c) el.checked = c.checked;
  });
  try{ return fn(); }
  finally{ creados.forEach(e=>e.remove()); previos.forEach(([e,v,k])=>{ e.value=v; e.checked=k; }); }
}
/* El celular del técnico que corresponde a la acción, restaurando lo que la persona tenía abierto */
function cConTecnico(tec, fn){
  const g = {phTec:S.phTec, phRol:S.phRol, phWO:S.phWO, phSub:S.phSub, phView:S.phView, phSheet:S.phSheet};
  S.phTec = tec; S.phRol = "tecnico";
  try{ return fn(); } finally { Object.assign(S, g); }
}
const cMinHora = s => { const [h,m] = String(s||"9:00").split(":").map(Number); return h*60 + (m||0); };

/* ══════════ PAQUETES DE RESPUESTA ══════════
   PAQUETES: por categoría de servicio. OFICIOS: qué categorías cubre cada oficio.
   PAQUETES_OFICIO: ajustes por oficio × categoría (se suman al paquete base). */
const PAQUETES = {
  "Clean":{ fotos:[2,3], dur:[60,150],
    notas:["Limpieza terminada: cocina, baños y recámaras.","Dejé la unidad lista: pisos trapeados, polvo en superficies y ventanas por dentro.","Terminé la limpieza, saqué la basura y revisé que no quedara nada en los closets.","Limpié la cocina por dentro y por fuera, con refrigerador y horno.","Baños desinfectados, espejos sin marcas y piso aspirado y trapeado.","Unidad limpia y revisada. Había sarro en la regadera y lo quité."],
    mats:["limpiador multiusos","desinfectante","desengrasante","limpiavidrios","bolsas de basura","trapeador","aspiradora","esponjas","cloro diluido"],
    hall:["comida vieja en el refrigerador","el horno estaba muy sucio","manchas viejas en la alfombra","moho leve en la regadera","basura que dejó el inquilino anterior"] },
  "Paint":{ fotos:[2,3], dur:[90,300],
    notas:["Apliqué dos manos de pintura en todas las paredes, con cinta en zócalos y marcos.","Resané los agujeros, lijé, puse primer y pinté dos manos.","Terminé el retoque de pintura; dejé secar y revisé que no quedaran marcas de rodillo.","{serv}: primera mano, secado y segunda mano sin problema.","Cubrí pisos y marcos antes de pintar; quité la cinta al final y limpié las salpicaduras."],
    mats:["pintura blanca","primer","cinta de pintor","rodillos","brochas","lona","lija","resanador","cubeta de pintura"],
    hall:["paredes con muchos agujeros de clavos","manchas de humedad que traspasan el primer","pintura anterior muy oscura que pidió una mano extra","marcas de humo en el techo"] },
  "Resurface":{ fotos:[2,3], dur:[120,270],
    notas:["Resurface terminado: limpié, lijé, apliqué base y dos capas de acabado.","Dejé curar el acabado y revisé que no quedaran burbujas ni escurridos.","Reparé las astillas antes de la capa final; quedó parejo y brillante."],
    mats:["kit de resurface","epóxico","lija fina","removedor de cal","cinta","respirador","masilla de relleno"],
    hall:["desportilladuras profundas en la tina","óxido alrededor del drenaje","el acabado anterior se estaba despegando"] },
  "Make Ready Checklist":{ fotos:[2,3], dur:[60,150],
    notas:["Checklist de make ready completo: limpieza, luces, llaves y filtros.","Revisé cada punto de la lista; cambié focos y el filtro del aire.","Make ready terminado. Probé llaves, desagües y detectores de humo."],
    mats:["focos","filtro de aire","baterías de detector","tapas de contactos","limpiador"],
    hall:["detector de humo sin batería","llave del lavabo con goteo","foco fundido en el baño","tapa de contacto rota"] },
  "Flooring Services":{ fotos:[2,3], dur:[60,180],
    notas:["Retiré la alfombra, saqué el relleno y limpié el piso base.","Corté y saqué la alfombra por tramos; quité grapas y tiras.","Piso listo para instalación: sin grapas ni residuos."],
    mats:["navaja","barra de palanca","bolsas de escombro","tiras tack","guantes"],
    hall:["piso de concreto con manchas","grapas y pegamento viejo","madera dañada bajo la alfombra"] },
  "Repair":{ fotos:[1,3], dur:[45,180],
    notas:["Reparé el sheetrock: parche, dos capas de compuesto y lijado, listo para pintar.","Resané y lijé la zona; la textura quedó igual a la pared.","{serv} terminada y revisada; la zona quedó lista para pintura.","Ajusté la puerta y cambié las bisagras; cierra sin rozar."],
    mats:["compuesto para juntas","malla de parche","tornillos","lija","masilla","textura en aerosol","bisagras"],
    hall:["humedad detrás del panel","el hueco era más grande de lo previsto","madera suave en el marco","una fuga pequeña en el tubo"] },
  "Installation":{ fotos:[1,3], dur:[60,240],
    notas:["{serv} lista: quedó firme, a nivel y probé que funciona.","Instalé, nivelé y fijé; limpié la zona al terminar.","Terminé la instalación, ajusté los remates y retiré el escombro."],
    mats:["tornillos","silicón","nivel","anclas","adhesivo","sellador","herrajes"],
    hall:["la pared no tenía soporte para anclar","las medidas no eran las de la orden","una pieza venía con defecto"] },
  "Removal":{ fotos:[1,2], dur:[45,150],
    notas:["Retiré y saqué todo lo indicado; la unidad quedó despejada.","Terminé el desalojo; barrí y dejé el área limpia."],
    mats:["bolsas de escombro","carretilla","guantes","navaja"],
    hall:["había más muebles de los esperados","muebles muy pesados","residuos que necesitan contenedor"] }
};
const PAQUETE_GENERICO = { fotos:[1,3], dur:[60,150],
  notas:["Trabajo terminado según la orden; dejé la unidad limpia y revisada.","Terminé lo que pedía la orden y lo revisé antes de salir.","Servicio completado; tomé fotos de cómo quedó."],
  mats:["herramienta básica","guantes","limpiador"], hall:[] };
const OFICIOS = {
  "Housekeeper":{cubre:["Clean","Make Ready Checklist","Removal"]},
  "Carpeter":{cubre:["Repair","Installation","Flooring Services","Removal"]},
  "Tecnico":{cubre:["Repair","Installation","Paint","Make Ready Checklist","Clean"]},
  "Resurface":{cubre:["Resurface","Paint"]},
  "Make Ready":{cubre:["Make Ready Checklist","Clean","Paint","Repair","Removal"]}
};
const PAQUETES_OFICIO = {
  "Housekeeper|Make Ready Checklist":{notas:["Dejé la unidad impecable y revisé los puntos del checklist de limpieza."],mats:["bolsas de basura","limpiador de baños"]},
  "Housekeeper|Removal":{notas:["Saqué la basura y lo que había dejado el inquilino; barrí al final."],mats:["bolsas industriales"]},
  "Carpeter|Repair":{notas:["Cambié el panel dañado, fijé con tornillos y dejé la junta lista para resane.","Armé el marco, escuadré la puerta y puse bisagras nuevas."],mats:["tablaroca","tornillos para panel","escuadra","cinta de papel"]},
  "Carpeter|Installation":{notas:["Tomé medidas dos veces y corté a la medida; todo quedó a escuadra."],mats:["sierra","taladro","clavos de acabado"]},
  "Carpeter|Flooring Services":{notas:["Levanté el piso por secciones y dejé la base lista para el material nuevo."],mats:["espátula","bolsas de escombro"]},
  "Tecnico|Paint":{notas:["Cubrí, lijé, resané y pinté con rodillo; dos manos con secado entre una y otra."],mats:["rodillo de felpa corta","charola","extensión de rodillo"]},
  "Tecnico|Repair":{notas:["Revisé, reparé y probé que todo funcione antes de cerrar."],mats:["destornillador","sellador","pegamento de contacto"]},
  "Tecnico|Installation":{notas:["Instalé y probé el funcionamiento; ajusté lo que quedó flojo."],mats:["taladro","nivel láser"]},
  "Resurface|Paint":{notas:["Preparé la superficie con lija y limpiador antes de pintar; el acabado quedó liso."],mats:["pintura epóxica","desengrasante"]},
  "Make Ready|Clean":{notas:["Hice la limpieza de make ready completa y dejé la unidad lista para rentar."],mats:["limpiador de pisos","paños de microfibra"]},
  "Make Ready|Repair":{notas:["Resolví los pendientes menores de la lista: contactos, bisagras y tapas."],mats:["tapas de contactos","tornillos surtidos"]},
  "Make Ready|Paint":{notas:["Retoqué las paredes con la pintura de la propiedad y revisé los zócalos."],mats:["pintura de la propiedad","brocha chica"]}
};
const PAQUETES_SERV = [
  {re:/carpet/i,       notas:["La alfombra quedó limpia y sin manchas visibles."],mats:["limpiador de alfombra","máquina de extracción"]},
  {re:/cabinet/i,      notas:["Los gabinetes quedaron parejos, sin escurridos ni marcas de brocha."],mats:["desengrasante","lija 220"]},
  {re:/ceiling/i,      notas:["Los techos quedaron parejos, sin marcas de rodillo ni manchas."],mats:["extensión de rodillo","pintura para techo"]},
  {re:/tub|tile|sink|countertop/i, notas:["Dejé curar el acabado y revisé que el sellado quedara completo."],mats:["sellador","removedor de sarro"]},
  {re:/door|window/i,  notas:["Probé que abra y cierre bien, sin rozar."],mats:["bisagras","lubricante"]}
];
function cOficioPara(tecId, cat){
  const esp = (T(tecId)||{}).esp || [];
  return esp.find(e => (OFICIOS[e]||{cubre:[]}).cubre.includes(cat)) || null;
}
/* Paquete final para esta WO y este técnico */
function cPaquete(w, tecId){
  const oficio = cOficioPara(tecId, w.cat), match = !!oficio;
  const base = (match && PAQUETES[w.cat]) || PAQUETE_GENERICO;
  const p = {match, oficio, fotos:base.fotos, dur:base.dur.slice(), notas:base.notas.slice(), mats:base.mats.slice(), hall:base.hall.slice()};
  if(match){
    const x = PAQUETES_OFICIO[oficio+"|"+w.cat]; if(x){ p.notas.push(...x.notas); p.mats.push(...x.mats); }
    PAQUETES_SERV.filter(s=>s.re.test(w.serv||"")).forEach(s=>{ p.notas.push(...s.notas); p.mats.push(...s.mats); });
  }
  const s = w.serv || "";
  const k = /touch|extra|partial|accent|handles|rod/i.test(s) ? 0.45 : /full|heavy|kitchen|with wall|4 doors/i.test(s) ? 1.3 : 1;
  p.dur = [Math.round(p.dur[0]*k), Math.round(p.dur[1]*k)];
  return p;
}
/* Probabilidades de problema (solo perfil «Mixto»), por tipo de servicio */
const CAMPO_PROB_DATOS = {"Paint":0.18, "Repair":0.20, "Installation":0.18, "Resurface":0.15, "Clean":0.10};
function cProbDatos(w, match){ if(!cMixto()) return 0; return Math.min(0.5, (CAMPO_PROB_DATOS[w.cat]||0.12) * (match?1:2)); }
function cProbParcial(match){ return !cMixto() ? 0 : (match ? 0.25 : 0.5); }
function cNota(w, p){
  let t = cPick(p.notas).replace("{serv}", (w.serv||"El servicio")).replace(/^./, c=>c.toUpperCase());
  if(cChance(0.65)) t += " Usé " + cMuestra(p.mats, cRnd(1,3)).join(", ") + ".";
  if(p.hall.length && cChance(0.3)) t += " Encontré " + cPick(p.hall) + ".";
  if(!p.match && cMixto() && cChance(0.5)) t += " Me faltó material específico para este servicio.";
  return t;
}
function cPlan(w){
  if(!_campoPlanes.has(w.id)){
    const p = cPaquete(w, w.tec);
    _campoPlanes.set(w.id, {p, fotos:cRnd(p.fotos[0], p.fotos[1]), antes:cChance(0.5), nota:cChance(0.85),
      dur:cRnd(p.dur[0], p.dur[1]), mismatch:cChance(cProbDatos(w, p.match)), tarde:cMixto() && cChance(0.15)});
  }
  return _campoPlanes.get(w.id);
}

/* ══════════ MANEJADORES (uno por traspaso oficina → técnico) ══════════ */
const cNombre = id => tecN(id);
const cHist = (w, txt) => w.hist.push([hora(), "(Campo automático) "+txt, "Campo automático"]);
const CAMPO_MANEJADORES = [];

/* Oficina pidió información (pedirInfo) → el técnico la completa */
CAMPO_MANEJADORES.push({ id:"info",
  detect:() => S.wos.filter(w=>w.tec && cTecOk(w.tec) && w.infoPedida).map(w=>({k:"info:"+w.id, h:"info", wo:w.id, tec:w.tec})),
  responder:it => {
    const w = W(it.wo); if(!w || !w.infoPedida) return null;
    const id = String(w.id);
    if((w.infoPedida.falta||[]).includes("evidencia") && !w.evid){
      const n0 = w.evid||0;
      S.reloj += cRnd(3,8);
      cConTecnico(w.tec, ()=>cFoto(w, "evidencia pedida", ()=>ACC.fFoto({id})));
      return (w.evid||0) > n0 ? `${cNombre(w.tec)} subió la foto que pidió oficina en WO-${w.id}` : null;
    }
    cConTecnico(w.tec, ()=>ACC.fCompletaInfo({id}));
    return !W(w.id).infoPedida ? `${cNombre(w.tec)} completó lo que faltaba en WO-${w.id}` : null;
  }});

/* Llegada */
CAMPO_MANEJADORES.push({ id:"llegar",
  detect:() => S.wos.filter(w=>w.tec && cTecOk(w.tec) && esAgendada(w.estado) && !asisDe(w.id) && !woEspera(w)).map(w=>({k:"llegar:"+w.id, h:"llegar", wo:w.id, tec:w.tec})),
  responder:it => {
    const w = W(it.wo); if(!w || asisDe(w.id) || woEspera(w)) return null;
    /* fLlegue suma 23 min al reloj: se acomoda para llegar cerca de la hora programada (el reloj nunca retrocede) */
    const pl = cPlan(w), prog = cMinHora(w.horaProg||"9:00");
    const llega = prog + (pl.tarde ? cRnd(15,30) : cRnd(-5,6));
    if(S.reloj + 23 < llega) S.reloj = llega - 23;
    S.reloj = Math.min(S.reloj, 20*60);
    cConTecnico(w.tec, ()=>ACC.fLlegue({id:String(w.id)}));
    return asisDe(w.id) ? `${cNombre(w.tec)} llegó a WO-${w.id}` : null;
  }});

/* Corroborar la unidad antes de empezar (coincide o no coincide) */
CAMPO_MANEJADORES.push({ id:"corroborar",
  detect:() => S.wos.filter(w=>w.tec && cTecOk(w.tec) && ["In progress","Esperando aprobación"].includes(w.estado) && !w.corroborado && !w.infoPedida).map(w=>({k:"corroborar:"+w.id, h:"corroborar", wo:w.id, tec:w.tec})),
  responder:it => {
    const w = W(it.wo); if(!w || w.corroborado) return null;
    const id = String(w.id), pl = cPlan(w), u = U(w.unidad);
    if(pl.mismatch){
      /* Un dato distinto de lo que dice el sistema, o dos */
      const ocup = u.ocupacion || "Occupied";
      const cambios = cMuestra(["num","pisos","ocupacion"].concat(u.bedrooms!=null?["bedrooms"]:[], u.bathrooms!=null?["bathrooms"]:[]), cChance(0.3)?2:1);
      const campos = {
        cnNum:{value: cambios.includes("num") ? (cChance(0.5) ? "B"+u.num : String(u.num).replace(/\d(?!.*\d)/, d=>String((+d+1)%10))) : String(u.num)},
        cnPisos:{value: String(cambios.includes("pisos") ? cPick([1,2,3].filter(x=>x!==u.pisos)) : (u.pisos||1))},
        cnOcup:{value: cambios.includes("ocupacion") ? (ocup==="Vacant"?"Occupied":"Vacant") : ocup},
        cnTxt:{tag:"textarea", value: cPick(["La unidad no coincide con lo que dice la orden.","Revisé al llegar y los datos son distintos.","Lo que veo en sitio no es lo que tienen registrado."])}
      };
      if(u.bedrooms!=null) campos.cnBed = {value: String(cambios.includes("bedrooms") ? Math.max(0, u.bedrooms + (cChance(0.5)?1:-1) || 1) : u.bedrooms)};
      if(u.bathrooms!=null) campos.cnBath = {value: String(cambios.includes("bathrooms") ? Math.max(0, u.bathrooms + (cChance(0.5)?1:-1) || 1) : u.bathrooms)};
      cConTecnico(w.tec, ()=>cConCampos(campos, ()=>ACC.woCorroboraNoOK({id})));
      return W(w.id).corroborado ? `${cNombre(w.tec)} reportó que la unidad de WO-${w.id} no coincide` : null;
    }
    cConTecnico(w.tec, ()=>ACC.woCorrobora({id}));
    return W(w.id).corroborado ? `${cNombre(w.tec)} corroboró la unidad de WO-${w.id}` : null;
  }});

/* Trabajo en sitio: foto del antes, evidencia, nota y cierre (también return fix y WO encadenadas) */
CAMPO_MANEJADORES.push({ id:"trabajo",
  detect:() => S.wos.filter(w=>w.tec && cTecOk(w.tec) && w.estado==="In progress" && w.corroborado && !woEspera(w)).map(w=>({k:"trabajo:"+w.id, h:"trabajo", wo:w.id, tec:w.tec})),
  responder:it => {
    const w = W(it.wo); if(!w || w.estado!=="In progress") return null;
    const id = String(w.id), pl = cPlan(w), n = cNombre(w.tec);
    if(pl.antes && !(w.antesFotos||[]).length){
      cConTecnico(w.tec, ()=>cFoto(w, "antes", ()=>ACC.fFotoAntes({id})));
      return (w.antesFotos||[]).length ? `${n} subió la foto del antes en WO-${w.id}` : null;
    }
    if((w.evid||0) < pl.fotos){
      const n0 = w.evid||0;
      cConTecnico(w.tec, ()=>cFoto(w, "después "+(n0+1)+"/"+pl.fotos, ()=>ACC.fFoto({id})));
      return (w.evid||0) > n0 ? `${n} subió evidencia ${w.evid}/${pl.fotos} de WO-${w.id}` : null;
    }
    if(pl.nota && !w.notas){
      const txt = cNota(w, pl.p);
      let ta = document.querySelector(`textarea[data-a="fNotaTrabajo"][data-id="${id}"]`), tmp = false;
      if(!ta){ ta = document.createElement("textarea"); ta.dataset.a = "fNotaTrabajo"; ta.dataset.id = id; ta.style.display = "none"; document.body.appendChild(ta); tmp = true; }
      ta.value = txt;
      try{ cConTecnico(w.tec, ()=>ACC.fNotaTrabajo({id})); } finally { if(tmp) ta.remove(); }
      if(w.notas === txt){ cHist(w, "Nota de trabajo registrada"); return `${n} anotó qué hizo en WO-${w.id}`; }
      return null;
    }
    /* Terminar: el reloj avanza hasta que el tiempo en sitio coincida con la duración típica del servicio */
    const a = asisDe(w.id);
    if(a){ const trans = S.reloj - cMinHora(a.horaReal), extra = pl.dur - trans - 28; if(extra > 0) S.reloj += extra; }
    S.reloj = Math.min(S.reloj, 21*60);
    cConTecnico(w.tec, ()=>{
      ACC.fTermine({id});
      /* Sin llegada registrada, fTermine abre la hoja de «declarar llegada» */
      if(!asisDe(w.id) && S.phSheet && S.phSheet.t==="llegada")
        cConCampos({plH:{value: w.horaProg||"9:00"}}, ()=>ACC.fLlegadaDecl({id}));
    });
    return W(w.id).estado==="Completed" ? `${n} terminó WO-${w.id}${W(w.id).horas?` (${W(w.id).horas} h en sitio)`:""}` : null;
  }});

/* Sub-WO planificada: iniciar → initial finding → evidencia → terminar */
CAMPO_MANEJADORES.push({ id:"subwo",
  detect:() => subWOsOperativas().filter(a=>{ const t=tecSubWO(a); return t && cTecOk(t) && W(a.wo) && ["Assigned","In progress"].includes(a.estadoTrabajo||"Assigned"); })
    .map(a=>({k:"subwo:"+a.id, h:"subwo", sub:a.id, wo:a.wo, tec:tecSubWO(a)})),
  responder:it => {
    const a = S.adicionales.find(x=>x.id===it.sub); if(!a) return null;
    const estado = a.estadoTrabajo||"Assigned", tec = tecSubWO(a), w = W(a.wo), id = String(a.id), n = cNombre(tec);
    const key = "s"+a.id;
    if(!_campoPlanes.has(key)){ const p = cPaquete(w, tec); _campoPlanes.set(key, {p, fotos:cRnd(1,3), parcial:cChance(cProbParcial(p.match))}); }
    const pl = _campoPlanes.get(key);
    if(estado==="Assigned"){
      cConTecnico(tec, ()=>ACC.fSubIniciar({id}));
      return a.estadoTrabajo==="In progress" ? `${n} inició la Sub-WO "${a.concepto}" de WO-${a.wo}` : null;
    }
    if(!a.hallazgoFoto){
      cConTecnico(tec, ()=>cFoto(w, "initial finding", ()=>ACC.fSubHallazgo({id})));
      return a.hallazgoFoto ? `${n} subió el initial finding de la Sub-WO "${a.concepto}"` : null;
    }
    if((a.fotosEvidArr||[]).length < pl.fotos){
      const n0 = (a.fotosEvidArr||[]).length;
      cConTecnico(tec, ()=>cFoto(w, "evidencia sub-WO", ()=>ACC.fSubFoto({id})));
      return (a.fotosEvidArr||[]).length > n0 ? `${n} subió evidencia ${a.fotosEvidArr.length}/${pl.fotos} de la Sub-WO "${a.concepto}"` : null;
    }
    const total = Math.max(1, parseFloat(a.cant)||1), hechas = (pl.parcial && total>1) ? cRnd(1, total-1) : total;
    S.reloj = Math.min(S.reloj + cRnd(10,40), 21*60);
    cConTecnico(tec, ()=>cConCampos({subHechas:{value:String(hechas)}}, ()=>ACC.fSubTerminarGuardar({id})));
    return a.estadoTrabajo==="Completed" ? `${n} terminó la Sub-WO "${a.concepto}" de WO-${a.wo} (${hechas}/${total})` : null;
  }});

/* Conformidad de la nómina semanal */
CAMPO_MANEJADORES.push({ id:"nomina",
  detect:() => Object.keys(S.nomAprob||{}).filter(k=>(S.nomAprob[k]||{}).conf==="Pendiente").map(k=>{ const [tec,sem]=k.split("|"); return {k:"nomina:"+k, h:"nomina", tec, sem}; }).filter(x=>cTecOk(x.tec)),
  responder:it => {
    const a = nomAprob(it.tec, it.sem); if(!a || a.conf!=="Pendiente") return null;
    const n = cNombre(it.tec);
    if(cMixto() && cChance(0.2)){
      const txt = cPick(["Me falta pagar una WO de esta semana.","El monto de una WO no coincide con lo que acordamos.","No veo el pago de las horas extra del sábado."]);
      cConTecnico(it.tec, ()=>cConCampos({nomObsT:{value:txt}}, ()=>ACC.nomObs({tec:it.tec, sem:it.sem})));
      return nomAprob(it.tec, it.sem).conf==="Observada" ? `${n} envió una observación a su pago de la semana ${it.sem}` : null;
    }
    cConTecnico(it.tec, ()=>ACC.nomConforme({tec:it.tec, sem:it.sem}));
    return nomAprob(it.tec, it.sem).conf==="Conforme" ? `${n} quedó conforme con su pago de la semana ${it.sem}` : null;
  }});

/* Disponibilidad de la semana siguiente (después de «Recordar» en oficina) */
CAMPO_MANEJADORES.push({ id:"disp",
  detect:() => {
    if(!CA().dispPedida) return [];
    const L = S.tecnicos.filter(t=>t.activo!==false && cTecOk(t.id) && !dispSemDe(t.id)).map(t=>({k:"disp:"+t.id, h:"disp", tec:t.id}));
    if(!L.length) CA().dispPedida = false;
    return L;
  },
  responder:it => {
    if(dispSemDe(it.tec)) return null;
    const campos = {};
    semSigDias().forEach((f,i)=>{
      const disp = cChance(i===5 ? 0.4 : 0.85);
      campos["dpD"+i] = {type:"checkbox", checked:disp};
      campos["dpA"+i] = {value: disp ? cPick(["07:00","08:00","09:00"]) : ""};
      campos["dpB"+i] = {value: disp ? cPick(["15:00","16:00","17:00","18:00"]) : ""};
    });
    cConTecnico(it.tec, ()=>cConCampos(campos, ()=>ACC.fDispOK({})));
    return dispSemDe(it.tec) ? `${cNombre(it.tec)} envió su disponibilidad de la semana` : null;
  }});

/* ══════════ MOTOR ══════════ */
function campoPendientes(woId){
  const L = [];
  CAMPO_MANEJADORES.forEach(m=>{ try{ L.push(...m.detect()); }catch(e){ console.warn("Campo automático: detect", m.id, e); } });
  return woId==null ? L : L.filter(x=>x.wo===+woId);
}
/* Responde UN pendiente. Antes de actuar vuelve a confirmar que sigue pendiente (otro navegador pudo contestar). */
function campoResponder(item){
  const m = CAMPO_MANEJADORES.find(x=>x.id===item.h); if(!m) return null;
  if(!m.detect().some(x=>x.k===item.k)) return null;
  return m.responder(item) || null;
}
async function campoCorrer(op){
  op = op || {};
  if(_campoCorriendo) return {pasos:0, ocupado:true};
  _campoCorriendo = true; _campoEnMotor = true;
  const fallidas = new Set(), log = [];
  let pasos = 0, modal = false;
  try{
    while(pasos < CAMPO_MAX_PASOS){
      if(!op.forzar && !CA().on) break;
      if(cModalAbierto()){ modal = true; break; }      // no pisar un formulario que la persona tiene abierto
      const it = campoPendientes(op.wo).find(x=>!fallidas.has(x.k));
      if(!it) break;
      let txt = null;
      try{ txt = campoResponder(it); } catch(e){ console.warn("Campo automático:", it.k, e); }
      if(!txt){ fallidas.add(it.k); continue; }
      pasos++; log.push(txt);
      toast("Técnico (auto)", esc(txt), "v"); render();
      if(!op.sinPausa && CA().pausa>0) await cSleep(CA().pausa*1000);
    }
  } finally { _campoCorriendo = false; _campoEnMotor = false; }
  if(!op.forzar && (modal || _campoRepetir)){ _campoRepetir = false; campoProgramar(modal ? 4 : null); }
  return {pasos, log};
}
function campoProgramar(seg){
  if(window.__R) return;                                  // no durante las pruebas automáticas
  clearTimeout(_campoTimer);
  _campoTimer = setTimeout(()=>campoCorrer({}), (seg!=null ? seg : CA().demora)*1000);
}
/* Lo llama bootstrap.js al terminar cada acción (ya con guardado) */
const CAMPO_NO_DISPARAN = new Set(["campoAutoToggle","campoAutoPerfil","campoResponderWO","ir","tab","cm","pop","pcl","campana",
  "avLeidos","temaToggle","fView","fAbrir","fSubAbrir","fSheetNo","coachOff","coachOn","ayudaVistaToggle","gvTab","phTecPick","verTecnicoCel"]);
function campoAutoTrasAccion(k){
  try{
    if(CAMPO_NO_DISPARAN.has(k)) return;
    if(k==="dispRecordar") CA().dispPedida = true;
    if(_campoEnMotor){ return; }                          // son las propias acciones del motor: la cadena sigue sola
    if(_campoCorriendo){ _campoRepetir = true; return; }
    if(CA().on) campoProgramar();
  }catch(e){ console.warn("Campo automático:", e); }
}

/* ══════════ INTERFAZ ══════════ */
Object.assign(ACC, {
  campoAutoToggle: () => { const c = CA(); c.on = !c.on; if(c.on) campoProgramar(); else clearTimeout(_campoTimer);
    toast("Campo automático", c.on ? "Activo: después de cada acción de oficina el técnico responde solo." : "Apagado.", c.on?"v":""); render(); },
  campoAutoPerfil: () => { const s = document.querySelector("#campoAutoBox select"); if(s) CA().perfil = s.value; render(); },
  campoResponderWO: d => {
    if(_campoCorriendo){ toast("Campo automático","Ya hay una respuesta en curso.","w"); return; }
    campoCorrer({wo:+d.id, forzar:true}).then(r=>{ if(!r.pasos) toast("Campo automático","El técnico no tiene nada pendiente en esta WO.","w"); });
  }
});
let _campoHtml = "";
function campoAutoPintar(){
  const box = document.getElementById("campoAutoBox"); if(!box) return;
  const c = CA();
  const h = `<button class="btn sm ${c.on?"v":""}" data-a="campoAutoToggle" title="Cuando está activo, el técnico responde solo después de cada acción de oficina">Campo automático: ${c.on?"activo":"apagado"}</button>`
    + `<select class="usr" data-a="campoAutoPerfil" title="Todo bien: sin problemas. Mixto: a veces hay datos que no coinciden, avances parciales u observaciones."><option value="todo-bien" ${c.perfil==="todo-bien"?"selected":""}>Todo bien</option><option value="mixto" ${c.perfil==="mixto"?"selected":""}>Mixto</option></select>`;
  if(h !== _campoHtml){ _campoHtml = h; box.innerHTML = h; }
}
{ const _render0 = render; render = function(){ _render0(); campoAutoPintar(); }; }
