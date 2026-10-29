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

   Gustavo (supervisor de campo) también contesta solo: paradas de su ruta, inspección para estimado, returns y
   reporte del día (ver «GUSTAVO»).
   Para agregar una respuesta nueva basta con empujar un objeto a CAMPO_MANEJADORES:
     {id, detect(), proponer(item), responder(item, datos, prop)} (ver «MANEJADORES»)
   Todo lo que se guarda en S.campoAuto es local del navegador (no está en
   NUBE_TABLAS ni NUBE_CONFIG). */

/* ── Estado ── */
/* modo: "auto" (contesta solo) | "preguntar" (oficina revisa y edita cada respuesta) | "apagado".
   `on` se deriva del modo (activo = cualquiera que no sea apagado) para no romper el código que lo lee. */
const CAMPO_DEFECTO = {modo:"apagado", on:false, perfil:"todo-bien", demora:2, pausa:0.8, dispPedida:false};
const CAMPO_MODOS = ["auto","preguntar","apagado"];
let _campoInicio = false, _campoCorriendo = false, _campoEnMotor = false, _campoTimer = null, _campoRepetir = false;
const CAMPO_MAX_PASOS = 60;
const CAMPO_REINTENTO = 30;           // segundos antes de volver a preguntar algo que oficina dejó «para después»
const _campoPlanes = new Map();      // plan al azar por WO / Sub-WO (en memoria)
function CA(){
  S.campoAuto = Object.assign({}, CAMPO_DEFECTO, S.campoAuto || {});
  const c = S.campoAuto;
  if(!_campoInicio){ _campoInicio = true; c.modo = "apagado"; }   // cada vez que se abre la página arranca apagado
  if(!CAMPO_MODOS.includes(c.modo)) c.modo = c.on ? "auto" : "apagado";
  c.on = c.modo !== "apagado";
  return c;
}

/* ── Utilidades ── */
const cRnd = (a,b) => a + Math.floor(Math.random()*(b-a+1));
const cPick = arr => arr[Math.floor(Math.random()*arr.length)];
const cChance = p => Math.random() < p;
const cSleep = ms => new Promise(r => setTimeout(r, ms));
const cMuestra = (arr,n) => { const c=arr.slice(), o=[]; while(c.length && o.length<n) o.push(c.splice(Math.floor(Math.random()*c.length),1)[0]); return o; };
const cModalAbierto = () => { const m=document.getElementById("mroot"); return !!(m && m.innerHTML.trim()); };
const cMixto = () => CA().perfil === "mixto";
const cPreg = () => CA().modo === "preguntar";
const cHM = m => { m = Math.max(0, Math.round(m)); return String(Math.floor(m/60)).padStart(2,"0") + ":" + String(m%60).padStart(2,"0"); };
const cSi = v => v === true || v === "si";
const cSiNo = b => b ? "si" : "no";
/* De una propuesta saca los valores por id: {hacer:"si", fotos:2, ...} */
const cDatos = prop => { const o = {}; ((prop && prop.campos) || []).forEach(c=>{ o[c.id] = c.valor; }); return o; };

/* ══════════ PASOS OBLIGATORIOS Y OPCIONALES + BITÁCORA ══════════
   Obligatorios (siempre se hacen): llegar, corroborar la unidad, al menos 1 foto de evidencia y terminar.
   Opcionales (se hacen u omiten al azar, decidido UNA vez en el plan de la WO): foto del antes, nota de
   trabajo, fotos extra de evidencia, conformidad de nómina, disponibilidad y foto de initial finding de la Sub-WO.
   Además, en «Mixto» un traspaso puede quedar SIN RESPONDER un rato (nómina, disponibilidad, info que pidió
   oficina): se reintenta en las siguientes corridas o con «Responder ahora», así el motor nunca se atora.
   Cada paso queda en S.campoLog (local del navegador: no está en NUBE_TABLAS ni NUBE_CONFIG). */
const CAMPO_LOG_MAX = 300;
let _campoPor = "auto";               // quién está contestando ahora: "auto" o "oficina" (modo Preguntar)
const CAMPO_OMITE_EXTRA = {"Clean":0.10, "Repair":-0.10};        // Clean omite más notas; Repair, menos
const cProbOmitir = extra => Math.max(0.05, Math.min(0.7, (cMixto() ? 0.40 : 0.15) + (extra||0)));
function cLogArr(){ if(!Array.isArray(S.campoLog)) S.campoLog = []; return S.campoLog; }
/* estado: "hecho" | "omitido" | "sin responder" | "problema" */
function cLog(wo, tec, paso, estado, oblig, texto, por){
  const L = cLogArr();
  por = por || _campoPor;
  if(por === "oficina") texto += tec === GUSTAVO ? " (respondió oficina por Gustavo)" : " (respondió oficina por el técnico)";
  L.unshift({t:hora(), wo:wo||null, tec:tec ? tecN(tec) : "", paso, estado, oblig:!!oblig, texto, por});
  if(L.length > CAMPO_LOG_MAX) L.length = CAMPO_LOG_MAX;
}
/* true solo la primera vez para esa marca (no repetir entradas del mismo paso omitido en cada corrida) */
function cUna(mapa, marca){ if(mapa[marca]) return false; mapa[marca] = 1; return true; }
const cTecOk = id => { const t=T(id); return !!t && t.activo!==false && !(t.esp||[]).includes("Supervisor"); };

