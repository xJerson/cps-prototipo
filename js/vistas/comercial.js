"use strict";
const EXPEDIENTE = [
  {k:"nombre",  n:"Nombre de la propiedad"},
  {k:"dir",     n:"Dirección"},
  {k:"zona",    n:"Zona (Area)"},
  {k:"door",    n:"Código de puerta"},
  {k:"pref",    n:"Default Contact Method"},
  {k:"coi",     n:"COI vigente"},
  {k:"contacto",n:"Al menos un contacto"},
  {k:"estimado",n:"Estimado aprobado"},
  {k:"notas",   n:"Notas del proyecto"},
  /* Del flujograma de Estimados: el expediente son 9 elementos, y este era
     el único que el checklist no contaba — el dato ya existía en la
     propiedad (notasPaint) pero no tenía campo para verlo ni editarlo, así
     que nunca podía marcarse completo. */
  {k:"notasPaint", n:"Información de pintura"}
];
function expedienteDe(pid){
  const p=P(pid);
  return EXPEDIENTE.map(c=>({
    ...c,
    ok: c.k==="contacto" ? S.contactos.some(x=>x.prop===pid)
      : c.k==="coi" ? coiVigente(pid)
      : c.k==="estimado" ? S.estimados.some(e=>e.prop===pid && e.estado==="Aprobado")
      : c.k==="notasPaint" ? (!!String(p.notasPaint||"").trim() || (S.pinturas||[]).some(x=>x.prop===pid))
      : !!String(p[c.k]||"").trim()
  }));
}
/* "Servicio directo" (la visita que salta la llamada de negociar) exigía
   igual un Estimado aprobado antes de dejar pasar la propiedad — pero esa
   es justo la llamada que "Servicio directo" promete que no hace falta.
   sinEstimado=true se usa SOLO en ese camino: el resto del Expediente
   (COI, contacto...) sigue exigiéndose igual — y el camino normal
   ("Requiere estimado", Transferir a programación) no cambia.
   El Price List ya NO es parte del Expediente: el precio nace en el
   estimado y el tarifario nunca bloquea (ver "Al tarifario"). */
/* Reunión 2026-09-09: las Unidades dejaron de ser requisito para el
   Expediente. No es un bloqueo antes — es un catálogo que se va llenando
   solo conforme se crean Work Orders y Estimados (ver "+ Nueva unidad…"
   en esos formularios), nunca algo que haya que precargar a mano primero. */
const expedienteOK = (pid, opts) => {
  const sinEstimado = opts && opts.sinEstimado;
  return expedienteDe(pid).every(c=>c.ok || (sinEstimado && c.k==="estimado"));
};

/* ── EXCEPCIONES ── la compuerta antes de cerrar la semana ── */
function emailBodyDefaultEst(e){
  return `Buenos días,

Adjunto encontrarás el estimado para ${estPropNombre(e)}.

Si el estimado es aprobado, por favor háznoslo saber y estaremos encantados de programar el trabajo en el momento que te sea conveniente.

¡Gracias, y esperamos tu aprobación!

Claudia S. Cordova
CEO | Cordova Property Services LLC
Pensacola, FL | Sirviendo al Noroeste de Florida, Sur de Alabama y Mississippi
Tel: (469) 219-6869
Correo: scheduling@cordovaps.com | www.cordovapropertyservices.com`;
}
function modalEnviarEst(eid){
  const e=by(S.estimados,eid), cons=contactosEst(e);
  /* Un prospecto solo se puede enviar si tiene correo; un cliente, si tiene contactos. */
  const puedeEnviar = e.prospecto ? !!(e.prospecto.correo||"").trim() : cons.length>0;
  modal(`<div class="mh"><h3>Enviar ${esc(e.label||"Estimate")} ${esc(e.num)}</h3><p>Revisa o edita el correo antes de mandarlo — igual que lo hace Claudia.</p></div>
  <div class="mb">
    <div class="fld"><label>Para</label>
      <div class="hint">${cons.map(c=>esc(c.nombre)+" &lt;"+(esc(c.mail)||"sin correo")+"&gt;").join(", ")||"— sin contactos —"}</div></div>
    <div class="fld"><label>Asunto</label><input id="envAsunto" value="${esc(e.envAsunto||(esc(e.label||"Estimate")+" "+e.num+" — "+estPropNombre(e)))}"></div>
    <div class="fld" style="margin-bottom:0"><label>Cuerpo del correo</label>
      <textarea id="envCuerpo" rows="12">${esc(e.correoTexto||emailBodyDefaultEst(e))}</textarea></div>
    <div class="hint" style="margin-top:8px">📎 Adjunto: ${esc(e.num)} — Invoice.pdf</div>
    ${!puedeEnviar?`<div class="note r" style="margin-top:10px">${e.prospecto?"El prospecto no tiene correo — sin eso no se puede enviar.":"No hay contactos con correo para esta propiedad — agrega uno en su pestaña Contactos."}</div>`:""}
  </div>
  <div class="mf"><button class="btn" data-a="cm">Cancelar</button>
    <button class="btn p" data-a="estEnviarOK" data-id="${eid}" ${puedeEnviar?"":"disabled"}>Enviar</button></div>`,true);
}

/* Igual que modalMedio (trabajo adicional de Work Orders): antes de dar por
   buena una aprobacion de estimado, se pregunta por que canal fue. */
function modalMedioEst(id, tipo){
  const e = by(S.estimados, id);
  const etiqueta = tipo==="todo" ? "Aprobó todo" : tipo==="parcial" ? "Aprobó parcialmente" : "No aprobó";
  modal(`<div class="mh"><h3>¿Por qué canal aprobó el cliente?</h3><p>${esc(e.num)} · ${etiqueta}</p></div>
  <div class="mb">
    <div class="note w" style="margin-bottom:12px">Erika: «a veces las aprobaciones nos las dan por llamada, por mensaje, de diferentes maneras. Solo tener ese <b>sustento</b> de que sí se dio una aprobación». Lo que elijas define qué tan sólido queda si después lo discuten.</div>
    ${activos("medios").filter(m=>m!=="Enlace digital").map(m=>`
    <button class="btn" style="width:100%;justify-content:flex-start;margin-bottom:8px;padding:11px 13px"
      data-a="estMedioOK" data-id="${id}" data-tipo="${tipo}" data-medio="${m}">
      <div style="flex:1;text-align:left"><div style="font-weight:700">${m}</div></div></button>`).join("")}
  </div>
  <div class="mf"><button class="btn" data-a="cm">Cancelar</button></div>`);
}

const POLIZA_TIPOS = ["General Liability","Auto Liability","Umbrella/Excess Liability","Workers Compensation","Other"];
const coiVigente = pid => { const p=P(pid);
  return !!(p.polizas && p.polizas.length && p.polizas.every(x=>x.vence && x.vence>=HOY_SUP)); };

/* ── ESTIMADOS ── el sistema lo arma jalando el tarifario (UC-04) ── */
/* Una sola fuente de verdad para el precio de una linea de estimado.
   Si la linea trae precio guardado, ese manda — es el que el cliente vio
   cuando se le envio. Si no lo trae, se resuelve del tarifario.
   Antes habia dos calculos distintos y el correo al cliente mostraba 0. */
function precioLinea(e, l){
  if(l.precio!=null) return l.precio;
  const u = U(l.unidad); if(!u) return 0;
  const t = tarifa(e.prop, l.cat, l.serv, u.rooms, u.pisos);
  return t ? t.precio : 0;
}
/* El documento real (formulario de vCita) cobra Rate x Quantity y le suma el
   Tax de la linea — antes el total ignoraba la Cantidad, y el correo mostraba
   un monto que no cuadraba con lo que la tabla del estimado ya sumaba. */
const tasaLinea = l => l.tax ? ((by(S.impuestos,l.tax)||{}).tasa||0) : 0;
/* Misma cuenta que la factura (importeLinea): precio × cantidad − descuento,
   y recién después el tax. Las líneas viejas sin cantidad/descuento dan igual. */
