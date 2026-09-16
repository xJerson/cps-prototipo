"use strict";
VIEWS.propiedades = () => {
  if(S.sub) return fichaProp(S.sub);
  return `
  <div class="ph"><div><h2>Propiedades</h2>
    <p>La pestaña <code>Propiedades</code>. Los tres contactos dejan de ser 9 columnas repetidas y las unidades dejan de vivir sueltas.</p></div>
    <div class="act"><button class="btn p" data-a="propNueva">+ Nueva propiedad</button></div></div>
  <div class="card"><table>
    <thead><tr><th>Propiedad</th><th>Zona</th><th>Cliente (Management)</th><th class="num">Unidades</th><th class="num">Contactos</th><th>COI</th><th>Estado</th></tr></thead>
    <tbody>${S.propiedades.map(p=>{
      const nu=S.unidades.filter(u=>u.prop===p.id).length, nc=S.contactos.filter(c=>c.prop===p.id).length;
      return `<tr class="cl${fl("prop:"+p.id)}" data-a="propVer" data-id="${p.id}">
        <td style="font-weight:650">${esc(p.nombre)}<div style="font-size:10.5px;color:var(--faint)">${esc(p.dir)}</div></td>
        <td>${esc(p.zona)}</td><td>${p.cliente?esc(CLI(p.cliente).nombre):'<span style="color:var(--faint)">—</span>'}<div style="font-size:10.5px;color:var(--faint)">${esc(p.estado||"")}</div></td>
        <td class="num mono">${nu}</td><td class="num mono">${nc}</td>
        <td>${p.polizas&&p.polizas.length?`<span class="pill ${coiVigente(p.id)?"v":"r"}">${esc(p.polizas.reduce((a,x)=>!a||x.vence<a?x.vence:a,null))}</span>`:`<span class="pill r"><span class="dot"></span>falta</span>`}</td>
        <td>${p.activa?'<span class="pill v">Activa</span>':'<span class="pill g">Sin movimiento</span>'}</td></tr>`;
    }).join("")}</tbody></table></div>
  <div class="tr">Hoy <code>Active?</code> está lleno en muy pocas propiedades, así que «¿sigue activa?» no se puede responder. Aquí es un campo con dos valores y nada más.</div>`;
};

