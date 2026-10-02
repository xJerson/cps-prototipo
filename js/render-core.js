"use strict";
/* ══════════ RENDER ══════════ */
const VIEWS = {};
const ACC = {};
function render(){
  const R = ROLES[S.usuario];
  if(!puede(S.mod)) S.mod = "tablero";
  $("#wkChip").textContent = "Semana "+S.semana+" · 2026";
  $("#av").textContent = R.i; $("#rtag").textContent = R.r;
  $("#usel").innerHTML = Object.keys(ROLES).map(n=>`<option ${n===S.usuario?"selected":""}>${n}</option>`).join("");
  const nA = alertas().length;
  $("#side").innerHTML = MODS.map(m=>{
    if(m.g) return MODS.filter(x=>x.id&&puede(x.id)).length? `<div class="slbl">${m.g}</div>`:"";
    if(!puede(m.id)) return "";
    const c = m.id==="alertas" ? nA : m.id==="excepciones" ? excPend().length : 0;
    return `<button class="nav ${S.mod===m.id?"on":""}" data-a="ir" data-m="${m.id}">
      <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${m.ic}</svg>
      <span class="lb">${m.n}</span>${c?`<span class="n">${c}</span>`:""}</button>`;
  }).join("");
  $("#main").innerHTML = (VIEWS[S.mod]||(()=>"<div class='empty'>En construcción</div>"))();
  // Traer al centro lo que se acaba de tocar, y apagar la marca sola
  if(S.flash){
    const marcado = $("#main").querySelector(".flash");
    if(marcado) marcado.scrollIntoView({block:"center", behavior:"smooth"});
    clearTimeout(S.flashT);
    S.flashT = setTimeout(()=>{ S.flash=null; }, 4000);
  }
  renderAvisos();
  renderFon();
  renderCoach();
  renderAyudaVista();
  document.body.classList.toggle("po",S.phone);
  $("#fclk").textContent = hora();
}

/* ══════════ AYUDA GUIADA ══════════
   No le dice al usuario "qué hacer" en abstracto: mira la pantalla en la
   que YA está (la pestaña o el botón que él tocó) y le marca en rojo lo
   que le falta completar ahí para poder seguir. Si la pantalla no tiene
   nada pendiente, no molesta. */
