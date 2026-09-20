"use strict";
/* ══════════ HELPERS ══════════ */
const $ = s => document.querySelector(s);
const esc = s => String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const by = (arr,id) => arr.find(x=>x.id===id);
const P = id => by(S.propiedades,id) || {nombre:"—",zona:"",door:""};
const U = id => by(S.unidades,id) || {num:"—",rooms:"",building:"",unidadNum:""};
/* Arma el identificador que se muestra: "B-102" si hay building, o solo el
   número si no. Es lo único que las pantallas leen (u.num); building y
   unidadNum son la fuente que se normaliza al buscar y al migrar del Excel. */
const uNumComp = (b,n) => { b=String(b||"").trim(); n=String(n||"").trim(); return b ? b+"-"+n : n; };
/* Para comparar identificadores sin que "102B" / "B 102" / "b-102" se traten
   como distintos: se quita todo lo que no sea letra o número, en minúscula. */
const uNorm = s => String(s||"").toLowerCase().replace(/[^a-z0-9]/g,"");
/* El tamaño base de una unidad sale solo de Bedrooms. Studio, balcón y living
   room no son características maestras: se piden como adicionales si de verdad
   aparecen en el trabajo. */
function roomsDesde(tipo, bedrooms){
  if(tipo==="Oficina") return "Oficina";
  const n = parseInt(bedrooms)||0;
  if(n<=0) return "Studio";
  return `${n} bedroom`;
}
const T = id => by(S.tecnicos,id);
const CLI = id => by(S.clientes,id) || {nombre:"—"};
const ESTCOL = {Prospect:"w",Onboarding:"m",Active:"v","On Hold":"w",Inactive:"r"};
const tecN = id => { const t=T(id); return t? t.nombre+" "+t.apellido : "sin asignar"; };
const W = id => by(S.wos,id);
const money = n => "$"+(Math.round(n*100)/100).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const hora = () => { const h=Math.floor(S.reloj/60),m=S.reloj%60; return h+":"+String(m).padStart(2,"0"); };
const puede = m => { const r=ROLES[S.usuario]; return r.m==="*" || r.m.includes(m); };
/* Los datos financieros son sensibles: solo Claudia y Erika pueden verlos,
   sin importar en qué pantalla aparezcan. */
const puedeVerUtilidad = () => ["Claudia","Erika"].includes(S.usuario);

/* Íconos de composición de unidad — compartidos entre el Price List
   (Tarifario) y el selector de Unidad del Estimado, para que la misma
   unidad se vea igual en los dos lugares donde se elige. */
const ICONO_AMB = {
  Bedroom:'<path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7"/><path d="M3 18h18"/><path d="M7 9V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"/>',
  Bathroom:'<path d="M9 6 6.5 3.5A1.5 1.5 0 0 0 4 4.5V6"/><path d="M2 12h20"/><path d="M4 12v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6"/><path d="M8 20v1M16 20v1"/>',
  "Living Room":'<path d="M4 10V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3"/><rect x="2" y="10" width="20" height="7" rx="2"/><path d="M4 17v3M20 17v3"/>',
  Studio:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/>'
};
const ICONO_DEF = '<rect x="4" y="4" width="16" height="16" rx="2"/>';
const IC_PISO = '<path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>';
const cajaAmb = (ic, n, lab) => `<div style="border:1px solid var(--line);border-radius:10px;padding:9px 6px;text-align:center;background:var(--surface-2)">
  <svg viewBox="0 0 24 24" fill="none" stroke="var(--azul)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px">${ic}</svg>
  <div style="font-size:14px;font-weight:800;margin-top:4px;color:var(--ink)">${esc(String(n))}</div>
  <div style="font-size:9px;color:var(--faint);text-transform:uppercase;letter-spacing:.03em;margin-top:1px">${esc(lab)}</div>
</div>`;
/* La tarjeta completa de una unidad: piso + cada ambiente con su ícono y
   cantidad. Misma composición real que ya tiene cargada la Propiedad —
   nadie la vuelve a describir a mano. */