function fichaProp(id){
  const p=P(id), t=S.tab||"datos";
  const us=S.unidades.filter(u=>u.prop===id), cs=S.contactos.filter(c=>c.prop===id);
  const ws=S.wos.filter(w=>w.prop===id);
  const tf=S.tarifas.filter(x=>x.prop===id);
  const coms=S.comunicaciones.filter(m=>m.prop===id);
  return `
  <div class="ph"><div>
    <button class="btn sm" data-a="ir" data-m="propiedades" style="margin-bottom:7px">‹ Propiedades</button>
    <h2>${esc(p.nombre)} ${p.activa?"":'<span class="pill g" style="vertical-align:middle">Dada de baja</span>'}</h2>
    <p>${esc(p.zona)} · ${p.cliente?esc(CLI(p.cliente).nombre):'<span style="color:var(--faint)">sin management</span>'} · ${esc(p.dir)}</p></div>
    <div class="act"><button class="btn" data-a="propNueva" data-id="${id}">Editar datos</button>
      <button class="btn ${p.activa?"":"v"}" data-a="propBaja" data-id="${id}">
      ${p.activa?"Dar de baja":"Reactivar"}</button></div></div>
  <div class="tabs">${[["datos","Datos"],["expediente",`Expediente ${expedienteOK(id)?"✓":"— incompleto"}`],["documentos","Documentos"],["unidades",`Unidades (${us.length})`],["contactos",`Contactos (${cs.length})`],["com",`Comunicación (${coms.length})`],["precios",`Price List (${tf.length})`],["previo",`Informes de campo (${S.reportes.filter(r=>r.prop===id).length})`],["hist",`Historial (${ws.length})`]]
    .map(([k,n])=>`<button class="tab ${t===k?"on":""}" data-a="tab" data-t="${k}">${n}</button>`).join("")}</div>

  ${t==="expediente"?(()=>{
    /* "Estimado aprobado" nace de una Solicitud Comercial — pero si ya hay
       una registrada para esta propiedad esperando convertirse, mandar a
       "crear otra" es un paso de más y confunde ("ya creé la solicitud,
       ¿y ahora?"). Si ya existe una lista, el botón va directo a armar el
       estimado desde ella; solo pide una nueva si de verdad no hay ninguna. */
    const solLista = S.solicitudesComerciales.find(sc=>sc.prop===id && sc.estado!=="Estimado creado" && sc.estado!=="Descartada");
    return `<div class="card"><div class="chd"><h3>Expediente de la propiedad</h3>
    <span class="s">Claudia: «tú no puedes pasar al siguiente paso si no tienes el primero»</span></div>
    <table><thead><tr><th style="width:40px"></th><th>Campo</th><th>Valor</th><th style="width:130px"></th></tr></thead><tbody>
    ${expedienteDe(id).map(c=>`<tr>
      <td>${c.ok?'<span class="pill v">✓</span>':'<span class="pill r">—</span>'}</td>
      <td style="font-weight:${c.ok?"500":"700"}">${esc(c.n)}</td>
      <td style="color:${c.ok?"var(--soft)":"var(--rojo)"}">${c.ok
        ? esc(c.k==="contacto" ? S.contactos.filter(x=>x.prop===id).length+" contacto(s)"
            : c.k==="coi" ? p.polizas.length+" póliza(s)"
            /* "precios" y "estimado" tampoco son campos de la propiedad
               (p[c.k] no existe ahí) — mostraban literal "undefined" en
               vez del dato real, apenas se resolvía este punto por primera
               vez. Mismo error de fondo que el botón "Completar" de la
               vez pasada: se trataron como si fueran campos de p. */
            : c.k==="precios" ? S.tarifas.filter(t=>t.prop===id).length+" precio(s)"
            : c.k==="estimado" ? (S.estimados.find(e=>e.prop===id && e.estado==="Aprobado")||{}).num+" aprobado"
            : String(p[c.k]))
        : "falta"}</td>
      <td style="text-align:right">${c.ok?"":(c.k==="contacto"
        ? `<button class="btn sm p" data-a="conNuevo" data-prop="${id}">+ Contacto</button>`
        : c.k==="coi" ? `<button class="btn sm p" data-a="coiDirecto" data-id="${id}">Registrar COI</button>`
        /* "Price List" y "Estimado aprobado" no son campos de la propiedad
           (nombre, dirección, etc.) — son datos de otras dos colecciones.
           "Completar" los mandaba al formulario de "Editar propiedad",
           que no tiene ningún campo para eso: el botón parecía funcionar
           pero no había nada ahí que de verdad resolviera el punto. */
        : c.k==="precios" ? `<button class="btn sm p" data-a="tab" data-t="precios" title="Se agrega desde la pestaña Price List de esta propiedad">Ir a Price List</button>`
        : c.k==="estimado" ? (solLista
            ? `<button class="btn sm p" data-a="solComEstimado" data-id="${solLista.id}" title="Ya hay una Solicitud Comercial de esta propiedad esperando — arma el estimado desde ahí">Crear estimado</button>`
            : `<button class="btn sm p" data-a="ir" data-m="solicitudes" title="El estimado nace de una Solicitud Comercial — regístrala primero">Registrar Solicitud Comercial</button>`)
        : `<button class="btn sm p" data-a="propNueva" data-id="${id}" data-f="${c.k}">Completar</button>`)}</td></tr>`).join("")}
    <tr><td><span class="pill a">i</span></td>
      <td style="font-weight:500">Unidades registradas</td>
      <td style="color:var(--soft)">${us.length?us.length+" unidad(es)":"0 — no bloquea, se van agregando solas al crear Work Orders o Estimados"}</td>
      <td style="text-align:right"><button class="btn sm" data-a="uniNueva" data-prop="${id}">+ Unidad</button></td></tr>
    </tbody></table>
    <div class="cp" style="border-top:1px solid var(--line)">
      <div style="margin-bottom:10px"><button class="btn sm" data-a="inspPedirModal" data-prop="${id}">Pedir inspección en sitio</button></div>
      ${expedienteOK(id)
        ? `<div class="note v" style="margin:0"><b>Expediente completo.</b> Esta propiedad ya puede pasar a programación sin que nadie tenga que llamar a preguntar nada.</div>`
        : `<div class="note r" style="margin:0"><b>Expediente incompleto.</b> El sistema no deja transferir a programación hasta que estén los ${expedienteDe(id).filter(c=>!c.ok).length} campos que faltan. Es lo que hoy se descubre cuando el técnico ya está en la propiedad.</div>`}
    </div>
    <div class="mf" style="border-top:1px solid var(--line)">
      <button class="btn ${expedienteOK(id)?"p":""}" data-a="transferir" data-id="${id}" ${expedienteOK(id)?"":"disabled"}>Transferir a programación</button>
    </div></div>

  ${vAltaGuiada(id)}`;
  })():""}

  ${t==="documentos"?`<div class="card"><div class="chd"><h3>Documentos</h3>
    <span class="s">El seguro de esta propiedad — un mismo certificado (ACORD 25) trae varias pólizas</span></div>
    ${p.polizas&&p.polizas.length?`<table><thead><tr><th>Tipo</th><th>Aseguradora</th><th>Póliza</th><th>Vence</th></tr></thead>
    <tbody>${p.polizas.map(x=>`<tr><td>${esc(x.tipo)}</td><td>${esc(x.aseguradora)||"—"}</td>
      <td class="mono">${esc(x.poliza)||"—"}</td><td><span class="pill ${x.vence&&x.vence>=HOY_SUP?"v":"r"}">${esc(x.vence)||"—"}</span></td></tr>`).join("")}
    </tbody></table>`:`<div class="empty">Sin pólizas registradas</div>`}
    <div class="cp" style="border-top:1px solid var(--line);display:flex;align-items:center;gap:8px">
      <span style="font-size:11.5px;color:var(--faint)">Certificado en PDF</span>
      ${p.coiPdf?`<span class="pill m">📎 ${esc(p.coiPdf)}</span>`:`<span class="pill w">sin PDF adjunto</span>`}
    </div>
    ${(p.coiHist&&p.coiHist.length)?`<div class="cp" style="border-top:1px solid var(--line)">
      <div style="font-size:11px;font-weight:750;text-transform:uppercase;letter-spacing:.05em;color:var(--faint);margin-bottom:8px">Historial de renovaciones</div>
      <table><thead><tr><th>Fecha</th><th>Hora</th><th>Pólizas</th><th>Quién</th></tr></thead>
      <tbody>${p.coiHist.slice().reverse().map(h=>`<tr><td class="mono">${esc(h.fecha)}</td>
        <td class="mono">${esc(h.hora)}</td>
        <td>${(h.polizas||[]).length?`<div class="cambios">${(h.polizas||[]).map(x=>x.venceAntes
          ?`<div><span class="cc">${esc(x.tipo)}</span> <span class="de">vence ${esc(x.venceAntes)}</span> <span class="fl">→</span> <b>vence ${esc(x.vence)}</b></div>`
          :`<div>${esc(x.tipo)} · vence ${esc(x.vence)}</div>`).join("")}</div>`:"—"}</td>
        <td>${esc(h.quien)}</td></tr>`).join("")}</tbody></table>
    </div>`:""}
    <div class="mf" style="border-top:1px solid var(--line)">
      <button class="btn p" data-a="coiDirecto" data-id="${id}">Registrar / editar pólizas</button>
    </div></div>`:""}

  ${t==="datos"?`<div class="card"><table><tbody>
    <tr><td style="color:var(--faint);width:210px">Zona (Area)</td><td>${esc(p.zona)}</td></tr>
    <tr><td style="color:var(--faint)">Management</td><td>${p.cliente
      ?esc(CLI(p.cliente).nombre)
      :`<span style="color:var(--faint)">— sin management —</span> <button class="btn sm" data-a="cliNuevo" data-prop="${id}" style="margin-left:8px">+ Registrar management</button>`}</td></tr>
    <tr><td style="color:var(--faint)">Client Status</td><td><span class="pill ${ESTCOL[p.estado]||"w"}">${esc(p.estado||"—")}</span></td></tr>
    <tr><td style="color:var(--faint)">Client Source</td><td>${esc(p.origen||"—")}</td></tr>
    <tr><td style="color:var(--faint)">Dirección</td><td>${esc(p.dir)}</td></tr>
    <tr><td style="color:var(--faint)">Door code</td><td class="mono">${esc(p.door)}</td></tr>
    <tr><td style="color:var(--faint)">Default Contact Method</td><td>${esc(p.pref)}</td></tr>
    <tr><td style="color:var(--faint)">Approval Method</td><td>${esc(p.aprob)}</td></tr>
    <tr><td style="color:var(--faint)">Accounts Payable Email 1</td><td>${esc(p.mailAP1)||"—"}</td></tr>
    <tr><td style="color:var(--faint)">Accounts Payable Email 2</td><td>${esc(p.mailAP2)||"—"}</td></tr>
    <tr><td style="color:var(--faint)">Special Property Requirements</td><td>${p.notas?`<b>${esc(p.notas)}</b>`:"—"}</td></tr>
    <tr><td colspan="2" style="padding-top:14px"><b style="font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--faint)">Información para el técnico</b></td></tr>
    <tr><td style="color:var(--faint)">Dónde está el shop</td><td>${esc(p.shop)||"—"}</td></tr>
    <tr><td style="color:var(--faint)">Código del shop</td><td class="mono">${esc(p.shopCode)||"—"}</td></tr>
    <tr><td style="color:var(--faint)">Horario</td><td>${esc(p.horario)||"—"}</td></tr>
    <tr><td style="color:var(--faint)">Información de pintura</td><td>${p.notasPaint?esc(p.notasPaint):'<span style="color:var(--rojo)">— falta, bloquea el Expediente —</span>'}</td></tr>
    <tr><td style="color:var(--faint)">Al terminar</td><td>${esc(p.finalExp)||"—"}</td></tr>
    <tr><td style="color:var(--faint)">Ojo</td><td>${esc(p.notasTec)||"—"}</td></tr>
    <tr><td style="color:var(--faint)">Activa</td><td>${p.activa?'<span class="pill v">Sí</span>':'<span class="pill g">No</span>'}</td></tr>
  </tbody></table></div>`:""}

  ${t==="unidades"?`<div class="card"><div class="chd"><h3>Unidades</h3>
    <span class="s">catálogo de referencia — no bloquea agendar, se va llenando solo con cada WO/Estimado</span>
    <span class="r"><button class="btn sm p" data-a="uniNueva" data-prop="${id}">+ Unidad</button></span></div>
    ${us.length?`<table><thead><tr><th>Building</th><th>Unidad</th><th class="num">Floor</th><th>Rooms</th><th class="num">Bathrooms</th><th>Occupancy</th><th>Detail</th><th class="num">Work Orders</th><th></th></tr></thead><tbody>
    ${us.map(u=>`<tr class="${fl("uni:"+u.id)}"><td class="mono">${esc(u.building)||"—"}</td><td style="font-weight:650">${esc(u.unidadNum||u.num)}</td><td class="num mono">${u.pisos}</td>
      <td>${esc(u.rooms)||'<span class="pill w">sin definir</span>'}</td>
      <td class="num mono">${u.bathrooms||"—"}</td>
      <td>${u.ocupacion==="Vacant"?'<span class="pill w">Vacant</span>':'<span class="pill v">Occupied</span>'}</td>
      <td>${(u.detalle||[]).map(x=>`${x.cantidad} ${esc(x.tipo)}`).join(" / ")||"—"}</td>
      <td class="num mono">${S.wos.filter(w=>w.unidad===u.id).length}</td>
      <td style="text-align:right"><button class="btn sm" data-a="uniNueva" data-id="${u.id}">Editar</button></td></tr>`).join("")}
    </tbody></table>`:`<div class="empty">Todavía no hay ninguna registrada — no hace falta crearla aquí primero: aparece sola la primera vez que la uses en una Work Order o un Estimado.</div>`}</div>`:""}

  ${t==="contactos"?`<div class="card"><div class="chd"><h3>Contactos</h3>
    <span class="s">Manager · Assistant · Maintenance</span>
    <span class="r"><button class="btn sm p" data-a="conNuevo" data-prop="${id}">+ Contacto</button></span></div>
    ${cs.length?`<table><thead><tr><th>Tipo</th><th>Nombre</th><th>Correo</th><th>Teléfono</th><th></th></tr></thead><tbody>
    ${cs.map(c=>`<tr class="${fl("con:"+c.id)}"><td><span class="pill a">${esc(c.tipo)}</span></td><td style="font-weight:650">${esc(c.nombre)}</td>
      <td>${esc(c.mail)}</td><td class="mono">${esc(c.tel)}</td>
      <td style="text-align:right"><button class="btn sm" data-a="conNuevo" data-id="${c.id}">Editar</button></td></tr>`).join("")}
    </tbody></table>`:`<div class="empty">Sin contactos</div>`}
    <div class="cp" style="border-top:1px solid var(--line)"><div class="tr" style="margin:0">Hoy son 9 columnas fijas (Manager/Mail/Phone, Assistant/Mail/Phone, Maintenance/Mail/Phone). Si una propiedad tiene dos managers, no cabe.</div></div></div>`:""}

  ${t==="com"?`<div class="card"><div class="chd"><h3>Comunicación</h3>
    <span class="s">cada llamada o correo con esta propiedad — no cambios de datos, eso ya lo guarda la Bitácora aparte</span></div>
    ${coms.length?`<table><thead><tr><th>Fecha</th><th>Medio</th><th>Con quién</th><th>Registró</th><th>Nota</th></tr></thead>
    <tbody>${coms.slice().reverse().map(m=>`<tr><td class="mono">${esc(m.fecha)}</td><td>${esc(m.medio)}</td>
      <td>${esc(m.contacto)}</td><td>${esc(m.quien)}</td><td>${esc(m.nota)}</td></tr>`).join("")}</tbody></table>`
    :`<div class="empty">Sin comunicaciones registradas todavía</div>`}
    <div class="cp" style="border-top:1px solid var(--line)">
      <div style="font-size:11px;font-weight:750;text-transform:uppercase;letter-spacing:.05em;color:var(--faint);margin-bottom:8px">Registrar contacto</div>
      <div class="fg c2">
        <div class="fld" style="margin:0"><label>Medio</label><select id="cmM">${["Llamada","Correo","Mensaje","Visita"].map(x=>`<option>${x}</option>`).join("")}</select></div>
        <div class="fld" style="margin:0"><label>Con quién</label><input id="cmC" value=""></div></div>
      <div class="fld" style="margin-top:9px"><label>Nota <span class="req">*</span></label>
        <input id="cmN" placeholder="Qué se dijo o acordó"></div>
      <button class="btn p sm" style="margin-top:9px" data-a="propComAdd" data-id="${id}">+ Agregar</button>
    </div></div>`:""}

  ${t==="previo"?vPrevio(id):""}

  ${t==="precios"?`<div class="card"><div class="chd"><h3>Price List</h3>
    <span class="s">exclusivos de esta propiedad — mandan sobre la tarifa general</span>
    ${puede("tarifario")?`<span class="r"><button class="btn sm p" data-a="tarNueva" data-prop="${id}">+ Nuevo precio</button></span>`:""}</div>
    ${tf.length?`<table><thead><tr><th>Tipo</th><th>Servicio</th><th>Detail</th><th>Piso</th><th>Baños</th><th>Description</th><th class="num">Price</th>${puede("tarifario")?"<th></th>":""}</tr></thead><tbody>
    ${tf.map(x=>`<tr class="${fl("tar:"+x.id)}"><td>${esc(x.cat)||"—"}</td><td>${esc(x.serv)||"—"}</td><td>${esc(x.variante)||"—"}</td>
      <td>${x.pisos!=null?"Floor "+x.pisos:'<span class="pill g">cualquiera</span>'}</td>
      <td>${x.banos!=null?x.banos:'<span class="pill g">—</span>'}</td><td>${esc(x.desc)||"—"}</td>
      <td class="num mono">${money(x.precio)}</td>
      ${puede("tarifario")?`<td style="text-align:right"><button class="btn sm" data-a="tarNueva" data-id="${x.id}">Editar</button></td>`:""}</tr>`).join("")}
    </tbody></table>`:`<div class="empty">Sin precios propios — usa la tarifa general</div>`}</div>`:""}

  ${t==="hist"?`<div class="card"><div class="chd"><h3>Historial de la propiedad</h3>
    <span class="s">lo que Lydia necesita para atender sin transferir la llamada</span></div>
    ${ws.length?`<table><thead><tr><th>WO</th><th>Fecha</th><th>Unidad</th><th>Servicio</th><th>Técnico</th><th>Estado</th></tr></thead><tbody>
    ${ws.map(w=>`<tr class="cl${fl("wo:"+w.id)}" data-a="woVer" data-id="${w.id}"><td class="mono" style="font-weight:700">WO-${w.id}</td><td class="mono">${w.fecha.slice(5)}</td>
      <td>${esc(U(w.unidad).num)}</td><td>${esc(w.serv)}</td><td>${w.tec?esc(tecN(w.tec)):"—"}</td>
      <td><span class="pill ${estP(w.estado)}">${w.estado}</span></td></tr>`).join("")}
    </tbody></table>`:`<div class="empty">Sin trabajos registrados</div>`}</div>`:""}`;
}

