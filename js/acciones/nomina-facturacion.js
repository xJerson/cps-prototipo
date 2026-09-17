"use strict";
Object.assign(ACC, {


  excNueva: () => modalExc(),
  excGuardar: () => {
    if(marcaFalta(["xMo"])){ toast("Falta el motivo","Sin motivo nadie puede decidir.","r"); return; }
    const nx={id:"X"+Date.now(), tipo:val("xT"), wo:val("xW")?+val("xW"):null,
      motivo:val("xMo"), monto:parseFloat(val("xM"))||null, pide:S.usuario, aprueba:val("xA"),
      estado:"Pendiente", fecha:"2026-08-11", creada:{quien:S.usuario,hora:hora()}, resol:null};
    S.excepciones.push(nx); flash("exc:"+nx.id);
    cm(); toast("Excepción levantada",`Le quedó a <b>${esc(nx.aprueba)}</b> para decidir. ${nx.wo?`WO-${nx.wo} no se paga ni se factura hasta resolverla.`:"No es de una WO puntual, así que frena toda la nómina y facturación hasta resolverla."}`,"w"); render();
  },
  excAprob: d => {
    const x = by(S.excepciones,d.id);
    if(x){ x.estado="Aprobada"; x.resol={quien:S.usuario,hora:hora()}; flash("exc:"+x.id);
      toast("✓ Excepción aprobada",`${esc(x.tipo)} — autorizada por ${S.usuario}. Queda registrado quién y cuándo.`,"v");
      render(); return; }
    const sa = solTodas().find(z=>"AUTO-A"+z.sol===d.id);
    if(sa){ modalMedio(sa.sol); return; }         // el adicional pregunta CÓMO aprobó el cliente
    const a = excAuto().find(y=>y.id===d.id);
    if(a){
      S.excepciones.push({...a, id:"X"+Date.now(), auto:false, estado:"Aprobada", resol:{quien:S.usuario,hora:hora()}});
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
    const s = solTodas().find(z=>z.sol===d.sol), w = W(s.wo);
    const pend = s.lineas.filter(l=>l.estado==="Pendiente");
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
    let pagoTec = 0, cobroCliente = 0;
    ok.forEach(l=>{ l.estado="Aprobado"; l.aprob=sello(d.medio==="Enlace digital"?"72.14.201.38":null);
      (l.hist=l.hist||[]).push([hora(), `Aprobada por ${d.medio.toLowerCase()}`, S.usuario]);
      const monto = (l.precio||0)*(l.cant||1);
      if(monto>0){
        pagoTec += monto;
        S.excepciones.push({id:"X"+Date.now()+"_"+l.id, tipo:"Pago adicional al técnico", wo:w.id,
          motivo:`Sub-Work Order aprobada · ${l.concepto}${l.ubic?" · "+l.ubic:""}`, monto,
          pide:tecN(w.tec), aprueba:S.usuario, estado:"Aprobada",
          fecha:w.fecha, creada:{quien:tecN(w.tec),hora:hora()}, resol:{quien:S.usuario,hora:hora()}});
        if(cobraSet.has(l.id)){
          cobroCliente += monto;
          w.extraFacturable = (w.extraFacturable||0) + monto;
          (l.hist=l.hist||[]).push([hora(), `Se suma ${money(monto)} a lo que se le factura a la propiedad`, S.usuario]);
        }
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
    if(no.length) w.hist.push([hora(), `Adicional NO aprobado · ${nom(no)}`, S.usuario]);
    if(pagoTec>0) w.hist.push([hora(), `Nómina: ${money(pagoTec)} de pago adicional para ${tecN(w.tec)}`, S.usuario]);
    cm();
    const sustento = d.medio==="Enlace digital"
      ? "Queda el clic real del cliente con hora e IP."
      : `Registrado como <b>${esc(d.medio)}</b>: queda quién y cuándo, pero sin clic del cliente.`;
    const plata = pagoTec>0
      ? `<br><br>💰 Se le suma a la nómina de ${esc(tecN(w.tec))}: <b>${money(pagoTec)}</b>.`
        + (cobroCliente>0 ? ` Se le agrega a lo que se le factura a la propiedad: <b>${money(cobroCliente)}</b>.`
                          : ` No se le factura nada a la propiedad por esto — queda como costo interno.`)
      : "";
    toast(no.length ? (ok.length?"Adicional aprobado en parte":"Adicional no aprobado") : "✓ Adicional aprobado",
      `${ok.length?`Sí: <b>${esc(nom(ok))}</b>. `:""}${no.length?`No: <b>${esc(nom(no))}</b>. `:""}${sustento}${plata} `
      + (quedan
          ? `<br><br><b>Ojo: el pago/factura de WO-${w.id} sigue frenado</b> — hay otra solicitud del técnico sin decidir.`
          : `<br><br>El pago/factura de WO-${w.id} ya puede seguir su curso.`),
      (no.length||quedan)?"w":"v");
    noti(no.length ? (ok.length?"Adicional aprobado en parte":"Adicional NO aprobado") : "Adicional aprobado",
      `${ok.length?`Haz: ${nom(ok)}. `:""}${no.length?`NO hagas: ${nom(no)}. `:""}Lo decidió ${S.usuario} (${d.medio.toLowerCase()}).`, false);
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
    if(x){ x.estado="Rechazada"; x.resol={quien:S.usuario,hora:hora()}; flash("exc:"+x.id);
      toast("Excepción rechazada","Queda registrado que no se autorizó.","w"); render(); return; }
    const sa = solTodas().find(z=>"AUTO-A"+z.sol===d.id);
    if(sa){
      const w = W(sa.wo);
      const pend = sa.lineas.filter(l=>l.estado==="Pendiente");
      pend.forEach(l=>{ l.estado="Rechazado"; l.aprob={medio:"—",quien:S.usuario,hora:hora(),ip:null};
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
    if(a) S.excepciones.push({...a,id:"X"+Date.now(),auto:false,estado:"Rechazada",resol:{quien:S.usuario,hora:hora()}});
    toast("Excepción rechazada","Queda registrado que no se autorizó.","w"); render();
  },

  pagarSemana: () => {
    // Reunión Claudia (feedback prototipo): una excepción ya no frena a todo
    // el mundo — solo a la WO que tiene la excepción. El resto del período
    // se paga igual. Y el período mismo ya no es solo "la semana actual".
    const todas=S.wos.filter(w=>enPeriodo(w.fecha,S.periodo)&&w.estado==="Completed"&&w.validada&&!w.pagadaTec);
    const bloqueadas=todas.filter(w=>woBloqueada(w.id));
    const ws=todas.filter(w=>!woBloqueada(w.id));
    if(!ws.length){ toast("🚫 Nada para pagar",
      bloqueadas.length?`${bloqueadas.length} Work Order(s) con excepción sin resolver — es todo lo que hay pendiente en este período.`:"No hay Work Orders listas para pagar.","r"); return; }
    // Punto 10: sin esto, lo que queda registrado como "nómina pagada" no
    // incluía los adicionales de Sub-Work Order ya aprobados — se le pagaba
    // de más al técnico (vía comprobante) de lo que el registro decía.
    const tot=ws.reduce((a,w)=>a+(egresoWO(w)||0),0) + extrasAprobadosDeWOs(ws).reduce((a,x)=>a+(x.monto||0),0);
    S.nomina.push({semana:S.semana, periodo:{...S.periodo}, wos:ws.map(w=>w.id), total:tot, quien:S.usuario, hora:hora()});
    ws.forEach(w=>{w.pagadaTec=true; w.hist.push([hora(),`Pagada al técnico en nómina — ${periodoTexto(S.periodo)}`,S.usuario]);});
    toast("✓ Nómina aprobada",
      `${periodoTexto(S.periodo)} · ${money(tot)} a ${new Set(ws.map(w=>w.tec)).size} técnicos.`
      + (bloqueadas.length?` <b>${bloqueadas.length} WO(s) quedaron afuera</b> por excepción sin resolver — se pagan cuando se resuelva.`:""),"v"); render();
  },
  facturar: d => {
    const todas=S.wos.filter(w=>enPeriodo(w.fecha,S.periodo)&&w.estado==="Completed"&&w.supervisada&&w.validada&&!w.facturada&&w.prop===d.prop);
    const bloqueadas=todas.filter(w=>woBloqueada(w.id));
    const ws=todas.filter(w=>!woBloqueada(w.id));
    if(!ws.length){ toast("🚫 No se puede facturar",
      bloqueadas.length?"Todas las WO listas de esta propiedad tienen una excepción sin resolver.":"No hay Work Orders listas para facturar.","r"); return; }
    if(ws.some(w=>ingresoWO(w)===null)){ toast("🚫 Hay líneas sin tarifa","No se factura con «NA».","r"); return; }
    const tot=ws.reduce((a,w)=>a+ingresoWO(w),0);
    const num="INV-2026-"+String(1040+(++ID.f-600)).padStart(4,"0");
    /* El PDF se genera y queda guardado con la factura. Enviarlo al cliente
       es otra cosa, y es opcional: puede quedarse archivada sin enviar. */
    S.facturas.unshift({id:"F"+ID.f,num,prop:d.prop,lineas:ws.map(w=>w.id),total:tot,
      emision:"2026-08-11",vence:"2026-09-10",estado:"Emitida",
      pdf:num+".pdf", pdfHora:hora(), pdfQuien:S.usuario, seguimiento:[]});
    flash("fac:F"+ID.f);
    ws.forEach(w=>{ w.facturada=true; w.hist.push([hora(),"Facturada en "+num,S.usuario]); });
    toast("✓ Factura generada y guardada",
      `<b>${num}</b> · ${esc(P(d.prop).nombre)} · ${ws.length} líneas · ${money(tot)}.<br><br>`
      + `El <b>PDF quedó guardado</b> con la factura. Puedes verlo, descargarlo o enviarlo al cliente `
      + `cuando quieras — enviarlo es opcional.`
      + (bloqueadas.length?`<br><br><b>${bloqueadas.length} WO(s) de esta propiedad quedaron afuera</b> por excepción sin resolver — se facturan aparte cuando se resuelva.`:""),"v"); render();
  },
  /* «Revisar Work Order y verificar: servicios realizados, adicionales, materiales, observaciones»
     Erika valida antes de que se pueda facturar o pagar (Proceso de Facturación y Nómina) */
  validarModal: d => {
    const w=W(+d.id), ads=S.adicionales.filter(a=>a.wo===w.id), mv=S.movs.filter(m=>m.wo===w.id);
    /* Reunión 2026-09-09: las horas NO bloquean — al técnico se le paga por
       trabajo (pago del tarifario × cantidad), nunca por hora, así que exigir
       "horas trabajadas" para validar no correspondía. Solo evidencia y
       tarifa son requisito real. El tiempo en sitio se sigue guardando solo
       (llegada → término), pero como dato de operación, no de nómina. */
    const falta = [];
    if(!w.evid) falta.push("evidencia del trabajo");
    if(ingresoWO(w)===null) falta.push("tarifa");
    modal(`<div class="mh"><h3>Validar WO-${w.id}</h3>
      <p>${esc(P(w.prop).nombre)} · ${esc(U(w.unidad).num)} · ${esc(tecN(w.tec))}</p></div>
    <div class="mb">
      <table><tbody>
        <tr><td style="width:40px">${w.serv?'<span class="pill v">✓</span>':'<span class="pill r">—</span>'}</td>
          <td><b>Servicios realizados</b><div style="font-size:11.5px;color:var(--soft)">${esc(w.serv)} × ${w.cant||1}</div></td></tr>
        <tr><td>${ads.length?'<span class="pill v">✓</span>':'<span class="pill g">·</span>'}</td>
          <td><b>Servicios adicionales</b><div style="font-size:11.5px;color:var(--soft)">${ads.length?ads.map(a=>esc(a.concepto||a.desc.slice(0,40))+" ("+a.estado+")").join(", "):"ninguno"}</div></td></tr>
        <tr><td>${mv.length?'<span class="pill v">✓</span>':'<span class="pill g">·</span>'}</td>
          <td><b>Materiales</b><div style="font-size:11.5px;color:var(--soft)">${mv.length?mv.map(m=>esc(by(S.productos,m.prod).nombre)+" ×"+m.cant).join(", ")+" · "+money(materialWO(w)):"ninguno"}</div></td></tr>
        <tr><td><span class="pill g">·</span></td>
          <td><b>Tiempo en sitio</b><div style="font-size:11.5px;color:var(--soft)">${w.horas?w.horas+" h (de la llegada al término)":"—"} · informativo, no cambia el pago (es por trabajo)</div></td></tr>
        <tr><td>${w.evid?'<span class="pill v">✓</span>':'<span class="pill r">—</span>'}</td>
          <td><b>Evidencia y observaciones</b><div style="font-size:11.5px;color:var(--soft)">${w.evid} foto(s)${w.notas?" · "+esc(w.notas):""}</div></td></tr>
      </tbody></table>
      ${falta.length?`<div class="note r" style="margin-top:12px"><b>Falta: ${esc(falta.join(", "))}.</b>
        Su flujograma dice «solicitar información al técnico» antes de validar.</div>`
       :`<div class="note v" style="margin-top:12px"><b>Todo completo.</b> Al validar entra a nómina y a facturación.</div>`}
    </div>
    <div class="mf"><button class="btn" data-a="cm">Cerrar</button>
      ${falta.length?`<button class="btn" data-a="pedirInfo" data-id="${w.id}">Solicitar info al técnico</button>`:""}
      <button class="btn ${falta.length?"":"v"}" data-a="validarOK" data-id="${w.id}" ${falta.length?"disabled":""}>Validar Work Order</button></div>`,true);
  },
  validarOK: d => {
    const w=W(+d.id); w.validada=true;
    w.hist.push([hora(),"Work Order validada para facturación y nómina",S.usuario]);
    toast("✓ Work Order validada",`WO-${w.id} pasa a nómina y facturación. Validada por ${S.usuario}.`,"v"); render();
  },
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
    f.estado="Enviada"; f.envio="2026-08-11"; f.mail=val("facMail")||c.mail;
    f.lineas.forEach(id=>{const w=W(id); if(w) w.hist.push([hora(),`Factura ${f.num} enviada al cliente`,S.usuario]);});
    cm();
    toast("✓ Factura enviada",`<b>${esc(f.num)}</b> · ${money(f.total)} a ${esc(f.mail||"—")}. El plazo de cobranza corre desde hoy: vence ${esc(f.vence)}.`,"v");
    render();
  },
  cobrar: d => {
    const f=by(S.facturas,d.id); f.estado="Pagada"; flash("fac:"+f.id);
    f.seguimiento=f.seguimiento||[];
    f.seguimiento.push({tipo:"pago",fecha:HOY_SUP,hora:hora(),quien:S.usuario});
    f.seguimiento.push({tipo:"cierre",fecha:HOY_SUP,hora:hora(),quien:S.usuario});
    f.lineas.forEach(id=>{const w=W(id); if(w){w.cobrada=true; w.hist.push([hora(),"Cobrada",S.usuario]);}});
    cm();
    toast("✓ Pago registrado",`${esc(f.num)} · ${money(f.total)}. Las Work Orders pasaron a «Paid» — Invoice y Work Orders quedaron cerrados.`,"v"); render();
  },
  cobGestionar: d => modalCobranza(d.id),
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
  },});
