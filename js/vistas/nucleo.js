"use strict";
VIEWS.tablero = () => {
  const sem = S.wos.filter(w=>w.semana===S.semana && w.estado!=="Canceled");
  const cnt = e => sem.filter(w=>w.estado===e).length;
  const porCat = {};
  sem.forEach(w=>porCat[w.cat]=(porCat[w.cat]||0)+1);
  const ing = sem.filter(w=>w.estado==="Completed")
                 .reduce((a,w)=>a+(ingresoWO(w)||0),0);
  return `
  <div class="ph"><div><h2>Tablero</h2><p>Semana ${S.semana} · lo mismo que hoy calculan a mano en la pestaña Dashboard.</p></div></div>
  <div class="kpis">
    <div class="kpi"><div class="l">Total semana</div><div class="v">${sem.length}</div></div>
    <div class="kpi"><div class="l">Sin técnico</div><div class="v ${sem.filter(w=>!w.tec).length?"w":"g"}">${sem.filter(w=>!w.tec).length}</div></div>
    <div class="kpi"><div class="l">Ya llegaron</div><div class="v g">${sem.filter(w=>asisDe(w.id)).length}</div></div>
    <div class="kpi"><div class="l">Esperando aprobación</div><div class="v ${cnt("Esperando aprobación")?"w":""}">${cnt("Esperando aprobación")}</div></div>
    <div class="kpi"><div class="l">En progreso</div><div class="v">${cnt("In progress")}</div></div>
    <div class="kpi"><div class="l">Terminadas</div><div class="v g">${cnt("Completed")}</div></div>
    <div class="kpi"><div class="l">Ingreso semana</div><div class="v mono">${money(ing)}</div></div>
  </div>

  ${vPendientes()}

  <div class="card">
    <div class="chd"><h3>Cuántas llevamos, por tipo de servicio</h3>
      <span class="s">semana ${S.semana}</span>
      <span class="r"><button class="btn sm" data-a="ir" data-m="reportes">Ver reporte completo →</button></span></div>
    <div class="cp" style="display:flex;flex-wrap:wrap;gap:9px">
    ${CAT.categorias.filter(c=>porCat[c]).map(c=>{
      const n=porCat[c], pct=Math.round(n/sem.length*100);
      return `<div style="flex:1;min-width:112px;border:1px solid var(--line);border-radius:9px;padding:10px 12px">
        <div style="font-size:11px;font-weight:700;color:var(--faint);text-transform:uppercase;letter-spacing:.04em">${esc(c)}</div>
        <div class="mono" style="font-size:22px;font-weight:750">${n}</div>
        <div style="background:var(--surface-3);border-radius:3px;height:4px;margin-top:5px">
          <div style="background:var(--azul);height:4px;border-radius:3px;width:${pct}%"></div></div></div>`;
    }).join("")||`<div class="empty" style="width:100%">Sin trabajos esta semana</div>`}
    </div>
    <div class="cp" style="border-top:1px solid var(--line)"><div class="tr" style="margin:0">Es el vistazo. Para ver <b>en dónde están</b> y desglosar por zona, técnico o propiedad, entra a <b>Reportes</b>.</div></div>
  </div>`;
};