/* Alta guiada — la secuencia que describe Claudia:
   «la creación de la propiedad, y ahí es cuando yo me encargo de los seguros
    de toda la introducción a la propiedad, y luego es que yo creo la lista de
    precios de la propiedad y los estimados correspondientes» */
function vAltaGuiada(id){
  const p=P(id);
  const us=S.unidades.filter(u=>u.prop===id).length;
  const cs=S.contactos.filter(c=>c.prop===id).length;
  const tf=S.tarifas.filter(t=>t.prop===id).length;
  const es=S.estimados.filter(e=>e.prop===id).length;
  const pasos=[
    {n:"Datos de la propiedad", ok:!!(p.nombre&&p.dir&&p.zona), det:`${esc(p.zona)} · ${esc(CLI(p.cliente).nombre)}`, tab:"datos", accion:null},
    {n:"Unidades",             ok:us>0,  det:us?`${us} unidad(es)`:"Sin unidades no se puede agendar", tab:"unidades", accion:null},
    {n:"Contactos",            ok:cs>0,  det:cs?`${cs} contacto(s)`:"Manager, assistant o mantenimiento", tab:"contactos", accion:null},
    {n:"Seguro (COI)",         ok:coiVigente(id), det:(p.polizas&&p.polizas.length)?`${p.polizas.length} póliza(s) · vence antes ${esc(p.polizas.reduce((a,x)=>!a||x.vence<a?x.vence:a,null))}`:"Lo emite la aseguradora, no Cordova", tab:"documentos",
     accion:coiVigente(id)?null:{a:"coiDirecto",t:"Registrar COI"}},
    {n:"Lista de precios de la propiedad", ok:tf>0, det:tf?`${tf} precio(s) negociado(s)`:"Si no tiene, usa la tarifa general", tab:"precios",
     accion:tf?null:{a:"preciosDesdeGeneral",t:"Partir de la general"}},
    {n:"Estimados",            ok:es>0,  det:es?`${es} estimado(s)`:"Cotizar las unidades que pidan", tab:null,
     accion:es?null:{a:"irEstimados",t:"Hacer un estimado"}}
  ];
  const listos=pasos.filter(x=>x.ok).length;
  return `
  <div class="card"><div class="chd"><h3>Alta de la propiedad</h3>
    <span class="s">la secuencia completa desde que se gana la cuenta</span>
    <span class="r"><span class="pill ${listos===pasos.length?"v":"w"}">${listos} de ${pasos.length}</span></span></div>
    <div class="cp"><ul class="traza">
    ${pasos.map(x=>`<li class="${x.ok?"hecho":"pend"}">
      <span class="mk">${x.ok?"✓":"○"}</span>
      <div style="flex:1;min-width:0"><div class="tt">${esc(x.n)}</div>
        <div class="dd">${x.det}</div></div>
      ${x.accion?`<button class="btn sm p" style="flex:none;align-self:center" data-a="${x.accion.a}" data-id="${id}">${x.accion.t}</button>`
        :x.tab?`<button class="btn sm" style="flex:none;align-self:center" data-a="tab" data-t="${x.tab}">Ver</button>`:""}</li>`).join("")}
    </ul>
    <div class="tr" style="margin-top:10px">Claudia: «todo parte de las ventas, de conseguir una propiedad. Ahí es cuando yo me encargo de los seguros
      de toda la introducción a la propiedad, y luego creo la lista de precios de la propiedad y los estimados correspondientes».</div>
    </div></div>`;
}

