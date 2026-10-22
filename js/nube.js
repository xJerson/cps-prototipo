"use strict";
/* ══════════ NUBE (Supabase) ══════════
   El estado compartido de `S` (listas y catálogos) vive en Supabase: una tabla
   por lista, con cada registro completo en la columna `data` (ver db/schema.sql).
   Lo que es de pantalla (rol activo, módulo abierto, semana, modo celular) se
   queda en este navegador — cada persona tiene el suyo.

   Flujo: al abrir, si la nube está vacía se siembra con los datos de datos.js;
   si ya tiene datos, manda la nube. Después de cada acción se suben solo los
   registros que cambiaron. Si la nube no responde, el prototipo sigue con el
   guardado local de siempre y nunca se rompe.

   PRODUCCIÓN: la llave publishable va en el navegador y las tablas están
   abiertas sin login (RLS permisivo). En producción: login, políticas por rol,
   columnas reales en vez de jsonb, ids generados por la base y conflictos de
   edición resueltos (hoy gana la última escritura). */
const NUBE_URL = "https://mvirzipjjjllvisteslq.supabase.co/rest/v1";
const NUBE_KEY = "sb_publishable_CxulQ_He5iek46EGvwF0sw_-xGZS03v";

/* lista de S -> tabla */
const NUBE_TABLAS = {
  clientes:"clientes", propiedades:"propiedades", unidades:"unidades", contactos:"contactos",
  tecnicos:"tecnicos", tarifas:"tarifas", productos:"productos", vehiculos:"vehiculos", impuestos:"impuestos",
  estimados:"estimados", wos:"wos", adicionales:"adicionales", visitas:"visitas", asistencias:"asistencias",
  disponibilidad:"disponibilidad", solicitudes:"solicitudes", solicitudesComerciales:"solicitudes_comerciales",
  solicitudesSup:"solicitudes_sup", agendaSup:"agenda_sup", devoluciones:"devoluciones", borradores:"borradores",
  reportes:"reportes", repDiario:"rep_diario", excepciones:"excepciones", recordatoriosWO:"recordatorios_wo",
  comunicacionesWO:"comunicaciones_wo", comunicaciones:"comunicaciones", diasCerrados:"dias_cerrados",
  confirmacionesAgendamiento:"confirmaciones_agendamiento", facturas:"facturas", pagos:"pagos",
  creditosProp:"creditos_prop", creditosServ:"creditos_serv", pinturas:"pinturas", pagosTecnico:"pagos_tecnico",
  nomina:"nomina", descuentos:"descuentos", gastosCompartidos:"gastos_compartidos", movs:"movs",
  bitacora:"bitacora", avisos:"avisos", notis:"notis", revisionesCliente:"revisiones_cliente"
};
/* valores sueltos de S (objetos o números) que también se comparten, en la tabla `config` */
const NUBE_CONFIG = ["cierreAgendamiento","cat","aprobadoresSol","bajas","excCreadas","excAsignaciones","audSeq",
  /* Estos cuatro no existen al arrancar: nacen con la primera acción (aprobar una nómina, enviar una
     disponibilidad, mandar una lista de precios) y desde ahí se comparten igual que los demás. */
  "nomAprob","dispSemana","listasPrecio","correosPropiedad"];

/* Listas a las que el prototipo agrega registros AL PRINCIPIO (unshift). Su posición se guarda contando desde el final:
   así un registro nuevo no cambia la posición de los anteriores y solo se sube la fila nueva (antes, cada aviso nuevo
   re-subía los cientos que ya había). */
const NUBE_PREPEND = new Set(["bitacora","avisos","notis","gastosCompartidos","solicitudesComerciales","comunicacionesWO","revisionesCliente","facturas","estimados","confirmacionesAgendamiento"]);

let _nubeActiva = false;      // true cuando la nube respondió al abrir
let _nubeSnap = {};           // tabla -> {k: json} lo último que ya está en la nube
let _nubeSucio = false, _nubeOcupado = false, _nubeTimer = null, _nubeAvisoFallo = false;
/* JSON con las llaves ordenadas: la base reordena los campos de cada registro,
   y sin esto cada vuelta parecería un cambio. */
const _canon = v => {
  if(v === null || typeof v !== "object") return JSON.stringify(v);
  if(Array.isArray(v)) return "[" + v.map(x => x === undefined ? "null" : _canon(x)).join(",") + "]";
  return "{" + Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => JSON.stringify(k) + ":" + _canon(v[k])).join(",") + "}";
};
const _nubeUid = () => "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/* Copia de las listas y valores compartidos tal como salen de datos.js, antes de que
   el guardado local de otra sesión los pise: con esto se siembra la nube la primera vez. */
