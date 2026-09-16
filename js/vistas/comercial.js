"use strict";
const EXPEDIENTE = [
  {k:"nombre",  n:"Nombre de la propiedad"},
  {k:"dir",     n:"Dirección"},
  {k:"zona",    n:"Zona (Area)"},
  {k:"door",    n:"Código de puerta"},
  {k:"pref",    n:"Default Contact Method"},
  {k:"precios", n:"Price List"},
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
      : c.k==="precios" ? S.tarifas.some(t=>t.prop===pid)
      : c.k==="estimado" ? S.estimados.some(e=>e.prop===pid && e.estado==="Aprobado")
      : !!String(p[c.k]||"").trim()
  }));
}
/* "Servicio directo" (la visita que salta la llamada de negociar) exigía
   igual un Estimado aprobado antes de dejar pasar la propiedad — pero esa
   es justo la llamada que "Servicio directo" promete que no hace falta.
   sinEstimado=true se usa SOLO en ese camino: el resto del Expediente
   (COI, contacto, Price List...) sigue exigiéndose igual — y el camino
   normal ("Requiere estimado", Transferir a programación) no cambia. */
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
  const p = P(e.prop);
  return `Buenos días,

Adjunto encontrarás el estimado para ${p.nombre}.

Si el estimado es aprobado, por favor háznoslo saber y estaremos encantados de programar el trabajo en el momento que te sea conveniente.

¡Gracias, y esperamos tu aprobación!

Claudia S. Cordova
CEO | Cordova Property Services LLC
Pensacola, FL | Sirviendo al Noroeste de Florida, Sur de Alabama y Mississippi
Tel: (469) 219-6869
Correo: scheduling@cordovaps.com | www.cordovapropertyservices.com`;
}
function modalEnviarEst(eid){
  const e=by(S.estimados,eid), p=P(e.prop), cons=contactosEst(e);
  modal(`<div class="mh"><h3>Enviar ${esc(e.label||"Estimate")} ${esc(e.num)}</h3><p>Revisa o edita el correo antes de mandarlo — igual que lo hace Claudia.</p></div>
  <div class="mb">
    <div class="fld"><label>Para</label>
      <div class="hint">${cons.map(c=>esc(c.nombre)+" &lt;"+(esc(c.mail)||"sin correo")+"&gt;").join(", ")||"— sin contactos —"}</div></div>
    <div class="fld"><label>Asunto</label><input id="envAsunto" value="${esc(e.envAsunto||(esc(e.label||"Estimate")+" "+e.num+" — "+p.nombre))}"></div>
    <div class="fld" style="margin-bottom:0"><label>Cuerpo del correo</label>
      <textarea id="envCuerpo" rows="12">${esc(e.correoTexto||emailBodyDefaultEst(e))}</textarea></div>
    <div class="hint" style="margin-top:8px">📎 Adjunto: ${esc(e.num)} — Invoice.pdf</div>
    ${!cons.length?`<div class="note r" style="margin-top:10px">No hay contactos con correo para esta propiedad — agrega uno en su pestaña Contactos.</div>`:""}
  </div>
  <div class="mf"><button class="btn" data-a="cm">Cancelar</button>
    <button class="btn p" data-a="estEnviarOK" data-id="${eid}" ${cons.length?"":"disabled"}>Enviar</button></div>`,true);
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
const totalLinea = (e,l) => precioLinea(e,l)*(l.cantidad||1)*(1+tasaLinea(l)/100);
const subtotalEst = e => e.lineas.reduce((a,l)=>a+precioLinea(e,l)*(l.cantidad||1),0);
const totalEst = e => e.lineas.reduce((a,l)=>a+totalLinea(e,l),0);
/* Total de lo que el cliente realmente aceptó (puede haber marcado solo algunas líneas) */
const lineasAprobDe = e => e.lineasAprob || e.lineas.map((_,i)=>i);
const totalEstAprob = e => lineasAprobDe(e)
  .reduce((a,i)=> a + (e.lineas[i] ? totalLinea(e, e.lineas[i]) : 0), 0);
/* Numero, Bill To y vigencia — igual que el Estimate real de vCita */
const estSiguienteNum = () => "EST-2026-"+String(20+S.estimados.length).padStart(3,"0");
const sumarDias = (iso,n) => { const d=new Date(iso+"T00:00:00"); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };
const billToDe = pid => { const p=P(pid); return p.cliente ? esc(CLI(p.cliente).nombre)+" - "+esc(p.nombre) : esc(p.nombre); };
const NOTA_ESTIMADO_DEFAULT = "Please note that cleaning services requiring extra materials or additional time will incur an extra charge per item or supply used.\nWe also offer trash-out services, carpet cleaning, and more.\nFor painting, we can handle sheen changes (matte, satin, semi-gloss) and color changes — not just same-color refreshes.\nAdditionally, if you need repairs, we do it all: from the smallest fixes to more complex projects!\nIf you need a customized estimate, don't hesitate to contact us — we'll get it to you within 24 hours!";
/* Solo cuenta como "inspeccion recibida" un reporte de campo tipo "previo"
   de esa propiedad, creado el mismo dia de la solicitud o despues. */
const solInspeccionLista = s => !!s.prop && S.reportes.some(r=>r.tipo==="previo" && r.prop===s.prop && r.fecha>=s.fecha);
/* No hay "+ Nuevo estimado" suelto: todo estimado nace de una Solicitud
   Comercial ya registrada (solComEstimado). Esta funcion arma el borrador
   en blanco que usa ese unico punto de entrada. */
function estInicializarBorrador(prop, solicitudId){
  S.draftEst=[];
  const cs=contactosDe(prop), hoy="2026-08-11";
  // Si la Solicitud ya dice con quién habló Lydia, es ese contacto el que
  // sale marcado — Claudia no tiene que volver a elegir con quién fue.
  const sol = solicitudId ? by(S.solicitudesComerciales,solicitudId) : null;
  const preferido = sol && cs.some(c=>c.id===sol.contactoId) ? sol.contactoId : (cs[0]&&cs[0].id);
  S.estHdr={prop,contactos:preferido?[preferido]:[], solicitudId:solicitudId||null,
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
    <thead><tr><th>Fecha</th><th>Propiedad</th><th>Contacto</th><th>Alcance</th><th>Inspección</th><th>Estado</th><th></th></tr></thead>
    <tbody>${S.solicitudesComerciales.map(s=>`<tr class="${fl("solcom:"+s.id)}">
      <td class="mono">${esc(s.fecha)}</td>
      <td>${s.prop?esc(P(s.prop).nombre):`${esc(s.propNombre)} <span class="pill w">nueva</span>`}</td>
      <td>${esc(s.contacto)}<div style="font-size:10.5px;color:var(--faint)">${esc(s.correo)}</div></td>
      <td>${esc(s.alcance.length>60?s.alcance.slice(0,60)+"…":s.alcance)}</td>
      <td>${s.inspeccion?`<span class="pill ${solInspeccionLista(s)?"v":"w"}">${solInspeccionLista(s)?"Recibida":"Pendiente"}</span>`:'<span style="color:var(--faint)">No requiere</span>'}</td>
      <td><span class="pill ${s.estado==="Estimado creado"?"v":s.estado==="Descartada"?"r":"a"}">${esc(s.estado)}</span></td>
      <td style="text-align:right;white-space:nowrap">
        ${s.estado==="Esperando inspección"&&!solInspeccionLista(s)?`<button class="btn sm" data-a="solComInspeccion" data-id="${s.id}">Asignar inspección a Gustavo</button>`:""}
        ${s.estado!=="Estimado creado"&&s.estado!=="Descartada"?`<button class="btn sm p" data-a="solComEstimado" data-id="${s.id}">Crear estimado</button>
          <button class="btn sm" data-a="solComNueva" data-id="${s.id}">Corregir</button>
          <button class="btn sm" data-a="solComDescartar" data-id="${s.id}">Descartar</button>`:""}
        ${s.estado==="Estimado creado"?`<button class="btn sm" data-a="estInvoice" data-id="${s.estimadoId}">Ver estimado</button>`:""}
      </td></tr>`).join("")||`<tr><td colspan="7" class="empty">Sin solicitudes todavía</td></tr>`}
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
function modalSolCom(id){
  const s = id ? by(S.solicitudesComerciales,id) : null;
  modal(`<div class="mh"><h3>${s?"Corregir solicitud":"Nueva Solicitud Comercial"}</h3><p>Lo mismo que Lydia anota cuando alguien pide un precio.</p></div>
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
      <div class="fld"><label>Fecha objetivo <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— opcional</span></label><input type="date" id="scFecha" value="${s?esc(s.fechaObjetivo||""):""}"></div></div>
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
        quien:S.usuario, estado:"Lista para estimado", estimadoId:null};
      S.solicitudesComerciales.unshift(sc); v.solicitudId = sc.id;
    }
    toast("✓ Pasa a Solicitud Comercial",`Se creó la solicitud de <b>${esc(v.contacto)}</b> — ya se puede armar el estimado.`,"v");
  } else if(v.resultado==="Servicio directo"){
    if(!v.prop){ toast("Falta registrar la propiedad","Crea primero la Propiedad antes de transferir a Thalia sin llamada.","w"); }
    /* "Servicio directo" no exige Estimado aprobado: esa es justo la
       llamada de negociar que este camino promete saltarse — pedirlo
       igual lo volvía imposible de cerrar la primera vez que se usaba una
       propiedad nueva. El resto del Expediente (COI, contacto, Price
       List...) sigue exigiéndose igual. */
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
    inspeccion:get("scInspeccion"), fecha:get("scFecha"), notas:get("scNotas")};
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
  set("scAlcance",dr.alcance); set("scInspeccion",dr.inspeccion); set("scFecha",dr.fecha); set("scNotas",dr.notas);
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
    <p>Eliges propiedad, unidad y servicio; el sistema pone el precio desde el tarifario. Nadie teclea montos.</p></div>
    <div class="act"><button class="btn" data-a="ir" data-m="solicitudes">Ir a Solicitudes</button></div></div>
  <div class="note" style="margin-bottom:12px">No hay un «+ Nuevo estimado» suelto: todo estimado nace de una <b>Solicitud Comercial</b> ya registrada — así el embudo completo queda siempre completo, sin atajos que lo salteen.</div>
  <div class="card"><table>
    <thead><tr><th>Número</th><th>Propiedad</th><th>Contacto</th><th>Fecha</th><th class="num">Líneas</th><th class="num">Monto</th><th>Estado</th><th>Aprobación</th><th></th></tr></thead>
    <tbody>${S.estimados.map(e=>`<tr class="${fl("est:"+e.id)}">
      <td class="mono" style="font-weight:700">${esc(e.num)}</td>
      <td>${esc(P(e.prop).nombre)}</td><td>${esc(contactosEst(e).map(c=>c.nombre).join(", "))}</td><td class="mono">${e.fecha.slice(5)}</td><td class="num mono">${e.lineas.length}</td>
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
        ${e.estado==="Aprobado"&&!coiVigente(e.prop)?`<button class="btn sm" style="border-color:var(--rojo);color:var(--rojo)" data-a="estCOI" data-id="${e.id}">Solicitar COI</button>`:""}
        ${e.estado==="Aprobado"&&!expedienteOK(e.prop)?`<button class="btn sm" data-a="estIrExpediente" data-id="${e.id}">Completar Expediente</button>`:""}
        ${e.estado==="Aprobado"?`<button class="btn sm ${expedienteOK(e.prop)?"p":""}" data-a="estAgendar" data-id="${e.id}" ${expedienteOK(e.prop)?"":"disabled"}>Transferir a programación</button>`:""}
        ${e.estado==="Transferido"?`<span class="pill v" style="margin-left:6px">Con Thalia</span>`:""}
      </td></tr>`).join("")||`<tr><td colspan="9" class="empty">Sin estimados todavía</td></tr>`}
    </tbody></table></div>
  <div class="note">El cliente solo recibe el correo con el Invoice adjunto — no hace clic en nada. <b>Aprobar</b> / <b>Rechazar</b> se registra a mano, siempre pidiendo el canal por el que avisó.</div>
  <div class="tr" style="margin-top:8px">Al aprobarse, un <b>prospecto</b> pasa a ser <b>cliente</b>: ahí es cuando deja de ser alguien que preguntó y empieza a generar trabajo.</div>`;

function modalEst(){
  const h = S.estHdr;
  const us = S.unidades.filter(u=>u.prop===h.prop);
  const lineas = S.draftEst;
  const subtotal = lineas.reduce((a,l)=>a+(l.precio||0)*(l.cantidad||1),0);
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

    <div class="fld"><label>Bill To <span class="req">*</span> <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— la propiedad y su Management</span></label>
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
      })()}</div>

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

    <div style="border:1px solid var(--line);border-radius:9px;padding:11px;margin-bottom:12px;background:var(--surface-2)">
      <div style="font-size:11px;font-weight:750;text-transform:uppercase;letter-spacing:.05em;color:var(--faint);margin-bottom:8px">Agregar Item</div>
      ${(()=>{ const generales = S.tarifas.filter(t=>!t.prop), propias = S.tarifas.filter(t=>t.prop===h.prop);
        if(!generales.length && !propias.length) return `<div class="note r" style="margin:0"><b>No hay tarifas disponibles.</b> Crea una general en <b>Tarifario</b> o una propia en el Price List de esta propiedad.</div>`;
        const modo = (h.tarModo==="propia" && propias.length) ? "propia" : (generales.length ? "general" : "propia");
        const opt = t => `<option value="${t.id}">${esc(t.nombre||((t.serv||"")+" "+(t.variante||"")).trim())} — ${money(t.precio)}</option>`;
        /* Reunión 2026-09-09: "si no quiere agregarlo dentro de unidad, no
           hay problema" — un estimado suele ser por floor plan de toda la
           propiedad, no por unidad puntual. La Unidad queda opcional, y
           "+ Nueva unidad…" registra una al vuelo sin mandar a otra pantalla. */
        return `<div class="fg c2">
        <div class="fld" style="margin-bottom:0"><label>Unidad <span style="color:var(--faint);font-weight:500;text-transform:none;letter-spacing:0">— opcional</span></label>
          <select id="eUni" data-a="estUniDetalle">
            <option value="" ${us.length?"":"selected"}>— sin unidad específica —</option>
            ${us.map((u,i)=>`<option value="${u.id}" ${i===0?"selected":""}>${esc(u.num)}</option>`).join("")}
            <option value="__new__">+ Nueva unidad…</option>
          </select>
          <div id="eUniDetalle"></div><div id="eUniNueva"></div></div>
        <div class="fld" style="margin-bottom:0"><label>Item (Add custom item)</label>
          <div style="display:flex;gap:6px;margin-bottom:6px">
            <button type="button" class="btn sm ${modo==="general"?"p":""}" data-a="estTarModo" data-m="general" ${generales.length?"":"disabled"}>General</button>
            <button type="button" class="btn sm ${modo==="propia"?"p":""}" data-a="estTarModo" data-m="propia" ${propias.length?"":"disabled"}>Propia</button>
          </div>
          <select id="eTarGen" ${modo!=="general"?"disabled":""}>${generales.length?generales.map(opt).join(""):`<option>— sin tarifas generales —</option>`}</select>
          <select id="eTarProp" style="margin-top:6px" ${modo!=="propia"?"disabled":""}>${propias.length?propias.map(opt).join(""):`<option>— sin tarifas propias —</option>`}</select></div></div>
      <button class="btn p sm" style="margin-top:9px" data-a="estAddLinea">+ Agregar al estimado</button>`;
      })()}
    </div>

    ${lineas.length?`<table style="border:1px solid var(--line);border-radius:9px;overflow:hidden">
      <thead><tr><th>Item</th><th class="num">Price</th><th class="num">Tax</th><th class="num">Total</th><th></th></tr></thead>
      <tbody>${lineas.map((l,i)=>`<tr>
        <td>${esc(l.serv)}<div style="font-size:10.5px;color:var(--faint)">${esc(U(l.unidad).num)} · ${esc(l.cat)}</div></td>
        <td class="num mono">${money(l.precio||0)}</td>
        <td class="num mono">${tasaLinea(l)?tasaLinea(l)+"%":"—"}</td>
        <td class="num mono" style="font-weight:700">${money(totalLinea({prop:h.prop},l))}</td>
        <td style="text-align:right"><button class="btn sm" data-a="estDelLinea" data-i="${i}">Quitar</button></td></tr>`).join("")}
      <tr><td colspan="3" style="text-align:right;color:var(--faint)">Subtotal</td>
        <td class="num mono">${money(subtotal)}</td><td></td></tr>
      <tr style="background:var(--surface-2)"><td colspan="3" style="font-weight:750">Total Amount</td>
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
  ACC.estUniDetalle();
  const mbDespues = document.querySelector("#mroot .mb");
  if(mbDespues && scrollAntes) mbDespues.scrollTop = scrollAntes;
}
/* "Save draft" y "Send" del formulario hacen exactamente lo mismo: guardar.
   Mandar el correo de verdad es un paso aparte (ver estEnviar/modalEnviarEst) —
   asi que ambos botones caen en esta misma funcion. */
function estCrearEst(){
  estSnap();
  const h=S.estHdr;
  const datos = {num:h.num||estSiguienteNum(),label:h.label||"Estimate",prop:h.prop,
    contactos:(h.contactos||[]).slice(),fecha:h.issueDate,vence:h.expDate,po:h.po||"",
    docs:(h.docs||[]).slice(),deposito:!!h.deposito,depositoMonto:h.depositoMonto||"",
    firma:!!h.firma,terminos:h.terminos||"",nota:h.nota||"",lineas:S.draftEst.slice()};
  /* "Modificar propuesta y reenviar" (flujograma de Propuestas y Estimados:
     cliente rechazó → modificar propuesta → reenviar) reusa este mismo
     formulario, pero actualiza el estimado existente en vez de crear otro. */
  if(h.editId){
    const e = by(S.estimados, h.editId);
    Object.assign(e, datos, {estado:"Borrador", aprob:null, correoTexto:"", envAsunto:""});
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
  const chkF=document.getElementById("eFirma"); if(chkF) h.firma=chkF.checked;
  const chkD=document.getElementById("eDepositoChk"); if(chkD) h.deposito=chkD.checked;
}

/* ── ALERTAS ── */