/* ── TÉCNICOS ── */
const asisDe = woId => S.asistencias.find(a=>a.wo===woId) || null;
const ultUbic = tecId => {
  const a = S.asistencias.filter(x=>x.tec===tecId).slice(-1)[0];
  return a ? a.ubicacion : null;
};

VIEWS.tecnicos = () => {
  const t = S.tab || "campo";
  return `
  <div class="ph"><div><h2>Técnicos</h2>
    <p>La pestaña <code>Tecnicos</code>, más lo que hoy se resuelve llamando por teléfono.</p></div>
    <div class="act"><button class="btn p" data-a="tecNuevo">+ Nuevo técnico</button></div></div>
  <div class="tabs">${[["campo","Hoy en campo"],["lista","Lista de técnicos"],["asis","Historial de asistencia"]]
    .map(([k,n])=>`<button class="tab ${t===k?"on":""}" data-a="tab" data-t="${k}">${n}</button>`).join("")}</div>
  ${t==="campo"?vCampo():t==="asis"?vAsis():vTecLista()}`;
};

function vCampo(){
  const hoy = S.wos.filter(w=>w.tec && ["Scheduled","Confirmed","In progress","Esperando aprobación","Completed"].includes(w.estado));
  const llegaron = hoy.filter(w=>asisDe(w.id)).length;
  const sinLlegar = hoy.filter(w=>!asisDe(w.id) && esAgendada(w.estado)).length;
  const tarde = S.asistencias.filter(a=>a.puntualidad==="Tarde").length;
  return `
  <div class="kpis">
    <div class="kpi"><div class="l">Trabajos asignados</div><div class="v">${hoy.length}</div></div>
    <div class="kpi"><div class="l">Ya llegaron</div><div class="v g">${llegaron}</div></div>
    <div class="kpi"><div class="l">Sin marcar llegada</div><div class="v ${sinLlegar?"w":""}">${sinLlegar}</div></div>
    <div class="kpi"><div class="l">Llegaron tarde</div><div class="v ${tarde?"b":""}">${tarde}</div></div>
  </div>
  <div class="card"><div class="chd"><h3>Quién llegó, cuándo y dónde está</h3>
    <span class="s">Erika: «está muy manual, tenemos que llamarles a ver dónde están»</span></div>
    ${hoy.length?`<table>
      <thead><tr><th>Técnico</th><th>WO</th><th>Propiedad · Unidad</th><th>Programada</th><th>Llegada real</th><th>Puntualidad</th><th>Estado</th><th>Última ubicación</th></tr></thead>
      <tbody>${hoy.map(w=>{
        const a=asisDe(w.id);
        return `<tr class="cl${fl("wo:"+w.id)}" data-a="woVer" data-id="${w.id}">
          <td style="font-weight:650">${esc(tecN(w.tec))}</td>
          <td class="mono" style="font-weight:700">WO-${w.id}</td>
          <td>${esc(P(w.prop).nombre)} · ${esc(U(w.unidad).num)}</td>
          <td class="mono">${esc(w.horaProg||"9:00")}</td>
          <td class="mono">${a?`<b>${esc(a.horaReal)}</b>`:'<span style="color:var(--faint)">—</span>'}</td>
          <td>${a?`<span class="pill ${a.puntualidad==="Tarde"?"w":"v"}"><span class="dot"></span>${esc(a.puntualidad)}</span>`
                 :'<span class="pill g">sin marcar</span>'}</td>
          <td><span class="pill ${estP(w.estado)}"><span class="dot"></span>${esc(w.estado)}</span></td>
          <td style="font-size:11.5px;color:var(--soft)">${a?esc(a.ubicacion):'<span style="color:var(--faint)">sin dato</span>'}</td></tr>`;
      }).join("")}</tbody></table>`:`<div class="empty">Nada asignado todavía</div>`}
  </div>
  <div class="tr">La llegada la marca el técnico desde su celular. Hoy la columna <code>Asistencia</code> de <code>Schedule</code> es un Sí/No que pone alguien de oficina, sin hora y sin respaldo.</div>`;
}