const lnEst = (e,l) => ({...l, precio:precioLinea(e,l), cantidad:l.cantidad||1});
const baseLinea = (e,l) => importeLinea(lnEst(e,l));
const totalLinea = (e,l) => baseLinea(e,l)*(1+tasaLinea(l)/100);
const subtotalEst = e => e.lineas.reduce((a,l)=>a+baseLinea(e,l),0);
/* Precio por unidad que de verdad se cobra (ya con descuento): el que lleva la WO. */
const precioNetoLinea = (e,l) => Math.round(baseLinea(e,l)/(l.cantidad||1)*100)/100;
const totalEst = e => e.lineas.reduce((a,l)=>a+totalLinea(e,l),0);
/* Total de lo que el cliente realmente aceptó (puede haber marcado solo algunas líneas) */
const lineasAprobDe = e => e.lineasAprob || e.lineas.map((_,i)=>i);
const totalEstAprob = e => lineasAprobDe(e)
  .reduce((a,i)=> a + (e.lineas[i] ? totalLinea(e, e.lineas[i]) : 0), 0);
/* Numero, Bill To y vigencia — igual que el Estimate real de vCita */
const estSiguienteNum = () => "EST-2026-"+String(20+S.estimados.length).padStart(3,"0");
const billToDe = pid => { const p=P(pid); return p.cliente ? esc(CLI(p.cliente).nombre)+" - "+esc(p.nombre) : esc(p.nombre); };
/* Un estimado de prospecto no tiene propiedad registrada (e.prop=null): todo
   lo que antes hacía P(e.prop) pasa por estas tres. */
const estPropNombre = e => e.prospecto ? (e.prospecto.propiedad||e.prospecto.nombre||"—") : P(e.prop).nombre;
const billToEst = e => e.prospecto ? esc(e.prospecto.nombre||"—")+(e.prospecto.propiedad?" - "+esc(e.prospecto.propiedad):"") : billToDe(e.prop);
const estUniTxt = l => l.unidad ? U(l.unidad).num : "sin unidad";
const NOTA_ESTIMADO_DEFAULT = "Please note that cleaning services requiring extra materials or additional time will incur an extra charge per item or supply used.\nWe also offer trash-out services, carpet cleaning, and more.\nFor painting, we can handle sheen changes (matte, satin, semi-gloss) and color changes — not just same-color refreshes.\nAdditionally, if you need repairs, we do it all: from the smallest fixes to more complex projects!\nIf you need a customized estimate, don't hesitate to contact us — we'll get it to you within 24 hours!";
/* Solo cuenta como "inspeccion recibida" un reporte de campo tipo "previo"
   de esa propiedad, creado el mismo dia de la solicitud o despues. */
const solInspeccionLista = s => !!s.prop && S.reportes.some(r=>r.tipo==="previo" && r.prop===s.prop && r.fecha>=s.fecha);
/* Un estimado nace de una Solicitud Comercial (solComEstimado) o directo
   desde "+ Nuevo estimado" (directo=true: cliente existente o prospecto, sin
   solicitud ni plazo de 24 h). Esta funcion arma el borrador en blanco. */
function estInicializarBorrador(prop, solicitudId, directo){
  S.draftEst=[]; S.estLin=null; S.estEditIdx=null;
  const cs=contactosDe(prop), hoy="2026-08-11";
  // Si la Solicitud ya dice con quién habló Lydia, es ese contacto el que
  // sale marcado — Claudia no tiene que volver a elegir con quién fue.
  const sol = solicitudId ? by(S.solicitudesComerciales,solicitudId) : null;
  const preferido = sol && cs.some(c=>c.id===sol.contactoId) ? sol.contactoId : (cs[0]&&cs[0].id);
  S.estHdr={prop,contactos:preferido?[preferido]:[], solicitudId:solicitudId||null,
    modo:"cliente", directo:!!directo, prospecto:{nombre:"",correo:"",propiedad:""}, origen:solicitudId||"Directo",
    label:"Estimate", num:estSiguienteNum(), issueDate:hoy, expDate:sumarDias(hoy,30),
    po:"", docs:[], deposito:false, depositoMonto:"", firma:false, terminos:"",
    nota:NOTA_ESTIMADO_DEFAULT};
}

/* ── SOLICITUDES COMERCIALES ── paso 1 del flujograma «Gestión de Propuestas
   y Estimados»: lo que Lydia recibe antes de que exista cualquier estimado.
   Sin esto, el sistema arrancaba a medir a partir de la mitad del proceso. */
VIEWS.solicitudes = () => `
  <div class="ph"><div><h2>Solicitudes Comerciales</h2>
    <p>Lo que Lydia recibe cuando alguien pide un precio — antes de que exista cualquier estimado.</p></div>
    <div class="act"><button class="btn p" data-a="solComNueva">+ Nueva solicitud</button></div></div>

  ${(()=>{ /* UC-01b — la visita comercial en sí: antes el sistema saltaba
      directo del registro del prospecto a la Solicitud Comercial. Si en la
      visita el cliente no se decidía, esa visita no quedaba en ningún lado
      y el seguimiento dependía de que alguien se acordara. */
    const vs = S.visitas.filter(v=>v.tipo==="Comercial");
    return `<div class="card" style="margin-bottom:14px">
    <div class="chd"><h3>Visitas comerciales</h3>
      <span class="s">con quién habló, qué pidió, y qué resultó después de cada visita</span>
      <span class="r"><button class="btn sm p" data-a="visitaComNueva">+ Registrar visita</button></span></div>
    <table><thead><tr><th>Fecha</th><th>Propiedad</th><th>Contacto</th><th>Notas de la visita</th>
      <th>Resultado</th><th>Próxima acción</th><th></th></tr></thead>
    <tbody>${vs.map(v=>{
      const vencido = v.estado==="En seguimiento" && v.proximaAccion && v.proximaAccion<HOY_SUP;
      /* "Servicio directo" se ve resuelto (pastilla verde) aunque nunca haya
         llegado a Thalia — pasa cuando la propiedad todavía no tiene el
         Expediente completo: ramificarVisita() lo avisa con un toast que se
         va solo, y la visita se queda «Cerrada» sin dejar ningún rastro.
         Un prospecto real diciendo «sí, mándenlo» se perdía sin que nadie
         se enterara por qué. Ahora, mientras siga sin llegar, la fila lo
         dice y ofrece el mismo camino que ya existe en Estimados. */
      const atascada = v.resultado==="Servicio directo" && !v.solicitudDirectaId;
      return `<tr class="${fl("visita:"+v.id)}">
        <td class="mono">${esc(v.fecha)}</td>
        <td>${v.prop?esc(P(v.prop).nombre):`${esc(v.propNombre)} <span class="pill w">nueva</span>`}</td>
        <td>${esc(v.contacto)}</td>
        <td>${esc(v.notas.length>55?v.notas.slice(0,55)+"…":v.notas)}</td>
        <td><span class="pill ${atascada?"w":v.resultado==="Requiere estimado"?"a":v.resultado==="Servicio directo"?"v":vencido?"r":"w"}">${esc(v.resultado)}</span>
          ${atascada?`<div style="font-size:10px;color:var(--ambar);margin-top:2px">⏳ no llegó a Thalia — falta el Expediente</div>`:""}</td>
        <td>${v.proximaAccion?`<span class="mono" style="${vencido?"color:var(--rojo);font-weight:700":""}">${esc(v.proximaAccion)}${vencido?" ⚠":""}</span>`:"—"}</td>
        <td style="text-align:right">${v.estado==="En seguimiento"?`<button class="btn sm" data-a="visitaComEditar" data-id="${v.id}">Actualizar</button>`
          :atascada?(expedienteOK(v.prop,{sinEstimado:true})
            ?`<button class="btn sm p" data-a="visitaReintentarDirecto" data-id="${v.id}">Reintentar</button>`
            :`<button class="btn sm" data-a="visitaIrExpediente" data-id="${v.id}">Completar Expediente</button>`)
          :""}</td></tr>`;
    }).join("")||`<tr><td colspan="7" class="empty">Sin visitas comerciales todavía</td></tr>`}
    </tbody></table>
    <div class="cp" style="border-top:1px solid var(--line)"><div class="tr" style="margin:0">
      Un prospecto que «sigue en seguimiento» no se pierde: si se pasa la fecha de la próxima acción,
      sale en Alertas hasta que alguien lo retome y cierre el resultado.</div></div>
    </div>`;})()}

  <div class="card"><table>
    <thead><tr><th>Fecha</th><th>Propiedad</th><th>Contacto</th><th>Alcance</th><th>Origen</th><th>Inspección</th><th>Respuesta</th><th>Estado</th><th></th></tr></thead>
    <tbody>${S.solicitudesComerciales.map(s=>`<tr class="${fl("solcom:"+s.id)}">
      <td class="mono">${esc(s.fecha)}</td>
      <td>${s.prop?esc(P(s.prop).nombre):`${esc(s.propNombre)} <span class="pill w">nueva</span>`}</td>
      <td>${esc(s.contacto)}<div style="font-size:10.5px;color:var(--faint)">${esc(s.correo)}</div></td>
      <td>${esc(s.alcance.length>60?s.alcance.slice(0,60)+"…":s.alcance)}</td>
      <td>${s.origen?`<span class="pill">${esc(s.origen)}</span>`:"—"}${s.pidio?`<div style="font-size:10.5px;color:var(--faint)">${esc(s.pidio)}</div>`:""}</td>
      <td>${s.inspeccion?`<span class="pill ${solInspeccionLista(s)?"v":"w"}">${solInspeccionLista(s)?"Recibida":"Pendiente"}</span>`:'<span style="color:var(--faint)">No requiere</span>'}</td>
      <td>${solRespuestaHTML(s)}</td>
      <td><span class="pill ${s.estado==="Estimado creado"?"v":s.estado==="Descartada"?"r":"a"}">${esc(s.estado)}</span></td>
      <td style="text-align:right;white-space:nowrap">
        ${s.estado==="Esperando inspección"&&!solInspeccionLista(s)?`<button class="btn sm" data-a="solComInspeccion" data-id="${s.id}">Asignar inspección a Gustavo</button>`:""}
        ${s.estado!=="Estimado creado"&&s.estado!=="Descartada"?`<button class="btn sm p" data-a="solComEstimado" data-id="${s.id}">Crear estimado</button>
          <button class="btn sm" data-a="solComNueva" data-id="${s.id}">Editar</button>
          <button class="btn sm" data-a="solComDescartar" data-id="${s.id}">Descartar</button>`:""}
        ${s.estado==="Estimado creado"?`<button class="btn sm" data-a="estInvoice" data-id="${s.estimadoId}">Ver estimado</button>`:""}
      </td></tr>`).join("")||`<tr><td colspan="9" class="empty">Sin solicitudes todavía</td></tr>`}
    </tbody></table></div>
  <div class="note">El embudo comercial completo se ve aquí: cuántos pedidos entran, cuántos requieren inspección de Gustavo, cuántos terminan convertidos en un estimado — y cuántos se caen antes de llegar a eso.</div>`;

