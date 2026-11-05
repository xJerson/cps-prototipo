"use strict";
/* ══════════ CAMBIO DE PRECIOS CON FECHA («Precios con vigencia») ══════════
   La oficina prepara una lista nueva hasta con 12 meses de anticipación sin tocar lo que rige hoy.
   El modelo de datos (versiones de una tarifa) y las reglas de «qué precio rige en una fecha» viven en helpers.js:
   tarVigente, tarIndice, tarifa(…, fechaRef). Aquí está la pantalla y sus acciones.
   Borrador: S.vigBorrador (clave local; no está en la nube, así que «Guardar borrador» no cambia nada para nadie más).
   Programar: crea una fila nueva por cada precio cambiado, todas con la misma fecha `desde` y el mismo `lote`. */

const _dn = s => Date.UTC(+s.slice(0,4),+s.slice(5,7)-1,+s.slice(8,10))/86400000;
const _iso = n => new Date(n*86400000).toISOString().slice(0,10);
const _fmt = (s,corto) => new Date(_dn(s)*86400000).toLocaleDateString("es",{day:"numeric",month:corto?"short":"long",year:"numeric",timeZone:"UTC"});
function _masMeses(iso, m){
  const y=+iso.slice(0,4), mo=+iso.slice(5,7)-1, d=+iso.slice(8,10);
  const t=new Date(Date.UTC(y,mo+m,1)), ult=new Date(Date.UTC(y,mo+m+1,0)).getUTCDate();
  t.setUTCDate(Math.min(d,ult)); return t.toISOString().slice(0,10);
}
const vigMaxFecha = () => _masMeses(hoyReal(), VIG_MAX_MESES);
const vigK = prop => prop || "_g";
const vigNombre = prop => prop && P(prop) ? P(prop).nombre : "Tarifario general";
const vigDias = n => n+" día"+(n===1?"":"s");

/* Borrador de la lista nueva de una propiedad (o de la general): {desde, nuevos:{llave:precio}, guardado} */
function vigBor(prop){
  const b = (S.vigBorrador = S.vigBorrador || {});
  return b[vigK(prop)] || (b[vigK(prop)] = {desde:"", nuevos:{}, guardado:true});
}
function vigVista(prop){
  const v = (S.vigVistaF = S.vigVistaF || {})[vigK(prop)], hoy = hoyReal();
  return v || hoy;
}

/* Líneas de precio de la propiedad (o general) que rigen hoy. Cada una: {k, rep (fila que rige hoy), g (todas sus versiones)} */
function vigFilas(prop){
  const hoy = hoyReal(), r = [];
  tarIndice().m.forEach((g,k)=>{
    if((g[0].prop||"") !== prop) return;
    const rep = g.find(t=>tarVigente(t,hoy)); if(rep) r.push({k, rep, g});
  });
  return r.sort((a,b)=>String(a.rep.cat).localeCompare(String(b.rep.cat))||String(a.rep.serv).localeCompare(String(b.rep.serv))
    ||String(a.rep.variante||"").localeCompare(String(b.rep.variante||""))||((a.rep.pisos==null?-1:a.rep.pisos)-(b.rep.pisos==null?-1:b.rep.pisos)));
}
/* La lista nueva ya programada (la que entra primero): {desde, lote, rows} o null */
function vigProg(prop){
  const rows = S.tarifas.filter(t=>(t.prop||"")===prop && tarProgramada(t)); if(!rows.length) return null;
  const desde = rows.reduce((a,t)=>t.desde<a?t.desde:a, rows[0].desde);
  const lote = (rows.find(t=>t.desde===desde)||{}).lote || "";
  return {desde, lote, rows: rows.filter(t=>t.desde===desde && (t.lote||"")===lote)};
}
const vigHayProgramada = prop => S.tarifas.some(t=>tarProgramada(t) && (!t.prop || t.prop===prop));
/* Fecha de la lista programada que se manda en el PDF: la de la propiedad si tiene una; si no, la de la tarifa general. */
const vigPdfDesde = prop => {
  const min = rows => rows.reduce((a,t)=>!a||t.desde<a?t.desde:a, "");
  const prog = S.tarifas.filter(t=>tarProgramada(t));
  return (prop && min(prog.filter(t=>t.prop===prop))) || min(prog.filter(t=>!t.prop));
};
/* Cuántos precios del borrador de verdad cambian algo */
function vigCambios(prop){
  const b = vigBor(prop);
  return vigFilas(prop).filter(f=>b.nuevos[f.k]!=null && b.nuevos[f.k]>=0 && b.nuevos[f.k]!==f.rep.precio);
}
const vigDelta = (nuevo, actual) => nuevo==null||nuevo===actual||!(actual>0) ? null : (nuevo-actual)/actual*100;
const vigDeltaTxt = dl => dl==null ? "—" : (dl>0?"+":"")+dl.toFixed(1)+"%";
const vigDeltaCls = dl => "delta "+(dl==null?"eq":dl>0?"up":"dn");

/* «cambia el 1 feb 2027» junto al precio de hoy */
function vigPillCambia(t){
  const p = tarProxima(t);
  return p ? ` <span class="pill a vig-cambia" title="Hay una lista nueva programada: este precio pasa a ${esc(money(p.precio))} el ${esc(_fmt(p.desde))}">cambia el ${esc(_fmt(p.desde,true))}</span>` : "";
}