function vAsis(){
  return `<div class="card"><div class="chd"><h3>Historial de asistencia</h3>
    <span class="s">${S.asistencias.length} registros</span></div>
    ${S.asistencias.length?`<table><thead><tr><th>Fecha</th><th>Técnico</th><th>WO</th><th>Programada</th><th>Llegó</th><th>Puntualidad</th><th>Ubicación</th></tr></thead>
    <tbody>${S.asistencias.slice().reverse().map(a=>`<tr>
      <td class="mono">${esc(a.fecha)}</td><td style="font-weight:650">${esc(tecN(a.tec))}</td>
      <td class="mono">WO-${a.wo}</td><td class="mono">${esc(a.horaProg)}</td><td class="mono"><b>${esc(a.horaReal)}</b></td>
      <td><span class="pill ${a.puntualidad==="Tarde"?"w":"v"}">${esc(a.puntualidad)}</span></td>
      <td style="font-size:11.5px;color:var(--soft)">${esc(a.ubicacion)}</td></tr>`).join("")}
    </tbody></table>`:`<div class="empty">Todavía nadie ha marcado llegada.<br><span style="font-size:12px">Abre el celular del técnico y toca «Ya llegué».</span></div>`}
  </div>`;
}

const vTecLista = () => `
  <div class="card"><table>
    <thead><tr><th>Técnico</th><th>Especialidad</th><th>Zona</th><th>Teléfono</th><th class="num">WO semana</th><th>Última ubicación</th><th>Estado</th><th></th></tr></thead>
    <tbody>${S.tecnicos.map(t=>{
      const n=S.wos.filter(w=>w.tec===t.id&&w.semana===S.semana).length;
      const b=S.disponibilidad.find(d=>d.tec===t.id&&d.estado==="Aprobado");
      const u=ultUbic(t.id);
      return `<tr class="${fl("tec:"+t.id)}"><td style="font-weight:650">${esc(tecN(t.id))}
        <div style="font-size:10.5px;color:var(--faint)">${esc(t.dir)}</div></td>
        <td>${t.esp.map(e=>`<span class="pill g">${esc(e)}</span>`).join(" ")}</td>
        <td>${esc(t.zona)}</td><td class="mono">${esc(t.tel)}</td>
        <td class="num mono">${n}</td>
        <td style="font-size:11.5px;color:var(--soft)">${u?esc(u):'<span style="color:var(--faint)">base: '+esc(t.zona)+'</span>'}</td>
        <td>${!t.activo?'<span class="pill g">Dado de baja</span>'
             :b?`<span class="pill r"><span class="dot"></span>${esc(b.motivo)} ${b.desde.slice(5)}–${b.hasta.slice(5)}</span>`
               :'<span class="pill v">Disponible</span>'}</td>
        <td style="text-align:right;white-space:nowrap"><button class="btn sm" data-a="tecNuevo" data-id="${t.id}">Editar</button>
          <button class="btn sm ${t.activo?"":"v"}" data-a="tecBaja" data-id="${t.id}">${t.activo?"Dar de baja":"Reactivar"}</button></td></tr>`;
    }).join("")}</tbody></table></div>
  <div class="tr">La «última ubicación» es lo que UC-09 usa para sugerir al técnico más cercano. Sale sola de la llegada que él marca.</div>`;