function unidadCardHTML(u){
  if(!u) return "";
  const cajas = (u.pisos ? [cajaAmb(IC_PISO, "Floor "+u.pisos, "Piso")] : [])
    .concat((u.detalle||[]).map(x=>cajaAmb(ICONO_AMB[x.tipo]||ICONO_DEF, x.cantidad, x.tipo)));
  return `<div style="margin:9px 0 2px">
    <div style="display:inline-block;background:var(--azul);color:#fff;font-size:12.5px;font-weight:750;padding:4px 12px;border-radius:99px;margin-bottom:8px">${esc(u.num)}</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(78px,1fr));gap:7px">${cajas.join("")}</div>
  </div>`;
}

/* Hay cosas que le pasan a alguien que no está mirando la pantalla. Un adicional
   traba la Work Order y eso le desarma el día a Thalia — aunque la decisión no
   sea suya. `avisar` deja el mensaje en SU campanita, para cuando entre. */
function avisar(para, t, b, k){
  S.avisos.unshift({t, b, k:k||"", hora:hora(), leido:false, quien:S.usuario, para});
}
const avisosDe = u => S.avisos.filter(a => a.para ? a.para===u : a.quien===u);

/* Todo aviso se muestra Y se guarda: si se te pasó, está en la campanita */
function toast(t,b,k){
  S.avisos.unshift({t,b,k:k||"",hora:hora(),leido:false,quien:S.usuario});
  const e=document.createElement("div"); e.className="toast "+(k||"");
  e.innerHTML=`<div class="t">${t}</div><div class="b">${b}</div>`; $("#toasts").appendChild(e);
  setTimeout(()=>{e.style.transition="opacity .4s";e.style.opacity="0";setTimeout(()=>e.remove(),400);},5000);
  const c=$("#campBadge"); if(c) c.style.display="block";
}
/* Aviso dentro de la app del técnico. El canal (push, WhatsApp) es otra
   discusión — la del informe, niveles 1 a 3 — y no se mezcla con esta bandeja. */
function noti(t,b){ S.notis.unshift({t,b,h:hora(),leido:false}); }
const notiSinLeer = () => S.notis.filter(n=>!n.leido).length;

/* Tarifario — la llave es la de su Tabla Maestra: Rooms + Pisos + Servicio.
   Se resuelve en 4 pasos, del más específico al más general:
     1) precio negociado de la propiedad, para esos pisos
     2) precio negociado de la propiedad, cualquier piso
     3) precio general, para esos pisos
     4) precio general, cualquier piso
   pisos = null significa "aplica a cualquiera": así no hay que cargar 3 filas
   por servicio cuando el precio no cambia por pisos. */
function tarifa(propId, cat, serv, variante, pisos){
  const busca = (p, pi) => S.tarifas.find(t =>
    t.prop === p && t.cat === cat && t.serv === serv && t.variante === variante &&
    (pi === null ? (t.pisos == null) : t.pisos === pi));
  let t;
  if((t = busca(propId, pisos))) return {...t, nivel:"Propiedad", detalle:`${variante} · ${pisos} piso(s)`};
  if((t = busca(propId, null)))  return {...t, nivel:"Propiedad", detalle:`${variante} · cualquier piso`};
  if((t = busca(null, pisos)))   return {...t, nivel:"General",   detalle:`${variante} · ${pisos} piso(s)`};
  if((t = busca(null, null)))    return {...t, nivel:"General",   detalle:`${variante} · cualquier piso`};
  return null;
}
function tarifaWO(w){ const u=U(w.unidad); return tarifa(w.prop,w.cat,w.serv,u.rooms,u.pisos); }
/* Su tarifario tiene Precio Unitario y Cantidad: el importe es el producto de los dos.
   Si la WO ya trae su propio precio/pago (nacio de un estimado ya aprobado, con el
   precio del Item que el cliente vio y aceptó), ese manda — no se vuelve a resolver
   por Rooms+Pisos, que puede no calzar con los items estilo vCita y facturar "sin tarifa"
   algo que el cliente ya aprobó a un precio especifico. */
/* Reunión Claudia (feedback prototipo): lo que se aprueba de un Sub-Work
   Order y se marca "cobrar al cliente" (ver medioOK) se suma acá encima de
   la tarifa normal — w.extraFacturable. Si no hay tarifa base pero sí hay
   extra aprobado para cobrar, igual es facturable (es un cargo aparte, no
   depende de que la WO en sí tenga precio). */
