"use strict";
let ultimoDescDecidido = null;
let ultimoDescManual = "";   // concepto del último descuento manual tocado — lo lee AUD_POST
const leerF = (id,def) => { const e=document.getElementById(id); return e ? e.value.trim() : def; };
function asignarApprovalRequest(id, quien){
  if(!quien) return;
  const manual=by(S.excepciones,id);
  let destino=manual;
  if(!destino) {
    const auto=excAuto().find(x=>x.id===id);
    if(!auto) return;
    const todas=S.excAsignaciones || (S.excAsignaciones={});
    destino=todas[id] || (todas[id]={});
  }
  const anterior=destino.assignedTo;
  const solId=String(id).startsWith("AUTO-A")?String(id).slice(6):null;
  if(solId){
    (S.aprobadoresSol||(S.aprobadoresSol={}))[solId]=quien;
    destino.aprueba=quien;
  }
  const asignacion={assignedTo:quien, assignedBy:S.usuario, assignedAt:hora(), workStatus:"In progress"};
  registrarHistorialApproval(destino,anterior&&anterior!==quien?"Reassigned":"Assigned",
    anterior&&anterior!==quien?`${anterior} → ${quien}`:quien);
  Object.assign(destino,asignacion);
  flash("exc:"+id);
  // Antes nadie se enteraba: la fila salía de «Unassigned» y parecía desaparecer.
  const x=excTodas().find(e=>e.id===id)||destino;
  if(quien!==S.usuario) avisar(quien,"Te asignaron un Request",
    `${esc(x.tipo||"Request")}${x.wo?` · WO-${x.wo}`:""} — asignado por ${esc(S.usuario)}. Lo ves en Requests → «Mine».`,"a");
  toast("Request assigned", quien===S.usuario
    ? `Ahora es tuyo: lo ves en la pestaña <b>Mine</b>.`
    : `<b>${esc(quien)}</b> ya tiene el aviso. Salió de «Unassigned»: lo ves en <b>All</b>, y ${esc(quien)} en su <b>Mine</b>.`,"v");
  render();
}
function registrarHistorialApproval(x, evento, detalle){
  (x.historial||=([])).push({evento,quien:S.usuario,hora:hora(),fecha:HOY_SUP,detalle:detalle||""});
}
/* Único lugar que decide qué le entra a nómina y qué se le factura al
   cliente por un concepto adicional ya aprobado y con precio — lo usan
   tanto la aprobación normal (medioOK) como el resolver "Definir precio del
   adicional" (precioDefGuardar), para no duplicar la regla en dos lados. */