/* ── Frase de orientación y chip de estado ── */
function vigEstado(prop, dentro){
  const prog = vigProg(prop), n = vigCambios(prop).length, b = vigBor(prop);
  if(prog) return {tipo:"p", prog, n,
    chip:`Programada · rige desde ${_fmt(prog.desde,true)}`,
    frase:`Lista nueva programada desde ${_fmt(prog.desde)}. Hasta entonces se cobra con la lista actual.`};
  if(n || b.desde) return {tipo:"b", prog:null, n,
    chip:"Borrador · no rige todavía",
    frase:`Estás preparando una lista nueva. Lo que rige hoy no cambia hasta ${b.desde?"el "+_fmt(b.desde):"la fecha que elijas"}.`};
  return {tipo:"n", prog:null, n:0, chip:"Sin cambios preparados",
    frase: dentro ? "Aquí ves los precios que rigen hoy. Sigue los 3 pasos para preparar la lista nueva: nada cambia hasta que la programes."
      : "Aquí ves los precios que rigen hoy. Pulsa “Preparar cambio de precios” para empezar."};
}
/* Frase corta para la vista normal de la lista (fuera de la preparación) */
function vigFraseLista(prop){
  const e = vigEstado(prop);
  return `<div class="vig-frase vig-frase-lista ${e.tipo}">${esc(e.frase)}</div>`;
}

/* ── Pantalla ── */
function vigenciaHTML(prop){
  const e = vigEstado(prop,true), b = vigBor(prop), pu = puede("tarifario"), hoy = hoyReal();
  const entendido = (()=>{ try{ return localStorage.getItem("cps_vig_entendido")==="1"; }catch(x){ return false; } })();
  S.vigVistaF = S.vigVistaF || {};
  setTimeout(vigRepinta, 0);   // las secciones se pintan apenas el HTML está en pantalla
  const bloq = e.prog || !pu;
  return `<div class="vig" id="vigRoot" data-prop="${esc(prop)}">
  <div class="vig-cab">
    <button class="btn sm" data-a="vigSalir" data-id="${esc(prop)}">← Volver a la lista actual</button>
    <h3>Cambio de precios · ${esc(vigNombre(prop))}</h3>
    <span class="vig-chip ${e.tipo}" id="vigChip">${esc(e.chip)}</span>
  </div>
  <p class="vig-frase ${e.tipo}" id="vigFrase">${esc(e.frase)}</p>
  <div id="vigAyuda">${entendido||e.tipo!=="n"?"":vigAyudaHTML()}</div>
  <section class="card vig-barra" aria-label="Pasos para preparar el cambio de precios">
    <ol class="vig-pasos">
      <li class="vig-paso" id="vigP1"><span class="vig-n" aria-hidden="true">1</span><div class="vig-pb">
        <label class="vig-pt" for="vigDesde">Elige desde cuándo rige</label>
        <div class="vig-ctl">
          <input type="date" id="vigDesde" data-a="vigDesde" value="${esc(e.prog?e.prog.desde:b.desde)}" min="${_iso(_dn(hoy)+1)}" max="${vigMaxFecha()}" ${bloq?"disabled":""}>
          <button class="vig-mini" data-a="vigChipDesde" data-k="1" ${bloq?"disabled":""}>+1 mes</button>
          <button class="vig-mini" data-a="vigChipDesde" data-k="3" ${bloq?"disabled":""}>+3 meses</button>
          <button class="vig-mini" data-a="vigChipDesde" data-k="enero" ${bloq?"disabled":""}>1 de enero</button>
        </div></div></li>
      <li class="vig-paso" id="vigP2"><span class="vig-n" aria-hidden="true">2</span><div class="vig-pb">
        <div class="vig-pt">Escribe los precios nuevos</div>
        <div class="vig-ctl">
          <label for="vigPct" class="vig-lbl">Subir todo</label>
          <input type="number" id="vigPct" value="${esc(S.vigPct==null?5:S.vigPct)}" min="-50" max="100" step="0.5" ${bloq?"disabled":""}><span>%</span>
          <button class="btn sm" data-a="vigAplicarPct" ${bloq?"disabled":""}>Aplicar</button>
        </div>
        <div class="vig-why" id="vigP2n"></div></div></li>
      <li class="vig-paso" id="vigP3"><span class="vig-n" aria-hidden="true">3</span><div class="vig-pb">
        <div class="vig-pt">Programa el cambio</div>
        <div class="vig-ctl">
          <button class="btn p" id="vigBtnProg" data-a="vigProgramar">Programar cambio</button>
          <span class="vig-ok" id="vigProgOk" hidden>✓ Programada</span>
        </div>
        <div class="vig-why" id="vigWhy" aria-live="polite"></div></div></li>
    </ol>
    <div class="vig-sec" role="group" aria-label="Otras acciones">
      <div class="vig-sec-t">Otras acciones</div>
      <div class="vig-sec-b">
        <button class="btn sm" id="vigBtnBor" data-a="vigBorrador">Guardar borrador</button>
        <button class="btn sm" data-a="vigPdf">Preparar PDF para el cliente</button>
        <button class="btn sm vig-cancel" id="vigBtnCan" data-a="vigCancelar" hidden>Cancelar programación</button>
      </div></div>
  </section>
  <section class="card vig-tl" aria-label="Línea de tiempo de los precios" id="vigTL"></section>
  <div class="vig-grid">
    <section class="card vig-tab" id="vigTabla" aria-label="Precios por servicio"></section>
    <aside class="card vig-panel" id="vigPanel" aria-live="polite"></aside>
  </div>
  </div>`;
}
function vigAyudaHTML(){
  return `<div class="card vig-ayuda"><div><b>Cómo se prepara un cambio de precios</b>
    <ol><li>Elige desde qué día rige la lista nueva (hasta 12 meses adelante).</li>
    <li>Escribe los precios nuevos en la columna «Lista nueva», o usa «Subir todo» para armarla de un golpe.</li>
    <li>Pulsa «Programar cambio». Hasta ese día se sigue cobrando con la lista actual.</li></ol></div>
    <button class="btn sm" data-a="vigEntendido">Entendido</button></div>`;
}

