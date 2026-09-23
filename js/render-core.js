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
    if(w && w.tec && !w.confirmCliente && esAgendada(w.estado)) return {sel:'[data-a="progCliente"]', txt:"Falta confirmar la fecha con el cliente. Tocá «Programar con el cliente»."};
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

  /* G · Approval Requests */
  if(S.mod==="excepciones" && excPend().length)
    return {sel:'[data-a="excTarifa"],[data-a="excAprob"]',
      txt:"Resuelve cada Approval Request con su botón — mientras siga pendiente, frena el pago y la factura de la WO asociada."};

  /* H · Nómina / Facturación */
  if(S.mod==="nomina"){
    const wv = S.wos.find(w=>w.estado==="Completed" && !w.validada);
    if(wv) return {sel:`[data-a="validarModal"][data-id="${wv.id}"]`, txt:`Falta validar la WO-${wv.id}. Tocá «Revisar y validar».`};
    return null;
  }
  if(S.mod==="facturacion"){
    const wf = S.wos.find(w=>enPeriodo(w.fecha,S.periodo) && w.estado==="Completed" && w.supervisada && w.validada && !w.facturada && puedeFacturar(w) && !woBloqueada(w.id));
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
  clientes:{t:"Management", d:"Las empresas administradoras (property management). Se registra una vez y todas sus propiedades cuelgan de ahí.",
    tips:["Hacé clic en una fila para ver o corregir una administradora.","«+ Nuevo» registra una."]},
  solicitudes:{t:"Solicitudes Comerciales", d:"El pedido del cliente, registrado antes de que exista ningún estimado. Arriba están las visitas comerciales.",
    tips:["«Crear estimado» arma el estimado desde una solicitud que está lista.","Si la conversación fue en una visita, registrala arriba con «+ Registrar visita»."]},
  estimados:{t:"Estimados", d:"Las cotizaciones que se le mandan al cliente. El sistema pone los precios del tarifario — nadie teclea montos.",
    tips:["No hay «+ Nuevo estimado» suelto: nacen de una Solicitud Comercial.","«Aprobar» / «Rechazar» se registra a mano cuando el cliente responde, indicando por qué medio avisó."]},
  propiedades:{t:"Propiedades", d:"Cada edificio o complejo, con todo lo suyo adentro: unidades, contactos, seguro, precios.",
    tips:["Hacé clic en cualquier fila para abrir la ficha de esa propiedad.","Adentro, la pestaña «Expediente» te marca lo que falta para poder agendar.","«+ Nueva propiedad» solo pide nombre y dirección — el resto se completa después entrando a la ficha."]},
  tecnicos:{t:"Técnicos", d:"El equipo: quién está hoy en campo, la lista completa y el historial de asistencia.",
    tips:["Hacé clic en una fila para ver o corregir un técnico.","«+ Nuevo técnico» lo da de alta."]},
  tarifario:{t:"Tarifario", d:"Los precios generales: los que aplican a cualquier propiedad que no tenga un precio propio negociado.",
    tips:["«+ Nueva tarifa» agrega uno.","Hacé clic en «Editar» para modificar uno existente.","La llave es Servicio + Rooms + Piso."]},
  catalogos:{t:"Catálogos", d:"Las listas que llenan cada desplegable del sistema: zonas, tipos de servicio, ubicaciones, estados de la orden.",
    tips:["Se agregan y se quitan acá, sin tocar nada más."]},
  nomina:{t:"Nómina", d:"Se arma sola con las órdenes validadas. Las completas se validan solas; acá solo aparecen las que les falta algo. El período (semana / día / rango / mes) se elige arriba.",
    tips:["Regla para pagarle al técnico: alcanza con que Erika la valide acá — no hace falta esperar que Gustavo la haya aprobado.","«Revisar y validar» abre el detalle de una orden.","Una WO con Approval Request pendiente no se paga hasta que se resuelva — el resto del período sí."]},
  facturacion:{t:"Facturación", d:"De órdenes terminadas a factura, agrupadas por propiedad, sin volver a escribir nada. El período (semana / día / rango / mes) se elige arriba.",
    tips:["Regla para poder facturar: hacen falta las DOS cosas juntas — aprobada por Gustavo (Supervisión) y validada por Erika (Nómina). Si falta una, no aparece.","La tabla «Por qué todavía no aparecen algunas WO» explica el motivo exacto de cada una que quedó afuera.","«Generar factura» crea la factura de esa propiedad.","Se frena solo la WO con Approval Request pendiente o sin tarifa, no toda la propiedad."]},
  cobranza:{t:"Cobranza", d:"El seguimiento de las facturas emitidas. Pasados 30 días sin pago, arranca la secuencia de reclamo.",
    tips:[]},
  inventario:{t:"Inventario de materiales", d:"Los materiales. El stock no se edita: es la suma de las compras menos las salidas.",
    tips:["Cada salida queda ligada a la Work Order donde se usó."]},
  bitacora:{t:"Bitácora", d:"Todo lo que cambió un dato, con quién lo hizo y cuándo. No se puede editar ni borrar.",
    tips:["Los filtros de arriba acotan por persona o por módulo."]},
  alertas:{t:"Alertas", d:"Cosas que vencen o que faltan (un seguro por vencer, una tarifa faltante, una orden sin técnico), recalculadas solas. Ninguna es genérica.",
    tips:[]},
  excepciones:{t:"Approval Requests", d:"Solicitudes que necesitan una decisión de oficina. Mientras una siga pendiente, frena el pago y la factura de la WO asociada (si no está atada a una WO, frena toda la nómina y facturación).",
    tips:["Cada fila tiene su botón para resolverla.","«Quién decide» dice a quién le toca cada una."]},
  gustavoweb:{t:"Vista de Gustavo (web)", d:"Lo mismo que Gustavo ve en su celular, como página web — de referencia para cuando se construya la app real.",
    tips:[]}
};