function aplicarPagoFacturaAdicional(l, w, s, cobrar){
  const monto = (l.precio||0)*(l.cant||1);
  if(!(monto>0)) return {pagoTec:0, cobroCliente:0};
  const quienPidio = s.origen==="Planificada" ? "Oficina" : tecN(w.tec);
  const tecnicoPago = tecSubWO(l)||w.tec;
  S.excepciones.push({id:"X"+Date.now()+"_"+l.id, tipo:"Pago adicional al técnico", wo:w.id, subwo:l.id, tec:tecnicoPago,
    motivo:`Sub-Work Order aprobada · ${l.concepto}${l.ubic?" · "+l.ubic:""}`, monto,
    pide:quienPidio, aprueba:S.usuario, estado:"Aprobada",
    fecha:w.fecha, creada:{quien:quienPidio,hora:hora()}, resol:{quien:S.usuario,hora:hora()}});
  let cobroCliente = 0;
  if(cobrar){
    cobroCliente = monto;
    l.facturable=true; l.montoFactura=monto;
    w.extraFacturable = (w.extraFacturable||0) + monto;
    (l.hist=l.hist||[]).push([hora(), `Se suma ${money(monto)} a lo que se le factura a la propiedad`, S.usuario]);
  }
  return {pagoTec:monto, cobroCliente};
}
Object.assign(ACC, {


  excNueva: () => modalExc(),
  excGuardar: () => {
    if(marcaFalta(["xW","xMo"])){ toast("Falta información","Elige la Work Order y explica el motivo.","r"); return; }
    const nx={id:"X"+Date.now(), tipo:val("xT"), wo:+val("xW"),
      motivo:val("xMo"), monto:null, pide:S.usuario, aprueba:val("xA"),
      estado:"Pendiente", assignedTo:null, assignedBy:null, assignedAt:null, workStatus:"Unassigned",
      fecha:HOY_SUP, creada:{quien:S.usuario,hora:hora(),minuto:S.reloj,fecha:HOY_SUP},
      historial:[{evento:"Created",quien:S.usuario,hora:hora(),fecha:HOY_SUP}], resol:null};
    S.excepciones.push(nx); flash("exc:"+nx.id);
    cm(); toast("Request created",`It is <b>Unassigned</b>. Assign an owner before starting work. WO-${nx.wo} no se paga ni se factura hasta resolverla.`,"w"); render();
  },
  excFiltro: d => { S.excFiltro=d.f; render(); },
  excAsignarYo: d => asignarApprovalRequest(d.id,S.usuario),
  excAsignarModal: d => {
    const x=excTodas().find(y=>y.id===d.id); if(!x) return;
    const usuarios=Object.keys(ROLES);
    modal(`<div class="mh"><h3>Assign Request</h3><p>${esc(x.tipo)}${x.wo?` · WO-${x.wo}`:""}</p></div>
      <div class="mb"><div class="fld"><label>Assigned to</label><select id="excAsignada">${usuarios.map(u=>`<option ${u===x.assignedTo?"selected":""}>${esc(u)}</option>`).join("")}</select></div>
      <div class="hint">The assigned person owns the approval follow-up. First-line approval defaults to Thalia; Gustavo or another person can take it when it is outside Thalia's scope.</div></div>
      <div class="mf"><button class="btn" data-a="cm">Cancel</button><button class="btn p" data-a="excAsignarGuardar" data-id="${x.id}">Assign</button></div>`);
  },
  excAsignarGuardar: d => { const quien=val("excAsignada"); cm(); asignarApprovalRequest(d.id,quien); },
  /* «Ayuda en sitio» (la pidió el técnico desde el celular): se resuelve con una
     nota de qué se hizo y le llega un aviso al técnico. No toca pago ni factura. */
  excAyudaResolver: d => {
    const x=by(S.excepciones,d.id); if(!x) return;
    modal(`<div class="mh"><h3>Resolver ayuda</h3><p>${esc(x.motivo)}${x.wo?` · WO-${x.wo}`:""}</p></div>
      <div class="mb"><div class="fld"><label>¿Qué se hizo? <span class="req">*</span></label><textarea id="ayN" placeholder="Ej. Gustavo le llevó la llave"></textarea></div></div>
      <div class="mf"><button class="btn" data-a="cm">Cancelar</button><button class="btn p" data-a="excAyudaOK" data-id="${x.id}">Resolver</button></div>`);
  },
  excAyudaOK: d => {
    const x=by(S.excepciones,d.id), nota=leerF("ayN","");
    if(!x) return;
    if(!nota){ marcaFalta(["ayN"]); toast("Falta información","Escribí qué se hizo.","r"); return; }
    x.estado="Resuelta"; x.resol={quien:S.usuario,hora:hora(),nota};
    registrarHistorialApproval(x,"Resolved",nota);
    const w=W(x.wo);
    if(w) w.hist.push([hora(),`Ayuda en sitio resuelta: ${nota}`,S.usuario]);
    noti(`Ayuda en WO-${x.wo}`,`Ayuda: ${nota}`);
    cm(); flash("exc:"+x.id);
    toast("✓ Ayuda resuelta","Le avisamos al técnico en su celular.","v"); render();
  },
  excUnidadRevisar: d => modalCorregirUnidad(d.id),
  excUnidadAplicar: d => {
    const x=by(S.excepciones,d.id), datos=x&&x.datosUnidad, pisos=parseInt(val("corrPisos"));
    if(!x||!datos) return;
    if(!pisos || pisos<1){ toast("Falta el dato","Indica los pisos aprobados.","r"); return; }
    const u=U(datos.unidad), w=W(x.wo); if(!u||!w) return;
    const anterior=u.pisos;
    u.pisos=pisos;
    (u.cambios||=([])).push({campo:"pisos",anterior,nuevo:pisos,quien:S.usuario,hora:hora(),wo:w.id,origen:"Request"});
    x.estado="Aprobada"; x.accion=`Updated unit floors: ${anterior} → ${pisos}`;
    x.resol={quien:S.usuario,hora:hora()};
    registrarHistorialApproval(x,"Approved",x.accion);
    w.hist.push([hora(),x.accion,S.usuario]);
    cm(); flash("exc:"+x.id);
    toast("✓ Unit data updated",`Floors for ${esc(u.num)} changed from ${anterior} to ${pisos}. The audit stays on this Request.`,"v");
    render();
  },
  excAprob: d => {
    const x = by(S.excepciones,d.id);
    if(x){ x.estado="Aprobada"; x.resol={quien:S.usuario,hora:hora()}; registrarHistorialApproval(x,"Approved"); flash("exc:"+x.id);
      toast("✓ Excepción aprobada",`${esc(x.tipo)} — autorizada por ${S.usuario}. Queda registrado quién y cuándo.`,"v");
      render(); return; }
    const sa = solTodas().find(z=>"AUTO-A"+z.sol===d.id);
    if(sa){ modalMedio(sa.sol); return; }         // el adicional pregunta CÓMO aprobó el cliente
    const a = excAuto().find(y=>y.id===d.id);
    if(a){
      const nx={...a, id:"X"+Date.now(), auto:false, estado:"Aprobada", resol:{quien:S.usuario,hora:hora()}};
      registrarHistorialApproval(nx,"Approved"); S.excepciones.push(nx);
      if(a.tipo==="Cierre sin evidencia"){ const w=W(a.wo); if(w) w.evidExcusada=true; }
    }
    toast("✓ Excepción resuelta","Queda el registro de quién la autorizó.","v");
    render();
  },
  /* Salir de aquí sin decidir deja al técnico parado en la propiedad. Antes se
     cerraba en silencio y no había forma de saber por qué seguía frenada. */
  medioNo: d => { const w=W(+d.wo); cm();
    toast("⚠ Quedó sin decidir",
      `El adicional de WO-${w.id} sigue sin resolverse — <b>${esc(tecN(w.tec))}</b> puede seguir con lo programado, pero esa WO no se paga ni se factura hasta que decidas.
       La tienes en <b>Excepciones</b>.`,"w");
    render(); },
  medioOK: d => {
    const s = solTodas().find(z=>z.sol===d.sol), w = s&&W(s.wo);
    if(!s || (s.aprobador && s.aprobador!==S.usuario)){ toast("Aprobación delegada",`Esta solicitud debe aprobarla <b>${esc(s&&s.aprobador||"Thalia")}</b>. Si está fuera de su alcance, asígnala a Gustavo u otra persona antes de decidir.`,"w"); return; }
    const pend = s.lineas.filter(l=>l.estado==="Pendiente");
    document.querySelectorAll(".adprecio").forEach(e=>{ const l=pend.find(x=>x.id===+e.dataset.lid); if(l){ const p=parseFloat(e.value); if(Number.isFinite(p)&&p>=0){ l.precio=p; l.precioOrigen="manual-aprobado"; } } });
    // Aprobar y ponerle precio son decisiones distintas (Claudia): el precio
    // es opcional acá — si queda sin él, se resuelve después como Approval
    // Request "Definir precio del adicional" (ver excAuto / precioDefGuardar).
    // Con un solo concepto no hay tildes que leer: se aprueba entero.
    const chks = Array.from(document.querySelectorAll(".adchk"));
    const marc = new Set(chks.filter(c=>c.checked).map(c=>+c.dataset.lid));
    const ok = chks.length ? pend.filter(l=>marc.has(l.id)) : pend;
    const no = chks.length ? pend.filter(l=>!marc.has(l.id)) : [];
    // Reunión Claudia (feedback prototipo): "¿cómo se refleja en nómina y
    // facturación?" — antes no se reflejaba en ninguna de las dos.
    //   · Nómina: automático siempre que la línea tenga precio — se genera
    //     y se aprueba sola una excepción "Pago adicional al técnico" (la
    //     decisión de aprobarlo YA se tomó acá mismo, no hace falta otra).
    //   · Facturación: NO es automático — cada línea trae su propio
    //     casillero "Cobrar al cliente" (a veces se hace de cortesía), así
    //     que cubre los dos casos sin asumir ninguno por defecto.
    const cobraChks = Array.from(document.querySelectorAll(".adcobra"));
    const cobraSet = new Set(cobraChks.filter(c=>c.checked).map(c=>+c.dataset.lid));
    // Punto 7 del feedback: "cuando Claudia aprueba o rechaza un adicional,
    // no queda ninguna foto asociada a esa decisión" — el comprobante (si se
    // adjuntó desde el botón del modal) queda pegado a CADA línea que se
    // decide acá, apruebe o rechace.
    const fotoAprob = S._aprobFoto||null; S._aprobFoto=null;
    const sello = ip => ({medio:d.medio, quien:S.usuario, hora:hora(), ip, foto:fotoAprob});
    let pagoTec = 0, cobroCliente = 0; const sinPrecio = [];
    ok.forEach(l=>{ l.estado="Aprobado"; l.aprob=sello(d.medio==="Enlace digital"?"72.14.201.38":null);
      (l.hist=l.hist||[]).push([hora(), `Aprobada por ${d.medio.toLowerCase()}`, S.usuario]);
      if(l.origen==="Planificada"){
        l.estadoTrabajo=tecSubWO(l)?"Assigned":"Unassigned";
        desvalidar(w);
        (l.hist=l.hist||[]).push([hora(),`Activada para ${tecSubWO(l)?tecN(tecSubWO(l)):"asignación"}`,S.usuario]);
      }
      if(l.precio==null){
        // Thalia aprobó hablando con la propiedad, pero el cliente no dio
        // precio — queda pendiente de pago y factura hasta que se defina.
        l.precioPend=true; sinPrecio.push(l);
        (l.hist=l.hist||[]).push([hora(), "Aprobada sin precio — falta definirlo para pago y factura", S.usuario]);
      } else {
        const r = aplicarPagoFacturaAdicional(l, w, s, cobraSet.has(l.id));
        pagoTec += r.pagoTec; cobroCliente += r.cobroCliente;
      }
    });
    no.forEach(l=>{ l.estado="Rechazado"; l.aprob=sello(null);
      (l.hist=l.hist||[]).push([hora(), "Rechazada", S.usuario]); });
    // El pago/factura de la WO sigue frenado (vía woBloqueada) solo si queda
    // otra solicitud del técnico sin decidir — el técnico nunca estuvo
    // frenado, así que acá no hay nada que destrabarle a él.
    const quedan = S.adicionales.filter(a=>a.wo===w.id && a.estado==="Pendiente").length;
    flash("wo:"+w.id);
    const nom = a => a.map(l=>l.concepto).join(", ");
    if(ok.length) w.hist.push([hora(), `Adicional aprobado por ${d.medio.toLowerCase()} · ${nom(ok)}`, S.usuario]);
    if(ok.length){ (s.lineas||[]).forEach(l=>{ if(l.estado!=="Pendiente") l.aprobador=s.aprobador; }); }
    if(no.length) w.hist.push([hora(), `Adicional NO aprobado · ${nom(no)}`, S.usuario]);
    if(pagoTec>0) w.hist.push([hora(), `Nómina: ${money(pagoTec)} de pago adicional asignado según cada Sub-Work Order`, S.usuario]);
    cm();
    const sustento = d.medio==="Enlace digital"
      ? "Queda el clic real del cliente con hora e IP."
      : `Registrado como <b>${esc(d.medio)}</b>: queda quién y cuándo, pero sin clic del cliente.`;
    const plata = pagoTec>0
      ? `<br><br>💰 Se asigna a la nómina del técnico de cada Sub-Work Order: <b>${money(pagoTec)}</b>.`
        + (cobroCliente>0 ? ` Se le agrega a lo que se le factura a la propiedad: <b>${money(cobroCliente)}</b>.`
                          : ` No se le factura nada a la propiedad por esto — queda como costo interno.`)
      : "";
    const notaPrecio = sinPrecio.length
      ? `<br><br>⏳ <b>${sinPrecio.length} concepto(s) aprobado(s) sin precio</b>: ${esc(nom(sinPrecio))}. Queda una Request "Definir precio del adicional" — hasta que se resuelva no entra a nómina ni a factura.`
      : "";
    toast(no.length ? (ok.length?"Adicional aprobado en parte":"Adicional no aprobado") : "✓ Adicional aprobado",
      `${ok.length?`Sí: <b>${esc(nom(ok))}</b>. `:""}${no.length?`No: <b>${esc(nom(no))}</b>. `:""}${sustento}${plata}${notaPrecio} `
      + (quedan
          ? `<br><br><b>Ojo: el pago/factura de WO-${w.id} sigue frenado</b> — hay otra solicitud del técnico sin decidir.`
          : sinPrecio.length
          ? `<br><br>El pago/factura de WO-${w.id} sigue frenado hasta definir el precio.`
          : `<br><br>El pago/factura de WO-${w.id} ya puede seguir su curso.`),
      (no.length||quedan||sinPrecio.length)?"w":"v");
    noti(no.length ? (ok.length?"Adicional aprobado en parte":"Adicional NO aprobado") : "Adicional aprobado",
      `${ok.length?`Haz: ${nom(ok)}. `:""}${no.length?`NO hagas: ${nom(no)}. `:""}Lo decidió ${S.usuario} (${d.medio.toLowerCase()}).`, false);
    render();
  },
  excDefinirPrecio: d => modalDefinirPrecio(d.id),
  precioDefGuardar: d => {
    const lid = +String(d.id).slice(6);
    const l = by(S.adicionales,lid), w = l&&W(l.wo), s = l&&solTodas().find(x=>x.sol===l.sol);
    if(!l||!w||!s) return;
    if(marcaFalta(["dpP"])){ toast("Falta el precio","Escribe cuánto se le cobra al cliente.","r"); return; }
    const precio = parseFloat(val("dpP"));
    if(!(precio>=0)){ toast("Precio inválido","Tiene que ser 0 o más.","r"); return; }
    const chkCobra = document.getElementById("dpCobra"), cobrar = !!(chkCobra&&chkCobra.checked);
    l.precio = precio; l.precioOrigen="manual-resuelto"; delete l.precioPend;
    (l.hist=l.hist||[]).push([hora(), `Precio definido por ${S.usuario}`, S.usuario]);
    const r = aplicarPagoFacturaAdicional(l, w, s, cobrar);
    cm(); flash("wo:"+w.id);
    toast("✓ Precio definido",
      `${esc(l.concepto)} · ${money(precio)}. Entra a la nómina del técnico`
      + (r.cobroCliente>0 ? ` y se le agrega ${money(r.cobroCliente)} a lo que se le factura a la propiedad.` : "; no se le factura nada a la propiedad por esto."),
      "v");
    render();
  },
  aprobFoto: d => {
    // Adjuntar el comprobante reabre el modal (para mostrarlo) — hay que
    // rescatar qué estaba tildado o se pierde al reconstruirlo de cero.
    const marc = new Set(Array.from(document.querySelectorAll(".adchk")).filter(c=>c.checked).map(c=>c.dataset.lid));
    const cobra = new Set(Array.from(document.querySelectorAll(".adcobra")).filter(c=>c.checked).map(c=>c.dataset.lid));
    capturarFoto(url=>{
      S._aprobFoto=url; modalMedio(d.sol);
      document.querySelectorAll(".adchk").forEach(c=>{ c.checked=marc.size?marc.has(c.dataset.lid):true; });
      document.querySelectorAll(".adcobra").forEach(c=>{ c.checked=cobra.has(c.dataset.lid); });
    });
  },
  excRech: d => {
    const x = by(S.excepciones,d.id);
    if(x){ x.estado="Rechazada"; x.resol={quien:S.usuario,hora:hora()}; registrarHistorialApproval(x,"Rejected"); flash("exc:"+x.id);
      toast("Excepción rechazada","Queda registrado que no se autorizó.","w"); render(); return; }
    const sa = solTodas().find(z=>"AUTO-A"+z.sol===d.id);
    if(sa){
      const w = W(sa.wo);
      const pend = sa.lineas.filter(l=>l.estado==="Pendiente");
      pend.forEach(l=>{ l.estado="Rechazado"; l.aprob={medio:"—",quien:S.usuario,hora:hora(),ip:null};
        if(l.origen==="Planificada") l.estadoTrabajo="Canceled";
        (l.hist=l.hist||[]).push([hora(), "Rechazada", S.usuario]); });
      if(w.estado==="Esperando aprobación"
         && !S.adicionales.some(a=>a.wo===w.id && a.estado==="Pendiente")) w.estado="In progress";
      flash("wo:"+w.id);
      const nom = pend.map(l=>l.concepto).join(", ");
      w.hist.push([hora(),`Adicional no aprobado · ${nom}`,S.usuario]);
      toast("Adicional rechazado",`No se autorizó <b>${esc(nom)}</b>. <b>${esc(tecN(w.tec))}</b> ya fue avisado de que no lo ejecute; puede seguir con el trabajo original.`,"w");
      noti("Adicional NO aprobado",`${S.usuario} no autorizó ${nom}. No lo ejecutes, sigue con lo original.`,false);
      render(); return;
    }
    const a=excAuto().find(y=>y.id===d.id);
    if(a){ const nx={...a,id:"X"+Date.now(),auto:false,estado:"Rechazada",resol:{quien:S.usuario,hora:hora()}};
      registrarHistorialApproval(nx,"Rejected"); S.excepciones.push(nx); }
    toast("Excepción rechazada","Queda registrado que no se autorizó.","w"); render();
  },

  /* Marcar pagado: primero el cheque y su foto (opcionales); la nómina se registra en pagarTecOK. */
  pagarTec: d => {
    const c=nominaCalc(d.tec);
    if(!c.ws.length){ toast("🚫 Nada para pagar","No hay Work Orders listas para pagar.","r"); return; }
    S._recibo=null;
    modal(`<div class="mh"><h3>Marcar pagado</h3><p>${esc(tecN(d.tec))} · ${esc(periodoTexto(S.periodo))} · ${money(c.tot)}</p></div>
    <div class="mb"><div class="fld"><label>Cheque #</label><input id="pgCh" placeholder="Opcional" autocomplete="off"></div>${campoRecibo("Comprobante")}</div>
    <div class="mf"><button class="btn" data-a="cm">Cancelar</button><button class="btn p" data-a="pagarTecOK" data-tec="${d.tec}">Pagar</button></div>`);
  },
  pagarTecOK: d => { const foto=S._recibo, cheque=val("pgCh"); cm(); pagarNomina(d.tec,{cheque,foto}); },
  pagarSemana: () => pagarNomina(null),
  /* Pago parcial por WO (p. ej. externos en proyectos grandes): crea su propio registro y baja el saldo. */
  parcialModal: d => {
    const w=W(+d.id); if(!w||!woPagable(w)) return;
    const sal=saldoTecWO(w); S._recibo=null;
    modal(`<div class="mh"><h3>Pago parcial</h3><p>WO-${w.id} · ${esc(tecN(w.tec))} · saldo ${money(sal)}${pagadoTecWO(w)>0?` de ${money(egresoWO(w))}`:""}</p></div>
    <div class="mb"><div class="fg c2"><div class="fld"><label>Monto <span class="req">*</span></label><input id="pcM" type="number" min="0.01" max="${sal}" step="0.01"></div>
      <div class="fld"><label>Cheque #</label><input id="pcCh" placeholder="Opcional" autocomplete="off"></div></div>
      <div class="fld"><label>Nota</label><input id="pcN" placeholder="Ej. anticipo del proyecto"></div>${campoRecibo("Comprobante")}</div>
    <div class="mf"><button class="btn" data-a="cm">Cancelar</button><button class="btn p" data-a="parcialOK" data-id="${w.id}">Pagar</button></div>`);
  },
  parcialOK: d => {
    const w=W(+d.id); if(!w||!woPagable(w)){ S.audOmitir=true; cm(); return; }
    const sal=saldoTecWO(w), m=Math.round(parseFloat(val("pcM"))*100)/100;
    if(!(m>0)){ S.audOmitir=true; marcaFalta(["pcM"]); toast("Falta el monto","Escribe cuánto se le paga ahora.","r"); return; }
    if(m>=sal-0.004){ S.audOmitir=true; toast("Es el saldo completo","Para pagar todo usa «Marcar pagado».","r"); return; }
    const id="NM"+(S.nomina.length+1), nota=val("pcN"), cheque=val("pcCh"), foto=S._recibo||null;
    S.nomina.push({id,semana:S.semana,periodo:{...S.periodo},tec:w.tec,wos:[w.id],total:m,tipo:"Parcial",nota,cheque,foto,quien:S.usuario,fecha:HOY_SUP,hora:hora()});
    (w.pagosTec=w.pagosTec||[]).push({monto:m,fecha:HOY_SUP,quien:S.usuario,nota,nomina:id});
    w.hist.push([hora(),`Pago parcial al técnico · ${money(m)} de ${money(egresoWO(w))}`,S.usuario]);
    cm(); toast("✓ Pago parcial",`${esc(tecN(w.tec))} · WO-${w.id} · ${money(m)}. Le quedan ${money(sal-m)}.`,"v"); render();
  },
  /* Historial de nómina: filtros, detalle y comprobante que se adjunta después. */
  nomFiltro: () => { const f=filtroNom();
    f.tec=leerF("nhTec",f.tec); f.desde=leerF("nhDesde",f.desde); f.hasta=leerF("nhHasta",f.hasta); f.q=leerF("nhQ",f.q); f.ptec=leerF("nhPTec",f.ptec); render(); },
  nomLimpiar: () => { Object.assign(filtroNom(),{tec:"",desde:"",hasta:"",q:""}); render(); },
  nomVer: d => { const a=S.nomAbiertos||(S.nomAbiertos=[]), i=a.indexOf(d.id); if(i>-1) a.splice(i,1); else a.push(d.id); render(); },
  nomAdjuntar: d => {
    const n=S.nomina.find(x=>nomId(x)===d.id); if(!n) return; S._recibo=null;
    modal(`<div class="mh"><h3>Adjuntar comprobante</h3><p>${esc(nomTecs(n).map(tecN).join(", "))} · ${money(n.total||0)} · ${esc(n.fecha||"")}</p></div>
    <div class="mb"><div class="fld"><label>Cheque #</label><input id="naCh" value="${esc(n.cheque||"")}" autocomplete="off"></div>${campoRecibo("Comprobante")}</div>
    <div class="mf"><button class="btn" data-a="cm">Cancelar</button><button class="btn p" data-a="nomAdjuntarGuardar" data-id="${esc(d.id)}">Guardar</button></div>`);
  },
  nomAdjuntarGuardar: d => {
    const n=S.nomina.find(x=>nomId(x)===d.id); if(!n){ cm(); return; }
    const ch=val("naCh");
    if(!S._recibo && ch===(n.cheque||"")){ S.audOmitir=true; toast("Falta el comprobante","Toma la foto del cheque o escribe el número.","r"); return; }
    n.cheque=ch; if(S._recibo) n.foto=S._recibo;
    cm(); toast("✓ Comprobante guardado","Ya aparece en el historial.","v"); render();
  },
  /* Descuento general a la nómina de la semana: concepto obligatorio, WO y descripción opcionales. */
  descManualModal: d => {
    if(S.periodo.tipo!=="semana") return;
    const ws=S.wos.filter(w=>w.tec===d.tec && w.estado!=="Canceled" && w.fecha && w.fecha>=fechaMover(HOY_SUP,-60)).sort((a,b)=>a.fecha<b.fecha?1:-1);
    modal(`<div class="mh"><h3>Descuento</h3><p>${esc(tecN(d.tec))} · ${esc(periodoTexto(S.periodo))}</p></div>
    <div class="mb"><div class="fg c2"><div class="fld"><label>Monto <span class="req">*</span></label><input id="dmM" type="number" min="0.01" step="0.01"></div>
      <div class="fld"><label>Concepto <span class="req">*</span></label><input id="dmC" placeholder="Ej. trabajo mal hecho" maxlength="60" autocomplete="off"></div></div>
      <div class="fg c2"><div class="fld"><label>WO</label><select id="dmWO"><option value="">— ninguna —</option>${ws.map(w=>`<option value="${w.id}">WO-${w.id} · ${esc(w.fecha.slice(5))} · ${esc(P(w.prop).nombre)} ${U(w.unidad)?esc(U(w.unidad).num):""}</option>`).join("")}</select></div>
      <div class="fld"><label>Otra WO #</label><input id="dmWOt" type="number" min="1" placeholder="Opcional"></div></div>
      <div class="fld"><label>Descripción</label><input id="dmD" placeholder="Breve — el técnico la ve" maxlength="90" autocomplete="off"></div></div>
    <div class="mf"><button class="btn" data-a="cm">Cancelar</button><button class="btn p" data-a="descManualOK" data-tec="${d.tec}">Aplicar</button></div>`);
  },
  descManualOK: d => {
    const monto=Math.round(parseFloat(val("dmM"))*100)/100, concepto=val("dmC"), t=val("dmWOt");
    const sinC=marcaFalta(["dmC"]), sinM=marcaFalta(["dmM"])||!(monto>0);
    if(sinC||sinM){ S.audOmitir=true; toast("Faltan datos","Monto y concepto son obligatorios.","r"); return; }
    const wo = t ? parseInt(t,10) : (val("dmWO") ? +val("dmWO") : null);
    if(t && !(wo>0)){ S.audOmitir=true; toast("WO inválida","Escribe solo el número de la WO.","r"); return; }
    ultimoDescManual = concepto;
    S.descuentos.push({id:"DS"+Date.now()+Math.floor(Math.random()*99), tipo:"Manual", estado:"Aplicado", tec:d.tec, semana:S.periodo.sem,
      wo, concepto, motivo:concepto, desc:val("dmD"), monto, quien:S.usuario, fecha:HOY_SUP, hora:hora()});
    cm(); toast("✓ Descuento aplicado",`−${money(monto)} a <b>${esc(tecN(d.tec))}</b> · ${esc(concepto)}.`,"v"); render();
  },
  descQuitar: d => {
    const x=by(S.descuentos,d.id);
    if(!x || x.tipo!=="Manual" || x.nomina){ S.audOmitir=true; return; }
    ultimoDescManual = x.concepto;
    S.descuentos.splice(S.descuentos.indexOf(x),1);
    toast("Descuento quitado",`${esc(x.concepto)} · ${money(x.monto)} ya no se le descuenta a <b>${esc(tecN(x.tec))}</b>.`,"w"); render();
  },
  /* Filtros de facturas (Facturación y Cobranza) */
  facFiltro: () => { const f=filtroFac();
    f.q=leerF("fcQ",f.q); f.prop=leerF("fcProp",f.prop); f.estado=leerF("fcEst",f.estado); f.desde=leerF("fcDesde",f.desde); f.hasta=leerF("fcHasta",f.hasta); render(); },
  facFiltroLimpiar: () => { Object.assign(filtroFac(),{q:"",prop:"",estado:"",desde:"",hasta:""}); render(); },
  /* Descuento por devolución: quien paga decide si se aplica o no. */
  descAplicar: d => {
    const x = by(S.descuentos,d.id);
    if(!x || x.estado!=="Por decidir") return;
    ultimoDescDecidido = x.id;
    Object.assign(x,{estado:"Aplicado", decidio:S.usuario, horaDecision:hora(), fechaDecision:HOY_SUP, motivoDecision:""});
    flash("desc:"+x.id);
    toast("Descuento aplicado",`Se le descuenta <b>${money(x.monto)}</b> a <b>${esc(tecN(x.tec))}</b> en su pago de la semana ${x.semana}.`,"v"); render();
  },
  descNoAplicar: d => {
    const x = by(S.descuentos,d.id);
    if(!x || x.estado!=="Por decidir") return;
    modal(`<div class="mh"><h3>No aplicar descuento</h3>
      <p>${esc(tecN(x.tec))} · ${money(x.monto)} · WO-${x.wo}</p></div>
    <div class="mb"><div class="fld"><label>Motivo <span class="req">*</span></label>
      <input id="dnM" placeholder="Ej. no fue su culpa, el daño ya estaba"></div>
      <div class="note">Queda registrado con tu nombre. El técnico no ve este descuento en su pago.</div></div>
    <div class="mf"><button class="btn" data-a="cm">Cancelar</button><button class="btn p" data-a="descNoAplicarOK" data-id="${x.id}">No aplicar</button></div>`);
  },
  descNoAplicarOK: d => {
    const x = by(S.descuentos,d.id);
    if(!x || x.estado!=="Por decidir"){ cm(); return; }
    if(marcaFalta(["dnM"])){ toast("Falta el motivo","Escribe por qué no se aplica el descuento.","r"); return; }
    ultimoDescDecidido = x.id;
    Object.assign(x,{estado:"No aplicado", decidio:S.usuario, horaDecision:hora(), fechaDecision:HOY_SUP, motivoDecision:val("dnM").trim()});
    flash("desc:"+x.id); cm();
    toast("Descuento no aplicado",`A <b>${esc(tecN(x.tec))}</b> no se le descuenta <b>${money(x.monto)}</b>. Queda el motivo registrado.`,"w"); render();
  },
});
/* Qué entra al pago y cuánto: las WO pagables del período (más las pendientes de semanas anteriores, si se mira una semana)
   a su saldo — lo que falte tras pagos parciales — y por técnico, con sus descuentos todavía sin descontar; nunca baja de cero. */
