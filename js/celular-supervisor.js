"use strict";
VIEWS.gustavoweb = () => {
  const t = ["panel","ruta","reportar","dia","devs"].includes(S.gvTab) ? S.gvTab : "panel";
  const TABS = [["panel","Hoy"],["ruta","Mi ruta"],["reportar","Reportar"],["dia","Mi día"],["devs","Devoluciones"]];
  return `
  <div class="ph"><div><h2>Vista de Gustavo</h2>
    <p>Lo mismo que ve en su celular (Supervisor de campo) — como página web, de referencia para cuando se construya la app real.</p></div></div>
  <div class="tabs">${TABS.map(([k,n])=>`<button class="tab ${t===k?"on":""}" data-a="gvTab" data-v="${k}">${n}</button>`).join("")}</div>
  <div class="card" style="max-width:560px">
    <div class="cp">${gustavoScreenHTML(t)}</div>
  </div>
  <div class="tr">Esta vista es de contenido, no de interacción completa: los formularios que se abren como hoja (Reportar, Mi día) se prueban de verdad en <code>Supervisión → Ver su celular</code>. Acá se ve qué información trae cada pantalla.</div>`;
};

function renderFonSup(){
  renderCelSel();
  const g = T(GUSTAVO) || S.tecnicos[0];
  $("#favi").textContent = g.nombre[0]+g.apellido[0];
  $("#fanm").textContent = "Celular de "+tecN(g.id);
  $("#fasu").textContent = "Supervisor de campo";
  const hoy = repsDe(GUSTAVO).filter(r=>r.fecha==="2026-08-11");
  const rd = diarioHoy();
  const nEnt = rd ? rd.entradas.length : 0;
  const nDev = devAbiertas().length;
  /* Devoluciones es pestana propia: Claudia la puso entre sus tres
     prioridades y estaba escondida detras de un contador. */
  $("#fnav").innerHTML = [
    {v:"panel", n:"Hoy",     b:0,
     ic:'<path d="M3 13h8V3H3zM13 21h8V11h-8zM13 7h8V3h-8zM3 21h8v-4H3z"/>'},
    {v:"ruta",  n:"Mi ruta", b:agendaHoy().filter(a=>a.estado!=="Visitada").length, bc:"var(--azul)",
     ic:'<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>'},
    {v:"dia",   n:"Mi d\u00eda",  b:nEnt, bc:"var(--verde)",
     ic:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'},
    {v:"reportar",n:"Reportar", b:0,
     ic:'<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>'},
    {v:"devs",  n:"Devoluciones", b:nDev, bc:"var(--rojo)",
     ic:'<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>'}
  ].map(b=>`<button class="${S.phView===b.v||(b.v==="devs"&&S.phView==="dev")?"on":""}" data-a="fView" data-v="${b.v}">
    ${b.b?`<span style="position:absolute;top:1px;right:5px;min-width:14px;height:14px;padding:0 3px;background:${b.bc};color:#fff;border-radius:99px;font-size:8.5px;font-weight:800;display:flex;align-items:center;justify-content:center">${b.b}</span>`:""}
    <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${b.ic}</svg>${b.n}</button>`).join("");

  if(!["panel","ruta","dia","reportar","devs","dev","proceso"].includes(S.phView)) S.phView = "panel";
  if(S.phView==="dev" && !DV(S.phDev)) S.phView = "devs";
  const h = gustavoScreenHTML(S.phView);

  $("#fbody").innerHTML = h;
  /* Cada toque en un chip (Ambiente, Etapa...) vuelve a armar toda la hoja
     desde cero — el nodo .fsheet es uno nuevo, así que su scroll arranca en
     0 aunque el usuario estuviera abajo. Sin esto, cada clic lo mandaba de
     vuelta arriba de un formulario largo. */
  const fsheetAntes = $("#fsheet").querySelector(".fsheet");
  const scrollAntes = fsheetAntes ? fsheetAntes.scrollTop : 0;
  $("#fsheet").innerHTML = S.gRep ? hojaSup(S.gRep)
    : S.gDia ? hojaDia(S.gDia)
    : S.gDev ? hojaDev(S.gDev)
    : (S.phSheet ? hojaCel(S.phSheet) : "");
  const fsheetDespues = $("#fsheet").querySelector(".fsheet");
  if(fsheetDespues && scrollAntes) fsheetDespues.scrollTop = scrollAntes;
}

/* ── La hoja de captura: elegir dónde, disparar fotos, mandar ──────────
   El orden importa: primero la unidad, después la cámara. Al revés,
   Gustavo termina con 60 fotos sin saber a qué unidad pertenecen.      */
function hojaSup(g){
  const r = REP[g.tipo];
  const us = S.unidades.filter(u=>u.prop===g.prop);
  const total = g.lotes.reduce((t,l)=>t+l.n,0);
  return `<div class="fscrim" data-a="gRepNo"><div class="fsheet" data-stop>
    <div class="grab"></div>
    <h4 style="color:${r.c}">${r.n}</h4>
    <div class="sub">${r.d}</div>

    <label>Propiedad</label>
    ${g.desdeRuta
      ? `<div class="dc" style="margin:0;background:var(--surface-2)"><div class="dh" style="font-size:13px">${esc(P(g.prop).nombre)}</div>
          <div class="sub">Viniste de esta parada — para reportar otra, usa "O reportar de otra propiedad".</div></div>`
      : `<select id="gP" data-a="gRepProp">${S.propiedades.filter(x=>x.activa).map(x=>
          `<option value="${x.id}" ${x.id===g.prop?"selected":""}>${esc(x.nombre)}</option>`).join("")}</select>`}
    ${(()=>{ const pa=paradaDe(g.prop);
      return pa && pa.estado==="Visitada"
        ? `<div class="sub" style="color:var(--verde);margin:4px 0 0">✓ Llegaste a las ${esc(pa.hora)} · ${esc(pa.motivo)}</div>`
        : `<div class="sub" style="color:var(--ambar);margin:4px 0 0">No marcaste llegada aquí. Puedes reportar igual, pero queda sin hora de llegada.</div>`; })()}

    <label>Unidad</label>
    <select id="gU" data-a="gRepUnidad">${us.length?us.map(u=>
      `<option value="${u.id}" ${u.id===g.unidad?"selected":""}>${esc(u.num)} — ${esc(u.rooms)}</option>`).join("")
      :`<option value="">— sin unidades —</option>`}</select>

    ${g.tipo==="previo"?`<label>Antes de qué trabajo</label>
      <select id="gA">${activos("categorias").map(c=>`<option ${c===g.antesDe?"selected":""}>${esc(c)}</option>`).join("")}</select>`:""}

    ${g.tipo==="revision"?`<label>Tipo de visita</label>
      <select id="gTV">${TIPO_VISITA.map(t=>`<option ${t===g.tipoVisita?"selected":""}>${esc(t)}</option>`).join("")}</select>
      <label>Estado del trabajo</label>
      <select id="gET" data-a="gRepEst">${EST_TRABAJO.map(t=>`<option ${t===g.estadoTrabajo?"selected":""}>${esc(t)}</option>`).join("")}</select>
      ${g.estadoTrabajo==="Requiere correcci\u00f3n"
        ? `<div class="dc" style="margin:6px 0 0;background:var(--rojo-cl);border-color:transparent">
            <div class="ds" style="color:var(--rojo)">Al enviar el informe se te va a abrir la <b>devoluci\u00f3n</b>,
            para que quede abierta y con fecha l\u00edmite hasta que la verifiques.</div></div>`
        : g.estadoTrabajo==="No se pudo ingresar"
        ? `<div class="dc" style="margin:6px 0 0;background:var(--ambar-cl);border-color:transparent">
            <div class="ds" style="color:var(--ambar)">Queda registrado que fuiste y no se pudo entrar.
            Claudia lo ve y decide si se reagenda.</div></div>` : ""}`:""}

    ${g.tipo==="relevamiento"?`
      <label>Condici\u00f3n de la unidad</label>
      <div class="gchips">${COND_UNIDAD.map(c=>
        `<button class="gchip ${g.condUnidad===c?"on":""}" data-a="gRepCondU" data-c="${esc(c)}">${esc(c)}</button>`).join("")}</div>
      ${g.condUnidad==="No se pudo ingresar"
        ? `<div class="dc" style="margin:6px 0 0;background:var(--ambar-cl);border-color:transparent">
            <div class="ds" style="color:var(--ambar)">Queda registrado que fuiste y no se pudo entrar.
            Claudia decide si se reagenda.</div></div>`
        : `<div class="sub" style="margin:5px 0 0">Tipo de unidad: <b>${esc(U(g.unidad)?U(g.unidad).rooms:"—")}</b>
            — sale del expediente, no hace falta escribirlo.</div>`}

      ${g.condUnidad!=="No se pudo ingresar"?`
      <label style="margin-top:11px">Qu\u00e9 hay que hacer</label>
      <div class="sub" style="margin:-3px 0 7px">Un bloque por servicio. Claudia lo convierte en l\u00edneas del estimado sin volver a escribirlo.</div>
      ${g.items.map((it,i)=>`<div class="adfila" style="display:block;padding:10px 11px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:7px;margin-bottom:6px">
          <b style="font-size:11px;color:var(--azul)">Servicio ${i+1}</b>
          <button class="adx" data-a="gRepItemMenos" data-i="${i}" ${g.items.length===1?"disabled":""}>−</button></div>
        <select id="itC${i}">${activos("categorias").map(c=>
          `<option ${c===it.cat?"selected":""}>${esc(c)}</option>`).join("")}</select>
        <input id="itT${i}" value="${esc(it.trabajo)}" placeholder="Qu\u00e9 trabajo hace falta" style="margin-top:5px">
        <div class="adnum" style="margin-top:5px">
          <label>D\u00f3nde<select id="itU${i}">${activos("ubicaciones").map(u=>
            `<option ${u===it.ubic?"selected":""}>${esc(u)}</option>`).join("")}</select></label>
          <label>Cant.<input id="itQ${i}" value="${esc(String(it.cant))}" inputmode="numeric"></label>
        </div>
        <input id="itM${i}" value="${esc(it.medidas)}" placeholder="Medidas — pared 3.2 × 2.4 m" style="margin-top:5px">
        <button class="gchip ${it.mat?"on":""}" style="width:100%;margin-top:6px" data-a="gRepItemMat" data-i="${i}">
          ${it.mat?"✓ Se necesitan materiales":"¿Se necesitan materiales?"}</button>
        ${it.mat?`<input id="itMt${i}" value="${esc(it.materiales)}" placeholder="Qu\u00e9 materiales" style="margin-top:5px">`:""}
        <input id="itX${i}" value="${esc(it.coment)}" placeholder="Comentarios" style="margin-top:5px">
        <button class="gchip" style="width:100%;margin-top:6px" data-a="gRepItemFoto" data-i="${i}">
          \ud83d\udcf7 ${it.fotos?it.fotos+" foto(s) de este servicio":"Tomar foto de este servicio"}</button>
      </div>`).join("")}
      <button class="db g admas" data-a="gRepItemMas">+ Agregar otro servicio</button>

      <label style="margin-top:11px">Condici\u00f3n general de la unidad</label>
      <div class="gchips">${COND_GENERAL.map(c=>
        `<button class="gchip ${g.condGeneral===c?"on":""}" data-a="gRepCondG" data-c="${esc(c)}">${esc(c)}</button>`).join("")}</div>

      <label>Recomendaciones adicionales</label>
      <textarea id="gRec" placeholder="Lo que conviene hacer aunque no lo hayan pedido">${esc(g.recom||"")}</textarea>`:""}`:""}

    <label style="margin-top:11px">${g.tipo==="relevamiento"?"Fotos generales de la unidad":"Fotos"}${total?` · ${total} tomada(s)`:""}</label>
    <div class="sub" style="margin:-3px 0 7px">Elige el ambiente y dispara. Se agrupan solas para que Claudia las pueda revisar.</div>
    <div class="gchips">${activos("ubicaciones").map(u=>
      `<button class="gchip ${g.amb===u?"on":""}" data-a="gRepAmb" data-u="${esc(u)}">${esc(u)}</button>`).join("")}</div>

    ${g.tipo==="previo"?`<div class="gchips" style="margin-top:5px">${activos("condiciones").map(c=>
      `<button class="gchip cond ${g.cond===c?"on":""}" data-a="gRepCond" data-c="${esc(c)}">${esc(c)}</button>`).join("")}</div>`:""}

    ${g.tipo==="revision"?`<div class="gchips" style="margin-top:5px">${ETAPAS.map(e=>
      `<button class="gchip cond ${g.etapa===e?"on":""}" data-a="gRepEtapa" data-e="${esc(e)}">${esc(e)}</button>`).join("")}</div>`:""}

    <button class="db p gcam" data-a="gRepFoto">
      <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
      Tomar foto${g.amb?" · "+esc(g.amb):""}${g.tipo==="previo"&&g.cond?" · "+esc(g.cond):""}
    </button>

    ${g.lotes.length?`<div class="glotes">${g.lotes.map((l,i)=>`
      <div style="border-bottom:1px solid var(--line);padding:7px 0">
        <div class="glote" style="border:none;padding:0">
          <span><b>${esc(l.amb)}</b>${l.etapa?` · <span style="color:var(--azul)">${esc(l.etapa)}</span>`:""}${l.cond?` · ${esc(l.cond)}`:""}</span>
          <span><b>${l.n}</b> foto(s)
            <button class="adx" style="height:23px;width:23px;font-size:14px;margin-left:5px" data-a="gRepQuita" data-i="${i}">−</button></span></div>
        <input id="loD${i}" value="${esc(l.desc||"")}" placeholder="Qu\u00e9 se ve en estas fotos" style="margin-top:5px">
      </div>`).join("")}
      </div>`:`<div class="dc" style="border-style:dashed;margin-top:7px"><div class="ds" style="text-align:center">Sin fotos todavía</div></div>`}

    ${g.tipo==="material"?`<label>Qué falta</label><input id="gM" value="${esc(g.material||"")}" placeholder="Galón de pintura blanca, 2 rodillos…">`:""}


    ${g.tipo==="revision"?`
      <label>Servicio supervisado</label>
      <select id="gSv">${activos("servicios").map(x=>`<option ${x.nombre===g.servSup?"selected":""}>${esc(x.nombre)}</option>`).join("")}</select>
      ${(()=>{ const ws=S.wos.filter(w=>w.unidad===g.unidad && w.tec);
        const tecs=[...new Set(ws.map(w=>w.tec))];
        return tecs.length
          ? `<div class="sub" style="margin:5px 0 0">T\u00e9cnicos asignados a esta unidad:
              <b>${tecs.map(t=>esc(tecN(t))).join(", ")}</b> — sale de las Work Orders, no lo escribes.</div>`
          : `<div class="sub" style="margin:5px 0 0">Esta unidad no tiene t\u00e9cnico asignado todav\u00eda.</div>`;})()}

      <label style="margin-top:11px">Problemas encontrados</label>
      <textarea id="gPr" placeholder="Lo que estaba mal o fuera de lo previsto">${esc(g.problemas||"")}</textarea>

      <label>Trabajo adicional recomendado</label>
      <textarea id="gAd" placeholder="Lo que conviene hacer y no estaba en la orden">${esc(g.adicional||"")}</textarea>
      ${g.adicional&&g.adicional.trim()?`<div class="dc" style="margin:5px 0 0;background:var(--verde-cl);border-color:transparent">
        <div class="ds" style="color:var(--verde)">Al enviar, esto le llega a Claudia como <b>oportunidad de estimado</b>,
        no enterrado dentro del informe. As\u00ed se vende.</div></div>`:""}

      <label style="margin-top:11px">Firmas</label>
      <div class="dc" style="padding:9px 11px">
        <div class="ds"><b>Gustavo Andrade</b> — firmado con tu usuario, hoy ${hora()}</div>
        <div class="ds" style="color:var(--faint);font-size:10.5px;margin-top:2px">
          Tu sesi\u00f3n es tu firma: no hace falta que dibujes nada.</div>
      </div>
      <button class="gchip ${g.conMant?"on":""}" style="width:100%;margin-top:6px" data-a="gRepMant">
        ${g.conMant?"✓ Inspeccion\u00e9 con mantenimiento":"¿Inspeccionaste con mantenimiento?"}</button>
      ${g.conMant?`<input id="gMn" value="${esc(g.mantNombre||"")}" placeholder="Nombre de quien te acompa\u00f1\u00f3" style="margin-top:5px">
        <button class="gchip ${g.mantFirma?"on":""}" style="width:100%;margin-top:5px" data-a="gRepMantFirma">
          ${g.mantFirma?"✓ Firma capturada":"Capturar su firma en pantalla"}</button>
        <div class="sub" style="margin:4px 0 0">\u00c9l no es usuario del sistema, as\u00ed que su firma s\u00ed se dibuja:
          es la \u00fanica evidencia de que estuvo.</div>`:""}
    `:""}

    <label>${g.tipo==="revision"?"Comentarios generales":"Nota"}</label>
    <textarea id="gN" placeholder="Lo que Claudia necesita saber">${esc(g.nota||"")}</textarea>

    <label style="margin-top:11px">Enviar copia también a</label>
    <div class="sub" style="margin:-3px 0 7px">A Claudia siempre le llega. Esto es aparte.</div>
    <div class="gchips">
      <button class="gchip ${g.copiaThalia?"on":""}" data-a="gRepCopiaThalia">${g.copiaThalia?"✓ ":""}Thalia (scheduling)</button>
      ${(()=>{ const ctc=contactosDe(g.prop)[0];
        return `<button class="gchip ${g.copiaCliente?"on":""}" data-a="gRepCopiaCliente" ${ctc?"":"disabled"}>
          ${g.copiaCliente?"✓ ":""}Cliente${ctc?" — "+esc(ctc.nombre):" (sin contacto registrado)"}</button>`; })()}
    </div>

    <button class="db p" style="margin-top:11px;background:${r.c}" data-a="gRepOK">Enviar a Claudia</button>
    <button class="db g" data-a="gRepBorrador">Guardar borrador y seguir despu\u00e9s</button>
    <button class="db g" data-a="gRepNo">Cancelar</button>
  </div></div>`;
}

/* ── Hoja: una entrada del reporte diario ──
   Solo se abre para los tipos que el sistema NO puede saber. Las llegadas,
   los informes y las devoluciones se anotan solas. */
function hojaDia(g){
  const t = ENTRADAS_DIA[g.tipo] || {n:g.tipo, c:"#8a97a4"};
  const us = S.unidades.filter(u=>u.prop===g.prop);
  return `<div class="fscrim" data-a="gDiaNo"><div class="fsheet" data-stop>
    <div class="grab"></div>
    <h4 style="color:${t.c}">${t.n}</h4>
    <div class="sub">Se agrega a tu reporte de hoy con la hora autom\u00e1tica.</div>

    <label>Propiedad</label>
    <select id="dnP" data-a="gDiaProp">${S.propiedades.filter(x=>x.activa).map(x=>
      `<option value="${x.id}" ${x.id===g.prop?"selected":""}>${esc(x.nombre)}</option>`).join("")}</select>

    ${us.length?`<label>Unidad <span style="text-transform:none;font-weight:500;color:var(--faint)">— si aplica</span></label>
      <select id="dnU"><option value="">— toda la propiedad —</option>
        ${us.map(u=>`<option value="${u.id}" ${u.id===g.unidad?"selected":""}>${esc(u.num)}</option>`).join("")}</select>`:""}

    <label>${g.tipo==="compra"?"Qu\u00e9 compraste y d\u00f3nde"
            :g.tipo==="entrega"?"Qu\u00e9 material entregaste y a qui\u00e9n"
            :g.tipo==="coord"?"Con qui\u00e9n coordinaste y qu\u00e9 qued\u00f3"
            :g.tipo==="problema"?"Qu\u00e9 problema encontraste"
            :"Qu\u00e9 queda pendiente"}</label>
    <textarea id="dnT" placeholder="${g.tipo==="compra"?"2 galones ProMar en Sherwin Williams — $65.40"
            :g.tipo==="entrega"?"Le dej\u00e9 4 galones a Marcos en la A-211"
            :g.tipo==="coord"?"Habl\u00e9 con el manager: entrega la unidad el jueves"
            :g.tipo==="problema"?"No hab\u00eda agua en el edificio, el t\u00e9cnico no pudo limpiar"
            :"Volver el viernes a verificar el z\u00f3calo"}">${esc(g.texto||"")}</textarea>

    ${g.tipo==="compra"?`<label>Recibo</label>
      <div class="dph" style="margin:0 0 4px">📷 ${g.fotos?g.fotos+" foto(s) del recibo":"sin foto del recibo"}</div>
      <button class="db g" data-a="gDiaFoto">Tomar foto del recibo</button>`:""}

    <button class="db p" style="margin-top:11px;background:${t.c}" data-a="gDiaOK">Agregar a mi reporte</button>
    <button class="db g" data-a="gDiaNo">Cancelar</button>
  </div></div>`;
}

/* ── Hoja: devolución ──
   Dos modos. Al crearla lo que importa es la CAUSA, porque de ahi sale si se
   le paga al tecnico y si se le cobra al cliente. Al verificarla lo que
   importa son las fotos del despues: sin eso no se puede cerrar. */
function hojaDev(g){
  if(g.modo==="verif"){
    const d = DV(g.id);
    const total = g.lotes.reduce((t,l)=>t+l.n,0);
    return `<div class="fscrim" data-a="gDevNo"><div class="fsheet" data-stop>
      <div class="grab"></div>
      <h4 style="color:var(--verde)">Verificar la correcci\u00f3n</h4>
      <div class="sub">${esc(P(d.prop).nombre)} · ${U(d.unidad)?esc(U(d.unidad).num):""} — ${esc(d.area)}</div>

      <div class="dc" style="margin:9px 0 0;background:var(--ambar-cl);border-color:transparent">
        <div class="ds"><b>Lo que estaba mal:</b> ${esc(d.desc)}</div></div>

      <label style="margin-top:11px">Fotos del despu\u00e9s${total?` · ${total} tomada(s)`:""}</label>
      <div class="sub" style="margin:-3px 0 7px">Sin fotos del despu\u00e9s la devoluci\u00f3n no se puede cerrar.</div>
      <div class="gchips">${activos("ubicaciones").map(u=>
        `<button class="gchip ${g.amb===u?"on":""}" data-a="gDevAmb" data-u="${esc(u)}">${esc(u)}</button>`).join("")}</div>
      <button class="db p gcam" data-a="gDevFoto">Tomar foto${g.amb?" · "+esc(g.amb):""}</button>

      ${g.lotes.length?`<div class="glotes">${g.lotes.map((l,i)=>`
        <div class="glote"><span><b>${esc(l.amb)}</b></span>
          <span><b>${l.n}</b> foto(s)
            <button class="adx" style="height:23px;width:23px;font-size:14px;margin-left:5px" data-a="gDevQuita" data-i="${i}">−</button></span></div>`).join("")}
        </div>`:""}

      <label>¿Qued\u00f3 bien?</label>
      <textarea id="dvV" placeholder="Se retoc\u00f3 el marco y el z\u00f3calo. Qued\u00f3 conforme.">${esc(g.nota||"")}</textarea>

      <button class="db p" style="margin-top:11px;background:var(--verde)" data-a="gDevVerifOK">Marcar como corregida</button>
      <button class="db g" data-a="gDevNo">Cancelar</button>
    </div></div>`;
  }

  /* modo crear */
  const us = S.unidades.filter(u=>u.prop===g.prop);
  const c = causaDe(g.causa);
  const total = g.lotes.reduce((t,l)=>t+l.n,0);
  return `<div class="fscrim" data-a="gDevNo"><div class="fsheet" data-stop>
    <div class="grab"></div>
    <h4 style="color:var(--rojo)">Crear devoluci\u00f3n</h4>
    <div class="sub">Queda abierta hasta que t\u00fa verifiques con fotos que se corrigi\u00f3, aunque pasen d\u00edas.</div>

    <label>Propiedad</label>
    <select id="dvP" data-a="gDevProp">${S.propiedades.filter(x=>x.activa).map(x=>
      `<option value="${x.id}" ${x.id===g.prop?"selected":""}>${esc(x.nombre)}</option>`).join("")}</select>

    <label>Unidad</label>
    <select id="dvU">${us.length?us.map(u=>
      `<option value="${u.id}" ${u.id===g.unidad?"selected":""}>${esc(u.num)}</option>`).join("")
      :`<option value="">— sin unidades —</option>`}</select>

    <label>Área que debe corregirse</label>
    <select id="dvA">${activos("ubicaciones").map(u=>
      `<option ${u===g.area?"selected":""}>${esc(u)}</option>`).join("")}</select>

    <label>Qu\u00e9 est\u00e1 mal</label>
    <textarea id="dvD" placeholder="Qued\u00f3 pintura en el marco y el z\u00f3calo sin retocar">${esc(g.desc||"")}</textarea>

    <label style="margin-top:9px">¿Por qu\u00e9 pas\u00f3?</label>
    <div class="sub" style="margin:-3px 0 7px">Esto decide si se le paga al t\u00e9cnico y si se le cobra al cliente.</div>
    ${Object.keys(CAUSAS_DEV).map(k=>
      `<button class="gchip ${g.causa===k?"on":""}" style="display:block;width:100%;text-align:left;margin-bottom:4px"
        data-a="gDevCausa" data-c="${esc(k)}">${esc(k)}</button>`).join("")}
    <div class="dc" style="margin:5px 0 0;background:${c.paga?"var(--verde-cl)":"var(--rojo-cl)"};border-color:transparent">
      <div class="ds">${c.ex}</div></div>

    <label style="margin-top:9px">Qui\u00e9n la corrige</label>
    <select id="dvR">${S.tecnicos.filter(t=>t.activo!==false && t.id!==GUSTAVO).map(t=>
      `<option value="${t.id}" ${t.id===g.responsable?"selected":""}>${esc(tecN(t.id))}</option>`).join("")}</select>

    <label>Prioridad</label>
    <div class="gchips">${PRIOR_DEV.map(pr=>
      `<button class="gchip ${g.prioridad===pr?"on":""}" data-a="gDevPrio" data-p="${pr}">${pr}</button>`).join("")}</div>

    <label>Fecha l\u00edmite para corregir</label>
    <input id="dvF" value="${esc(g.fechaLimite||"")}" placeholder="2026-08-14">

    <label style="margin-top:9px">Fotos de lo que est\u00e1 mal${total?` · ${total}`:""}</label>
    <div class="gchips">${activos("ubicaciones").map(u=>
      `<button class="gchip ${g.amb===u?"on":""}" data-a="gDevAmb" data-u="${esc(u)}">${esc(u)}</button>`).join("")}</div>
    <button class="db p gcam" data-a="gDevFoto">Tomar foto${g.amb?" · "+esc(g.amb):""}</button>
    ${g.lotes.length?`<div class="glotes">${g.lotes.map((l,i)=>`
      <div class="glote"><span><b>${esc(l.amb)}</b></span>
        <span><b>${l.n}</b> foto(s)
          <button class="adx" style="height:23px;width:23px;font-size:14px;margin-left:5px" data-a="gDevQuita" data-i="${i}">−</button></span></div>`).join("")}
      </div>`:""}

    <button class="db p" style="margin-top:11px;background:var(--rojo)" data-a="gDevOK">Crear devoluci\u00f3n</button>
    <button class="db g" data-a="gDevNo">Cancelar</button>
  </div></div>`;
}

/* Hojas que suben dentro del teléfono — nunca un modal de la web */
function hojaCel(sh){
  const w = W(sh.wo);
  /* Un adicional real trae varios conceptos («Extra prep, Primer»). El técnico
     empieza con un renglón y agrega los que necesite; no hay tope, porque el
     tope se lo puso el Excel, no el trabajo. */
  if(sh.t==="adic"){
    const cs = activos("adicionales");
    return `<div class="fscrim" data-a="fSheetNo"><div class="fsheet" data-stop>
    <div class="grab"></div>
    <h4>Necesito aprobación</h4>
    <div class="sub">Algo que encontraste y no estaba en la orden. Le llega a oficina al instante.</div>
    <label>¿Qué encontraste?</label>
    <textarea id="paD">${esc(sh.desc)}</textarea>
    <label>¿Dónde?</label>
    <select id="paU">${activos("ubicaciones").map(u=>`<option ${u===sh.ubic?"selected":""}>${esc(u)}</option>`).join("")}</select>

    <label>¿Qué hay que hacer?</label>
    <div class="sub" style="margin:-3px 0 7px">Un renglón por concepto. Oficina puede autorizarte uno y el otro no.</div>
    ${sh.filas.map((f,i)=>`<div class="adfila">
      <select id="paC${i}">${cs.map(c=>`<option ${c===f.c?"selected":""}>${esc(c)}</option>`).join("")}</select>
      <button class="adx" data-a="fAdicMenos" data-i="${i}" ${sh.filas.length===1?"disabled":""}>−</button>
      <div class="adnum">
        <label>Cant.<input id="paQ${i}" value="${esc(String(f.q))}" inputmode="numeric"></label>
      </div>
      <button type="button" class="db g" style="grid-column:1/3;margin:0;padding:7px" data-a="fAdicFoto" data-i="${i}">${f.foto
        ?`<img src="${f.foto}" style="width:16px;height:16px;object-fit:cover;border-radius:3px"> Foto agregada — tocá para cambiar`
        :"📷 Agregar foto de esto"}</button>
    </div>`).join("")}
    <button class="db g admas" data-a="fAdicMas">+ Agregar otro concepto</button>
    ${sh.filas.length>1?`<div class="adtot"><span>${sh.filas.length} conceptos</span></div>`:""}
    <div class="sub" style="margin:-2px 0 4px">Cada renglón tiene su propio botón de foto — ya no es una sola para todo el aviso.</div>
    <button class="db p" style="margin-top:11px" data-a="fAdicOK" data-id="${sh.wo}">Enviar a oficina</button>
    <button class="db g" data-a="fSheetNo">Cancelar</button>
  </div></div>`;
  }

  /* Lo que el flujograma de Técnicos pide subir junto a la evidencia —
     "materiales utilizados... y observaciones" — no tenía dónde ponerse en
     el celular. Sin esto, materialWO() de la orden queda en $0 en silencio
     salvo que alguien de oficina se acuerde de anotarlo aparte en Inventario. */
  if(sh.t==="material"){
    const prods = S.productos;
    // El técnico nunca ve dinero de nada — ni siquiera el costo de lo que
    // registra. materialWO() sigue calculándolo para oficina, solo que no
    // se le muestra a él en ningún lado del celular.
    return `<div class="fscrim" data-a="fSheetNo"><div class="fsheet" data-stop>
    <div class="grab"></div>
    <h4>Materiales y observaciones</h4>
    <div class="sub">Lo que usaste en este trabajo — así queda registrado en la orden, no se pierde.</div>
    ${sh.filas.map((f,i)=>`<div class="adfila">
      <select id="mtP${i}">${prods.map(p=>`<option value="${p.id}" ${p.id===f.prod?"selected":""}>${esc(p.nombre)}</option>`).join("")}</select>
      <button class="adx" data-a="fMaterialMenos" data-i="${i}" ${sh.filas.length===1?"disabled":""}>−</button>
      <div class="adnum"><label>Cant.<input id="mtC${i}" value="${esc(String(f.cant))}" inputmode="decimal"></label></div>
    </div>`).join("")}
    <button class="db g admas" data-a="fMaterialMas">+ Agregar otro material</button>
    ${sh.filas.length>1?`<div class="adtot"><span>${sh.filas.length} línea(s)</span></div>`:""}
    <label>Observaciones <span style="font-weight:500;color:var(--faint)">— opcional</span></label>
    <textarea id="mtObs" placeholder="Algo que oficina debería saber de este trabajo">${esc(sh.obs||"")}</textarea>
    <button class="db p" style="margin-top:11px" data-a="fMaterialOK" data-id="${sh.wo}">Guardar</button>
    <button class="db g" data-a="fSheetNo">Cancelar</button>
  </div></div>`;
  }

  if(sh.t==="llegada") return `<div class="fscrim" data-a="fSheetNo"><div class="fsheet" data-stop>
    <div class="grab"></div>
    <h4>No marcaste tu llegada</h4>
    <div class="sub">No te freno el cierre, pero necesito la hora. Queda registrada como <b>declarada</b>, no verificada.</div>
    <label>¿A qué hora llegaste?</label>
    <input id="plH" value="${esc(w.horaProg||"9:00")}" inputmode="numeric">
    <button class="db v" style="margin-top:11px" data-a="fLlegadaDecl" data-id="${sh.wo}">Registrar y cerrar</button>
    <button class="db g" data-a="fSheetNo">Cancelar</button>
  </div></div>`;

  if(sh.t==="corrobNo"){ const w=W(sh.wo), u=U(w.unidad); return `<div class="fscrim" data-a="fSheetNo"><div class="fsheet" data-stop>
    <div class="grab"></div>
    <h4>Corregir datos de la unidad</h4>
    <div class="sub">Esto crea una Approval Request para oficina. Tú reportas lo que ves; oficina revisa y decide si actualiza el dato.</div>
    <label>Campo</label><input value="Floors" disabled>
    <label>Dato actual</label><input value="${esc(String(u.pisos))} floor(s)" disabled>
    <label>Floors observados</label><input id="cnPisos" type="number" min="1" value="${esc(String(u.pisos))}">
    <label>Nota</label><textarea id="cnTxt" placeholder="Ej: son 2 pisos; la escalera llega al segundo nivel"></textarea>
    <button class="db p" style="margin-top:11px" data-a="woCorroboraNoOK" data-id="${sh.wo}">Enviar para revisión y empezar</button>
    <button class="db g" data-a="fSheetNo">Cancelar</button>
  </div></div>`; }

  if(sh.t==="permiso") return `<div class="fscrim" data-a="fSheetNo"><div class="fsheet" data-stop>
    <div class="grab"></div>
    <h4>Pedir permiso o vacaciones</h4>
    <div class="sub">Le llega a Gustavo. Si lo aprueba, dejas de aparecer para asignar en esas fechas.</div>
    <label>Desde</label><input type="date" id="ppD" value="2026-08-18">
    <label>Hasta</label><input type="date" id="ppH" value="2026-08-20">
    <label>Motivo</label><input id="ppM" placeholder="Vacaciones, cita médica…">
    <button class="db p" style="margin-top:11px" data-a="fPermisoOK">Enviar</button>
    <button class="db g" data-a="fSheetNo">Cancelar</button>
  </div></div>`;
  return "";
}

/* ── TABLERO ── el reporte que Claudia pidió y el Excel no da ── */