/* Una propiedad puede tener más de un contacto (Manager, Maintenance…) —
   tomar siempre "el primero" a ciegas no es correcto. Un select simple que
   liste los contactos reales, y que llene contacto+correo con el elegido.
   El id elegido queda guardado (scContactoId) para que, si esta Solicitud
   se convierte en Estimado, sea el MISMO contacto el que salga marcado —
   sin que Claudia tenga que volver a elegir con quién habló Lydia. */
function refSolCom(preselectId, preservarTexto){
  const pid = val("scProp");
  const box = document.getElementById("scContactoBox");
  if(!box) return;
  const cs = pid ? contactosDe(pid) : [];
  if(cs.length){
    // Al abrir para corregir una solicitud vieja, "preservarTexto" evita que
    // se pise en silencio lo que ya tenía escrito — antes, una solicitud con
    // contactoId vacío (dato de antes de que existiera este campo) se topaba
    // con la propiedad y el select agarraba "el primero de la lista" sin
    // avisar, cambiando el contacto sin que nadie lo pidiera.
    const autofill = !preselectId && !preservarTexto;
    const matched = cs.some(c=>c.id===preselectId) ? preselectId : "";
    const chosen = matched || (autofill ? cs[0].id : "");
    // Si hay un contacto guardado (o se está corrigiendo) que no calza con
    // ninguno de los registrados de esta propiedad — como pasaba con SC1,
    // que traía "Rick Halloway" pero ese contacto está anotado bajo OTRA
    // propiedad — no se fuerza a elegir uno: se deja explícito que ninguno
    // de la lista es el que está escrito abajo.
    const sinMatch = !autofill && !matched;
    box.innerHTML = `<div class="fld"><label>¿Con quién habló? <span class="req">*</span></label>
      <select id="scContactoSel" data-a="solConSel">
        ${sinMatch?`<option value="" selected>— ninguno de estos, dejar lo escrito abajo —</option>`:""}
        ${cs.map(c=>`<option value="${c.id}" ${c.id===chosen?"selected":""}>${esc(c.nombre)} — ${esc(c.tipo)}</option>`).join("")}
      </select></div>`;
    if(autofill){
      document.getElementById("scContacto").value = cs[0].nombre;
      document.getElementById("scCorreo").value = cs[0].mail||"";
    }
  } else {
    box.innerHTML = pid
      ? `<div class="note w" style="margin:0 0 12px">Esta propiedad todavía no tiene ningún contacto registrado.
          <div style="margin-top:6px"><button type="button" class="btn sm" data-a="solConNuevo">+ Agregar contacto</button></div></div>`
      : "";
  }
}
/* Celda "Respuesta": cuenta regresiva de 24h, o cómo cerró */
function solRespuestaHTML(s){
  if(!s.respondida && (s.estado==="Estimado creado"||s.estado==="Descartada")) return "—";
  const p=solPlazo(s);
  if(p.estado==="abierta") return p.horas<0 ? `<span class="pill r">vencida hace ${fmtHoras(p.horas)}</span>`
    : `<span class="pill ${p.horas<=4?"a":""}">⏱ faltan ${fmtHoras(p.horas)}</span>`;
  return p.estado==="a tiempo" ? `<span class="pill v">✅ a tiempo (${fmtHoras(p.horas)})</span>`
    : `<span class="pill r">⚠ tarde (${fmtHoras(p.horas)})</span>`;
}
function modalSolCom(id){
  const s = id ? by(S.solicitudesComerciales,id) : null;
  modal(`<div class="mh"><h3>${s?"Editar solicitud":"Nueva Solicitud Comercial"}</h3><p>Lo mismo que Lydia anota cuando alguien pide un precio.</p></div>
  <div class="mb">
    <div class="fld"><label>Propiedad <span class="req">*</span></label>
      <select id="scProp" data-a="refSolCom">
        <option value="">— Propiedad nueva, aún no registrada —</option>
        ${S.propiedades.map(p=>`<option value="${p.id}" ${s&&s.prop===p.id?"selected":""}>${esc(p.nombre)} — ${esc(p.zona)}</option>`).join("")}
      </select>
      <div style="margin-top:8px"><button type="button" class="btn sm" data-a="solPropNueva">+ Crear propiedad</button>
        <span style="font-size:11px;color:var(--faint);margin-left:6px">si todavía no existe</span></div></div>
    <div id="scContactoBox"></div>
    <div class="fg c2">
      <div class="fld"><label>Persona de contacto <span class="req">*</span></label><input id="scContacto" value="${s?esc(s.contacto):""}"></div>
      <div class="fld"><label>Correo <span class="req">*</span></label><input id="scCorreo" value="${s?esc(s.correo):""}"></div></div>
    <div class="fld"><label>Alcance del trabajo solicitado <span class="req">*</span></label><textarea id="scAlcance" rows="3">${s?esc(s.alcance):""}</textarea></div>
    <div class="fg c2">
      <div class="fld"><label>¿Requiere inspección en sitio? <span class="req">*</span></label>
        <select id="scInspeccion"><option value="no" ${!(s&&s.inspeccion)?"selected":""}>No</option><option value="si" ${s&&s.inspeccion?"selected":""}>Sí</option></select></div>
      <div class="fld"><label>Cliente lo necesita <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— opcional</span></label><input type="date" id="scFecha" value="${s?esc(s.fechaObjetivo||""):""}"></div></div>
    <div class="fg c2">
      <div class="fld"><label>Origen</label>
        <select id="scOrigen">${["Claudia","Correo","Gustavo","Visita"].map(o=>`<option ${(s&&s.origen||"Claudia")===o?"selected":""}>${o}</option>`).join("")}</select></div>
      <div class="fld"><label>Pidió <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— si fue por correo</span></label><input id="scPidio" placeholder="¿Quién lo pidió?" value="${s?esc(s.pidio||""):""}"></div></div>
    <div class="fld" style="margin-bottom:0"><label>Notas o requerimientos especiales</label><textarea id="scNotas" rows="2">${s?esc(s.notas||""):""}</textarea></div>
  </div>
  <div class="mf"><button class="btn" data-a="cm">Cancelar</button>
    <button class="btn p" data-a="solComGuardar" data-id="${s?s.id:""}">Guardar</button></div>`);
  // true = no pisar lo que ya tenía escrito solo porque no tiene contactoId
  if(s && s.prop) refSolCom(s.contactoId, true);
}