const NUBE_SEMILLA = (() => {
  const o = {};
  Object.keys(NUBE_TABLAS).concat(NUBE_CONFIG).forEach(k => { if(S[k] !== undefined) o[k] = JSON.parse(JSON.stringify(S[k])); });
  o.ID = JSON.parse(JSON.stringify(ID));
  return o;
})();

/* Lo que se queda en el navegador de cada persona */
const nubeSoloLocal = () => {
  const o = {};
  Object.keys(S).forEach(k => { if(!(k in NUBE_TABLAS) && !NUBE_CONFIG.includes(k)) o[k] = S[k]; });
  return o;
};

async function _nubeFetch(ruta, op){
  const r = await fetch(NUBE_URL + ruta, Object.assign({}, op, { headers: Object.assign({ apikey: NUBE_KEY }, op && op.headers) }));
  if(!r.ok) throw new Error(ruta.split("?")[0] + " " + r.status + " " + (await r.text()).slice(0, 160));
  return r;
}

/* ── S -> filas ── */
function _nubeFilasDe(arr, alFinal){
  const m = {}, usadas = new Set();
  arr.forEach((r, i) => {
    let k, data;
    if(r !== null && typeof r === "object"){
      /* Un registro copiado de otro ({...a}) hereda su _k: dos registros con la misma llave se fusionarían en una sola fila
         de la base y uno desaparecería al recargar. Cada registro de la lista debe tener la suya. */
      if(!r._k || usadas.has(r._k)) r._k = _nubeUid();
      usadas.add(r._k);
      k = r._k; data = Object.assign({}, r, { _pos: alFinal ? arr.length - 1 - i : i });
    }else{ k = "v:" + String(r); data = { _v: r, _pos: alFinal ? arr.length - 1 - i : i }; }
    m[k] = _canon(data);
  });
  return m;
}
function _nubeTodo(){
  const t = {};
  Object.entries(NUBE_TABLAS).forEach(([lista, tabla]) => { t[tabla] = _nubeFilasDe(S[lista] || [], NUBE_PREPEND.has(lista)); });
  const c = {};
  NUBE_CONFIG.forEach(k => { if(S[k] !== undefined) c[k] = _canon({ v: S[k] }); });
  c.ID = _canon({ v: ID });
  t.config = c;
  return t;
}

/* ── nube -> S ── */
async function _nubePedir(tabla){
  const filas = []; let desde = 0;
  for(;;){
    const r = await (await _nubeFetch("/" + tabla + "?select=k,data&order=k&limit=1000&offset=" + desde)).json();
    filas.push(...r); if(r.length < 1000) break; desde += 1000;
  }
  return filas;
}
function _nubeAplicar(datos){
  Object.entries(NUBE_TABLAS).forEach(([lista, tabla]) => {
    const rows = (datos[tabla] || []).slice().sort((a, b) => NUBE_PREPEND.has(lista) ? (b.data._pos || 0) - (a.data._pos || 0) : (a.data._pos || 0) - (b.data._pos || 0));
    const arr = S[lista]; arr.length = 0;
    rows.forEach(f => {
      const d = f.data;
      if("_v" in d && Object.keys(d).length <= 2) arr.push(d._v);
      else { const o = Object.assign({}, d); delete o._pos; o._k = f.k; arr.push(o); }
    });
  });
  (datos.config || []).forEach(f => {
    if(f.k === "ID"){ Object.keys(f.data.v).forEach(c => { ID[c] = Math.max(ID[c] || 0, f.data.v[c]); }); }
    else if(NUBE_CONFIG.includes(f.k) && f.data.v !== undefined) S[f.k] = f.data.v;
  });
}