/* Lo que el Tablero sí debe tener: lo que hay que atender hoy, con el camino para hacerlo */
function vPendientes(){
  const items = [
    {n:"Approval Requests pending", c:excPend().length, m:"excepciones",
     d:"Frenan el pago y la factura de la WO que tienen atada", k:"r"},
    {n:"Work Orders sin técnico",  c:S.wos.filter(w=>!w.tec&&esAgendada(w.estado)).length, m:"wo",
     d:"Agendadas pero sin nadie asignado", k:"w"},
    {n:"Asignadas sin marcar llegada", c:S.wos.filter(w=>w.tec&&esAgendada(w.estado)&&!asisDe(w.id)).length, m:"tecnicos",
     d:"Ya pasó su hora y el técnico no ha reportado", k:"w"},
    {n:"Terminadas por supervisar", c:S.wos.filter(w=>w.estado==="Completed"&&!w.supervisada).length, m:"supervision",
     d:"No se pueden facturar hasta que Gustavo las revise", k:"a"},
    {n:"Listas para facturar",     c:S.wos.filter(w=>w.estado==="Completed"&&w.supervisada&&!w.facturada).length, m:"facturacion",
     d:"Trabajo hecho que todavía no se cobra", k:"a"},
    {n:"Estimados esperando al cliente", c:S.estimados.filter(e=>e.estado==="Enviado").length, m:"estimados",
     d:"Enviados y sin respuesta", k:"g"},
    {n:"Permisos por aprobar",     c:S.disponibilidad.filter(d=>d.estado==="Pendiente").length, m:"despacho",
     d:"Técnicos esperando respuesta", k:"g"},
    {n:"Facturas vencidas",        c:S.facturas.filter(facVencida).length, m:"cobranza",
     d:"Más de 30 días sin pago", k:"r"},
    {n:"Productos con stock bajo", c:S.productos.filter(p=>stock(p.id)<p.min).length, m:"inventario",
     d:"Por debajo del mínimo", k:"w"}
  ].filter(x=>x.c>0 && puede(x.m));
  if(!items.length) return `<div class="card"><div class="cp"><div class="note v" style="margin:0">
    <b>Nada pendiente de tu parte.</b> No hay Approval Requests pendientes, todo está asignado y nada espera decisión.</div></div></div>`;
  return `
  <div class="card"><div class="chd"><h3>Lo que necesita tu atención</h3>
    <span class="s">${items.reduce((a,x)=>a+x.c,0)} cosas esperando · ordenadas por urgencia</span></div>
    <table><tbody>${items.sort((a,b)=>({r:0,w:1,a:2,g:3})[a.k]-({r:0,w:1,a:2,g:3})[b.k]).map(x=>`
      <tr class="cl" data-a="ir" data-m="${x.m}">
        <td style="width:52px"><span class="pill ${x.k}" style="font-size:13px;padding:4px 10px">${x.c}</span></td>
        <td><div style="font-weight:650">${esc(x.n)}</div>
          <div style="font-size:11px;color:var(--faint)">${esc(x.d)}</div></td>
        <td style="text-align:right;color:var(--azul);font-weight:650;font-size:12px">Ir →</td></tr>`).join("")}
    </tbody></table></div>`;
}

/* ── WORK ORDERS ── */
const LUN_S33 = "2026-08-10";                       // la semana 33 arranca un lunes
const DIAS_SEM = ["LUNES","MARTES","MI\u00c9RCOLES","JUEVES","VIERNES","S\u00c1BADO"];
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto",
  "septiembre","octubre","noviembre","diciembre"];

/* \u2500\u2500 SELECTOR DE PER\u00cdODO \u2500\u2500 N\u00f3mina y Facturaci\u00f3n ya no miran solo "la
   semana actual": d\u00eda puntual, semana, rango de fechas o mes completo. */
function enPeriodo(fecha, per){
  if(!fecha || !per) return false;
  if(per.tipo==="dia")   return !!per.dia && fecha===per.dia;
  if(per.tipo==="rango") return !!per.desde && !!per.hasta && fecha>=per.desde && fecha<=per.hasta;
  if(per.tipo==="mes")   return !!per.mes && fecha.slice(0,7)===`${per.anio}-${String(per.mes).padStart(2,"0")}`;
  return semanaDe(fecha)===per.sem;   // "semana" \u2014 y cualquier per\u00edodo mal armado cae ac\u00e1
}
function fechaMover(fecha, dias){
  const d=new Date(fecha+"T12:00:00");
  d.setDate(d.getDate()+dias);
  return d.toISOString().slice(0,10);
}
function periodoTexto(per){
  if(per.tipo==="dia")   return per.dia   ? per.dia                         : "\u2014 elige un d\u00eda \u2014";
  if(per.tipo==="rango") return (per.desde&&per.hasta) ? `${per.desde} al ${per.hasta}` : "\u2014 elige un rango \u2014";
  if(per.tipo==="mes")   return per.mes   ? `${MESES[per.mes-1]} de ${per.anio}`        : "\u2014 elige un mes \u2014";
  return `semana ${per.sem}`;
}
/* pref permite tener m\u00e1s de un selector de per\u00edodo en pantallas distintas
   sin que se pisen \u2014 cada uno con su propio S.periodo* y sus propias
   acciones ("perTipo" para N\u00f3mina/Facturaci\u00f3n, "calPerTipo" para el
   Calendario), sin acoplar un m\u00f3dulo al per\u00edodo que est\u00e9 mirando el otro. */