function nominaCalc(tec){
  const sem=S.periodo.tipo==="semana";
  const todas=S.wos.filter(w=>enPeriodo(w.fecha,S.periodo)&&w.estado==="Completed"&&(!tec||w.tec===tec)&&aprobPagoOK(w)&&!w.pagadaTec&&!subWOsPendientesDeWO(w.id).length&&!clienteRevisionPendienteDeWO(w.id));
  const bloqueadas=todas.filter(w=>woBloqueada(w.id));
  const previas=sem?woPendAnteriores(tec,S.periodo.sem):[];
  const ws=todas.filter(w=>!woBloqueada(w.id)).concat(previas);
  // Punto 10: incluye los adicionales de Sub-Work Order ya aprobados.
  const extrasPago=extrasAprobadosDeWOs(ws);
  const tecs=[...new Set(ws.map(w=>w.tec).filter(Boolean).concat(extrasPago.map(tecExtra).filter(Boolean)))];
  const filas=tecs.map(t=>{
    const wt=ws.filter(w=>w.tec===t), ex=extrasPago.filter(x=>tecExtra(x)===t);
    const b=wt.reduce((a,w)=>a+saldoTecWO(w),0)+ex.reduce((a,x)=>a+(x.monto||0),0);
    const ds=sem?descSemana(t,S.periodo.sem).filter(x=>!x.nomina):[], dd=ds.reduce((a,x)=>a+x.monto,0);
    return {t,wt,ds,b,dd,tot:Math.max(0,b-dd)};
  });
  return {ws,bloqueadas,previas,filas,tot:filas.reduce((a,f)=>a+f.tot,0)};
}
/* Claudia: se puede marcar pagado por técnico; lo que le quede pendiente
   (Request, Sub-WO, cliente) queda afuera y se paga después.
   Un registro de nómina por técnico, con su cheque y comprobante (ext) si se dieron. */