/* ── VISITA COMERCIAL (UC-01b) ── el paso que faltaba antes de la Solicitud
   Comercial: Lydia registra con quién habló y qué resultó después de la
   visita (el Price List se consulta aparte, en Propiedades, antes de salir
   — para cuando se llena este formulario la visita ya pasó).
   Si el prospecto no se decide, "Sigue en seguimiento" con su próxima acción —
   no se cierra el modal sin esa fecha, para no repetir el mismo hueco que
   tenían las WO reagendadas sin retorno. */
/* Lo que sigue después de la visita — las dos salidas que ya existían
   (Solicitud Comercial vía A, transferir sin llamada vía B) más la que
   faltaba (seguimiento). No duplica el trabajo si ya se ramificó antes. */
function ramificarVisita(v){
  if(v.resultado==="Requiere estimado"){
    if(!v.solicitudId){
      const sc = {id:"SC"+Date.now(), fecha:"2026-08-11", prop:v.prop, propNombre:v.propNombre||"", contactoId:v.contactoId||null,
        contacto:v.contacto, correo:v.correo||"", alcance:v.notas, inspeccion:false, fechaObjetivo:"",
        notas:`Generada desde la visita comercial de ${v.quien||S.usuario} el ${v.fecha}.`,
        quien:S.usuario, estado:"Lista para estimado", estimadoId:null, origen:"Visita", pidio:"", ...solSello()};
      S.solicitudesComerciales.unshift(sc); v.solicitudId = sc.id;
      if(S.usuario!=="Claudia") avisar("Claudia","Nueva solicitud de estimado",
        `${esc(sc.prop?P(sc.prop).nombre:(sc.propNombre||"Propiedad nueva"))} (Visita) — contestar antes de ${fmtLim(sc.limite)}`,"a");
    }
    toast("✓ Pasa a Solicitud Comercial",`Se creó la solicitud de <b>${esc(v.contacto)}</b> — ya se puede armar el estimado.`,"v");
  } else if(v.resultado==="Servicio directo"){
    if(!v.prop){ toast("Falta registrar la propiedad","Crea primero la Propiedad antes de transferir a Thalia sin llamada.","w"); }
    /* "Servicio directo" no exige Estimado aprobado: esa es justo la
       llamada de negociar que este camino promete saltarse — pedirlo
       igual lo volvía imposible de cerrar la primera vez que se usaba una
       propiedad nueva. El resto del Expediente (COI, contacto...)
       sigue exigiéndose igual. */
    else if(!expedienteOK(v.prop,{sinEstimado:true})){ toast("Expediente incompleto",`Completa el expediente de <b>${esc(P(v.prop).nombre)}</b> antes de transferir a Thalia.`,"w"); }
    else if(!v.solicitudDirectaId){
      const p=P(v.prop);
      const nsol={id:"SOL"+Date.now(),prop:v.prop,cliente:p.cliente,quien:S.usuario,hora:hora(),
        nota:"Desde visita comercial · lista para agendar",estado:"Pendiente"};
      S.solicitudes.push(nsol); v.solicitudDirectaId = nsol.id;
      toast("✓ Transferida a Thalia",`<b>${esc(p.nombre)}</b> le llegó sin llamada, con todo lo que se habló en la visita.`,"v");
    }
  } else {
    toast("✓ Seguimiento guardado",`Si se pasa el ${esc(v.proximaAccion)} sin retomarlo, sale en Alertas.`,"a");
  }
}
/* El Price List no va aquí: cuando Lydia llena este formulario la visita ya
   pasó — es un registro de lo que ocurrió, no una herramienta de antes de
   salir. Si necesita el precio antes de la visita, lo consulta aparte en
   Propiedades → Price List (mismo dato, en el momento en que sí sirve). */
function refVisitaCom(preselectId, preservarTexto){
  const pid = val("vcProp");
  const box = document.getElementById("vcContactoBox");
  if(!box) return;
  const cs = pid ? contactosDe(pid) : [];
  if(cs.length){
    const autofill = !preselectId && !preservarTexto;
    const matched = cs.some(c=>c.id===preselectId) ? preselectId : "";
    const chosen = matched || (autofill ? cs[0].id : "");
    const sinMatch = !autofill && !matched;
    box.innerHTML = `<div class="fld"><label>¿Con quién habló? <span class="req">*</span></label>
      <select id="vcContactoSel" data-a="visitaConSel">
        ${sinMatch?`<option value="" selected>— ninguno de estos, dejar lo escrito abajo —</option>`:""}
        ${cs.map(c=>`<option value="${c.id}" ${c.id===chosen?"selected":""}>${esc(c.nombre)} — ${esc(c.tipo)}</option>`).join("")}
      </select></div>`;
    if(autofill){
      document.getElementById("vcContacto").value = cs[0].nombre;
      document.getElementById("vcCorreo").value = cs[0].mail||"";
    }
  } else {
    box.innerHTML = pid
      ? `<div class="note w" style="margin:0 0 12px">Esta propiedad todavía no tiene ningún contacto registrado.
          <div style="margin-top:6px"><button type="button" class="btn sm" data-a="visitaConNuevo">+ Agregar contacto</button></div></div>`
      : "";
  }
}
/* Lo que ya llevaba escrito en la visita, para no perderlo al saltar a
   crear la Propiedad y volver. Mismo criterio que S.tarDraft con
   "+ Add new tax" — nada se pisa por ir a completar un dato que faltaba. */
function leerVisitaDraft(){
  const get = id => { const e=document.getElementById(id); return e?e.value:""; };
  const btn = document.querySelector('[data-a="visitaComGuardar"]');
  const sel = document.getElementById("vcContactoSel");
  return {id: btn?btn.dataset.id:"", prop:get("vcProp"), propNombre:get("vcPropNombre"),
    contactoId: sel?sel.value:null, contacto:get("vcContacto"), correo:get("vcCorreo"), notas:get("vcNotas"),
    resultado:get("vcResultado"), proxima:get("vcProxima")};
}
/* Vuelve al modal de visita comercial con lo que ya llevaba escrito, después
   de crear la Propiedad (o cancelar) — nunca se pierde. */
function volverAVisitaDraft(dr){
  cm(); modalVisitaCom(dr.id||null);
  // modal() ya dejó el HTML en el DOM — se restaura de una, igual que progFecha
  const set=(id,v)=>{ const e=document.getElementById(id); if(e && v) e.value=v; };
  if(dr.prop){ set("vcProp",dr.prop); refVisitaCom(dr.contactoId); }
  set("vcPropNombre",dr.propNombre); set("vcContacto",dr.contacto); set("vcCorreo",dr.correo);
  set("vcNotas",dr.notas); set("vcResultado",dr.resultado);
  if(dr.resultado==="Sigue en seguimiento"){ const pr=document.getElementById("vcProxRow");
    if(pr){ pr.style.display=""; set("vcProxima",dr.proxima); } }
}
/* Mismo mecanismo para la Solicitud Comercial: "propiedad nueva" tampoco
   puede seguir siendo un nombre suelto que nunca se convierte en Propiedad
   real — al final del flujo (armar el estimado) siempre terminaba bloqueada
   pidiendo justo eso. */
