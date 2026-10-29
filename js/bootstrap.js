"use strict";
document.addEventListener("click", e=>{
  const el = e.target.closest("[data-a]"); if(!el||el.disabled) return;
  if(el.tagName==="SELECT") return;          // los select reaccionan en "change", no en "click"
  /* Los input tampoco: el preventDefault() de abajo impedía que se abriera el
     calendario nativo al tocar un campo de fecha. */
  if(el.tagName==="INPUT") return;
  const a = el.dataset.a;
  /* Cualquier fondo oscuro (.scrim de un modal, .fscrim de una hoja del
     celular) solo cierra si el clic fue en el fondo mismo — no si "cerrar"
     resultó ser lo más cercano con data-a porque tocaste una etiqueta, un
     select sin handler propio, o cualquier texto suelto DENTRO del formulario.
     Antes esto solo estaba resuelto para el modal ("cm") y un tipo de hoja
     ("fSheetNo"); las hojas de Gustavo (gRepNo, gDiaNo, gDevNo) no tenían
     esta protección y cualquier clic que no cayera justo en un botón lo
     sacaba del formulario entero. */
  if((el.classList.contains("scrim")||el.classList.contains("fscrim")) && e.target!==el) return;
  if(ACC[a]){ e.preventDefault(); ACC[a](el.dataset); }
});
/* Buscador de Propiedad/Unidad en la WO: sugerencias en vivo mientras se
   escribe, no solo al salir del campo — por eso "input" y no "change". Va
   acotado a estos dos campos, no a todo data-a[input], para no disparar
   otros handlers en cada tecla sin haberlo pensado. */
document.addEventListener("input", e=>{
  const el = e.target;
  if(el.id==="wPropTxt") ACC.woPropBuscar();
  else if(el.id==="wUniTxt") ACC.woUniBuscar();
  else if(el.id==="gaBuscar"||el.id==="gaSoloMarc") ACC.gaFiltrar();
  else if(el.classList.contains("gaWO")) ACC.gaContar();
  else if(el.id==="catBuscar") ACC.catBuscar();
});
document.addEventListener("change", e=>{
  const sel = e.target.closest("select[data-a], input[data-a], textarea[data-a]");
  if(sel && ACC[sel.dataset.a]){ ACC[sel.dataset.a](sel.dataset); return; }
  if(e.target.id==="usel"){ S.usuario=e.target.value; S.mod="tablero";
    toast("Sesión cambiada",`Ahora operas como <b>${S.usuario}</b> — ${ROLES[S.usuario].r}. El menú se ajusta a lo que tu rol puede tocar.`);
    render(); }
});
/* ══════════ BITÁCORA ══════════
   Toda acción que cambia un dato queda registrada con quién, qué y cuándo.
   Es lo que hoy no existe: «sin querer me borran una work order y ya no puedo
   saber si se pagó», y «no hay un manual, el manual es Claudia». */