/* ── TARIFARIO ── Ingreso Fijo + Ingreso Variable, juntos ── */
VIEWS.tarifario = () => {
  const ts=S.tarifas.filter(t=>!t.prop);
  return `
  <div class="ph"><div><h2>Tarifario</h2>
    <p>Precios generales, de <code>Ingreso Fijo</code> — aplican a toda propiedad que no tenga una negociada aparte.</p></div>
    <div class="act"><button class="btn p" data-a="tarNueva">+ Nueva tarifa</button></div></div>
  <div class="card"><table>
    <thead><tr><th>Tipo</th><th>Servicio</th><th>Detail</th><th>Piso</th><th>Baños</th><th>Description</th><th class="num">Price</th><th></th></tr></thead>
    <tbody>${ts.map(t=>{
      return `<tr class="${fl('tar:'+t.id)}">
      <td>${esc(t.cat)||"—"}</td><td>${esc(t.serv)||"—"}</td><td>${esc(t.variante)||"—"}</td>
      <td>${t.pisos!=null?"Floor "+t.pisos:'<span class="pill g">cualquiera</span>'}</td>
      <td>${t.banos!=null?t.banos:'<span class="pill g">—</span>'}</td><td>${esc(t.desc)||"—"}</td>
      <td class="num mono">${money(t.precio)}</td>
      <td style="text-align:right"><button class="btn sm" data-a="tarNueva" data-id="${t.id}">Editar</button></td></tr>`;
    }).join("")}</tbody></table></div>
  <div class="note"><b>Cómo resuelve el precio</b> — la misma llave de su Tabla Maestra (Rooms + Pisos + Servicio), en cuatro pasos:
    primero la tarifa negociada de esa propiedad para esos pisos; si no, la de la propiedad para cualquier piso;
    si no, la general para esos pisos; si no, la general para cualquier piso. Si no hay ninguna, levanta una
    <b>excepción</b> en vez de inventar un número.</div>
  <div class="note w" style="margin-top:9px"><b>Para evitar vueltas:</b> dejar los pisos en <i>«cualquiera»</i> cuando el precio no cambia por pisos.
    Así se carga una fila por servicio en vez de tres. Solo se especifica el piso donde de verdad cambia el precio, como en Studio.</div>
  <div class="tr" style="margin-top:8px">El técnico solo ve la columna <b>«se paga»</b> — nunca el precio al cliente.</div>`;
};

/* ── CATÁLOGOS ── cada lista es una tabla, no una constante del código ── */
/* ── RENOMBRAR UN VALOR DE CATÁLOGO ───────────────────────────────────────
   En el sistema construido cada valor de catálogo es una fila con su id, y la
   Work Order guarda ESE id. Renombrar «Navarre» a «Navarre Beach» es cambiar
   una etiqueta: nadie guardó el texto, así que no hay nada que migrar.

   Este prototipo guarda el texto porque lo copié tal cual de la celda del Excel
   —que es lo que hace su archivo hoy— y ahí sí quedaría desincronizado. Para
   que se comporte igual que el sistema real, renombrar recorre las referencias
   y las actualiza en el mismo paso. Efecto idéntico: el nombre cambia en todas
   partes, incluido el histórico, y no se pierde ni un registro. */
const lineasEst = () => S.estimados.reduce((a,e)=>a.concat(e.lineas),[]);
const REFS = {
  zonas:         [{a:()=>S.propiedades,c:"zona",    n:"propiedad(es)"},
                  {a:()=>S.tecnicos,   c:"zona",    n:"técnico(s)"}],
  categorias:    [{a:()=>S.wos,        c:"cat",     n:"Work Order(s)"},
                  {a:()=>S.tarifas,    c:"cat",     n:"tarifa(s)"},
                  {a:()=>CAT.servicios,c:"tipo",    n:"servicio(s)"},
                  {a:()=>lineasEst(),  c:"cat",     n:"línea(s) de estimado"}],
  adicionales:   [{a:()=>S.adicionales,c:"concepto",n:"adicional(es)"}],
  ubicaciones:   [{a:()=>S.wos,        c:"ubic",    n:"Work Order(s)"},
                  {a:()=>S.adicionales,c:"ubic",    n:"adicional(es)"}],
  rooms:         [{a:()=>S.unidades,   c:"rooms",   n:"unidad(es)"},
                  {a:()=>S.tarifas,    c:"variante",n:"tarifa(s)"}],
  especialidades:[{a:()=>S.tecnicos,   c:"esp",     n:"técnico(s)", lista:true}],
  tiendas:       [{a:()=>S.movs,       c:"tienda",  n:"movimiento(s) de inventario"}],
  pisos:         [{a:()=>S.unidades,   c:"pisos",   n:"unidad(es)"},
                  {a:()=>S.tarifas,    c:"pisos",   n:"tarifa(s)"}],
  folder:        [],
  servicios:     [{a:()=>S.wos,        c:"serv",    n:"Work Order(s)"},
                  {a:()=>S.tarifas,    c:"serv",    n:"tarifa(s)"},
                  {a:()=>lineasEst(),  c:"serv",    n:"línea(s) de estimado"}]
};
const usosDe = (k,v) => (REFS[k]||[])
  .map(r=>({n:r.n, c:r.a().filter(o => r.lista
      ? (o[r.c]||[]).includes(v) : String(o[r.c])===String(v)).length}))
  .filter(x=>x.c>0);