function leerSolComDraft(){
  const get = id => { const e=document.getElementById(id); return e?e.value:""; };
  const btn = document.querySelector('[data-a="solComGuardar"]');
  const sel = document.getElementById("scContactoSel");
  return {id: btn?btn.dataset.id:"", prop:get("scProp"),
    contactoId: sel?sel.value:null, contacto:get("scContacto"), correo:get("scCorreo"), alcance:get("scAlcance"),
    inspeccion:get("scInspeccion"), fecha:get("scFecha"), notas:get("scNotas"),
    origen:get("scOrigen"), pidio:get("scPidio")};
}
function volverASolComDraft(dr){
  cm(); modalSolCom(dr.id||null);
  const set=(id,v)=>{ const e=document.getElementById(id); if(e && v) e.value=v; };
  set("scProp",dr.prop);
  // Antes esta función nunca volvía a pintar el bloque de contacto — al
  // volver de "+ Crear propiedad" (o de "+ Agregar contacto"), esa caja
  // quedaba vacía sin selector ni aviso, aunque la propiedad ya estuviera
  // puesta. Mismo mecanismo que en Visita Comercial.
  if(dr.prop) refSolCom(dr.contactoId);
  set("scContacto",dr.contacto); set("scCorreo",dr.correo);
  set("scAlcance",dr.alcance); set("scInspeccion",dr.inspeccion); set("scFecha",dr.fecha); set("scNotas",dr.notas); set("scOrigen",dr.origen); set("scPidio",dr.pidio);
}
function modalVisitaCom(id){
  const v = id ? by(S.visitas, id) : null;
  const editando = v && v.resultado==="Sigue en seguimiento";
  modal(`<div class="mh"><h3>${editando?"Actualizar seguimiento":"Registrar visita comercial"}</h3>
    <p>Lo que quedó después de la visita: con quién habló, qué pidió, y qué sigue.</p></div>
  <div class="mb">
    ${editando?`
      <div class="note" style="margin-bottom:12px"><b>${v.prop?esc(P(v.prop).nombre):esc(v.propNombre)}</b> · visitada el ${esc(v.fecha)}
        <div style="margin-top:4px">${esc(v.notas)}</div></div>
      <input type="hidden" id="vcProp" value="${v.prop||""}"><input type="hidden" id="vcPropNombre" value="${esc(v.propNombre||"")}">
      <input type="hidden" id="vcContacto" value="${esc(v.contacto)}"><input type="hidden" id="vcCorreo" value="${esc(v.correo||"")}">
      <div class="fld"><label>Qué pasó ahora <span class="req">*</span></label><textarea id="vcNotas" rows="2" placeholder="Ej: llamó de vuelta, ya tiene aprobado el presupuesto">${""}</textarea></div>
    `:`
      <div class="fld"><label>Propiedad <span class="req">*</span></label>
        <select id="vcProp" data-a="refVisitaCom">
          <option value="">— elige una propiedad —</option>
          ${S.propiedades.map(p=>`<option value="${p.id}">${esc(p.nombre)} — ${esc(p.zona)}</option>`).join("")}
        </select>
        <input type="hidden" id="vcPropNombre" value="">
        <div style="margin-top:8px"><button type="button" class="btn sm" data-a="visitaPropNueva">+ Crear propiedad</button>
          <span style="font-size:11px;color:var(--faint);margin-left:6px">si todavía no existe</span></div></div>
      <div id="vcContactoBox"></div>
      <div class="fg c2">
        <div class="fld"><label>Persona de contacto <span class="req">*</span></label><input id="vcContacto"></div>
        <div class="fld"><label>Correo</label><input id="vcCorreo"></div></div>
      <div class="fld"><label>Notas de la visita <span class="req">*</span></label>
        <textarea id="vcNotas" rows="3" placeholder="Qué se habló, qué observó, qué pidió">${""}</textarea></div>
    `}
    <div class="fld"><label>Resultado <span class="req">*</span></label>
      <select id="vcResultado" data-a="visitaResultadoRef">
        <option value="">— elige —</option>
        <option value="Requiere estimado">Requiere estimado — pasa a Solicitud Comercial</option>
        <option value="Servicio directo">Servicio directo — pasa a Thalia sin llamada</option>
        <option value="Sigue en seguimiento">Sigue en seguimiento — todavía no se decide</option>
      </select></div>
    <div id="vcProxRow" class="fld" style="display:none;margin-bottom:0">
      <label>Próxima acción <span class="req">*</span></label>
      <input type="date" id="vcProxima">
      <div class="hint">Mientras no se cierre con otro resultado, si se pasa esta fecha sale en Alertas.</div></div>
  </div>
  <div class="mf"><button class="btn" data-a="cm">Cancelar</button>
    <button class="btn p" data-a="visitaComGuardar" data-id="${v?v.id:""}">Guardar</button></div>`);
}

VIEWS.estimados = () => `
  <div class="ph"><div><h2>Estimados</h2>
    <p>Armás las líneas como en una factura: el precio se precarga del tarifario si existe, pero siempre se puede ajustar.</p></div>
    <div class="act"><button class="btn" data-a="ir" data-m="solicitudes">Ir a Solicitudes</button>
      <button class="btn p" data-a="estNuevo">+ Nuevo estimado</button></div></div>
  <div class="note" style="margin-bottom:12px">Un estimado puede nacer de una <b>Solicitud Comercial</b> (corre el plazo de 24 h) o directo con «+ Nuevo estimado», para un cliente existente o un <b>prospecto nuevo</b> — sin registrar nada todavía.</div>
  <div class="card"><table>
    <thead><tr><th>Número</th><th>Propiedad</th><th>Contacto</th><th>Fecha</th><th class="num">Líneas</th><th class="num">Monto</th><th>Estado</th><th>Aprobación</th><th></th></tr></thead>
    <tbody>${S.estimados.map(e=>`<tr class="${fl("est:"+e.id)}">
      <td class="mono" style="font-weight:700">${esc(e.num)}</td>
      <td>${esc(estPropNombre(e))}${e.prospecto?` <span class="pill w">prospecto</span>`:""}</td><td>${esc(contactosEst(e).map(c=>c.nombre).join(", "))}</td><td class="mono">${e.fecha.slice(5)}</td><td class="num mono">${e.lineas.length}</td>
      <td class="num mono" style="font-weight:700">${money(totalEst(e))}</td>
      <td><span class="pill ${e.estado==="Aprobado"?"v":e.estado==="Rechazado"?"r":"a"}">${esc(e.estado)}</span></td>
      <td>${e.aprob?`<span class="pill m">${esc(e.aprob.medio)}</span><div style="font-size:10px;color:var(--faint)">${esc(e.aprob.quien)} · ${esc(e.aprob.fecha)}${e.aprob.ip?" · IP "+e.aprob.ip:""}</div>`:'<span style="color:var(--faint)">esperando</span>'}</td>
      <td style="text-align:right;white-space:nowrap">
        <button class="btn sm" data-a="estInvoice" data-id="${e.id}">Invoice</button>
        ${e.estado==="Borrador"?`<button class="btn sm p" data-a="estEnviar" data-id="${e.id}">Enviar</button>`:""}
        ${e.estado!=="Borrador"?`<button class="btn sm" data-a="estVer" data-id="${e.id}">Ver</button>`:""}
        ${e.estado==="Enviado"?`<button class="btn sm" data-a="estClienteNo" data-id="${e.id}">Rechazar</button>
          <button class="btn sm v" data-a="estClienteOK" data-id="${e.id}">Aprobar</button>`:""}
        ${e.estado==="Rechazado"?`<button class="btn sm p" data-a="estModificar" data-id="${e.id}">Modificar propuesta y reenviar</button>`:""}
        ${e.estado==="Aprobado"&&e.prospecto?`<button class="btn sm p" data-a="estConvertir" data-id="${e.id}">Convertir en cliente</button>`:""}
        ${e.estado==="Aprobado"&&!e.prospecto&&!coiVigente(e.prop)?`<button class="btn sm" style="border-color:var(--rojo);color:var(--rojo)" data-a="estCOI" data-id="${e.id}">Solicitar COI</button>`:""}
        ${e.estado==="Aprobado"&&!e.prospecto&&!expedienteOK(e.prop)?`<button class="btn sm" data-a="estIrExpediente" data-id="${e.id}">Completar Expediente</button>`:""}
        ${e.estado==="Aprobado"&&!e.prospecto?`<button class="btn sm ${expedienteOK(e.prop)?"p":""}" data-a="estAgendar" data-id="${e.id}" ${expedienteOK(e.prop)?"":"disabled"}>Transferir a programación</button>`:""}
        ${e.estado==="Transferido"?`<span class="pill v" style="margin-left:6px">Con Thalia</span>`:""}
      </td></tr>`).join("")||`<tr><td colspan="9" class="empty">Sin estimados todavía</td></tr>`}
    </tbody></table></div>
  <div class="note">El cliente solo recibe el correo con el Invoice adjunto — no hace clic en nada. <b>Aprobar</b> / <b>Rechazar</b> se registra a mano, siempre pidiendo el canal por el que avisó.</div>
  <div class="tr" style="margin-top:8px">Al aprobarse, un <b>prospecto</b> pasa a ser <b>cliente</b>: ahí es cuando deja de ser alguien que preguntó y empieza a generar trabajo.</div>`;