/* Pinta (o repinta) las partes de la pantalla desde el estado. No toca los campos de la barra, para no robar el foco. */
function vigRepinta(){
  const root = document.getElementById("vigRoot"); if(!root) return;
  const prop = root.dataset.prop;
  vigPintaEstado(prop); vigPintaTL(prop); vigPintaTabla(prop); vigPintaPanel(prop);
}
function vigPintaEstado(prop){
  const e = vigEstado(prop,true), b = vigBor(prop), pu = puede("tarifario"), $e = id=>document.getElementById(id);
  if(!$e("vigChip")) return;
  $e("vigChip").className = "vig-chip "+e.tipo; $e("vigChip").textContent = e.chip;
  $e("vigFrase").className = "vig-frase "+e.tipo; $e("vigFrase").textContent = e.frase;
  const desde = e.prog ? e.prog.desde : b.desde, hoy = hoyReal();
  const fechaOk = !!desde && desde>hoy && desde<=vigMaxFecha();
  $e("vigP1").classList.toggle("hecho", !!desde && (e.prog || fechaOk));
  $e("vigP2").classList.toggle("hecho", !!(e.prog || e.n));
  $e("vigP3").classList.toggle("hecho", !!e.prog);
  const bloq = !!e.prog || !pu;
  ["vigDesde","vigPct"].forEach(i=>{ $e(i).disabled = bloq; });
  document.querySelectorAll("#vigRoot [data-a='vigChipDesde'],#vigRoot [data-a='vigAplicarPct']").forEach(x=>{ x.disabled = bloq; });
  $e("vigP2n").textContent = e.prog ? "" : e.n ? `${e.n} precio${e.n===1?"":"s"} con cambio` : "";
  /* el botón principal es UNO solo: «Programar cambio»; ya programado, solo queda el aviso y «Cancelar programación» (secundario) */
  const btn = $e("vigBtnProg"), why = !pu ? "No tienes permiso para cambiar precios."
    : !desde ? "Falta elegir desde cuándo rige."
    : !fechaOk ? "Elige una fecha futura, hasta 12 meses adelante."
    : !e.n ? "Falta escribir al menos un precio nuevo." : "";
  btn.hidden = !!e.prog; $e("vigProgOk").hidden = !e.prog;
  btn.disabled = !!why; btn.title = why || "Programa la lista nueva: no cambia nada hasta la fecha elegida";
  $e("vigWhy").textContent = e.prog ? "" : why;
  $e("vigBtnBor").hidden = !!e.prog; $e("vigBtnCan").hidden = !e.prog;
  $e("vigBtnCan").disabled = !pu; $e("vigBtnCan").title = pu ? "" : "No tienes permiso para cambiar precios.";
  $e("vigBtnBor").disabled = !pu; $e("vigBtnBor").title = pu ? "Guarda lo que llevas; no cambia ningún precio" : "No tienes permiso para cambiar precios.";
}