function ingresoWO(w){
  const extra = w.extraFacturable||0;
  const base = w.precio!=null ? w.precio*(w.cant||1) : (tarifaWO(w) ? tarifaWO(w).precio*(w.cant||1) : null);
  if(base===null && !extra) return null;
  return (base||0) + extra;
}
/* Importe del trabajo principal sin mezclar los conceptos de Sub-WO. Esto
   permite que la factura los muestre como líneas independientes y, cuando
   corresponde, los mande a una factura separada. */
function ingresoBaseWO(w){
  const total=ingresoWO(w);
  return total===null ? null : total-(w.extraFacturable||0);
}
/* Si el touch-up lo hace el mismo tecnico que se equivoco, no se le paga:
   esta rehaciendo su propio trabajo. Si va otro, se paga normal. */
function egresoWO(w){
  if(w.touchup && w.tec && w.tec===w.tecOriginal) return 0;
  if(w.pago!=null) return w.pago*(w.cant||1);
  const t=tarifaWO(w); return t? t.pago*(w.cant||1) : null;
}
function materialWO(w){ return S.movs.filter(m=>m.wo===w.id && m.tipo==="salida" && !m.cliente).reduce((a,m)=>a+m.costo,0); }
/* Punto 10: el pago adicional que se aprueba al aceptar una Sub-Work
   Order (ver medioOK) queda en S.excepciones, no en egresoWO — así que
   cualquier pantalla que muestre "cuánto se le paga" a un técnico tiene
   que sumarlo aparte, o el número no coincide con el comprobante real. */
function extrasAprobadosDeWOs(ws){
  const ids = new Set(ws.map(w=>w.id));
  return S.excepciones.filter(x=>x.estado==="Aprobada" && x.tipo==="Pago adicional al técnico" && ids.has(x.wo));
}
const tecExtra = x => x.tec || (W(x.wo)&&W(x.wo).tec) || null;
/* Una Sub-Work Order puede heredar al técnico/fecha de la principal o tener
   los suyos. Estas funciones son la única fuente para agenda y nómina. */
const tecSubWO = a => a.tec || (W(a.wo)&&W(a.wo).tec) || null;
const fechaSubWO = a => a.fecha || (W(a.wo)&&W(a.wo).fecha) || "";
const subWOsOperativas = () => S.adicionales.filter(a=>a.origen==="Planificada" && a.estado==="Aprobado");
const subWOsDeTec = tid => subWOsOperativas().filter(a=>tecSubWO(a)===tid && a.estadoTrabajo!=="Canceled");
const subWOsPendientesDeWO = wid => subWOsOperativas().filter(a=>a.wo===wid && a.estadoTrabajo!=="Canceled"
  && (a.estadoTrabajo!=="Completed" || !(a.fotosEvidArr||[]).length));
const revisionClienteDeWO = wid => (S.revisionesCliente||[]).filter(r=>r.wo===wid).slice(-1)[0]||null;
const clienteRevisionPendienteDeWO = wid => { const r=revisionClienteDeWO(wid); return !!r && ["Enviado","Corrección solicitada"].includes(r.estado); };
function guardarRevisionesCliente(){
  try{ localStorage.setItem("cps_cliente_revisiones",JSON.stringify(S.revisionesCliente||[])); }catch(e){}
}
function utilidadWO(w){ const i=ingresoWO(w); if(i===null) return null; return i-(egresoWO(w)||0)-materialWO(w); }
function stock(prodId){ return S.movs.filter(m=>m.prod===prodId && !m.cliente).reduce((a,m)=>a+(m.tipo==="entrada"?m.cant:-m.cant),0); }
function stockCliente(prodId,propId){ return S.movs.filter(m=>m.prod===prodId && m.cliente && m.prop===propId).reduce((a,m)=>a+(m.tipo==="entrada"?m.cant:-m.cant),0); }