function modalEst(){
  const h = S.estHdr;
  const pros = h.modo==="prospecto", pr = h.prospecto||{};
  const lineas = S.draftEst;
  const subtotal = lineas.reduce((a,l)=>a+baseLinea({prop:h.prop},l),0);
  const total = lineas.reduce((a,l)=>a+totalLinea({prop:h.prop},l),0);
  /* Agregar/quitar una línea reconstruye el modal entero (modalEst() se
     vuelve a llamar) — el nodo .mb es uno nuevo y su scroll arranca en 0,
     así que cada "+ Agregar al estimado" mandaba de vuelta arriba del
     formulario, aunque estuvieras abajo armando varias líneas seguidas.
     Mismo criterio que ya se usaba en las hojas del celular del técnico. */
  const mbAntes = document.querySelector("#mroot .mb");
  const scrollAntes = mbAntes ? mbAntes.scrollTop : 0;
  modal(`<div class="mh"><h3>${h.editId?"Modificar propuesta":"Estimate"} ${esc(h.num||"")}</h3><p>${h.editId?"El cliente no la aprobó — ajusta lo que haga falta antes de reenviarla.":"Los mismos campos con los que ella arma un Estimate en vCita."}</p></div>
  <div class="mb">
    <details style="margin-bottom:10px"><summary style="cursor:pointer;font-weight:650;font-size:13px"><b>From:</b> Cordova Property Services LLC</summary>
      <div class="hint" style="margin-top:6px">922 Brookside Pl. · Pensacola, FL, 32503</div></details>

    ${h.directo?`<div class="fld"><label>Para quién</label>
      <div style="display:flex;gap:6px">
        <button type="button" class="btn sm ${pros?"":"p"}" data-a="estModo" data-m="cliente">Cliente existente</button>
        <button type="button" class="btn sm ${pros?"p":""}" data-a="estModo" data-m="prospecto">Prospecto nuevo</button></div></div>`:""}

    ${pros?`<div class="fld"><label>Nombre <span class="req">*</span></label><input id="ePN" value="${esc(pr.nombre||"")}"></div>
      <div class="fg c2">
        <div class="fld"><label>Correo <span class="req">*</span></label><input id="ePC" value="${esc(pr.correo||"")}"></div>
        <div class="fld"><label>Propiedad o dirección</label><input id="ePP" value="${esc(pr.propiedad||"")}"></div></div>
      <div class="hint" style="margin:-4px 0 12px">No se registra propiedad ni contacto todavía. Si aprueba, lo convertís en cliente desde la lista.</div>`
    :`<div class="fld"><label>Bill To <span class="req">*</span> <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— la propiedad y su Management</span></label>
      ${S.propiedades.length
        ? `<select id="eProp" data-a="estHdr">${S.propiedades.map(p=>`<option value="${p.id}" ${p.id===h.prop?"selected":""}>${esc(p.nombre)} — ${esc(p.zona)}</option>`).join("")}</select>
           <div class="hint">${billToDe(h.prop)}</div>`
        : `<select id="eProp" disabled><option>— sin propiedades —</option></select>
           <div class="hint" style="color:var(--rojo)">Todavía no hay ninguna propiedad. Créala primero en <b>Propiedades</b>.</div>`}</div>

    <div class="fld"><label>Contacto <span class="req">*</span> <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— marca a todos los que deben recibirlo</span></label>
      ${(()=>{ const cs=contactosDe(h.prop);
        return cs.length
          ? `<div style="display:flex;flex-direction:column;gap:7px">${cs.map(c=>`
              <label style="display:flex;align-items:center;gap:7px;font-weight:500;font-size:12.5px;cursor:pointer">
                <input type="checkbox" class="eCon" value="${c.id}" data-a="estConToggle" ${(h.contactos||[]).includes(c.id)?"checked":""} style="width:15px;height:15px">
                ${esc(c.nombre)} — ${esc(c.tipo)}</label>`).join("")}</div>`
          : `<div class="note r" style="margin:0">Esta propiedad no tiene contactos. Crea uno en su pestaña <b>Contactos</b> antes de enviar.</div>`;
      })()}</div>`}

    <div style="border:1px solid var(--line);border-radius:9px;padding:11px;margin-bottom:12px;background:var(--surface-2)">
      <div style="font-size:11px;font-weight:750;text-transform:uppercase;letter-spacing:.05em;color:var(--faint);margin-bottom:8px">Estimate Details</div>
      <div class="fg c2">
        <div class="fld" style="margin-bottom:8px"><label>Estimate Label</label><input id="eLabel" maxlength="100" value="${esc(h.label||"Estimate")}"></div>
        <div class="fld" style="margin-bottom:8px"><label>Estimate Number</label><input id="eNum" class="mono" value="${esc(h.num||"")}"></div></div>
      <div class="fg c3">
        <div class="fld" style="margin-bottom:0"><label>Issue Date</label><input type="date" id="eIssue" value="${h.issueDate||""}"></div>
        <div class="fld" style="margin-bottom:0"><label>Expiration Date</label><input type="date" id="eExp" value="${h.expDate||""}"></div>
        <div class="fld" style="margin-bottom:0"><label>Currency</label><select disabled><option>USD</option></select></div></div>
      <div class="fld" style="margin-top:9px;margin-bottom:0"><label>Purchase Order <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— optional</span></label><input id="ePO" value="${esc(h.po||"")}"></div>
    </div>

    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <div style="font-size:11px;font-weight:750;text-transform:uppercase;letter-spacing:.05em;color:var(--faint);flex:1">Líneas del estimado</div>
      <button class="btn p sm" data-a="estAddLinea">+ Agregar línea</button></div>

    ${lineas.length?`<table style="border:1px solid var(--line);border-radius:9px;overflow:hidden">
      <thead><tr><th>Item</th><th class="num">Price</th><th class="num">Qty</th><th class="num">Disc.</th><th class="num">Tax</th><th class="num">Total</th><th></th></tr></thead>
      <tbody>${lineas.map((l,i)=>`<tr>
        <td>${esc(l.serv)}${l.libre?` <span class="pill m">libre</span>`:""}${l.descripcion?`<div style="font-size:11px;color:var(--soft)">${esc(l.descripcion)}</div>`:""}
          <div style="font-size:10.5px;color:var(--faint)">${esc(estUniTxt(l))} · ${esc(l.cat)}</div></td>
        <td class="num mono">${money(l.precio||0)}</td>
        <td class="num mono">${l.cantidad||1}</td>
        <td class="num mono">${textoDescLinea(l)}</td>
        <td class="num mono">${tasaLinea(l)?tasaLinea(l)+"%":"—"}</td>
        <td class="num mono" style="font-weight:700">${money(totalLinea({prop:h.prop},l))}</td>
        <td style="text-align:right;white-space:nowrap"><button class="btn sm" data-a="estEditLinea" data-i="${i}">Editar</button>
          ${!pros&&h.prop?(l.enTarifario?`<span class="pill v">en tarifario</span>`:`<button class="btn sm" data-a="alTarifario" data-src="draft" data-i="${i}">Al tarifario</button>`):""}
          <button class="btn sm" data-a="estDelLinea" data-i="${i}">Quitar</button></td></tr>`).join("")}
      <tr><td colspan="5" style="text-align:right;color:var(--faint)">Subtotal</td>
        <td class="num mono">${money(subtotal)}</td><td></td></tr>
      <tr style="background:var(--surface-2)"><td colspan="5" style="font-weight:750">Total Amount</td>
        <td class="num mono" style="font-weight:750;font-size:15px">${money(total)}</td><td></td></tr>
      </tbody></table>`
      :`<div class="empty" style="border:1px dashed var(--line);border-radius:9px">Todavía sin líneas. Agrega la primera arriba.</div>`}

    <div class="fld" style="margin-top:12px"><label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-weight:500;text-transform:none;letter-spacing:0;font-size:12.5px">
      <input type="checkbox" id="eDepositoChk" data-a="estDepositoToggle" ${h.deposito?"checked":""} style="width:15px;height:15px"> Request Deposit</label>
      ${h.deposito?`<input id="eDepositoMonto" class="mono" style="margin-top:6px" placeholder="0.00" value="${esc(h.depositoMonto||"")}">`:""}</div>

    <details style="margin-top:12px"><summary style="cursor:pointer;font-weight:650;font-size:13px">Attached Documents (${(h.docs||[]).length})</summary>
      <div style="margin-top:8px">
        ${(h.docs||[]).length?`<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">${h.docs.map((d,i)=>
          `<span class="pill a">${esc(d)} <a href="#" data-a="estDocQuitar" data-i="${i}" style="margin-left:5px;color:inherit">✕</a></span>`).join("")}</div>`:""}
        <div style="display:flex;gap:6px"><input id="eDocNombre" placeholder="nombre-del-archivo.pdf" style="flex:1">
        <button type="button" class="btn sm" data-a="estDocAgregar">+ Add Document</button></div>
      </div></details>

    <details open style="margin-top:12px"><summary style="cursor:pointer;font-weight:650;font-size:13px">Terms, notes & signature</summary>
      <div style="margin-top:8px">
        <label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-weight:500;font-size:12.5px;margin-bottom:9px">
          <input type="checkbox" id="eFirma" ${h.firma?"checked":""} style="width:15px;height:15px"> Client signature is required</label>
        <div class="fld"><label>Terms & conditions <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— optional</span></label>
          <textarea id="eTerminos" rows="2">${esc(h.terminos||"")}</textarea></div>
        <div class="fld" style="margin-bottom:0"><label>Note to client</label>
          <textarea id="eNota" rows="4">${esc(h.nota||"")}</textarea></div>
      </div></details>
  </div>
  <div class="mf"><button class="btn" data-a="cm">Cancel</button>
    <button class="btn" data-a="estGuardarBorrador">Save draft</button>
    <button class="btn p" data-a="estGuardar">Send</button></div>`,true);
  const mbDespues = document.querySelector("#mroot .mb");
  if(mbDespues && scrollAntes) mbDespues.scrollTop = scrollAntes;
}
/* ── EDITOR DE UNA LÍNEA DEL ESTIMADO ── los mismos campos que una línea de
   factura (modalLineaFactura): Servicio, Descripción, Precio, Cantidad,
   Descuento $/%. Tres modos: tarifa General, Propia de la propiedad, o
   Concepto libre (lo que no está en ninguna tarifa). El precio se precarga
   de la tarifa pero siempre se puede cambiar: el tarifario nunca bloquea.
   S.estLin guarda el borrador del editor mientras se repinta; S.estEditIdx
   es el índice de S.draftEst que se está editando (null = línea nueva). */