function ayudaContexto(){
  const hayModal = $("#mroot").innerHTML.trim() !== "";

  /* A · Modal abierto → señalar el campo que hay que llenar */
  if(hayModal){
    // El que la propia app marcó (viniste a llenar justo ese, desde el Expediente)
    const m = $("#mroot").querySelector(".fld.bad input,.fld.bad select,.fld.bad textarea,.bad>input,.bad>select,.bad>textarea");
    if(m && !String(m.value||"").trim())
      return {el:m, txt:"Llená este campo — es el que te falta para completar el Expediente."};
    // Si no, el primer campo obligatorio vacío del formulario
    for(const f of $("#mroot").querySelectorAll(".fld")){
      if(!f.querySelector(".req")) continue;
      const inp = f.querySelector("input,select,textarea");
      if(inp && !String(inp.value||"").trim())
        return {el:inp, txt:"Llená este campo — está en rojo porque es obligatorio para guardar."};
    }
    return null;
  }

  /* A2 · Adentro del celular de Gustavo — guía paso a paso de su jornada.
     No mira S.mod (la pantalla web de atrás): mientras el celular está
     abierto, la ayuda sigue lo que él está haciendo ahí adentro. */
  if(S.phone && S.phRol==="supervisor"){
    if(!diarioHoy())
      return {sel:'[data-a="fView"][data-v="dia"]',
        txt:"Todavía no abriste tu reporte de hoy. Andá a «Mi día» y tocá «Abrir mi reporte de hoy» — se va llenando solo con todo lo que hagas de acá en más."};
    const ag = agendaHoy();
    const sinLlegar = ag.find(a=>!["Visitada","No completada"].includes(a.estado));
    if(sinLlegar){
      if(S.phView!=="ruta")
        return {sel:'[data-a="fView"][data-v="ruta"]',
          txt:`Te falta llegar a ${esc(P(sinLlegar.prop).nombre)}. Andá a «Mi ruta» y marcá cuando llegues.`};
      return {sel:`[data-a="gLlegue"][data-id="${sinLlegar.id}"]`,
        txt:`Tocá «Llegué» cuando estés en ${esc(P(sinLlegar.prop).nombre)}.`};
    }
    if(S.gRep)
      return {sel:'[data-a="gRepOK"]',
        txt:"Cargá las fotos que hagan falta y tocá el botón de enviar — le llega a Claudia al instante, con la propiedad, la hora y las fotos ya ordenadas."};
    const sinReportar = ag.find(a=>a.estado==="Visitada"
      && !S.reportes.some(r=>r.prop===a.prop && r.fecha===HOY_SUP));
    if(sinReportar){
      if(S.phView!=="reportar")
        return {sel:'[data-a="fView"][data-v="reportar"]',
          txt:`Ya llegaste a ${esc(P(sinReportar.prop).nombre)}. Andá a «Reportar» y contá qué encontraste.`};
      return {sel:`[data-a="gRepPro"][data-prop="${sinReportar.prop}"]`,
        txt:"Tocá esta propiedad para empezar el reporte."};
    }
    if(diarioHoy().estado!=="Completado")
      return {sel:'[data-a="fView"][data-v="dia"]',
        txt:"Ya recorriste tu ruta y reportaste todo. Andá a «Mi día» y cerrá tu reporte para terminar la jornada."};
    return null;
  }

  /* B · Adentro de una propiedad */
  if(S.mod==="propiedades" && S.sub){
    const pid = S.sub, tab = S.tab||"datos";
    if(!expedienteOK(pid)){
      if(tab!=="expediente")
        return {sel:'[data-a="tab"][data-t="expediente"]',
          txt:"A esta propiedad le falta completar el Expediente. Abrí esta pestaña para ver qué falta."};
      const falta = expedienteDe(pid).find(c=>!c.ok);
      let sel, extra="Tocá el botón de esa fila para completarlo.";
      if(falta.k==="contacto") sel=`[data-a="conNuevo"][data-prop="${pid}"]`;
      else if(falta.k==="coi") sel=`[data-a="coiDirecto"][data-id="${pid}"]`;
      else if(falta.k==="precios"){ sel=`[data-a="tab"][data-t="precios"]`; extra="Abrí la pestaña Price List (marcada arriba) y agregá al menos un precio."; }
      else if(falta.k==="estimado"){
        const solL = S.solicitudesComerciales.find(sc=>sc.prop===pid && sc.estado!=="Estimado creado" && sc.estado!=="Descartada");
        if(solL){ sel=`[data-a="solComEstimado"][data-id="${solL.id}"]`; extra="Tocá «Crear estimado» — ya hay una Solicitud Comercial esperando."; }
        else { sel=`[data-a="ir"][data-m="solicitudes"]`; extra="Primero registrá una Solicitud Comercial de esta propiedad."; }
      }
      else sel=`[data-a="propNueva"][data-id="${pid}"][data-f="${falta.k}"]`;
      return {sel, txt:`Falta «${falta.n}». ${extra}`};
    }
    if(tab==="expediente")
      return {sel:'[data-a="transferir"]',
        txt:"El Expediente está completo. Ya podés transferir la propiedad a programación."};
    return null;
  }

  /* C · Lista de propiedades → señalar una con el Expediente incompleto */
  if(S.mod==="propiedades" && !S.sub){
    const p = S.propiedades.find(x=>x.activa && !expedienteOK(x.id));
    if(p) return {sel:`tr[data-a="propVer"][data-id="${p.id}"]`,
      txt:`«${esc(p.nombre)}» tiene el Expediente incompleto. Entrá para terminarlo.`};
    return null;
  }

  /* D · Solicitudes → la que está lista y sin estimado */
  if(S.mod==="solicitudes"){
    const s = S.solicitudesComerciales.find(x=>x.estado==="Lista para estimado" && !x.estimadoId);
    if(s) return {sel:`[data-a="solComEstimado"][data-id="${s.id}"]`,
      txt:`«${esc(P(s.prop).nombre)}» está lista. Tocá «Crear estimado».`};
    return null;
  }

  /* E · Estimados */
  if(S.mod==="estimados"){
    const eB = S.estimados.find(e=>e.estado==="Borrador");
    if(eB) return {sel:`[data-a="estEnviar"][data-id="${eB.id}"]`, txt:`El estimado ${esc(eB.num)} está en borrador. Tocá «Enviar».`};
    const eA = S.estimados.find(e=>e.estado==="Aprobado" && expedienteOK(e.prop));
    if(eA) return {sel:`[data-a="estAgendar"][data-id="${eA.id}"]`, txt:`El estimado ${esc(eA.num)} está aprobado y su Expediente completo. Tocá «Transferir a programación».`};
    const eX = S.estimados.find(e=>e.estado==="Aprobado" && !expedienteOK(e.prop));
    if(eX) return {sel:`[data-a="estIrExpediente"][data-id="${eX.id}"]`, txt:`Al estimado ${esc(eX.num)} le falta completar el Expediente de la propiedad.`};
    const eE = S.estimados.find(e=>e.estado==="Enviado");
    if(eE) return {sel:`[data-a="estClienteOK"][data-id="${eE.id}"]`, txt:`El estimado ${esc(eE.num)} está enviado. Cuando el cliente responda, marcá «Aprobar» o «Rechazar».`};
    return null;
  }

  /* F · Work Orders */
  if(S.mod==="wo" && !S.sub){
    const sol = S.solicitudes.find(x=>x.estado==="Pendiente");
    if(sol) return {sel:`[data-a="solProgramar"][data-id="${sol.id}"]`,
      txt:`«${esc(P(sol.prop).nombre)}» llegó de un estimado aprobado. Tocá «Programar» para crear las Work Orders.`};
    const w = S.wos.find(x=>!x.tec && esAgendada(x.estado));
    if(w) return {sel:`tr[data-a="woVer"][data-id="${w.id}"]`, txt:`La WO-${w.id} todavía no tiene técnico. Entrá para asignarlo.`};
    return null;
  }
  if(S.mod==="wo" && S.sub){
    const w = W(S.sub);
    if(w && !w.tec && esAgendada(w.estado)) return {sel:'[data-a="asigModal"]', txt:"Esta Work Order no tiene técnico. Tocá «Asignar técnico»."};
    if(w && w.infoPedida) return {sel:'[data-a="verWoEnCel"]', txt:`Le pediste algo al técnico. Abrí su celular para que lo complete: «Ver en el celular de ${esc(T(w.tec)?T(w.tec).nombre:"el técnico")}».`};
    if(w && w.tec && esAgendada(w.estado) && !asisDe(w.id)) return {sel:'[data-a="verWoEnCel"]', txt:`Ya está asignada y con fecha. Ahora le toca al técnico: abrí su celular con «Ver en el celular de ${esc(T(w.tec)?T(w.tec).nombre:"el técnico")}» y seguí desde ahí.`};
    if(w && w.estado==="Completed" && !w.supervisada && w.evid) return {sel:'[data-a="supervisar"]', txt:"El trabajo está terminado y tiene evidencia. Tocá «Aprobar supervisión»."};
    return null;
  }

  /* F2 · Agenda: si hay órdenes con fecha pero sin técnico, señalá la primera.
     Solo tiene sentido en la Vista semanal — la grilla de "Sin asignar" que
     este tip señala no existe en Vista diaria ni en rango/mes. */
  if(S.mod==="calendario"){
    if(S.periodoCal.tipo!=="semana") return null;
    const sw = S.wos.find(w=>!w.tec && w.estado!=="Canceled" && w.semana===S.periodoCal.sem);
    if(sw) return {sel:`[data-a="woVer"][data-id="${sw.id}"]`,
      txt:`La WO-${sw.id} tiene fecha pero no técnico (fila «Sin asignar»). Tocala para asignarlo.`};
    return null;
  }

  /* G · Requests */
  /* Primero dueño, después decisión: el botón para resolver solo le aparece
     al asignado o al approver, así que la guía no puede señalarlo antes. */
  if(S.mod==="excepciones" && excPend().length){
    const filtro=S.excFiltro||"unassigned", pend=excPend();
    const mios=pend.filter(x=>x.assignedTo===S.usuario || (!x.assignedTo && x.aprueba===S.usuario));
    if(mios.length && filtro!=="mine" && !mios.some(x=>!x.assignedTo))
      return {sel:'[data-a="excFiltro"][data-f="mine"]',
        txt:`Tenés ${mios.length} asignado(s) a vos. Abrí la pestaña «Mine» para resolverlos.`};
    if(mios.length)
      return {sel:'[data-a="excTarifa"],[data-a="excAprob"],[data-a="excDefinirPrecio"],[data-a="excUnidadRevisar"],[data-a="excAyudaResolver"]',
        txt:"Resolvé cada uno con su botón — mientras siga pendiente, frena el pago y la factura de esa WO (solo de esa). «Resolver» (Ayuda en sitio) no frena nada."};
    if(pend.some(x=>!x.assignedTo))
      return {sel:'[data-a="excAsignarYo"],[data-a="excAsignarModal"]',
        txt:"Estos todavía no tienen dueño. Tocá «Assign to me» para tomarlo, o «Assign» para pasárselo a alguien (le llega un aviso). Al asignarlo sale de «Unassigned» y queda en «All»."};
    return {sel:'[data-a="excFiltro"][data-f="all"]',
      txt:"Todos los pendientes ya tienen dueño. En «All» ves a quién le tocó cada uno."};
  }

  /* H · Nómina / Facturación */
  if(S.mod==="nomina"){
    const wv = S.wos.find(w=>w.estado==="Completed" && !w.validada);
    if(wv) return {sel:`[data-a="validarModal"][data-id="${wv.id}"]`, txt:`Falta validar la WO-${wv.id}. Tocá «Revisar y validar».`};
    return null;
  }
  if(S.mod==="facturacion"){
    const wf = S.wos.find(w=>enPeriodo(w.fecha,S.periodo) && w.estado==="Completed" && w.supervisada && aprobFacturaOK(w) && !w.facturada && puedeFacturar(w) && !woBloqueada(w.id));
    if(wf) return {sel:`[data-a="facturar"][data-prop="${wf.prop}"]`, txt:"Hay trabajo listo para facturar. Tocá «Generar factura»."};
    return null;
  }

  /* I · Supervisión */
  if(S.mod==="supervision"){
    const ws = S.wos.find(w=>w.estado==="Completed" && !w.supervisada && w.evid);
    if(ws) return {sel:`[data-a="woVer"][data-id="${ws.id}"],[data-a="supervisar"][data-id="${ws.id}"]`,
      txt:`La WO-${ws.id} está terminada y falta revisarla.`};
    return null;
  }

  return null;
}
function renderCoach(){
  const box = $("#coachBox"); if(!box) return;
  document.querySelectorAll(".coach-target").forEach(e=>e.classList.remove("coach-target"));
  /* Bajo la batería de pruebas (cada suite define window.__R) la ayuda no
     se pinta: su texto entraría en document.body.innerText y rompería los
     chequeos de "esta palabra NO aparece en pantalla". */
  if(window.__R){ box.innerHTML=""; return; }
  if(!S.coach){ box.innerHTML = `<button class="coach-mini off" data-a="coachOn">💡 Activar ayuda</button>`; return; }

  const a = ayudaContexto();
  if(!a){ box.innerHTML = `<button class="coach-mini" data-a="coachOff" title="Apagar la ayuda">💡 Ayuda activa</button>`; S._guiaSel=""; return; }

  // Marcar el elemento: dentro del modal si hay uno, si no en el celular
  // (sus botones viven en #fbody/#fnav, no en #main) o si no en la pantalla.
  const scope = $("#mroot").innerHTML.trim() ? $("#mroot") : (S.phone ? document.querySelector(".drw") : $("#main"));
  let el = a.el || null;
  if(!el && a.sel){ for(const s of a.sel.split(",")){ el = scope.querySelector(s.trim()); if(el) break; } }
  if(el && !el.disabled){
    el.classList.add("coach-target");
    const key = a.sel || "campo";
    if(S._guiaSel !== key) el.scrollIntoView({block:"center", behavior:"smooth"});
    S._guiaSel = key;
  } else S._guiaSel = "";

  box.innerHTML = `<div class="coach">
    <div class="ch"><span class="ico">!</span><b>Te ayudo con esto</b>
      <button class="cx" data-a="coachOff" title="Apagar la ayuda">×</button></div>
    <div class="cb"><div class="paso">${a.txt}</div>
      ${el?`<div class="cgo on" style="cursor:default">👉 Mirá lo marcado en rojo</div>`
          :`<div class="quien">Buscalo en esta pantalla.</div>`}
    </div></div>`;
}