function pagarNomina(tec, ext){
  ext=ext||{};
  const c=nominaCalc(tec);
  if(!c.ws.length){ S.audOmitir=true; toast("🚫 Nada para pagar",
    c.bloqueadas.length?`${c.bloqueadas.length} Work Order(s) con excepción sin resolver — es todo lo que hay pendiente en este período.`:"No hay Work Orders listas para pagar.","r"); return; }
  c.filas.forEach(f=>{
    const id="NM"+(S.nomina.length+1);
    S.nomina.push({id, semana:S.semana, periodo:{...S.periodo}, tec:f.t, wos:f.wt.map(w=>w.id), total:f.tot, desc:Math.min(f.b,f.dd),
      cheque:ext.cheque||"", foto:ext.foto||null, quien:S.usuario, fecha:HOY_SUP, hora:hora()});
    f.ds.forEach(x=>{ x.nomina=id; });   // ya se descontó: no se vuelve a restar ni se puede quitar
    f.wt.forEach(w=>{
      const sal=saldoTecWO(w);
      if(sal>0.004) (w.pagosTec=w.pagosTec||[]).push({monto:sal,fecha:HOY_SUP,quien:S.usuario,nota:"Pago final",nomina:id});
      w.pagadaTec=true; w.hist.push([hora(),`Pagada al técnico en nómina — ${periodoTexto(S.periodo)}`,S.usuario]);
    });
  });
  toast(tec?`✓ ${esc(tecN(tec))} marcado como pagado`:"✓ Nómina aprobada",
    `${periodoTexto(S.periodo)} · ${money(c.tot)}${tec?"":` a ${c.filas.length} técnicos`}.`
    + (c.previas.length?` Incluye ${c.previas.length} WO de semanas anteriores.`:"")
    + (c.bloqueadas.length?` <b>${c.bloqueadas.length} WO(s) quedaron afuera</b> por excepción sin resolver — se pagan cuando se resuelva.`:""),"v"); render();
}
function aprobarWO(w, que){
  if(!w) return;
  leerValDraft(w); if(!aplicarEdicionVal(w)) return;
  const sello={quien:S.usuario,hora:hora(),fecha:HOY_SUP};
  if(que!=="factura" && !aprobPagoOK(w)) w.aprobPago={...sello};
  if(que!=="pago" && !aprobFacturaOK(w)) w.aprobFactura={...sello};
  w.validada = aprobPagoOK(w) && aprobFacturaOK(w);
  S._valDraft=null; cm();
  w.hist.push([hora(),que==="ambos"?"Work Order validada para facturación y nómina":que==="pago"?"Pago aprobado (nómina)":"Factura aprobada",S.usuario]);
  toast(que==="ambos"?"✓ Work Order validada":que==="pago"?"✓ Pago aprobado":"✓ Factura aprobada",
    `WO-${w.id} ${que==="ambos"?"pasa a nómina y facturación":que==="pago"?"pasa a nómina":"pasa a facturación"}. Por ${S.usuario}.`,"v"); render();
}
/* Validar con dinero (Claudia/Erika): edita Cobro y Pago técnico y agrega ajustes. */
function modalValidar(w){
  const dr=(S._valDraft&&S._valDraft.wo===w.id)?S._valDraft:{};
    const ads=S.adicionales.filter(a=>a.wo===w.id), mv=S.movs.filter(m=>m.wo===w.id);
    const subs=subWOsOperativas().filter(a=>a.wo===w.id && a.estadoTrabajo!=="Canceled");
    const subsPend=subWOsPendientesDeWO(w.id);
    /* Reunión 2026-09-09: las horas NO bloquean — al técnico se le paga por
       trabajo (pago del tarifario × cantidad), nunca por hora, así que exigir
       "horas trabajadas" para validar no correspondía. Solo evidencia y
       tarifa son requisito real. El tiempo en sitio se sigue guardando solo
       (llegada → término), pero como dato de operación, no de nómina. */
    const falta = [];
    if(!w.evid) falta.push("evidencia del trabajo");
    if(ingresoWO(w)===null) falta.push("tarifa");
    if(subsPend.length) falta.push(`${subsPend.length} Sub-WO sin terminar o sin evidencia`);
    if(clienteRevisionPendienteDeWO(w.id)) falta.push("confirmación del cliente");
    const faltaBase=!w.evid || ingresoWO(w)===null;
    modal(`<div class="mh"><h3>Validar WO-${w.id}</h3>
      <p>${esc(P(w.prop).nombre)} · ${esc(U(w.unidad).num)} · ${esc(tecN(w.tec))}</p></div>
    <div class="mb">
      <table><tbody>
        <tr><td style="width:40px">${w.serv?'<span class="pill v">✓</span>':'<span class="pill r">—</span>'}</td>
          <td><b>Servicios realizados</b><div style="font-size:11.5px;color:var(--soft)">${esc(w.serv)} × ${w.cant||1}</div></td></tr>
        <tr><td>${ads.length?'<span class="pill v">✓</span>':'<span class="pill g">·</span>'}</td>
          <td><b>Servicios adicionales</b><div style="font-size:11.5px;color:var(--soft)">${ads.length?ads.map(a=>esc(a.concepto||a.desc.slice(0,40))+" ("+a.estado+")").join(", "):"ninguno"}</div></td></tr>
        <tr><td>${subs.length&&!subsPend.length?'<span class="pill v">✓</span>':subsPend.length?'<span class="pill r">—</span>':'<span class="pill g">·</span>'}</td>
          <td><b>Sub-Work Orders operativas</b><div style="font-size:11.5px;color:var(--soft)">${subs.length?subs.map(a=>`${esc(a.concepto)} · ${esc(tecN(tecSubWO(a)))} · ${esc(a.estadoTrabajo||"Unassigned")} · ${(a.fotosEvidArr||[]).length} foto(s)`).join("<br>"):"ninguna"}</div></td></tr>
        <tr><td>${mv.length?'<span class="pill v">✓</span>':'<span class="pill g">·</span>'}</td>
          <td><b>Materiales</b><div style="font-size:11.5px;color:var(--soft)">${mv.length?mv.map(m=>esc(by(S.productos,m.prod).nombre)+" ×"+m.cant).join(", ")+" · "+money(materialWO(w)):"ninguno"}</div></td></tr>
        <tr><td><span class="pill g">·</span></td>
          <td><b>Tiempo en sitio</b><div style="font-size:11.5px;color:var(--soft)">${w.horas?w.horas+" h (de la llegada al término)":"—"} · informativo, no cambia el pago (es por trabajo)</div></td></tr>
        <tr><td>${w.evid?'<span class="pill v">✓</span>':'<span class="pill r">—</span>'}</td>
          <td><b>Evidencia y observaciones</b><div style="font-size:11.5px;color:var(--soft)">${w.evid} foto(s)${w.notas?" · "+esc(w.notas):""}</div></td></tr>
      </tbody></table>
      ${falta.length?`<div class="note r" style="margin-top:12px"><b>Falta: ${esc(falta.join(", "))}.</b>
        Su flujograma dice «solicitar información al técnico» antes de validar.</div>`
       :`<div class="note v" style="margin-top:12px"><b>Todo completo.</b> «Aprobar pago» libera la nómina, «Aprobar factura» la facturación, «Validar» las dos.</div>`}
      <div style="margin-top:10px;display:flex;gap:6px;align-items:center"><span style="font-size:11px;color:var(--faint)">Estado</span>${pillsAprob(w)}</div>
      ${puedeVerUtilidad()?bloqueDineroVal(w,dr):""}
    </div>
    <div class="mf"><button class="btn" data-a="cm">Cerrar</button>
      ${puedeVerUtilidad()?`<button class="btn" data-a="valGuardar" data-id="${w.id}">Guardar</button>`:""}
      ${faltaBase?`<button class="btn" data-a="pedirInfo" data-id="${w.id}">Solicitar info al técnico</button>`:""}
      ${aprobPagoOK(w)?"":`<button class="btn" data-a="aprobPago" data-id="${w.id}" ${falta.length?"disabled":""}>Aprobar pago</button>`}
      ${aprobFacturaOK(w)?"":`<button class="btn" data-a="aprobFactura" data-id="${w.id}" ${falta.length?"disabled":""}>Aprobar factura</button>`}
      ${aprobPagoOK(w)&&aprobFacturaOK(w)?"":`<button class="btn ${falta.length?"":"v"}" data-a="validarOK" data-id="${w.id}" ${falta.length?"disabled":""}>Validar</button>`}</div>`,true);
}