/* Línea de tiempo: azul = lista actual, ámbar rayado = lista programada, «Hoy» y un visor que se arrastra */
function vigRango(prop){
  const hoy = hoyReal(), ini = hoy.slice(0,7)+"-01";
  const min = _dn(_masMeses(ini,-3)), max = _dn(_masMeses(hoy,VIG_MAX_MESES+1));
  return {min, max};
}
function vigPintaTL(prop){
  const el = document.getElementById("vigTL"); if(!el) return;
  const hoy = hoyReal(), {min,max} = vigRango(prop), vista = _dn(vigVista(prop)), hoyN = _dn(hoy);
  const pct = n => (n-min)/(max-min)*100;
  const cortes = [...new Set(S.tarifas.filter(t=>(t.prop||"")===prop && tarBase(t) && t.desde).map(t=>_dn(t.desde)))]
    .filter(n=>n>min && n<max).sort((a,b)=>a-b);
  const lim = [min, ...cortes, max];
  const prog = vigProg(prop), progN = prog ? _dn(prog.desde) : null;
  const tramos = lim.slice(0,-1).map((a,i)=>{
    const b = lim[i+1], futuro = a>hoyN, w = (b-a)/(max-min)*100;
    const txt = futuro ? (a===progN ? `Lista nueva · desde ${_fmt(_iso(a),true)}` : `Desde ${_fmt(_iso(a),true)}`) : (b>hoyN ? "Lista actual" : "Antes");
    return `<div class="vig-tramo ${futuro?"p":"v"} ${!futuro&&b<=hoyN?"ant":""}" style="width:${w}%" title="${esc(txt)}">${esc(txt)}</div>`;
  }).join("");
  let meses = ""; for(let t=new Date(min*86400000), i=0; t.getTime()/86400000<=max; i++){
    const n = t.getTime()/86400000;
    if(i%2===0) meses += `<span style="left:${pct(n)}%">${esc(t.toLocaleDateString("es",{month:"short",year:"2-digit",timeZone:"UTC"}))}</span>`;
    t = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth()+1, 1));
  }
  const rigeProg = progN!=null && vista>=progN;
  const nota = vista===hoyN ? "Esto es lo que usan hoy las WO, los estimados y las facturas."
    : vista<hoyN ? "Fecha pasada: así se cobraba ese día."
    : rigeProg ? "Así se cobrará desde esa fecha." : "Todavía no cambia nada: se sigue cobrando con la lista actual.";
  const dias = prog ? diasEntre(hoy, prog.desde) : 0;
  el.innerHTML = `<div class="vig-tl-q"><span class="vig-fecha">${esc(_fmt(_iso(vista)))}</span>
      <span class="vig-rige ${rigeProg?"p":"v"}">${rigeProg?"Rige la lista nueva":"Rige la lista actual"}</span>
      <span class="vig-nota">${esc(nota)}</span>
      ${prog?`<span class="vig-cuenta">${dias>0?`La lista nueva entra en ${vigDias(dias)}`:"La lista nueva ya está en vigor"}</span>`:""}</div>
    <div class="vig-pista"><div class="vig-carril">${tramos}</div>
      <div class="vig-hoy" style="left:${pct(hoyN)}%"></div><div class="vig-visor" style="left:${pct(vista)}%"></div>
      <div class="vig-meses">${meses}</div>
      <input type="range" id="vigRango" min="${min}" max="${max}" step="1" value="${vista}" aria-label="Elegir la fecha que quieres revisar" aria-valuetext="${esc(_fmt(_iso(vista)))}"></div>
    <div class="vig-atajos"><small>Ir a:</small>
      <button class="vig-mini" data-a="vigIr" data-k="hoy">Hoy</button>
      <button class="vig-mini" data-a="vigIr" data-k="antes" ${prog?"":"disabled"} title="${prog?"":"Disponible cuando hay una lista nueva programada"}">El día antes del cambio</button>
      <button class="vig-mini" data-a="vigIr" data-k="entra" ${prog?"":"disabled"} title="${prog?"":"Disponible cuando hay una lista nueva programada"}">Cuando entra la lista nueva</button>
      <button class="vig-mini" data-a="vigIr" data-k="6m">En 6 meses</button></div>`;
}

/* Tabla: precio de la fecha que se mira, lista nueva editable y cambio */
function vigPintaTabla(prop){
  const el = document.getElementById("vigTabla"); if(!el) return;
  const filas = vigFilas(prop), b = vigBor(prop), prog = vigProg(prop), vista = vigVista(prop), hoy = hoyReal();
  const verPago = puedeVerUtilidad(), pu = puede("tarifario"), sel = (S.vigSel||{})[vigK(prop)];
  const desde = prog ? prog.desde : b.desde;
  const colDia = vista===hoy ? "Precio de hoy" : "Precio el "+_fmt(vista,true);
  let tipo = null, h = "";
  const nCol = 5 + (verPago?1:0);
  filas.forEach(f=>{
    const r = f.rep;
    if(r.cat!==tipo){ tipo = r.cat; h += `<tr class="tipo"><td colspan="${nCol}">${esc(tipo||"—")}</td></tr>`; }
    const dia = f.g.find(t=>tarVigente(t,vista));
    const nuevo = prog ? ((prog.rows.find(t=>tarLlave(t)===f.k)||{}).precio) : b.nuevos[f.k];
    const dl = vigDelta(nuevo, r.precio), cambia = nuevo!=null && nuevo!==r.precio;
    h += `<tr class="${cambia?"vig-cambio":""} ${sel===f.k?"sel":""}" data-k="${esc(f.k)}">
      <td>${esc(r.serv||r.cat)}</td><td>${esc(r.variante)||"—"}${r.pisos!=null?" · Floor "+esc(r.pisos):""}</td>
      <td class="num mono vig-dia"><b>${dia?money(dia.precio):"—"}</b></td>
      ${verPago?`<td class="num mono vig-pago">${dia?money(dia.pago||0):"—"}</td>`:""}
      <td class="num"><input class="vig-nuevo mono" type="number" min="0" step="0.5" data-k="${esc(f.k)}" placeholder="${esc(r.precio)}" value="${nuevo!=null?esc(nuevo):""}"
        ${prog||!pu?"disabled":""} aria-label="Lista nueva: ${esc((r.serv||"")+" "+(r.variante||""))}"></td>
      <td class="num"><span class="${vigDeltaCls(dl)}">${vigDeltaTxt(dl)}</span></td>
      <td class="num"><button class="vig-hist" data-a="vigHist" data-k="${esc(f.k)}">Historial</button></td></tr>`;
  });
  el.innerHTML = filas.length ? `<table><thead><tr><th>Servicio</th><th>Detail</th>
      <th class="num vig-th-dia">${esc(colDia)}</th>${verPago?`<th class="num" title="Lo que se paga al técnico ese día">Pago</th>`:""}
      <th class="num vig-th-nueva">Lista nueva · ${desde?"desde "+esc(_fmt(desde,true)):"sin fecha todavía"}${prog?` <span class="pill a">programada</span>`:""}</th>
      <th class="num">Cambio</th><th></th></tr></thead><tbody>${h}</tbody></table>`
    : `<div class="empty">No hay precios con fecha en esta lista todavía.</div>`;
}