/* ══════════ "¿QUÉ ES ESTA PANTALLA?" ══════════
   Un botón fijo en la esquina de cada vista. Al tocarlo, un panel explica
   para qué sirve esa pantalla y qué se puede hacer ahí (incluido «hacé clic
   en una fila para ver el detalle» donde aplica). Se abre y cierra a mano. */
const AYUDA_VISTA = {
  tablero:{t:"Tablero", d:"Los números de la semana, calculados solos: cuántas órdenes hay, cuántas terminadas, cuánto se facturó. Es lo que hoy se arma a mano en la hoja Dashboard.",
    tips:["La lista «Lo que necesita tu atención» ordena los pendientes por urgencia — tocá «Ir →» en cualquiera para ir a resolverlo."]},
  wo:{t:"Work Orders", d:"Las órdenes de trabajo: una unidad, un servicio, una fecha, un técnico. Es la hoja Schedule del Excel.",
    tips:["Hacé clic en cualquier fila para abrir el detalle de esa orden.","«+ Nueva Work Order» crea una a mano.","Las pestañas de arriba filtran: sin técnico, en curso, de la semana…"]},
  calendario:{t:"Agenda", d:"Todas las Work Orders ubicadas en su fecha y técnico. Se llena sola: cada orden que creás con fecha aparece acá. Elegí Día, Semana, Rango de fechas o Mes arriba para mirar el período que necesites.",
    tips:["Semana es la vista de siempre: técnico por fila, día por columna.","Día muestra en una lista exactamente lo agendado ese día puntual.","Rango de fechas y Mes agrupan por fecha lo agendado en ese período — por ejemplo, del 1 al 30 de septiembre.","Las que todavía no tienen técnico salen arriba, en la fila «Sin asignar» (vista Semana) — tocalas para asignar.","Hacé clic en cualquier orden para abrir su detalle."]},
  despacho:{t:"Disponibilidad del equipo", d:"Un solo objetivo: antes de prometerle una fecha a un cliente, ver si el equipo tiene lugar ese día. La regla de la que sale todo: 2 trabajos por técnico y por día.",
    tips:["<b>Cupo del equipo</b> de un día = técnicos disponibles ese día × 2. Un técnico con permiso aprobado no cuenta.","<b>Trabajos del día</b> = todas las Work Orders con esa fecha. Si pasan el cupo, la fila se pone roja: hay que mover alguna a otro día.","La barra muestra cuánto del cupo ya está en uso (con técnico) y cuánto queda libre.","<b>Cerrar el día</b>: cuando ya no se juntan más trabajos y se empiezan a repartir a los técnicos.","«+ Registrar permiso» marca a un técnico como no disponible unos días — Gustavo lo aprueba, y esos días le baja el cupo al equipo."]},
  supervision:{t:"Supervisión", d:"La jornada de Gustavo: a dónde ir, qué revisar, las devoluciones y lo que quedó acordado con cada propiedad.",
    tips:["«De campo»: lo que Gustavo mandó desde el celular, esperando que decidas qué hacer con eso.","«Ruta del día»: las propiedades que le armaste para hoy.","«Por revisar»: Work Orders terminadas por el técnico, esperando que Gustavo apruebe o devuelva.","«Devoluciones»: lo que se mandó a corregir por calidad, con su motivo y estado.","«Reporte diario»: el resumen del día de Gustavo, se arma solo.","«Ver su celular» abre el simulador — ahí es donde se prueban todas estas acciones de verdad."]},
  reportes:{t:"Reportes", d:"Los números del trabajo cruzados como quieras: por semana, por zona, por servicio.",
    tips:["Tocá un número de la tabla para ver qué órdenes hay detrás."]},
  buscar:{t:"Buscar", d:"Filtra las Work Orders y mira cobro, pago y utilidad de cada una. Sirve para saber cuánto se pagó antes por un mismo trabajo.",
    tips:["Usa Agrupar para ver promedios por propiedad, técnico, servicio o semana.","CSV descarga lo que estás viendo."]},
  clientes:{t:"Management", d:"Las empresas administradoras (property management). Se registra una vez y todas sus propiedades cuelgan de ahí.",
    tips:["Hacé clic en una fila para ver o corregir una administradora.","«+ Nuevo» registra una."]},
  solicitudes:{t:"Solicitudes Comerciales", d:"El pedido del cliente, registrado antes de que exista ningún estimado. Arriba están las visitas comerciales.",
    tips:["<b>Cómo se registra:</b> «+ Nueva solicitud» → propiedad, contacto, <b>Origen</b> (Claudia, Correo, Gustavo o Visita) y qué pidió el cliente.",
      "Las de Gustavo (desde su informe) y las de una visita comercial se crean solas.",
      "<b>Plazo de 24 h:</b> la columna «Respuesta» muestra cuánto falta. Amarilla con 4 h o menos, roja si se venció (y sale en Alertas). Si la registra otra persona, a Claudia le llega un aviso.",
      "<b>Contestar</b> = tocar «Crear estimado», «Asignar inspección a Gustavo» o «Descartar». Queda si fue a tiempo o tarde.",
      "«Cliente lo necesita» es para cuándo el cliente quiere el trabajo — no es el plazo de 24 h.",
      "Si la conversación fue en una visita, registrala arriba con «+ Registrar visita»."]},
  estimados:{t:"Estimados", d:"Las cotizaciones que se le mandan al cliente. Todo estimado nace de una Solicitud Comercial: así queda quién lo pidió y el plazo de respuesta.",
    tips:["<b>Cómo se crea uno:</b> en «Solicitudes Comerciales», tocá «Crear estimado» en la solicitud. Se abre con la propiedad cargada.",
      "Adentro: marcá a qué contactos se envía, elegí la Unidad (opcional — si es para toda la propiedad, dejala vacía), elegí el servicio de la tarifa <b>General</b> o <b>Propia</b> y tocá «+ Agregar al estimado». Repetí por cada servicio.",
      "Opcional: depósito, documentos, firma del cliente, términos y nota. «Save draft» lo guarda; «Send» lo envía.",
      "Los precios salen del tarifario — para un servicio nuevo, primero cargalo en «Tarifario» o en el Price List de la propiedad.",
      "«Aprobar» / «Rechazar» se registra a mano cuando el cliente responde, indicando por qué medio avisó. Si lo rechaza: «Modificar propuesta y reenviar»."]},
  propiedades:{t:"Propiedades", d:"Cada edificio o complejo, con todo lo suyo adentro: unidades, contactos, seguro, precios.",
    tips:["Hacé clic en cualquier fila para abrir la ficha de esa propiedad.","Adentro, la pestaña «Expediente» te marca lo que falta para poder agendar.","«+ Nueva propiedad» solo pide nombre y dirección — el resto se completa después entrando a la ficha."]},
  tecnicos:{t:"Técnicos", d:"El equipo: quién está hoy en campo, la lista completa y el historial de asistencia.",
    tips:["Hacé clic en una fila para ver o corregir un técnico.","«+ Nuevo técnico» lo da de alta."]},
  tarifario:{t:"Tarifario", d:"Los precios generales: los que aplican a cualquier propiedad que no tenga un precio propio negociado.",
    tips:["«+ Nueva tarifa» agrega uno.","Hacé clic en «Editar» para modificar uno existente.","La llave es Servicio + Rooms + Piso."]},
  catalogos:{t:"Catálogos", d:"Las listas que llenan cada desplegable del sistema: zonas, tipos de servicio, ubicaciones, estados de la orden.",
    tips:["Se agregan y se quitan acá, sin tocar nada más."]},
  nomina:{t:"Nómina", d:"Se arma sola con las órdenes validadas. Las completas se validan solas; acá solo aparecen las que les falta algo. El período (semana / día / rango / mes) se elige arriba.",
    tips:["Regla para pagarle al técnico: alcanza con que Erika la valide acá — no hace falta esperar que Gustavo la haya aprobado.","«Revisar y validar» abre el detalle de una orden. Ahí mismo se ajustan los materiales con «Ajustar».","Una WO con Request pendiente no se paga hasta que se resuelva — el resto del período sí.",
      "«Marcar pagado» pide el número de cheque y la foto del comprobante. Si pagás a todos juntos, la foto se agrega después con «Adjuntar» en el historial.",
      "«Descuento» (en la tarjeta del técnico): monto, concepto, WO y una descripción corta. El técnico lo ve en su celular.",
      "«Parcial» paga una parte de una WO; queda el saldo. Lo que no se pagó en su semana aparece la siguiente en «Pendientes anteriores».",
      "El historial se filtra por técnico, fechas o palabra (WO, propiedad, número de cheque). «Ver» abre qué WO incluyó cada pago."]},
  facturacion:{t:"Facturación", d:"De órdenes terminadas a factura, agrupadas por propiedad, sin volver a escribir nada. El período (semana / día / rango / mes) se elige arriba.",
    tips:["Regla para poder facturar: hacen falta las DOS cosas juntas — aprobada por Gustavo (Supervisión) y validada por Erika (Nómina). Si falta una, no aparece.","La tabla «Por qué todavía no aparecen algunas WO» explica el motivo exacto de cada una que quedó afuera.","«Generar factura» crea la factura de esa propiedad.","Se frena solo la WO con Request pendiente o sin tarifa, no toda la propiedad.",
      "<b>Normal:</b> todo lo de la propiedad va junto en Factura 1. Solo si la propiedad lo pide separado, usá «Lote manual»: fechas + tipo (Clean, Paint, Extras) → Factura 1, 2, 3…",
      "<b>Vencimiento:</b> cuenta desde que se <b>envía</b>, con los días de crédito de la propiedad (30 si no tiene otro). Al enviar se puede cambiar.",
      "El buscador y los filtros (propiedad, estado, fechas) acotan la tabla de facturas.","El PDF se descarga con el número de factura, la fecha y la hora."]},
  cobranza:{t:"Cobranza", d:"El seguimiento de las facturas emitidas. Al pasar su vencimiento sin pago, arranca la secuencia de reclamo.",
    tips:["<b>Vencidas por cliente:</b> junta todas las facturas vencidas de un cliente (aunque sean de varias propiedades). «Enviar recordatorio» manda un solo correo con todas.",
      "Por factura, «Gestionar cobranza» sigue la escalera: reminder → correo overdue → llamada, y ahí se registra el pago (puede ser parcial).",
      "«Cambiar» al lado del vencimiento lo mueve, con un motivo que queda registrado.",
      "Los filtros de arriba acotan por número, propiedad, estado o fechas."]},
  finanzas:{t:"Finanzas", d:"Lo que sale de la empresa: gastos generales y gastos compartidos entre varias WO, para que la utilidad de cada orden sea la real.",
    tips:["En un gasto compartido, «Asignar a estas WO» tiene buscador (propiedad, unidad o número de WO) y «Solo marcadas» para revisar lo asignado.","«Repartir igual» divide el total entre las WO marcadas; el total asignado tiene que dar igual al monto."]},
  inventario:{t:"Inventario de materiales", d:"Los materiales. El stock no se edita: es la suma de las compras menos las salidas.",
    tips:["Cada salida queda ligada a la Work Order donde se usó."]},
  bitacora:{t:"Bitácora", d:"Todo lo que cambió un dato, con quién lo hizo y cuándo. No se puede editar ni borrar.",
    tips:["Los filtros de arriba acotan por persona o por módulo."]},
  alertas:{t:"Alertas", d:"Cosas que vencen o que faltan (un seguro por vencer, una tarifa faltante, una orden sin técnico), recalculadas solas. Ninguna es genérica.",
    tips:[]},
  excepciones:{t:"Requests", d:"Pedidos que necesitan que alguien de oficina decida o responda: un pago extra al técnico, una tarifa que no existe, un trabajo cerrado sin fotos, un adicional que pidió el técnico desde el celular — o un técnico pidiendo ayuda en sitio (no abre la llave, falta material…). Mientras uno siga pendiente, frena el pago y la factura <b>solo de su WO</b> — el resto sigue normal. La excepción: «Ayuda en sitio» <b>no frena</b> ni pago ni factura, pero se vuelve URGENT a los 20 min.",
    tips:["<b>Primero se asigna un dueño:</b> «Assign to me» lo tomás vos; «Assign» se lo pasás a otra persona (a esa persona le llega un aviso).",
      "<b>Las pestañas:</b> «Unassigned» = nadie lo tomó todavía · «Mine» = los tuyos · «All» = todos. Al asignar uno, sale de «Unassigned» — no se borra: queda en «All» y en el «Mine» de quien lo recibió.",
      "El botón para resolver (Aprobar, Rechazar, «Definir tarifa»…) solo le aparece al dueño asignado o a quien figura como <b>approver</b>.",
      "«Tarifa no encontrada»: la WO no tiene precio en el tarifario. Quien la tiene asignada toca «Definir tarifa» y pone el precio.",
      "Los que pide el técnico desde el celular se ponen <b>URGENT</b> a los 20 minutos sin respuesta.",
      "Abajo, «Resueltas» guarda quién decidió qué y cuándo."]},
  gustavoweb:{t:"Vista de Gustavo (web)", d:"Lo mismo que Gustavo ve en su celular, como página web — de referencia para cuando se construya la app real.",
    tips:[]}
};