function capacidadDia(tecId,fecha){ return S.wos.filter(w=>w.tec===tecId && w.fecha===fecha && !["Canceled","Rescheduled"].includes(w.estado)).length; }
const CAP = 2; // UC-07: dos propiedades por jornada
/* Su flujograma de Asignación de Técnico pide cruzar Tipo de servicio además
   de zona/disponibilidad/carga. No existe un catálogo formal que una las
   categorías (Catalogo!H) con las etiquetas de esp[] de cada técnico — son las
   mismas etiquetas que ya trae el Excel de técnicos. "Tecnico" es la etiqueta
   general (pintura, reparación, trash out, etc.); Clean/Resurface/Carpet piden
   su propia etiqueta específica. Es una advertencia, no bloquea: igual que
   la zona, se puede asignar igual si hace falta. */
const ESP_REQ = {Clean:"Housekeeper", Resurface:"Resurface", Carpet:"Carpeter"};
const especialidadOk = (t,cat) => t.esp.includes(ESP_REQ[cat] || "Tecnico");
function bloqueo(tecId,fecha){
  const d = S.disponibilidad.find(x=>x.tec===tecId && x.estado==="Aprobado" && fecha>=x.desde && fecha<=x.hasta);
  return d||null;
}

/* ── ADICIONALES ──────────────────────────────────────────────────────────
   En su Excel la celda «Aditional» (Schedule!U) es un desplegable de UNA sola
   opción. Pero en 13 de las 32 filas con contenido escribieron varias separadas
   por coma: «Extra prep, Primer», «Tape, Sheetrock, Masa», «Primer, Door,
   Caulking». Reventaron su propia lista porque el trabajo real trae varios
   conceptos a la vez — y de paso «Extra prep, Primer» y «Primer, Extra prep»
   quedaron contados como cosas distintas.

   Aquí cada concepto es su propia línea: así se tarifa (Precio × Cantidad) y así
   oficina puede aprobar uno y rechazar otro. Pero todas las líneas que el técnico
   manda de un tirón comparten `sol`: para él sigue siendo UN envío. */
function solTodas(){
  const g=[];
  S.adicionales.forEach(a=>{
    let s=g.find(x=>x.sol===a.sol);
    if(!s) g.push(s={sol:a.sol, wo:a.wo, desc:a.desc, ubic:a.ubic, origen:a.origen, lineas:[]});
    s.fotosRef=(s.fotosRef||0)+((a.fotosRefArr||[]).length);
    s.fotosEvid=(s.fotosEvid||0)+((a.fotosEvidArr||[]).length);
    s.lineas.push(a);
  });
  return g;
}
const solsDe   = wo => solTodas().filter(s=>s.wo===wo);
const solPend  = s  => s.lineas.some(l=>l.estado==="Pendiente");
const solMonto = s  => s.lineas.reduce((t,l)=>t+(l.precio||0)*(l.cant||1),0);
const solTxt   = s  => s.lineas.map(l=>l.concepto+((l.cant||1)>1?` ×${l.cant}`:"")).join(", ");
/* Estado de la solicitud vista como un todo: si oficina aprobó unas y rechazó
   otras, no es «aprobada» ni «rechazada» — es parcial, y hay que decirlo. */
function solEstado(s){
  if(solPend(s)) return "Pendiente";
  const ok = s.lineas.filter(l=>l.estado==="Aprobado").length;
  return ok===0 ? "Rechazado" : ok===s.lineas.length ? "Aprobado" : "Parcial";
}

/* ── SEÑALAR LA FILA ──────────────────────────────────────────────────────
   Casi toda acción te deja en otra vista, y ahí la fila que acabas de crear o
   aprobar se pierde entre las demás. `flash` la marca; `fl()` pinta la clase y
   render() la trae al centro de la pantalla. Se apaga sola a los 4 segundos.
   Acepta varias claves: un estimado aprobado crea N Work Orders de golpe y
   hay que señalarlas todas, no solo la primera. */
const flash = k => { S.flash = Array.isArray(k) ? k : [k]; };
const fl    = k => (S.flash||[]).includes(k) ? " flash" : "";

/* "Confirmed" es un dato real (columna "Client confirmation" de su Excel):
   nomás dice que el cliente ya confirmó la fecha, no que el trabajo avanzó
   de etapa. Antes solo "Scheduled" daba acceso al técnico — apenas Thalia
   confirmaba la fecha con el cliente (lo que el propio sistema empuja a
   hacer en «Asignar»), la Work Order se quedaba sin ningún botón: ni
   "Ya llegué", ni nada. Mismo criterio que "reagendada" — el dato no se
   pisa, solo se deja de usar para bloquear algo que no debería bloquear. */