const servCanon = n => { const x=CAT.servicios.find(s=>uNorm(s.nombre)===uNorm(n)); return x?x.nombre:String(n||"").trim(); };
function estLinSnap(){
  const L=S.estLin; if(!L || !document.getElementById("eLP")) return;
  const g=id=>{ const e=document.getElementById(id); return e?e.value:undefined; };
  const set=(k,id)=>{ const v=g(id); if(v!==undefined) L[k]=v; };
  set("unidad","eUni"); set("tarId","eLTar"); set("nombre","eLNom"); set("cat","eLCat"); set("descripcion","eLDes");
  set("precio","eLP"); set("cantidad","eLC"); set("desc","eLD"); set("descTipo","eLT"); set("tax","eLTax");
}
/* Sugerencias de precio para lo que hay en el editor ahora mismo */
function estLinSugHTML(L){
  if(!puedeVerIngreso()) return "";
  const h=S.estHdr; let cat, serv;
  if(L.modo==="libre"){ cat=L.cat; serv=servCanon(L.nombre); }
  else { const t=by(S.tarifas,L.tarId); cat=t&&t.cat; serv=t&&(t.serv||t.nombre); }
  const u = L.unidad && L.unidad!=="__new__" ? by(S.unidades,L.unidad) : null;
  return sugerenciasHTML("eLP", h.modo==="prospecto"?null:h.prop, cat, serv, u?u.rooms:"", true);
}
function modalLineaEst(){
  const h=S.estHdr, L=S.estLin, pros=h.modo==="prospecto";
  const us = pros ? [] : S.unidades.filter(u=>u.prop===h.prop);
  const generales = S.tarifas.filter(t=>!t.prop), propias = pros ? [] : S.tarifas.filter(t=>t.prop===h.prop);
  const modo = L.modo;
  const lista = modo==="propia" ? propias : generales;
  const opt = t => `<option value="${t.id}" ${t.id===L.tarId?"selected":""}>${esc(t.nombre||((t.serv||"")+" "+(t.variante||"")).trim())} — ${money(t.precio)}</option>`;
  const nombres = [...new Set(CAT.servicios.filter(s=>!s.baja).map(s=>s.nombre))];
  const editando = S.estEditIdx!=null;
  const mbAntes = document.querySelector("#mroot .mb"), scrollAntes = mbAntes ? mbAntes.scrollTop : 0;
  modal(`<div class="mh"><h3>${editando?"Editar línea":"Agregar línea"}</h3><p>Servicio, descripción, precio, cantidad y descuento — igual que una línea de factura.</p></div>
  <div class="mb">
    <div class="fld"><label>Cómo se arma</label>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button type="button" class="btn sm ${modo==="general"?"p":""}" data-a="estLinModo" data-m="general" ${generales.length?"":"disabled"}>General</button>
        <button type="button" class="btn sm ${modo==="propia"?"p":""}" data-a="estLinModo" data-m="propia" ${propias.length?"":"disabled"}>Propia</button>
        <button type="button" class="btn sm ${modo==="libre"?"p":""}" data-a="estLinModo" data-m="libre">Concepto libre</button></div>
      ${modo==="libre"?`<div class="hint">Para lo que no está en el tarifario. Al aprobarse igual se vuelve Work Order.</div>`:""}</div>

    <div class="fld"><label>Unidad <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— opcional</span></label>
      ${pros
        ? `<select id="eUni" disabled><option value="">— sin unidad específica —</option></select>`
        : `<select id="eUni" data-a="estLinUni">
            <option value="">— sin unidad específica —</option>
            ${us.map(u=>`<option value="${u.id}" ${u.id===L.unidad?"selected":""}>${esc(u.num)}</option>`).join("")}
            <option value="__new__" ${L.unidad==="__new__"?"selected":""}>+ Nueva unidad…</option>
          </select>
          <div id="eUniDetalle"></div><div id="eUniNueva"></div>`}</div>

    ${modo==="libre"?`
    <div class="fg c2">
      <div class="fld"><label>Nombre <span class="req">*</span></label>
        <input id="eLNom" list="eLNomList" data-a="estLinSug" value="${esc(L.nombre||"")}" placeholder="Drywall repair…">
        <datalist id="eLNomList">${nombres.map(n=>`<option value="${esc(n)}">`).join("")}</datalist></div>
      <div class="fld"><label>Tipo de servicio <span class="req">*</span></label>
        <select id="eLCat" data-a="estLinSug"><option value="">— elegí —</option>${activos("categorias").map(c=>`<option ${c===L.cat?"selected":""}>${esc(c)}</option>`).join("")}</select></div></div>`
    :`<div class="fld"><label>Servicio <span class="req">*</span></label>
        <select id="eLTar" data-a="estLinTar">${lista.length?lista.map(opt).join(""):`<option value="">— sin tarifas —</option>`}</select></div>`}

    <div class="fld"><label>Descripción <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— opcional</span></label><input id="eLDes" value="${esc(L.descripcion||"")}"></div>
    <div class="fg c2">
      <div class="fld"><label>Precio <span class="req">*</span></label><input id="eLP" type="number" step="0.01" min="0" class="mono" placeholder="0.00" value="${esc(L.precio==null?"":L.precio)}">
        <div id="eLSug">${estLinSugHTML(L)}</div></div>
      <div class="fld"><label>Cantidad <span class="req">*</span></label><input id="eLC" type="number" step="0.01" min="0" class="mono" value="${esc(L.cantidad==null?1:L.cantidad)}"></div></div>
    <div class="fg c3">
      <div class="fld" style="margin-bottom:0"><label>Descuento</label><input id="eLD" type="number" step="0.01" min="0" class="mono" placeholder="0" value="${esc(+L.desc||"")}"></div>
      <div class="fld" style="margin-bottom:0"><label>Tipo</label><select id="eLT"><option value="$" ${L.descTipo==="%"?"":"selected"}>$ monto</option><option value="%" ${L.descTipo==="%"?"selected":""}>% del subtotal</option></select></div>
      <div class="fld" style="margin-bottom:0"><label>Tax</label><select id="eLTax"><option value="">— no tax —</option>${S.impuestos.map(x=>`<option value="${x.id}" ${L.tax===x.id?"selected":""}>${esc(x.nombre)} (${x.tasa}%)</option>`).join("")}</select></div></div>
  </div>
  <div class="mf"><button class="btn" data-a="estLinVolver">Cancelar</button>
    <button class="btn p" data-a="estLineaGuardar">${editando?"Guardar cambios":"Agregar al estimado"}</button></div>`,true);
  ACC.estUniDetalle();
  const mbDespues = document.querySelector("#mroot .mb");
  if(mbDespues && scrollAntes) mbDespues.scrollTop = scrollAntes;
}

