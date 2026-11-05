"use strict";
VIEWS.propiedades = () => {
  if(S.sub) return fichaProp(S.sub);
  return `
  <div class="ph"><div><h2>Propiedades</h2>
    <p>La pestaña <code>Propiedades</code>. Los tres contactos dejan de ser 9 columnas repetidas y las unidades dejan de vivir sueltas.</p></div>
    <div class="act"><button class="btn p" data-a="propNueva">+ Nueva propiedad</button></div></div>
  <div class="card"><table>
    <thead><tr><th>Propiedad</th><th>City</th><th>Cliente (Management)</th><th class="num">Unidades</th><th class="num">Contactos</th><th>COI</th><th>Estado</th></tr></thead>
    <tbody>${S.propiedades.map(p=>{
      const nu=S.unidades.filter(u=>u.prop===p.id).length, nc=S.contactos.filter(c=>c.prop===p.id).length;
      const sMon=saldoCredito(p.id), sd=credServSaldos(p.id);
      return `<tr class="cl${fl("prop:"+p.id)}" data-a="propVer" data-id="${p.id}">
        <td style="font-weight:650">${esc(p.nombre)}${sMon>0?` <span class="pill v" style="font-size:10px" title="Crédito a favor: ${money(sMon)}">💳 ${money(sMon)}</span>`:sd.length?` <span class="pill a" style="font-size:10px" title="Servicios a favor">💳 Servicios</span>`:""}<div style="font-size:10.5px;color:var(--faint)">${esc(p.dir)}</div></td>
        <td>${esc(ciudadProp(p))}</td><td>${p.cliente?esc(CLI(p.cliente).nombre):'<span style="color:var(--faint)">—</span>'}<div style="font-size:10.5px;color:var(--faint)">${esc(estadoProp(p))}</div></td>
        <td class="num mono">${nu}</td><td class="num mono">${nc}</td>
        <td>${p.polizas&&p.polizas.length?`<span class="pill ${coiVigente(p.id)?(p.polizas.some(coiPorVencer)?"a":"v"):"r"}">${esc(p.polizas.reduce((a,x)=>!a||x.vence<a?x.vence:a,null))}</span>`:`<span class="pill r"><span class="dot"></span>falta</span>`}</td>
        <td>${p.activa?'<span class="pill v">Activa</span>':'<span class="pill g">Sin movimiento</span>'}</td></tr>`;
    }).join("")}</tbody></table></div>
  <div class="tr">Hoy <code>Active?</code> está lleno en muy pocas propiedades, así que «¿sigue activa?» no se puede responder. Aquí es un campo con dos valores y nada más.</div>`;
};