function renderSelectorPeriodo(per=S.periodo, pref=""){
  const camposTipo = {
    semana: `<button class="btn sm" data-a="${pref}perNav" data-s="${per.sem-1}">\u2039</button>
      <span class="mono" style="padding:0 4px">Semana ${per.sem}</span>
      <button class="btn sm" data-a="${pref}perNav" data-s="${per.sem+1}">\u203a</button>`,
    dia:    `<input type="date" data-a="${pref}perDia" value="${esc(per.dia||"")}">`,
    rango:  `<input type="date" data-a="${pref}perDesde" value="${esc(per.desde||"")}">
      <span style="color:var(--faint)">al</span>
      <input type="date" data-a="${pref}perHasta" value="${esc(per.hasta||"")}">`,
    mes:    `<select data-a="${pref}perMes">${MESES.map((m,i)=>`<option value="${i+1}" ${per.mes===i+1?"selected":""}>${m}</option>`).join("")}</select>
      <input type="number" data-a="${pref}perAnio" value="${per.anio}" class="mono" style="width:70px">`
  };
  return `<div class="act" style="align-items:center;gap:7px;flex-wrap:wrap">
    <select data-a="${pref}perTipo">
      <option value="semana" ${per.tipo==="semana"?"selected":""}>Semana</option>
      <option value="dia" ${per.tipo==="dia"?"selected":""}>D\u00eda</option>
      <option value="rango" ${per.tipo==="rango"?"selected":""}>Rango de fechas</option>
      <option value="mes" ${per.tipo==="mes"?"selected":""}>Mes</option>
    </select>
    ${camposTipo[per.tipo]}
  </div>`;
}
/* La operación trabaja desfasada: mientras se paga una semana ya cerrada,
   la siguiente sigue recibiendo trabajo. Esta tarjeta las muestra juntas sin
   mezclar los botones de pago/facturación del período que se eligió arriba. */