/* Foto de relleno: un SVG chiquito con color y etiqueta distintos cada vez */
function cFotoURL(w, etiqueta){
  const c = cPick(["#8fa8b8","#b8a98f","#9bb89f","#b89fa8","#a8a8b8","#c4b48a"]);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='240'><rect width='320' height='240' fill='${c}'/>`
    + `<rect x='20' y='20' width='280' height='200' fill='none' stroke='#fff' stroke-width='3' stroke-dasharray='10 6'/>`
    + `<text x='160' y='110' font-family='sans-serif' font-size='24' font-weight='700' text-anchor='middle' fill='#fff'>${w.id != null ? "WO-"+w.id : (w.rotulo || "Campo")}</text>`
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
    const p = cPaquete(w, w.tec), om = cProbOmitir();
    let fotos = Math.max(1, cRnd(p.fotos[0], p.fotos[1]));        // la primera foto de evidencia es obligatoria
    const extrasOmitidas = fotos > 1 && cChance(om);               // las fotos extra son opcionales
    if(extrasOmitidas) fotos = 1;
    _campoPlanes.set(w.id, {p, fotos, extrasOmitidas, antes:cChance(0.5) && !cChance(om),
      nota:cChance(0.85) && !cChance(cProbOmitir(CAMPO_OMITE_EXTRA[w.cat])),
      dur:cRnd(p.dur[0], p.dur[1]), mismatch:cChance(cProbDatos(w, p.match)), tarde:cMixto() && cChance(0.15), ev:cEventosPlan(w, p), l:{}});
  }
  return _campoPlanes.get(w.id);
}

/* ══════════ MANEJADORES (uno por traspaso oficina → técnico) ══════════
   Cada manejador tiene:
     detect()            → los pendientes que hay ahora
     proponer(it)        → qué haría el técnico en el SIGUIENTE paso, ya con los valores generados:
                           {paso, oblig, titulo, desc?, step?, campos:[{id,label,tipo,valor,opciones?,min?,max?,largo?,sec?,fila?,ayuda?}]}
                           tipo: "texto" | "numero" | "si-no" | "opciones" | "hora". null si no hay nada que hacer.
     responder(it, datos, prop) → ejecuta las acciones reales del celular con esos datos (editados o no)
   Automático = responder(it, cDatos(proponer(it))). Preguntar = oficina ve la propuesta, la edita y registra. */
const cNombre = id => tecN(id);
const cHist = (w, txt) => w.hist.push([hora(), (_campoPor==="oficina" ? "(Oficina por el técnico) " : "(Campo automático) ")+txt, _campoPor==="oficina" ? "Oficina" : "Campo automático"]);
const CAMPO_MANEJADORES = [];
const cOmitido = (n, que, paso, wo) => ({texto:`${n} omitió ${que} (opcional)`, paso, estado:"omitido", oblig:false});
const cHacer = (label, b) => ({id:"hacer", label, tipo:"si-no", valor:cSiNo(b)});
/* Sube n fotos con el gancho de pruebas; devuelve cuántas se subieron */
function cSubirFotos(tec, w, etiqueta, n, accion, contar){
  const n0 = contar();
  for(let i=0; i<n; i++) cConTecnico(tec, ()=>cFoto(w, etiqueta+(n>1 ? ` ${i+1}/${n}` : ""), accion));
  return contar() - n0;
}

/* Oficina pidió información (pedirInfo) → el técnico la completa */
CAMPO_MANEJADORES.push({ id:"info",
  detect:() => S.wos.filter(w=>w.tec && cTecOk(w.tec) && w.infoPedida).map(w=>({k:"info:"+w.id, h:"info", wo:w.id, tec:w.tec})),
  proponer:it => {
    const w = W(it.wo); if(!w || !w.infoPedida) return null;
    const falta = w.infoPedida.falta||[], que = falta.length ? "Oficina pidió: "+falta.join(", ")+"." : "Oficina pidió más información.";
    if(falta.includes("evidencia") && !w.evid)
      return {paso:"info pedida", oblig:true, titulo:"Subir la foto que pidió oficina", desc:que, campos:[{id:"fotos", label:"Fotos que sube", tipo:"numero", valor:1, min:1, max:5}]};
    return {paso:"info pedida", oblig:true, titulo:"Completar lo que pidió oficina", desc:que+" El técnico lo marca como completado.", campos:[]};
  },
  responder:(it, d) => {
    const w = W(it.wo); if(!w || !w.infoPedida) return null;
    const id = String(w.id);
    if((w.infoPedida.falta||[]).includes("evidencia") && !w.evid){
      S.reloj += cRnd(3,8);
      const n = cSubirFotos(w.tec, w, "evidencia pedida", Math.max(1, Math.round(d.fotos)||1), ()=>ACC.fFoto({id}), ()=>W(w.id).evid||0);
      return n > 0 ? {texto:`${cNombre(w.tec)} subió la foto que pidió oficina en WO-${w.id}`, paso:"info pedida", oblig:true} : null;
    }
    cConTecnico(w.tec, ()=>ACC.fCompletaInfo({id}));
    return !W(w.id).infoPedida ? {texto:`${cNombre(w.tec)} completó lo que faltaba en WO-${w.id}`, paso:"info pedida", oblig:true} : null;
  }});

/* Llegada */
CAMPO_MANEJADORES.push({ id:"llegar",
  detect:() => S.wos.filter(w=>w.tec && cTecOk(w.tec) && esAgendada(w.estado) && !asisDe(w.id) && !woEspera(w)).map(w=>({k:"llegar:"+w.id, h:"llegar", wo:w.id, tec:w.tec})),
  proponer:it => {
    const w = W(it.wo); if(!w || asisDe(w.id) || woEspera(w)) return null;
    const pl = cPlan(w), prog = cMinHora(w.horaProg||"9:00");
    if(pl.llega == null) pl.llega = prog + (pl.tarde ? cRnd(15,30) : cRnd(-5,6));
    return {paso:"llegada", oblig:true, titulo:"Llegada al sitio", desc:`Hora programada: ${w.horaProg||"9:00"}.`,
      campos:[{id:"hora", label:"Hora a la que llegó", tipo:"hora", valor:cHM(pl.llega)}]};
  },
  responder:(it, d) => {
    const w = W(it.wo); if(!w || asisDe(w.id) || woEspera(w)) return null;
    /* fLlegue suma 23 min al reloj: se acomoda para llegar cerca de la hora indicada (el reloj nunca retrocede) */
    const llega = /^\d{1,2}:\d{2}$/.test(String(d.hora||"")) ? cMinHora(d.hora) : cMinHora(w.horaProg||"9:00");
    if(S.reloj + 23 < llega) S.reloj = llega - 23;
    S.reloj = Math.min(S.reloj, 20*60);
    cConTecnico(w.tec, ()=>ACC.fLlegue({id:String(w.id)}));
    return asisDe(w.id) ? {texto:`${cNombre(w.tec)} llegó a WO-${w.id}`, paso:"llegada", oblig:true} : null;
  }});

/* Corroborar la unidad antes de empezar (coincide o no coincide) */
CAMPO_MANEJADORES.push({ id:"corroborar",
  detect:() => S.wos.filter(w=>w.tec && cTecOk(w.tec) && ["In progress","Esperando aprobación"].includes(w.estado) && !w.corroborado && !w.infoPedida).map(w=>({k:"corroborar:"+w.id, h:"corroborar", wo:w.id, tec:w.tec})),
  proponer:it => {
    const w = W(it.wo); if(!w || w.corroborado) return null;
    const pl = cPlan(w), u = U(w.unidad), ocup = u.ocupacion || "Occupied";
    if(!pl.corr){
      /* Valores que el técnico encontraría: los de la unidad, o uno/dos distintos si la plan marca «no coincide» */
      const c = {num:String(u.num), pisos:u.pisos||1, ocup, bed:u.bedrooms, bath:u.bathrooms,
        txt:cPick(["La unidad no coincide con lo que dice la orden.","Revisé al llegar y los datos son distintos.","Lo que veo en sitio no es lo que tienen registrado."])};
      if(pl.mismatch){
        const cambios = cMuestra(["num","pisos","ocupacion"].concat(u.bedrooms!=null?["bedrooms"]:[], u.bathrooms!=null?["bathrooms"]:[]), cChance(0.3)?2:1);
        if(cambios.includes("num")) c.num = cChance(0.5) ? "B"+u.num : String(u.num).replace(/\d(?!.*\d)/, x=>String((+x+1)%10));
        if(cambios.includes("pisos")) c.pisos = cPick([1,2,3].filter(x=>x!==u.pisos));
        if(cambios.includes("ocupacion")) c.ocup = ocup==="Vacant" ? "Occupied" : "Vacant";
        if(cambios.includes("bedrooms")) c.bed = Math.max(0, u.bedrooms + (cChance(0.5)?1:-1) || 1);
        if(cambios.includes("bathrooms")) c.bath = Math.max(0, u.bathrooms + (cChance(0.5)?1:-1) || 1);
      }
      pl.corr = c;
    }
    const c = pl.corr, sec = "Solo si no coincide: lo que encontró en sitio";
    const campos = [{id:"coincide", label:"¿La unidad coincide con la orden?", tipo:"si-no", valor:cSiNo(!pl.mismatch)},
      {id:"cnNum", label:"Número de unidad", tipo:"texto", valor:c.num, sec},
      {id:"cnPisos", label:"Pisos", tipo:"numero", valor:c.pisos, min:1, max:9},
      {id:"cnOcup", label:"Ocupación", tipo:"opciones", valor:c.ocup, opciones:["Occupied","Vacant"]}];
    if(u.bedrooms!=null) campos.push({id:"cnBed", label:"Recámaras", tipo:"numero", valor:c.bed, min:0, max:9});
    if(u.bathrooms!=null) campos.push({id:"cnBath", label:"Baños", tipo:"numero", valor:c.bath, min:0, max:9});
    campos.push({id:"cnTxt", label:"Comentario del técnico", tipo:"texto", largo:true, valor:c.txt});
    return {paso:"corroborar unidad", oblig:true, titulo:"Corroborar la unidad", desc:`Unidad ${u.num} registrada en el sistema.`, campos};
  },
  responder:(it, d) => {
    const w = W(it.wo); if(!w || w.corroborado) return null;
    const id = String(w.id);
    if(!cSi(d.coincide)){
      const campos = {cnNum:{value:String(d.cnNum)}, cnPisos:{value:String(d.cnPisos)}, cnOcup:{value:String(d.cnOcup)}, cnTxt:{tag:"textarea", value:String(d.cnTxt||"")}};
      if(d.cnBed!=null) campos.cnBed = {value:String(d.cnBed)};
      if(d.cnBath!=null) campos.cnBath = {value:String(d.cnBath)};
      cConTecnico(w.tec, ()=>cConCampos(campos, ()=>ACC.woCorroboraNoOK({id})));
      return W(w.id).corroborado ? {texto:`${cNombre(w.tec)} reportó que la unidad de WO-${w.id} no coincide (problema)`, paso:"corroborar unidad", estado:"problema", oblig:true} : null;
    }
    cConTecnico(w.tec, ()=>ACC.woCorrobora({id}));
    return W(w.id).corroborado ? {texto:`${cNombre(w.tec)} corroboró la unidad de WO-${w.id}`, paso:"corroborar unidad", oblig:true} : null;
  }});

/* Trabajo en sitio: foto del antes, evidencia, nota y cierre (también return fix y WO encadenadas).
   Orden: antes (opcional) → evidencia (obligatoria, ≥1) → nota (opcional) → terminar (obligatorio).
   pl.dec marca los pasos opcionales ya decididos (hechos u omitidos). */
CAMPO_MANEJADORES.push({ id:"trabajo",
  detect:() => S.wos.filter(w=>w.tec && cTecOk(w.tec) && w.estado==="In progress" && w.corroborado && !woEspera(w)).map(w=>({k:"trabajo:"+w.id, h:"trabajo", wo:w.id, tec:w.tec})),
  proponer:it => {
    const w = W(it.wo); if(!w || w.estado!=="In progress") return null;
    const pl = cPlan(w); pl.dec = pl.dec || {};
    if(!(w.antesFotos||[]).length && !pl.dec.antes)
      return {step:"antes", paso:"foto del antes", oblig:false, titulo:"Foto del antes", campos:[cHacer("¿Sube la foto del antes?", pl.antes)]};
    if(!pl.dec.evid && (w.evid||0) < pl.fotos)
      return {step:"evid", paso:"foto de evidencia", oblig:true, titulo:"Fotos de evidencia", desc:"La primera foto es obligatoria; las demás son opcionales.",
        campos:[{id:"fotos", label:"Número de fotos de evidencia", tipo:"numero", valor:pl.fotos, min:1, max:6}]};
    if(!w.notas && !pl.dec.nota){
      if(pl.notaTxt == null) pl.notaTxt = cNota(w, pl.p);
      return {step:"nota", paso:"nota de trabajo", oblig:false, titulo:"Nota de trabajo",
        campos:[cHacer("¿Escribe una nota de trabajo?", pl.nota), {id:"nota", label:"Qué hizo", tipo:"texto", largo:true, valor:pl.notaTxt}]};
    }
    if(cEvRetiene(w, pl)) return null;      // un pedido suyo sigue sin enviarse o esperando a oficina
    return {step:"fin", paso:"terminar", oblig:true, titulo:"Terminar el trabajo", desc:"Al registrar, el tiempo en sitio se ajusta a esta duración.",
      campos:[{id:"dur", label:"Tiempo en sitio (minutos)", tipo:"numero", valor:pl.dur, min:10, max:600}]};
  },
  responder:(it, d, prop) => {
    const w = W(it.wo); if(!w || w.estado!=="In progress") return null;
    const id = String(w.id), pl = cPlan(w), n = cNombre(w.tec); pl.dec = pl.dec || {};
    const step = prop && prop.step;
    if(step==="antes"){
      pl.dec.antes = 1;
      if(!cSi(d.hacer)) return cOmitido(n, "la foto del antes", "foto del antes");
      const k = cSubirFotos(w.tec, w, "antes", 1, ()=>ACC.fFotoAntes({id}), ()=>(W(w.id).antesFotos||[]).length);
      return k > 0 ? {texto:`${n} subió la foto del antes en WO-${w.id}`, paso:"foto del antes", oblig:false} : null;
    }
    if(step==="evid"){
      const meta = Math.max(1, Math.min(6, Math.round(d.fotos)||1)), n0 = w.evid||0;
      pl.dec.evid = 1;
      if(meta <= n0) return {texto:`${n} ya había subido evidencia en WO-${w.id}`, paso:"foto de evidencia", oblig:true};
      const k = cSubirFotos(w.tec, w, "después", meta - n0, ()=>ACC.fFoto({id}), ()=>W(w.id).evid||0);
      if(k > 0 && meta === 1 && pl.p.fotos[1] > 1)
        cLog(w.id, w.tec, "fotos extra", "omitido", false, `${n} subió solo la foto de evidencia necesaria y omitió las extras (opcional)`);
      return k > 0 ? {texto:`${n} subió evidencia ${W(w.id).evid}/${meta} de WO-${w.id}`, paso:n0 ? "foto extra de evidencia" : "foto de evidencia", oblig:true} : null;
    }
    if(step==="nota"){
      pl.dec.nota = 1;
      const txt = String(d.nota||"").trim();
      if(!cSi(d.hacer) || !txt) return cOmitido(n, "la nota de trabajo", "nota de trabajo");
      let ta = document.querySelector(`textarea[data-a="fNotaTrabajo"][data-id="${id}"]`), tmp = false;
      if(!ta){ ta = document.createElement("textarea"); ta.dataset.a = "fNotaTrabajo"; ta.dataset.id = id; ta.style.display = "none"; document.body.appendChild(ta); tmp = true; }
      ta.value = txt;
      try{ cConTecnico(w.tec, ()=>ACC.fNotaTrabajo({id})); } finally { if(tmp) ta.remove(); }
      if(W(w.id).notas === txt){ cHist(W(w.id), "Nota de trabajo registrada"); return {texto:`${n} anotó qué hizo en WO-${w.id}`, paso:"nota de trabajo", oblig:false}; }
      return null;
    }
    /* Terminar: el reloj avanza hasta que el tiempo en sitio coincida con la duración indicada */
    if(cEvRetiene(w, pl)) return null;
    const dur = Math.max(10, Math.round(d.dur)||pl.dur), a = asisDe(w.id);
    if(a){ const trans = S.reloj - cMinHora(a.horaReal), extra = dur - trans - 28; if(extra > 0) S.reloj += extra; }
    S.reloj = Math.min(S.reloj, 21*60);
    cConTecnico(w.tec, ()=>{
      ACC.fTermine({id});
      /* Sin llegada registrada, fTermine abre la hoja de «declarar llegada» */
      if(!asisDe(w.id) && S.phSheet && S.phSheet.t==="llegada")
        cConCampos({plH:{value: w.horaProg||"9:00"}}, ()=>ACC.fLlegadaDecl({id}));
    });
    return W(w.id).estado==="Completed" ? {texto:`${n} terminó WO-${w.id}${W(w.id).horas?` (${W(w.id).horas} h en sitio)`:""}`, paso:"terminar", oblig:true} : null;
  }});

/* ══════════ EVENTOS QUE INICIA EL TÉCNICO (solo perfil «Mixto») ══════════
   Aquí el campo MANDA cosas a oficina mientras trabaja una WO «In progress», para que oficina pruebe su lado sin
   que nadie teclee como el técnico: change order (fAdic/fAdicOK), ayuda en sitio, compra de materiales y permiso.
   NO se resuelven solos: oficina aprueba, rechaza o atiende con sus acciones reales.
   Se decide UNA vez por WO, en cPlan (pl.ev): como mucho 2, un tipo una sola vez, según el servicio y el oficio.
   El pedido sale después de la evidencia y antes de terminar. Si es un adicional o una ayuda, «terminar» espera a
   que oficina decida (aprobada o rechazada, da igual) y el motor sigue solo. La app real NO frena el cierre por un
   adicional pendiente (solo frena pago y factura de la WO): la espera es a propósito, para poder probar a oficina.
   Compra y permiso quedan «esperando a oficina» pero no frenan al técnico. */
const CAMPO_EV_RETIENE = ["adic","ayuda"];
const CAMPO_EV_INFO = {
  adic:{paso:"change order a oficina", que:ev=>`pedir a oficina el change order «${ev.datos.c}»`},
  ayuda:{paso:"ayuda en sitio", que:()=>"pedir ayuda en sitio a oficina"},
  compra:{paso:"compra de materiales", que:()=>"registrar una compra de materiales"},
  permiso:{paso:"permiso", que:()=>"pedir un permiso a oficina"}
};
/* Probabilidad por categoría de servicio (se multiplica por 1.4 si el oficio no cubre el servicio) */
const CAMPO_EV_PROB = {
  adic:{"Paint":0.28, "Repair":0.30, "Installation":0.24, "Clean":0.20, "Resurface":0.22, "Flooring Services":0.18, "Make Ready Checklist":0.15, "Removal":0.15},
  ayuda:{"Clean":0.12, "Paint":0.10, "Repair":0.10, "Installation":0.10},
  compra:{"Paint":0.16, "Repair":0.18, "Installation":0.16, "Resurface":0.10, "Clean":0.08}
};
const CAMPO_EV_BASE = {adic:0.12, ayuda:0.08, compra:0.06, permiso:0.04};
const cFamilia = w => ["Paint","Resurface"].includes(w.cat) ? "pintura" : ["Clean","Make Ready Checklist"].includes(w.cat) ? "limpieza" : "reparacion";
/* [tipo, servicio, descripciones]: solo se usan los que existen hoy en el catálogo (tiposCO / opcionesCO) */
const CAMPO_EV_ADIC = {
  pintura:[
    ["Repair","Sheetrock repair",["Al lijar apareció un hueco en el sheetrock que no estaba en la orden; hay que repararlo antes de pintar.","Detrás del mueble había un parche roto en el sheetrock. Así no se puede pintar."]],
    ["Repair","Tape repair",["La cinta de las juntas está levantada y se ve la grieta; hay que volver a cintear y resanar."]],
    ["Repair","Texture repair",["Hay un parche viejo sin textura que se nota aunque se pinte; pido reparar la textura."]],
    ["Repair","Extra prep",["Las paredes tienen muchos clavos y daños; necesitan preparación extra antes de pintar.","El acabado anterior se está despegando y hay que raspar y preparar más de lo previsto."]],
    ["Materials","Primer",["Las manchas de humedad traspasan la pintura; necesito primer extra para sellarlas.","La pared quedó con manchas de humo; hace falta más primer del que traje."]],
    ["Materials","Joint compound",["Hay más resanes de los previstos y se acabó el compuesto para juntas."]],
    ["Materials","Caulking",["Los marcos tienen rendijas; hace falta sellador antes de pintar."]],
    ["Paint","Touch up paint",["Hay un retoque en el pasillo que no venía en la orden y conviene hacerlo ahora que está el material."]]],
  limpieza:[
    ["Clean","Carpet clean",["La alfombra está muy manchada y no entraba en la orden; hace falta lavarla.","Las recámaras tienen la alfombra sucia de lado a lado; con el aspirado no sale."]],
    ["Clean","Trash out",["El inquilino anterior dejó bolsas y muebles; hay que sacarlos antes de limpiar.","Hay mucha basura en el closet y la cochera; no se puede limpiar con eso adentro."]],
    ["Clean","Heavy clean",["La cocina y los baños tienen grasa y sarro acumulado; no alcanza con una limpieza normal."]],
    ["Clean","Carpet - Pet treatment",["Hay olor y manchas de mascota en la alfombra; pido tratamiento especial."]],
    ["Clean","Pressure washing",["El balcón está muy sucio y necesita lavado a presión."]],
    ["Miscellaneous","Other",["Hay trabajo extra que no encaja en un servicio del catálogo: limpiar la bodega de la unidad."]]],
  reparacion:[
    ["Repair","Door repair",["La puerta roza y la bisagra está floja; se puede arreglar en sitio.","El marco de la puerta está dañado y no cierra; hay que repararlo."]],
    ["Repair","Window repair",["La ventana no cierra bien y el marco está dañado."]],
    ["Repair","Tile repair",["Hay losetas sueltas detrás del lavabo; hay que reponerlas."]],
    ["Repair","Countertop repair",["La cubierta tiene una desportilladura grande que no estaba en la orden."]],
    ["Repair","Sheetrock repair",["Detrás del panel hay un hueco más grande de lo previsto; falta reparar el sheetrock."]],
    ["Installation","Cabinet handles installation",["Faltan jaladeras en varios gabinetes y no estaba en la orden."]],
    ["Installation","Baseboard installation",["Faltan tramos de zócalo en la sala; hay que instalarlos."]],
    ["Installation","Interior door installation",["La puerta del cuarto está rota y no se puede reparar; hay que poner una nueva."]],
    ["Materials","Caulking",["Hace falta sellador en el marco y el lavabo, no alcanza el que traje."]],
    ["Miscellaneous","Other",["Hay un pendiente que no encaja en un servicio del catálogo y oficina debería ver."]]]
};
/* [opción de «Necesito ayuda», detalle] */
const CAMPO_EV_AYUDA = {
  pintura:[["Falta pintura","Se acabó la pintura de la segunda mano y faltan dos paredes."],["Falta material","Me faltan rodillos y cinta de pintor."],["Unidad sin luz, agua u otro servicio","No hay luz y no puedo trabajar con poca claridad."]],
  limpieza:[["Unidad sin luz, agua u otro servicio","No hay agua en la unidad y no puedo trapear ni limpiar baños."],["Falta material","Me falta desinfectante y bolsas grandes."],["Otro","Es demasiada basura para una sola persona; necesito otra persona de apoyo."]],
  reparacion:[["Falta material","Me falta una pieza que no traje."],["Sin acceso al shop","Necesito entrar al shop por una herramienta."],["Otro","Necesito a alguien que sostenga el panel mientras lo fijo."]]
};
/* [producto, unidad] — las unidades salen de UNIDADES_COMPRA; nunca se inventa un precio */
const CAMPO_EV_COMPRA = {
  pintura:[["Primer","galón"],["Compuesto para juntas","galón"],["Cinta de pintor","unidad"],["Rodillos de felpa","unidad"]],
  limpieza:[["Bolsas de basura industriales","caja"],["Desengrasante","galón"],["Esponjas","caja"]],
  reparacion:[["Bisagras","caja"],["Tornillos para panel","caja"],["Sellador de silicón","unidad"],["Malla de parche","unidad"]]
};
const CAMPO_EV_PERMISO = ["Cita médica","Trámite personal","Asunto familiar","Cita en la escuela de mis hijos"];
const cIso = (base, n) => { const d = new Date(base+"T12:00:00Z"); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); };

function cEvAdic(fam){
  const pool = CAMPO_EV_ADIC[fam].filter(([t,c]) => tiposCO().includes(t) && opcionesCO(t).includes(c));
  if(!pool.length) return null;
  const [t,c,descs] = cPick(pool), ub = activos("ubicaciones");
  return {t, c, q:cRnd(1,3), desc:cPick(descs), ubic:ub.length ? cPick(ub) : ""};
}
function cEvAyuda(fam, p){
  const opts = CAMPO_EV_AYUDA[fam].slice();
  if(!p.match) opts.push(["Otro","Este servicio no es de mi especialidad y necesito apoyo para terminarlo bien."]);
  const [opc, txt] = cPick(opts.filter(o=>AYUDA_OPC.includes(o[0])));
  return {opc, txt:(opc==="Otro" || cChance(0.6)) ? txt : "", foto:cChance(0.4)};
}
function cEvCompra(fam){
  const lineas = cMuestra(CAMPO_EV_COMPRA[fam], cChance(0.35) ? 2 : 1).map(([n,um]) => ({n, c:cRnd(1,3), um:UNIDADES_COMPRA.includes(um) ? um : "unidad"}));
  return {tienda:cPick(CAT.tiendas), lineas, foto:cChance(0.6)};
}
function cEvPermiso(){
  const d0 = cRnd(3,10), desde = cIso(HOY_SUP, d0);
  return {motivo:cPick(CAMPO_EV_PERMISO), desde, hasta:cIso(HOY_SUP, d0 + cRnd(0,1))};
}
/* Qué eventos manda el técnico en esta WO. Si la bitácora ya dice que mandó uno de este tipo (la página se recargó
   y el plan en memoria se perdió), no se repite. */
function cEventosPlan(w, p){
  if(!cMixto()) return [];
  const fam = cFamilia(w), k = p.match ? 1 : 1.4, L = [];
  const hechos = new Set(cLogArr().filter(e=>e.wo===w.id).map(e=>e.paso));
  const gen = {adic:()=>cEvAdic(fam), ayuda:()=>cEvAyuda(fam, p), compra:()=>cEvCompra(fam), permiso:()=>cEvPermiso()};
  Object.keys(gen).sort(()=>Math.random()-0.5).forEach(tipo=>{
    if(L.length >= 2 || hechos.has(CAMPO_EV_INFO[tipo].paso)) return;
    if(!cChance(Math.min(0.6, ((CAMPO_EV_PROB[tipo]||{})[w.cat] ?? CAMPO_EV_BASE[tipo]) * k))) return;
    const datos = gen[tipo]();
    if(datos) L.push({id:tipo, tipo, datos, estado:"pendiente", fallos:0});
  });
  return L;
}
/* ¿Oficina ya contestó? {esp:true} = sigue esperando; si no, {esp:false, res} con el resultado */
function cEvEstado(w, ev){
  if(ev.tipo==="adic"){
    const L = S.adicionales.filter(a=>(ev.ids||[]).includes(a.id));
    if(L.some(a=>a.estado==="Pendiente")) return {esp:true};
    const ok = L.filter(a=>a.estado==="Aprobado").length;
    return {esp:false, res: !L.length ? "resuelto" : ok===L.length ? "aprobado" : ok===0 ? "rechazado" : "parcial"};
  }
  if(ev.tipo==="ayuda"){
    const x = S.excepciones.find(y=>y.id===ev.xid);
    if(x && x.estado==="Pendiente") return {esp:true};
    return {esp:false, res: !x || x.estado==="Resuelta" || x.estado==="Aprobada" ? "resuelto" : "rechazado"};
  }
  if(ev.tipo==="compra"){
    const pend = S.movs.some(m=>(ev.movs||[]).includes(m.id) && m.costoPend);
    return pend ? {esp:true} : {esp:false, res:"resuelto"};
  }
  const p = S.disponibilidad.find(y=>y.id===ev.pid);
  if(p && p.estado==="Pendiente") return {esp:true};
  return {esp:false, res: !p || p.estado==="Aprobado" ? "aprobado" : "rechazado"};
}
/* El cierre del trabajo espera mientras un adicional o una ayuda suyos sigan sin enviarse o sin respuesta */
function cEvRetiene(w, pl){
  return (pl.ev||[]).some(ev => CAMPO_EV_RETIENE.includes(ev.tipo)
    && ((ev.estado==="pendiente" && cMixto()) || (ev.estado==="enviado" && cEvEstado(w, ev).esp)));
}
/* Cuando oficina contesta un pedido enviado, queda en la bitácora una sola vez (el motor sigue solo) */
function cEvRevisar(){
  _campoPlanes.forEach((pl, k)=>{
    const w = typeof k === "number" ? W(k) : null; if(!w || !pl.ev) return;
    pl.ev.forEach(ev=>{
      if(ev.estado !== "enviado") return;
      const r = cEvEstado(w, ev); if(r.esp) return;
      ev.estado = "cerrado";
      const n = cNombre(w.tec), E = CAMPO_EV_INFO[ev.tipo], no = r.res === "rechazado";
      const sigue = CAMPO_EV_RETIENE.includes(ev.tipo) ? `; ${n} continúa con la WO` : "";
      const txt = ev.tipo==="adic" ? `Oficina ${r.res==="aprobado" ? "aprobó" : no ? "rechazó" : "resolvió"} el change order «${ev.datos.c}» de WO-${w.id}${r.res==="parcial" ? " (aprobó solo una parte)" : ""}${no ? `; ${n} sigue con lo original` : sigue}`
        : ev.tipo==="ayuda" ? `Oficina ${no ? "no atendió" : "atendió"} la ayuda en sitio de WO-${w.id}${sigue}`
        : ev.tipo==="compra" ? `Oficina cargó el costo del ticket de la compra de materiales de WO-${w.id}`
        : `Oficina ${no ? "rechazó" : "aprobó"} el permiso que pidió ${n}`;
      cLog(w.id, w.tec, E.paso, no ? "problema" : "hecho", false, txt, "auto");
    });
  });
}

/* Cada tipo: arma los campos de «Preguntar» (ya con lo generado) y envía con las acciones reales del celular */
const CAMPO_EV_CAMPOS = {
  adic:(w, ev) => { const d = ev.datos;
    return {titulo:"Pedir a oficina un change order", desc:"El técnico encontró algo que no estaba en la orden. El precio sale de la tarifa o lo define oficina.",
      campos:[cHacer("¿Envía el pedido a oficina?", true),
        {id:"tipo", label:"Tipo", tipo:"opciones", valor:d.t, opciones:tiposCO()},
        {id:"servicio", label:"Servicio (si no es del tipo elegido se usa el tipo del servicio)", tipo:"opciones", valor:d.c, opciones:Array.from(new Set(tiposCO().flatMap(opcionesCO)))},
        {id:"cant", label:"Cantidad", tipo:"numero", valor:d.q, min:1, max:9},
        {id:"ubic", label:"¿Dónde?", tipo:"opciones", valor:d.ubic, opciones:activos("ubicaciones")},
        {id:"desc", label:"¿Qué encontró?", tipo:"texto", largo:true, valor:d.desc}]}; },
  ayuda:(w, ev) => { const d = ev.datos;
    return {titulo:"Pedir ayuda en sitio", desc:"Entra a Requests como «Ayuda en sitio»; oficina la atiende.",
      campos:[cHacer("¿Pide la ayuda?", true),
        {id:"opc", label:"¿Qué pasa?", tipo:"opciones", valor:d.opc, opciones:AYUDA_OPC},
        {id:"txt", label:"Detalle (obligatorio con «Otro»)", tipo:"texto", largo:true, valor:d.txt}]}; },
  compra:(w, ev) => { const d = ev.datos, a = d.lineas[0], b = d.lineas[1] || {n:"", c:1, um:"unidad"};
    return {titulo:"Registrar una compra de materiales", desc:"Se registra sin monto: oficina carga el costo con el ticket.",
      campos:[cHacer("¿Registra la compra?", true),
        {id:"tienda", label:"Tienda", tipo:"opciones", valor:d.tienda, opciones:CAT.tiendas},
        {id:"n0", label:"Producto", tipo:"texto", valor:a.n, fila:0}, {id:"c0", label:"Cantidad", tipo:"numero", valor:a.c, min:1, max:9, fila:0},
        {id:"m0", label:"Unidad", tipo:"opciones", valor:a.um, opciones:UNIDADES_COMPRA, fila:0},
        {id:"n1", label:"Otro producto (opcional)", tipo:"texto", valor:b.n, fila:1}, {id:"c1", label:"Cantidad", tipo:"numero", valor:b.c, min:1, max:9, fila:1},
        {id:"m1", label:"Unidad", tipo:"opciones", valor:b.um, opciones:UNIDADES_COMPRA, fila:1},
        {id:"foto", label:"¿Sube la foto del ticket?", tipo:"si-no", valor:cSiNo(d.foto)}]}; },
  permiso:(w, ev) => { const d = ev.datos;
    return {titulo:"Pedir un permiso", desc:"Le queda a Gustavo en Disponibilidad para aprobar. No frena la WO.",
      campos:[cHacer("¿Pide el permiso?", true),
        {id:"motivo", label:"Motivo", tipo:"texto", valor:d.motivo},
        {id:"desde", label:"Desde (AAAA-MM-DD)", tipo:"texto", valor:d.desde, fila:0}, {id:"hasta", label:"Hasta (AAAA-MM-DD)", tipo:"texto", valor:d.hasta, fila:0}]}; }
};
const cNum = (v, a, b) => Math.max(a, Math.min(b, Math.round(+v) || a));
const CAMPO_EV_ENVIAR = {
  adic:(w, ev, d, n) => {
    const id = String(w.id), tipos = tiposCO();
    let t = tipos.includes(d.tipo) ? d.tipo : ev.datos.t, c = String(d.servicio||"");
    if(!opcionesCO(t).includes(c)){ const x = tipos.find(y=>opcionesCO(y).includes(c)); if(x) t = x; else c = opcionesCO(t)[0] || ""; }
    if(!c) return null;
    const q = cNum(d.cant, 1, 9), ub = activos("ubicaciones"), ubic = ub.includes(d.ubic) ? d.ubic : (ub[0]||"");
    const antes = new Set(S.adicionales.map(a=>a.id));
    cConTecnico(w.tec, ()=>{
      ACC.fAdic({id});
      const sh = S.phSheet; if(!sh || sh.t!=="adic") return;
      Object.assign(sh, {desc:String(d.desc||"").trim() || ev.datos.desc, ubic}); sh.filas = [{t, c, q:String(q)}];
      render(); ACC.fAdicOK({id});
    });
    const nuevos = S.adicionales.filter(a=>!antes.has(a.id) && a.wo===w.id);
    if(!nuevos.length) return null;
    ev.estado = "enviado"; ev.ids = nuevos.map(a=>a.id); ev.datos.c = c;
    const pr = nuevos[0].precio != null ? `tarifa ${money(nuevos[0].precio)}` : "precio en oficina";
    return {texto:`${n} pidió a oficina un change order en WO-${w.id}: ${c} ×${q} (${t}) en ${ubic}, ${pr} — sin responder, esperando a oficina`, paso:CAMPO_EV_INFO.adic.paso, estado:"sin responder", oblig:false};
  },
  ayuda:(w, ev, d, n) => {
    const id = String(w.id), opc = AYUDA_OPC.includes(d.opc) ? d.opc : ev.datos.opc;
    let txt = String(d.txt||"").trim(); if(opc==="Otro" && !txt) txt = ev.datos.txt || "Necesito apoyo en sitio.";
    const antes = new Set(S.excepciones.map(x=>x.id));
    cConTecnico(w.tec, ()=>{
      ACC.fAyuda({id});
      const sh = S.phSheet; if(!sh || sh.t!=="ayuda") return;
      sh.opc = opc; sh.txt = txt; render();
      if(ev.datos.foto) cFoto(w, "ayuda", ()=>ACC.fAyudaFoto());
      ACC.fAyudaOK({id});
    });
    const x = S.excepciones.find(y=>!antes.has(y.id) && y.tipo==="Ayuda en sitio" && y.wo===w.id);
    if(!x) return null;
    ev.estado = "enviado"; ev.xid = x.id;
    return {texto:`${n} pidió ayuda en sitio en WO-${w.id}: ${opc}${txt ? " — "+txt : ""} — sin responder, esperando a oficina`, paso:CAMPO_EV_INFO.ayuda.paso, estado:"sin responder", oblig:false};
  },
  compra:(w, ev, d, n) => {
    const id = String(w.id);
    const lineas = [0,1].map(i=>({n:String(d["n"+i]||"").trim(), c:cNum(d["c"+i], 1, 9), um:UNIDADES_COMPRA.includes(d["m"+i]) ? d["m"+i] : "unidad"})).filter(l=>l.n);
    if(!lineas.length) return null;
    const tienda = CAT.tiendas.includes(d.tienda) ? d.tienda : CAT.tiendas[0], antes = new Set(S.movs.map(m=>m.id));
    cConTecnico(w.tec, ()=>{
      ACC.fCompraMaterial({id});
      const sh = S.phSheet; if(!sh || sh.t!=="compra") return;
      sh.tienda = tienda; sh.filas = lineas.map(l=>({nombre:l.n, cant:String(l.c), um:l.um, uso:"todo", usado:"", pago:""}));
      render();
      if(cSi(d.foto)) cFoto(w, "ticket", ()=>ACC.fCompraFoto());
      ACC.fCompraOK({id});
    });
    const nuevas = S.movs.filter(m=>!antes.has(m.id) && m.tipo==="entrada" && m.compraWo===w.id);
    if(!nuevas.length) return null;
    ev.estado = "enviado"; ev.movs = nuevas.map(m=>m.id);
    return {texto:`${n} registró una compra de materiales en WO-${w.id} (${tienda}): ${lineas.map(l=>`${l.n} ×${l.c}`).join(", ")} — sin responder, falta que oficina cargue el costo del ticket`, paso:CAMPO_EV_INFO.compra.paso, estado:"sin responder", oblig:false};
  },
  permiso:(w, ev, d, n) => {
    const motivo = String(d.motivo||"").trim(), re = /^\d{4}-\d{2}-\d{2}$/;
    if(!motivo) return null;
    const desde = re.test(String(d.desde)) ? String(d.desde) : ev.datos.desde, hasta = re.test(String(d.hasta)) && String(d.hasta) >= desde ? String(d.hasta) : desde;
    const antes = new Set(S.disponibilidad.map(x=>x.id));
    cConTecnico(w.tec, ()=>{
      ACC.fPermiso();
      cConCampos({ppM:{value:motivo}, ppD:{value:desde}, ppH:{value:hasta}}, ()=>ACC.fPermisoOK());
    });
    const p = S.disponibilidad.find(x=>!antes.has(x.id) && x.tec===w.tec);
    if(!p) return null;
    ev.estado = "enviado"; ev.pid = p.id;
    return {texto:`${n} pidió un permiso (${motivo}) del ${desde} al ${hasta} — sin responder, esperando a Gustavo en Disponibilidad`, paso:CAMPO_EV_INFO.permiso.paso, estado:"sin responder", oblig:false};
  }
};
/* El pendiente de un evento: el siguiente de la WO que aún no se envía. Antes de eso el técnico ya subió su evidencia. */
CAMPO_MANEJADORES.push({ id:"evento",
  detect:() => !cMixto() ? [] : S.wos.filter(w=>w.tec && cTecOk(w.tec) && w.estado==="In progress" && w.corroborado && !woEspera(w)).map(w=>{
    const pl = cPlan(w), ev = (pl.ev||[]).find(e=>e.estado==="pendiente");
    return ev && ((pl.dec||{}).evid || (w.evid||0) >= pl.fotos) ? {k:"evento:"+w.id+":"+ev.id, h:"evento", wo:w.id, tec:w.tec, ev:ev.id} : null;
  }).filter(Boolean),
  proponer:it => {
    const w = W(it.wo); if(!w || w.estado!=="In progress") return null;
    const ev = cPlan(w).ev.find(e=>e.id===it.ev && e.estado==="pendiente"); if(!ev) return null;
    const c = CAMPO_EV_CAMPOS[ev.tipo](w, ev);
    return {paso:CAMPO_EV_INFO[ev.tipo].paso, oblig:false, titulo:c.titulo, desc:c.desc, campos:c.campos};
  },
  responder:(it, d) => {
    const w = W(it.wo); if(!w || w.estado!=="In progress") return null;
    const ev = cPlan(w).ev.find(e=>e.id===it.ev && e.estado==="pendiente"); if(!ev) return null;
    const n = cNombre(w.tec), E = CAMPO_EV_INFO[ev.tipo];
    if(!cSi(d.hacer)){ ev.estado = "omitido"; return cOmitido(n, E.que(ev), E.paso); }
    let r = null;
    try{ r = CAMPO_EV_ENVIAR[ev.tipo](w, ev, d, n); } catch(e){ console.warn("Campo automático: evento", ev.tipo, e); }
    if(r) return r;
    /* no pudo enviarse: a la segunda se deja (es opcional) para no atorar el cierre de la WO */
    if(++ev.fallos >= 2){ ev.estado = "omitido"; return {texto:`${n} no pudo enviar ${E.que(ev)} y lo dejó (opcional)`, paso:E.paso, estado:"omitido", oblig:false}; }
    return null;
  }});

/* Sub-WO planificada: iniciar → initial finding → evidencia → terminar */
function cPlanSub(a, w, tec){
  const key = "s"+a.id;
  if(!_campoPlanes.has(key)){
    const p = cPaquete(w, tec), total = Math.max(1, parseFloat(a.cant)||1), parcial = cChance(cProbParcial(p.match));
    _campoPlanes.set(key, {p, fotos:cRnd(1,3), parcial, hallazgo:!cChance(cProbOmitir()), hechas:(parcial && total>1) ? cRnd(1, Math.max(1,Math.ceil(total)-1)) : total, dec:{}, l:{}});
  }
  return _campoPlanes.get(key);
}
CAMPO_MANEJADORES.push({ id:"subwo",
  detect:() => subWOsOperativas().filter(a=>{ const t=tecSubWO(a); return t && cTecOk(t) && W(a.wo) && ["Assigned","In progress"].includes(a.estadoTrabajo||"Assigned"); })
    .map(a=>({k:"subwo:"+a.id, h:"subwo", sub:a.id, wo:a.wo, tec:tecSubWO(a)})),
  proponer:it => {
    const a = S.adicionales.find(x=>x.id===it.sub); if(!a) return null;
    const tec = tecSubWO(a), w = W(a.wo), pl = cPlanSub(a, w, tec), c = a.concepto;
    if((a.estadoTrabajo||"Assigned")==="Assigned")
      return {step:"iniciar", paso:"iniciar Sub-WO", oblig:true, titulo:`Iniciar la Sub-WO «${c}»`, campos:[]};
    if(!a.hallazgoFoto && !pl.dec.hallazgo)
      return {step:"hallazgo", paso:"initial finding", oblig:false, titulo:"Foto del initial finding", campos:[cHacer("¿Sube la foto del initial finding?", pl.hallazgo)]};
    if(!pl.dec.evid && (a.fotosEvidArr||[]).length < pl.fotos)
      return {step:"evid", paso:"foto de evidencia Sub-WO", oblig:true, titulo:"Fotos de evidencia de la Sub-WO",
        campos:[{id:"fotos", label:"Número de fotos de evidencia", tipo:"numero", valor:pl.fotos, min:1, max:6}]};
    const total = Math.max(1, parseFloat(a.cant)||1);
    return {step:"fin", paso:"terminar Sub-WO", oblig:true, titulo:"Terminar la Sub-WO", desc:`Cantidad pedida: ${total}.`,
      campos:[{id:"hechas", label:`Cantidad terminada (de ${total})`, tipo:"numero", valor:Math.min(pl.hechas, total), min:1, max:total}]};
  },
  responder:(it, d, prop) => {
    const a = S.adicionales.find(x=>x.id===it.sub); if(!a) return null;
    const tec = tecSubWO(a), w = W(a.wo), id = String(a.id), n = cNombre(tec), pl = cPlanSub(a, w, tec), step = prop && prop.step;
    if(step==="iniciar"){
      cConTecnico(tec, ()=>ACC.fSubIniciar({id}));
      return a.estadoTrabajo==="In progress" ? {texto:`${n} inició la Sub-WO "${a.concepto}" de WO-${a.wo}`, paso:"iniciar Sub-WO", oblig:true} : null;
    }
    if(step==="hallazgo"){
      pl.dec.hallazgo = 1;
      if(!cSi(d.hacer)) return cOmitido(n, `la foto del initial finding de la Sub-WO "${a.concepto}"`, "initial finding");
      const k = cSubirFotos(tec, w, "initial finding", 1, ()=>ACC.fSubHallazgo({id}), ()=>a.hallazgoFoto ? 1 : 0);
      return k > 0 ? {texto:`${n} subió el initial finding de la Sub-WO "${a.concepto}"`, paso:"initial finding", oblig:false} : null;
    }
    if(step==="evid"){
      const meta = Math.max(1, Math.min(6, Math.round(d.fotos)||1)), n0 = (a.fotosEvidArr||[]).length;
      pl.dec.evid = 1;
      if(meta <= n0) return {texto:`${n} ya había subido evidencia de la Sub-WO "${a.concepto}"`, paso:"foto de evidencia Sub-WO", oblig:true};
      const k = cSubirFotos(tec, w, "evidencia sub-WO", meta - n0, ()=>ACC.fSubFoto({id}), ()=>(a.fotosEvidArr||[]).length);
      return k > 0 ? {texto:`${n} subió evidencia ${a.fotosEvidArr.length}/${meta} de la Sub-WO "${a.concepto}"`, paso:n0 ? "foto extra de Sub-WO" : "foto de evidencia Sub-WO", oblig:true} : null;
    }
    const total = Math.max(1, parseFloat(a.cant)||1), hechas = Math.max(1, Math.min(total, Number(d.hechas)||total));
    S.reloj = Math.min(S.reloj + cRnd(10,40), 21*60);
    cConTecnico(tec, ()=>cConCampos({subHechas:{value:String(hechas)}}, ()=>ACC.fSubTerminarGuardar({id})));
    return a.estadoTrabajo==="Completed" ? {texto:`${n} terminó la Sub-WO "${a.concepto}" de WO-${a.wo} (${hechas}/${total})`, paso:"terminar Sub-WO", estado:hechas<total ? "problema" : "hecho", oblig:true} : null;
  }});

/* Conformidad de la nómina semanal (opcional) */
CAMPO_MANEJADORES.push({ id:"nomina",
  detect:() => Object.keys(S.nomAprob||{}).filter(k=>(S.nomAprob[k]||{}).conf==="Pendiente").map(k=>{ const [tec,sem]=k.split("|"); return {k:"nomina:"+k, h:"nomina", tec, sem}; }).filter(x=>cTecOk(x.tec)),
  proponer:it => {
    const a = nomAprob(it.tec, it.sem); if(!a || a.conf!=="Pendiente") return null;
    const s = cDecEstado(it);
    if(s.obs === undefined){ s.obs = cMixto() && cChance(0.2); s.obsTxt = cPick(["Me falta pagar una WO de esta semana.","El monto de una WO no coincide con lo que acordamos.","No veo el pago de las horas extra del sábado."]); }
    return {paso:"nómina semana "+it.sem, oblig:false, titulo:`Conformidad del pago de la semana ${it.sem}`,
      campos:[cHacer("¿Responde sobre su pago?", !s.omite),
        {id:"resp", label:"Respuesta", tipo:"opciones", valor:s.obs ? "Con observación" : "Conforme", opciones:["Conforme","Con observación"]},
        {id:"obs", label:"Observación (solo si es «Con observación»)", tipo:"texto", largo:true, valor:s.obsTxt}]};
  },
  responder:(it, d) => {
    const a = nomAprob(it.tec, it.sem); if(!a || a.conf!=="Pendiente") return null;
    const n = cNombre(it.tec), paso = "nómina semana "+it.sem;
    if(!cSi(d.hacer)){ const s = cDecEstado(it); s.omite = true; s.decidido = true; return cOmitido(n, `la conformidad de nómina de la semana ${it.sem}`, paso); }
    const txt = String(d.obs||"").trim();
    if(d.resp==="Con observación" && txt){
      cConTecnico(it.tec, ()=>cConCampos({nomObsT:{value:txt}}, ()=>ACC.nomObs({tec:it.tec, sem:it.sem})));
      return nomAprob(it.tec, it.sem).conf==="Observada" ? {texto:`${n} envió una observación a su pago de la semana ${it.sem} (problema)`, paso, estado:"problema", oblig:false} : null;
    }
    cConTecnico(it.tec, ()=>ACC.nomConforme({tec:it.tec, sem:it.sem}));
    return nomAprob(it.tec, it.sem).conf==="Conforme" ? {texto:`${n} quedó conforme con su pago de la semana ${it.sem}`, paso, oblig:false} : null;
  }});

/* Disponibilidad de la semana siguiente (después de «Recordar» en oficina; opcional) */
CAMPO_MANEJADORES.push({ id:"disp",
  detect:() => {
    if(!CA().dispPedida) return [];
    const L = S.tecnicos.filter(t=>t.activo!==false && cTecOk(t.id) && !dispSemDe(t.id)).map(t=>({k:"disp:"+t.id, h:"disp", tec:t.id}));
    if(!L.length) CA().dispPedida = false;
    return L;
  },
  proponer:it => {
    if(dispSemDe(it.tec)) return null;
    const s = cDecEstado(it);
    if(!s.dias) s.dias = semSigDias().map((f,i)=>{ const disp = cChance(i===5 ? 0.4 : 0.85);
      return {disp, a:disp ? cPick(["07:00","08:00","09:00"]) : "", b:disp ? cPick(["15:00","16:00","17:00","18:00"]) : ""}; });
    const campos = [cHacer("¿Envía su disponibilidad?", !s.omite)];
    s.dias.forEach((x,i)=>{
      campos.push({id:"d"+i, label:(DIAS_SEM[i]||"Día "+(i+1))+" · ¿disponible?", tipo:"si-no", valor:cSiNo(x.disp), fila:i});
      campos.push({id:"a"+i, label:"A partir de", tipo:"hora", valor:x.a, fila:i});
      campos.push({id:"b"+i, label:"Hasta", tipo:"hora", valor:x.b, fila:i});
    });
    return {paso:"disponibilidad", oblig:false, titulo:"Disponibilidad de la semana siguiente", campos};
  },
  responder:(it, d) => {
    if(dispSemDe(it.tec)) return null;
    const n = cNombre(it.tec);
    if(!cSi(d.hacer)){ const s = cDecEstado(it); s.omite = true; s.decidido = true; return cOmitido(n, "su disponibilidad de la semana", "disponibilidad"); }
    const campos = {};
    semSigDias().forEach((f,i)=>{
      const disp = cSi(d["d"+i]);
      campos["dpD"+i] = {type:"checkbox", checked:disp};
      campos["dpA"+i] = {value: disp ? String(d["a"+i]||"") : ""};
      campos["dpB"+i] = {value: disp ? String(d["b"+i]||"") : ""};
    });
    cConTecnico(it.tec, ()=>cConCampos(campos, ()=>ACC.fDispOK({})));
    return dispSemDe(it.tec) ? {texto:`${n} envió su disponibilidad de la semana`, paso:"disponibilidad", oblig:false} : null;
  }});

/* ══════════ GUSTAVO (supervisor de campo) ══════════
   Lo que oficina le manda a Gustavo también se contesta solo, con las MISMAS acciones de su celular (ACC.g*):
     · paradas de su ruta (agSupOK / supAgendar): sale (opcional), llega o, en «Mixto» a veces, «no pude completarla»
     · inspección para estimado (solComInspeccion): oficina la asigna pero el sistema NO crea la parada; aquí se crea igual
       que lo hace Claudia (agSupOK, motivo «Inspección para estimado») y luego Gustavo llega y entrega el relevamiento
       (fotos, unidad y servicios del catálogo con hallazgos). Eso deja la solicitud «Lista para estimado» y avisa a Claudia.
     · parada «Supervisar»: reporte de revisión (opcional)
     · returns: verificar con fotos (obligatorio si ya venció o llegó el día límite y nadie lo está corrigiendo) y cerrar (opcional)
     · reporte del día: abrirlo (opcional), actividades que el sistema no sabe (opcionales) y cerrarlo (opcional)
   Sus acciones leen datos del DOM (leerSup/leerDev/leerDia): se arma S.gRep/S.gDev/S.gDia, se repinta para que el DOM
   coincida y se llama la acción. Si la persona tiene una hoja de Gustavo abierta (S.gRep/gDev/gDia) no se toca nada. */
const cGusOk = () => { const t = T(GUSTAVO); return !!t && t.activo !== false; };
const cGusLibre = () => !S.gRep && !S.gDev && !S.gDia;
const cPlanG = (key, ini) => { const k = "g:"+key; if(!_campoPlanes.has(k)) _campoPlanes.set(k, Object.assign({dec:{}}, ini())); return _campoPlanes.get(k); };
/* El celular de Gustavo, restaurando lo que la persona tenía abierto */
function cConGustavo(fn){
  const g = {phTec:S.phTec, phRol:S.phRol, phWO:S.phWO, phSub:S.phSub, phView:S.phView, phSheet:S.phSheet, phDev:S.phDev, phDiaId:S.phDiaId, phone:S.phone, gRep:S.gRep, gDev:S.gDev, gDia:S.gDia};
  S.phTec = GUSTAVO; S.phRol = "supervisor";
  try{ return fn(); } finally { Object.assign(S, g); }
}
const cFotoG = (etiqueta, fn) => cFoto({rotulo:"Gustavo"}, etiqueta, fn);
const cRepHoy = pid => S.reportes.some(r=>r.prop===pid && r.fecha===HOY_SUP);
const cParadasResueltas = () => { const ag = agendaHoy(); return ag.length > 0 && ag.every(a=>["Visitada","No completada"].includes(a.estado)); };
const cInspSinReporte = () => agendaHoy().some(a=>a.estado==="Visitada" && a.motivo==="Inspección para estimado" && !cRepHoy(a.prop));
const cUniLabel = u => `${u.num} — ${u.rooms}`;
const cDormitorios = u => { const m = /(\d)\s*bedroom/i.exec((u && u.rooms) || ""); return m ? +m[1] : 0; };
const cClampG = () => { S.reloj = Math.min(S.reloj, 21*60); };

/* Parada de inspección que oficina asignó desde Solicitudes (inspAsignada) y todavía no está en su ruta */
const cInspCubierta = s => S.agendaSup.some(a=>a.solicitudCom===s.id || (a.prop===s.prop && a.motivo==="Inspección para estimado" && a.fecha>=(s.fecha||HOY_SUP)));
CAMPO_MANEJADORES.push({ id:"ginsp",
  detect:() => !cGusOk() ? [] : S.solicitudesComerciales.filter(s=>s.inspeccion && s.inspAsignada && s.prop && s.estado==="Esperando inspección" && !solInspeccionLista(s) && !cInspCubierta(s))
    .map(s=>({k:"ginsp:"+s.id, h:"ginsp", tec:GUSTAVO, sol:s.id, donde:` · inspección para estimado en ${P(s.prop).nombre}`})),
  proponer:it => {
    const s = S.solicitudesComerciales.find(x=>x.id===it.sol); if(!s) return null;
    if(S.agendaSup.some(a=>a.prop===s.prop && a.fecha===HOY_SUP)) return null;      // agSupOK no deja dos paradas de la misma propiedad el mismo día
    const alc = String(s.alcance||"").trim();
    return {paso:"parada de inspección", oblig:true, titulo:"Poner la inspección en la ruta de Gustavo",
      desc:`Oficina asignó la inspección de ${P(s.prop).nombre}, pero el sistema no crea la parada. Se agrega como lo hace Claudia: motivo «Inspección para estimado».`,
      campos:[{id:"fecha", label:"Día de la visita (AAAA-MM-DD)", tipo:"texto", valor:HOY_SUP},
        {id:"nota", label:"Nota para Gustavo", tipo:"texto", largo:true,
          valor:`Inspección para el estimado de la solicitud ${s.id}.${s.contacto ? " Contacto: "+s.contacto+"." : ""}${alc ? " Alcance pedido: "+alc.slice(0,140) : ""}`}]};
  },
  responder:(it, d) => {
    const s = S.solicitudesComerciales.find(x=>x.id===it.sol); if(!s || s.estado!=="Esperando inspección" || cInspCubierta(s)) return null;
    const fecha = /^\d{4}-\d{2}-\d{2}$/.test(String(d.fecha||"")) ? String(d.fecha) : HOY_SUP;
    if(S.agendaSup.some(a=>a.prop===s.prop && a.fecha===fecha)) return null;
    const antes = new Set(S.agendaSup.map(a=>a.id));
    cConCampos({asP:{value:s.prop}, asF:{value:fecha}, asM:{value:"Inspección para estimado"}, asN:{value:String(d.nota||"")}}, ()=>ACC.agSupOK());
    const a = S.agendaSup.find(x=>!antes.has(x.id)); if(!a) return null;
    a.solicitudCom = s.id;
    return {texto:`Se puso la inspección de ${P(s.prop).nombre} en la ruta de Gustavo (${fecha}, solicitud ${s.id})`, paso:"parada de inspección", oblig:true};
  }});

/* Paradas de su ruta de hoy: salir (opcional) y llegar / no pude completarla */
const CAMPO_NC = {
  "Inspección para estimado":[["No había quien abriera","El manager no estaba y nadie tenía la llave de la unidad."],["La unidad estaba ocupada","El inquilino no me dejó pasar a medir; pidió que regrese con aviso."],["Problema en la propiedad","Había una fuga en el edificio y cerraron el acceso a las unidades."]],
  "Supervisar":[["No llegó el técnico","Llegué y el técnico no estaba en la unidad; no había nada que supervisar."],["Falta de tiempo en la ruta","La parada anterior se alargó y no alcancé a llegar con tiempo."],["La unidad estaba ocupada","El inquilino estaba en casa y no quiso que entráramos hoy."]],
  "_":[["Falta de tiempo en la ruta","El tráfico y las paradas anteriores me quitaron el tiempo; no llegué."],["Otro","Surgió un imprevisto y no pude ir a esta parada."]]
};
const CAMPO_NC_OPC = ["No había quien abriera","La unidad estaba ocupada","No llegó el técnico","Falta de tiempo en la ruta","Problema en la propiedad","Otro"];
CAMPO_MANEJADORES.push({ id:"gparada",
  detect:() => !cGusOk() ? [] : agendaHoy().filter(a=>["Pendiente","En camino"].includes(a.estado))
    .map(a=>({k:"gparada:"+a.id, h:"gparada", tec:GUSTAVO, stop:a.id, que:`la llegada a ${P(a.prop).nombre}`, pasoLog:"llegada a la parada", donde:` · ${P(a.prop).nombre} · ${a.motivo}`})),
  proponer:it => {
    const a = by(S.agendaSup, it.stop); if(!a || !["Pendiente","En camino"].includes(a.estado)) return null;
    const pl = cPlanG("p"+a.id, ()=>{ const m = cPick(CAMPO_NC[a.motivo] || CAMPO_NC._); return {camino:cChance(0.5), nc:cMixto() && cChance(0.18), mot:m[0], det:m[1]}; });
    if(a.estado==="Pendiente" && !pl.dec.camino)
      return {step:"camino", paso:"voy en camino", oblig:false, titulo:"Salir hacia la parada", desc:`${P(a.prop).nombre} · ${a.motivo}.`, campos:[cHacer("¿Marca «Voy en camino»?", pl.camino)]};
    return {step:"llegar", paso:"llegada a la parada", oblig:true, titulo:"Llegada a la parada", desc:`${P(a.prop).nombre} · ${a.motivo}${a.nota ? " · «"+a.nota+"»" : ""}.`,
      campos:[{id:"res", label:"¿Pudo completar la visita?", tipo:"opciones", valor:pl.nc ? "No pude completarla" : "Llegué", opciones:["Llegué","No pude completarla"]},
        {id:"motivo", label:"¿Qué pasó?", tipo:"opciones", valor:pl.mot, opciones:CAMPO_NC_OPC, sec:"Solo si no pudo completarla"},
        {id:"detalle", label:"Detalle para Claudia", tipo:"texto", largo:true, valor:pl.det}]};
  },
  responder:(it, d, prop) => {
    const a = by(S.agendaSup, it.stop); if(!a || !["Pendiente","En camino"].includes(a.estado) || !cGusLibre()) return null;
    const pl = cPlanG("p"+a.id, ()=>({})), n = cNombre(GUSTAVO), id = String(a.id), pn = P(a.prop).nombre;
    if(prop && prop.step==="camino"){
      pl.dec.camino = 1;
      if(!cSi(d.hacer)) return cOmitido(n, "avisar que iba en camino", "voy en camino");
      cConGustavo(()=>ACC.gEnCamino({id}));
      return a.estado==="En camino" ? {texto:`${n} marcó que va en camino a ${pn}`, paso:"voy en camino", oblig:false} : null;
    }
    if(d.res === "No pude completarla"){
      const mot = String(d.motivo||"Otro"), det = String(d.detalle||"").trim();
      cConGustavo(()=>{
        ACC.gNoCompleta({id});
        try{
          const sel = document.getElementById("ncM"), inp = document.getElementById("ncD");
          if(sel) sel.value = Array.from(sel.options).some(o=>o.value===mot) ? mot : "Otro";
          if(inp) inp.value = det;
          ACC.gNoCompletaOK({id});
        } finally { if(document.getElementById("ncM")) cm(); }
      });
      cClampG();
      return a.estado==="No completada" ? {texto:`${n} no pudo completar la parada de ${pn} (${a.motivoNo}) — problema`, paso:"llegada a la parada", estado:"problema", oblig:true} : null;
    }
    cConGustavo(()=>ACC.gLlegue({id}));
    cClampG();
    return a.estado==="Visitada" ? {texto:`${n} llegó a ${pn} (${a.motivo}) a las ${a.hora}`, paso:"llegada a la parada", oblig:true} : null;
  }});

/* ── Relevamiento (inspección para estimado) ──
   Servicios del catálogo por categoría, con hallazgos por área y cantidades según el tamaño de la unidad. */
const CAMPO_SURVEY = {
  "Paint":[
    {u:["Sala","Comedor","Room"], pref:/full paint|color change$/i, q:[1,1], med:"pared", mat:"pintura, primer y cinta de pintor",
      f:["Paredes con marcas de muebles y huecos de clavos; hacen falta dos manos de pintura.","Pintura amarillada y manchada; conviene repintar todo el espacio.","Zócalos y marcos con golpes; repintar paredes completas."]},
    {u:["Bano"], pref:/full paint|touch up/i, q:[1,1], med:"pared", mat:"primer antimoho",
      f:["Humedad leve junto a la regadera; sellar con primer antes de pintar.","Pintura descascarada cerca del lavabo y del techo."]},
    {u:["Sala","Room","Comedor"], pref:/ceilings/i, q:[1,1], med:"m2", mat:"pintura para techo",
      f:["Manchas de humo y humedad en el techo.","Techo amarillento con marcas del rodillo anterior."]},
    {u:["Closet","Pantry"], pref:/touch up|closet/i, q:[1,2], med:"", mat:"", f:["Paredes con roces; basta un retoque."]},
    {u:["Exterior"], pref:/exterior/i, q:[1,1], med:"", mat:"pintura exterior", f:["La puerta exterior tiene la pintura levantada por el sol."]}],
  "Clean":[
    {u:["Sala","Comedor","Room"], pref:/full clean/i, q:[1,1], med:"", mat:"",
      f:["Polvo y huellas en todas las superficies; limpieza completa antes de entregar.","Ventanas y persianas muy sucias por dentro."]},
    {u:["Bano"], pref:/heavy clean|full clean/i, q:[1,1], med:"", mat:"desincrustante",
      f:["Sarro acumulado en regadera y llaves; hace falta una limpieza profunda.","Moho leve en las juntas de la regadera."]},
    {u:["Sala","Room"], pref:/carpet clean/i, q:[1,2], med:"m2", mat:"", f:["La alfombra tiene manchas viejas; pedir lavado.","Alfombra con olor; conviene un lavado profundo."]},
    {u:["Exterior","Otro"], pref:/trash out/i, q:[1,1], med:"", mat:"bolsas industriales", f:["El inquilino anterior dejó muebles y bolsas; hay que sacarlos antes de limpiar."]}],
  "Repair":[
    {u:["Sala","Comedor","Room"], pref:/sheetrock|texture|tape/i, q:[1,3], med:"", mat:"compuesto para juntas y malla",
      f:["Huecos en el sheetrock por golpes de puerta; reparar y texturizar.","Grieta en la junta del panel; resanar y pintar encima."]},
    {u:["Bano"], pref:/tile|countertop|bath tub/i, q:[1,2], med:"", mat:"loseta y sellador",
      f:["Losetas sueltas detrás del lavabo; hay que reponerlas.","Cubierta con una desportilladura grande junto a la llave."]},
    {u:["Room","Closet","Sala"], pref:/door/i, q:[1,2], med:"", mat:"bisagras", f:["La puerta roza el marco y la bisagra está floja.","Marco de la puerta dañado; no cierra bien."]},
    {u:["Exterior","Sala"], pref:/window|balcony/i, q:[1,1], med:"", mat:"", f:["La ventana no cierra bien y el marco está dañado.","Barandal del balcón flojo; revisar antes de rentar."]}],
  "Installation":[
    {u:["Pantry","Otro","Sala"], pref:/handles|cabinet/i, q:[4,12], med:"", mat:"jaladeras", f:["Faltan jaladeras en varios gabinetes."]},
    {u:["Room","Sala","Comedor"], pref:/baseboard|trim/i, q:[1,1], med:"ml", mat:"zócalo y clavos de acabado", f:["Faltan tramos de zócalo; hay que instalarlos y pintarlos."]},
    {u:["Bano"], pref:/light|grab|shower/i, q:[1,2], med:"", mat:"", f:["Falta la barra de regadera y una lámpara del baño no funciona."]},
    {u:["Room","Closet"], pref:/closet|interior door/i, q:[1,2], med:"", mat:"puertas y herrajes", f:["Puerta del closet rota; no se puede reparar, hay que poner una nueva."]}],
  "Flooring Services":[
    {u:["Sala","Room","Comedor"], pref:/carpet tear out/i, q:[1,1], med:"m2", mat:"",
      f:["Alfombra manchada; retirarla antes de instalar el piso nuevo.","Alfombra con humedad en la base; sacarla y revisar el piso."]}],
  "Resurface":[
    {u:["Bano"], pref:/tub|sink/i, q:[1,1], med:"", mat:"kit de resurface", f:["Tina desportillada y con óxido en el drenaje; hacer resurface.","Lavabo manchado y con el acabado despegado."]},
    {u:["Pantry","Bano"], pref:/countertop/i, q:[1,1], med:"m2", mat:"", f:["Cubierta con quemaduras y marcas; resurface de la cubierta."]}],
  "Removal":[
    {u:["Closet","Exterior","Otro"], pref:/removal/i, q:[1,1], med:"", mat:"bolsas de escombro", f:["Muebles y escombro del inquilino anterior para retirar.","Cosas viejas en el closet y en la cochera que hay que desalojar."]}]
};
const CAMPO_SURVEY_REC = ["Conviene hacer la limpieza después de la pintura.","Programar primero las reparaciones de sheetrock y luego pintar.","Si hay inquilino nuevo pronto, agendar pintura y limpieza en días seguidos.","Revisar con el manager si la alfombra se cambia en este mismo trabajo."];
function cMedida(t, dorm){
  if(t==="pared") return `pared ${(cRnd(28,46)/10*(1+dorm*0.12)).toFixed(1)} × ${(cRnd(23,27)/10).toFixed(1)} m`;
  if(t==="m2") return `${Math.round(cRnd(9,16)*(1+dorm*0.35))} m²`;
  if(t==="ml") return `${Math.round(cRnd(6,12)*(1+dorm*0.3))} m lineales`;
  return "";
}
function cItemsSurvey(prop, u){
  const dorm = cDormitorios(u), n = Math.max(2, Math.min(6, 2 + dorm + cRnd(0,1))), act = activos("categorias"), ubi = activos("ubicaciones");
  const cats = ["Paint","Paint","Clean","Repair","Repair","Installation","Flooring Services","Resurface","Removal"].filter(c=>act.includes(c) && CAMPO_SURVEY[c]);
  const usadas = {}, vistos = new Set(), items = [];
  for(let g=0; items.length<n && g<60 && cats.length; g++){
    const cat = cPick(cats); if((usadas[cat]||0) >= 2) continue;
    const t = cPick(CAMPO_SURVEY[cat]), ubs = t.u.filter(x=>ubi.includes(x)); if(!ubs.length) continue;
    const ub = cPick(ubs), key = cat+"|"+ub+"|"+t.pref; if(vistos.has(key)) continue;
    vistos.add(key); usadas[cat] = (usadas[cat]||0) + 1;
    const todos = CAT.servicios.filter(s=>s.tipo===cat && !s.baja).map(s=>s.nombre);
    let ok = []; try{ ok = serviciosConTarifa(prop, cat, u.id).filter(x=>todos.includes(x)); } catch(e){}
    const cand = ok.length ? ok : todos, serv = cand.find(s=>t.pref.test(s)) || (cand.length ? cPick(cand) : cat);
    const mat = !!t.mat && cChance(0.6);
    items.push({cat, trabajo:serv, ubic:ub, cant:String(cRnd(t.q[0], t.q[1])), medidas:cMedida(t.med, dorm), mat, materiales:mat ? t.mat : "", coment:cPick(t.f), nf:cChance(0.6) ? cRnd(1,2) : 0});
  }
  return items;
}
function cPlanInsp(a){
  return cPlanG("r"+a.id, ()=>{
    const us = S.unidades.filter(u=>u.prop===a.prop), u = us.length ? cPick(us) : null;
    if(!u) return {u:null, items:[]};
    const items = cItemsSurvey(a.prop, u), ambs = Array.from(new Set(items.map(x=>x.ubic)));
    return {u:u.id, items, fotos:Math.min(12, Math.max(2, ambs.length + cRnd(0,2))), cond:(u.ocupacion||"Occupied")==="Vacant" ? "Desocupada" : "Ocupada",
      cg:items.length >= 5 ? cPick(["Regular","Mala"]) : cPick(["Buena","Regular","Regular"]), recom:cChance(0.7) ? cPick(CAMPO_SURVEY_REC) : "",
      nota:cPick(["Entré con la llave que dejó el manager.","Me abrió el manager y recorrimos la unidad juntos.","Hice el recorrido solo; tomé medidas de los ambientes principales."]), thalia:cChance(0.25)};
  });
}
const cUnidadDeLabel = (pid, lbl) => S.unidades.find(u=>u.prop===pid && cUniLabel(u)===lbl) || null;
const ROWS_SURVEY = 6;
/* Una línea del relevamiento en la ventana de «Preguntar»: dos filas de 3 campos */
function cCamposItem(i, x){
  return [{id:"ic"+i, label:`Servicio ${i+1} · categoría`, tipo:"opciones", valor:x.cat, opciones:activos("categorias"), fila:10+2*i},
    {id:"it"+i, label:"Qué trabajo hace falta", tipo:"texto", valor:x.trabajo, fila:10+2*i}, {id:"iq"+i, label:"Cantidad", tipo:"numero", valor:+x.cant||1, min:1, max:99, fila:10+2*i},
    {id:"iu"+i, label:"Dónde", tipo:"opciones", valor:x.ubic, opciones:activos("ubicaciones"), fila:11+2*i},
    {id:"im"+i, label:"Medidas", tipo:"texto", valor:x.medidas, fila:11+2*i}, {id:"ix"+i, label:"Hallazgo", tipo:"texto", valor:x.coment, fila:11+2*i}];
}
CAMPO_MANEJADORES.push({ id:"greporte",
  detect:() => !cGusOk() ? [] : agendaHoy().filter(a=>a.estado==="Visitada" && a.motivo==="Inspección para estimado" && !cRepHoy(a.prop))
    .map(a=>({k:"greporte:"+a.id, h:"greporte", tec:GUSTAVO, stop:a.id, que:`el reporte de inspección de ${P(a.prop).nombre}`, pasoLog:"relevamiento (inspección)", donde:` · reporte de inspección en ${P(a.prop).nombre}`})),
  proponer:it => {
    const a = by(S.agendaSup, it.stop); if(!a || a.estado!=="Visitada" || cRepHoy(a.prop)) return null;
    const pl = cPlanInsp(a), us = S.unidades.filter(u=>u.prop===a.prop), u = by(S.unidades, pl.u); if(!u) return null;
    const items = pl.items.slice(0, ROWS_SURVEY);
    while(items.length < Math.min(ROWS_SURVEY, pl.items.length + 1)) items.push({cat:activos("categorias")[0], trabajo:"", ubic:activos("ubicaciones")[0], cant:"1", medidas:"", coment:""});
    const campos = [{id:"unidad", label:"Unidad", tipo:"opciones", valor:cUniLabel(u), opciones:us.map(cUniLabel)},
      {id:"cond", label:"Condición de la unidad", tipo:"opciones", valor:pl.cond, opciones:["Desocupada","Ocupada"], fila:0},
      {id:"cg", label:"Condición general", tipo:"opciones", valor:pl.cg, opciones:COND_GENERAL, fila:0},
      {id:"fotos", label:"Fotos generales", tipo:"numero", valor:pl.fotos, min:1, max:12, fila:0}];
    items.forEach((x,i)=>campos.push(...cCamposItem(i, x)));
    campos.push({id:"recom", label:"Recomendaciones adicionales", tipo:"texto", largo:true, valor:pl.recom}, {id:"nota", label:"Nota para Claudia", tipo:"texto", largo:true, valor:pl.nota});
    return {paso:"relevamiento (inspección)", oblig:true, titulo:"Reporte de inspección para estimado",
      desc:`${P(a.prop).nombre}: el reporte pide fotos, unidad y al menos un servicio con el trabajo que hace falta. Al enviarlo, la solicitud queda lista para armar el estimado.`, campos};
  },
  responder:(it, d) => {
    const a = by(S.agendaSup, it.stop); if(!a || a.estado!=="Visitada" || cRepHoy(a.prop) || !cGusLibre()) return null;
    const pl = cPlanInsp(a), uni = cUnidadDeLabel(a.prop, d.unidad) || by(S.unidades, pl.u); if(!uni) return null;
    const cats = activos("categorias"), ubi = activos("ubicaciones"), items = [];
    for(let i=0; i<ROWS_SURVEY; i++){
      const trabajo = String(d["it"+i]||"").trim(); if(!trabajo) continue;
      const base = pl.items[i] || {};
      items.push(Object.assign(itemVacio(), {cat:cats.includes(d["ic"+i]) ? d["ic"+i] : cats[0], trabajo, ubic:ubi.includes(d["iu"+i]) ? d["iu"+i] : ubi[0],
        cant:String(cNum(d["iq"+i], 1, 99)), medidas:String(d["im"+i]||""), coment:String(d["ix"+i]||""), mat:!!base.mat, materiales:base.mat ? base.materiales : "", nf:base.nf||0}));
    }
    if(!items.length) return null;
    const ambs = Array.from(new Set(items.map(x=>x.ubic))), total = cNum(d.fotos, 1, 12), n0 = S.reportes.length, n = cNombre(GUSTAVO);
    cConGustavo(()=>{
      ACC.gRepPro({prop:a.prop});
      const g = S.gRep; if(!g) return;
      g.tipo = "relevamiento"; g.unidad = uni.id; g.condUnidad = d.cond==="Ocupada" ? "Ocupada" : "Desocupada";
      g.condGeneral = COND_GENERAL.includes(d.cg) ? d.cg : COND_GENERAL[1]; g.recom = String(d.recom||""); g.nota = String(d.nota||"");
      g.copiaThalia = !!pl.thalia;
      g.items = items.map(x=>{ const o = Object.assign({}, x); delete o.nf; return o; });
      render();
      items.forEach((x,i)=>{ for(let k=0; k<(x.nf||0); k++) ACC.gRepItemFoto({i:String(i)}); });
      for(let k=0; k<total; k++){
        const amb = ambs[k % ambs.length];
        ACC.gRepAmb({u:amb});
        cFotoG(`inspección · ${amb}`, ()=>ACC.gRepFoto());
      }
      if(!S.gRep) return;
      S.gRep.lotes.forEach(l=>{ const x = items.find(y=>y.ubic===l.amb); l.desc = x ? x.coment : ""; });
      render();
      ACC.gRepOK();
    });
    cClampG();
    if(S.reportes.length <= n0) return null;
    const r = S.reportes[S.reportes.length-1], lista = S.solicitudesComerciales.filter(sc=>sc.prop===a.prop && sc.inspeccion && sc.estado==="Lista para estimado");
    return {texto:`${n} entregó el reporte de inspección de ${P(a.prop).nombre} ${uni.num}: ${r.items.length} servicio(s), ${fotosDe(r)} foto(s)${lista.length ? " — la solicitud quedó lista para estimado y Claudia recibió el aviso" : ""}`, paso:"relevamiento (inspección)", oblig:true};
  }});

/* Parada «Supervisar»: reporte de revisión (opcional; sin «requiere corrección», que abriría un return) */
const CAMPO_REV_PROB = ["Quedaron salpicaduras de pintura en el piso y en los interruptores.","El zócalo del baño no está bien sellado.","Faltó limpiar adentro del horno y los gabinetes."];
CAMPO_MANEJADORES.push({ id:"grevision",
  detect:() => !cGusOk() ? [] : agendaHoy().filter(a=>a.estado==="Visitada" && a.motivo==="Supervisar" && !cRepHoy(a.prop))
    .map(a=>({k:"grevision:"+a.id, h:"grevision", tec:GUSTAVO, stop:a.id, que:`el reporte de revisión de ${P(a.prop).nombre}`, pasoLog:"reporte de revisión", donde:` · reporte de revisión en ${P(a.prop).nombre}`})),
  proponer:it => {
    const a = by(S.agendaSup, it.stop); if(!a || a.estado!=="Visitada" || cRepHoy(a.prop)) return null;
    const us = S.unidades.filter(u=>u.prop===a.prop); if(!us.length) return null;
    const s = cDecEstado(it);
    const pl = cPlanG("v"+a.id, ()=>{
      const conWO = us.filter(u=>S.wos.some(w=>w.unidad===u.id && w.estado!=="Canceled")), u = cPick(conWO.length ? conWO : us);
      const w = S.wos.filter(x=>x.unidad===u.id && x.estado!=="Canceled" && !x.touchup).slice(-1)[0];
      const est = w ? (w.estado==="Completed" ? "Terminado" : ["In progress","Esperando aprobación","Detenido"].includes(w.estado) ? "En proceso" : "No iniciado") : "En proceso";
      const sv = w && activos("servicios").some(x=>x.nombre===w.serv) ? w.serv : activos("servicios")[0].nombre;
      return {u:u.id, est, sv, prob:(est!=="No iniciado" && cMixto() && cChance(0.3)) ? cPick(CAMPO_REV_PROB) : "", fotos:cRnd(2,4), tv:cPick(TIPO_VISITA)};
    });
    const u = by(S.unidades, pl.u) || us[0];
    return {paso:"reporte de revisión", oblig:false, titulo:"Reporte de revisión (supervisión)", desc:`${P(a.prop).nombre}. Es opcional; al enviarlo le llega a Claudia.`,
      campos:[cHacer("¿Entrega el reporte de revisión?", !s.omite),
        {id:"unidad", label:"Unidad", tipo:"opciones", valor:cUniLabel(u), opciones:us.map(cUniLabel)},
        {id:"tv", label:"Tipo de visita", tipo:"opciones", valor:pl.tv, opciones:TIPO_VISITA, fila:0},
        {id:"est", label:"Estado del trabajo", tipo:"opciones", valor:pl.est, opciones:["No iniciado","En proceso","Terminado"], fila:0},
        {id:"fotos", label:"Fotos", tipo:"numero", valor:pl.fotos, min:1, max:10, fila:0},
        {id:"sv", label:"Servicio supervisado", tipo:"opciones", valor:pl.sv, opciones:activos("servicios").map(x=>x.nombre)},
        {id:"prob", label:"Problemas encontrados", tipo:"texto", largo:true, valor:pl.prob},
        {id:"nota", label:"Comentarios generales", tipo:"texto", largo:true, valor:pl.prob ? "Se avisó al técnico para que lo corrija." : "Sin novedades; todo conforme con el estándar."}]};
  },
  responder:(it, d) => {
    const a = by(S.agendaSup, it.stop); if(!a || a.estado!=="Visitada" || cRepHoy(a.prop) || !cGusLibre()) return null;
    const n = cNombre(GUSTAVO);
    if(!cSi(d.hacer)){ const s = cDecEstado(it); s.omite = true; s.decidido = true; return cOmitido(n, `el reporte de revisión de ${P(a.prop).nombre}`, "reporte de revisión"); }
    const uni = cUnidadDeLabel(a.prop, d.unidad) || S.unidades.find(u=>u.prop===a.prop); if(!uni) return null;
    const n0 = S.reportes.length, total = cNum(d.fotos, 1, 10);
    cConGustavo(()=>{
      ACC.gRepPro({prop:a.prop});
      const g = S.gRep; if(!g) return;
      g.tipo = "revision"; g.unidad = uni.id; g.tipoVisita = TIPO_VISITA.includes(d.tv) ? d.tv : TIPO_VISITA[1];
      g.estadoTrabajo = ["No iniciado","En proceso","Terminado"].includes(d.est) ? d.est : "En proceso";
      g.servSup = String(d.sv||""); g.problemas = String(d.prob||""); g.nota = String(d.nota||"");
      render();
      const ub = activos("ubicaciones");
      for(let k=0; k<total; k++){
        ACC.gRepAmb({u:ub[k % Math.min(3, ub.length)]});
        cFotoG("revisión", ()=>ACC.gRepFoto());
      }
      if(!S.gRep) return;
      render();
      ACC.gRepOK();
    });
    cClampG();
    return S.reportes.length > n0 ? {texto:`${n} entregó el reporte de revisión de ${P(a.prop).nombre} ${uni.num} (${S.reportes[S.reportes.length-1].estadoTrabajo})`, paso:"reporte de revisión", oblig:false} : null;
  }});

/* Returns: verificar con fotos (si ya toca y nadie lo está corrigiendo) y cerrar */
const cTuActivo = dv => { const tu = touchupDe(dv.id); return !!tu && !["Completed","Canceled"].includes(tu.estado); };
const CAMPO_DEV_NOTAS = ["Se retocó la zona y quedó parejo con el resto; todo conforme.","Revisé el área corregida: sin marcas ni huecos. Queda bien.","Quedó corregido; se nota el trabajo y ya no se ve el problema.","Lo corrigieron como se pidió. Dejé fotos del después."];
CAMPO_MANEJADORES.push({ id:"gdevverif",
  detect:() => !cGusOk() ? [] : devAbiertas().filter(dv=>dv.estado==="Abierta" && dv.fechaLimite<=HOY_SUP && !cTuActivo(dv))
    .map(dv=>({k:"gdevverif:"+dv.id, h:"gdevverif", tec:GUSTAVO, dev:dv.id, que:`la verificación del return de ${P(dv.prop).nombre} ${U(dv.unidad).num}`, pasoLog:"verificar return", donde:` · return de ${P(dv.prop).nombre} ${U(dv.unidad).num}`})),
  proponer:it => {
    const dv = DV(it.dev); if(!dv || dv.estado!=="Abierta") return null;
    const pl = cPlanG("d"+dv.id, ()=>({fotos:Math.min(4, Math.max(1, (dv.areas||[]).length) + cRnd(0,1)), nota:cPick(CAMPO_DEV_NOTAS)}));
    return {paso:"verificar return", oblig:true, titulo:"Verificar el return fix", desc:`${P(dv.prop).nombre} ${U(dv.unidad).num} · ${devAreasTxt(dv)}. Estaba mal: ${dv.desc}`,
      campos:[{id:"fotos", label:"Fotos del después (mínimo 1)", tipo:"numero", valor:pl.fotos, min:1, max:8}, {id:"nota", label:"¿Quedó bien?", tipo:"texto", largo:true, valor:pl.nota}]};
  },
  responder:(it, d) => {
    const dv = DV(it.dev); if(!dv || dv.estado!=="Abierta" || !cGusLibre()) return null;
    const areas = (dv.areas && dv.areas.length) ? dv.areas : [activos("ubicaciones")[0]], total = cNum(d.fotos, 1, 8);
    cConGustavo(()=>{
      ACC.gDevVerif({id:dv.id});
      for(let k=0; k<total; k++){
        ACC.gDevAmb({u:areas[k % areas.length]});
        cFotoG("después", ()=>ACC.gDevFoto());
      }
      if(!S.gDev) return;
      S.gDev.nota = String(d.nota||"");
      render();
      ACC.gDevVerifOK();
    });
    cClampG();
    return dv.estado==="Corregida" ? {texto:`${cNombre(GUSTAVO)} verificó el return de ${P(dv.prop).nombre} ${U(dv.unidad).num} (${devAreasTxt(dv)}) con ${total} foto(s) del después`, paso:"verificar return", oblig:true} : null;
  }});
CAMPO_MANEJADORES.push({ id:"gdevcerrar",
  detect:() => !cGusOk() ? [] : S.devoluciones.filter(dv=>dv.estado==="Corregida" && (dv.hist||[]).some(h=>/Verificada en campo/.test(h[1])))
    .map(dv=>({k:"gdevcerrar:"+dv.id, h:"gdevcerrar", tec:GUSTAVO, dev:dv.id, que:`cerrar el return de ${P(dv.prop).nombre} ${U(dv.unidad).num}`, pasoLog:"cerrar return", donde:` · return de ${P(dv.prop).nombre} ${U(dv.unidad).num}`})),
  proponer:it => {
    const dv = DV(it.dev); if(!dv || dv.estado!=="Corregida") return null;
    const s = cDecEstado(it);
    return {paso:"cerrar return", oblig:false, titulo:"Cerrar el return", desc:`${P(dv.prop).nombre} ${U(dv.unidad).num} · ${devAreasTxt(dv)}. Si no lo cierra Gustavo, queda «Corregida» para que oficina lo cierre.`,
      campos:[cHacer("¿Cierra el return?", !s.omite)]};
  },
  responder:(it, d) => {
    const dv = DV(it.dev); if(!dv || dv.estado!=="Corregida") return null;
    const n = cNombre(GUSTAVO);
    if(!cSi(d.hacer)){ const s = cDecEstado(it); s.omite = true; s.decidido = true; return cOmitido(n, `cerrar el return de ${P(dv.prop).nombre} ${U(dv.unidad).num} (lo deja a oficina)`, "cerrar return"); }
    cConGustavo(()=>ACC.gDevCerrar({id:dv.id}));
    cClampG();
    return dv.estado==="Cerrada" ? {texto:`${n} cerró el return de ${P(dv.prop).nombre} ${U(dv.unidad).num} (${devAreasTxt(dv)})`, paso:"cerrar return", oblig:false} : null;
  }});

/* ── Reporte del día ── */
const CAMPO_DIA_TXT = {
  coord:(p,u)=>cPick([`Hablé con el manager de ${p}: entrega la siguiente unidad el jueves.`,`Quedé con mantenimiento de ${p} en que me dejan la llave ${u ? "de la unidad "+u : "de la bodega"} por la mañana.`,`Coordiné con el manager de ${p} el acceso a las unidades para mañana.`]),
  problema:(p,u)=>cPick([`En ${p} ${u ? "la unidad "+u+" tenía" : "había"} una fuga pequeña y el técnico no pudo trabajar hasta que la repararan.`,`No había agua en el edificio de ${p}; avisé al manager.`,`El acceso a ${p} estuvo cerrado un rato por una mudanza.`]),
  pendiente:(p,u)=>cPick([`Volver a ${p} ${u ? "(unidad "+u+") " : ""}el viernes a verificar el zócalo.`,`Falta confirmar con el manager de ${p} las medidas de ${u ? "la unidad "+u : "las unidades"}.`,`Regresar a ${p} cuando terminen la limpieza para revisar.`]),
  seguimiento:(p,u)=>cPick([`Seguimiento del reclamo en ${p}: quedó de mandar fotos el manager.`,`Hablar con Claudia sobre lo que encontré en ${p} ${u ? "unidad "+u : ""}.`]),
  entrega:(p,u)=>cPick([`Le dejé 4 galones de pintura al encargado de ${p}${u ? " en la unidad "+u : ""}.`,`Entregué rodillos y cinta al técnico que está en ${p}.`]),
  compra:(p,u)=>cPick([`Compré 2 galones de pintura y cinta de pintor para ${p}.`,`Compré bolsas y limpiadores para la unidad ${u || "de "+p}.`])
};
const CAMPO_DIA_COM = ["Ruta completada sin novedades mayores.","Día tranquilo; quedó todo reportado.","Mañana hay que dar seguimiento a los pendientes anotados."];
/* El plan del día se arma cuando ya llegó a todas sus paradas (con lo que pasó en ellas) */
function cPlanDia(){
  return cPlanG("dia:"+HOY_SUP, ()=>{
    const r = diarioHoy(), ya = r ? r.entradas.filter(e=>!e.auto).length : 0;
    const ag = agendaHoy(), vis = ag.filter(a=>a.estado==="Visitada"), nc = ag.filter(a=>a.estado==="No completada"), om = cProbOmitir(), pref = [];
    nc.forEach(a=>pref.push(["problema", a.prop]));
    ag.forEach(a=>{
      if(a.motivo===MOTIVOS_SUP[2]) pref.push(["coord", a.prop]);
      if(a.motivo===MOTIVOS_SUP[3]) pref.push(["seguimiento", a.prop]);
      if(a.motivo==="Inspección para estimado" && a.estado==="Visitada") pref.push(["pendiente", a.prop]);
    });
    const n = ya ? 0 : (cMixto() ? cRnd(0,3) : cRnd(1,2)), ents = [];
    for(let i=0; i<n; i++){
      const par = pref.length ? pref.shift() : [cPick(["coord","pendiente","entrega","compra","seguimiento","problema"]), (vis[0] || ag[0]).prop];
      const us = S.unidades.filter(u=>u.prop===par[1]), u = (par[0]!=="coord" && par[0]!=="compra" && us.length && cChance(0.5)) ? cPick(us) : null;
      ents.push({tipo:par[0], prop:par[1], unidad:u ? u.id : null, texto:CAMPO_DIA_TXT[par[0]](P(par[1]).nombre, u ? u.num : ""), omit:cChance(om), fallos:0});
    }
    return {ents, i:0, abre:!cChance(om), insiste:!cMixto() || cChance(0.6),
      coment:(nc.length ? `Quedó sin completar ${nc.map(a=>P(a.prop).nombre).join(", ")}; Claudia decide si se reagenda. ` : "") + cPick(CAMPO_DIA_COM)};
  });
}
const cDiaListo = () => { const r = diarioHoy(); return !!r && r.estado==="En progreso" && cParadasResueltas() && !cInspSinReporte(); };
const CAMPO_DIA_TIPOS = Object.keys(ENTRADAS_DIA).filter(k=>!ENTRADAS_DIA[k].auto);
/* Abrir el reporte (opcional: si no lo abre, la primera llegada lo abre sola) */
CAMPO_MANEJADORES.push({ id:"gdiaabrir",
  detect:() => {
    if(!cGusOk() || !agendaHoy().length || diarioHoy()) return [];
    const pl = cPlanG("dia0:"+HOY_SUP, ()=>({abre:!cChance(cProbOmitir())}));
    return pl.dec.abrir ? [] : [{k:"gdiaabrir:"+HOY_SUP, h:"gdiaabrir", tec:GUSTAVO, donde:" · abrir su reporte del día"}];
  },
  proponer:() => {
    const pl = cPlanG("dia0:"+HOY_SUP, ()=>({abre:true}));
    return {paso:"abrir reporte del día", oblig:false, titulo:"Abrir el reporte del día", desc:"Registra la hora de inicio. Si no lo abre, se abre solo con su primera llegada.", campos:[cHacer("¿Abre su reporte de hoy?", pl.abre)]};
  },
  responder:(it, d) => {
    if(diarioHoy()) return null;
    const pl = cPlanG("dia0:"+HOY_SUP, ()=>({})), n = cNombre(GUSTAVO);
    pl.dec.abrir = 1;
    if(!cSi(d.hacer)) return cOmitido(n, "abrir su reporte del día", "abrir reporte del día");
    cConGustavo(()=>ACC.gDiaAbrir());
    return diarioHoy() ? {texto:`${n} abrió su reporte del día (${diarioHoy().horaInicio})`, paso:"abrir reporte del día", oblig:false} : null;
  }});
/* Actividades que el sistema no sabe (opcionales): una por pendiente */
CAMPO_MANEJADORES.push({ id:"gdiaent",
  detect:() => {
    if(!cGusOk() || !cDiaListo()) return [];
    const pl = cPlanDia();
    return pl.i < pl.ents.length ? [{k:"gdiaent:"+HOY_SUP+":"+pl.i, h:"gdiaent", tec:GUSTAVO, donde:" · actividad en su reporte del día"}] : [];
  },
  proponer:() => {
    const pl = cPlanDia(), e = pl.ents[pl.i]; if(!e) return null;
    const props = S.propiedades.filter(p=>p.activa).map(p=>p.nombre);
    return {paso:"actividad del día", oblig:false, titulo:"Agregar una actividad al reporte del día", desc:"Lo que el sistema no puede saber: compras, coordinaciones, problemas y pendientes.",
      campos:[cHacer("¿Agrega esta actividad?", !e.omit),
        {id:"tipo", label:"Tipo", tipo:"opciones", valor:ENTRADAS_DIA[e.tipo].n, opciones:CAMPO_DIA_TIPOS.map(k=>ENTRADAS_DIA[k].n), fila:0},
        {id:"prop", label:"Propiedad", tipo:"opciones", valor:P(e.prop).nombre, opciones:props, fila:0},
        {id:"texto", label:"Qué pasó", tipo:"texto", largo:true, valor:e.texto}]};
  },
  responder:(it, d) => {
    const pl = cPlanDia(), e = pl.ents[pl.i], r = diarioHoy(); if(!e || !r || r.estado!=="En progreso" || !cGusLibre()) return null;
    const n = cNombre(GUSTAVO), tipo = CAMPO_DIA_TIPOS.find(k=>ENTRADAS_DIA[k].n===d.tipo) || e.tipo, txt = String(d.texto||"").trim();
    const prop = (S.propiedades.find(p=>p.activa && p.nombre===d.prop) || P(e.prop)).id || e.prop;
    if(!cSi(d.hacer) || !txt){ pl.i++; return cOmitido(n, `una actividad (${ENTRADAS_DIA[tipo].n}) en su reporte del día`, "actividad del día"); }
    const n0 = r.entradas.length;
    cConGustavo(()=>{
      ACC.gDiaNueva({t:tipo});
      if(!S.gDia) return;
      S.gDia.prop = prop; S.gDia.unidad = (e.prop===prop) ? e.unidad : null; S.gDia.texto = txt;
      render();
      if(tipo==="compra") ACC.gDiaFoto();
      ACC.gDiaOK();
    });
    cClampG();
    if(r.entradas.length > n0){ pl.i++; return {texto:`${n} agregó a su reporte del día: ${ENTRADAS_DIA[tipo].n} — ${txt.slice(0,70)}${txt.length>70 ? "…" : ""}`, paso:"actividad del día", oblig:false}; }
    if(++e.fallos >= 2){ pl.i++; return {texto:`${n} no pudo agregar una actividad al reporte del día y la dejó (opcional)`, paso:"actividad del día", estado:"omitido", oblig:false}; }
    return null;
  }});
/* Cerrar y enviar el reporte del día: opcional. Si quedan paradas sin visitar o returns vencidos, la app pide tocar «Finalizar» dos veces */
CAMPO_MANEJADORES.push({ id:"gdiafin",
  detect:() => {
    if(!cGusOk() || !cDiaListo() || !diarioHoy().entradas.length) return [];
    const pl = cPlanDia();
    return (pl.i < pl.ents.length || pl.dec.noCierra) ? [] : [{k:"gdiafin:"+HOY_SUP, h:"gdiafin", tec:GUSTAVO, que:"el cierre de su reporte del día", pasoLog:"cierre del día", donde:" · cerrar su reporte del día"}];
  },
  proponer:it => {
    const pl = cPlanDia(), s = cDecEstado(it), r = diarioHoy(); if(!r) return null;
    const avisos = devAbiertas().filter(devVencida).length;
    return {paso:"cierre del día", oblig:false, titulo:"Cerrar y enviar el reporte del día", desc:`${r.entradas.length} actividad(es) hoy. Una vez enviado ya no se edita.${avisos ? " Hay "+avisos+" return(s) vencido(s): la app pide tocar «Finalizar» dos veces." : ""}`,
      campos:[cHacer("¿Cierra y envía el reporte?", !s.omite),
        {id:"insiste", label:"Si la app avisa de pendientes, ¿cierra igual?", tipo:"si-no", valor:cSiNo(pl.insiste)},
        {id:"coment", label:"Comentarios finales del día", tipo:"texto", largo:true, valor:pl.coment}]};
  },
  responder:(it, d) => {
    const r = diarioHoy(); if(!r || r.estado!=="En progreso" || !r.entradas.length) return null;
    const n = cNombre(GUSTAVO), pl = cPlanDia();
    if(!cSi(d.hacer)){ const s = cDecEstado(it); s.omite = true; s.decidido = true; pl.dec.noCierra = 1; return cOmitido(n, "cerrar y enviar su reporte del día", "cierre del día"); }
    cConGustavo(()=>cConCampos({dnCF:{tag:"textarea", value:String(d.coment||"")}}, ()=>{
      ACC.gDiaFin();
      if(r.estado!=="Completado" && r.avisado && cSi(d.insiste)) ACC.gDiaFin();      // la app avisó (paradas sin visitar o returns vencidos): toca de nuevo
    }));
    cClampG();
    if(r.estado==="Completado") return {texto:`${n} cerró y envió su reporte del día (${r.entradas.length} actividad(es), de ${r.horaInicio} a ${r.horaFin})`, paso:"cierre del día", oblig:false};
    if(r.avisado){ pl.dec.noCierra = 1; return {texto:`${n} vio el aviso antes de cerrar su reporte del día y lo dejó abierto por ahora`, paso:"cierre del día", estado:"sin responder", oblig:false}; }
    return null;
  }});

/* ══════════ MOTOR ══════════ */
function campoPendientes(woId){
  const L = [];
  CAMPO_MANEJADORES.forEach(m=>{ try{ L.push(...m.detect()); }catch(e){ console.warn("Campo automático: detect", m.id, e); } });
  return woId==null ? L : L.filter(x=>x.wo===+woId);
}
/* Modo Automático: responde UN pendiente con los valores generados. Antes de actuar vuelve a confirmar
   que sigue pendiente (otro navegador pudo contestar). */
function campoResponder(item, forzar){
  const m = CAMPO_MANEJADORES.find(x=>x.id===item.h); if(!m) return null;
  if(!m.detect().some(x=>x.k===item.k)) return null;
  if(cDecision(item, forzar)) return null;
  const prop = m.proponer(item); if(!prop) return null;
  _campoPor = "auto";
  const r = m.responder(item, cDatos(prop), prop) || null;
  if(r && r.estado!=="omitido") _campoDec.delete(item.k);
  return r;
}
/* Nómina y disponibilidad son opcionales: pueden omitirse del todo. Esas dos y la info que pidió oficina
   pueden quedar «sin responder» unas corridas (solo «Mixto»). «Responder ahora» en una WO rompe el silencio.
   En modo Preguntar no hay silencio: oficina decide; la omisión generada solo prellena «¿responde?». */
const _campoDec = new Map();
let _campoSilencios = 0;
function cDecEstado(it){
  let s = _campoDec.get(it.k);
  if(!s){
    const omite = !CAMPO_NUNCA_OMITE.includes(it.h) && cChance(cProbOmitir());           // la info que pidió oficina y los pasos obligatorios nunca se omiten
    s = {omite, resta:(!omite && cMixto() && cChance(0.25)) ? cRnd(2,3) : 0, l:{}};
    _campoDec.set(it.k, s);
  }
  return s;
}
/* Pasos con silencio en «Mixto». Los de CAMPO_NUNCA_OMITE son obligatorios: solo pueden tardar, nunca omitirse.
   Los de Gustavo traen su propio texto (it.que / it.pasoLog). */
const CAMPO_DECIDE = ["nomina","disp","info","gparada","greporte","grevision","gdevverif","gdevcerrar","gdiafin"];
const CAMPO_NUNCA_OMITE = ["info","gparada","greporte","gdevverif"];
function cDecision(it, forzar){
  if(!CAMPO_DECIDE.includes(it.h)) return false;
  const s = cDecEstado(it);
  const n = cNombre(it.tec);
  const que = it.que || (it.h==="nomina" ? `la conformidad de nómina de la semana ${it.sem}` : it.h==="disp" ? "su disponibilidad de la semana" : `lo que pidió oficina en WO-${it.wo}`);
  const paso = it.pasoLog || (it.h==="nomina" ? "nómina semana "+it.sem : it.h==="disp" ? "disponibilidad" : "info pedida");
  if(s.omite){
    if(cUna(s.l, "omite")) cLog(it.wo, it.tec, paso, "omitido", false, `${n} omitió ${que} (opcional)`, "auto");
    return true;
  }
  if(forzar && it.wo) s.resta = 0;
  if(s.resta > 0){
    s.resta--; _campoSilencios++;
    if(cUna(s.l, "calla")) cLog(it.wo, it.tec, paso, "sin responder", CAMPO_NUNCA_OMITE.includes(it.h), `${n} aún no responde ${que} (se reintenta)`, "auto");
    return true;
  }
  return false;
}

/* ── Modo Preguntar ── */
let _campoPreg = null;                 // la pregunta abierta: {it, prop, op}
const _campoOmitidos = new Map();      // clave del pendiente → cuándo oficina lo dejó «para después»
const cOmitidoAhora = k => (Date.now() - (_campoOmitidos.get(k)||0)) < CAMPO_REINTENTO*1000;
const cHayOmitidos = () => Array.from(_campoOmitidos.keys()).some(cOmitidoAhora);
function cQuien(it){
  const t = T(it.tec) || {}, w = it.wo ? W(it.wo) : null, a = it.sub ? S.adicionales.find(x=>x.id===it.sub) : null;
  const oficio = it.tec===GUSTAVO ? "supervisor de campo" : ((t.esp||[]).filter(e=>e!=="Supervisor").join(" / ") || "sin oficio");
  const donde = it.donde ? it.donde : w ?` en WO-${w.id}${w.serv ? " · "+w.serv : ""}${a ? " · Sub-WO «"+a.concepto+"»" : ""}`
    : it.h==="nomina" ? ` · pago de la semana ${it.sem}` : it.h==="disp" ? " · disponibilidad de la semana siguiente" : "";
  return `${cNombre(it.tec)} (${oficio}) responde${donde}`;
}
function cCampoHtml(c){
  const id = "cp_"+c.id, v = c.valor == null ? "" : c.valor;
  let ctl;
  if(c.tipo==="si-no") ctl = `<select id="${id}"><option value="si" ${cSi(v)?"selected":""}>Sí</option><option value="no" ${cSi(v)?"":"selected"}>No</option></select>`;
  else if(c.tipo==="opciones") ctl = `<select id="${id}">${c.opciones.map(o=>`<option value="${esc(o)}" ${o===v?"selected":""}>${esc(o)}</option>`).join("")}</select>`;
  else if(c.tipo==="numero") ctl = `<input id="${id}" type="number" step="1" ${c.min!=null?`min="${c.min}"`:""} ${c.max!=null?`max="${c.max}"`:""} value="${esc(String(v))}">`;
  else if(c.tipo==="hora") ctl = `<input id="${id}" type="time" value="${esc(String(v))}">`;
  else if(c.largo) ctl = `<textarea id="${id}">${esc(String(v))}</textarea>`;
  else ctl = `<input id="${id}" type="text" value="${esc(String(v))}">`;
  return `<div class="fld"><label for="${id}">${esc(c.label)}</label>${ctl}</div>`;
}
function campoPregModal(){
  const {it, prop} = _campoPreg, cs = prop.campos || [];
  let h = "", i = 0;
  while(i < cs.length){
    const c = cs[i];
    if(c.sec) h += `<div style="font-size:11px;font-weight:700;color:var(--soft);margin:8px 0 6px;text-transform:uppercase">${esc(c.sec)}</div>`;
    if(c.fila != null){
      const g = []; while(i < cs.length && cs[i].fila === c.fila) g.push(cs[i++]);
      h += `<div class="fg c3">${g.map(cCampoHtml).join("")}</div>`;
    } else { h += cCampoHtml(c); i++; }
  }
  modal(`<div class="mh"><h3>${esc(prop.titulo)}</h3><p>${esc(cQuien(it))}</p></div>
    <div class="mb" id="campoPregBox">
      <p style="margin:0 0 10px;font-size:12px"><span class="pill ${prop.oblig?"g":"w"}">${prop.oblig?"paso obligatorio":"paso opcional"}</span> ${prop.desc ? esc(prop.desc)+" " : ""}Esto es lo que haría el técnico; puedes cambiarlo antes de registrar.</p>
      ${h || `<div class="empty">No hay datos que editar en este paso.</div>`}
    </div>
    <div class="mf"><button class="btn sm" data-a="campoPregModo" data-m="auto" title="Cierra esta pregunta y el técnico contesta solo">Pasar a Automático</button>
      <button class="btn sm" data-a="campoPregModo" data-m="apagado">Apagar</button>
      <span style="flex:1"></span>
      <button class="btn" data-a="campoPregOmitir" title="Lo deja sin responder; se vuelve a preguntar en unos segundos o con «Responder ahora»">Omitir por ahora</button>
      <button class="btn p" data-a="campoPregRegistrar">Registrar</button></div>`, true);
}
/* Abre la pregunta del pendiente. false si el paso ya no existe. */
function campoPreguntar(it, op){
  const m = CAMPO_MANEJADORES.find(x=>x.id===it.h); if(!m) return false;
  if(!m.detect().some(x=>x.k===it.k)) return false;
  const prop = m.proponer(it); if(!prop) return false;
  _campoPreg = {it, prop, op};
  campoPregModal();
  return true;
}
function cLeeCampos(prop){
  const d = {};
  (prop.campos||[]).forEach(c=>{
    const e = document.getElementById("cp_"+c.id); let v = e ? e.value : c.valor;
    if(c.tipo==="numero"){ v = parseFloat(v); if(!isFinite(v)) v = c.valor; if(c.min!=null) v = Math.max(c.min, v); if(c.max!=null) v = Math.min(c.max, v); }
    d[c.id] = v;
  });
  return d;
}
const campoSeguir = op => { clearTimeout(_campoTimer); _campoTimer = setTimeout(()=>campoCorrer(op||{}), 400); };
/* Oficina registró: ejecuta las acciones reales con los datos (editados o no) */
function campoAplicar(P, d){
  const it = P.it, m = CAMPO_MANEJADORES.find(x=>x.id===it.h);
  if(!m.detect().some(x=>x.k===it.k)){ toast("Campo automático","Ese paso ya estaba respondido.","w"); render(); campoSeguir(P.op); return; }
  let r = null;
  _campoEnMotor = true; _campoPor = "oficina";
  try{ r = m.responder(it, d, P.prop) || null; } catch(e){ console.warn("Campo automático:", it.k, e); }
  finally { _campoEnMotor = false; }
  if(r){
    if(r.estado!=="omitido") _campoDec.delete(it.k);
    _campoOmitidos.delete(it.k);
    cLog(it.wo, it.tec, r.paso || it.h, r.estado || "hecho", r.oblig === true, r.texto, "oficina");
    toast("Oficina por el técnico", esc(r.texto), "v");
  } else {
    _campoOmitidos.set(it.k, Date.now());
    toast("Campo automático","No se pudo registrar ese paso con esos datos; se vuelve a preguntar más tarde.","w");
  }
  _campoPor = "auto";
  render(); campoSeguir(P.op);
}
/* Oficina dejó la pregunta sin responder (botón o cerrando la ventana) */
function campoPregOmitida(P){
  const it = P.it;
  _campoOmitidos.set(it.k, Date.now());
  cLog(it.wo, it.tec, P.prop.paso || it.h, "sin responder", P.prop.oblig, `${cNombre(it.tec)} aún no responde «${P.prop.titulo}» (se vuelve a preguntar)`, "oficina");
}

async function campoCorrer(op){
  op = op || {};
  if(_campoPreg){
    if(document.getElementById("campoPregBox")) return {pasos:0, ocupado:true};   // ya hay una pregunta esperando a oficina
    const P = _campoPreg; _campoPreg = null; campoPregOmitida(P);                  // cerraron la ventana sin elegir
  }
  if(_campoCorriendo) return {pasos:0, ocupado:true};
  _campoCorriendo = true; _campoEnMotor = true;
  const fallidas = new Set(), log = [];
  let pasos = 0, modal = false, pregunto = false;
  _campoSilencios = 0;
  if(op.forzar) _campoOmitidos.clear();
  try{ cEvRevisar(); } catch(e){ console.warn("Campo automático: revisar pedidos", e); }
  try{
    while(pasos < CAMPO_MAX_PASOS){
      if(!op.forzar && !CA().on) break;
      if(cModalAbierto()){ modal = true; break; }      // no pisar un formulario que la persona tiene abierto
      const preg = cPreg();
      const it = campoPendientes(op.wo).find(x=>!fallidas.has(x.k) && !(preg && (cOmitidoAhora(x.k) || (_campoDec.get(x.k)||{}).decidido)));
      if(!it) break;
      if(preg){
        let abierta = false;
        try{ abierta = campoPreguntar(it, op); } catch(e){ console.warn("Campo automático:", it.k, e); }
        if(abierta){ pregunto = true; break; }          // espera a oficina; Registrar / Omitir siguen la cadena
        fallidas.add(it.k); continue;
      }
      let txt = null;
      try{ txt = campoResponder(it, op.forzar); } catch(e){ console.warn("Campo automático:", it.k, e); }
      if(!txt){ fallidas.add(it.k); continue; }
      if(typeof txt === "string") txt = {texto:txt};
      cLog(it.wo, it.tec, txt.paso || it.h, txt.estado || "hecho", txt.oblig === true, txt.texto, "auto");
      pasos++; log.push(txt.texto);
      if(txt.estado === "omitido"){ render(); continue; }
      toast("Técnico (auto)", esc(txt.texto), "v"); render();
      if(!op.sinPausa && CA().pausa>0) await cSleep(CA().pausa*1000);
    }
  } finally { _campoCorriendo = false; _campoEnMotor = false; }
  /* un traspaso en silencio se reintenta solo en unos segundos, para que no dependa de otra acción de oficina */
  if(!op.forzar && (modal || _campoRepetir || _campoSilencios)){ const rep = _campoRepetir; _campoRepetir = false; campoProgramar(modal ? 4 : rep ? null : 12); }
  else if(!pregunto && CA().on && cPreg() && cHayOmitidos()) campoProgramar(CAMPO_REINTENTO);   // lo que oficina dejó para después
  return {pasos, log, pregunto};
}
function campoProgramar(seg){
  if(window.__R) return;                                  // no durante las pruebas automáticas
  clearTimeout(_campoTimer);
  _campoTimer = setTimeout(()=>campoCorrer({}), (seg!=null ? seg : CA().demora)*1000);
}
/* Lo llama bootstrap.js al terminar cada acción (ya con guardado) */
const CAMPO_NO_DISPARAN = new Set(["campoAutoModo","campoAutoPerfil","campoResponderWO","campoPregRegistrar","campoPregOmitir","campoPregModo","ir","tab","cm","pop","pcl","campana",
  "campoLogVer","campoLogFiltro","campoLogLimpiar","avLeidos","temaToggle","fView","fAbrir","fSubAbrir","fSheetNo","coachOff","coachOn","ayudaVistaToggle","gvTab","phTecPick","verTecnicoCel"]);
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
const CAMPO_MODO_TXT = {
  "auto":"Automático: el técnico responde solo después de cada acción de oficina.",
  "preguntar":"Preguntar: antes de cada respuesta se abre una ventana con lo que haría el técnico, para que la revises y la registres.",
  "apagado":"Apagado."};
function campoCambiarModo(m){
  const c = CA();
  if(!CAMPO_MODOS.includes(m)) return;
  c.modo = m; c.on = m !== "apagado";
  if(_campoPreg){ _campoPreg = null; if(document.getElementById("campoPregBox")) cm(); }   // la pregunta abierta se cierra sin registrar
  clearTimeout(_campoTimer);
  if(c.on) campoProgramar(m==="preguntar" ? 0.3 : null);
  toast("Campo automático", CAMPO_MODO_TXT[m], c.on ? "v" : "");
  render();
}
Object.assign(ACC, {
  campoAutoModo: d => { const s = document.querySelector('#campoAutoBox select[data-a="campoAutoModo"]'); campoCambiarModo((d && d.m) || (s && s.value)); },
  campoAutoPerfil: () => { const s = document.querySelector('#campoAutoBox select[data-a="campoAutoPerfil"]'); if(s) CA().perfil = s.value; render(); },
  campoResponderWO: d => {
    if(_campoCorriendo || _campoPreg){ toast("Campo automático", _campoPreg ? "Ya hay una pregunta abierta." : "Ya hay una respuesta en curso.","w"); return; }
    campoCorrer({wo:+d.id, forzar:true}).then(r=>{ if(!r.pasos && !r.pregunto && !r.ocupado) toast("Campo automático","El técnico no tiene nada pendiente en esta WO.","w"); });
  },
  campoPregRegistrar: () => { const P = _campoPreg; if(!P) return; const d = cLeeCampos(P.prop); _campoPreg = null; cm(); campoAplicar(P, d); },
  campoPregOmitir: () => { const P = _campoPreg; if(!P) return; _campoPreg = null; cm(); campoPregOmitida(P); render(); campoSeguir(P.op); },
  campoPregModo: d => campoCambiarModo(d.m),
  campoLogVer: () => { _campoLogFiltro = "todo"; campoLogModal(); },
  campoLogFiltro: d => { _campoLogFiltro = d.f || "todo"; campoLogModal(); },
  campoLogLimpiar: () => { S.campoLog = []; campoLogModal(); render(); }
});

/* ══════════ BITÁCORA VISIBLE («Qué pasó») ══════════ */
let _campoLogFiltro = "todo";
const CAMPO_LOG_PILL = {"hecho":["v","hecho"], "omitido":["g","omitido (opcional)"], "sin responder":["w","sin responder"], "problema":["r","problema"]};
const cPillLog = e => { const p = CAMPO_LOG_PILL[e.estado] || ["g", e.estado]; return `<span class="pill ${p[0]}">${p[1]}</span>`; };
function campoLogModal(){
  const L = cLogArr(), f = _campoLogFiltro;
  const sel = {todo:()=>true, omitidos:e=>e.estado==="omitido", sin:e=>e.estado==="sin responder", problemas:e=>e.estado==="problema"}[f] || (()=>true);
  const R = L.filter(sel);
  const btn = (k, tx) => `<button class="btn sm ${f===k?"p":""}" data-a="campoLogFiltro" data-f="${k}">${tx}</button>`;
  modal(`<div class="mh"><h3>Qué pasó con el campo automático</h3><p>Lo más reciente primero. Los pasos «opcionales» pueden omitirse; los obligatorios siempre se hacen.</p></div>
    <div class="mb">
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">${btn("todo","Todo")}${btn("omitidos","Omitidos")}${btn("sin","Sin responder")}${btn("problemas","Problemas")}</div>
      ${R.length
        ? `<table><thead><tr><th>Hora</th><th>WO</th><th>Técnico</th><th>Qué pasó</th><th>Quién</th><th>Estado</th></tr></thead><tbody>${R.map(e=>`<tr>
            <td>${esc(e.t)}</td><td>${e.wo?"WO-"+e.wo:"—"}</td><td>${esc(e.tec||"—")}</td><td>${esc(e.texto)}</td><td>${e.por==="oficina"?"Oficina":"Automático"}</td><td>${cPillLog(e)}</td></tr>`).join("")}</tbody></table>`
        : `<div class="empty"><div class="b">…</div>${L.length ? "No hay entradas con este filtro." : "Aquí se irá llenando lo que el campo automático haga: pasos hechos, omitidos, sin responder y problemas."}</div>`}
    </div>
    <div class="mf"><button class="btn" data-a="campoLogLimpiar">Limpiar</button><button class="btn" data-a="cm">Cerrar</button></div>`, true);
}
/* Tarjeta en el detalle de la WO: lo que hizo el campo, en orden cronológico */
function campoLogWOHtml(id){
  const L = cLogArr().filter(e=>e.wo===+id).reverse();
  if(!L.length) return "";
  return `<div class="card"><div class="chd"><h3>Lo que hizo el campo en esta WO</h3><span class="s">${L.length} paso${L.length===1?"":"s"}</span></div>
    <div style="padding:8px 15px 10px">${L.map(e=>`<div style="display:flex;gap:9px;align-items:baseline;padding:3px 0;font-size:12px">
      <span style="color:var(--faint);flex:none">${esc(e.t)}</span><span style="flex:1">${esc(e.texto)}</span>${cPillLog(e)}</div>`).join("")}</div></div>`;
}
let _campoHtml = "";
function campoAutoPintar(){
  const box = document.getElementById("campoAutoBox"); if(!box) return;
  const c = CA(), op = (v, tx) => `<option value="${v}" ${c.modo===v?"selected":""}>${tx}</option>`;
  const h = `<select class="usr" data-a="campoAutoModo" title="Automático: el técnico responde solo. Preguntar: antes de cada respuesta te muestra lo que haría para que lo revises. Apagado: no hace nada.">${op("auto","Campo: automático")}${op("preguntar","Campo: preguntar")}${op("apagado","Campo: apagado")}</select>`
    + `<select class="usr" data-a="campoAutoPerfil" title="Todo bien: sin problemas. Mixto: a veces hay datos que no coinciden, avances parciales u observaciones."><option value="todo-bien" ${c.perfil==="todo-bien"?"selected":""}>Todo bien</option><option value="mixto" ${c.perfil==="mixto"?"selected":""}>Mixto</option></select>`
    + `<button class="btn sm" data-a="campoLogVer" title="Lo que el campo automático hizo, omitió o dejó sin responder">Qué pasó${cLogArr().length?` (${cLogArr().length})`:""}</button>`;
  if(h !== _campoHtml){ _campoHtml = h; box.innerHTML = h; }
}
{ const _render0 = render; render = function(){ _render0(); campoAutoPintar(); }; }