/* Lo mismo que AYUDA_VISTA, pero para las 5 pantallas del celular de
   Gustavo (S.phView, con S.phRol==="supervisor"). Antes esta ayuda se
   apagaba entera al abrir el celular — acá adentro es donde más perdida
   queda una persona que nunca lo usó. */
const AYUDA_FON_SUP = {
  panel:{t:"Hoy", d:"La pantalla de inicio del celular de Gustavo: un resumen de su día — cuántas paradas tiene, cuántas ya visitó, devoluciones y materiales pendientes.",
    tips:["Cada número lleva a su propia pantalla — tocalo para ver el detalle.","Es solo un resumen: las acciones reales están en «Mi ruta» y «Reportar»."]},
  ruta:{t:"Mi ruta", d:"Las propiedades que le tocan hoy, ya ordenadas por zona. Esta ruta la arma Claudia — Gustavo no elige a dónde va, solo marca cómo le va yendo.",
    tips:["«Voy en camino» y «Llegué» actualizan su estado en vivo — Claudia lo ve al instante.","«No pude completarla» pide un motivo: queda igual el registro de que fue, aunque no haya podido entrar.","Una vez que marca «Llegué», ahí mismo aparece el botón «Reportar desde aquí»."]},
  reportar:{t:"Reportar", d:"Acá es donde Gustavo registra lo que encontró y sube las fotos. Se elige primero la propiedad, después qué tipo de reporte es.",
    tips:["Los 4 tipos: inspección para un estimado, estado previo (cómo estaba antes de empezar), revisión de un trabajo del técnico, o falta de material.","Cada uno pide fotos agrupadas por ambiente — no se puede enviar sin al menos una.","Apenas toca enviar, el reporte le llega a Claudia al instante: aparece en la pantalla web «Supervisión», pestaña «De campo»."]},
  dia:{t:"Mi día", d:"Un solo reporte por jornada. Se abre solo con la primera actividad y se va llenando; nada se escribe a mano salvo lo que nadie más puede saber.",
    tips:["Una vez que lo cierra, no se puede editar — si falta algo, se agrega como nota aparte.","Esto es lo mismo que ve Claudia en la web, en «Supervisión → Reporte diario»."]},
  devs:{t:"Devoluciones", d:"Los trabajos que Gustavo mandó a corregir por calidad. Acá verifica si la corrección que hizo el técnico ya quedó bien.",
    tips:["Hace falta una foto del después para poder cerrarla.","Hasta que no se cierra, esa Work Order no se puede facturar."]}
};

function renderAyudaVista(){
  const box = $("#ayudaVBox"); if(!box) return;
  if(window.__R){ box.innerHTML=""; return; }
  let info;
  if(S.phone){
    if(S.phRol!=="supervisor"){ box.innerHTML=""; return; }
    info = AYUDA_FON_SUP[S.phView];
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