const esAgendada = e => e==="Scheduled" || e==="Confirmed";

/* Alertas — solo reglas que salen del propio Excel o del análisis */
function alertas(){
  const A=[];
  S.wos.filter(w=>!w.tec && esAgendada(w.estado)).forEach(w=>A.push({t:"Work Order sin técnico",d:`WO-${w.id} · ${P(w.prop).nombre} ${U(w.unidad).num}`,q:"Thalia",n:"w"}));
  S.asistencias.filter(a=>a.puntualidad==="Tarde").forEach(a=>A.push({t:"Llegada tarde",d:`${tecN(a.tec)} llegó ${a.horaReal} a WO-${a.wo} (programada ${a.horaProg})`,q:"Gustavo",n:"w"}));
  S.wos.filter(w=>w.tec && esAgendada(w.estado) && !asisDe(w.id)).forEach(w=>A.push({t:"Sin marcar llegada",d:`WO-${w.id} · ${tecN(w.tec)} no ha marcado llegada (programada ${w.horaProg||"9:00"})`,q:"Thalia",n:"g"}));
  solTodas().filter(solPend).forEach(s=>A.push({t:"Adicional esperando aprobación",
    d:`WO-${s.wo} · ${s.lineas.filter(l=>l.estado==="Pendiente").length} concepto(s): ${solTxt(s)}`,q:"Claudia",n:"r"}));
  /* Los SLA de Approval Requests se ven también fuera de la bandeja, para que
     una persona no tenga que acordarse de abrirla para enterarse del vencimiento. */
  excPend().forEach(x=>{ const sla=slaApprovalRequest(x); if(sla&&sla.alerta) A.push({
    t:sla.texto, d:`${x.wo?`WO-${x.wo} · `:""}${x.tipo}: ${x.motivo}`,
    q:x.assignedTo||x.aprueba, n:sla.nivel
  }); });
  S.wos.filter(w=>!tarifaWO(w)).forEach(w=>A.push({t:"Tarifa faltante",d:`${w.serv} · ${U(w.unidad).rooms} en ${P(w.prop).nombre} — hoy saldría "NA"`,q:"Erika",n:"w"}));
  S.propiedades.filter(p=>!p.activa).forEach(p=>A.push({t:"Propiedad inactiva",d:`${p.nombre} no genera Work Orders`,q:"Lydia",n:"g"}));
  S.propiedades.filter(p=>!coiVigente(p.id)).forEach(p=>A.push({t:"COI sin registrar",d:`${p.nombre} no tiene certificado vigente`,q:"Claudia",n:"r"}));
  S.productos.filter(p=>stock(p.id)<p.min).forEach(p=>A.push({t:"Stock bajo",d:`${p.nombre}: ${stock(p.id)} ${p.um} (mínimo ${p.min})`,q:"Gustavo",n:"w"}));
  S.disponibilidad.filter(d=>d.estado==="Pendiente").forEach(d=>A.push({t:"Permiso por aprobar",d:`${tecN(d.tec)} · ${d.motivo} ${d.desde} al ${d.hasta}`,q:"Gustavo",n:"a"}));
  S.facturas.filter(facVencida).forEach(f=>A.push({t:"Factura vencida",d:`${f.num} · ${P(f.prop).nombre}`,q:"Erika",n:"r"}));
  /* Sin esto, un prospecto que "sigue en seguimiento" después de la visita
     comercial se perdía apenas pasaba la fecha en que había que retomarlo —
     nadie se enteraba, se reactivaba solo cuando alguien se acordaba. */
  S.visitas.filter(v=>v.tipo==="Comercial" && v.estado==="En seguimiento" && v.proximaAccion && v.proximaAccion<HOY_SUP)
    .forEach(v=>A.push({t:"Seguimiento comercial vencido",d:`${v.prop?P(v.prop).nombre:v.propNombre} · próxima acción era ${v.proximaAccion}`,q:"Lydia",n:"r"}));
  return A;
}