/* ── subir solo lo que cambió ── */
async function _nubeSubir(){
  const ahora = _nubeTodo();
  for(const tabla of Object.keys(ahora)){
    const nuevo = ahora[tabla], viejo = _nubeSnap[tabla] || {};
    const subir = Object.keys(nuevo).filter(k => nuevo[k] !== viejo[k]);
    const borrar = Object.keys(viejo).filter(k => !(k in nuevo));
    for(let i = 0; i < subir.length; i += 100){
      const cuerpo = subir.slice(i, i + 100).map(k => ({ k, data: JSON.parse(nuevo[k]), updated_at: new Date().toISOString() }));
      await _nubeFetch("/" + tabla + "?on_conflict=k", { method: "POST",
        headers: { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(cuerpo) });
    }
    for(let i = 0; i < borrar.length; i += 50){
      const lista = borrar.slice(i, i + 50).map(k => '"' + k.replace(/"/g, '\\"') + '"').join(",");
      await _nubeFetch("/" + tabla + "?k=in.(" + encodeURIComponent(lista) + ")", { method: "DELETE" });
    }
    _nubeSnap[tabla] = nuevo;
  }
}

/* Se llama después de cada acción: junta los cambios y los sube unos instantes después */
function nubeGuardar(){
  if(!_nubeActiva) return;
  _nubeSucio = true;
  clearTimeout(_nubeTimer);
  _nubeTimer = setTimeout(_nubeVaciar, 600);
}
async function _nubeVaciar(){
  if(_nubeOcupado){ _nubeTimer = setTimeout(_nubeVaciar, 400); return; }
  _nubeOcupado = true; _nubeSucio = false;
  try{ await _nubeSubir(); _nubeAvisoFallo = false; }
  catch(e){
    _nubeSucio = true; console.warn("[nube] no se pudo guardar:", e.message);
    if(!_nubeAvisoFallo){ _nubeAvisoFallo = true;
      toast("Sin conexión con la nube","Tus cambios siguen en este navegador y se reintentan solos.","r"); }
    _nubeTimer = setTimeout(_nubeVaciar, 8000);
  }
  _nubeOcupado = false;
}

/* Abre: siembra o trae los datos. Devuelve true si la nube quedó activa. */
async function nubeIniciar(){
  try{
    const sembrado = await (await _nubeFetch("/config?select=k&k=eq.sembrado")).json();
    if(!sembrado.length){
      Object.keys(NUBE_SEMILLA).forEach(k => {
        if(k === "ID") Object.assign(ID, NUBE_SEMILLA.ID);
        else if(Array.isArray(S[k])){ S[k].length = 0; NUBE_SEMILLA[k].forEach(r => S[k].push(r)); }
        else S[k] = NUBE_SEMILLA[k];
      });
      _nubeSnap = {};
      await _nubeSubir();
      await _nubeFetch("/config?on_conflict=k", { method: "POST",
        headers: { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify([{ k: "sembrado", data: { v: true, fecha: new Date().toISOString() } }]) });
    }else{
      const tablas = Object.values(NUBE_TABLAS).concat("config");
      const filas = await Promise.all(tablas.map(_nubePedir));
      const datos = {}; tablas.forEach((t, i) => { datos[t] = filas[i]; });
      _nubeAplicar(datos);
      _nubeSnap = _nubeTodo();
    }
    _nubeActiva = true;
    return true;
  }catch(e){
    console.warn("[nube] sin conexión, se usa el guardado local:", e.message);
    toast("Sin conexión con la nube","Se trabaja con lo guardado en este navegador.","r");
    return false;
  }
}

/* Trae lo que otras personas cambiaron (al volver a la pestaña o cada 30 s),
   solo si aquí no hay nada por subir y no se está escribiendo en un campo. */
async function nubeRefrescar(){
  if(!_nubeActiva || _nubeSucio || _nubeOcupado) return;
  const a = document.activeElement;
  if(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return;
  try{
    /* Si aquí hay cambios que todavía no se subieron (algo que no pasó por una acción normal),
       primero se suben: traer la nube encima los borraría. */
    const ahora = _nubeTodo();
    if(JSON.stringify(ahora) !== JSON.stringify(_nubeSnap)){ nubeGuardar(); return; }
    const tablas = Object.values(NUBE_TABLAS).concat("config");
    const filas = await Promise.all(tablas.map(_nubePedir));
    if(_nubeSucio || _nubeOcupado) return;
    const datos = {}; tablas.forEach((t, i) => { datos[t] = filas[i]; });
    const antes = JSON.stringify(_nubeSnap);
    _nubeAplicar(datos);
    const nuevo = _nubeTodo();
    if(JSON.stringify(nuevo) !== antes){ _nubeSnap = nuevo; render(); }
  }catch(e){ console.warn("[nube] no se pudo refrescar:", e.message); }
}
document.addEventListener("visibilitychange", () => { if(!document.hidden) nubeRefrescar(); });
setInterval(() => { if(!document.hidden) nubeRefrescar(); }, 30000);

/* ── FOTOS ── Worker de Cloudflare con un bucket R2 (ver worker/fotos.js).
   Devuelve la dirección pública de la foto subida.
   PRODUCCIÓN: subida firmada por usuario y escaneo del archivo; hoy cualquiera con la URL puede subir. */
const FOTOS_URL = "https://cps-fotos.sukkiejerson.workers.dev";
async function subirFoto(blob){
  const r = await fetch(FOTOS_URL + "/subir", { method: "POST", headers: { "Content-Type": blob.type || "image/jpeg" }, body: blob });
  if(!r.ok){
    let d = {}; try{ d = await r.json(); }catch(e){}
    const err = new Error(d.error || ("subir " + r.status));
    err.cuota = d.codigo === "limite";   // el Worker bloqueó la subida para no pasar del plan gratis
    throw err;
  }
  return (await r.json()).url;
}