/* Historial de un precio: cuándo rigió cada valor, quién y por qué */
function vigPintaPanel(prop){
  const el = document.getElementById("vigPanel"); if(!el) return;
  const k = (S.vigSel||{})[vigK(prop)], g = k ? (tarIndice().m.get(k)||[]) : [];
  const regla = `<div class="vig-regla"><b>Cómo funciona.</b> Hasta la fecha «rige desde», las WO, los estimados y las facturas siguen con la lista actual. Una WO ya creada conserva su precio.</div>`;
  if(!g.length){
    el.innerHTML = `<h4>Historial de precios</h4><div class="vig-sub">Pulsa «Historial» en un servicio de la tabla para ver cuánto costó y desde cuándo.</div>${regla}`;
    return;
  }
  const hoy = hoyReal(), verPago = puedeVerUtilidad(), r = g[g.length-1];
  const ds = [...new Set(g.map(t=>t.desde||""))];
  const items = g.map(t=>{
    const sig = ds[ds.indexOf(t.desde||"")+1];
    const hasta = sig ? _fmt(fechaMover(sig,-1)) : null;
    const cual = tarVigente(t,hoy) ? "v" : (t.desde && t.desde>hoy ? "p" : "g");
    return `<li class="${cual==="v"?"act":cual==="p"?"prog":""}"><div class="pr mono">${money(t.precio)}${verPago?` <small>pago ${money(t.pago||0)}</small>`:""}
      <span class="pill ${cual==="v"?"v":cual==="p"?"a":"g"}">${cual==="v"?"rige hoy":cual==="p"?"programada":"anterior"}</span></div>
      <div class="rg">${t.desde?"Desde "+esc(_fmt(t.desde)):"Desde el inicio"} ${hasta?"→ "+esc(hasta):"→ en adelante"}</div>
      ${t.por||t.motivo?`<div class="qn">${esc([t.motivo,t.por].filter(Boolean).join(" · "))}</div>`:""}</li>`;
  }).reverse().join("");
  el.innerHTML = `<h4>${esc(r.serv||r.cat)} · ${esc(r.variante||"—")}</h4><div class="vig-sub">Cada cambio queda guardado; nada se pisa.</div>
    <ul class="vig-vers">${items}</ul>${regla}`;
}

/* ── Escucha de campos que cambian mientras se escribe o se arrastra (sin repintar toda la pantalla) ── */
document.addEventListener("input", e=>{
  const el = e.target, root = document.getElementById("vigRoot"); if(!root) return;
  const prop = root.dataset.prop;
  if(el.id==="vigRango"){
    (S.vigVistaF = S.vigVistaF||{})[vigK(prop)] = _iso(+el.value);
    vigPintaTL(prop); vigPintaTabla(prop); /* el input del rango se recrea: se le devuelve el foco */
    const n = document.getElementById("vigRango"); if(n) n.focus();
  } else if(el.classList.contains("vig-nuevo")){
    const b = vigBor(prop), v = parseFloat(el.value);
    if(isNaN(v)||v<0) delete b.nuevos[el.dataset.k]; else b.nuevos[el.dataset.k] = Math.round(v*100)/100;
    b.guardado = false;
    const f = vigFilas(prop).find(x=>x.k===el.dataset.k), tr = el.closest("tr");
    if(f && tr){
      const nu = b.nuevos[f.k], dl = vigDelta(nu, f.rep.precio), c = tr.querySelector(".delta");
      c.className = vigDeltaCls(dl); c.textContent = vigDeltaTxt(dl);
      tr.classList.toggle("vig-cambio", nu!=null && nu!==f.rep.precio);
    }
    vigPintaEstado(prop);
  } else if(el.id==="vigPct") S.vigPct = el.value;
});