const AUD = {
  woGuardar:{a:"Creó una Work Order", m:"Work Orders"},
  asigSi:{a:"Asignó técnico", m:"Work Orders"},
  supervisar:{a:"Aprobó supervisión", m:"Supervisión"},
  fLlegue:{a:"Marcó llegada (técnico)", m:"Campo"},
  fLlegadaDecl:{a:"Declaró llegada sin verificar", m:"Campo"},
  woCorrobora:{a:"Corroboró la unidad antes de empezar", m:"Campo"},
  woCorroboraNoOK:{a:"Reportó que la unidad no coincide", m:"Campo"},
  fFoto:{a:"Cargó evidencia", m:"Campo"},
  fAdicOK:{a:"Pidió aprobación de adicional", m:"Campo"},
  fAyudaOK:{a:"Pidió ayuda en sitio", m:"Campo"},
  excAyudaOK:{a:"Resolvió una ayuda en sitio", m:"Excepciones"},
  fMaterialOK:{a:"Registró material usado", m:"Campo"},
  fCompraOK:{a:"Registró una compra de materiales en tienda", m:"Campo"},
  subwoGuardar:{a:"Creó una Sub-Work Order", m:"Work Orders"},
  subwoFotoRef:{a:"Agregó foto de referencia a una Sub-Work Order", m:"Work Orders"},
  subwoFotoEvid:{a:"Agregó foto de evidencia a una Sub-Work Order", m:"Work Orders"},
  gRepOK:{a:"Envió reporte de campo", m:"Supervisión"},
  gRepItemMas:{a:"Agregó un servicio a la inspección", m:"Supervisión"},
  gRepBorrador:{a:"Guardó un informe como borrador", m:"Supervisión"},
  gEnCamino:{a:"Marcó que va en camino", m:"Supervisión"},
  gNoCompletaOK:{a:"Registró una parada no completada", m:"Supervisión"},
  woAvanceOK:{a:"Registró el avance de un trabajo", m:"Work Orders"},
  progOK:{a:"Coordinó la fecha con el cliente", m:"Programación"},
  agendaCerrarDia:{a:"Cerró agendamiento y generó confirmaciones", m:"Programación"},
  agendaEnviarOK:{a:"Envió la agenda de un cliente", m:"Programación"},
  woDetenerOK:{a:"Detuvo un trabajo", m:"Work Orders"},
  woReanudar:{a:"Reanudó un trabajo detenido", m:"Work Orders"},
  gDiaAbrir:{a:"Abrió su reporte del día", m:"Supervisión"},
  gDiaOK:{a:"Agregó una actividad al reporte del día", m:"Supervisión"},
  gDiaFin:{a:"Finalizó y envió el reporte del día", m:"Supervisión"},
  gDiaNotaOK:{a:"Agregó una nota a un reporte ya cerrado", m:"Supervisión"},
  gDiaQuita:{a:"Quitó una actividad del reporte del día", m:"Supervisión"},
  gDevOK:{a:"Abrió un return", m:"Supervisión"},
  gDevVerifOK:{a:"Verificó un return fix", m:"Supervisión"},
  gDevCerrar:{a:"Cerró un return", m:"Supervisión"},
  devTouchupOK:{a:"Creó un return fix", m:"Supervisión"},
  devRegistrarOK:{a:"Registró un return", m:"Returns"},
  devCerrar:{a:"Cerró un return desde la oficina", m:"Returns"},
  woReasignarOK:{a:"Reasignó una Work Order", m:"Work Orders"},
  woCancelarOK:{a:"Canceló una Work Order", m:"Work Orders"},
  asigFecha:{a:"Movió la fecha de una Work Order", m:"Work Orders"},
  devolverOK:{a:"Hizo un return a un trabajo", m:"Work Orders"},
  agSupOK:{a:"Armó la ruta del supervisor", m:"Supervisión"},
  agSupQuita:{a:"Quitó una parada de la ruta del supervisor", m:"Supervisión"},
  supSolOK:{a:"Solicitó una visita de Gustavo", m:"Supervisión"},
  supAgendar:{a:"Agendó una visita en la ruta de Gustavo", m:"Supervisión"},
  supMover:{a:"Movió una parada de la ruta de Gustavo", m:"Supervisión"},
  gLlegue:{a:"Llegó a una propiedad (supervisor)", m:"Supervisión"},
  repArchivar:{a:"Archivó un reporte de campo", m:"Supervisión"},
  repEstimado:{a:"Generó estimado desde reporte de campo", m:"Supervisión"},
  repWO:{a:"Creó Work Order desde reporte de campo", m:"Supervisión"},
  repMaterial:{a:"Pasó material a compra", m:"Supervisión"},
  fTermine:{a:"Cerró el trabajo", m:"Campo"},
  fSubIniciar:{a:"Inició una Sub-Work Order", m:"Campo"},
  fSubFoto:{a:"Agregó evidencia a una Sub-Work Order", m:"Campo"},
  fSubHallazgo:{a:"Registró un initial finding de una Sub-Work Order", m:"Campo"},
  fSubTerminar:{a:"Cerró una Sub-Work Order", m:"Campo"},
  fPermisoOK:{a:"Solicitó permiso", m:"Campo"},
  fDispOK:{a:"Envió su disponibilidad de la semana", m:"Campo"},
  dispRecordar:{a:"Recordó la disponibilidad a los técnicos", m:"Disponibilidad"},
  medioOK:{a:"Decidió un adicional", m:"Excepciones"},
  excAprob:{a:"Aprobó una excepción", m:"Excepciones"},
  excRech:{a:"Rechazó una excepción", m:"Excepciones"},
  adicRechazar:{a:"Rechazó un adicional desde la Work Order", m:"Work Orders"},
  editarRevision:{a:"Reabrió la revisión de una Work Order", m:"Nómina"},
  excGuardar:{a:"Levantó una excepción", m:"Excepciones"},
  tarifaGuardar:{a:"Definió una tarifa faltante", m:"Tarifario"},
  tarifaAvisarClaudia:{a:"Avisó a Claudia para definir una tarifa", m:"Excepciones"},
  tarGuardar:{a:"Creó una tarifa", m:"Tarifario"},
  pagoTecGuardar:{a:"Agregó un pago diferenciado por técnico", m:"Tarifario"},
  pagoTecQuitar:{a:"Quitó un pago diferenciado por técnico", m:"Tarifario"},
  catSave:{a:"Agregó un valor de catálogo", m:"Catálogos"},
  catDel:{a:"Quitó un valor de catálogo", m:"Catálogos"},
  catAlta:{a:"Reactivó un valor de catálogo", m:"Catálogos"},
  servSave:{a:"Agregó un servicio", m:"Catálogos"},
  catRenOK:{a:"Renombró un valor de catálogo", m:"Catálogos"},
  servRenOK:{a:"Renombró un servicio", m:"Catálogos"},
  servDel:{a:"Quitó un servicio", m:"Catálogos"},
  servAlta:{a:"Reactivó un servicio", m:"Catálogos"},
  propGuardar:{a:"Dio de alta una propiedad", m:"Propiedades"},
  propBaja:{a:"Cambió el estado de una propiedad (activa/inactiva)", m:"Propiedades"},
  uniGuardar:{a:"Agregó una unidad", m:"Propiedades"},
  conGuardar:{a:"Agregó un contacto", m:"Propiedades"},
  tecGuardar:{a:"Dio de alta un técnico", m:"Técnicos"},
  tecBaja:{a:"Cambió el estado de un técnico (activo/inactivo)", m:"Técnicos"},
  cliGuardar:{a:"Registró un management", m:"Comercial"},
  cliDocsOK:{a:"Actualizó los documentos de un management (Vendor Packet / W-9)", m:"Comercial"},
  transferir:{a:"Transfirió a programación", m:"Comercial"},
  solProgramar:{a:"Programó Work Orders desde una solicitud", m:"Comercial"},
  solComGuardar:{a:"Registró una Solicitud Comercial", m:"Comercial"},
  visitaComGuardar:{a:"Registró una visita comercial", m:"Comercial"},
  estGuardar:{a:"Emitió un estimado", m:"Estimados"},
  estLineaGuardar:{a:"Agregó o editó una línea de estimado", m:"Estimados"},
  estDelLinea:{a:"Quitó una línea de estimado", m:"Estimados"},
  alTarGuardar:{a:"Pasó un precio al tarifario", m:"Tarifario"},
  estMedioOK:{a:"Decidió la aprobación del estimado", m:"Estimados"},
  estEnviarOK:{a:"Envió un estimado al cliente", m:"Estimados"},
  estAgendar:{a:"Pasó el estimado a programación", m:"Estimados"},
  coiOK:{a:"Registró el COI", m:"Estimados"},
  facturar:{a:"Generó una factura", m:"Facturación"},
  facBorradorGuardar:{a:"Guardó borradores de factura", m:"Facturación"},
  facManualOK:{a:"Abrió una factura manual", m:"Facturación"},
  buscarCSV:{a:"Exportó una búsqueda a CSV", m:"Reportes"},
  facEnviarOK:{a:"Envió una factura", m:"Facturación"},
  facCambioEnviar:{a:"Preparó un cambio de monto en una factura ya emitida (queda para aprobación)", m:"Facturación"},
  facCambioAprobar:{a:"Aprobó un cambio de monto en una factura (la factura se actualizó)", m:"Facturación"},
  facCambioRechazarOK:{a:"Rechazó un cambio de monto en una factura", m:"Facturación"},
  facRegresarOK:{a:"Regresó una factura a Borrador (o pidió regresarla: queda para aprobación)", m:"Facturación"},
  facRegresoAprobar:{a:"Aprobó regresar una factura a Borrador (la factura volvió a Borrador)", m:"Facturación"},
  facRegresoRechazarOK:{a:"Rechazó regresar una factura a Borrador", m:"Facturación"},
  tarEnviarOK:{a:"Envió una lista de precios", m:"Tarifario"},
  validarOK:{a:"Validó una Work Order", m:"Nómina"},
  aprobPago:{a:"Aprobó una WO para nómina", m:"Nómina"},
  aprobFactura:{a:"Aprobó una WO para facturación", m:"Nómina"},
  gastoFijoGuardar:{a:"Registró un gasto fijo", m:"Finanzas"},
  gVehOK:{a:"Registró gasolina o gasto de vehículo (celular de Gustavo)", m:"Finanzas"},
  invNuevoGuardar:{a:"Dio de alta un activo de inventario", m:"Inventario"},
  invEditarGuardar:{a:"Editó un activo o una reserva de inventario", m:"Inventario"},
  pendAvisarOK:{a:"Avisó a clientes por WO pendientes", m:"Work Orders"},
  pendRespuestaOK:{a:"Registró la respuesta del cliente a un aviso", m:"Work Orders"},
  recordatorioEnviar:{a:"Envió un recordatorio de agenda al técnico (y al cliente si la unidad está ocupada)", m:"Work Orders"},
  recordatorioMoverOK:{a:"Movió la fecha u hora de un recordatorio", m:"Work Orders"},
  recordatorioSegOK:{a:"Anotó el seguimiento al técnico de un recordatorio", m:"Work Orders"},
  valGuardar:{a:"Guardó cobro/pago de una WO al validar", m:"Nómina"},
  valAjAgregar:{a:"Agregó un ajuste al validar una WO", m:"Nómina"},
  valAjQuitar:{a:"Quitó un ajuste al validar una WO", m:"Nómina"},
  facRetenerOK:{a:"Retuvo una WO para no facturarla", m:"Facturación"},
  facLiberar:{a:"Liberó una WO retenida", m:"Facturación"},
  woDupNueva:{a:"Creó una WO duplicada con motivo", m:"Work Orders"},
  creditoGuardar:{a:"Agregó crédito a una propiedad", m:"Propiedades"},
  pinturaGuardar:{a:"Guardó una pintura de una propiedad", m:"Propiedades"},
  pinturaQuitar:{a:"Quitó una pintura de una propiedad", m:"Propiedades"},
  creditoServGuardar:{a:"Agregó un crédito de servicio a una propiedad", m:"Propiedades"},
  facAjusteAplicar:{a:"Ajustó el total de una factura del borrador (de → a · motivo)", m:"Facturación"},
  facAjusteQuitar:{a:"Quitó el ajuste de total de una factura del borrador", m:"Facturación"},
  notaCreditoOK:{a:"Emitió una nota de crédito por un return", m:"Facturación"},
  cobrar:{a:"Registró un pago", m:"Cobranza"},
  cobRecordatorio:{a:"Envió un reminder de cobranza", m:"Cobranza"},
  cobOverdue:{a:"Envió un correo overdue", m:"Cobranza"},
  cobAgrupadoEnviar:{a:"Envió un recordatorio agrupado", m:"Cobranza"},
  cobLlamadaGuardar:{a:"Registró una llamada de cobranza", m:"Cobranza"},
  facVenceGuardar:{a:"Cambió el vencimiento de una factura", m:"Cobranza"},
  facCorreoGuardar:{a:"Cambió el correo de envío de una factura", m:"Cobranza"},
  /* PRODUCCIÓN: el aprobador de precios debe ser una función configurable (no una persona fija); el origen del precio
     (definido por quién y cuándo) serían columnas en las tablas de tarifas y de líneas. Un precio «definido» solo lo cambia
     el aprobador: los demás piden el cambio con un Request que lleva antes, después y motivo. */
  precioCambioEnviar:{a:"Pidió cambiar un precio fijado por el aprobador (queda para aprobación)", m:"Excepciones"},
  precioCambioAprobar:{a:"Aprobó un cambio de precio fijado (el precio se actualizó)", m:"Excepciones"},
  precioCambioRechazarOK:{a:"Rechazó un cambio de precio fijado", m:"Excepciones"},
  pagarSemana:{a:"Aprobó la nómina", m:"Nómina"},
  pagarTecOK:{a:"Marcó como pagado a un técnico", m:"Nómina"},
  nomAprobar:{a:"Aprobó la nómina de un técnico", m:"Nómina"},
  nomConforme:{a:"Marcó conforme su pago (técnico)", m:"Campo"},
  nomObs:{a:"Envió una observación a su pago (técnico)", m:"Campo"},
  nomResponder:{a:"Respondió la observación de un técnico", m:"Nómina"},
  parcialOK:{a:"Registró un pago parcial a un técnico", m:"Nómina"},
  nomAdjuntarGuardar:{a:"Adjuntó el comprobante de un pago de nómina", m:"Nómina"},
  descManualOK:{a:"Agregó un descuento a la nómina de un técnico", m:"Nómina"},
  descQuitar:{a:"Quitó un descuento de la nómina de un técnico", m:"Nómina"},
  descAplicar:{a:"Aplicó un descuento por return", m:"Nómina"},
  descNoAplicarOK:{a:"Decidió no aplicar un descuento por return", m:"Nómina"},
  movGuardar:{a:"Registró movimiento de inventario", m:"Inventario"},
  materialGuardar:{a:"Agregó un material a una Work Order", m:"Work Orders"},
  materialRecibo:{a:"Adjuntó comprobante de un material", m:"Work Orders"},
  permisoGuardar:{a:"Registró un permiso", m:"Disponibilidad"},
  apruebaPermiso:{a:"Aprobó un permiso", m:"Disponibilidad"}
};
/* En las altas el identificador nace dentro de la acción: se lee después */
/* El descuento recién decidido (lo fija la acción en acciones/nomina-facturacion.js). */
const descRef = () => { const x=by(S.descuentos,ultimoDescDecidido); return x ? tecN(x.tec)+(x.wo?" · WO-"+x.wo:"") : ""; };
const AUD_POST = {
  woGuardar:   () => S.wos.length     ? "WO-"+S.wos[S.wos.length-1].id : "",
  propGuardar: () => S.propiedades.length ? S.propiedades[S.propiedades.length-1].nombre : "",
  uniGuardar:  () => S.unidades.length    ? "Unidad "+S.unidades[S.unidades.length-1].num : "",
  conGuardar:  () => S.contactos.length   ? S.contactos[S.contactos.length-1].nombre : "",
  tecGuardar:  () => S.tecnicos.length    ? tecN(S.tecnicos[S.tecnicos.length-1].id) : "",
  cliGuardar:  () => S.clientes.length    ? S.clientes[S.clientes.length-1].nombre : "",
  estGuardar:  () => S.estimados.length   ? S.estimados[0].num : "",
  facturar:    () => S.facturas.length    ? S.facturas[0].num : "",
  facBorradorGuardar: () => (S._facGuardadas||[]).join(", "),
  facManualOK: () => S.facturaBorrador ? P(S.facturaBorrador.prop).nombre : "",
  facCambioEnviar:     () => S._audCambio || "",
  facCambioAprobar:    () => S._audCambio || "",
  facCambioRechazarOK: () => S._audCambio || "",
  facRegresarOK:       () => S._audRegreso || "",
  facRegresoAprobar:   () => S._audRegreso || "",
  facRegresoRechazarOK:() => S._audRegreso || "",
  facVenceGuardar:     () => S._audDatos || "",
  facCorreoGuardar:    () => S._audDatos || "",
  precioCambioEnviar:  () => S._audPrecio || "",
  precioCambioAprobar: () => S._audPrecio || "",
  precioCambioRechazarOK: () => S._audPrecio || "",
  creditoGuardar: () => { const c=(S.creditosProp||[]).slice(-1)[0]; return c ? P(c.prop).nombre : ""; },
  devRegistrarOK: () => S._audDev || "",
  devCerrar: () => S._audDev || "",
  pinturaGuardar: () => S._audPint || "",
  pinturaQuitar:  () => S._audPint || "",
  creditoServGuardar: () => { const c=(S.creditosServ||[]).slice(-1)[0]; return c ? P(c.prop).nombre+" · "+c.serv+" × "+c.cant : ""; },
  facAjusteAplicar: () => S._audAj || "",
  facAjusteQuitar:  () => S._audAj || "",
  notaCreditoOK:    () => S._audNotaCredito || "",
  woDupNueva:  () => S.wos.length ? "WO-"+S.wos[S.wos.length-1].id : "",
  tarGuardar:  () => { const t=S.tarifas[S.tarifas.length-1]; return t? (t.nombre||t.serv+" · "+t.variante) : ""; },
  pagoTecGuardar: () => { const x=(S.pagosTecnico||[])[S.pagosTecnico.length-1]; return x? tecN(x.tec)+" · "+x.serv+" · "+money(x.pago) : ""; },
  catSave:     () => "",
  movGuardar:  () => { const m=S.movs[S.movs.length-1]; return m? by(S.productos,m.prod).nombre : ""; },
  pagarSemana: () => periodoTexto(S.periodo),
  nomAprobar:  () => S._audNom || "",
  nomConforme: () => S._audNom || "",
  nomObs:      () => S._audNom || "",
  nomResponder:() => S._audNom || "",
  pagarTecOK:  () => { const n=S.nomina[S.nomina.length-1]; return n&&n.tec ? tecN(n.tec)+" · "+periodoTexto(S.periodo) : ""; },
  parcialOK:   () => { const n=S.nomina[S.nomina.length-1]; return n&&n.tec ? tecN(n.tec)+" · WO-"+n.wos[0]+" · "+money(n.total) : ""; },
  descManualOK: () => { const x=S.descuentos[S.descuentos.length-1]; return x ? tecN(x.tec)+" · "+x.concepto+" · "+money(x.monto) : ""; },
  descQuitar:   () => ultimoDescManual,
  descAplicar:     () => descRef(),
  descNoAplicarOK: () => descRef(),
  excGuardar:  () => S.excepciones.length ? S.excepciones[S.excepciones.length-1].tipo : "",
  subwoFotoRef:  () => ultimoSubwoTocado!=null ? "WO-"+ultimoSubwoTocado : "",
  subwoFotoEvid: () => ultimoSubwoTocado!=null ? "WO-"+ultimoSubwoTocado : "",
  estMedioOK:    () => ultimoEstTocado || "",
  estLineaGuardar: () => S.estHdr&&S.estHdr.num ? S.estHdr.num : "",
  estDelLinea:   () => S.estHdr&&S.estHdr.num ? S.estHdr.num : "",
  alTarGuardar:  () => S._alTarRef || ""
};
function refDe(d){
  if(!d) return "";
  if(d.id && /^\d+$/.test(d.id)) return "WO-"+d.id;
  if(d.wo) return "WO-"+d.wo;
  if(d.prop) return P(d.prop).nombre;
  if(d.tec) return tecN(d.tec);
  if(d.n) return d.n;
  if(d.k) return d.k;
  if(d.id) return String(d.id);
  return "";
}
Object.keys(ACC).forEach(k=>{
  const orig = ACC[k];
  ACC[k] = d => {
    const nAntes = S.bitacora.length;
    const r = orig(d);
    const meta = AUD[k];
    // Una corrección que no cambió nada no es un alta: se sale sin registrar
    if(S.audOmitir){ S.audOmitir=false; return r; }
    if(meta && S.bitacora.length===nAntes){          // no duplicar si la acción abrió otra
      let ref = AUD_POST[k] ? AUD_POST[k]() : "";
      if(!ref) ref = refDe(d);
      S.bitacora.unshift({
        n: ++S.audSeq, fecha:"2026-08-11", hora:hora(),
        usuario:S.usuario, rol:ROLES[S.usuario].r,
        accion:meta.a, modulo:meta.m, ref
      });
    }
    return r;
  };
});