/* Lo mismo que AYUDA_VISTA, pero para las 5 pantallas del celular de
   Gustavo (S.phView, con S.phRol==="supervisor"). Antes esta ayuda se
   apagaba entera al abrir el celular — acá adentro es donde más perdida
   queda una persona que nunca lo usó. */
const AYUDA_FON_SUP = {
  panel:{t:"Hoy", d:"La pantalla de inicio del celular de Gustavo: un resumen de su día — cuántas paradas tiene, cuántas ya visitó, devoluciones y materiales pendientes.",
    tips:["Cada número lleva a su propia pantalla — tocalo para ver el detalle.","Es solo un resumen: las acciones reales están en «Mi ruta» y «Reportar».",
      "«Unidades pendientes de supervisión»: trabajos que el técnico ya terminó y Gustavo todavía tiene que revisar. No son trabajos que el técnico no pudo completar."]},
  ruta:{t:"Mi ruta", d:"Las propiedades que le tocan hoy, ya ordenadas por zona. Esta ruta la arma Claudia — Gustavo no elige a dónde va, solo marca cómo le va yendo.",
    tips:["«Voy en camino» y «Llegué» actualizan su estado en vivo — Claudia lo ve al instante.","«No pude completarla» pide un motivo: queda igual el registro de que fue, aunque no haya podido entrar.","Una vez que marca «Llegué», ahí mismo aparece el botón «Reportar desde aquí»."]},
  reportar:{t:"Reportar", d:"Acá es donde Gustavo registra lo que encontró y sube las fotos. Se elige primero la propiedad, después qué tipo de reporte es.",
    tips:["Los 4 tipos: inspección para un estimado, estado previo (cómo estaba antes de empezar), revisión de un trabajo del técnico, o falta de material.","Cada uno pide fotos agrupadas por ambiente — no se puede enviar sin al menos una.","Apenas toca enviar, el reporte le llega a Claudia al instante: aparece en la pantalla web «Supervisión», pestaña «De campo»."]},
  dia:{t:"Mi día", d:"Un solo reporte por jornada. Se abre solo con la primera actividad y se va llenando; nada se escribe a mano salvo lo que nadie más puede saber.",
    tips:["Una vez que lo cierra, no se puede editar — si falta algo, se agrega como nota aparte.","Esto es lo mismo que ve Claudia en la web, en «Supervisión → Reporte diario»."]},
  devs:{t:"Devoluciones", d:"Los trabajos que Gustavo mandó a corregir por calidad. Acá verifica si la corrección que hizo el técnico ya quedó bien.",
    tips:["Hace falta una foto del después para poder cerrarla.","Hasta que no se cierra, esa Work Order no se puede facturar."]}
};