const _vigProp = () => (document.getElementById("vigRoot")||{dataset:{}}).dataset.prop || "";
Object.assign(ACC, {
  /* Entrar y salir de la preparación */
  vigAbrir: d => { S.vigModo = d.id ? d.id : "_g"; render(); },
  vigSalir: d => {
    const prop = d.id||"", b = vigBor(prop);
    if(!vigProg(prop) && Object.keys(b.nuevos).length && !b.guardado){
      S.audOmitir = true;
      modal(`<div class="mh"><h3>¿Salir sin guardar el borrador?</h3><p>Escribiste precios nuevos que todavía no están guardados ni programados.</p></div>
        <div class="mb"><div class="note">Lo que rige hoy no cambia en ningún caso.</div></div>
        <div class="mf"><button class="btn" data-a="cm">Seguir editando</button>
          <button class="btn" data-a="vigSalirDescartar" data-id="${esc(prop)}">Descartar y salir</button>
          <button class="btn p" data-a="vigSalirGuardar" data-id="${esc(prop)}">Guardar borrador y salir</button></div>`);
      return;
    }
    S.audOmitir = true; S.vigModo = null; render();
  },
  vigSalirGuardar: d => { S.audOmitir = true; vigBor(d.id||"").guardado = true; cm(); S.vigModo = null; toast("Borrador guardado","Los precios de hoy no cambian.","v"); render(); },
  vigSalirDescartar: d => { S.audOmitir = true; delete S.vigBorrador[vigK(d.id||"")]; cm(); S.vigModo = null; render(); },
  vigEntendido: () => { S.audOmitir = true; try{ localStorage.setItem("cps_vig_entendido","1"); }catch(x){}
    const a = document.getElementById("vigAyuda"); if(a) a.innerHTML = ""; },
  /* Paso 1: fecha */
  vigDesde: () => {
    S.audOmitir = true; const prop = _vigProp(), v = (document.getElementById("vigDesde")||{}).value || "";
    const b = vigBor(prop); b.desde = v; b.guardado = false;
    if(v && v<=hoyReal()) toast("Fecha no válida","La lista nueva debe regir desde mañana o después.","r");
    else if(v && v>vigMaxFecha()) toast("Fecha muy lejana","Solo se puede programar hasta 12 meses adelante.","r");
    vigRepinta();
  },
  vigChipDesde: d => {
    S.audOmitir = true; const prop = _vigProp(), hoy = hoyReal(), b = vigBor(prop);
    let v = d.k==="enero" ? (+hoy.slice(0,4)+1)+"-01-01" : _masMeses(hoy, +d.k);
    if(d.k==="enero" && (+hoy.slice(5,7)===1 && +hoy.slice(8,10)===1)) v = hoy.slice(0,4)+"-01-01";
    if(v>vigMaxFecha()) v = vigMaxFecha();
    b.desde = v; b.guardado = false;
    const i = document.getElementById("vigDesde"); if(i) i.value = v;
    (S.vigVistaF = S.vigVistaF||{})[vigK(prop)] = v;
    vigRepinta();
  },
  /* Paso 2: subir todo N % */
  vigAplicarPct: () => {
    S.audOmitir = true; const prop = _vigProp(), p = parseFloat((document.getElementById("vigPct")||{}).value);
    if(isNaN(p)){ toast("Falta el porcentaje","Escribe cuánto subir (o bajar, con signo menos).","r"); return; }
    S.vigPct = p; const b = vigBor(prop);
    vigFilas(prop).forEach(f=>{ b.nuevos[f.k] = Math.max(0, Math.round(f.rep.precio*(1+p/100)*2)/2); });
    b.guardado = false;
    toast("Lista nueva armada",`${p>0?"+":""}${p}% sobre los precios de hoy. Ajusta lo que quieras en la columna «Lista nueva».`,"v");
    vigRepinta();
  },
  vigBorrador: () => {
    S.audOmitir = true; vigBor(_vigProp()).guardado = true;
    toast("Borrador guardado","Los precios de hoy no cambian.","v");
  },
  /* Línea de tiempo e historial */
  vigIr: d => {
    S.audOmitir = true; const prop = _vigProp(), prog = vigProg(prop), hoy = hoyReal(), {min,max} = vigRango(prop);
    let v = d.k==="hoy" ? hoy : d.k==="antes" ? (prog?fechaMover(prog.desde,-1):hoy) : d.k==="entra" ? (prog?prog.desde:hoy) : _masMeses(hoy,6);
    v = _iso(Math.min(max,Math.max(min,_dn(v))));
    (S.vigVistaF = S.vigVistaF||{})[vigK(prop)] = v; vigRepinta();
  },
  vigHist: d => { S.audOmitir = true; (S.vigSel = S.vigSel||{})[vigK(_vigProp())] = d.k; vigPintaTabla(_vigProp()); vigPintaPanel(_vigProp()); },

  /* Paso 3: programar */
  vigProgramar: () => {
    S.audOmitir = true; const prop = _vigProp();
    if(!puede("tarifario")){ toast("Sin permiso","Cambiar precios le toca a quien lleva el Tarifario.","r"); return; }
    const b = vigBor(prop), cs = vigCambios(prop);
    if(!cs.length){ toast("Falta un precio nuevo","Escribe al menos un precio nuevo, o usa «Subir todo».","r"); return; }
    if(!b.desde || b.desde<=hoyReal() || b.desde>vigMaxFecha()){ toast("Falta la fecha","Elige desde cuándo rige: mañana o después, hasta 12 meses adelante.","r"); return; }
    const prom = cs.reduce((a,f)=>a+vigDelta(b.nuevos[f.k],f.rep.precio),0)/cs.length;
    modal(`<div class="mh"><h3>Programar cambio de precios</h3><p>${esc(vigNombre(prop))}</p></div>
      <div class="mb"><div class="vig-resumen"><b>${cs.length} servicio${cs.length===1?"":"s"}</b> con precio nuevo · <b>${prom>0?"+":""}${prom.toFixed(1)}% en promedio</b> · rige desde <b>${esc(_fmt(b.desde))}</b></div>
        <div class="note" style="margin:12px 0">Hasta ese día las WO, los estimados y las facturas siguen con la lista actual. Una WO ya creada conserva su precio.</div>
        <div class="fld"><label>Motivo <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— opcional</span></label><input id="vigMotivo" placeholder="ej. Ajuste anual 2027"></div></div>
      <div class="mf"><button class="btn" data-a="cm">Volver</button><button class="btn p" data-a="vigProgramarOK" data-id="${esc(prop)}">Programar cambio</button></div>`);
  },
  vigProgramarOK: d => {
    const prop = d.id||"", b = vigBor(prop), cs = vigCambios(prop);
    if(!puede("tarifario") || !cs.length || !b.desde || b.desde<=hoyReal() || b.desde>vigMaxFecha() || vigProg(prop)){ S.audOmitir = true; cm(); return; }
    const motivo = val("vigMotivo"), lote = "L"+Date.now(), creada = new Date().toISOString(); let seq = 0;
    cs.forEach(f=>{
      let id; do{ id = "TR"+Date.now()+Math.random().toString(36).slice(2,5)+(seq++); }while(S.tarifas.some(x=>x.id===id));
      const nr = {...f.rep, id, precio:b.nuevos[f.k], desde:b.desde, por:S.usuario, motivo, creada, lote};
      delete nr.sinPrecio; delete nr.precioFijado; S.tarifas.push(nr);
    });
    tarInval();
    S._audTar = `${vigNombre(prop)} · ${cs.length} precio(s) desde ${b.desde}`;
    (S.vigVistaF = S.vigVistaF||{})[vigK(prop)] = fechaMover(b.desde,-1);
    b.nuevos = {}; b.guardado = true;
    cm();
    toast("Cambio de precios programado",`La lista nueva rige desde ${esc(_fmt(b.desde))}. Hasta entonces se cobra con la lista actual.`,"v");
    render();
  },
  vigCancelar: () => {
    S.audOmitir = true; const prop = _vigProp(), pr = vigProg(prop); if(!pr) return;
    modal(`<div class="mh"><h3>Cancelar programación</h3><p>${esc(vigNombre(prop))} · rige desde ${esc(_fmt(pr.desde))}</p></div>
      <div class="mb"><div class="note">Los ${pr.rows.length} precios nuevos vuelven a ser un borrador. La lista actual no cambia.</div></div>
      <div class="mf"><button class="btn" data-a="cm">No, dejarla programada</button><button class="btn p" data-a="vigCancelarOK" data-id="${esc(prop)}">Cancelar programación</button></div>`);
  },
  vigCancelarOK: d => {
    const prop = d.id||"", pr = vigProg(prop);
    if(!pr || !puede("tarifario")){ S.audOmitir = true; cm(); return; }
    const b = vigBor(prop); b.desde = pr.desde; b.nuevos = {}; b.guardado = false;
    pr.rows.forEach(t=>{ b.nuevos[tarLlave(t)] = t.precio; });
    pr.rows.forEach(t=>{ const i = S.tarifas.indexOf(t); if(i>-1) S.tarifas.splice(i,1); });   // solo las de esta programación, y mientras siguen en el futuro
    tarInval();
    S._audTar = `${vigNombre(prop)} · ${pr.rows.length} precio(s) que regían desde ${pr.desde}`;
    (S.vigVistaF = S.vigVistaF||{})[vigK(prop)] = hoyReal();
    cm();
    toast("Programación cancelada","Los precios nuevos vuelven a ser un borrador. La lista actual no cambió.","w");
    render();
  },

  /* PDF para el cliente */
  vigPdf: () => { S.audOmitir = true; vigPdfModal(_vigProp()); },
  vigPdfModo: d => { S.audOmitir = true; if(d.m==="p" && !vigPdfDesde(S._vigPdf.prop)) return; S._vigPdf.modo = d.m; vigPdfPinta(); },
  vigPdfSel: d => { S.audOmitir = true; const o = S._vigPdf.off, i = o.indexOf(d.k); if(i>-1) o.splice(i,1); else o.push(d.k); vigPdfPinta(); },
  vigPdfTodos: () => { S.audOmitir = true; const x = S._vigPdf; x.off = x.off.length ? [] : vigPdfCand(x.prop).map(c=>c.k); vigPdfPinta(); },
  vigPdfOK: d => {
    const x = S._vigPdf, filas = vigPdfFilas();
    if(!filas.length){ S.audOmitir = true; toast("Sin precios marcados","Marca al menos un servicio para generar el PDF.","r"); return; }
    const rige = x.modo==="p" ? vigPdfDesde(x.prop) : hoyReal();
    S._audTar = `${vigNombre(x.prop)} · ${filas.length} precio(s) · rige desde ${rige}`;
    pdfListaPrecios(x.prop, filas, rige, d && d.correo ? ()=>correoPriceList(x.prop, rige) : null);
  }
});