function fichaProp(id){
  const p=P(id), t=S.tab||"datos";
  const us=S.unidades.filter(u=>u.prop===id), cs=S.contactos.filter(c=>c.prop===id);
  const ws=S.wos.filter(w=>w.prop===id);
  const tf=S.tarifas.filter(x=>x.prop===id && !tarOculta(x)), nTf=tf.filter(tarActiva).length, nVacios=tf.length-nTf;
  const coms=S.comunicaciones.filter(m=>m.prop===id);
  const sMon = saldoCredito(id), sd = credServSaldos(id);
  return `
  <div class="ph"><div>
    <button class="btn sm" data-a="ir" data-m="propiedades" style="margin-bottom:7px">‹ Propiedades</button>
    <h2>${esc(p.nombre)} ${p.activa?"":'<span class="pill g" style="vertical-align:middle">Dada de baja</span>'}</h2>
    <p>${esc(ciudadProp(p))} · ${p.cliente?esc(CLI(p.cliente).nombre):'<span style="color:var(--faint)">sin management</span>'} · ${esc(p.dir)}</p></div>
    <div class="act"><button class="btn" data-a="propNueva" data-id="${id}">Editar datos</button>
      <button class="btn ${p.activa?"":"v"}" data-a="propBaja" data-id="${id}">
      ${p.activa?"Dar de baja":"Reactivar"}</button></div></div>
  ${puedeVerIngreso() && (sMon > 0 || sd.length > 0) ? `
    <div class="note v" style="margin:0 0 12px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <b>💳 Crédito disponible:</b>
        ${sMon > 0 ? `<span class="pill v" style="font-size:12px;font-weight:700">${money(sMon)}</span>` : ""}
        ${sd.length ? `<span><b>Servicios a favor:</b> ${sd.map(x=>`<span class="pill a">${esc(x.serv)} ×${x.saldo}${x.unidad?` (${esc(U(x.unidad).num)})`:""}</span>`).join(" ")}</span>` : ""}
      </div>
      <div><button class="btn sm" data-a="tab" data-t="datos">Ver tarjetas de crédito ↓</button></div>
    </div>` : ""}
  <div class="tabs">${[["datos","Datos"],["expediente",`Expediente ${expedienteOK(id)?"✓":"— incompleto"}`],["documentos","Documentos"],["unidades",`Unidades (${us.length})`],["contactos",`Contactos (${cs.length})`],["com",`Comunicación (${coms.length})`],["precios",`Price List (${nTf})`],["previo",`Informes de campo (${S.reportes.filter(r=>r.prop===id).length})`],["hist",`Historial (${ws.length})`]]
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
            /* "estimado" tampoco es un campo de la propiedad (p[c.k] no
               existe ahí) — mostraba literal "undefined" en vez del dato
               real. Se trata aparte, como los contactos y el COI. */
            : c.k==="estimado" ? (S.estimados.find(e=>e.prop===id && e.estado==="Aprobado")||{}).num+" aprobado"
            : c.k==="zona" ? ciudadProp(p)
            : String(p[c.k]))
        : "falta"}</td>
      <td style="text-align:right">${c.ok?"":(c.k==="contacto"
        ? `<button class="btn sm p" data-a="conNuevo" data-prop="${id}">+ Contacto</button>`
        : c.k==="coi" ? `<button class="btn sm p" data-a="coiDirecto" data-id="${id}">Registrar COI</button>`
        /* "Estimado aprobado" no es un campo de la propiedad (nombre,
           dirección, etc.) — es un dato de otra colección. "Completar" lo
           mandaba al formulario de "Editar propiedad", que no tiene ningún
           campo para eso: el botón parecía funcionar pero no resolvía nada. */
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
      <td class="mono">${esc(x.poliza)||"—"}</td><td><span class="pill ${coiPill(x)}">${esc(x.vence)||"—"}</span>${coiPorVencer(x)?` <span style="font-size:11px;color:var(--faint)">${coiDiasTxt(x)}</span>`:""}</td></tr>`).join("")}
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
    <tr><td style="color:var(--faint);width:210px">City</td><td>${esc(ciudadProp(p))}</td></tr>
    <tr><td style="color:var(--faint)">Management</td><td>${p.cliente
      ?esc(CLI(p.cliente).nombre)
      :`<span style="color:var(--faint)">— sin management —</span> <button class="btn sm" data-a="cliNuevo" data-prop="${id}" style="margin-left:8px">+ Registrar management</button>`}</td></tr>
    <tr><td style="color:var(--faint)">Client Status</td><td><span class="pill ${ESTCOL[estadoProp(p)]||"w"}">${esc(estadoProp(p)||"—")}</span></td></tr>
    <tr><td style="color:var(--faint)">Vendedor</td><td>${p.vendedor?esc(p.vendedor):"—"}</td></tr>
    <tr><td style="color:var(--faint)">Client Source</td><td>${esc(p.origen||"—")}</td></tr>
    <tr><td style="color:var(--faint)">Dirección</td><td>${esc(p.dir)}</td></tr>
    <tr><td style="color:var(--faint)">Crédito</td><td>${diasCreditoProp(id)} días</td></tr>
    <tr><td style="color:var(--faint)">Gate code</td><td class="mono">${esc(p.door)}</td></tr>
    <tr><td style="color:var(--faint)">Default Contact Method</td><td>${esc(p.pref)}</td></tr>
    <tr><td style="color:var(--faint)">Approval Method</td><td>${esc(p.aprob)}</td></tr>
    <tr><td style="color:var(--faint)">Accounts Payable Email 1</td><td>${esc(p.mailAP1)||"—"}</td></tr>
    <tr><td style="color:var(--faint)">Accounts Payable Email 2</td><td>${esc(p.mailAP2)||"—"}</td></tr>
    <tr><td style="color:var(--faint)">Special Property Requirements</td><td>${p.notas?`<b>${esc(p.notas)}</b>`:"—"}</td></tr>
    <tr><td colspan="2" style="padding-top:14px"><b style="font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--faint)">Información para el técnico</b></td></tr>
    <tr><td style="color:var(--faint)">Dónde está el shop</td><td>${esc(p.shop)||"—"}</td></tr>
    <tr><td style="color:var(--faint)">Código del shop</td><td class="mono">${esc(p.shopCode)||"—"}</td></tr>
    <tr><td style="color:var(--faint)">Horario</td><td>${esc(p.horario)||"—"}</td></tr>
    <tr><td style="color:var(--faint)">Información de pintura</td><td>${p.notasPaint?esc(p.notasPaint):(S.pinturas||[]).some(x=>x.prop===id)?'<span style="color:var(--soft)">ver la tarjeta Pinturas de abajo</span>':'<span style="color:var(--rojo)">— falta, bloquea el Expediente —</span>'}</td></tr>
    <tr><td style="color:var(--faint)">Al terminar</td><td>${esc(p.finalExp)||"—"}</td></tr>
    <tr><td style="color:var(--faint)">Ojo</td><td>${esc(p.notasTec)||"—"}</td></tr>
    <tr><td style="color:var(--faint)">Activa</td><td>${p.activa?'<span class="pill v">Sí</span>':'<span class="pill g">No</span>'}</td></tr>
  </tbody></table></div>
  <div class="card" style="margin-top:14px"><div class="chd"><h3>Pinturas</h3>
    <span class="s">lo que usan en esta propiedad — se agrega una fila por superficie</span>
    <span class="r"><button class="btn sm p" data-a="pinturaNueva" data-id="${id}">+ Agregar pintura</button></span></div>
    ${(S.pinturas||[]).filter(x=>x.prop===id).length?`<table><thead><tr><th>Superficie</th><th>Marca</th><th>Color</th><th>Código</th><th>Acabado</th><th>Nota</th><th></th></tr></thead><tbody>
      ${(S.pinturas||[]).filter(x=>x.prop===id).map(x=>`<tr><td style="font-weight:650">${esc(x.superficie)}</td><td>${esc(x.marca)||"—"}</td><td>${esc(x.color)||"—"}</td><td class="mono">${esc(x.codigo)||"—"}</td><td>${esc(x.acabado)||"—"}</td><td style="color:var(--soft)">${esc(x.nota)||"—"}</td>
        <td style="text-align:right;white-space:nowrap"><button class="btn sm" data-a="pinturaNueva" data-id="${id}" data-pin="${esc(x.id)}">Editar</button> <button class="btn sm r" data-a="pinturaQuitar" data-id="${id}" data-pin="${esc(x.id)}">Quitar</button></td></tr>`).join("")}
    </tbody></table>`:`<div class="empty">Sin pinturas cargadas${p.notasPaint?" — la nota «Información de pintura» de arriba sigue valiendo":""}</div>`}</div>
  ${puedeVerIngreso()?`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:14px;margin-top:14px">${(()=>{ const mv=(S.creditosProp||[]).filter(c=>c.prop===id).slice().reverse();
    return `<div class="card"><div class="chd"><h3>Crédito: ${money(saldoCredito(id))}</h3>
      <span class="s">Se usa a mano en el borrador de factura</span>
      <span class="r"><button class="btn sm p" data-a="creditoNuevo" data-id="${id}">Agregar crédito</button></span></div>
      ${mv.length?`<table><thead><tr><th>Fecha</th><th>Tipo</th><th>Motivo</th><th>Unidad</th><th>Quién</th><th class="num">Monto</th></tr></thead><tbody>
        ${mv.slice(0,8).map(c=>`<tr><td class="mono">${esc(c.fecha)}</td><td><span class="pill ${c.tipo==="Abono"?"v":"a"}">${esc(c.tipo)}</span></td>
          <td>${esc(c.motivo)}</td><td class="mono">${c.unidad?esc(U(c.unidad).num):"—"}</td><td>${esc(c.quien)}</td><td class="num mono">${c.tipo==="Abono"?"":"−"}${money(c.monto)}</td></tr>`).join("")}
      </tbody></table>`:`<div class="empty">Sin movimientos</div>`}</div>`; })()}${(()=>{ const mv=(S.creditosServ||[]).filter(c=>c.prop===id).slice().reverse(), sd=credServSaldos(id);
    return `<div class="card"><div class="chd"><h3>Créditos de servicio</h3>
      <span class="s">${sd.length?sd.map(x=>esc(x.serv)+" × "+x.saldo+(x.unidad?" · "+esc(U(x.unidad).num):"")).join(" · "):"Sin saldo"}</span>
      <span class="r"><button class="btn sm p" data-a="creditoServNuevo" data-id="${id}">Agregar</button></span></div>
      ${mv.length?`<table><thead><tr><th>Fecha</th><th>Tipo</th><th>Servicio</th><th>Unidad</th><th>Nota</th><th class="num">Cant.</th></tr></thead><tbody>
        ${mv.slice(0,8).map(c=>`<tr><td class="mono">${esc(c.fecha)}</td><td><span class="pill ${c.tipo==="Abono"?"v":"a"}">${esc(c.tipo)}</span></td>
          <td>${esc(c.serv)}</td><td class="mono">${c.unidad?esc(U(c.unidad).num):"—"}</td><td>${esc(c.motivo)}</td><td class="num mono">${c.tipo==="Abono"?"":"−"}${c.cant}</td></tr>`).join("")}
      </tbody></table>`:`<div class="empty">Sin movimientos</div>`}</div>`; })()}</div>`:""}`:""}

  ${t==="unidades"?`<div class="card"><div class="chd"><h3>Unidades</h3>
    <span class="s">catálogo de referencia — no bloquea agendar, se va llenando solo con cada WO/Estimado</span>
    <span class="r"><button class="btn sm p" data-a="uniNueva" data-prop="${id}">+ Unidad</button></span></div>
    ${us.length?`<table><thead><tr><th>Building</th><th>Unidad</th><th>Location</th><th>Door code</th><th class="num">Floor</th><th>Rooms</th><th class="num">Bathrooms</th><th>Occupancy</th><th>Detail</th><th class="num">Work Orders</th><th></th></tr></thead><tbody>
    ${us.map(u=>`<tr class="${fl("uni:"+u.id)}"><td class="mono">${esc(u.building)||"—"}</td><td style="font-weight:650">${esc(u.unidadNum||u.num)}</td>
      <td style="font-size:11.5px;color:var(--soft)">${esc(u.ubicacionUnidad)||"—"}</td><td class="mono">${esc(u.doorCode)||"—"}</td><td class="num mono">${u.pisos}</td>
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

  ${t==="com"?`<div class="card"><div class="chd"><h3>Comunicación con el cliente</h3>
    <span class="s">Bitácora interna manual de oficina — registro de llamadas, mensajes y correos con el cliente (no envía correos automáticos).</span></div>
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

  ${t==="precios"?(()=>{
    if(S.vigModo===id && nTf) return vigenciaHTML(id);   // modo «Precios con vigencia»: reemplaza la tabla de abajo
    const off=S.tarOff||[], marcado=x=>tarActiva(x)&&!off.includes(String(x.id));
    const nSel=tf.filter(marcado).length;
    const filas=tf.slice().sort((a,b)=>String(a.cat).localeCompare(String(b.cat))||String(a.serv).localeCompare(String(b.serv))||((a.pisos==null?-1:a.pisos)-(b.pisos==null?-1:b.pisos)));
    return `${nTf?vigFraseLista(id):`<div class="vig-frase vig-frase-lista n">Esta propiedad todavía usa la tarifa general. Para preparar un cambio de precios, primero pulsa «Crear lista completa»: copia los precios de hoy a esta propiedad y desde ahí los cambias.</div>`}<div class="card"><div class="chd"><h3>Price List</h3>
    <span class="s">exclusivos de esta propiedad — mandan sobre la tarifa general${nVacios?` · <b>${nVacios} por llenar</b>`:""}</span>
    <span class="r" style="display:flex;gap:6px;flex-wrap:wrap">
      ${nTf?`<button class="btn sm" data-a="vigAbrir" data-id="${id}" title="Prepara una lista nueva con fecha de entrada, sin tocar los precios de hoy">Preparar cambio de precios</button>
      <button class="btn sm" data-a="precPDF" data-id="${id}" ${nSel?"":"disabled"} title="Genera un PDF con los precios marcados — sin pagos al técnico">Descargar PDF${nSel?` (${nSel})`:""}</button>
      <button class="btn sm" data-a="precPDF" data-id="${id}" data-correo="1" ${nSel?"":"disabled"} title="Genera el PDF y deja el correo listo con los contactos de la propiedad">Enviar por correo</button>`:""}
      ${puede("tarifario")?`<button class="btn sm ${nTf?"":"p"}" data-a="preciosDesdeGeneral" data-id="${id}" title="Trae la tarifa general y los servicios del catálogo que faltan; no duplica nada">Crear lista completa</button>
      <button class="btn sm" data-a="precLlenar" data-id="${id}">Llenar precios</button>
      <button class="btn sm ${nTf?"p":""}" data-a="tarNueva" data-prop="${id}">+ Nuevo precio</button>`:""}</span></div>
    ${tf.length?`<table><thead><tr>${nTf?`<th style="width:30px"><input type="checkbox" data-a="precMarcaTodos" data-id="${id}" title="Marcar o desmarcar todos" ${nSel===nTf?"checked":""}></th>`:""}<th>Tipo</th><th>Servicio</th><th>Detail</th><th>Piso</th><th>Baños</th><th>Description</th><th class="num">Price</th>${puede("tarifario")?"<th></th>":""}</tr></thead><tbody>
    ${filas.map(x=>`<tr class="${fl("tar:"+x.id)}">${nTf?`<td>${tarActiva(x)?`<input type="checkbox" data-a="tarMarca" data-id="${x.id}" ${marcado(x)?"checked":""}>`:""}</td>`:""}<td>${esc(x.cat)||"—"}</td><td>${esc(x.serv)||"—"}</td><td>${esc(x.variante)||"—"}</td>
      <td>${x.pisos!=null?"Floor "+x.pisos:'<span class="pill g">cualquiera</span>'}</td>
      <td>${x.banos!=null?x.banos:'<span class="pill g">—</span>'}</td><td>${esc(x.desc)||"—"}</td>
      <td class="num mono">${tarActiva(x)?money(x.precio)+vigPillCambia(x):'<span class="pill g">por llenar</span>'}</td>
      ${puede("tarifario")?`<td style="text-align:right"><button class="btn sm" data-a="tarNueva" data-id="${x.id}">Editar</button></td>`:""}</tr>`).join("")}
    </tbody></table>`:`<div class="empty">Sin precios propios — usa la tarifa general</div>`}</div>`;
  })():""}

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
  const tfAll=S.tarifas.filter(t=>t.prop===id && !tarOculta(t)), tf=tfAll.filter(tarActiva).length, porLlenar=tfAll.length-tf;
  const venceMin=(p.polizas||[]).reduce((a,x)=>!a||x.vence<a.vence?x:a,null);
  const es=S.estimados.filter(e=>e.prop===id).length;
  const pasos=[
    {n:"Datos de la propiedad", ok:!!(p.nombre&&p.dir&&ciudadProp(p)), det:`${esc(ciudadProp(p))} ·${esc(CLI(p.cliente).nombre)}`, tab:"datos", accion:null},
    {n:"Unidades",             ok:us>0,  det:us?`${us} unidad(es)`:"Sin unidades no se puede agendar", tab:"unidades", accion:null},
    {n:"Contactos",            ok:cs>0,  det:cs?`${cs} contacto(s)`:"Manager, assistant o mantenimiento", tab:"contactos", accion:null},
    {n:"Seguro (COI)",         ok:coiVigente(id), det:(p.polizas&&p.polizas.length)?`${p.polizas.length} póliza(s) · vence antes ${esc(venceMin.vence)}${coiPorVencer(venceMin)?` (${coiDiasTxt(venceMin)})`:""}`:"Lo emite la aseguradora, no Cordova", tab:"documentos",
     accion:coiVigente(id)?null:{a:"coiDirecto",t:"Registrar COI"}},
    {n:"Lista de precios de la propiedad", ok:tf>0&&!porLlenar, det:tf||porLlenar?`${tf} precio(s)${porLlenar?` · ${porLlenar} por llenar`:""}`:"Si no tiene, usa la tarifa general", tab:"precios",
     accion:porLlenar?{a:"precLlenar",t:"Llenar precios"}:tf?null:{a:"preciosDesdeGeneral",t:"Crear lista completa"}},
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
    <p>Operación en campo, disponibilidad y acuerdos de contratación.</p></div>
    <div class="act"><button class="btn p" data-a="tecNuevo">+ Nuevo técnico</button></div></div>
  <div class="tabs">${[["campo","Hoy en campo"],["lista","Lista de técnicos"]]
    .map(([k,n])=>`<button class="tab ${t===k?"on":""}" data-a="tab" data-t="${k}">${n}</button>`).join("")}</div>
  ${t==="campo"?vCampo():t==="asis"?vAsis():vTecLista()}`;
};

function vCampo(){
  const fFecha = S.campoFiltroFecha !== undefined ? S.campoFiltroFecha : HOY_SUP;
  const fTec = S.campoFiltroTec || "";
  const fProp = S.campoFiltroProp || "";
  const fEst = S.campoFiltroEst || "";
  const fZona = S.campoFiltroZona || "";
  const fUni = (S.campoFiltroUni || "").toLowerCase().trim();
  const fTipo = S.campoFiltroTipo || "";
  const fQ = (S.campoBuscar || "").toLowerCase().trim();

  let hoy = S.wos.filter(w=>w.tec && ["Scheduled","Confirmed","In progress","Esperando aprobación","Completed"].includes(w.estado));
  if(fFecha) hoy = hoy.filter(w=>w.fecha === fFecha);
  if(fTec) hoy = hoy.filter(w=>w.tec === fTec);
  if(fProp) hoy = hoy.filter(w=>w.prop === fProp);
  if(fEst) hoy = hoy.filter(w=>w.estado === fEst);
  if(fZona) hoy = hoy.filter(w=>ciudadProp(P(w.prop)) === fZona);
  if(fUni) hoy = hoy.filter(w=>`${U(w.unidad).num} ${U(w.unidad).unidadNum||""}`.toLowerCase().includes(fUni));
  if(fTipo) hoy = hoy.filter(w=>w.cat === fTipo);
  if(fQ) hoy = hoy.filter(w=>tecN(w.tec).toLowerCase().includes(fQ) || P(w.prop).nombre.toLowerCase().includes(fQ) || String(w.id).includes(fQ));

  const llegaron = hoy.filter(w=>asisDe(w.id)).length;
  const sinLlegar = hoy.filter(w=>!asisDe(w.id) && esAgendada(w.estado)).length;
  const tarde = hoy.filter(w=>{ const a=asisDe(w.id); return a && a.puntualidad==="Tarde"; }).length;

  return `
  <div class="card" style="margin-bottom:12px"><div class="cp" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
    <span style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--faint)">Fecha</span>
    <input type="date" id="cpFec" value="${esc(fFecha||"")}" data-a="campoFiltroFecha" style="width:145px">
    <button class="btn sm ${fFecha===HOY_SUP?"p":""}" data-a="campoFiltroFechaHoy">Hoy</button>
    <button class="btn sm ${!fFecha?"p":""}" data-a="campoFiltroFechaTodas">Todas</button>
    <span style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--faint);margin-left:6px">Técnico</span>
    <select id="cpTec" data-a="campoFiltroTec"><option value="">Todos los técnicos</option>${S.tecnicos.map(t=>`<option value="${t.id}" ${fTec===t.id?"selected":""}>${esc(tecN(t.id))}</option>`).join("")}</select>
    <span style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--faint);margin-left:6px">Propiedad</span>
    <select id="cpProp" data-a="campoFiltroProp"><option value="">Todas las propiedades</option>${S.propiedades.map(p=>`<option value="${p.id}" ${fProp===p.id?"selected":""}>${esc(p.nombre)}</option>`).join("")}</select>
    <span style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--faint);margin-left:6px">Estado</span>
    <select id="cpEst" data-a="campoFiltroEst"><option value="">Todos los estados</option>${["Scheduled","Confirmed","In progress","Esperando aprobación","Completed"].map(e=>`<option value="${e}" ${fEst===e?"selected":""}>${e}</option>`).join("")}</select>
    <span style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--faint);margin-left:6px">City</span>
    <select id="cpZona" data-a="campoFiltroZona"><option value="">Todas</option>${zonasN().map(z=>`<option value="${esc(z)}" ${fZona===z?"selected":""}>${esc(z)}</option>`).join("")}</select>
    <span style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--faint);margin-left:6px">Unidad</span>
    <input id="cpUni" value="${esc(S.campoFiltroUni||"")}" placeholder="Ej. 27" data-a="campoFiltroUni" style="width:80px">
    <span style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--faint);margin-left:6px">Tipo de servicio</span>
    <select id="cpTipo" data-a="campoFiltroTipo"><option value="">Todos</option>${activos("categorias").map(c=>`<option value="${esc(c)}" ${fTipo===c?"selected":""}>${esc(c)}</option>`).join("")}</select>
    <span style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--faint);margin-left:6px">Buscar</span>
    <input id="cpQ" value="${esc(S.campoBuscar||"")}" placeholder="N.º de WO, técnico o propiedad" data-a="campoBuscar" style="width:200px">
    ${(fFecha!==HOY_SUP||fTec||fProp||fEst||fZona||fUni||fTipo||fQ)?`<button class="btn sm" data-a="campoFiltroLimpiar">Limpiar filtros</button>`:""}
  </div></div>

  <div class="kpis">
    <div class="kpi"><div class="l">Trabajos en filtro</div><div class="v">${hoy.length}</div></div>
    <div class="kpi"><div class="l">Ya llegaron</div><div class="v g">${llegaron}</div></div>
    <div class="kpi"><div class="l">Sin marcar llegada</div><div class="v ${sinLlegar?"w":""}">${sinLlegar}</div></div>
    <div class="kpi"><div class="l">Llegaron tarde (con hora)</div><div class="v ${tarde?"b":""}">${tarde}</div></div>
  </div>
  <div class="card"><div class="chd"><h3>Quién llegó, cuándo y dónde está</h3>
    <span class="s">La puntualidad solo se evalúa contra Work Orders que tienen hora programada</span></div>
    ${hoy.length?`<table>
      <thead><tr><th>Técnico</th><th>WO</th><th>Propiedad · Unidad</th><th>Horario programado</th><th>Llegada real</th><th>Puntualidad</th><th>Estado</th><th>Última ubicación</th></tr></thead>
      <tbody>${hoy.map(w=>{
        const a=asisDe(w.id);
        return `<tr class="cl${fl("wo:"+w.id)}" data-a="woVer" data-id="${w.id}">
          <td style="font-weight:650">${esc(tecN(w.tec))}</td>
          <td class="mono" style="font-weight:700">WO-${w.id}</td>
          <td>${esc(P(w.prop).nombre)} · ${esc(U(w.unidad).num)}</td>
          <td class="mono">${w.horaProg ? esc(w.horaFin?`${w.horaProg}–${w.horaFin}`:w.horaProg) : '<span style="color:var(--faint)">—</span>'}</td>
          <td class="mono">${a?`<b>${esc(a.horaReal)}</b>`:'<span style="color:var(--faint)">—</span>'}</td>
          <td style="white-space:nowrap">${a?`<span class="pill ${a.puntualidad==="Tarde"?"w":a.puntualidad==="Declarada"?"m":"v"}"><span class="dot"></span>${esc(a.puntualidad)}</span>`
                 :'<span class="pill g">sin marcar</span>'}</td>
          <td><span class="pill ${estP(w.estado)}"><span class="dot"></span>${esc(w.estado)}</span></td>
          <td style="font-size:11.5px;color:var(--soft)">${a?esc(a.ubicacion):'<span style="color:var(--faint)">sin dato</span>'}</td></tr>`;
      }).join("")}</tbody></table>`:`<div class="empty">No hay trabajos que coincidan con los filtros seleccionados</div>`}
  </div>
  <div class="tr">La llegada la marca el técnico desde su celular. No se inventa horario ficticio: solo se evalúa retraso si la orden tenía hora explícita.</div>`;
}

function vAsis(){
  return `<div class="card"><div class="chd"><h3>Historial de asistencia</h3>
    <span class="s">${S.asistencias.length} registros</span></div>
    ${S.asistencias.length?`<table><thead><tr><th>Fecha</th><th>Técnico</th><th>WO</th><th>Programada</th><th>Llegó</th><th>Puntualidad</th><th>Ubicación</th></tr></thead>
    <tbody>${S.asistencias.slice().reverse().map(a=>`<tr>
      <td class="mono">${esc(a.fecha)}</td><td style="font-weight:650">${esc(tecN(a.tec))}</td>
      <td class="mono">WO-${a.wo}</td><td class="mono">${esc(a.horaProg)}</td><td class="mono"><b>${esc(a.horaReal)}</b></td>
      <td><span class="pill ${a.puntualidad==="Tarde"?"w":a.puntualidad==="Declarada"?"m":"v"}">${esc(a.puntualidad)}</span></td>
      <td style="font-size:11.5px;color:var(--soft)">${esc(a.ubicacion)}</td></tr>`).join("")}
    </tbody></table>`:`<div class="empty">Todavía nadie ha marcado llegada.<br><span style="font-size:12px">Abre el celular del técnico y toca «Ya llegué».</span></div>`}
  </div>`;
}

const vTecLista = () => {
  const fQ = (S.tecBuscar || "").toLowerCase().trim();
  const fZ = S.tecFiltroZona || "";
  const fE = S.tecFiltroEsp || "";
  const fS = S.tecFiltroEstado || "";
  const fV = S.tecFiltroVinculo || "";

  let tecs = S.tecnicos.slice();
  if(fQ) tecs = tecs.filter(t => (t.nombre+" "+t.apellido).toLowerCase().includes(fQ) || (t.tel||"").includes(fQ) || (t.dir||"").toLowerCase().includes(fQ));
  if(fZ) tecs = tecs.filter(t => t.zona === fZ);
  if(fE) tecs = tecs.filter(t => (t.esp||[]).includes(fE));
  if(fS === "activos") tecs = tecs.filter(t => t.activo);
  else if(fS === "bajas") tecs = tecs.filter(t => !t.activo);
  if(fV) tecs = tecs.filter(t => (t.tipoVinculo || "Empleado") === fV);

  return `
  <div class="card" style="margin-bottom:12px"><div class="cp" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
    <input id="tBus" value="${esc(S.tecBuscar||"")}" placeholder="Buscar nombre o teléfono…" style="font-family:inherit;font-size:12.5px;padding:6px 9px;border:1px solid var(--line);border-radius:6px;width:200px" data-a="tecBuscar">
    <span style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--faint);margin-left:6px">City / Zona</span>
    <select id="tFiltZ" data-a="tecFiltroZona"><option value="">Todas las zonas</option>${zonasN().map(z=>`<option value="${esc(z)}" ${fZ===z?"selected":""}>${esc(z)}</option>`).join("")}</select>
    <span style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--faint);margin-left:6px">Especialidad</span>
    <select id="tFiltE" data-a="tecFiltroEsp"><option value="">Todas las especialidades</option>${activos("especialidades").map(e=>`<option value="${esc(e)}" ${fE===e?"selected":""}>${esc(e)}</option>`).join("")}</select>
    <span style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--faint);margin-left:6px">Vínculo</span>
    <select id="tFiltV" data-a="tecFiltroVinculo"><option value="">Todos</option>${["Empleado","Subcontratista (1099)","Vendor externo"].map(v=>`<option value="${v}" ${fV===v?"selected":""}>${v}</option>`).join("")}</select>
    <span style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--faint);margin-left:6px">Estado</span>
    <select id="tFiltS" data-a="tecFiltroEstado"><option value="" ${!fS?"selected":""}>Todos</option><option value="activos" ${fS==="activos"?"selected":""}>Solo activos</option><option value="bajas" ${fS==="bajas"?"selected":""}>Solo bajas</option></select>
    ${(fQ||fZ||fE||fS||fV)?`<button class="btn sm" data-a="tecFiltroLimpiar">Limpiar filtros</button>`:""}
  </div></div>

  <div class="card"><table>
    <thead><tr><th>Técnico</th><th>Vínculo y Acuerdos</th><th>Especialidad</th><th>Zona</th><th>Teléfono</th><th class="num" title="Work Orders asignadas a este técnico en la semana actual (${S.semana})">WO esta semana (sem. ${S.semana})</th><th>Última ubicación</th><th>Estado</th><th></th></tr></thead>
    <tbody>${tecs.map(t=>{
      const n=S.wos.filter(w=>w.tec===t.id&&w.semana===S.semana).length;
      const b=S.disponibilidad.find(d=>d.tec===t.id&&d.estado==="Aprobado");
      const u=ultUbic(t.id);
      return `<tr class="${fl("tec:"+t.id)}"><td style="font-weight:650">${esc(tecN(t.id))}
        <div style="font-size:10.5px;color:var(--faint)">${esc(t.dir)}</div></td>
        <td>
          <div style="display:flex;flex-direction:column;gap:3px;align-items:flex-start">
            <span class="pill ${t.tipoVinculo==="Vendor externo"?"m":t.tipoVinculo==="Subcontratista (1099)"?"a":"g"}">${esc(t.tipoVinculo||"Empleado")}</span>
            <div style="display:flex;gap:3px;flex-wrap:wrap">
              ${t.contrato_firmado==="Firmado"?`<span class="pill v" style="font-size:10px" title="Contrato de servicios firmado">Contrato ✓</span>`:t.contrato_firmado==="Pendiente"?`<span class="pill w" style="font-size:10px" title="Contrato pendiente de firma">Contrato pend.</span>`:""}
              ${t.w9_subido==="Al día"?`<span class="pill v" style="font-size:10px" title="Formulario W-9 al día">W-9 ✓</span>`:t.w9_subido==="Pendiente"?`<span class="pill w" style="font-size:10px" title="W-9 pendiente">W-9 pend.</span>`:""}
              ${t.seguro_coi==="Vigente"?`<span class="pill v" style="font-size:10px" title="Seguro / COI vigente">COI ✓</span>`:t.seguro_coi==="Pendiente"?`<span class="pill r" style="font-size:10px" title="Seguro pendiente">COI pend.</span>`:""}
            </div>
          </div>
        </td>
        <td>${t.esp.map(e=>`<span class="pill g">${esc(e)}</span>`).join(" ")}</td>
        <td>${esc(t.zona)}</td><td class="mono">${esc(t.tel)}</td>
        <td class="num mono">${n}</td>
        <td style="font-size:11.5px;color:var(--soft)">${u?esc(u):'<span style="color:var(--faint)">base: '+esc(t.zona)+'</span>'}</td>
        <td>${!t.activo?'<span class="pill g">Dado de baja</span>'
             :b?`<span class="pill r"><span class="dot"></span>${esc(b.motivo)} ${b.desde.slice(5)}–${b.hasta.slice(5)}</span>`
               :'<span class="pill v">Disponible</span>'}</td>
        <td style="text-align:right;white-space:nowrap"><button class="btn sm" data-a="tecNuevo" data-id="${t.id}">Editar</button>
          <button class="btn sm ${t.activo?"":"v"}" data-a="tecBaja" data-id="${t.id}">${t.activo?"Dar de baja":"Reactivar"}</button></td></tr>`;
    }).join("")||`<tr><td colspan="9" class="empty">No hay técnicos que coincidan con la búsqueda</td></tr>`}</tbody></table></div>
  <div class="tr">La «última ubicación» es lo que UC-09 usa para sugerir al técnico más cercano. Sale sola de la llegada que él marca.</div>`;
};

/* ── TARIFARIO ── Ingreso Fijo + Ingreso Variable, juntos ── */
/* Lista de precios que se ve y se envía: la general, o la de una propiedad (sus tarifas propias reemplazan a la general del mismo servicio). */
function listaPrecios(prop, tipo, fecha){
  const llave = t => [t.cat,t.serv,t.variante,t.pisos,t.banos].join("|");
  const rige = fecha ? t=>tarEn(t,fecha) : tarActiva;   // fecha: la lista tal como rige ese día (p. ej. la programada)
  const propias = prop ? S.tarifas.filter(t=>rige(t)&&t.prop===prop) : [];
  const usadas = new Set(propias.map(llave));
  const generales = S.tarifas.filter(t=>rige(t)&&!t.prop && !usadas.has(llave(t)));
  return propias.concat(generales).filter(t=>!tipo||t.cat===tipo)
    .sort((a,b)=>String(a.cat).localeCompare(String(b.cat))||String(a.serv).localeCompare(String(b.serv))||((a.pisos==null?-1:a.pisos)-(b.pisos==null?-1:b.pisos)));
}
/* Lo que se va a enviar: los precios del filtro actual, menos los que se desmarcaron. */
/* Una tarifa provisoria es un precio inventado: nunca le llega a un cliente. */
const tarSeleccion = () => listaPrecios(S.tarFp||"", S.tarFt||"").filter(t=>!S.tarFs||t.serv===S.tarFs).filter(t=>!(S.tarOff||[]).includes(String(t.id)));
/* Texto del correo: solo el precio al cliente, nunca lo que se le paga al técnico. */
function textoListaPrecios(ts){
  const porTipo={}; ts.forEach(t=>{ (porTipo[t.cat||"—"]=porTipo[t.cat||"—"]||[]).push(t); });
  return Object.entries(porTipo).map(([cat,fs])=>cat.toUpperCase()+"\n"+fs.map(t=>
    `• ${t.serv||cat}${t.variante?" ("+t.variante+")":""}${t.pisos!=null?" · Floor "+t.pisos:""}${t.desc?" — "+t.desc:""}: ${money(t.precio)}`).join("\n")).join("\n\n");
}
/* Price List completo de una propiedad, sin duplicar nada (llave: tipo + servicio + detail + piso + baños):
   1) copia las tarifas generales que la propiedad aún no tiene,
   2) si viene de un estimado, sus precios mandan sobre lo copiado (misma lógica que tenía «Al tarifario»),
   3) deja una fila «por llenar» (sinPrecio) por cada servicio activo del catálogo que no tiene tarifa alguna.
   Las filas por llenar no son tarifas: ver tarActiva. Devuelve {copiados, vacios, delEst}. */
function crearListaPropiedad(propId, desdeEstimado){
  const llave = t => [t.cat,t.serv,t.variante||"",t.pisos==null?"":t.pisos,t.banos==null?"":t.banos].join("|");
  let seq = 0;
  const nuevoId = () => "TR"+Date.now()+Math.random().toString(36).slice(2,6)+(seq++);
  const tiene = new Set(S.tarifas.filter(t=>t.prop===propId).map(llave));
  let copiados=0, vacios=0, delEst=0;
  S.tarifas.filter(t=>!t.prop && tarActiva(t)).forEach(t=>{
    if(tiene.has(llave(t))) return;
    const c = {...t, id:nuevoId(), prop:propId};
    ["desde","por","motivo","creada","lote"].forEach(k=>{ delete c[k]; });   // la copia nace como precio de hoy, sin el historial de la general
    S.tarifas.push(c); tiene.add(llave(t)); copiados++;
  });
  const e = desdeEstimado ? by(S.estimados, desdeEstimado) : null;
  if(e && e.prop===propId) (e.lineas||[]).forEach(l=>{
    if(l.libre || !l.serv || l.enTarifario) return;
    const precio = precioLinea(e,l); if(!(precio>0)) return;
    const u = l.unidad ? U(l.unidad) : null, variante = u && u.rooms ? u.rooms : "";
    const ex = S.tarifas.find(t=>t.prop===propId && t.cat===l.cat && t.serv===l.serv && (t.variante||"")===variante && t.pisos==null);
    if(ex){ ex.precio=precio; if(ex.pago==null) ex.pago=l.pago||0; delete ex.sinPrecio; }
    else S.tarifas.push({id:nuevoId(), prop:propId, nombre:`${P(propId).nombre} - ${(l.serv+" "+variante).trim()}`, cat:l.cat||"", serv:l.serv,
      variante, pisos:null, banos:null, precio, pago:l.pago||0, desc:"", tax:l.tax||"", descuento:"", descuentoTipo:"%", cantidad:1});
    l.enTarifario=true; delEst++;
  });
  const hay = new Set(S.tarifas.filter(t=>!t.prop || t.prop===propId).map(t=>t.cat+"|"+t.serv));
  CAT.servicios.filter(s=>!s.baja && !debaja("categorias",s.tipo) && !(CAT.tiposCO||[]).includes(s.tipo)).forEach(s=>{
    const k = s.tipo+"|"+s.nombre; if(hay.has(k)) return; hay.add(k);
    S.tarifas.push({id:nuevoId(), prop:propId, cat:s.tipo, serv:s.nombre, nombre:s.nombre, variante:"", pisos:null, precio:null, pago:null, sinPrecio:true});
    vacios++;
  });
  /* una fila por llenar que ya tiene un precio hermano (se llenó por otro camino) sobra */
  const conPrecio = new Set(S.tarifas.filter(t=>t.prop===propId && tarActiva(t)).map(t=>t.cat+"|"+t.serv));
  for(let i=S.tarifas.length-1;i>=0;i--){ const t=S.tarifas[i]; if(t.prop===propId && !tarActiva(t) && conPrecio.has(t.cat+"|"+t.serv)) S.tarifas.splice(i,1); }
  return {copiados, vacios, delEst};
}
/* PDF de una lista de precios: documento listo para imprimir en un iframe oculto (sin ventanas
   emergentes); el navegador ofrece «Guardar como PDF». Solo precio al cliente: nada de pago al técnico ni impuestos. */
function pdfListaPrecios(propId, ts, rige, luego){
  const porTipo={}; ts.forEach(t=>{ (porTipo[t.cat||"—"]=porTipo[t.cat||"—"]||[]).push(t); });
  const conPiso = ts.some(t=>t.pisos!=null);
  const nomProp = propId ? P(propId).nombre : "Tarifario general";
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Price List - ${esc(nomProp)}</title><style>
    @page{size:Letter;margin:14mm}
    *{box-sizing:border-box} body{font:12px/1.4 Arial,Helvetica,sans-serif;color:#111;margin:0}
    .cab{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #1a3a6b;padding-bottom:8px;margin-bottom:14px}
    .cab h1{font-size:18px;margin:0;color:#1a3a6b} .cab .d{font-size:11px;color:#555;text-align:right}
    h2{font-size:12px;text-transform:uppercase;letter-spacing:.05em;margin:16px 0 4px;color:#1a3a6b;break-after:avoid}
    table{width:100%;border-collapse:collapse} th{text-align:left;font-size:10.5px;color:#555;border-bottom:1px solid #999;padding:4px 6px}
    td{padding:4px 6px;border-bottom:1px solid #ddd;vertical-align:top} tr{break-inside:avoid}
    .n{text-align:right;white-space:nowrap} .s{font-size:10.5px;color:#666}
    .pie{margin-top:18px;font-size:10.5px;color:#666}
  </style></head><body>
  <div class="cab"><div><h1>Cordova Property Services LLC</h1><div>${esc(nomProp)}</div></div>
    <div class="d"><b>Price List</b><br>${rige?"Rige desde "+esc(rige):esc(HOY_SUP)}</div></div>
  ${Object.entries(porTipo).map(([cat,fs])=>`<h2>${esc(cat)}</h2><table><thead><tr><th>Servicio</th><th>Detail</th>${conPiso?"<th>Piso</th>":""}<th class="n">Price</th></tr></thead><tbody>
    ${fs.map(t=>`<tr><td>${esc(t.serv||cat)}${t.desc?`<div class="s">${esc(t.desc)}</div>`:""}</td><td>${esc(t.variante)||"—"}</td>${conPiso?`<td>${t.pisos!=null?"Floor "+esc(t.pisos):"—"}</td>`:""}<td class="n">${money(t.precio)}</td></tr>`).join("")}
    </tbody></table>`).join("")}
  <div class="pie">Cordova Property Services LLC · Pensacola, FL · scheduling@cordovaps.com · (469) 219-6869</div>
  </body></html>`;
  const f=document.createElement("iframe");
  f.setAttribute("aria-hidden","true"); f.style.cssText="position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(f);
  const w=f.contentWindow, d=w.document; d.open(); d.write(html); d.close();
  const quitar=()=>{ if(f.parentNode) f.remove(); };
  w.addEventListener("afterprint", quitar);
  setTimeout(()=>{ try{ w.focus(); w.print(); if(luego) luego(); }catch(err){ quitar(); } }, 250);
  setTimeout(quitar, 120000);   // por si el navegador nunca avisa que terminó de imprimir
}
/* Abre el correo del usuario con los contactos de la propiedad, el asunto y el texto ya puestos. Un enlace mailto no
   puede adjuntar archivos: el PDF se guarda desde la ventana de impresión y se adjunta a mano. */
/* Prototipo: no hay servidor de correo. Se muestra el correo tal como saldría y «Enviar» lo simula
   (confirmación + registro en Bitácora). «Abrir en mi correo» sí lo abre en el programa de correo real. */
let _correoPend = null;
function correoModal(para, asunto, cuerpo, adjunto, canal){
  canal = canal || "Correo";
  const wa = canal==="WhatsApp";
  _correoPend = {para, asunto, cuerpo, adjunto, canal};
  modal(`<div class="mh"><h3>${wa?"WhatsApp":"Correo"} al cliente</h3><p>Así le llegaría. En el prototipo «Enviar» solo lo simula: no sale nada real.</p></div>
  <div class="mb">
    <div class="fld"><label>Para</label>${para.length?`<div>${esc(para.join(", "))}</div>`:`<div class="note w">La propiedad no tiene contactos con ${wa?"teléfono":"correo"}.</div>`}</div>
    ${wa?"":`<div class="fld"><label>Asunto</label><div>${esc(asunto)}</div></div>`}
    ${adjunto?`<div class="fld"><label>Adjunto</label><div>📎 ${esc(adjunto)}</div></div>`:""}
    <div class="fld"><label>Mensaje</label><div style="white-space:pre-wrap;border:1px solid var(--line);border-radius:8px;padding:10px;max-height:220px;overflow:auto;font-size:12.5px">${esc(cuerpo)}</div></div>
  </div>
  <div class="mf"><button class="btn" data-a="cm">Cancelar</button>
    <button class="btn p" data-a="correoEnviarSim" ${para.length?"":"disabled"}>Enviar</button></div>`);
}
const correosDe = pid =>contactosDe(pid).map(c=>String(c.mail||"").trim()).filter(Boolean);
function correoPriceList(propId, rige){
  const nom = propId ? P(propId).nombre : "Tarifario general", para = propId ? correosDe(propId) : [];
  correoModal(para, `Price List - ${nom} - Cordova Property Services`,
`Buenos días,

Adjunto encontrarás el Price List de ${nom}${rige?`, vigente desde ${rige}`:""}.

Cualquier duda, con gusto te ayudamos.

Claudia S. Cordova
CEO | Cordova Property Services LLC
Pensacola, FL | Tel: (469) 219-6869
Correo: scheduling@cordovaps.com | www.cordovapropertyservices.com`, `Price List - ${nom}.pdf`);
}

VIEWS.tarifario = () => {
  const fp=S.tarFp||"", ft=S.tarFt||"", fs=S.tarFs||"";
  if(S.vigModo==="_g" && !fp) return `<div class="ph"><div><h2>Tarifario</h2>
    <p>Precios generales: prepara la lista nueva sin tocar lo que rige hoy.</p></div>
    <div class="act"><button class="btn p" data-a="tarNueva">+ Nueva tarifa</button></div></div>${vigenciaHTML("")}`;
  const base=listaPrecios(fp,""), ts=base.filter(t=>(!ft||t.cat===ft)&&(!fs||t.serv===fs)), sel=ts.filter(t=>!(S.tarOff||[]).includes(String(t.id)));
  const nPorTipo={}; base.forEach(t=>{ nPorTipo[t.cat]=(nPorTipo[t.cat]||0)+1; });
  const props=S.propiedades.slice().sort((a,b)=>a.nombre.localeCompare(b.nombre));
  const vigFrase=fp?"":vigFraseLista("");
  const enviadas=(S.listasPrecio||[]).slice(0,6);
  return `
  <div class="ph"><div><h2>Tarifario</h2>
    <p>${fp?`Lista de precios de <b>${esc(P(fp).nombre)}</b>: sus tarifas propias y las generales que no tiene negociadas.`:`Precios generales, de <code>Ingreso Fijo</code> — aplican a toda propiedad que no tenga una negociada aparte.`}</p></div>
    <div class="act"><button class="btn p" data-a="tarNueva">+ Nueva tarifa</button></div></div>
  ${vigFrase}
  <div class="card" style="margin-bottom:10px"><div class="cp" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
    <span style="font-size:11px;color:var(--faint);font-weight:700;text-transform:uppercase">Propiedad</span>
    <select id="tarFp" data-a="tarFiltro"><option value="">Tarifario general</option>${props.map(p=>`<option value="${p.id}" ${fp===p.id?"selected":""}>${esc(p.nombre)}</option>`).join("")}</select>
    <span style="font-size:11px;color:var(--faint);font-weight:700;text-transform:uppercase;margin-left:6px">Tipo</span>
    <select id="tarFt" data-a="tarFiltro"><option value="">Todos los tipos (${base.length})</option>${activos("categorias").filter(c=>nPorTipo[c]).map(c=>`<option value="${esc(c)}" ${ft===c?"selected":""}>${esc(c)} (${nPorTipo[c]})</option>`).join("")}</select>
    ${fs?`<span class="pill a">Servicio: ${esc(fs)}</span>`:""}
    ${fp||ft||fs?`<button class="btn sm" data-a="tarFiltroQuitar">Quitar filtros</button>`:""}
    ${!fp?`<button class="btn sm" data-a="vigAbrir" data-id="" title="Prepara una lista general nueva con fecha de entrada, sin tocar los precios de hoy">Preparar cambio de precios</button>`:""}
    <span style="margin-left:auto;font-size:12px;color:var(--soft)">${sel.length} de ${ts.length} precio(s) marcados</span>
    ${fp?`<button class="btn" data-a="tarPDF" ${sel.length?"":"disabled"}>Descargar PDF${sel.length?` (${sel.length})`:""}</button>`:""}
    <button class="btn p" data-a="tarEnviar" ${sel.length?"":"disabled"}>Enviar lista de precios${sel.length?` (${sel.length})`:""}</button>
  </div></div>
  <div class="card"><table>
    <thead><tr><th style="width:30px"><input type="checkbox" data-a="tarMarcaTodos" title="Marcar o desmarcar todos los que se ven" ${ts.length&&sel.length===ts.length?"checked":""}></th><th>Tipo</th><th>Servicio</th><th>Detail</th><th>Piso</th><th>Baños</th><th>Description</th>${fp?"<th>Origen</th>":""}<th class="num">Price</th><th></th></tr></thead>
    <tbody>${ts.map(t=>{
      return `<tr class="${fl('tar:'+t.id)}">
      <td><input type="checkbox" data-a="tarMarca" data-id="${t.id}" ${(S.tarOff||[]).includes(String(t.id))?"":"checked"}></td>
      <td>${esc(t.cat)||"—"}</td><td>${esc(t.serv)||"—"}</td><td>${esc(t.variante)||"—"}</td>
      <td>${t.pisos!=null?"Floor "+t.pisos:'<span class="pill g">cualquiera</span>'}</td>
      <td>${t.banos!=null?t.banos:'<span class="pill g">—</span>'}</td><td>${esc(t.desc)||"—"}</td>
      ${fp?`<td><span class="pill ${t.prop?"a":"g"}">${t.prop?"Propia":"General"}</span></td>`:""}
      <td class="num mono">${money(t.precio)}${vigPillCambia(t)}</td>
      <td style="text-align:right"><button class="btn sm" data-a="tarNueva" data-id="${t.id}">Editar</button></td></tr>`;
    }).join("")||`<tr><td colspan="${fp?10:9}" class="empty">Sin tarifas con ese filtro</td></tr>`}</tbody></table></div>
  ${enviadas.length?`<div class="card" style="margin-top:12px"><div class="chd"><h3>Listas de precios enviadas</h3><span class="s">las últimas ${enviadas.length}</span></div>
    <table><thead><tr><th>Propiedad</th><th>Tipo</th><th class="num">Precios</th><th>Para</th><th>Quién</th><th>Cuándo</th></tr></thead><tbody>
    ${enviadas.map(x=>`<tr class="${fl('lp:'+x.id)}"><td>${esc(P(x.prop).nombre)}</td><td>${esc(x.tipo)}</td><td class="num mono">${x.filas}</td><td>${esc(x.para.join(", "))}</td><td>${esc(x.quien)}</td><td class="mono">${esc(x.fecha.slice(5))} ${esc(x.hora)}</td></tr>`).join("")}
    </tbody></table></div>`:""}
  <div class="card" style="margin-top:12px"><div class="chd"><h3>Pago diferenciado por técnico</h3>
    <span class="s">override opcional — si no hay uno aquí, el pago sigue saliendo de la tarifa de arriba</span></div>
    <div class="cp">
    ${(S.pagosTecnico||[]).length?`<table><thead><tr><th>Técnico</th><th>Propiedad</th><th>Servicio</th><th>Detail</th><th class="num">Pago</th><th>Motivo</th><th>Quién</th><th></th></tr></thead>
    <tbody>${S.pagosTecnico.map(x=>`<tr class="${fl('pt:'+x.id)}">
      <td style="font-weight:650">${esc(tecN(x.tec))}</td>
      <td>${x.prop?esc(P(x.prop).nombre):'<span class="pill g">General</span>'}</td>
      <td>${esc(x.cat)} · ${esc(x.serv)}</td>
      <td>${esc(x.variante)||"—"}${x.pisos!=null?" · Floor "+x.pisos:""}</td>
      <td class="num mono">${money(x.pago)}</td>
      <td>${esc(x.motivo)}</td>
      <td>${esc(x.quien)}</td>
      <td style="text-align:right"><button class="btn sm" data-a="pagoTecQuitar" data-id="${x.id}">Quitar</button></td></tr>`).join("")}
    </tbody></table>`:`<div class="empty">Sin pagos diferenciados todavía.</div>`}
    <button class="btn" style="margin-top:10px" data-a="pagoTecNuevo">+ Nuevo pago diferenciado</button>
    </div></div>
  <div class="note" style="margin-top:12px"><b>Cómo resuelve el precio</b> — la misma llave de su Tabla Maestra (Rooms + Pisos + Servicio), en cuatro pasos:
    primero la tarifa negociada de esa propiedad para esos pisos; si no, la de la propiedad para cualquier piso;
    si no, la general para esos pisos; si no, la general para cualquier piso. Si no hay ninguna, levanta una
    <b>excepción</b> en vez de inventar un número.</div>
  <div class="note w" style="margin-top:9px"><b>Para evitar vueltas:</b> dejar los pisos en <i>«cualquiera»</i> cuando el precio no cambia por pisos.
    Así se carga una fila por servicio en vez de tres. Solo se especifica el piso donde de verdad cambia el precio, como en Studio.</div>
  <div class="tr" style="margin-top:8px">El técnico solo ve la columna <b>«se paga»</b> — nunca el precio al cliente. Al enviar una lista solo sale el precio al cliente.</div>`;
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
                  {tar:true, a:()=>S.tarifas,    c:"cat",     n:"tarifa(s)"},
                  {a:()=>CAT.servicios,c:"tipo",    n:"servicio(s)"},
                  {a:()=>lineasEst(),  c:"cat",     n:"línea(s) de estimado"}],
  adicionales:   [{a:()=>S.adicionales,c:"concepto",n:"adicional(es)"}],
  ubicaciones:   [{a:()=>S.wos,        c:"ubic",    n:"Work Order(s)"},
                  {a:()=>S.adicionales,c:"ubic",    n:"adicional(es)"}],
  rooms:         [{a:()=>S.unidades,   c:"rooms",   n:"unidad(es)"},
                  {tar:true, a:()=>S.tarifas,    c:"variante",n:"tarifa(s)"}],
  especialidades:[{a:()=>S.tecnicos,   c:"esp",     n:"técnico(s)", lista:true}],
  tiendas:       [{a:()=>S.movs,       c:"tienda",  n:"movimiento(s) de inventario"}],
  vendedores:    [{a:()=>S.propiedades,c:"vendedor",n:"propiedad(es)"}],
  pisos:         [{a:()=>S.unidades,   c:"pisos",   n:"unidad(es)"},
                  {tar:true, a:()=>S.tarifas,    c:"pisos",   n:"tarifa(s)"}],
  folder:        [],
  servicios:     [{a:()=>S.wos,        c:"serv",    n:"Work Order(s)"},
                  {tar:true, a:()=>S.tarifas,    c:"serv",    n:"tarifa(s)"},
                  {a:()=>lineasEst(),  c:"serv",    n:"línea(s) de estimado"}]
};
const usosDe = (k,v) => (REFS[k]||[])
  .map(r=>({n:r.n, c:r.a().filter(o => !o.sinPrecio).filter(o => !(r.tar && tarOculta(o))).filter(o => r.lista
      ? (o[r.c]||[]).includes(v) : String(o[r.c])===String(v)).length}))
  .filter(x=>x.c>0);
function renombrarCat(k, viejo, nuevo){
  let tocados=0;
  (REFS[k]||[]).forEach(r=>r.a().forEach(o=>{
    if(r.lista){ const i=(o[r.c]||[]).indexOf(viejo); if(i>-1){ o[r.c][i]=nuevo; tocados++; } }
    else if(String(o[r.c])===String(viejo)){ o[r.c]=nuevo; tocados++; }
  }));
  /* La ciudad de la propiedad se guarda también en zona; al renombrar, las dos se mantienen iguales. */
  if(k==="zonas") S.propiedades.forEach(p=>{ if(p.ciudad===viejo) p.ciudad=nuevo; });
  if(S.bajas[k]) S.bajas[k]=S.bajas[k].map(x=>x===viejo?nuevo:x);
  const m=(CAT.meta||{})[k]; if(m && m[String(viejo)]){ m[String(nuevo)]=m[String(viejo)]; delete m[String(viejo)]; }
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

/* Cada catálogo tiene su propia vista: qué es, dónde aparece y en cuántos registros se usa.
   El índice los agrupa por lo que describen, para que se entienda qué hay sin leerlo todo. */
const LISTAS = [
  {k:"adicionales",   n:"Change order items", d:"Lo que el técnico elige en el celular cuando encuentra un trabajo que no estaba en la Work Order. Oficina lo aprueba antes de cobrarlo."},
  {k:"zonas",         n:"Ciudades",           d:"La ciudad de cada propiedad y la base de cada técnico. Sirve para agendar y para sugerir quién queda más cerca."},
  {k:"rooms",         n:"Rooms",              d:"El tamaño de la unidad. Junto con el piso, define qué tarifa se cobra."},
  {k:"pisos",         n:"Pisos",              d:"Cuántos pisos tiene la unidad. Solo cambia el precio cuando la tarifa lo indica."},
  {k:"ubicaciones",   n:"Ubicaciones",        d:"Dónde, dentro de la unidad, se hace el trabajo."},
  {k:"especialidades",n:"Especialidades",     d:"Lo que sabe hacer cada técnico. Al asignar, avisa si el técnico no tiene la que pide el servicio."},
  {k:"tiendas",       n:"Tiendas",            d:"Dónde compran material los técnicos."},
  {k:"vendedores",    n:"Vendedores",         d:"Quién consiguió la cuenta. Se elige en el formulario de la propiedad."},
  {k:"folder",        n:"Estado de carpeta",  d:"En qué quedó la carpeta de fotos de cada trabajo."}
];
const CAT_VISTAS = {
  tys:{n:"Tipos y servicios", d:"Catálogo maestro de servicios y categorías. Los precios se gestionan en Tarifario y en el Price List de cada propiedad.",
       cuenta:()=>CAT.servicios.filter(s=>!s.baja).length},
  estados:{n:"Estados", d:"Las etapas por las que pasa una Work Order, de agendada a terminada.", cuenta:()=>CAT.estados.length}
};
LISTAS.forEach(L=>{ CAT_VISTAS[L.k]={...L, cuenta:()=>activos(L.k).length}; });
// Change order items cuenta también los servicios de Materials y Miscellaneous, que solo existen para change orders.
CAT_VISTAS.adicionales.cuenta = () => (CAT.tiposCO||[]).reduce((n,t)=>n+servDe(t).length,0) + activos("adicionales").length;
const CAT_INDICE = [
  {g:"Servicios", ks:["tys","adicionales"]},
  {g:"Propiedades y unidades", ks:["zonas","rooms","pisos","ubicaciones"]},
  {g:"Equipo", ks:["especialidades"]},
  {g:"Compras", ks:["tiendas"]},
  {g:"Comercial", ks:["vendedores"]},
  {g:"Work Orders", ks:["estados","folder"]}
];
const catNombre = k => (CAT_VISTAS[k]||{}).n || ({categorias:"Tipos de servicio",servicios:"Servicios"})[k] || k;
/* «Se usan en 4 Work Order(s), 69 tarifa(s)»: lo que hay que saber antes de renombrar o dar de baja. */
const usoN = (k,v) => usosDe(k,v).reduce((a,u)=>a+u.c,0);
function resumenUsos(k, valores){
  const m={}; valores.forEach(v=>usosDe(k,v).forEach(u=>{ m[u.n]=(m[u.n]||0)+u.c; }));
  const partes=Object.entries(m).map(([n,c])=>`<b>${c} ${esc(n)}</b>`);
  return partes.length ? "Se usan en "+partes.join(", ") : "Todavía no las usa ningún registro";
}
const catBuscador = (n,ph) => n>8 ? `<input class="cat-buscar" id="catBuscar" placeholder="${esc(ph)}" aria-label="${esc(ph)}">` : "";

function catVistaTys(){
  const tipos=activos("categorias");
  const t=tipos.includes(S.catTipo) ? S.catTipo : tipos[0];
  const ss=CAT.servicios.filter(s=>s.tipo===t), act=ss.filter(s=>!s.baja), baja=ss.filter(s=>s.baja);
  const iTipo=CAT.categorias.indexOf(t), tiposBaja=CAT.categorias.filter(c=>debaja("categorias",c));
  return `
  <div class="cat-cab"><div><h3>Tipos y servicios</h3><p>${esc(CAT_VISTAS.tys.d)}</p>
    <div class="cat-uso">${tipos.length} tipos · ${CAT.servicios.filter(s=>!s.baja).length} servicios · ${resumenUsos("servicios",CAT.servicios.filter(s=>!s.baja).map(s=>s.nombre))}</div></div>
    <div class="cat-acc"><button class="btn" data-a="catAdd" data-k="categorias" data-n="Tipos de servicio">Nuevo tipo</button></div></div>
  <div class="cat-tys">
    <div class="cat-tipos" role="tablist" aria-label="Tipos de servicio">${tipos.map(c=>
      `<button class="cat-tipo ${c===t?"on":""}" role="tab" aria-selected="${c===t}" data-a="catTipo" data-t="${esc(c)}"><span>${esc(c)}</span><span class="n">${servDe(c).length}</span></button>`).join("")}</div>
    <div class="cat-tys-det">
      <div class="cat-tipo-cab"><h3>${esc(t)}</h3>
        <div class="cat-acc"><button class="btn sm" data-a="catRen" data-k="categorias" data-i="${iTipo}">Editar tipo</button>
          <button class="btn sm p" data-a="servAdd" data-t="${esc(t)}">Nuevo servicio</button></div></div>
      ${catBuscador(act.length,"Buscar en "+t)}
      <table><thead><tr><th>Servicio</th><th></th></tr></thead>
      <tbody>${act.map(s=>
        `<tr class="${fl("serv:"+s.id)}" data-q="${esc(s.nombre.toLowerCase())}"><td>${esc(s.nombre)}</td>
          <td class="cat-fila-acc"><button class="cat-lnk suave" data-a="servRen" data-id="${s.id}">Editar</button></td></tr>`).join("")
        ||`<tr><td colspan="2" class="empty">Este tipo todavía no tiene servicios: agrega uno para poder agendarlo.</td></tr>`}</tbody></table>
      <div class="note" style="margin-top:10px"><b>Catálogo vs Tarifario:</b> Aquí se definen los nombres de servicios y categorías. Las tarifas por propiedad y por tamaño de unidad se gestionan en <b>Tarifario</b> o en el <b>Price List</b> de la propiedad.</div>
      ${baja.length?`<details class="cat-bajas"><summary>${baja.length} servicio(s) dado(s) de baja en ${esc(t)}</summary><table><tbody>
        ${baja.map(s=>`<tr><td>${esc(s.nombre)}</td><td class="cat-fila-acc"><button class="cat-lnk" data-a="servAlta" data-id="${s.id}">Reactivar</button></td></tr>`).join("")}</tbody></table></details>`:""}
    </div>
  </div>
  ${tiposBaja.length?`<details class="cat-bajas"><summary>${tiposBaja.length} tipo(s) dado(s) de baja</summary><table><tbody>
    ${tiposBaja.map(c=>`<tr><td>${esc(c)}</td><td class="cat-fila-acc"><button class="cat-lnk" data-a="catAlta" data-k="categorias" data-i="${CAT.categorias.indexOf(c)}">Reactivar</button></td></tr>`).join("")}</tbody></table></details>`:""}`;
}

function catVistaLista(L){
  const vals=CAT[L.k].map((v,i)=>({v,i})), act=vals.filter(x=>!debaja(L.k,x.v)), baja=vals.filter(x=>debaja(L.k,x.v));
  return `
  <div class="cat-cab"><div><h3>${esc(L.n)}</h3><p>${esc(L.d)}</p>
    <div class="cat-uso">${act.length} opciones · ${resumenUsos(L.k,act.map(x=>x.v))}</div></div>
    <div class="cat-acc"><button class="btn p" data-a="catAdd" data-k="${L.k}" data-n="${esc(L.n)}">Agregar opción</button></div></div>
  ${catBuscador(act.length,"Buscar en "+L.n.toLowerCase())}
  <table><thead><tr><th>Opción</th><th>Registrada por</th><th>Fecha</th><th></th></tr></thead>
  <tbody>${act.map(({v,i})=>{ const mt=((CAT.meta||{})[L.k]||{})[String(v)];
    return `<tr class="${fl("cat:"+L.k+":"+v)}" data-q="${esc(String(v).toLowerCase())}"><td>${esc(v)}</td>
      <td class="${mt?"":"cat-dim"}">${mt?esc(mt.por):"—"}</td><td class="mono ${mt?"":"cat-dim"}">${mt?esc(mt.fecha):"—"}</td>
      <td class="cat-fila-acc"><button class="cat-lnk suave" data-a="catRen" data-k="${L.k}" data-i="${i}">Editar</button></td></tr>`;}).join("")
    ||`<tr><td colspan="4" class="empty">Todavía no hay opciones: agrega la primera.</td></tr>`}</tbody></table>
  ${baja.length?`<details class="cat-bajas"><summary>${baja.length} dada(s) de baja</summary><table><tbody>
    ${baja.map(({v,i})=>`<tr><td>${esc(v)}</td><td class="cat-fila-acc"><button class="cat-lnk" data-a="catAlta" data-k="${L.k}" data-i="${i}">Reactivar</button></td></tr>`).join("")}</tbody></table></details>`:""}
  <div class="cat-pie">Editar permite renombrar, y el nombre nuevo pasa a todos los registros que ya lo usan. Dar de baja lo saca de los formularios nuevos sin borrarlo de lo que ya existe.</div>`;
}

/* Change orders: el técnico elige cualquier servicio de Tipos y servicios. Aquí está solo lo que existe nada más
   para change orders (Materials, Miscellaneous) y los change order items que todavía no tienen servicio. */
function catVistaCO(){
  const L=CAT_VISTAS.adicionales, tipos=CAT.tiposCO||[];
  const pend=CAT.adicionales.map((v,i)=>({v,i})).filter(x=>!debaja("adicionales",x.v));
  const filaServ = s => `<tr class="${fl("serv:"+s.id)}"><td>${esc(s.nombre)}</td><td style="color:var(--soft)">Lo define oficina al aprobar</td>
    <td class="cat-fila-acc"><button class="cat-lnk suave" data-a="servRen" data-id="${s.id}">Editar</button></td></tr>`;
  return `
  <div class="cat-cab"><div><h3>${esc(L.n)}</h3><p>${esc(L.d)} El técnico elige el tipo y el servicio igual que en una Work Order; aquí está lo que solo existe para change orders.</p>
    <div class="cat-uso">${L.cuenta()} opciones propias · además, cualquier servicio de <b>Tipos y servicios</b> salvo Estimate e Inspection</div></div></div>
  ${tipos.map(t=>{ const ss=servTodos(t).filter(s=>!s.baja);
    return `<div class="cat-tipo-cab"><h3>${esc(t)}</h3><span class="cat-dim" style="font-size:12px">${({Materials:"Materiales que se cobran aparte del trabajo"})[t]||"Lo que no encaja en ningún servicio"}</span>
      <div class="cat-acc"><button class="btn sm" data-a="servAdd" data-t="${esc(t)}">Nuevo servicio</button></div></div>
    <table><tbody>${ss.map(filaServ).join("")||`<tr><td class="empty">Sin servicios.</td></tr>`}</tbody></table>`;}).join("")}
  ${pend.length?`<div class="cat-tipo-cab"><h3>Por definir con Erika</h3><span class="pill w">${pend.length} sin servicio</span></div>
  <table><tbody>${pend.map(({v,i})=>{ const c=adicionalCatalogo(v);
    return `<tr class="${fl("cat:adicionales:"+v)}"><td>${esc(v)}</td><td style="color:var(--soft)">${c?`Precio fijo ${money(c.precio)}`:"Lo define oficina al aprobar"}</td>
      <td class="cat-fila-acc"><button class="cat-lnk suave" data-a="catRen" data-k="adicionales" data-i="${i}">Editar</button></td></tr>`;}).join("")}</tbody></table>`:""}
  <div class="cat-pie">Si el servicio tiene tarifa, el precio del change order sale de ahí. Si no, oficina lo define al aprobar.</div>`;
}

const EST_DESC = {"Scheduled":"Agendada, sin técnico todavía","Confirmed":"El cliente confirmó la fecha",
  "In progress":"El técnico está en la propiedad","Esperando aprobación":"Frenada por un adicional sin decidir",
  "Detenido":"Empezó pero está frenado por algo externo","Completed":"Trabajo terminado","Pending":"En espera de algo externo","Rescheduled":"Se movió de fecha",
  "Returned":"Con return","Corrected":"Se corrigió un return","Canceled":"Cancelada","Inspeccion":"Visita de inspección, no es trabajo"};
function catVistaEstados(){
  return `
  <div class="cat-cab"><div><h3>Estados</h3><p>${esc(CAT_VISTAS.estados.d)}</p>
    <div class="cat-uso">${CAT.estados.length} estados · los usa el sistema por su nombre, por eso no se editan aquí</div></div></div>
  <table><thead><tr><th>Estado</th><th>Qué significa</th><th class="num">En WO</th></tr></thead><tbody>
  ${CAT.estados.map(e=>{ const n=S.wos.filter(w=>w.estado===e.n).length;
    return `<tr><td><span class="pill ${e.p}"><span class="dot"></span>${esc(e.n)}</span></td>
    <td style="color:var(--soft)">${esc(EST_DESC[e.n]||"")}</td><td class="num mono ${n?"":"cat-dim"}">${n}</td></tr>`;}).join("")}
  </tbody></table>
  <div class="cat-pie"><b>Facturado y pagado no son estados.</b> Van como marca aparte: así una Work Order puede estar Completed y facturada al mismo tiempo sin perder su estado real.</div>`;
}

/* Submenú de Catálogos en la barra lateral: se abre cuando estás dentro del módulo. */
function subnavCatalogos(){
  const sel = S.mod==="catalogos" ? (CAT_VISTAS[S.catSel] ? S.catSel : "tys") : null;
  return `<div class="subnav" role="group" aria-label="Catálogos">${CAT_INDICE.map(g=>`<div class="sgrp">${esc(g.g)}</div>`
    + g.ks.map(k=>`<button class="sub ${k===sel?"on":""}" data-a="catVer" data-v="${k}" ${k===sel?'aria-current="page"':""}>
        <span class="lb">${esc(CAT_VISTAS[k].n)}</span><span class="n">${CAT_VISTAS[k].cuenta()}</span></button>`).join("")).join("")}</div>`;
}

VIEWS.catalogos = () => {
  const sel = CAT_VISTAS[S.catSel] ? S.catSel : "tys";
  const det = sel==="tys" ? catVistaTys() : sel==="estados" ? catVistaEstados() : sel==="adicionales" ? catVistaCO() : catVistaLista(CAT_VISTAS[sel]);
  return `
  <div class="ph"><div><h2>Catálogos</h2>
    <p>Las listas de opciones que aparecen en los formularios del sistema. Elige una para ver qué tiene y dónde se usa.</p></div></div>
  <select class="cat-movil" id="catSel" data-a="catVerSel" aria-label="Elegir catálogo">${CAT_INDICE.map(g=>`<optgroup label="${esc(g.g)}">`
    + g.ks.map(k=>`<option value="${k}" ${k===sel?"selected":""}>${esc(CAT_VISTAS[k].n)} (${CAT_VISTAS[k].cuenta()})</option>`).join("")+`</optgroup>`).join("")}</select>
  <div class="card cat-det">${det}</div>`;
};

/* ── UC-06 ── Expediente de la propiedad: 9 campos que bloquean el paso a programación ── */
/* Qué campo del formulario corresponde a cada fila del expediente: la fila que
   dice «falta» tiene que llevarte al campo, no dejarte buscándolo. */
/* El Management no bloquea el expediente: Claudia crea la propiedad sin saberlo
   todavia — "es abstracto, podrian demorar en conseguirlo" — y se vincula despues. */
const CAMPO_INPUT = {nombre:"nP", dir:"nD", zona:"nCiudad",
                     door:"nDC", pref:"nPR", aprob:"nAP", notas:"nNT", notasPaint:"nPaint"};
/* Estado de un documento del management: con archivo adjunto está «Subido»; sin archivo, el que se marcó a mano. */
const docEstadoTxt = (est, pdf) => pdf ? "Subido" : (est || "Pendiente");
const docPill = (nombre, est, pdf) => { const t = docEstadoTxt(est, pdf);
  return `<span class="pill ${t==="Subido"?"v":t==="Recibido"?"a":"g"}" style="margin-right:4px">${nombre} · ${t}</span>`; };
/* Adjunta o quita el archivo de ejemplo y deja el selector de estado coherente (sin repintar el modal). */
function docAdjuntar(id, prefijo, campoDraft){
  S[campoDraft] = S[campoDraft] ? null : prefijo + "_" + String(S.docCliNombre||"management").replace(/[^A-Za-z0-9]+/g,"_").replace(/^_|_$/g,"") + ".pdf";
  const n = document.getElementById(id+"N"), b = document.getElementById(id+"B"), sel = document.getElementById(id), inf = document.getElementById(id+"I");
  if(n){ n.textContent = S[campoDraft] ? "📎 " + S[campoDraft] : "sin archivo"; n.style.color = S[campoDraft] ? "var(--verde)" : "var(--faint)"; }
  if(b) b.textContent = S[campoDraft] ? "Quitar archivo" : "Adjuntar archivo";
  if(sel) sel.value = S[campoDraft] ? "Recibido" : "Pendiente";
  if(inf) inf.textContent = S[campoDraft] ? "Se marca como Subido al guardar." : "";
}
VIEWS.clientes = () => `
  <div class="ph"><div><h2>Management</h2><p>El punto de entrada. Hoy esto no existe: se salta directo a la propiedad.</p></div>
    <div class="act"><button class="btn p" data-a="cliNuevo">+ Nuevo</button></div></div>
  <div class="card"><table>
    <thead><tr><th>Nombre</th><th>Contacto</th><th>Teléfono</th><th>Correo</th><th class="num">Propiedades</th><th>Documentos</th><th></th></tr></thead>
    <tbody>${S.clientes.map(c=>`<tr class="${fl("cli:"+c.id)}"><td style="font-weight:650">${esc(c.nombre)}</td>
      <td>${esc(c.contacto)}</td><td class="mono">${esc(c.tel)}</td><td>${esc(c.mail)}</td>
      <td class="num mono">${S.propiedades.filter(p=>p.cliente===c.id).length}</td>
      <td>${docPill("Vendor Packet",c.vendorPacket,c.vendorPacketPdf)}${docPill("W-9",c.w9,c.w9Pdf)}
        <button class="btn sm" data-a="cliDocsModal" data-id="${c.id}">Documentos</button></td>
      <td style="text-align:right"><button class="btn sm" data-a="cliNuevo" data-id="${c.id}">Editar</button></td></tr>`).join("")}</tbody></table></div>
  <div class="tr">El sistema avisa si el teléfono ya existe, para no duplicar el mismo management dos veces. Y si algo se tecleó mal, <b>Editar</b> lo arregla: el valor anterior queda en la Bitácora. Client Status, Client Source e historial de comunicación se registran en cada <b>Propiedad</b>, no aquí — un mismo management puede tener varias, cada una con su propio estado.</div>`;

/* UC-05 — el COI lo emite la aseguradora, no Cordova. Sin COI vigente no se manda a nadie a trabajar.
   Un mismo certificado (ACORD 25) trae varias pólizas — General Liability, Auto, Workers Comp, a
   veces Umbrella — cada una con su propio vencimiento. Solo está vigente si TODAS lo están. */