/* Lo mismo para el celular del técnico: antes no tenía ninguna ayuda. */
const AYUDA_FON_TEC = {
  agenda:{t:"Agenda", d:"Los trabajos del técnico, por día y hora. Cada tarjeta es una Work Order: tocala para abrirla.",
    tips:["«Pedir permiso o vacaciones» le avisa a la oficina."]},
  wo:{t:"Work Order", d:"Lo que el técnico hace en la unidad, paso a paso.",
    tips:["Al llegar, confirma que la unidad coincide («Sí, coincide — empezar») o avisa si no («No coincide — avisar»).",
      "«Foto del antes» y «Foto de cómo quedó»: sin fotos de cómo quedó, la oficina no puede cobrar el trabajo.",
      "«Necesito ayuda»: si no puede entrar (la llave no abre), falta material u otra cosa. Le llega a Thalia y Gustavo como Request «Ayuda en sitio»; no frena su pago.",
      "«Necesito aprobación»: si encontró trabajo extra que no estaba en la orden. Le llega a la oficina como Request.",
      "«Materiales» y «Compra de materiales»: lo que usó y lo que compró en la tienda (con el ticket).",
      "«Terminé» cierra el trabajo."]},
  subwo:{t:"Sub-Work Order", d:"Un trabajo extra dentro de una orden. Se hace solo lo que la oficina autorizó.", tips:[]},
  pago:{t:"Mi pago", d:"Lo que se le paga al técnico esta semana: sus trabajos, extras aprobados y descuentos.",
    tips:["Si algo quedó sin pagar la semana anterior, aparece acá también.","«Pagado parcial» muestra cuánto lleva cobrado de un trabajo grande.","Cada descuento dice su motivo y de qué WO viene."]},
  avisos:{t:"Avisos", d:"Los mensajes que la oficina le manda al técnico.", tips:[]}
};