/* Una versión nueva desde el formulario «Editar precio» (cambió Price o Pago y no es una corrección) */
function vigNuevaVersion(yo, datos, desde, motivo){
  const hoy = hoyReal();
  if(desde<hoy){ toast("Fecha no válida","No puede regir desde el pasado. Para arreglar un error de captura marca «Es una corrección».","r"); return; }
  if(desde>vigMaxFecha()){ toast("Fecha muy lejana","Solo se puede programar hasta 12 meses adelante.","r"); return; }
  const g = tarIndice().m.get(tarLlave(yo)) || [], ult = g.reduce((a,t)=>t.desde&&t.desde>a?t.desde:a, "");
  if(ult && desde<ult){ toast("Ya hay un cambio después","Esta línea ya tiene un precio programado desde el "+_fmt(ult)+". Elige una fecha igual o posterior, o cancela esa programación.","r"); return; }
  let n = Date.now(); while(S.tarifas.some(x=>x.id==="TR"+n)) n++;
  const nr = {...yo, ...datos, id:"TR"+n, desde, por:S.usuario, motivo:motivo||"", creada:new Date().toISOString(), lote:"LE"+n};
  delete nr.sinPrecio; delete nr.precioFijado;
  const cambios = diffCampos(yo, datos); cambios.push({campo:"Rige desde", de:"—", a:desde});
  S.tarifas.push(nr); tarInval();
  S.bitacora.unshift({n:++S.audSeq, fecha:HOY_SUP, hora:hora(), usuario:S.usuario, rol:ROLES[S.usuario].r,
    accion:"Creó un precio nuevo con fecha", modulo:"Tarifario", ref:`${nr.nombre||yo.nombre||yo.serv||"Precio"}${yo.prop?" · "+P(yo.prop).nombre:" · general"}`, cambios});
  if(desde<=hoy) flash("tar:"+nr.id);
  cm();
  toast(desde>hoy?"Cambio de precio programado":"Precio nuevo aplicado",
    desde>hoy ? `${esc(nr.nombre)}: ${money(nr.precio)} desde ${esc(_fmt(desde))}. Hasta entonces rige ${money(yo.precio)}.` : `${esc(nr.nombre)}: ${money(nr.precio)} desde hoy. El anterior queda en el historial.`,"v");
  render();
}