/* ── TEMA ── Sistema (sigue al navegador) → Claro → Oscuro → Sistema.
   No es un dato de negocio: se agrega después del forEach de arriba para
   que no quede auditado en Bitácora. */
const ICS_TEMA = {
  sistema:'<path d="M12 3v1M12 20v1M4.2 4.2l.7.7M19.1 19.1l.7.7M3 12h1M20 12h1M4.2 19.8l.7-.7M19.1 4.9l.7-.7"/><circle cx="12" cy="12" r="4"/>',
  light:'<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>',
  dark:'<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>'
};
const NOM_TEMA = {sistema:"Sistema", light:"Claro", dark:"Oscuro"};
function temaActual(){ try{ return localStorage.getItem("cps_tema")||"sistema"; }catch(e){ return "sistema"; } }
function temaAplicar(t){
  if(t==="sistema") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
  const b=$("#temaBtn"); if(!b) return;
  b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICS_TEMA[t]}</svg>`;
  b.title = "Tema: "+NOM_TEMA[t]+" — clic para cambiar";
}
temaAplicar(temaActual());
Object.assign(ACC, {
  temaToggle: () => {
    const orden=["sistema","light","dark"], sig=orden[(orden.indexOf(temaActual())+1)%orden.length];
    try{ localStorage.setItem("cps_tema", sig); }catch(e){}
    temaAplicar(sig);
  }
});

VIEWS.bitacora = () => {
  const fU = S.audU||"", fM = S.audM||"";
  let L = S.bitacora;
  if(fU) L = L.filter(x=>x.usuario===fU);
  if(fM) L = L.filter(x=>x.modulo===fM);
  const mods = [...new Set(S.bitacora.map(x=>x.modulo))].sort();
  return `
  <div class="ph"><div><h2>Bitácora</h2>
    <p>Todo lo que cambió un dato, con quién lo hizo y cuándo. No se puede editar ni borrar.</p></div></div>
  <div class="card"><div class="cp" style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-end">
    <div class="fld" style="margin:0;min-width:170px"><label>Quién</label>
      <select id="audU" data-a="audFiltra"><option value="">Todos</option>
        ${Object.keys(ROLES).map(u=>`<option ${u===fU?"selected":""}>${u}</option>`).join("")}</select></div>
    <div class="fld" style="margin:0;min-width:170px"><label>Módulo</label>
      <select id="audM" data-a="audFiltra"><option value="">Todos</option>
        ${mods.map(m=>`<option ${m===fM?"selected":""}>${esc(m)}</option>`).join("")}</select></div>
    <div style="margin-left:auto;text-align:right">
      <div style="font-size:10.5px;color:var(--faint);text-transform:uppercase;letter-spacing:.05em">Movimientos</div>
      <div class="mono" style="font-size:22px;font-weight:750">${L.length}</div></div>
  </div></div>
  <div class="card">${L.length?`<table>
    <thead><tr><th style="width:52px">#</th><th style="width:74px">Hora</th><th>Quién</th><th>Qué hizo</th><th>Módulo</th><th>Sobre qué</th></tr></thead>
    <tbody>${L.slice(0,120).map(x=>`<tr class="${fl("bit:"+x.n)}">
      <td class="mono" style="color:var(--faint)">${x.n}</td>
      <td class="mono">${esc(x.hora)}</td>
      <td><span class="pill a">${esc(x.usuario)}</span>
        <div style="font-size:10px;color:var(--faint);margin-top:2px">${esc(x.rol)}</div></td>
      <td style="font-weight:650">${esc(x.accion)}
        ${x.cambios?`<div class="cambios">${x.cambios.map(c=>
          `<div><span class="cc">${esc(c.campo)}</span>
             <span class="de">${esc(c.de)}</span> <span class="fl">→</span> <b>${esc(c.a)}</b></div>`).join("")}</div>`:""}</td>
      <td><span class="pill g">${esc(x.modulo)}</span></td>
      <td class="mono" style="font-size:11.5px">${esc(x.ref)||"—"}</td></tr>`).join("")}
    </tbody></table>${L.length>120?`<div class="cp" style="border-top:1px solid var(--line);color:var(--faint);font-size:11.5px">Mostrando los 120 más recientes de ${L.length}</div>`:""}`
    :`<div class="empty"><div class="b">·</div>Sin movimientos todavía.<br><span style="font-size:12px">Opera en cualquier módulo y aparecerá aquí.</span></div>`}</div>
  <div class="tr">Claudia: «sin querer me borran una work order, ya también me borraron lo de payroll y ya no puedo saber si se pagó o no». Aquí borrar deja rastro: quién, qué y a qué hora.</div>`;
};
ACC.audFiltra = () => { S.audU=val("audU"); S.audM=val("audM"); render(); };

document.addEventListener("keydown", e=>{ if(e.key==="Escape") cm();
  /* Enter aplica el texto de los filtros de nómina y de facturas, igual que su botón «Buscar» */
  else if(e.key==="Enter"){ const id=e.target.id; if(id==="nhQ") ACC.nomFiltro(); else if(id==="fcQ") ACC.facFiltro(); } });

/* ══ Modo Gustavo: ?gustavo=1 en la URL (o entrar por gustavo.html) abre
   directo en su celular, a pantalla completa, sin el dashboard alrededor —
   y desde ahí el navegador ofrece instalarla como PWA. Mismo archivo,
   mismo estado, nada duplicado. ══ */
try{
  const guardadas=JSON.parse(localStorage.getItem("cps_cliente_revisiones")||"[]");
  if(Array.isArray(guardadas) && guardadas.length) S.revisionesCliente=guardadas;
}catch(e){}
if(new URLSearchParams(location.search).get("gustavo")==="1"){
  document.body.classList.add("gmode");
  ACC.verGustavoCel();
  const lm=document.createElement("link"); lm.rel="manifest"; lm.href="manifest.json";
  document.head.appendChild(lm);
  if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
}

/* ── PERSISTENCIA ── Prototipo sin backend: cada área va a probar sus propias
   operaciones, así que el estado completo se guarda en localStorage después
   de cada acción — nada se pierde al recargar la página o cerrar el navegador.
   Si falla (ej. el navegador se quedó sin espacio por muchas fotos), se avisa
   una sola vez y se sigue probando sin guardar, nunca rompe la app. */
/* v2: se subió al vaciar los ejemplos operacionales (WO, facturas, nómina, etc.)
   — así nadie se queda pegado al guardado viejo con los datos de ejemplo de hoy. */
const CPS_CLAVE_ESTADO = "cps_estado_v2";
let _guardadoFalloAvisado = false;
function guardarEstado(){
  try{
    /* Con la nube activa, aquí solo queda lo de pantalla (rol, módulo, semana…):
       las listas viven en Supabase y no llenan el almacenamiento del navegador. */
    localStorage.setItem(CPS_CLAVE_ESTADO, JSON.stringify(_nubeActiva ? nubeSoloLocal() : S));
    const b=$("#guardadoBadge");
    if(b){ b.classList.remove("flash-ok"); void b.offsetWidth; b.classList.add("flash-ok"); b.title=(_nubeActiva?"Guardado en la nube · ":"Guardado en este navegador · ")+hora(); }
  }catch(e){
    if(!_guardadoFalloAvisado){ _guardadoFalloAvisado=true;
      toast("No se pudo guardar","El almacenamiento de este navegador está lleno (puede ser por muchas fotos). Haz una copia de lo importante antes de seguir probando.","r"); }
  }
  nubeGuardar();
}
function cargarEstado(){
  try{
    const g=localStorage.getItem(CPS_CLAVE_ESTADO);
    if(!g) return false;
    const datos=JSON.parse(g);
    Object.assign(S,datos);
    unirCatalogo();
    return true;
  }catch(e){ return false; }
}
cargarEstado();
/* Envuelve TODO lo que ya está en ACC a esta altura (incluido temaToggle) —
   cualquier acción del usuario dispara un guardado, igual que ya hace el
   envoltorio de Bitácora más arriba. */
Object.keys(ACC).forEach(k=>{
  const orig=ACC[k];
  ACC[k] = d => { const r=orig(d); guardarEstado(); if(typeof campoAutoTrasAccion==="function") campoAutoTrasAccion(k); return r; };
});

/* Primero se traen (o se siembran) los datos de la nube y recién ahí se dibuja;
   si no responde, se dibuja con lo guardado en este navegador. */
nubeIniciar().finally(()=>render());