function renderAyudaVista(){
  const box = $("#ayudaVBox"); if(!box) return;
  if(window.__R){ box.innerHTML=""; return; }
  let info;
  if(S.phone){
    info = S.phRol==="supervisor" ? AYUDA_FON_SUP[S.phView] : AYUDA_FON_TEC[S.phView];
  } else {
    info = AYUDA_VISTA[S.mod];
    if(S.mod==="wo" && S.sub) info = {t:"Detalle de la Work Order",
      d:"Todo lo de esta orden: el trabajo, el dinero, la evidencia, el historial. Los botones de arriba son los pasos que faltan según el estado.",
      tips:["«Asignar técnico» / «Programar con el cliente»: los dos pasos antes de que arranque el trabajo.","«Ver en el celular de …»: abre esta orden en el celular del técnico que la tiene — desde ahí él marca llegada, sube fotos y cierra.","«Detener trabajo»: si empezó pero no puede seguir por algo externo (falta material, no hay acceso…)."]};
    if(S.mod==="propiedades" && S.sub) info = {t:"Ficha de la propiedad",
      d:"Todo lo de esta propiedad, en pestañas. Se completan en cualquier orden; el «Expediente» te va marcando lo que falta.",
      tips:["«Datos» son los datos generales — «Editar datos» los modifica.","«Expediente»: la lista de control. Sin completarla no se puede transferir a programación.","«Contactos», «Documentos» (el seguro), «Price List» y «Unidades» se cargan cada uno en su pestaña.","«Comunicación»: anotá cada llamada o correo con esta propiedad, para que quede el registro."]};
  }
  const btn = `<button class="avb" data-a="ayudaVistaToggle">❔ ¿Qué es esta pantalla?</button>`;
  if(!S.ayudaVista || !info){ box.innerHTML = btn; return; }
  box.innerHTML = `<div class="avpanel">
    <div class="avh"><b>${esc(info.t)}</b><button class="cx" data-a="ayudaVistaToggle" title="Cerrar">×</button></div>
    <div class="avb2"><p>${info.d}</p>
      ${info.tips&&info.tips.length?`<ul>${info.tips.map(t=>`<li>${t}</li>`).join("")}</ul>`:""}
    </div></div>`;
}
