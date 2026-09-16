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
  fMaterialOK:{a:"Registró material usado", m:"Campo"},
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
  woDetenerOK:{a:"Detuvo un trabajo", m:"Work Orders"},
  woReanudar:{a:"Reanudó un trabajo detenido", m:"Work Orders"},
  gDiaAbrir:{a:"Abrió su reporte del día", m:"Supervisión"},
  gDiaOK:{a:"Agregó una actividad al reporte del día", m:"Supervisión"},
  gDiaFin:{a:"Finalizó y envió el reporte del día", m:"Supervisión"},
  gDiaNotaOK:{a:"Agregó una nota a un reporte ya cerrado", m:"Supervisión"},
  gDiaQuita:{a:"Quitó una actividad del reporte del día", m:"Supervisión"},
  gDevOK:{a:"Abrió una devolución", m:"Supervisión"},
  gDevVerifOK:{a:"Verificó una corrección", m:"Supervisión"},
  gDevCerrar:{a:"Cerró una devolución", m:"Supervisión"},
  devTouchupOK:{a:"Creó un touch-up de corrección", m:"Supervisión"},
  woReasignarOK:{a:"Reasignó una Work Order", m:"Work Orders"},
  agSupOK:{a:"Armó la ruta del supervisor", m:"Supervisión"},
  agSupQuita:{a:"Quitó una parada de la ruta del supervisor", m:"Supervisión"},
  gLlegue:{a:"Llegó a una propiedad (supervisor)", m:"Supervisión"},
  repArchivar:{a:"Archivó un reporte de campo", m:"Supervisión"},
  repEstimado:{a:"Generó estimado desde reporte de campo", m:"Supervisión"},
  repWO:{a:"Creó Work Order desde reporte de campo", m:"Supervisión"},
  repMaterial:{a:"Pasó material a compra", m:"Supervisión"},
  fTermine:{a:"Cerró el trabajo", m:"Campo"},
  fPermisoOK:{a:"Solicitó permiso", m:"Campo"},
  medioOK:{a:"Decidió un adicional", m:"Excepciones"},
  excAprob:{a:"Aprobó una excepción", m:"Excepciones"},
  excRech:{a:"Rechazó una excepción", m:"Excepciones"},
  excGuardar:{a:"Levantó una excepción", m:"Excepciones"},
  tarifaGuardar:{a:"Definió una tarifa faltante", m:"Tarifario"},
  tarifaAvisarClaudia:{a:"Avisó a Claudia para definir una tarifa", m:"Excepciones"},
  tarGuardar:{a:"Creó una tarifa", m:"Tarifario"},
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
  transferir:{a:"Transfirió a programación", m:"Comercial"},
  solProgramar:{a:"Programó Work Orders desde una solicitud", m:"Comercial"},
  solComGuardar:{a:"Registró una Solicitud Comercial", m:"Comercial"},
  visitaComGuardar:{a:"Registró una visita comercial", m:"Comercial"},
  estGuardar:{a:"Emitió un estimado", m:"Estimados"},
  estMedioOK:{a:"Decidió la aprobación del estimado", m:"Estimados"},
  estEnviarOK:{a:"Envió un estimado al cliente", m:"Estimados"},
  estAgendar:{a:"Pasó el estimado a programación", m:"Estimados"},
  coiOK:{a:"Registró el COI", m:"Estimados"},
  facturar:{a:"Generó una factura", m:"Facturación"},
  facEnviarOK:{a:"Envió una factura", m:"Facturación"},
  cobrar:{a:"Registró un pago", m:"Cobranza"},
  cobRecordatorio:{a:"Envió un reminder de cobranza", m:"Cobranza"},
  cobOverdue:{a:"Envió un correo overdue", m:"Cobranza"},
  cobLlamadaGuardar:{a:"Registró una llamada de cobranza", m:"Cobranza"},
  pagarSemana:{a:"Aprobó la nómina", m:"Nómina"},
  movGuardar:{a:"Registró movimiento de inventario", m:"Inventario"},
  permisoGuardar:{a:"Registró un permiso", m:"Disponibilidad"},
  apruebaPermiso:{a:"Aprobó un permiso", m:"Disponibilidad"}
};
/* En las altas el identificador nace dentro de la acción: se lee después */
const AUD_POST = {
  woGuardar:   () => S.wos.length     ? "WO-"+S.wos[S.wos.length-1].id : "",
  propGuardar: () => S.propiedades.length ? S.propiedades[S.propiedades.length-1].nombre : "",
  uniGuardar:  () => S.unidades.length    ? "Unidad "+S.unidades[S.unidades.length-1].num : "",
  conGuardar:  () => S.contactos.length   ? S.contactos[S.contactos.length-1].nombre : "",
  tecGuardar:  () => S.tecnicos.length    ? tecN(S.tecnicos[S.tecnicos.length-1].id) : "",
  cliGuardar:  () => S.clientes.length    ? S.clientes[S.clientes.length-1].nombre : "",
  estGuardar:  () => S.estimados.length   ? S.estimados[0].num : "",
  facturar:    () => S.facturas.length    ? S.facturas[0].num : "",
  tarGuardar:  () => { const t=S.tarifas[S.tarifas.length-1]; return t? (t.nombre||t.serv+" · "+t.variante) : ""; },
  catSave:     () => "",
  movGuardar:  () => { const m=S.movs[S.movs.length-1]; return m? by(S.productos,m.prod).nombre : ""; },
  pagarSemana: () => periodoTexto(S.periodo),
  excGuardar:  () => S.excepciones.length ? S.excepciones[S.excepciones.length-1].tipo : "",
  subwoFotoRef:  () => ultimoSubwoTocado!=null ? "WO-"+ultimoSubwoTocado : "",
  subwoFotoEvid: () => ultimoSubwoTocado!=null ? "WO-"+ultimoSubwoTocado : "",
  estMedioOK:    () => ultimoEstTocado || ""
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

document.addEventListener("keydown", e=>{ if(e.key==="Escape") cm(); });

/* ══ Modo Gustavo: ?gustavo=1 en la URL (o entrar por gustavo.html) abre
   directo en su celular, a pantalla completa, sin el dashboard alrededor —
   y desde ahí el navegador ofrece instalarla como PWA. Mismo archivo,
   mismo estado, nada duplicado. ══ */
if(new URLSearchParams(location.search).get("gustavo")==="1"){
  document.body.classList.add("gmode");
  ACC.verGustavoCel();
  const lm=document.createElement("link"); lm.rel="manifest"; lm.href="manifest.json";
  document.head.appendChild(lm);
  if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
}

render();