function renombrarCat(k, viejo, nuevo){
  let tocados=0;
  (REFS[k]||[]).forEach(r=>r.a().forEach(o=>{
    if(r.lista){ const i=(o[r.c]||[]).indexOf(viejo); if(i>-1){ o[r.c][i]=nuevo; tocados++; } }
    else if(String(o[r.c])===String(viejo)){ o[r.c]=nuevo; tocados++; }
  }));
  if(S.bajas[k]) S.bajas[k]=S.bajas[k].map(x=>x===viejo?nuevo:x);
  return tocados;
}
/* Hay valores que el propio sistema usa por su nombre para decidir. Renombrarlos
   se permite, pero avisando: en el sistema construido esto se ata al id y deja
   de ser un riesgo — aquí conviene que se vea que existe. */
const OJO_LOGICA = {
  especialidades:{Supervisor:"El sistema usa «Supervisor» para saber quién puede supervisar y para excluirlo de las asignaciones."},
  categorias:{Repair:"Los tipos que exigen ubicación dentro de la unidad están atados a este nombre.",
              Cabinet:"Los tipos que exigen ubicación dentro de la unidad están atados a este nombre.",
              Resurface:"Los tipos que exigen ubicación dentro de la unidad están atados a este nombre.",
              Installation:"Los tipos que exigen ubicación dentro de la unidad están atados a este nombre.",
              Ceramica:"Los tipos que exigen ubicación dentro de la unidad están atados a este nombre."}
};

const LISTAS = [
  {k:"zonas",        n:"Zonas (Area)",              col:"Schedule.Location", ojo:"Hoy NO tiene desplegable: se escribe libre. De ahí salen «Navarre» y «navarre»."},
  {k:"categorias",   n:"Tipos de servicio",         col:"Catalogo!H → Kind of Service"},
  {k:"adicionales",  n:"Conceptos de adicional",    col:"Catalogo!P → Aditional", ojo:"Es una lista distinta de los servicios: son trabajos extra, no servicios que se venden."},
  {k:"ubicaciones",  n:"Ubicaciones (Where)",       col:"Catalogo!Q"},
  {k:"rooms",        n:"Rooms",                     col:"Catalogo!F", ojo:"Define la tarifa junto con los pisos."},
  {k:"pisos",        n:"Pisos",                     col:"Catalogo!G"},
  {k:"especialidades",n:"Especialidades",           col:"Tecnicos.Specialist", ojo:"Hoy está escrita dentro de la validación, no en una tabla."},
  {k:"folder",       n:"Estado de la carpeta",      col:"Catalogo!W → Final mail"},
  {k:"tiendas",      n:"Tiendas / proveedores",     col:"Sheet13"}
];

VIEWS.catalogos = () => {
  const t = S.tab || "listas";
  return `
  <div class="ph"><div><h2>Catálogos</h2>
    <p>Las listas que alimentan cada desplegable. Son datos del sistema: se agregan y se quitan aquí, sin tocar nada más.</p></div></div>
  <div class="tabs">${[["listas","Listas simples"],["servicios","Servicios por tipo"],["estados","Estados de la Work Order"]]
    .map(([k,n])=>`<button class="tab ${t===k?"on":""}" data-a="tab" data-t="${k}">${n}</button>`).join("")}</div>

  ${t==="listas"?`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:14px">
    ${LISTAS.map(L=>{ const nBaja=(S.bajas[L.k]||[]).length; return `<div class="card" style="margin:0">
      <div class="chd"><h3>${esc(L.n)}</h3><span class="r"><span class="pill g">${activos(L.k).length} activos</span>
        ${nBaja?`<span class="pill w">${nBaja} de baja</span>`:""}
        <button class="btn sm p" data-a="catAdd" data-k="${L.k}" data-n="${esc(L.n)}">+</button></span></div>
      <div class="cp" style="display:flex;flex-wrap:wrap;gap:5px">
        ${CAT[L.k].map((v,i)=>debaja(L.k,v)
          ? `<span class="pill g" style="padding-right:4px;opacity:.5;text-decoration:line-through">${esc(v)}
              <button data-a="catAlta" data-k="${L.k}" data-i="${i}" title="Reactivar"
                style="background:none;border:none;color:var(--verde);padding:0 3px;font-size:12px;line-height:1;text-decoration:none">↺</button></span>`
          : `<span class="pill g${fl("cat:"+L.k+":"+v)}" style="padding-right:4px">${esc(v)}
              <button data-a="catRen" data-k="${L.k}" data-i="${i}" title="Renombrar"
                style="background:none;border:none;color:var(--azul);padding:0 3px;font-size:11px;line-height:1">✎</button>
              <button data-a="catDel" data-k="${L.k}" data-i="${i}" title="Dar de baja"
                style="background:none;border:none;color:var(--faint);padding:0 3px;font-size:13px;line-height:1">×</button></span>`).join("")}
      </div>
      <div class="cp" style="border-top:1px solid var(--line);padding-top:8px">
        <div style="font-size:10.5px;color:var(--faint)">Hoy en: <code style="font-family:Consolas,monospace">${esc(L.col)}</code></div>
        ${L.ojo?`<div style="font-size:10.5px;color:var(--ambar);margin-top:3px">${esc(L.ojo)}</div>`:""}</div>
    </div>`;}).join("")}</div>
    <div class="note" style="margin-top:14px"><b>Aquí nada se borra.</b> Un valor dado de baja deja de ofrecerse para registros nuevos,
      pero sigue mostrándose en todo lo que ya lo usaba — y se puede reactivar con <b>↺</b>. Así ningún registro queda huérfano.<br>
      Y si el nombre está mal escrito, <b>✎</b> lo <b>renombra</b>: es el mismo valor con otra etiqueta, así que todo lo que ya lo usaba pasa a decir el nombre nuevo. No hay que dar de baja y volver a crear.</div>`:""}

  ${t==="servicios"?`<div class="card"><div class="chd"><h3>Servicios, colgando de su tipo</h3>
    <span class="s">hoy <code>Catalogo!I</code> es una lista plana; por eso <code>Paint_services</code> y <code>Repair_services</code> quedaron vacías</span>
    <span class="r"><button class="btn sm p" data-a="servAdd">+ Nuevo servicio</button></span></div>
    <table><thead><tr><th style="width:190px">Tipo de servicio</th><th>Servicios (subservicios)</th></tr></thead><tbody>
    ${CAT.categorias.map(c=>{
      const ss=servTodos(c);
      return `<tr><td style="font-weight:650">${esc(c)}<div style="font-size:10.5px;color:var(--faint)">${ss.filter(s=>!s.baja).length} activo(s)${ss.some(s=>s.baja)?" · "+ss.filter(s=>s.baja).length+" de baja":""}</div></td>
      <td style="padding:8px 12px"><div style="display:flex;flex-wrap:wrap;gap:5px">
        ${ss.map(s=>s.baja
          ? `<span class="pill g" style="padding-right:4px;opacity:.5;text-decoration:line-through">${esc(s.nombre)}
              <button data-a="servAlta" data-id="${s.id}" title="Reactivar"
                style="background:none;border:none;color:var(--verde);padding:0 3px;font-size:12px;line-height:1;text-decoration:none">↺</button></span>`
          : `<span class="pill a${fl("serv:"+s.id)}" style="padding-right:4px">${esc(s.nombre)}
              <button data-a="servRen" data-id="${s.id}" title="Renombrar"
                style="background:none;border:none;color:inherit;opacity:.7;padding:0 3px;font-size:11px;line-height:1">✎</button>
              <button data-a="servDel" data-id="${s.id}" title="Dar de baja"
                style="background:none;border:none;color:inherit;opacity:.6;padding:0 3px;font-size:13px;line-height:1">×</button></span>`).join("")
          ||'<span style="color:var(--faint);font-size:11.5px">sin servicios — no se puede agendar este tipo</span>'}</div></td></tr>`;
    }).join("")}</tbody></table>
    <div class="cp" style="border-top:1px solid var(--line)"><div class="tr" style="margin:0">Al elegir el tipo en una Work Order, el desplegable de servicio se filtra solo. Es lo que intentaron con las columnas <code>Clean_services</code> y compañía.</div></div></div>`:""}

  ${t==="estados"?`<div class="card"><div class="chd"><h3>Completion Status</h3>
    <span class="s">los 10 que ya usan, más el único que su Dashboard mide y no existe</span></div>
    <table><thead><tr><th>Estado</th><th>Origen</th><th>Qué significa</th></tr></thead><tbody>
    ${CAT.estados.map(e=>`<tr><td><span class="pill ${e.p}"><span class="dot"></span>${esc(e.n)}</span></td>
      <td>${e.nuevo?'<span style="color:var(--ambar);font-size:11.5px">nuevo</span>':'<span style="color:var(--faint);font-size:11.5px">ya lo usan</span>'}</td>
      <td style="font-size:11.5px;color:var(--soft)">${esc({
        "Scheduled":"Agendada, sin técnico todavía","Confirmed":"Con técnico asignado y confirmado",
        "In progress":"El técnico está en la propiedad","Esperando aprobación":"Frenada por un adicional sin decidir",
        "Detenido":"Empezó pero está frenado por algo externo","Completed":"Trabajo terminado","Pending":"En espera de algo externo","Rescheduled":"Se movió de fecha",
        "Returned":"El cliente la devolvió","Corrected":"Se corrigió una devolución","Canceled":"Cancelada",
        "Inspeccion":"Visita de inspección, no es trabajo"}[e.n]||"")}</td></tr>`).join("")}
    </tbody></table>
    <div class="cp" style="border-top:1px solid var(--line)"><div class="note w" style="margin:0">
      <b>Facturado y pagado no son estados.</b> Van como marca aparte, igual que las columnas <code>Invoice</code> y <code>Pagado</code> de su Payroll — así una Work Order puede estar <i>Completed</i> y facturada al mismo tiempo sin perder su estado real.</div></div></div>`:""}`;
};