function resumenDosSemanas(sem){
  return `<div class="card" style="margin:14px 0"><div class="chd"><h3>Semanas de operación</h3>
    <span class="s">Pago y trabajo consecutivo, visibles al mismo tiempo</span></div>
    <div class="cp" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:10px">${[
      [sem,"Semana en pago"], [sem+1,"Semana operativa"]
    ].map(([n,label])=>{
      const ws=S.wos.filter(w=>w.semana===n&&w.estado!=="Canceled");
      const terminadas=ws.filter(w=>w.estado==="Completed");
      const pendientes=ws.filter(w=>!w.pagadaTec&&w.estado==="Completed");
      const totalPago=pendientes.reduce((t,w)=>t+(egresoWO(w)||0),0);
      const totalCobro=terminadas.reduce((t,w)=>t+(ingresoWO(w)||0),0);
      return `<div style="border:1px solid var(--line);border-radius:8px;padding:10px">
        <div style="font-size:11px;color:var(--faint);text-transform:uppercase;letter-spacing:.05em">${label}</div>
        <div style="font-weight:750;margin:3px 0">Semana ${n}</div>
        <div style="font-size:12px">${ws.length} WO · ${terminadas.length} terminada(s)</div>
        <div style="font-size:11px;color:var(--soft);margin-top:5px">Por pagar: <b class="mono">${money(totalPago)}</b> · Por cobrar: <b class="mono">${money(totalCobro)}</b></div>
        ${n===sem?"":`<button class="btn sm" data-a="perNav" data-s="${n}" style="margin-top:8px">Abrir esta semana</button>`}
      </div>`;
    }).join("")}</div></div>`;
}
function diasDeSemana(sem){
  const base = new Date(LUN_S33 + "T12:00:00");
  base.setDate(base.getDate() + (sem - 33) * 7);
  return DIAS_SEM.map((_, i) => {
    const d = new Date(base); d.setDate(base.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}
VIEWS.alertas = () => {
  const A=alertas(); const o={r:0,w:1,a:2,g:3}; A.sort((a,b)=>o[a.n]-o[b.n]);
  return `
  <div class="ph"><div><h2>Alertas</h2><p>Se recalculan solas. Ninguna es genérica: cada una sale de un problema real del archivo.</p></div></div>
  <div class="card">${A.length?`<table><thead><tr><th>Alerta</th><th>Detalle</th><th>Para quién</th></tr></thead>
    <tbody>${A.map(a=>`<tr><td><span class="pill ${a.n}"><span class="dot"></span>${esc(a.t)}</span></td>
      <td>${esc(a.d)}</td><td>${esc(a.q)}</td></tr>`).join("")}</tbody></table>`
    :`<div class="empty"><div class="b">✓</div>Sin alertas activas</div>`}</div>`;
};

/* ══════════ MODALES ══════════ */
function modal(html,wide){ $("#mroot").innerHTML=`<div class="scrim" data-a="cm"><div class="modal ${wide?"wide":""}" data-stop>${html}</div></div>`;
  /* Diferido: deja que corra primero el código que a veces sigue a modal()
     — foco en un campo, marcarlo, refWO(), etc. — y recién ahí la ayuda
     mira el formulario ya en su estado final. */
  if(typeof renderCoach==="function") setTimeout(renderCoach,0); }
/* S.progSolId sobrevive mientras el modal de "Nueva Work Order" sigue
   abierto, disparado desde "Programar" en una Solicitud (ver solProgramar
   / woGuardar). Cerrar CUALQUIER modal — cancelado o no — apaga esa marca:
   así, si el usuario abre otra cosa sin guardar, no queda una Solicitud
   vieja esperando pegarse a una Work Order que no tiene nada que ver. */
function cm(){ $("#mroot").innerHTML=""; S.progSolId=null; S._aprobFoto=null; S._dvFoto=null; if(typeof renderCoach==="function") renderCoach(); }
const val = id => { const e=document.getElementById(id); return e? e.value.trim() : ""; };
const chk = id => { const e=document.getElementById(id); return e? e.checked : false; };
function marcaFalta(ids){ let bad=false; ids.forEach(i=>{ const e=document.getElementById(i);
  if(e && !e.value.trim()){ e.parentElement.classList.add("bad"); bad=true; } else if(e) e.parentElement.classList.remove("bad"); }); return bad; }

/* Punto 7 del feedback (fotos): el prototipo no tiene servidor, así que no hay
   dónde "subir" nada de verdad — pero ya no hace falta simular con un
   contador. Se elige una foto real (cámara o galería), se ve de verdad en
   pantalla y se puede abrir en grande. Se reescala en un canvas antes de
   guardarla en memoria para no inflar el estado con archivos gigantes. */
function capturarFoto(cb){
  // Gancho para las pruebas automáticas: un Chrome headless no tiene forma
  // de tocar el selector de archivos real del sistema operativo, así que
  // la prueba simula la elección seteando esto antes de disparar la acción.
  if(typeof window!=="undefined" && window.__fotoTest!==undefined){
    const url=window.__fotoTest; window.__fotoTest=undefined; cb(url); return;
  }
  const inp=document.createElement("input");
  inp.type="file"; inp.accept="image/*"; inp.capture="environment";
  inp.onchange=()=>{
    const f=inp.files&&inp.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=()=>{
      const img=new Image();
      img.onload=()=>{
        const MAX=1000, k=Math.min(1, MAX/Math.max(img.width,img.height));
        const c=document.createElement("canvas");
        c.width=Math.round(img.width*k); c.height=Math.round(img.height*k);
        c.getContext("2d").drawImage(img,0,0,c.width,c.height);
        cb(c.toDataURL("image/jpeg",0.72));
      };
      img.src=r.result;
    };
    r.readAsDataURL(f);
  };
  inp.click();
}
const fotoNueva = (url, quien) => ({url, quien:quien||S.usuario, hora:hora()});
/* w.evid es viejo y algunas WO sembradas tienen el número sin el array real
   detrás (datos de ejemplo previos a este cambio) — se completa con el
   bloque degradado de siempre para no mostrar un hueco donde el contador
   dice que hay fotos. */
const fotosConRelleno = (arr, n) => {
  arr = arr||[];
  return arr.length>=n ? arr : arr.concat(Array.from({length:n-arr.length},()=>({url:null})));
};

/* Galería genérica para cualquiera de los 4 puntos de "fotos" del feedback
   (Work Completed, Work to Be Performed, Sub-Work Order Ref/Evid) — así no
   hay que repetir el modal cuatro veces. S.fotoModal dice de qué WO/línea
   se trata; fotoModalAgregar sabe en qué array de cada una hay que guardar. */
function fotoModalInfo(m){
  if(m.tipo==="woEvid"){ const w=W(m.id);
    return {titulo:`Evidencia del trabajo — WO-${w.id}`, sub:"Lo que el técnico cargó al cerrar.", arr:(w.evidFotos=w.evidFotos||[])}; }
  if(m.tipo==="woPrevia"){ const w=W(m.id);
    return {titulo:`Fotos de referencia — WO-${w.id}`, sub:"Lo que hay que hacer, en foto — no en texto.", arr:(w.fotosPrevias=w.fotosPrevias||[])}; }
  if(m.tipo==="subwoRef"){ const a=by(S.adicionales,m.id);
    return {titulo:"Fotos de referencia", sub:esc(a.concepto), arr:(a.fotosRefArr=a.fotosRefArr||[])}; }
  if(m.tipo==="subwoEvid"){ const a=by(S.adicionales,m.id);
    return {titulo:"Fotos de evidencia", sub:esc(a.concepto), arr:(a.fotosEvidArr=a.fotosEvidArr||[])}; }
  if(m.tipo==="subwoHallazgo"){ const a=by(S.adicionales,m.id);
    return {titulo:"Hallazgo inicial (Initial finding)", sub:esc(a.concepto), arr:a.hallazgoFoto?[a.hallazgoFoto]:[]}; }
  return {titulo:"Fotos", sub:"", arr:[]};
}
function modalFotos(){
  const m=S.fotoModal; if(!m) return;
  const {titulo, sub, arr} = fotoModalInfo(m);
  modal(`<div class="mh"><h3>${esc(titulo)}</h3>${sub?`<p>${sub}</p>`:""}</div>
  <div class="mb">
    ${arr.length?`<div style="display:flex;flex-wrap:wrap;gap:8px">${arr.map(f=>`
      <a href="${f.url}" target="_blank" style="display:block;border-radius:8px;overflow:hidden;border:1px solid var(--line)">
        <img src="${f.url}" style="width:84px;height:84px;object-fit:cover;display:block"></a>`).join("")}</div>
      <div class="hint" style="margin-top:10px">Tocá una foto para abrirla en grande, en una pestaña nueva.</div>`
      : `<div class="note" style="text-align:center">Todavía no hay fotos acá.</div>`}
  </div>
  <div class="mf"><button class="btn" data-a="cm">Cerrar</button>
    <button class="btn p" data-a="fotoModalAgregar">📷 Agregar foto</button></div>`);
}

/* La ubicación no es una lista plana: cada tipo de trabajo define si hace
   falta y qué espacios tienen sentido. La tabla permite ampliar reglas sin
   rearmar el formulario. */
const REGLAS_UBICACION = {
  Repair:       {obligatoria:true},
  Cabinet:      {obligatoria:true, opciones:["Bano","Kitchen"], detalle:true},
  Resurface:    {obligatoria:true, opciones:["Bano","Kitchen"], detalle:true},
  Installation: {obligatoria:true},
  Ceramica:     {obligatoria:true}
};
const reglaUbicacion = cat => {
  const regla=REGLAS_UBICACION[cat]||{};
  return {obligatoria:!!regla.obligatoria, opciones:regla.opciones||activos("ubicaciones"), detalle:!!regla.detalle};
};
const EXIGE_UBIC = Object.keys(REGLAS_UBICACION);
/* Reunión Claudia (feedback prototipo): "Repair no necesita habitaciones, baños
   ni floors. Tampoco resurfacing" — son las mismas categorías que ya cobran
   por arreglo puntual (Tub only, Per trailer…), no por tamaño del apartamento. */
const SIN_BEDROOMS = ["Repair","Cabinet","Resurface","Installation","Ceramica","Trash out","Pressure washing"];

/* Sección 5 del feedback: cada Sub-Work Order trae specs propias según su tipo
   — el ejemplo del doc es "Sub-WO: Door Paint" con Door/Current color/New color
   además de Location, Quantity y Notes (que ya son campos genéricos). Se arma
   como catálogo para poder sumar tipos nuevos sin tocar el formulario. */
const CAMPOS = {
  nombre:"Nombre", apellido:"Apellido", tipo:"Tipo", contacto:"Contacto",
  tel:"Teléfono", mail:"Correo", origen:"Origen", estado:"Estado",
  zona:"Zona (Area)", cliente:"Management", dir:"Dirección",
  door:"Door code", coi:"COI vence", pref:"Default Contact Method",
  aprob:"Approval Method", notas:"Special Property Requirements",
  mailAP1:"Accounts Payable Email 1", mailAP2:"Accounts Payable Email 2",
  num:"Número de unidad", rooms:"Rooms", pisos:"Floor", detalle:"Detail",
  esp:"Especialidad", movimiento:"Se mueve de zona",
  prop:"Propiedad", cat:"Tipo de servicio", serv:"Servicio", variante:"Rooms",
  precio:"Se cobra al cliente", pago:"Se paga al técnico",
  desc:"Description", tax:"Tax", descuento:"Total Discount", cantidad:"Quantity",
  unidad:"Unidad", fecha:"Fecha", horaProg:"Hora", semana:"Semana",
  cant:"Cantidad", po:"PO", notasTec:"Notas al técnico", notasOficina:"Notas internas de oficina",
  ubic:"Ubicación del trabajo", ubicDetalle:"Detalle de ubicación"
};
/* Un id crudo («P3», «T2») no le dice nada a nadie leyendo la bitácora */
function legible(k,v){
  if(v===null||v===undefined||v==="") return "—";
  // Ordenado: que el técnico tenga las mismas especialidades en otro orden no
  // es una corrección, y no tiene por qué ensuciar la bitácora.
  if(Array.isArray(v)) return v.slice().sort().join(", ")||"—";
  if(v===true) return "Sí";
  if(v===false) return "No";
  if(k==="prop")    return P(v)?P(v).nombre:String(v);
  if(k==="cliente") return CLI(v)?CLI(v).nombre:String(v);
  if(k==="unidad")  return U(v)?U(v).num:String(v);
  if(k==="sup"||k==="tec") return tecN(v)||String(v);
  if(k==="precio"||k==="pago") return money(v);
  return String(v);
}
function diffCampos(antes, despues){
  const out=[];
  Object.keys(despues).forEach(k=>{
    const a=legible(k,antes[k]), b=legible(k,despues[k]);
    if(a!==b) out.push({campo:CAMPOS[k]||k, de:a, a:b});
  });
  return out;
}
/* Aplica la corrección y la deja escrita. `extra` corre con el objeto ya
   modificado, para lo que cada módulo necesite (el historial de la WO). */
function guardarEdicion(obj, nuevos, modulo, ref, extra, marca){
  const cambios = diffCampos(obj, nuevos);
  if(!cambios.length){
    // Sin esto la bitácora registraría un alta: el mismo Guardar sirve para
    // crear y para corregir, y el auditor no sabe distinguirlos solo.
    S.audOmitir = true;
    cm(); toast("Sin cambios","No modificaste ningún dato, así que no hay nada que registrar.","");
    return 0;
  }
  Object.assign(obj, nuevos);
  if(marca) flash(marca);
  if(extra) extra(obj, cambios);
  S.bitacora.unshift({ n:++S.audSeq, fecha:"2026-08-11", hora:hora(),
    usuario:S.usuario, rol:ROLES[S.usuario].r,
    accion:"Corrigió datos", modulo, ref, cambios });
  cm();
  toast("✓ Corregido",
    `${cambios.length} campo(s) en <b>${esc(ref)}</b>: ${esc(cambios.map(c=>c.campo).join(", "))}.
     Quedó en la <b>Bitácora</b> con el valor anterior — la corrección no borra el error, lo deja explicado.`,"v");
  render();
  return cambios.length;
}
/* Editar una WO deja de ser inocente en cuanto el dinero ya salió */
const woEditable = w => w.estado!=="Canceled" && !w.pagadaTec
  && !S.facturas.some(f=>f.lineas.includes(w.id));