/* Bloque «Dinero» del modal de validar: solo lo ve quien puede ver utilidad. */
function bloqueDineroVal(w,dr){
  const cobro=ingresoBaseWO(w), pago=egresoBaseWO(w), mat=materialWO(w), comp=asignadoGastoWO(w.id);
  const ajC=ajustesValTotal(w,"cobro"), ajP=ajustesValTotal(w,"pago");
  const gan=ingresoWO(w)===null?null:utilidadNetaWO(w);
  const fila=(t,v,col)=>`<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:12px"><span style="color:var(--soft)">${t}</span><span class="mono" ${col?`style="color:${col}"`:""}>${v}</span></div>`;
  const num=v=>v==null?"":String(Math.round(v*100)/100);
  return `<div class="card" style="margin-top:14px"><div class="chd"><h3>Dinero</h3></div><div class="cp">
    <div class="fg c2">
      <div class="fld"><label>Cobro</label><input id="vaCobro" class="mono" value="${esc(dr.cobro!==undefined?dr.cobro:num(cobro))}" placeholder="0.00"></div>
      <div class="fld"><label>Pago técnico</label><input id="vaPago" class="mono" value="${esc(dr.pago!==undefined?dr.pago:num(pago))}" placeholder="0.00"></div></div>
    <div class="fld"><label>Motivo</label><input id="vaMot" value="${esc(dr.mot||"")}" placeholder="Obligatorio si cambias Cobro o Pago"></div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;font-size:12px"><span style="color:var(--soft)">Materiales</span><span><span class="mono">${money(mat)}</span> <button class="btn sm" data-a="valMatModal" data-id="${w.id}">Ajustar</button></span></div>
    ${comp?fila("Gastos compartidos",money(comp)):""}
    ${ajC||ajP?fila("Extras y descuentos",`cobro ${ajC>=0?"+":"−"}${money(Math.abs(ajC))} · pago ${ajP>=0?"+":"−"}${money(Math.abs(ajP))}`):""}
    ${gan===null?"":`<div style="display:flex;justify-content:space-between;padding:7px 0 0;margin-top:4px;border-top:1px solid var(--line);font-weight:750"><span>Ganancia</span><span class="mono" style="color:${gan>=0?"var(--verde)":"var(--rojo)"}">${money(gan)}</span></div>`}
    <div class="dl" style="margin:12px 0 5px;font-weight:750;font-size:12px">Ajustes</div>
    ${(w.ajustesVal||[]).map(a=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:3px 0;font-size:12px">
      <span><span class="pill ${AJUSTES_VAL[a.tipo]&&AJUSTES_VAL[a.tipo].signo<0?"w":"g"}">${esc(a.tipo)}</span> ${esc(a.concepto)}</span>
      <span><span class="mono">${money(ajusteMonto(a))}</span> <button class="btn sm" data-a="valAjQuitar" data-id="${w.id}" data-aid="${a.id}" title="Quitar">×</button></span></div>`).join("")||`<div class="hint">Sin ajustes.</div>`}
    <div class="fg c3" style="margin-top:8px">
      <div class="fld"><label>Tipo</label><select id="vaTipo">${Object.keys(AJUSTES_VAL).map(t=>`<option ${t===dr.tipo?"selected":""}>${t}</option>`).join("")}</select></div>
      <div class="fld"><label>Concepto</label><input id="vaConc" value="${esc(dr.conc||"")}"></div>
      <div class="fld"><label>Monto</label><input id="vaMonto" class="mono" value="${esc(dr.monto||"")}" placeholder="0.00"></div></div>
    <button class="btn sm" data-a="valAjAgregar" data-id="${w.id}">+ Agregar</button>
    <div class="hint" style="margin-top:6px">«Cobro extra» y «Descuento cliente» salen en la factura (concepto en inglés como lo escribas). «Pago extra» y «Descuento técnico» entran a la nómina.</div>
  </div></div>`;
}
/* Guarda lo tecleado en el bloque para no perderlo al re-abrir el modal. */
function leerValDraft(w){
  if(!document.getElementById("vaCobro")) return;
  S._valDraft={wo:w.id, cobro:val("vaCobro"), pago:val("vaPago"), mot:val("vaMot"), tipo:val("vaTipo"), conc:val("vaConc"), monto:val("vaMonto")};
}
/* Aplica Cobro/Pago técnico editados sobre w.precio / w.pago (por unidad, como
   los lee ingresoWO/egresoWO). Sin Motivo no cambia nada. */
function aplicarEdicionVal(w){
  if(!puedeVerUtilidad() || !document.getElementById("vaCobro")) return true;
  const cant=w.cant||1, mot=val("vaMot"), cambios=[];
  const rev=(id,actual,campo,etq)=>{
    const t=val(id); if(t==="") return true;
    const n=parseFloat(t);
    if(!Number.isFinite(n)||n<0){ S.audOmitir=true; toast("Monto inválido",`${etq}: escribe un número mayor o igual a 0.`,"r"); marcaFalta([id]); return false; }
    if(actual===null || Math.abs(n-actual)>.004) cambios.push({campo,etq,antes:actual,despues:n});
    return true;
  };
  if(!rev("vaCobro",ingresoBaseWO(w),"precio","Cobro") || !rev("vaPago",egresoBaseWO(w),"pago","Pago técnico")) return false;
  if(cambios.length && !mot){ S.audOmitir=true; marcaFalta(["vaMot"]); toast("Falta el motivo","Escribe por qué cambias el cobro o el pago.","r"); return false; }
  cambios.forEach(c=>{
    w[c.campo]=c.despues/cant;
    w.hist.push([hora(),`${c.etq} ${c.antes===null?"sin definir":money(c.antes)} → ${money(c.despues)} · ${mot}`,S.usuario]);
  });
  return true;
}
/* Materiales se corrigen desde Validar WO para que Erika no tenga que salir de
   la revisión. Cada cambio actualiza la salida de inventario, el costo de la
   WO y la utilidad; además invalida las aprobaciones previas. */
function leerValMatDraft(){
  const d=S._valMatDraft; if(!d) return;
  d.filas.forEach((f,i)=>{
    const p=document.getElementById("vmP"+i), c=document.getElementById("vmC"+i), t=document.getElementById("vmT"+i);
    if(p) f.prod=p.value; if(c) f.cant=c.value; if(t) f.costo=t.value;
  });
}
function modalMaterialesVal(w){
  const d=(S._valMatDraft&&S._valMatDraft.wo===w.id)?S._valMatDraft:{wo:w.id,filas:S.movs
    .filter(m=>m.wo===w.id&&m.tipo==="salida"&&!m.cliente)
    .map(m=>({id:m.id,prod:m.prod,cant:String(m.cant),costo:String(m.costo)}))};
  S._valMatDraft=d;
  const prods=S.productos.filter(p=>p.consumible!==false&&p.cat!=="Suministros de oficina");
  modal(`<div class="mh"><h3>Ajustar materiales · WO-${w.id}</h3><p>Cambia lo usado o agrega un material. El inventario y la utilidad se actualizan.</p></div>
    <div class="mb">${d.filas.length?d.filas.map((f,i)=>`<div class="adfila"><select id="vmP${i}">${prods.map(p=>`<option value="${p.id}" ${p.id===f.prod?"selected":""}>${esc(p.nombre)} · ${esc(p.um)}</option>`).join("")}</select><button class="adx" data-a="valMatQuitar" data-id="${w.id}" data-i="${i}">−</button><div class="adnum"><label>Cant.<input id="vmC${i}" value="${esc(f.cant)}" inputmode="decimal"></label><label>Costo<input id="vmT${i}" value="${esc(f.costo)}" inputmode="decimal"></label></div></div>`).join(""):`<div class="hint">Sin materiales registrados.</div>`}
      <button class="btn sm" data-a="valMatAgregar" data-id="${w.id}">+ Agregar</button>
      <div class="hint" style="margin-top:8px">El costo es el total usado en esta WO. Guardar vuelve a abrir la validación.</div></div>
    <div class="mf"><button class="btn" data-a="valMatVolver" data-id="${w.id}">Volver</button><button class="btn p" data-a="valMatGuardar" data-id="${w.id}">Guardar materiales</button></div>`);
}
/* Lee del DOM lo que el usuario tocó en el borrador (sin redibujar). Cada campo se lee solo si está en pantalla:
   con el editor de línea abierto no hay tabla, y leer "" borraría el límite. */
function leerBorrador(){
  const b=S.facturaBorrador; if(!b) return null;
  if(document.getElementById("fbLimite")) b.limite=val("fbLimite");
  if(document.getElementById("fbCredito")) b.credito=parseFloat(val("fbCredito"))||0;
  if(document.getElementById("fbCredG")) b.creditoGrupo=+val("fbCredG")||1;
  b.lineas.forEach(l=>{
    const id=idLineaBorrador(l.clave), sel=document.getElementById(id+"_sel"); if(!sel) return;
    l.seleccionada=sel.checked;
    const g=document.getElementById(id+"_grp"); if(g) l.grupo=+g.value||1;
  });
  return b;
}
Object.assign(ACC, {
  facturar: d => {
    const prop=Number.isNaN(+d.prop)?d.prop:+d.prop;   // las propiedades semilla tienen id texto ("P1"); las nuevas, numérico
    if(!lineasFacturablesFactura(prop).length){
      toast("No hay conceptos disponibles","Esta propiedad no tiene WO o Sub-WO validadas y sin facturar.","r"); return;
    }
    abrirBorradorFactura(prop);
  },
  facBorradorCambiar: () => { if(leerBorrador()) modalBorradorFactura(); },
  facBorradorAgregarLinea: () => {
    const b=leerBorrador(); if(!b) return;
    const n=(b.lineas||[]).filter(l=>l.tipo==="Manual").length+1, clave="manual:"+Date.now()+":"+n;
    b.lineas.push({clave,tipo:"Manual",wo:null,subwo:null,unidad:"—",nombre:"Adjustment",descripcion:"",precio:0,cantidad:1,importe:0,evidencia:0,fecha:HOY_SUP,seleccionada:true,grupo:1});
    modalLineaFactura(clave);   // se abre el editor: una línea manual nace en 0 y hay que llenarla
  },
  facLineaEditar: d => { if(leerBorrador()) modalLineaFactura(d.k); },
  facLineaVolver: () => modalBorradorFactura(),
  facLineaGuardar: d => {
    const b=S.facturaBorrador, l=b&&(b.lineas||[]).find(x=>x.clave===d.k); if(!l) return;
    const nombre=val("fleNom"), precio=parseFloat(val("fleP")), cant=parseFloat(val("fleC")), desc=parseFloat(val("fleD")||"0"), tipo=val("fleT")==="%"?"%":"$";
    const mal=[!nombre&&"fleNom", !Number.isFinite(precio)&&"fleP", !(cant>=0)&&"fleC", !(desc>=0&&(tipo==="$"||desc<=100))&&"fleD"].filter(Boolean);
    if(mal.length){ S.audOmitir=true; marcaFalta(mal); toast("Revisa la línea","Nombre, precio, cantidad y descuento válidos (el % no pasa de 100).","r"); return; }
    Object.assign(l,{nombre,descripcion:val("fleDes"),precio,cantidad:cant,desc,descTipo:tipo});
    l.importe=importeLinea(l);
    modalBorradorFactura();
  },
  /* Una factura por grupo: la de menor número reusa el borrador que se edita (si lo hay), las demás nacen nuevas. */
  facBorradorGuardar: () => {
    const b=leerBorrador(); if(!b) return;
    const r=resumenBorrador(b);
    if(!r.grupos.length){ S.audOmitir=true; toast("Elige un concepto","Selecciona al menos una WO o Sub-WO.","r"); return; }
    const previa=(b.id&&by(S.facturas,b.id))||null;
    if(previa) (previa.conceptos||[]).forEach(c=>{   // se liberan las líneas del borrador; abajo se vuelven a reservar por grupo
      if(c.tipo==="WO"){const w=W(c.wo); if(w) w.facturada=false;}
      else {const a=by(S.adicionales,c.subwo); if(a){a.facturada=false; delete a.facturaId;}}
    });
    // si se re-edita el borrador, se devuelve el crédito usado y se vuelve a descontar donde toque
    S.creditosProp=(S.creditosProp||[]).filter(c=>!(b.id&&c.factura===b.id&&c.tipo==="Uso"));
    const hechas=[], nuevas=[];
    r.grupos.forEach((x,i)=>{
      const conceptos=x.lineas.map(l=>{const {grupo,seleccionada,...c}=l; return {...c,importe:importeLinea(l)};});   // el importe ya sale con el descuento
      if(x.cred>0.004) conceptos.push({clave:"credito",tipo:"Credito",wo:null,subwo:null,unidad:"—",nombre:"Credit applied",descripcion:"",
        precio:-x.cred,cantidad:1,importe:-x.cred,evidencia:0,fecha:HOY_SUP});
      let f=i===0?previa:null;
      if(f) f.conceptos=conceptos;
      else {
        const num="INV-2026-"+String(1040+(++ID.f-600)).padStart(4,"0"), id="F"+ID.f;
        f={id,num,prop:b.prop,conceptos,emision:HOY_SUP,vence:null,estado:"Borrador",
          pdf:num+".pdf",pdfHora:hora(),pdfQuien:S.usuario,seguimiento:[]};
        nuevas.push(f);
      }
      f.lineas=[...new Set(conceptos.map(c=>c.wo).filter(Boolean))]; f.limite=b.limite||null;
      f.total=conceptos.reduce((n,c)=>n+(c.importe||0),0);
      if(x.cred>0.004) S.creditosProp.push({id:"CR"+Date.now(),prop:b.prop,tipo:"Uso",monto:x.cred,motivo:"Applied to "+f.num,factura:f.id,quien:S.usuario,fecha:HOY_SUP});
      conceptos.forEach(c=>{
        if(c.tipo==="WO"){
          const w=W(c.wo); if(w){w.facturada=true; w.hist.push([hora(),`Incluida en borrador ${f.num}`,S.usuario]);}
        } else {
          const a=by(S.adicionales,c.subwo); if(a){a.facturada=true; a.facturaId=f.id;}
        }
      });
      hechas.push(f);
    });
    S.facturas.unshift(...nuevas);
    S._facGuardadas=hechas.map(f=>f.num);
    flash("fac:"+hechas[0].id); S.facturaBorrador=null; cm();
    toast("✓ Borrador guardado",hechas.length===1
      ? `<b>${esc(hechas[0].num)}</b> · ${hechas[0].conceptos.length} concepto(s) · ${money(hechas[0].total)}. Puedes editarlo antes de enviarlo al cliente.`
      : `${hechas.length} facturas: ${hechas.map(f=>`<b>${esc(f.num)}</b> ${money(f.total)}`).join(" · ")}. Puedes editarlas antes de enviarlas al cliente.`,"v"); render();
  },
  facEditarBorrador: d => { const f=by(S.facturas,d.id); if(f&&f.estado==="Borrador") abrirBorradorFactura(f.prop,f.id); },
  /* Retener factura: la WO ya validada sale de los candidatos del borrador; la nómina no se toca. */
  facRetener: d => { const w=W(+d.id); if(!w||w.facturada) return;
    modal(`<div class="mh"><h3>Retener WO-${w.id}</h3><p>${esc(P(w.prop).nombre)} · ${esc(U(w.unidad).num)} · ${esc(w.serv)}</p></div>
    <div class="mb"><div class="fld"><label>Motivo <span class="req">*</span></label><textarea id="rtMot"></textarea></div>
      <div class="hint">No entra a ningún borrador hasta que la liberes. La nómina sigue igual.</div></div>
    <div class="mf"><button class="btn" data-a="cm">Cancelar</button><button class="btn p" data-a="facRetenerOK" data-id="${w.id}">Retener</button></div>`); },
  facRetenerOK: d => { const w=W(+d.id), m=val("rtMot");
    if(!m){ S.audOmitir=true; marcaFalta(["rtMot"]); toast("Falta el motivo","Escribe por qué se retiene.","r"); return; }
    w.facRetenida={motivo:m, quien:S.usuario, hora:hora(), fecha:HOY_SUP};
    w.hist.push([hora(),`Factura retenida · ${m}`,S.usuario]);
    cm(); toast("Retenida",`WO-${w.id} no entra a factura hasta que la liberes.`,"w"); render(); },
  facLiberar: d => { const w=W(+d.id); if(!w||!w.facRetenida) return;
    delete w.facRetenida; w.hist.push([hora(),"Factura liberada",S.usuario]);
    toast("Liberada",`WO-${w.id} vuelve a estar disponible para facturar.`,"v"); render(); },
  /* «Revisar Work Order y verificar: servicios realizados, adicionales, materiales, observaciones»
     Erika valida antes de que se pueda facturar o pagar (Proceso de Facturación y Nómina) */
  validarModal: d => { S._valDraft=null; modalValidar(W(+d.id)); },
  valMatModal: d => { const w=W(+d.id); if(!w) return; leerValDraft(w); S._valMatDraft=null; modalMaterialesVal(w); },   // siempre parte de lo guardado: lo no guardado se descarta
  valMatAgregar: d => { const w=W(+d.id); leerValMatDraft(); const f=S._valMatDraft&&S._valMatDraft.filas;
    if(!w||!f) return; const p=S.productos.find(x=>x.consumible!==false&&x.cat!=="Suministros de oficina");
    f.push({id:null,prod:p?p.id:"",cant:"1",costo:p?String(p.costo||0):"0"}); modalMaterialesVal(w); },
  valMatQuitar: d => { const w=W(+d.id); leerValMatDraft(); const f=S._valMatDraft&&S._valMatDraft.filas;
    if(!w||!f) return; f.splice(+d.i,1); modalMaterialesVal(w); },
  valMatVolver: d => { const w=W(+d.id); if(!w) return; leerValMatDraft(); modalValidar(w); },
  valMatGuardar: d => { const w=W(+d.id); if(!w) return; leerValMatDraft(); const filas=(S._valMatDraft&&S._valMatDraft.filas)||[];
    const actuales=S.movs.filter(m=>m.wo===w.id&&m.tipo==="salida"&&!m.cliente), disponibles={};
    S.productos.forEach(p=>{ disponibles[p.id]=stock(p.id); });
    actuales.forEach(m=>{ disponibles[m.prod]=(disponibles[m.prod]||0)+m.cant; });
    const limpias=[];
    for(const f of filas){ const cant=parseFloat(f.cant), costo=parseFloat(f.costo), p=by(S.productos,f.prod);
      if(!p||!(cant>0)||!(costo>=0)){ S.audOmitir=true; toast("Revisa materiales","Cada línea necesita material, cantidad mayor a 0 y costo válido.","r"); return; }
      disponibles[f.prod]=(disponibles[f.prod]||0)-cant;
      if(disponibles[f.prod]<-0.004){ S.audOmitir=true; toast("No hay suficiente stock",`${esc(p.nombre)} no tiene esa cantidad disponible en inventario.`,"r"); return; }
      limpias.push({id:f.id,prod:f.prod,cant,costo});
    }
    const porId=new Map(actuales.map(m=>[m.id,m]));
    const ids=new Set(limpias.filter(f=>f.id).map(f=>f.id));
    S.movs=S.movs.filter(m=>!(m.wo===w.id&&m.tipo==="salida"&&!m.cliente&&!ids.has(m.id)));
    limpias.forEach(f=>{ const m=f.id&&porId.get(f.id); if(m) Object.assign(m,{prod:f.prod,cant:f.cant,costo:f.costo});
      else S.movs.push({id:"M"+nid("mv"),prod:f.prod,tipo:"salida",cant:f.cant,fecha:w.fecha,wo:w.id,costo:f.costo,tienda:"",quien:S.usuario,evid:false}); });
    desvalidar(w); w.hist.push([hora(),`Materiales ajustados (${limpias.length} línea(s))`,S.usuario]);
    S._valMatDraft=null; modalValidar(w); toast("✓ Materiales ajustados",`WO-${w.id}: inventario y utilidad actualizados. Se deben aprobar pago y factura nuevamente.`,"v"); render();
  },
  valGuardar: d => { const w=W(+d.id); leerValDraft(w); if(!aplicarEdicionVal(w)) return;
    S._valDraft=null; toast("✓ Guardado",`WO-${w.id} · cambios guardados. Sigue sin validar.`,"v"); modalValidar(w); render(); },
  valAjAgregar: d => { const w=W(+d.id); leerValDraft(w);
    const conc=val("vaConc"), monto=parseFloat(val("vaMonto")), tipo=val("vaTipo");
    if(!conc||!(monto>0)){ S.audOmitir=true; marcaFalta(["vaConc","vaMonto"]); toast("Falta información","Escribe concepto y un monto mayor a 0.","r"); return; }
    (w.ajustesVal=w.ajustesVal||[]).push({id:"AJ"+Date.now(), tipo, concepto:conc, monto, quien:S.usuario, hora:hora()});
    w.hist.push([hora(),`Ajuste ${tipo}: ${conc} · ${money(monto)}`,S.usuario]);
    S._valDraft.conc=""; S._valDraft.monto=""; modalValidar(w); render(); },
  valAjQuitar: d => { const w=W(+d.id); leerValDraft(w);
    const a=(w.ajustesVal||[]).find(x=>x.id===d.aid); if(!a) return;
    w.ajustesVal=w.ajustesVal.filter(x=>x!==a);
    w.hist.push([hora(),`Ajuste quitado: ${a.tipo} · ${a.concepto} · ${money(a.monto)}`,S.usuario]);
    modalValidar(w); render(); },
  /* Pago y factura se aprueban por separado; «Validar» aprueba las dos. w.validada solo queda en true
     cuando las dos están aprobadas, para que lo demás que la lee siga igual. */
  validarOK: d => aprobarWO(W(+d.id),"ambos"),
  aprobPago: d => aprobarWO(W(+d.id),"pago"),
  aprobFactura: d => aprobarWO(W(+d.id),"factura"),
  /* El lote es una excepción manual: solo suma las líneas coincidentes a la
     factura indicada. Nunca deselecciona ni reasigna las que no coincidieron. */
  facAsignarLote: () => {
    const b=leerBorrador(); if(!b) return;
    const desde=val("fbLoteDesde"), hasta=val("fbLoteHasta"), tipo=val("fbLoteTipo");
    const factura=Math.min(6,Math.max(1,+val("fbLoteFactura")||1));
    b.lote={desde,hasta,tipo,factura};
    if(!tipo){
      S.audOmitir=true; marcaFalta(["fbLoteTipo"]);
      toast("Elige el tipo","Selecciona Clean, Paint, Carpet o Extras para armar ese lote.","r"); return;
    }
    if(desde&&hasta&&desde>hasta){
      S.audOmitir=true; marcaFalta(["fbLoteDesde","fbLoteHasta"]);
      toast("Rango inválido","«Desde» no puede ser posterior a «Hasta».","r"); return;
    }
    const coincidentes=b.lineas.filter(l=>{
      const fecha=l.fecha||"";
      return (!desde||fecha>=desde) && (!hasta||fecha<=hasta) && (!tipo||tipoLoteLinea(l)===tipo);
    });
    if(!coincidentes.length){
      toast("No hay líneas coincidentes","Ajusta el rango o el tipo de trabajo; no se modificó ninguna línea.","w"); return;
    }
    coincidentes.forEach(l=>{ l.seleccionada=true; l.grupo=factura; });
    modalBorradorFactura();
  },
  /* El comprobante (foto real) vive en S._recibo mientras el modal está abierto; se pinta sin rearmar el formulario. */
  reciboFoto: () => capturarFoto(url=>{ S._recibo=url; const e=document.getElementById("recPrev"); if(e) e.innerHTML=miniRecibo(url); }),
  pedirInfo: d => {
    const w=W(+d.id);
    /* Sin esta marca, la solicitud vivía solo en un aviso de texto: Erika no
       tenía lista de lo pedido y el técnico no tenía dónde responder. */
    const falta = [];
    if(!w.evid)  falta.push("evidencia");
    if(ingresoWO(w)===null) falta.push("tarifa");
    w.infoPedida = {falta, quien:S.usuario, hora:hora(), fecha:HOY_SUP};
    w.hist.push([hora(),"Se pidió al técnico: "+falta.join(", "),S.usuario]);
    cm();
    toast("Información solicitada",
      `<b>${esc(tecN(w.tec))}</b> tiene que completar <b>${esc(falta.join(" y "))}</b>.<br><br>`
      + `Le aparece en su celular con solo lo que falta. Cuando lo complete, te avisa.`,"w");
    noti("Te falta completar un trabajo",
      `WO-${w.id} · ${P(w.prop).nombre}: ${falta.join(" y ")}. Sin eso no entra a tu pago.`);
    render();
  },

  /* El técnico completa lo que le pidieron, desde el celular. No se le
     reabre el trabajo: solo lo que falta. */
  fCompletaInfo: d => {
    const w = W(+d.id);
    if(!w.infoPedida) return;
    const f = w.infoPedida.falta;
    if(f.includes("evidencia") && !w.evid){
      toast("Falta la foto","Toca <b>Agregar foto</b> antes de enviarlo.","r"); return; }
    const quien = w.infoPedida.quien;
    w.infoPedida = null;
    w.hist.push([hora(),"El técnico completó lo que faltaba",tecN(w.tec)]);
    S.reloj += 4;
    toast("✓ Enviado",`Ya quedó completo. <b>${esc(quien)}</b> lo va a revisar y entra a tu pago.`,"v");
    avisar(quien,"Un técnico completó lo que faltaba",
      `WO-${w.id} · ${esc(P(w.prop).nombre)} — ${esc(tecN(w.tec))} ya subió lo pedido. Se puede validar.`,"v");
    render();
  },
  facVer: d => modalFactura(d.id,false),
  facPDF: d => { abrirPDF(d.id, false);
    toast("PDF abierto","Se abri\u00f3 en otra pesta\u00f1a. Con <b>Guardar como PDF</b> lo descargas.",""); },
  facDescargar: d => { abrirPDF(d.id, true); },
  facEnviar: d => modalFactura(d.id,true),
  facEnviarOK: d => {
    const f=by(S.facturas,d.id), p=P(f.prop), c=CLI(p.cliente);
    // El plazo corre desde el envío: hoy + días de crédito de la propiedad, salvo que ya se fijó a mano.
    const n=diasCreditoProp(f.prop), calc=sumarDias(HOY_SUP,n), pre=f.venceManual&&f.vence?f.vence:calc, v=val("facVence")||pre;
    if(v<f.emision){ marcaFalta(["facVence"]); document.getElementById("facVence").parentElement.classList.add("bad"); toast("Fecha inválida",`El vencimiento no puede ser antes de la emisión (${esc(f.emision)}).`,"r"); return; }
    f.estado="Enviada"; f.envio=HOY_SUP; f.mail=val("facMail")||c.mail;
    f.diasCredito=n; f.vence=v; if(v!==pre) f.venceManual=true;
    f.expediente=resumenExpedienteFactura(f);
    f.lineas.forEach(id=>{const w=W(id); if(w) w.hist.push([hora(),`Factura ${f.num} enviada al cliente`,S.usuario]);});
    cm();
    toast("✓ Factura enviada",`<b>${esc(f.num)}</b> · ${money(f.total)} a ${esc(f.mail||"—")}. Vence ${esc(f.vence)} (${f.venceManual?"fecha manual":n+" días"}).`,"v");
    render();
  },
  cobrar: d => modalRegistrarPago(d.id),
  cobrarGuardar: d => {
    const f=by(S.facturas,d.id), monto=parseFloat(val("cpMonto")), totalPrev=(S.pagos||[]).filter(p=>p.factura===f.id).reduce((n,p)=>n+(+p.monto||0),0), pendiente=Math.max(0,f.total-totalPrev);
    if(!(monto>0)||monto>pendiente+.009){ toast("Monto inválido",`El pago debe ser mayor a cero y no superar ${money(pendiente)}.`,"r"); return; }
    S.pagos.push({id:"PG"+(S.pagos.length+1),factura:f.id,monto,medio:val("cpMedio"),referencia:val("cpRef"),fecha:val("cpFecha"),evidencia:!!S._recibo,foto:S._recibo||null,quien:S.usuario,nota:val("cpNota")});
    const recibido=totalPrev+monto, cerrado=recibido>=f.total-.009;
    f.estado=cerrado?"Pagada":"Enviada"; flash("fac:"+f.id);
    f.seguimiento=f.seguimiento||[];
    f.seguimiento.push({tipo:"pago",fecha:val("cpFecha"),hora:hora(),quien:S.usuario,nota:`${money(monto)} · ${val("cpMedio")}${val("cpRef")?" · "+val("cpRef"):""}${S._recibo?" · evidence attached":""}`,foto:S._recibo||null});
    if(cerrado) f.seguimiento.push({tipo:"cierre",fecha:val("cpFecha"),hora:hora(),quien:S.usuario});
    let quedanAbiertas=0;
    const bases=(f.conceptos||[]).filter(c=>c.tipo==="WO").map(c=>c.wo);
    (bases.length?bases:(f.lineas||[])).forEach(id=>{const w=W(id); if(w){
      const queda=S.facturas.some(otra=>otra.id!==f.id && otra.estado!=="Pagada"
        && ((otra.conceptos||[]).some(c=>c.tipo==="WO"&&c.wo===id) || (!(otra.conceptos||[]).length&&(otra.lineas||[]).includes(id))));
      if(queda) quedanAbiertas++;
      if(cerrado&&!queda) w.cobrada=true;
      w.hist.push([hora(),`${cerrado?"Cobrada":"Pago parcial registrado en"} ${f.num}${queda?" · quedan otras facturas abiertas":""}`,S.usuario]);
    }});
    cm();
    toast("✓ Pago registrado",cerrado?`${esc(f.num)} quedó pagada. ${quedanAbiertas?"La Work Order seguirá abierta hasta cobrar sus otras facturas.":"Invoice y Work Orders quedaron cerrados."}`:`${esc(f.num)} tiene ${money(f.total-recibido)} pendiente. El pago parcial quedó con su comprobante.`,"v"); render();
  },
  cobGestionar: d => modalCobranza(d.id),
  /* Cambiar el vencimiento de una factura ya enviada: exige motivo y queda en el seguimiento. */
  facVenceCambiar: d => { const f=by(S.facturas,d.id);
    modal(`<div class="mh"><h3>Vencimiento — ${esc(f.num)}</h3><p>Hoy vence ${esc(f.vence)}.</p></div>
    <div class="mb"><div class="fld"><label>Nueva fecha <span class="req">*</span></label><input id="fvFecha" type="date" min="${esc(f.emision)}" value="${esc(f.vence)}"></div>
      <div class="fld"><label>Motivo <span class="req">*</span></label><input id="fvMot" placeholder="Ej. el cliente pidió más plazo"></div></div>
    <div class="mf"><button class="btn" data-a="cobGestionar" data-id="${f.id}">Cancelar</button><button class="btn p" data-a="facVenceGuardar" data-id="${f.id}">Guardar</button></div>`,true); },
  facVenceGuardar: d => { const f=by(S.facturas,d.id), v=val("fvFecha"), mot=val("fvMot").trim();
    if(marcaFalta(["fvFecha","fvMot"])){ toast("Faltan datos","Fecha y motivo son obligatorios.","r"); return; }
    if(v<f.emision){ document.getElementById("fvFecha").parentElement.classList.add("bad"); toast("Fecha inválida",`No puede ser antes de la emisión (${esc(f.emision)}).`,"r"); return; }
    if(v===f.vence){ toast("Sin cambios","Es la misma fecha de vencimiento.",""); return; }
    f.seguimiento=f.seguimiento||[];
    f.seguimiento.push({tipo:"vence",fecha:HOY_SUP,hora:hora(),quien:S.usuario,nota:`${f.vence} → ${v} · ${mot}`});
    f.vence=v; f.venceManual=true; flash("fac:"+f.id);
    toast("✓ Vencimiento cambiado",`<b>${esc(f.num)}</b> vence ${esc(v)}.`,"v");
    render(); modalCobranza(f.id); },
  /* Escalera de cobranza del flujograma: Reminder → Correo Overdue → Llamada.
     Cada paso solo se habilita cuando ya pasó el anterior (ver modalCobranza). */
  cobRecordatorio: d => {
    const f=by(S.facturas,d.id);
    f.seguimiento=f.seguimiento||[];
    f.seguimiento.push({tipo:"reminder",fecha:HOY_SUP,hora:hora(),quien:S.usuario});
    flash("fac:"+f.id);
    toast("✓ Reminder enviado",`Se envió el recordatorio de pago de <b>${esc(f.num)}</b> a ${esc(P(f.prop).nombre)}.`,"v");
    modalCobranza(f.id);
  },
  cobOverdue: d => {
    const f=by(S.facturas,d.id);
    f.seguimiento=f.seguimiento||[];
    f.seguimiento.push({tipo:"overdue",fecha:HOY_SUP,hora:hora(),quien:S.usuario});
    flash("fac:"+f.id);
    toast("✓ Correo overdue enviado",`Se avisó a <b>${esc(P(f.prop).nombre)}</b> que ${esc(f.num)} sigue vencida.`,"v");
    modalCobranza(f.id);
  },
  cobAgrupadoModal: d => modalCobAgrupado(d.cli),
  cobAgrupadoEnviar: d => {
    const mail=val("caMail").trim(), ids=[...document.querySelectorAll(".caFac:checked")].map(e=>e.value);
    if(!mail){ S.audOmitir=true; marcaFalta(["caMail"]); toast("Falta el correo","Escribe a quién se envía.","r"); return; }
    if(!ids.length){ S.audOmitir=true; toast("Elige facturas","Marca al menos una factura vencida.","r"); return; }
    const fs=ids.map(id=>by(S.facturas,id)), nums=fs.map(f=>f.num).join(", "), nota=val("caNota").trim();
    fs.forEach(f=>{ (f.seguimiento=f.seguimiento||[]).push({tipo:"agrupado",fecha:HOY_SUP,hora:hora(),quien:S.usuario,
      nota:`A ${mail} · junto con ${nums}${nota?" · "+nota:""}`}); flash("fac:"+f.id); });
    cm(); toast("✓ Recordatorio enviado",`${fs.length} factura(s) · ${money(fs.reduce((a,f)=>a+f.total,0))} a ${esc(mail)}.`,"v"); render();
  },
  cobLlamadaModal: d => modalCobLlamada(d.id),
  cobLlamadaGuardar: d => {
    const f=by(S.facturas,d.id), nota=val("clNota"), prom=val("clProm");
    if(!nota){ toast("Falta la respuesta","Anota qué dijo el cliente.","r"); return; }
    f.seguimiento=f.seguimiento||[];
    f.seguimiento.push({tipo:"llamada",fecha:HOY_SUP,hora:hora(),quien:S.usuario,nota,promesa:prom||null});
    flash("fac:"+f.id);
    toast("✓ Llamada registrada",`Respuesta de ${esc(P(f.prop).nombre)} guardada.`,"v");
    modalCobranza(f.id);
  },
  movEntrada: () => modal(`<div class="mh"><h3>Registrar compra de material</h3><p>El stock se recalcula solo — nunca se edita a mano.</p></div>
    <div class="mb">
      <div class="fld"><label>Producto <span class="req">*</span></label><select id="mP">${S.productos.map(p=>`<option value="${p.id}">${esc(p.nombre)} (${esc(p.um)})</option>`).join("")}</select></div>
      <div class="fg c3">
        <div class="fld"><label>Cantidad <span class="req">*</span></label><input id="mC" class="mono"></div>
        <div class="fld"><label>Costo total <span class="req">*</span></label><input id="mT" class="mono"></div>
        <div class="fld"><label>Tienda</label><select id="mS">${activos("tiendas").map(t=>`<option>${esc(t)}</option>`).join("")}</select></div></div>
      <div class="note">Se guarda con quién lo registró y la evidencia del recibo.</div></div>
    <div class="mf"><button class="btn" data-a="cm">Cancelar</button><button class="btn p" data-a="movGuardar" data-tipo="entrada">Registrar</button></div>`),
  movSalida: () => modal(`<div class="mh"><h3>Registrar salida a una Work Order</h3><p>Así se sabe cuánto material cuesta cada servicio.</p></div>
    <div class="mb">
      <div class="fld"><label>Producto <span class="req">*</span></label><select id="mP">${S.productos.map(p=>`<option value="${p.id}">${esc(p.nombre)} — quedan ${stock(p.id)}</option>`).join("")}</select></div>
      <div class="fld"><label>Work Order <span class="req">*</span></label><select id="mW">${S.wos.map(w=>`<option value="${w.id}">WO-${w.id} · ${esc(P(w.prop).nombre)} ${esc(U(w.unidad).num)}</option>`).join("")}</select></div>
      <div class="fg c2">
        <div class="fld"><label>Cantidad <span class="req">*</span></label><input id="mC" class="mono"></div>
        <div class="fld"><label>Costo <span class="req">*</span></label><input id="mT" class="mono"></div></div></div>
    <div class="mf"><button class="btn" data-a="cm">Cancelar</button><button class="btn p" data-a="movGuardar" data-tipo="salida">Registrar</button></div>`),
  movGuardar: d => {
    if(marcaFalta(["mC","mT"])){ toast("Faltan datos","Cantidad y costo.","r"); return; }
    const prod=val("mP"), cant=parseFloat(val("mC"));
    if(d.tipo==="salida" && cant>stock(prod)){ toast("🚫 No hay tanto stock",`Solo quedan ${stock(prod)}.`,"r"); return; }
    const nm={id:"M"+nid("mv"),prod,tipo:d.tipo,cant,fecha:"2026-08-11",
      wo:d.tipo==="salida"?+val("mW"):null,costo:parseFloat(val("mT")),tienda:d.tipo==="entrada"?val("mS"):"",quien:S.usuario,evid:d.tipo==="entrada"};
    S.movs.push(nm); flash("mov:"+nm.id);
    cm();
    const p=by(S.productos,prod), s=stock(prod);
    toast("✓ Movimiento registrado",`${esc(p.nombre)}: quedan <b>${s}</b> ${esc(p.um)}.${s<p.min?" <b>Stock bajo</b> — ya salió la alerta.":""}`, s<p.min?"w":"v");
    render();
  },
  movCosto: d => {
    const m=S.movs.find(x=>x.id===d.id); if(!m) return;
    const p=by(S.productos,m.prod), w=m.compraWo?W(m.compraWo):null;
    modal(`<div class="mh"><h3>Cargar costo del ticket</h3><p>${esc(p.nombre)} · ${m.cant} ${esc(p.um)}</p></div>
    <div class="mb">
      <div class="fld"><label>Tienda</label><input value="${esc(m.tienda)||"—"}" disabled></div>
      <div class="fld"><label>Quién compró</label><input value="${esc(m.quien)}" disabled></div>
      <div class="fld"><label>Work Order</label><input value="${w?`WO-${w.id}`:"—"}" disabled></div>
      <div class="fld"><label>Foto del ticket</label>${m.recibo
        ?`<img src="${m.recibo}" style="max-width:100%;border-radius:6px">`
        :`<div class="hint">Sin foto del ticket</div>`}</div>
      ${m.ticket?(()=>{ const otros=S.movs.filter(x=>x.ticket===m.ticket && x.id!==m.id);
        const conCosto=otros.filter(x=>!x.costoPend).reduce((a,x)=>a+x.costo,0);
        return `<div class="note" style="margin-bottom:10px"><b>Mismo ticket:</b> ${otros.length?otros.map(x=>{ const q=by(S.productos,x.prod); return `${esc(q?q.nombre:"")} × ${x.cant}${x.costoPend?" (sin costo)":` = ${money(x.costo)}`}`; }).join(" · "):"solo este producto"}${m.ticketTotal?`<br>Total ticket ${money(m.ticketTotal)} · ya asignado ${money(conCosto)} · <b>queda ${money(Math.max(0,m.ticketTotal-conCosto))}</b>`:""}</div>`; })():""}
      <div class="fld"><label>Costo de este producto <span class="req">*</span></label><input id="mcT" class="mono"></div>
    </div>
    <div class="mf"><button class="btn" data-a="cm">Cancelar</button><button class="btn p" data-a="movCostoOK" data-id="${m.id}">Guardar</button></div>`);
  },
  movCostoOK: d => {
    if(marcaFalta(["mcT"])){ toast("Falta el costo","Escribe el total del ticket.","r"); return; }
    const total=parseFloat(val("mcT"));
    if(!(total>0)){ toast("Costo inválido","El total debe ser mayor a 0.","r"); return; }
    const m=S.movs.find(x=>x.id===d.id); if(!m) return;
    const round2 = x => Math.round(x*100)/100;
    m.costo=total; delete m.costoPend;
    const unit=total/m.cant;
    S.movs.filter(x=>x.compra===m.id).forEach(x=>{ x.costo=round2(unit*x.cant); });
    const p=by(S.productos,m.prod);
    if(p && p.costo===0) p.costo=round2(unit);
    m.notas="Comprado en tienda con tarjeta de la empresa";
    const w=m.compraWo?W(m.compraWo):null;
    if(w) w.hist.push([hora(), "Oficina cargó el costo del ticket: "+money(total), S.usuario]);
    cm(); flash("mov:"+m.id);
    toast("✓ Costo cargado", `${esc(p?p.nombre:"")} quedó con el costo cargado.`, "v");
    render();
  },

  /* ── Activos no consumibles: alta y edición a mano, con historial de quién cambió qué ── */
  invNuevo: () => { if(soloLectura()) return;
    modal(`<div class="mh"><h3>Nuevo activo</h3></div>
    <div class="mb">
      <div class="fld"><label>Nombre <span class="req">*</span></label><input id="invN"></div>
      <div class="fg c2"><div class="fld"><label>Categoría</label><select id="invC">${INV_ACTIVOS.map(c=>`<option>${esc(c)}</option>`).join("")}</select></div>
        <div class="fld"><label>Estado</label><select id="invE">${INV_ESTADOS.map(e=>`<option>${e}</option>`).join("")}</select></div></div>
      <div class="fg c2"><div class="fld"><label>Responsable</label>${selResponsable("invR","")}</div>
        <div class="fld"><label>Ubicación</label><input id="invU"></div></div>
    </div>
    <div class="mf"><button class="btn" data-a="cm">Cancelar</button><button class="btn p" data-a="invNuevoGuardar">Guardar</button></div>`); },
  invNuevoGuardar: () => { if(soloLectura()) return;
    if(marcaFalta(["invN"])){ toast("Falta el nombre","Escribe cómo se llama el activo.","r"); return; }
    const p={id:"AC"+nid("inv"),cat:val("invC"),nombre:val("invN"),um:"unidad",costo:0,min:0,consumible:false,
      responsable:val("invR"),estado:val("invE"),ubicacion:val("invU"),hist:[{fecha:HOY_SUP,hora:hora(),quien:S.usuario,cambio:"Alta"}]};
    S.productos.push(p); cm(); toast("✓ Activo creado",`${esc(p.nombre)} · ${esc(respN(p.responsable))}.`,"v"); render(); },
  invEditar: d => { const p=by(S.productos,d.id); if(!p||!puedeEditarInv(p)) return;
    const mat=p.cat==="Material para instalación";
    modal(`<div class="mh"><h3>Editar ${esc(p.nombre)}</h3><p>${esc(p.cat)}</p></div>
    <div class="mb">
      ${mat?`<div class="fld"><label>Reservado para</label><select id="invW"><option value="">— ninguna —</option>${woAbiertasOpts(reservaId(p))}</select></div>
        <div class="hint">El stock no baja hasta registrar una salida a esa WO.</div>`
      :`<div class="fg c2"><div class="fld"><label>Responsable</label>${selResponsable("invR",p.responsable)}</div>
          <div class="fld"><label>Estado</label><select id="invE">${INV_ESTADOS.map(e=>`<option ${e===(p.estado||"Operativa")?"selected":""}>${e}</option>`).join("")}</select></div></div>
        <div class="fld"><label>Ubicación</label><input id="invU" value="${esc(p.ubicacion||"")}"></div>`}
      ${(p.hist||[]).length?`<div class="dl" style="margin:12px 0 4px;font-weight:750;font-size:12px">Historial</div>
        ${p.hist.slice().reverse().slice(0,6).map(h=>`<div style="font-size:11.5px;color:var(--soft);padding:2px 0"><span class="mono">${esc(h.fecha)} ${esc(h.hora)}</span> · ${esc(h.quien)} · ${esc(h.cambio)}</div>`).join("")}`:""}
    </div>
    <div class="mf"><button class="btn" data-a="cm">Cancelar</button><button class="btn p" data-a="invEditarGuardar" data-id="${esc(p.id)}">Guardar</button></div>`); },
  invEditarGuardar: d => { if(soloLectura()) return;
    const p=by(S.productos,d.id); if(!p||!puedeEditarInv(p)) return;
    const cambios=[], cambia=(etq,antes,despues)=>{ if(String(antes||"")!==String(despues||"")) cambios.push(`${etq}: ${antes||"—"} → ${despues||"—"}`); };
    if(p.cat==="Material para instalación"){
      const id=val("invW"), w=id&&W(+id), antes=reservaTxt(p);
      cambia("Reservado para",antes,w?`WO-${w.id} · ${P(w.prop).nombre} · ${U(w.unidad).num}`:"");
      p.reservadoWO=w?w.id:null; p.reservadoPara=w?"WO-"+w.id:"";
    } else {
      cambia("Responsable",respN(p.responsable),respN(val("invR"))); cambia("Estado",p.estado||"Operativa",val("invE")); cambia("Ubicación",p.ubicacion,val("invU"));
      p.responsable=val("invR"); p.estado=val("invE"); p.ubicacion=val("invU");
    }
    if(!cambios.length){ S.audOmitir=true; cm(); toast("Sin cambios","No modificaste nada.",""); return; }
    (p.hist=p.hist||[]).push({fecha:HOY_SUP,hora:hora(),quien:S.usuario,cambio:cambios.join(" · ")});
    cm(); toast("✓ Guardado",`${esc(p.nombre)}: ${esc(cambios.join(" · "))}.`,"v"); render(); },
});
/* Select de responsable: técnicos y usuarios de oficina. */
function selResponsable(id, actual){
  return `<select id="${id}"><option value="">— sin responsable —</option>
    <optgroup label="Técnicos">${S.tecnicos.filter(t=>t.activo!==false).map(t=>`<option value="${t.id}" ${t.id===actual?"selected":""}>${esc(tecN(t.id))}</option>`).join("")}</optgroup>
    <optgroup label="Oficina">${Object.keys(ROLES).map(u=>`<option value="${u}" ${u===actual?"selected":""}>${u}</option>`).join("")}</optgroup></select>`;
}
/* WO abiertas (no terminadas ni canceladas) para reservar material; la ya reservada siempre se ofrece. */
const reservaId = p => p.reservadoWO || ((/WO-(\d+)/.exec(p.reservadoPara||"")||[])[1]) || null;
function woAbiertasOpts(actual){
  return S.wos.filter(w=>!["Completed","Canceled","Invoiced","Paid"].includes(w.estado) || String(w.id)===String(actual))
    .map(w=>`<option value="${w.id}" ${String(w.id)===String(actual)?"selected":""}>WO-${w.id} · ${esc(P(w.prop).nombre)} · ${esc(U(w.unidad).num)}</option>`).join("");
}