/* ── UC-06 ── Expediente de la propiedad: 9 campos que bloquean el paso a programación ── */
/* Qué campo del formulario corresponde a cada fila del expediente: la fila que
   dice «falta» tiene que llevarte al campo, no dejarte buscándolo. */
/* El Management no bloquea el expediente: Claudia crea la propiedad sin saberlo
   todavia — "es abstracto, podrian demorar en conseguirlo" — y se vincula despues. */
const CAMPO_INPUT = {nombre:"nP", dir:"nD", zona:"nZ",
                     door:"nDC", pref:"nPR", aprob:"nAP", notas:"nNT", notasPaint:"nPaint"};
VIEWS.clientes = () => `
  <div class="ph"><div><h2>Management</h2><p>El punto de entrada. Hoy esto no existe: se salta directo a la propiedad.</p></div>
    <div class="act"><button class="btn p" data-a="cliNuevo">+ Nuevo</button></div></div>
  <div class="card"><table>
    <thead><tr><th>Nombre</th><th>Contacto</th><th>Teléfono</th><th>Correo</th><th class="num">Propiedades</th><th>Documentos</th><th></th></tr></thead>
    <tbody>${S.clientes.map(c=>`<tr class="${fl("cli:"+c.id)}"><td style="font-weight:650">${esc(c.nombre)}</td>
      <td>${esc(c.contacto)}</td><td class="mono">${esc(c.tel)}</td><td>${esc(c.mail)}</td>
      <td class="num mono">${S.propiedades.filter(p=>p.cliente===c.id).length}</td>
      <td><button class="btn sm" data-a="cliDocsModal" data-id="${c.id}">${(c.vendorPacket==="Recibido"?1:0)+(c.w9==="Recibido"?1:0)}/2${c.vendorPacketPdf||c.w9Pdf?` 📎`:""}</button></td>
      <td style="text-align:right"><button class="btn sm" data-a="cliNuevo" data-id="${c.id}">Editar</button></td></tr>`).join("")}</tbody></table></div>
  <div class="tr">El sistema avisa si el teléfono ya existe, para no duplicar el mismo management dos veces. Y si algo se tecleó mal, <b>Editar</b> lo arregla: el valor anterior queda en la Bitácora. Client Status, Client Source e historial de comunicación se registran en cada <b>Propiedad</b>, no aquí — un mismo management puede tener varias, cada una con su propio estado.</div>`;

/* UC-05 — el COI lo emite la aseguradora, no Cordova. Sin COI vigente no se manda a nadie a trabajar.
   Un mismo certificado (ACORD 25) trae varias pólizas — General Liability, Auto, Workers Comp, a
   veces Umbrella — cada una con su propio vencimiento. Solo está vigente si TODAS lo están. */
