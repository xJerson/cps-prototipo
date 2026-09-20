"use strict";
Object.assign(ACC, {


  propVer: d => { S.mod="propiedades"; S.sub=d.id; S.tab="datos"; render(); },
  propNueva: d => { const p = d&&d.id ? P(d.id) : null;
    const op = (a,v) => a.map(x=>`<option ${x===v?"selected":""}>${esc(x)}</option>`).join("");
    modal(`<div class="mh"><h3>${p?"Editar "+esc(p.nombre):"Nueva propiedad"}</h3>
      <p>${p?"Cada campo que cambies queda en la Bitácora con el valor anterior.":"Lo que Lydia registra al conseguir la cuenta. Claudia después le carga el seguro y la lista de precios."}</p></div>
    <div class="mb">
      <div class="fld"><label>Property Name <span class="req">*</span></label><input id="nP" value="${p?esc(p.nombre):""}"></div>
      <div class="fld"><label>Property Address <span class="req">*</span></label><input id="nD" value="${p?esc(p.dir):""}"></div>
      <div class="fg c3">
        <div class="fld"><label>City</label><input id="nCiudad" value="${p?esc(p.ciudad):""}"></div>
        <div class="fld"><label>State</label><input id="nEstadoUS" value="${p?esc(p.estadoUS):""}"></div>
        <div class="fld"><label>ZIP Code</label><input id="nZip" class="mono" value="${p?esc(p.zip):""}"></div></div>
      <div class="fg c2">
        <div class="fld"><label>Client Status</label><select id="nEst">${op(["Prospect","Onboarding","Active","On Hold","Inactive"], p?p.estado:"Prospect")}</select></div>
        <div class="fld"><label>Client Source</label><select id="nOrig">${op(["Llamada","Formulario web","Referido","Visita comercial","Correo"], p?p.origen:"")}</select></div></div>
      <div class="fld"><label>Property Phone Number</label><input id="nTel" class="mono" value="${p?esc(p.tel):""}"></div>
      <div class="fg c2">
        <div class="fld"><label>Accounts Payable Email 1 <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— opcional</span></label><input id="nAP1" value="${p?esc(p.mailAP1):""}"></div>
        <div class="fld"><label>Accounts Payable Email 2 <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— opcional</span></label><input id="nAP2" value="${p?esc(p.mailAP2):""}"></div></div>
      <div class="hint" style="margin:-6px 0 10px">A dónde se manda la factura de esta propiedad, si es distinto del contacto que coordina el trabajo.</div>
      <div class="fld"><label>Special Property Requirements</label><input id="nNT" value="${p?esc(p.notas):""}" placeholder="lo que siempre se olvida y genera reclamos"></div>
      <div class="fld"><label>Zona (Area) — interno de Cordova <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— si todavía no se sabe, se deja sin asignar</span></label>
        <select id="nZ"><option value="">— sin asignar —</option>${op(zonasN(), p?p.zona:"")}</select></div>
      <div class="fg c3">
        <div class="fld"><label>Door code</label><input id="nDC" class="mono" value="${p?esc(p.door):""}"></div>
        <div class="fld"><label>Default Contact Method</label><input id="nPR" placeholder="Email, Text…" value="${p?esc(p.pref):""}"></div></div>
      <div class="fld"><label>Approval Method <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— optional</span></label>
        <input id="nAP" value="${p?esc(p.aprob):""}" placeholder="e.g., text Danielle, not email">
        <div class="hint">Just a note for whoever needs to request authorization. It doesn\u2019t require anything: whoever approves picks the channel actually used. Erika: \u00absometimes approvals come by call, by text, in different ways\u00bb.</div></div>

      <div style="border:1px solid var(--line);border-radius:9px;padding:11px;margin:4px 0 12px;background:var(--surface-2)">
        <div style="font-size:11px;font-weight:750;text-transform:uppercase;letter-spacing:.05em;color:var(--faint);margin-bottom:8px">Información para el técnico</div>
        <div class="hint" style="margin:0 0 9px">Esto es lo que el técnico ve en su celular al abrir una Work Order de esta propiedad — se carga una vez aquí, no hay que repetírselo cada vez.</div>
        <div class="fg c2">
          <div class="fld"><label>Dónde está el shop <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— opcional</span></label><input id="nShop" value="${p?esc(p.shop):""}" placeholder="Edificio de mantenimiento, detrás de la alberca"></div>
          <div class="fld"><label>Código del shop <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— opcional</span></label><input id="nShopCode" class="mono" value="${p?esc(p.shopCode):""}"></div></div>
        <div class="fld"><label>Horario <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— opcional</span></label><input id="nHorario" value="${p?esc(p.horario):""}" placeholder="Oficina abre 8:00 · unidades disponibles desde 8:30"></div>
        <div class="fld"><label>Información de pintura <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— parte del Expediente, sin esto no se puede transferir a programación</span></label><input id="nPaint" value="${p?esc(p.notasPaint):""}" placeholder="Sherwin ProMar 200, eggshell. Techos blanco plano."></div>
        <div class="fld"><label>Al terminar <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— opcional</span></label><input id="nFinalExp" value="${p?esc(p.finalExp):""}" placeholder="Ventanas por dentro y por fuera. Filtros de A/C cambiados."></div>
        <div class="fld" style="margin-bottom:0"><label>Ojo <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— opcional, advertencias</span></label><input id="nOjo" value="${p?esc(p.notasTec):""}" placeholder="Estacionarse en visitas, no en la entrada principal"></div>
      </div>
      ${p?"":`<div class="note">Las unidades no hace falta cargarlas aquí: se van registrando solas cuando crees Work Orders o Estimados de esta propiedad.</div>`}
    </div>
    <div class="mf"><button class="btn" data-a="propCancelar">Cancelar</button>
      <button class="btn p" data-a="propGuardar" data-id="${p?p.id:""}">${p?"Guardar corrección":"Guardar"}</button></div>`,true);
    // Cuando se entra desde una fila del expediente, el cursor cae en ese campo
    if(d&&d.f && CAMPO_INPUT[d.f]){
      const e=document.getElementById(CAMPO_INPUT[d.f]);
      if(e){ e.focus(); e.parentElement.classList.add("bad"); }
    } },
  propGuardar: d => {
    if(marcaFalta(["nP","nD"])){ toast("Faltan datos","Nombre y dirección son obligatorios.","r"); return; }
    const yo = d&&d.id ? P(d.id) : null;
    if(yo) return guardarEdicion(yo, {nombre:val("nP"),zona:val("nZ"),cliente:val("nC"),dir:val("nD"),
      ciudad:val("nCiudad"),estadoUS:val("nEstadoUS"),zip:val("nZip"),tel:val("nTel"),
      estado:val("nEst"),origen:val("nOrig"),
      door:val("nDC"),pref:val("nPR"),aprob:val("nAP"),
      mailAP1:val("nAP1"),mailAP2:val("nAP2"),
      notas:val("nNT"),
      shop:val("nShop"),shopCode:val("nShopCode"),horario:val("nHorario"),notasPaint:val("nPaint"),
      finalExp:val("nFinalExp"),notasTec:val("nOjo")}, "Propiedades", yo.nombre, null, "prop:"+yo.id);
    const id="P"+nid("p");
    flash("prop:"+id);
    S.propiedades.push({id,nombre:val("nP"),zona:val("nZ"),cliente:val("nC"),dir:val("nD"),
      ciudad:val("nCiudad"),estadoUS:val("nEstadoUS"),zip:val("nZip"),tel:val("nTel"),notas:val("nNT"),
      estado:val("nEst"),origen:val("nOrig"),
      activa:true,door:val("nDC"),aprob:val("nAP"),pref:val("nPR"),
      mailAP1:val("nAP1"),mailAP2:val("nAP2"),polizas:[],
      shop:val("nShop"),shopCode:val("nShopCode"),horario:val("nHorario"),notasPaint:val("nPaint"),
      finalExp:val("nFinalExp"),notasTec:val("nOjo")});
    const np = P(id);
    /* Antes, "propiedad nueva" en Solicitud Comercial y Visita Comercial era
       solo un nombre escrito a mano — nunca una Propiedad real, y siempre
       terminaba bloqueada más adelante ("Falta registrar la propiedad")
       porque nada la había creado de verdad. Si se llegó aquí desde una de
       esas dos, se crea la Propiedad real y se vuelve con su id ya puesto,
       sin perder lo que ya se llevaba escrito. */
    if(S.visitaDraft){
      const dr = S.visitaDraft; S.visitaDraft = null; dr.prop = id;
      volverAVisitaDraft(dr);
      toast("✓ Propiedad creada",`<b>${esc(np.nombre)}</b> ya está en la visita.`,"v");
      return;
    }
    if(S.solComDraft){
      const dr = S.solComDraft; S.solComDraft = null; dr.prop = id;
      volverASolComDraft(dr);
      toast("✓ Propiedad creada",`<b>${esc(np.nombre)}</b> ya está en la solicitud.`,"v");
      return;
    }
    cm(); toast("✓ Propiedad creada",`<b>${esc(np.nombre)}</b>. Ojo: sin COI registrado, ya te quedó una alerta.`,"v");
    S.mod="propiedades"; S.sub=id; S.tab="unidades"; render();
  },
  propCancelar: () => {
    // Cancelar la Propiedad tampoco debe perder lo que ya se llevaba
    // escrito en la Solicitud o la Visita desde donde se abrió.
    if(S.visitaDraft){ const dr=S.visitaDraft; S.visitaDraft=null; volverAVisitaDraft(dr); return; }
    if(S.solComDraft){ const dr=S.solComDraft; S.solComDraft=null; volverASolComDraft(dr); return; }
    cm();
  },
  /* Reunión Claudia (feedback prototipo): antes acá faltaba directamente el
     campo que arma el precio (rooms quedaba vacío en silencio). Ahora se
     compone solo desde Tipo + Bedrooms + "tiene estudio aparte" — el mismo
     texto exacto que sigue usando tarifa(), cero cambios ahí. El "Detail"
     de abajo queda para lo que no entra en eso (closets, garages, etc). */
  uniNueva: d => { const u = d&&d.id ? by(S.unidades,d.id) : null;
    const pid = u ? u.prop : d.prop;
    const op = (a,v) => a.map(x=>`<option ${String(x)===String(v)?"selected":""}>${esc(String(x))}</option>`).join("");
    if(!d||!d.keep){ S.uniDetalle = u ? (u.detalle||[]).map(x=>({...x})) : []; S.uniDraft = null; }
    const dr = S.uniDraft;
    const v = campo => dr&&dr[campo]!==undefined ? dr[campo] : (u?u[campo]:undefined);
    const tipoU = val("uTipo")||v("tipo")||"Residencial";
    modal(`<div class="mh"><h3>${u?"Editar unidad "+esc(u.num):"Nueva unidad"}</h3><p>${esc(P(pid).nombre)}</p></div>
    <div class="mb">
      <div class="note" style="margin-bottom:12px"><b>Location:</b> ${P(pid).zona?esc(P(pid).zona):'<span style="color:var(--faint)">sin definir en la propiedad</span>'}
        <span style="font-size:10.5px;color:var(--faint)"> — viene de la propiedad, no se repite acá</span></div>
      <div class="fg c3">
        <div class="fld" style="margin-bottom:0"><label>Building <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— si aplica</span></label>
          <input id="uBld" placeholder="A, B…" value="${dr?esc(dr.building||""):(u?esc(u.building||""):"")}"></div>
        <div class="fld" style="margin-bottom:0;grid-column:span 2"><label>Unidad <span class="req">*</span></label>
          <input id="uN" placeholder="204, 27, 8…" value="${dr?esc(dr.unidadNum||dr.num||""):(u?esc(u.unidadNum||u.num||""):"")}"></div>
      </div>
      <div class="fg c3" style="margin-top:11px">
        <div class="fld" style="margin-bottom:0"><label>Floors <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— solo si afecta la tarifa</span></label><select id="uP"><option value="">— no aplica —</option>${op(activos("pisos"), dr?dr.pisos:(u?u.pisos:""))}</select></div>
        <div class="fld" style="margin-bottom:0"><label>Tipo <span class="req">*</span></label>
          <select id="uTipo" data-a="uniCampoTipo" data-prop="${pid}" data-id="${u?u.id:""}">
            <option ${tipoU==="Residencial"?"selected":""}>Residencial</option>
            <option ${tipoU==="Oficina"?"selected":""}>Oficina</option></select></div>
        <div class="fld" style="margin-bottom:0"><label>Unit Occupancy <span class="req">*</span></label>
          <select id="uOcup">
            <option ${(dr?dr.ocupacion:(u?u.ocupacion:""))!=="Vacant"?"selected":""}>Occupied</option>
            <option ${(dr?dr.ocupacion:(u?u.ocupacion:""))==="Vacant"?"selected":""}>Vacant</option></select>
          <div style="font-size:10.5px;color:var(--faint);margin-top:4px">El técnico verá este dato antes de entrar. Si está ocupada, deberá tocar y esperar autorización o acompañamiento.</div></div>
      </div>
      ${tipoU==="Residencial"?`<div class="fg c2">
        <div class="fld" style="margin-bottom:0"><label>Bedrooms <span class="req">*</span></label>
          <input id="uBedrooms" type="number" min="0" class="mono" placeholder="0 = Studio" value="${dr&&dr.bedrooms!=null?dr.bedrooms:(u&&u.bedrooms!=null?u.bedrooms:"")}"></div>
        <div class="fld" style="margin-bottom:0"><label>Bathrooms <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— informativo</span></label>
          <input id="uBathrooms" type="number" min="0" class="mono" placeholder="opcional" value="${dr&&dr.bathrooms!=null?dr.bathrooms:(u&&u.bathrooms!=null?u.bathrooms:"")}"></div>
      </div><div class="tr" style="margin-top:8px">Studio, balcón y living room se solicitan como adicionales cuando aplican, no se guardan en la unidad.</div>`:""}
      <div class="fld"><label>Detail <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— opcional, solo informativo (closets, garage, etc.)</span></label>
        ${S.uniDetalle.length?`<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">${S.uniDetalle.map((x,i)=>
          `<span class="pill a">${x.cantidad} ${esc(x.tipo)} <a href="#" data-a="uniDetQuitar" data-i="${i}" data-prop="${pid}" data-id="${u?u.id:""}" style="margin-left:5px;color:inherit">✕</a></span>`).join("")}</div>`:""}
        <div class="fg c3">
          <div class="fld" style="margin-bottom:0"><select id="uDetTipo">${["Closet","Garage","Office","Other"].map(t=>`<option>${t}</option>`).join("")}</select></div>
          <div class="fld" style="margin-bottom:0"><input id="uDetCant" type="number" class="mono" min="1" value="1"></div>
          <button type="button" class="btn sm" data-a="uniDetAgregar" data-prop="${pid}" data-id="${u?u.id:""}">+ Agregar</button>
        </div></div>
      ${u&&S.wos.some(w=>w.unidad===u.id)?`<div class="note w">Esta unidad ya tiene ${S.wos.filter(w=>w.unidad===u.id).length} Work Order(s). Cambiar Bedrooms/Tipo puede cambiar la tarifa que les aplica.</div>`:""}
    </div>
    <div class="mf"><button class="btn" data-a="uniCancelar">Cancelar</button>
      <button class="btn p" data-a="uniGuardar" data-prop="${pid}" data-id="${u?u.id:""}">${u?"Guardar corrección":"Guardar"}</button></div>`,true); },
  uniCancelar: () => { S.uniDetalle=[]; S.uniDraft=null; cm(); },
  // Cambiar Tipo muestra/oculta Bedrooms — rearma el modal preservando lo tecleado.
  uniCampoTipo: d => {
    S.uniDraft = {building:val("uBld"), unidadNum:val("uN"), pisos:val("uP"), tipo:val("uTipo"),
      bedrooms:val("uTipo")==="Residencial"?parseInt(val("uBedrooms"))||0:null,
      bathrooms:parseInt(val("uBathrooms"))||null, ocupacion:val("uOcup")};
    ACC.uniNueva({id:d.id||"", prop:d.prop, keep:true});
  },
  uniDetAgregar: d => {
    S.uniDraft = {building:val("uBld"), unidadNum:val("uN"), pisos:val("uP"), tipo:val("uTipo"),
      bedrooms:val("uTipo")==="Residencial"?parseInt(val("uBedrooms"))||0:null,
      bathrooms:parseInt(val("uBathrooms"))||null, ocupacion:val("uOcup")};
    S.uniDetalle.push({tipo:val("uDetTipo"), cantidad:parseInt(val("uDetCant"))||1});
    ACC.uniNueva({id:d.id||"", prop:d.prop, keep:true});
  },
  uniDetQuitar: d => {
    S.uniDraft = {building:val("uBld"), unidadNum:val("uN"), pisos:val("uP"), tipo:val("uTipo"),
      bedrooms:val("uTipo")==="Residencial"?parseInt(val("uBedrooms"))||0:null,
      bathrooms:parseInt(val("uBathrooms"))||null, ocupacion:val("uOcup")};
    S.uniDetalle.splice(+d.i,1);
    ACC.uniNueva({id:d.id||"", prop:d.prop, keep:true});
  },
  uniGuardar: d => {
    const tipoU = val("uTipo")||"Residencial";
    const faltanU = ["uN"].concat(tipoU==="Residencial"&&val("uBedrooms")===""?["uBedrooms"]:[]);
    if(marcaFalta(faltanU)){ toast("Falta un dato","Sin número de unidad y Bedrooms no se puede armar ni identificar ni cotizar.","r"); return; }
    const yo = d&&d.id ? by(S.unidades,d.id) : null;
    const bld=val("uBld"), uNumR=val("uN");
    const bedroomsU = tipoU==="Residencial"?parseInt(val("uBedrooms"))||0:null;
    const datos = {building:bld, unidadNum:uNumR, num:uNumComp(bld,uNumR),
      tipo:tipoU, bedrooms:bedroomsU, bathrooms:parseInt(val("uBathrooms"))||null, ocupacion:val("uOcup")||"Occupied",
      rooms:roomsDesde(tipoU,bedroomsU),pisos:parseInt(val("uP"))||null,detalle:S.uniDetalle.slice()};
    S.uniDetalle=[]; S.uniDraft=null;
    if(yo) return guardarEdicion(yo, datos, "Propiedades", P(yo.prop).nombre+" · unidad "+yo.num, null, "uni:"+yo.id);
    const nu = {id:"U"+nid("u"),prop:d.prop, ...datos};
    S.unidades.push(nu); flash("uni:"+nu.id);
    cm(); toast("✓ Unidad creada",`${esc(nu.num)} · ${esc(nu.rooms)} — ya se puede agendar.`,"v"); render();
  },
  conNuevo: d => { const c = d&&d.id ? by(S.contactos,d.id) : null;
    const pid = c ? c.prop : d.prop;
    modal(`<div class="mh"><h3>${c?"Editar contacto":"Nuevo contacto"}</h3><p>${esc(P(pid).nombre)}</p></div>
    <div class="mb">
      <div class="fld"><label>Contact Type <span class="req">*</span></label><select id="cT">
        ${["Property Manager","Assistant Manager","Maintenance Supervisor","Accounts Payable","Regional Manager","Other"].map(t=>`<option ${c&&c.tipo===t?"selected":""}>${t}</option>`).join("")}</select></div>
      <div class="fld"><label>Full Name <span class="req">*</span></label><input id="cN" value="${c?esc(c.nombre):""}"></div>
      <div class="fld"><label>Position</label><input id="cPos" value="${c?esc(c.cargo):""}"></div>
      <div class="fg c2"><div class="fld"><label>Email Address <span class="req">*</span></label><input id="cM" value="${c?esc(c.mail):""}"></div>
        <div class="fld"><label>Phone Number</label><input id="cP" class="mono" value="${c?esc(c.tel):""}"></div></div>
      <div class="fg c2">
        <div class="fld"><label>Preferred Contact Method</label><select id="cPref">${activos("medios").filter(m=>m!=="Enlace digital").map(m=>`<option ${c&&c.pref===m?"selected":""}>${m}</option>`).join("")}</select></div>
        <div class="fld"><label>Primary Contact</label><select id="cPrim">${["Yes","No"].map(y=>`<option ${c&&c.primario===y?"selected":""}>${y}</option>`).join("")}</select></div></div>
    </div>
    <div class="mf"><button class="btn" data-a="conCancelar">Cancelar</button>
      <button class="btn p" data-a="conGuardar" data-prop="${pid}" data-id="${c?c.id:""}">${c?"Guardar corrección":"Guardar"}</button></div>`); },
  // Igual que propCancelar: si se llegó aquí desde Solicitud o Visita
  // Comercial, cancelar no debe perder lo que ya se llevaba escrito ahí.
  conCancelar: () => {
    if(S.visitaDraft){ const dr=S.visitaDraft; S.visitaDraft=null; volverAVisitaDraft(dr); return; }
    if(S.solComDraft){ const dr=S.solComDraft; S.solComDraft=null; volverASolComDraft(dr); return; }
    cm();
  },
  conGuardar: d => {
    if(marcaFalta(["cN","cM"])){ toast("Faltan datos","El nombre y el correo son obligatorios — sin correo no se le puede mandar nada.","r"); return; }
    const yo = d&&d.id ? by(S.contactos,d.id) : null;
    const datos = {tipo:val("cT"),nombre:val("cN"),mail:val("cM"),tel:val("cP"),
      cargo:val("cPos"),pref:val("cPref"),primario:val("cPrim")};
    if(yo) return guardarEdicion(yo, datos, "Propiedades", P(yo.prop).nombre+" · "+yo.nombre, null, "con:"+yo.id);
    const nk = {id:"C"+nid("c"),prop:d.prop, ...datos};
    S.contactos.push(nk); flash("con:"+nk.id);
    // Mismo mecanismo que propGuardar: si el contacto se creó desde adentro
    // de Solicitud o Visita Comercial porque la propiedad no tenía ninguno,
    // se vuelve con este ya elegido — sin perder lo demás que ya llevaba
    // escrito, y sin que quede un contactoId suelto que no calce con el
    // nombre que se ve en el formulario.
    if(S.visitaDraft){
      const dr = S.visitaDraft; S.visitaDraft = null;
      dr.contactoId = nk.id; dr.contacto = nk.nombre; dr.correo = nk.mail;
      volverAVisitaDraft(dr);
      toast("✓ Contacto agregado",`<b>${esc(nk.nombre)}</b> ya está en la visita.`,"v");
      return;
    }
    if(S.solComDraft){
      const dr = S.solComDraft; S.solComDraft = null;
      dr.contactoId = nk.id; dr.contacto = nk.nombre; dr.correo = nk.mail;
      volverASolComDraft(dr);
      toast("✓ Contacto agregado",`<b>${esc(nk.nombre)}</b> ya está en la solicitud.`,"v");
      return;
    }
    cm(); toast("✓ Contacto agregado",`${esc(nk.tipo)}: ${esc(nk.nombre)}`,"v"); render();
  },

  tecNuevo: d => { const t = d&&d.id ? T(d.id) : null;
    modal(`<div class="mh"><h3>${t?"Editar "+esc(tecN(t.id)):"Nuevo técnico"}</h3>
      <p>${t?"Cada campo que cambies queda en la Bitácora con el valor anterior.":"La pestaña <code>Tecnicos</code>, con los mismos campos."}</p></div>
    <div class="mb">
      <div class="fg c2"><div class="fld"><label>Nombre <span class="req">*</span></label><input id="tN" value="${t?esc(t.nombre):""}"></div>
        <div class="fld"><label>Apellido <span class="req">*</span></label><input id="tA" value="${t?esc(t.apellido):""}"></div></div>
      <div class="fld"><label>Especialidad (Specialist) <span class="req">*</span></label>
        <div style="display:flex;flex-wrap:wrap;gap:9px;padding:4px 0">
        ${activos("especialidades").map((e,i)=>`<label style="display:flex;gap:5px;align-items:center;font-size:12.5px;font-weight:500">
          <input type="checkbox" id="te${i}" value="${esc(e)}" style="width:auto" ${t&&t.esp.includes(e)?"checked":""}>${esc(e)}</label>`).join("")}</div></div>
      <div class="fg c2">
        <div class="fld"><label>Ubicación (zona) <span class="req">*</span></label><select id="tZ">${zonasN().map(z=>`<option ${t&&t.zona===z?"selected":""}>${esc(z)}</option>`).join("")}</select></div>
        <div class="fld"><label>Teléfono</label><input id="tT" class="mono" value="${t?esc(t.tel):""}"></div></div>
      <div class="fg c2">
        <div class="fld"><label>Dirección</label><input id="tD" value="${t?esc(t.dir):""}"></div>
        <div class="fld"><label>Movimiento</label><select id="tMv">
          <option value="1" ${t&&t.movimiento?"selected":""}>Sí, se puede mover de zona</option>
          <option value="0" ${t&&!t.movimiento?"selected":""}>No</option></select></div></div>
    </div>
    <div class="mf"><button class="btn" data-a="cm">Cancelar</button>
      <button class="btn p" data-a="tecGuardar" data-id="${t?t.id:""}">${t?"Guardar corrección":"Guardar"}</button></div>`,true); },
  tecGuardar: d => {
    if(marcaFalta(["tN","tA"])){ toast("Faltan datos","Nombre y apellido.","r"); return; }
    const esp = activos("especialidades").filter((e,i)=>chk("te"+i));
    if(!esp.length){ toast("Falta la especialidad","Sin especialidad el sistema no puede sugerirlo para asignar.","r"); return; }
    const yo = d&&d.id ? T(d.id) : null;
    const datos = {nombre:val("tN"),apellido:val("tA"),esp,zona:val("tZ"),
      tel:val("tT"),dir:val("tD"),movimiento:val("tMv")==="1"};
    if(yo) return guardarEdicion(yo, datos, "Técnicos", tecN(yo.id), null, "tec:"+yo.id);
    const nt = {id:"T"+nid("t"), ...datos, nac:"", activo:true};
    S.tecnicos.push(nt); flash("tec:"+nt.id);
    cm(); toast("✓ Técnico dado de alta",`${esc(nt.nombre)} ${esc(nt.apellido)} — ${esc(esp.join(", "))}. Ya aparece al asignar.`,"v"); render();
  },

  tarNueva: d => { const t = d&&d.id ? by(S.tarifas,d.id) : null;
    const op = (a,v) => a.map(x=>`<option ${String(x)===String(v)?"selected":""}>${esc(String(x))}</option>`).join("");
    /* Si venimos de "+ Add new tax", se recupera lo que ya se había escrito
       en vez de perderlo — igual que con las pólizas del COI. */
    const dr = d&&(d.fromTax||d.fromtax) ? S.tarDraft : null;
    const v = k => dr ? dr[k] : (t ? t[k] : "");
    /* El contexto (general o de una propiedad puntual) lo decide de dónde se abre
       el formulario — desde Tarifario (general) o desde el Price List de una
       propiedad (esa propiedad) — ya no se elige con un selector. */
    const propId = dr ? dr.prop : (t ? t.prop : (d&&d.prop ? d.prop : null));
    modal(`<div class="mh"><h3>${t?"Editar precio":"Add Item"}</h3>
      <p>${t?"Un precio mal tecleado se arrastra a cada Work Order. Corrígelo aquí; el cambio queda en la Bitácora.":"Los mismos campos con los que ella registra un precio."}</p></div>
    <div class="mb">
      <div class="note" style="margin:0 0 12px">${propId?`Precio exclusivo de <b>${esc(P(propId).nombre)}</b>`:"<b>General</b> — aplica a todas las propiedades"}</div>
      ${propId?`<div class="fld"><label>Unidad de referencia <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— para ver su composición real y no adivinar el Detail/Piso</span></label>
        <select id="rUnidad" data-a="tarUnidadDetalle">
          <option value="">— sin unidad de referencia —</option>
          ${S.unidades.filter(u=>u.prop===propId).map(u=>`<option value="${u.id}">${esc(u.num)}</option>`).join("")}
        </select>
        <div id="rUnidadDetalle"></div></div>`:""}
      <div class="fld"><label>Name <span class="req">*</span> <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— se arma solo abajo</span></label>
        <input id="rNom" readonly style="background:var(--surface-2)" value="${esc(v("nombre")||(propId?`${P(propId).nombre} - `:"")+((v("serv")||"")+" "+(v("variante")||"")).trim())}">
        <label style="display:flex;align-items:center;gap:6px;margin:6px 0 0;text-transform:none;font-weight:500;font-size:11.5px;color:var(--soft)">
          <input type="checkbox" id="rNomEdit" data-a="tarNomLock" style="width:auto"> Editar el Name a mano</label></div>
      <div class="fld"><label>Description <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— opcional</span></label><input id="rD" value="${esc(v("desc")||"")}"></div>
      <div class="fg c2">
        <div class="fld"><label>Tipo de servicio <span class="req">*</span></label><select id="rC" data-a="tarCat">${op(activos("categorias"), v("cat"))}</select></div>
        <div class="fld"><label>Servicio <span class="req">*</span></label><select id="rS" data-a="tarNomBuild">${op(servDe(v("cat")||"Clean"), v("serv"))}</select></div></div>
      <div class="fld"><label>Detail <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— ej. «2 bedroom», o «Per trailer» si no aplica por tamaño</span></label>
        <input id="rDet" data-a="tarNomBuild" list="rDetList" value="${esc(v("variante")||"")}">
        <datalist id="rDetList">${activos("rooms").map(r=>`<option value="${esc(r)}">`).join("")}</datalist>
        <div class="hint">Sugiere los tipos de unidad reales (Rooms) para que calce con las unidades — pero puedes escribir otra cosa si el servicio no se cobra por tamaño de unidad.</div></div>
      <div class="fg c2">
        <div class="fld"><label>Piso <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— solo si el precio cambia según el piso</span></label>
          <select id="rPiso">
            <option value="" ${!v("pisos")?"selected":""}>— cualquier piso —</option>
            ${activos("pisos").map(p=>`<option value="${p}" ${String(v("pisos"))===String(p)?"selected":""}>Floor ${p}</option>`).join("")}
          </select></div>
        <div class="fld"><label>Baños <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— opcional, de referencia</span></label>
          <input id="rBanos" type="number" min="0" class="mono" placeholder="ej. 2" value="${esc(v("banos")??"")}">
          <div class="hint">Solo para verlo aquí y en el Detail de la unidad — hoy el precio no cambia por baños, solo por Rooms/Piso.</div></div></div>
      <div class="fg c2">
        <div class="fld"><label>Price (excl. tax) <span class="req">*</span></label><input id="rP" class="mono" placeholder="0.00" value="${esc(v("precio")??"")}"></div>
        <div class="fld"><label>Tax</label><select id="rTax">
          <option value="">— no tax —</option>
          ${S.impuestos.map(x=>`<option value="${x.id}" ${v("tax")===x.id?"selected":""}>${esc(x.nombre)} (${x.tasa}%)</option>`).join("")}
          </select>
          <div class="hint"><a href="#" data-a="impAgregar" data-id="${t?t.id:""}" data-prop="${propId||""}" style="color:var(--azul)">+ Add new tax</a></div></div></div>
      <div class="fg c2">
        <div class="fld"><label>Quantity</label><input id="rCant" type="number" class="mono" min="1" value="${v("cantidad")||"1"}"></div>
        <div class="fld"><label>Total Discount <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— optional</span></label>
          <div style="display:flex;gap:6px">
            <input id="rDesc" class="mono" style="flex:1" value="${esc(v("descuento")||"")}" placeholder="0.00">
            <input type="hidden" id="rDescTipo" value="${v("descuentoTipo")||"%"}">
            <button type="button" class="btn sm ${(v("descuentoTipo")||"%")==="$"?"p":""}" id="rDescBtnS" data-a="tarDescTipo" data-t="$" style="min-width:34px">$</button>
            <button type="button" class="btn sm ${(v("descuentoTipo")||"%")==="%"?"p":""}" id="rDescBtnP" data-a="tarDescTipo" data-t="%" style="min-width:34px">%</button>
          </div></div></div>
      ${t?`<div class="note w">Cambiar el precio no toca lo ya facturado: las Work Orders cerradas conservan lo que se cobró. Aplica de aquí en adelante.</div>`:""}
    </div>
    <div class="mf"><button class="btn" data-a="tarCancelar">Cancel</button>
      <button class="btn p" data-a="tarGuardar" data-id="${t?t.id:""}" data-prop="${propId||""}">${t?"Guardar corrección":"Add"}</button></div>`,true); },
  tarCancelar: () => { S.tarDraft=null; cm(); },
  tarCat: () => { document.getElementById("rS").innerHTML=servDe(val("rC")).map(s=>`<option>${esc(s)}</option>`).join(""); ACC.tarNomBuild(); },
  tarUnidadDetalle: () => {
    const el = document.getElementById("rUnidadDetalle"); if(!el) return;
    const u = by(S.unidades, val("rUnidad"));
    if(!u){ el.innerHTML=""; return; }
    /* La composición real (cuántos baños, salas, etc.) es la guía para decidir
       el número — el precio sigue siendo UNO solo por unidad, esto no suma
       nada automático. Detail y Piso sí se autocompletan con los datos reales
       de la unidad elegida, en vez de que alguien los reescriba a mano. */
    el.innerHTML = `<div class="fld" style="margin:9px 0 12px">${unidadCardHTML(u)}</div>`;
    const selDet = document.getElementById("rDet");
    if(selDet) selDet.value = u.rooms;
    const selPiso = document.getElementById("rPiso");
    if(selPiso && [...selPiso.options].some(o=>o.value===String(u.pisos))) selPiso.value = String(u.pisos);
    ACC.tarNomBuild();
  },
  /* Igual que en el Price List: al elegir la unidad en el Estimado, se ve su
     composición real (cuartos, baños, piso) — para cotizar viendo lo que la
     unidad de verdad tiene, en vez de solo un texto plano en el dropdown. */
  estUniDetalle: () => {
    const el = document.getElementById("eUniDetalle"); if(!el) return;
    const uid = val("eUni"), esNueva = uid==="__new__";
    const u = esNueva ? null : by(S.unidades, uid);
    el.innerHTML = u ? unidadCardHTML(u) : "";
    const cajaNueva = document.getElementById("eUniNueva");
    const tipoN = val("eUniTipo")||"Residencial";
    const pE = S.estHdr ? P(S.estHdr.prop) : null;
    if(cajaNueva) cajaNueva.innerHTML = esNueva ? `
      <div class="note" style="margin:0 0 10px"><b>Location:</b> ${pE&&pE.zona?esc(pE.zona):'<span style="color:var(--faint)">sin definir en la propiedad</span>'}</div>
      <div class="fg c4" style="margin-top:6px">
        <div class="fld" style="margin-bottom:0"><label>Building</label>
          <input id="eUniBld" value="${esc(val("eUniBld"))}" placeholder="A, B…"></div>
        <div class="fld" style="margin-bottom:0"><label>Unidad <span class="req">*</span></label>
          <input id="eUniNum" value="${esc(val("eUniNum"))}" placeholder="204, 27, 8…"></div>
        <div class="fld" style="margin-bottom:0"><label>Floors <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— solo si afecta la tarifa</span></label>
          <select id="eUniPisos"><option value="">— no aplica —</option>${activos("pisos").map(pi=>`<option ${String(pi)===val("eUniPisos")?"selected":""}>${pi}</option>`).join("")}</select></div>
        <div class="fld" style="margin-bottom:0"><label>Tipo</label>
          <select id="eUniTipo" data-a="estUniDetalle">
            <option ${tipoN==="Residencial"?"selected":""}>Residencial</option>
            <option ${tipoN==="Oficina"?"selected":""}>Oficina</option></select></div>
      </div>
      ${tipoN==="Residencial"?`<div class="fg c2" style="margin:6px 0 0">
        <div class="fld" style="margin-bottom:0"><label>Bedrooms</label>
          <input id="eUniBedrooms" type="number" min="0" class="mono" placeholder="0 = Studio" value="${esc(val("eUniBedrooms"))}"></div>
        <div class="fld" style="margin-bottom:0"><label>Bathrooms <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— informativo</span></label>
          <input id="eUniBathrooms" type="number" min="0" class="mono" placeholder="opcional" value="${esc(val("eUniBathrooms"))}"></div>
      </div><div class="tr" style="margin-top:8px">Studio, balcón y living room se agregan como adicionales solo cuando aplican.</div>`:""}` : "";
  },
  /* Su ejemplo real de Price List (vCita) nombra los ítems así:
     "Angel Landing - Full Paint 2 Bedroom" — nombre de la propiedad primero,
     guion, servicio y detail. El Name se arma exactamente en ese formato
     cuando hay una propiedad de contexto; sigue editable igual que antes. */
  tarNomBuild: () => {
    const nom = document.getElementById("rNom");
    if(!nom) return;
    /* Con "Editar el Name a mano" marcado, tocar Servicio/Detail no debe
       pisarle lo que ya escribió — el candado es justamente para eso. */
    const chk = document.getElementById("rNomEdit");
    if(chk && chk.checked) return;
    const btn = document.querySelector('[data-a="tarGuardar"]');
    const propId = btn ? btn.dataset.prop : "";
    const base = ((val("rS")||"")+" "+(val("rDet")||"")).trim();
    nom.value = propId ? `${P(propId).nombre} - ${base}` : base;
  },
  /* Name bloqueado por defecto (se arma solo); el check lo desbloquea para
     escribir algo distinto, y al volver a tildarlo se resincroniza solo. */
  tarNomLock: () => {
    const chk = document.getElementById("rNomEdit"), nom = document.getElementById("rNom");
    if(!chk || !nom) return;
    nom.readOnly = !chk.checked;
    nom.style.background = chk.checked ? "" : "var(--surface-2)";
    if(!chk.checked) ACC.tarNomBuild();
  },
  tarDescTipo: d => {
    document.getElementById("rDescTipo").value = d.t;
    document.getElementById("rDescBtnS").classList.toggle("p", d.t==="$");
    document.getElementById("rDescBtnP").classList.toggle("p", d.t==="%");
  },
  impAgregar: d => {
    S.tarDraft = {id:d.id, prop:d.prop||null, nombre:val("rNom"), cat:val("rC"), serv:val("rS"), variante:val("rDet"),
      pisos: val("rPiso") ? parseInt(val("rPiso")) : null, desc:val("rD"),
      precio:val("rP"), pago:val("rG"), tax:val("rTax"), descuento:val("rDesc"), descuentoTipo:val("rDescTipo"), cantidad:val("rCant")};
    modal(`<div class="mh"><h3>Add Tax</h3></div>
    <div class="mb">
      <div class="fld"><label>Tax Name <span class="req">*</span></label><input id="impN"></div>
      <div class="fld"><label>Tax Rate <span class="req">*</span></label><input id="impT" class="mono" placeholder="0" style="max-width:110px"> %</div>
    </div>
    <div class="mf"><button class="btn" data-a="tarNueva" data-fromtax="1">Volver</button>
      <button class="btn p" data-a="impGuardar">Add</button></div>`,true);
  },
  impGuardar: () => {
    if(marcaFalta(["impN","impT"])){ toast("Faltan datos","Nombre y tasa del impuesto son obligatorios.","r"); return; }
    const ni = {id:"IMP"+Date.now(), nombre:val("impN"), tasa:parseFloat(val("impT"))||0};
    S.impuestos.push(ni);
    if(S.tarDraft) S.tarDraft.tax = ni.id;
    ACC.tarNueva({id:S.tarDraft?S.tarDraft.id:"", prop:S.tarDraft?S.tarDraft.prop:null, fromTax:true});
  },
  tarGuardar: d => {
    if(marcaFalta(["rNom","rP"])){ toast("Faltan datos","Name y Price son obligatorios.","r"); return; }
    const yo = d&&d.id ? by(S.tarifas,d.id) : null;
    const datos = {prop:d.prop||null,nombre:val("rNom"),cat:val("rC"),serv:val("rS"),variante:val("rDet"),
      pisos: val("rPiso") ? parseInt(val("rPiso")) : null,
      banos: val("rBanos") ? parseInt(val("rBanos")) : null,
      precio:parseFloat(val("rP")),pago:parseFloat(val("rG"))||0,
      desc:val("rD"),tax:val("rTax"),descuento:val("rDesc"),descuentoTipo:val("rDescTipo"),cantidad:parseInt(val("rCant"))||1};
    if(yo) return guardarEdicion(yo, datos, "Tarifario", `${yo.nombre}${yo.prop?" · "+P(yo.prop).nombre:" · general"}`, null, "tar:"+yo.id);
    const nr = {id:"TR"+Date.now(), ...datos};
    S.tarifas.push(nr); flash("tar:"+nr.id);
    cm(); toast("✓ Item agregado",`${esc(nr.nombre)} — ${nr.prop?"solo para "+esc(P(nr.prop).nombre):"general"}.`,"v"); render();
  },

  catAdd: d => modal(`<div class="mh"><h3>Agregar a ${esc(d.n)}</h3><p>Aparecerá de inmediato en todos los desplegables que usan esta lista.</p></div>
    <div class="mb"><div class="fld"><label>Valor nuevo <span class="req">*</span></label><input id="cv" autofocus></div>
    <div class="note">Ojo con las mayúsculas y los espacios: <b>«Navarre»</b> y <b>«navarre»</b> son dos valores distintos, y así es como hoy se rompen los conteos.</div></div>
    <div class="mf"><button class="btn" data-a="cm">Cancelar</button><button class="btn p" data-a="catSave" data-k="${d.k}">Agregar</button></div>`),
  catSave: d => {
    const v = val("cv");
    if(!v){ marcaFalta(["cv"]); toast("Falta el valor","","r"); return; }
    const lista = CAT[d.k];
    const yaEsta = lista.some(x=>String(x).toLowerCase().trim()===v.toLowerCase());
    if(yaEsta){ toast("⚠ Ya existe",`«${esc(v)}» ya está en la lista (o una variante con otras mayúsculas). No lo duplico.`,"w"); return; }
    lista.push(d.k==="pisos" ? (parseInt(v)||v) : v); flash("cat:"+d.k+":"+v);
    cm(); toast("✓ Agregado",`«${esc(v)}» ya aparece en los desplegables.`,"v"); render();
  },
  /* No borra: da de baja. El valor sigue existiendo para lo ya registrado. */
  catDel: d => {
    const v = String(CAT[d.k][+d.i]);
    S.bajas[d.k] = (S.bajas[d.k]||[]).concat([v]);
    const uso = d.k==="zonas" ? S.propiedades.filter(p=>p.zona===v).length : 0;
    toast("Dado de baja",`«${esc(v)}» deja de ofrecerse para registros nuevos.`
      + (uso?` Los ${uso} registros que ya lo usan lo conservan.`:` Nada se borró.`),"w");
    render();
  },
  catAlta: d => {
    const v = String(CAT[d.k][+d.i]);
    S.bajas[d.k] = (S.bajas[d.k]||[]).filter(x=>x!==v);
    toast("Reactivado",`«${esc(v)}» vuelve a estar disponible.`,"v"); render();
  },
  /* Renombrar no es dar de baja y crear otro: es el mismo valor con otro
     nombre, y todo lo que ya lo usaba lo sigue usando. */
  catRen: d => {
    const v = String(CAT[d.k][+d.i]);
    const L = LISTAS.find(x=>x.k===d.k), usos = usosDe(d.k, v);
    const ojo = (OJO_LOGICA[d.k]||{})[v];
    modal(`<div class="mh"><h3>Renombrar «${esc(v)}»</h3><p>${esc(L?L.n:d.k)}</p></div>
    <div class="mb">
      <div class="fld"><label>Nombre nuevo <span class="req">*</span></label>
        <input id="cr" value="${esc(v)}" autofocus></div>
      ${usos.length
        ? `<div class="note"><b>Se usa en ${usos.map(u=>`${u.c} ${u.n}`).join(", ")}.</b>
             Todos van a decir el nombre nuevo, incluido el histórico. No se pierde ningún registro:
             es el mismo valor, con otra etiqueta.</div>`
        : `<div class="note">Todavía no lo usa ningún registro.</div>`}
      ${ojo?`<div class="note w" style="margin-top:10px"><b>Ojo:</b> ${esc(ojo)} Si lo renombras, hay que ajustar esa regla.</div>`:""}
    </div>
    <div class="mf"><button class="btn" data-a="cm">Cancelar</button>
      <button class="btn p" data-a="catRenOK" data-k="${d.k}" data-i="${d.i}">Renombrar</button></div>`);
  },
  catRenOK: d => {
    const viejo = String(CAT[d.k][+d.i]), nuevo = val("cr");
    if(!nuevo){ marcaFalta(["cr"]); toast("Falta el nombre","","r"); return; }
    if(nuevo===viejo){ S.audOmitir=true; cm(); toast("Sin cambios","El nombre es el mismo.",""); return; }
    if(CAT[d.k].some((x,i)=>i!==+d.i && String(x).toLowerCase().trim()===nuevo.toLowerCase())){
      toast("⚠ Ya existe",`«${esc(nuevo)}» ya está en la lista. Renombrar no puede fusionar dos valores en uno: eso sí tendría que decidirse aparte.`,"w"); return; }
    CAT[d.k][+d.i] = d.k==="pisos" ? (parseInt(nuevo)||nuevo) : nuevo;
    const tocados = renombrarCat(d.k, viejo, CAT[d.k][+d.i]); flash("cat:"+d.k+":"+CAT[d.k][+d.i]);
    S.bitacora.unshift({ n:++S.audSeq, fecha:"2026-08-11", hora:hora(),
      usuario:S.usuario, rol:ROLES[S.usuario].r, accion:"Renombró un valor de catálogo",
      modulo:"Catálogos", ref:(LISTAS.find(x=>x.k===d.k)||{}).n||d.k,
      cambios:[{campo:"Nombre", de:viejo, a:nuevo}] });
    cm();
    toast("✓ Renombrado",`«${esc(viejo)}» ahora es <b>${esc(nuevo)}</b>`
      + (tocados?`, y los <b>${tocados} registro(s)</b> que lo usaban ya lo dicen así.`:". Todavía no lo usaba ningún registro.")
      ,"v");
    render();
  },
  servRen: d => {
    const s = CAT.servicios.find(x=>x.id===d.id); if(!s) return;
    const usos = usosDe("servicios", s.nombre);
    modal(`<div class="mh"><h3>Renombrar «${esc(s.nombre)}»</h3><p>Servicio de ${esc(s.tipo)}</p></div>
    <div class="mb">
      <div class="fld"><label>Nombre nuevo <span class="req">*</span></label><input id="cr" value="${esc(s.nombre)}" autofocus></div>
      ${usos.length
        ? `<div class="note"><b>Se usa en ${usos.map(u=>`${u.c} ${u.n}`).join(", ")}.</b>
             Todos van a decir el nombre nuevo. La tarifa lo sigue encontrando: es el mismo servicio.</div>`
        : `<div class="note">Todavía no lo usa ningún registro.</div>`}
    </div>
    <div class="mf"><button class="btn" data-a="cm">Cancelar</button>
      <button class="btn p" data-a="servRenOK" data-id="${s.id}">Renombrar</button></div>`);
  },
  servRenOK: d => {
    const s = CAT.servicios.find(x=>x.id===d.id); if(!s) return;
    const nuevo = val("cr"), viejo = s.nombre;
    if(!nuevo){ marcaFalta(["cr"]); toast("Falta el nombre","","r"); return; }
    if(nuevo===viejo){ S.audOmitir=true; cm(); toast("Sin cambios","El nombre es el mismo.",""); return; }
    if(CAT.servicios.some(x=>x.id!==s.id && x.tipo===s.tipo && x.nombre.toLowerCase()===nuevo.toLowerCase())){
      toast("⚠ Ya existe",`«${esc(nuevo)}» ya está en ${esc(s.tipo)}.`,"w"); return; }
    s.nombre = nuevo;
    const tocados = renombrarCat("servicios", viejo, nuevo); flash("serv:"+s.id);
    S.bitacora.unshift({ n:++S.audSeq, fecha:"2026-08-11", hora:hora(),
      usuario:S.usuario, rol:ROLES[S.usuario].r, accion:"Renombró un servicio",
      modulo:"Catálogos", ref:s.tipo, cambios:[{campo:"Nombre", de:viejo, a:nuevo}] });
    cm();
    toast("✓ Renombrado",`«${esc(viejo)}» ahora es <b>${esc(nuevo)}</b>`
      + (tocados?`, y los <b>${tocados} registro(s)</b> que lo usaban ya lo dicen así.`:"."),"v");
    render();
  },
  servAdd: () => modal(`<div class="mh"><h3>Nuevo servicio</h3><p>Cada servicio cuelga de un tipo. Así el desplegable se filtra solo al agendar.</p></div>
    <div class="mb">
      <div class="fld"><label>Tipo de servicio <span class="req">*</span></label>
        <select id="sT">${activos("categorias").map(c=>`<option>${esc(c)}</option>`).join("")}</select></div>
      <div class="fld"><label>Nombre del servicio <span class="req">*</span></label><input id="sN" placeholder="Full paint, Deep clean…"></div>
      <div class="note">Después hay que darle tarifa en el Tarifario, si no saldrá como «NA» y levantará una excepción.</div></div>
    <div class="mf"><button class="btn" data-a="cm">Cancelar</button><button class="btn p" data-a="servSave">Agregar</button></div>`),
  servSave: () => {
    const n = val("sN"), t = val("sT");
    if(!n){ marcaFalta(["sN"]); toast("Falta el nombre","","r"); return; }
    if(CAT.servicios.some(s=>s.tipo===t && s.nombre.toLowerCase()===n.toLowerCase())){
      toast("⚠ Ya existe",`«${esc(n)}» ya está en ${esc(t)}.`,"w"); return; }
    const ns={id:"S"+Date.now(), tipo:t, nombre:n};
    CAT.servicios.push(ns); flash("serv:"+ns.id);
    cm(); toast("✓ Servicio agregado",`${esc(n)} dentro de ${esc(t)}.`,"v"); render();
  },
  servDel: d => {
    const s = CAT.servicios.find(x=>x.id===d.id);
    if(!s) return;
    s.baja = true;
    const uso = S.wos.filter(w=>w.serv===s.nombre).length;
    toast("Servicio dado de baja", uso? `«${esc(s.nombre)}» ya no se puede elegir. Las ${uso} Work Orders que lo usan lo conservan.`
                                      : `«${esc(s.nombre)}» deja de ofrecerse. Nada se borró.`,"w");
    render();
  },
  servAlta: d => {
    const s = CAT.servicios.find(x=>x.id===d.id);
    if(s){ s.baja=false; toast("Reactivado",`«${esc(s.nombre)}» vuelve a estar disponible.`,"v"); }
    render();
  },

  propBaja: d => {
    const p=P(d.id); p.activa=!p.activa;
    const n=S.wos.filter(w=>w.prop===d.id).length;
    toast(p.activa?"Propiedad reactivada":"Propiedad dada de baja",
      p.activa?`<b>${esc(p.nombre)}</b> vuelve a estar disponible para agendar.`
              :`<b>${esc(p.nombre)}</b> deja de ofrecerse para trabajos nuevos. Sus ${n} Work Orders y su historial se conservan intactos.`,
      p.activa?"v":"w");
    render();
  },
  tecBaja: d => {
    const t=T(d.id); t.activo=!t.activo;
    const n=S.wos.filter(w=>w.tec===d.id).length;
    toast(t.activo?"Técnico reactivado":"Técnico dado de baja",
      t.activo?`<b>${esc(tecN(d.id))}</b> vuelve a aparecer al asignar.`
              :`<b>${esc(tecN(d.id))}</b> deja de aparecer al asignar. Sus ${n} trabajos, su asistencia y sus pagos se conservan.`,
      t.activo?"v":"w");
    render();
  },

  /* «yo creo la lista de precios de la propiedad» — se parte de la general y se ajusta */
  preciosDesdeGeneral: d => {
    const gen = S.tarifas.filter(t=>!t.prop);
    if(!gen.length){ toast("No hay tarifa general","Carga primero el tarifario general.","r"); return; }
    gen.forEach(t=>S.tarifas.push({...t, id:"TR"+Date.now()+Math.random().toString(36).slice(2,6), prop:d.id}));
    toast("✓ Lista de precios creada",
      `<b>${esc(P(d.id).nombre)}</b> arrancó con ${gen.length} precios copiados de la general. Ajusta los que negociaron distinto — los que dejes igual dan lo mismo.`,"v");
    S.tab="precios"; render();
  },
  /* Un mismo formulario sirve para dar de alta y para corregir: si viene con
     id, llega con los datos puestos y guarda encima en vez de duplicar. */
  /* El management es abstracto — Claudia: "podrian demorar en conseguir o saber quien es".
     Por eso no se crea suelto: se registra sobre una propiedad que ya existe, y esa
     propiedad es la que queda vinculada. Si administra más, se vinculan luego desde cada una. */
  cliNuevo: d => { const c = d&&d.id ? by(S.clientes,d.id) : null;
    const propId = d&&d.prop ? d.prop : "";
    modal(`<div class="mh"><h3>${c?"Editar "+esc(c.nombre):"Nuevo management"}</h3>
      <p>${c?"Cambia lo que esté mal. Cada campo que toques queda en la Bitácora con el valor anterior.":"Se registra cuando ya se sabe quién administra una propiedad dada de alta."}</p></div>
    <div class="mb">
      <div class="fld"><label>Management Company Name <span class="req">*</span></label><input id="kN" value="${c?esc(c.nombre):""}"></div>
      ${c?"":`<div class="fld"><label>Propiedad <span class="req">*</span></label>
        <select id="kProp">${S.propiedades.map(p=>`<option value="${p.id}" ${p.id===propId?"selected":""}>${esc(p.nombre)}${p.cliente?" — ya tiene management":""}</option>`).join("")}</select>
        <div class="hint">La propiedad que administra este management.</div></div>`}
      <div class="fld"><label>Vendor Compliance Platform</label><select id="kVP">${["NetVendor","VendorCafe","RealPage","Email","Otro"].map(x=>`<option ${c&&c.vendorPlat===x?"selected":""}>${x}</option>`).join("")}</select></div>
      <div class="fld"><label>Contacto</label><input id="kC" value="${c?esc(c.contacto):""}"></div>
      <div class="fg c2"><div class="fld"><label>Teléfono</label><input id="kP" class="mono" value="${c?esc(c.tel):""}"></div>
        <div class="fld"><label>Correo</label><input id="kM" value="${c?esc(c.mail):""}"></div></div>
      <div class="fld"><label>Internal Notes</label><input id="kNotas" value="${c?esc(c.notas):""}"></div>
      ${c?`<div class="fld"><label>Date Added</label><div class="mono" style="padding:8px 0">${esc(c.fechaAlta)}</div></div>`:""}
    </div>
    <div class="mf"><button class="btn" data-a="cm">Cancelar</button>
      <button class="btn p" data-a="cliGuardar" data-id="${c?c.id:""}">${c?"Guardar corrección":"Guardar"}</button></div>`,true); },
  cliDocsModal: d => {
    const c = by(S.clientes, d.id);
    modal(`<div class="mh"><h3>Documentos de ${esc(c.nombre)}</h3>
      <p>Vendor Packet y W-9 no vencen: se marcan recibidos una sola vez y se adjunta el archivo.</p></div>
    <div class="mb">
      <div class="fld"><label>Vendor Packet</label><select id="docVP">${["Pendiente","Recibido"].map(x=>`<option ${x===(c.vendorPacket||"Pendiente")?"selected":""}>${x}</option>`).join("")}</select>
        <div style="display:flex;align-items:center;gap:9px;margin-top:7px">
          <button class="btn sm" data-a="cliDocsVPAdj">Adjuntar archivo</button>
          <span id="docVPN" style="font-size:11.5px;color:${c.vendorPacketPdf?"var(--verde)":"var(--faint)"}">${c.vendorPacketPdf?"📎 "+esc(c.vendorPacketPdf):"sin archivo"}</span></div></div>
      <div class="fld"><label>W-9</label><select id="docW9">${["Pendiente","Recibido"].map(x=>`<option ${x===(c.w9||"Pendiente")?"selected":""}>${x}</option>`).join("")}</select>
        <div style="display:flex;align-items:center;gap:9px;margin-top:7px">
          <button class="btn sm" data-a="cliDocsW9Adj">Adjuntar archivo</button>
          <span id="docW9N" style="font-size:11.5px;color:${c.w9Pdf?"var(--verde)":"var(--faint)"}">${c.w9Pdf?"📎 "+esc(c.w9Pdf):"sin archivo"}</span></div></div>
      <div class="note">Sirve para validar rápido si esta empresa ya está habilitada como proveedor, sin salir de Management.</div>
    </div>
    <div class="mf"><button class="btn" data-a="cm">Cancelar</button>
      <button class="btn p" data-a="cliDocsOK" data-id="${c.id}">Guardar</button></div>`);
  },
  /* Igual que coiAdj: no llama a render(), para no perder lo que ya se eligió en los selects */
  cliDocsVPAdj: () => {
    S.docVPPdf = S.docVPPdf ? null : "VendorPacket_Cordova_Property_Services.pdf";
    const e = document.getElementById("docVPN");
    if(e){ e.textContent = S.docVPPdf ? "📎 " + S.docVPPdf : "sin archivo";
      e.style.color = S.docVPPdf ? "var(--verde)" : "var(--faint)"; }
  },
  cliDocsW9Adj: () => {
    S.docW9Pdf = S.docW9Pdf ? null : "W9_Cordova_Property_Services.pdf";
    const e = document.getElementById("docW9N");
    if(e){ e.textContent = S.docW9Pdf ? "📎 " + S.docW9Pdf : "sin archivo";
      e.style.color = S.docW9Pdf ? "var(--verde)" : "var(--faint)"; }
  },
  cliDocsOK: d => {
    const c = by(S.clientes, d.id);
    c.vendorPacket = val("docVP"); c.w9 = val("docW9");
    if(S.docVPPdf!==undefined) c.vendorPacketPdf = S.docVPPdf || c.vendorPacketPdf || null;
    if(S.docW9Pdf!==undefined) c.w9Pdf = S.docW9Pdf || c.w9Pdf || null;
    S.docVPPdf = undefined; S.docW9Pdf = undefined;
    flash("cli:"+c.id); cm();
    toast("✓ Documentos actualizados",
      `Vendor Packet: <b>${esc(c.vendorPacket)}</b> · W-9: <b>${esc(c.w9)}</b>.`,"v");
    render();
  },
  /* La comunicación vive en la Propiedad, no en el Management — ver pestaña "Comunicación" de fichaProp. */
  propComAdd: d => {
    if(marcaFalta(["cmN"])){ toast("Falta la nota","Sin decir qué se habló, no sirve de registro.","r"); return; }
    S.comunicaciones.push({id:"CM"+nid("cm"),prop:d.id,fecha:"2026-08-21",
      medio:val("cmM"),contacto:val("cmC"),quien:S.usuario,nota:val("cmN")});
    toast("✓ Comunicación registrada","Queda en el historial de esta propiedad.","v");
    render();
  },
  cliGuardar: d => {
    const yo = d&&d.id ? by(S.clientes,d.id) : null;
    if(marcaFalta(yo?["kN"]:["kN","kProp"])){ toast("Faltan datos",yo?"Falta el nombre.":"Nombre y propiedad son obligatorios.","r"); return; }
    const tel=val("kP");
    // El aviso de duplicado no debe dispararse contra uno mismo al corregir
    if(tel && S.clientes.some(c=>c.tel===tel && c!==yo)){
      toast("⚠ Teléfono repetido",`Ya existe un registro con ese teléfono. El sistema evita el duplicado en vez de crear otro.`,"w"); return; }
    const datos = {nombre:val("kN"),contacto:val("kC"),tel,mail:val("kM"),
      vendorPlat:val("kVP"),notas:val("kNotas")};
    if(yo) return guardarEdicion(yo, datos, "Comercial", yo.nombre, null, "cli:"+yo.id);
    const nc = {id:"CL"+nid("cl"), ...datos, fechaAlta:"2026-08-11",
      vendorPacket:"Pendiente", vendorPacketPdf:null, w9:"Pendiente", w9Pdf:null};
    S.clientes.push(nc); flash("cli:"+nc.id);
    const prop = by(S.propiedades, val("kProp"));
    prop.cliente = nc.id; flash("prop:"+prop.id);
    cm(); toast("✓ Registrado",`<b>${esc(nc.nombre)}</b> vinculado a <b>${esc(prop.nombre)}</b>.`,"v"); render();
  },});