/* ── AL TARIFARIO ── pasar el precio de una línea de estimado (o de una WO
   con precio propio) al Price List de la propiedad. Siempre opcional: el
   precio nace en el estimado y el tarifario nunca bloquea nada. S.alTar =
   {src:"draft"|"est"|"wo", id, i}: de dónde viene el precio. */
function alTarObj(){
  const A=S.alTar; if(!A) return null;
  if(A.src==="draft") return {o:S.draftEst[+A.i], prop:S.estHdr&&S.estHdr.prop};
  if(A.src==="est"){ const e=by(S.estimados,A.id), l=e&&e.lineas[+A.i]; return l ? {o:{...l, precio:precioLinea(e,l)}, real:l, prop:e.prop} : null; }
  const w=W(+A.id); return w ? {o:w, prop:w.prop} : null;
}
function alTarExiste(prop, o, variante, pisos){
  return S.tarifas.find(t=>t.prop===prop && t.cat===o.cat && t.serv===o.serv && (t.variante||"")===variante && (t.pisos||null)===(pisos||null));
}
const alTarYaHTML = ya => ya ? `<div class="note w" style="margin-top:12px">Ya hay un precio para esta combinación (${money(ya.precio)}): se actualiza.</div>` : "";
function modalAlTarifario(){
  const x=alTarObj(); if(!x||!x.o){ cm(); return; }
  const o=x.o, u=o.unidad?U(o.unidad):null, rooms=u&&u.rooms?u.rooms:"";
  const salas=activos("rooms").slice(); if(rooms && !salas.includes(rooms)) salas.push(rooms);
  const ya=alTarExiste(x.prop,o,rooms,null);
  modal(`<div class="mh"><h3>Al tarifario</h3><p>${esc(o.serv)} · ${esc(P(x.prop).nombre)}</p></div>
  <div class="mb">
    <div class="note" style="margin:0 0 12px">Guarda este precio en el Price List de <b>${esc(P(x.prop).nombre)}</b>. Es opcional: no cambia el ${S.alTar.src==="wo"?"trabajo":"estimado"} ni frena nada, y el precio se puede seguir cambiando después.</div>
    <div class="fg c2">
      <div class="fld"><label>Precio <span class="req">*</span></label><input id="atP" type="number" step="0.01" min="0" class="mono" value="${esc(o.precio==null?"":o.precio)}">
        <div id="atSug">${puedeVerIngreso()?sugerenciasHTML("atP",x.prop,o.cat,o.serv,rooms,true):""}</div></div>
      <div class="fld"><label>Tamaño de unidad</label><select id="atR" data-a="alTarSug"><option value="">— cualquiera —</option>${salas.map(r=>`<option ${r===rooms?"selected":""}>${esc(r)}</option>`).join("")}</select></div></div>
    <div class="fld" style="margin-bottom:0"><label>Piso <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— solo si el precio cambia según el piso</span></label>
      <select id="atPi" data-a="alTarSug"><option value="">— cualquiera —</option>${activos("pisos").map(p=>`<option value="${p}">Floor ${p}</option>`).join("")}</select></div>
    <div id="atYa">${alTarYaHTML(ya)}</div>
  </div>
  <div class="mf"><button class="btn" data-a="alTarVolver">Cancelar</button>
    <button class="btn p" data-a="alTarGuardar">Guardar en el tarifario</button></div>`);
}

/* El prospecto aprobado ya es cliente: la propiedad recién creada pasa a ser la
   del estimado, su contacto se registra como contacto de la propiedad y se
   suelta el bloque «prospecto». */
function estConvertirAplicar(eid, pid){
  const e=by(S.estimados,eid), p=P(pid); if(!e||!e.prospecto) return;
  const pr=e.prospecto;
  const c={id:"C"+nid("c"), prop:pid, tipo:"Manager", nombre:pr.nombre, mail:pr.correo||"", tel:""};
  S.contactos.push(c);
  e.prop=pid; e.contactos=[c.id]; delete e.prospecto;
  if(p.estado==="Prospect") p.estado="Active";
  cm(); flash("est:"+e.id);
  toast("✓ Prospecto convertido en cliente",`<b>${esc(p.nombre)}</b> ya está registrada y <b>${esc(c.nombre)}</b> quedó como su contacto. Ahora corren el COI y el Expediente.`,"v");
  S.mod="estimados"; S.sub=null; S.tab=null; render();
}

/* "Save draft" y "Send" del formulario hacen exactamente lo mismo: guardar.
   Mandar el correo de verdad es un paso aparte (ver estEnviar/modalEnviarEst) —
   asi que ambos botones caen en esta misma funcion. */
function estCrearEst(){
  estSnap();
  const h=S.estHdr, pros=h.modo==="prospecto";
  /* audOmitir: un guardado rechazado no es un alta — no va a la Bitácora. */
  if(pros){
    const pr=h.prospecto||{};
    if(!pr.nombre||!pr.correo){ S.audOmitir=true; marcaFalta(["ePN","ePC"]); toast("Faltan datos","Para un prospecto, nombre y correo son obligatorios — sin correo no se le puede enviar.","r"); return; }
  } else if(!h.prop){ S.audOmitir=true; toast("Falta la propiedad","Elegí una propiedad, o pasá a «Prospecto nuevo».","r"); return; }
  const datos = {num:h.num||estSiguienteNum(),label:h.label||"Estimate",prop:pros?null:h.prop,
    ...(pros?{prospecto:{...h.prospecto}}:{}), ...(h.origen?{origen:h.origen}:{}),
    contactos:pros?[]:(h.contactos||[]).slice(),fecha:h.issueDate,vence:h.expDate,po:h.po||"",
    docs:(h.docs||[]).slice(),deposito:!!h.deposito,depositoMonto:h.depositoMonto||"",
    firma:!!h.firma,terminos:h.terminos||"",nota:h.nota||"",lineas:S.draftEst.slice()};
  /* "Modificar propuesta y reenviar" (flujograma de Propuestas y Estimados:
     cliente rechazó → modificar propuesta → reenviar) reusa este mismo
     formulario, pero actualiza el estimado existente en vez de crear otro. */
  if(h.editId){
    const e = by(S.estimados, h.editId);
    Object.assign(e, datos, {estado:"Borrador", aprob:null, correoTexto:"", envAsunto:""});
    if(!pros) delete e.prospecto;
    flash("est:"+e.id);
    S.draftEst=[]; cm();
    toast("✓ Propuesta modificada",`<b>${esc(e.num)}</b> queda lista — dale <b>Enviar</b> desde la lista para mandarla de nuevo.`,"v"); render();
    return;
  }
  const e={id:"E"+Date.now(),...datos,estado:"Borrador",aprob:null,correoTexto:"",token:"ap-"+Math.random().toString(36).slice(2,10)};
  S.estimados.unshift(e); S.draftEst=[]; flash("est:"+e.id);
  /* Cierra el ciclo con la Solicitud Comercial que le dio origen (paso 1 del
     flujograma) — sin esto, el sistema seguia arrancando desde la mitad. */
  if(h.solicitudId){
    const sc = by(S.solicitudesComerciales, h.solicitudId);
    if(sc){ sc.estado="Estimado creado"; sc.estimadoId=e.id; }
  }
  cm();
  toast("✓ Estimado guardado",`<b>${esc(e.num)}</b> queda sin enviar hasta que le des <b>Enviar</b> desde la lista.`,"v"); render();
}
/* Cualquier accion que vuelva a pintar el modal (marcar un contacto, cambiar
   de modo General/Propia, agregar una linea o un documento) reconstruye el
   formulario desde S.estHdr — si no se captura antes lo que ya se escribio
   en los campos sueltos (Label, fechas, PO, Terms, Note...), se pierde. */
function estSnap(){
  const h = S.estHdr; if(!h) return;
  const campos = {eLabel:"label", eNum:"num", eIssue:"issueDate", eExp:"expDate", ePO:"po", eTerminos:"terminos", eNota:"nota", eDepositoMonto:"depositoMonto"};
  Object.keys(campos).forEach(id=>{ const el=document.getElementById(id); if(el) h[campos[id]]=el.value; });
  const gp=id=>document.getElementById(id);
  if(h.modo==="prospecto" && gp("ePN"))
    h.prospecto={nombre:gp("ePN").value.trim(), correo:gp("ePC").value.trim(), propiedad:gp("ePP").value.trim()};
  const chkF=document.getElementById("eFirma"); if(chkF) h.firma=chkF.checked;
  const chkD=document.getElementById("eDepositoChk"); if(chkD) h.deposito=chkD.checked;
}

/* ── ALERTAS ── */