/* ── Modal del PDF: qué lista mandar y qué servicios incluir ── */
const _vigKey = t => [t.cat,t.serv,t.variante,t.pisos,t.banos].join("|");
function vigPdfCand(prop){
  const hoy = hoyReal(), pd = vigPdfDesde(prop), m = new Map();
  listaPrecios(prop,"",hoy).forEach(t=>m.set(_vigKey(t),{k:_vigKey(t),v:t}));
  if(pd) listaPrecios(prop,"",pd).forEach(t=>{ const e = m.get(_vigKey(t)) || {k:_vigKey(t)}; e.p = t; m.set(_vigKey(t),e); });
  return [...m.values()].sort((a,b)=>{ const x=a.v||a.p, y=b.v||b.p;
    return String(x.cat).localeCompare(String(y.cat))||String(x.serv).localeCompare(String(y.serv))||((x.pisos==null?-1:x.pisos)-(y.pisos==null?-1:y.pisos)); });
}
function vigPdfFilas(){
  const x = S._vigPdf; return vigPdfCand(x.prop).filter(c=>!x.off.includes(c.k)).map(c=>x.modo==="p"?c.p:c.v).filter(Boolean);
}
function vigPdfModal(prop, ts){
  const cand = vigPdfCand(prop), sel = ts ? new Set(ts.map(_vigKey)) : null;
  S._vigPdf = {prop, modo:"v", off: sel ? cand.filter(c=>c.v && !sel.has(c.k)).map(c=>c.k) : []};
  const pd = vigPdfDesde(prop);
  modal(`<div class="mh"><h3>PDF para el cliente</h3><p>${esc(vigNombre(prop))} · elige qué lista mandar y qué servicios incluir. No lleva el pago al técnico ni impuestos.</p></div>
    <div class="mb vig-pdf">
      <div class="vig-pdf-ctl">
        <div class="vig-seg" id="vigSeg" role="group" aria-label="Qué lista mandar">
          <button data-a="vigPdfModo" data-m="v">Lista vigente hoy</button>
          <button data-a="vigPdfModo" data-m="p" ${pd?"":"disabled"} title="${pd?"":"Todavía no hay una lista nueva programada"}">Lista programada${pd?" (desde "+esc(_fmt(pd,true))+")":""}</button></div>
        <div class="vig-lista-sel" id="vigSelPdf"></div>
        <button class="btn sm" data-a="vigPdfTodos" style="margin-top:8px">Marcar o desmarcar todos</button></div>
      <div class="vig-hoja"><div class="vig-papel" id="vigPapel"></div></div></div>
    <div class="mf"><button class="btn" data-a="cm">Cerrar</button><button class="btn" data-a="vigPdfOK">Descargar PDF</button><button class="btn p" data-a="vigPdfOK" data-correo="1" title="Genera el PDF y deja el correo listo con los contactos de la propiedad">Enviar por correo</button></div>`, true);
  vigPdfPinta();
}
function vigPdfPinta(){
  const x = S._vigPdf, cand = vigPdfCand(x.prop), filas = vigPdfFilas(), pd = vigPdfDesde(x.prop);
  const sel = document.getElementById("vigSelPdf"); if(!sel) return;
  sel.innerHTML = cand.map(c=>{ const t = c.v||c.p; return `<label><input type="checkbox" data-a="vigPdfSel" data-k="${esc(c.k)}" ${x.off.includes(c.k)?"":"checked"}>
    ${esc(t.cat)} · ${esc(t.serv)}${t.variante?" · "+esc(t.variante):""}${t.pisos!=null?" · Floor "+esc(t.pisos):""}</label>`; }).join("");
  document.querySelectorAll("#vigSeg button").forEach(b=>{ b.classList.toggle("on", b.dataset.m===x.modo); b.setAttribute("aria-pressed", String(b.dataset.m===x.modo)); });
  const rige = x.modo==="p" ? pd : hoyReal(), porTipo = {};
  filas.forEach(t=>{ (porTipo[t.cat||"—"] = porTipo[t.cat||"—"]||[]).push(t); });
  document.getElementById("vigPapel").innerHTML = `<h5>Cordova Property Services LLC</h5><div class="vig-meta">Price List · ${esc(vigNombre(x.prop))} · rige desde ${esc(rige)}</div>
    ${Object.entries(porTipo).map(([cat,fs])=>`<table><thead><tr><th colspan="3">${esc(cat)}</th></tr></thead><tbody>${fs.map(t=>
      `<tr><td>${esc(t.serv||cat)}</td><td>${esc(t.variante)||"—"}${t.pisos!=null?" · Floor "+esc(t.pisos):""}</td><td class="n">${money(t.precio)}</td></tr>`).join("")}</tbody></table>`).join("")
      || `<div class="vig-meta">Marca al menos un servicio.</div>`}`;
}
